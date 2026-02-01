import { useState } from "react";
import { useParams, Link, Redirect } from "wouter";
import { useForm } from "react-hook-form";
import { useRecruitmentStore, CandidateStage } from "@/lib/recruitment-store";
import { employees } from "@/lib/demo-data";
import { useToast } from "@/hooks/use-toast";
import { useRole, canEditOrgSettings } from "@/lib/role-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { 
  ArrowLeft, Mail, Phone, MapPin, Linkedin, FileText, Star, Calendar, 
  MessageSquare, StickyNote, Clock, Send, Plus, User, ChevronRight
} from "lucide-react";

const PIPELINE_STAGES: { key: CandidateStage; label: string }[] = [
  { key: "applied", label: "Applied" },
  { key: "screening", label: "Screening" },
  { key: "interview", label: "Interview" },
  { key: "offer", label: "Offer" },
  { key: "hired", label: "Hired" },
  { key: "rejected", label: "Rejected" },
];

const ASSESSMENT_CATEGORIES = ["technical", "communication", "culture_fit", "experience"];
const NOTE_CATEGORIES = ["general", "feedback", "concern", "positive"];

export default function CandidateDetail() {
  const { role } = useRole();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();

  if (!canEditOrgSettings(role)) {
    return <Redirect to="/" />;
  }
  const {
    getCandidateById,
    getJobById,
    updateCandidateStage,
    getActivitiesForCandidate,
    getNotesForCandidate,
    getAssessmentsForCandidate,
    getInterviewsForCandidate,
    getCommunicationsForCandidate,
    addNote,
    addAssessment,
    addInterview,
    addCommunication,
    emailTemplates,
  } = useRecruitmentStore();

  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  const [isAssessmentDialogOpen, setIsAssessmentDialogOpen] = useState(false);
  const [isInterviewDialogOpen, setIsInterviewDialogOpen] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");

  const [noteContent, setNoteContent] = useState("");
  const [noteCategory, setNoteCategory] = useState("general");
  const [assessmentCategory, setAssessmentCategory] = useState("technical");
  const [assessmentScore, setAssessmentScore] = useState(3);
  const [assessmentComments, setAssessmentComments] = useState("");
  const [interviewDate, setInterviewDate] = useState("");
  const [interviewTime, setInterviewTime] = useState("");
  const [interviewType, setInterviewType] = useState("video");
  const [interviewerId, setInterviewerId] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");

  const candidate = getCandidateById(id || "");
  const job = candidate ? getJobById(candidate.jobId) : undefined;
  const activities = candidate ? getActivitiesForCandidate(candidate.id) : [];
  const notes = candidate ? getNotesForCandidate(candidate.id) : [];
  const assessments = candidate ? getAssessmentsForCandidate(candidate.id) : [];
  const interviews = candidate ? getInterviewsForCandidate(candidate.id) : [];
  const communications = candidate ? getCommunicationsForCandidate(candidate.id) : [];

  const getEmployeeName = (empId: string) => {
    const emp = employees.find((e) => e.id === empId);
    return emp ? `${emp.firstName} ${emp.lastName}` : "Unknown";
  };

  const getStageBadge = (stage: string) => {
    const variants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
      applied: "secondary",
      screening: "default",
      interview: "default",
      offer: "default",
      hired: "default",
      rejected: "destructive",
    };
    const stageInfo = PIPELINE_STAGES.find((s) => s.key === stage);
    return <Badge variant={variants[stage] || "outline"}>{stageInfo?.label || stage}</Badge>;
  };

  const handleAddNote = () => {
    if (!candidate || !noteContent.trim()) return;
    addNote({
      candidateId: candidate.id,
      content: noteContent,
      category: noteCategory,
      createdBy: "emp-4",
    });
    toast({ title: "Note Added" });
    setNoteContent("");
    setNoteCategory("general");
    setIsNoteDialogOpen(false);
  };

  const handleAddAssessment = () => {
    if (!candidate) return;
    addAssessment({
      candidateId: candidate.id,
      assessorId: "emp-4",
      category: assessmentCategory,
      score: assessmentScore,
      comments: assessmentComments || null,
    });
    toast({ title: "Assessment Added" });
    setAssessmentCategory("technical");
    setAssessmentScore(3);
    setAssessmentComments("");
    setIsAssessmentDialogOpen(false);
  };

  const handleAddInterview = () => {
    if (!candidate || !interviewDate || !interviewTime || !interviewerId) return;
    const scheduledAt = new Date(`${interviewDate}T${interviewTime}`);
    addInterview({
      candidateId: candidate.id,
      interviewerId,
      scheduledAt,
      duration: 60,
      type: interviewType,
      status: "scheduled",
      notes: null,
    });
    toast({ title: "Interview Scheduled" });
    setInterviewDate("");
    setInterviewTime("");
    setInterviewType("video");
    setInterviewerId("");
    setIsInterviewDialogOpen(false);
  };

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = emailTemplates.find((t) => t.id === templateId);
    if (template && candidate && job) {
      let subject = template.subject;
      let body = template.body;
      const replacements: Record<string, string> = {
        "{{candidateName}}": `${candidate.firstName} ${candidate.lastName}`,
        "{{jobTitle}}": job.title,
        "{{companyName}}": "TechCorp Inc.",
        "{{interviewDate}}": "[Interview Date]",
      };
      Object.entries(replacements).forEach(([key, value]) => {
        subject = subject.replace(new RegExp(key, "g"), value);
        body = body.replace(new RegExp(key, "g"), value);
      });
      setEmailSubject(subject);
      setEmailBody(body);
    }
  };

  const handleSendEmail = () => {
    if (!candidate || !emailSubject.trim() || !emailBody.trim()) return;
    addCommunication({
      candidateId: candidate.id,
      direction: "sent",
      subject: emailSubject,
      body: emailBody,
      sentBy: "emp-4",
    });
    toast({ title: "Email Sent", description: "Email has been sent to the candidate." });
    setEmailSubject("");
    setEmailBody("");
    setSelectedTemplate("");
    setIsEmailDialogOpen(false);
  };

  if (!candidate) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Candidate Not Found</h3>
            <Link href="/recruitment/candidates">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Candidates
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/recruitment/candidates">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold" data-testid="text-candidate-name">
            {candidate.firstName} {candidate.lastName}
          </h1>
          <p className="text-muted-foreground">{job?.title || "Unknown Position"}</p>
        </div>
        <Select
          value={candidate.stage}
          onValueChange={(value) => {
            updateCandidateStage(candidate.id, value as CandidateStage);
            toast({ title: "Stage Updated" });
          }}
        >
          <SelectTrigger className="w-[150px]" data-testid="select-stage">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PIPELINE_STAGES.map((stage) => (
              <SelectItem key={stage.key} value={stage.key}>
                {stage.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => setIsEmailDialogOpen(true)} data-testid="button-send-email">
          <Mail className="h-4 w-4 mr-2" />
          Send Email
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-center mb-4">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                  {candidate.firstName[0]}{candidate.lastName[0]}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{candidate.email}</span>
              </div>
              {candidate.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{candidate.phone}</span>
                </div>
              )}
              {candidate.location && (
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{candidate.location}</span>
                </div>
              )}
              {candidate.linkedinUrl && (
                <div className="flex items-center gap-3 text-sm">
                  <Linkedin className="h-4 w-4 text-muted-foreground" />
                  <a href={candidate.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    LinkedIn Profile
                  </a>
                </div>
              )}
              {candidate.resumeFileName && (
                <div className="flex items-center gap-3 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span>{candidate.resumeFileName}</span>
                </div>
              )}
            </div>
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Applied on {candidate.appliedAt ? new Date(candidate.appliedAt).toLocaleDateString() : "Unknown"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <Tabs defaultValue="overview" className="w-full">
            <CardHeader className="pb-0">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
                <TabsTrigger value="assessments" data-testid="tab-assessments">Assessments</TabsTrigger>
                <TabsTrigger value="interviews" data-testid="tab-interviews">Interviews</TabsTrigger>
                <TabsTrigger value="communications" data-testid="tab-communications">Communications</TabsTrigger>
                <TabsTrigger value="notes" data-testid="tab-notes">Notes</TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent className="pt-4">
              <TabsContent value="overview" className="mt-0">
                <div className="space-y-4">
                  <h3 className="font-medium">Activity Timeline</h3>
                  {activities.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No activity yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {activities.map((activity) => (
                        <div key={activity.id} className="flex gap-3 text-sm">
                          <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                          <div className="flex-1">
                            <p>{activity.description}</p>
                            <p className="text-xs text-muted-foreground">
                              {activity.createdAt ? new Date(activity.createdAt).toLocaleString() : "Unknown"}
                              {activity.createdBy && ` by ${getEmployeeName(activity.createdBy)}`}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="assessments" className="mt-0">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">Candidate Assessments</h3>
                    <Button size="sm" onClick={() => setIsAssessmentDialogOpen(true)} data-testid="button-add-assessment">
                      <Plus className="h-4 w-4 mr-1" />
                      Add Assessment
                    </Button>
                  </div>
                  {assessments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No assessments yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {assessments.map((assessment) => (
                        <Card key={assessment.id}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <Badge variant="outline" className="capitalize">{assessment.category.replace("_", " ")}</Badge>
                              <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`h-4 w-4 ${star <= assessment.score ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"}`}
                                  />
                                ))}
                              </div>
                            </div>
                            {assessment.comments && <p className="text-sm">{assessment.comments}</p>}
                            <p className="text-xs text-muted-foreground mt-2">
                              By {getEmployeeName(assessment.assessorId)}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="interviews" className="mt-0">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">Scheduled Interviews</h3>
                    <Button size="sm" onClick={() => setIsInterviewDialogOpen(true)} data-testid="button-add-interview">
                      <Plus className="h-4 w-4 mr-1" />
                      Schedule Interview
                    </Button>
                  </div>
                  {interviews.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No interviews scheduled.</p>
                  ) : (
                    <div className="space-y-3">
                      {interviews.map((interview) => (
                        <Card key={interview.id}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">
                                  {new Date(interview.scheduledAt).toLocaleDateString()} at{" "}
                                  {new Date(interview.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </span>
                              </div>
                              <Badge variant={interview.status === "completed" ? "default" : "outline"}>
                                {interview.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {interview.type.charAt(0).toUpperCase() + interview.type.slice(1)} interview with{" "}
                              {getEmployeeName(interview.interviewerId)} ({interview.duration} min)
                            </p>
                            {interview.notes && <p className="text-sm mt-2">{interview.notes}</p>}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="communications" className="mt-0">
                <div className="space-y-4">
                  <h3 className="font-medium">Email History</h3>
                  {communications.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No communications yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {communications.map((comm) => (
                        <Card key={comm.id}>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant={comm.direction === "sent" ? "default" : "secondary"}>
                                {comm.direction === "sent" ? "Sent" : "Received"}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {comm.sentAt ? new Date(comm.sentAt).toLocaleString() : "Unknown"}
                              </span>
                            </div>
                            <p className="font-medium text-sm mb-1">{comm.subject}</p>
                            <p className="text-sm text-muted-foreground whitespace-pre-line line-clamp-3">{comm.body}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="notes" className="mt-0">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">Notes</h3>
                    <Button size="sm" onClick={() => setIsNoteDialogOpen(true)} data-testid="button-add-note">
                      <Plus className="h-4 w-4 mr-1" />
                      Add Note
                    </Button>
                  </div>
                  {notes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No notes yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {notes.map((note) => (
                        <Card key={note.id}>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className="capitalize">{note.category}</Badge>
                              <span className="text-xs text-muted-foreground">
                                {note.createdAt ? new Date(note.createdAt).toLocaleString() : "Unknown"}
                              </span>
                            </div>
                            <p className="text-sm">{note.content}</p>
                            <p className="text-xs text-muted-foreground mt-2">
                              By {getEmployeeName(note.createdBy)}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
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
              <Select value={noteCategory} onValueChange={setNoteCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NOTE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat} className="capitalize">
                      {cat}
                    </SelectItem>
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
            <Button variant="outline" onClick={() => setIsNoteDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddNote} data-testid="button-save-note">Save Note</Button>
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
              <Select value={assessmentCategory} onValueChange={setAssessmentCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSESSMENT_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat} className="capitalize">
                      {cat.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Score</Label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((score) => (
                  <Button
                    key={score}
                    type="button"
                    variant={assessmentScore === score ? "default" : "outline"}
                    size="icon"
                    onClick={() => setAssessmentScore(score)}
                  >
                    {score}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Comments (optional)</Label>
              <Textarea
                placeholder="Add any comments..."
                value={assessmentComments}
                onChange={(e) => setAssessmentComments(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssessmentDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddAssessment} data-testid="button-save-assessment">Save Assessment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isInterviewDialogOpen} onOpenChange={setIsInterviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Interview</DialogTitle>
            <DialogDescription>Set up an interview with this candidate.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={interviewDate} onChange={(e) => setInterviewDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Time</Label>
                <Input type="time" value={interviewTime} onChange={(e) => setInterviewTime(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Interview Type</Label>
              <Select value={interviewType} onValueChange={setInterviewType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="phone">Phone</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="onsite">On-site</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Interviewer</Label>
              <Select value={interviewerId} onValueChange={setInterviewerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select interviewer" />
                </SelectTrigger>
                <SelectContent>
                  {employees.slice(0, 7).map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInterviewDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddInterview} data-testid="button-save-interview">Schedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Send Email</DialogTitle>
            <DialogDescription>Compose an email to {candidate.firstName} {candidate.lastName}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Use Template (optional)</Label>
              <Select value={selectedTemplate} onValueChange={handleSelectTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {emailTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Email subject"
                data-testid="input-email-subject"
              />
            </div>
            <div className="space-y-2">
              <Label>Body</Label>
              <Textarea
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                placeholder="Email content..."
                className="min-h-[200px]"
                data-testid="input-email-body"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEmailDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSendEmail} data-testid="button-send-email-confirm">
              <Send className="h-4 w-4 mr-2" />
              Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
