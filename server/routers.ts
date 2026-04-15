import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { systemRouter } from "./_core/systemRouter";
import { invokeLLM } from "./_core/llm";
import {
  createMeeting, getMeetings, getMeetingById, updateMeeting, deleteMeeting,
  searchMeetings, getMeetingStats, upsertTranscript, getTranscriptByMeetingId,
  searchTranscripts, upsertAiAnalysis, getAiAnalysisByMeetingId,
  upsertSpicedReport, getSpicedReportByMeetingId,
  upsertMeddpiccReport, getMeddpiccReportByMeetingId,
  createActionItem, getActionItems, updateActionItem, deleteActionItem,
  upsertNote, getNoteByMeetingId, getAppSettings, upsertAppSettings,
  upsertPitchCoaching, getPitchCoachingByMeetingId,
  upsertPreCallIntelligence, getPreCallIntelligenceByMeetingId,
  createProspect, getProspects, getProspectById, updateProspect, deleteProspect,
  createGeneratedEmail, getGeneratedEmails, deleteGeneratedEmail,
} from "./db";
import {
  HACKEREARTH_SYSTEM_PROMPT, HACKEREARTH_COMPETITORS, HACKEREARTH_OBJECTIONS,
  EMAIL_STYLE_PROMPT, HACKEREARTH_PRODUCTS, HACKEREARTH_ICP,
} from "./hackerearth-kb";

// ─── Helper: call LLM with JSON schema output ─────────────────────────────────
async function callLLM(messages: Array<{ role: "system" | "user" | "assistant"; content: string }>, schema: Record<string, unknown>, schemaName: string) {
  const response = await invokeLLM({
    messages,
    response_format: {
      type: "json_schema",
      json_schema: { name: schemaName, strict: true, schema },
    },
  });
  const rawContent = response.choices?.[0]?.message?.content ?? "{}";
  const content = typeof rawContent === "string" ? rawContent : "{}";
  try { return JSON.parse(content); } catch { return {}; }
}

// ─── Meetings Router ──────────────────────────────────────────────────────────
const meetingsRouter = router({
  list: publicProcedure.input(z.object({ limit: z.number().optional(), offset: z.number().optional(), search: z.string().optional() }).optional()).query(async ({ input }) => {
    if (input?.search) return searchMeetings(input.search);
    return getMeetings(input?.limit ?? 50, input?.offset ?? 0);
  }),
  get: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => getMeetingById(input.id)),
  create: publicProcedure.input(z.object({
    title: z.string(),
    platform: z.enum(["zoom", "google_meet", "teams", "slack", "webex", "other"]).optional(),
    meetingUrl: z.string().optional(),
    accountName: z.string().optional(),
    contactName: z.string().optional(),
    dealStage: z.string().optional(),
    scheduledAt: z.date().optional(),
    transcriptText: z.string().optional(),
  })).mutation(async ({ input }) => {
    const result = await createMeeting({
      ...input,
      platform: input.platform ?? "zoom",
      status: input.transcriptText ? "completed" : "scheduled",
    });
    return result;
  }),
  update: publicProcedure.input(z.object({ id: z.number(), data: z.object({
    title: z.string().optional(), status: z.enum(["scheduled","joining","recording","processing","completed","failed"]).optional(),
    accountName: z.string().optional(), contactName: z.string().optional(),
    dealStage: z.string().optional(), transcriptText: z.string().optional(),
  }) })).mutation(async ({ input }) => { await updateMeeting(input.id, input.data); return { success: true }; }),
  delete: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => { await deleteMeeting(input.id); return { success: true }; }),
  stats: publicProcedure.query(() => getMeetingStats()),
});

// ─── Transcripts Router ───────────────────────────────────────────────────────
const transcriptsRouter = router({
  get: publicProcedure.input(z.object({ meetingId: z.number() })).query(async ({ input }) => getTranscriptByMeetingId(input.meetingId)),
  search: publicProcedure.input(z.object({ query: z.string() })).query(async ({ input }) => searchTranscripts(input.query)),
  save: publicProcedure.input(z.object({ meetingId: z.number(), fullText: z.string(), segments: z.any().optional(), speakerMap: z.any().optional() })).mutation(async ({ input }) => {
    const wordCount = input.fullText.split(/\s+/).length;
    await upsertTranscript({ ...input, wordCount });
    return { success: true };
  }),
});

