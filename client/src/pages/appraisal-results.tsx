import { useMemo } from "react";
import { Link, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useRole } from "@/lib/role-context";
import { Star, ArrowLeft, User, MessageSquare, Clock } from "lucide-react";
import { format } from "date-fns";

interface AppraisalDetail {
  appraisal: {
    id: string;
    cycleId: string;
    employeeId: string;
    status: string;
    overallRating: number | null;
    createdAt: string;
  };
  cycle: {
    id: string;
    name: string;
    type: string;
    selfWeight: number;
    peerWeight: number;
    managerWeight: number;
  };
  feedbacks: Array<{
    feedback: {
      id: string;
      appraisalId: string;
      reviewerId: string;
      reviewerType: string;
      overallComment: string | null;
      submittedAt: string | null;
      status: string;
    };
    ratings: Array<{
      id: string;
      feedbackId: string;
      questionId: string;
      rating: number | null;
      textResponse: string | null;
    }>;
    reviewer: {
      id: string;
      firstName: string;
      lastName: string;
    };
  }>;
  questions: Array<{
    id: string;
    templateId: string;
    questionText: string;
    questionType: string;
    order: number;
    section: string | null;
    sectionId: string | null;
    reviewerTypes: string[] | null;
  }>;
  sections: Array<{
    id: string;
    name: string;
    order: number;
  }>;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

const reviewerTypeLabels: Record<string, string> = {
  self: "Self Review",
  peer: "Peer Review",
  manager: "Manager Review",
};

const reviewerTypeVariants: Record<string, "default" | "secondary" | "outline"> = {
  self: "secondary",
  manager: "default",
  peer: "outline",
};

function StarDisplay({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: max }, (_, i) => (
        <Star
          key={i}
          className={`h-5 w-5 ${i < Math.round(value) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
        />
      ))}
      <span className="ml-2 text-sm font-medium">{value.toFixed(1)}/{max}</span>
    </div>
  );
}

function LargeStarDisplay({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: max }, (_, i) => (
        <Star
          key={i}
          className={`h-8 w-8 ${i < Math.round(value) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
        />
      ))}
      <span className="ml-3 text-2xl font-bold">{value.toFixed(1)}/{max}</span>
    </div>
  );
}

function isQuestionVisibleToReviewer(
  reviewerTypes: string[] | null,
  reviewerType: string
): boolean {
  if (!reviewerTypes || reviewerTypes.length === 0) return true;
  return reviewerTypes.includes(reviewerType);
}

function getAverageRating(
  ratings: Array<{ questionId: string; rating: number | null }>,
  questions: Array<{ id: string; questionType: string; reviewerTypes: string[] | null }>,
  reviewerType: string
): number {
  const visibleRatingQuestionIds = new Set(
    questions
      .filter((q) => q.questionType === "rating" && isQuestionVisibleToReviewer(q.reviewerTypes, reviewerType))
      .map((q) => q.id)
  );
  const ratingValues = ratings
    .filter((r) => visibleRatingQuestionIds.has(r.questionId) && r.rating != null)
    .map((r) => r.rating as number);
  if (ratingValues.length === 0) return 0;
  return ratingValues.reduce((sum, v) => sum + v, 0) / ratingValues.length;
}

function buildSectionGroups(
  questions: Array<{ id: string; questionText: string; questionType: string; order: number; sectionId: string | null; reviewerTypes: string[] | null }>,
  sections: Array<{ id: string; name: string; order: number }>,
  reviewerType: string
) {
  const sectionLookup = new Map<string, { name: string; order: number }>();
  for (const s of sections) {
    sectionLookup.set(s.id, { name: s.name, order: s.order });
  }

  const visibleQuestions = questions.filter(q =>
    isQuestionVisibleToReviewer(q.reviewerTypes, reviewerType)
  );

  const sectionMap = new Map<string, { name: string; order: number; questions: typeof visibleQuestions }>();

  for (const q of visibleQuestions) {
    const sectionInfo = q.sectionId ? sectionLookup.get(q.sectionId) : null;
    const key = q.sectionId && sectionInfo ? q.sectionId : "__general__";
    const name = sectionInfo ? sectionInfo.name : "General";
    const order = sectionInfo ? sectionInfo.order : 999999;

    if (!sectionMap.has(key)) {
      sectionMap.set(key, { name, order, questions: [] });
    }
    sectionMap.get(key)!.questions.push(q);
  }

  const result = Array.from(sectionMap.values());
  result.sort((a, b) => a.order - b.order);
  for (const s of result) {
    s.questions.sort((a, b) => a.order - b.order);
  }
  return result;
}

