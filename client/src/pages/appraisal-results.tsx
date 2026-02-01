import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft,
  Star,
  User,
  Users,
  Calendar,
  MessageSquare,
  Lock,
  TrendingUp,
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

const reviewerTypeIcons: Record<string, typeof User> = {
  self: User,
  manager: Users,
  peer: Users,
  subordinate: Users,
};

export default function AppraisalResults() {
  const { id } = useParams<{ id: string }>();
  const { role } = useRole();
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
        <p className="text-muted-foreground" data-testid="text-appraisal-not-found">Appraisal not found</p>
        <Link href="/appraisals">
          <Button variant="ghost" data-testid="button-back-appraisals-error">Back to Appraisals</Button>
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

  // Group ratings by competency category
  const competencyGroups: Record<string, { questions: typeof ratingQuestions; avgTotal: number; count: number }> = {};
  ratingQuestions.forEach(q => {
    const competency = q.competencyId ? getCompetencyById(q.competencyId) : null;
    const category = competency?.category || "General";
    if (!competencyGroups[category]) {
      competencyGroups[category] = { questions: [], avgTotal: 0, count: 0 };
    }
    competencyGroups[category].questions.push(q);
    const avg = questionAverages[q.id];
    if (avg) {
      competencyGroups[category].avgTotal += avg.total / avg.count;
      competencyGroups[category].count += 1;
    }
  });

  const is180Review = cycle.type === "180";

  return (
    <div className="space-y-6 p-6">
      {/* Unified Header with Score */}
      <Card>
        <CardContent className="py-6">
          <div className="flex items-start gap-4 flex-wrap">
            <Link href="/appraisals">
              <Button variant="ghost" size="icon" data-testid="button-back-appraisals">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary/10 text-primary text-xl">
                {employee.firstName[0]}{employee.lastName[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold tracking-tight" data-testid="text-results-title">
                {employee.firstName} {employee.lastName}
              </h1>
              <p className="text-muted-foreground">{employee.position}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge variant="outline">{cycle.name}</Badge>
                <Badge variant={cycle.type === "360" ? "default" : "secondary"}>
                  {cycle.type === "360" ? "360° Review" : "180° Review"}
                </Badge>
                <Badge variant={appraisal.status === "completed" ? "default" : "secondary"}>
                  {appraisal.status === "completed" ? "Completed" : "In Progress"}
                </Badge>
              </div>
              <div className="flex items-center gap-1 mt-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {new Date(cycle.startDate).toLocaleDateString()} - {new Date(cycle.endDate).toLocaleDateString()}
                </span>
              </div>
            </div>
            
            {/* Overall Score - Integrated into header */}
            <div className="flex flex-col items-center p-4 rounded-lg bg-muted/50 min-w-[180px]" data-testid="score-card">
              <p className="text-sm font-medium text-muted-foreground mb-2">Overall Score</p>
              {score !== null ? (
                <>
                  <div className="flex items-center gap-1" data-testid="score-stars">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-5 w-5 ${
                          star <= Math.round(score)
                            ? "text-amber-500 fill-amber-500"
                            : "text-muted-foreground/30"
                        }`}
                      />
                    ))}
                  </div>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-3xl font-bold" data-testid="text-overall-score">{score.toFixed(2)}</span>
                    <span className="text-muted-foreground">/5</span>
                  </div>
                  {!is180Review && (
                    <p className="text-xs text-muted-foreground mt-2 text-center" data-testid="text-weight-breakdown">
                      Self {cycle.selfWeight}% | Peer {cycle.peerWeight}% | Manager {cycle.managerWeight}%
                    </p>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">Not enough data</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabbed Content */}
      <Tabs defaultValue="ratings" className="w-full">
        <TabsList>
          <TabsTrigger value="ratings" data-testid="tab-ratings">
            <TrendingUp className="h-4 w-4 mr-2" />
            Competency Ratings
          </TabsTrigger>
          <TabsTrigger value="feedback" data-testid="tab-feedback">
            <MessageSquare className="h-4 w-4 mr-2" />
            Written Feedback
          </TabsTrigger>
        </TabsList>

        {/* Ratings Tab */}
        <TabsContent value="ratings" className="space-y-4 mt-4">
          {Object.entries(competencyGroups).length > 0 ? (
            Object.entries(competencyGroups).map(([category, { questions: catQuestions, avgTotal, count }]) => {
              const categoryAvg = count > 0 ? avgTotal / count : null;
              
              return (
                <Card key={category}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{category}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {catQuestions.length} question{catQuestions.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      {categoryAvg !== null && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Category Avg:</span>
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                            <span className="font-medium">{categoryAvg.toFixed(1)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {catQuestions.map((question) => {
                        const avg = questionAverages[question.id];
                        const avgRating = avg ? avg.total / avg.count : null;
                        
                        return (
                          <div key={question.id} className="flex items-center justify-between p-3 rounded-lg border">
                            <p className="font-medium flex-1">{question.questionText}</p>
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
                                  <span className="font-medium text-sm w-8 text-right">{avgRating.toFixed(1)}</span>
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
              );
            })
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No competency ratings available yet</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Feedback Tab */}
        <TabsContent value="feedback" className="space-y-4 mt-4">
          {/* Manager Feedback */}
          {managerFeedback && (
            <Card data-testid="card-manager-feedback">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Manager Feedback</CardTitle>
                </div>
                <CardDescription data-testid="text-manager-reviewer">
                  From {getEmployeeById(managerFeedback.reviewerId)?.firstName} {getEmployeeById(managerFeedback.reviewerId)?.lastName}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm whitespace-pre-wrap" data-testid="text-manager-comment">{managerFeedback.overallComment || "No comments provided"}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Self Assessment */}
          {selfFeedback && (
            <Card data-testid="card-self-feedback">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Self-Assessment</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm whitespace-pre-wrap" data-testid="text-self-comment">{selfFeedback.overallComment || "No comments provided"}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Peer Feedback - Anonymous to non-admins */}
          {peerFeedback.length > 0 && (
            <Card data-testid="card-peer-feedback">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Users className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Peer Feedback</CardTitle>
                  {!isAdmin && (
                    <Badge variant="outline" className="text-xs" data-testid="badge-anonymous">
                      <Lock className="h-3 w-3 mr-1" />
                      Anonymous
                    </Badge>
                  )}
                </div>
                <CardDescription data-testid="text-peer-count">
                  {peerFeedback.length} peer review{peerFeedback.length > 1 ? "s" : ""} submitted
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {peerFeedback.map((peer, index) => {
                  const reviewer = isAdmin ? getEmployeeById(peer.reviewerId) : null;
                  
                  return (
                    <div key={peer.id} className="p-4 bg-muted/50 rounded-lg" data-testid={`peer-feedback-${index}`}>
                      <div className="flex items-center gap-2 mb-2">
                        {isAdmin && reviewer ? (
                          <>
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                {reviewer.firstName[0]}{reviewer.lastName[0]}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium" data-testid={`text-peer-name-${index}`}>{reviewer.firstName} {reviewer.lastName}</span>
                          </>
                        ) : (
                          <>
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs bg-muted">
                                <User className="h-3 w-3" />
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium text-muted-foreground" data-testid={`text-peer-anonymous-${index}`}>Peer {index + 1}</span>
                          </>
                        )}
                      </div>
                      <p className="text-sm whitespace-pre-wrap" data-testid={`text-peer-comment-${index}`}>{peer.overallComment || "No comment provided"}</p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {!managerFeedback && !selfFeedback && peerFeedback.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No written feedback available yet</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
