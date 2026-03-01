import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { useRole, canEditOrgSettings } from "@/lib/role-context";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { AppraisalTemplate, TemplateQuestion, TemplateSection, Competency, CompetencyQuestion } from "@shared/schema";
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
  Layers,
  Import,
  Users,
  User,
  UserCheck,
} from "lucide-react";

const REVIEWER_TYPES = [
  { value: "self", label: "Self", icon: User },
  { value: "peer", label: "Peer", icon: Users },
  { value: "manager", label: "Manager", icon: UserCheck },
] as const;

function ReviewerTypeBadges({ types }: { types: string[] }) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {REVIEWER_TYPES.map(rt => {
        const active = types.includes(rt.value);
        if (!active) return null;
        const Icon = rt.icon;
        return (
          <Badge
            key={rt.value}
            variant="secondary"
            className="text-[10px] gap-1"
            data-testid={`badge-reviewer-${rt.value}`}
          >
            <Icon className="h-2.5 w-2.5" />
            {rt.label}
          </Badge>
        );
      })}
    </div>
  );
}

function ReviewerTypeCheckboxes({
  selected,
  onChange,
  testIdPrefix,
}: {
  selected: string[];
  onChange: (types: string[]) => void;
  testIdPrefix: string;
}) {
  function toggle(value: string) {
    if (selected.includes(value)) {
      if (selected.length > 1) {
        onChange(selected.filter(v => v !== value));
      }
    } else {
      onChange([...selected, value]);
    }
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {REVIEWER_TYPES.map(rt => (
        <label key={rt.value} className="flex items-center gap-1.5 cursor-pointer text-sm">
          <Checkbox
            checked={selected.includes(rt.value)}
            onCheckedChange={() => toggle(rt.value)}
            data-testid={`${testIdPrefix}-${rt.value}`}
          />
          {rt.label}
        </label>
      ))}
    </div>
  );
}

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
  const [deleteSectionId, setDeleteSectionId] = useState<string | null>(null);

  const [addSectionName, setAddSectionName] = useState("");
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editSectionName, setEditSectionName] = useState("");

  const [addQuestionSectionId, setAddQuestionSectionId] = useState<string | null>(null);
  const [addQuestionText, setAddQuestionText] = useState("");
  const [addQuestionType, setAddQuestionType] = useState("rating");
  const [addQuestionReviewerTypes, setAddQuestionReviewerTypes] = useState<string[]>(["self", "peer", "manager"]);

  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editQuestionText, setEditQuestionText] = useState("");
  const [editQuestionType, setEditQuestionType] = useState("rating");
  const [editQuestionReviewerTypes, setEditQuestionReviewerTypes] = useState<string[]>(["self", "peer", "manager"]);

  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importTargetSectionId, setImportTargetSectionId] = useState<string | null>(null);
  const [selectedCompetencyId, setSelectedCompetencyId] = useState<string | null>(null);
  const [selectedCompetencyQuestions, setSelectedCompetencyQuestions] = useState<Set<string>>(new Set());

  const { data: templates = [], isLoading: templatesLoading } = useQuery<AppraisalTemplate[]>({
    queryKey: ["/api/appraisal-templates"],
  });

  const { data: questions = [], isLoading: questionsLoading } = useQuery<TemplateQuestion[]>({
    queryKey: ["/api/appraisal-templates", selectedTemplateId, "questions"],
    enabled: !!selectedTemplateId,
  });

  const { data: sections = [], isLoading: sectionsLoading } = useQuery<TemplateSection[]>({
    queryKey: ["/api/appraisal-templates", selectedTemplateId, "sections"],
    enabled: !!selectedTemplateId,
  });

  const { data: competencies = [] } = useQuery<Competency[]>({
    queryKey: ["/api/competencies"],
    enabled: importDialogOpen,
  });

  const { data: competencyQuestions = [] } = useQuery<CompetencyQuestion[]>({
    queryKey: ["/api/competencies", selectedCompetencyId, "questions"],
    enabled: !!selectedCompetencyId,
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

  const createSectionMutation = useMutation({
    mutationFn: async (data: { name: string; order: number }) => {
      const res = await apiRequest("POST", `/api/appraisal-templates/${selectedTemplateId}/sections`, data);
      return res.json();
    },
    onSuccess: (newSection: TemplateSection) => {
      queryClient.invalidateQueries({ queryKey: ["/api/appraisal-templates", selectedTemplateId, "sections"] });
      toast({ title: "Section created", description: "New section has been added." });
      setAddSectionName("");
      setExpandedSections(prev => new Set(prev).add(newSection.id));
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateSectionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name?: string; order?: number } }) => {
      const res = await apiRequest("PATCH", `/api/template-sections/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appraisal-templates", selectedTemplateId, "sections"] });
      toast({ title: "Section updated" });
      setEditingSectionId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteSectionMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/template-sections/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appraisal-templates", selectedTemplateId, "sections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/appraisal-templates", selectedTemplateId, "questions"] });
      toast({ title: "Section deleted" });
      setDeleteSectionId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const addQuestionMutation = useMutation({
    mutationFn: async (data: {
      templateId: string;
      questionText: string;
      questionType: string;
      order: number;
      sectionId?: string | null;
      reviewerTypes: string[];
    }) => {
      const res = await apiRequest("POST", `/api/appraisal-templates/${data.templateId}/questions`, {
        questionText: data.questionText,
        questionType: data.questionType,
        order: data.order,
        sectionId: data.sectionId || null,
        reviewerTypes: data.reviewerTypes,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appraisal-templates", selectedTemplateId, "questions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/appraisal-templates"] });
      toast({ title: "Question added", description: "The question has been added to the template." });
      setAddQuestionText("");
      setAddQuestionType("rating");
      setAddQuestionReviewerTypes(["self", "peer", "manager"]);
      setAddQuestionSectionId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateQuestionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { questionText?: string; questionType?: string; reviewerTypes?: string[] } }) => {
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

  const importQuestionsMutation = useMutation({
    mutationFn: async (questionsToImport: { questionText: string; questionType: string; order: number; sectionId: string | null; competencyId: string; reviewerTypes: string[] }[]) => {
      const results = [];
      for (const q of questionsToImport) {
        const res = await apiRequest("POST", `/api/appraisal-templates/${selectedTemplateId}/questions`, q);
        results.push(await res.json());
      }
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appraisal-templates", selectedTemplateId, "questions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/appraisal-templates"] });
      toast({ title: "Questions imported", description: "Competency questions have been added to the template." });
      setImportDialogOpen(false);
      setSelectedCompetencyId(null);
      setSelectedCompetencyQuestions(new Set());
      setImportTargetSectionId(null);
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

  function handleAddSection() {
    if (!addSectionName.trim() || !selectedTemplateId) {
      toast({ title: "Validation Error", description: "Please enter a section name.", variant: "destructive" });
      return;
    }
    const nextOrder = sections.length;
    createSectionMutation.mutate({ name: addSectionName.trim(), order: nextOrder });
  }

  function handleStartEditSection(section: TemplateSection) {
    setEditingSectionId(section.id);
    setEditSectionName(section.name);
  }

  function handleSaveSectionEdit(id: string) {
    if (!editSectionName.trim()) {
      toast({ title: "Validation Error", description: "Section name cannot be empty.", variant: "destructive" });
      return;
    }
    updateSectionMutation.mutate({ id, data: { name: editSectionName.trim() } });
  }

  function handleAddQuestion(sectionId: string | null) {
    if (!addQuestionText.trim() || !selectedTemplateId) {
      toast({ title: "Validation Error", description: "Please enter the question text.", variant: "destructive" });
      return;
    }
    const sectionQuestions = questions.filter(q => (q.sectionId || null) === sectionId);
    const nextOrder = sectionQuestions.length + 1;
    addQuestionMutation.mutate({
      templateId: selectedTemplateId,
      questionText: addQuestionText.trim(),
      questionType: addQuestionType,
      order: nextOrder,
      sectionId,
      reviewerTypes: addQuestionReviewerTypes,
    });
  }

  function handleStartEditQuestion(question: TemplateQuestion) {
    setEditingQuestionId(question.id);
    setEditQuestionText(question.questionText);
    setEditQuestionType(question.questionType);
    setEditQuestionReviewerTypes(question.reviewerTypes || ["self", "peer", "manager"]);
  }

  function handleSaveQuestionEdit(id: string) {
    if (!editQuestionText.trim()) {
      toast({ title: "Validation Error", description: "Question text cannot be empty.", variant: "destructive" });
      return;
    }
    updateQuestionMutation.mutate({
      id,
      data: {
        questionText: editQuestionText.trim(),
        questionType: editQuestionType,
        reviewerTypes: editQuestionReviewerTypes,
      },
    });
  }

  function toggleTemplate(id: string) {
    setSelectedTemplateId(prev => (prev === id ? null : id));
    setEditingQuestionId(null);
    setAddQuestionText("");
    setAddQuestionType("rating");
    setAddQuestionReviewerTypes(["self", "peer", "manager"]);
    setAddQuestionSectionId(null);
    setExpandedSections(new Set());
  }

  function toggleSectionExpanded(sectionId: string) {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }

  function handleOpenImportDialog(sectionId: string | null) {
    setImportTargetSectionId(sectionId);
    setSelectedCompetencyId(null);
    setSelectedCompetencyQuestions(new Set());
    setImportDialogOpen(true);
  }

  function handleImportQuestions() {
    if (!selectedCompetencyId || selectedCompetencyQuestions.size === 0) return;
    const toImport = competencyQuestions
      .filter(cq => selectedCompetencyQuestions.has(cq.id))
      .map((cq, idx) => ({
        questionText: cq.questionText,
        questionType: cq.questionType,
        order: questions.filter(q => (q.sectionId || null) === importTargetSectionId).length + idx + 1,
        sectionId: importTargetSectionId,
        competencyId: selectedCompetencyId,
        reviewerTypes: ["self", "peer", "manager"],
      }));
    importQuestionsMutation.mutate(toImport);
  }

  function toggleCompetencyQuestion(id: string) {
    setSelectedCompetencyQuestions(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function selectAllCompetencyQuestions() {
    if (selectedCompetencyQuestions.size === competencyQuestions.length) {
      setSelectedCompetencyQuestions(new Set());
    } else {
      setSelectedCompetencyQuestions(new Set(competencyQuestions.map(q => q.id)));
    }
  }

  const sortedSections = [...sections].sort((a, b) => a.order - b.order);
  const sortedQuestions = [...questions].sort((a, b) => a.order - b.order);
  const unsectionedQuestions = sortedQuestions.filter(q => !q.sectionId);
  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  function getQuestionsForSection(sectionId: string) {
    return sortedQuestions.filter(q => q.sectionId === sectionId);
  }

  function renderQuestionRow(question: TemplateQuestion) {
    const isEditingQ = editingQuestionId === question.id;

    return (
      <div
        key={question.id}
        className="flex items-start gap-3 p-2 rounded-md bg-muted/50"
        data-testid={`question-row-${question.id}`}
      >
        <span className="text-xs text-muted-foreground w-6 text-center flex-shrink-0 flex items-center justify-center mt-1">
          <GripVertical className="h-3 w-3 inline mr-0.5" />
          {question.order}
        </span>

        {isEditingQ ? (
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
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
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Visible to:</Label>
              <ReviewerTypeCheckboxes
                selected={editQuestionReviewerTypes}
                onChange={setEditQuestionReviewerTypes}
                testIdPrefix={`checkbox-edit-reviewer-${question.id}`}
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-start gap-2 flex-wrap">
            <div className="flex-1 min-w-0">
              <span className="text-sm" data-testid={`text-question-${question.id}`}>
                {question.questionText}
              </span>
              <div className="mt-1">
                <ReviewerTypeBadges types={question.reviewerTypes || ["self", "peer", "manager"]} />
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
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
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderAddQuestionForm(sectionId: string | null) {
    const isActive = addQuestionSectionId === sectionId;

    if (!isActive) {
      return (
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setAddQuestionSectionId(sectionId);
              setAddQuestionText("");
              setAddQuestionType("rating");
              setAddQuestionReviewerTypes(["self", "peer", "manager"]);
            }}
            data-testid={`button-start-add-question-${sectionId || "general"}`}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Question
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenImportDialog(sectionId)}
            data-testid={`button-import-competency-${sectionId || "general"}`}
          >
            <Import className="h-3 w-3 mr-1" />
            Import from Competencies
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-3 p-3 border rounded-md bg-muted/30">
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
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Visible to:</Label>
          <ReviewerTypeCheckboxes
            selected={addQuestionReviewerTypes}
            onChange={setAddQuestionReviewerTypes}
            testIdPrefix="checkbox-add-reviewer"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            onClick={() => handleAddQuestion(sectionId)}
            disabled={addQuestionMutation.isPending}
            data-testid="button-add-question"
          >
            <Plus className="h-3 w-3 mr-1" />
            {addQuestionMutation.isPending ? "Adding..." : "Add Question"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setAddQuestionSectionId(null)}
            data-testid="button-cancel-add-question"
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  function renderSectionBlock(section: TemplateSection) {
    const sectionQuestions = getQuestionsForSection(section.id);
    const isExpanded = expandedSections.has(section.id);
    const isEditingSec = editingSectionId === section.id;

    return (
      <div
        key={section.id}
        className="border rounded-md overflow-visible"
        data-testid={`section-block-${section.id}`}
      >
        <div
          className="flex items-center justify-between gap-2 p-3 cursor-pointer flex-wrap"
          onClick={() => !isEditingSec && toggleSectionExpanded(section.id)}
          data-testid={`button-toggle-section-${section.id}`}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
            <Layers className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            {isEditingSec ? (
              <div className="flex items-center gap-2 flex-wrap" onClick={e => e.stopPropagation()}>
                <Input
                  value={editSectionName}
                  onChange={e => setEditSectionName(e.target.value)}
                  className="w-[200px]"
                  data-testid={`input-edit-section-name-${section.id}`}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleSaveSectionEdit(section.id)}
                  disabled={updateSectionMutation.isPending}
                  data-testid={`button-save-section-${section.id}`}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setEditingSectionId(null)}
                  data-testid={`button-cancel-edit-section-${section.id}`}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <span className="font-medium text-sm" data-testid={`text-section-name-${section.id}`}>
                  {section.name}
                </span>
                <Badge variant="secondary" className="text-[10px]">
                  {sectionQuestions.length}
                </Badge>
              </>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {!isEditingSec && (
              <>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={e => {
                    e.stopPropagation();
                    handleStartEditSection(section);
                  }}
                  data-testid={`button-edit-section-${section.id}`}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={e => {
                    e.stopPropagation();
                    setDeleteSectionId(section.id);
                  }}
                  data-testid={`button-delete-section-${section.id}`}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </>
            )}
          </div>
        </div>

        {isExpanded && (
          <div className="p-3 pt-0 space-y-2">
            <div className="border-t pt-3 space-y-2">
              {sectionQuestions.length === 0 ? (
                <p className="text-sm text-muted-foreground py-1">
                  No questions in this section yet.
                </p>
              ) : (
                sectionQuestions.map(q => renderQuestionRow(q))
              )}
              <div className="pt-2">
                {renderAddQuestionForm(section.id)}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

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
                          Sections & Questions ({sortedQuestions.length} questions)
                        </h3>
                      </div>

                      {(questionsLoading || sectionsLoading) ? (
                        <div className="space-y-2">
                          {[1, 2].map(i => (
                            <div key={i} className="flex items-center gap-3">
                              <Skeleton className="h-4 w-6" />
                              <Skeleton className="h-4 flex-1" />
                              <Skeleton className="h-5 w-16" />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {sortedSections.map(section => renderSectionBlock(section))}

                          {unsectionedQuestions.length > 0 && (
                            <div
                              className="border rounded-md overflow-visible"
                              data-testid="section-block-general"
                            >
                              <div
                                className="flex items-center justify-between gap-2 p-3 cursor-pointer flex-wrap"
                                onClick={() => toggleSectionExpanded("__general__")}
                                data-testid="button-toggle-section-general"
                              >
                                <div className="flex items-center gap-2">
                                  <Layers className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium text-sm" data-testid="text-section-name-general">
                                    General
                                  </span>
                                  <Badge variant="secondary" className="text-[10px]">
                                    {unsectionedQuestions.length}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-1">
                                  {expandedSections.has("__general__") ? (
                                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </div>
                              </div>
                              {expandedSections.has("__general__") && (
                                <div className="p-3 pt-0 space-y-2">
                                  <div className="border-t pt-3 space-y-2">
                                    {unsectionedQuestions.map(q => renderQuestionRow(q))}
                                    <div className="pt-2">
                                      {renderAddQuestionForm(null)}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {unsectionedQuestions.length === 0 && sortedSections.length === 0 && (
                            <p className="text-sm text-muted-foreground py-2">
                              No sections or questions yet. Add a section to get started.
                            </p>
                          )}

                          <div className="pt-2 border-t">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Input
                                value={addSectionName}
                                onChange={e => setAddSectionName(e.target.value)}
                                placeholder="New section name..."
                                className="w-[240px]"
                                data-testid="input-add-section-name"
                              />
                              <Button
                                size="sm"
                                onClick={handleAddSection}
                                disabled={createSectionMutation.isPending}
                                data-testid="button-add-section"
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                {createSectionMutation.isPending ? "Adding..." : "Add Section"}
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
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

      <Dialog open={!!deleteSectionId} onOpenChange={() => setDeleteSectionId(null)}>
        <DialogContent className="sm:max-w-[400px]" data-testid="dialog-delete-section">
          <DialogHeader>
            <DialogTitle>Delete Section</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this section? Questions in this section will become unsectioned. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteSectionId(null)} data-testid="button-cancel-delete-section">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteSectionId && deleteSectionMutation.mutate(deleteSectionId)}
              disabled={deleteSectionMutation.isPending}
              data-testid="button-confirm-delete-section"
            >
              {deleteSectionMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="sm:max-w-[550px]" data-testid="dialog-import-competency">
          <DialogHeader>
            <DialogTitle>Import from Competency Library</DialogTitle>
            <DialogDescription>
              Select a competency and choose which questions to import into {importTargetSectionId ? sections.find(s => s.id === importTargetSectionId)?.name || "this section" : "the General section"}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[400px] overflow-y-auto">
            {competencies.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No competencies available. Create competencies in the Competency Library first.
              </p>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Select Competency</Label>
                  <Select
                    value={selectedCompetencyId || ""}
                    onValueChange={val => {
                      setSelectedCompetencyId(val);
                      setSelectedCompetencyQuestions(new Set());
                    }}
                  >
                    <SelectTrigger data-testid="select-import-competency">
                      <SelectValue placeholder="Choose a competency..." />
                    </SelectTrigger>
                    <SelectContent>
                      {competencies.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} ({c.category})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedCompetencyId && competencyQuestions.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <Label>Questions</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={selectAllCompetencyQuestions}
                        data-testid="button-select-all-competency-questions"
                      >
                        {selectedCompetencyQuestions.size === competencyQuestions.length ? "Deselect All" : "Select All"}
                      </Button>
                    </div>
                    <div className="space-y-1">
                      {competencyQuestions.map(cq => (
                        <label
                          key={cq.id}
                          className="flex items-start gap-2 p-2 rounded-md cursor-pointer bg-muted/30"
                          data-testid={`import-question-row-${cq.id}`}
                        >
                          <Checkbox
                            checked={selectedCompetencyQuestions.has(cq.id)}
                            onCheckedChange={() => toggleCompetencyQuestion(cq.id)}
                            className="mt-0.5"
                            data-testid={`checkbox-import-question-${cq.id}`}
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm">{cq.questionText}</span>
                            <Badge variant="outline" className="ml-2 text-[10px]">
                              {cq.questionType === "rating" ? "Rating" : "Text"}
                            </Badge>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {selectedCompetencyId && competencyQuestions.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    This competency has no questions yet.
                  </p>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setImportDialogOpen(false)}
              data-testid="button-cancel-import"
            >
              Cancel
            </Button>
            <Button
              onClick={handleImportQuestions}
              disabled={importQuestionsMutation.isPending || selectedCompetencyQuestions.size === 0}
              data-testid="button-confirm-import"
            >
              {importQuestionsMutation.isPending
                ? "Importing..."
                : `Import ${selectedCompetencyQuestions.size} Question${selectedCompetencyQuestions.size !== 1 ? "s" : ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}