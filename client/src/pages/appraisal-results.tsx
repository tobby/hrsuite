import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  ArrowLeft,
  Star,
  User,
  Users,
  Calendar,
  MessageSquare,
  Lock,
} from "lucide-react";
import { useRole, canEditOrgSettings } from "@/lib/role-context";
import { Link, useParams } from "wouter";
import {
  getAppraisalById,
  getAppraisalCycleById,
  getEmployeeById,
  getFeedbackByAppraisal,
  getRatingsByFeedback,
  getTemplateById,
  getQuestionsByTemplate,
  getCompetencyById,
  calculateAppraisalScore,
} from "@/lib/demo-data";

const reviewerTypeLabels: Record<string, string> = {
  self: "Self-Assessment",
  manager: "Manager Review",
  peer: "Peer Feedback",
  subordinate: "Upward Feedback",
};

export default function AppraisalResults() {
  const { id } = useParams<{ id: string }>();
  const { role, currentUser } = useRole();
  const isAdmin = canEditOrgSettings(role);

  const appraisal = getAppraisalById(id || "");
  const cycle = appraisal ? getAppraisalCycleById(appraisal.cycleId) : undefined;
  const employee = appraisal ? getEmployeeById(appraisal.employeeId) : undefined;
  const template = cycle?.templateId ? getTemplateById(cycle.templateId) : undefined;
  const questions = template ? getQuestionsByTemplate(template.id) : [];
  const feedback = appraisal ? getFeedbackByAppraisal(appraisal.id).filter(f => f.status === "submitted") : [];
  const score = appraisal ? calculateAppraisalScore(appraisal.id) : null;

  if (!appraisal || !cycle || !employee) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <p className="text-muted-foreground">Appraisal not found</p>
        <Link href="/appraisals">
          <Button variant="ghost">Back to Appraisals</Button>
        </Link>
      </div>
    );
  }

  // Calculate average ratings by question
  const questionAverages: Record<string, { total: number; count: number }> = {};
  feedback.forEach(f => {
    const ratings = getRatingsByFeedback(f.id);
    ratings.forEach(r => {
      if (r.rating !== null) {
        if (!questionAverages[r.questionId]) {
          questionAverages[r.questionId] = { total: 0, count: 0 };
        }
        questionAverages[r.questionId].total += r.rating;
        questionAverages[r.questionId].count += 1;
      }
    });
  });

  // Separate feedback by type
  const selfFeedback = feedback.find(f => f.reviewerType === "self");
  const managerFeedback = feedback.find(f => f.reviewerType === "manager");
  const peerFeedback = feedback.filter(f => f.reviewerType === "peer");

  const ratingQuestions = questions.filter(q => q.questionType === "rating");

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
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-results-title">
            Performance Review Results
          </h1>
          <p className="text-muted-foreground">{cycle.name}</p>
        </div>
      </div>

      {/* Employee Info + Score */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="flex items-center gap-4 py-6">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary/10 text-primary text-xl">
                {employee.firstName[0]}{employee.lastName[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="text-xl font-semibold">{employee.firstName} {employee.lastName}</p>
              <p className="text-muted-foreground">{employee.position}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={cycle.type === "360" ? "default" : "secondary"}>
                  {cycle.type === "360" ? "360° Review" : "Manager Review"}
                </Badge>
                <Badge variant={appraisal.status === "completed" ? "default" : "secondary"}>
                  {appraisal.status === "completed" ? "Completed" : "In Progress"}
                </Badge>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {new Date(cycle.startDate).toLocaleDateString()} - {new Date(cycle.endDate).toLocaleDateString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Overall Score</CardTitle>
          </CardHeader>
          <CardContent>
            {score !== null ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-6 w-6 ${
                        star <= Math.round(score)
                          ? "text-amber-500 fill-amber-500"
                          : "text-muted-foreground/30"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-2xl font-bold">{score.toFixed(2)}</span>
                <span className="text-muted-foreground">/5</span>
              </div>
            ) : (
              <p className="text-muted-foreground">Not enough data</p>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Weighted: Self {cycle.selfWeight}% | Peer {cycle.peerWeight}% | Manager {cycle.managerWeight}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Rating Breakdown */}
      {ratingQuestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Competency Ratings</CardTitle>
            <CardDescription>Average ratings across all reviewers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {ratingQuestions.map((question) => {
                const avg = questionAverages[question.id];
                const avgRating = avg ? avg.total / avg.count : null;
                const competency = question.competencyId ? getCompetencyById(question.competencyId) : null;
                
                return (
                  <div key={question.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex-1">
                      <p className="font-medium">{question.questionText}</p>
                      {competency && (
                        <Badge variant="outline" className="text-xs mt-1">{competency.category}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {avgRating !== null ? (
                        <>
                          <div className="flex items-center">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`h-4 w-4 ${
                                  star <= Math.round(avgRating)
                                    ? "text-amber-500 fill-amber-500"
                                    : "text-muted-foreground/30"
                                }`}
                              />
                            ))}
                          </div>
                          <span className="font-medium text-sm">{avgRating.toFixed(1)}</span>
                        </>
                      ) : (
                        <span className="text-sm text-muted-foreground">No ratings</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manager Feedback */}
      {managerFeedback && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <CardTitle>Manager Feedback</CardTitle>
            </div>
            <CardDescription>
              From {getEmployeeById(managerFeedback.reviewerId)?.firstName} {getEmployeeById(managerFeedback.reviewerId)?.lastName}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-muted/50 rounded-lg">
              <MessageSquare className="h-4 w-4 text-muted-foreground mb-2" />
              <p className="text-sm">{managerFeedback.overallComment}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Self Assessment */}
      {selfFeedback && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <CardTitle>Self-Assessment</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-muted/50 rounded-lg">
              <MessageSquare className="h-4 w-4 text-muted-foreground mb-2" />
              <p className="text-sm">{selfFeedback.overallComment}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Peer Feedback - Anonymous to non-admins */}
      {peerFeedback.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <CardTitle>Peer Feedback</CardTitle>
              {!isAdmin && (
                <Badge variant="outline" className="text-xs">
                  <Lock className="h-3 w-3 mr-1" />
                  Anonymous
                </Badge>
              )}
            </div>
            <CardDescription>
              {peerFeedback.length} peer review{peerFeedback.length > 1 ? "s" : ""} submitted
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {peerFeedback.map((peer, index) => {
              const reviewer = isAdmin ? getEmployeeById(peer.reviewerId) : null;
              
              return (
                <div key={peer.id} className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    {isAdmin && reviewer ? (
                      <>
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {reviewer.firstName[0]}{reviewer.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{reviewer.firstName} {reviewer.lastName}</span>
                      </>
                    ) : (
                      <>
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs bg-muted">
                            <User className="h-3 w-3" />
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium text-muted-foreground">Peer {index + 1}</span>
                      </>
                    )}
                  </div>
                  <p className="text-sm">{peer.overallComment || "No comment provided"}</p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
