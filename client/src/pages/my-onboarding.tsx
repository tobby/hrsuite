import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { useRole } from "@/lib/role-context";
import { useOnboardingStore, categoryLabels, type OnboardingTask } from "@/lib/onboarding-store";
import { employees } from "@/lib/demo-data";
import { ClipboardList, CheckCircle2, Clock, AlertTriangle, PartyPopper } from "lucide-react";

function TaskCategoryBadge({ category }: { category: OnboardingTask["category"] }) {
  const colorMap: Record<OnboardingTask["category"], string> = {
    it_setup: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    hr_paperwork: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    training: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    team_introduction: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    compliance: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    general: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
  };
  return <Badge variant="secondary" className={`text-xs ${colorMap[category]}`}>{categoryLabels[category]}</Badge>;
}

export default function MyOnboarding() {
  const { currentUser } = useRole();
  const { getAssignmentForEmployee, getAssignmentProgress, toggleTask } = useOnboardingStore();
  const assignment = getAssignmentForEmployee(currentUser.id);

  if (!assignment) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-6 w-6" />
            <h1 className="text-2xl font-bold tracking-tight" data-testid="text-my-onboarding-title">
              My Onboarding
            </h1>
          </div>
          <p className="text-muted-foreground">Your onboarding checklist and progress</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <CheckCircle2 className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground font-medium">No onboarding tasks assigned</p>
            <p className="text-muted-foreground text-sm mt-1">You don't have any pending onboarding checklists</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const progress = getAssignmentProgress(assignment.id);
  const assignedByEmp = employees.find((e) => e.id === assignment.assignedBy);
  const overdueTasks = assignment.tasks.filter((t) => !t.isCompleted && new Date(t.dueDate) < new Date());
  const upcomingTasks = assignment.tasks.filter((t) => !t.isCompleted && new Date(t.dueDate) >= new Date());
  const completedTasks = assignment.tasks.filter((t) => t.isCompleted);

  const tasksByCategory = assignment.tasks.reduce((acc, task) => {
    if (!acc[task.category]) acc[task.category] = [];
    acc[task.category].push(task);
    return acc;
  }, {} as Record<string, typeof assignment.tasks>);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-my-onboarding-title">
            My Onboarding
          </h1>
        </div>
        <p className="text-muted-foreground">Your onboarding checklist and progress</p>
      </div>

      {progress.percentage === 100 && (
        <Card className="border-green-200 dark:border-green-800">
          <CardContent className="flex items-center gap-4 pt-6">
            <PartyPopper className="h-10 w-10 text-green-600 dark:text-green-400 shrink-0" />
            <div>
              <p className="font-semibold text-green-700 dark:text-green-400">Onboarding Complete!</p>
              <p className="text-sm text-muted-foreground">You've completed all your onboarding tasks. Welcome to the team!</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card data-testid="card-my-progress">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Overall Progress</span>
                <span className="text-sm font-bold">{progress.percentage}%</span>
              </div>
              <Progress value={progress.percentage} className="h-3" />
              <p className="text-xs text-muted-foreground">{progress.completed} of {progress.total} tasks done</p>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-my-pending">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-100 dark:bg-blue-900/30">
                <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{upcomingTasks.length}</p>
                <p className="text-xs text-muted-foreground">Pending Tasks</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-my-overdue">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{overdueTasks.length}</p>
                <p className="text-xs text-muted-foreground">Overdue</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-my-completed">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-green-100 dark:bg-green-900/30">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completedTasks.length}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3 flex-wrap text-sm text-muted-foreground">
        <span>Template: <span className="font-medium text-foreground">{assignment.templateName}</span></span>
        <span>Start Date: <span className="font-medium text-foreground">{assignment.startDate.toLocaleDateString()}</span></span>
        {assignedByEmp && <span>Assigned by: <span className="font-medium text-foreground">{assignedByEmp.firstName} {assignedByEmp.lastName}</span></span>}
      </div>

      <div className="space-y-4">
        {Object.entries(tasksByCategory).map(([cat, tasks]) => {
          const catCompleted = tasks.filter((t) => t.isCompleted).length;
          const catPercentage = Math.round((catCompleted / tasks.length) * 100);
          return (
            <Card key={cat} data-testid={`card-category-${cat}`}>
              <CardHeader>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <TaskCategoryBadge category={cat as OnboardingTask["category"]} />
                    <CardTitle className="text-base">{categoryLabels[cat as OnboardingTask["category"]]}</CardTitle>
                  </div>
                  <span className="text-sm text-muted-foreground">{catCompleted}/{tasks.length} ({catPercentage}%)</span>
                </div>
                <Progress value={catPercentage} className="h-1.5" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {tasks.map((task) => {
                    const isOverdue = !task.isCompleted && new Date(task.dueDate) < new Date();
                    return (
                      <div
                        key={task.id}
                        className="flex items-start gap-3 p-3 rounded-md border"
                        data-testid={`task-item-${task.id}`}
                      >
                        <Checkbox
                          checked={task.isCompleted}
                          onCheckedChange={() => toggleTask(assignment.id, task.id)}
                          className="mt-0.5"
                          data-testid={`checkbox-my-task-${task.id}`}
                        />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${task.isCompleted ? "line-through text-muted-foreground" : ""}`}>
                            {task.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-xs text-muted-foreground">
                              Due: {task.dueDate.toLocaleDateString()}
                            </span>
                            {task.isRequired && <Badge variant="outline" className="text-xs">Required</Badge>}
                            {isOverdue && (
                              <Badge variant="destructive" className="text-xs">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Overdue
                              </Badge>
                            )}
                            {task.isCompleted && task.completedAt && (
                              <span className="text-xs text-green-600 dark:text-green-400">
                                Completed {task.completedAt.toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
