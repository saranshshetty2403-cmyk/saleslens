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
  getAllAccounts, getAccountById, createAccount, updateAccount, findMatchingAccount, getMeetingsByAccountId,
  getDealSummaryByAccountId, getAllDealSummaries, upsertDealSummary,
  acceptGeneratedEmail, getAcceptedEmails, updateEmailStyleProfile, getEmailStyleProfile, updateGeneratedEmailStyleNotes,
  normalizeAccountName,
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
  getByMeeting: publicProcedure.input(z.object({ meetingId: z.number() })).query(async ({ input }) => {
    return getAiAnalysisByMeetingId(input.meetingId);
  }),
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

    // ─── Auto-link account ──────────────────────────────────────────────────
    const detectedCompany = analysis.companyIdentified || preCall.companyName || accountName;
    const detectedContact = analysis.contactRole ? undefined : contactName; // contactName from input
    let resolvedAccountId: number | undefined;
    let autoLinked = false;
    let needsConfirmation = false;
    let matchCandidates: Array<{ id: number; name: string; confidence: number }> = [];

    if (detectedCompany) {
      const { account, confidence, candidates } = await findMatchingAccount(detectedCompany);
      if (account) {
        // High-confidence auto-link
        resolvedAccountId = account.id;
        autoLinked = true;
        // Update account with latest contact info
        await updateAccount(account.id, {
          primaryContactName: contactName || account.primaryContactName,
          primaryContactTitle: analysis.contactRole || account.primaryContactTitle,
        });
      } else if (confidence >= 0.5 && candidates.length > 0) {
        // Partial match — ask user
        needsConfirmation = true;
        matchCandidates = candidates.map((c) => ({ id: c.account.id, name: c.account.name, confidence: c.confidence }));
      } else {
        // No match — create new account
        const newAccountId = await createAccount({
          name: detectedCompany,
          normalizedName: normalizeAccountName(detectedCompany),
          industry: preCall.industry || undefined,
          companySize: preCall.companySize || undefined,
          primaryContactName: contactName || undefined,
          primaryContactTitle: analysis.contactRole || undefined,
        });
        resolvedAccountId = newAccountId;
        autoLinked = true;
      }
    }

    // Update meeting status + accountId
    await updateMeeting(meetingId, {
      status: "completed",
      accountName: detectedCompany || undefined,
      accountId: resolvedAccountId,
    });

    return {
      analysis, spiced, meddpicc, coaching, preCall,
      prospects: prospectsData.prospects || [],
      accountLinking: {
        autoLinked,
        needsConfirmation,
        detectedCompany: detectedCompany || null,
        detectedContact: contactName || null,
        resolvedAccountId: resolvedAccountId ?? null,
        candidates: matchCandidates,
      },
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

  // Free-form email generator: user describes what they want, AI writes it
  generate: publicProcedure.input(z.object({
    prompt: z.string(), // What the user wants to say / the intent of the email
    meetingId: z.number().optional(), // Optional: attach to a specific meeting for context
  })).mutation(async ({ input }) => {
    // Fetch style profile to personalize generation
    const styleProfile = await getEmailStyleProfile();
    const styleBlock = styleProfile
      ? `\n\nUSER'S WRITING STYLE PREFERENCES (learned from accepted emails):\n- Tone: ${styleProfile.tone || "professional"}\n- Length: ${styleProfile.avgLength || "concise"}\n- Opening style: ${styleProfile.openingStyle || "direct"}\n- Closing style: ${styleProfile.closingStyle || "single CTA"}\n- Phrases to use: ${(styleProfile.preferredPhrases || []).join(", ") || "none noted"}\n- Phrases to avoid: ${(styleProfile.avoidPhrases || []).join(", ") || "none noted"}\n- Structure notes: ${styleProfile.structureNotes || "none"}`
      : "";

    // Optionally enrich with meeting context
    let meetingContextBlock = "";
    if (input.meetingId) {
      const [meeting, transcriptRow, analysis, spiced] = await Promise.all([
        getMeetingById(input.meetingId),
        getTranscriptByMeetingId(input.meetingId),
        getAiAnalysisByMeetingId(input.meetingId),
        getSpicedReportByMeetingId(input.meetingId),
      ]);
      if (meeting) {
        const parts: string[] = [];
        if (meeting.title) parts.push(`Meeting: ${meeting.title}`);
        if (meeting.accountName) parts.push(`Account: ${meeting.accountName}`);
        if (meeting.contactName) parts.push(`Contact: ${meeting.contactName}${meeting.contactTitle ? ` (${meeting.contactTitle})` : ""}`);
        if (meeting.dealStage) parts.push(`Deal Stage: ${meeting.dealStage}`);
        if (meeting.dealValue) parts.push(`Deal Value: ${meeting.dealValue}`);
        if (analysis) {
          type AI = { text: string }[];
          const toText = (v: unknown) => Array.isArray(v) ? (v as AI).map(i => i.text).filter(Boolean).join("; ") : "";
          if (analysis.summary) parts.push(`Meeting Summary: ${analysis.summary}`);
          const pp = toText(analysis.painPoints); if (pp) parts.push(`Pain Points: ${pp}`);
          const bs = toText(analysis.buyingSignals); if (bs) parts.push(`Buying Signals: ${bs}`);
          const ns = toText(analysis.nextSteps); if (ns) parts.push(`Next Steps: ${ns}`);
        }
        if (spiced) {
          if (spiced.pain) parts.push(`Pain (SPICED): ${spiced.pain}`);
          if (spiced.impact) parts.push(`Impact (SPICED): ${spiced.impact}`);
          if (spiced.criticalEvent) parts.push(`Critical Event: ${spiced.criticalEvent}`);
        }
        if (transcriptRow?.fullText) parts.push(`\nTranscript excerpt:\n${transcriptRow.fullText.slice(0, 2000)}`);
        meetingContextBlock = `\n\nMEETING CONTEXT:\n${parts.join("\n")}`;
      }
    }

    const response = await invokeLLM({
      messages: [
        { role: "system", content: `You are an expert B2B sales email writer for HackerEarth, a developer assessment and hiring platform.${styleBlock}\n\n${HACKEREARTH_SYSTEM_PROMPT}\n\nWrite professional, concise, high-converting sales emails. Always output in this exact format:\nSUBJECT: [subject line]\n\n[email body]` },
        { role: "user", content: `Write an email with the following intent:\n${input.prompt}${meetingContextBlock}` },
      ],
    });

    const rawContent = response.choices?.[0]?.message?.content ?? "";
    const content = typeof rawContent === "string" ? rawContent : "";
    const subjectMatch = content.match(/^SUBJECT:\s*(.+)$/m);
    const subject = subjectMatch?.[1]?.trim() ?? "Following up";
    const body = content.replace(/^SUBJECT:\s*.+\n\n?/m, "").trim();

    const id = await createGeneratedEmail({
      meetingId: input.meetingId,
      emailType: "custom",
      subject,
      body,
      context: input.prompt,
    });

    return { id, subject, body };
  }),

  // User accepts an email (optionally with edits) — triggers style learning
  accept: publicProcedure.input(z.object({
    id: z.number(),
    finalText: z.string().optional(), // The final email text the user actually sent (may differ from generated)
  })).mutation(async ({ input }) => {
    await acceptGeneratedEmail(input.id, input.finalText);

    // Async style learning: fetch last 10 accepted emails and update style profile
    const accepted = await getAcceptedEmails(10);
    if (accepted.length >= 2) {
      const samples = accepted.map((e, i) => `--- Email ${i + 1} ---\nSubject: ${e.subject}\n${e.userEdits || e.body}`).join("\n\n");
      const learnResponse = await invokeLLM({
        messages: [
          { role: "system", content: "You are analyzing a sales rep's accepted emails to extract their writing style preferences. Return a JSON object with: tone (string), avgLength (string: e.g. 'concise under 150 words'), openingStyle (string), closingStyle (string), preferredPhrases (array of strings), avoidPhrases (array of strings), structureNotes (string), learnedAt (ISO timestamp string), samplesAnalyzed (number)." },
          { role: "user", content: `Analyze these emails the rep accepted/used and extract their style preferences:\n\n${samples}` },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "email_style_profile",
            strict: true,
            schema: {
              type: "object",
              properties: {
                tone: { type: "string" },
                avgLength: { type: "string" },
                openingStyle: { type: "string" },
                closingStyle: { type: "string" },
                preferredPhrases: { type: "array", items: { type: "string" } },
                avoidPhrases: { type: "array", items: { type: "string" } },
                structureNotes: { type: "string" },
                learnedAt: { type: "string" },
                samplesAnalyzed: { type: "number" },
              },
              required: ["tone", "avgLength", "openingStyle", "closingStyle", "preferredPhrases", "avoidPhrases", "structureNotes", "learnedAt", "samplesAnalyzed"],
              additionalProperties: false,
            },
          },
        },
      });
      try {
        const raw = learnResponse.choices?.[0]?.message?.content ?? "{}";
        const profile = JSON.parse(typeof raw === "string" ? raw : "{}");
        await updateEmailStyleProfile(profile);
      } catch { /* ignore parse errors */ }
    }

    return { success: true };
  }),

  // Get the current learned style profile
  styleProfile: publicProcedure.query(() => getEmailStyleProfile()),

  delete: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => { await deleteGeneratedEmail(input.id); return { success: true }; }),
});

