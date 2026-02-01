import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Redirect } from "wouter";
import { useRecruitmentStore } from "@/lib/recruitment-store";
import { useToast } from "@/hooks/use-toast";
import { useRole, canEditOrgSettings } from "@/lib/role-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, FileText, Shield, Mail } from "lucide-react";

const templateFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Body is required"),
  category: z.enum(["application_received", "interview_scheduled", "offer_extended", "rejection", "general"]),
});

type TemplateFormData = z.infer<typeof templateFormSchema>;

const CATEGORY_LABELS: Record<string, string> = {
  application_received: "Application Received",
  interview_scheduled: "Interview Scheduled",
  offer_extended: "Offer Extended",
  rejection: "Rejection",
  general: "General",
};

export default function RecruitmentSettings() {
  const { role } = useRole();
  const { toast } = useToast();

  if (!canEditOrgSettings(role)) {
    return <Redirect to="/" />;
  }

  const {
    emailTemplates,
    addEmailTemplate,
    updateEmailTemplate,
    deleteEmailTemplate,
    getSetting,
    updateSetting,
  } = useRecruitmentStore();

  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [privacyDisclaimer, setPrivacyDisclaimer] = useState(
    getSetting("privacy_disclaimer") || ""
  );
  const [termsOfUse, setTermsOfUse] = useState(getSetting("terms_of_use") || "");
  const [companyName, setCompanyName] = useState(getSetting("company_name") || "");

  const templateForm = useForm<TemplateFormData>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: "",
      subject: "",
      body: "",
      category: "general",
    },
  });

  const handleOpenTemplateDialog = (templateId?: string) => {
    if (templateId) {
      const template = emailTemplates.find((t) => t.id === templateId);
      if (template) {
        templateForm.reset({
          name: template.name,
          subject: template.subject,
          body: template.body,
          category: template.category as TemplateFormData["category"],
        });
        setEditingTemplate(templateId);
      }
    } else {
      templateForm.reset({
        name: "",
        subject: "",
        body: "",
        category: "general",
      });
      setEditingTemplate(null);
    }
    setIsTemplateDialogOpen(true);
  };

  const handleSubmitTemplate = (data: TemplateFormData) => {
    if (editingTemplate) {
      updateEmailTemplate(editingTemplate, data);
      toast({ title: "Template Updated" });
    } else {
      addEmailTemplate(data);
      toast({ title: "Template Created" });
    }
    setIsTemplateDialogOpen(false);
    templateForm.reset();
  };

  const handleDeleteTemplate = (templateId: string) => {
    deleteEmailTemplate(templateId);
    toast({ title: "Template Deleted" });
  };

  const handleSavePrivacy = () => {
    updateSetting("privacy_disclaimer", privacyDisclaimer);
    toast({ title: "Privacy Disclaimer Saved" });
  };

  const handleSaveTerms = () => {
    updateSetting("terms_of_use", termsOfUse);
    toast({ title: "Terms of Use Saved" });
  };

  const handleSaveCompanyName = () => {
    updateSetting("company_name", companyName);
    toast({ title: "Company Name Saved" });
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Recruitment Settings</h1>
        <p className="text-muted-foreground">Configure email templates and application settings</p>
      </div>

      <Tabs defaultValue="templates">
        <TabsList>
          <TabsTrigger value="templates" data-testid="tab-templates">
            <Mail className="h-4 w-4 mr-2" />
            Email Templates
          </TabsTrigger>
          <TabsTrigger value="legal" data-testid="tab-legal">
            <Shield className="h-4 w-4 mr-2" />
            Legal Notices
          </TabsTrigger>
          <TabsTrigger value="general" data-testid="tab-general">
            <FileText className="h-4 w-4 mr-2" />
            General
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Email Templates</CardTitle>
                <CardDescription>
                  Create and manage email templates for candidate communications
                </CardDescription>
              </div>
              <Button onClick={() => handleOpenTemplateDialog()} data-testid="button-create-template">
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {emailTemplates.map((template) => (
                    <TableRow key={template.id} data-testid={`row-template-${template.id}`}>
                      <TableCell className="font-medium">{template.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{CATEGORY_LABELS[template.category]}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground truncate max-w-[300px]">
                        {template.subject}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenTemplateDialog(template.id)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteTemplate(template.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Available Template Variables</h4>
                <div className="flex flex-wrap gap-2 text-sm">
                  <Badge variant="secondary">{"{{candidateName}}"}</Badge>
                  <Badge variant="secondary">{"{{jobTitle}}"}</Badge>
                  <Badge variant="secondary">{"{{interviewDate}}"}</Badge>
                  <Badge variant="secondary">{"{{companyName}}"}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="legal" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Privacy Disclaimer</CardTitle>
              <CardDescription>
                This text is shown to candidates before they submit their application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={privacyDisclaimer}
                onChange={(e) => setPrivacyDisclaimer(e.target.value)}
                className="min-h-[150px]"
                placeholder="Enter privacy disclaimer text..."
                data-testid="input-privacy-disclaimer"
              />
              <Button onClick={handleSavePrivacy} data-testid="button-save-privacy">
                Save Privacy Disclaimer
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Terms of Use</CardTitle>
              <CardDescription>
                Additional terms that candidates must agree to
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={termsOfUse}
                onChange={(e) => setTermsOfUse(e.target.value)}
                className="min-h-[150px]"
                placeholder="Enter terms of use text..."
                data-testid="input-terms-of-use"
              />
              <Button onClick={handleSaveTerms} data-testid="button-save-terms">
                Save Terms of Use
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="general" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                Configure general recruitment settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Company Name</Label>
                <Input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Your company name"
                  data-testid="input-company-name"
                />
                <p className="text-xs text-muted-foreground">
                  This is used in email templates and the careers page
                </p>
              </div>
              <Button onClick={handleSaveCompanyName} data-testid="button-save-company-name">
                Save Company Name
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Edit Template" : "Create Template"}</DialogTitle>
            <DialogDescription>
              {editingTemplate
                ? "Update the email template details."
                : "Create a new email template for candidate communications."}
            </DialogDescription>
          </DialogHeader>
          <Form {...templateForm}>
            <form onSubmit={templateForm.handleSubmit(handleSubmitTemplate)} className="space-y-4">
              <FormField
                control={templateForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Template Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Interview Invitation" {...field} data-testid="input-template-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={templateForm.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-template-category">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={templateForm.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject Line</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Interview Scheduled - {{jobTitle}}"
                        {...field}
                        data-testid="input-template-subject"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={templateForm.control}
                name="body"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Body</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Dear {{candidateName}},..."
                        className="min-h-[200px]"
                        {...field}
                        data-testid="input-template-body"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsTemplateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" data-testid="button-save-template">
                  {editingTemplate ? "Update Template" : "Create Template"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
