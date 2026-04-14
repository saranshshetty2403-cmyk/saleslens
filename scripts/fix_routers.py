#!/usr/bin/env python3
"""
Rewrites the top section of server/routers.ts to use local Ollama AI
instead of the cloud invokeLLM helper.
"""
import re

path = "server/routers.ts"
with open(path) as f:
    content = f.read()

# ── 1. Find the marker where the Meetings Router starts ──────────────────────
meetings_marker = "// ─── Meetings Router ────────────────────────────────────────────────────────"
idx = content.find(meetings_marker)
if idx == -1:
    # fallback
    meetings_marker = "// ─── Meetings Router"
    idx = content.find(meetings_marker)

if idx == -1:
    print("ERROR: Could not find Meetings Router marker")
    exit(1)

# Keep everything from the Meetings Router onwards
rest = content[idx:]

# ── 2. Build the new header section ─────────────────────────────────────────
new_header = '''\
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

'''

# ── 3. Assemble the final file ───────────────────────────────────────────────
new_content = new_header + rest

# ── 4. Fix the transcripts router to use local whisper ───────────────────────
# Replace the old cloud transcribeAudio call with local whisper
old_transcribe = '''  // Upload and transcribe audio file
  transcribeFromUrl: publicProcedure
    .input(z.object({ meetingId: z.number(), audioUrl: z.string() }))
    .mutation(async ({ input }) => {
      await updateMeeting(input.meetingId, { status: "processing" });
      const result = await transcribeAudio({ audioUrl: input.audioUrl, language: "en" });
      if ('error' in result) throw new Error(result.error);
      const whisperResult = result as { text: string; language: string; segments: Array<{ id: number; text: string; start: number; end: number }> };
      const segments = (whisperResult.segments || []).map((seg, i) => ({
        id: i,
        speaker: `Speaker ${(i % 2) + 1}`,
        speakerLabel: `Speaker ${(i % 2) + 1}`,
        text: seg.text,
        startTime: seg.start,
        endTime: seg.end,
        confidence: 0.95,
      }));
      const wordCount = whisperResult.text?.split(" ").length || 0;
      await upsertTranscript({
        meetingId: input.meetingId,
        fullText: whisperResult.text,
        segments,
        language: whisperResult.language || "en",
        wordCount,
      });
      return { success: true, wordCount };
    }),'''

new_transcribe = '''  // Upload and transcribe audio file via local faster-whisper (privacy-first)
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
    }),'''

new_content = new_content.replace(old_transcribe, new_transcribe)

# ── 5. Fix the analysis generate mutation to use local AI ────────────────────
old_analysis = '''      const analysis = await generateSalesAnalysis(transcript.fullText, meeting.title);'''
new_analysis = '''      const analysis = await generateAIAnalysis(transcript.fullText, {
        title: meeting.title,
        accountName: meeting.accountName || undefined,
        dealStage: meeting.dealStage || undefined,
      });'''
new_content = new_content.replace(old_analysis, new_analysis)

# ── 6. Fix SPICED generate mutation ─────────────────────────────────────────
old_spiced = '''      const report = await generateSpicedReport(transcript.fullText, meeting.title);'''
new_spiced = '''      const report = await generateSPICEDReport(transcript.fullText, {
        title: meeting.title,
        accountName: meeting.accountName || undefined,
      });'''
new_content = new_content.replace(old_spiced, new_spiced)

# ── 7. Fix MEDDPICC generate mutation ────────────────────────────────────────
old_meddpicc = '''      const report = await generateMeddpiccReport(transcript.fullText, meeting.title);'''
new_meddpicc = '''      const report = await generateMEDDPICCReport(transcript.fullText, {
        title: meeting.title,
        accountName: meeting.accountName || undefined,
      });'''
new_content = new_content.replace(old_meddpicc, new_meddpicc)

# ── 8. Fix action items extraction ───────────────────────────────────────────
old_actions = '''      const actionData = await generateActionItems(transcript.fullText, meeting.title);
      const now = new Date();
      for (const item of actionData.actionItems || []) {'''
new_actions = '''      const actionItems = await extractActionItems(transcript.fullText);
      const now = new Date();
      for (const item of actionItems || []) {'''
new_content = new_content.replace(old_actions, new_actions)

