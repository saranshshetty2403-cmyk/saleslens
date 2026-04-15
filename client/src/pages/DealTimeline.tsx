// @ts-nocheck
import { tsToDate } from "@/lib/dateUtils";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GitBranch, Video, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { useLocation } from "wouter";
import { format, formatDistanceToNow } from "date-fns";
import { useState } from "react";

const STAGE_ORDER = [
  "Prospecting",
  "Discovery",
  "Demo / Evaluation",
  "Proposal",
  "Negotiation",
  "Closed Won",
  "Closed Lost",
];

const STAGE_COLORS: Record<string, string> = {
  "Prospecting": "bg-zinc-500/20 text-zinc-300 border-zinc-500/30",
  "Discovery": "bg-blue-500/20 text-blue-300 border-blue-500/30",
  "Demo / Evaluation": "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
  "Proposal": "bg-purple-500/20 text-purple-300 border-purple-500/30",
  "Negotiation": "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  "Closed Won": "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  "Closed Lost": "bg-red-500/20 text-red-300 border-red-500/30",
};

export default function DealTimeline() {
  const { data: meetings } = trpc.meetings.list.useQuery({ limit: 100, offset: 0 });

  type Meeting = NonNullable<typeof meetings>[number];
  const byAccount = (meetings || []).reduce<Record<string, Meeting[]>>((acc, meeting) => {
    const key = meeting.accountName || "Unassigned";
    if (!acc[key]) acc[key] = [];
    acc[key]!.push(meeting);
    return acc;
  }, {});

  const accounts = Object.entries(byAccount).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <GitBranch className="w-5 h-5 text-primary" />
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Deal Timeline</h1>
        </div>
        <p className="text-sm text-muted-foreground">Track deal progression across accounts and meetings</p>
      </div>

      {/* Stage legend */}
      <div className="flex items-center gap-2 flex-wrap">
        {STAGE_ORDER.map((stage) => (
          <span key={stage} className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${STAGE_COLORS[stage]}`}>
            {stage}
          </span>
        ))}
      </div>

      {accounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <GitBranch className="w-10 h-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-foreground">No deals to track yet</p>
          <p className="text-xs text-muted-foreground mt-1">Create meetings with account names to see the deal timeline</p>
        </div>
      ) : (
        <div className="space-y-6">
          {accounts.map(([accountName, accountMeetings]) => (
            <div key={accountName}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <h2 className="text-sm font-semibold text-foreground">{accountName}</h2>
                <span className="text-xs text-muted-foreground">
                  ({accountMeetings?.length} meeting{accountMeetings?.length !== 1 ? "s" : ""})
                </span>
              </div>

              {/* Timeline */}
              <div className="relative ml-4">
                <div className="absolute left-3 top-0 bottom-0 w-px bg-border" />
                <div className="space-y-3">
                  {(accountMeetings || [])
                    .sort((a, b) => tsToDate(a.createdAt).getTime() - tsToDate(b.createdAt).getTime())
                    .map((meeting) => (
                      <TimelineMeetingRow key={meeting.id} meeting={meeting} />
                    ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TimelineMeetingRow({ meeting }) {
  const [expanded, setExpanded] = useState(false);
  const [, navigate] = useLocation();
  const { data: analysis } = trpc.analyze.getByMeeting.useQuery({ meetingId: meeting.id });
  const { data: note } = trpc.notes.get.useQuery({ meetingId: meeting.id });

  return (
    <div className="relative flex items-start gap-4 pl-8">
      {/* Dot */}
      <div
        className="absolute left-0 top-3 w-7 h-7 rounded-full bg-card border-2 border-border hover:border-primary transition-colors flex items-center justify-center shrink-0 cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
      >
        <Video className="w-3 h-3 text-muted-foreground" />
      </div>

      <Card className="flex-1 bg-card border-border transition-all overflow-hidden">
        {/* Row header */}
        <CardContent
          className="p-3 cursor-pointer hover:bg-accent/10 transition-colors"
          onClick={() => setExpanded((v) => !v)}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{meeting.title}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-[10px] text-muted-foreground">
                  {format(tsToDate(meeting.createdAt), "MMM d, yyyy")}
                </span>
                {meeting.contactName && (
                  <span className="text-[10px] text-muted-foreground">· {meeting.contactName}</span>
                )}
                <span className={`text-[10px] px-1.5 py-0 rounded-full border font-medium platform-${meeting.platform}`}>
                  {meeting.platform}
                </span>
                {analysis && (
                  <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-400/30">Analyzed</Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {meeting.dealStage && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${STAGE_COLORS[meeting.dealStage] || "bg-muted text-muted-foreground border-border"}`}>
                  {meeting.dealStage}
                </span>
              )}
              {expanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
            </div>
          </div>
        </CardContent>

        {/* Expanded detail */}
        {expanded && (
          <div className="border-t border-border px-3 pb-3 pt-3 space-y-3">
            {/* Analysis summary */}
            {analysis?.summary && (
              <div className="rounded-lg border border-border bg-muted/20 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">AI Summary</p>
                <p className="text-xs text-foreground leading-relaxed">{analysis.summary}</p>
              </div>
            )}

            {/* Deal score + sentiment */}
            {analysis && (
              <div className="flex flex-wrap gap-2">
                {analysis.dealScore != null && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
                    <span className="text-[10px] text-muted-foreground">Deal Score</span>
                    <span className="text-sm font-bold text-primary">{analysis.dealScore}<span className="text-[10px] font-normal text-muted-foreground">/100</span></span>
                  </div>
                )}
                {analysis.sentimentScore != null && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-card border border-border">
                    <span className="text-[10px] text-muted-foreground">Sentiment</span>
                    <span className={`text-xs font-semibold ${analysis.sentimentScore >= 0.6 ? 'text-emerald-400' : analysis.sentimentScore >= 0.4 ? 'text-amber-400' : 'text-red-400'}`}>
                      {analysis.sentimentScore >= 0.6 ? 'Positive' : analysis.sentimentScore >= 0.4 ? 'Neutral' : 'Negative'}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Notes preview */}
            {note?.content && (
              <div className="rounded-lg border border-border bg-muted/10 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Notes</p>
                <p className="text-xs text-foreground leading-relaxed line-clamp-3">{note.content}</p>
              </div>
            )}

            {!analysis && !note?.content && (
              <p className="text-xs text-muted-foreground italic text-center py-2">No analysis or notes yet for this meeting.</p>
            )}

            <div className="flex justify-end">
              <Button size="sm" variant="ghost" className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                onClick={(e) => { e.stopPropagation(); navigate(`/meetings/${meeting.id}`); }}>
                <ExternalLink className="w-3 h-3" /> Open full meeting
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
