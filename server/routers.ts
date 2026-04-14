import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { systemRouter } from "./_core/systemRouter";
import {
  createMeeting,
  getMeetings,
  getMeetingById,
  updateMeeting,
  deleteMeeting,
  searchMeetings,
  getMeetingStats,
  upsertTranscript,
  getTranscriptByMeetingId,
  searchTranscripts,
  upsertAiAnalysis,
  getAiAnalysisByMeetingId,
  upsertSpicedReport,
  getSpicedReportByMeetingId,
  upsertMeddpiccReport,
  getMeddpiccReportByMeetingId,
  createActionItem,
  getActionItems,
  updateActionItem,
  deleteActionItem,
  upsertNote,
  getNoteByMeetingId,
  getAppSettings,
  upsertAppSettings,
} from "./db";
import { TRPCError } from "@trpc/server";
import {
  generateAIAnalysis,
  generateSPICEDReport,
  generateMEDDPICCReport,
  extractActionItems,
  getLocalAIConfig,
  checkOllamaHealth,
  checkWhisperHealth,
} from "./localAI";

// ─── Local Whisper transcription helper ──────────────────────────────────────
// Calls the local faster-whisper Python microservice (port 8001 by default).
// Audio NEVER leaves the machine — zero external data transmission.
async function transcribeWithLocalWhisper(
  audioUrl: string,
  whisperEndpoint: string
): Promise<{
  text: string;
  language: string;
  segments: Array<{ id: number; text: string; start: number; end: number; speaker?: string }>;
}> {
  const res = await fetch(`${whisperEndpoint}/transcribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ audio_url: audioUrl, language: "en", diarize: true }),
    signal: AbortSignal.timeout(300_000), // 5 min max
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Whisper service error ${res.status}: ${errText}`);
  }
  return res.json() as Promise<{ text: string; language: string; segments: Array<{ id: number; text: string; start: number; end: number; speaker?: string }> }>;
}