// ─── Core Analyze Router (THE HERO ENDPOINT) ─────────────────────────────────
const analyzeRouter = router({
  // Single endpoint: transcript in → everything out
  full: publicProcedure.input(z.object({
    meetingId: z.number(),
    transcript: z.string().min(50),
    accountName: z.string().optional(),
    contactName: z.string().optional(),
  })).mutation(async ({ input }) => {
    const { meetingId, transcript, accountName, contactName } = input;

    // Save transcript
    await upsertTranscript({ meetingId, fullText: transcript, wordCount: transcript.split(/\s+/).length });
    await updateMeeting(meetingId, { status: "processing" });

    const context = `Account: ${accountName || "Unknown"}\nContact: ${contactName || "Unknown"}\n\nTRANSCRIPT:\n${transcript}`;

    // Run all analyses in parallel
    const [analysisResult, spicedResult, meddpiccResult, coachingResult, preCallResult, prospectsResult] = await Promise.all([
      // 1. Core AI Analysis
      callLLM([
        { role: "system", content: HACKEREARTH_SYSTEM_PROMPT + "\n\nAnalyze the following sales call transcript and extract structured intelligence." },
        { role: "user", content: context },
      ], {
        type: "object",
        properties: {
          summary: { type: "string", description: "2-3 sentence executive summary of the call" },
          companyIdentified: { type: "string", description: "Company name identified from the transcript" },
          contactRole: { type: "string", description: "Role/title of the prospect identified" },
          dealScore: { type: "number", description: "Deal health score 0-100 based on engagement, budget signals, authority, need, timeline" },
          sentiment: { type: "string", enum: ["positive", "neutral", "negative", "mixed"] },
          talkRatio: { type: "object", properties: { rep: { type: "number" }, prospect: { type: "number" } }, required: ["rep", "prospect"], additionalProperties: false },
          painPoints: { type: "array", items: { type: "object", properties: { text: { type: "string" }, quote: { type: "string" }, confidence: { type: "number" } }, required: ["text", "quote", "confidence"], additionalProperties: false } },
          objections: { type: "array", items: { type: "object", properties: { text: { type: "string" }, quote: { type: "string" }, confidence: { type: "number" } }, required: ["text", "quote", "confidence"], additionalProperties: false } },
          buyingSignals: { type: "array", items: { type: "object", properties: { text: { type: "string" }, quote: { type: "string" }, confidence: { type: "number" } }, required: ["text", "quote", "confidence"], additionalProperties: false } },
          nextSteps: { type: "array", items: { type: "object", properties: { text: { type: "string" }, quote: { type: "string" }, confidence: { type: "number" } }, required: ["text", "quote", "confidence"], additionalProperties: false } },
          keyQuotes: { type: "array", items: { type: "object", properties: { speaker: { type: "string" }, text: { type: "string" }, timestamp: { type: "number" }, category: { type: "string", enum: ["pain","objection","buying_signal","decision","general"] } }, required: ["speaker","text","timestamp","category"], additionalProperties: false } },
        },
        required: ["summary","companyIdentified","contactRole","dealScore","sentiment","talkRatio","painPoints","objections","buyingSignals","nextSteps","keyQuotes"],
        additionalProperties: false,
      }, "analysis_result"),

      // 2. SPICED Report
      callLLM([
        { role: "system", content: HACKEREARTH_SYSTEM_PROMPT + `\n\nGenerate a SPICED methodology report from this sales call transcript.\n\nSPICED Framework:\n- Situation: Current state of the prospect's business, team size, hiring volume, current tools\n- Pain: Specific technical hiring pain points — time-to-hire, interview fatigue, mis-hires, candidate quality\n- Impact: Business impact of the pain — cost, lost revenue, team morale, competitive disadvantage\n- Critical Event: Time-bound event creating urgency — funding round, product launch, headcount target, contract renewal\n- Decision: Decision-making process, stakeholders involved, timeline, criteria for vendor selection\n\nFor each field, provide the extracted content AND a confidence score (0-1) based on how explicitly it was discussed.` },
        { role: "user", content: context },
      ], {
        type: "object",
        properties: {
          situation: { type: "string" }, situationConfidence: { type: "number" },
          pain: { type: "string" }, painConfidence: { type: "number" },
          impact: { type: "string" }, impactConfidence: { type: "number" },
          criticalEvent: { type: "string" }, criticalEventConfidence: { type: "number" },
          decision: { type: "string" }, decisionConfidence: { type: "number" },
          overallCompleteness: { type: "number" },
        },
        required: ["situation","situationConfidence","pain","painConfidence","impact","impactConfidence","criticalEvent","criticalEventConfidence","decision","decisionConfidence","overallCompleteness"],
        additionalProperties: false,
      }, "spiced_report"),

      // 3. MEDDPICC Report
      callLLM([
        { role: "system", content: HACKEREARTH_SYSTEM_PROMPT + `\n\nGenerate a MEDDPICC methodology report from this sales call transcript.\n\nMEDDPICC Framework:\n- Metrics: Quantifiable business outcomes the prospect wants — reduce time-to-hire by X%, save Y engineer hours/week\n- Economic Buyer: Person with budget authority — CHRO, VP HR, CPO, CEO for SMBs\n- Decision Criteria: Technical and business criteria for vendor selection — integrations, anti-cheating, question quality, price\n- Decision Process: Steps to reach a decision — pilot, procurement, legal review, board approval\n- Paper Process: Contract and legal process — MSA, DPA, security review, procurement portal\n- Identify Pain: Root cause of the hiring problem — not just symptoms but underlying business pain\n- Champion: Internal advocate who will sell for you — typically VP Engineering or Head of TA\n- Competition: Other vendors being evaluated — HackerRank, Codility, TestGorilla, CodeSignal, or in-house\n\nFor each field, provide extracted content AND confidence score (0-1).` },
        { role: "user", content: context },
      ], {
        type: "object",
        properties: {
          metrics: { type: "string" }, metricsConfidence: { type: "number" },
          economicBuyer: { type: "string" }, economicBuyerConfidence: { type: "number" },
          decisionCriteria: { type: "string" }, decisionCriteriaConfidence: { type: "number" },
          decisionProcess: { type: "string" }, decisionProcessConfidence: { type: "number" },
          paperProcess: { type: "string" }, paperProcessConfidence: { type: "number" },
          identifyPain: { type: "string" }, identifyPainConfidence: { type: "number" },
          champion: { type: "string" }, championConfidence: { type: "number" },
          competition: { type: "string" }, competitionConfidence: { type: "number" },
          overallCompleteness: { type: "number" },
        },
        required: ["metrics","metricsConfidence","economicBuyer","economicBuyerConfidence","decisionCriteria","decisionCriteriaConfidence","decisionProcess","decisionProcessConfidence","paperProcess","paperProcessConfidence","identifyPain","identifyPainConfidence","champion","championConfidence","competition","competitionConfidence","overallCompleteness"],
        additionalProperties: false,
      }, "meddpicc_report"),

      // 4. Pitch Coaching
      callLLM([
        { role: "system", content: HACKEREARTH_SYSTEM_PROMPT + `\n\nYou are a world-class SaaS sales coach with 20+ years of experience. Analyze this sales call and provide PhD-level coaching feedback specifically for a HackerEarth sales representative.\n\nEvaluate:\n1. Discovery quality — did they uncover the real pain, not just surface symptoms?\n2. Objection handling — did they acknowledge, reframe, and resolve objections?\n3. Value articulation — did they connect HackerEarth's specific features to the prospect's specific pain?\n4. MEDDPICC coverage — did they identify the economic buyer, champion, competition, metrics?\n5. Next step quality — did they close on a specific, time-bound next step?\n6. Talk ratio — ideal is 40% rep / 60% prospect for discovery calls\n7. Question quality — open-ended vs closed, did they dig deeper?\n\nFor each moment where the rep could have done better, provide:\n- Exact quote of what was said\n- What should have been said instead (specific, not generic)\n- Why the alternative is better (grounded in sales science and HackerEarth context)\n\nBe direct and specific. Avoid generic advice. Every suggestion must be actionable.` },
        { role: "user", content: context },
      ], {
        type: "object",
        properties: {
          overallScore: { type: "number", description: "0-100 overall call quality score" },
          talkTimeRatio: { type: "number", description: "Rep's percentage of talk time (0-1)" },
          discoveryScore: { type: "number" }, objectionScore: { type: "number" },
          valueScore: { type: "number" }, nextStepScore: { type: "number" }, closingScore: { type: "number" },
          strengths: { type: "array", items: { type: "string" } },
          improvements: { type: "array", items: { type: "string" } },
          missedOpportunities: { type: "array", items: { type: "string" } },
          competitorsMentioned: { type: "array", items: { type: "string" } },
          meddpiccCoverage: { type: "number" },
          moments: { type: "array", items: {
            type: "object",
            properties: {
              whatWasSaid: { type: "string" }, whatShouldHaveBeenSaid: { type: "string" },
              why: { type: "string" }, speaker: { type: "string" },
              category: { type: "string", enum: ["discovery","objection","value_prop","closing","competitor","product_fit","general"] },
              severity: { type: "string", enum: ["low","medium","high"] },
            },
            required: ["whatWasSaid","whatShouldHaveBeenSaid","why","speaker","category","severity"],
            additionalProperties: false,
          }},
        },
        required: ["overallScore","talkTimeRatio","discoveryScore","objectionScore","valueScore","nextStepScore","closingScore","strengths","improvements","missedOpportunities","competitorsMentioned","meddpiccCoverage","moments"],
        additionalProperties: false,
      }, "pitch_coaching"),

      // 5. Pre-Call Intelligence
      callLLM([
        { role: "system", content: HACKEREARTH_SYSTEM_PROMPT + `\n\nBased on this sales call transcript, generate pre-call intelligence for the NEXT call with this prospect.\n\nIdentify the company, research what you know about them, and generate:\n1. Company profile (industry, size, funding stage, tech stack signals from the conversation)\n2. Trigger events mentioned that create urgency\n3. 5 prep bullets — specific things the rep should know before the next call, with WHY each matters\n4. Suggested opening line for the next call — specific, references something from this call\n5. Which HackerEarth product to lead with based on the pain discussed\n6. Buyer persona of the contact\n\nAll suggestions must be grounded in what was actually discussed in the transcript.` },
        { role: "user", content: context },
      ], {
        type: "object",
        properties: {
          companyName: { type: "string" }, companyDomain: { type: "string" },
          industry: { type: "string" }, companySize: { type: "string" }, fundingStage: { type: "string" },
          techStack: { type: "array", items: { type: "string" } },
          currentTools: { type: "array", items: { type: "string" } },
          recentNews: { type: "array", items: { type: "string" } },
          triggerEvents: { type: "array", items: { type: "object", properties: { event: { type: "string" }, relevance: { type: "string" }, urgency: { type: "string", enum: ["low","medium","high"] } }, required: ["event","relevance","urgency"], additionalProperties: false } },
          prepBullets: { type: "array", items: { type: "object", properties: { point: { type: "string" }, why: { type: "string" } }, required: ["point","why"], additionalProperties: false } },
          suggestedOpening: { type: "string" },
          leadWithProduct: { type: "string" },
          buyerPersona: { type: "string" },
        },
        required: ["companyName","companyDomain","industry","companySize","fundingStage","techStack","currentTools","recentNews","triggerEvents","prepBullets","suggestedOpening","leadWithProduct","buyerPersona"],
        additionalProperties: false,
      }, "pre_call_intel"),

      // 6. Prospect Generation
      callLLM([
        { role: "system", content: HACKEREARTH_SYSTEM_PROMPT + `\n\nBased on this sales call transcript, identify the company being spoken to and generate 3 high-quality prospect companies that HackerEarth should approach.\n\nFor each prospect:\n1. Identify a competitor or peer company in the same industry/segment\n2. Explain WHY they are a good fit for HackerEarth (specific to their likely hiring pain)\n3. Identify the right buyer persona to approach\n4. Suggest which HackerEarth product to lead with\n5. Suggest a specific outreach angle — what trigger event or pain point to reference\n\nProspects should be real, well-known companies in the Indian SaaS/tech ecosystem where possible.` },
        { role: "user", content: context },
      ], {
        type: "object",
        properties: {
          sourceCompany: { type: "string" },
          prospects: { type: "array", items: {
            type: "object",
            properties: {
              prospectCompanyName: { type: "string" }, prospectDomain: { type: "string" },
              industry: { type: "string" }, companySize: { type: "string" }, fundingStage: { type: "string" },
              contactTitle: { type: "string" }, fitReason: { type: "string" },
              outreachAngle: { type: "string" }, triggerEvent: { type: "string" }, suggestedProduct: { type: "string" },
            },
            required: ["prospectCompanyName","prospectDomain","industry","companySize","fundingStage","contactTitle","fitReason","outreachAngle","triggerEvent","suggestedProduct"],
            additionalProperties: false,
          }},
        },
        required: ["sourceCompany","prospects"],
        additionalProperties: false,
      }, "prospects_result"),
    ]);

    // Save all results to DB
    const [analysis, spiced, meddpicc, coaching, preCall, prospectsData] = [
      analysisResult, spicedResult, meddpiccResult, coachingResult, preCallResult, prospectsResult
    ];

    await Promise.all([
      upsertAiAnalysis({ meetingId, ...analysis }),
      upsertSpicedReport({ meetingId, ...spiced }),
      upsertMeddpiccReport({ meetingId, ...meddpicc }),
      upsertPitchCoaching({ meetingId, ...coaching }),
      upsertPreCallIntelligence({ meetingId, ...preCall }),
    ]);

    // Save action items
    if (analysis.nextSteps?.length) {
      for (const step of analysis.nextSteps.slice(0, 5)) {
        await createActionItem({
          meetingId, title: step.text, isAiGenerated: true,
          sourceQuote: step.quote, priority: "high",
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        });
      }
    }

    // Save prospects
    if (prospectsData.prospects?.length) {
      for (const p of prospectsData.prospects) {
        await createProspect({ ...p, sourceCompanyName: prospectsData.sourceCompany });
      }
    }

    // Update meeting status
    await updateMeeting(meetingId, {
      status: "completed",
      accountName: analysis.companyIdentified || undefined,
    });

    return {
      analysis, spiced, meddpicc, coaching, preCall,
      prospects: prospectsData.prospects || [],
    };
  }),

  // Get all analysis data for a meeting
  getAll: publicProcedure.input(z.object({ meetingId: z.number() })).query(async ({ input }) => {
    const [analysis, spiced, meddpicc, coaching, preCall, transcript, actionItemsList] = await Promise.all([
      getAiAnalysisByMeetingId(input.meetingId),
      getSpicedReportByMeetingId(input.meetingId),
      getMeddpiccReportByMeetingId(input.meetingId),
      getPitchCoachingByMeetingId(input.meetingId),
      getPreCallIntelligenceByMeetingId(input.meetingId),
      getTranscriptByMeetingId(input.meetingId),
      getActionItems(input.meetingId),
    ]);
    return { analysis, spiced, meddpicc, coaching, preCall, transcript, actionItems: actionItemsList };
  }),
});

