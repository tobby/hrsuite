import { useState } from "react";
import { useParams, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import type { Department } from "@shared/schema";
import { useRecruitmentStore } from "@/lib/recruitment-store";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Briefcase, MapPin, Clock, Building2, CheckCircle2, ArrowLeft, Upload, Inbox } from "lucide-react";

const applicationSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  location: z.string().optional(),
  linkedinUrl: z.string().optional(),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),
  resumeFileName: z.string().optional(),
  acceptedPrivacy: z.boolean().refine((val) => val === true, "You must accept the privacy disclaimer"),
});

type ApplicationFormData = z.infer<typeof applicationSchema>;

export default function JobApplication() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { getJobById, addCandidate, getSetting } = useRecruitmentStore();
  const { data: departments = [] } = useQuery<Department[]>({ queryKey: ['/api/departments'] });
  const [step, setStep] = useState<"disclaimer" | "form" | "success">("disclaimer");
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);

  const job = getJobById(id || "");
  const privacyDisclaimer = getSetting("privacy_disclaimer") || "By submitting this application, you agree to allow us to process your personal data for recruitment purposes.";

  const form = useForm<ApplicationFormData>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      location: "",
      linkedinUrl: "",
      gender: undefined,
      resumeFileName: "",
      acceptedPrivacy: false,
    },
  });

  const getDepartmentName = (deptId: string) => departments.find((d) => d.id === deptId)?.name || "Unknown";

  const getEmploymentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      "full-time": "Full-time",
      "contract": "Contract",
      "intern": "Intern",
    };
    return labels[type] || type;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file.name);
      form.setValue("resumeFileName", file.name);
    }
  };

  const handleSubmit = (data: ApplicationFormData) => {
    if (!job) return;

    addCandidate({
      companyId: "",
      jobId: job.id,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone || null,
      location: data.location || null,
      linkedinUrl: data.linkedinUrl || null,
      gender: data.gender || null,
      resumeFileName: data.resumeFileName || null,
      stage: "applied",
    });

    toast({
      title: "Application Submitted",
      description: "Your application has been received.",
    });

    setStep("success");
  };

  if (!job) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Inbox className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">Job not found</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">This job posting may have been removed or is no longer available.</p>
          <Link href="/careers">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              View All Jobs
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (step === "success") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="py-12 text-center">
            <div className="h-16 w-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-xl font-medium mb-2" data-testid="text-success-title">Application Submitted!</h3>
            <p className="text-muted-foreground mb-6">
              Thank you for applying for the <strong>{job.title}</strong> position. We've received your application and will review it shortly.
            </p>
            <Link href="/careers">
              <Button variant="outline" data-testid="button-back-to-careers">
                <ArrowLeft className="h-4 w-4 mr-2" />
                View More Jobs
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-2xl mx-auto px-4">
        <Link href="/careers">
          <Button variant="ghost" size="sm" className="mb-4" data-testid="button-back">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Jobs
          </Button>
        </Link>

        <Card className="mb-6">
          <CardHeader>
            <div className="space-y-2">
              <CardTitle className="text-2xl" data-testid="text-job-title">{job.title}</CardTitle>
              <CardDescription className="flex flex-wrap items-center gap-3 text-sm">
                <span className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {getDepartmentName(job.departmentId)}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {job.location}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {job.experienceYears}+ years
                </span>
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Badge variant="outline">{getEmploymentTypeLabel(job.employmentType)}</Badge>
          </CardContent>
        </Card>

        {step === "disclaimer" ? (
          <Card>
            <CardHeader>
              <CardTitle>Privacy Disclaimer</CardTitle>
              <CardDescription>Please read and accept before continuing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted rounded-md text-sm" data-testid="text-privacy-disclaimer">
                {privacyDisclaimer}
              </div>
              <Button onClick={() => setStep("form")} className="w-full" data-testid="button-accept-privacy">
                I Accept and Want to Continue
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Application Form</CardTitle>
              <CardDescription>Fill in your details to apply for this position</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="John" {...field} data-testid="input-first-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Doe" {...field} data-testid="input-last-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email *</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="john.doe@example.com" {...field} data-testid="input-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="+1 (555) 123-4567" {...field} data-testid="input-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input placeholder="City, State" {...field} data-testid="input-location" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="linkedinUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>LinkedIn Profile</FormLabel>
                        <FormControl>
                          <Input placeholder="https://linkedin.com/in/yourprofile" {...field} data-testid="input-linkedin" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gender</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-gender">
                              <SelectValue placeholder="Select gender (optional)" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                            <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="resumeFileName"
                    render={() => (
                      <FormItem>
                        <FormLabel>Resume/CV</FormLabel>
                        <FormControl>
                          <div className="flex items-center gap-2">
                            <Input
                              type="file"
                              accept=".pdf,.doc,.docx"
                              onChange={handleFileUpload}
                              className="hidden"
                              id="resume-upload"
                            />
                            <label
                              htmlFor="resume-upload"
                              className="flex items-center gap-2 px-4 py-2 border rounded-md cursor-pointer hover-elevate"
                            >
                              <Upload className="h-4 w-4" />
                              <span>{uploadedFile || "Choose file"}</span>
                            </label>
                            {uploadedFile && (
                              <span className="text-sm text-muted-foreground">{uploadedFile}</span>
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="acceptedPrivacy"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 py-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-privacy"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            I accept the privacy disclaimer and terms of use *
                          </FormLabel>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full" data-testid="button-submit-application">
                    Submit Application
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
