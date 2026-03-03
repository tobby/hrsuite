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
import { Skeleton } from "@/components/ui/skeleton";
import { useRole, canEditOrgSettings } from "@/lib/role-context";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Department, TaskTemplate } from "@shared/schema";
import { Plus, FileText, Trash2, GripVertical, ClipboardList, Building2, Users, UserCheck, Globe, Upload, X, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const categoryLabels: Record<string, string> = {
  onboarding: "Onboarding",
  compliance: "Compliance",
  training: "Training",
  it_setup: "IT Setup",
  hr_paperwork: "HR Paperwork",
  general: "General",
};

const categoryColors: Record<string, string> = {
  onboarding: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  compliance: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  training: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  it_setup: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  hr_paperwork: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  general: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
};

const assignmentTypeLabels: Record<string, string> = {
  individual: "Individual",
  department: "Department",
  managers: "All Managers",
  everyone: "Everyone",
};

const assignmentTypeIcons: Record<string, typeof Users> = {
  individual: UserCheck,
  department: Building2,
  managers: Users,
  everyone: Globe,
};

interface TaskItem {
  id: string;
  title: string;
  description: string;
  isRequired: boolean;
  requiresAcknowledgment?: boolean;
  documentUrl?: string;
  documentName?: string;
}

function parseItems(itemsStr: string): TaskItem[] {
  try { return JSON.parse(itemsStr); } catch { return []; }
}

function CreateTemplateDialog() {
  const { data: departments = [] } = useQuery<Department[]>({ queryKey: ['/api/departments'] });
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [departmentId, setDepartmentId] = useState<string>("none");
  const [defaultAssignmentType, setDefaultAssignmentType] = useState("individual");
  const [items, setItems] = useState<Omit<TaskItem, "id">[]>([]);
  const [itemTitle, setItemTitle] = useState("");
  const [itemDesc, setItemDesc] = useState("");
  const [itemRequired, setItemRequired] = useState(true);
  const [itemRequiresAck, setItemRequiresAck] = useState(false);
  const [itemDocUrl, setItemDocUrl] = useState("");
  const [itemDocName, setItemDocName] = useState("");
  const [uploading, setUploading] = useState(false);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/task-templates", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/task-templates'] });
      toast({ title: "Template created" });
      resetForm();
      setOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setName(""); setDescription(""); setCategory("general");
    setDepartmentId("none"); setDefaultAssignmentType("individual");
    setItems([]); setItemTitle(""); setItemDesc("");
    setItemRequiresAck(false); setItemDocUrl(""); setItemDocName("");
  };

  const addItem = () => {
    if (!itemTitle.trim()) return;
    setItems([...items, {
      title: itemTitle.trim(),
      description: itemDesc.trim(),
      isRequired: itemRequired,
      ...(itemRequiresAck ? {
        requiresAcknowledgment: true,
        ...(itemDocUrl ? { documentUrl: itemDocUrl, documentName: itemDocName } : {}),
      } : {}),
    }]);
    setItemTitle(""); setItemDesc(""); setItemRequired(true);
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

  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));

  const handleSubmit = () => {
    if (!name.trim() || items.length === 0) return;
    const itemsWithIds = items.map((item, i) => ({ ...item, id: `item-${Date.now()}-${i}` }));
    createMutation.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      category,
      departmentId: departmentId === "none" ? null : departmentId,
      defaultAssignmentType,
      isDefault: false,
      items: JSON.stringify(itemsWithIds),
    });
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
          <DialogTitle>Create Task Template</DialogTitle>
          <DialogDescription>Define a reusable task checklist that can be assigned to employees, departments, or the whole company</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Template Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., New Hire Setup" data-testid="input-template-name" />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger data-testid="select-template-category">
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
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe this template..." data-testid="input-template-description" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Department (Optional)</Label>
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
            <div className="space-y-2">
              <Label>Default Assignment Type</Label>
              <Select value={defaultAssignmentType} onValueChange={setDefaultAssignmentType}>
                <SelectTrigger data-testid="select-default-assignment-type">
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
          </div>

          <div className="border-t pt-4 space-y-3">
            <h4 className="font-medium text-sm">Checklist Items</h4>
            <div className="space-y-2">
              <Label>Item Title</Label>
              <Input value={itemTitle} onChange={(e) => setItemTitle(e.target.value)} placeholder="Task name" data-testid="input-item-title" />
            </div>
            <div className="space-y-2">
              <Label>Item Description (Optional)</Label>
              <Input value={itemDesc} onChange={(e) => setItemDesc(e.target.value)} placeholder="Brief description" data-testid="input-item-description" />
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Checkbox id="item-required" checked={itemRequired} onCheckedChange={(v) => setItemRequired(!!v)} data-testid="checkbox-item-required" />
                <Label htmlFor="item-required" className="text-sm">Required</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="item-ack" checked={itemRequiresAck} onCheckedChange={(v) => setItemRequiresAck(!!v)} data-testid="checkbox-item-acknowledgment" />
                <Label htmlFor="item-ack" className="text-sm">Requires Acknowledgment</Label>
              </div>
            </div>
            {itemRequiresAck && (
              <div className="space-y-2 rounded-md border border-dashed p-3">
                <p className="text-xs text-muted-foreground">Attach a document employees must read before acknowledging (optional)</p>
                {itemDocUrl ? (
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm truncate">{itemDocName}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => { setItemDocUrl(""); setItemDocName(""); }} data-testid="button-remove-doc">
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <Label className="flex items-center gap-2 cursor-pointer text-sm text-primary hover:underline">
                    <Upload className="h-3.5 w-3.5" />
                    {uploading ? "Uploading..." : "Upload Document"}
                    <input type="file" className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv" onChange={handleDocUpload} disabled={uploading} data-testid="input-doc-upload" />
                  </Label>
                )}
              </div>
            )}
            <Button type="button" size="sm" onClick={addItem} disabled={!itemTitle.trim()} data-testid="button-add-item">
              <Plus className="h-3 w-3 mr-1" />
              Add Item
            </Button>
          </div>

          {items.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Items ({items.length})</h4>
              <div className="space-y-1">
                {items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 p-2 rounded-md border">
                    <div className="flex items-center gap-2 min-w-0">
                      <GripVertical className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="text-sm truncate">{item.title}</span>
                      {item.isRequired && <Badge variant="outline" className="text-xs shrink-0">Required</Badge>}
                      {item.requiresAcknowledgment && <Badge variant="secondary" className="text-xs shrink-0"><ShieldCheck className="h-3 w-3 mr-1" />Acknowledgment</Badge>}
                      {item.documentName && <Badge variant="outline" className="text-xs shrink-0"><FileText className="h-3 w-3 mr-1" />{item.documentName}</Badge>}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeItem(i)} data-testid={`button-remove-item-${i}`}>
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
          <Button onClick={handleSubmit} disabled={!name.trim() || items.length === 0 || createMutation.isPending} data-testid="button-save-template">
            {createMutation.isPending ? "Creating..." : "Create Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TemplateCard({ template }: { template: TaskTemplate }) {
  const { data: departments = [] } = useQuery<Department[]>({ queryKey: ['/api/departments'] });
  const { toast } = useToast();
  const dept = template.departmentId ? departments.find((d) => d.id === template.departmentId) : null;
  const items = parseItems(template.items);
  const AssignIcon = assignmentTypeIcons[template.defaultAssignmentType || "individual"] || UserCheck;

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/task-templates/${template.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/task-templates'] });
      toast({ title: "Template deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

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
            <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending} data-testid={`button-delete-template-${template.id}`}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className={`text-xs ${categoryColors[template.category] || categoryColors.general}`}>
            {categoryLabels[template.category] || template.category}
          </Badge>
          {dept && (
            <Badge variant="outline" className="text-xs">
              <Building2 className="h-3 w-3 mr-1" />
              {dept.name}
            </Badge>
          )}
          <Badge variant="secondary" className="text-xs">{items.length} items</Badge>
          <Badge variant="outline" className="text-xs">
            <AssignIcon className="h-3 w-3 mr-1" />
            {assignmentTypeLabels[template.defaultAssignmentType || "individual"]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {items.map((item, i) => (
            <div key={item.id || i} className="flex items-center gap-2 text-sm">
              <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
              <span className="text-muted-foreground truncate">{item.title}</span>
              {item.isRequired && <span className="text-xs text-destructive">*</span>}
              {item.requiresAcknowledgment && <ShieldCheck className="h-3 w-3 text-amber-500 shrink-0" />}
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
  const { data: templates = [], isLoading } = useQuery<TaskTemplate[]>({ queryKey: ['/api/task-templates'] });

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
            <h1 className="text-xl font-semibold tracking-tight" data-testid="text-task-templates-title">
              Task Templates
            </h1>
          </div>
          <p className="text-muted-foreground">
            Create and manage reusable task checklists for employees, departments, or the whole company
          </p>
        </div>
        <CreateTemplateDialog />
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-32 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground text-sm">No task templates yet</p>
            <p className="text-muted-foreground text-xs mt-1">Create your first template to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((template) => (
            <TemplateCard key={template.id} template={template} />
          ))}
        </div>
      )}
    </div>
  );
}