// ─── SPICED Router ────────────────────────────────────────────────────────────
const spicedRouter = router({
  get: publicProcedure.input(z.object({ meetingId: z.number() })).query(({ input }) => getSpicedReportByMeetingId(input.meetingId)),
  update: publicProcedure.input(z.object({ meetingId: z.number(), data: z.object({
    situation: z.string().optional(), pain: z.string().optional(), impact: z.string().optional(),
    criticalEvent: z.string().optional(), decision: z.string().optional(),
  }) })).mutation(async ({ input }) => {
    await upsertSpicedReport({ meetingId: input.meetingId, ...input.data });
    return { success: true };
  }),
  list: publicProcedure.query(async () => {
    const { getDb } = await import("./db");
    const { spicedReports } = await import("../drizzle/schema");
    const { meetings } = await import("../drizzle/schema");
    const { desc } = await import("drizzle-orm");
    const db = await getDb();
    if (!db) return [];
    return db.select().from(spicedReports).orderBy(desc(spicedReports.createdAt)).limit(50);
  }),
});

// ─── MEDDPICC Router ──────────────────────────────────────────────────────────
const meddpiccRouter = router({
  get: publicProcedure.input(z.object({ meetingId: z.number() })).query(({ input }) => getMeddpiccReportByMeetingId(input.meetingId)),
  update: publicProcedure.input(z.object({ meetingId: z.number(), data: z.object({
    metrics: z.string().optional(), economicBuyer: z.string().optional(),
    decisionCriteria: z.string().optional(), decisionProcess: z.string().optional(),
    paperProcess: z.string().optional(), identifyPain: z.string().optional(),
    champion: z.string().optional(), competition: z.string().optional(),
  }) })).mutation(async ({ input }) => {
    await upsertMeddpiccReport({ meetingId: input.meetingId, ...input.data });
    return { success: true };
  }),
  list: publicProcedure.query(async () => {
    const { getDb } = await import("./db");
    const { meddpiccReports } = await import("../drizzle/schema");
    const { desc } = await import("drizzle-orm");
    const db = await getDb();
    if (!db) return [];
    return db.select().from(meddpiccReports).orderBy(desc(meddpiccReports.createdAt)).limit(50);
  }),
});

