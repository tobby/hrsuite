import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  Plus, 
  ClipboardCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  Star,
  Users,
  TrendingUp,
  Target,
  MessageSquare,
  ChevronRight,
} from "lucide-react";
import { 
  appraisalCycles,
  appraisals,
  appraisalFeedback,
  competencies,
  currentUser,
  getEmployeeById,
  getAppraisalCycleById,
  getFeedbackByAppraisal,
} from "@/lib/demo-data";
import type { Appraisal, AppraisalFeedback as AppraisalFeedbackType } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

const feedbackFormSchema = z.object({
  overallComment: z.string().min(1, "Please provide an overall comment"),
  technicalRating: z.number().min(1).max(5),
  problemSolvingRating: z.number().min(1).max(5),
  communicationRating: z.number().min(1).max(5),
  teamworkRating: z.number().min(1).max(5),
});

type FeedbackFormValues = z.infer<typeof feedbackFormSchema>;

const statusColors = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
  active: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  submitted: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
};

const cycleTypeLabels = {
  "180": "180° Review",
  "360": "360° Review",
};

export default function Performance() {
  const [activeTab, setActiveTab] = useState("my-reviews");
  const [selectedAppraisal, setSelectedAppraisal] = useState<Appraisal | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<AppraisalFeedbackType | null>(null);
  const { toast } = useToast();

  const form = useForm<FeedbackFormValues>({
    resolver: zodResolver(feedbackFormSchema),
    defaultValues: {
      overallComment: "",
      technicalRating: 3,
      problemSolvingRating: 3,
      communicationRating: 3,
      teamworkRating: 3,
    },
  });

  const myAppraisals = appraisals.filter(a => a.employeeId === currentUser.id);
  const pendingFeedback = appraisalFeedback.filter(
    f => f.reviewerId === currentUser.id && f.status === "pending"
  );

  const openAppraisalDetail = (appraisal: Appraisal) => {
    setSelectedAppraisal(appraisal);
    setIsDetailOpen(true);
  };

  const openFeedbackForm = (feedback: AppraisalFeedbackType) => {
    setSelectedFeedback(feedback);
    setIsFeedbackOpen(true);
  };

  const onSubmitFeedback = (data: FeedbackFormValues) => {
    toast({
      title: "Feedback Submitted",
      description: "Your performance feedback has been submitted successfully.",
    });
    setIsFeedbackOpen(false);
    form.reset();
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-performance-title">
            Performance Appraisals
          </h1>
          <p className="text-muted-foreground">
            180° and 360° performance reviews and feedback
          </p>
        </div>
        <Button data-testid="button-new-cycle">
          <Plus className="mr-2 h-4 w-4" />
          New Cycle
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card data-testid="card-stat-active-cycles">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Cycles</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-active-cycles-count">
              {appraisalCycles.filter(c => c.status === "active").length}
            </div>
            <p className="text-xs text-muted-foreground">Currently running</p>
          </CardContent>
        </Card>

        <Card data-testid="card-stat-pending-feedback">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Feedback</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-pending-feedback-count">{pendingFeedback.length}</div>
            <p className="text-xs text-muted-foreground">Reviews to complete</p>
          </CardContent>
        </Card>

        <Card data-testid="card-stat-my-rating">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Latest Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-my-rating">4.2</div>
            <p className="text-xs text-muted-foreground">Out of 5.0</p>
          </CardContent>
        </Card>

        <Card data-testid="card-stat-team-avg">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Average</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-team-avg">4.0</div>
            <p className="text-xs text-muted-foreground">Department rating</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="my-reviews" data-testid="tab-my-reviews">
            My Reviews
            <Badge variant="secondary" className="ml-2 text-xs">
              {myAppraisals.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="pending-feedback" data-testid="tab-pending-feedback">
            Pending Feedback
            <Badge variant="secondary" className="ml-2 text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              {pendingFeedback.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="cycles" data-testid="tab-cycles">
            Review Cycles
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-reviews" className="space-y-4">
          <div className="grid gap-4">
            {myAppraisals.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <ClipboardCheck className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground" data-testid="text-no-appraisals">No appraisals found</p>
                </CardContent>
              </Card>
            ) : (
              myAppraisals.map((appraisal) => {
                const cycle = getAppraisalCycleById(appraisal.cycleId);
                const feedback = getFeedbackByAppraisal(appraisal.id);
                const completedFeedback = feedback.filter(f => f.status === "submitted").length;
                const progress = feedback.length > 0 ? (completedFeedback / feedback.length) * 100 : 0;
                
                return (
                  <Card 
                    key={appraisal.id}
                    className="hover-elevate cursor-pointer"
                    onClick={() => openAppraisalDetail(appraisal)}
                    data-testid={`card-appraisal-${appraisal.id}`}
                  >
                    <CardContent className="flex items-center justify-between p-6">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary">
                          <ClipboardCheck className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="font-medium" data-testid={`text-cycle-name-${appraisal.id}`}>{cycle?.name}</h3>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span data-testid={`text-cycle-type-${appraisal.id}`}>{cycleTypeLabels[cycle?.type as "180" | "360" || "180"]}</span>
                            <span>•</span>
                            <span>{feedback.length} reviewers</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm text-muted-foreground">Progress</span>
                            <span className="text-sm font-medium" data-testid={`text-progress-${appraisal.id}`}>{completedFeedback}/{feedback.length}</span>
                          </div>
                          <Progress value={progress} className="h-2 w-32" />
                        </div>
                        {appraisal.overallRating && (
                          <div className="flex items-center gap-1 text-lg font-semibold" data-testid={`text-rating-${appraisal.id}`}>
                            <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                            {appraisal.overallRating.toFixed(1)}
                          </div>
                        )}
                        <Badge variant="secondary" className={statusColors[appraisal.status]} data-testid={`badge-status-${appraisal.id}`}>
                          {appraisal.status === "pending" && <Clock className="mr-1 h-3 w-3" />}
                          {appraisal.status === "in_progress" && <AlertCircle className="mr-1 h-3 w-3" />}
                          {appraisal.status === "completed" && <CheckCircle2 className="mr-1 h-3 w-3" />}
                          {appraisal.status.replace("_", " ").charAt(0).toUpperCase() + appraisal.status.slice(1).replace("_", " ")}
                        </Badge>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        <TabsContent value="pending-feedback" className="space-y-4">
          <div className="grid gap-4">
            {pendingFeedback.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground" data-testid="text-no-pending-feedback">No pending feedback requests</p>
                </CardContent>
              </Card>
            ) : (
              pendingFeedback.map((feedback) => {
                const appraisal = appraisals.find(a => a.id === feedback.appraisalId);
                const employee = appraisal ? getEmployeeById(appraisal.employeeId) : null;
                const cycle = appraisal ? getAppraisalCycleById(appraisal.cycleId) : null;
                
                return (
                  <Card 
                    key={feedback.id}
                    className="hover-elevate cursor-pointer"
                    onClick={() => openFeedbackForm(feedback)}
                    data-testid={`card-feedback-${feedback.id}`}
                  >
                    <CardContent className="flex items-center justify-between p-6">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {employee?.firstName[0]}{employee?.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-medium" data-testid={`text-feedback-employee-${feedback.id}`}>
                            Review for {employee?.firstName} {employee?.lastName}
                          </h3>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span data-testid={`text-feedback-cycle-${feedback.id}`}>{cycle?.name}</span>
                            <span>•</span>
                            <Badge variant="secondary" className="text-xs" data-testid={`badge-reviewer-type-${feedback.id}`}>
                              {feedback.reviewerType.charAt(0).toUpperCase() + feedback.reviewerType.slice(1)} Review
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant="secondary" className={statusColors.pending} data-testid={`badge-feedback-status-${feedback.id}`}>
                          <Clock className="mr-1 h-3 w-3" />
                          Pending
                        </Badge>
                        <Button size="sm" data-testid={`button-give-feedback-${feedback.id}`}>
                          Give Feedback
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        <TabsContent value="cycles" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {appraisalCycles.map((cycle) => {
              const cycleAppraisals = appraisals.filter(a => a.cycleId === cycle.id);
              const completedCount = cycleAppraisals.filter(a => a.status === "completed").length;
              
              return (
                <Card 
                  key={cycle.id}
                  className="hover-elevate"
                  data-testid={`card-cycle-${cycle.id}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-lg" data-testid={`text-cycle-title-${cycle.id}`}>{cycle.name}</CardTitle>
                        <CardDescription data-testid={`text-cycle-type-info-${cycle.id}`}>
                          {cycleTypeLabels[cycle.type as "180" | "360"]}
                        </CardDescription>
                      </div>
                      <Badge variant="secondary" className={statusColors[cycle.status]} data-testid={`badge-cycle-status-${cycle.id}`}>
                        {cycle.status.charAt(0).toUpperCase() + cycle.status.slice(1)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Start Date</p>
                        <p className="font-medium" data-testid={`text-cycle-start-${cycle.id}`}>{new Date(cycle.startDate).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">End Date</p>
                        <p className="font-medium" data-testid={`text-cycle-end-${cycle.id}`}>{new Date(cycle.endDate).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Completion</span>
                        <span className="font-medium" data-testid={`text-cycle-completion-${cycle.id}`}>{completedCount} / {cycleAppraisals.length}</span>
                      </div>
                      <Progress value={cycleAppraisals.length > 0 ? (completedCount / cycleAppraisals.length) * 100 : 0} className="h-2" />
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground" data-testid={`text-cycle-employees-${cycle.id}`}>
                        {cycleAppraisals.length} employees
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Appraisal Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl">
          {selectedAppraisal && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5" />
                  <span data-testid="text-detail-cycle-name">{getAppraisalCycleById(selectedAppraisal.cycleId)?.name}</span>
                </DialogTitle>
                <DialogDescription>
                  Performance review details and feedback summary
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {getEmployeeById(selectedAppraisal.employeeId)?.firstName[0]}
                        {getEmployeeById(selectedAppraisal.employeeId)?.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium" data-testid="text-detail-employee-name">
                        {getEmployeeById(selectedAppraisal.employeeId)?.firstName}{" "}
                        {getEmployeeById(selectedAppraisal.employeeId)?.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {getEmployeeById(selectedAppraisal.employeeId)?.position}
                      </p>
                    </div>
                  </div>
                  {selectedAppraisal.overallRating && (
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-2xl font-bold" data-testid="text-detail-overall-rating">
                        <Star className="h-6 w-6 fill-amber-400 text-amber-400" />
                        {selectedAppraisal.overallRating.toFixed(1)}
                      </div>
                      <p className="text-xs text-muted-foreground">Overall Rating</p>
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="font-medium mb-3">Feedback Submissions</h4>
                  <div className="space-y-3">
                    {getFeedbackByAppraisal(selectedAppraisal.id).map((feedback) => {
                      const reviewer = getEmployeeById(feedback.reviewerId);
                      return (
                        <div 
                          key={feedback.id}
                          className="flex items-center justify-between p-3 rounded-md border"
                          data-testid={`detail-feedback-${feedback.id}`}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">
                                {reviewer?.firstName[0]}{reviewer?.lastName[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium" data-testid={`text-detail-reviewer-${feedback.id}`}>
                                {reviewer?.firstName} {reviewer?.lastName}
                              </p>
                              <Badge variant="secondary" className="text-xs mt-0.5">
                                {feedback.reviewerType.charAt(0).toUpperCase() + feedback.reviewerType.slice(1)}
                              </Badge>
                            </div>
                          </div>
                          <Badge 
                            variant="secondary" 
                            className={feedback.status === "submitted" ? statusColors.submitted : statusColors.pending}
                            data-testid={`badge-detail-feedback-status-${feedback.id}`}
                          >
                            {feedback.status === "submitted" && <CheckCircle2 className="mr-1 h-3 w-3" />}
                            {feedback.status === "pending" && <Clock className="mr-1 h-3 w-3" />}
                            {feedback.status.charAt(0).toUpperCase() + feedback.status.slice(1)}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Feedback Form Dialog */}
      <Dialog open={isFeedbackOpen} onOpenChange={setIsFeedbackOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedFeedback && (
            <>
              <DialogHeader>
                <DialogTitle>Give Feedback</DialogTitle>
                <DialogDescription>
                  Rate competencies and provide comments for{" "}
                  {(() => {
                    const appraisal = appraisals.find(a => a.id === selectedFeedback.appraisalId);
                    const employee = appraisal ? getEmployeeById(appraisal.employeeId) : null;
                    return <span data-testid="text-feedback-for-employee">{employee?.firstName} {employee?.lastName}</span>;
                  })()}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmitFeedback)} className="space-y-6 py-4">
                  {competencies.slice(0, 4).map((competency, index) => {
                    const fieldName = index === 0 ? "technicalRating" : 
                                     index === 1 ? "problemSolvingRating" :
                                     index === 2 ? "communicationRating" : "teamworkRating";
                    return (
                      <div key={competency.id} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="font-medium" data-testid={`label-competency-${competency.id}`}>{competency.name}</Label>
                            <p className="text-xs text-muted-foreground">{competency.description}</p>
                          </div>
                          <Badge variant="secondary" className="text-xs">{competency.category}</Badge>
                        </div>
                        <FormField
                          control={form.control}
                          name={fieldName as keyof FeedbackFormValues}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <div className="flex items-center gap-4">
                                  <Slider
                                    value={[field.value as number]}
                                    onValueChange={(value) => field.onChange(value[0])}
                                    max={5}
                                    min={1}
                                    step={1}
                                    className="flex-1"
                                    data-testid={`slider-rating-${competency.id}`}
                                  />
                                  <div className="flex gap-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <Star 
                                        key={star} 
                                        className={`h-4 w-4 ${star <= (field.value as number) ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`}
                                      />
                                    ))}
                                  </div>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    );
                  })}

                  <FormField
                    control={form.control}
                    name="overallComment"
                    render={({ field }) => (
                      <FormItem className="pt-4 border-t">
                        <FormLabel className="font-medium">Overall Comments</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Provide overall feedback and suggestions for improvement..."
                            className="resize-none"
                            rows={4}
                            {...field}
                            data-testid="textarea-overall-feedback"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsFeedbackOpen(false)} data-testid="button-save-draft">
                      Save Draft
                    </Button>
                    <Button type="submit" data-testid="button-submit-feedback">
                      Submit Feedback
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