// ─── Meetings Router ──────────────────────────────────────────────────────────
const meetingsRouter = router({
  list: publicProcedure
    .input(z.object({ limit: z.number().default(50), offset: z.number().default(0) }).optional())
    .query(({ input }) => getMeetings(input?.limit, input?.offset)),

  get: publicProcedure.input(z.object({ id: z.number() })).query(({ input }) => getMeetingById(input.id)),

  stats: publicProcedure.query(() => getMeetingStats()),

  search: publicProcedure.input(z.object({ query: z.string() })).query(({ input }) => searchMeetings(input.query)),

  create: publicProcedure
    .input(
      z.object({
        title: z.string().min(1),
        platform: z.enum(["zoom", "google_meet", "teams", "slack", "webex", "other"]).default("zoom"),
        meetingUrl: z.string().optional(),
        accountName: z.string().optional(),
        contactName: z.string().optional(),
        dealStage: z.string().optional(),
        participants: z.array(z.string()).optional(),
        scheduledAt: z.date().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await createMeeting({
        title: input.title,
        platform: input.platform,
        meetingUrl: input.meetingUrl,
        accountName: input.accountName,
        contactName: input.contactName,
        dealStage: input.dealStage,
        participants: input.participants,
        scheduledAt: input.scheduledAt,
        status: "scheduled",
      });
      const meetings = await getMeetings(1, 0);
      return meetings[0];
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().optional(),
        platform: z.enum(["zoom", "google_meet", "teams", "slack", "webex", "other"]).optional(),
        meetingUrl: z.string().optional(),
        accountName: z.string().optional(),
        contactName: z.string().optional(),
        dealStage: z.string().optional(),
        status: z.enum(["scheduled", "joining", "recording", "processing", "completed", "failed"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateMeeting(id, data);
      return getMeetingById(id);
    }),

  delete: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    await deleteMeeting(input.id);
    return { success: true };
  }),

  // Note: Bot auto-join is not used in privacy-first mode.
  // Meetings are created manually and audio is uploaded for local transcription.
  launchBot: publicProcedure
    .input(z.object({ meetingId: z.number(), meetingUrl: z.string() }))
    .mutation(async ({ input }) => {
      // Mark meeting as recording (manual mode — user records themselves)
      await updateMeeting(input.meetingId, { status: "recording", meetingUrl: input.meetingUrl });
      return { botId: "local-" + input.meetingId, status: "recording" };
    }),

  getBotStatus: publicProcedure
    .input(z.object({ botId: z.string() }))
    .query(async ({ input }) => {
      return { status: "local", message: "Privacy-first mode: record manually and upload audio" };
    }),
});

// ─── Transcripts Router ───────────────────────────────────────────────────────
const transcriptsRouter = router({
  get: publicProcedure.input(z.object({ meetingId: z.number() })).query(({ input }) =>
    getTranscriptByMeetingId(input.meetingId)
  ),

  search: publicProcedure.input(z.object({ query: z.string() })).query(({ input }) =>
    searchTranscripts(input.query)
  ),

  // Upload and transcribe audio file via local faster-whisper (privacy-first)
  transcribeFromUrl: publicProcedure
    .input(z.object({ meetingId: z.number(), audioUrl: z.string() }))
    .mutation(async ({ input }) => {
      await updateMeeting(input.meetingId, { status: "processing" });
      const config = await getLocalAIConfig();
      const result = await transcribeWithLocalWhisper(input.audioUrl, config.whisperEndpoint);
      const segments = (result.segments || []).map((seg, i) => ({
        id: i,
        speaker: seg.speaker || `Speaker ${(i % 2) + 1}`,
        speakerLabel: seg.speaker || `Speaker ${(i % 2) + 1}`,
        text: seg.text,
        startTime: seg.start,
        endTime: seg.end,
        confidence: 0.95,
      }));
      const wordCount = result.text?.split(" ").length || 0;
      await upsertTranscript({
        meetingId: input.meetingId,
        fullText: result.text,
        segments,
        language: result.language || "en",
        wordCount,
      });
      return { success: true, wordCount };
    }),

  // Save manual/demo transcript
  save: publicProcedure
    .input(
      z.object({
        meetingId: z.number(),
        fullText: z.string(),
        segments: z.array(z.any()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const wordCount = input.fullText.split(" ").length;
      await upsertTranscript({
        meetingId: input.meetingId,
        fullText: input.fullText,
        segments: input.segments || [],
        wordCount,
      });
      return { success: true };
    }),
});

// ─── Analysis Router ──────────────────────────────────────────────────────────
const analysisRouter = router({
  get: publicProcedure.input(z.object({ meetingId: z.number() })).query(({ input }) =>
    getAiAnalysisByMeetingId(input.meetingId)
  ),

  generate: publicProcedure
    .input(z.object({ meetingId: z.number() }))
    .mutation(async ({ input }) => {
      const meeting = await getMeetingById(input.meetingId);
      if (!meeting) throw new Error("Meeting not found");
      const transcript = await getTranscriptByMeetingId(input.meetingId);
      if (!transcript?.fullText) throw new Error("No transcript available");

      const analysis = await generateAIAnalysis(transcript.fullText, {
        title: meeting.title,
        accountName: meeting.accountName || undefined,
        dealStage: meeting.dealStage || undefined,
      });
      await upsertAiAnalysis({
        meetingId: input.meetingId,
        summary: analysis.summary,
        painPoints: analysis.painPoints || [],
        objections: analysis.objections || [],
        buyingSignals: analysis.buyingSignals || [],
        nextSteps: analysis.nextSteps || [],
        keyQuotes: (analysis.keyQuotes || []).map((q: any) => ({ ...q, timestamp: q.timestamp ?? 0 })),
        dealScore: analysis.dealScore,
        sentiment: analysis.sentiment,
        talkRatio: analysis.talkRatio,
      });

      // Auto-generate action items
      const actionItems = await extractActionItems(transcript.fullText);
      const now = new Date();
      for (const item of actionItems || []) {
        const dueDate = new Date(now);
        dueDate.setDate(dueDate.getDate() + (item.dueDays || 7));
        await createActionItem({
          meetingId: input.meetingId,
          title: item.title,
          description: item.description,
          priority: (item.priority as "low" | "medium" | "high" | "urgent") || "medium",
          assignee: item.assignee,
          dueDate,
          isAiGenerated: true,
          sourceQuote: item.sourceQuote,
          status: "open",
        });
      }

      await updateMeeting(input.meetingId, { status: "completed" });
      return getAiAnalysisByMeetingId(input.meetingId);
    }),
});

// ─── SPICED Router ────────────────────────────────────────────────────────────
const spicedRouter = router({
  get: publicProcedure.input(z.object({ meetingId: z.number() })).query(({ input }) =>
    getSpicedReportByMeetingId(input.meetingId)
  ),

  generate: publicProcedure
    .input(z.object({ meetingId: z.number() }))
    .mutation(async ({ input }) => {
      const meeting = await getMeetingById(input.meetingId);
      if (!meeting) throw new Error("Meeting not found");
      const transcript = await getTranscriptByMeetingId(input.meetingId);
      if (!transcript?.fullText) throw new Error("No transcript available");

      const report = await generateSPICEDReport(transcript.fullText, {
        title: meeting.title,
        accountName: meeting.accountName || undefined,
      });
      await upsertSpicedReport({ meetingId: input.meetingId, ...report });
      return getSpicedReportByMeetingId(input.meetingId);
    }),

  update: publicProcedure
    .input(
      z.object({
        meetingId: z.number(),
        situation: z.string().optional(),
        pain: z.string().optional(),
        impact: z.string().optional(),
        criticalEvent: z.string().optional(),
        decision: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { meetingId, ...fields } = input;
      const updates: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(fields)) {
        if (val !== undefined) {
          updates[key] = val;
          updates[`${key}AiGenerated`] = false;
        }
      }
      // Recalculate completeness
      const existing = await getSpicedReportByMeetingId(meetingId);
      const merged = { ...existing, ...updates };
      const fields5 = ["situation", "pain", "impact", "criticalEvent", "decision"];
      const filled = fields5.filter((f) => merged[f as keyof typeof merged]);
      updates.overallCompleteness = filled.length / fields5.length;
      await upsertSpicedReport({ meetingId, ...updates });
      return getSpicedReportByMeetingId(meetingId);
    }),
});

// ─── MEDDPICC Router ──────────────────────────────────────────────────────────
const meddpiccRouter = router({
  get: publicProcedure.input(z.object({ meetingId: z.number() })).query(({ input }) =>
    getMeddpiccReportByMeetingId(input.meetingId)
  ),

  generate: publicProcedure
    .input(z.object({ meetingId: z.number() }))
    .mutation(async ({ input }) => {
      const meeting = await getMeetingById(input.meetingId);
      if (!meeting) throw new Error("Meeting not found");
      const transcript = await getTranscriptByMeetingId(input.meetingId);
      if (!transcript?.fullText) throw new Error("No transcript available");

      const report = await generateMEDDPICCReport(transcript.fullText, {
        title: meeting.title,
        accountName: meeting.accountName || undefined,
      });
      await upsertMeddpiccReport({ meetingId: input.meetingId, ...report });
      return getMeddpiccReportByMeetingId(input.meetingId);
    }),

  update: publicProcedure
    .input(
      z.object({
        meetingId: z.number(),
        metrics: z.string().optional(),
        economicBuyer: z.string().optional(),
        decisionCriteria: z.string().optional(),
        decisionProcess: z.string().optional(),
        paperProcess: z.string().optional(),
        identifyPain: z.string().optional(),
        champion: z.string().optional(),
        competition: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { meetingId, ...fields } = input;
      const updates: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(fields)) {
        if (val !== undefined) {
          updates[key] = val;
          updates[`${key}AiGenerated`] = false;
        }
      }
      const existing = await getMeddpiccReportByMeetingId(meetingId);
      const merged = { ...existing, ...updates };
      const fields8 = ["metrics", "economicBuyer", "decisionCriteria", "decisionProcess", "paperProcess", "identifyPain", "champion", "competition"];
      const filled = fields8.filter((f) => merged[f as keyof typeof merged]);
      updates.overallCompleteness = filled.length / fields8.length;
      await upsertMeddpiccReport({ meetingId, ...updates });
      return getMeddpiccReportByMeetingId(meetingId);
    }),
});

// ─── Action Items Router ──────────────────────────────────────────────────────
const actionItemsRouter = router({
  list: publicProcedure
    .input(z.object({ meetingId: z.number().optional() }).optional())
    .query(({ input }) => getActionItems(input?.meetingId)),

  create: publicProcedure
    .input(
      z.object({
        meetingId: z.number().optional(),
        title: z.string().min(1),
        description: z.string().optional(),
        dueDate: z.date().optional(),
        priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
        assignee: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const id = await createActionItem({ ...input, status: "open" });
      const items = await getActionItems(input.meetingId);
      return items.find((i) => i.id === id);
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        dueDate: z.date().optional().nullable(),
        status: z.enum(["open", "in_progress", "completed", "cancelled"]).optional(),
        priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
        assignee: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateActionItem(id, data);
      return { success: true };
    }),

  delete: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    await deleteActionItem(input.id);
    return { success: true };
  }),
});

// ─── Notes Router ─────────────────────────────────────────────────────────────
const notesRouter = router({
  get: publicProcedure.input(z.object({ meetingId: z.number() })).query(({ input }) =>
    getNoteByMeetingId(input.meetingId)
  ),

  save: publicProcedure
    .input(
      z.object({
        meetingId: z.number(),
        title: z.string().optional(),
        content: z.string(),
        templateType: z.enum(["free_form", "discovery", "demo", "follow_up", "custom"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      await upsertNote({ ...input, isAiGenerated: false });
      return getNoteByMeetingId(input.meetingId);
    }),
});

/// ─── Settings Router ────────────────────────────────────────────
const settingsRouter = router({
  get: publicProcedure.query(async () => {
    const s = await getAppSettings();
    return {
      ollamaEndpoint: s?.ollamaEndpoint || "http://localhost:11434",
      ollamaModel: s?.ollamaModel || "llama3.1:8b",
      whisperEndpoint: s?.whisperEndpoint || "http://localhost:8001",
      botName: s?.botName || "SalesLens",
    };
  }),
  update: publicProcedure
    .input(z.object({
      ollamaEndpoint: z.string().optional(),
      ollamaModel: z.string().optional(),
      whisperEndpoint: z.string().optional(),
      botName: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await upsertAppSettings(input);
      return { success: true };
    }),
  healthCheck: publicProcedure.query(async () => {
    const s = await getAppSettings();
    const ollamaEndpoint = s?.ollamaEndpoint || "http://localhost:11434";
    const whisperEndpoint = s?.whisperEndpoint || "http://localhost:8001";
    const [ollama, whisper] = await Promise.all([
      checkOllamaHealth(ollamaEndpoint),
      checkWhisperHealth(whisperEndpoint),
    ]);
    return { ollama, whisper };
  }),
});

// ─── Recall Webhook Router (kept for API compatibility, no-op in local mode) ──
const recallRouter = router({
  webhookStatus: publicProcedure
    .input(z.object({ botId: z.string(), status: z.string(), meetingId: z.number().optional() }))
    .mutation(async () => ({ success: true })),
});

// ─── App Router ───────────────────────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(() => null), // No auth in single-user mode
    logout: publicProcedure.mutation(() => ({ success: true })),
  }),
  meetings: meetingsRouter,
  transcripts: transcriptsRouter,
  analysis: analysisRouter,
  spiced: spicedRouter,
  meddpicc: meddpiccRouter,
  actionItems: actionItemsRouter,
  notes: notesRouter,
  recall: recallRouter,
  settings: settingsRouter,
});

export type AppRouter = typeof appRouter;
