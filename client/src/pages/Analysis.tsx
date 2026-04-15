// @ts-nocheck
import { tsToDate } from "@/lib/dateUtils";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, Zap, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";

export default function Analysis() {
  const { data: meetings } = trpc.meetings.list.useQuery({ limit: 100, offset: 0 });

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Activity className="w-5 h-5 text-primary" />
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Analysis</h1>
        </div>
        <p className="text-sm text-muted-foreground">AI-generated insights across all your sales calls</p>
      </div>

      {!meetings || meetings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Activity className="w-10 h-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-foreground">No meetings to analyze yet</p>
          <p className="text-xs text-muted-foreground mt-1">Create a meeting and generate AI analysis to see insights here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {meetings.map((meeting) => (
            <AnalysisCard key={meeting.id} meeting={meeting} />
          ))}
        </div>
      )}
    </div>
  );
}

function AnalysisCard({ meeting }) {
  const { data: analysis } = trpc.analysis.getByMeeting.useQuery({ meetingId: meeting.id });
  const [expanded, setExpanded] = useState(false);
  const [, navigate] = useLocation();

  const hasAnalysis = !!analysis;

  return (
    <Card className="bg-card border-border transition-all overflow-hidden">
      {/* Header — click to expand */}
      <CardHeader
        className="pb-3 cursor-pointer select-none hover:bg-accent/10 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Zap className="w-3.5 h-3.5 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{meeting.title}</p>
              <p className="text-xs text-muted-foreground">
                {meeting.accountName && `${meeting.accountName} · `}
                {formatDistanceToNow(tsToDate(meeting.createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium status-${meeting.status}`}>
              {meeting.status}
            </span>
            {meeting.dealStage && (
              <span className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground hidden sm:block">
                {meeting.dealStage}
              </span>
            )}
            {hasAnalysis ? (
              <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-400/30">Analyzed</Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] text-muted-foreground">Not analyzed</Badge>
            )}
            {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </div>
        </div>
      </CardHeader>

      {/* Expanded content */}
      {expanded && (
        <CardContent className="pt-0 pb-4">
          {!hasAnalysis ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <p className="text-xs text-muted-foreground">No AI analysis generated yet for this meeting.</p>
              <Button size="sm" variant="outline" className="gap-1.5 text-xs"
                onClick={(e) => { e.stopPropagation(); navigate(`/meetings/${meeting.id}?tab=analysis`); }}>
                <ExternalLink className="w-3 h-3" /> Open meeting to analyze
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Deal score + sentiment */}
              <div className="flex flex-wrap gap-3">
                {analysis.dealScore != null && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20">
                    <span className="text-xs text-muted-foreground">Deal Score</span>
                    <span className="text-lg font-bold text-primary">{analysis.dealScore}<span className="text-xs font-normal text-muted-foreground">/10</span></span>
                  </div>
                )}
                {analysis.sentimentScore != null && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border">
                    <span className="text-xs text-muted-foreground">Sentiment</span>
                    <span className={`text-sm font-semibold ${analysis.sentimentScore >= 0.6 ? 'text-emerald-400' : analysis.sentimentScore >= 0.4 ? 'text-amber-400' : 'text-red-400'}`}>
                      {analysis.sentimentScore >= 0.6 ? 'Positive' : analysis.sentimentScore >= 0.4 ? 'Neutral' : 'Negative'}
                    </span>
                  </div>
                )}
                {analysis.talkRatio != null && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border">
                    <span className="text-xs text-muted-foreground">Talk Ratio</span>
                    <span className="text-sm font-semibold text-foreground">{Math.round(analysis.talkRatio * 100)}%</span>
                  </div>
                )}
              </div>

              {/* Summary */}
              {analysis.summary && (
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Summary</p>
                  <p className="text-xs text-foreground leading-relaxed">{analysis.summary}</p>
                </div>
              )}

              {/* Pain points / buying signals / next steps */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {Array.isArray(analysis.painPoints) && analysis.painPoints.length > 0 && (
                  <div className="rounded-lg border border-red-400/20 bg-red-400/10 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-red-400 mb-2">Pain Points</p>
                    <ul className="space-y-1">
                      {analysis.painPoints.slice(0, 4).map((p, i) => (
                        <li key={i} className="text-xs text-foreground leading-relaxed flex gap-1.5">
                          <span className="text-red-400 shrink-0">•</span>{String(p)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {Array.isArray(analysis.buyingSignals) && analysis.buyingSignals.length > 0 && (
                  <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-2">Buying Signals</p>
                    <ul className="space-y-1">
                      {analysis.buyingSignals.slice(0, 4).map((s, i) => (
                        <li key={i} className="text-xs text-foreground leading-relaxed flex gap-1.5">
                          <span className="text-emerald-400 shrink-0">•</span>{String(s)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {Array.isArray(analysis.nextSteps) && analysis.nextSteps.length > 0 && (
                  <div className="rounded-lg border border-blue-400/20 bg-blue-400/10 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-blue-400 mb-2">Next Steps</p>
                    <ul className="space-y-1">
                      {analysis.nextSteps.slice(0, 4).map((s, i) => (
                        <li key={i} className="text-xs text-foreground leading-relaxed flex gap-1.5">
                          <span className="text-blue-400 shrink-0">{i + 1}.</span>{String(s)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-1">
                <Button size="sm" variant="ghost" className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                  onClick={(e) => { e.stopPropagation(); navigate(`/meetings/${meeting.id}?tab=analysis`); }}>
                  <ExternalLink className="w-3 h-3" /> Open full analysis
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
