// @ts-nocheck
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Building2,
  Plus,
  Search,
  TrendingUp,
  Calendar,
  ChevronRight,
  Globe,
  Users,
} from "lucide-react";
import { tsToDate } from "@/lib/dateUtils";
import { formatDistanceToNow } from "date-fns";

export default function Accounts() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIndustry, setNewIndustry] = useState("");
  const [newDomain, setNewDomain] = useState("");

  const { data: accounts = [], refetch } = trpc.accounts.list.useQuery();
  const { data: dealSummaries = [] } = trpc.dealSummary.list.useQuery();

  const createMutation = trpc.accounts.create.useMutation({
    onSuccess: () => {
      refetch();
      setShowCreate(false);
      setNewName("");
      setNewIndustry("");
      setNewDomain("");
    },
  });

  const filtered = accounts.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    (a.industry || "").toLowerCase().includes(search.toLowerCase())
  );

  const getDealSummary = (accountId: number) =>
    dealSummaries.find((d) => d.accountId === accountId);

  const getHealthColor = (score: number | null | undefined) => {
    if (!score) return "text-muted-foreground";
    if (score >= 7) return "text-green-500";
    if (score >= 4) return "text-yellow-500";
    return "text-red-500";
  };

  const getHealthBadge = (score: number | null | undefined) => {
    if (!score) return null;
    if (score >= 7) return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Healthy</Badge>;
    if (score >= 4) return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">At Risk</Badge>;
    return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Critical</Badge>;
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            Accounts
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your accounts and view consolidated deal threads across all calls.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Account
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search accounts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-card/50">
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold">{accounts.length}</div>
            <div className="text-xs text-muted-foreground">Total Accounts</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold">
              {dealSummaries.filter((d) => (d.dealHealthScore || 0) >= 7).length}
            </div>
            <div className="text-xs text-muted-foreground">Healthy Deals</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold">
              {dealSummaries.reduce((sum, d) => sum + (d.callCount || 0), 0)}
            </div>
            <div className="text-xs text-muted-foreground">Total Calls Logged</div>
          </CardContent>
        </Card>
      </div>

      {/* Account list */}
      {filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground">
              {search ? "No accounts match your search." : "No accounts yet. Create one to start tracking deal threads."}
            </p>
            {!search && (
              <Button variant="outline" className="mt-4" onClick={() => setShowCreate(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Account
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((account) => {
            const summary = getDealSummary(account.id);
            return (
              <Card
                key={account.id}
                className="cursor-pointer hover:border-primary/50 transition-colors group"
                onClick={() => setLocation(`/accounts/${account.id}`)}
              >
                <CardContent className="py-4 px-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-start gap-4 min-w-0">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-base">{account.name}</h3>
                          {summary && getHealthBadge(summary.dealHealthScore)}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                          {account.industry && (
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {account.industry}
                            </span>
                          )}
                          {account.domain && (
                            <span className="flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              {account.domain}
                            </span>
                          )}
                          {summary && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {summary.callCount} call{summary.callCount !== 1 ? "s" : ""}
                            </span>
                          )}
                          <span className="text-xs">
                            Added {formatDistanceToNow(tsToDate(account.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        {summary?.recommendedNextAction && (
                          <p className="text-xs text-primary/80 mt-1 truncate max-w-lg">
                            Next: {summary.recommendedNextAction}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                      {summary?.dealHealthScore && (
                        <div className="text-right hidden sm:block">
                          <div className={`text-xl font-bold ${getHealthColor(summary.dealHealthScore)}`}>
                            {summary.dealHealthScore.toFixed(1)}
                          </div>
                          <div className="text-xs text-muted-foreground">Health</div>
                        </div>
                      )}
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Account Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Company Name *</label>
              <Input
                placeholder="e.g. Acme Corp"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && newName.trim() && createMutation.mutate({ name: newName.trim(), industry: newIndustry || undefined, domain: newDomain || undefined })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Industry</label>
              <Input
                placeholder="e.g. Technology, Finance, Healthcare"
                value={newIndustry}
                onChange={(e) => setNewIndustry(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Domain</label>
              <Input
                placeholder="e.g. acme.com"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button
              disabled={!newName.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate({ name: newName.trim(), industry: newIndustry || undefined, domain: newDomain || undefined })}
            >
              {createMutation.isPending ? "Creating..." : "Create Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
