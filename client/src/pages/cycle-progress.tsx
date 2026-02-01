import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  ArrowLeft,
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  User,
  Star,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useRole, canEditOrgSettings } from "@/lib/role-context";
import { Link, useParams } from "wouter";
import { useState } from "react";
import {
  getAppraisalCycleById,
  getAppraisalsByCycle,
  getFeedbackByAppraisal,
  getEmployeeById,
  getTemplateById,
} from "@/lib/demo-data";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const statusColors: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  in_progress: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
};

const feedbackStatusColors: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  draft: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  submitted: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
};

export default function CycleProgress() {
  const { id } = useParams<{ id: string }>();
  const { role } = useRole();
  const isAdmin = canEditOrgSettings(role);
  const [expandedParticipants, setExpandedParticipants] = useState<Set<string>>(new Set());

  const cycle = getAppraisalCycleById(id || "");
  const template = cycle?.templateId ? getTemplateById(cycle.templateId) : null;
  const appraisals = cycle ? getAppraisalsByCycle(cycle.id) : [];

  if (!cycle) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <p className="text-muted-foreground">Cycle not found</p>
        <Link href="/appraisals/cycles">
          <Button variant="ghost" className="mt-4">Back to Cycles</Button>
        </Link>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <p className="text-muted-foreground">Access restricted to administrators only</p>
        <Link href="/appraisals">
          <Button variant="ghost" className="mt-4">Back to Appraisals</Button>
        </Link>
      </div>
    );
  }

  const toggleParticipant = (appraisalId: string) => {
    setExpandedParticipants(prev => {
      const next = new Set(prev);
      if (next.has(appraisalId)) {
        next.delete(appraisalId);
      } else {
        next.add(appraisalId);
      }
      return next;
    });
  };

  const participantDetails = appraisals.map(appraisal => {
    const employee = getEmployeeById(appraisal.employeeId);
    const feedback = getFeedbackByAppraisal(appraisal.id);
    const submittedCount = feedback.filter(f => f.status === "submitted").length;
    const totalCount = feedback.length;
    const progressPercent = totalCount > 0 ? (submittedCount / totalCount) * 100 : 0;
    
    return {
      appraisal,
      employee,
      feedback,
      submittedCount,
      totalCount,
      progressPercent,
    };
  });

  const overallStats = {
    total: appraisals.length,
    completed: appraisals.filter(a => a.status === "completed").length,
    inProgress: appraisals.filter(a => a.status === "in_progress").length,
    pending: appraisals.filter(a => a.status === "pending").length,
  };

  const allFeedback = participantDetails.flatMap(p => p.feedback);
  const feedbackStats = {
    total: allFeedback.length,
    submitted: allFeedback.filter(f => f.status === "submitted").length,
    draft: allFeedback.filter(f => f.status === "draft").length,
    pending: allFeedback.filter(f => f.status === "pending").length,
  };

  const overallProgress = feedbackStats.total > 0 
    ? (feedbackStats.submitted / feedbackStats.total) * 100 
    : 0;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4 flex-wrap">
        <Link href="/appraisals/cycles">
          <Button variant="ghost" size="icon" data-testid="button-back-cycles">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight" data-testid="text-cycle-progress-title">
              {cycle.name}
            </h1>
            <Badge variant={cycle.type === "360" ? "default" : "secondary"}>
              {cycle.type === "360" ? "360° Review" : "180° Review"}
            </Badge>
          </div>
          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {new Date(cycle.startDate).toLocaleDateString()} - {new Date(cycle.endDate).toLocaleDateString()}
            </div>
            {template && (
              <span>Template: {template.name}</span>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Participants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{overallStats.total}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <span className="text-2xl font-bold">{overallStats.completed}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              <span className="text-2xl font-bold">{overallStats.inProgress}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Not Started</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-muted-foreground" />
              <span className="text-2xl font-bold">{overallStats.pending}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle>Overall Review Progress</CardTitle>
              <CardDescription>
                {feedbackStats.submitted} of {feedbackStats.total} reviews submitted
              </CardDescription>
            </div>
            <span className="text-2xl font-bold">{Math.round(overallProgress)}%</span>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={overallProgress} className="h-3" />
          <div className="flex items-center gap-6 mt-4 text-sm flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-muted-foreground">Submitted: {feedbackStats.submitted}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="text-muted-foreground">Draft: {feedbackStats.draft}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-muted-foreground" />
              <span className="text-muted-foreground">Pending: {feedbackStats.pending}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {cycle.type === "360" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Scoring Weights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6 text-sm flex-wrap">
              <div className="flex items-center gap-2">
                <Badge variant="outline">Self: {cycle.selfWeight}%</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">Peer: {cycle.peerWeight}%</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">Manager: {cycle.managerWeight}%</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Participant Review Status</CardTitle>
          <CardDescription>
            Click on a participant to see detailed reviewer status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {participantDetails.map(({ appraisal, employee, feedback, submittedCount, totalCount, progressPercent }) => {
              const isExpanded = expandedParticipants.has(appraisal.id);
              
              return (
                <Collapsible key={appraisal.id} open={isExpanded} onOpenChange={() => toggleParticipant(appraisal.id)}>
                  <div className="border rounded-lg">
                    <CollapsibleTrigger asChild>
                      <div 
                        className="flex items-center gap-4 p-4 cursor-pointer hover-elevate"
                        data-testid={`participant-row-${appraisal.employeeId}`}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {employee?.firstName?.[0]}{employee?.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {employee?.firstName} {employee?.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">
                            {employee?.position}
                          </p>
                        </div>
                        <div className="flex items-center gap-4 flex-wrap">
                          <div className="w-32">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-muted-foreground">{submittedCount}/{totalCount} reviews</span>
                            </div>
                            <Progress value={progressPercent} className="h-2" />
                          </div>
                          <Badge className={statusColors[appraisal.status]}>
                            {appraisal.status === "in_progress" ? "In Progress" : 
                             appraisal.status.charAt(0).toUpperCase() + appraisal.status.slice(1)}
                          </Badge>
                          {appraisal.overallRating && (
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                              <span className="font-medium">{appraisal.overallRating}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="border-t px-4 py-3 bg-muted/30">
                        <p className="text-sm font-medium mb-3">Review Breakdown</p>
                        <div className="rounded-md border bg-background">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Reviewer</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Submitted</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {feedback.length > 0 ? (
                                feedback.map((f) => {
                                  const reviewer = getEmployeeById(f.reviewerId);
                                  return (
                                    <TableRow key={f.id}>
                                      <TableCell>
                                        <div className="flex items-center gap-2">
                                          <Avatar className="h-6 w-6">
                                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                              {reviewer?.firstName?.[0]}{reviewer?.lastName?.[0]}
                                            </AvatarFallback>
                                          </Avatar>
                                          <span className="text-sm">
                                            {reviewer?.firstName} {reviewer?.lastName}
                                          </span>
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <Badge variant="outline" className="text-xs capitalize">
                                          {f.reviewerType}
                                        </Badge>
                                      </TableCell>
                                      <TableCell>
                                        <Badge className={feedbackStatusColors[f.status]}>
                                          {f.status.charAt(0).toUpperCase() + f.status.slice(1)}
                                        </Badge>
                                      </TableCell>
                                      <TableCell className="text-sm text-muted-foreground">
                                        {f.submittedAt 
                                          ? new Date(f.submittedAt).toLocaleDateString()
                                          : "-"
                                        }
                                      </TableCell>
                                    </TableRow>
                                  );
                                })
                              ) : (
                                <TableRow>
                                  <TableCell colSpan={4} className="text-center text-muted-foreground py-4">
                                    No reviews assigned yet
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })}
            {participantDetails.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No participants in this cycle yet</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
