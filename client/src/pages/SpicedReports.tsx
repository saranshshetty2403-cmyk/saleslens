import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";

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
  const [, navigate] = useLocation();

  const handleClick = () => {
    navigate(`/meetings/${meeting.id}?tab=spiced`);
  };

  const filledCount = spiced
    ? SPICED_FIELDS.filter((f) => !!(spiced as Record<string, unknown>)[f]).length
    : 0;

  return (
    <Card
      className="bg-card border-border hover:border-primary/30 hover:bg-accent/10 transition-all cursor-pointer"
      onClick={handleClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-primary" />
            {meeting.title}
          </CardTitle>
          <div className="flex items-center gap-2 shrink-0">
            {spiced ? (
              <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-400/30">
                {filledCount}/5 fields
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                Not generated
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(meeting.createdAt), { addSuffix: true })}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
        </div>
        {meeting.accountName && (
          <p className="text-xs text-muted-foreground">{meeting.accountName}</p>
        )}
      </CardHeader>
      <CardContent>
        {!spiced ? (
          <p className="text-xs text-muted-foreground italic">No SPICED report generated yet — click to open meeting and generate</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
            {SPICED_FIELDS.map((field) => (
              <div key={field} className="space-y-1">
                <p className={`text-[10px] font-bold uppercase tracking-wider ${COLORS[field]}`}>
                  {LABELS[field]}
                </p>
                <p className="text-xs text-foreground line-clamp-3 leading-relaxed">
                  {(spiced as Record<string, unknown>)[field]
                    ? String((spiced as Record<string, unknown>)[field])
                    : <span className="text-muted-foreground italic">Not captured</span>
                  }
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
