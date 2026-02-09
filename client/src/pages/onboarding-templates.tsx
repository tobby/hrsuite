import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useRole, canEditOrgSettings } from "@/lib/role-context";
import { useLocation } from "wouter";
import { useOnboardingStore, categoryLabels, type OnboardingTask, type OnboardingTemplate } from "@/lib/onboarding-store";
import { departments } from "@/lib/demo-data";
import { Plus, FileText, Trash2, GripVertical, ClipboardList, Building2 } from "lucide-react";

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

function CreateTemplateDialog({ onCreated }: { onCreated: () => void }) {
  const { addTemplate } = useOnboardingStore();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [departmentId, setDepartmentId] = useState<string>("none");
  const [tasks, setTasks] = useState<Omit<OnboardingTask, "id">[]>([]);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskCategory, setTaskCategory] = useState<OnboardingTask["category"]>("general");
  const [taskRequired, setTaskRequired] = useState(true);
  const [taskDueDays, setTaskDueDays] = useState("3");

  const addTask = () => {
    if (!taskTitle.trim()) return;
    setTasks([...tasks, {
      title: taskTitle.trim(),
      description: taskDesc.trim(),
      category: taskCategory,
      isRequired: taskRequired,
      dueOffsetDays: parseInt(taskDueDays) || 3,
    }]);
    setTaskTitle("");
    setTaskDesc("");
    setTaskCategory("general");
    setTaskRequired(true);
    setTaskDueDays("3");
  };

  const removeTask = (index: number) => {
    setTasks(tasks.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!name.trim() || tasks.length === 0) return;
    addTemplate({
      name: name.trim(),
      description: description.trim(),
      departmentId: departmentId === "none" ? null : departmentId,
      isDefault: false,
      tasks: tasks.map((t, i) => ({ ...t, id: `task-new-${i}` })),
    });
    setName("");
    setDescription("");
    setDepartmentId("none");
    setTasks([]);
    setOpen(false);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-create-template">
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Onboarding Template</DialogTitle>
          <DialogDescription>Define a reusable onboarding checklist with tasks</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="template-name">Template Name</Label>
              <Input
                id="template-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Engineering Onboarding"
                data-testid="input-template-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-dept">Department (Optional)</Label>
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger data-testid="select-template-department">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">All Departments</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="template-desc">Description</Label>
            <Textarea
              id="template-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this onboarding template..."
              data-testid="input-template-description"
            />
          </div>

          <div className="border-t pt-4 space-y-3">
            <h4 className="font-medium text-sm">Add Tasks</h4>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Task Title</Label>
                <Input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="Task name" data-testid="input-task-title" />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={taskCategory} onValueChange={(v) => setTaskCategory(v as OnboardingTask["category"])}>
                  <SelectTrigger data-testid="select-task-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Task Description</Label>
              <Input value={taskDesc} onChange={(e) => setTaskDesc(e.target.value)} placeholder="Brief description" data-testid="input-task-description" />
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Checkbox id="task-required" checked={taskRequired} onCheckedChange={(v) => setTaskRequired(!!v)} data-testid="checkbox-task-required" />
                <Label htmlFor="task-required" className="text-sm">Required</Label>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm">Due within</Label>
                <Input className="w-20" type="number" value={taskDueDays} onChange={(e) => setTaskDueDays(e.target.value)} min="1" data-testid="input-task-due-days" />
                <span className="text-sm text-muted-foreground">days</span>
              </div>
              <Button type="button" size="sm" onClick={addTask} disabled={!taskTitle.trim()} data-testid="button-add-task">
                <Plus className="h-3 w-3 mr-1" />
                Add Task
              </Button>
            </div>
          </div>

          {tasks.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Tasks ({tasks.length})</h4>
              <div className="space-y-1">
                {tasks.map((task, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 p-2 rounded-md border">
                    <div className="flex items-center gap-2 min-w-0">
                      <GripVertical className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="text-sm truncate">{task.title}</span>
                      <TaskCategoryBadge category={task.category} />
                      {task.isRequired && <Badge variant="outline" className="text-xs shrink-0">Required</Badge>}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeTask(i)} data-testid={`button-remove-task-${i}`}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || tasks.length === 0} data-testid="button-save-template">
            Create Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TemplateCard({ template }: { template: OnboardingTemplate }) {
  const { deleteTemplate } = useOnboardingStore();
  const dept = template.departmentId ? departments.find((d) => d.id === template.departmentId) : null;

  const tasksByCategory = template.tasks.reduce((acc, task) => {
    if (!acc[task.category]) acc[task.category] = [];
    acc[task.category].push(task);
    return acc;
  }, {} as Record<string, OnboardingTask[]>);

  return (
    <Card data-testid={`card-template-${template.id}`}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-base flex items-center gap-2 flex-wrap">
              {template.name}
              {template.isDefault && <Badge variant="secondary" className="text-xs">Default</Badge>}
            </CardTitle>
            <CardDescription className="mt-1">{template.description}</CardDescription>
          </div>
          {!template.isDefault && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => deleteTemplate(template.id)}
              data-testid={`button-delete-template-${template.id}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {dept && (
            <Badge variant="outline" className="text-xs">
              <Building2 className="h-3 w-3 mr-1" />
              {dept.name}
            </Badge>
          )}
          <Badge variant="secondary" className="text-xs">{template.tasks.length} tasks</Badge>
          <Badge variant="secondary" className="text-xs">
            {template.tasks.filter((t) => t.isRequired).length} required
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Object.entries(tasksByCategory).map(([cat, tasks]) => (
            <div key={cat}>
              <div className="flex items-center gap-2 mb-1">
                <TaskCategoryBadge category={cat as OnboardingTask["category"]} />
                <span className="text-xs text-muted-foreground">({tasks.length})</span>
              </div>
              <div className="space-y-1 ml-2">
                {tasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-2 text-sm">
                    <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                    <span className="text-muted-foreground">{task.title}</span>
                    {task.isRequired && <span className="text-xs text-destructive">*</span>}
                    <span className="text-xs text-muted-foreground ml-auto shrink-0">Day {task.dueOffsetDays}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function OnboardingTemplates() {
  const { role } = useRole();
  const [, navigate] = useLocation();
  const { templates } = useOnboardingStore();
  const [, setRefresh] = useState(0);

  if (!canEditOrgSettings(role)) {
    navigate("/");
    return null;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-6 w-6" />
            <h1 className="text-2xl font-bold tracking-tight" data-testid="text-onboarding-templates-title">
              Onboarding Templates
            </h1>
          </div>
          <p className="text-muted-foreground">
            Create and manage reusable onboarding checklists for new hires
          </p>
        </div>
        <CreateTemplateDialog onCreated={() => setRefresh((r) => r + 1)} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {templates.map((template) => (
          <TemplateCard key={template.id} template={template} />
        ))}
      </div>

      {templates.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground text-sm">No onboarding templates yet</p>
            <p className="text-muted-foreground text-xs mt-1">Create your first template to get started</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
