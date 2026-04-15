/**
 * Postgres adapter for Neon database.
 * Used when DATABASE_URL starts with "postgresql://" (Vercel/Neon deployment).
 * All column names match the actual Postgres schema created by migrate_to_postgres.py.
 */
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
type Row = Record<string, unknown>;
type Rows = Row[];

// ─── Typed row interfaces (match Drizzle MySQL shapes for frontend compatibility) ─
export interface PgMeeting {
  id: number; title: string; accountName: string | null; contactName: string | null;
  dealStage: string | null; status: string; platform: string | null;
  meetingUrl: string | null; scheduledAt: number | null; duration: number | null;
  recallBotId: string | null; createdAt: number; updatedAt: number;
}
export interface PgTranscript {
  id: number; meetingId: number | null; fullText: string | null;
  language: string | null; wordCount: number | null; createdAt: number;
}
export interface PgAiAnalysis {
  id: number; meetingId: number | null; summary: string | null;
  painPoints: unknown; objections: unknown; buyingSignals: unknown;
  nextSteps: unknown; keyQuotes: unknown; dealScore: number | null;
  sentiment: string | null; talkRatio: unknown; createdAt: number; updatedAt: number;
}
export interface PgSpicedReport {
  id: number; meetingId: number | null; situation: string | null; situationConfidence: number | null;
  pain: string | null; painConfidence: number | null; impact: string | null; impactConfidence: number | null;
  criticalEvent: string | null; criticalEventConfidence: number | null; decision: string | null;
  decisionConfidence: number | null; overallCompleteness: number | null; createdAt: number; updatedAt: number;
}
export interface PgMeddpiccReport {
  id: number; meetingId: number | null; metrics: string | null; metricsConfidence: number | null;
  economicBuyer: string | null; economicBuyerConfidence: number | null;
  decisionCriteria: string | null; decisionCriteriaConfidence: number | null;
  decisionProcess: string | null; decisionProcessConfidence: number | null;
  paperProcess: string | null; paperProcessConfidence: number | null;
  identifyPain: string | null; identifyPainConfidence: number | null;
  champion: string | null; championConfidence: number | null;
  competition: string | null; competitionConfidence: number | null;
  overallCompleteness: number | null; createdAt: number; updatedAt: number;
}
export interface PgActionItem {
  id: number; meetingId: number | null; title: string; description: string | null;
  dueDate: number | null; status: string; priority: string;
  assignee: string | null; isAiGenerated: boolean | null; sourceQuote: string | null;
  createdAt: number; updatedAt: number;
}
export interface PgPitchCoaching {
  id: number; meetingId: number | null; overallScore: number | null;
  talkTimeRatio: number | null; discoveryScore: number | null; objectionScore: number | null;
  valueScore: number | null; nextStepScore: number | null; closingScore: number | null;
  moments: unknown; strengths: unknown; improvements: unknown;
  missedOpportunities: unknown; competitorsMentioned: unknown;
  battlecardUsed: boolean | null; meddpiccCoverage: number | null; createdAt: number; updatedAt: number;
}
export interface PgPreCallIntelligence {
  id: number; meetingId: number | null; companyName: string | null; companyDomain: string | null;
  industry: string | null; companySize: string | null; fundingStage: string | null;
  recentNews: unknown; techStack: unknown; currentTools: unknown; triggerEvents: unknown;
  prepBullets: unknown; suggestedOpening: string | null; leadWithProduct: string | null;
  buyerPersona: string | null; createdAt: number; updatedAt: number;
}
export interface PgProspect {
  id: number; sourceCompanyName: string | null; prospectCompanyName: string | null;
  prospectDomain: string | null; industry: string | null; companySize: string | null;
  fundingStage: string | null; contactName: string | null; contactTitle: string | null;
  contactLinkedin: string | null; fitReason: string | null; outreachAngle: string | null;
  triggerEvent: string | null; suggestedProduct: string | null;
  status: string; notes: string | null; createdAt: number; updatedAt: number;
}
export interface PgUser {
  id: number; openId: string; name: string | null; email: string | null;
  role: string; createdAt: number; updatedAt: number;
}