// ─── Action Items Router ──────────────────────────────────────────────────────
const actionItemsRouter = router({
  list: publicProcedure.input(z.object({ meetingId: z.number().optional() }).optional()).query(({ input }) => getActionItems(input?.meetingId)),
  create: publicProcedure.input(z.object({
    meetingId: z.number().optional(), title: z.string(), description: z.string().optional(),
    dueDate: z.date().optional(), priority: z.enum(["low","medium","high","urgent"]).optional(),
    assignee: z.string().optional(),
  })).mutation(async ({ input }) => { const id = await createActionItem(input); return { id }; }),
  update: publicProcedure.input(z.object({ id: z.number(), data: z.object({
    title: z.string().optional(), status: z.enum(["open","in_progress","completed","cancelled"]).optional(),
    priority: z.enum(["low","medium","high","urgent"]).optional(), dueDate: z.date().optional(),
    assignee: z.string().optional(), description: z.string().optional(),
  }) })).mutation(async ({ input }) => { await updateActionItem(input.id, input.data); return { success: true }; }),
  delete: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => { await deleteActionItem(input.id); return { success: true }; }),
});

// ─── Prospects Router ─────────────────────────────────────────────────────────
const prospectsRouter = router({
  list: publicProcedure.query(() => getProspects()),
  get: publicProcedure.input(z.object({ id: z.number() })).query(({ input }) => getProspectById(input.id)),
  create: publicProcedure.input(z.object({
    prospectCompanyName: z.string(), prospectDomain: z.string().optional(),
    industry: z.string().optional(), companySize: z.string().optional(),
    fundingStage: z.string().optional(), contactName: z.string().optional(),
    contactTitle: z.string().optional(), contactLinkedin: z.string().optional(),
    fitReason: z.string().optional(), outreachAngle: z.string().optional(),
    triggerEvent: z.string().optional(), suggestedProduct: z.string().optional(),
    sourceCompanyName: z.string().optional(),
  })).mutation(async ({ input }) => { const id = await createProspect(input); return { id }; }),
  update: publicProcedure.input(z.object({ id: z.number(), data: z.object({
    status: z.enum(["to_contact","contacted","in_progress","converted","not_a_fit"]).optional(),
    notes: z.string().optional(), contactName: z.string().optional(),
    contactTitle: z.string().optional(), contactLinkedin: z.string().optional(),
  }) })).mutation(async ({ input }) => { await updateProspect(input.id, input.data); return { success: true }; }),
  delete: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => { await deleteProspect(input.id); return { success: true }; }),
});

