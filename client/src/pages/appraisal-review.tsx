import { useState, useMemo, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  ArrowLeft,
  Star,
  Save,
  Send,
  CheckCircle2,
} from "lucide-react";
import { Link, useParams, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import {
  getAppraisalById,
  getAppraisalCycleById,
  getEmployeeById,
  getTemplateById,
  getQuestionsByTemplate,
  getCompetencyById,
} from "@/lib/demo-data";
import { useAppraisalStore } from "@/lib/appraisal-store";
import type { TemplateQuestion } from "@shared/schema";

const reviewerTypeLabels: Record<string, string> = {
  self: "Self-Assessment",
  manager: "Manager Review",
  peer: "Peer Review",
  subordinate: "Upward Feedback",
};

export default function AppraisalReview() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const { getFeedbackById, getRatingsByFeedback, saveDraft, submitReview, feedback: allFeedback, ratings: allRatings } = useAppraisalStore();
  
  const feedback = getFeedbackById(id || "");
  const appraisal = feedback ? getAppraisalById(feedback.appraisalId) : undefined;
  const cycle = appraisal ? getAppraisalCycleById(appraisal.cycleId) : undefined;
  const reviewee = appraisal ? getEmployeeById(appraisal.employeeId) : undefined;
  const template = cycle?.templateId ? getTemplateById(cycle.templateId) : undefined;
  const questions = template ? getQuestionsByTemplate(template.id) : [];
  
  // Get existing ratings from store (reactive to store changes)
  const existingRatings = feedback ? getRatingsByFeedback(feedback.id) : [];

  // Local state for form editing - will be synced from store
  const [localRatings, setLocalRatings] = useState<Record<string, number | null>>({});
  const [localTextResponses, setLocalTextResponses] = useState<Record<string, string>>({});
  const [localOverallComment, setLocalOverallComment] = useState("");
  const hasInitialized = useRef(false);

  // Sync local state from store when feedback/ratings change or on mount
  useEffect(() => {
    if (!feedback) return;
    
    const newRatings: Record<string, number | null> = {};
    const newTextResponses: Record<string, string> = {};
    
    existingRatings.forEach(r => {
      if (r.rating !== null) {
        newRatings[r.questionId] = r.rating;
      }
      if (r.textResponse) {
        newTextResponses[r.questionId] = r.textResponse;
      }
    });
    
    // Only update if we haven't initialized yet OR if store has new data
    if (!hasInitialized.current) {
      setLocalRatings(newRatings);
      setLocalTextResponses(newTextResponses);
      setLocalOverallComment(feedback.overallComment || "");
      hasInitialized.current = true;
    }
  }, [feedback?.id, allRatings.length, allFeedback.length]);

  // Reset initialization flag when changing to a different review
  useEffect(() => {
    hasInitialized.current = false;
  }, [id]);

  const isReadOnly = feedback?.status === "submitted";
  const isDraft = feedback?.status === "draft";

  const ratingQuestions = questions.filter(q => q.questionType === "rating");
  const textQuestions = questions.filter(q => q.questionType === "text");

  const progress = useMemo(() => {
    const totalRatings = ratingQuestions.length;
    const completedRatings = ratingQuestions.filter(q => localRatings[q.id] !== undefined && localRatings[q.id] !== null).length;
    return totalRatings > 0 ? Math.round((completedRatings / totalRatings) * 100) : 0;
  }, [localRatings, ratingQuestions]);

  const canSubmit = useMemo(() => {
    // All rating questions must be answered
    const allRatingsComplete = ratingQuestions.every(q => localRatings[q.id] !== undefined && localRatings[q.id] !== null);
    // Overall comment is required
    const hasOverallComment = localOverallComment.trim().length > 0;
    return allRatingsComplete && hasOverallComment;
  }, [localRatings, ratingQuestions, localOverallComment]);

  const handleSaveDraft = () => {
    if (!feedback) return;
    saveDraft(feedback.id, localOverallComment, localRatings, localTextResponses);
    toast({
      title: "Draft Saved",
      description: "Your review has been saved as a draft.",
    });
  };

  const handleSubmit = () => {
    if (!feedback) return;
    if (!canSubmit) {
      toast({
        title: "Incomplete Review",
        description: "Please complete all ratings and provide an overall comment.",
        variant: "destructive",
      });
      return;
    }
    
    submitReview(feedback.id, localOverallComment, localRatings, localTextResponses);
    toast({
      title: "Review Submitted",
      description: "Your feedback has been submitted successfully.",
    });
    navigate("/appraisals");
  };

  if (!feedback || !appraisal || !cycle || !reviewee) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <p className="text-muted-foreground">Review not found</p>
        <Link href="/appraisals">
          <Button variant="ghost">Back to Appraisals</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/appraisals">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight" data-testid="text-review-title">
              {reviewerTypeLabels[feedback.reviewerType]}
            </h1>
            {isReadOnly && (
              <Badge variant="default">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Submitted
              </Badge>
            )}
            {isDraft && (
              <Badge variant="secondary">Draft</Badge>
            )}
          </div>
          <p className="text-muted-foreground">{cycle.name}</p>
        </div>
        {!isReadOnly && (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleSaveDraft} data-testid="button-save-draft">
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </Button>
            <Button onClick={handleSubmit} disabled={!canSubmit} data-testid="button-submit-review">
              <Send className="h-4 w-4 mr-2" />
              Submit Review
            </Button>
          </div>
        )}
      </div>

      {/* Reviewee Info */}
      <Card>
        <CardContent className="flex items-center gap-4 py-4">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-primary/10 text-primary text-lg">
              {reviewee.firstName[0]}{reviewee.lastName[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="font-semibold">{reviewee.firstName} {reviewee.lastName}</p>
            <p className="text-sm text-muted-foreground">{reviewee.position}</p>
          </div>
          <div className="text-right">
            <Badge variant={cycle.type === "360" ? "default" : "secondary"}>
              {cycle.type === "360" ? "360° Review" : "Manager Review"}
            </Badge>
            <p className="text-xs text-muted-foreground mt-1">
              Due: {new Date(cycle.endDate).toLocaleDateString()}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Progress */}
      {!isReadOnly && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Progress</span>
              <span className="text-sm text-muted-foreground">{progress}% complete</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rating Questions */}
      {ratingQuestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Performance Ratings</CardTitle>
            <CardDescription>Rate each competency on a scale of 1-5 stars</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {ratingQuestions.map((question) => (
              <RatingQuestion
                key={question.id}
                question={question}
                value={localRatings[question.id] ?? null}
                onChange={(value) => setLocalRatings({ ...localRatings, [question.id]: value })}
                readOnly={isReadOnly}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Text Questions */}
      {textQuestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Written Feedback</CardTitle>
            <CardDescription>Provide detailed feedback for each question</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {textQuestions.map((question) => (
              <div key={question.id} className="space-y-2">
                <Label>{question.questionText}</Label>
                <Textarea
                  value={localTextResponses[question.id] || ""}
                  onChange={(e) => setLocalTextResponses({ ...localTextResponses, [question.id]: e.target.value })}
                  placeholder="Enter your response..."
                  className="min-h-[100px]"
                  disabled={isReadOnly}
                  data-testid={`input-text-${question.id}`}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Overall Comments */}
      <Card>
        <CardHeader>
          <CardTitle>Overall Comments <span className="text-destructive">*</span></CardTitle>
          <CardDescription>
            Summarize your overall feedback and any additional observations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={localOverallComment}
            onChange={(e) => setLocalOverallComment(e.target.value)}
            placeholder="Provide your overall assessment..."
            className="min-h-[150px]"
            disabled={isReadOnly}
            data-testid="input-overall-comment"
          />
          {!isReadOnly && !localOverallComment.trim() && (
            <p className="text-xs text-muted-foreground mt-2">
              Overall comments are required to submit the review
            </p>
          )}
        </CardContent>
      </Card>

      {/* Bottom Actions */}
      {!isReadOnly && (
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={handleSaveDraft}>
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            <Send className="h-4 w-4 mr-2" />
            Submit Review
          </Button>
        </div>
      )}
    </div>
  );
}

interface RatingQuestionProps {
  question: TemplateQuestion;
  value: number | null;
  onChange: (value: number) => void;
  readOnly?: boolean;
}

function RatingQuestion({ question, value, onChange, readOnly = false }: RatingQuestionProps) {
  const competency = question.competencyId ? getCompetencyById(question.competencyId) : null;
  
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-base">{question.questionText}</Label>
        {competency && (
          <Badge variant="outline" className="ml-2 text-xs">
            {competency.category}
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => !readOnly && onChange(star)}
            disabled={readOnly}
            className={`p-1 transition-colors ${readOnly ? "cursor-default" : "cursor-pointer"}`}
            data-testid={`rating-${question.id}-star-${star}`}
          >
            <Star 
              className={`h-7 w-7 ${
                value !== null && star <= value
                  ? "text-amber-500 fill-amber-500"
                  : "text-muted-foreground/30"
              }`}
            />
          </button>
        ))}
        {value !== null && (
          <span className="ml-2 text-sm text-muted-foreground">
            {value}/5
          </span>
        )}
      </div>
    </div>
  );
}
