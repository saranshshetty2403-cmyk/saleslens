// @ts-nocheck
import { tsToDate } from "@/lib/dateUtils";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const SPICED_FIELDS = ["situation", "pain", "impact", "criticalEvent", "decision"] as const;
const LABELS: Record<string, string> = {
  situation: "S — Situation",
  pain: "P — Pain",
  impact: "I — Impact",
  criticalEvent: "C — Critical Event",
  decision: "D — Decision",
};
const COLORS: Record<string, string> = {
  situation: "text-blue-400",
  pain: "text-red-400",
  impact: "text-orange-400",
  criticalEvent: "text-yellow-400",
  decision: "text-purple-400",
};

export default function SpicedReports() {
  const { data: meetings } = trpc.meetings.list.useQuery({ limit: 100, offset: 0 });

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-foreground">SPICED Reports</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Situation · Pain · Impact · Critical Event · Decision
        </p>
      </div>

      <div className="p-4 rounded-lg border border-border bg-card/50 text-xs text-muted-foreground space-y-1">
        <p className="font-semibold text-foreground text-sm">About SPICED</p>
        <p>SPICED is a customer-centric sales methodology developed by Winning by Design. It focuses on understanding the customer's current situation, identifying their core pain, quantifying the business impact, pinpointing the critical event that creates urgency, and mapping the decision process.</p>
      </div>

      {!meetings || meetings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <TrendingUp className="w-10 h-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-foreground">No SPICED reports yet</p>
          <p className="text-xs text-muted-foreground mt-1">Create a meeting and generate a SPICED report from the transcript</p>
        </div>
      ) : (
        <div className="space-y-4">
          {meetings.map((meeting) => (
            <SpicedCard key={meeting.id} meeting={meeting} />
          ))}
        </div>
      )}
    </div>
  );
}

function SpicedCard({ meeting }: { meeting: { id: number; title: string; accountName?: string | null; createdAt: Date } }) {
  const { data: spiced } = trpc.spiced.get.useQuery({ meetingId: meeting.id });
  const [expanded, setExpanded] = useState(false);
  const [, navigate] = useLocation();

  const filledCount = spiced
    ? SPICED_FIELDS.filter((f) => !!(spiced as Record<string, unknown>)[f]).length
    : 0;
  const completeness = spiced ? Math.round((filledCount / 5) * 100) : 0;
  const cc = completeness >= 80 ? "text-emerald-400" : completeness >= 40 ? "text-amber-400" : "text-red-400";

  return (
    <Card className="bg-card border-border transition-all overflow-hidden">
      <CardHeader
        className="pb-3 cursor-pointer select-none hover:bg-accent/10 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <TrendingUp className="w-3.5 h-3.5 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{meeting.title}</p>
              {meeting.accountName && <p className="text-xs text-muted-foreground">{meeting.accountName}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {spiced ? (
              <>
                <span className={`text-xs font-semibold ${cc}`}>{filledCount}/5</span>
                <Badge variant="outline" className={`text-[10px] ${cc} border-current/30`}>{completeness}% complete</Badge>
              </>
            ) : (
              <Badge variant="outline" className="text-[10px] text-muted-foreground">Not generated</Badge>
            )}
            <span className="text-xs text-muted-foreground hidden sm:block">
              {formatDistanceToNow(tsToDate(meeting.createdAt), { addSuffix: true })}
            </span>
            {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </div>
        </div>
        {spiced && <Progress value={completeness} className="h-1 mt-2" />}
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 pb-4">
          {!spiced ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <p className="text-xs text-muted-foreground">No SPICED report generated yet for this meeting.</p>
              <Button size="sm" variant="outline" className="gap-1.5 text-xs"
                onClick={(e) => { e.stopPropagation(); navigate(`/meetings/${meeting.id}?tab=spiced`); }}>
                <ExternalLink className="w-3 h-3" /> Open meeting to generate
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {SPICED_FIELDS.map((field) => (
                  <div key={field} className={`rounded-lg border p-3 space-y-1.5 ${{
                    situation: 'bg-blue-400/10 border-blue-400/20',
                    pain: 'bg-red-400/10 border-red-400/20',
                    impact: 'bg-orange-400/10 border-orange-400/20',
                    criticalEvent: 'bg-yellow-400/10 border-yellow-400/20',
                    decision: 'bg-purple-400/10 border-purple-400/20',
                  }[field]}`}>
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${COLORS[field]}`}>{LABELS[field]}</p>
                    {(spiced as Record<string, unknown>)[field]
                      ? <p className="text-xs text-foreground leading-relaxed">{String((spiced as Record<string, unknown>)[field])}</p>
                      : <p className="text-xs text-muted-foreground italic">Not captured</p>}
                  </div>
                ))}
              </div>
              <div className="flex justify-end pt-1">
                <Button size="sm" variant="ghost" className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                  onClick={(e) => { e.stopPropagation(); navigate(`/meetings/${meeting.id}?tab=spiced`); }}>
                  <ExternalLink className="w-3 h-3" /> Open full meeting
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
