import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";

const MEDDPICC_FIELDS = [
  "metrics", "economicBuyer", "decisionCriteria", "decisionProcess",
  "paperProcess", "identifyPain", "champion", "competition"
] as const;

const LABELS: Record<string, string> = {
  metrics: "M — Metrics",
  economicBuyer: "E — Economic Buyer",
  decisionCriteria: "D — Decision Criteria",
  decisionProcess: "D — Decision Process",
  paperProcess: "P — Paper Process",
  identifyPain: "I — Identify Pain",
  champion: "C — Champion",
  competition: "C — Competition",
};

const COLORS: Record<string, string> = {
  metrics: "text-blue-400",
  economicBuyer: "text-purple-400",
  decisionCriteria: "text-indigo-400",
  decisionProcess: "text-cyan-400",
  paperProcess: "text-teal-400",
  identifyPain: "text-red-400",
  champion: "text-emerald-400",
  competition: "text-orange-400",
};

export default function MeddpiccReports() {
  const { data: meetings } = trpc.meetings.list.useQuery({ limit: 100, offset: 0 });

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-foreground">MEDDPICC Reports</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Metrics · Economic Buyer · Decision Criteria · Decision Process · Paper Process · Identify Pain · Champion · Competition
        </p>
      </div>

      <div className="p-4 rounded-lg border border-border bg-card/50 text-xs text-muted-foreground space-y-1">
        <p className="font-semibold text-foreground text-sm">About MEDDPICC</p>
        <p>MEDDPICC is an enterprise sales qualification framework used by high-performing B2B SaaS teams. It ensures rigorous deal qualification by capturing metrics that justify the purchase, identifying the economic buyer, mapping decision criteria and processes, understanding the paper/procurement process, identifying the core pain, finding an internal champion, and assessing the competitive landscape.</p>
      </div>

      {!meetings || meetings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <BarChart3 className="w-10 h-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-foreground">No MEDDPICC reports yet</p>
          <p className="text-xs text-muted-foreground mt-1">Create a meeting and generate a MEDDPICC report from the transcript</p>
        </div>
      ) : (
        <div className="space-y-4">
          {meetings.map((meeting) => (
            <MeddpiccCard key={meeting.id} meeting={meeting} />
          ))}
        </div>
      )}
    </div>
  );
}

function MeddpiccCard({ meeting }: { meeting: { id: number; title: string; accountName?: string | null; createdAt: Date } }) {
  const { data: meddpicc } = trpc.meddpicc.get.useQuery({ meetingId: meeting.id });
  const [, navigate] = useLocation();

  const handleClick = () => {
    navigate(`/meetings/${meeting.id}?tab=meddpicc`);
  };

  const filledCount = meddpicc
    ? MEDDPICC_FIELDS.filter((f) => !!(meddpicc as Record<string, unknown>)[f]).length
    : 0;

  return (
    <Card
      className="bg-card border-border hover:border-primary/30 hover:bg-accent/10 transition-all cursor-pointer"
      onClick={handleClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <BarChart3 className="w-3.5 h-3.5 text-primary" />
            {meeting.title}
          </CardTitle>
          <div className="flex items-center gap-2 shrink-0">
            {meddpicc ? (
              <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-400/30">
                {filledCount}/8 fields
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
        {!meddpicc ? (
          <p className="text-xs text-muted-foreground italic">No MEDDPICC report generated yet — click to open meeting and generate</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {MEDDPICC_FIELDS.map((field) => (
              <div key={field} className="space-y-1">
                <p className={`text-[10px] font-bold uppercase tracking-wider ${COLORS[field]}`}>
                  {LABELS[field]}
                </p>
                <p className="text-xs text-foreground line-clamp-2 leading-relaxed">
                  {(meddpicc as Record<string, unknown>)[field]
                    ? String((meddpicc as Record<string, unknown>)[field])
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
