import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  ClipboardCheck, 
  Clock, 
  CheckCircle2, 
  FileText, 
  User,
  Users,
  ChevronRight,
  Star,
  Calendar,
} from "lucide-react";
import { useRole } from "@/lib/role-context";
import { Link } from "wouter";
import {
  getAppraisalById,
  getAppraisalCycleById,
  getEmployeeById,
  appraisals,
} from "@/lib/demo-data";
import { useAppraisalStore } from "@/lib/appraisal-store";
import type { AppraisalFeedback } from "@shared/schema";

const reviewerTypeLabels: Record<string, string> = {
  self: "Self-Assessment",
  manager: "Manager Review",
  peer: "Peer Review",
  subordinate: "Upward Feedback",
};

const reviewerTypeIcons: Record<string, typeof User> = {
  self: User,
  manager: Users,
  peer: Users,
  subordinate: Users,
};

export default function Appraisals() {
  const { currentUser } = useRole();
  const [activeTab, setActiveTab] = useState("pending");
  
  const { getPendingReviewsForUser, getCompletedReviewsByUser, feedback } = useAppraisalStore();

  const pendingReviews = getPendingReviewsForUser(currentUser.id);
  const completedReviews = getCompletedReviewsByUser(currentUser.id);
  const receivedReviews = feedback.filter(
    f => f.status === "submitted" && appraisals.find(a => a.id === f.appraisalId)?.employeeId === currentUser.id
  );

  // Get appraisals received by the user with calculated scores
  const myAppraisals = appraisals.filter(a => a.employeeId === currentUser.id);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-appraisals-title">
            My Appraisals
          </h1>
        </div>
        <p className="text-muted-foreground">
          View and complete your performance reviews
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card data-testid="card-pending-count">
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Reviews
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingReviews.length}</div>
            <p className="text-xs text-muted-foreground">Reviews to complete</p>
          </CardContent>
        </Card>
        <Card data-testid="card-completed-count">
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completed Reviews
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedReviews.length}</div>
            <p className="text-xs text-muted-foreground">Reviews submitted</p>
          </CardContent>
        </Card>
        <Card data-testid="card-received-count">
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Received Reviews
            </CardTitle>
            <FileText className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{receivedReviews.length}</div>
            <p className="text-xs text-muted-foreground">Feedback about you</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for reviews */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="pending" data-testid="tab-pending">
            Pending ({pendingReviews.length})
          </TabsTrigger>
          <TabsTrigger value="completed" data-testid="tab-completed">
            Completed ({completedReviews.length})
          </TabsTrigger>
          <TabsTrigger value="received" data-testid="tab-received">
            Received ({receivedReviews.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Reviews to Complete</CardTitle>
              <CardDescription>
                These reviews are waiting for your feedback
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingReviews.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CheckCircle2 className="h-12 w-12 text-emerald-500/50 mb-4" />
                  <p className="text-muted-foreground" data-testid="text-no-pending">
                    No pending reviews! You're all caught up.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingReviews.map((feedback) => (
                    <ReviewCard 
                      key={feedback.id} 
                      feedback={feedback} 
                      showReviewee 
                      showAction
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Submitted Reviews</CardTitle>
              <CardDescription>
                Reviews you have already completed
              </CardDescription>
            </CardHeader>
            <CardContent>
              {completedReviews.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground" data-testid="text-no-completed">
                    You haven't submitted any reviews yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {completedReviews.map((feedback) => (
                    <ReviewCard 
                      key={feedback.id} 
                      feedback={feedback} 
                      showReviewee 
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="received" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Feedback About You</CardTitle>
              <CardDescription>
                Reviews others have written about your performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              {myAppraisals.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Star className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground" data-testid="text-no-received">
                    No performance reviews available yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {myAppraisals.map((appraisal) => {
                    const cycle = getAppraisalCycleById(appraisal.cycleId);
                    const score = calculateAppraisalScore(appraisal.id);
                    
                    return (
                      <div
                        key={appraisal.id}
                        className="flex items-center justify-between p-4 rounded-lg border hover-elevate cursor-pointer"
                        data-testid={`appraisal-result-${appraisal.id}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10">
                            <Calendar className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{cycle?.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant={appraisal.status === "completed" ? "default" : "secondary"}>
                                {appraisal.status === "completed" ? "Completed" : "In Progress"}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {cycle?.type === "360" ? "360° Review" : "Manager Review"}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {score !== null && (
                            <div className="text-right">
                              <div className="flex items-center gap-1">
                                <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                                <span className="font-bold">{score.toFixed(1)}</span>
                                <span className="text-muted-foreground">/5</span>
                              </div>
                              <p className="text-xs text-muted-foreground">Weighted Score</p>
                            </div>
                          )}
                          <Link href={`/appraisals/results/${appraisal.id}`}>
                            <Button variant="ghost" size="icon">
                              <ChevronRight className="h-5 w-5" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface ReviewCardProps {
  feedback: AppraisalFeedback;
  showReviewee?: boolean;
  showAction?: boolean;
}

function ReviewCard({ feedback, showReviewee = false, showAction = false }: ReviewCardProps) {
  const appraisal = getAppraisalById(feedback.appraisalId);
  const cycle = appraisal ? getAppraisalCycleById(appraisal.cycleId) : undefined;
  const reviewee = appraisal ? getEmployeeById(appraisal.employeeId) : undefined;
  
  const Icon = reviewerTypeIcons[feedback.reviewerType] || User;
  
  return (
    <div 
      className="flex items-center justify-between p-4 rounded-lg border hover-elevate"
      data-testid={`review-card-${feedback.id}`}
    >
      <div className="flex items-center gap-4">
        {showReviewee && reviewee && (
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary/10 text-primary">
              {reviewee.firstName[0]}{reviewee.lastName[0]}
            </AvatarFallback>
          </Avatar>
        )}
        <div>
          <div className="flex items-center gap-2">
            {showReviewee && reviewee ? (
              <p className="font-medium">{reviewee.firstName} {reviewee.lastName}</p>
            ) : (
              <p className="font-medium">{cycle?.name}</p>
            )}
            <Badge variant="outline" className="text-xs">
              <Icon className="h-3 w-3 mr-1" />
              {reviewerTypeLabels[feedback.reviewerType]}
            </Badge>
          </div>
          <div className="flex items-center gap-2 mt-1">
            {showReviewee && (
              <span className="text-sm text-muted-foreground">{cycle?.name}</span>
            )}
            {feedback.status === "draft" && (
              <Badge variant="secondary" className="text-xs">Draft</Badge>
            )}
            {feedback.submittedAt && (
              <span className="text-xs text-muted-foreground">
                Submitted {new Date(feedback.submittedAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </div>
      {showAction && (
        <Link href={`/appraisals/review/${feedback.id}`}>
          <Button size="sm" data-testid={`button-fill-review-${feedback.id}`}>
            {feedback.status === "draft" ? "Continue" : "Start Review"}
          </Button>
        </Link>
      )}
      {!showAction && feedback.status === "submitted" && (
        <Link href={`/appraisals/review/${feedback.id}`}>
          <Button variant="ghost" size="icon">
            <ChevronRight className="h-5 w-5" />
          </Button>
        </Link>
      )}
    </div>
  );
}
