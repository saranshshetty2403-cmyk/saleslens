import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  actionItems,
  aiAnalyses,
  meddpiccReports,
  meetings,
  notes,
  spicedReports,
  transcripts,
  users,
  appSettings,
  type InsertActionItem,
  type InsertAiAnalysis,
  type InsertMeddpiccReport,
  type InsertMeeting,
  type InsertNote,
  type InsertSpicedReport,
  type InsertTranscript,
} from "../drizzle/schema";
import * as pg from "./db.pg";

// ─── DB type detection ────────────────────────────────────────────────────────
export function isPg(): boolean {
  const url = process.env.DATABASE_URL ?? "";
  return url.startsWith("postgresql://") || url.startsWith("postgres://");
}

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (isPg()) return null; // Postgres handled by db.pg.ts
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (isPg()) {
    await pg.pgUpsertUser({ openId: user.openId, name: user.name ?? null, email: (user as Record<string, unknown>).email as string ?? null });
    return;
  }
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  for (const field of ["name", "email", "loginMethod"] as const) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  values.lastSignedIn = new Date();
  updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (isPg()) return pg.pgGetUserByOpenId(openId) as any;
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

// ─── Meetings ─────────────────────────────────────────────────────────────────
export async function createMeeting(data: InsertMeeting) {
  if (isPg()) {
    const id = await pg.pgCreateMeeting(data as Parameters<typeof pg.pgCreateMeeting>[0]);
    return { id };
  }
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(meetings).values(data);
  const header = result[0] as { insertId?: number };
  return { id: header.insertId ?? 0 };
}

export async function getMeetings(limit = 50, offset = 0) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (isPg()) return pg.pgGetMeetings(limit, offset) as any;
  const db = await getDb();
  if (!db) return [];
  return db.select().from(meetings).orderBy(desc(meetings.createdAt)).limit(limit).offset(offset);
}

export async function getMeetingById(id: number) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (isPg()) return pg.pgGetMeetingById(id) as any;
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(meetings).where(eq(meetings.id, id)).limit(1);
  return result[0];
}

export async function updateMeeting(id: number, data: Partial<InsertMeeting>) {
  if (isPg()) { await pg.pgUpdateMeeting(id, data as Record<string, unknown>); return; }
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(meetings).set(data).where(eq(meetings.id, id));
}

export async function deleteMeeting(id: number) {
  if (isPg()) { await pg.pgDeleteMeeting(id); return; }
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(meetings).where(eq(meetings.id, id));
}

export async function searchMeetings(query: string) {
  if (isPg()) return pg.pgSearchMeetings(query);
  const db = await getDb();
  if (!db) return [];
  const q = `%${query}%`;
  return db
    .select()
    .from(meetings)
    .where(or(like(meetings.title, q), like(meetings.accountName, q), like(meetings.contactName, q)))
    .orderBy(desc(meetings.createdAt))
    .limit(20);
}

export async function getMeetingStats(): Promise<{ total: number; completed: number; scheduled: number; processing: number; withTranscripts: number; withAnalysis: number; avgDealScore: number }> {
  if (isPg()) {
    const r = await pg.pgGetMeetingStats();
    return { total: Number(r.total), completed: 0, scheduled: 0, processing: 0, withTranscripts: Number(r.withTranscripts), withAnalysis: Number(r.withAnalysis), avgDealScore: Number(r.avgDealScore) };
  }
  const db = await getDb();
  if (!db) return { total: 0, completed: 0, scheduled: 0, processing: 0, withTranscripts: 0, withAnalysis: 0, avgDealScore: 0 };
  const rows = await db
    .select({ status: meetings.status, count: sql<number>`count(*)` })
    .from(meetings)
    .groupBy(meetings.status);
  const stats = { total: 0, completed: 0, scheduled: 0, processing: 0, withTranscripts: 0, withAnalysis: 0, avgDealScore: 0 };
  for (const row of rows) {
    stats.total += Number(row.count);
    if (row.status === "completed") stats.completed = Number(row.count);
    if (row.status === "scheduled") stats.scheduled = Number(row.count);
    if (row.status === "processing") stats.processing = Number(row.count);
  }
  return stats;
}