// ─── Email Generator Router ───────────────────────────────────────────────────
const emailsRouter = router({
  list: publicProcedure.input(z.object({ meetingId: z.number().optional() }).optional()).query(({ input }) => getGeneratedEmails(input?.meetingId)),
    generate: publicProcedure.input(z.object({
    meetingId: z.number().optional(),
    prospectId: z.number().optional(),
    emailType: z.enum(["follow_up","cold_outreach","objection_response","demo_follow_up","proposal_follow_up","custom"]),
    context: z.string(),
    recipientName: z.string().optional(),
    recipientTitle: z.string().optional(),
    recipientCompany: z.string().optional(),
    transcript: z.string().optional(),
  })).mutation(async ({ input }) => {
    const emailTypeDescriptions: Record<string, string> = {
      follow_up: "post-meeting follow-up email summarizing what was discussed and confirming next steps",
      cold_outreach: "cold outreach email to a new prospect who has never heard of HackerEarth",
      objection_response: "email responding to a specific objection raised by the prospect",
      demo_follow_up: "post-demo follow-up email with a summary of what was shown and a clear next step",
      proposal_follow_up: "follow-up on a sent proposal, addressing any concerns and pushing for a decision",
      custom: "custom email based on the provided context",
    };

    // Auto-enrich context from meeting data when meetingId is provided
    let enrichedContext = input.context;
    let resolvedRecipient = input.recipientName;
    let resolvedTitle = input.recipientTitle;
    let resolvedCompany = input.recipientCompany;
    let transcriptText = input.transcript ?? "";

    if (input.meetingId) {
      const [meeting, transcriptRow, analysis, spiced] = await Promise.all([
        getMeetingById(input.meetingId),
        getTranscriptByMeetingId(input.meetingId),
        getAiAnalysisByMeetingId(input.meetingId),
        getSpicedReportByMeetingId(input.meetingId),
      ]);

      if (meeting) {
        resolvedRecipient = resolvedRecipient || meeting.contactName || undefined;
        resolvedTitle = resolvedTitle || meeting.contactTitle || undefined;
        resolvedCompany = resolvedCompany || meeting.accountName || undefined;

        // Build rich context block from all available meeting data
        const contextParts: string[] = [];

        if (meeting.title) contextParts.push(`Meeting: ${meeting.title}`);
        if (meeting.accountName) contextParts.push(`Account: ${meeting.accountName}`);
        if (meeting.contactName) contextParts.push(`Contact: ${meeting.contactName}${meeting.contactTitle ? ` (${meeting.contactTitle})` : ""}`);
        if (meeting.dealStage) contextParts.push(`Deal Stage: ${meeting.dealStage}`);
        if (meeting.dealValue) contextParts.push(`Deal Value: ${meeting.dealValue}`);
        if (meeting.platform) contextParts.push(`Platform: ${meeting.platform}`);

        if (analysis) {
          type AI = { text: string }[];
          const toText = (v: unknown) => Array.isArray(v) ? (v as AI).map(i => i.text).filter(Boolean).join("; ") : "";
          if (analysis.summary) contextParts.push(`\nMeeting Summary: ${analysis.summary}`);
          const pp = toText(analysis.painPoints); if (pp) contextParts.push(`Pain Points Identified: ${pp}`);
          const bs = toText(analysis.buyingSignals); if (bs) contextParts.push(`Buying Signals: ${bs}`);
          const ob = toText(analysis.objections); if (ob) contextParts.push(`Objections Raised: ${ob}`);
          const ns = toText(analysis.nextSteps); if (ns) contextParts.push(`Agreed Next Steps: ${ns}`);
        }

        if (spiced) {
          if (spiced.situation) contextParts.push(`\nSituation (SPICED): ${spiced.situation}`);
          if (spiced.pain) contextParts.push(`Pain (SPICED): ${spiced.pain}`);
          if (spiced.impact) contextParts.push(`Impact (SPICED): ${spiced.impact}`);
          if (spiced.criticalEvent) contextParts.push(`Critical Event: ${spiced.criticalEvent}`);
          if (spiced.decision) contextParts.push(`Decision Process: ${spiced.decision}`);
        }

        if (transcriptRow?.fullText) {
          transcriptText = transcriptRow.fullText;
        }

        // Prepend meeting context; append any manual context the user typed
        const meetingContextBlock = contextParts.join("\n");
        enrichedContext = meetingContextBlock + (input.context.trim() ? `\n\nAdditional Instructions: ${input.context}` : "");
      }
    }

    const transcriptContext = transcriptText
      ? `\n\nRELEVANT TRANSCRIPT EXCERPT:\n${transcriptText.slice(0, 3000)}`
      : "";

    const response = await invokeLLM({
      messages: [
        { role: "system", content: EMAIL_STYLE_PROMPT + "\n\n" + HACKEREARTH_SYSTEM_PROMPT },
        { role: "user", content: `Write a ${emailTypeDescriptions[input.emailType]} for:\n- Recipient: ${resolvedRecipient || "the prospect"} (${resolvedTitle || "unknown title"}) at ${resolvedCompany || "their company"}\n\nContext:\n${enrichedContext}${transcriptContext}\n\nProvide a subject line and email body. Format as:\nSUBJECT: [subject line]\n\n[email body]` },
      ],
    });

    const rawContent = response.choices?.[0]?.message?.content ?? "";
    const content = typeof rawContent === "string" ? rawContent : "";
    const subjectMatch = content.match(/^SUBJECT:\s*(.+)$/m);
    const subject = subjectMatch?.[1]?.trim() ?? "Following up";
    const body = content.replace(/^SUBJECT:\s*.+\n\n?/m, "").trim();

    const id = await createGeneratedEmail({
      meetingId: input.meetingId, prospectId: input.prospectId,
      emailType: input.emailType, subject, body, context: input.context,
      recipientName: input.recipientName, recipientTitle: input.recipientTitle,
      recipientCompany: input.recipientCompany,
    });

    return { id, subject, body };
  }),
  delete: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => { await deleteGeneratedEmail(input.id); return { success: true }; }),
});

