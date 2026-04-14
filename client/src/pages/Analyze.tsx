import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useState, useRef } from "react";
import { useLocation } from "wouter";
import {
  Sparkles, Upload, FileText, Mic, Loader2, ChevronRight,
  Shield, Cpu, Zap, AlertCircle
} from "lucide-react";

const DEAL_STAGES = [
  "Prospecting", "Discovery", "Demo / Evaluation",
  "Proposal", "Negotiation", "Closed Won", "Closed Lost",
];

const PLATFORMS = [
  { value: "zoom", label: "Zoom" },
  { value: "google_meet", label: "Google Meet" },
  { value: "teams", label: "Microsoft Teams" },
  { value: "slack", label: "Slack Huddle" },
  { value: "webex", label: "Cisco Webex" },
  { value: "other", label: "Other" },
];

export default function Analyze() {
  const [, navigate] = useLocation();
  const [inputMode, setInputMode] = useState<"paste" | "upload">("paste");
  const [transcript, setTranscript] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [meta, setMeta] = useState({
    title: "",
    accountName: "",
    contactName: "",
    dealStage: "Discovery",
    platform: "zoom",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  const createMutation = trpc.meetings.create.useMutation();
  const [pendingMeetingId, setPendingMeetingId] = useState<number | null>(null);
  const analyzeMutation = trpc.analyze.full.useMutation({
    onSuccess: () => {
      toast.success("Analysis complete! All reports generated.");
      if (pendingMeetingId) navigate(`/meetings/${pendingMeetingId}`);
    },
    onError: (err) => {
      toast.error(err.message || "Analysis failed. Is Ollama running?");
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAudioFile(file);
    toast.info(`Audio file selected: ${file.name}. Transcription will run after analysis starts.`);
  };

  const handleAnalyze = async () => {
    const finalTranscript = transcript.trim();
    if (!finalTranscript && !audioFile) {
      toast.error("Please paste a transcript or upload an audio file");
      return;
    }
    if (!meta.title.trim()) {
      toast.error("Please enter a meeting title");
      return;
    }

    try {
      // Step 1: Create the meeting record
      const meeting = await createMutation.mutateAsync({
        title: meta.title,
        platform: meta.platform as "zoom" | "google_meet" | "teams" | "slack" | "webex" | "other",
        accountName: meta.accountName || undefined,
        contactName: meta.contactName || undefined,
        dealStage: meta.dealStage || undefined,
        transcriptText: finalTranscript || undefined,
      });

      if (!meeting?.id) {
        toast.error("Failed to create meeting record");
        return;
      }
      setPendingMeetingId(meeting.id);

      // Step 2: If audio file, transcribe first
      let transcriptToAnalyze = finalTranscript;
      if (audioFile && !finalTranscript) {
        setIsTranscribing(true);
        try {
          // Upload audio to get URL
          const formData = new FormData();
          formData.append("audio", audioFile);
          const uploadRes = await fetch("/api/upload-audio", {
            method: "POST",
            body: formData,
          });
          if (uploadRes.ok) {
            const { url } = await uploadRes.json() as { url: string };
            const transcribeRes = await fetch("/api/transcribe-local", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ audioUrl: url }),
            });
            if (transcribeRes.ok) {
              const { text } = await transcribeRes.json() as { text: string };
              transcriptToAnalyze = text;
            } else {
              toast.error("Transcription failed. Paste transcript manually.");
              setIsTranscribing(false);
              return;
            }
          }
        } catch {
          toast.error("Transcription service unavailable. Paste transcript manually.");
          setIsTranscribing(false);
          return;
        }
        setIsTranscribing(false);
      }

      if (!transcriptToAnalyze) {
        toast.error("No transcript available for analysis");
        return;
      }

      // Step 3: Run full AI analysis
      await analyzeMutation.mutateAsync({
        meetingId: meeting.id,
        transcript: transcriptToAnalyze,
      });

      utils.meetings.list.invalidate();
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast.error(error?.message || "Something went wrong");
    }
  };

  const isProcessing = createMutation.isPending || isTranscribing || analyzeMutation.isPending;

  const getStatusMessage = () => {
    if (createMutation.isPending) return "Creating meeting record...";
    if (isTranscribing) return "Transcribing audio locally (faster-whisper)...";
    if (analyzeMutation.isPending) return "Running AI analysis (Ollama — all local)...";
    return "";
  };

  return (
    <div className="p-4 sm:p-6 max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5 text-primary" />
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Analyze Call</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Paste your transcript or upload audio — get SPICED, MEDDPICC, pitch coaching, and more in seconds.
        </p>
        {/* Privacy badge */}
        <div className="flex items-center gap-1.5 mt-2 text-[11px] text-emerald-400 font-medium">
          <Shield className="w-3 h-3" />
          All processing is 100% local — no data leaves your machine
          <Cpu className="w-3 h-3 ml-1" />
          Powered by Ollama + faster-whisper
        </div>
      </div>

      {/* Input mode toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setInputMode("paste")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
            inputMode === "paste"
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card text-muted-foreground border-border hover:border-primary/50"
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Paste Transcript
        </button>
        <button
          onClick={() => setInputMode("upload")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
            inputMode === "upload"
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card text-muted-foreground border-border hover:border-primary/50"
          }`}
        >
          <Mic className="w-3.5 h-3.5" />
          Upload Audio
        </button>
      </div>

      {/* Transcript / Audio input */}
      <Card className="bg-card border-border">
        <CardContent className="pt-4">
          {inputMode === "paste" ? (
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">
                Sales Call Transcript
              </Label>
              <Textarea
                placeholder={`Paste your full sales call transcript here...\n\nExample format:\n[Rep]: Hi Sarah, thanks for joining today. Can you tell me about your current hiring process?\n[Prospect]: Sure, we're using a mix of HackerRank and manual interviews but it's taking forever...\n\nSpeaker labels are optional but improve analysis quality.`}
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                className="min-h-[280px] bg-input border-border text-sm font-mono leading-relaxed resize-y"
              />
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-muted-foreground">
                  {transcript.split(/\s+/).filter(Boolean).length} words · {transcript.length} characters
                </p>
                {transcript.length > 100 && (
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <Zap className="w-2.5 h-2.5" /> Ready to analyze
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <Label className="text-xs font-medium text-muted-foreground">
                Audio Recording
              </Label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  audioFile
                    ? "border-emerald-500/50 bg-emerald-500/5"
                    : "border-border hover:border-primary/50 hover:bg-primary/5"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".mp3,.wav,.m4a,.webm,.ogg,.mp4"
                  className="hidden"
                  onChange={handleFileChange}
                />
                {audioFile ? (
                  <div className="space-y-1">
                    <Mic className="w-8 h-8 text-emerald-400 mx-auto" />
                    <p className="text-sm font-medium text-emerald-400">{audioFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(audioFile.size / 1024 / 1024).toFixed(1)} MB · Click to change
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-8 h-8 text-muted-foreground/50 mx-auto" />
                    <p className="text-sm font-medium text-foreground">Drop audio file or click to browse</p>
                    <p className="text-xs text-muted-foreground">MP3, WAV, M4A, WebM, OGG · Max 16MB</p>
                  </div>
                )}
              </div>
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                <p className="text-[11px] text-amber-300/80">
                  Audio transcription requires the faster-whisper service running on localhost:8001.
                  See Settings → Local AI Setup for instructions. Alternatively, paste the transcript directly.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Meeting metadata */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-foreground">Meeting Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Meeting Title *</Label>
            <Input
              placeholder="e.g. Discovery Call — Acme Corp · 14 Apr 2026"
              value={meta.title}
              onChange={(e) => setMeta({ ...meta, title: e.target.value })}
              className="bg-input border-border"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Account Name</Label>
              <Input
                placeholder="e.g. Acme Corporation"
                value={meta.accountName}
                onChange={(e) => setMeta({ ...meta, accountName: e.target.value })}
                className="bg-input border-border"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Contact Name</Label>
              <Input
                placeholder="e.g. Sarah Chen, VP Engineering"
                value={meta.contactName}
                onChange={(e) => setMeta({ ...meta, contactName: e.target.value })}
                className="bg-input border-border"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Deal Stage</Label>
              <Select value={meta.dealStage} onValueChange={(v) => setMeta({ ...meta, dealStage: v })}>
                <SelectTrigger className="bg-input border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEAL_STAGES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Platform</Label>
              <Select value={meta.platform} onValueChange={(v) => setMeta({ ...meta, platform: v })}>
                <SelectTrigger className="bg-input border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* What you'll get */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: "AI Summary", desc: "Pain points, objections, buying signals" },
          { label: "SPICED Report", desc: "Auto-filled methodology report" },
          { label: "MEDDPICC Report", desc: "Full qualification scorecard" },
          { label: "Pitch Coach", desc: "What to say differently next time" },
        ].map((item) => (
          <div key={item.label} className="p-3 rounded-lg bg-card border border-border">
            <p className="text-xs font-semibold text-primary">{item.label}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{item.desc}</p>
          </div>
        ))}
      </div>

      {/* Processing status */}
      {isProcessing && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
          <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
          <div>
            <p className="text-sm font-medium text-primary">{getStatusMessage()}</p>
            <p className="text-xs text-muted-foreground mt-0.5">This may take 30–90 seconds depending on transcript length</p>
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="flex items-center gap-3 pb-6 sm:pb-2">
        <Button
          onClick={handleAnalyze}
          disabled={isProcessing || (!transcript.trim() && !audioFile) || !meta.title.trim()}
          size="lg"
          className="gap-2 text-base px-6"
        >
          {isProcessing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          {isProcessing ? "Analyzing..." : "Analyze Call"}
          {!isProcessing && <ChevronRight className="w-4 h-4" />}
        </Button>
        <p className="text-xs text-muted-foreground">
          Generates SPICED, MEDDPICC, coaching & more
        </p>
      </div>
    </div>
  );
}
