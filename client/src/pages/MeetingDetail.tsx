import { tsToDate } from "@/lib/dateUtils";
import { useState } from "react";
import { useParams, Link, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import type { AiAnalysis, SpicedReport, MeddpiccReport, PitchCoaching, PreCallIntelligence, AnalysisItem } from "../../../drizzle/schema";
import { toast } from "sonner";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft, Zap, Loader2, Upload, FileText, Brain, Target, TrendingUp,
  CheckSquare, MessageSquare, AlertCircle, ChevronDown, ChevronUp, Edit3, Save, X
} from "lucide-react";
import { Streamdown } from "streamdown";

// ─── Types ────────────────────────────────────────────────────────────────────
type ActionItem = {
  id: number; title: string; description?: string | null;
  status: "open" | "in_progress" | "completed" | "cancelled";
  priority: "low" | "medium" | "high" | "urgent";
  dueDate?: Date | null; isAiGenerated?: boolean | null;
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MeetingDetail() {
  const params = useParams<{ id: string }>();
  const meetingId = parseInt(params.id ?? "0");
  const utils = trpc.useUtils();

  const search = useSearch();
  const initialTab = new URLSearchParams(search).get("tab") ?? "transcript";
  const [transcriptInput, setTranscriptInput] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState(initialTab);

  // ─── Queries ─────────────────────────────────────────────────────────────
  const { data: meeting, isLoading: meetingLoading } = trpc.meetings.get.useQuery({ id: meetingId });
  const { data: transcript } = trpc.transcripts.get.useQuery({ meetingId });
  const { data: allData, isLoading: allDataLoading } = trpc.analyze.getAll.useQuery({ meetingId });
  const { data: actionItems } = trpc.actionItems.list.useQuery({ meetingId });

  // ─── Mutations ────────────────────────────────────────────────────────────
  const saveTranscriptMutation = trpc.transcripts.save.useMutation({
    onSuccess: () => {
      toast.success("Transcript saved");
      utils.transcripts.get.invalidate({ meetingId });
    },
    onError: (err) => toast.error(err.message),
  });

  const generateAllMutation = trpc.analyze.full.useMutation({
    onSuccess: () => {
      toast.success("All reports generated — SPICED, MEDDPICC, coaching, and prospects ready");
      utils.analyze.getAll.invalidate({ meetingId });
      utils.actionItems.list.invalidate({ meetingId });
      utils.meetings.get.invalidate({ id: meetingId });
      setActiveTab("analysis");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateActionMutation = trpc.actionItems.update.useMutation({
    onSuccess: () => utils.actionItems.list.invalidate({ meetingId }),
  });

  const updateSpicedMutation = trpc.spiced.update.useMutation({
    onSuccess: () => utils.analyze.getAll.invalidate({ meetingId }),
  });

  const updateMeddpiccMutation = trpc.meddpicc.update.useMutation({
    onSuccess: () => utils.analyze.getAll.invalidate({ meetingId }),
  });

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 16 * 1024 * 1024) { toast.error("File must be under 16MB"); return; }
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("audio", file);
      const res = await fetch("/api/transcribe-upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const { text } = await res.json() as { text: string };
      setTranscriptInput(text);
      toast.success("Audio transcribed — review and save");
    } catch {
      toast.error("Transcription failed. Make sure the Whisper service is running.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveTranscript = () => {
    if (!transcriptInput.trim()) { toast.error("Transcript is empty"); return; }
    saveTranscriptMutation.mutate({
      meetingId,
      fullText: transcriptInput,
    });
  };

  const handleGenerateAll = () => {
    const text = transcript?.fullText || transcriptInput;
    if (!text.trim()) { toast.error("Save a transcript first"); return; }
    generateAllMutation.mutate({
      meetingId,
      transcript: text,
      accountName: meeting?.accountName ?? undefined,
      contactName: meeting?.contactName ?? undefined,
    });
  };

  if (meetingLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Meeting not found.</p>
        <Link href="/meetings"><Button variant="outline" className="mt-4">Back to Meetings</Button></Link>
      </div>
    );
  }

  const hasTranscript = !!(transcript?.fullText || transcriptInput.trim());
  const isProcessing = generateAllMutation.isPending;
  const analysis = allData?.analysis as AiAnalysis | undefined;
  const spiced = allData?.spiced as SpicedReport | undefined;
  const meddpicc = allData?.meddpicc as MeddpiccReport | undefined;
  const coaching = allData?.coaching as PitchCoaching | undefined;
  const preCall = allData?.preCall as PreCallIntelligence | undefined;

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href="/meetings">
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground -ml-2 mt-0.5">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground truncate">{meeting.title}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-1">
              {meeting.accountName && <Badge variant="outline" className="text-xs">{meeting.accountName}</Badge>}
              {meeting.contactName && <span className="text-xs text-muted-foreground">{meeting.contactName as string}</span>}
              {meeting.dealStage && <Badge className="text-xs bg-primary/10 text-primary border-primary/20">{meeting.dealStage}</Badge>}
              <span className="text-xs text-muted-foreground">{format(tsToDate(meeting.createdAt), "MMM d, yyyy")}</span>
          </div>
        </div>
        <Button
          onClick={handleGenerateAll}
          disabled={!hasTranscript || isProcessing}
          className="gap-2 shrink-0 bg-primary hover:bg-primary/90"
          size="sm"
        >
          {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          {isProcessing ? "Generating..." : "Generate All Reports"}
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger value="transcript" className="text-xs sm:text-sm">
            <FileText className="w-3 h-3 mr-1" />Transcript
          </TabsTrigger>
          <TabsTrigger value="analysis" className="text-xs sm:text-sm">
            <Brain className="w-3 h-3 mr-1" />Analysis
          </TabsTrigger>
          <TabsTrigger value="spiced" className="text-xs sm:text-sm">
            <Target className="w-3 h-3 mr-1" />SPICED
          </TabsTrigger>
          <TabsTrigger value="meddpicc" className="text-xs sm:text-sm">
            <TrendingUp className="w-3 h-3 mr-1" />MEDDPICC
          </TabsTrigger>
          <TabsTrigger value="coaching" className="text-xs sm:text-sm">
            <MessageSquare className="w-3 h-3 mr-1" />Coaching
          </TabsTrigger>
          <TabsTrigger value="actions" className="text-xs sm:text-sm">
            <CheckSquare className="w-3 h-3 mr-1" />Actions
            {actionItems && actionItems.filter((a: ActionItem) => a.status !== "completed").length > 0 && (
              <span className="ml-1 text-[10px] bg-primary text-primary-foreground rounded-full px-1.5">
                {actionItems.filter((a: ActionItem) => a.status !== "completed").length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Transcript Tab ── */}
        <TabsContent value="transcript" className="mt-4 space-y-4">
          {/* Audio Upload */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Upload className="w-4 h-4 text-primary" />
                Upload Audio File
              </CardTitle>
            </CardHeader>
            <CardContent>
              <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors">
                <input type="file" accept="audio/*,.mp3,.wav,.m4a,.webm,.ogg" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                {isUploading ? (
                  <div className="flex items-center gap-2 text-primary">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm">Transcribing with Whisper...</span>
                  </div>
                ) : (
                  <div className="text-center">
                    <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
                    <p className="text-sm text-muted-foreground">Drop audio file or click to upload</p>
                    <p className="text-xs text-muted-foreground/60 mt-0.5">MP3, WAV, M4A, WebM — max 16MB</p>
                  </div>
                )}
              </label>
            </CardContent>
          </Card>

          {/* Transcript Text Input */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Transcript Text
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {transcript?.fullText && !transcriptInput && (
                <div className="rounded-lg bg-muted/30 border border-border p-3 max-h-64 overflow-y-auto">
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">{transcript.fullText}</p>
                </div>
              )}
              <Textarea
                placeholder={transcript?.fullText ? "Edit transcript or paste a new one..." : "Paste your call transcript here...\n\nTip: Include speaker labels like:\n[Rep]: ...\n[Prospect]: ..."}
                value={transcriptInput}
                onChange={(e) => setTranscriptInput(e.target.value)}
                className="min-h-[200px] text-xs font-mono bg-input border-border resize-y"
              />
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  {transcriptInput.split(/\s+/).filter(Boolean).length} words
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSaveTranscript}
                    disabled={!transcriptInput.trim() || saveTranscriptMutation.isPending}
                    className="text-xs"
                  >
                    {saveTranscriptMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />}
                    Save Transcript
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleGenerateAll}
                    disabled={!hasTranscript || isProcessing}
                    className="text-xs gap-1 bg-primary hover:bg-primary/90"
                  >
                    {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                    Generate All Reports
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Analysis Tab ── */}
        <TabsContent value="analysis" className="mt-4">
          {allDataLoading ? (
            <div className="flex items-center justify-center h-32"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
          ) : analysis ? (
            <div className="space-y-4">
              {/* Deal Score */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <ScoreCard label="Deal Score" value={`${analysis.dealScore ?? 0}/100`} color="text-primary" />
                <ScoreCard label="Sentiment" value={analysis.sentiment ?? "—"} color="text-emerald-400" />
                <ScoreCard label="Talk Ratio" value={analysis.talkRatio?.rep != null ? `${Math.round((analysis.talkRatio.rep ?? 0) * 100)}% rep` : "—"} color="text-blue-400" />
                <ScoreCard label="Company" value={meeting?.accountName ?? "Unknown"} color="text-amber-400" />
              </div>

              {/* Summary */}
              {analysis.summary && (
                <Card className="bg-card border-border">
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Call Summary</CardTitle></CardHeader>
                  <CardContent><Streamdown className="text-sm text-muted-foreground leading-relaxed">{analysis.summary}</Streamdown></CardContent>
                </Card>
              )}

              {/* Pain Points, Objections, Buying Signals */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <InsightCard title="Pain Points" items={(analysis.painPoints ?? []).map((p: AnalysisItem) => p.text)} color="text-red-400" />
                <InsightCard title="Objections" items={(analysis.objections ?? []).map((o: AnalysisItem) => o.text)} color="text-amber-400" />
                <InsightCard title="Buying Signals" items={(analysis.buyingSignals ?? []).map((b: AnalysisItem) => b.text)} color="text-emerald-400" />
              </div>

              {/* Next Steps */}
              {(analysis.nextSteps ?? []).length > 0 && (
                <Card className="bg-card border-border">
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Recommended Next Steps</CardTitle></CardHeader>
                  <CardContent>
                    <ul className="space-y-1.5">
                      {(analysis.nextSteps ?? []).map((step: AnalysisItem, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="text-primary font-bold mt-0.5">{i + 1}.</span>
                          <span className="text-muted-foreground">{step.text}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Pre-Call Intelligence */}
              {preCall && (
                <PreCallCard preCall={preCall} />
              )}
            </div>
          ) : (
            <EmptyState
              icon={<Brain className="w-8 h-8 text-muted-foreground/40" />}
              title="No analysis yet"
              description="Save a transcript and click Generate All Reports to get AI-powered insights."
              action={hasTranscript ? (
                <Button size="sm" onClick={handleGenerateAll} disabled={isProcessing} className="gap-2">
                  {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                  Generate Now
                </Button>
              ) : undefined}
            />
          )}
        </TabsContent>

        {/* ── SPICED Tab ── */}
        <TabsContent value="spiced" className="mt-4">
          {spiced ? (
            <SpicedTab spiced={spiced} meetingId={meetingId} updateMutation={updateSpicedMutation} isGenerating={isProcessing} onGenerate={handleGenerateAll} />
          ) : (
            <EmptyState
              icon={<Target className="w-8 h-8 text-muted-foreground/40" />}
              title="No SPICED report yet"
              description="Generate all reports to auto-fill the SPICED methodology framework."
              action={hasTranscript ? (
                <Button size="sm" onClick={handleGenerateAll} disabled={isProcessing} className="gap-2">
                  {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                  Generate SPICED
                </Button>
              ) : undefined}
            />
          )}
        </TabsContent>

        {/* ── MEDDPICC Tab ── */}
        <TabsContent value="meddpicc" className="mt-4">
          {meddpicc ? (
            <MeddpiccTab meddpicc={meddpicc} meetingId={meetingId} updateMutation={updateMeddpiccMutation} isGenerating={isProcessing} onGenerate={handleGenerateAll} />
          ) : (
            <EmptyState
              icon={<TrendingUp className="w-8 h-8 text-muted-foreground/40" />}
              title="No MEDDPICC report yet"
              description="Generate all reports to auto-fill the MEDDPICC qualification framework."
              action={hasTranscript ? (
                <Button size="sm" onClick={handleGenerateAll} disabled={isProcessing} className="gap-2">
                  {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                  Generate MEDDPICC
                </Button>
              ) : undefined}
            />
          )}
        </TabsContent>

        {/* ── Coaching Tab ── */}
        <TabsContent value="coaching" className="mt-4">
          {coaching ? (
            <CoachingTab coaching={coaching} />
          ) : (
            <EmptyState
              icon={<MessageSquare className="w-8 h-8 text-muted-foreground/40" />}
              title="No coaching feedback yet"
              description="Generate all reports to get PhD-level pitch coaching and moment-by-moment feedback."
              action={hasTranscript ? (
                <Button size="sm" onClick={handleGenerateAll} disabled={isProcessing} className="gap-2">
                  {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                  Generate Coaching
                </Button>
              ) : undefined}
            />
          )}
        </TabsContent>

        {/* ── Action Items Tab ── */}
        <TabsContent value="actions" className="mt-4">
          <ActionItemsTab meetingId={meetingId} items={actionItems ?? []} updateMutation={updateActionMutation} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── PreCallCard ─────────────────────────────────────────────────────────────
function PreCallCard({ preCall }: { preCall: PreCallIntelligence }) {
  const companyName = preCall.companyName ?? null;
  const industry = preCall.industry ?? null;
  const fundingStage = preCall.fundingStage ?? null;
  const leadWithProduct = preCall.leadWithProduct ?? null;
  const bullets = preCall.prepBullets ?? [];
  return (
    <Card className="bg-card border-border border-blue-500/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Brain className="w-4 h-4 text-blue-400" />
          Pre-Call Intelligence
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {companyName && (
          <p className="text-xs font-medium text-blue-400">
            {companyName}{industry ? ` · ${industry}` : ''}{fundingStage ? ` · ${fundingStage}` : ''}
          </p>
        )}
        {bullets.length > 0 && (
          <div>
            <p className="text-xs font-medium text-blue-400 mb-1">Pre-Call Prep</p>
            <ul className="space-y-1">
              {bullets.map((b, i) => (
                <li key={i} className="text-xs text-muted-foreground">
                  <span className="text-foreground font-medium">• {b.point}</span>
                  {b.why && <span className="text-muted-foreground/70"> — {b.why}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
        {leadWithProduct && (
          <p className="text-xs"><span className="text-blue-400 font-medium">Lead with: </span>{leadWithProduct}</p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ScoreCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-3">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-lg font-bold mt-0.5 ${color}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function InsightCard({ title, items, color }: { title: string; items: string[]; color: string }) {
  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2"><CardTitle className={`text-xs ${color}`}>{title}</CardTitle></CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground/50">None identified</p>
        ) : (
          <ul className="space-y-1">
            {items.map((item, i) => (
              <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                <span className={`${color} mt-0.5`}>•</span>{item}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyState({ icon, title, description, action }: { icon: React.ReactNode; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
      {icon}
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground max-w-xs">{description}</p>
      {action}
    </div>
  );
}

// ─── SPICED Tab ───────────────────────────────────────────────────────────────
const SPICED_FIELDS = [
  { key: "situation", label: "Situation", description: "Current state of the prospect's business and hiring process", color: "text-blue-400" },
  { key: "pain", label: "Pain", description: "Core problem or challenge driving the need for a solution", color: "text-red-400" },
  { key: "impact", label: "Impact", description: "Business impact of not solving the problem (cost, time, risk)", color: "text-amber-400" },
  { key: "criticalEvent", label: "Critical Event", description: "Time-bound event creating urgency to act now", color: "text-purple-400" },
  { key: "decision", label: "Decision", description: "Decision-making process, stakeholders, and timeline", color: "text-emerald-400" },
];

function SpicedTab({ spiced, meetingId, updateMutation, isGenerating, onGenerate }: {
  spiced: Record<string, unknown>; meetingId: number;
  updateMutation: ReturnType<typeof trpc.spiced.update.useMutation>;
  isGenerating: boolean; onGenerate: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Auto-filled from transcript. Click any field to edit.</p>
        <Button variant="outline" size="sm" onClick={onGenerate} disabled={isGenerating} className="text-xs gap-1">
          {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
          Regenerate
        </Button>
      </div>
      {SPICED_FIELDS.map((field) => (
        <MethodologyField
          key={field.key}
          fieldKey={field.key}
          label={field.label}
          description={field.description}
          value={spiced[field.key] as string | null}
          confidence={spiced[`${field.key}Confidence`] as number | null}
          isAiGenerated={spiced[`${field.key}AiGenerated`] as boolean}
          color={field.color}
          onSave={(val) => updateMutation.mutate({ meetingId, data: { [field.key]: val } })}
        />
      ))}
    </div>
  );
}

// ─── MEDDPICC Tab ─────────────────────────────────────────────────────────────
const MEDDPICC_FIELDS = [
  { key: "metrics", label: "Metrics", description: "Quantifiable success metrics the prospect cares about", color: "text-blue-400" },
  { key: "economicBuyer", label: "Economic Buyer", description: "Person with budget authority and final sign-off", color: "text-emerald-400" },
  { key: "decisionCriteria", label: "Decision Criteria", description: "Technical and business criteria for vendor selection", color: "text-amber-400" },
  { key: "decisionProcess", label: "Decision Process", description: "Steps, stakeholders, and timeline for the buying decision", color: "text-purple-400" },
  { key: "paperProcess", label: "Paper Process", description: "Legal, procurement, and contract approval process", color: "text-pink-400" },
  { key: "identifyPain", label: "Identify Pain", description: "Confirmed business pain with quantified impact", color: "text-red-400" },
  { key: "champion", label: "Champion", description: "Internal advocate who will sell on your behalf", color: "text-cyan-400" },
  { key: "competition", label: "Competition", description: "Competing vendors, internal solutions, or status quo", color: "text-orange-400" },
];

function MeddpiccTab({ meddpicc, meetingId, updateMutation, isGenerating, onGenerate }: {
  meddpicc: Record<string, unknown>; meetingId: number;
  updateMutation: ReturnType<typeof trpc.meddpicc.update.useMutation>;
  isGenerating: boolean; onGenerate: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Auto-filled from transcript. Click any field to edit.</p>
        <Button variant="outline" size="sm" onClick={onGenerate} disabled={isGenerating} className="text-xs gap-1">
          {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
          Regenerate
        </Button>
      </div>
      {MEDDPICC_FIELDS.map((field) => (
        <MethodologyField
          key={field.key}
          fieldKey={field.key}
          label={field.label}
          description={field.description}
          value={meddpicc[field.key] as string | null}
          confidence={meddpicc[`${field.key}Confidence`] as number | null}
          isAiGenerated={meddpicc[`${field.key}AiGenerated`] as boolean}
          color={field.color}
          onSave={(val) => updateMutation.mutate({ meetingId, data: { [field.key]: val } })}
        />
      ))}
    </div>
  );
}

// ─── Methodology Field ────────────────────────────────────────────────────────
function MethodologyField({ fieldKey, label, description, value, confidence, isAiGenerated, color, onSave }: {
  fieldKey: string; label: string; description: string;
  value: string | null; confidence: number | null; isAiGenerated: boolean;
  color: string; onSave: (val: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [expanded, setExpanded] = useState(false);

  const handleSave = () => {
    onSave(draft);
    setEditing(false);
  };

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-bold uppercase tracking-wider ${color}`}>{label}</span>
              {isAiGenerated && <span className="text-[9px] px-1.5 py-0 rounded bg-primary/10 text-primary border border-primary/20">AI</span>}
              {confidence !== null && (
                <span className="text-[9px] text-muted-foreground/60">{Math.round(confidence * 100)}% confidence</span>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground/60 mb-2">{description}</p>
            {editing ? (
              <div className="space-y-2">
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className="text-sm min-h-[80px] bg-input border-border"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSave} className="text-xs h-7"><Save className="w-3 h-3 mr-1" />Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setDraft(value ?? ""); }} className="text-xs h-7"><X className="w-3 h-3 mr-1" />Cancel</Button>
                </div>
              </div>
            ) : (
              <div>
                {value ? (
                  <div>
                    <p className={`text-sm text-foreground ${!expanded && value.length > 200 ? "line-clamp-3" : ""}`}>{value}</p>
                    {value.length > 200 && (
                      <button onClick={() => setExpanded(!expanded)} className="text-xs text-primary mt-1 flex items-center gap-0.5">
                        {expanded ? <><ChevronUp className="w-3 h-3" />Show less</> : <><ChevronDown className="w-3 h-3" />Show more</>}
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground/40 italic">Not identified — click to add manually</p>
                )}
              </div>
            )}
          </div>
          {!editing && (
            <Button variant="ghost" size="sm" onClick={() => { setEditing(true); setDraft(value ?? ""); }} className="h-7 w-7 p-0 shrink-0">
              <Edit3 className="w-3 h-3" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Coaching Tab ─────────────────────────────────────────────────────────────
function CoachingTab({ coaching }: { coaching: PitchCoaching }) {
  return (
    <div className="space-y-4">
      {/* Scores */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <ScoreCard label="Overall Score" value={`${coaching.overallScore ?? 0}/100`} color="text-primary" />
        <ScoreCard label="Discovery" value={`${coaching.discoveryScore ?? 0}/100`} color="text-blue-400" />
        <ScoreCard label="Objection Handling" value={`${coaching.objectionScore ?? 0}/100`} color="text-amber-400" />
        <ScoreCard label="MEDDPICC Coverage" value={`${Math.round((coaching.meddpiccCoverage ?? 0) * 100)}%`} color="text-emerald-400" />
      </div>

      {/* Strengths */}
      {(coaching.strengths as string[] ?? []).length > 0 && (
        <Card className="bg-card border-border border-emerald-500/20">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-emerald-400">What You Did Well</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {(coaching.strengths as string[]).map((s, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-emerald-400 mt-0.5">✓</span>{s}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Improvements */}
      {(coaching.improvements as string[] ?? []).length > 0 && (
        <Card className="bg-card border-border border-amber-500/20">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-amber-400">Areas to Improve</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {(coaching.improvements as string[]).map((s, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-amber-400 mt-0.5">→</span>{s}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Moment-by-moment coaching */}
      {(coaching.moments ?? []).length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Moment-by-Moment Coaching</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {(coaching.moments ?? []).map((m, i) => (
              <div key={i} className="space-y-2 pb-4 border-b border-border last:border-0 last:pb-0">
                <div className="rounded bg-muted/30 border-l-2 border-red-400 px-3 py-2">
                  <p className="text-xs text-muted-foreground/60 mb-0.5">What was said:</p>
                  <p className="text-xs text-foreground italic">"{m.whatWasSaid}"</p>
                </div>
                <div className="rounded bg-emerald-500/5 border-l-2 border-emerald-400 px-3 py-2">
                  <p className="text-xs text-muted-foreground/60 mb-0.5">Better alternative:</p>
                  <p className="text-xs text-foreground">"{m.whatShouldHaveBeenSaid}"</p>
                </div>
                {m.why && (
                  <p className="text-xs text-muted-foreground/70 pl-3">
                    <span className="text-primary font-medium">Why: </span>{m.why}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Action Items Tab ─────────────────────────────────────────────────────────
function ActionItemsTab({ meetingId, items, updateMutation }: {
  meetingId: number;
  items: ActionItem[];
  updateMutation: ReturnType<typeof trpc.actionItems.update.useMutation>;
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<CheckSquare className="w-8 h-8 text-muted-foreground/40" />}
        title="No action items yet"
        description="Generate AI analysis to auto-extract action items from the transcript."
      />
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">{items.filter(a => a.status !== "completed").length} open · {items.filter(a => a.status === "completed").length} completed</p>
      {items.map((item) => (
        <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card hover:border-border/80 transition-colors">
          <button
            onClick={() => updateMutation.mutate({ id: item.id, data: { status: item.status === "completed" ? "open" : "completed" } })}
            className={`w-4 h-4 rounded border mt-0.5 shrink-0 flex items-center justify-center transition-colors ${item.status === "completed" ? "bg-emerald-500 border-emerald-500" : "border-border hover:border-primary"}`}
          >
            {item.status === "completed" && (
              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium ${item.status === "completed" ? "line-through text-muted-foreground" : "text-foreground"}`}>{item.title}</p>
            {item.description && <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>}
            <div className="flex items-center gap-2 mt-1.5">
              <span className={`text-[10px] px-1.5 py-0 rounded-full border font-medium ${
                item.priority === "urgent" ? "border-red-500/30 text-red-400" :
                item.priority === "high" ? "border-amber-500/30 text-amber-400" :
                item.priority === "medium" ? "border-blue-500/30 text-blue-400" :
                "border-border text-muted-foreground"
              }`}>{item.priority}</span>
              {item.dueDate && (
                <span className={`text-[10px] ${tsToDate(item.dueDate) < new Date() && item.status !== "completed" ? "text-red-400" : "text-muted-foreground"}`}>
                  Due {format(tsToDate(item.dueDate), "MMM d")}
                </span>
              )}
              {item.isAiGenerated && <span className="text-[9px] px-1.5 py-0 rounded bg-primary/10 text-primary border border-primary/20">AI</span>}
            </div>
          </div>
          <select
            value={item.status}
            onChange={(e) => updateMutation.mutate({ id: item.id, data: { status: e.target.value as ActionItem["status"] } })}
            className="text-[10px] bg-input border border-border rounded px-1.5 py-1 text-foreground focus:outline-none shrink-0"
          >
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Done</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      ))}
    </div>
  );
}
