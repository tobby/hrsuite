import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useRole } from "@/lib/role-context";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { TaskAssignment, TaskCompletion } from "@shared/schema";
import { ClipboardList, CheckCircle2, Clock, AlertTriangle, UserCheck, Building2, Users, Globe, CalendarDays, ShieldCheck, FileText, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface TaskItem {
  id: string;
  title: string;
  description: string;
  isRequired: boolean;
  requiresAcknowledgment?: boolean;
  documentUrl?: string;
  documentName?: string;
}

function parseItems(str: string): TaskItem[] {
  try { return JSON.parse(str); } catch { return []; }
}

const assignmentTypeLabels: Record<string, string> = {
  individual: "Personal",
  department: "Department",
  managers: "Managers",
  everyone: "Company-wide",
};

const assignmentTypeColors: Record<string, string> = {
  individual: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  department: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  managers: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  everyone: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

const assignmentTypeIcons: Record<string, typeof Users> = {
  individual: UserCheck,
  department: Building2,
  managers: Users,
  everyone: Globe,
};

const priorityColors: Record<string, string> = {
  low: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  urgent: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

function TaskAssignmentCard({ assignment, myCompletions, employeeName }: {
  assignment: TaskAssignment;
  myCompletions: TaskCompletion[];
  employeeName: string;
}) {
  const { toast } = useToast();
  const items = parseItems(assignment.items);
  const AssignIcon = assignmentTypeIcons[assignment.assignmentType] || UserCheck;
  const [ackDialogItem, setAckDialogItem] = useState<TaskItem | null>(null);

  const myItemCompletions = myCompletions.filter(c => c.assignmentId === assignment.id && c.completed);
  const completedCount = myItemCompletions.length;
  const totalCount = items.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const isFullyCompleted = completedCount >= totalCount;
  const isOverdue = assignment.dueDate && new Date(assignment.dueDate) < new Date() && !isFullyCompleted;

  const toggleMutation = useMutation({
    mutationFn: async ({ itemId, acknowledge }: { itemId: string; acknowledge?: boolean }) => {
      const res = await apiRequest("POST", `/api/task-assignments/${assignment.id}/toggle`, { itemId, acknowledge });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/my-task-completions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/task-assignments', assignment.id, 'completions'] });
      setAckDialogItem(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const isItemCompleted = (itemId: string) => myItemCompletions.some(c => c.itemId === itemId);
  const getCompletion = (itemId: string) => myCompletions.find(c => c.assignmentId === assignment.id && c.itemId === itemId);

  return (
    <Card data-testid={`card-my-assignment-${assignment.id}`} className={isFullyCompleted ? "opacity-70" : ""}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-base flex items-center gap-2 flex-wrap" data-testid={`text-my-assignment-title-${assignment.id}`}>
              {assignment.title}
              <Badge variant="secondary" className={`text-xs ${assignmentTypeColors[assignment.assignmentType]}`}>
                <AssignIcon className="h-3 w-3 mr-1" />
                {assignmentTypeLabels[assignment.assignmentType]}
              </Badge>
              {isFullyCompleted && (
                <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Complete
                </Badge>
              )}
              {isOverdue && (
                <Badge variant="destructive" className="text-xs">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Overdue
                </Badge>
              )}
            </CardTitle>
            {assignment.description && (
              <CardDescription className="mt-1">{assignment.description}</CardDescription>
            )}
          </div>
          <Badge variant="secondary" className={`text-xs shrink-0 ${priorityColors[assignment.priority]}`}>
            {assignment.priority}
          </Badge>
        </div>
        <div className="space-y-2 mt-2">
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground">{completedCount}/{totalCount} items completed</span>
            <span className="font-medium">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>
        {assignment.dueDate && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
            <CalendarDays className="h-3 w-3" />
            Due: {format(new Date(assignment.dueDate), "MMM d, yyyy")}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {items.map((item) => {
            const completed = isItemCompleted(item.id);
            const completion = getCompletion(item.id);
            const isAcknowledged = completion?.acknowledged;

            if (item.requiresAcknowledgment) {
              return (
                <div key={item.id} className="p-3 rounded-md border space-y-2" data-testid={`ack-item-${item.id}`}>
                  <div className="flex items-start gap-2">
                    <ShieldCheck className={`h-4 w-4 mt-0.5 shrink-0 ${isAcknowledged ? "text-green-600" : "text-amber-500"}`} />
                    <div className="flex-1 min-w-0">
                      <span className={`text-sm font-medium ${isAcknowledged ? "text-muted-foreground" : ""}`}>
                        {item.title}
                      </span>
                      {item.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                      )}
                    </div>
                    {item.isRequired && !isAcknowledged && (
                      <Badge variant="outline" className="text-xs shrink-0">Required</Badge>
                    )}
                  </div>
                  {item.documentUrl && (
                    <a
                      href={item.documentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline ml-6"
                      data-testid={`link-doc-${item.id}`}
                    >
                      <FileText className="h-3.5 w-3.5" />
                      {item.documentName || "View Document"}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {isAcknowledged ? (
                    <div className="flex items-center gap-2 ml-6 text-xs text-green-600 dark:text-green-500" data-testid={`ack-signed-${item.id}`}>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Acknowledged by {completion?.acknowledgedByName} on {completion?.acknowledgedAt ? format(new Date(completion.acknowledgedAt), "MMM d, yyyy 'at' h:mm a") : ""}</span>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-6"
                      onClick={() => setAckDialogItem(item)}
                      disabled={toggleMutation.isPending}
                      data-testid={`button-acknowledge-${item.id}`}
                    >
                      <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
                      Acknowledge & Sign
                    </Button>
                  )}
                </div>
              );
            }

            return (
              <div key={item.id} className="flex items-center gap-2 p-2 rounded-md hover-elevate">
                <Checkbox
                  checked={completed}
                  onCheckedChange={() => toggleMutation.mutate({ itemId: item.id })}
                  disabled={toggleMutation.isPending}
                  data-testid={`checkbox-item-${item.id}`}
                />
                <div className="flex-1 min-w-0">
                  <span className={`text-sm ${completed ? "line-through text-muted-foreground" : ""}`}>
                    {item.title}
                  </span>
                  {item.description && (
                    <p className={`text-xs ${completed ? "text-muted-foreground/60" : "text-muted-foreground"}`}>{item.description}</p>
                  )}
                </div>
                {item.isRequired && !completed && (
                  <Badge variant="outline" className="text-xs shrink-0">Required</Badge>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>

      <Dialog open={!!ackDialogItem} onOpenChange={(open) => !open && setAckDialogItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Acknowledge & Sign</DialogTitle>
            <DialogDescription>
              {ackDialogItem?.documentUrl
                ? "Please confirm that you have read and understood the attached document."
                : "Please confirm that you have read and understood this item."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="p-3 rounded-md bg-muted">
              <p className="text-sm font-medium">{ackDialogItem?.title}</p>
              {ackDialogItem?.description && <p className="text-xs text-muted-foreground mt-1">{ackDialogItem.description}</p>}
            </div>
            {ackDialogItem?.documentUrl && (
              <a
                href={ackDialogItem.documentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <FileText className="h-3.5 w-3.5" />
                {ackDialogItem.documentName || "View Document"}
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
            <p className="text-sm text-muted-foreground">
              By clicking confirm, I, <span className="font-medium text-foreground">{employeeName}</span>, acknowledge that I have read and understood this item.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAckDialogItem(null)}>Cancel</Button>
            <Button
              onClick={() => ackDialogItem && toggleMutation.mutate({ itemId: ackDialogItem.id, acknowledge: true })}
              disabled={toggleMutation.isPending}
              data-testid="button-confirm-acknowledge"
            >
              {toggleMutation.isPending ? "Signing..." : "Confirm & Sign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default function MyOnboarding() {
  const { currentUser, role } = useRole();
  const { data: allAssignments = [], isLoading: assignmentsLoading } = useQuery<TaskAssignment[]>({ queryKey: ['/api/my-task-assignments'] });
  const { data: myCompletions = [], isLoading: completionsLoading } = useQuery<TaskCompletion[]>({ queryKey: ['/api/my-task-completions'] });
  const [filter, setFilter] = useState("all");

  const myAssignments = allAssignments;

  const filteredAssignments = myAssignments.filter(a => {
    if (filter === "all") return true;
    if (filter === "personal") return a.assignmentType === "individual";
    if (filter === "department") return a.assignmentType === "department";
    if (filter === "company") return a.assignmentType === "everyone" || a.assignmentType === "managers";
    return true;
  });

  const totalItems = myAssignments.reduce((sum, a) => sum + parseItems(a.items).length, 0);
  const completedItems = myCompletions.filter(c => c.completed && myAssignments.some(a => a.id === c.assignmentId)).length;
  const overdueCount = myAssignments.filter(a => {
    if (!a.dueDate) return false;
    const items = parseItems(a.items);
    const completed = myCompletions.filter(c => c.assignmentId === a.id && c.completed).length;
    return new Date(a.dueDate) < new Date() && completed < items.length;
  }).length;

  const isLoading = assignmentsLoading || completionsLoading;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-6 w-6" />
          <h1 className="text-xl font-semibold tracking-tight" data-testid="text-my-tasks-title">
            My Tasks
          </h1>
        </div>
        <p className="text-muted-foreground">Your assigned tasks and checklists</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-100 dark:bg-blue-900/30">
                <ClipboardList className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="stat-active-assignments">{myAssignments.length}</p>
                <p className="text-xs text-muted-foreground">Active Assignments</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-green-100 dark:bg-green-900/30">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="stat-completed-items">{completedItems}</p>
                <p className="text-xs text-muted-foreground">Completed Items</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-amber-100 dark:bg-amber-900/30">
                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="stat-tasks-done">{completedItems}/{totalItems}</p>
                <p className="text-xs text-muted-foreground">Tasks Done</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="stat-overdue">{overdueCount}</p>
                <p className="text-xs text-muted-foreground">Overdue</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[180px]" data-testid="filter-my-tasks">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tasks</SelectItem>
            <SelectItem value="personal">My Tasks</SelectItem>
            <SelectItem value="department">Department Tasks</SelectItem>
            <SelectItem value="company">Company Tasks</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-32 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : filteredAssignments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <CheckCircle2 className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground font-medium">No tasks assigned</p>
            <p className="text-muted-foreground text-sm mt-1">
              {filter !== "all" ? "Try changing the filter to see more tasks" : "You don't have any pending tasks"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredAssignments.map((assignment) => (
            <TaskAssignmentCard
              key={assignment.id}
              assignment={assignment}
              myCompletions={myCompletions}
              employeeName={currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : ""}
            />
          ))}
        </div>
      )}
    </div>
  );
}
