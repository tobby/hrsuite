import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useRole } from "@/lib/role-context";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { AppraisalCycle, AppraisalTemplate } from "@shared/schema";
import { ArrowLeft, Plus, Calendar, ChevronRight, Users, Inbox } from "lucide-react";
import { format } from "date-fns";

const statusConfig: Record<string, { label: string; variant: "outline" | "secondary" | "default"; className: string }> = {
  draft: { label: "Draft", variant: "outline", className: "" },
  active: { label: "Active", variant: "secondary", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
  completed: { label: "Completed", variant: "secondary", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
};

export default function AppraisalCycles() {
  const { role } = useRole();
  const { toast } = useToast();
  const isAdmin = role === "admin";

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<string>("360");
  const [newTemplateId, setNewTemplateId] = useState("");
  const [newStartDate, setNewStartDate] = useState("");
  const [newEndDate, setNewEndDate] = useState("");
  const [newSelfWeight, setNewSelfWeight] = useState(10);
  const [newPeerWeight, setNewPeerWeight] = useState(30);
  const [newManagerWeight, setNewManagerWeight] = useState(60);

  const { data: cycles = [], isLoading: cyclesLoading } = useQuery<AppraisalCycle[]>({
    queryKey: ["/api/appraisal-cycles"],
  });

  const { data: templates = [] } = useQuery<AppraisalTemplate[]>({
    queryKey: ["/api/appraisal-templates"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("POST", "/api/appraisal-cycles", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appraisal-cycles"] });
      toast({ title: "Cycle created", description: "The review cycle has been created successfully." });
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  function resetForm() {
    setNewName("");
    setNewType("360");
    setNewTemplateId("");
    setNewStartDate("");
    setNewEndDate("");
    setNewSelfWeight(10);
    setNewPeerWeight(30);
    setNewManagerWeight(60);
  }

  function handleOpenCreate() {
    resetForm();
    setIsCreateOpen(true);
  }

  function handleTypeChange(type: string) {
    setNewType(type);
    if (type === "180") {
      setNewPeerWeight(0);
      setNewSelfWeight(40);
      setNewManagerWeight(60);
    } else {
      setNewSelfWeight(10);
      setNewPeerWeight(30);
      setNewManagerWeight(60);
    }
  }

  function handleCreateCycle() {
    if (!newName.trim()) {
      toast({ title: "Validation Error", description: "Please enter a cycle name.", variant: "destructive" });
      return;
    }
    if (!newTemplateId) {
      toast({ title: "Validation Error", description: "Please select a template.", variant: "destructive" });
      return;
    }
    if (!newStartDate || !newEndDate) {
      toast({ title: "Validation Error", description: "Please select start and end dates.", variant: "destructive" });
      return;
    }
    const totalWeight = newSelfWeight + newPeerWeight + newManagerWeight;
    if (totalWeight !== 100) {
      toast({ title: "Validation Error", description: `Weights must sum to 100%. Current total: ${totalWeight}%.`, variant: "destructive" });
      return;
    }

    createMutation.mutate({
      companyId: "placeholder",
      name: newName.trim(),
      type: newType,
      templateId: newTemplateId,
      startDate: newStartDate,
      endDate: newEndDate,
      selfWeight: newSelfWeight,
      peerWeight: newPeerWeight,
      managerWeight: newManagerWeight,
      status: "draft",
    });
  }

  function getTemplateName(templateId: string | null) {
    if (!templateId) return null;
    const t = templates.find((tmpl) => tmpl.id === templateId);
    return t ? t.name : null;
  }

  const weightTotal = newSelfWeight + newPeerWeight + newManagerWeight;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Link href="/appraisals">
              <Button variant="ghost" size="icon" data-testid="link-back-appraisals">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-lg font-semibold tracking-tight" data-testid="text-cycles-title">
              Review Cycles
            </h1>
          </div>
          <p className="text-muted-foreground text-sm">
            {isAdmin ? "Create and manage performance review cycles" : "View performance review cycles"}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={handleOpenCreate} data-testid="button-new-cycle">
            <Plus className="h-4 w-4 mr-2" />
            New Cycle
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {cyclesLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                    <Skeleton className="h-6 w-24" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : cycles.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Inbox className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <h3 className="font-medium mb-1">No review cycles yet</h3>
              <p className="text-sm text-muted-foreground">
                {isAdmin
                  ? "Create your first review cycle to start evaluating employee performance."
                  : "No review cycles have been created yet."}
              </p>
            </CardContent>
          </Card>
        ) : (
          cycles.map((cycle) => (
            <CycleCard
              key={cycle.id}
              cycle={cycle}
              templateName={getTemplateName(cycle.templateId)}
            />
          ))
        )}
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[500px]" data-testid="dialog-create-cycle">
          <DialogHeader>
            <DialogTitle>Create Review Cycle</DialogTitle>
            <DialogDescription>
              Set up a new performance review cycle. Configure the review type, template, dates, and weight distribution.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cycle-name">Name</Label>
              <Input
                id="cycle-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Q1 2026 Performance Review"
                data-testid="input-cycle-name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={newType} onValueChange={handleTypeChange}>
                  <SelectTrigger data-testid="select-cycle-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="180">180 Review</SelectItem>
                    <SelectItem value="360">360 Review</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Template</Label>
                <Select value={newTemplateId} onValueChange={setNewTemplateId}>
                  <SelectTrigger data-testid="select-cycle-template">
                    <SelectValue placeholder="Select template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((tmpl) => (
                      <SelectItem key={tmpl.id} value={tmpl.id}>
                        {tmpl.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cycle-start-date">Start Date</Label>
                <Input
                  id="cycle-start-date"
                  type="date"
                  value={newStartDate}
                  onChange={(e) => setNewStartDate(e.target.value)}
                  data-testid="input-cycle-start-date"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cycle-end-date">End Date</Label>
                <Input
                  id="cycle-end-date"
                  type="date"
                  value={newEndDate}
                  onChange={(e) => setNewEndDate(e.target.value)}
                  data-testid="input-cycle-end-date"
                />
              </div>
            </div>
            <div className="space-y-3">
              <Label>Weight Distribution</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="weight-self" className="text-xs text-muted-foreground">Self Weight (%)</Label>
                  <Input
                    id="weight-self"
                    type="number"
                    min={0}
                    max={100}
                    value={newSelfWeight}
                    onChange={(e) => setNewSelfWeight(Number(e.target.value))}
                    data-testid="input-weight-self"
                  />
                </div>
                {newType === "360" && (
                  <div className="space-y-1">
                    <Label htmlFor="weight-peer" className="text-xs text-muted-foreground">Peer Weight (%)</Label>
                    <Input
                      id="weight-peer"
                      type="number"
                      min={0}
                      max={100}
                      value={newPeerWeight}
                      onChange={(e) => setNewPeerWeight(Number(e.target.value))}
                      data-testid="input-weight-peer"
                    />
                  </div>
                )}
                <div className="space-y-1">
                  <Label htmlFor="weight-manager" className="text-xs text-muted-foreground">Manager Weight (%)</Label>
                  <Input
                    id="weight-manager"
                    type="number"
                    min={0}
                    max={100}
                    value={newManagerWeight}
                    onChange={(e) => setNewManagerWeight(Number(e.target.value))}
                    data-testid="input-weight-manager"
                  />
                </div>
              </div>
              <p className={`text-xs ${weightTotal === 100 ? "text-muted-foreground" : "text-destructive"}`} data-testid="text-weight-total">
                Total: {weightTotal}% {weightTotal !== 100 ? "(must equal 100%)" : ""}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} data-testid="button-cancel-cycle">
              Cancel
            </Button>
            <Button onClick={handleCreateCycle} disabled={createMutation.isPending} data-testid="button-confirm-create-cycle">
              {createMutation.isPending ? "Creating..." : "Create Cycle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CycleCard({ cycle, templateName }: { cycle: AppraisalCycle; templateName: string | null }) {
  const config = statusConfig[cycle.status] || statusConfig.draft;
  const typeLabel = cycle.type === "360" ? "360" : "180";

  return (
    <Link href={`/appraisals/cycles/${cycle.id}`}>
      <Card className="hover-elevate cursor-pointer" data-testid={`card-cycle-${cycle.id}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Calendar className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                <span className="font-medium truncate" data-testid={`text-cycle-name-${cycle.id}`}>
                  {cycle.name}
                </span>
                <Badge variant="outline" data-testid={`badge-type-${cycle.id}`}>
                  {typeLabel}
                </Badge>
                <Badge variant={config.variant} className={config.className} data-testid={`badge-status-${cycle.id}`}>
                  {config.label}
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                <span data-testid={`text-cycle-dates-${cycle.id}`}>
                  {format(new Date(cycle.startDate), "MMM d, yyyy")} - {format(new Date(cycle.endDate), "MMM d, yyyy")}
                </span>
                {templateName && (
                  <span data-testid={`text-cycle-template-${cycle.id}`}>
                    Template: {templateName}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                <span data-testid={`text-cycle-weights-${cycle.id}`}>
                  Self: {cycle.selfWeight}%
                  {cycle.peerWeight > 0 ? ` | Peer: ${cycle.peerWeight}%` : ""}
                  {" "}| Manager: {cycle.managerWeight}%
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
