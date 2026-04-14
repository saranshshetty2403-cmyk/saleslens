import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Link, useParams } from "wouter";
import { useState, useRef } from "react";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  Bot,
  CheckSquare,
  Clock,
  FileText,
  Loader2,
  Mic,
  Play,
  TrendingUp,
  Upload,
  Video,
  Zap,
} from "lucide-react";
import { format } from "date-fns";
import { storagePut } from "@/lib/storage";


const PLATFORM_LABELS: Record<string, string> = {
  zoom: "Zoom",
  google_meet: "Google Meet",
  teams: "Teams",
  slack: "Slack",
  webex: "Webex",
  other: "Other",
};

const STATUS_LABELS: Record<string, string> = {
  scheduled: "Scheduled",
  joining: "Joining",
  recording: "Recording",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
};

export default function MeetingDetail() {
  const params = useParams<{ id: string }>();
  const meetingId = parseInt(params.id || "0");
  const utils = trpc.useUtils();

  const { data: meeting, isLoading } = trpc.meetings.get.useQuery({ id: meetingId });
  const { data: transcript } = trpc.transcripts.get.useQuery({ meetingId });
  const { data: analysis } = trpc.analysis.get.useQuery({ meetingId });
  const { data: actionItems } = trpc.actionItems.list.useQuery({ meetingId });
  const { data: spiced } = trpc.spiced.get.useQuery({ meetingId });
  const { data: meddpicc } = trpc.meddpicc.get.useQuery({ meetingId });

  const [manualTranscript, setManualTranscript] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const launchBotMutation = trpc.meetings.launchBot.useMutation({
    onSuccess: () => {
      toast.success("SalesLens bot is joining the meeting");
      utils.meetings.get.invalidate({ id: meetingId });
    },
    onError: (err) => toast.error(err.message),
  });

  const saveTranscriptMutation = trpc.transcripts.save.useMutation({
    onSuccess: () => {
      toast.success("Transcript saved");
      utils.transcripts.get.invalidate({ meetingId });
    },
    onError: (err) => toast.error(err.message),
  });

  const transcribeUrlMutation = trpc.transcripts.transcribeFromUrl.useMutation({
    onSuccess: () => {
      toast.success("Transcription complete");
      utils.transcripts.get.invalidate({ meetingId });
    },
    onError: (err) => toast.error(err.message),
  });

  const generateAnalysisMutation = trpc.analysis.generate.useMutation({
    onSuccess: () => {
      toast.success("AI analysis complete");
      utils.analysis.get.invalidate({ meetingId });
      utils.actionItems.list.invalidate({ meetingId });
      utils.meetings.get.invalidate({ id: meetingId });
    },
    onError: (err) => toast.error(err.message),
  });

  const generateSpicedMutation = trpc.spiced.generate.useMutation({
    onSuccess: () => {
      toast.success("SPICED report generated");
      utils.spiced.get.invalidate({ meetingId });
    },
    onError: (err) => toast.error(err.message),
  });

  const generateMeddpiccMutation = trpc.meddpicc.generate.useMutation({
    onSuccess: () => {
      toast.success("MEDDPICC report generated");
      utils.meddpicc.get.invalidate({ meetingId });
    },
    onError: (err) => toast.error(err.message),
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 16 * 1024 * 1024) {
      toast.error("File must be under 16MB");
      return;
    }
    setIsUploading(true);
    try {
      const audioUrl = await storagePut(file);
      await transcribeUrlMutation.mutateAsync({ meetingId, audioUrl });
    } catch (err: unknown) {
      toast.error((err as Error).message || "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Meeting not found</p>
        <Link href="/meetings">
          <Button variant="outline" size="sm" className="mt-3">Back to Meetings</Button>
        </Link>
      </div>
    );
  }

  const hasTranscript = !!transcript?.fullText;
  const isProcessing = generateAnalysisMutation.isPending || generateSpicedMutation.isPending || generateMeddpiccMutation.isPending;

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

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-foreground">{meeting.title}</h1>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
            {meeting.accountName && <span>{meeting.accountName}</span>}
            {meeting.contactName && <span>· {meeting.contactName}</span>}
            {meeting.dealStage && (
              <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground">
                {meeting.dealStage}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {format(new Date(meeting.createdAt), "MMM d, yyyy 'at' h:mm a")}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-[10px] px-2 py-1 rounded-full font-medium platform-${meeting.platform}`}>
            {PLATFORM_LABELS[meeting.platform]}
          </span>
          <span className={`text-[10px] px-2 py-1 rounded-full font-medium status-${meeting.status}`}>
            {STATUS_LABELS[meeting.status]}
          </span>
        </div>
      </div>

      {/* Bot Launch Bar */}
      {meeting.status === "scheduled" && (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-primary/20 bg-primary/5">
          <Bot className="w-5 h-5 text-primary shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-primary">Launch SalesLens Bot</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {meeting.meetingUrl
                ? "Click to send the AI bot to join and record your meeting"
                : "Add a meeting URL first to enable bot auto-join"}
            </p>
          </div>
          <Button
            size="sm"
            disabled={!meeting.meetingUrl || launchBotMutation.isPending}
            onClick={() => launchBotMutation.mutate({ meetingId, meetingUrl: meeting.meetingUrl! })}
            className="gap-2 shrink-0"
          >
            {launchBotMutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            Launch Bot
          </Button>
        </div>
      )}

      {/* Main Tabs */}
      <Tabs defaultValue="transcript" className="space-y-4">
        <TabsList className="bg-card border border-border flex-wrap h-auto gap-0.5 p-1">
          <TabsTrigger value="transcript" className="gap-1 text-xs px-2 py-1.5">
            <FileText className="w-3.5 h-3.5" />
            Transcript
          </TabsTrigger>
          <TabsTrigger value="analysis" className="gap-1 text-xs px-2 py-1.5">
            <Activity className="w-3.5 h-3.5" />
            Analysis
            {analysis && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-0.5" />}
          </TabsTrigger>
          <TabsTrigger value="spiced" className="gap-1 text-xs px-2 py-1.5">
            <TrendingUp className="w-3.5 h-3.5" />
            SPICED
            {spiced && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 ml-0.5" />}
          </TabsTrigger>
          <TabsTrigger value="meddpicc" className="gap-1 text-xs px-2 py-1.5">
            <BarChart3 className="w-3.5 h-3.5" />
            MEDDPICC
            {meddpicc && <span className="w-1.5 h-1.5 rounded-full bg-purple-400 ml-0.5" />}
          </TabsTrigger>
          <TabsTrigger value="actions" className="gap-1 text-xs px-2 py-1.5">
            <CheckSquare className="w-3.5 h-3.5" />
            Actions
            {actionItems && actionItems.length > 0 && (
              <span className="ml-0.5 px-1 py-0 rounded bg-primary/20 text-primary text-[9px] font-medium">
                {actionItems.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Transcript Tab */}
        <TabsContent value="transcript" className="space-y-4">
          {!hasTranscript ? (
            <Card className="bg-card border-border">
              <CardContent className="p-6">
                <div className="flex flex-col items-center gap-4 text-center">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <Mic className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">No transcript yet</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Upload an audio file or paste a transcript manually
                    </p>
                  </div>

                  <div className="flex items-center gap-3 w-full max-w-sm">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-2"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading || transcribeUrlMutation.isPending}
                    >
                      {isUploading || transcribeUrlMutation.isPending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5" />
                      )}
                      Upload Audio
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="audio/*,video/mp4"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </div>

                  <div className="w-full max-w-lg space-y-2">
                    <p className="text-xs text-muted-foreground">Or paste transcript manually:</p>
                    <Textarea
                      placeholder="Paste your meeting transcript here..."
                      value={manualTranscript}
                      onChange={(e) => setManualTranscript(e.target.value)}
                      className="bg-input border-border min-h-32 text-xs font-mono"
                    />
                    <Button
                      size="sm"
                      disabled={!manualTranscript.trim() || saveTranscriptMutation.isPending}
                      onClick={() => saveTranscriptMutation.mutate({ meetingId, fullText: manualTranscript })}
                      className="gap-2"
                    >
                      {saveTranscriptMutation.isPending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <FileText className="w-3.5 h-3.5" />
                      )}
                      Save Transcript
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <FileText className="w-3.5 h-3.5" />
                  <span>{transcript.wordCount?.toLocaleString()} words</span>
                  {transcript.language && <span>· {transcript.language.toUpperCase()}</span>}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="gap-1.5 text-xs h-7"
                >
                  <Upload className="w-3 h-3" />
                  Re-upload
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*,video/mp4"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>

              {/* Segments */}
              {transcript.segments && Array.isArray(transcript.segments) && transcript.segments.length > 0 ? (
                <Card className="bg-card border-border">
                  <CardContent className="p-4 space-y-1 max-h-96 overflow-y-auto">
                    {(transcript.segments as Array<{ id: number; speaker: string; text: string; startTime?: number }>).map((seg, i) => (
                      <div key={i} className="transcript-segment">
                        <div className="flex items-start gap-3">
                          <span className="text-[10px] font-mono text-primary/70 shrink-0 mt-0.5 w-16">
                            {seg.startTime !== undefined
                              ? `${Math.floor(seg.startTime / 60)}:${String(Math.floor(seg.startTime % 60)).padStart(2, "0")}`
                              : `#${i + 1}`}
                          </span>
                          <div>
                            <span className="text-[10px] font-semibold text-muted-foreground mr-2">
                              {seg.speaker}
                            </span>
                            <span className="text-xs text-foreground">{seg.text}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-card border-border">
                  <CardContent className="p-4 max-h-96 overflow-y-auto">
                    <p className="text-xs text-foreground leading-relaxed font-mono whitespace-pre-wrap">
                      {transcript.fullText}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Generate All Button */}
          {hasTranscript && (
            <div className="flex items-center gap-3 p-4 rounded-lg border border-border bg-card">
              <Zap className="w-4 h-4 text-yellow-400 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Generate AI Intelligence</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Run AI analysis, SPICED report, MEDDPICC report, and extract action items
                </p>
              </div>
              <Button
                size="sm"
                disabled={isProcessing}
                onClick={async () => {
                  await generateAnalysisMutation.mutateAsync({ meetingId });
                  await generateSpicedMutation.mutateAsync({ meetingId });
                  await generateMeddpiccMutation.mutateAsync({ meetingId });
                }}
                className="gap-2 shrink-0"
              >
                {isProcessing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Zap className="w-3.5 h-3.5" />
                )}
                {isProcessing ? "Analyzing..." : "Analyze All"}
              </Button>
            </div>
          )}
        </TabsContent>

        {/* Analysis Tab */}
        <TabsContent value="analysis">
          {!analysis ? (
            <EmptyAnalysis
              icon={<Activity className="w-5 h-5 text-primary" />}
              title="No analysis yet"
              description="Generate AI analysis from the transcript"
              onGenerate={hasTranscript ? () => generateAnalysisMutation.mutate({ meetingId }) : undefined}
              isGenerating={generateAnalysisMutation.isPending}
              hasTranscript={hasTranscript}
            />
          ) : (
            <div className="space-y-4">
              {/* Summary */}
              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" />
                    Executive Summary
                    <SentimentBadge sentiment={analysis.sentiment} />
                    {analysis.dealScore !== null && analysis.dealScore !== undefined && (
                      <span className="ml-auto text-xs font-mono text-muted-foreground">
                        Deal Score: <span className="text-foreground font-semibold">{analysis.dealScore}/100</span>
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-foreground leading-relaxed">{analysis.summary}</p>
                </CardContent>
              </Card>

              {/* Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AnalysisSection
                  title="Pain Points"
                  color="red"
                  items={(analysis.painPoints as Array<{ text: string; confidence?: number }>) || []}
                />
                <AnalysisSection
                  title="Objections"
                  color="orange"
                  items={(analysis.objections as Array<{ text: string; confidence?: number }>) || []}
                />
                <AnalysisSection
                  title="Buying Signals"
                  color="emerald"
                  items={(analysis.buyingSignals as Array<{ text: string; confidence?: number }>) || []}
                />
                <AnalysisSection
                  title="Next Steps"
                  color="blue"
                  items={(analysis.nextSteps as Array<{ text: string; confidence?: number }>) || []}
                />
              </div>

              {/* Key Quotes */}
              {analysis.keyQuotes && (analysis.keyQuotes as Array<{ speaker: string; text: string; category: string }>).length > 0 && (
                <Card className="bg-card border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Key Quotes</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {(analysis.keyQuotes as Array<{ speaker: string; text: string; category: string }>).map((q, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="w-0.5 rounded-full bg-primary/40 shrink-0" />
                        <div>
                          <p className="text-xs text-foreground italic">"{q.text}"</p>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            — {q.speaker}
                            {q.category && (
                              <span className="ml-1.5 px-1.5 py-0 rounded bg-muted text-[9px]">
                                {q.category.replace("_", " ")}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => generateAnalysisMutation.mutate({ meetingId })}
                  disabled={generateAnalysisMutation.isPending}
                  className="gap-2 text-xs"
                >
                  {generateAnalysisMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                  Regenerate
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* SPICED Tab */}
        <TabsContent value="spiced">
          <SpicedTab
            meetingId={meetingId}
            spiced={spiced}
            hasTranscript={hasTranscript}
            isGenerating={generateSpicedMutation.isPending}
            onGenerate={() => generateSpicedMutation.mutate({ meetingId })}
          />
        </TabsContent>

        {/* MEDDPICC Tab */}
        <TabsContent value="meddpicc">
          <MeddpiccTab
            meetingId={meetingId}
            meddpicc={meddpicc}
            hasTranscript={hasTranscript}
            isGenerating={generateMeddpiccMutation.isPending}
            onGenerate={() => generateMeddpiccMutation.mutate({ meetingId })}
          />
        </TabsContent>

        {/* Actions Tab */}
        <TabsContent value="actions">
          <ActionItemsTab meetingId={meetingId} items={actionItems || []} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function EmptyAnalysis({
  icon, title, description, onGenerate, isGenerating, hasTranscript,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onGenerate?: () => void;
  isGenerating?: boolean;
  hasTranscript: boolean;
}) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          {icon}
        </div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
        {!hasTranscript && (
          <p className="text-xs text-yellow-400">Add a transcript first</p>
        )}
        {onGenerate && (
          <Button size="sm" onClick={onGenerate} disabled={isGenerating} className="gap-2 mt-2">
            {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
            {isGenerating ? "Generating..." : "Generate Now"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function AnalysisSection({
  title, color, items,
}: {
  title: string;
  color: string;
  items: Array<{ text: string; confidence?: number }>;
}) {
  const colorMap: Record<string, string> = {
    red: "text-red-400 bg-red-500/10 border-red-500/20",
    orange: "text-orange-400 bg-orange-500/10 border-orange-500/20",
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  };
  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className={`text-xs font-semibold ${colorMap[color]?.split(" ")[0]}`}>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 && (
          <p className="text-xs text-muted-foreground">None identified</p>
        )}
        {items.map((item, i) => (
          <div key={i} className={`p-2.5 rounded-md border text-xs ${colorMap[color]}`}>
            {item.text}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function SentimentBadge({ sentiment }: { sentiment: string | null | undefined }) {
  if (!sentiment) return null;
  const map: Record<string, string> = {
    positive: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    neutral: "text-zinc-400 bg-zinc-500/10 border-zinc-500/20",
    negative: "text-red-400 bg-red-500/10 border-red-500/20",
    mixed: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  };
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium capitalize ${map[sentiment] || ""}`}>
      {sentiment}
    </span>
  );
}

function ConfidenceBar({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined) return null;
  const pct = Math.round(value * 100);
  const color = pct >= 75 ? "bg-emerald-500" : pct >= 50 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="confidence-bar flex-1">
        <div className={`confidence-fill ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-muted-foreground w-8 text-right">{pct}%</span>
    </div>
  );
}

function SpicedTab({
  meetingId, spiced, hasTranscript, isGenerating, onGenerate,
}: {
  meetingId: number;
  spiced: Record<string, unknown> | null | undefined;
  hasTranscript: boolean;
  isGenerating: boolean;
  onGenerate: () => void;
}) {
  const utils = trpc.useUtils();
  const updateMutation = trpc.spiced.update.useMutation({
    onSuccess: () => {
      toast.success("SPICED report updated");
      utils.spiced.get.invalidate({ meetingId });
    },
  });

  const fields = [
    { key: "situation", label: "Situation", description: "Current state of the prospect's business, systems, processes, and context", color: "blue" },
    { key: "pain", label: "Pain", description: "Specific problems, frustrations, and root causes of their challenges", color: "red" },
    { key: "impact", label: "Impact", description: "Quantified business impact — financial cost, productivity loss, missed opportunities", color: "orange" },
    { key: "criticalEvent", label: "Critical Event", description: "Hard deadline or triggering event that creates urgency for a decision", color: "yellow" },
    { key: "decision", label: "Decision", description: "Decision-making process, stakeholders involved, evaluation criteria, timeline", color: "purple" },
  ];

  if (!spiced) {
    return (
      <EmptyAnalysis
        icon={<TrendingUp className="w-5 h-5 text-primary" />}
        title="No SPICED report yet"
        description="Generate a SPICED methodology report from the transcript"
        onGenerate={hasTranscript ? onGenerate : undefined}
        isGenerating={isGenerating}
        hasTranscript={hasTranscript}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">SPICED Report</span>
          {spiced.overallCompleteness !== null && spiced.overallCompleteness !== undefined && (
            <span className="text-xs text-muted-foreground">
              {Math.round((spiced.overallCompleteness as number) * 100)}% complete
            </span>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={onGenerate} disabled={isGenerating} className="gap-1.5 text-xs h-7">
          {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
          Regenerate
        </Button>
      </div>

      <div className="space-y-3">
        {fields.map((field) => (
          <SpicedField
            key={field.key}
            fieldKey={field.key}
            label={field.label}
            description={field.description}
            value={spiced[field.key] as string | null}
            confidence={spiced[`${field.key}Confidence`] as number | null}
            isAiGenerated={spiced[`${field.key}AiGenerated`] as boolean}
            color={field.color}
            onSave={(val) => updateMutation.mutate({ meetingId, [field.key]: val })}
          />
        ))}
      </div>
    </div>
  );
}

function SpicedField({
  fieldKey, label, description, value, confidence, isAiGenerated, color, onSave,
}: {
  fieldKey: string;
  label: string;
  description: string;
  value: string | null;
  confidence: number | null;
  isAiGenerated: boolean;
  color: string;
  onSave: (val: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || "");

  const colorMap: Record<string, string> = {
    blue: "text-blue-400 bg-blue-500/10 border-blue-500/30",
    red: "text-red-400 bg-red-500/10 border-red-500/30",
    orange: "text-orange-400 bg-orange-500/10 border-orange-500/30",
    yellow: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
    purple: "text-purple-400 bg-purple-500/10 border-purple-500/30",
  };

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold uppercase tracking-wider ${colorMap[color]?.split(" ")[0]}`}>
                {label}
              </span>
              {isAiGenerated && (
                <span className="text-[9px] px-1.5 py-0 rounded bg-primary/10 text-primary border border-primary/20">
                  AI
                </span>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">{description}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[10px] text-muted-foreground hover:text-foreground shrink-0"
            onClick={() => { setEditing(!editing); setDraft(value || ""); }}
          >
            {editing ? "Cancel" : "Edit"}
          </Button>
        </div>

        {confidence !== null && confidence !== undefined && (
          <div className="mb-2">
            <ConfidenceBar value={confidence} />
          </div>
        )}

        {editing ? (
          <div className="space-y-2">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="bg-input border-border text-xs min-h-20"
              placeholder={`Describe the ${label.toLowerCase()}...`}
            />
            <div className="flex gap-2">
              <Button size="sm" className="h-7 text-xs" onClick={() => { onSave(draft); setEditing(false); }}>
                Save
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <p className={`text-sm leading-relaxed ${value ? "text-foreground" : "text-muted-foreground italic"}`}>
            {value || `No ${label.toLowerCase()} data captured yet`}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function MeddpiccTab({
  meetingId, meddpicc, hasTranscript, isGenerating, onGenerate,
}: {
  meetingId: number;
  meddpicc: Record<string, unknown> | null | undefined;
  hasTranscript: boolean;
  isGenerating: boolean;
  onGenerate: () => void;
}) {
  const utils = trpc.useUtils();
  const updateMutation = trpc.meddpicc.update.useMutation({
    onSuccess: () => {
      toast.success("MEDDPICC report updated");
      utils.meddpicc.get.invalidate({ meetingId });
    },
  });

  const fields = [
    { key: "metrics", label: "Metrics", description: "Quantifiable KPIs, ROI, cost savings, productivity gains the prospect cares about", color: "blue" },
    { key: "economicBuyer", label: "Economic Buyer", description: "Person with final budget authority — name, title, priorities, concerns", color: "purple" },
    { key: "decisionCriteria", label: "Decision Criteria", description: "Technical, financial, operational standards used to evaluate solutions", color: "indigo" },
    { key: "decisionProcess", label: "Decision Process", description: "Steps, timeline, approval chain, stakeholders involved in the purchase", color: "cyan" },
    { key: "paperProcess", label: "Paper Process", description: "Legal, procurement, security reviews, contract requirements, expected timeline", color: "teal" },
    { key: "identifyPain", label: "Identify Pain", description: "Root cause business pain — operational, financial, or strategic challenges", color: "red" },
    { key: "champion", label: "Champion", description: "Internal advocate who will sell for you — name, motivation, influence level", color: "emerald" },
    { key: "competition", label: "Competition", description: "Known competitors being evaluated, incumbent solutions, competitive positioning", color: "orange" },
  ];

  if (!meddpicc) {
    return (
      <EmptyAnalysis
        icon={<BarChart3 className="w-5 h-5 text-primary" />}
        title="No MEDDPICC report yet"
        description="Generate a MEDDPICC methodology report from the transcript"
        onGenerate={hasTranscript ? onGenerate : undefined}
        isGenerating={isGenerating}
        hasTranscript={hasTranscript}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">MEDDPICC Report</span>
          {meddpicc.overallCompleteness !== null && meddpicc.overallCompleteness !== undefined && (
            <span className="text-xs text-muted-foreground">
              {Math.round((meddpicc.overallCompleteness as number) * 100)}% complete
            </span>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={onGenerate} disabled={isGenerating} className="gap-1.5 text-xs h-7">
          {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
          Regenerate
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {fields.map((field) => (
          <SpicedField
            key={field.key}
            fieldKey={field.key}
            label={field.label}
            description={field.description}
            value={meddpicc[field.key] as string | null}
            confidence={meddpicc[`${field.key}Confidence`] as number | null}
            isAiGenerated={meddpicc[`${field.key}AiGenerated`] as boolean}
            color={field.color}
            onSave={(val) => updateMutation.mutate({ meetingId, [field.key]: val })}
          />
        ))}
      </div>
    </div>
  );
}

function ActionItemsTab({
  meetingId, items,
}: {
  meetingId: number;
  items: Array<{
    id: number;
    title: string;
    description?: string | null;
    status: string;
    priority: string;
    dueDate?: Date | null;
    isAiGenerated?: boolean | null;
  }>;
}) {
  const utils = trpc.useUtils();
  const updateMutation = trpc.actionItems.update.useMutation({
    onSuccess: () => utils.actionItems.list.invalidate({ meetingId }),
  });
  const createMutation = trpc.actionItems.create.useMutation({
    onSuccess: () => utils.actionItems.list.invalidate({ meetingId }),
  });

  const [newTitle, setNewTitle] = useState("");

  const handleAddItem = () => {
    if (!newTitle.trim()) return;
    createMutation.mutate({ meetingId, title: newTitle });
    setNewTitle("");
  };

  return (
    <div className="space-y-3">
      {/* Add new */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Add action item..."
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
          className="flex-1 bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <Button size="sm" onClick={handleAddItem} disabled={!newTitle.trim() || createMutation.isPending}>
          Add
        </Button>
      </div>

      {items.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No action items yet. Generate AI analysis to auto-extract them.
        </div>
      )}

      {items.map((item) => (
        <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card hover:border-border/80 transition-colors">
          <button
            onClick={() =>
              updateMutation.mutate({
                id: item.id,
                status: item.status === "completed" ? "open" : "completed",
              })
            }
            className={`w-4 h-4 rounded border mt-0.5 shrink-0 flex items-center justify-center transition-colors ${
              item.status === "completed"
                ? "bg-emerald-500 border-emerald-500"
                : "border-border hover:border-primary"
            }`}
          >
            {item.status === "completed" && (
              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium ${item.status === "completed" ? "line-through text-muted-foreground" : "text-foreground"}`}>
              {item.title}
            </p>
            {item.description && (
              <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
            )}
            <div className="flex items-center gap-2 mt-1.5">
              <span className={`text-[10px] px-1.5 py-0 rounded-full border font-medium priority-${item.priority}`}>
                {item.priority}
              </span>
              {item.dueDate && (
                <span className={`text-[10px] ${new Date(item.dueDate) < new Date() && item.status !== "completed" ? "text-red-400" : "text-muted-foreground"}`}>
                  Due {format(new Date(item.dueDate), "MMM d")}
                </span>
              )}
              {item.isAiGenerated && (
                <span className="text-[9px] px-1.5 py-0 rounded bg-primary/10 text-primary border border-primary/20">AI</span>
              )}
            </div>
          </div>
          <select
            value={item.status}
            onChange={(e) => updateMutation.mutate({ id: item.id, status: e.target.value as "open" | "in_progress" | "completed" | "cancelled" })}
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


