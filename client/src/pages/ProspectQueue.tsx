import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useState } from "react";
import {
  Users, Plus, Search, ExternalLink, Trash2, Edit3,
  Building2, Briefcase, Target, Zap, TrendingUp
} from "lucide-react";

const STATUS_CONFIG = {
  to_contact: { label: "To Contact", color: "bg-slate-500/20 text-slate-400 border-slate-500/30" },
  contacted: { label: "Contacted", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  in_progress: { label: "In Progress", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  converted: { label: "Converted", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  not_a_fit: { label: "Not a Fit", color: "bg-red-500/20 text-red-400 border-red-500/30" },
};

type Prospect = {
  id: number;
  prospectCompanyName: string;
  prospectDomain: string | null;
  industry: string | null;
  companySize: string | null;
  fundingStage: string | null;
  contactName: string | null;
  contactTitle: string | null;
  contactLinkedin: string | null;
  fitReason: string | null;
  outreachAngle: string | null;
  triggerEvent: string | null;
  suggestedProduct: string | null;
  sourceCompanyName: string | null;
  status: "to_contact" | "contacted" | "in_progress" | "converted" | "not_a_fit";
  notes: string | null;
  createdAt: Date;
};

export default function ProspectQueue() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form state
  const [form, setForm] = useState({
    prospectCompanyName: "", prospectDomain: "", industry: "",
    companySize: "", fundingStage: "", contactName: "", contactTitle: "",
    contactLinkedin: "", fitReason: "", outreachAngle: "", triggerEvent: "",
    suggestedProduct: "", sourceCompanyName: "",
  });

  const { data: prospects, refetch } = trpc.prospects.list.useQuery();

  const createMutation = trpc.prospects.create.useMutation({
    onSuccess: () => { refetch(); setAddOpen(false); resetForm(); toast.success("Prospect added"); },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.prospects.update.useMutation({
    onSuccess: () => { refetch(); toast.success("Prospect updated"); },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.prospects.delete.useMutation({
    onSuccess: () => { refetch(); toast.success("Prospect removed"); },
    onError: (err) => toast.error(err.message),
  });

  const resetForm = () => setForm({
    prospectCompanyName: "", prospectDomain: "", industry: "",
    companySize: "", fundingStage: "", contactName: "", contactTitle: "",
    contactLinkedin: "", fitReason: "", outreachAngle: "", triggerEvent: "",
    suggestedProduct: "", sourceCompanyName: "",
  });

  const handleCreate = () => {
    if (!form.prospectCompanyName.trim()) { toast.error("Company name is required"); return; }
    createMutation.mutate({
      ...form,
      prospectDomain: form.prospectDomain || undefined,
      industry: form.industry || undefined,
      companySize: form.companySize || undefined,
      fundingStage: form.fundingStage || undefined,
      contactName: form.contactName || undefined,
      contactTitle: form.contactTitle || undefined,
      contactLinkedin: form.contactLinkedin || undefined,
      fitReason: form.fitReason || undefined,
      outreachAngle: form.outreachAngle || undefined,
      triggerEvent: form.triggerEvent || undefined,
      suggestedProduct: form.suggestedProduct || undefined,
      sourceCompanyName: form.sourceCompanyName || undefined,
    });
  };

  const handleStatusChange = (id: number, status: string) => {
    updateMutation.mutate({ id, data: { status: status as Prospect["status"] } });
  };

  const filtered = (prospects as Prospect[] || []).filter((p) => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        p.prospectCompanyName.toLowerCase().includes(q) ||
        (p.contactName?.toLowerCase().includes(q) ?? false) ||
        (p.industry?.toLowerCase().includes(q) ?? false)
      );
    }
    return true;
  });

  const statusCounts = (prospects as Prospect[] || []).reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-5 h-5 text-primary" />
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Prospect Queue</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Lead generation pipeline — companies to approach based on your call intelligence.
          </p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 shrink-0"><Plus className="w-4 h-4" />Add Prospect</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg bg-card border-border max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Prospect</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-xs">Company Name *</Label>
                  <Input placeholder="Acme Corp" value={form.prospectCompanyName} onChange={(e) => setForm(f => ({ ...f, prospectCompanyName: e.target.value }))} className="bg-input border-border" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Domain</Label>
                  <Input placeholder="acme.com" value={form.prospectDomain} onChange={(e) => setForm(f => ({ ...f, prospectDomain: e.target.value }))} className="bg-input border-border" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Industry</Label>
                  <Input placeholder="Fintech" value={form.industry} onChange={(e) => setForm(f => ({ ...f, industry: e.target.value }))} className="bg-input border-border" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Company Size</Label>
                  <Input placeholder="500-1000" value={form.companySize} onChange={(e) => setForm(f => ({ ...f, companySize: e.target.value }))} className="bg-input border-border" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Funding Stage</Label>
                  <Input placeholder="Series B" value={form.fundingStage} onChange={(e) => setForm(f => ({ ...f, fundingStage: e.target.value }))} className="bg-input border-border" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Contact Name</Label>
                  <Input placeholder="Sarah Chen" value={form.contactName} onChange={(e) => setForm(f => ({ ...f, contactName: e.target.value }))} className="bg-input border-border" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Contact Title</Label>
                  <Input placeholder="VP Engineering" value={form.contactTitle} onChange={(e) => setForm(f => ({ ...f, contactTitle: e.target.value }))} className="bg-input border-border" />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-xs">LinkedIn URL</Label>
                  <Input placeholder="linkedin.com/in/..." value={form.contactLinkedin} onChange={(e) => setForm(f => ({ ...f, contactLinkedin: e.target.value }))} className="bg-input border-border" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Suggested Product</Label>
                  <Input placeholder="AI Screener" value={form.suggestedProduct} onChange={(e) => setForm(f => ({ ...f, suggestedProduct: e.target.value }))} className="bg-input border-border" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Source Company</Label>
                  <Input placeholder="Discovered via..." value={form.sourceCompanyName} onChange={(e) => setForm(f => ({ ...f, sourceCompanyName: e.target.value }))} className="bg-input border-border" />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-xs">Trigger Event</Label>
                  <Input placeholder="Just raised Series B, hiring 50 engineers" value={form.triggerEvent} onChange={(e) => setForm(f => ({ ...f, triggerEvent: e.target.value }))} className="bg-input border-border" />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-xs">Fit Reason</Label>
                  <Textarea placeholder="Why is this company a good fit for HackerEarth?" value={form.fitReason} onChange={(e) => setForm(f => ({ ...f, fitReason: e.target.value }))} className="bg-input border-border min-h-[80px]" />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-xs">Outreach Angle</Label>
                  <Textarea placeholder="How should we approach this company?" value={form.outreachAngle} onChange={(e) => setForm(f => ({ ...f, outreachAngle: e.target.value }))} className="bg-input border-border min-h-[80px]" />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Adding..." : "Add Prospect"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {Object.entries(STATUS_CONFIG).map(([key, config]) => (
          <button
            key={key}
            onClick={() => setStatusFilter(statusFilter === key ? "all" : key)}
            className={`p-3 rounded-lg border text-left transition-all ${
              statusFilter === key ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/30"
            }`}
          >
            <p className="text-lg font-bold text-foreground">{statusCounts[key] || 0}</p>
            <p className="text-[10px] text-muted-foreground">{config.label}</p>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          placeholder="Search prospects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-input border-border"
        />
      </div>

      {/* Prospect cards */}
      <div className="space-y-3">
        {filtered.map((prospect) => (
          <Card key={prospect.id} className="bg-card border-border hover:border-primary/30 transition-colors">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                {/* Company info */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-foreground">{prospect.prospectCompanyName}</h3>
                        {prospect.prospectDomain && (
                          <a href={`https://${prospect.prospectDomain}`} target="_blank" rel="noopener noreferrer"
                            className="text-[10px] text-primary hover:underline flex items-center gap-0.5">
                            <ExternalLink className="w-2.5 h-2.5" />{prospect.prospectDomain}
                          </a>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {prospect.industry && (
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Building2 className="w-2.5 h-2.5" />{prospect.industry}
                          </span>
                        )}
                        {prospect.companySize && (
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Users className="w-2.5 h-2.5" />{prospect.companySize} employees
                          </span>
                        )}
                        {prospect.fundingStage && (
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <TrendingUp className="w-2.5 h-2.5" />{prospect.fundingStage}
                          </span>
                        )}
                      </div>
                    </div>
                    <Select value={prospect.status} onValueChange={(v) => handleStatusChange(prospect.id, v)}>
                      <SelectTrigger className="w-32 h-7 text-xs bg-transparent border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                          <SelectItem key={key} value={key}>{config.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Contact */}
                  {(prospect.contactName || prospect.contactTitle) && (
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-3 h-3 text-muted-foreground shrink-0" />
                      <span className="text-xs text-foreground">
                        {prospect.contactName}{prospect.contactTitle ? ` — ${prospect.contactTitle}` : ""}
                      </span>
                      {prospect.contactLinkedin && (
                        <a href={prospect.contactLinkedin} target="_blank" rel="noopener noreferrer"
                          className="text-[10px] text-primary hover:underline flex items-center gap-0.5">
                          <ExternalLink className="w-2.5 h-2.5" />LinkedIn
                        </a>
                      )}
                    </div>
                  )}

                  {/* Trigger event */}
                  {prospect.triggerEvent && (
                    <div className="flex items-start gap-2 p-2 rounded bg-amber-500/10 border border-amber-500/20">
                      <Zap className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-200">{prospect.triggerEvent}</p>
                    </div>
                  )}

                  {/* Fit reason + outreach angle */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {prospect.fitReason && (
                      <div className="p-2 rounded bg-muted/20 border border-border">
                        <p className="text-[10px] font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                          <Target className="w-2.5 h-2.5" />Fit Reason
                        </p>
                        <p className="text-xs text-foreground">{prospect.fitReason}</p>
                      </div>
                    )}
                    {prospect.outreachAngle && (
                      <div className="p-2 rounded bg-primary/10 border border-primary/20">
                        <p className="text-[10px] font-semibold text-primary mb-1">Outreach Angle</p>
                        <p className="text-xs text-foreground">{prospect.outreachAngle}</p>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      {prospect.suggestedProduct && (
                        <Badge variant="outline" className="text-[10px] border-primary/30 text-primary px-1.5 py-0">
                          {prospect.suggestedProduct}
                        </Badge>
                      )}
                      {prospect.sourceCompanyName && (
                        <span className="text-[10px] text-muted-foreground">via {prospect.sourceCompanyName}</span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMutation.mutate({ id: prospect.id })}
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-red-400"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 rounded-lg border border-dashed border-border text-center p-6">
            <Users className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-foreground">No prospects yet</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              Prospects are auto-generated from call transcripts when the AI identifies competitor companies. You can also add them manually.
            </p>
            <Button className="mt-4 gap-2" size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="w-3.5 h-3.5" />Add Manually
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
