// @ts-nocheck
import { tsToDate } from "@/lib/dateUtils";
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
  Trash2,
  Video,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

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
  const { data: meetings, isLoading, refetch } = trpc.meetings.list.useQuery(
    search.length > 1 ? { limit: 100, offset: 0, search } : { limit: 100, offset: 0 }
  );

  const deleteMutation = trpc.meetings.delete.useMutation({
    onSuccess: () => {
      toast.success("Meeting deleted");
      refetch();
    },
    onError: (err) => toast.error(err.message || "Failed to delete meeting"),
  });

  const displayed = meetings;

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Meetings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {meetings?.length ?? 0} total meetings
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
          <div key={meeting.id} className="relative group">
            <Link href={`/meetings/${meeting.id}`}>
              <Card className="bg-card border-border hover:border-primary/30 hover:bg-accent/20 transition-all cursor-pointer">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-4">
                    {/* Platform icon */}
                    <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                      <Video className="w-4 h-4 text-primary" />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold text-foreground truncate">{meeting.title}</p>
                        <span className={`sm:hidden text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 status-${meeting.status}`}>
                          {STATUS_LABELS[meeting.status]}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 text-xs text-muted-foreground flex-wrap">
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
                          {formatDistanceToNow(tsToDate(meeting.createdAt), { addSuffix: true })}
                        </span>
                        {meeting.scheduledAt && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(tsToDate(meeting.scheduledAt), "MMM d, h:mm a")}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Badges */}
                    <div className="hidden sm:flex items-center gap-2 shrink-0 pr-8">
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
            {/* Delete button — appears on hover */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                  onClick={(e) => e.preventDefault()}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this meeting?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete <strong>{meeting.title}</strong> along with its transcript, AI reports, and action items. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-red-600 hover:bg-red-700 text-white"
                    onClick={() => deleteMutation.mutate({ id: meeting.id })}
                  >
                    Yes, delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ))}
      </div>
    </div>
  );
}
