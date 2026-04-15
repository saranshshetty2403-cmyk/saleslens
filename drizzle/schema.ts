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

// ─── Accounts (deduplicated company/org records) ──────────────────────────────
export const accounts = mysqlTable("accounts", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  normalizedName: varchar("normalizedName", { length: 255 }).notNull(), // lowercase, stripped for fuzzy match
  domain: varchar("domain", { length: 255 }),
  industry: varchar("industry", { length: 255 }),
  companySize: varchar("companySize", { length: 128 }),
  primaryContactName: varchar("primaryContactName", { length: 255 }),
  primaryContactTitle: varchar("primaryContactTitle", { length: 255 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Account = typeof accounts.$inferSelect;
export type InsertAccount = typeof accounts.$inferInsert;

// ─── Meetings ────────────────────────────────────────────────────────────────
export const meetings = mysqlTable("meetings", {
  id: int("id").autoincrement().primaryKey(),
  accountId: int("accountId"), // FK to accounts table (nullable for backward compat)
  title: varchar("title", { length: 255 }).notNull(),
  platform: mysqlEnum("platform", ["zoom", "google_meet", "teams", "slack", "webex", "other"]).notNull().default("zoom"),
  meetingUrl: text("meetingUrl"),
  recallBotId: varchar("recallBotId", { length: 128 }),
  status: mysqlEnum("status", ["scheduled", "joining", "recording", "processing", "completed", "failed"]).notNull().default("scheduled"),
  accountName: varchar("accountName", { length: 255 }),
  contactName: varchar("contactName", { length: 255 }),
  contactTitle: varchar("contactTitle", { length: 255 }),
  dealStage: varchar("dealStage", { length: 128 }),
  dealValue: varchar("dealValue", { length: 128 }),
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
  ollamaEndpoint: varchar("ollamaEndpoint", { length: 512 }).default("http://localhost:11434"),
  ollamaModel: varchar("ollamaModel", { length: 128 }).default("llama3.1:8b"),
  whisperEndpoint: varchar("whisperEndpoint", { length: 512 }).default("http://localhost:8001"),
  botName: varchar("botName", { length: 255 }).default("SalesLens"),
  // Email style profile — learned from accepted emails
  emailStyleProfile: json("emailStyleProfile").$type<EmailStyleProfile | null>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type AppSettings = typeof appSettings.$inferSelect;
export type InsertAppSettings = typeof appSettings.$inferInsert;

export type EmailStyleProfile = {
  tone: string; // e.g. "conversational but professional"
  avgLength: string; // e.g. "concise (under 150 words)"
  openingStyle: string; // e.g. "direct, no pleasantries"
  closingStyle: string; // e.g. "single clear CTA"
  avoidPhrases: string[]; // phrases the user consistently removes
  preferredPhrases: string[]; // phrases the user consistently keeps/adds
  structureNotes: string; // e.g. "always uses bullet points for value props"
  learnedAt: string; // ISO timestamp of last learning pass
  samplesAnalyzed: number;
};

// ─── Pitch Coaching ───────────────────────────────────────────────────────────
export const pitchCoaching = mysqlTable("pitch_coaching", {
  id: int("id").autoincrement().primaryKey(),
  meetingId: int("meetingId").notNull().unique(),
  overallScore: float("overallScore"),
  talkTimeRatio: float("talkTimeRatio"),
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
  meddpiccCoverage: float("meddpiccCoverage"),
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
  industry: text("industry"),
  companySize: text("companySize"),
  fundingStage: text("fundingStage"),
  recentNews: json("recentNews").$type<string[]>(),
  techStack: json("techStack").$type<string[]>(),
  currentTools: json("currentTools").$type<string[]>(),
  triggerEvents: json("triggerEvents").$type<TriggerEvent[]>(),
  prepBullets: json("prepBullets").$type<PrepBullet[]>(),
  suggestedOpening: text("suggestedOpening"),
  leadWithProduct: text("leadWithProduct"),
  buyerPersona: text("buyerPersona"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PreCallIntelligence = typeof preCallIntelligence.$inferSelect;
export type InsertPreCallIntelligence = typeof preCallIntelligence.$inferInsert;

export type TriggerEvent = {
  event: string;
  relevance: string;
  urgency: "low" | "medium" | "high";
};

export type PrepBullet = {
  point: string;
  why: string;
  source?: string;
};

// ─── Prospects (Lead Generation Queue) ───────────────────────────────────────
export const prospects = mysqlTable("prospects", {
  id: int("id").autoincrement().primaryKey(),
  sourceCompanyName: varchar("sourceCompanyName", { length: 255 }),
  prospectCompanyName: varchar("prospectCompanyName", { length: 255 }).notNull(),
  prospectDomain: varchar("prospectDomain", { length: 255 }),
  industry: text("industry"),
  companySize: text("companySize"),
  fundingStage: text("fundingStage"),
  contactName: varchar("contactName", { length: 255 }),
  contactTitle: varchar("contactTitle", { length: 255 }),
  contactLinkedin: varchar("contactLinkedin", { length: 512 }),
  fitReason: text("fitReason"),
  outreachAngle: text("outreachAngle"),
  triggerEvent: text("triggerEvent"),
  suggestedProduct: varchar("suggestedProduct", { length: 128 }),
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
  meetingId: int("meetingId"),
  prospectId: int("prospectId"),
  emailType: mysqlEnum("emailType", ["follow_up", "cold_outreach", "objection_response", "demo_follow_up", "proposal_follow_up", "custom"]).notNull().default("follow_up"),
  subject: varchar("subject", { length: 512 }),
  body: text("body"),
  context: text("context"), // user's free-form prompt / intent
  recipientName: varchar("recipientName", { length: 255 }),
  recipientTitle: varchar("recipientTitle", { length: 255 }),
  recipientCompany: varchar("recipientCompany", { length: 255 }),
  // Feedback / learning columns
  accepted: boolean("accepted").default(false),       // did user click "Accept & Use"?
  userEdits: text("userEdits"),                       // final version after user edits (if any)
  styleNotes: text("styleNotes"),                     // AI-extracted style observations from this email
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type GeneratedEmail = typeof generatedEmails.$inferSelect;
export type InsertGeneratedEmail = typeof generatedEmails.$inferInsert;

// ─── Deal Summaries (multi-call consolidation per account) ────────────────────
export const dealSummaries = mysqlTable("deal_summaries", {
  id: int("id").autoincrement().primaryKey(),
  accountId: int("accountId").notNull(),
  accountName: varchar("accountName", { length: 255 }).notNull(),
  // Consolidated MEDDPICC across all calls
  consolidatedMeddpicc: json("consolidatedMeddpicc").$type<ConsolidatedMeddpicc | null>(),
  // Consolidated SPICED across all calls
  consolidatedSpiced: json("consolidatedSpiced").$type<ConsolidatedSpiced | null>(),
  // Deal health over time
  dealHealthScore: float("dealHealthScore"),
  dealHealthTrend: json("dealHealthTrend").$type<DealHealthPoint[]>(),
  // Narrative summary of the full deal thread
  dealNarrative: text("dealNarrative"),
  // Key risks and momentum signals
  keyRisks: json("keyRisks").$type<string[]>(),
  momentumSignals: json("momentumSignals").$type<string[]>(),
  recommendedNextAction: text("recommendedNextAction"),
  callCount: int("callCount").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DealSummary = typeof dealSummaries.$inferSelect;
export type InsertDealSummary = typeof dealSummaries.$inferInsert;

export type ConsolidatedMeddpicc = {
  metrics: string; metricsConfidence: number;
  economicBuyer: string; economicBuyerConfidence: number;
  decisionCriteria: string; decisionCriteriaConfidence: number;
  decisionProcess: string; decisionProcessConfidence: number;
  paperProcess: string; paperProcessConfidence: number;
  identifyPain: string; identifyPainConfidence: number;
  champion: string; championConfidence: number;
  competition: string; competitionConfidence: number;
  overallCompleteness: number;
  lastUpdatedFromCall: number; // meetingId
};

export type ConsolidatedSpiced = {
  situation: string; situationConfidence: number;
  pain: string; painConfidence: number;
  impact: string; impactConfidence: number;
  criticalEvent: string; criticalEventConfidence: number;
  decision: string; decisionConfidence: number;
  overallCompleteness: number;
  lastUpdatedFromCall: number;
};

export type DealHealthPoint = {
  meetingId: number;
  meetingTitle: string;
  score: number;
  date: string; // ISO date string
  sentiment: string;
};
