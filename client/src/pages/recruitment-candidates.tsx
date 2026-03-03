import { useState } from "react";
import { Link, Redirect } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import type { Candidate, JobPosting } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useRole } from "@/lib/role-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination, usePagination } from "@/components/ui/table-pagination";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { LayoutGrid, List, Search, MoreHorizontal, Eye, GripVertical, Inbox, Plus } from "lucide-react";

type PipelineStage = { key: string; label: string; color: string };

function hexToLightBg(hex: string): string {
  if (/^#[0-9a-fA-F]{6}$/.test(hex)) return `${hex}15`;
  return "#6b728015";
}

function getStageBadgeVariant(key: string): "default" | "secondary" | "outline" | "destructive" {
  if (key === "rejected") return "destructive";
  if (key === "new") return "secondary";
  if (key === "withdrawn") return "outline";
  return "default";
}

const SOURCE_OPTIONS = ["website", "referral", "linkedin", "job_board", "agency", "direct", "other"] as const;

export default function RecruitmentCandidates() {
  const { role, currentUser } = useRole();
  const { toast } = useToast();

  if (role !== "admin" && role !== "manager") {
    return <Redirect to="/" />;
  }

  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [searchTerm, setSearchTerm] = useState("");
  const [jobFilter, setJobFilter] = useState<string>("all");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [draggedCandidate, setDraggedCandidate] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newCandidate, setNewCandidate] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    jobId: "",
    source: "website",
    location: "",
  });

  const { data: candidates = [], isLoading: candidatesLoading } = useQuery<Candidate[]>({
    queryKey: ["/api/candidates"],
  });

  const { data: jobPostings = [], isLoading: jobsLoading } = useQuery<JobPosting[]>({
    queryKey: ["/api/job-postings"],
  });

  const { data: pipelineStages = [] } = useQuery<PipelineStage[]>({
    queryKey: ["/api/recruitment/pipeline-stages"],
  });

  const getStageLabel = (key: string) => pipelineStages.find(s => s.key === key)?.label || key;
  const getStageColor = (key: string) => pipelineStages.find(s => s.key === key)?.color || "#6b7280";

  const stageMutation = useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: string }) => {
      await apiRequest("PATCH", `/api/candidates/${id}`, { stage });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
    },
  });

  const addCandidateMutation = useMutation({
    mutationFn: async (data: typeof newCandidate) => {
      await apiRequest("POST", "/api/candidates", {
        ...data,
        companyId: currentUser.companyId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      setAddDialogOpen(false);
      setNewCandidate({ firstName: "", lastName: "", email: "", phone: "", jobId: "", source: "website", location: "" });
      toast({ title: "Candidate Added", description: "New candidate has been added successfully." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const isLoading = candidatesLoading || jobsLoading || pipelineStages.length === 0;

  const getJobTitle = (jobId: string) => jobPostings.find((j) => j.id === jobId)?.title || "Unknown";

  const filteredCandidates = candidates.filter((c) => {
    const matchesSearch =
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesJob = jobFilter === "all" || c.jobId === jobFilter;
    const matchesStage = stageFilter === "all" || c.stage === stageFilter;
    return matchesSearch && matchesJob && matchesStage;
  });

  const { currentPage, totalPages, paginatedItems: paginatedCandidates, setCurrentPage, totalItems, pageSize } = usePagination(filteredCandidates, 10);

  const getCandidatesByStage = (stage: string) =>
    filteredCandidates.filter((c) => c.stage === stage);

  const handleDragStart = (candidateId: string) => {
    setDraggedCandidate(candidateId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, stage: string) => {
    e.preventDefault();
    if (!draggedCandidate) return;

    const candidate = candidates.find((c) => c.id === draggedCandidate);
    if (!candidate || candidate.stage === stage) {
      setDraggedCandidate(null);
      return;
    }

    if ((stage === "offer_extended" || stage === "hired") && role !== "admin") {
      toast({ title: "Permission Denied", description: "Only admins can move candidates to this stage.", variant: "destructive" });
      setDraggedCandidate(null);
      return;
    }

    stageMutation.mutate(
      { id: draggedCandidate, stage },
      {
        onSuccess: () => {
          toast({
            title: "Candidate Moved",
            description: `${candidate.firstName} ${candidate.lastName} moved to ${getStageLabel(stage)}`,
          });
        },
      }
    );
    setDraggedCandidate(null);
  };

  const handleStageChange = (candidateId: string, newStage: string) => {
    if ((newStage === "offer_extended" || newStage === "hired") && role !== "admin") {
      toast({ title: "Permission Denied", description: "Only admins can move candidates to this stage.", variant: "destructive" });
      return;
    }

    const candidate = candidates.find((c) => c.id === candidateId);
    stageMutation.mutate(
      { id: candidateId, stage: newStage },
      {
        onSuccess: () => {
          toast({
            title: "Stage Updated",
            description: `${candidate?.firstName} ${candidate?.lastName} moved to ${getStageLabel(newStage)}`,
          });
        },
      }
    );
  };

  const handleAddCandidate = () => {
    if (!newCandidate.firstName || !newCandidate.lastName || !newCandidate.email || !newCandidate.jobId) {
      toast({ title: "Validation Error", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    addCandidateMutation.mutate(newCandidate);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-72" />
          </div>
        </div>
        <div className="flex gap-4">
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 w-[250px]" />
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-72">
              <Skeleton className="h-[500px] rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg font-semibold tracking-tight" data-testid="text-page-title">Candidate Pipeline</h1>
          <p className="text-muted-foreground">Track and manage your candidates through the hiring process</p>
        </div>
        <div className="flex items-center gap-2">
          {role === "admin" && (
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-candidate">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Candidate
                </Button>
              </DialogTrigger>
              <DialogContent data-testid="dialog-add-candidate">
                <DialogHeader>
                  <DialogTitle>Add Candidate</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        value={newCandidate.firstName}
                        onChange={(e) => setNewCandidate((prev) => ({ ...prev, firstName: e.target.value }))}
                        data-testid="input-candidate-first-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        value={newCandidate.lastName}
                        onChange={(e) => setNewCandidate((prev) => ({ ...prev, lastName: e.target.value }))}
                        data-testid="input-candidate-last-name"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newCandidate.email}
                      onChange={(e) => setNewCandidate((prev) => ({ ...prev, email: e.target.value }))}
                      data-testid="input-candidate-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={newCandidate.phone}
                      onChange={(e) => setNewCandidate((prev) => ({ ...prev, phone: e.target.value }))}
                      data-testid="input-candidate-phone"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="jobId">Job Posting *</Label>
                    <Select
                      value={newCandidate.jobId}
                      onValueChange={(val) => setNewCandidate((prev) => ({ ...prev, jobId: val }))}
                    >
                      <SelectTrigger data-testid="select-candidate-job">
                        <SelectValue placeholder="Select a job posting" />
                      </SelectTrigger>
                      <SelectContent>
                        {jobPostings.map((job) => (
                          <SelectItem key={job.id} value={job.id}>
                            {job.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="source">Source</Label>
                    <Select
                      value={newCandidate.source}
                      onValueChange={(val) => setNewCandidate((prev) => ({ ...prev, source: val }))}
                    >
                      <SelectTrigger data-testid="select-candidate-source">
                        <SelectValue placeholder="Select source" />
                      </SelectTrigger>
                      <SelectContent>
                        {SOURCE_OPTIONS.map((src) => (
                          <SelectItem key={src} value={src}>
                            {src.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={newCandidate.location}
                      onChange={(e) => setNewCandidate((prev) => ({ ...prev, location: e.target.value }))}
                      data-testid="input-candidate-location"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddDialogOpen(false)} data-testid="button-cancel-add-candidate">
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddCandidate}
                    disabled={addCandidateMutation.isPending}
                    data-testid="button-submit-add-candidate"
                  >
                    {addCandidateMutation.isPending ? "Adding..." : "Add Candidate"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          <div className="flex items-center border rounded-md">
            <Button
              variant={viewMode === "kanban" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("kanban")}
              data-testid="button-view-kanban"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "table" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("table")}
              data-testid="button-view-table"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search candidates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search-candidates"
          />
        </div>
        <Select value={jobFilter} onValueChange={setJobFilter}>
          <SelectTrigger className="w-full md:w-[250px]" data-testid="select-job-filter">
            <SelectValue placeholder="Filter by job" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Jobs</SelectItem>
            {jobPostings.map((job) => (
              <SelectItem key={job.id} value={job.id}>
                {job.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {viewMode === "table" && (
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-full md:w-[200px]" data-testid="select-stage-filter">
              <SelectValue placeholder="Filter by stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              {pipelineStages.map((stage) => (
                <SelectItem key={stage.key} value={stage.key}>
                  {stage.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {candidates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Inbox className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground" data-testid="text-no-candidates">No candidates yet</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">Candidates will appear here once they apply to your job postings.</p>
        </div>
      ) : viewMode === "kanban" ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {pipelineStages.map((stageConfig) => {
            const stage = stageConfig.key;
            const stageCandidates = getCandidatesByStage(stage);
            return (
              <div
                key={stage}
                className="flex-shrink-0 w-72 rounded-lg"
                style={{ backgroundColor: hexToLightBg(stageConfig.color) }}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage)}
                data-testid={`column-${stage}`}
              >
                <div className="p-3 border-b border-border/50">
                  <div className="flex items-center justify-between gap-1">
                    <h3 className="font-medium text-sm" data-testid={`text-stage-label-${stage}`}>
                      {stageConfig.label} ({stageCandidates.length})
                    </h3>
                  </div>
                </div>
                <div className="p-2 space-y-2 min-h-[400px]">
                  {stageCandidates.map((candidate) => (
                    <Card
                      key={candidate.id}
                      className="cursor-grab active:cursor-grabbing hover-elevate"
                      draggable
                      onDragStart={() => handleDragStart(candidate.id)}
                      data-testid={`card-candidate-${candidate.id}`}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start gap-2">
                          <GripVertical className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                  {candidate.firstName[0]}{candidate.lastName[0]}
                                </AvatarFallback>
                              </Avatar>
                              <Link href={`/recruitment/candidates/${candidate.id}`}>
                                <span className="font-medium text-sm truncate hover:underline cursor-pointer" data-testid={`link-candidate-${candidate.id}`}>
                                  {candidate.firstName} {candidate.lastName}
                                </span>
                              </Link>
                            </div>
                            <p className="text-xs text-muted-foreground truncate mb-1" data-testid={`text-job-title-${candidate.id}`}>
                              {getJobTitle(candidate.jobId)}
                            </p>
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <Badge variant="outline" className="text-xs" data-testid={`badge-source-${candidate.id}`}>
                                {candidate.source}
                              </Badge>
                              {candidate.appliedAt && (
                                <span className="text-xs text-muted-foreground" data-testid={`text-applied-date-${candidate.id}`}>
                                  {format(new Date(candidate.appliedAt), "MMM d, yyyy")}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <Link href={`/recruitment/candidates/${candidate.id}`}>
                                <Button variant="ghost" size="sm" data-testid={`button-view-candidate-${candidate.id}`}>
                                  <Eye className="h-3 w-3 mr-1" />
                                  View
                                </Button>
                              </Link>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" data-testid={`button-candidate-actions-${candidate.id}`}>
                                    <MoreHorizontal className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {pipelineStages.filter((s) => s.key !== candidate.stage).map((s) => (
                                    <DropdownMenuItem
                                      key={s.key}
                                      onClick={() => handleStageChange(candidate.id, s.key)}
                                      data-testid={`menu-move-${candidate.id}-${s.key}`}
                                    >
                                      Move to {s.label}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidate</TableHead>
                <TableHead>Job</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Applied</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedCandidates.map((candidate) => (
                <TableRow key={candidate.id} data-testid={`row-candidate-${candidate.id}`}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {candidate.firstName[0]}{candidate.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <Link href={`/recruitment/candidates/${candidate.id}`}>
                        <span className="font-medium hover:underline cursor-pointer" data-testid={`link-candidate-table-${candidate.id}`}>
                          {candidate.firstName} {candidate.lastName}
                        </span>
                      </Link>
                    </div>
                  </TableCell>
                  <TableCell data-testid={`text-job-${candidate.id}`}>{getJobTitle(candidate.jobId)}</TableCell>
                  <TableCell data-testid={`text-email-${candidate.id}`}>{candidate.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline" data-testid={`badge-source-table-${candidate.id}`}>
                      {candidate.source}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStageBadgeVariant(candidate.stage)} data-testid={`badge-stage-${candidate.id}`}>
                      {getStageLabel(candidate.stage)}
                    </Badge>
                  </TableCell>
                  <TableCell data-testid={`text-applied-${candidate.id}`}>
                    {candidate.appliedAt
                      ? format(new Date(candidate.appliedAt), "MMM d, yyyy")
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Link href={`/recruitment/candidates/${candidate.id}`}>
                        <Button variant="ghost" size="icon" data-testid={`button-view-table-${candidate.id}`}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid={`button-actions-table-${candidate.id}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {pipelineStages.filter((s) => s.key !== candidate.stage).map((s) => (
                            <DropdownMenuItem
                              key={s.key}
                              onClick={() => handleStageChange(candidate.id, s.key)}
                              data-testid={`menu-move-table-${candidate.id}-${s.key}`}
                            >
                              Move to {s.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={totalItems}
            pageSize={pageSize}
          />
        </Card>
      )}
    </div>
  );
}
