import { useState } from "react";
import { useParams, Link, Redirect } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useRole, canViewAllRequests } from "@/lib/role-context";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type {
  Candidate, JobPosting, Employee, CandidateActivity,
  CandidateNote, CandidateInterview, CandidateAssessment,
  CandidateCommunication,
} from "@shared/schema";
import { PIPELINE_STAGES } from "@shared/schema";
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
  ArrowLeft, Mail, Phone, MapPin, Linkedin, FileText, Star, Calendar,
  Clock, Send, Plus, User, Loader2, MessageSquare, StickyNote,
  Activity, ChevronRight, Link as LinkIcon,
} from "lucide-react";

const STAGE_LABELS: Record<string, string> = {
  new: "New Application",
  screening: "Screening",
  manager_review: "Manager Review",
  phone_interview: "Phone Interview",
  technical_interview: "Technical Interview",
  final_interview: "Final Interview",
  offer_extended: "Offer Extended",
  hired: "Hired",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

const NOTE_CATEGORIES = ["general", "feedback", "concern", "positive"];
const INTERVIEW_TYPES = ["screening", "phone", "technical", "hr", "final", "panel"];
const RECOMMENDATION_OPTIONS = ["strong_yes", "yes", "maybe", "no"];
const DECISION_OPTIONS = ["move_forward", "reject", "hold"];

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
  const [isAssessmentDialogOpen, setIsAssessmentDialogOpen] = useState(false);
  const [isInterviewDialogOpen, setIsInterviewDialogOpen] = useState(false);
  const [isCommunicationDialogOpen, setIsCommunicationDialogOpen] = useState(false);
  const [isFeedbackDialogOpen, setIsFeedbackDialogOpen] = useState(false);
  const [selectedInterviewId, setSelectedInterviewId] = useState<string | null>(null);

  const [noteContent, setNoteContent] = useState("");
  const [noteCategory, setNoteCategory] = useState("general");
  const [assessmentCategory, setAssessmentCategory] = useState("");
  const [assessmentScore, setAssessmentScore] = useState("3");
  const [assessmentComments, setAssessmentComments] = useState("");
  const [interviewerId, setInterviewerId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [interviewDuration, setInterviewDuration] = useState("60");
  const [interviewType, setInterviewType] = useState("screening");
  const [meetingLink, setMeetingLink] = useState("");
  const [meetingLocation, setMeetingLocation] = useState("");
  const [commSubject, setCommSubject] = useState("");
  const [commBody, setCommBody] = useState("");
  const [feedbackRating, setFeedbackRating] = useState("3");
  const [feedbackStrengths, setFeedbackStrengths] = useState("");
  const [feedbackWeaknesses, setFeedbackWeaknesses] = useState("");
  const [feedbackRecommendation, setFeedbackRecommendation] = useState("yes");
  const [feedbackDecision, setFeedbackDecision] = useState("move_forward");
  const [feedbackNotes, setFeedbackNotes] = useState("");
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

  const { data: interviews = [] } = useQuery<CandidateInterview[]>({
    queryKey: ["/api/candidates", id, "interviews"],
    enabled: !!id,
  });

  const { data: assessments = [] } = useQuery<CandidateAssessment[]>({
    queryKey: ["/api/candidates", id, "assessments"],
    enabled: !!id,
  });

  const { data: communications = [] } = useQuery<CandidateCommunication[]>({
    queryKey: ["/api/candidates", id, "communications"],
    enabled: !!id,
  });

  const { data: jobPostings = [] } = useQuery<JobPosting[]>({
    queryKey: ["/api/job-postings"],
  });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

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

  const addAssessmentMutation = useMutation({
    mutationFn: async (data: { category: string; score: number; comments: string }) => {
      await apiRequest("POST", `/api/candidates/${id}/assessments`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/candidates", id, "assessments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/candidates", id, "activities"] });
      toast({ title: "Assessment Added" });
      setAssessmentCategory("");
      setAssessmentScore("3");
      setAssessmentComments("");
      setIsAssessmentDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const scheduleInterviewMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      await apiRequest("POST", `/api/candidates/${id}/interviews`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/candidates", id, "interviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/candidates", id, "activities"] });
      toast({ title: "Interview Scheduled" });
      setInterviewerId("");
      setScheduledAt("");
      setInterviewDuration("60");
      setInterviewType("screening");
      setMeetingLink("");
      setMeetingLocation("");
      setIsInterviewDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const submitFeedbackMutation = useMutation({
    mutationFn: async (data: { interviewId: string; feedback: Record<string, unknown> }) => {
      await apiRequest("PATCH", `/api/interviews/${data.interviewId}/feedback`, data.feedback);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/candidates", id, "interviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/candidates", id, "activities"] });
      toast({ title: "Feedback Submitted" });
      setIsFeedbackDialogOpen(false);
      setSelectedInterviewId(null);
      setFeedbackRating("3");
      setFeedbackStrengths("");
      setFeedbackWeaknesses("");
      setFeedbackRecommendation("yes");
      setFeedbackDecision("move_forward");
      setFeedbackNotes("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const sendCommunicationMutation = useMutation({
    mutationFn: async (data: { subject: string; body: string }) => {
      await apiRequest("POST", `/api/candidates/${id}/communications`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/candidates", id, "communications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/candidates", id, "activities"] });
      toast({ title: "Communication Sent" });
      setCommSubject("");
      setCommBody("");
      setIsCommunicationDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const isAdmin = role === "admin";
  const isManager = role === "manager";
  const isAdminOrManager = isAdmin || isManager;

  const getAvailableStages = () => {
    if (isAdmin) return PIPELINE_STAGES;
    if (isManager) return PIPELINE_STAGES.filter((s) => s !== "offer_extended" && s !== "hired");
    return [];
  };

  if (candidateLoading) {
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
            {STAGE_LABELS[candidate.stage] || candidate.stage}
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
              <TabsTrigger value="interviews" data-testid="tab-interviews">Interviews</TabsTrigger>
              <TabsTrigger value="communications" data-testid="tab-communications">Communications</TabsTrigger>
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

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                  <CardTitle className="text-lg">Assessment Scores</CardTitle>
                  {isAdminOrManager && (
                    <Button size="sm" onClick={() => setIsAssessmentDialogOpen(true)} data-testid="button-add-assessment">
                      <Plus className="h-4 w-4 mr-1" />
                      Add Assessment
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  {assessments.length === 0 ? (
                    <p className="text-sm text-muted-foreground" data-testid="text-no-assessments">No assessments yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {assessments.map((assessment) => (
                        <div key={assessment.id} className="flex items-start justify-between gap-3 p-3 rounded-md border" data-testid={`assessment-${assessment.id}`}>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <Badge variant="outline" className="capitalize">{assessment.category.replace(/_/g, " ")}</Badge>
                              <span className="text-xs text-muted-foreground">by {getEmployeeName(assessment.assessorId)}</span>
                            </div>
                            {assessment.comments && <p className="text-sm text-muted-foreground">{assessment.comments}</p>}
                          </div>
                          <div className="flex items-center gap-0.5 flex-shrink-0">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`h-4 w-4 ${star <= assessment.score ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"}`}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
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

            <TabsContent value="interviews" className="mt-4 space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="font-medium">Interviews</h3>
                {isAdmin && (
                  <Button size="sm" onClick={() => setIsInterviewDialogOpen(true)} data-testid="button-schedule-interview">
                    <Plus className="h-4 w-4 mr-1" />
                    Schedule Interview
                  </Button>
                )}
              </div>
              {interviews.length === 0 ? (
                <p className="text-sm text-muted-foreground" data-testid="text-no-interviews">No interviews scheduled.</p>
              ) : (
                <div className="space-y-3">
                  {interviews.map((interview) => (
                    <Card key={interview.id} data-testid={`interview-${interview.id}`}>
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="capitalize">{interview.type}</Badge>
                            <Badge variant={interview.status === "completed" ? "default" : "secondary"}>
                              {interview.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>{format(new Date(interview.scheduledAt), "MMM d, yyyy h:mm a")}</span>
                          </div>
                        </div>
                        <p className="text-sm">
                          Interviewer: <span className="font-medium">{getEmployeeName(interview.interviewerId)}</span>
                          {" · "}{interview.duration} min
                        </p>
                        {interview.meetingLink && (
                          <div className="flex items-center gap-1 text-sm">
                            <LinkIcon className="h-3 w-3 text-muted-foreground" />
                            <a href={interview.meetingLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline" data-testid={`link-meeting-${interview.id}`}>
                              Meeting Link
                            </a>
                          </div>
                        )}
                        {interview.status === "completed" && interview.rating && (
                          <div className="pt-2 border-t space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium">Rating:</span>
                              <div className="flex items-center gap-0.5">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`h-3 w-3 ${star <= (interview.rating || 0) ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"}`}
                                  />
                                ))}
                              </div>
                              {interview.recommendation && (
                                <Badge variant="outline" className="capitalize">{interview.recommendation.replace(/_/g, " ")}</Badge>
                              )}
                              {interview.decision && (
                                <Badge variant={interview.decision === "reject" ? "destructive" : "secondary"} className="capitalize">
                                  {interview.decision.replace(/_/g, " ")}
                                </Badge>
                              )}
                            </div>
                            {interview.strengths && (
                              <p className="text-sm"><span className="font-medium">Strengths:</span> {interview.strengths}</p>
                            )}
                            {interview.weaknesses && (
                              <p className="text-sm"><span className="font-medium">Weaknesses:</span> {interview.weaknesses}</p>
                            )}
                          </div>
                        )}
                        {interview.status !== "completed" && isAdminOrManager && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedInterviewId(interview.id);
                              setIsFeedbackDialogOpen(true);
                            }}
                            data-testid={`button-submit-feedback-${interview.id}`}
                          >
                            Submit Feedback
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="communications" className="mt-4 space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="font-medium">Communications</h3>
                <Button size="sm" onClick={() => setIsCommunicationDialogOpen(true)} data-testid="button-send-communication">
                  <Send className="h-4 w-4 mr-1" />
                  Send Communication
                </Button>
              </div>
              {communications.length === 0 ? (
                <p className="text-sm text-muted-foreground" data-testid="text-no-communications">No communications yet.</p>
              ) : (
                <div className="space-y-3">
                  {communications.map((comm) => (
                    <Card key={comm.id} data-testid={`communication-${comm.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-sm">{comm.subject}</span>
                          <span className="text-xs text-muted-foreground">
                            {comm.sentAt ? format(new Date(comm.sentAt), "MMM d, yyyy h:mm a") : "Unknown"}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground whitespace-pre-line line-clamp-4" data-testid={`text-comm-body-${comm.id}`}>{comm.body}</p>
                        {comm.sentBy && (
                          <p className="text-xs text-muted-foreground mt-2">Sent by {getEmployeeName(comm.sentBy)}</p>
                        )}
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
                <p className="font-medium" data-testid="text-current-stage">{STAGE_LABELS[candidate.stage] || candidate.stage}</p>
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
                          {STAGE_LABELS[stage] || stage}
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

      <Dialog open={isAssessmentDialogOpen} onOpenChange={setIsAssessmentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Assessment</DialogTitle>
            <DialogDescription>Score this candidate on a specific category.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Input
                placeholder="e.g. Technical, Communication, Culture Fit"
                value={assessmentCategory}
                onChange={(e) => setAssessmentCategory(e.target.value)}
                data-testid="input-assessment-category"
              />
            </div>
            <div className="space-y-2">
              <Label>Score</Label>
              <Select value={assessmentScore} onValueChange={setAssessmentScore} data-testid="select-assessment-score">
                <SelectTrigger data-testid="select-assessment-score-trigger">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <SelectItem key={s} value={String(s)}>{s} / 5</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Comments</Label>
              <Textarea
                placeholder="Additional comments..."
                value={assessmentComments}
                onChange={(e) => setAssessmentComments(e.target.value)}
                data-testid="input-assessment-comments"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssessmentDialogOpen(false)} data-testid="button-cancel-assessment">Cancel</Button>
            <Button
              onClick={() => addAssessmentMutation.mutate({
                category: assessmentCategory,
                score: parseInt(assessmentScore),
                comments: assessmentComments,
              })}
              disabled={!assessmentCategory.trim() || addAssessmentMutation.isPending}
              data-testid="button-save-assessment"
            >
              {addAssessmentMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Save Assessment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isInterviewDialogOpen} onOpenChange={setIsInterviewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Schedule Interview</DialogTitle>
            <DialogDescription>Schedule a new interview for this candidate.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Interviewer</Label>
              <Select value={interviewerId} onValueChange={setInterviewerId} data-testid="select-interviewer">
                <SelectTrigger data-testid="select-interviewer-trigger">
                  <SelectValue placeholder="Select interviewer" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date & Time</Label>
              <Input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                data-testid="input-scheduled-at"
              />
            </div>
            <div className="space-y-2">
              <Label>Duration (minutes)</Label>
              <Input
                type="number"
                value={interviewDuration}
                onChange={(e) => setInterviewDuration(e.target.value)}
                data-testid="input-duration"
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={interviewType} onValueChange={setInterviewType} data-testid="select-interview-type">
                <SelectTrigger data-testid="select-interview-type-trigger">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INTERVIEW_TYPES.map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Meeting Link</Label>
              <Input
                placeholder="https://..."
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                data-testid="input-meeting-link"
              />
            </div>
            <div className="space-y-2">
              <Label>Meeting Location</Label>
              <Input
                placeholder="Room, office, etc."
                value={meetingLocation}
                onChange={(e) => setMeetingLocation(e.target.value)}
                data-testid="input-meeting-location"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInterviewDialogOpen(false)} data-testid="button-cancel-interview">Cancel</Button>
            <Button
              onClick={() => scheduleInterviewMutation.mutate({
                interviewerId,
                scheduledAt,
                duration: parseInt(interviewDuration),
                type: interviewType,
                meetingLink: meetingLink || null,
                meetingLocation: meetingLocation || null,
              })}
              disabled={!interviewerId || !scheduledAt || scheduleInterviewMutation.isPending}
              data-testid="button-save-interview"
            >
              {scheduleInterviewMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isFeedbackDialogOpen} onOpenChange={setIsFeedbackDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Submit Interview Feedback</DialogTitle>
            <DialogDescription>Provide your feedback for this interview.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Rating</Label>
              <Select value={feedbackRating} onValueChange={setFeedbackRating} data-testid="select-feedback-rating">
                <SelectTrigger data-testid="select-feedback-rating-trigger">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <SelectItem key={s} value={String(s)}>{s} / 5</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Strengths</Label>
              <Textarea
                placeholder="Candidate strengths..."
                value={feedbackStrengths}
                onChange={(e) => setFeedbackStrengths(e.target.value)}
                data-testid="input-feedback-strengths"
              />
            </div>
            <div className="space-y-2">
              <Label>Weaknesses</Label>
              <Textarea
                placeholder="Areas for improvement..."
                value={feedbackWeaknesses}
                onChange={(e) => setFeedbackWeaknesses(e.target.value)}
                data-testid="input-feedback-weaknesses"
              />
            </div>
            <div className="space-y-2">
              <Label>Recommendation</Label>
              <Select value={feedbackRecommendation} onValueChange={setFeedbackRecommendation} data-testid="select-feedback-recommendation">
                <SelectTrigger data-testid="select-feedback-recommendation-trigger">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RECOMMENDATION_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt} className="capitalize">{opt.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Decision</Label>
              <Select value={feedbackDecision} onValueChange={setFeedbackDecision} data-testid="select-feedback-decision">
                <SelectTrigger data-testid="select-feedback-decision-trigger">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DECISION_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt} className="capitalize">{opt.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Additional notes..."
                value={feedbackNotes}
                onChange={(e) => setFeedbackNotes(e.target.value)}
                data-testid="input-feedback-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFeedbackDialogOpen(false)} data-testid="button-cancel-feedback">Cancel</Button>
            <Button
              onClick={() => {
                if (!selectedInterviewId) return;
                submitFeedbackMutation.mutate({
                  interviewId: selectedInterviewId,
                  feedback: {
                    rating: parseInt(feedbackRating),
                    strengths: feedbackStrengths || undefined,
                    weaknesses: feedbackWeaknesses || undefined,
                    recommendation: feedbackRecommendation,
                    decision: feedbackDecision,
                    notes: feedbackNotes || undefined,
                  },
                });
              }}
              disabled={submitFeedbackMutation.isPending}
              data-testid="button-save-feedback"
            >
              {submitFeedbackMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Submit Feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCommunicationDialogOpen} onOpenChange={setIsCommunicationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Communication</DialogTitle>
            <DialogDescription>Send a message to this candidate.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input
                placeholder="Email subject..."
                value={commSubject}
                onChange={(e) => setCommSubject(e.target.value)}
                data-testid="input-comm-subject"
              />
            </div>
            <div className="space-y-2">
              <Label>Body</Label>
              <Textarea
                placeholder="Email body..."
                value={commBody}
                onChange={(e) => setCommBody(e.target.value)}
                data-testid="input-comm-body"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCommunicationDialogOpen(false)} data-testid="button-cancel-communication">Cancel</Button>
            <Button
              onClick={() => sendCommunicationMutation.mutate({ subject: commSubject, body: commBody })}
              disabled={!commSubject.trim() || !commBody.trim() || sendCommunicationMutation.isPending}
              data-testid="button-send-communication"
            >
              {sendCommunicationMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