// ─── Deck Generator Router ────────────────────────────────────────────────────
const decksRouter = router({
  generate: publicProcedure.input(z.object({
    meetingId: z.number().optional(),
    transcript: z.string(),
    deckType: z.enum(["proposal", "follow_up", "business_case", "custom"]),
    accountName: z.string().optional(),
    contactName: z.string().optional(),
    additionalContext: z.string().optional(),
  })).mutation(async ({ input }) => {
    const result = await callLLM([
      { role: "system", content: HACKEREARTH_SYSTEM_PROMPT + `\n\nYou are a world-class sales deck strategist. Extract from the transcript:\n1. All promises made by the sales rep (features, timelines, pricing, demos, etc.)\n2. All specific requests made by the client (information, demos, case studies, ROI data, etc.)\n3. Key pain points and business context\n\nThen generate a complete, professional slide deck outline for a HackerEarth sales presentation.\n\nThe deck should:\n- Be tailored to the specific company and pain points discussed\n- Address every client request explicitly\n- Fulfill every promise made by the rep\n- Follow a narrative arc: Problem → Solution → Proof → ROI → Next Steps\n- Include specific HackerEarth product recommendations based on the discussion\n- Be ready to present — no generic filler slides` },
      { role: "user", content: `Deck Type: ${input.deckType}\nAccount: ${input.accountName || "Unknown"}\nContact: ${input.contactName || "Unknown"}\n${input.additionalContext ? `Additional Context: ${input.additionalContext}\n` : ""}\n\nTRANSCRIPT:\n${input.transcript}` },
    ], {
      type: "object",
      properties: {
        deckTitle: { type: "string" },
        deckSubtitle: { type: "string" },
        promisesMade: { type: "array", items: { type: "string" } },
        clientRequests: { type: "array", items: { type: "string" } },
        slides: { type: "array", items: {
          type: "object",
          properties: {
            slideNumber: { type: "number" },
            title: { type: "string" },
            type: { type: "string", enum: ["title","agenda","problem","solution","product_demo","case_study","roi","pricing","next_steps","custom"] },
            keyPoints: { type: "array", items: { type: "string" } },
            speakerNotes: { type: "string" },
            dataNeeded: { type: "string" },
            addressesRequest: { type: "string" },
          },
          required: ["slideNumber","title","type","keyPoints","speakerNotes","dataNeeded","addressesRequest"],
          additionalProperties: false,
        }},
        recommendedProducts: { type: "array", items: { type: "string" } },
        estimatedDeckLength: { type: "number" },
      },
      required: ["deckTitle","deckSubtitle","promisesMade","clientRequests","slides","recommendedProducts","estimatedDeckLength"],
      additionalProperties: false,
    }, "deck_outline");

    return result;
  }),
});

