import {
  boolean,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  float,
} from "drizzle-orm/mysql-core";

// ─── Users (required by auth core) ───────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Meetings ────────────────────────────────────────────────────────────────
export const meetings = mysqlTable("meetings", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  platform: mysqlEnum("platform", ["zoom", "google_meet", "teams", "slack", "webex", "other"]).notNull().default("zoom"),
  meetingUrl: text("meetingUrl"),
  recallBotId: varchar("recallBotId", { length: 128 }),
  status: mysqlEnum("status", ["scheduled", "joining", "recording", "processing", "completed", "failed"]).notNull().default("scheduled"),
  accountName: varchar("accountName", { length: 255 }),
  contactName: varchar("contactName", { length: 255 }),
  dealStage: varchar("dealStage", { length: 128 }),
  participants: json("participants").$type<string[]>(),
  scheduledAt: timestamp("scheduledAt"),
  startedAt: timestamp("startedAt"),
  endedAt: timestamp("endedAt"),
  durationSeconds: int("durationSeconds"),
  recordingUrl: text("recordingUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Meeting = typeof meetings.$inferSelect;
export type InsertMeeting = typeof meetings.$inferInsert;

// ─── Transcripts ─────────────────────────────────────────────────────────────
export const transcripts = mysqlTable("transcripts", {
  id: int("id").autoincrement().primaryKey(),
  meetingId: int("meetingId").notNull(),
  fullText: text("fullText"),
  segments: json("segments").$type<TranscriptSegment[]>(),
  speakerMap: json("speakerMap").$type<Record<string, string>>(),
  language: varchar("language", { length: 16 }).default("en"),
  wordCount: int("wordCount").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Transcript = typeof transcripts.$inferSelect;
export type InsertTranscript = typeof transcripts.$inferInsert;

export type TranscriptSegment = {
  id: number;
  speaker: string;
  speakerLabel: string;
  text: string;
  startTime: number;
  endTime: number;
  confidence?: number;
};

// ─── AI Analyses ─────────────────────────────────────────────────────────────
export const aiAnalyses = mysqlTable("ai_analyses", {
  id: int("id").autoincrement().primaryKey(),
  meetingId: int("meetingId").notNull().unique(),
  summary: text("summary"),
  painPoints: json("painPoints").$type<AnalysisItem[]>(),
  objections: json("objections").$type<AnalysisItem[]>(),
  buyingSignals: json("buyingSignals").$type<AnalysisItem[]>(),
  nextSteps: json("nextSteps").$type<AnalysisItem[]>(),
  keyQuotes: json("keyQuotes").$type<KeyQuote[]>(),
  dealScore: float("dealScore"),
  sentiment: mysqlEnum("sentiment", ["positive", "neutral", "negative", "mixed"]),
  talkRatio: json("talkRatio").$type<Record<string, number>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AiAnalysis = typeof aiAnalyses.$inferSelect;
export type InsertAiAnalysis = typeof aiAnalyses.$inferInsert;

export type AnalysisItem = {
  text: string;
  quote?: string;
  timestamp?: number;
  confidence: number;
};

export type KeyQuote = {
  speaker: string;
  text: string;
  timestamp: number;
  category: "pain" | "objection" | "buying_signal" | "decision" | "general";
};

// ─── SPICED Reports ───────────────────────────────────────────────────────────
export const spicedReports = mysqlTable("spiced_reports", {
  id: int("id").autoincrement().primaryKey(),
  meetingId: int("meetingId").notNull().unique(),
  // S — Situation
  situation: text("situation"),
  situationConfidence: float("situationConfidence"),
  situationAiGenerated: boolean("situationAiGenerated").default(true),
  // P — Pain
  pain: text("pain"),
  painConfidence: float("painConfidence"),
  painAiGenerated: boolean("painAiGenerated").default(true),
  // I — Impact
  impact: text("impact"),
  impactConfidence: float("impactConfidence"),
  impactAiGenerated: boolean("impactAiGenerated").default(true),
  // C — Critical Event
  criticalEvent: text("criticalEvent"),
  criticalEventConfidence: float("criticalEventConfidence"),
  criticalEventAiGenerated: boolean("criticalEventAiGenerated").default(true),
  // D — Decision
  decision: text("decision"),
  decisionConfidence: float("decisionConfidence"),
  decisionAiGenerated: boolean("decisionAiGenerated").default(true),
  // Meta
  overallCompleteness: float("overallCompleteness").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SpicedReport = typeof spicedReports.$inferSelect;
export type InsertSpicedReport = typeof spicedReports.$inferInsert;

// ─── MEDDPICC Reports ─────────────────────────────────────────────────────────
export const meddpiccReports = mysqlTable("meddpicc_reports", {
  id: int("id").autoincrement().primaryKey(),
  meetingId: int("meetingId").notNull().unique(),
  // M — Metrics
  metrics: text("metrics"),
  metricsConfidence: float("metricsConfidence"),
  metricsAiGenerated: boolean("metricsAiGenerated").default(true),
  // E — Economic Buyer
  economicBuyer: text("economicBuyer"),
  economicBuyerConfidence: float("economicBuyerConfidence"),
  economicBuyerAiGenerated: boolean("economicBuyerAiGenerated").default(true),
  // D — Decision Criteria
  decisionCriteria: text("decisionCriteria"),
  decisionCriteriaConfidence: float("decisionCriteriaConfidence"),
  decisionCriteriaAiGenerated: boolean("decisionCriteriaAiGenerated").default(true),
  // D — Decision Process
  decisionProcess: text("decisionProcess"),
  decisionProcessConfidence: float("decisionProcessConfidence"),
  decisionProcessAiGenerated: boolean("decisionProcessAiGenerated").default(true),
  // P — Paper Process
  paperProcess: text("paperProcess"),
  paperProcessConfidence: float("paperProcessConfidence"),
  paperProcessAiGenerated: boolean("paperProcessAiGenerated").default(true),
  // I — Identify Pain
  identifyPain: text("identifyPain"),
  identifyPainConfidence: float("identifyPainConfidence"),
  identifyPainAiGenerated: boolean("identifyPainAiGenerated").default(true),
  // C — Champion
  champion: text("champion"),
  championConfidence: float("championConfidence"),
  championAiGenerated: boolean("championAiGenerated").default(true),
  // C — Competition
  competition: text("competition"),
  competitionConfidence: float("competitionConfidence"),
  competitionAiGenerated: boolean("competitionAiGenerated").default(true),
  // Meta
  overallCompleteness: float("overallCompleteness").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MeddpiccReport = typeof meddpiccReports.$inferSelect;
export type InsertMeddpiccReport = typeof meddpiccReports.$inferInsert;

// ─── Action Items ─────────────────────────────────────────────────────────────
export const actionItems = mysqlTable("action_items", {
  id: int("id").autoincrement().primaryKey(),
  meetingId: int("meetingId"),
  title: varchar("title", { length: 512 }).notNull(),
  description: text("description"),
  dueDate: timestamp("dueDate"),
  status: mysqlEnum("status", ["open", "in_progress", "completed", "cancelled"]).notNull().default("open"),
  priority: mysqlEnum("priority", ["low", "medium", "high", "urgent"]).notNull().default("medium"),
  assignee: varchar("assignee", { length: 255 }),
  isAiGenerated: boolean("isAiGenerated").default(false),
  sourceQuote: text("sourceQuote"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ActionItem = typeof actionItems.$inferSelect;
export type InsertActionItem = typeof actionItems.$inferInsert;

// ─── Notes ────────────────────────────────────────────────────────────────────
export const notes = mysqlTable("notes", {
  id: int("id").autoincrement().primaryKey(),
  meetingId: int("meetingId"),
  title: varchar("title", { length: 255 }),
  content: text("content"),
  templateType: mysqlEnum("templateType", ["free_form", "discovery", "demo", "follow_up", "custom"]).default("free_form"),
  isAiGenerated: boolean("isAiGenerated").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Note = typeof notes.$inferSelect;
export type InsertNote = typeof notes.$inferInsert;
// ─── App Settings ─────────────────────────────────────────────────────────────
export const appSettings = mysqlTable("app_settings", {
  id: int("id").autoincrement().primaryKey(),
  // Local AI configuration (privacy-first — zero external data)
  ollamaEndpoint: varchar("ollamaEndpoint", { length: 512 }).default("http://localhost:11434"),
  ollamaModel: varchar("ollamaModel", { length: 128 }).default("llama3.1:8b"),
  whisperEndpoint: varchar("whisperEndpoint", { length: 512 }).default("http://localhost:8001"),
  // Legacy / optional
  botName: varchar("botName", { length: 255 }).default("SalesLens"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type AppSettings = typeof appSettings.$inferSelect;
export type InsertAppSettings = typeof appSettings.$inferInsert;

// ─── Pitch Coaching ───────────────────────────────────────────────────────────
export const pitchCoaching = mysqlTable("pitch_coaching", {
  id: int("id").autoincrement().primaryKey(),
  meetingId: int("meetingId").notNull().unique(),
  overallScore: float("overallScore"),
  talkTimeRatio: float("talkTimeRatio"), // rep's % of talk time
  discoveryScore: float("discoveryScore"),
  objectionScore: float("objectionScore"),
  valueScore: float("valueScore"),
  nextStepScore: float("nextStepScore"),
  closingScore: float("closingScore"),
  moments: json("moments").$type<CoachingMoment[]>(),
  strengths: json("strengths").$type<string[]>(),
  improvements: json("improvements").$type<string[]>(),
  missedOpportunities: json("missedOpportunities").$type<string[]>(),
  competitorsMentioned: json("competitorsMentioned").$type<string[]>(),
  battlecardUsed: boolean("battlecardUsed").default(false),
  meddpiccCoverage: float("meddpiccCoverage"), // % of MEDDPICC fields addressed
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PitchCoaching = typeof pitchCoaching.$inferSelect;
export type InsertPitchCoaching = typeof pitchCoaching.$inferInsert;

export type CoachingMoment = {
  timestamp?: number;
  speaker: string;
  whatWasSaid: string;
  whatShouldHaveBeenSaid: string;
  why: string;
  category: "discovery" | "objection" | "value_prop" | "closing" | "competitor" | "product_fit" | "general";
  severity: "low" | "medium" | "high";
};

// ─── Pre-Call Intelligence ────────────────────────────────────────────────────
export const preCallIntelligence = mysqlTable("pre_call_intelligence", {
  id: int("id").autoincrement().primaryKey(),
  meetingId: int("meetingId").notNull().unique(),
  companyName: varchar("companyName", { length: 255 }),
  companyDomain: varchar("companyDomain", { length: 255 }),
  industry: varchar("industry", { length: 128 }),
  companySize: varchar("companySize", { length: 64 }),
  fundingStage: varchar("fundingStage", { length: 64 }),
  recentNews: json("recentNews").$type<string[]>(),
  techStack: json("techStack").$type<string[]>(),
  currentTools: json("currentTools").$type<string[]>(), // known assessment/hiring tools they use
  triggerEvents: json("triggerEvents").$type<TriggerEvent[]>(),
  prepBullets: json("prepBullets").$type<PrepBullet[]>(),
  suggestedOpening: text("suggestedOpening"),
  leadWithProduct: varchar("leadWithProduct", { length: 128 }), // which HE product to lead with
  buyerPersona: varchar("buyerPersona", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PreCallIntelligence = typeof preCallIntelligence.$inferSelect;
export type InsertPreCallIntelligence = typeof preCallIntelligence.$inferInsert;

export type TriggerEvent = {
  event: string;
  relevance: string; // why this matters for HackerEarth pitch
  urgency: "low" | "medium" | "high";
};

export type PrepBullet = {
  point: string;
  why: string; // context/rationale
  source?: string;
};

// ─── Prospects (Lead Generation Queue) ───────────────────────────────────────
export const prospects = mysqlTable("prospects", {
  id: int("id").autoincrement().primaryKey(),
  sourceCompanyName: varchar("sourceCompanyName", { length: 255 }), // company from transcript that led to this prospect
  prospectCompanyName: varchar("prospectCompanyName", { length: 255 }).notNull(),
  prospectDomain: varchar("prospectDomain", { length: 255 }),
  industry: varchar("industry", { length: 128 }),
  companySize: varchar("companySize", { length: 64 }),
  fundingStage: varchar("fundingStage", { length: 64 }),
  contactName: varchar("contactName", { length: 255 }),
  contactTitle: varchar("contactTitle", { length: 255 }),
  contactLinkedin: varchar("contactLinkedin", { length: 512 }),
  fitReason: text("fitReason"), // why this company is a good HE prospect
  outreachAngle: text("outreachAngle"), // specific HE product angle for this prospect
  triggerEvent: text("triggerEvent"), // what makes this timely
  suggestedProduct: varchar("suggestedProduct", { length: 128 }), // HE product to lead with
  status: mysqlEnum("status", ["to_contact", "contacted", "in_progress", "converted", "not_a_fit"]).notNull().default("to_contact"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Prospect = typeof prospects.$inferSelect;
export type InsertProspect = typeof prospects.$inferInsert;

// ─── Generated Emails ─────────────────────────────────────────────────────────
export const generatedEmails = mysqlTable("generated_emails", {
  id: int("id").autoincrement().primaryKey(),
  meetingId: int("meetingId"), // optional — can generate email without a meeting
  prospectId: int("prospectId"), // optional — can link to a prospect
  emailType: mysqlEnum("emailType", ["follow_up", "cold_outreach", "objection_response", "demo_follow_up", "proposal_follow_up", "custom"]).notNull().default("follow_up"),
  subject: varchar("subject", { length: 512 }),
  body: text("body"),
  context: text("context"), // what the user told the AI about this email
  recipientName: varchar("recipientName", { length: 255 }),
  recipientTitle: varchar("recipientTitle", { length: 255 }),
  recipientCompany: varchar("recipientCompany", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type GeneratedEmail = typeof generatedEmails.$inferSelect;
export type InsertGeneratedEmail = typeof generatedEmails.$inferInsert;
