import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { useState } from "react";
import { ArrowLeft, Bot, Calendar, Link2, Mic, Users, Video } from "lucide-react";
import { Link } from "wouter";

const PLATFORMS = [
  { value: "zoom", label: "Zoom", color: "text-blue-400" },
  { value: "google_meet", label: "Google Meet", color: "text-green-400" },
  { value: "teams", label: "Microsoft Teams", color: "text-purple-400" },
  { value: "slack", label: "Slack Huddle", color: "text-pink-400" },
  { value: "webex", label: "Cisco Webex", color: "text-orange-400" },
  { value: "other", label: "Other", color: "text-zinc-400" },
];

const DEAL_STAGES = [
  "Prospecting",
  "Discovery",
  "Demo / Evaluation",
  "Proposal",
  "Negotiation",
  "Closed Won",
  "Closed Lost",
];

export default function NewMeeting() {
  const [, navigate] = useLocation();
  const [form, setForm] = useState({
    title: "",
    platform: "zoom" as const,
    meetingUrl: "",
    accountName: "",
    contactName: "",
    dealStage: "",
    participants: "",
  });

  const createMutation = trpc.meetings.create.useMutation({
    onSuccess: (meeting) => {
      toast.success("Meeting created successfully");
      navigate(`/meetings/${meeting?.id}`);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create meeting");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Meeting title is required");
      return;
    }
    createMutation.mutate({
      title: form.title,
      platform: form.platform,
      meetingUrl: form.meetingUrl || undefined,
      accountName: form.accountName || undefined,
      contactName: form.contactName || undefined,
      dealStage: form.dealStage || undefined,
    });
  };

  return (
    <div className="p-4 sm:p-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/meetings">
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground -ml-2">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </Link>
      </div>

      <div className="mb-5 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-semibold text-foreground">New Meeting</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Schedule a meeting for SalesLens to join, record, and analyze
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Meeting Details */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Video className="w-4 h-4 text-muted-foreground" />
              Meeting Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-xs font-medium text-muted-foreground">
                Meeting Title *
              </Label>
              <Input
                id="title"
                placeholder="e.g. Discovery Call — Acme Corp"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="bg-input border-border"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Platform</Label>
                <Select
                  value={form.platform}
                  onValueChange={(v) => setForm({ ...form, platform: v as typeof form.platform })}
                >
                  <SelectTrigger className="bg-input border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        <span className={p.color}>{p.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Deal Stage</Label>
                <Select
                  value={form.dealStage}
                  onValueChange={(v) => setForm({ ...form, dealStage: v })}
                >
                  <SelectTrigger className="bg-input border-border">
                    <SelectValue placeholder="Select stage" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEAL_STAGES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="meetingUrl" className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Link2 className="w-3 h-3" />
                Meeting URL
              </Label>
              <Input
                id="meetingUrl"
                placeholder="https://zoom.us/j/... or meet.google.com/..."
                value={form.meetingUrl}
                onChange={(e) => setForm({ ...form, meetingUrl: e.target.value })}
                className="bg-input border-border font-mono text-xs"
              />
              <p className="text-[10px] text-muted-foreground">
                Paste the meeting link to enable SalesLens bot auto-join
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Account & Contact */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              Account & Contact
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="accountName" className="text-xs font-medium text-muted-foreground">
                  Account Name
                </Label>
                <Input
                  id="accountName"
                  placeholder="e.g. Acme Corporation"
                  value={form.accountName}
                  onChange={(e) => setForm({ ...form, accountName: e.target.value })}
                  className="bg-input border-border"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contactName" className="text-xs font-medium text-muted-foreground">
                  Contact Name
                </Label>
                <Input
                  id="contactName"
                  placeholder="e.g. Jane Smith"
                  value={form.contactName}
                  onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                  className="bg-input border-border"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="participants" className="text-xs font-medium text-muted-foreground">
                Participants (comma-separated)
              </Label>
              <Input
                id="participants"
                placeholder="jane@acme.com, john@acme.com"
                value={form.participants}
                onChange={(e) => setForm({ ...form, participants: e.target.value })}
                className="bg-input border-border"
              />
            </div>
          </CardContent>
        </Card>

        {/* Bot Info */}
        <div className="flex items-start gap-3 p-4 rounded-lg border border-primary/20 bg-primary/5">
          <Bot className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-medium text-primary">SalesLens AI Bot</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Once created, you can launch the AI bot to auto-join your meeting on Zoom, Google Meet, Teams, Slack, or Webex. The bot will record, transcribe, and generate SPICED & MEDDPICC reports automatically.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2 pb-6 sm:pb-2">
          <Button
            type="submit"
            disabled={createMutation.isPending}
            className="gap-2"
          >
            <Mic className="w-4 h-4" />
            {createMutation.isPending ? "Creating..." : "Create Meeting"}
          </Button>
          <Link href="/meetings">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