# Fix the item property references (actionData.actionItems -> direct item)
old_item_ref = '''        await createActionItem({
          meetingId: input.meetingId,
          title: item.title,
          description: item.description,
          priority: item.priority || "medium",
          assignee: item.assignee,
          dueDate,
          isAiGenerated: true,
          sourceQuote: item.sourceQuote,
          status: "open",
        });'''
new_item_ref = '''        await createActionItem({
          meetingId: input.meetingId,
          title: item.title,
          description: item.description,
          priority: (item.priority as "low" | "medium" | "high" | "urgent") || "medium",
          assignee: item.assignee,
          dueDate,
          isAiGenerated: true,
          sourceQuote: item.sourceQuote,
          status: "open",
        });'''
new_content = new_content.replace(old_item_ref, new_item_ref)

# ── 9. Fix the meetings launchBot to remove Recall.ai dependency ─────────────
old_bot = '''  // Launch Recall.ai bot to join meeting
  launchBot: publicProcedure
    .input(z.object({ meetingId: z.number(), meetingUrl: z.string() }))
    .mutation(async ({ input }) => {
      const apiKey = process.env.RECALL_API_KEY;
      if (!apiKey) {
        // Demo mode: simulate bot joining
        await updateMeeting(input.meetingId, { status: "recording", meetingUrl: input.meetingUrl });
        return { botId: "demo-bot-" + input.meetingId, status: "joining" };
      }
      const botData = await callRecallApi("/bot", "POST", {
        meeting_url: input.meetingUrl,
        bot_name: "SalesLens AI",
        transcription_options: { provider: "assembly_ai" },
        recording_mode: "speaker_view",
      });
      await updateMeeting(input.meetingId, {
        recallBotId: botData.id,
        status: "joining",
        meetingUrl: input.meetingUrl,
      });
      return { botId: botData.id, status: "joining" };
    }),

  // Get bot status from Recall.ai
  getBotStatus: publicProcedure
    .input(z.object({ botId: z.string() }))
    .query(async ({ input }) => {
      const apiKey = process.env.RECALL_API_KEY;
      if (!apiKey) return { status: "demo" };
      return callRecallApi(`/bot/${input.botId}`, "GET");
    }),'''

new_bot = '''  // Note: Bot auto-join is not used in privacy-first mode.
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
    }),'''

new_content = new_content.replace(old_bot, new_bot)

# ── 10. Fix the recall webhook router to be a no-op ─────────────────────────
old_recall_router = '''// ─── Recall Webhook Router ────────────────────────────────────────────────────
const recallRouter = router({
  webhookStatus: publicProcedure
    .input(z.object({ botId: z.string(), status: z.string(), meetingId: z.number().optional() }))
    .mutation(async ({ input }) => {
      // Handle status updates from Recall.ai webhook
      if (input.meetingId) {
        if (input.status === "done") {
          await updateMeeting(input.meetingId, { status: "processing" });
        } else if (input.status === "in_call_recording") {
          await updateMeeting(input.meetingId, { status: "recording", startedAt: new Date() });
        } else if (input.status === "call_ended") {
          await updateMeeting(input.meetingId, { endedAt: new Date() });
        }
      }
      return { success: true };
    }),
});'''

new_recall_router = '''// ─── Recall Webhook Router (kept for API compatibility, no-op in local mode) ──
const recallRouter = router({
  webhookStatus: publicProcedure
    .input(z.object({ botId: z.string(), status: z.string(), meetingId: z.number().optional() }))
    .mutation(async () => ({ success: true })),
});'''

new_content = new_content.replace(old_recall_router, new_recall_router)

# ── 11. Fix the settings healthCheck to use imported functions ───────────────
old_health = '''    const { checkOllamaHealth, checkWhisperHealth } = await import("./localAI");
    const [ollama, whisper] = await Promise.all([
      checkOllamaHealth(ollamaEndpoint),
      checkWhisperHealth(whisperEndpoint),
    ]);'''
new_health = '''    const [ollama, whisper] = await Promise.all([
      checkOllamaHealth(ollamaEndpoint),
      checkWhisperHealth(whisperEndpoint),
    ]);'''
new_content = new_content.replace(old_health, new_health)

with open(path, "w") as f:
    f.write(new_content)

print(f"Done. Lines: {len(new_content.splitlines())}")
