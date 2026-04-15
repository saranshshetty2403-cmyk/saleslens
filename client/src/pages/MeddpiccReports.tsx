// @ts-nocheck
import { tsToDate } from "@/lib/dateUtils";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BarChart3, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";

const MEDDPICC_FIELDS = [
  { key: "metrics",          label: "M — Metrics",           confidenceKey: "metricsConfidence",          color: "text-blue-400",    bg: "bg-blue-400/10 border-blue-400/20" },
  { key: "economicBuyer",    label: "E — Economic Buyer",    confidenceKey: "economicBuyerConfidence",    color: "text-purple-400",  bg: "bg-purple-400/10 border-purple-400/20" },
  { key: "decisionCriteria", label: "D — Decision Criteria", confidenceKey: "decisionCriteriaConfidence", color: "text-indigo-400",  bg: "bg-indigo-400/10 border-indigo-400/20" },
  { key: "decisionProcess",  label: "D — Decision Process",  confidenceKey: "decisionProcessConfidence",  color: "text-cyan-400",    bg: "bg-cyan-400/10 border-cyan-400/20" },
  { key: "paperProcess",     label: "P — Paper Process",     confidenceKey: "paperProcessConfidence",     color: "text-teal-400",    bg: "bg-teal-400/10 border-teal-400/20" },
  { key: "identifyPain",     label: "I — Identify Pain",     confidenceKey: "identifyPainConfidence",     color: "text-red-400",     bg: "bg-red-400/10 border-red-400/20" },
  { key: "champion",         label: "C — Champion",          confidenceKey: "championConfidence",         color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/20" },
  { key: "competition",      label: "C — Competition",       confidenceKey: "competitionConfidence",      color: "text-orange-400",  bg: "bg-orange-400/10 border-orange-400/20" },
] as const;

export default function MeddpiccReports() {
  const { data: meetings } = trpc.meetings.list.useQuery({ limit: 100, offset: 0 });

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">MEDDPICC Reports</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Metrics · Economic Buyer · Decision Criteria · Decision Process · Paper Process · Identify Pain · Champion · Competition
        </p>
      </div>

      <div className="p-4 rounded-lg border border-border bg-card/50 text-xs text-muted-foreground space-y-1">
        <p className="font-semibold text-foreground text-sm">About MEDDPICC</p>
        <p>
          MEDDPICC is an enterprise sales qualification framework used by high-performing B2B SaaS teams. It ensures rigorous deal
          qualification by capturing metrics that justify the purchase, identifying the economic buyer, mapping decision criteria and
          processes, understanding the paper/procurement process, identifying the core pain, finding an internal champion, and
          assessing the competitive landscape.
        </p>
      </div>

      {!meetings || meetings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <BarChart3 className="w-10 h-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-foreground">No MEDDPICC reports yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Create a meeting and generate a MEDDPICC report from the transcript
          </p>
        </div>
      ) : (
        <div className="space-y-3">
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
  const [expanded, setExpanded] = useState(false);
  const [, navigate] = useLocation();

  const filledCount = meddpicc
    ? MEDDPICC_FIELDS.filter((f) => !!(meddpicc as Record<string, unknown>)[f.key]).length
    : 0;

  const completeness = meddpicc
    ? Math.round((filledCount / 8) * 100)
    : 0;

  const completenessColor =
    completeness >= 75 ? "text-emerald-400" :
    completeness >= 40 ? "text-amber-400" :
    "text-red-400";

  return (
    <Card className="bg-card border-border transition-all overflow-hidden">
      {/* ── Header row (always visible, click to expand) ── */}
      <CardHeader
        className="pb-3 cursor-pointer select-none hover:bg-accent/10 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <BarChart3 className="w-3.5 h-3.5 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{meeting.title}</p>
              {meeting.accountName && (
                <p className="text-xs text-muted-foreground">{meeting.accountName}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {meddpicc ? (
              <>
                <span className={`text-xs font-semibold ${completenessColor}`}>
                  {filledCount}/8
                </span>
                <Badge
                  variant="outline"
                  className={`text-[10px] ${completenessColor} border-current/30`}
                >
                  {completeness}% complete
                </Badge>
              </>
            ) : (
              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                Not generated
              </Badge>
            )}
            <span className="text-xs text-muted-foreground hidden sm:block">
              {formatDistanceToNow(tsToDate(meeting.createdAt), { addSuffix: true })}
            </span>
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Completeness bar */}
        {meddpicc && (
          <div className="mt-2">
            <Progress value={completeness} className="h-1" />
          </div>
        )}
      </CardHeader>

      {/* ── Expanded content ── */}
      {expanded && (
        <CardContent className="pt-0 pb-4">
          {!meddpicc ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <p className="text-xs text-muted-foreground">
                No MEDDPICC report generated yet for this meeting.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/meetings/${meeting.id}?tab=meddpicc`);
                }}
              >
                <ExternalLink className="w-3 h-3" />
                Open meeting to generate
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {MEDDPICC_FIELDS.map(({ key, label, confidenceKey, color, bg }) => {
                  const value = (meddpicc as Record<string, unknown>)[key];
                  const confidence = (meddpicc as Record<string, unknown>)[confidenceKey] as number | null;
                  return (
                    <div
                      key={key}
                      className={`rounded-lg border p-3 space-y-1.5 ${bg}`}
                    >
                      <div className="flex items-center justify-between">
                        <p className={`text-[10px] font-bold uppercase tracking-wider ${color}`}>
                          {label}
                        </p>
                        {confidence != null && (
                          <span className="text-[10px] text-muted-foreground">
                            {Math.round(confidence * 100)}% confidence
                          </span>
                        )}
                      </div>
                      {value ? (
                        <p className="text-xs text-foreground leading-relaxed">
                          {String(value)}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">Not captured</p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Link to full meeting */}
              <div className="flex justify-end pt-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/meetings/${meeting.id}?tab=meddpicc`);
                  }}
                >
                  <ExternalLink className="w-3 h-3" />
                  Open full meeting
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
