import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, BarChart3, TrendingDown, TrendingUp, Zap } from "lucide-react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";

export default function Analysis() {
  const { data: meetings } = trpc.meetings.list.useQuery({ limit: 100, offset: 0 });

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Analysis</h1>
        <p className="text-sm text-muted-foreground mt-0.5">AI-generated insights across all your sales calls</p>
      </div>

      {!meetings || meetings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Activity className="w-10 h-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-foreground">No meetings to analyze yet</p>
          <p className="text-xs text-muted-foreground mt-1">Create a meeting and generate AI analysis to see insights here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {meetings.map((meeting) => (
            <Link key={meeting.id} href={`/meetings/${meeting.id}`}>
              <Card className="bg-card border-border hover:border-primary/30 hover:bg-accent/20 transition-all cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-primary" />
                    {meeting.title}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {meeting.accountName && `${meeting.accountName} · `}
                    {formatDistanceToNow(new Date(meeting.createdAt), { addSuffix: true })}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3 text-xs">
                    <span className={`px-2 py-0.5 rounded-full font-medium status-${meeting.status}`}>
                      {meeting.status}
                    </span>
                    {meeting.dealStage && (
                      <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground">
                        {meeting.dealStage}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    Click to view full AI analysis, SPICED & MEDDPICC reports
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