// ─── Battlecards Router ───────────────────────────────────────────────────────
const battlecardsRouter = router({
  list: publicProcedure.query(() => {
    return Object.entries(HACKEREARTH_COMPETITORS).map(([key, value]) => ({
      id: key,
      name: value.name,
      positioning: value.positioning,
      weaknesses: value.weaknesses,
      winStrategy: value.winStrategy,
      battlecard: value.battlecard,
    }));
  }),
  get: publicProcedure.input(z.object({ competitor: z.string() })).query(({ input }) => {
    const key = input.competitor.toLowerCase().replace(/\s+/g, "") as keyof typeof HACKEREARTH_COMPETITORS;
    return HACKEREARTH_COMPETITORS[key] ?? null;
  }),
});

// ─── Objection Library Router ─────────────────────────────────────────────────
const objectionsRouter = router({
  list: publicProcedure.input(z.object({ category: z.string().optional(), search: z.string().optional() }).optional()).query(({ input }) => {
    let results = HACKEREARTH_OBJECTIONS;
    if (input?.category) results = results.filter(o => o.category === input.category);
    if (input?.search) {
      const q = input.search.toLowerCase();
      results = results.filter(o => o.objection.toLowerCase().includes(q) || o.response.toLowerCase().includes(q));
    }
    return results;
  }),
});

