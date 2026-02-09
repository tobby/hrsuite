import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { useRole, canEditOrgSettings } from "@/lib/role-context";
import { useLocation } from "wouter";
import { useOnboardingStore, categoryLabels, type OnboardingAssignment, type OnboardingTask } from "@/lib/onboarding-store";
import { useQuery } from "@tanstack/react-query";
import type { Employee } from "@shared/schema";
import { Plus, Users, CheckCircle2, Clock, AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";

function AssignOnboardingDialog() {
  const { templates, assignments, assignOnboarding } = useOnboardingStore();
  const { currentUser } = useRole();
  const { data: employees = [] } = useQuery<Employee[]>({ queryKey: ['/api/employees'] });
  const [open, setOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [templateId, setTemplateId] = useState("");

  const assignedEmployeeIds = assignments.map((a) => a.employeeId);
  const availableEmployees = employees.filter((e) => !assignedEmployeeIds.includes(e.id) && e.status === "active");

  const handleAssign = () => {
    if (!employeeId || !templateId) return;
    assignOnboarding(employeeId, templateId, currentUser.id, new Date());
    setEmployeeId("");
    setTemplateId("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-assign-tasks">
          <Plus className="h-4 w-4 mr-2" />
          Assign Tasks
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Task Checklist</DialogTitle>
          <DialogDescription>Select an employee and a task template</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Employee</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger data-testid="select-onboarding-employee">
                <SelectValue placeholder="Select employee..." />
              </SelectTrigger>
              <SelectContent>
                {availableEmployees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName} - {emp.position}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Task Template</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger data-testid="select-onboarding-template">
                <SelectValue placeholder="Select template..." />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} ({t.tasks.length} tasks)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleAssign} disabled={!employeeId || !templateId} data-testid="button-confirm-assign">
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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

function AssignmentCard({ assignment }: { assignment: OnboardingAssignment }) {
  const { getAssignmentProgress, toggleTask } = useOnboardingStore();
  const { data: employees = [] } = useQuery<Employee[]>({ queryKey: ['/api/employees'] });
  const [expanded, setExpanded] = useState(false);
  const emp = employees.find((e) => e.id === assignment.employeeId);
  const assignedByEmp = employees.find((e) => e.id === assignment.assignedBy);
  const progress = getAssignmentProgress(assignment.id);

  if (!emp) return null;

  const tasksByCategory = assignment.tasks.reduce((acc, task) => {
    if (!acc[task.category]) acc[task.category] = [];
    acc[task.category].push(task);
    return acc;
  }, {} as Record<string, typeof assignment.tasks>);

  const overdueTasks = assignment.tasks.filter((t) => !t.isCompleted && new Date(t.dueDate) < new Date());
  const statusColor = assignment.status === "completed"
    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
    : overdueTasks.length > 0
      ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
      : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";

  const statusLabel = assignment.status === "completed" ? "Completed" : overdueTasks.length > 0 ? "Has Overdue" : "In Progress";

  return (
    <Card data-testid={`card-assignment-${assignment.id}`}>
      <CardHeader className="cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarFallback className="text-xs">{emp.firstName[0]}{emp.lastName[0]}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <CardTitle className="text-base" data-testid={`text-onboarding-employee-${assignment.id}`}>
                {emp.firstName} {emp.lastName}
              </CardTitle>
              <CardDescription className="truncate">{emp.position}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="secondary" className={`text-xs ${statusColor}`}>{statusLabel}</Badge>
            {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </div>
        </div>
        <div className="space-y-2 mt-2">
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{progress.completed}/{progress.total} ({progress.percentage}%)</span>
          </div>
          <Progress value={progress.percentage} className="h-2" />
        </div>
        <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground mt-1">
          <span>Template: {assignment.templateName}</span>
          <span>Started: {assignment.startDate.toLocaleDateString()}</span>
          {assignedByEmp && <span>Assigned by: {assignedByEmp.firstName} {assignedByEmp.lastName}</span>}
        </div>
      </CardHeader>
      {expanded && (
        <CardContent>
          <div className="space-y-4">
            {Object.entries(tasksByCategory).map(([cat, tasks]) => {
              const completedInCat = tasks.filter((t) => t.isCompleted).length;
              return (
                <div key={cat}>
                  <div className="flex items-center gap-2 mb-2">
                    <TaskCategoryBadge category={cat as OnboardingTask["category"]} />
                    <span className="text-xs text-muted-foreground">{completedInCat}/{tasks.length}</span>
                  </div>
                  <div className="space-y-1 ml-1">
                    {tasks.map((task) => {
                      const isOverdue = !task.isCompleted && new Date(task.dueDate) < new Date();
                      return (
                        <div key={task.id} className="flex items-center gap-2 p-1.5 rounded-md">
                          <Checkbox
                            checked={task.isCompleted}
                            onCheckedChange={() => toggleTask(assignment.id, task.id)}
                            data-testid={`checkbox-task-${task.id}`}
                          />
                          <div className="flex-1 min-w-0">
                            <span className={`text-sm ${task.isCompleted ? "line-through text-muted-foreground" : ""}`}>
                              {task.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {task.isRequired && <Badge variant="outline" className="text-xs">Required</Badge>}
                            {isOverdue && (
                              <Badge variant="destructive" className="text-xs">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Overdue
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              Due {task.dueDate.toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default function OnboardingTracker() {
  const { role } = useRole();
  const [, navigate] = useLocation();
  const { assignments } = useOnboardingStore();

  if (!canEditOrgSettings(role)) {
    navigate("/");
    return null;
  }

  const activeAssignments = assignments.filter((a) => a.status !== "completed");
  const completedAssignments = assignments.filter((a) => a.status === "completed");
  const totalTasks = assignments.reduce((sum, a) => sum + a.tasks.length, 0);
  const completedTasks = assignments.reduce((sum, a) => sum + a.tasks.filter((t) => t.isCompleted).length, 0);
  const overdueTasks = assignments.reduce((sum, a) => sum + a.tasks.filter((t) => !t.isCompleted && new Date(t.dueDate) < new Date()).length, 0);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6" />
            <h1 className="text-2xl font-bold tracking-tight" data-testid="text-task-tracker-title">
              Task Tracker
            </h1>
          </div>
          <p className="text-muted-foreground">
            Track and manage task progress for assignments
          </p>
        </div>
        <AssignOnboardingDialog />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card data-testid="card-stat-active">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-100 dark:bg-blue-900/30">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeAssignments.length}</p>
                <p className="text-xs text-muted-foreground">Active Assignments</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-stat-completed">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-green-100 dark:bg-green-900/30">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completedAssignments.length}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-stat-tasks">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-amber-100 dark:bg-amber-900/30">
                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completedTasks}/{totalTasks}</p>
                <p className="text-xs text-muted-foreground">Tasks Done</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-stat-overdue">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{overdueTasks}</p>
                <p className="text-xs text-muted-foreground">Overdue Tasks</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Active Assignments</h2>
        {activeAssignments.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground text-sm">No active assignments</p>
              <p className="text-muted-foreground text-xs mt-1">Assign a task checklist to get started</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {activeAssignments.map((a) => (
              <AssignmentCard key={a.id} assignment={a} />
            ))}
          </div>
        )}
      </div>

      {completedAssignments.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Completed Assignments</h2>
          <div className="space-y-3">
            {completedAssignments.map((a) => (
              <AssignmentCard key={a.id} assignment={a} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