// ─── Transcripts ──────────────────────────────────────────────────────────────
export async function upsertTranscript(data: InsertTranscript) {
  if (isPg()) {
    await pg.pgUpsertTranscript(data as Parameters<typeof pg.pgUpsertTranscript>[0]);
    return 0;
  }
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const existing = await db.select().from(transcripts).where(eq(transcripts.meetingId, data.meetingId!)).limit(1);
  if (existing.length > 0) {
    await db.update(transcripts).set(data).where(eq(transcripts.meetingId, data.meetingId!));
    return existing[0].id;
  }
  const result = await db.insert(transcripts).values(data);
  return result[0].insertId;
}

export async function getTranscriptByMeetingId(meetingId: number) {
  if (isPg()) return pg.pgGetTranscriptByMeetingId(meetingId);
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(transcripts).where(eq(transcripts.meetingId, meetingId)).limit(1);
  return result[0];
}

export async function searchTranscripts(query: string) {
  if (isPg()) return pg.pgSearchTranscripts(query);
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ meetingId: transcripts.meetingId, fullText: transcripts.fullText })
    .from(transcripts)
    .where(like(transcripts.fullText, `%${query}%`))
    .limit(20);
}

// ─── AI Analyses ──────────────────────────────────────────────────────────────
export async function upsertAiAnalysis(data: InsertAiAnalysis) {
  if (isPg()) {
    await pg.pgUpsertAiAnalysis(data as Parameters<typeof pg.pgUpsertAiAnalysis>[0]);
    return 0;
  }
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const { meetingId: _m, id: _i, createdAt: _c, ...updateFields } = data as Record<string, unknown>;
  const result = await db.insert(aiAnalyses).values(data).onDuplicateKeyUpdate({ set: updateFields as Partial<InsertAiAnalysis> });
  return result[0].insertId;
}

export async function getAiAnalysisByMeetingId(meetingId: number) {
  if (isPg()) return pg.pgGetAiAnalysisByMeetingId(meetingId);
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(aiAnalyses).where(eq(aiAnalyses.meetingId, meetingId)).limit(1);
  return result[0];
}

// ─── SPICED Reports ───────────────────────────────────────────────────────────
export async function upsertSpicedReport(data: InsertSpicedReport) {
  if (isPg()) {
    await pg.pgUpsertSpicedReport(data as Parameters<typeof pg.pgUpsertSpicedReport>[0]);
    return 0;
  }
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const { meetingId: _m, id: _i, createdAt: _c, ...updateFields } = data as Record<string, unknown>;
  const result = await db.insert(spicedReports).values(data).onDuplicateKeyUpdate({ set: updateFields as Partial<InsertSpicedReport> });
  return result[0].insertId;
}

export async function getSpicedReportByMeetingId(meetingId: number) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (isPg()) return pg.pgGetSpicedReportByMeetingId(meetingId) as any;
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(spicedReports).where(eq(spicedReports.meetingId, meetingId)).limit(1);
  return result[0];
}

// ─── MEDDPICC Reports ─────────────────────────────────────────────────────────
export async function upsertMeddpiccReport(data: InsertMeddpiccReport) {
  if (isPg()) {
    await pg.pgUpsertMeddpiccReport(data as Parameters<typeof pg.pgUpsertMeddpiccReport>[0]);
    return 0;
  }
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const { meetingId: _m, id: _i, createdAt: _c, ...updateFields } = data as Record<string, unknown>;
  const result = await db.insert(meddpiccReports).values(data).onDuplicateKeyUpdate({ set: updateFields as Partial<InsertMeddpiccReport> });
  return result[0].insertId;
}