let _sql: NeonQueryFunction<false, false> | null = null;

export function getPgSql() {
  if (!_sql && process.env.DATABASE_URL) {
    _sql = neon(process.env.DATABASE_URL);
  }
  return _sql;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function pgUpsertUser(user: {
  openId: string;
  name?: string | null;
  email?: string | null;
  role?: string;
}) {
  const sql = getPgSql();
  if (!sql) throw new Error("DB not available");
  await sql`
    INSERT INTO users ("openId", name, email, role, "createdAt", "updatedAt")
    VALUES (${user.openId}, ${user.name ?? null}, ${user.email ?? null}, ${user.role ?? "user"}, ${Date.now()}, ${Date.now()})
    ON CONFLICT ("openId") DO UPDATE SET
      name = EXCLUDED.name,
      email = EXCLUDED.email,
      "updatedAt" = ${Date.now()}
  `;
}

export async function pgGetUserByOpenId(openId: string): Promise<PgUser | undefined> {
  const sql = getPgSql();
  if (!sql) return undefined;
  const rows = (await sql`SELECT * FROM users WHERE "openId" = ${openId} LIMIT 1`) as PgUser[];
  return rows[0];
}

// ─── Meetings ─────────────────────────────────────────────────────────────────

export async function pgCreateMeeting(data: {
  title: string;
  accountName?: string | null;
  contactName?: string | null;
  dealStage?: string | null;
  status?: string;
  platform?: string | null;
}) {
  const sql = getPgSql();
  if (!sql) throw new Error("DB not available");
  const rows = (await sql`
    INSERT INTO meetings (title, "accountName", "contactName", "dealStage", status, platform, "createdAt", "updatedAt")
    VALUES (${data.title}, ${data.accountName ?? null}, ${data.contactName ?? null}, ${data.dealStage ?? null}, ${data.status ?? "pending"}, ${data.platform ?? null}, ${Date.now()}, ${Date.now()})
    RETURNING id
  `) as Rows;
  return (rows[0] as { id: number }).id;
}

export async function pgGetMeetings(limit = 50, offset = 0): Promise<PgMeeting[]> {
  const sql = getPgSql();
  if (!sql) return [];
  return (await sql`SELECT * FROM meetings ORDER BY "createdAt" DESC LIMIT ${limit} OFFSET ${offset}`) as PgMeeting[];
}

export async function pgGetMeetingById(id: number): Promise<PgMeeting | undefined> {
  const sql = getPgSql();
  if (!sql) return undefined;
  const rows = (await sql`SELECT * FROM meetings WHERE id = ${id} LIMIT 1`) as PgMeeting[];
  return rows[0];
}

export async function pgUpdateMeeting(id: number, data: Record<string, unknown>) {
  const sql = getPgSql();
  if (!sql) throw new Error("DB not available");
  const sets = Object.entries(data)
    .filter(([, v]) => v !== undefined)
    .map(([k]) => k);
  if (sets.length === 0) return;
  // Build dynamic update using individual fields
  await sql`
    UPDATE meetings SET
      title = COALESCE(${data.title as string ?? null}, title),
      "accountName" = COALESCE(${data.accountName as string ?? null}, "accountName"),
      "contactName" = COALESCE(${data.contactName as string ?? null}, "contactName"),
      "dealStage" = COALESCE(${data.dealStage as string ?? null}, "dealStage"),
      status = COALESCE(${data.status as string ?? null}, status),
      "updatedAt" = ${Date.now()}
    WHERE id = ${id}
  `;
}

export async function pgDeleteMeeting(id: number) {
  const sql = getPgSql();
  if (!sql) throw new Error("DB not available");
  await sql`DELETE FROM meetings WHERE id = ${id}`;
}

export async function pgSearchMeetings(query: string): Promise<PgMeeting[]> {
  const sql = getPgSql();
  if (!sql) return [];
  const q = `%${query}%`;
  return (await sql`
    SELECT * FROM meetings
    WHERE title ILIKE ${q} OR "accountName" ILIKE ${q} OR "contactName" ILIKE ${q}
    ORDER BY "createdAt" DESC LIMIT 20
  `) as PgMeeting[];
}

export async function pgGetMeetingStats() {
  const sql = getPgSql();
  if (!sql) return { total: 0, withTranscripts: 0, withAnalysis: 0, avgDealScore: 0 };
  const statsRows = (await sql`
    SELECT
      COUNT(DISTINCT m.id) as total,
      COUNT(DISTINCT t."meetingId") as "withTranscripts",
      COUNT(DISTINCT a."meetingId") as "withAnalysis",
      COALESCE(AVG(a."dealScore"), 0) as "avgDealScore"
    FROM meetings m
    LEFT JOIN transcripts t ON t."meetingId" = m.id
    LEFT JOIN ai_analyses a ON a."meetingId" = m.id
  `) as Rows;
  return statsRows[0] as { total: number; withTranscripts: number; withAnalysis: number; avgDealScore: number };
}

// ─── Transcripts ──────────────────────────────────────────────────────────────

export async function pgUpsertTranscript(data: {
  meetingId: number;
  fullText?: string | null;
  language?: string | null;
  wordCount?: number | null;
}) {
  const sql = getPgSql();
  if (!sql) throw new Error("DB not available");
  await sql`
    INSERT INTO transcripts ("meetingId", "fullText", language, "wordCount", "createdAt")
    VALUES (${data.meetingId}, ${data.fullText ?? null}, ${data.language ?? null}, ${data.wordCount ?? null}, ${Date.now()})
    ON CONFLICT ("meetingId") DO UPDATE SET
      "fullText" = EXCLUDED."fullText",
      language = EXCLUDED.language,
      "wordCount" = EXCLUDED."wordCount"
  `;
}

export async function pgGetTranscriptByMeetingId(meetingId: number): Promise<PgTranscript | undefined> {
  const sql = getPgSql();
  if (!sql) return undefined;
  const rows = (await sql`SELECT * FROM transcripts WHERE "meetingId" = ${meetingId} LIMIT 1`) as PgTranscript[];
  return rows[0];
}

export async function pgSearchTranscripts(query: string): Promise<PgTranscript[]> {
  const sql = getPgSql();
  if (!sql) return [];
  const q = `%${query}%`;
  return (await sql`
    SELECT t.*, m.title, m."accountName"
    FROM transcripts t
    JOIN meetings m ON m.id = t."meetingId"
    WHERE t."fullText" ILIKE ${q}
    LIMIT 10
  `) as PgTranscript[];
}

// ─── AI Analysis ──────────────────────────────────────────────────────────────

export async function pgUpsertAiAnalysis(data: {
  meetingId: number;
  summary?: string | null;
  painPoints?: unknown;
  objections?: unknown;
  buyingSignals?: unknown;
  nextSteps?: unknown;
  keyQuotes?: unknown;
  dealScore?: number | null;
  sentiment?: string | null;
  talkRatio?: unknown;
}) {
  const sql = getPgSql();
  if (!sql) throw new Error("DB not available");
  const now = Date.now();
  await sql`
    INSERT INTO ai_analyses ("meetingId", summary, "painPoints", objections, "buyingSignals", "nextSteps", "keyQuotes", "dealScore", sentiment, "talkRatio", "createdAt", "updatedAt")
    VALUES (
      ${data.meetingId},
      ${data.summary ?? null},
      ${JSON.stringify(data.painPoints ?? [])}::jsonb,
      ${JSON.stringify(data.objections ?? [])}::jsonb,
      ${JSON.stringify(data.buyingSignals ?? [])}::jsonb,
      ${JSON.stringify(data.nextSteps ?? [])}::jsonb,
      ${JSON.stringify(data.keyQuotes ?? [])}::jsonb,
      ${data.dealScore ?? null},
      ${data.sentiment ?? null},
      ${JSON.stringify(data.talkRatio ?? {})}::jsonb,
      ${now}, ${now}
    )
    ON CONFLICT ("meetingId") DO UPDATE SET
      summary = EXCLUDED.summary,
      "painPoints" = EXCLUDED."painPoints",
      objections = EXCLUDED.objections,
      "buyingSignals" = EXCLUDED."buyingSignals",
      "nextSteps" = EXCLUDED."nextSteps",
      "keyQuotes" = EXCLUDED."keyQuotes",
      "dealScore" = EXCLUDED."dealScore",
      sentiment = EXCLUDED.sentiment,
      "talkRatio" = EXCLUDED."talkRatio",
      "updatedAt" = ${now}
  `;
}

export async function pgGetAiAnalysisByMeetingId(meetingId: number): Promise<PgAiAnalysis | undefined> {
  const sql = getPgSql();
  if (!sql) return undefined;
  const rows = (await sql`SELECT * FROM ai_analyses WHERE "meetingId" = ${meetingId} LIMIT 1`) as PgAiAnalysis[];
  return rows[0];
}

// ─── SPICED Reports ───────────────────────────────────────────────────────────

export async function pgUpsertSpicedReport(data: {
  meetingId: number;
  situation?: string | null;
  situationConfidence?: number | null;
  pain?: string | null;
  painConfidence?: number | null;
  impact?: string | null;
  impactConfidence?: number | null;
  criticalEvent?: string | null;
  criticalEventConfidence?: number | null;
  decision?: string | null;
  decisionConfidence?: number | null;
  overallCompleteness?: number | null;
}) {
  const sql = getPgSql();
  if (!sql) throw new Error("DB not available");
  const now = Date.now();
  await sql`
    INSERT INTO spiced_reports (
      "meetingId", situation, "situationConfidence", pain, "painConfidence",
      impact, "impactConfidence", "criticalEvent", "criticalEventConfidence",
      decision, "decisionConfidence", "overallCompleteness", "createdAt", "updatedAt"
    ) VALUES (
      ${data.meetingId}, ${data.situation ?? null}, ${data.situationConfidence ?? null},
      ${data.pain ?? null}, ${data.painConfidence ?? null},
      ${data.impact ?? null}, ${data.impactConfidence ?? null},
      ${data.criticalEvent ?? null}, ${data.criticalEventConfidence ?? null},
      ${data.decision ?? null}, ${data.decisionConfidence ?? null},
      ${data.overallCompleteness ?? null}, ${now}, ${now}
    )
    ON CONFLICT ("meetingId") DO UPDATE SET
      situation = EXCLUDED.situation,
      "situationConfidence" = EXCLUDED."situationConfidence",
      pain = EXCLUDED.pain,
      "painConfidence" = EXCLUDED."painConfidence",
      impact = EXCLUDED.impact,
      "impactConfidence" = EXCLUDED."impactConfidence",
      "criticalEvent" = EXCLUDED."criticalEvent",
      "criticalEventConfidence" = EXCLUDED."criticalEventConfidence",
      decision = EXCLUDED.decision,
      "decisionConfidence" = EXCLUDED."decisionConfidence",
      "overallCompleteness" = EXCLUDED."overallCompleteness",
      "updatedAt" = ${now}
  `;
}

export async function pgGetSpicedReportByMeetingId(meetingId: number): Promise<PgSpicedReport | undefined> {
  const sql = getPgSql();
  if (!sql) return undefined;
  const rows = (await sql`SELECT * FROM spiced_reports WHERE "meetingId" = ${meetingId} LIMIT 1`) as PgSpicedReport[];
  return rows[0];
}

// ─── MEDDPICC Reports ─────────────────────────────────────────────────────────

export async function pgUpsertMeddpiccReport(data: {
  meetingId: number;
  metrics?: string | null;
  metricsConfidence?: number | null;
  economicBuyer?: string | null;
  economicBuyerConfidence?: number | null;
  decisionCriteria?: string | null;
  decisionCriteriaConfidence?: number | null;
  decisionProcess?: string | null;
  decisionProcessConfidence?: number | null;
  paperProcess?: string | null;
  paperProcessConfidence?: number | null;
  identifyPain?: string | null;
  identifyPainConfidence?: number | null;
  champion?: string | null;
  championConfidence?: number | null;
  competition?: string | null;
  competitionConfidence?: number | null;
  overallCompleteness?: number | null;
}) {
  const sql = getPgSql();
  if (!sql) throw new Error("DB not available");
  const now = Date.now();
  await sql`
    INSERT INTO meddpicc_reports (
      "meetingId", metrics, "metricsConfidence",
      "economicBuyer", "economicBuyerConfidence",
      "decisionCriteria", "decisionCriteriaConfidence",
      "decisionProcess", "decisionProcessConfidence",
      "paperProcess", "paperProcessConfidence",
      "identifyPain", "identifyPainConfidence",
      champion, "championConfidence",
      competition, "competitionConfidence",
      "overallCompleteness", "createdAt", "updatedAt"
    ) VALUES (
      ${data.meetingId}, ${data.metrics ?? null}, ${data.metricsConfidence ?? null},
      ${data.economicBuyer ?? null}, ${data.economicBuyerConfidence ?? null},
      ${data.decisionCriteria ?? null}, ${data.decisionCriteriaConfidence ?? null},
      ${data.decisionProcess ?? null}, ${data.decisionProcessConfidence ?? null},
      ${data.paperProcess ?? null}, ${data.paperProcessConfidence ?? null},
      ${data.identifyPain ?? null}, ${data.identifyPainConfidence ?? null},
      ${data.champion ?? null}, ${data.championConfidence ?? null},
      ${data.competition ?? null}, ${data.competitionConfidence ?? null},
      ${data.overallCompleteness ?? null}, ${now}, ${now}
    )
    ON CONFLICT ("meetingId") DO UPDATE SET
      metrics = EXCLUDED.metrics, "metricsConfidence" = EXCLUDED."metricsConfidence",
      "economicBuyer" = EXCLUDED."economicBuyer", "economicBuyerConfidence" = EXCLUDED."economicBuyerConfidence",
      "decisionCriteria" = EXCLUDED."decisionCriteria", "decisionCriteriaConfidence" = EXCLUDED."decisionCriteriaConfidence",
      "decisionProcess" = EXCLUDED."decisionProcess", "decisionProcessConfidence" = EXCLUDED."decisionProcessConfidence",
      "paperProcess" = EXCLUDED."paperProcess", "paperProcessConfidence" = EXCLUDED."paperProcessConfidence",
      "identifyPain" = EXCLUDED."identifyPain", "identifyPainConfidence" = EXCLUDED."identifyPainConfidence",
      champion = EXCLUDED.champion, "championConfidence" = EXCLUDED."championConfidence",
      competition = EXCLUDED.competition, "competitionConfidence" = EXCLUDED."competitionConfidence",
      "overallCompleteness" = EXCLUDED."overallCompleteness", "updatedAt" = ${now}
  `;
}

export async function pgGetMeddpiccReportByMeetingId(meetingId: number): Promise<PgMeddpiccReport | undefined> {
  const sql = getPgSql();
  if (!sql) return undefined;
  const rows = (await sql`SELECT * FROM meddpicc_reports WHERE "meetingId" = ${meetingId} LIMIT 1`) as PgMeddpiccReport[];
  return rows[0];
}

// ─── Action Items ─────────────────────────────────────────────────────────────

export async function pgCreateActionItem(data: {
  meetingId: number;
  title?: string | null;
  description?: string | null;
  priority?: string;
  status?: string;
  assignee?: string | null;
  dueDate?: number | null;
  isAiGenerated?: boolean;
  sourceQuote?: string | null;
}) {
  const sql = getPgSql();
  if (!sql) throw new Error("DB not available");
  const rows = (await sql`
    INSERT INTO action_items ("meetingId", title, description, priority, status, assignee, "dueDate", "isAiGenerated", "sourceQuote", "createdAt", "updatedAt")
    VALUES (
      ${data.meetingId}, ${data.title ?? null}, ${data.description ?? null},
      ${data.priority ?? "medium"}, ${data.status ?? "open"},
      ${data.assignee ?? null}, ${data.dueDate ?? null},
      ${data.isAiGenerated ?? true}, ${data.sourceQuote ?? null},
      ${Date.now()}, ${Date.now()}
    )
    RETURNING id
  `) as Rows;
  return (rows[0] as { id: number }).id;
}

export async function pgGetActionItems(meetingId?: number): Promise<PgActionItem[]> {
  const sql = getPgSql();
  if (!sql) return [];
  if (meetingId !== undefined) {
    return (await sql`SELECT * FROM action_items WHERE "meetingId" = ${meetingId} ORDER BY "createdAt" DESC`) as PgActionItem[];
  }
  return (await sql`SELECT * FROM action_items ORDER BY "createdAt" DESC LIMIT 100`) as PgActionItem[];
}

export async function pgUpdateActionItem(id: number, data: { status?: string; priority?: string; description?: string | null; title?: string | null }) {
  const sql = getPgSql();
  if (!sql) throw new Error("DB not available");
  await sql`
    UPDATE action_items SET
      status = COALESCE(${data.status ?? null}, status),
      priority = COALESCE(${data.priority ?? null}, priority),
      description = COALESCE(${data.description ?? null}, description),
      title = COALESCE(${data.title ?? null}, title),
      "updatedAt" = ${Date.now()}
    WHERE id = ${id}
  `;
}

export async function pgDeleteActionItem(id: number) {
  const sql = getPgSql();
  if (!sql) throw new Error("DB not available");
  await sql`DELETE FROM action_items WHERE id = ${id}`;
}

// ─── Pitch Coaching ───────────────────────────────────────────────────────────

export async function pgUpsertPitchCoaching(data: {
  meetingId: number;
  overallScore?: number | null;
  talkTimeRatio?: number | null;
  discoveryScore?: number | null;
  objectionScore?: number | null;
  valueScore?: number | null;
  nextStepScore?: number | null;
  closingScore?: number | null;
  moments?: unknown;
  strengths?: unknown;
  improvements?: unknown;
  missedOpportunities?: unknown;
  competitorsMentioned?: unknown;
  battlecardUsed?: boolean;
  meddpiccCoverage?: number | null;
}) {
  const sql = getPgSql();
  if (!sql) throw new Error("DB not available");
  const now = Date.now();
  await sql`
    INSERT INTO pitch_coaching (
      "meetingId", "overallScore", "talkTimeRatio", "discoveryScore", "objectionScore",
      "valueScore", "nextStepScore", "closingScore", moments, strengths, improvements,
      "missedOpportunities", "competitorsMentioned", "battlecardUsed", "meddpiccCoverage",
      "createdAt", "updatedAt"
    ) VALUES (
      ${data.meetingId}, ${data.overallScore ?? null}, ${data.talkTimeRatio ?? null},
      ${data.discoveryScore ?? null}, ${data.objectionScore ?? null},
      ${data.valueScore ?? null}, ${data.nextStepScore ?? null}, ${data.closingScore ?? null},
      ${JSON.stringify(data.moments ?? [])}::jsonb,
      ${JSON.stringify(data.strengths ?? [])}::jsonb,
      ${JSON.stringify(data.improvements ?? [])}::jsonb,
      ${JSON.stringify(data.missedOpportunities ?? [])}::jsonb,
      ${JSON.stringify(data.competitorsMentioned ?? [])}::jsonb,
      ${data.battlecardUsed ?? false}, ${data.meddpiccCoverage ?? null},
      ${now}, ${now}
    )
    ON CONFLICT ("meetingId") DO UPDATE SET
      "overallScore" = EXCLUDED."overallScore",
      "talkTimeRatio" = EXCLUDED."talkTimeRatio",
      "discoveryScore" = EXCLUDED."discoveryScore",
      "objectionScore" = EXCLUDED."objectionScore",
      "valueScore" = EXCLUDED."valueScore",
      "nextStepScore" = EXCLUDED."nextStepScore",
      "closingScore" = EXCLUDED."closingScore",
      moments = EXCLUDED.moments,
      strengths = EXCLUDED.strengths,
      improvements = EXCLUDED.improvements,
      "missedOpportunities" = EXCLUDED."missedOpportunities",
      "competitorsMentioned" = EXCLUDED."competitorsMentioned",
      "battlecardUsed" = EXCLUDED."battlecardUsed",
      "meddpiccCoverage" = EXCLUDED."meddpiccCoverage",
      "updatedAt" = ${now}
  `;
}

export async function pgGetPitchCoachingByMeetingId(meetingId: number): Promise<PgPitchCoaching | undefined> {
  const sql = getPgSql();
  if (!sql) return undefined;
  const rows = (await sql`SELECT * FROM pitch_coaching WHERE "meetingId" = ${meetingId} LIMIT 1`) as PgPitchCoaching[];
  return rows[0];
}

// ─── Pre-Call Intelligence ────────────────────────────────────────────────────

export async function pgUpsertPreCallIntelligence(data: {
  meetingId: number;
  companyName?: string | null;
  companyDomain?: string | null;
  industry?: string | null;
  companySize?: string | null;
  fundingStage?: string | null;
  recentNews?: unknown;
  techStack?: unknown;
  currentTools?: unknown;
  triggerEvents?: unknown;
  prepBullets?: unknown;
  suggestedOpening?: string | null;
  leadWithProduct?: string | null;
  buyerPersona?: string | null;
}) {
  const sql = getPgSql();
  if (!sql) throw new Error("DB not available");
  const now = Date.now();
  await sql`
    INSERT INTO pre_call_intelligence (
      "meetingId", "companyName", "companyDomain", industry, "companySize", "fundingStage",
      "recentNews", "techStack", "currentTools", "triggerEvents", "prepBullets",
      "suggestedOpening", "leadWithProduct", "buyerPersona", "createdAt", "updatedAt"
    ) VALUES (
      ${data.meetingId}, ${data.companyName ?? null}, ${data.companyDomain ?? null},
      ${data.industry ?? null}, ${data.companySize ?? null}, ${data.fundingStage ?? null},
      ${JSON.stringify(data.recentNews ?? [])}::jsonb,
      ${JSON.stringify(data.techStack ?? [])}::jsonb,
      ${JSON.stringify(data.currentTools ?? [])}::jsonb,
      ${JSON.stringify(data.triggerEvents ?? [])}::jsonb,
      ${JSON.stringify(data.prepBullets ?? [])}::jsonb,
      ${data.suggestedOpening ?? null}, ${data.leadWithProduct ?? null}, ${data.buyerPersona ?? null},
      ${now}, ${now}
    )
    ON CONFLICT ("meetingId") DO UPDATE SET
      "companyName" = EXCLUDED."companyName",
      "companyDomain" = EXCLUDED."companyDomain",
      industry = EXCLUDED.industry,
      "companySize" = EXCLUDED."companySize",
      "fundingStage" = EXCLUDED."fundingStage",
      "recentNews" = EXCLUDED."recentNews",
      "techStack" = EXCLUDED."techStack",
      "currentTools" = EXCLUDED."currentTools",
      "triggerEvents" = EXCLUDED."triggerEvents",
      "prepBullets" = EXCLUDED."prepBullets",
      "suggestedOpening" = EXCLUDED."suggestedOpening",
      "leadWithProduct" = EXCLUDED."leadWithProduct",
      "buyerPersona" = EXCLUDED."buyerPersona",
      "updatedAt" = ${now}
  `;
}

export async function pgGetPreCallIntelligenceByMeetingId(meetingId: number): Promise<PgPreCallIntelligence | undefined> {
  const sql = getPgSql();
  if (!sql) return undefined;
  const rows = (await sql`SELECT * FROM pre_call_intelligence WHERE "meetingId" = ${meetingId} LIMIT 1`) as PgPreCallIntelligence[];
  return rows[0];
}

// ─── Prospects ────────────────────────────────────────────────────────────────

export async function pgCreateProspect(data: {
  sourceCompanyName?: string | null;
  prospectCompanyName?: string | null;
  prospectDomain?: string | null;
  industry?: string | null;
  companySize?: string | null;
  fundingStage?: string | null;
  contactName?: string | null;
  contactTitle?: string | null;
  contactLinkedin?: string | null;
  fitReason?: string | null;
  outreachAngle?: string | null;
  triggerEvent?: string | null;
  suggestedProduct?: string | null;
  status?: string;
  notes?: string | null;
}) {
  const sql = getPgSql();
  if (!sql) throw new Error("DB not available");
  const rows = (await sql`
    INSERT INTO prospects (
      "sourceCompanyName", "prospectCompanyName", "prospectDomain", industry, "companySize",
      "fundingStage", "contactName", "contactTitle", "contactLinkedin",
      "fitReason", "outreachAngle", "triggerEvent", "suggestedProduct",
      status, notes, "createdAt", "updatedAt"
    ) VALUES (
      ${data.sourceCompanyName ?? null}, ${data.prospectCompanyName ?? null}, ${data.prospectDomain ?? null},
      ${data.industry ?? null}, ${data.companySize ?? null}, ${data.fundingStage ?? null},
      ${data.contactName ?? null}, ${data.contactTitle ?? null}, ${data.contactLinkedin ?? null},
      ${data.fitReason ?? null}, ${data.outreachAngle ?? null}, ${data.triggerEvent ?? null},
      ${data.suggestedProduct ?? null}, ${data.status ?? "new"}, ${data.notes ?? null},
      ${Date.now()}, ${Date.now()}
    )
    RETURNING id
  `) as Rows;
  return (rows[0] as { id: number }).id;
}

export async function pgGetProspects(limit = 50, offset = 0): Promise<PgProspect[]> {
  const sql = getPgSql();
  if (!sql) return [];
  return (await sql`SELECT * FROM prospects ORDER BY "createdAt" DESC LIMIT ${limit} OFFSET ${offset}`) as PgProspect[];
}

export async function pgGetProspectById(id: number): Promise<PgProspect | undefined> {
  const sql = getPgSql();
  if (!sql) return undefined;
  const rows = (await sql`SELECT * FROM prospects WHERE id = ${id} LIMIT 1`) as PgProspect[];
  return rows[0];
}

export async function pgUpdateProspect(id: number, data: { status?: string; notes?: string | null }) {
  const sql = getPgSql();
  if (!sql) throw new Error("DB not available");
  await sql`
    UPDATE prospects SET
      status = COALESCE(${data.status ?? null}, status),
      notes = COALESCE(${data.notes ?? null}, notes),
      "updatedAt" = ${Date.now()}
    WHERE id = ${id}
  `;
}

export async function pgDeleteProspect(id: number) {
  const sql = getPgSql();
  if (!sql) throw new Error("DB not available");
  await sql`DELETE FROM prospects WHERE id = ${id}`;
}
