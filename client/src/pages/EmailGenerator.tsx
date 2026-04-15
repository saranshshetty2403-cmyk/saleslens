// @ts-nocheck
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Mail,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Check,
  Brain,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Lightbulb,
} from "lucide-react";
import { toast } from "sonner";

const PROMPT_SUGGESTIONS = [
  "Follow up after yesterday's discovery call — summarize pain points and propose a next step",
  "Respond to their objection about pricing — emphasize ROI and offer a pilot",
  "Send a post-demo follow-up with key features we showed and a clear CTA",
  "Reach out cold to a VP of Engineering at a 500-person tech company about developer hiring challenges",
  "Nudge a stalled deal — we haven't heard back in 2 weeks, re-engage without being pushy",
  "Propose a business case email after they asked for ROI data",
];

export default function EmailGenerator() {
  const [prompt, setPrompt] = useState("");
  const [selectedMeetingId, setSelectedMeetingId] = useState<string>("none");
  const [generated, setGenerated] = useState<{ id: number; subject: string; body: string } | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [editedBody, setEditedBody] = useState("");
  const [copied, setCopied] = useState(false);
  const [showStyleProfile, setShowStyleProfile] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const { data: meetings = [] } = trpc.meetings.list.useQuery({ limit: 50 });
  const { data: styleProfile, refetch: refetchStyle } = trpc.emails.styleProfile.useQuery();
  const { data: emailHistory = [] } = trpc.emails.list.useQuery();

  const generateMutation = trpc.emails.generate.useMutation({
    onSuccess: (data) => {
      setGenerated(data);
      setEditedBody(data.body);
      setShowFeedback(false);
    },
    onError: (err) => {
      toast.error(err.message || "Generation failed");
    },
  });

  const acceptMutation = trpc.emails.accept.useMutation({
    onSuccess: () => {
      toast.success("Email accepted — writing style updated for future generations.");
      refetchStyle();
      setShowFeedback(false);
    },
  });

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    generateMutation.mutate({
      prompt: prompt.trim(),
      meetingId: selectedMeetingId && selectedMeetingId !== "none" ? parseInt(selectedMeetingId) : undefined,
    });
  };

  const handleAccept = () => {
    if (!generated) return;
    const finalText = editedBody.trim() !== generated.body.trim() ? editedBody : undefined;
    acceptMutation.mutate({ id: generated.id, finalText });
  };

  const handleCopy = () => {
    if (!generated) return;
    const text = `Subject: ${generated.subject}\n\n${editedBody}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const acceptedCount = emailHistory.filter((e: any) => e.accepted).length;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Mail className="h-6 w-6 text-primary" />
            Email Generator
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Describe what you want to say — AI writes the email for you.
          </p>
        </div>
        {styleProfile && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-xs"
            onClick={() => setShowStyleProfile(!showStyleProfile)}
          >
            <Brain className="h-3.5 w-3.5 text-primary" />
            Style Learned
            <Badge className="bg-primary/20 text-primary border-0 text-xs px-1.5">{acceptedCount}</Badge>
          </Button>
        )}
      </div>

      {/* Style Profile Panel */}
      {showStyleProfile && styleProfile && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" />
              Your Learned Writing Style
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1.5">
            <div><span className="text-muted-foreground">Tone:</span> <span className="font-medium">{styleProfile.tone}</span></div>
            <div><span className="text-muted-foreground">Length:</span> <span className="font-medium">{styleProfile.avgLength}</span></div>
            <div><span className="text-muted-foreground">Opening:</span> <span className="font-medium">{styleProfile.openingStyle}</span></div>
            <div><span className="text-muted-foreground">Closing:</span> <span className="font-medium">{styleProfile.closingStyle}</span></div>
            {styleProfile.preferredPhrases?.length > 0 && (
              <div><span className="text-muted-foreground">Preferred phrases:</span> <span className="font-medium">{styleProfile.preferredPhrases.join(", ")}</span></div>
            )}
            {styleProfile.avoidPhrases?.length > 0 && (
              <div><span className="text-muted-foreground">Avoid:</span> <span className="font-medium">{styleProfile.avoidPhrases.join(", ")}</span></div>
            )}
            {styleProfile.structureNotes && (
              <div><span className="text-muted-foreground">Structure:</span> <span className="font-medium">{styleProfile.structureNotes}</span></div>
            )}
            <div className="text-xs text-muted-foreground pt-1">
              Based on {styleProfile.samplesAnalyzed} accepted email{styleProfile.samplesAnalyzed !== 1 ? "s" : ""} · Last updated {new Date(styleProfile.learnedAt).toLocaleDateString()}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Input Section */}
      <Card>
        <CardContent className="pt-5 space-y-4">
          {/* Prompt */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">What do you want to say?</label>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs gap-1 h-7 text-muted-foreground"
                onClick={() => setShowSuggestions(!showSuggestions)}
              >
                <Lightbulb className="h-3 w-3" />
                Examples
                {showSuggestions ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </Button>
            </div>
            {showSuggestions && (
              <div className="mb-3 space-y-1.5">
                {PROMPT_SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    className="w-full text-left text-xs px-3 py-2 rounded-md border border-dashed hover:border-primary/50 hover:bg-primary/5 transition-colors text-muted-foreground"
                    onClick={() => { setPrompt(s); setShowSuggestions(false); }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            <Textarea
              placeholder="e.g. Follow up after yesterday's discovery call — they mentioned budget approval in Q2 and wanted to see a case study from the fintech space. Propose a next step."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Optional meeting context */}
          <div>
            <label className="text-sm font-medium mb-1.5 block text-muted-foreground">
              Attach meeting context <span className="text-xs">(optional — enriches the email with call data)</span>
            </label>
            <Select value={selectedMeetingId} onValueChange={setSelectedMeetingId}>
              <SelectTrigger>
                <SelectValue placeholder="No meeting selected" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No meeting selected</SelectItem>
                {meetings.map((m: any) => (
                  <SelectItem key={m.id} value={String(m.id)}>
                    {m.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={!prompt.trim() || generateMutation.isPending}
            className="w-full gap-2"
          >
            <Sparkles className={`h-4 w-4 ${generateMutation.isPending ? "animate-spin" : ""}`} />
            {generateMutation.isPending ? "Writing your email..." : "Generate Email"}
          </Button>
        </CardContent>
      </Card>

      {/* Generated Email */}
      {generated && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Generated Email
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={handleCopy}>
                  {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 h-8"
                  onClick={handleGenerate}
                  disabled={generateMutation.isPending}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Regenerate
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Subject */}
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">SUBJECT</div>
              <div className="text-sm font-semibold bg-muted/30 rounded-md px-3 py-2">
                {generated.subject}
              </div>
            </div>

            <Separator />

            {/* Body */}
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">BODY <span className="font-normal">(editable — your edits are saved when you accept)</span></div>
              <Textarea
                value={editedBody}
                onChange={(e) => setEditedBody(e.target.value)}
                rows={12}
                className="text-sm font-mono resize-none"
              />
            </div>

            {/* Feedback */}
            {!showFeedback ? (
              <div className="flex items-center gap-3 pt-1">
                <span className="text-sm text-muted-foreground">Was this email useful?</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 border-green-500/50 text-green-500 hover:bg-green-500/10 h-8"
                  onClick={() => setShowFeedback(true)}
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                  Yes, I'll use it
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 border-red-500/50 text-red-500 hover:bg-red-500/10 h-8"
                  onClick={handleGenerate}
                >
                  <ThumbsDown className="h-3.5 w-3.5" />
                  Regenerate
                </Button>
              </div>
            ) : (
              <div className="space-y-3 pt-1 border-t">
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Accept and learn from this email</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  If you edited the body above, those edits will be saved and used to learn your writing style for future generations.
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={handleAccept}
                    disabled={acceptMutation.isPending}
                    className="gap-2"
                    size="sm"
                  >
                    <Check className="h-3.5 w-3.5" />
                    {acceptMutation.isPending ? "Saving..." : "Accept and Save"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowFeedback(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Email History */}
      {emailHistory.length > 0 && !generated && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">Recent Emails</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {emailHistory.slice(0, 5).map((email: any) => (
                <div
                  key={email.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg border hover:border-primary/30 cursor-pointer transition-colors"
                  onClick={() => {
                    setGenerated({ id: email.id, subject: email.subject, body: email.body });
                    setEditedBody(email.body);
                    setPrompt(email.context || "");
                  }}
                >
                  <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{email.subject}</div>
                    <div className="text-xs text-muted-foreground truncate">{email.context}</div>
                  </div>
                  {email.accepted && (
                    <Badge className="bg-green-500/20 text-green-400 border-0 text-xs">Used</Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
