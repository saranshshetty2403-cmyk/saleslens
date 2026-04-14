import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Swords, ChevronDown, ChevronUp, TrendingDown, Trophy, Shield } from "lucide-react";

const COMPETITOR_COLORS: Record<string, string> = {
  hackerrank: "border-l-orange-500",
  codility: "border-l-blue-500",
  codesignal: "border-l-violet-500",
  testgorilla: "border-l-yellow-500",
  imocha: "border-l-pink-500",
  mettl: "border-l-cyan-500",
};

type Battlecard = {
  id: string;
  name: string;
  positioning: string;
  weaknesses: string[];
  winStrategy: string;
  battlecard: string;
};

export default function Battlecards() {
  const { data: battlecards, isLoading } = trpc.battlecards.list.useQuery();
  const [expanded, setExpanded] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-4">
        <div className="h-8 w-48 bg-muted/30 rounded animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-muted/20 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Swords className="w-5 h-5 text-primary" />
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Competitive Battlecards</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          HackerEarth vs. the competition — know exactly what to say when a prospect mentions a competitor.
        </p>
      </div>

      {/* Battlecard list */}
      <div className="space-y-3">
        {(battlecards as Battlecard[] || []).map((card) => (
          <Card
            key={card.id}
            className={`bg-card border-border border-l-4 ${COMPETITOR_COLORS[card.id] || "border-l-border"} overflow-hidden`}
          >
            {/* Header row */}
            <button
              className="w-full p-4 flex items-center gap-4 text-left hover:bg-muted/10 transition-colors"
              onClick={() => setExpanded(expanded === card.id ? null : card.id)}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-bold text-foreground">{card.name}</h3>
                  <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">Competitor</Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{card.positioning}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right hidden sm:block">
                  <p className="text-[10px] text-muted-foreground">{card.weaknesses?.length || 0} weaknesses</p>
                </div>
                {expanded === card.id ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </button>

            {/* Expanded content */}
            {expanded === card.id && (
              <div className="border-t border-border">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-border">
                  {/* Weaknesses */}
                  <div className="p-4">
                    <div className="flex items-center gap-1.5 mb-3">
                      <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                      <p className="text-xs font-semibold text-red-400">Their Weaknesses</p>
                    </div>
                    <ul className="space-y-2">
                      {(card.weaknesses || []).map((w, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-red-400 mt-0.5 text-xs">✗</span>
                          <p className="text-xs text-foreground">{w}</p>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Win strategy */}
                  <div className="p-4">
                    <div className="flex items-center gap-1.5 mb-3">
                      <Trophy className="w-3.5 h-3.5 text-emerald-400" />
                      <p className="text-xs font-semibold text-emerald-400">Win Strategy</p>
                    </div>
                    <p className="text-xs text-foreground leading-relaxed">{card.winStrategy}</p>
                  </div>

                  {/* Battlecard summary */}
                  <div className="p-4">
                    <div className="flex items-center gap-1.5 mb-3">
                      <Shield className="w-3.5 h-3.5 text-primary" />
                      <p className="text-xs font-semibold text-primary">Battlecard Summary</p>
                    </div>
                    <p className="text-xs text-foreground leading-relaxed">{card.battlecard}</p>
                  </div>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>

      {(!battlecards || battlecards.length === 0) && (
        <div className="flex flex-col items-center justify-center h-64 rounded-lg border border-dashed border-border text-center p-6">
          <Swords className="w-10 h-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-foreground">No battlecards available</p>
          <p className="text-xs text-muted-foreground mt-1">Battlecards are loaded from the HackerEarth knowledge base</p>
        </div>
      )}
    </div>
  );
}