export async function getMeddpiccReportByMeetingId(meetingId: number) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (isPg()) return pg.pgGetMeddpiccReportByMeetingId(meetingId) as any;
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(meddpiccReports).where(eq(meddpiccReports.meetingId, meetingId)).limit(1);
  return result[0];
}

// ─── Action Items ─────────────────────────────────────────────────────────────
export async function createActionItem(data: InsertActionItem) {
  if (isPg()) return pg.pgCreateActionItem(data as Parameters<typeof pg.pgCreateActionItem>[0]);
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(actionItems).values(data);
  return result[0].insertId;
}

export async function getActionItems(meetingId?: number) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (isPg()) return pg.pgGetActionItems(meetingId) as any;
  const db = await getDb();
  if (!db) return [];
  if (meetingId !== undefined) {
    return db.select().from(actionItems).where(eq(actionItems.meetingId, meetingId)).orderBy(desc(actionItems.createdAt));
  }
  return db.select().from(actionItems).orderBy(desc(actionItems.createdAt));
}

export async function updateActionItem(id: number, data: Partial<InsertActionItem>) {
  if (isPg()) { await pg.pgUpdateActionItem(id, data as Parameters<typeof pg.pgUpdateActionItem>[1]); return; }
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(actionItems).set(data).where(eq(actionItems.id, id));
}

export async function deleteActionItem(id: number) {
  if (isPg()) { await pg.pgDeleteActionItem(id); return; }
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(actionItems).where(eq(actionItems.id, id));
}

// ─── Notes ────────────────────────────────────────────────────────────────────
export async function upsertNote(data: InsertNote) {
  // Notes table not migrated to Postgres yet — return gracefully
  if (isPg()) return 0;
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  if (data.meetingId) {
    const existing = await db.select().from(notes).where(eq(notes.meetingId, data.meetingId)).limit(1);
    if (existing.length > 0) {
      await db.update(notes).set(data).where(eq(notes.meetingId, data.meetingId));
      return existing[0].id;
    }
  }
  const result = await db.insert(notes).values(data);
  return result[0].insertId;
}

export async function getNoteByMeetingId(meetingId: number) {
  if (isPg()) return undefined;
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(notes).where(eq(notes.meetingId, meetingId)).limit(1);
  return result[0];
}

// ─── App Settings ─────────────────────────────────────────────────────────────
export async function getAppSettings() {
  if (isPg()) return undefined; // App settings not migrated to Postgres
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(appSettings).limit(1);
  return rows[0];
}

export async function upsertAppSettings(data: { ollamaEndpoint?: string; ollamaModel?: string; whisperEndpoint?: string; botName?: string }) {
  if (isPg()) return; // App settings not migrated to Postgres
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const existing = await db.select().from(appSettings).limit(1);
  if (existing.length === 0) {
    await db.insert(appSettings).values({
      ollamaEndpoint: data.ollamaEndpoint || "http://localhost:11434",
      ollamaModel: data.ollamaModel || "llama3.1:8b",
      whisperEndpoint: data.whisperEndpoint || "http://localhost:8001",
      botName: data.botName || "SalesLens",
    });
  } else {
    const updateData: Record<string, unknown> = {};
    if (data.ollamaEndpoint !== undefined) updateData.ollamaEndpoint = data.ollamaEndpoint;
    if (data.ollamaModel !== undefined) updateData.ollamaModel = data.ollamaModel;
    if (data.whisperEndpoint !== undefined) updateData.whisperEndpoint = data.whisperEndpoint;
    if (data.botName !== undefined) updateData.botName = data.botName;
    if (Object.keys(updateData).length > 0) {
      await db.update(appSettings).set(updateData).where(eq(appSettings.id, existing[0]!.id));
    }
  }
}

// ─── Pitch Coaching ───────────────────────────────────────────────────────────
import {
  pitchCoaching,
  preCallIntelligence,
  prospects,
  generatedEmails,
  type InsertPitchCoaching,
  type InsertPreCallIntelligence,
  type InsertProspect,
  type InsertGeneratedEmail,
} from "../drizzle/schema";

