// @ts-nocheck
import { tsToDate } from "@/lib/dateUtils";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";

export default function Notes() {
  const { data: meetings } = trpc.meetings.list.useQuery({ limit: 100, offset: 0 });

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <BookOpen className="w-5 h-5 text-primary" />
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Notes</h1>
        </div>
        <p className="text-sm text-muted-foreground">Structured notes from all your sales meetings</p>
      </div>

      {!meetings || meetings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <BookOpen className="w-10 h-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-foreground">No notes yet</p>
          <p className="text-xs text-muted-foreground mt-1">Notes are auto-generated from meeting transcripts</p>
        </div>
      ) : (
        <div className="space-y-3">
          {meetings.map((meeting) => (
            <NoteCard key={meeting.id} meeting={meeting} />
          ))}
        </div>
      )}
    </div>
  );
}

function NoteCard({ meeting }) {
  const { data: note } = trpc.notes.get.useQuery({ meetingId: meeting.id });
  const [expanded, setExpanded] = useState(false);
  const [, navigate] = useLocation();

  const hasNote = !!(note?.content);

  return (
    <Card className="bg-card border-border transition-all overflow-hidden">
      {/* Header — click to expand */}
      <CardHeader
        className="pb-3 cursor-pointer select-none hover:bg-accent/10 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <BookOpen className="w-3.5 h-3.5 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{meeting.title}</p>
              <p className="text-xs text-muted-foreground">
                {meeting.accountName && `${meeting.accountName} · `}
                {formatDistanceToNow(tsToDate(meeting.createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {hasNote ? (
              <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-400/30">Has notes</Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] text-muted-foreground">No notes</Badge>
            )}
            {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </div>
        </div>
      </CardHeader>

      {/* Expanded content */}
      {expanded && (
        <CardContent className="pt-0 pb-4">
          {!hasNote ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <p className="text-xs text-muted-foreground">No notes generated yet for this meeting.</p>
              <Button size="sm" variant="outline" className="gap-1.5 text-xs"
                onClick={(e) => { e.stopPropagation(); navigate(`/meetings/${meeting.id}?tab=notes`); }}>
                <ExternalLink className="w-3 h-3" /> Open meeting to add notes
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {note.title && (
                <p className="text-sm font-semibold text-foreground">{note.title}</p>
              )}
              <div className="rounded-lg border border-border bg-muted/20 p-3">
                <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{note.content}</p>
              </div>
              <div className="flex justify-end pt-1">
                <Button size="sm" variant="ghost" className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                  onClick={(e) => { e.stopPropagation(); navigate(`/meetings/${meeting.id}?tab=notes`); }}>
                  <ExternalLink className="w-3 h-3" /> Edit notes in meeting
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
