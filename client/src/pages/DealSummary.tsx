// @ts-nocheck
import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Building2,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  RefreshCw,
  ChevronRight,
  Target,
  BarChart3,
} from "lucide-react";
import { tsToDate } from "@/lib/dateUtils";
import { format } from "date-fns";

function HealthGauge({ score }: { score: number }) {
  const color = score >= 7 ? "#22c55e" : score >= 4 ? "#eab308" : "#ef4444";
  const pct = (score / 10) * 100;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-24 h-24">
        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-muted/20" />
          <circle
            cx="18" cy="18" r="15.9" fill="none"
            stroke={color} strokeWidth="2.5"
            strokeDasharray={`${pct} ${100 - pct}`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold" style={{ color }}>{score.toFixed(1)}</span>
        </div>
      </div>
      <span className="text-xs text-muted-foreground">Deal Health</span>
    </div>
  );
}

function TrendChart({ trend }: { trend: Array<{ callIndex: number; score: number }> }) {
  if (!trend || trend.length < 2) return null;
  const max = 10;
  const w = 200;
  const h = 60;
  const pts = trend.map((t, i) => {
    const x = (i / (trend.length - 1)) * w;
    const y = h - (t.score / max) * h;
    return `${x},${y}`;
  }).join(" ");

  const lastScore = trend[trend.length - 1].score;
  const firstScore = trend[0].score;
  const diff = lastScore - firstScore;
  const TrendIcon = diff > 0 ? TrendingUp : diff < 0 ? TrendingDown : Minus;
  const trendColor = diff > 0 ? "text-green-500" : diff < 0 ? "text-red-500" : "text-muted-foreground";

  return (
    <div className="flex items-center gap-3">
      <svg width={w} height={h} className="overflow-visible">
        <polyline fill="none" stroke="hsl(var(--primary))" strokeWidth="2" points={pts} />
        {trend.map((t, i) => {
          const x = (i / (trend.length - 1)) * w;
          const y = h - (t.score / max) * h;
          return <circle key={i} cx={x} cy={y} r="3" fill="hsl(var(--primary))" />;
        })}
      </svg>
      <div className={`flex items-center gap-1 text-sm font-medium ${trendColor}`}>
        <TrendIcon className="h-4 w-4" />
        {diff > 0 ? "+" : ""}{diff.toFixed(1)}
      </div>
    </div>
  );
}