// ─── Notes Router ─────────────────────────────────────────────────────────────
const notesRouter = router({
  get: publicProcedure.input(z.object({ meetingId: z.number() })).query(({ input }) => getNoteByMeetingId(input.meetingId)),
  save: publicProcedure.input(z.object({ meetingId: z.number(), title: z.string().optional(), content: z.string() })).mutation(async ({ input }) => {
    await upsertNote(input);
    return { success: true };
  }),
});

// ─── Settings Router ──────────────────────────────────────────────────────────
const settingsRouter = router({
  get: publicProcedure.query(() => getAppSettings()),
  update: publicProcedure.input(z.object({
    ollamaEndpoint: z.string().optional(), ollamaModel: z.string().optional(),
    whisperEndpoint: z.string().optional(), botName: z.string().optional(),
  })).mutation(async ({ input }) => { await upsertAppSettings(input); return { success: true }; }),
  healthCheck: publicProcedure.query(async () => {
    const settings = await getAppSettings();
    const ollamaUrl = settings?.ollamaEndpoint ?? "http://localhost:11434";
    const whisperUrl = settings?.whisperEndpoint ?? "http://localhost:8001";

    const checkService = async (url: string, path: string) => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(`${url}${path}`, { signal: controller.signal });
        clearTimeout(timeout);
        return { status: "online" as const, latency: res.ok ? 0 : -1 };
      } catch {
        return { status: "offline" as const, latency: -1 };
      }
    };

    const [ollama, whisper] = await Promise.all([
      checkService(ollamaUrl, "/api/tags"),
      checkService(whisperUrl, "/health"),
    ]);

    return { ollama, whisper, ollamaEndpoint: ollamaUrl, whisperEndpoint: whisperUrl };
  }),
});

// ─── App Router ───────────────────────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(() => null),
    logout: publicProcedure.mutation(() => ({ success: true })),
  }),
  meetings: meetingsRouter,
  transcripts: transcriptsRouter,
  analyze: analyzeRouter,
  spiced: spicedRouter,
  meddpicc: meddpiccRouter,
  actionItems: actionItemsRouter,
  prospects: prospectsRouter,
  emails: emailsRouter,
  decks: decksRouter,
  battlecards: battlecardsRouter,
  objections: objectionsRouter,
  notes: notesRouter,
  settings: settingsRouter,
});

export type AppRouter = typeof appRouter;
