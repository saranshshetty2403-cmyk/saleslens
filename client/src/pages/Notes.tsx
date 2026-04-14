import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen } from "lucide-react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";

export default function Notes() {
  const { data: meetings } = trpc.meetings.list.useQuery({ limit: 100, offset: 0 });

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Notes</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Structured notes from all your sales meetings</p>
      </div>

      {!meetings || meetings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <BookOpen className="w-10 h-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-foreground">No notes yet</p>
          <p className="text-xs text-muted-foreground mt-1">Notes are auto-generated from meeting transcripts</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {meetings.map((meeting) => (
            <Link key={meeting.id} href={`/meetings/${meeting.id}`}>
              <Card className="bg-card border-border hover:border-primary/30 hover:bg-accent/10 transition-all cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5 text-primary" />
                    {meeting.title}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {meeting.accountName && `${meeting.accountName} · `}
                    {formatDistanceToNow(new Date(meeting.createdAt), { addSuffix: true })}
                  </p>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    Click to view and edit structured notes for this meeting
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
