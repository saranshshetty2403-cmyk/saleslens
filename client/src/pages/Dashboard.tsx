// @ts-nocheck
import { tsToDate } from "@/lib/dateUtils";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Activity,
  BarChart3,
  Calendar,
  CheckSquare,
  Clock,
  Mic,
  Plus,
  TrendingUp,
  Video,
  Zap,
} from "lucide-react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";

const PLATFORM_LABELS: Record<string, string> = {
  zoom: "Zoom",
  google_meet: "Google Meet",
  teams: "Teams",
  slack: "Slack",
  webex: "Webex",
  other: "Other",
};

const STATUS_LABELS: Record<string, string> = {
  scheduled: "Scheduled",
  joining: "Joining",
  recording: "Recording",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
};

export default function Dashboard() {
  const { data: stats } = trpc.meetings.stats.useQuery();
  const { data: meetings } = trpc.meetings.list.useQuery({ limit: 5, offset: 0 });
  const { data: actionItems } = trpc.actionItems.list.useQuery({});

  const openActions = actionItems?.filter((a) => a.status === "open" || a.status === "in_progress") ?? [];
  const overdueActions = openActions.filter(
    (a) => a.dueDate && tsToDate(a.dueDate) < new Date()
  );

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Your sales intelligence overview
          </p>
        </div>
        <Link href="/meetings/new">
          <Button size="sm" className="gap-2 shrink-0">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Meeting</span>
            <span className="sm:hidden">New</span>
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          icon={<Video className="w-4 h-4 text-blue-400" />}
          label="Total Meetings"
          value={stats?.total ?? 0}
          color="blue"
        />
        <StatCard
          icon={<Activity className="w-4 h-4 text-emerald-400" />}
          label="Completed"
          value={stats?.completed ?? 0}
          color="emerald"
        />
        <StatCard
          icon={<Clock className="w-4 h-4 text-yellow-400" />}
          label="Scheduled"
          value={stats?.scheduled ?? 0}
          color="yellow"
        />
        <StatCard
          icon={<CheckSquare className="w-4 h-4 text-purple-400" />}
          label="Open Actions"
          value={openActions.length}
          color="purple"
          badge={overdueActions.length > 0 ? `${overdueActions.length} overdue` : undefined}
        />
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Recent Meetings */}
        <div className="lg:col-span-2">
          <Card className="bg-card border-border">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Video className="w-4 h-4 text-muted-foreground" />
                Recent Meetings
              </CardTitle>
              <Link href="/meetings">
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7">
                  View all
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-2">
              {meetings?.length === 0 && (
                <EmptyState
                  icon={<Mic className="w-8 h-8 text-muted-foreground/40" />}
                  title="No meetings yet"
                  description="Start by adding your first sales meeting"
                  action={
                    <Link href="/meetings/new">
                      <Button size="sm" variant="outline" className="gap-2 mt-3">
                        <Plus className="w-3.5 h-3.5" />
                        Add Meeting
                      </Button>
                    </Link>
                  }
                />
              )}
              {meetings?.map((meeting) => (
                <Link key={meeting.id} href={`/meetings/${meeting.id}`}>
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-accent/30 transition-all cursor-pointer">
                    <div className="w-8 h-8 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                      <Video className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{meeting.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {meeting.accountName && `${meeting.accountName} · `}
                        {formatDistanceToNow(tsToDate(meeting.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium platform-${meeting.platform}`}>
                        {PLATFORM_LABELS[meeting.platform]}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium status-${meeting.status}`}>
                        {STATUS_LABELS[meeting.status]}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions + Methodology */}
        <div className="space-y-4">
          {/* Quick Actions */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Zap className="w-4 h-4 text-muted-foreground" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/meetings/new">
                <Button variant="outline" size="sm" className="w-full justify-start gap-2 h-9 text-xs">
                  <Plus className="w-3.5 h-3.5 text-primary" />
                  Schedule Meeting
                </Button>
              </Link>
              <Link href="/spiced">
                <Button variant="outline" size="sm" className="w-full justify-start gap-2 h-9 text-xs">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  SPICED Reports
                </Button>
              </Link>
              <Link href="/meddpicc">
                <Button variant="outline" size="sm" className="w-full justify-start gap-2 h-9 text-xs">
                  <BarChart3 className="w-3.5 h-3.5 text-purple-400" />
                  MEDDPICC Reports
                </Button>
              </Link>
              <Link href="/actions">
                <Button variant="outline" size="sm" className="w-full justify-start gap-2 h-9 text-xs">
                  <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
                  Action Items
                  {openActions.length > 0 && (
                    <Badge variant="secondary" className="ml-auto text-[10px] h-4 px-1.5">
                      {openActions.length}
                    </Badge>
                  )}
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Upcoming Actions */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                Upcoming Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {openActions.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-3">
                  No open action items
                </p>
              )}
              {openActions.slice(0, 4).map((item) => (
                <div key={item.id} className="flex items-start gap-2 p-2 rounded-md hover:bg-accent/30 transition-colors">
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 priority-dot-${item.priority}`}
                    style={{
                      background: item.priority === "urgent" ? "#ef4444" :
                        item.priority === "high" ? "#f97316" :
                        item.priority === "medium" ? "#3b82f6" : "#71717a"
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{item.title}</p>
                    {item.dueDate && (
                      <p className={`text-[10px] mt-0.5 ${tsToDate(item.dueDate) < new Date() ? "text-red-400" : "text-muted-foreground"}`}>
                        Due {formatDistanceToNow(tsToDate(item.dueDate), { addSuffix: true })}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              {openActions.length > 4 && (
                <Link href="/actions">
                  <p className="text-xs text-primary hover:underline text-center pt-1 cursor-pointer">
                    +{openActions.length - 4} more
                  </p>
                </Link>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  badge?: string;
}) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center justify-between mb-2">
          <div className={`w-8 h-8 rounded-lg bg-${color}-500/10 border border-${color}-500/20 flex items-center justify-center`}>
            {icon}
          </div>
          {badge && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30 font-medium">
              {badge}
            </span>
          )}
        </div>
        <p className="text-xl sm:text-2xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </CardContent>
    </Card>
  );
}

function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      {icon}
      <p className="text-sm font-medium text-foreground mt-3">{title}</p>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
      {action}
    </div>
  );
}
