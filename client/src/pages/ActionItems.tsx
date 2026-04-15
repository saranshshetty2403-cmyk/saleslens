// @ts-nocheck
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useState } from "react";
import { CheckSquare, Plus, Search } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "text-red-400 bg-red-500/10 border-red-500/30",
  high: "text-orange-400 bg-orange-500/10 border-orange-500/30",
  medium: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  low: "text-zinc-400 bg-zinc-500/10 border-zinc-500/30",
};

export default function ActionItems() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [newTitle, setNewTitle] = useState("");

  const utils = trpc.useUtils();
  const { data: items, isLoading } = trpc.actionItems.list.useQuery({});

  const createMutation = trpc.actionItems.create.useMutation({
    onSuccess: () => {
      toast.success("Action item created");
      setNewTitle("");
      utils.actionItems.list.invalidate({});
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.actionItems.update.useMutation({
    onSuccess: () => utils.actionItems.list.invalidate({}),
    onError: (err) => toast.error(err.message),
  });

  const filtered = (items || []).filter((item) => {
    const matchesSearch = !search || item.title.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || item.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const open = filtered.filter((i) => i.status === "open" || i.status === "in_progress");
  const done = filtered.filter((i) => i.status === "completed" || i.status === "cancelled");

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Action Items</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {(items || []).filter((i) => i.status === "open" || i.status === "in_progress").length} open · {(items || []).filter((i) => i.status === "completed").length} completed
        </p>
      </div>

      {/* Add new */}
      <div className="flex gap-2">
        <Input
          placeholder="Add action item..."
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && newTitle.trim() && createMutation.mutate({ title: newTitle })}
          className="bg-card border-border"
        />
        <Button
          onClick={() => newTitle.trim() && createMutation.mutate({ title: newTitle })}
          disabled={!newTitle.trim() || createMutation.isPending}
          className="gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search actions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 bg-card border-border h-8 text-xs"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32 bg-card border-border h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-32 bg-card border-border h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 rounded-lg bg-card border border-border animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CheckSquare className="w-10 h-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-foreground">No action items found</p>
          <p className="text-xs text-muted-foreground mt-1">
            {search ? "Try a different search" : "Add one above or generate from a meeting"}
          </p>
        </div>
      )}

      {/* Open items */}
      {open.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Open ({open.length})</p>
          {open.map((item) => (
            <ActionRow key={item.id} item={item} onUpdate={(data) => updateMutation.mutate({ id: item.id, data })} />
          ))}
        </div>
      )}

      {/* Done items */}
      {done.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Completed ({done.length})</p>
          {done.map((item) => (
            <ActionRow key={item.id} item={item} onUpdate={(data) => updateMutation.mutate({ id: item.id, data })} />
          ))}
        </div>
      )}
    </div>
  );
}

function ActionRow({
  item,
  onUpdate,
}: {
  item: {
    id: number;
    title: string;
    description?: string | null;
    status: string;
    priority: string;
    dueDate?: Date | null;
    isAiGenerated?: boolean | null;
    meetingId?: number | null;
  };
  onUpdate: (data: Partial<{ status: "open" | "in_progress" | "completed" | "cancelled"; priority: "low" | "medium" | "high" | "urgent" }>) => void;
}) {
  const isOverdue = item.dueDate && new Date(item.dueDate) < new Date() && item.status !== "completed";

  return (
    <Card className="bg-card border-border hover:border-border/80 transition-colors">
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          {/* Checkbox */}
          <button
            onClick={() => onUpdate({ status: item.status === "completed" ? "open" : "completed" })}
            className={`w-4 h-4 rounded border mt-0.5 shrink-0 flex items-center justify-center transition-colors ${
              item.status === "completed"
                ? "bg-emerald-500 border-emerald-500"
                : "border-border hover:border-primary"
            }`}
          >
            {item.status === "completed" && (
              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium ${item.status === "completed" ? "line-through text-muted-foreground" : "text-foreground"}`}>
              {item.title}
            </p>
            {item.description && (
              <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
            )}
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className={`text-[10px] px-1.5 py-0 rounded-full border font-medium capitalize ${PRIORITY_COLORS[item.priority]}`}>
                {item.priority}
              </span>
              {item.dueDate && (
                <span className={`text-[10px] ${isOverdue ? "text-red-400 font-medium" : "text-muted-foreground"}`}>
                  {isOverdue ? "Overdue · " : "Due "}
                  {format(new Date(item.dueDate), "MMM d, yyyy")}
                </span>
              )}
              {item.isAiGenerated && (
                <span className="text-[9px] px-1.5 py-0 rounded bg-primary/10 text-primary border border-primary/20">AI</span>
              )}
            </div>
          </div>

          {/* Status select */}
          <select
            value={item.status}
            onChange={(e) => onUpdate({ status: e.target.value as "open" | "in_progress" | "completed" | "cancelled" })}
            className="text-[10px] bg-input border border-border rounded px-1.5 py-1 text-foreground focus:outline-none shrink-0"
          >
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Done</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </CardContent>
    </Card>
  );
}
