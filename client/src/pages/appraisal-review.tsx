import { useState, useEffect, useMemo } from "react";
import { Link, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useRole } from "@/lib/role-context";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Star, ArrowLeft, Send, Check } from "lucide-react";

interface FeedbackDetail {
  feedback: {
    id: string;
    appraisalId: string;
    reviewerId: string;
    reviewerType: string;
    overallComment: string | null;
    submittedAt: string | null;
    status: string;
  };
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
  };
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
  ratings: Array<{
    id: string;
    feedbackId: string;
    questionId: string;
    rating: number | null;
    textResponse: string | null;
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

function StarRating({ value, onChange, readonly }: { value: number; onChange?: (v: number) => void; readonly?: boolean }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onClick={() => !readonly && onChange?.(star)}
          className={readonly ? "cursor-default" : "cursor-pointer"}
          data-testid={`star-${star}`}
        >
          <Star className={`h-6 w-6 ${star <= value ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
        </button>
      ))}
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

export default function AppraisalReview() {
  const params = useParams<{ id: string }>();

  const { toast } = useToast();
  const { role } = useRole();

  const { data, isLoading, error } = useQuery<FeedbackDetail>({
    queryKey: ["/api/feedback", params.id],
  });

  const [ratings, setRatings] = useState<Record<string, { rating?: number; textResponse?: string }>>({});
  const [overallComment, setOverallComment] = useState("");

  useEffect(() => {
    if (data) {
      const initialRatings: Record<string, { rating?: number; textResponse?: string }> = {};
      for (const r of data.ratings) {
        initialRatings[r.questionId] = {
          rating: r.rating ?? undefined,
          textResponse: r.textResponse ?? undefined,
        };
      }
      setRatings(initialRatings);
      setOverallComment(data.feedback.overallComment ?? "");
    }
  }, [data]);

  const filteredQuestions = useMemo(() => {
    if (!data) return [];
    const reviewerType = data.feedback.reviewerType;
    return data.questions.filter(q =>
      isQuestionVisibleToReviewer(q.reviewerTypes, reviewerType)
    );
  }, [data]);

  const groupedSections = useMemo(() => {
    if (!data) return [];

    const sectionLookup = new Map<string, { name: string; order: number }>();
    for (const s of (data.sections || [])) {
      sectionLookup.set(s.id, { name: s.name, order: s.order });
    }

    const sectionMap = new Map<string, { name: string; order: number; questions: typeof filteredQuestions }>();

    for (const q of filteredQuestions) {
      const sectionInfo = q.sectionId ? sectionLookup.get(q.sectionId) : null;
      const key = q.sectionId && sectionInfo ? q.sectionId : "__general__";
      const name = sectionInfo ? sectionInfo.name : "General";
      const order = sectionInfo ? sectionInfo.order : 999999;

      if (!sectionMap.has(key)) {
        sectionMap.set(key, { name, order, questions: [] });
      }
      sectionMap.get(key)!.questions.push(q);
    }

    const sections = Array.from(sectionMap.values());
    sections.sort((a, b) => a.order - b.order);
    for (const s of sections) {
      s.questions.sort((a, b) => a.order - b.order);
    }

    return sections;
  }, [data, filteredQuestions]);

  const submitMutation = useMutation({
    mutationFn: async (payload: { overallComment: string; ratings: Array<{ questionId: string; rating?: number; textResponse?: string }> }) => {
      const res = await apiRequest("POST", `/api/feedback/${params.id}/submit`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feedback", params.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/appraisals"] });
      toast({ title: "Review submitted", description: "Your feedback has been submitted successfully." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  function handleSubmit() {
    if (!data) return;

    const errors: string[] = [];

    for (const q of filteredQuestions) {
      const r = ratings[q.id];
      if (q.questionType === "rating" && (!r || !r.rating)) {
        errors.push(`Please provide a rating for: "${q.questionText}"`);
      }
      if (q.questionType === "text" && (!r || !r.textResponse?.trim())) {
        errors.push(`Please provide a response for: "${q.questionText}"`);
      }
    }

    if (!overallComment.trim()) {
      errors.push("Please provide an overall comment.");
    }

    if (errors.length > 0) {
      toast({
        title: "Validation Error",
        description: errors[0],
        variant: "destructive",
      });
      return;
    }

    const ratingsPayload = filteredQuestions.map(q => {
      const r = ratings[q.id] || {};
      if (q.questionType === "rating") {
        return { questionId: q.id, rating: r.rating };
      }
      return { questionId: q.id, textResponse: r.textResponse };
    });

    submitMutation.mutate({ overallComment: overallComment.trim(), ratings: ratingsPayload });
  }

  function updateRating(questionId: string, value: number) {
    setRatings(prev => ({
      ...prev,
      [questionId]: { ...prev[questionId], rating: value },
    }));
  }

  function updateTextResponse(questionId: string, value: string) {
    setRatings(prev => ({
      ...prev,
      [questionId]: { ...prev[questionId], textResponse: value },
    }));
  }

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-9" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-7 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardContent className="p-6 space-y-3">
              <Skeleton className="h-5 w-3/4" />
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
        <div className="flex items-center gap-4">
          <Link href="/appraisals">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-semibold tracking-tight" data-testid="text-review-title">
              Review Not Found
            </h1>
            <p className="text-muted-foreground">This review does not exist or you do not have access to it.</p>
          </div>
        </div>
      </div>
    );
  }

  const isSubmitted = data.feedback?.status === "submitted";
  const employeeName = data.employee ? `${data.employee.firstName} ${data.employee.lastName}` : "Unknown";
  const reviewerTypeLabel = reviewerTypeLabels[data.feedback?.reviewerType] || data.feedback?.reviewerType || "Review";

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4 flex-wrap">
        <Link href="/appraisals">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-lg font-semibold tracking-tight" data-testid="text-review-title">
              Review for {employeeName}
            </h1>
            <Badge variant="secondary" data-testid="badge-reviewer-type">
              {reviewerTypeLabel}
            </Badge>
            {isSubmitted && (
              <Badge variant="outline" className="text-green-600 border-green-600 dark:text-green-400 dark:border-green-400" data-testid="badge-submitted">
                <Check className="h-3 w-3 mr-1" />
                Already submitted
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-sm mt-1" data-testid="text-cycle-name">
            {data.cycle.name}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {(() => {
          let questionNum = 0;
          return groupedSections.map((section) => (
            <div key={section.name} className="space-y-4" data-testid={`section-${section.name.toLowerCase().replace(/\s+/g, '-')}`}>
              {groupedSections.length > 1 && (
                <h2 className="text-lg font-semibold border-b pb-2" data-testid={`text-section-title-${section.name.toLowerCase().replace(/\s+/g, '-')}`}>
                  {section.name}
                </h2>
              )}
              {section.questions.map((question) => {
                questionNum++;
                const currentRating = ratings[question.id];
                return (
                  <Card key={question.id} data-testid={`card-question-${question.id}`}>
                    <CardContent className="p-6 space-y-3">
                      <div className="flex items-start gap-2">
                        <span className="text-sm font-medium text-muted-foreground mt-0.5">{questionNum}.</span>
                        <p className="font-medium" data-testid={`text-question-${question.id}`}>{question.questionText}</p>
                      </div>

                      {question.questionType === "rating" ? (
                        isSubmitted ? (
                          <div className="pl-5">
                            <StarRating value={currentRating?.rating ?? 0} readonly />
                          </div>
                        ) : (
                          <div className="pl-5">
                            <StarRating
                              value={currentRating?.rating ?? 0}
                              onChange={(v) => updateRating(question.id, v)}
                            />
                          </div>
                        )
                      ) : (
                        isSubmitted ? (
                          <div className="pl-5">
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap" data-testid={`text-response-${question.id}`}>
                              {currentRating?.textResponse || "No response provided"}
                            </p>
                          </div>
                        ) : (
                          <div className="pl-5">
                            <Textarea
                              value={currentRating?.textResponse ?? ""}
                              onChange={(e) => updateTextResponse(question.id, e.target.value)}
                              placeholder="Enter your response..."
                              rows={3}
                              data-testid={`input-response-${question.id}`}
                            />
                          </div>
                        )
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ));
        })()}
      </div>

      <Card data-testid="card-overall-comment">
        <CardContent className="p-6 space-y-3">
          <p className="font-medium">Overall Comment</p>
          {isSubmitted ? (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap" data-testid="text-overall-comment">
              {overallComment || "No overall comment provided"}
            </p>
          ) : (
            <Textarea
              value={overallComment}
              onChange={(e) => setOverallComment(e.target.value)}
              placeholder="Provide an overall comment about the employee's performance..."
              rows={4}
              data-testid="input-overall-comment"
            />
          )}
        </CardContent>
      </Card>

      {!isSubmitted && (
        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={submitMutation.isPending}
            data-testid="button-submit-review"
          >
            {submitMutation.isPending ? (
              "Submitting..."
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Submit Review
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
