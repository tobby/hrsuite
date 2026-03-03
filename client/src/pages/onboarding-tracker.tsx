import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useRole, canEditOrgSettings } from "@/lib/role-context";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Employee, Department, TaskTemplate, TaskAssignment, TaskCompletion } from "@shared/schema";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Users, CheckCircle2, Clock, AlertTriangle, UserCheck, Building2, Globe, Trash2, ClipboardList, CalendarDays, ShieldCheck, FileText, Upload, X } from "lucide-react";
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
  individual: "Individual",
  department: "Department",
  managers: "All Managers",
  everyone: "Everyone",
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

const priorityLabels: Record<string, string> = { low: "Low", medium: "Medium", high: "High", urgent: "Urgent" };
const priorityColors: Record<string, string> = {
  low: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  urgent: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

function AssignTaskDialog() {
  const { toast } = useToast();
  const { data: employees = [] } = useQuery<Employee[]>({ queryKey: ['/api/employees'] });
  const { data: departments = [] } = useQuery<Department[]>({ queryKey: ['/api/departments'] });
  const { data: templates = [] } = useQuery<TaskTemplate[]>({ queryKey: ['/api/task-templates'] });
  const [open, setOpen] = useState(false);
  const [assignmentType, setAssignmentType] = useState("individual");
  const [targetEmployeeId, setTargetEmployeeId] = useState("");
  const [targetDepartmentId, setTargetDepartmentId] = useState("");
  const [templateId, setTemplateId] = useState("none");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState("");
  const [customItems, setCustomItems] = useState<{ title: string; description: string; isRequired: boolean; requiresAcknowledgment?: boolean; documentUrl?: string; documentName?: string }[]>([]);
  const [itemTitle, setItemTitle] = useState("");
  const [itemDesc, setItemDesc] = useState("");
  const [itemRequiresAck, setItemRequiresAck] = useState(false);
  const [itemDocUrl, setItemDocUrl] = useState("");
  const [itemDocName, setItemDocName] = useState("");
  const [uploading, setUploading] = useState(false);

  const selectedTemplate = templates.find(t => t.id === templateId);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/task-assignments", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/task-assignments'] });
      toast({ title: "Tasks assigned successfully" });
      resetForm();
      setOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setAssignmentType("individual"); setTargetEmployeeId(""); setTargetDepartmentId("");
    setTemplateId("none"); setTitle(""); setDescription("");
    setPriority("medium"); setDueDate(""); setCustomItems([]);
  };

  const addItem = () => {
    if (!itemTitle.trim()) return;
    setCustomItems([...customItems, {
      title: itemTitle.trim(),
      description: itemDesc.trim(),
      isRequired: true,
      ...(itemRequiresAck ? {
        requiresAcknowledgment: true,
        ...(itemDocUrl ? { documentUrl: itemDocUrl, documentName: itemDocName } : {}),
      } : {}),
    }]);
    setItemTitle(""); setItemDesc("");
    setItemRequiresAck(false); setItemDocUrl(""); setItemDocName("");
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("files", file);
      const res = await fetch("/api/uploads", { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setItemDocUrl(data[0].fileUrl);
        setItemDocName(data[0].fileName || file.name);
      }
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = () => {
    let items: TaskItem[];
    let assignTitle = title.trim();

    if (templateId !== "none" && selectedTemplate) {
      items = parseItems(selectedTemplate.items);
      if (!assignTitle) assignTitle = selectedTemplate.name;
    } else {
      if (customItems.length === 0) return;
      items = customItems.map((item, i) => ({ ...item, id: `item-${Date.now()}-${i}` }));
    }

    if (!assignTitle) return;

    createMutation.mutate({
      title: assignTitle,
      description: description.trim() || undefined,
      assignmentType,
      targetEmployeeId: assignmentType === "individual" ? targetEmployeeId : undefined,
      targetDepartmentId: assignmentType === "department" ? targetDepartmentId : undefined,
      templateId: templateId !== "none" ? templateId : undefined,
      items: JSON.stringify(items),
      priority,
      dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
    });
  };

  const activeEmployees = employees.filter(e => e.status === "active");

  const canSubmit = () => {
    if (!title.trim() && templateId === "none") return false;
    if (templateId === "none" && customItems.length === 0) return false;
    if (assignmentType === "individual" && !targetEmployeeId) return false;
    if (assignmentType === "department" && !targetDepartmentId) return false;
    return true;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-assign-tasks">
          <Plus className="h-4 w-4 mr-2" />
          Assign Tasks
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assign Tasks</DialogTitle>
          <DialogDescription>Assign a task checklist to employees, departments, managers, or everyone</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Assign To</Label>
            <Select value={assignmentType} onValueChange={(v) => { setAssignmentType(v); setTargetEmployeeId(""); setTargetDepartmentId(""); }}>
              <SelectTrigger data-testid="select-assignment-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="individual">Individual Employee</SelectItem>
                <SelectItem value="department">Entire Department</SelectItem>
                <SelectItem value="managers">All Managers</SelectItem>
                <SelectItem value="everyone">Everyone</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {assignmentType === "individual" && (
            <div className="space-y-2">
              <Label>Select Employee</Label>
              <Select value={targetEmployeeId} onValueChange={setTargetEmployeeId}>
                <SelectTrigger data-testid="select-target-employee">
                  <SelectValue placeholder="Select employee..." />
                </SelectTrigger>
                <SelectContent>
                  {activeEmployees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName} - {e.position}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {assignmentType === "department" && (
            <div className="space-y-2">
              <Label>Select Department</Label>
              <Select value={targetDepartmentId} onValueChange={setTargetDepartmentId}>
                <SelectTrigger data-testid="select-target-department">
                  <SelectValue placeholder="Select department..." />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Use Template (Optional)</Label>
            <Select value={templateId} onValueChange={(v) => { setTemplateId(v); if (v !== "none") { const t = templates.find(t => t.id === v); if (t && !title.trim()) setTitle(t.name); } }}>
              <SelectTrigger data-testid="select-template">
                <SelectValue placeholder="No template - custom tasks" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No template - custom tasks</SelectItem>
                {templates.map((t) => {
                  const items = parseItems(t.items);
                  return <SelectItem key={t.id} value={t.id}>{t.name} ({items.length} items)</SelectItem>;
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task assignment title" data-testid="input-assignment-title" />
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger data-testid="select-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description (Optional)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Additional context..." data-testid="input-assignment-description" />
          </div>

          <div className="space-y-2">
            <Label>Due Date (Optional)</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} data-testid="input-due-date" />
          </div>

          {templateId === "none" && (
            <div className="border-t pt-4 space-y-3">
              <h4 className="font-medium text-sm">Custom Checklist Items</h4>
              <div className="space-y-2">
                <Input value={itemTitle} onChange={(e) => setItemTitle(e.target.value)} placeholder="Item title" data-testid="input-custom-item-title" />
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Checkbox id="tracker-item-ack" checked={itemRequiresAck} onCheckedChange={(v) => setItemRequiresAck(!!v)} data-testid="checkbox-custom-item-ack" />
                    <Label htmlFor="tracker-item-ack" className="text-sm">Requires Acknowledgment</Label>
                  </div>
                </div>
                {itemRequiresAck && (
                  <div className="space-y-2 rounded-md border border-dashed p-3">
                    <p className="text-xs text-muted-foreground">Attach a document (optional)</p>
                    {itemDocUrl ? (
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm truncate">{itemDocName}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => { setItemDocUrl(""); setItemDocName(""); }}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <Label className="flex items-center gap-2 cursor-pointer text-sm text-primary hover:underline">
                        <Upload className="h-3.5 w-3.5" />
                        {uploading ? "Uploading..." : "Upload Document"}
                        <input type="file" className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv" onChange={handleDocUpload} disabled={uploading} />
                      </Label>
                    )}
                  </div>
                )}
                <Button type="button" size="sm" onClick={addItem} disabled={!itemTitle.trim()} data-testid="button-add-custom-item">
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </div>
              {customItems.length > 0 && (
                <div className="space-y-1">
                  {customItems.map((item, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 p-2 rounded-md border text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="truncate">{item.title}</span>
                        {item.requiresAcknowledgment && <ShieldCheck className="h-3 w-3 text-amber-500 shrink-0" />}
                        {item.documentName && <Badge variant="outline" className="text-xs shrink-0"><FileText className="h-3 w-3 mr-1" />{item.documentName}</Badge>}
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => setCustomItems(customItems.filter((_, j) => j !== i))}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {templateId !== "none" && selectedTemplate && (
            <div className="border-t pt-3">
              <h4 className="font-medium text-sm mb-2">Template Items ({parseItems(selectedTemplate.items).length})</h4>
              <div className="space-y-1">
                {parseItems(selectedTemplate.items).map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                    <span>{item.title}</span>
                    {item.isRequired && <span className="text-xs text-destructive">*</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit() || createMutation.isPending} data-testid="button-confirm-assign">
            {createMutation.isPending ? "Assigning..." : "Assign Tasks"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AssignmentCard({ assignment, employees, departments }: {
  assignment: TaskAssignment;
  employees: Employee[];
  departments: Department[];
}) {
  const { toast } = useToast();
  const items = parseItems(assignment.items);
  const { data: completions = [] } = useQuery<TaskCompletion[]>({
    queryKey: ['/api/task-assignments', assignment.id, 'completions'],
  });

  const targetEmployee = assignment.targetEmployeeId ? employees.find(e => e.id === assignment.targetEmployeeId) : null;
  const targetDept = assignment.targetDepartmentId ? departments.find(d => d.id === assignment.targetDepartmentId) : null;
  const assignedBy = employees.find(e => e.id === assignment.assignedById);
  const AssignIcon = assignmentTypeIcons[assignment.assignmentType] || UserCheck;

  const relevantEmployees = (() => {
    switch (assignment.assignmentType) {
      case "individual": return targetEmployee ? [targetEmployee] : [];
      case "department": return employees.filter(e => e.departmentId === assignment.targetDepartmentId && e.status === "active");
      case "managers": return employees.filter(e => e.role === "manager" && e.status === "active");
      case "everyone": return employees.filter(e => e.status === "active");
      default: return [];
    }
  })();

  const totalItems = items.length;
  const completedCompletions = completions.filter(c => c.completed);

  let progressPercent = 0;
  let progressLabel = "";
  if (assignment.assignmentType === "individual") {
    const completed = completedCompletions.length;
    progressPercent = totalItems > 0 ? Math.round((completed / totalItems) * 100) : 0;
    progressLabel = `${completed}/${totalItems} items`;
  } else {
    const totalPossible = relevantEmployees.length * totalItems;
    const totalCompleted = completedCompletions.length;
    progressPercent = totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0;
    const fullyCompleted = relevantEmployees.filter(e => {
      const empCompletions = completedCompletions.filter(c => c.employeeId === e.id);
      return empCompletions.length >= totalItems;
    }).length;
    progressLabel = `${fullyCompleted}/${relevantEmployees.length} people completed`;
  }

  const isOverdue = assignment.dueDate && new Date(assignment.dueDate) < new Date() && progressPercent < 100;

  const deleteMutation = useMutation({
    mutationFn: async () => { await apiRequest("DELETE", `/api/task-assignments/${assignment.id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/task-assignments'] });
      toast({ title: "Assignment deleted" });
    },
  });

  return (
    <Card data-testid={`card-assignment-${assignment.id}`}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-base flex items-center gap-2 flex-wrap" data-testid={`text-assignment-title-${assignment.id}`}>
              {assignment.title}
              <Badge variant="secondary" className={`text-xs ${assignmentTypeColors[assignment.assignmentType]}`}>
                <AssignIcon className="h-3 w-3 mr-1" />
                {assignmentTypeLabels[assignment.assignmentType]}
              </Badge>
              <Badge variant="secondary" className={`text-xs ${priorityColors[assignment.priority]}`}>
                {priorityLabels[assignment.priority]}
              </Badge>
              {isOverdue && (
                <Badge variant="destructive" className="text-xs">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Overdue
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="mt-1">
              {assignment.assignmentType === "individual" && targetEmployee && (
                <span>Assigned to {targetEmployee.firstName} {targetEmployee.lastName}</span>
              )}
              {assignment.assignmentType === "department" && targetDept && (
                <span>Assigned to {targetDept.name} department ({relevantEmployees.length} members)</span>
              )}
              {assignment.assignmentType === "managers" && (
                <span>Assigned to all managers ({relevantEmployees.length})</span>
              )}
              {assignment.assignmentType === "everyone" && (
                <span>Assigned to everyone ({relevantEmployees.length})</span>
              )}
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending} data-testid={`button-delete-assignment-${assignment.id}`}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-2 mt-2">
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground">{progressLabel}</span>
            <span className="font-medium">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>
        <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground mt-1">
          {assignedBy && <span>Assigned by: {assignedBy.firstName} {assignedBy.lastName}</span>}
          <span>Created: {format(new Date(assignment.createdAt!), "MMM d, yyyy")}</span>
          {assignment.dueDate && (
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              Due: {format(new Date(assignment.dueDate), "MMM d, yyyy")}
            </span>
          )}
          <span>{items.length} checklist items</span>
        </div>
      </CardHeader>
    </Card>
  );
}

export default function OnboardingTracker() {
  const { role } = useRole();
  const [, navigate] = useLocation();
  const { data: assignments = [], isLoading } = useQuery<TaskAssignment[]>({ queryKey: ['/api/task-assignments'] });
  const { data: employees = [] } = useQuery<Employee[]>({ queryKey: ['/api/employees'] });
  const { data: departments = [] } = useQuery<Department[]>({ queryKey: ['/api/departments'] });
  const [filter, setFilter] = useState("all");

  if (!canEditOrgSettings(role)) {
    navigate("/");
    return null;
  }

  const filteredAssignments = assignments.filter(a => {
    if (filter === "all") return true;
    return a.assignmentType === filter;
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-6 w-6" />
            <h1 className="text-xl font-semibold tracking-tight" data-testid="text-task-tracker-title">
              Task Tracker
            </h1>
          </div>
          <p className="text-muted-foreground">
            Assign and track task checklists across the organization
          </p>
        </div>
        <AssignTaskDialog />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card data-testid="card-stat-total">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-100 dark:bg-blue-900/30">
                <ClipboardList className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{assignments.length}</p>
                <p className="text-xs text-muted-foreground">Total Assignments</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-stat-individual">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-purple-100 dark:bg-purple-900/30">
                <UserCheck className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{assignments.filter(a => a.assignmentType === "individual").length}</p>
                <p className="text-xs text-muted-foreground">Individual</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-stat-group">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-green-100 dark:bg-green-900/30">
                <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{assignments.filter(a => a.assignmentType !== "individual").length}</p>
                <p className="text-xs text-muted-foreground">Group/Company</p>
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
                <p className="text-2xl font-bold">{assignments.filter(a => a.dueDate && new Date(a.dueDate) < new Date()).length}</p>
                <p className="text-xs text-muted-foreground">Past Due Date</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[180px]" data-testid="filter-assignment-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="individual">Individual</SelectItem>
            <SelectItem value="department">Department</SelectItem>
            <SelectItem value="managers">All Managers</SelectItem>
            <SelectItem value="everyone">Everyone</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-24 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : filteredAssignments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ClipboardList className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground text-sm">No task assignments yet</p>
            <p className="text-muted-foreground text-xs mt-1">Create a task assignment to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredAssignments.map((a) => (
            <AssignmentCard key={a.id} assignment={a} employees={employees} departments={departments} />
          ))}
        </div>
      )}
    </div>
  );
}
