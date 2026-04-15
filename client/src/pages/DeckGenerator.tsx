// @ts-nocheck
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useState } from "react";
import {
  Presentation, Sparkles, Loader2, ChevronDown, ChevronUp,
  CheckCircle, AlertCircle, Package, Copy
} from "lucide-react";

const DECK_TYPES = [
  { value: "proposal", label: "Proposal Deck", desc: "Full proposal with pricing and ROI" },
  { value: "follow_up", label: "Follow-Up Deck", desc: "Post-call recap and next steps" },
  { value: "business_case", label: "Business Case", desc: "ROI and cost justification deck" },
  { value: "custom", label: "Custom Deck", desc: "Based on specific requirements" },
];

const SLIDE_TYPE_COLORS: Record<string, string> = {
  title: "bg-primary/20 text-primary border-primary/30",
  agenda: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  problem: "bg-red-500/20 text-red-400 border-red-500/30",
  solution: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  product_demo: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  case_study: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  roi: "bg-green-500/20 text-green-400 border-green-500/30",
  pricing: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  next_steps: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  custom: "bg-muted/50 text-muted-foreground border-border",
};

type SlideOutline = {
  slideNumber: number;
  title: string;
  type: string;
  keyPoints: string[];
  speakerNotes: string;
  dataNeeded: string;
  addressesRequest: string;
};

type DeckResult = {
  deckTitle: string;
  deckSubtitle: string;
  promisesMade: string[];
  clientRequests: string[];
  slides: SlideOutline[];
  recommendedProducts: string[];
  estimatedDeckLength: number;
};

