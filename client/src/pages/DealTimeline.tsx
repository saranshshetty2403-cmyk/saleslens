import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { GitBranch, Video } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

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

  // Group meetings by account
  const byAccount = (meetings || []).reduce<Record<string, typeof meetings>>((acc, meeting) => {
    const key = meeting.accountName || "Unassigned";
    if (!acc[key]) acc[key] = [];
    acc[key]!.push(meeting);
    return acc;
  }, {});

  const accounts = Object.entries(byAccount).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Deal Timeline</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Track deal progression across accounts and meetings
        </p>
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
                <span className="text-xs text-muted-foreground">({accountMeetings?.length} meeting{accountMeetings?.length !== 1 ? "s" : ""})</span>
              </div>

              {/* Timeline */}
              <div className="relative ml-4">
                {/* Vertical line */}
                <div className="absolute left-3 top-0 bottom-0 w-px bg-border" />

                <div className="space-y-3">
                  {(accountMeetings || [])
                    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                    .map((meeting, idx) => (
                      <Link key={meeting.id} href={`/meetings/${meeting.id}`}>
                        <div className="relative flex items-start gap-4 pl-8 group">
                          {/* Dot */}
                          <div className="absolute left-0 top-3 w-7 h-7 rounded-full bg-card border-2 border-border group-hover:border-primary transition-colors flex items-center justify-center shrink-0">
                            <Video className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>

                          <Card className="flex-1 bg-card border-border hover:border-primary/30 hover:bg-accent/10 transition-all cursor-pointer">
                            <CardContent className="p-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-foreground truncate">{meeting.title}</p>
                                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    <span className="text-[10px] text-muted-foreground">
                                      {format(new Date(meeting.createdAt), "MMM d, yyyy")}
                                    </span>
                                    {meeting.contactName && (
                                      <span className="text-[10px] text-muted-foreground">· {meeting.contactName}</span>
                                    )}
                                    <span className={`text-[10px] px-1.5 py-0 rounded-full border font-medium platform-${meeting.platform}`}>
                                      {meeting.platform}
                                    </span>
                                  </div>
                                </div>
                                {meeting.dealStage && (
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium shrink-0 ${STAGE_COLORS[meeting.dealStage] || "bg-muted text-muted-foreground border-border"}`}>
                                    {meeting.dealStage}
                                  </span>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </Link>
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
