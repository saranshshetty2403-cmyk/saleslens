import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDistanceToNow, format } from "date-fns";
import { Link } from "wouter";
import { useState } from "react";
import {
  Calendar,
  Clock,
  ExternalLink,
  Mic,
  Plus,
  Search,
  Video,
} from "lucide-react";

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

export default function Meetings() {
  const [search, setSearch] = useState("");
  const { data: meetings, isLoading } = trpc.meetings.list.useQuery({ limit: 100, offset: 0 });
  const { data: searchResults } = trpc.meetings.search.useQuery(
    { query: search },
    { enabled: search.length > 1 }
  );

  const displayed = search.length > 1 ? searchResults : meetings;

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Meetings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {meetings?.length ?? 0} total meetings
          </p>
        </div>
        <Link href="/meetings/new">
          <Button size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            New Meeting
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search meetings, accounts, contacts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-card border-border"
        />
      </div>

      {/* List */}
      {isLoading && (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 rounded-lg bg-card border border-border animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && displayed?.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Mic className="w-10 h-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-foreground">No meetings found</p>
          <p className="text-xs text-muted-foreground mt-1">
            {search ? "Try a different search term" : "Start by scheduling your first meeting"}
          </p>
          {!search && (
            <Link href="/meetings/new">
              <Button size="sm" variant="outline" className="gap-2 mt-4">
                <Plus className="w-3.5 h-3.5" />
                Add Meeting
              </Button>
            </Link>
          )}
        </div>
      )}

      <div className="space-y-2">
        {displayed?.map((meeting) => (
          <Link key={meeting.id} href={`/meetings/${meeting.id}`}>
            <Card className="bg-card border-border hover:border-primary/30 hover:bg-accent/20 transition-all cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Platform icon */}
                  <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <Video className="w-4 h-4 text-primary" />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-foreground truncate">{meeting.title}</p>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      {meeting.accountName && (
                        <span className="flex items-center gap-1">
                          <ExternalLink className="w-3 h-3" />
                          {meeting.accountName}
                        </span>
                      )}
                      {meeting.contactName && (
                        <span>{meeting.contactName}</span>
                      )}
                      {meeting.dealStage && (
                        <span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground text-[10px]">
                          {meeting.dealStage}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(meeting.createdAt), { addSuffix: true })}
                      </span>
                      {meeting.scheduledAt && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(meeting.scheduledAt), "MMM d, h:mm a")}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium platform-${meeting.platform}`}>
                      {PLATFORM_LABELS[meeting.platform]}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium status-${meeting.status}`}>
                      {STATUS_LABELS[meeting.status]}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
