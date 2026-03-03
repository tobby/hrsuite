import { useState } from "react";
import { useParams, Link, Redirect } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useRole, canViewAllRequests } from "@/lib/role-context";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type {
  Candidate, JobPosting, Employee, CandidateActivity,
  CandidateNote,
} from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft, Mail, Phone, MapPin, Linkedin, FileText,
  Plus, User, Loader2,
  Activity, ChevronRight,
} from "lucide-react";

type PipelineStage = { key: string; label: string; color: string };

const NOTE_CATEGORIES = ["general", "feedback", "concern", "positive"];

function getStageBadgeVariant(stage: string): "default" | "secondary" | "outline" | "destructive" {
  if (stage === "hired") return "default";
  if (stage === "rejected") return "destructive";
  if (stage === "new") return "secondary";
  if (stage === "withdrawn") return "outline";
  return "default";
}

export default function CandidateDetail() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { role } = useRole();
  const { toast } = useToast();

  if (!canViewAllRequests(role)) {
    return <Redirect to="/" />;
  }

  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);

  const [noteContent, setNoteContent] = useState("");
  const [noteCategory, setNoteCategory] = useState("general");
  const [rejectionReason, setRejectionReason] = useState("");

  const { data: candidate, isLoading: candidateLoading } = useQuery<Candidate>({
    queryKey: ["/api/candidates", id],
    enabled: !!id,
  });

  const { data: activities = [] } = useQuery<CandidateActivity[]>({
    queryKey: ["/api/candidates", id, "activities"],
    enabled: !!id,
  });

  const { data: notes = [] } = useQuery<CandidateNote[]>({
    queryKey: ["/api/candidates", id, "notes"],
    enabled: !!id,
  });

  const { data: jobPostings = [] } = useQuery<JobPosting[]>({
    queryKey: ["/api/job-postings"],
  });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const { data: pipelineStages = [] } = useQuery<PipelineStage[]>({
    queryKey: ["/api/recruitment/pipeline-stages"],
  });

  const getStageLabel = (key: string) => pipelineStages.find(s => s.key === key)?.label || key;

  const getEmployeeName = (empId: string | null) => {
    if (!empId) return "Unknown";
    const emp = employees.find((e) => e.id === empId);
    return emp ? `${emp.firstName} ${emp.lastName}` : "Unknown";
  };

  const job = candidate ? jobPostings.find((j) => j.id === candidate.jobId) : undefined;

  const stageMutation = useMutation({
    mutationFn: async (data: { stage: string; rejectionReason?: string }) => {
      await apiRequest("PATCH", `/api/candidates/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/candidates", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/candidates", id, "activities"] });
      toast({ title: "Stage Updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const assignManagerMutation = useMutation({
    mutationFn: async (assignedManagerId: string) => {
      await apiRequest("PATCH", `/api/candidates/${id}`, { assignedManagerId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/candidates", id] });
      toast({ title: "Manager Assigned" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: async (data: { content: string; category: string }) => {
      await apiRequest("POST", `/api/candidates/${id}/notes`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/candidates", id, "notes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/candidates", id, "activities"] });
      toast({ title: "Note Added" });
      setNoteContent("");
      setNoteCategory("general");
      setIsNoteDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const isAdmin = role === "admin";
  const isManager = role === "manager";
  const isAdminOrManager = isAdmin || isManager;

  const getAvailableStages = () => {
    const stageKeys = pipelineStages.map(s => s.key);
    if (isAdmin) return stageKeys;
    if (isManager) return stageKeys.filter((s) => s !== "offer_extended" && s !== "hired");
    return [];
  };

  if (candidateLoading || pipelineStages.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" data-testid="loading-spinner" />
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="p-6">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <User className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">Candidate not found</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">This candidate may have been removed or does not exist.</p>
          <Link href="/recruitment/candidates">
            <Button variant="outline" className="mt-4" data-testid="button-back-not-found">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Candidates
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <Link href="/recruitment/candidates" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground" data-testid="link-back">
        <ArrowLeft className="h-4 w-4" /> Back to Candidates
      </Link>
      <div>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-lg font-semibold tracking-tight" data-testid="text-candidate-name">
            {candidate.firstName} {candidate.lastName}
          </h1>
          <Badge variant={getStageBadgeVariant(candidate.stage)} data-testid="badge-stage">
            {getStageLabel(candidate.stage)}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground" data-testid="text-candidate-email">{candidate.email}</p>
        {candidate.appliedAt && (
          <p className="text-xs text-muted-foreground" data-testid="text-applied-date">
            Applied {format(new Date(candidate.appliedAt), "MMM d, yyyy")}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="w-full justify-start flex-wrap">
              <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
              <TabsTrigger value="notes" data-testid="tab-notes">Notes</TabsTrigger>
              <TabsTrigger value="timeline" data-testid="tab-timeline">Timeline</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Candidate Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span data-testid="text-fullname">{candidate.firstName} {candidate.lastName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span data-testid="text-email">{candidate.email}</span>
                    </div>
                    {candidate.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span data-testid="text-phone">{candidate.phone}</span>
                      </div>
                    )}
                    {candidate.location && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span data-testid="text-location">{candidate.location}</span>
                      </div>
                    )}
                    {candidate.linkedinUrl && (
                      <div className="flex items-center gap-2 text-sm">
                        <Linkedin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <a href={candidate.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline" data-testid="link-linkedin">
                          LinkedIn Profile
                        </a>
                      </div>
                    )}
                  </div>
                  {candidate.coverLetter && (
                    <div className="pt-3 border-t">
                      <p className="text-sm font-medium mb-1">Cover Letter</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-line" data-testid="text-cover-letter">{candidate.coverLetter}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

            </TabsContent>

            <TabsContent value="notes" className="mt-4 space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="font-medium">Notes</h3>
                <Button size="sm" onClick={() => setIsNoteDialogOpen(true)} data-testid="button-add-note">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Note
                </Button>
              </div>
              {notes.length === 0 ? (
                <p className="text-sm text-muted-foreground" data-testid="text-no-notes">No notes yet.</p>
              ) : (
                <div className="space-y-3">
                  {notes.map((note) => (
                    <Card key={note.id} data-testid={`note-${note.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <Badge variant="outline" className="capitalize" data-testid={`badge-note-category-${note.id}`}>{note.category}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {note.createdAt ? format(new Date(note.createdAt), "MMM d, yyyy h:mm a") : "Unknown"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            by {getEmployeeName(note.createdBy)}
                          </span>
                        </div>
                        <p className="text-sm" data-testid={`text-note-content-${note.id}`}>{note.content}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="timeline" className="mt-4 space-y-4">
              <h3 className="font-medium">Activity Timeline</h3>
              {activities.length === 0 ? (
                <p className="text-sm text-muted-foreground" data-testid="text-no-activities">No activity yet.</p>
              ) : (
                <div className="space-y-3">
                  {activities.map((activity) => (
                    <div key={activity.id} className="flex gap-3 text-sm" data-testid={`activity-${activity.id}`}>
                      <div className="flex-shrink-0 mt-1">
                        <Activity className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <p>{activity.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {activity.createdAt ? format(new Date(activity.createdAt), "MMM d, yyyy h:mm a") : "Unknown"}
                          {activity.createdBy && ` · ${getEmployeeName(activity.createdBy)}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-center mb-3">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="text-xl bg-primary/10 text-primary">
                    {candidate.firstName[0]}{candidate.lastName[0]}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="space-y-2">
                {job && (
                  <div className="flex items-start gap-2 text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <span data-testid="text-job-title">{job.title}</span>
                  </div>
                )}
                <div className="flex items-start gap-2 text-sm">
                  <ChevronRight className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <span data-testid="text-source">Source: {candidate.source}</span>
                </div>
                {candidate.phone && (
                  <div className="flex items-start gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <span>{candidate.phone}</span>
                  </div>
                )}
                {candidate.location && (
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <span>{candidate.location}</span>
                  </div>
                )}
                {candidate.linkedinUrl && (
                  <div className="flex items-start gap-2 text-sm">
                    <Linkedin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <a href={candidate.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">
                      LinkedIn
                    </a>
                  </div>
                )}
                {candidate.resumeFileName && (
                  <div className="flex items-start gap-2 text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    {candidate.resumeFileUrl ? (
                      <a href={candidate.resumeFileUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate" data-testid="link-resume">{candidate.resumeFileName}</a>
                    ) : (
                      <span data-testid="text-resume">{candidate.resumeFileName}</span>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Stage Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm text-muted-foreground">Current Stage</Label>
                <p className="font-medium" data-testid="text-current-stage">{getStageLabel(candidate.stage)}</p>
              </div>
              {isAdminOrManager && (
                <div className="space-y-2">
                  <Label>Change Stage</Label>
                  <Select
                    value={candidate.stage}
                    onValueChange={(value) => {
                      if (value === "rejected") {
                        setRejectionReason("");
                      }
                      stageMutation.mutate({ stage: value, rejectionReason: value === "rejected" ? rejectionReason : undefined });
                    }}
                    data-testid="select-stage"
                  >
                    <SelectTrigger data-testid="select-stage-trigger">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableStages().map((stage) => (
                        <SelectItem key={stage} value={stage} data-testid={`select-stage-option-${stage}`}>
                          {getStageLabel(stage)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {candidate.stage === "rejected" && (
                    <div className="space-y-1">
                      <Label className="text-sm">Rejection Reason</Label>
                      <Textarea
                        placeholder="Enter rejection reason..."
                        value={candidate.rejectionReason || ""}
                        onChange={(e) => {
                          stageMutation.mutate({ stage: "rejected", rejectionReason: e.target.value });
                        }}
                        data-testid="input-rejection-reason"
                      />
                    </div>
                  )}
                </div>
              )}
              {isAdmin && (
                <div className="space-y-2">
                  <Label>Assign Manager</Label>
                  <Select
                    value={candidate.assignedManagerId || ""}
                    onValueChange={(value) => assignManagerMutation.mutate(value)}
                    data-testid="select-assign-manager"
                  >
                    <SelectTrigger data-testid="select-assign-manager-trigger">
                      <SelectValue placeholder="Select manager" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees
                        .filter((e) => e.role === "manager" || e.role === "admin")
                        .map((emp) => (
                          <SelectItem key={emp.id} value={emp.id} data-testid={`select-manager-option-${emp.id}`}>
                            {emp.firstName} {emp.lastName}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Note</DialogTitle>
            <DialogDescription>Add a note about this candidate.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={noteCategory} onValueChange={setNoteCategory} data-testid="select-note-category">
                <SelectTrigger data-testid="select-note-category-trigger">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NOTE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat} className="capitalize">{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Note</Label>
              <Textarea
                placeholder="Enter your note..."
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                data-testid="input-note-content"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNoteDialogOpen(false)} data-testid="button-cancel-note">Cancel</Button>
            <Button
              onClick={() => addNoteMutation.mutate({ content: noteContent, category: noteCategory })}
              disabled={!noteContent.trim() || addNoteMutation.isPending}
              data-testid="button-save-note"
            >
              {addNoteMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Save Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
