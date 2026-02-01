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
  GripVertical,
} from "lucide-react";
import { useRole, canEditOrgSettings } from "@/lib/role-context";
import { useLocation, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import {
  appraisalTemplates,
  templateQuestions,
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
  const [, navigate] = useLocation();
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
      competencyId: "",
    },
  });

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <p className="text-muted-foreground">Access restricted to administrators only</p>
        <Link href="/appraisals">
          <Button variant="ghost" className="mt-4">Back to Appraisals</Button>
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
    toast({
      title: "Question Added",
      description: "The question has been added to the template.",
    });
    questionForm.reset();
    setIsAddQuestionOpen(false);
  };

  const handleCloseTemplateDialog = (open: boolean) => {
    if (!open) templateForm.reset();
    setIsCreateOpen(open);
  };

  const handleCloseQuestionDialog = (open: boolean) => {
    if (!open) questionForm.reset();
    setIsAddQuestionOpen(open);
  };

  const handleOpenAddQuestion = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setIsAddQuestionOpen(true);
  };

  // Group competencies by category
  const competencyCategories = competencies.reduce<Record<string, typeof competencies>>((acc, comp) => {
    if (!acc[comp.category]) acc[comp.category] = [];
    acc[comp.category].push(comp);
    return acc;
  }, {});

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight" data-testid="text-templates-title">
              Appraisal Templates
            </h1>
          </div>
          <p className="text-muted-foreground">
            Create and manage reusable performance review templates
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create-template">
          <Plus className="mr-2 h-4 w-4" />
          Create Template
        </Button>
      </div>

      {/* Templates Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {appraisalTemplates.map((template) => {
          const questions = getQuestionsByTemplate(template.id);
          const ratingCount = questions.filter(q => q.questionType === "rating").length;
          const textCount = questions.filter(q => q.questionType === "text").length;
          
          return (
            <Card key={template.id} data-testid={`template-card-${template.id}`}>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    {template.isDefault === 1 && (
                      <Badge variant="secondary">Default</Badge>
                    )}
                  </div>
                  <CardDescription>{template.description}</CardDescription>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" data-testid={`button-edit-template-${template.id}`}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="text-destructive" 
                    data-testid={`button-delete-template-${template.id}`}
                    disabled={template.isDefault === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Star className="h-4 w-4" />
                    <span>{ratingCount} rating questions</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <MessageSquare className="h-4 w-4" />
                    <span>{textCount} text questions</span>
                  </div>
                </div>

                {/* Questions List */}
                <div className="space-y-2">
                  {questions.slice(0, 4).map((question) => {
                    const competency = question.competencyId ? getCompetencyById(question.competencyId) : null;
                    
                    return (
                      <div
                        key={question.id}
                        className="flex items-center gap-2 p-2 rounded border text-sm"
                      >
                        <GripVertical className="h-4 w-4 text-muted-foreground/50" />
                        {question.questionType === "rating" ? (
                          <Star className="h-4 w-4 text-amber-500" />
                        ) : (
                          <MessageSquare className="h-4 w-4 text-blue-500" />
                        )}
                        <span className="flex-1 truncate">{question.questionText}</span>
                        {competency && (
                          <Badge variant="outline" className="text-xs">{competency.category}</Badge>
                        )}
                      </div>
                    );
                  })}
                  {questions.length > 4 && (
                    <p className="text-xs text-muted-foreground text-center py-1">
                      +{questions.length - 4} more questions
                    </p>
                  )}
                </div>

                <Button 
                  variant="outline" 
                  className="w-full" 
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-competency">
                          <SelectValue placeholder="Select competency (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
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
