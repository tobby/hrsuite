import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useRole, canEditOrgSettings } from "@/lib/role-context";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { AppraisalTemplate, TemplateQuestion } from "@shared/schema";
import {
  FileText,
  Plus,
  Trash2,
  Pencil,
  ArrowLeft,
  Star,
  AlignLeft,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Check,
  X,
  Inbox,
  Shield,
} from "lucide-react";

export default function AppraisalTemplates() {
  const { role } = useRole();
  const isAdmin = canEditOrgSettings(role);
  const { toast } = useToast();

  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);
  const [deleteQuestionId, setDeleteQuestionId] = useState<string | null>(null);

  const [addQuestionText, setAddQuestionText] = useState("");
  const [addQuestionType, setAddQuestionType] = useState("rating");

  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editQuestionText, setEditQuestionText] = useState("");
  const [editQuestionType, setEditQuestionType] = useState("rating");

  const { data: templates = [], isLoading: templatesLoading } = useQuery<AppraisalTemplate[]>({
    queryKey: ["/api/appraisal-templates"],
  });

  const { data: questions = [], isLoading: questionsLoading } = useQuery<TemplateQuestion[]>({
    queryKey: ["/api/appraisal-templates", selectedTemplateId, "questions"],
    enabled: !!selectedTemplateId,
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      const res = await apiRequest("POST", "/api/appraisal-templates", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appraisal-templates"] });
      toast({ title: "Template created", description: "The review template has been created." });
      setIsCreateOpen(false);
      setNewName("");
      setNewDescription("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name?: string; description?: string } }) => {
      const res = await apiRequest("PATCH", `/api/appraisal-templates/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appraisal-templates"] });
      toast({ title: "Template updated", description: "The template has been updated." });
      setEditingTemplateId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/appraisal-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appraisal-templates"] });
      toast({ title: "Template deleted", description: "The template has been deleted." });
      if (selectedTemplateId === deleteTemplateId) {
        setSelectedTemplateId(null);
      }
      setDeleteTemplateId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const addQuestionMutation = useMutation({
    mutationFn: async (data: { templateId: string; questionText: string; questionType: string; order: number }) => {
      const res = await apiRequest("POST", `/api/appraisal-templates/${data.templateId}/questions`, {
        questionText: data.questionText,
        questionType: data.questionType,
        order: data.order,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appraisal-templates", selectedTemplateId, "questions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/appraisal-templates"] });
      toast({ title: "Question added", description: "The question has been added to the template." });
      setAddQuestionText("");
      setAddQuestionType("rating");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateQuestionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { questionText?: string; questionType?: string } }) => {
      const res = await apiRequest("PATCH", `/api/template-questions/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appraisal-templates", selectedTemplateId, "questions"] });
      toast({ title: "Question updated", description: "The question has been updated." });
      setEditingQuestionId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/template-questions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appraisal-templates", selectedTemplateId, "questions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/appraisal-templates"] });
      toast({ title: "Question deleted", description: "The question has been removed." });
      setDeleteQuestionId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <Shield className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold mb-2">Access Restricted</h2>
        <p className="text-muted-foreground text-center mb-4">
          Only administrators can manage appraisal templates.
        </p>
        <Link href="/appraisals">
          <Button variant="outline" data-testid="button-back-to-appraisals">Back to Appraisals</Button>
        </Link>
      </div>
    );
  }

  function handleCreateTemplate() {
    if (!newName.trim()) {
      toast({ title: "Validation Error", description: "Please provide a template name.", variant: "destructive" });
      return;
    }
    createTemplateMutation.mutate({ name: newName.trim(), description: newDescription.trim() });
  }

  function handleSaveTemplateEdit(id: string) {
    if (!editName.trim()) {
      toast({ title: "Validation Error", description: "Template name cannot be empty.", variant: "destructive" });
      return;
    }
    updateTemplateMutation.mutate({ id, data: { name: editName.trim(), description: editDescription.trim() } });
  }

  function handleStartEditTemplate(template: AppraisalTemplate) {
    setEditingTemplateId(template.id);
    setEditName(template.name);
    setEditDescription(template.description || "");
  }

  function handleAddQuestion() {
    if (!addQuestionText.trim() || !selectedTemplateId) {
      toast({ title: "Validation Error", description: "Please enter the question text.", variant: "destructive" });
      return;
    }
    const nextOrder = questions.length + 1;
    addQuestionMutation.mutate({
      templateId: selectedTemplateId,
      questionText: addQuestionText.trim(),
      questionType: addQuestionType,
      order: nextOrder,
    });
  }

  function handleStartEditQuestion(question: TemplateQuestion) {
    setEditingQuestionId(question.id);
    setEditQuestionText(question.questionText);
    setEditQuestionType(question.questionType);
  }

  function handleSaveQuestionEdit(id: string) {
    if (!editQuestionText.trim()) {
      toast({ title: "Validation Error", description: "Question text cannot be empty.", variant: "destructive" });
      return;
    }
    updateQuestionMutation.mutate({ id, data: { questionText: editQuestionText.trim(), questionType: editQuestionType } });
  }

  function toggleTemplate(id: string) {
    setSelectedTemplateId(prev => (prev === id ? null : id));
    setEditingQuestionId(null);
    setAddQuestionText("");
    setAddQuestionType("rating");
  }

  const sortedQuestions = [...questions].sort((a, b) => a.order - b.order);
  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link href="/appraisals">
              <Button variant="ghost" size="icon" data-testid="button-back-to-appraisals">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <h1 className="text-xl font-semibold tracking-tight" data-testid="text-templates-title">
                Review Templates
              </h1>
            </div>
          </div>
          <p className="text-sm text-muted-foreground ml-12">
            Create and manage templates for performance reviews
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create-template">
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      {templatesLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-1/4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Inbox className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">No templates yet</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">
            Create review templates with rating scales and text questions to standardize your performance evaluation process.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map(template => {
            const isSelected = selectedTemplateId === template.id;
            const isEditing = editingTemplateId === template.id;

            return (
              <Card key={template.id} data-testid={`card-template-${template.id}`}>
                <CardContent className="p-4">
                  <div
                    className="flex items-start justify-between gap-4 cursor-pointer flex-wrap"
                    onClick={() => {
                      if (!isEditing) toggleTemplate(template.id);
                    }}
                    data-testid={`button-toggle-template-${template.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <div className="space-y-3" onClick={e => e.stopPropagation()}>
                          <div className="space-y-1">
                            <Label htmlFor={`edit-name-${template.id}`}>Name</Label>
                            <Input
                              id={`edit-name-${template.id}`}
                              value={editName}
                              onChange={e => setEditName(e.target.value)}
                              data-testid={`input-edit-template-name-${template.id}`}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor={`edit-desc-${template.id}`}>Description</Label>
                            <Textarea
                              id={`edit-desc-${template.id}`}
                              value={editDescription}
                              onChange={e => setEditDescription(e.target.value)}
                              rows={2}
                              data-testid={`input-edit-template-description-${template.id}`}
                            />
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Button
                              size="sm"
                              onClick={() => handleSaveTemplateEdit(template.id)}
                              disabled={updateTemplateMutation.isPending}
                              data-testid={`button-save-template-${template.id}`}
                            >
                              <Check className="h-3 w-3 mr-1" />
                              {updateTemplateMutation.isPending ? "Saving..." : "Save"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingTemplateId(null)}
                              data-testid={`button-cancel-edit-template-${template.id}`}
                            >
                              <X className="h-3 w-3 mr-1" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium" data-testid={`text-template-name-${template.id}`}>
                              {template.name}
                            </span>
                            {template.isDefault === 1 && (
                              <Badge variant="secondary" data-testid={`badge-default-${template.id}`}>
                                Default
                              </Badge>
                            )}
                          </div>
                          {template.description && (
                            <p className="text-sm text-muted-foreground mt-1" data-testid={`text-template-description-${template.id}`}>
                              {template.description}
                            </p>
                          )}
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!isEditing && (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={e => {
                              e.stopPropagation();
                              handleStartEditTemplate(template);
                            }}
                            data-testid={`button-edit-template-${template.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={e => {
                              e.stopPropagation();
                              setDeleteTemplateId(template.id);
                            }}
                            data-testid={`button-delete-template-${template.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          {isSelected ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {isSelected && !isEditing && (
                    <div className="mt-4 pt-4 border-t space-y-4">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <h3 className="text-sm font-semibold" data-testid="text-questions-heading">
                          Questions ({sortedQuestions.length})
                        </h3>
                      </div>

                      {questionsLoading ? (
                        <div className="space-y-2">
                          {[1, 2].map(i => (
                            <div key={i} className="flex items-center gap-3">
                              <Skeleton className="h-4 w-6" />
                              <Skeleton className="h-4 flex-1" />
                              <Skeleton className="h-5 w-16" />
                            </div>
                          ))}
                        </div>
                      ) : sortedQuestions.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-2">
                          No questions yet. Add your first question below.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {sortedQuestions.map(question => {
                            const isEditingQ = editingQuestionId === question.id;

                            return (
                              <div
                                key={question.id}
                                className="flex items-center gap-3 p-2 rounded-md bg-muted/50"
                                data-testid={`question-row-${question.id}`}
                              >
                                <span className="text-xs text-muted-foreground w-6 text-center flex-shrink-0 flex items-center justify-center">
                                  <GripVertical className="h-3 w-3 inline mr-0.5" />
                                  {question.order}
                                </span>

                                {isEditingQ ? (
                                  <div className="flex-1 flex items-center gap-2 flex-wrap">
                                    <Input
                                      value={editQuestionText}
                                      onChange={e => setEditQuestionText(e.target.value)}
                                      className="flex-1 min-w-[200px]"
                                      data-testid={`input-edit-question-text-${question.id}`}
                                    />
                                    <Select value={editQuestionType} onValueChange={setEditQuestionType}>
                                      <SelectTrigger className="w-[120px]" data-testid={`select-edit-question-type-${question.id}`}>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="rating">Rating</SelectItem>
                                        <SelectItem value="text">Text</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => handleSaveQuestionEdit(question.id)}
                                      disabled={updateQuestionMutation.isPending}
                                      data-testid={`button-save-question-${question.id}`}
                                    >
                                      <Check className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => setEditingQuestionId(null)}
                                      data-testid={`button-cancel-edit-question-${question.id}`}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ) : (
                                  <>
                                    <span className="flex-1 text-sm" data-testid={`text-question-${question.id}`}>
                                      {question.questionText}
                                    </span>
                                    <Badge variant="outline" data-testid={`badge-question-type-${question.id}`}>
                                      {question.questionType === "rating" ? (
                                        <Star className="h-3 w-3 mr-1" />
                                      ) : (
                                        <AlignLeft className="h-3 w-3 mr-1" />
                                      )}
                                      {question.questionType === "rating" ? "Rating" : "Text"}
                                    </Badge>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => handleStartEditQuestion(question)}
                                      data-testid={`button-edit-question-${question.id}`}
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => setDeleteQuestionId(question.id)}
                                      data-testid={`button-delete-question-${question.id}`}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <div className="pt-2 border-t">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Input
                            value={addQuestionText}
                            onChange={e => setAddQuestionText(e.target.value)}
                            placeholder="Enter question text..."
                            className="flex-1 min-w-[200px]"
                            data-testid="input-add-question-text"
                          />
                          <Select value={addQuestionType} onValueChange={setAddQuestionType}>
                            <SelectTrigger className="w-[120px]" data-testid="select-add-question-type">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="rating">Rating</SelectItem>
                              <SelectItem value="text">Text</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            onClick={handleAddQuestion}
                            disabled={addQuestionMutation.isPending}
                            data-testid="button-add-question"
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            {addQuestionMutation.isPending ? "Adding..." : "Add"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[450px]" data-testid="dialog-create-template">
          <DialogHeader>
            <DialogTitle>Create Review Template</DialogTitle>
            <DialogDescription>
              Create a new template to organize your performance review questions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Template Name</Label>
              <Input
                id="template-name"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. Quarterly Performance Review"
                data-testid="input-template-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-description">Description</Label>
              <Textarea
                id="template-description"
                value={newDescription}
                onChange={e => setNewDescription(e.target.value)}
                placeholder="Describe the purpose of this template..."
                rows={3}
                data-testid="input-template-description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} data-testid="button-cancel-create-template">
              Cancel
            </Button>
            <Button
              onClick={handleCreateTemplate}
              disabled={createTemplateMutation.isPending}
              data-testid="button-confirm-create-template"
            >
              {createTemplateMutation.isPending ? "Creating..." : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTemplateId} onOpenChange={() => setDeleteTemplateId(null)}>
        <DialogContent className="sm:max-w-[400px]" data-testid="dialog-delete-template">
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this template? This will also remove all associated questions. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTemplateId(null)} data-testid="button-cancel-delete-template">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteTemplateId && deleteTemplateMutation.mutate(deleteTemplateId)}
              disabled={deleteTemplateMutation.isPending}
              data-testid="button-confirm-delete-template"
            >
              {deleteTemplateMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteQuestionId} onOpenChange={() => setDeleteQuestionId(null)}>
        <DialogContent className="sm:max-w-[400px]" data-testid="dialog-delete-question">
          <DialogHeader>
            <DialogTitle>Delete Question</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this question from the template? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteQuestionId(null)} data-testid="button-cancel-delete-question">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteQuestionId && deleteQuestionMutation.mutate(deleteQuestionId)}
              disabled={deleteQuestionMutation.isPending}
              data-testid="button-confirm-delete-question"
            >
              {deleteQuestionMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