export default function DeckGenerator() {
  const [transcript, setTranscript] = useState("");
  const [deckType, setDeckType] = useState("proposal");
  const [accountName, setAccountName] = useState("");
  const [contactName, setContactName] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");
  const [selectedMeetingId, setSelectedMeetingId] = useState<number | null>(null);
  const [result, setResult] = useState<DeckResult | null>(null);
  const [expandedSlide, setExpandedSlide] = useState<number | null>(null);

  const { data: meetings } = trpc.meetings.list.useQuery({});

  const generateMutation = trpc.decks.generate.useMutation({
    onSuccess: (data) => {
      setResult(data as DeckResult);
      toast.success(`Deck outline generated — ${(data as DeckResult).slides?.length || 0} slides`);
    },
    onError: (err) => toast.error(err.message || "Generation failed. Is Ollama running?"),
  });

  const handleGenerate = () => {
    const finalTranscript = transcript.trim();
    if (!finalTranscript) {
      toast.error("Please paste a transcript to generate the deck");
      return;
    }
    generateMutation.mutate({
      meetingId: selectedMeetingId ?? undefined,
      transcript: finalTranscript,
      deckType: deckType as "proposal" | "follow_up" | "business_case" | "custom",
      accountName: accountName || undefined,
      contactName: contactName || undefined,
      additionalContext: additionalContext || undefined,
    });
  };

  const copySlideContent = (slide: SlideOutline) => {
    const text = `Slide ${slide.slideNumber}: ${slide.title}\n\nKey Points:\n${slide.keyPoints.map(p => `• ${p}`).join("\n")}\n\nSpeaker Notes:\n${slide.speakerNotes}`;
    navigator.clipboard.writeText(text);
    toast.success("Slide content copied");
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Presentation className="w-5 h-5 text-primary" />
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Deck Generator</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Auto-generate a tailored sales deck from your call transcript — fulfills every promise made and every client request.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Input panel — 2 cols */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Deck Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Deck type */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Deck Type</Label>
                <div className="grid grid-cols-2 gap-2">
                  {DECK_TYPES.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setDeckType(t.value)}
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        deckType === t.value
                          ? "border-primary bg-primary/10"
                          : "border-border bg-card hover:border-primary/50"
                      }`}
                    >
                      <p className="text-xs font-semibold text-foreground">{t.label}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{t.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Meeting link */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Link to Meeting (optional)</Label>
                <Select
                  value={selectedMeetingId?.toString() ?? "none"}
                  onValueChange={(v) => setSelectedMeetingId(v === "none" ? null : parseInt(v))}
                >
                  <SelectTrigger className="bg-input border-border">
                    <SelectValue placeholder="Select meeting..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No meeting</SelectItem>
                    {(meetings || []).map((m) => (
                      <SelectItem key={m.id} value={m.id.toString()}>{m.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Account</Label>
                  <Input placeholder="Acme Corp" value={accountName} onChange={(e) => setAccountName(e.target.value)} className="bg-input border-border" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Contact</Label>
                  <Input placeholder="Sarah Chen" value={contactName} onChange={(e) => setContactName(e.target.value)} className="bg-input border-border" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Transcript *</Label>
                <Textarea
                  placeholder="Paste the sales call transcript here..."
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  className="min-h-[160px] bg-input border-border text-xs font-mono resize-y"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Additional Instructions (optional)</Label>
                <Textarea
                  placeholder="e.g. Include a slide on our integration with Greenhouse. Focus on engineering team ROI."
                  value={additionalContext}
                  onChange={(e) => setAdditionalContext(e.target.value)}
                  className="min-h-[80px] bg-input border-border text-xs resize-y"
                />
              </div>

              <Button onClick={handleGenerate} disabled={generateMutation.isPending || !transcript.trim()} className="w-full gap-2">
                {generateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {generateMutation.isPending ? "Generating Deck..." : "Generate Deck Outline"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Output panel — 3 cols */}
        <div className="lg:col-span-3 space-y-4">
          {result ? (
            <>
              {/* Deck header */}
              <Card className="bg-card border-border">
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-base font-bold text-foreground">{result.deckTitle}</h2>
                      <p className="text-sm text-muted-foreground mt-0.5">{result.deckSubtitle}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Presentation className="w-3 h-3" />{result.slides?.length || result.estimatedDeckLength || 0} slides</span>
                        <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-emerald-400" />{result.promisesMade?.length || 0} promises addressed</span>
                        <span className="flex items-center gap-1"><AlertCircle className="w-3 h-3 text-amber-400" />{result.clientRequests?.length || 0} client requests covered</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Promises & Requests */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {result.promisesMade?.length > 0 && (
                  <Card className="bg-card border-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5" />Promises Made by Rep
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1.5">
                      {result.promisesMade.map((p, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                          <p className="text-xs text-foreground">{p}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
                {result.clientRequests?.length > 0 && (
                  <Card className="bg-card border-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5" />Client Requests
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1.5">
                      {result.clientRequests.map((r, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                          <p className="text-xs text-foreground">{r}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Recommended products */}
              {result.recommendedProducts?.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Package className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="text-xs text-muted-foreground">Recommended products:</span>
                  {result.recommendedProducts.map((p) => (
                    <Badge key={p} variant="outline" className="text-[10px] border-primary/30 text-primary">{p}</Badge>
                  ))}
                </div>
              )}

              {/* Slide outline */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground">Slide Outline</h3>
                {(result.slides || []).map((slide) => (
                  <Card key={slide.slideNumber} className="bg-card border-border overflow-hidden">
                    <button
                      className="w-full p-3 flex items-center gap-3 text-left hover:bg-muted/20 transition-colors"
                      onClick={() => setExpandedSlide(expandedSlide === slide.slideNumber ? null : slide.slideNumber)}
                    >
                      <span className="text-xs font-mono text-muted-foreground w-5 shrink-0">{slide.slideNumber}</span>
                      <Badge className={`text-[10px] px-1.5 py-0 border shrink-0 ${SLIDE_TYPE_COLORS[slide.type ?? "custom"] || SLIDE_TYPE_COLORS.custom}`}>
                        {(slide.type ?? "custom").replace(/_/g, " ")}
                      </Badge>
                      <span className="text-sm font-medium text-foreground flex-1">{slide.title}</span>
                      {expandedSlide === slide.slideNumber ? (
                        <ChevronUp className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      )}
                    </button>
                    {expandedSlide === slide.slideNumber && (
                      <div className="px-3 pb-3 border-t border-border space-y-3 pt-3">
                        <div>
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Key Points</p>
                          <ul className="space-y-1">
                            {(slide.keyPoints ?? []).map((p, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                                <span className="text-primary mt-0.5">•</span>{p}
                              </li>
                            ))}
                          </ul>
                        </div>
                        {slide.speakerNotes && (
                          <div>
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Speaker Notes</p>
                            <p className="text-xs text-muted-foreground italic">{slide.speakerNotes}</p>
                          </div>
                        )}
                        {slide.dataNeeded && slide.dataNeeded !== "None" && (
                          <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20">
                            <p className="text-[10px] font-semibold text-amber-400 mb-0.5">Data Needed</p>
                            <p className="text-xs text-amber-300/80">{slide.dataNeeded}</p>
                          </div>
                        )}
                        {slide.addressesRequest && slide.addressesRequest !== "None" && (
                          <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20">
                            <p className="text-[10px] font-semibold text-emerald-400 mb-0.5">Addresses Client Request</p>
                            <p className="text-xs text-emerald-300/80">{slide.addressesRequest}</p>
                          </div>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copySlideContent(slide)}
                          className="h-6 px-2 text-[10px] gap-1 text-muted-foreground"
                        >
                          <Copy className="w-2.5 h-2.5" />Copy slide content
                        </Button>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-96 rounded-lg border border-dashed border-border text-center p-6">
              <Presentation className="w-12 h-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium text-foreground">No deck generated yet</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                Paste a transcript and click Generate. The AI will extract promises, client requests, and build a tailored slide outline.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
