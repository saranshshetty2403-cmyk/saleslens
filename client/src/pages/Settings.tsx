import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Shield,
  Cpu,
  Mic,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ExternalLink,
  Server,
  Lock,
  AlertTriangle,
  Info,
  ChevronRight,
} from "lucide-react";

export default function Settings() {
  const { data: settings, isLoading, refetch } = trpc.settings.get.useQuery();
  const { data: health, isLoading: healthLoading, refetch: refetchHealth } =
    trpc.settings.healthCheck.useQuery(undefined, {
      refetchInterval: 30_000,
      retry: false,
    });
  const updateSettings = trpc.settings.update.useMutation({
    onSuccess: () => {
      toast.success("Settings saved");
      refetch();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const [form, setForm] = useState({
    ollamaEndpoint: "http://localhost:11434",
    ollamaModel: "llama3.1:8b",
    whisperEndpoint: "http://localhost:8001",
    botName: "SalesLens",
  });

  useEffect(() => {
    if (settings) {
      setForm({
        ollamaEndpoint: settings.ollamaEndpoint || "http://localhost:11434",
        ollamaModel: settings.ollamaModel || "llama3.1:8b",
        whisperEndpoint: settings.whisperEndpoint || "http://localhost:8001",
        botName: settings.botName || "SalesLens",
      });
    }
  }, [settings]);

  const ollamaOk = health?.ollama?.status === "online";
  const whisperOk = health?.whisper?.status === "online";

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Configure your local AI stack. All data stays on your machine.
          </p>
        </div>

        {/* Privacy Banner */}
        <div className="flex items-start gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
          <Shield className="h-5 w-5 text-emerald-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-emerald-400">Privacy-First Architecture</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              SalesLens processes all client data locally. No audio, transcripts, or sales intelligence
              is ever sent to external servers. Your client conversations remain 100% confidential.
            </p>
          </div>
        </div>

        {/* AI Service Health */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Server className="h-4 w-4 text-primary" />
                Local AI Service Status
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetchHealth()}
                disabled={healthLoading}
                className="h-7 text-xs"
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${healthLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Ollama */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border">
              <div className="flex items-center gap-3">
                <Cpu className="h-4 w-4 text-blue-400" />
                <div>
                  <p className="text-sm font-medium">Ollama LLM</p>
                  <p className="text-xs text-muted-foreground">
                    {form.ollamaEndpoint}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {ollamaOk && (
                  <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-400">
                    {form.ollamaModel}
                  </Badge>
                )}
                {healthLoading ? (
                  <Badge variant="outline" className="text-xs">Checking...</Badge>
                ) : ollamaOk ? (
                  <div className="flex items-center gap-1 text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-xs font-medium">Running</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-red-400">
                    <XCircle className="h-4 w-4" />
                    <span className="text-xs font-medium">Offline</span>
                  </div>
                )}
              </div>
            </div>

            {/* Whisper */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border">
              <div className="flex items-center gap-3">
                <Mic className="h-4 w-4 text-purple-400" />
                <div>
                  <p className="text-sm font-medium">Whisper Transcription</p>
                  <p className="text-xs text-muted-foreground">
                    {(health?.whisper as any)?.model
                      ? `Model: ${(health?.whisper as any).model} on ${(health?.whisper as any).device}`
                      : form.whisperEndpoint}
                  </p>
                </div>
              </div>
              {healthLoading ? (
                <Badge variant="outline" className="text-xs">Checking...</Badge>
              ) : whisperOk ? (
                <div className="flex items-center gap-1 text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-xs font-medium">Running</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-red-400">
                  <XCircle className="h-4 w-4" />
                  <span className="text-xs font-medium">Offline</span>
                </div>
              )}
            </div>

            {/* Offline warning */}
            {!healthLoading && (!ollamaOk || !whisperOk) && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                <div className="text-xs text-amber-300/80 space-y-1">
                  {!ollamaOk && (
                    <p>
                      <strong>Ollama is not running.</strong> Start it with:{" "}
                      <code className="bg-muted px-1 rounded text-amber-300">ollama serve</code>
                    </p>
                  )}
                  {!whisperOk && (
                    <p>
                      <strong>Whisper service is not running.</strong> Start it with:{" "}
                      <code className="bg-muted px-1 rounded text-amber-300">
                        python whisper_service/whisper_service.py
                      </code>
                    </p>
                  )}
                  <p className="text-muted-foreground">
                    You can still paste transcripts manually without these services.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ollama Configuration */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Cpu className="h-4 w-4 text-blue-400" />
              Ollama LLM Configuration
            </CardTitle>
            <CardDescription className="text-xs">
              Ollama runs LLMs locally. Recommended: <strong>llama3.1:8b</strong> (Apple Silicon optimized).
              For IndiaAI GPU instances, point the endpoint to your remote server.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ollamaEndpoint" className="text-sm">Ollama Endpoint</Label>
              <Input
                id="ollamaEndpoint"
                value={form.ollamaEndpoint}
                onChange={(e) => setForm((f) => ({ ...f, ollamaEndpoint: e.target.value }))}
                placeholder="http://localhost:11434"
                className="bg-input border-border font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Local: <code className="bg-muted px-1 rounded">http://localhost:11434</code> · IndiaAI GPU:{" "}
                <code className="bg-muted px-1 rounded">http://your-server-ip:11434</code>
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ollamaModel" className="text-sm">Model</Label>
              <Input
                id="ollamaModel"
                value={form.ollamaModel}
                onChange={(e) => setForm((f) => ({ ...f, ollamaModel: e.target.value }))}
                placeholder="llama3.1:8b"
                className="bg-input border-border font-mono text-sm"
              />
              <div className="grid grid-cols-2 gap-2 mt-2">
                {[
                  { id: "llama3.1:8b", label: "Llama 3.1 8B", note: "Recommended · Apple Silicon" },
                  { id: "llama3.1:70b", label: "Llama 3.1 70B", note: "Best quality · GPU required" },
                  { id: "mistral:7b", label: "Mistral 7B", note: "Fast · Low memory" },
                  { id: "phi3:mini", label: "Phi-3 Mini", note: "Lightweight · 4GB RAM" },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, ollamaModel: m.id }))}
                    className={`text-left p-2 rounded border text-xs transition-colors ${
                      form.ollamaModel === m.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-muted/30 text-muted-foreground hover:border-border/80"
                    }`}
                  >
                    <p className="font-medium">{m.label}</p>
                    <p className="text-[10px] opacity-70">{m.note}</p>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Whisper Configuration */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Mic className="h-4 w-4 text-purple-400" />
              Whisper Transcription Configuration
            </CardTitle>
            <CardDescription className="text-xs">
              faster-whisper runs locally for private audio transcription. Start the service from{" "}
              <code className="bg-muted px-1 rounded">whisper_service/whisper_service.py</code>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="whisperEndpoint" className="text-sm">Whisper Service Endpoint</Label>
              <Input
                id="whisperEndpoint"
                value={form.whisperEndpoint}
                onChange={(e) => setForm((f) => ({ ...f, whisperEndpoint: e.target.value }))}
                placeholder="http://localhost:8001"
                className="bg-input border-border font-mono text-sm"
              />
            </div>
            <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
              <Info className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
              <div className="text-xs text-blue-300/80 space-y-1">
                <p>
                  <strong>Audio never leaves your machine.</strong> Files are transcribed locally by
                  faster-whisper (Whisper large-v3) and deleted after processing.
                </p>
                <p>Supported formats: MP3, WAV, M4A, WebM, OGG · Max size: 500MB</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save */}
        <div className="flex justify-end">
          <Button
            onClick={() => updateSettings.mutate(form)}
            disabled={updateSettings.isPending || isLoading}
            className="bg-primary text-primary-foreground"
          >
            {updateSettings.isPending ? "Saving..." : "Save Settings"}
          </Button>
        </div>

        <Separator />

        {/* Setup Guide */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Lock className="h-4 w-4 text-emerald-400" />
              Quick Setup Guide
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              {
                step: "1",
                title: "Install Ollama",
                desc: "Download from ollama.com — one-click installer for macOS",
                cmd: "brew install ollama",
                link: "https://ollama.com",
              },
              {
                step: "2",
                title: "Pull Llama 3.1 8B",
                desc: "Downloads ~5GB model optimized for Apple Silicon (~5 min)",
                cmd: "ollama pull llama3.1:8b",
              },
              {
                step: "3",
                title: "Start Ollama",
                desc: "Runs in background on port 11434",
                cmd: "ollama serve",
              },
              {
                step: "4",
                title: "Install Whisper dependencies",
                desc: "Python microservice for local audio transcription",
                cmd: "pip install -r whisper_service/requirements.txt",
              },
              {
                step: "5",
                title: "Start Whisper service",
                desc: "Downloads Whisper large-v3 model on first run (~3GB)",
                cmd: "python whisper_service/whisper_service.py",
              },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">
                  {item.step}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{item.title}</p>
                    {item.link && (
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                  <code className="text-xs bg-muted px-2 py-0.5 rounded mt-1 inline-block text-emerald-300">
                    {item.cmd}
                  </code>
                </div>
              </div>
            ))}

            <Separator className="my-1" />

            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <ChevronRight className="h-3 w-3 mt-0.5 shrink-0" />
              <span>
                For IndiaAI GPU access (free subsidized H100s), apply at{" "}
                <a
                  href="https://indiaai.gov.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  indiaai.gov.in
                </a>{" "}
                and set the Ollama endpoint above to your GPU instance IP.
              </span>
            </div>
          </CardContent>
        </Card>

        {/* About */}
        <Card className="bg-card border-border">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">SalesLens</p>
                <p className="text-xs text-muted-foreground">
                  AI Sales Intelligence · Privacy-First · Local LLM
                </p>
              </div>
              <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-xs">
                <Lock className="h-3 w-3 mr-1" />
                Air-Gapped AI
              </Badge>
            </div>
          </CardContent>
        </Card>
    </div>
  );
}
