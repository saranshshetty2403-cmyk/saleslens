import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { BookOpen, Search, ChevronDown, ChevronUp, Copy, CheckCircle } from "lucide-react";
import { toast } from "sonner";

const CATEGORY_COLORS: Record<string, string> = {
  pricing: "bg-red-500/20 text-red-400 border-red-500/30",
  competition: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  timing: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  technical: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  stakeholder: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  process: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  trust: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

const CATEGORIES = ["all", "pricing", "competition", "timing", "technical", "stakeholder", "process", "trust"];

type Objection = {
  objection: string;
  category: string;
  response: string;
  hackerEarthAdvantage: string;
};

export default function ObjectionLibrary() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const { data: objections, isLoading } = trpc.objections.list.useQuery(
    category !== "all" || search ? { category: category !== "all" ? category : undefined, search: search || undefined } : undefined
  );

  const handleCopy = (idx: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    toast.success("Response copied to clipboard");
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const filtered = (objections as Objection[] || []).filter((obj) => {
    if (search && !obj.objection.toLowerCase().includes(search.toLowerCase()) && !obj.response.toLowerCase().includes(search.toLowerCase())) return false;
    if (category !== "all" && obj.category !== category) return false;
    return true;
  });

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <BookOpen className="w-5 h-5 text-primary" />
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Objection Library</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          HackerEarth-specific objection handling — proven responses for every pushback you'll encounter.
        </p>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search objections..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-input border-border"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all capitalize ${
                category === cat
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border text-muted-foreground hover:border-primary/50"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>{filtered.length} objections</span>
        {search && <span>matching "{search}"</span>}
      </div>

      {/* Objection cards */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-muted/20 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((obj, idx) => (
            <Card key={idx} className="bg-card border-border overflow-hidden">
              <button
                className="w-full p-4 flex items-start gap-3 text-left hover:bg-muted/10 transition-colors"
                onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge className={`text-[10px] px-1.5 py-0 border capitalize ${CATEGORY_COLORS[obj.category] || "bg-muted/30 text-muted-foreground border-border"}`}>
                      {obj.category}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium text-foreground">"{obj.objection}"</p>
                </div>
                {expandedIdx === idx ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                )}
              </button>

              {expandedIdx === idx && (
                <div className="border-t border-border px-4 pb-4 pt-3 space-y-3">
                  {/* Response */}
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-semibold text-primary uppercase tracking-wide">Recommended Response</p>
                      <button
                        onClick={() => handleCopy(idx, obj.response)}
                        className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 transition-colors"
                      >
                        {copiedIdx === idx ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        {copiedIdx === idx ? "Copied!" : "Copy"}
                      </button>
                    </div>
                    <p className="text-xs text-foreground leading-relaxed">{obj.response}</p>
                  </div>

                  {/* HackerEarth advantage */}
                  {obj.hackerEarthAdvantage && (
                    <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <p className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wide mb-1.5">HackerEarth Advantage</p>
                      <p className="text-xs text-foreground">{obj.hackerEarthAdvantage}</p>
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}

          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center h-48 rounded-lg border border-dashed border-border text-center p-6">
              <BookOpen className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium text-foreground">No objections found</p>
              <p className="text-xs text-muted-foreground mt-1">Try a different search term or category</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
