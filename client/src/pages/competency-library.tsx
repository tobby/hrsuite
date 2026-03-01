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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { useRole, canEditOrgSettings } from "@/lib/role-context";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Competency, CompetencyQuestion } from "@shared/schema";
import {
  BookOpen,
  Plus,
  Trash2,
  Pencil,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Check,
  X,
  Inbox,
  Shield,
  Star,
  AlignLeft,
  GripVertical,
  Search,
} from "lucide-react";

export default function CompetencyLibrary() {
  const { role } = useRole();
  const isAdmin = canEditOrgSettings(role);
  const { toast } = useToast();

  const [expandedCompetencyId, setExpandedCompetencyId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCategory, setNewCategory] = useState("");

  const [editingCompetencyId, setEditingCompetencyId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState("");

  const [deleteCompetencyId, setDeleteCompetencyId] = useState<string | null>(null);
  const [deleteQuestionId, setDeleteQuestionId] = useState<string | null>(null);

  const [addQuestionText, setAddQuestionText] = useState("");
  const [addQuestionType, setAddQuestionType] = useState("rating");

  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editQuestionText, setEditQuestionText] = useState("");
  const [editQuestionType, setEditQuestionType] = useState("rating");

  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const { data: competencies = [], isLoading: competenciesLoading } = useQuery<Competency[]>({
    queryKey: ["/api/competencies"],
  });

  const { data: questions = [], isLoading: questionsLoading } = useQuery<CompetencyQuestion[]>({
    queryKey: ["/api/competencies", expandedCompetencyId, "questions"],
    enabled: !!expandedCompetencyId,
  });

  const createCompetencyMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; category: string }) => {
      const res = await apiRequest("POST", "/api/competencies", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/competencies"] });
      toast({ title: "Competency created", description: "The competency has been added to the library." });
      setIsCreateOpen(false);
      setNewName("");
      setNewDescription("");
      setNewCategory("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateCompetencyMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name?: string; description?: string; category?: string } }) => {
      const res = await apiRequest("PATCH", `/api/competencies/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/competencies"] });
      toast({ title: "Competency updated", description: "The competency has been updated." });
      setEditingCompetencyId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteCompetencyMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/competencies/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/competencies"] });
      toast({ title: "Competency deleted", description: "The competency has been removed from the library." });
      if (expandedCompetencyId === deleteCompetencyId) {
        setExpandedCompetencyId(null);
      }
      setDeleteCompetencyId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const addQuestionMutation = useMutation({
    mutationFn: async (data: { competencyId: string; questionText: string; questionType: string; order: number }) => {
      const res = await apiRequest("POST", `/api/competencies/${data.competencyId}/questions`, {
        questionText: data.questionText,
        questionType: data.questionType,
        order: data.order,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/competencies", expandedCompetencyId, "questions"] });
      toast({ title: "Question added", description: "The question has been added to the competency." });
      setAddQuestionText("");
      setAddQuestionType("rating");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateQuestionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { questionText?: string; questionType?: string } }) => {
      const res = await apiRequest("PATCH", `/api/competency-questions/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/competencies", expandedCompetencyId, "questions"] });
      toast({ title: "Question updated", description: "The question has been updated." });
      setEditingQuestionId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/competency-questions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/competencies", expandedCompetencyId, "questions"] });
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
          Only administrators can manage the competency library.
        </p>
        <Link href="/appraisals">
          <Button variant="outline" data-testid="button-back-to-appraisals">Back to Appraisals</Button>
        </Link>
      </div>
    );
  }

  const categories = Array.from(new Set(competencies.map(c => c.category))).sort();

  const filteredCompetencies = competencies.filter(c => {
    const matchesSearch = !searchTerm ||
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === "all" || c.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const groupedByCategory = filteredCompetencies.reduce<Record<string, Competency[]>>((acc, c) => {
    if (!acc[c.category]) acc[c.category] = [];
    acc[c.category].push(c);
    return acc;
  }, {});

  const sortedCategories = Object.keys(groupedByCategory).sort();

  function handleCreateCompetency() {
    if (!newName.trim()) {
      toast({ title: "Validation Error", description: "Please provide a competency name.", variant: "destructive" });
      return;
    }
    if (!newCategory.trim()) {
      toast({ title: "Validation Error", description: "Please provide a category.", variant: "destructive" });
      return;
    }
    createCompetencyMutation.mutate({ name: newName.trim(), description: newDescription.trim(), category: newCategory.trim() });
  }

  function handleSaveCompetencyEdit(id: string) {
    if (!editName.trim()) {
      toast({ title: "Validation Error", description: "Competency name cannot be empty.", variant: "destructive" });
      return;
    }
    if (!editCategory.trim()) {
      toast({ title: "Validation Error", description: "Category cannot be empty.", variant: "destructive" });
      return;
    }
    updateCompetencyMutation.mutate({ id, data: { name: editName.trim(), description: editDescription.trim(), category: editCategory.trim() } });
  }

  function handleStartEditCompetency(comp: Competency) {
    setEditingCompetencyId(comp.id);
    setEditName(comp.name);
    setEditDescription(comp.description);
    setEditCategory(comp.category);
  }

  function handleAddQuestion() {
    if (!addQuestionText.trim() || !expandedCompetencyId) {
      toast({ title: "Validation Error", description: "Please enter the question text.", variant: "destructive" });
      return;
    }
    const nextOrder = questions.length + 1;
    addQuestionMutation.mutate({
      competencyId: expandedCompetencyId,
      questionText: addQuestionText.trim(),
      questionType: addQuestionType,
      order: nextOrder,
    });
  }

  function handleStartEditQuestion(question: CompetencyQuestion) {
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

  function toggleCompetency(id: string) {
    setExpandedCompetencyId(prev => (prev === id ? null : id));
    setEditingQuestionId(null);
    setAddQuestionText("");
    setAddQuestionType("rating");
  }

  const sortedQuestions = [...questions].sort((a, b) => a.order - b.order);

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
              <BookOpen className="h-5 w-5 text-muted-foreground" />
              <h1 className="text-xl font-semibold tracking-tight" data-testid="text-competency-library-title">
                Competency Library
              </h1>
            </div>
          </div>
          <p className="text-sm text-muted-foreground ml-12">
            Manage competencies and their predefined questions for use in appraisal templates
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create-competency">
          <Plus className="h-4 w-4 mr-2" />
          New Competency
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search competencies..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9"
            data-testid="input-search-competencies"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[180px]" data-testid="select-filter-category">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {competenciesLoading ? (
        <div className="space-y-4">
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
      ) : filteredCompetencies.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Inbox className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground" data-testid="text-no-competencies">
            {competencies.length === 0 ? "No competencies yet" : "No competencies match your search"}
          </h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">
            {competencies.length === 0
              ? "Create competencies with predefined questions to easily import into your appraisal templates."
              : "Try adjusting your search term or category filter."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedCategories.map(category => (
            <div key={category} data-testid={`category-group-${category}`}>
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="outline" data-testid={`badge-category-${category}`}>{category}</Badge>
                <span className="text-xs text-muted-foreground">
                  {groupedByCategory[category].length} competenc{groupedByCategory[category].length !== 1 ? "ies" : "y"}
                </span>
              </div>
              <div className="space-y-2">
                {groupedByCategory[category].map(comp => {
                  const isExpanded = expandedCompetencyId === comp.id;
                  const isEditing = editingCompetencyId === comp.id;

                  return (
                    <Card key={comp.id} data-testid={`card-competency-${comp.id}`}>
                      <CardContent className="p-4">
                        <div
                          className="flex items-start justify-between gap-4 cursor-pointer flex-wrap"
                          onClick={() => {
                            if (!isEditing) toggleCompetency(comp.id);
                          }}
                          data-testid={`button-toggle-competency-${comp.id}`}
                        >
                          <div className="flex-1 min-w-0">
                            {isEditing ? (
                              <div className="space-y-3" onClick={e => e.stopPropagation()}>
                                <div className="space-y-1">
                                  <Label htmlFor={`edit-name-${comp.id}`}>Name</Label>
                                  <Input
                                    id={`edit-name-${comp.id}`}
                                    value={editName}
                                    onChange={e => setEditName(e.target.value)}
                                    data-testid={`input-edit-competency-name-${comp.id}`}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label htmlFor={`edit-desc-${comp.id}`}>Description</Label>
                                  <Textarea
                                    id={`edit-desc-${comp.id}`}
                                    value={editDescription}
                                    onChange={e => setEditDescription(e.target.value)}
                                    rows={2}
                                    data-testid={`input-edit-competency-description-${comp.id}`}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label htmlFor={`edit-cat-${comp.id}`}>Category</Label>
                                  <Input
                                    id={`edit-cat-${comp.id}`}
                                    value={editCategory}
                                    onChange={e => setEditCategory(e.target.value)}
                                    data-testid={`input-edit-competency-category-${comp.id}`}
                                  />
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Button
                                    size="sm"
                                    onClick={() => handleSaveCompetencyEdit(comp.id)}
                                    disabled={updateCompetencyMutation.isPending}
                                    data-testid={`button-save-competency-${comp.id}`}
                                  >
                                    <Check className="h-3 w-3 mr-1" />
                                    {updateCompetencyMutation.isPending ? "Saving..." : "Save"}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setEditingCompetencyId(null)}
                                    data-testid={`button-cancel-edit-competency-${comp.id}`}
                                  >
                                    <X className="h-3 w-3 mr-1" />
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center gap-2 flex-wrap">
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                  )}
                                  <span className="font-medium" data-testid={`text-competency-name-${comp.id}`}>
                                    {comp.name}
                                  </span>
                                </div>
                                {comp.description && (
                                  <p className="text-sm text-muted-foreground mt-1 ml-6" data-testid={`text-competency-description-${comp.id}`}>
                                    {comp.description}
                                  </p>
                                )}
                              </>
                            )}
                          </div>

                          <div className="flex items-center gap-1 flex-shrink-0">
                            {!isEditing && (
                              <>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={e => {
                                    e.stopPropagation();
                                    handleStartEditCompetency(comp);
                                  }}
                                  data-testid={`button-edit-competency-${comp.id}`}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={e => {
                                    e.stopPropagation();
                                    setDeleteCompetencyId(comp.id);
                                  }}
                                  data-testid={`button-delete-competency-${comp.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>

                        {isExpanded && !isEditing && (
                          <div className="mt-4 pt-4 border-t space-y-4 ml-6">
                            <div className="flex items-center justify-between gap-4 flex-wrap">
                              <h3 className="text-sm font-semibold" data-testid={`text-questions-heading-${comp.id}`}>
                                Questions ({questionsLoading ? "..." : sortedQuestions.length})
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
                              <p className="text-sm text-muted-foreground py-2" data-testid={`text-no-questions-${comp.id}`}>
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
                                          <Badge variant="secondary" data-testid={`badge-question-type-${question.id}`}>
                                            {question.questionType === "rating" ? (
                                              <><Star className="h-3 w-3 mr-1" />Rating</>
                                            ) : (
                                              <><AlignLeft className="h-3 w-3 mr-1" />Text</>
                                            )}
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

                            <div className="flex items-center gap-2 pt-2 border-t flex-wrap">
                              <Input
                                value={addQuestionText}
                                onChange={e => setAddQuestionText(e.target.value)}
                                placeholder="Enter question text..."
                                className="flex-1 min-w-[200px]"
                                onKeyDown={e => {
                                  if (e.key === "Enter") handleAddQuestion();
                                }}
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
                                size="sm"
                                onClick={handleAddQuestion}
                                disabled={addQuestionMutation.isPending || !addQuestionText.trim()}
                                data-testid="button-add-question"
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                {addQuestionMutation.isPending ? "Adding..." : "Add"}
                              </Button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Competency</DialogTitle>
            <DialogDescription>
              Add a new competency to the library. You can add questions to it after creation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-comp-name">Name</Label>
              <Input
                id="new-comp-name"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g., Communication Skills"
                data-testid="input-new-competency-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-comp-description">Description</Label>
              <Textarea
                id="new-comp-description"
                value={newDescription}
                onChange={e => setNewDescription(e.target.value)}
                placeholder="Describe what this competency evaluates..."
                rows={3}
                data-testid="input-new-competency-description"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-comp-category">Category</Label>
              <Input
                id="new-comp-category"
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
                placeholder="e.g., Soft Skills, Technical, Leadership"
                list="category-suggestions"
                data-testid="input-new-competency-category"
              />
              {categories.length > 0 && (
                <datalist id="category-suggestions">
                  {categories.map(cat => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateOpen(false)}
              data-testid="button-cancel-create-competency"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateCompetency}
              disabled={createCompetencyMutation.isPending}
              data-testid="button-confirm-create-competency"
            >
              {createCompetencyMutation.isPending ? "Creating..." : "Create Competency"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteCompetencyId} onOpenChange={() => setDeleteCompetencyId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Competency</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this competency? This will also remove all its associated questions. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteCompetencyId(null)}
              data-testid="button-cancel-delete-competency"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteCompetencyId && deleteCompetencyMutation.mutate(deleteCompetencyId)}
              disabled={deleteCompetencyMutation.isPending}
              data-testid="button-confirm-delete-competency"
            >
              {deleteCompetencyMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteQuestionId} onOpenChange={() => setDeleteQuestionId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Question</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this question? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteQuestionId(null)}
              data-testid="button-cancel-delete-question"
            >
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
