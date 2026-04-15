// @ts-nocheck
import { tsToDate } from "@/lib/dateUtils";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { Mail, Sparkles, Copy, Loader2, CheckCircle, RefreshCw, Trash2, Info } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const EMAIL_TYPES = [
  { value: "follow_up", label: "Post-Call Follow-Up" },
  { value: "cold_outreach", label: "Cold Outreach" },
  { value: "proposal_follow_up", label: "Proposal Follow-Up" },
  { value: "objection_response", label: "Objection Response" },
  { value: "demo_follow_up", label: "Post-Demo Follow-Up" },
  { value: "check_in", label: "Check-In / Nudge" },
  { value: "custom", label: "Custom" },
];

export default function EmailGenerator() {
  const [additionalContext, setAdditionalContext] = useState("");
  const [emailType, setEmailType] = useState("follow_up");
  const [recipientName, setRecipientName] = useState("");
  const [recipientRole, setRecipientRole] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [generatedEmail, setGeneratedEmail] = useState("");
  const [copied, setCopied] = useState(false);
  const [selectedMeetingId, setSelectedMeetingId] = useState<number | null>(null);
  const [autoPopulated, setAutoPopulated] = useState(false);

  const { data: meetings } = trpc.meetings.list.useQuery({});
  const { data: savedEmails, refetch: refetchEmails } = trpc.emails.list.useQuery({});

  // Fetch selected meeting details to auto-populate fields
  const { data: selectedMeeting } = trpc.meetings.get.useQuery(
    { id: selectedMeetingId! },
    { enabled: !!selectedMeetingId }
  );
  const { data: spicedReport } = trpc.spiced.get.useQuery(
    { meetingId: selectedMeetingId! },
    { enabled: !!selectedMeetingId }
  );

  // Auto-populate form fields when a meeting is selected
  useEffect(() => {
    if (!selectedMeeting) {
      if (!selectedMeetingId) {
        // Cleared — reset auto-populated fields
        setRecipientName("");
        setRecipientRole("");
        setCompanyName("");
        setAdditionalContext("");
        setAutoPopulated(false);
      }
      return;
    }

    // Populate recipient info from meeting data
    if (selectedMeeting.contactName) setRecipientName(selectedMeeting.contactName);
    if (selectedMeeting.contactTitle) setRecipientRole(selectedMeeting.contactTitle);
    if (selectedMeeting.accountName) setCompanyName(selectedMeeting.accountName);

    // Build a context summary to show the user what was auto-detected
    const contextLines: string[] = [];
    if (selectedMeeting.dealStage) contextLines.push(`Deal Stage: ${selectedMeeting.dealStage}`);
    if (selectedMeeting.dealValue) contextLines.push(`Deal Value: ${selectedMeeting.dealValue}`);
    if (spicedReport?.pain) contextLines.push(`Pain: ${spicedReport.pain}`);
    if (spicedReport?.impact) contextLines.push(`Impact: ${spicedReport.impact}`);
    if (spicedReport?.criticalEvent) contextLines.push(`Critical Event: ${spicedReport.criticalEvent}`);
    if (spicedReport?.decision) contextLines.push(`Decision Process: ${spicedReport.decision}`);

    if (contextLines.length > 0) {
      setAdditionalContext(contextLines.join("\n"));
    }
    setAutoPopulated(true);
  }, [selectedMeeting, spicedReport, selectedMeetingId]);

  const generateMutation = trpc.emails.generate.useMutation({
    onSuccess: (data) => {
      setGeneratedEmail(data.body);
      refetchEmails();
      toast.success("Email generated");
    },
    onError: (err) => toast.error(err.message || "Generation failed"),
  });

  const deleteMutation = trpc.emails.delete.useMutation({
    onSuccess: () => {
      refetchEmails();
      toast.success("Email deleted");
    },
  });

  const handleGenerate = () => {
    if (!additionalContext.trim() && !selectedMeetingId) {
      toast.error("Provide context or select a meeting");
      return;
    }
    generateMutation.mutate({
      meetingId: selectedMeetingId ?? undefined,
      emailType: emailType as "follow_up" | "cold_outreach" | "objection_response" | "demo_follow_up" | "proposal_follow_up" | "custom",
      recipientName: recipientName || undefined,
      recipientTitle: recipientRole || undefined,
      recipientCompany: companyName || undefined,
      context: additionalContext || "Generate a professional sales email based on the meeting context.",
    });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedEmail);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMeetingChange = (v: string) => {
    setSelectedMeetingId(v === "none" ? null : parseInt(v));
    setAutoPopulated(false);
    if (v === "none") {
      setRecipientName("");
      setRecipientRole("");
      setCompanyName("");
      setAdditionalContext("");
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Mail className="w-5 h-5 text-primary" />
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Email Generator</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Select a meeting and generate a contextual, ready-to-send email — the AI uses the full transcript, pain points, and deal context automatically.
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
                  Based on Meeting
                  <span className="ml-1 text-primary text-[10px] font-normal">(auto-fills context)</span>
                </Label>
                <Select
                  value={selectedMeetingId?.toString() ?? "none"}
                  onValueChange={handleMeetingChange}
                >
                  <SelectTrigger className="bg-input border-border">
                    <SelectValue placeholder="Select a meeting..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No meeting — use context below</SelectItem>
                    {(meetings || []).map((m) => (
                      <SelectItem key={m.id} value={m.id.toString()}>
                        <span className="truncate">{m.title}</span>
                        {m.accountName && (
                          <span className="ml-1 text-muted-foreground text-[10px]">· {m.accountName}</span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Auto-populated indicator */}
                {autoPopulated && selectedMeeting && (
                  <div className="flex items-start gap-1.5 p-2 rounded bg-primary/5 border border-primary/20">
                    <Info className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                    <p className="text-[10px] text-primary leading-relaxed">
                      Context auto-filled from meeting data — transcript, pain points, SPICED report, and deal stage are all sent to the AI automatically. You can add extra instructions below.
                    </p>
                  </div>
                )}
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

              {/* Additional context / instructions */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  {selectedMeetingId ? "Additional Instructions" : "Context / Instructions"}
                </Label>
                <Textarea
                  placeholder={
                    selectedMeetingId
                      ? `Add any extra instructions...\n\nExamples:\n• "Emphasize the 2-week onboarding SLA"\n• "They mentioned budget concerns — address ROI"\n• "Keep it very short, 3 sentences max"`
                      : `Describe what the email should cover...\n\nExamples:\n• "Follow up on the demo we did today. They were interested in AI Screener but worried about integration time."\n• "Nudge them — it's been 5 days since the demo and no response."`
                  }
                  value={additionalContext}
                  onChange={(e) => setAdditionalContext(e.target.value)}
                  className="min-h-[120px] bg-input border-border text-sm resize-y"
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
            <p className="text-[11px] text-primary font-medium mb-1">Writing Style</p>
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
                Select a meeting on the left — context fills automatically
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
                    key={email.id}
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