// ─── Accounts Router ──────────────────────────────────────────────────────────
const accountsRouter = router({
  list: publicProcedure.query(() => getAllAccounts()),
  get: publicProcedure.input(z.object({ id: z.number() })).query(({ input }) => getAccountById(input.id)),
  create: publicProcedure.input(z.object({ name: z.string(), industry: z.string().optional(), domain: z.string().optional() })).mutation(async ({ input }) => {
    const id = await createAccount({ name: input.name, normalizedName: normalizeAccountName(input.name), industry: input.industry, domain: input.domain });
    return { id };
  }),
  linkMeeting: publicProcedure.input(z.object({ meetingId: z.number(), accountId: z.number() })).mutation(async ({ input }) => {
    await updateMeeting(input.meetingId, { accountId: input.accountId });
    return { success: true };
  }),
  meetings: publicProcedure.input(z.object({ accountId: z.number() })).query(({ input }) => getMeetingsByAccountId(input.accountId)),
  findMatch: publicProcedure.input(z.object({ companyName: z.string() })).query(({ input }) => findMatchingAccount(input.companyName)),
});

// ─── Deal Summary Router ──────────────────────────────────────────────────────
const dealSummaryRouter = router({
  get: publicProcedure.input(z.object({ accountId: z.number() })).query(({ input }) => getDealSummaryByAccountId(input.accountId)),
  list: publicProcedure.query(() => getAllDealSummaries()),
  generate: publicProcedure.input(z.object({ accountId: z.number() })).mutation(async ({ input }) => {
      const [account, accountMeetings] = await Promise.all([
        getAccountById(input.accountId),
        getMeetingsByAccountId(input.accountId),
      ]);
      if (!account) throw new Error("Account not found");
      if (accountMeetings.length === 0) throw new Error("No meetings found for this account");

      // Gather all analysis data for each meeting
      const meetingData = await Promise.all(
        accountMeetings.map(async (m) => {
          const [transcript, analysis, spiced, meddpicc] = await Promise.all([
            getTranscriptByMeetingId(m.id),
            getAiAnalysisByMeetingId(m.id),
            getSpicedReportByMeetingId(m.id),
            getMeddpiccReportByMeetingId(m.id),
          ]);
          return { meeting: m, transcript, analysis, spiced, meddpicc };
        })
      );

      // Build a rich context for the LLM
      const callSummaries = meetingData.map((md, i) => {
        const parts = [`Call ${i + 1}: ${md.meeting.title} (${new Date(Number(md.meeting.createdAt)).toLocaleDateString()})`];
        if (md.meeting.dealStage) parts.push(`  Stage: ${md.meeting.dealStage}`);
        if (md.analysis?.summary) parts.push(`  Summary: ${md.analysis.summary}`);
        type AI = { text: string }[];
        const toText = (v: unknown) => Array.isArray(v) ? (v as AI).map(i => i.text).filter(Boolean).join("; ") : "";
        if (md.analysis) {
          const pp = toText(md.analysis.painPoints); if (pp) parts.push(`  Pain Points: ${pp}`);
          const bs = toText(md.analysis.buyingSignals); if (bs) parts.push(`  Buying Signals: ${bs}`);
          const ob = toText(md.analysis.objections); if (ob) parts.push(`  Objections: ${ob}`);
          const ns = toText(md.analysis.nextSteps); if (ns) parts.push(`  Next Steps: ${ns}`);
          if (md.analysis.dealScore) parts.push(`  Deal Score: ${md.analysis.dealScore}/10`);
        }
        return parts.join("\n");
      }).join("\n\n");

      const response = await invokeLLM({
        messages: [
          { role: "system", content: `You are a senior sales analyst. Analyze multiple sales calls with the same account and produce a consolidated deal summary. Return a JSON object with these fields: narrative (string, 2-3 paragraph deal story), consolidatedMeddpicc (object with keys: metrics, economicBuyer, decisionCriteria, decisionProcess, identifyPain, champion, competition, each a string), consolidatedSpiced (object with keys: situation, pain, impact, criticalEvent, decision, each a string), healthScore (number 1-10), healthTrend (array of objects with callIndex and score), risks (array of strings), momentumSignals (array of strings), recommendedNextAction (string).` },
          { role: "user", content: `Account: ${account.name}\nTotal Calls: ${accountMeetings.length}\n\n${callSummaries}` },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "deal_summary",
            strict: true,
            schema: {
              type: "object",
              properties: {
                narrative: { type: "string" },
                consolidatedMeddpicc: { type: "object", properties: { metrics: { type: "string" }, economicBuyer: { type: "string" }, decisionCriteria: { type: "string" }, decisionProcess: { type: "string" }, identifyPain: { type: "string" }, champion: { type: "string" }, competition: { type: "string" } }, required: ["metrics","economicBuyer","decisionCriteria","decisionProcess","identifyPain","champion","competition"], additionalProperties: false },
                consolidatedSpiced: { type: "object", properties: { situation: { type: "string" }, pain: { type: "string" }, impact: { type: "string" }, criticalEvent: { type: "string" }, decision: { type: "string" } }, required: ["situation","pain","impact","criticalEvent","decision"], additionalProperties: false },
                healthScore: { type: "number" },
                healthTrend: { type: "array", items: { type: "object", properties: { callIndex: { type: "number" }, score: { type: "number" } }, required: ["callIndex","score"], additionalProperties: false } },
                risks: { type: "array", items: { type: "string" } },
                momentumSignals: { type: "array", items: { type: "string" } },
                recommendedNextAction: { type: "string" },
              },
              required: ["narrative","consolidatedMeddpicc","consolidatedSpiced","healthScore","healthTrend","risks","momentumSignals","recommendedNextAction"],
              additionalProperties: false,
            },
          },
        },
      });

      const raw = response.choices?.[0]?.message?.content ?? "{}";
      const summary = JSON.parse(typeof raw === "string" ? raw : "{}");

      await upsertDealSummary({
        accountId: input.accountId,
        accountName: account.name,
        dealNarrative: summary.narrative,
        consolidatedMeddpicc: summary.consolidatedMeddpicc,
        consolidatedSpiced: summary.consolidatedSpiced,
        dealHealthScore: summary.healthScore,
        dealHealthTrend: summary.healthTrend,
        keyRisks: summary.risks,
        momentumSignals: summary.momentumSignals,
        recommendedNextAction: summary.recommendedNextAction,
        callCount: accountMeetings.length,
      });

      return { success: true, ...summary, accountName: account.name, callCount: accountMeetings.length };
    }),
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
  accounts: accountsRouter,
  dealSummary: dealSummaryRouter,
  decks: decksRouter,
  battlecards: battlecardsRouter,
  objections: objectionsRouter,
  notes: notesRouter,
  settings: settingsRouter,
});

export type AppRouter = typeof appRouter;