export default function AppraisalResults() {
  const params = useParams<{ id: string }>();
  const { role } = useRole();

  const { data, isLoading, error } = useQuery<AppraisalDetail>({
    queryKey: ["/api/appraisals", params.id],
  });

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4 flex-wrap">
          <Skeleton className="h-9 w-9" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-7 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <Skeleton className="h-32 w-full" />
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6 space-y-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4 flex-wrap">
          <Link href="/appraisals">
            <Button variant="ghost" size="icon" data-testid="button-back-appraisals">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-semibold tracking-tight" data-testid="text-results-title">
              Appraisal Not Found
            </h1>
            <p className="text-muted-foreground">
              This appraisal does not exist or you do not have access to it.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const employeeName = data.employee ? `${data.employee.firstName} ${data.employee.lastName}` : "Unknown";
  const isCompleted = data.appraisal?.status === "completed";
  const feedbacks = data.feedbacks || [];
  const submittedFeedbacks = feedbacks.filter(
    (f) => f.feedback.status === "submitted"
  );
  const totalFeedbacks = feedbacks.length;
  const submittedCount = submittedFeedbacks.length;
  const sections = data.sections || [];

  const selfFeedbacks = feedbacks.filter(
    (f) => f.feedback.reviewerType === "self" && f.feedback.status === "submitted"
  );
  const managerFeedbacks = feedbacks.filter(
    (f) => f.feedback.reviewerType === "manager" && f.feedback.status === "submitted"
  );
  const peerFeedbacks = feedbacks.filter(
    (f) => f.feedback.reviewerType === "peer" && f.feedback.status === "submitted"
  );

  const selfAvg =
    selfFeedbacks.length > 0
      ? getAverageRating(selfFeedbacks[0].ratings, data.questions, "self")
      : 0;
  const managerAvg =
    managerFeedbacks.length > 0
      ? getAverageRating(managerFeedbacks[0].ratings, data.questions, "manager")
      : 0;
  const peerAvgs = peerFeedbacks.map((f) =>
    getAverageRating(f.ratings, data.questions, "peer")
  );
  const peerAvg =
    peerAvgs.length > 0
      ? peerAvgs.reduce((sum, v) => sum + v, 0) / peerAvgs.length
      : 0;

  const selfContribution =
    selfFeedbacks.length > 0
      ? (selfAvg * data.cycle.selfWeight) / 100
      : 0;
  const managerContribution =
    managerFeedbacks.length > 0
      ? (managerAvg * data.cycle.managerWeight) / 100
      : 0;
  const peerContribution =
    peerFeedbacks.length > 0
      ? (peerAvg * data.cycle.peerWeight) / 100
      : 0;
  const totalWeightedScore = selfContribution + managerContribution + peerContribution;

  const overallRating = data.appraisal.overallRating ?? totalWeightedScore;

  if (!isCompleted) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4 flex-wrap">
          <Link href="/appraisals">
            <Button variant="ghost" size="icon" data-testid="button-back-appraisals">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-semibold tracking-tight" data-testid="text-results-title">
              Appraisal Results - {employeeName}
            </h1>
            <p className="text-muted-foreground text-sm mt-1" data-testid="text-cycle-name">
              {data.cycle.name}
            </p>
          </div>
          <Badge variant="outline" data-testid="badge-status">
            <Clock className="h-3 w-3 mr-1" />
            In Progress
          </Badge>
        </div>

        <Card data-testid="card-pending-message">
          <CardContent className="p-6">
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Clock className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium" data-testid="text-pending-title">
                Review Still in Progress
              </h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-md" data-testid="text-pending-description">
                This appraisal has not been completed yet. {submittedCount} of {totalFeedbacks} reviews completed.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4 flex-wrap">
        <Link href="/appraisals">
          <Button variant="ghost" size="icon" data-testid="button-back-appraisals">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold tracking-tight" data-testid="text-results-title">
            Appraisal Results - {employeeName}
          </h1>
          <p className="text-muted-foreground text-sm mt-1" data-testid="text-cycle-name">
            {data.cycle.name}
          </p>
        </div>
        <Badge
          variant="default"
          className="bg-green-600 dark:bg-green-700"
          data-testid="badge-status"
        >
          Completed
        </Badge>
      </div>

      <Card data-testid="card-overall-rating">
        <CardContent className="p-6">
          <div className="flex flex-col items-center gap-3 py-4">
            <h2 className="text-lg font-semibold text-muted-foreground">Overall Rating</h2>
            <LargeStarDisplay value={overallRating} />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold" data-testid="text-feedback-section-title">
          Feedback Breakdown
        </h2>

        {feedbacks
          .filter((f) => f.feedback.status === "submitted")
          .sort((a, b) => {
            const order: Record<string, number> = { self: 0, manager: 1, peer: 2 };
            return (order[a.feedback.reviewerType] ?? 3) - (order[b.feedback.reviewerType] ?? 3);
          })
          .map((fb) => {
            const isPeer = fb.feedback.reviewerType === "peer";
            const reviewerName = isPeer
              ? "Anonymous Peer"
              : `${fb.reviewer.firstName} ${fb.reviewer.lastName}`;
            const feedbackAvg = getAverageRating(fb.ratings, data.questions, fb.feedback.reviewerType);
            const sectionGroups = buildSectionGroups(data.questions, sections, fb.feedback.reviewerType);

            return (
              <Card key={fb.feedback.id} data-testid={`card-feedback-${fb.feedback.id}`}>
                <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <Badge
                      variant={reviewerTypeVariants[fb.feedback.reviewerType] || "outline"}
                      data-testid={`badge-reviewer-type-${fb.feedback.id}`}
                    >
                      {reviewerTypeLabels[fb.feedback.reviewerType] || fb.feedback.reviewerType}
                    </Badge>
                    <div className="flex items-center gap-1.5 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span data-testid={`text-reviewer-name-${fb.feedback.id}`}>
                        {reviewerName}
                      </span>
                    </div>
                  </div>
                  {fb.feedback.submittedAt && (
                    <span
                      className="text-xs text-muted-foreground whitespace-nowrap"
                      data-testid={`text-submitted-date-${fb.feedback.id}`}
                    >
                      {format(new Date(fb.feedback.submittedAt), "MMM d, yyyy")}
                    </span>
                  )}
                </CardHeader>
                <CardContent className="space-y-4 pt-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Average:</span>
                    <StarDisplay value={feedbackAvg} />
                  </div>

                  <div className="space-y-3">
                    {(() => {
                      let questionNum = 0;
                      return sectionGroups.map((sectionGroup) => (
                        <div key={sectionGroup.name}>
                          {sectionGroups.length > 1 && (
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-3 mb-2 border-t pt-3"
                               data-testid={`text-result-section-${fb.feedback.id}-${sectionGroup.name.toLowerCase().replace(/\s+/g, '-')}`}>
                              {sectionGroup.name}
                            </p>
                          )}
                          {sectionGroup.questions.map((question) => {
                            questionNum++;
                            const rating = fb.ratings.find(
                              (r) => r.questionId === question.id
                            );
                            return (
                              <div
                                key={question.id}
                                className="border-t pt-3 first:border-t-0 first:pt-0"
                                data-testid={`question-response-${fb.feedback.id}-${question.id}`}
                              >
                                <p className="text-sm font-medium mb-1.5">
                                  {questionNum}. {question.questionText}
                                </p>
                                {question.questionType === "rating" ? (
                                  <StarDisplay value={rating?.rating ?? 0} />
                                ) : (
                                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                    {rating?.textResponse || "No response provided"}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ));
                    })()}
                  </div>

                  {fb.feedback.overallComment && (
                    <div className="border-t pt-3">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Overall Comment</span>
                      </div>
                      <p
                        className="text-sm text-muted-foreground whitespace-pre-wrap"
                        data-testid={`text-overall-comment-${fb.feedback.id}`}
                      >
                        {fb.feedback.overallComment}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
      </div>

      <Card data-testid="card-weighted-score">
        <CardHeader>
          <CardTitle className="text-lg">Weighted Score Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            {selfFeedbacks.length > 0 && (
              <div
                className="flex items-center justify-between text-sm"
                data-testid="row-self-score"
              >
                <span>
                  Self Review: {selfAvg.toFixed(2)} x {data.cycle.selfWeight}%
                </span>
                <span className="font-medium">{selfContribution.toFixed(2)}</span>
              </div>
            )}
            {managerFeedbacks.length > 0 && (
              <div
                className="flex items-center justify-between text-sm"
                data-testid="row-manager-score"
              >
                <span>
                  Manager Review: {managerAvg.toFixed(2)} x {data.cycle.managerWeight}%
                </span>
                <span className="font-medium">{managerContribution.toFixed(2)}</span>
              </div>
            )}
            {peerFeedbacks.length > 0 && (
              <div
                className="flex items-center justify-between text-sm"
                data-testid="row-peer-score"
              >
                <span>
                  Peer Reviews: {peerAvg.toFixed(2)} x {data.cycle.peerWeight}%
                </span>
                <span className="font-medium">{peerContribution.toFixed(2)}</span>
              </div>
            )}
          </div>
          <div className="border-t pt-3 flex items-center justify-between">
            <span className="font-semibold">Final Weighted Score</span>
            <span className="font-bold text-lg" data-testid="text-final-score">
              {totalWeightedScore.toFixed(2)}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
