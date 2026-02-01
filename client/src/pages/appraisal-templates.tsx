import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  FileText, 
  Plus, 
  Edit, 
  Trash2,
  Star,
  MessageSquare,
  ChevronRight,
  Copy,
  MoreVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRole, canEditOrgSettings } from "@/lib/role-context";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import {
  appraisalTemplates,
  competencies,
  getQuestionsByTemplate,
  getCompetencyById,
} from "@/lib/demo-data";

const templateFormSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  description: z.string().optional(),
});

const questionFormSchema = z.object({
  questionText: z.string().min(1, "Question text is required"),
  questionType: z.enum(["rating", "text"]),
  competencyId: z.string().optional(),
});

type TemplateFormValues = z.infer<typeof templateFormSchema>;
type QuestionFormValues = z.infer<typeof questionFormSchema>;

export default function AppraisalTemplates() {
  const { role } = useRole();
  const { toast } = useToast();
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAddQuestionOpen, setIsAddQuestionOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const isAdmin = canEditOrgSettings(role);

  const templateForm = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const questionForm = useForm<QuestionFormValues>({
    resolver: zodResolver(questionFormSchema),
    defaultValues: {
      questionText: "",
      questionType: "rating",
      competencyId: "none",
    },
  });

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold mb-2">Access Restricted</h2>
        <p className="text-muted-foreground text-center mb-4">
          Only administrators can manage appraisal templates.
        </p>
        <Link href="/appraisals">
          <Button variant="outline">Back to Appraisals</Button>
        </Link>
      </div>
    );
  }

  const handleCreateTemplate = (values: TemplateFormValues) => {
    toast({
      title: "Template Created",
      description: `"${values.name}" has been created successfully.`,
    });
    templateForm.reset();
    setIsCreateOpen(false);
  };

  const handleAddQuestion = (values: QuestionFormValues) => {
    const competencyName = values.competencyId && values.competencyId !== "none" 
      ? getCompetencyById(values.competencyId)?.name 
      : null;
    toast({
      title: "Question Added",
      description: competencyName 
        ? `Added ${values.questionType} question under ${competencyName}.`
        : `Added ${values.questionType} question to the template.`,
    });
    questionForm.reset({ questionText: "", questionType: "rating", competencyId: "none" });
    setIsAddQuestionOpen(false);
  };

  const handleCloseTemplateDialog = (open: boolean) => {
    if (!open) templateForm.reset();
    setIsCreateOpen(open);
  };

  const handleCloseQuestionDialog = (open: boolean) => {
    if (!open) questionForm.reset({ questionText: "", questionType: "rating", competencyId: "none" });
    setIsAddQuestionOpen(open);
  };

  const handleOpenAddQuestion = (templateId: string) => {
    setSelectedTemplateId(templateId);
    questionForm.reset({ questionText: "", questionType: "rating", competencyId: "none" });
    setIsAddQuestionOpen(true);
  };

  const competencyCategories = competencies.reduce<Record<string, typeof competencies>>((acc, comp) => {
    if (!acc[comp.category]) acc[comp.category] = [];
    acc[comp.category].push(comp);
    return acc;
  }, {});

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight" data-testid="text-templates-title">
              Review Templates
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Create and manage templates for performance reviews
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create-template">
          <Plus className="mr-2 h-4 w-4" />
          New Template
        </Button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{appraisalTemplates.length}</div>
            <p className="text-xs text-muted-foreground">Total Templates</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">
              {appraisalTemplates.filter(t => t.isDefault === 1).length}
            </div>
            <p className="text-xs text-muted-foreground">Default Templates</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">
              {appraisalTemplates.reduce((acc, t) => acc + getQuestionsByTemplate(t.id).filter(q => q.questionType === "rating").length, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Rating Questions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">
              {appraisalTemplates.reduce((acc, t) => acc + getQuestionsByTemplate(t.id).filter(q => q.questionType === "text").length, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Text Questions</p>
          </CardContent>
        </Card>
      </div>

      {/* Templates List */}
      <div className="space-y-4">
        {appraisalTemplates.map((template) => {
          const questions = getQuestionsByTemplate(template.id);
          const ratingQuestions = questions.filter(q => q.questionType === "rating");
          const textQuestions = questions.filter(q => q.questionType === "text");
          
          const competencyGroups = ratingQuestions.reduce<Record<string, typeof questions>>((acc, q) => {
            const comp = q.competencyId ? getCompetencyById(q.competencyId) : null;
            const key = comp?.category || "General";
            if (!acc[key]) acc[key] = [];
            acc[key].push(q);
            return acc;
          }, {});
          
          return (
            <Card key={template.id} data-testid={`template-card-${template.id}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      {template.isDefault === 1 && (
                        <Badge variant="secondary" className="text-xs">Default</Badge>
                      )}
                    </div>
                    <CardDescription className="mt-1">{template.description}</CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost" data-testid={`button-template-menu-${template.id}`}>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem data-testid={`button-edit-template-${template.id}`}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Template
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-destructive"
                        disabled={template.isDefault === 1}
                        data-testid={`button-delete-template-${template.id}`}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                {/* Question counts */}
                <div className="flex items-center gap-4 mt-3 text-sm">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded bg-amber-500/10 flex items-center justify-center">
                      <Star className="h-3 w-3 text-amber-500" />
                    </div>
                    <span className="text-muted-foreground">{ratingQuestions.length} ratings</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded bg-blue-500/10 flex items-center justify-center">
                      <MessageSquare className="h-3 w-3 text-blue-500" />
                    </div>
                    <span className="text-muted-foreground">{textQuestions.length} text</span>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-2">
                <Accordion type="single" collapsible className="w-full">
                  {/* Rating Questions by Category */}
                  {Object.entries(competencyGroups).map(([category, categoryQuestions]) => (
                    <AccordionItem value={`${template.id}-${category}`} key={category}>
                      <AccordionTrigger className="text-sm hover:no-underline py-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs font-normal">{category}</Badge>
                          <span className="text-muted-foreground">
                            {categoryQuestions.length} question{categoryQuestions.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2 pl-2">
                          {categoryQuestions.map((question, idx) => (
                            <div
                              key={question.id}
                              className="flex items-start gap-2 py-1.5 text-sm group"
                            >
                              <span className="text-muted-foreground w-5 text-right shrink-0">{idx + 1}.</span>
                              <Star className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                              <span className="flex-1">{question.questionText}</span>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 className="h-3 w-3 text-muted-foreground" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                  
                  {/* Text Questions */}
                  {textQuestions.length > 0 && (
                    <AccordionItem value={`${template.id}-text`}>
                      <AccordionTrigger className="text-sm hover:no-underline py-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs font-normal bg-blue-500/10">Written Feedback</Badge>
                          <span className="text-muted-foreground">
                            {textQuestions.length} question{textQuestions.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2 pl-2">
                          {textQuestions.map((question, idx) => (
                            <div
                              key={question.id}
                              className="flex items-start gap-2 py-1.5 text-sm group"
                            >
                              <span className="text-muted-foreground w-5 text-right shrink-0">{idx + 1}.</span>
                              <MessageSquare className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                              <span className="flex-1">{question.questionText}</span>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 className="h-3 w-3 text-muted-foreground" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )}
                </Accordion>

                <Button 
                  variant="outline" 
                  size="sm"
                  className="w-full mt-4" 
                  onClick={() => handleOpenAddQuestion(template.id)}
                  data-testid={`button-add-question-${template.id}`}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Question
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Create Template Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={handleCloseTemplateDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Template</DialogTitle>
            <DialogDescription>
              Create a reusable template for performance reviews.
            </DialogDescription>
          </DialogHeader>
          <Form {...templateForm}>
            <form onSubmit={templateForm.handleSubmit(handleCreateTemplate)} className="space-y-4">
              <FormField
                control={templateForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Template Name <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Engineering Performance Review"
                        {...field}
                        data-testid="input-template-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={templateForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Brief description of this template's purpose"
                        className="resize-none"
                        {...field}
                        data-testid="input-template-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => handleCloseTemplateDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" data-testid="button-confirm-create-template">
                  Create Template
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Add Question Dialog */}
      <Dialog open={isAddQuestionOpen} onOpenChange={handleCloseQuestionDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Question</DialogTitle>
            <DialogDescription>
              Add a new question to the template.
            </DialogDescription>
          </DialogHeader>
          <Form {...questionForm}>
            <form onSubmit={questionForm.handleSubmit(handleAddQuestion)} className="space-y-4">
              <FormField
                control={questionForm.control}
                name="questionType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Question Type <span className="text-destructive">*</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-question-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="rating">
                          <div className="flex items-center gap-2">
                            <Star className="h-4 w-4 text-amber-500" />
                            Rating (1-5 stars)
                          </div>
                        </SelectItem>
                        <SelectItem value="text">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4 text-blue-500" />
                            Text Response
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={questionForm.control}
                name="competencyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Competency Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-competency">
                          <SelectValue placeholder="Select competency (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None (General Question)</SelectItem>
                        {Object.entries(competencyCategories).map(([category, comps]) => (
                          comps.map((comp) => (
                            <SelectItem key={comp.id} value={comp.id}>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">{category}</Badge>
                                {comp.name}
                              </div>
                            </SelectItem>
                          ))
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={questionForm.control}
                name="questionText"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Question Text <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., How effectively does this person communicate with team members?"
                        className="resize-none"
                        {...field}
                        data-testid="input-question-text"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => handleCloseQuestionDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" data-testid="button-confirm-add-question">
                  Add Question
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