export default function DealSummaryPage() {
  const { accountId } = useParams<{ accountId: string }>();
  const [, setLocation] = useLocation();
  const id = parseInt(accountId || "0");

  const { data: account, isLoading: loadingAccount } = trpc.accounts.get.useQuery({ id });
  const { data: meetings = [], isLoading: loadingMeetings } = trpc.accounts.meetings.useQuery({ accountId: id });
  const { data: summary, isLoading: loadingSummary, refetch: refetchSummary } = trpc.dealSummary.get.useQuery({ accountId: id });

  const generateMutation = trpc.dealSummary.generate.useMutation({
    onSuccess: () => refetchSummary(),
  });

  const isLoading = loadingAccount || loadingMeetings || loadingSummary;

  if (isLoading) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-64" />
          <div className="h-48 bg-muted rounded" />
          <div className="h-48 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="p-6 max-w-5xl mx-auto text-center">
        <p className="text-muted-foreground">Account not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => setLocation("/accounts")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Accounts
        </Button>
      </div>
    );
  }

  const meddpicc = summary?.consolidatedMeddpicc as Record<string, string> | null;
  const spiced = summary?.consolidatedSpiced as Record<string, string> | null;
  const healthTrend = summary?.dealHealthTrend as Array<{ callIndex: number; score: number }> | null;
  const risks = summary?.keyRisks as string[] | null;
  const momentum = summary?.momentumSignals as string[] | null;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/accounts")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Building2 className="h-5 w-5 text-primary flex-shrink-0" />
            <h1 className="text-xl font-bold truncate">{account.name}</h1>
            {account.industry && <Badge variant="outline">{account.industry}</Badge>}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {meetings.length} call{meetings.length !== 1 ? "s" : ""} logged
            {account.domain && ` · ${account.domain}`}
          </p>
        </div>
        <Button
          onClick={() => generateMutation.mutate({ accountId: id })}
          disabled={generateMutation.isPending || meetings.length === 0}
          className="gap-2 flex-shrink-0"
        >
          <RefreshCw className={`h-4 w-4 ${generateMutation.isPending ? "animate-spin" : ""}`} />
          {summary ? "Regenerate" : "Generate"} Summary
        </Button>
      </div>

      {meetings.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center">
            <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground">No meetings linked to this account yet.</p>
            <p className="text-sm text-muted-foreground mt-1">
              When you analyze a meeting, you can link it to this account to build the deal thread.
            </p>
          </CardContent>
        </Card>
      )}

      {!summary && meetings.length > 0 && (
        <Card className="border-dashed border-primary/30 bg-primary/5">
          <CardContent className="py-8 text-center">
            <BarChart3 className="h-8 w-8 text-primary mx-auto mb-3 opacity-70" />
            <p className="font-medium">No deal summary yet</p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Generate a consolidated analysis across all {meetings.length} call{meetings.length !== 1 ? "s" : ""} for this account.
            </p>
            <Button onClick={() => generateMutation.mutate({ accountId: id })} disabled={generateMutation.isPending}>
              <Zap className="h-4 w-4 mr-2" />
              {generateMutation.isPending ? "Generating..." : "Generate Deal Summary"}
            </Button>
          </CardContent>
        </Card>
      )}

      {summary && (
        <>
          {/* Health Score + Trend */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Deal Health
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-8 flex-wrap">
                {summary.dealHealthScore && <HealthGauge score={summary.dealHealthScore} />}
                {healthTrend && healthTrend.length >= 2 && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-2">Health trend across calls</div>
                    <TrendChart trend={healthTrend} />
                    <div className="flex gap-2 mt-2">
                      {healthTrend.map((t, i) => (
                        <div key={i} className="text-center">
                          <div className="text-xs text-muted-foreground">Call {t.callIndex + 1}</div>
                          <div className="text-xs font-medium">{t.score.toFixed(1)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {summary.recommendedNextAction && (
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-muted-foreground mb-1">Recommended Next Action</div>
                    <div className="text-sm font-medium text-primary bg-primary/10 rounded-lg px-3 py-2">
                      {summary.recommendedNextAction}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Narrative */}
          {summary.dealNarrative && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Deal Story</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                  {summary.dealNarrative}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Risks & Momentum */}
          {((risks && risks.length > 0) || (momentum && momentum.length > 0)) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {risks && risks.length > 0 && (
                <Card className="border-red-500/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2 text-red-400">
                      <AlertTriangle className="h-4 w-4" />
                      Key Risks
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {risks.map((r, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <span className="text-red-400 mt-0.5 flex-shrink-0">•</span>
                          <span className="text-muted-foreground">{r}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
              {momentum && momentum.length > 0 && (
                <Card className="border-green-500/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2 text-green-400">
                      <CheckCircle2 className="h-4 w-4" />
                      Momentum Signals
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {momentum.map((m, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <span className="text-green-400 mt-0.5 flex-shrink-0">•</span>
                          <span className="text-muted-foreground">{m}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Consolidated MEDDPICC */}
          {meddpicc && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Consolidated MEDDPICC</CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="multiple" className="space-y-1">
                  {[
                    { key: "metrics", label: "Metrics" },
                    { key: "economicBuyer", label: "Economic Buyer" },
                    { key: "decisionCriteria", label: "Decision Criteria" },
                    { key: "decisionProcess", label: "Decision Process" },
                    { key: "identifyPain", label: "Identify Pain" },
                    { key: "champion", label: "Champion" },
                    { key: "competition", label: "Competition" },
                  ].map(({ key, label }) => (
                    meddpicc[key] ? (
                      <AccordionItem key={key} value={key} className="border rounded-lg px-3">
                        <AccordionTrigger className="text-sm font-medium py-2 hover:no-underline">
                          <span className="flex items-center gap-2">
                            <span className="text-primary font-bold">{label[0]}</span>
                            {label}
                          </span>
                        </AccordionTrigger>
                        <AccordionContent className="text-sm text-muted-foreground pb-3">
                          {meddpicc[key]}
                        </AccordionContent>
                      </AccordionItem>
                    ) : null
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          )}

          {/* Consolidated SPICED */}
          {spiced && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Consolidated SPICED</CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="multiple" className="space-y-1">
                  {[
                    { key: "situation", label: "Situation" },
                    { key: "pain", label: "Pain" },
                    { key: "impact", label: "Impact" },
                    { key: "criticalEvent", label: "Critical Event" },
                    { key: "decision", label: "Decision" },
                  ].map(({ key, label }) => (
                    spiced[key] ? (
                      <AccordionItem key={key} value={key} className="border rounded-lg px-3">
                        <AccordionTrigger className="text-sm font-medium py-2 hover:no-underline">
                          <span className="flex items-center gap-2">
                            <span className="text-primary font-bold">{label[0]}</span>
                            {label}
                          </span>
                        </AccordionTrigger>
                        <AccordionContent className="text-sm text-muted-foreground pb-3">
                          {spiced[key]}
                        </AccordionContent>
                      </AccordionItem>
                    ) : null
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Call Timeline */}
      {meetings.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Call Timeline ({meetings.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {meetings.map((meeting, i) => (
                <div
                  key={meeting.id}
                  className="flex items-center gap-3 p-3 rounded-lg border hover:border-primary/50 cursor-pointer transition-colors group"
                  onClick={() => setLocation(`/meetings/${meeting.id}`)}
                >
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{meeting.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(tsToDate(meeting.createdAt), "MMM d, yyyy")}
                      {meeting.dealStage && ` · ${meeting.dealStage}`}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
