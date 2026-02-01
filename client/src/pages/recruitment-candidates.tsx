import { useState } from "react";
import { Link, Redirect } from "wouter";
import { useRecruitmentStore, CandidateStage } from "@/lib/recruitment-store";
import { employees } from "@/lib/demo-data";
import { useToast } from "@/hooks/use-toast";
import { useRole, canEditOrgSettings } from "@/lib/role-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LayoutGrid, List, Search, MoreHorizontal, Eye, ChevronRight, ChevronLeft, GripVertical } from "lucide-react";

const PIPELINE_STAGES: { key: CandidateStage; label: string; color: string }[] = [
  { key: "applied", label: "Applied", color: "bg-gray-100 dark:bg-gray-800" },
  { key: "screening", label: "Screening", color: "bg-blue-100 dark:bg-blue-900/30" },
  { key: "interview", label: "Interview", color: "bg-purple-100 dark:bg-purple-900/30" },
  { key: "offer", label: "Offer", color: "bg-amber-100 dark:bg-amber-900/30" },
  { key: "hired", label: "Hired", color: "bg-green-100 dark:bg-green-900/30" },
  { key: "rejected", label: "Rejected", color: "bg-red-100 dark:bg-red-900/30" },
];

export default function RecruitmentCandidates() {
  const { role } = useRole();
  const { toast } = useToast();
  const { candidates, jobs, updateCandidateStage } = useRecruitmentStore();

  if (!canEditOrgSettings(role)) {
    return <Redirect to="/" />;
  }
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [searchTerm, setSearchTerm] = useState("");
  const [jobFilter, setJobFilter] = useState<string>("all");
  const [draggedCandidate, setDraggedCandidate] = useState<string | null>(null);

  const getJobTitle = (jobId: string) => jobs.find((j) => j.id === jobId)?.title || "Unknown";

  const filteredCandidates = candidates.filter((c) => {
    const matchesSearch =
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesJob = jobFilter === "all" || c.jobId === jobFilter;
    return matchesSearch && matchesJob;
  });

  const getCandidatesByStage = (stage: CandidateStage) =>
    filteredCandidates.filter((c) => c.stage === stage);

  const getStageBadge = (stage: string) => {
    const stageInfo = PIPELINE_STAGES.find((s) => s.key === stage);
    const variants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
      applied: "secondary",
      screening: "default",
      interview: "default",
      offer: "default",
      hired: "default",
      rejected: "destructive",
    };
    return (
      <Badge variant={variants[stage] || "outline"}>
        {stageInfo?.label || stage}
      </Badge>
    );
  };

  const handleDragStart = (candidateId: string) => {
    setDraggedCandidate(candidateId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, stage: CandidateStage) => {
    e.preventDefault();
    if (draggedCandidate) {
      const candidate = candidates.find((c) => c.id === draggedCandidate);
      if (candidate && candidate.stage !== stage) {
        updateCandidateStage(draggedCandidate, stage);
        toast({
          title: "Candidate Moved",
          description: `${candidate.firstName} ${candidate.lastName} moved to ${PIPELINE_STAGES.find((s) => s.key === stage)?.label}`,
        });
      }
    }
    setDraggedCandidate(null);
  };

  const handleMoveCandidate = (candidateId: string, direction: "next" | "prev") => {
    const candidate = candidates.find((c) => c.id === candidateId);
    if (!candidate) return;

    const currentIndex = PIPELINE_STAGES.findIndex((s) => s.key === candidate.stage);
    let newIndex = direction === "next" ? currentIndex + 1 : currentIndex - 1;

    if (newIndex >= 0 && newIndex < PIPELINE_STAGES.length) {
      const newStage = PIPELINE_STAGES[newIndex].key;
      updateCandidateStage(candidateId, newStage);
      toast({
        title: "Candidate Moved",
        description: `${candidate.firstName} ${candidate.lastName} moved to ${PIPELINE_STAGES[newIndex].label}`,
      });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Candidate Pipeline</h1>
          <p className="text-muted-foreground">Track and manage your candidates through the hiring process</p>
        </div>
        <div className="flex items-center gap-2">
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
            {jobs.map((job) => (
              <SelectItem key={job.id} value={job.id}>
                {job.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {viewMode === "kanban" ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {PIPELINE_STAGES.map((stage) => {
            const stageCandidates = getCandidatesByStage(stage.key);
            return (
              <div
                key={stage.key}
                className={`flex-shrink-0 w-72 rounded-lg ${stage.color}`}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage.key)}
                data-testid={`column-${stage.key}`}
              >
                <div className="p-3 border-b border-border/50">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">{stage.label}</h3>
                    <Badge variant="outline" className="text-xs">
                      {stageCandidates.length}
                    </Badge>
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
                              <span className="font-medium text-sm truncate">
                                {candidate.firstName} {candidate.lastName}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground truncate mb-2">
                              {getJobTitle(candidate.jobId)}
                            </p>
                            <div className="flex items-center gap-1">
                              <Link href={`/recruitment/candidates/${candidate.id}`}>
                                <Button variant="ghost" size="sm" className="h-7 px-2">
                                  <Eye className="h-3 w-3 mr-1" />
                                  View
                                </Button>
                              </Link>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7">
                                    <MoreHorizontal className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {stage.key !== "applied" && (
                                    <DropdownMenuItem onClick={() => handleMoveCandidate(candidate.id, "prev")}>
                                      <ChevronLeft className="h-4 w-4 mr-2" />
                                      Move Back
                                    </DropdownMenuItem>
                                  )}
                                  {stage.key !== "rejected" && stage.key !== "hired" && (
                                    <DropdownMenuItem onClick={() => handleMoveCandidate(candidate.id, "next")}>
                                      <ChevronRight className="h-4 w-4 mr-2" />
                                      Move Forward
                                    </DropdownMenuItem>
                                  )}
                                  {stage.key !== "rejected" && (
                                    <DropdownMenuItem 
                                      onClick={() => {
                                        updateCandidateStage(candidate.id, "rejected");
                                        toast({ title: "Candidate Rejected" });
                                      }}
                                      className="text-destructive"
                                    >
                                      Reject
                                    </DropdownMenuItem>
                                  )}
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
                <TableHead>Stage</TableHead>
                <TableHead>Applied</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCandidates.map((candidate) => (
                <TableRow key={candidate.id} data-testid={`row-candidate-${candidate.id}`}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {candidate.firstName[0]}{candidate.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">
                        {candidate.firstName} {candidate.lastName}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{getJobTitle(candidate.jobId)}</TableCell>
                  <TableCell>{candidate.email}</TableCell>
                  <TableCell>{getStageBadge(candidate.stage)}</TableCell>
                  <TableCell>
                    {candidate.appliedAt
                      ? new Date(candidate.appliedAt).toLocaleDateString()
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Link href={`/recruitment/candidates/${candidate.id}`}>
                        <Button variant="ghost" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {PIPELINE_STAGES.filter((s) => s.key !== candidate.stage).map((stage) => (
                            <DropdownMenuItem
                              key={stage.key}
                              onClick={() => {
                                updateCandidateStage(candidate.id, stage.key);
                                toast({
                                  title: "Stage Updated",
                                  description: `Moved to ${stage.label}`,
                                });
                              }}
                            >
                              Move to {stage.label}
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
        </Card>
      )}
    </div>
  );
}