export async function upsertPitchCoaching(data: InsertPitchCoaching) {
  if (isPg()) {
    await pg.pgUpsertPitchCoaching(data as Parameters<typeof pg.pgUpsertPitchCoaching>[0]);
    return 0;
  }
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const { meetingId: _m, id: _i, createdAt: _c, ...updateFields } = data as Record<string, unknown>;
  const result = await db.insert(pitchCoaching).values(data).onDuplicateKeyUpdate({ set: updateFields as Partial<InsertPitchCoaching> });
  return result[0].insertId;
}

export async function getPitchCoachingByMeetingId(meetingId: number) {
  if (isPg()) return pg.pgGetPitchCoachingByMeetingId(meetingId);
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(pitchCoaching).where(eq(pitchCoaching.meetingId, meetingId)).limit(1);
  return result[0];
}

// ─── Pre-Call Intelligence ────────────────────────────────────────────────────
export async function upsertPreCallIntelligence(data: InsertPreCallIntelligence) {
  if (isPg()) {
    await pg.pgUpsertPreCallIntelligence(data as Parameters<typeof pg.pgUpsertPreCallIntelligence>[0]);
    return 0;
  }
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const { meetingId: _m, id: _i, createdAt: _c, ...updateFields } = data as Record<string, unknown>;
  const result = await db.insert(preCallIntelligence).values(data).onDuplicateKeyUpdate({ set: updateFields as Partial<InsertPreCallIntelligence> });
  return result[0].insertId;
}

export async function getPreCallIntelligenceByMeetingId(meetingId: number) {
  if (isPg()) return pg.pgGetPreCallIntelligenceByMeetingId(meetingId);
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(preCallIntelligence).where(eq(preCallIntelligence.meetingId, meetingId)).limit(1);
  return result[0];
}

// ─── Prospects ────────────────────────────────────────────────────────────────
export async function createProspect(data: InsertProspect) {
  if (isPg()) return pg.pgCreateProspect(data as Parameters<typeof pg.pgCreateProspect>[0]);
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(prospects).values(data);
  return result[0].insertId;
}

export async function getProspects(limit = 50, offset = 0) {
  if (isPg()) return pg.pgGetProspects(limit, offset);
  const db = await getDb();
  if (!db) return [];
  return db.select().from(prospects).orderBy(desc(prospects.createdAt)).limit(limit).offset(offset);
}

export async function getProspectById(id: number) {
  if (isPg()) return pg.pgGetProspectById(id);
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(prospects).where(eq(prospects.id, id)).limit(1);
  return result[0];
}

export async function updateProspect(id: number, data: Partial<InsertProspect>) {
  if (isPg()) { await pg.pgUpdateProspect(id, data as Parameters<typeof pg.pgUpdateProspect>[1]); return; }
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(prospects).set(data).where(eq(prospects.id, id));
}

export async function deleteProspect(id: number) {
  if (isPg()) { await pg.pgDeleteProspect(id); return; }
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(prospects).where(eq(prospects.id, id));
}

// ─── Generated Emails ─────────────────────────────────────────────────────────
export async function createGeneratedEmail(data: InsertGeneratedEmail) {
  if (isPg()) return 0; // Generated emails not migrated to Postgres yet
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(generatedEmails).values(data);
  return result[0].insertId;
}

export async function getGeneratedEmails(meetingId?: number) {
  if (isPg()) return []; // Generated emails not migrated to Postgres yet
  const db = await getDb();
  if (!db) return [];
  if (meetingId !== undefined) {
    return db.select().from(generatedEmails).where(eq(generatedEmails.meetingId, meetingId)).orderBy(desc(generatedEmails.createdAt));
  }
  return db.select().from(generatedEmails).orderBy(desc(generatedEmails.createdAt)).limit(50);
}

export async function deleteGeneratedEmail(id: number) {
  if (isPg()) return; // Generated emails not migrated to Postgres yet
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(generatedEmails).where(eq(generatedEmails.id, id));
}
