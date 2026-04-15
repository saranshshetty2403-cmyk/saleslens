import { tsToDate } from "@/lib/dateUtils";
// @ts-nocheck
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useState } from "react";
import { Mail, Sparkles, Copy, Loader2, CheckCircle, RefreshCw, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const EMAIL_TYPES = [
  { value: "follow_up", label: "Post-Call Follow-Up" },
  { value: "outreach", label: "Cold Outreach" },
  { value: "proposal", label: "Proposal Send" },
  { value: "objection_response", label: "Objection Response" },
  { value: "check_in", label: "Check-In / Nudge" },
  { value: "meeting_request", label: "Meeting Request" },
  { value: "custom", label: "Custom" },
];

export default function EmailGenerator() {
  const [context, setContext] = useState("");
  const [emailType, setEmailType] = useState("follow_up");
  const [recipientName, setRecipientName] = useState("");
  const [recipientRole, setRecipientRole] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [generatedEmail, setGeneratedEmail] = useState("");
  const [copied, setCopied] = useState(false);
  const [selectedMeetingId, setSelectedMeetingId] = useState<number | null>(null);

  const { data: meetings } = trpc.meetings.list.useQuery({});
  const { data: savedEmails, refetch: refetchEmails } = trpc.emails.list.useQuery({});

  const generateMutation = trpc.emails.generate.useMutation({
    onSuccess: (data) => {
      setGeneratedEmail(data.body);
      refetchEmails();
      toast.success("Email generated");
    },
    onError: (err) => toast.error(err.message || "Generation failed. Is Ollama running?"),
  });

  const deleteMutation = trpc.emails.delete.useMutation({
    onSuccess: () => {
      refetchEmails();
      toast.success("Email deleted");
    },
  });

  const handleGenerate = () => {
    if (!context.trim() && !selectedMeetingId) {
      toast.error("Provide context or select a meeting");
      return;
    }
    generateMutation.mutate({
      meetingId: selectedMeetingId ?? undefined,
      emailType: emailType as "follow_up" | "cold_outreach" | "objection_response" | "demo_follow_up" | "proposal_follow_up" | "custom",
      recipientName: recipientName || undefined,
      recipientTitle: recipientRole || undefined,
      recipientCompany: companyName || undefined,
      context: context || "Generate a professional sales email based on the meeting context.",
    });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedEmail);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Mail className="w-5 h-5 text-primary" />
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Email Generator</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Generate professional, ready-to-send emails in your exact writing style — powered by local AI.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input panel */}
        <div className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Email Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Email type */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Email Type</Label>
                <Select value={emailType} onValueChange={setEmailType}>
                  <SelectTrigger className="bg-input border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EMAIL_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Link to meeting */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Based on Meeting <span className="text-muted-foreground/60">(optional)</span>
                </Label>
                <Select
                  value={selectedMeetingId?.toString() ?? "none"}
                  onValueChange={(v) => setSelectedMeetingId(v === "none" ? null : parseInt(v))}
                >
                  <SelectTrigger className="bg-input border-border">
                    <SelectValue placeholder="Select a meeting..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No meeting — use context below</SelectItem>
                    {(meetings || []).map((m) => (
                      <SelectItem key={m.id} value={m.id.toString()}>
                        {m.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Recipient */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Recipient Name</Label>
                  <Input
                    placeholder="Sarah Chen"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="bg-input border-border"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Their Role</Label>
                  <Input
                    placeholder="VP Engineering"
                    value={recipientRole}
                    onChange={(e) => setRecipientRole(e.target.value)}
                    className="bg-input border-border"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Company</Label>
                <Input
                  placeholder="Acme Corporation"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="bg-input border-border"
                />
              </div>

              {/* Additional context */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Additional Context / Instructions
                </Label>
                <Textarea
                  placeholder={`Describe what the email should cover...\n\nExamples:\n• "Follow up on the demo we did today. They were interested in AI Screener but worried about integration time. Mention the 2-week onboarding SLA."\n• "They asked for a proposal comparing us to HackerRank. Emphasize our 90% reduction in screening time."\n• "Nudge them — it's been 5 days since the demo and no response."`}
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  className="min-h-[140px] bg-input border-border text-sm resize-y"
                />
              </div>

              <Button
                onClick={handleGenerate}
                disabled={generateMutation.isPending}
                className="w-full gap-2"
              >
                {generateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                {generateMutation.isPending ? "Generating..." : "Generate Email"}
              </Button>
            </CardContent>
          </Card>

          {/* Style note */}
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-[11px] text-primary font-medium mb-1">Your Writing Style</p>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Clear, direct, professional but not stiff. No fluff or clichés. Short paragraphs.
              Clear ask at the end. Adapts tone to stakeholder level.
            </p>
          </div>
        </div>

        {/* Output panel */}
        <div className="space-y-4">
          {generatedEmail ? (
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">Generated Email</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleGenerate}
                      disabled={generateMutation.isPending}
                      className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Regenerate
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopy}
                      className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                    >
                      {copied ? (
                        <CheckCircle className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      {copied ? "Copied!" : "Copy"}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-input rounded-lg p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap text-foreground border border-border min-h-[300px]">
                  {generatedEmail}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 rounded-lg border border-dashed border-border text-center p-6">
              <Mail className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium text-foreground">No email generated yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Fill in the details on the left and click Generate
              </p>
            </div>
          )}

          {/* Saved emails */}
          {(savedEmails || []).length > 0 && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Recent Emails</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(savedEmails || []).slice(0, 5).map((email) => (
                  <div
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/20 border border-border hover:border-border/80 cursor-pointer group"
                    onClick={() => setGeneratedEmail(email.body ?? "")}
                  >
                    <Mail className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">
                        {email.subject || EMAIL_TYPES.find((t) => t.value === email.emailType)?.label || "Email"}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {email.recipientName && `To: ${email.recipientName} · `}
                        {formatDistanceToNow(tsToDate(email.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteMutation.mutate({ id: email.id });
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3 text-muted-foreground hover:text-red-400" />
                    </button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
