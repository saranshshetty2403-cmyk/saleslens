/**
 * SalesLens — Local AI Client
 * ============================
 * Connects to Ollama running locally (or on an IndiaAI GPU instance).
 * Zero external data transmission — all LLM inference is private.
 *
 * Ollama API: https://github.com/ollama/ollama/blob/main/docs/api.md
 */

import { getAppSettings } from "./db";

// ─── Types ────────────────────────────────────────────────────────────────────

export type OllamaMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type OllamaResponse = {
  model: string;
  message: { role: string; content: string };
  done: boolean;
  total_duration?: number;
  eval_count?: number;
};

export type LocalAIConfig = {
  ollamaEndpoint: string;
  ollamaModel: string;
  whisperEndpoint: string;
};

// ─── Config helpers ───────────────────────────────────────────────────────────

const DEFAULT_CONFIG: LocalAIConfig = {
  ollamaEndpoint: "http://localhost:11434",
  ollamaModel: "llama3.1:8b",
  whisperEndpoint: "http://localhost:8001",
};

export async function getLocalAIConfig(): Promise<LocalAIConfig> {
  try {
    const settings = await getAppSettings();
    return {
      ollamaEndpoint: (settings as any)?.ollamaEndpoint || DEFAULT_CONFIG.ollamaEndpoint,
      ollamaModel: (settings as any)?.ollamaModel || DEFAULT_CONFIG.ollamaModel,
      whisperEndpoint: (settings as any)?.whisperEndpoint || DEFAULT_CONFIG.whisperEndpoint,
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

// ─── Ollama health check ──────────────────────────────────────────────────────

export async function checkOllamaHealth(endpoint?: string): Promise<{
  running: boolean;
  models: string[];
  error?: string;
}> {
  const url = endpoint || DEFAULT_CONFIG.ollamaEndpoint;
  try {
    const res = await fetch(`${url}/api/tags`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { running: false, models: [], error: `HTTP ${res.status}` };
    const data = await res.json() as { models?: Array<{ name: string }> };
    const models = (data.models || []).map((m) => m.name);
    return { running: true, models };
  } catch (e: any) {
    return { running: false, models: [], error: e.message };
  }
}

// ─── Whisper health check ─────────────────────────────────────────────────────

export async function checkWhisperHealth(endpoint?: string): Promise<{
  running: boolean;
  model?: string;
  device?: string;
  error?: string;
}> {
  const url = endpoint || DEFAULT_CONFIG.whisperEndpoint;
  try {
    const res = await fetch(`${url}/health`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { running: false, error: `HTTP ${res.status}` };
    const data = await res.json() as any;
    return {
      running: data.status === "ok",
      model: data.model?.size,
      device: data.model?.device,
    };
  } catch (e: any) {
    return { running: false, error: e.message };
  }
}

// ─── Core LLM call ───────────────────────────────────────────────────────────

export async function callOllama(
  messages: OllamaMessage[],
  options?: {
    model?: string;
    temperature?: number;
    endpoint?: string;
    format?: "json" | undefined;
    timeout?: number;
  }
): Promise<string> {
  const config = await getLocalAIConfig();
  const endpoint = options?.endpoint || config.ollamaEndpoint;
  const model = options?.model || config.ollamaModel;
  const timeout = options?.timeout || 120_000; // 2 min default

  const body: Record<string, unknown> = {
    model,
    messages,
    stream: false,
    options: {
      temperature: options?.temperature ?? 0.1,
      num_predict: 4096,
      top_p: 0.9,
    },
  };

  if (options?.format === "json") {
    body.format = "json";
  }

  const res = await fetch(`${endpoint}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeout),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Ollama error ${res.status}: ${text}`);
  }

  const data = await res.json() as OllamaResponse;
  return data.message.content;
}

// ─── Structured JSON extraction ───────────────────────────────────────────────

export async function callOllamaJSON<T>(
  messages: OllamaMessage[],
  options?: Parameters<typeof callOllama>[1]
): Promise<T> {
  const raw = await callOllama(messages, { ...options, format: "json" });
  try {
    return JSON.parse(raw) as T;
  } catch {
    // Try to extract JSON from markdown code blocks
    const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) return JSON.parse(match[1]) as T;
    // Last resort: find first { ... }
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]) as T;
    throw new Error(`Failed to parse Ollama JSON response: ${raw.slice(0, 200)}`);
  }
}

// ─── Sales-specific prompts ───────────────────────────────────────────────────

const SALES_SYSTEM_PROMPT = `You are SalesLens, an expert B2B sales intelligence analyst with deep expertise in SaaS sales methodologies (SPICED, MEDDPICC, BANT, Challenger Sale). You analyze sales call transcripts with precision, extracting structured insights that help sales reps close deals. You are concise, evidence-based, and always cite specific quotes from the transcript. All data you process is confidential client information — treat it with the highest level of discretion.`;

// ── AI Analysis ───────────────────────────────────────────────────────────────

export type AIAnalysisResult = {
  summary: string;
  painPoints: Array<{ text: string; quote: string; confidence: number }>;
  objections: Array<{ text: string; quote: string; confidence: number }>;
  buyingSignals: Array<{ text: string; quote: string; confidence: number }>;
  nextSteps: Array<{ text: string; quote: string; confidence: number }>;
  keyQuotes: Array<{ speaker: string; text: string; category: string }>;
  dealScore: number;
  sentiment: "positive" | "neutral" | "negative" | "mixed";
  talkRatio: Record<string, number>;
};

export async function generateAIAnalysis(
  transcript: string,
  meetingContext?: { title?: string; accountName?: string; dealStage?: string }
): Promise<AIAnalysisResult> {
  const contextStr = meetingContext
    ? `Meeting: ${meetingContext.title || "Sales Call"} | Account: ${meetingContext.accountName || "Unknown"} | Stage: ${meetingContext.dealStage || "Unknown"}`
    : "";

  const messages: OllamaMessage[] = [
    { role: "system", content: SALES_SYSTEM_PROMPT },
    {
      role: "user",
      content: `Analyze this sales call transcript and return a JSON object with the following structure. Be precise and cite actual quotes from the transcript.

${contextStr}

TRANSCRIPT:
${transcript}

Return ONLY valid JSON matching this exact schema:
{
  "summary": "2-3 sentence executive summary of the call",
  "painPoints": [{"text": "description", "quote": "exact quote from transcript", "confidence": 0.0-1.0}],
  "objections": [{"text": "description", "quote": "exact quote", "confidence": 0.0-1.0}],
  "buyingSignals": [{"text": "description", "quote": "exact quote", "confidence": 0.0-1.0}],
  "nextSteps": [{"text": "specific action item", "quote": "exact quote or context", "confidence": 0.0-1.0}],
  "keyQuotes": [{"speaker": "speaker label", "text": "impactful quote", "category": "pain|objection|buying_signal|decision|general"}],
  "dealScore": 0-100,
  "sentiment": "positive|neutral|negative|mixed",
  "talkRatio": {"rep": 0.0-1.0, "prospect": 0.0-1.0}
}`,
    },
  ];

  return callOllamaJSON<AIAnalysisResult>(messages, { temperature: 0.1 });
}

// ── SPICED Report ─────────────────────────────────────────────────────────────

export type SPICEDResult = {
  situation: string;
  situationConfidence: number;
  pain: string;
  painConfidence: number;
  impact: string;
  impactConfidence: number;
  criticalEvent: string;
  criticalEventConfidence: number;
  decision: string;
  decisionConfidence: number;
  overallCompleteness: number;
};

export async function generateSPICEDReport(
  transcript: string,
  meetingContext?: { title?: string; accountName?: string }
): Promise<SPICEDResult> {
  const messages: OllamaMessage[] = [
    { role: "system", content: SALES_SYSTEM_PROMPT },
    {
      role: "user",
      content: `You are filling out a SPICED sales qualification framework based on this sales call transcript.

SPICED Framework Definitions:
- SITUATION: The prospect's current state, environment, tech stack, team size, processes, and business context. What is their world like today?
- PAIN: The specific business problem, challenge, or gap they are experiencing. What is broken, inefficient, or causing them pain? Must be a business pain, not a feature request.
- IMPACT: The quantified or qualifiable business impact of the pain — revenue lost, time wasted, deals missed, churn, cost overruns. What happens if the pain is NOT solved?
- CRITICAL EVENT: The specific date, event, or deadline that creates urgency. Why do they NEED to solve this by a specific time? (e.g., board meeting, contract renewal, product launch, compliance deadline)
- DECISION: The decision-making process, criteria, stakeholders involved, and how they will evaluate and select a solution. Who signs, who influences, what criteria matter?

${meetingContext ? `Meeting: ${meetingContext.title} | Account: ${meetingContext.accountName}` : ""}

TRANSCRIPT:
${transcript}

Return ONLY valid JSON:
{
  "situation": "detailed situation summary based on transcript evidence",
  "situationConfidence": 0.0-1.0,
  "pain": "specific business pain with evidence from transcript",
  "painConfidence": 0.0-1.0,
  "impact": "quantified or qualifiable business impact",
  "impactConfidence": 0.0-1.0,
  "criticalEvent": "specific event/deadline creating urgency, or 'Not identified' if absent",
  "criticalEventConfidence": 0.0-1.0,
  "decision": "decision process, stakeholders, criteria identified",
  "decisionConfidence": 0.0-1.0,
  "overallCompleteness": 0.0-1.0
}

If a field cannot be determined from the transcript, set the text to "Not identified in this call" and confidence to 0.1.`,
    },
  ];

  return callOllamaJSON<SPICEDResult>(messages, { temperature: 0.05 });
}

// ── MEDDPICC Report ───────────────────────────────────────────────────────────

export type MEDDPICCResult = {
  metrics: string;
  metricsConfidence: number;
  economicBuyer: string;
  economicBuyerConfidence: number;
  decisionCriteria: string;
  decisionCriteriaConfidence: number;
  decisionProcess: string;
  decisionProcessConfidence: number;
  paperProcess: string;
  paperProcessConfidence: number;
  identifyPain: string;
  identifyPainConfidence: number;
  champion: string;
  championConfidence: number;
  competition: string;
  competitionConfidence: number;
  overallCompleteness: number;
};

export async function generateMEDDPICCReport(
  transcript: string,
  meetingContext?: { title?: string; accountName?: string }
): Promise<MEDDPICCResult> {
  const messages: OllamaMessage[] = [
    { role: "system", content: SALES_SYSTEM_PROMPT },
    {
      role: "user",
      content: `You are filling out a MEDDPICC enterprise sales qualification framework based on this sales call transcript.

MEDDPICC Framework Definitions:
- METRICS: Quantifiable business outcomes the prospect wants to achieve. Hard numbers: reduce churn by X%, increase revenue by $Y, save Z hours/week. What does success look like in numbers?
- ECONOMIC BUYER: The person with final budget authority and power to sign the contract. Not just a champion or influencer — the one who can say YES and release funds.
- DECISION CRITERIA: The formal and informal criteria used to evaluate solutions. Technical requirements, vendor requirements, pricing thresholds, integration needs, security requirements.
- DECISION PROCESS: The step-by-step process to go from evaluation to signed contract. Stages, stakeholders at each stage, typical timeline, approval chain.
- PAPER PROCESS: The legal, procurement, and contracting process. Security reviews, legal review, procurement involvement, standard contract terms, typical time from verbal yes to signed.
- IDENTIFY PAIN: The compelling business event or pain that is driving the evaluation. Why are they looking NOW? What is the cost of inaction? Linked to a specific business problem.
- CHAMPION: An internal advocate who has power, influence, and is personally invested in the success of your solution. They sell internally on your behalf when you are not in the room.
- COMPETITION: Other vendors being evaluated, internal build options, status quo/do-nothing option. What are they comparing you against?

${meetingContext ? `Meeting: ${meetingContext.title} | Account: ${meetingContext.accountName}` : ""}

TRANSCRIPT:
${transcript}

Return ONLY valid JSON:
{
  "metrics": "specific quantifiable success metrics mentioned",
  "metricsConfidence": 0.0-1.0,
  "economicBuyer": "name/role of economic buyer if identified",
  "economicBuyerConfidence": 0.0-1.0,
  "decisionCriteria": "evaluation criteria mentioned",
  "decisionCriteriaConfidence": 0.0-1.0,
  "decisionProcess": "steps in their decision process",
  "decisionProcessConfidence": 0.0-1.0,
  "paperProcess": "legal/procurement/contracting process details",
  "paperProcessConfidence": 0.0-1.0,
  "identifyPain": "core business pain driving the evaluation",
  "identifyPainConfidence": 0.0-1.0,
  "champion": "internal champion name/role and evidence of advocacy",
  "championConfidence": 0.0-1.0,
  "competition": "competitors or alternatives being evaluated",
  "competitionConfidence": 0.0-1.0,
  "overallCompleteness": 0.0-1.0
}

If a field cannot be determined from the transcript, set text to "Not identified in this call" and confidence to 0.1.`,
    },
  ];

  return callOllamaJSON<MEDDPICCResult>(messages, { temperature: 0.05 });
}

// ── Action Items Extraction ───────────────────────────────────────────────────

export type ExtractedActionItem = {
  title: string;
  description: string;
  assignee: string;
  priority: "low" | "medium" | "high" | "urgent";
  dueDays: number | null;
  sourceQuote: string;
};

export async function extractActionItems(
  transcript: string
): Promise<ExtractedActionItem[]> {
  const messages: OllamaMessage[] = [
    { role: "system", content: SALES_SYSTEM_PROMPT },
    {
      role: "user",
      content: `Extract all action items, commitments, and follow-ups from this sales call transcript.

Look for:
- Explicit commitments ("I'll send you...", "We will...", "Can you...")
- Agreed next steps ("Let's schedule...", "I'll follow up...")
- Deliverables promised ("I'll share the proposal...", "We'll prepare a POC...")
- Questions to answer ("I'll check with my team...", "Let me find out...")

TRANSCRIPT:
${transcript}

Return ONLY valid JSON array:
[
  {
    "title": "short action item title (max 80 chars)",
    "description": "detailed description of what needs to be done",
    "assignee": "rep|prospect|both|unknown",
    "priority": "low|medium|high|urgent",
    "dueDays": number of days from now (null if not specified),
    "sourceQuote": "exact quote from transcript that generated this action"
  }
]

Return empty array [] if no action items found.`,
    },
  ];

  const result = await callOllamaJSON<ExtractedActionItem[]>(messages, { temperature: 0.1 });
  return Array.isArray(result) ? result : [];
}
