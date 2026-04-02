import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useRole } from "@/lib/role-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import type { AppraisalWithFeedback, AppraisalFeedback, AppraisalCycle, Employee } from "@shared/schema";
import {
  BarChart3,
  Clock,
  CheckCircle2,
  FileText,
  Settings2,
  ArrowRight,
  Inbox,
  Star,
  Users,
  CalendarRange,
  BookOpen,
} from "lucide-react";

const statusLabels: Record<string, string> = {
  draft: "Draft",
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const statusVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "secondary",
  pending: "outline",
  in_progress: "default",
  completed: "default",
  cancelled: "destructive",
};

const reviewTypeLabels: Record<string, string> = {
  self: "Self Review",
  peer: "Peer Review",
  manager: "Manager Review",
};

const cycleStatusLabels: Record<string, string> = {
  draft: "Draft",
  active: "Active",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default function Appraisals() {
  const { role, currentUser } = useRole();

  const { data: appraisals = [], isLoading: appraisalsLoading } = useQuery<AppraisalWithFeedback[]>({
    queryKey: ["/api/appraisals"],
  });

  const { data: pendingFeedback = [], isLoading: feedbackLoading } = useQuery<AppraisalFeedback[]>({
    queryKey: ["/api/feedback/pending"],
  });

  const { data: cycles = [], isLoading: cyclesLoading } = useQuery<AppraisalCycle[]>({
    queryKey: ["/api/appraisal-cycles"],
  });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const isAdmin = role === "admin";
  const isManager = role === "manager";
  const isAdminOrManager = isAdmin || isManager;
  const isLoading = appraisalsLoading || feedbackLoading || cyclesLoading;

  function getEmployee(id: string) {
    return employees.find((e) => e.id === id);
  }

  function getEmployeeName(id: string) {
    const emp = getEmployee(id);
    return emp ? `${emp.firstName} ${emp.lastName}` : "Unknown";
  }

  function getCycleName(cycleId: string) {
    const cycle = cycles.find((c) => c.id === cycleId);
    return cycle?.name || "Review";
  }

  function getCycleForAppraisal(appraisal: AppraisalWithFeedback) {
    return cycles.find((c) => c.id === appraisal.cycleId);
  }

  const activeCycles = cycles.filter((c) => c.status === "active");
  const completedReviews = pendingFeedback.filter((f) => f.status === "completed" || f.status === "submitted");
  const pendingReviews = pendingFeedback.filter((f) => f.status !== "completed" && f.status !== "submitted");

  const completedByType = completedReviews.reduce((acc: Record<string, any[]>, f: any) => {
    const type = f.reviewerType || "other";
    if (!acc[type]) acc[type] = [];
    acc[type].push(f);
    return acc;
  }, {});
  const completedGroupOrder = ["self", "peer", ...Object.keys(completedByType).filter(t => t !== "self" && t !== "peer")];

  const myAppraisals = appraisals.filter((a) => a.employeeId === currentUser.id);

  const subtitle = isAdmin
    ? "Manage performance review cycles, templates, and track organizational reviews"
    : isManager
      ? "Review your team's performance and manage appraisal cycles"
      : "View and complete your performance reviews";

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold tracking-tight" data-testid="text-appraisals-title">
            Performance Appraisals
          </h1>
          <p className="text-muted-foreground text-sm mt-1" data-testid="text-appraisals-subtitle">
            {subtitle}
          </p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2 flex-wrap">
            <Link href="/appraisals/templates">
              <Button variant="outline" data-testid="link-templates">
                <FileText className="h-4 w-4 mr-2" />
                Templates
              </Button>
            </Link>
            <Link href="/appraisals/competencies">
              <Button variant="outline" data-testid="link-competencies">
                <BookOpen className="h-4 w-4 mr-2" />
                Competencies
              </Button>
            </Link>
            <Link href="/appraisals/cycles">
              <Button data-testid="link-cycles">
                <Settings2 className="h-4 w-4 mr-2" />
                Manage Cycles
              </Button>
            </Link>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {isLoading ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-8 w-12" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
            <Card data-testid="stat-total-cycles">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <CalendarRange className="h-4 w-4" />
                  <span>Total Cycles</span>
                </div>
                <div className="text-2xl font-bold">{cycles.length}</div>
              </CardContent>
            </Card>
            <Card data-testid="stat-active-cycles">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <BarChart3 className="h-4 w-4" />
                  <span>Active Cycles</span>
                </div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{activeCycles.length}</div>
              </CardContent>
            </Card>
            <Card data-testid="stat-pending-reviews">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Clock className="h-4 w-4" />
                  <span>Pending Reviews</span>
                </div>
                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{pendingReviews.length}</div>
              </CardContent>
            </Card>
            <Card data-testid="stat-completed-reviews">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Completed Reviews</span>
                </div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{completedReviews.length}</div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold flex items-center gap-2" data-testid="text-pending-reviews-heading">
          <Clock className="h-5 w-5" />
          My Pending Reviews
        </h2>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <Skeleton className="h-9 w-28" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : pendingReviews.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Inbox className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">No pending reviews at this time</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {pendingReviews.map((feedback: any) => {
              const employeeName = feedback.employeeName || "Unknown";
              const cycleName = feedback.cycleName || "Review";
              return (
                <Card key={feedback.id} className="hover-elevate" data-testid={`card-pending-review-${feedback.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium" data-testid={`text-review-employee-${feedback.id}`}>
                            {employeeName}
                          </span>
                          <Badge variant="secondary" data-testid={`badge-review-type-${feedback.id}`}>
                            {reviewTypeLabels[feedback.reviewerType] || feedback.reviewerType}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground" data-testid={`text-review-cycle-${feedback.id}`}>
                          {cycleName}
                        </p>
                      </div>
                      <Link href={`/appraisals/review/${feedback.id}`}>
                        <Button data-testid={`button-start-review-${feedback.id}`}>
                          <FileText className="h-4 w-4 mr-2" />
                          Start Review
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {completedReviews.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold flex items-center gap-2" data-testid="text-completed-reviews-heading">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            Completed Reviews
          </h2>
          <div className="space-y-4">
            {completedGroupOrder
              .filter(type => completedByType[type]?.length > 0)
              .map(type => (
                <div key={type} className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                    {reviewTypeLabels[type] || type}
                    <Badge variant="secondary" className="text-xs">{completedByType[type].length}</Badge>
                  </h3>
                  <div className="space-y-2">
                    {completedByType[type].map((feedback: any) => (
                      <Card key={feedback.id} className="hover-elevate" data-testid={`card-completed-review-${feedback.id}`}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between gap-4 flex-wrap">
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium">
                                  {feedback.employeeName || "Unknown"}
                                </span>
                                <Badge variant="secondary">
                                  {reviewTypeLabels[feedback.reviewerType] || feedback.reviewerType}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {feedback.cycleName || "Review"}
                              </p>
                            </div>
                            <Link href={`/appraisals/review/${feedback.id}`}>
                              <Button variant="outline">
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                View Review
                                <ArrowRight className="h-4 w-4 ml-2" />
                              </Button>
                            </Link>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <h2 className="text-lg font-semibold flex items-center gap-2" data-testid="text-my-appraisals-heading">
          <Star className="h-5 w-5" />
          My Appraisals
        </h2>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <Skeleton className="h-6 w-20" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : myAppraisals.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Inbox className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">
                No appraisals assigned to you yet
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {myAppraisals.map((appraisal) => {
              const cycleName = getCycleName(appraisal.cycleId);
              const isCompleted = appraisal.status === "completed";
              return (
                <Card key={appraisal.id} className={isCompleted ? "hover-elevate" : ""} data-testid={`card-appraisal-${appraisal.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium" data-testid={`text-appraisal-employee-${appraisal.id}`}>
                            {getEmployeeName(appraisal.employeeId)}
                          </span>
                          <Badge
                            variant={statusVariant[appraisal.status] || "secondary"}
                            data-testid={`badge-appraisal-status-${appraisal.id}`}
                          >
                            {statusLabels[appraisal.status] || appraisal.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground" data-testid={`text-appraisal-cycle-${appraisal.id}`}>
                          {cycleName}
                        </p>
                        {appraisal.status !== "completed" && appraisal.feedbackSummary && appraisal.feedbackSummary.length > 0 && (
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {appraisal.feedbackSummary.map((fb, idx) => {
                              const isSubmitted = fb.status === "submitted";
                              const label = fb.reviewerType === "self" ? "Self"
                                : fb.reviewerType === "manager" ? "Manager"
                                : fb.reviewerName.split(" ")[0];
                              return (
                                <span
                                  key={idx}
                                  className={`text-xs ${isSubmitted ? "text-green-600 dark:text-green-400" : "text-yellow-600 dark:text-yellow-400"}`}
                                >
                                  {isSubmitted ? "\u2713" : "\u25CB"} {label}
                                </span>
                              );
                            })}
                          </div>
                        )}
                        {appraisal.overallRating != null && (
                          <div className="flex items-center gap-1 text-sm" data-testid={`text-appraisal-rating-${appraisal.id}`}>
                            <Star className="h-4 w-4 text-amber-500" />
                            <span className="font-medium">{appraisal.overallRating.toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {appraisal.createdAt && (
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(appraisal.createdAt), "MMM d, yyyy")}
                          </span>
                        )}
                        {isCompleted && (
                          <Link href={`/appraisals/results/${appraisal.id}`}>
                            <Button variant="outline" data-testid={`button-view-results-${appraisal.id}`}>
                              View Results
                              <ArrowRight className="h-4 w-4 ml-2" />
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {isAdminOrManager && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold flex items-center gap-2" data-testid="text-cycles-overview-heading">
            <Users className="h-5 w-5" />
            Recent Cycles Overview
          </h2>
          {cyclesLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-5 w-48" />
                        <Skeleton className="h-4 w-64" />
                      </div>
                      <Skeleton className="h-6 w-20" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : cycles.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Inbox className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">No appraisal cycles created yet</p>
                {isAdmin && (
                  <Link href="/appraisals/cycles">
                    <Button variant="outline" className="mt-3" data-testid="button-create-first-cycle">
                      Create First Cycle
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {cycles
                .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
                .slice(0, 5)
                .map((cycle) => {
                  const cycleAppraisals = appraisals.filter((a) => a.cycleId === cycle.id);
                  const completedCount = cycleAppraisals.filter((a) => a.status === "completed").length;
                  return (
                    <Link key={cycle.id} href={`/appraisals/cycles/${cycle.id}`}>
                      <Card className="hover-elevate cursor-pointer" data-testid={`card-cycle-${cycle.id}`}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between gap-4 flex-wrap">
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium" data-testid={`text-cycle-name-${cycle.id}`}>
                                  {cycle.name}
                                </span>
                                <Badge
                                  variant={cycle.status === "active" ? "default" : "secondary"}
                                  data-testid={`badge-cycle-status-${cycle.id}`}
                                >
                                  {cycleStatusLabels[cycle.status] || cycle.status}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(cycle.startDate), "MMM d, yyyy")} - {format(new Date(cycle.endDate), "MMM d, yyyy")}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {cycleAppraisals.length} appraisal{cycleAppraisals.length !== 1 ? "s" : ""}
                                {cycleAppraisals.length > 0 && ` (${completedCount} completed)`}
                              </p>
                            </div>
                            <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
