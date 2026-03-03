import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { JobPosting } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { MapPin, Clock, CheckCircle2, ArrowLeft, ArrowRight, Upload, Inbox, FileText, Loader2 } from "lucide-react";

type FieldVisibility = "hidden" | "optional" | "required";
type AppFieldsConfig = Record<string, FieldVisibility>;

const defaultAppFields: AppFieldsConfig = {
  phone: "optional",
  location: "optional",
  gender: "optional",
  linkedinUrl: "optional",
  website: "optional",
  source: "optional",
  coverLetter: "optional",
  resume: "optional",
  ndpaConsent: "optional",
};

function parseFieldsConfig(job: JobPosting): AppFieldsConfig {
  try {
    const parsed = job.applicationFields ? JSON.parse(job.applicationFields) : null;
    return parsed ? { ...defaultAppFields, ...parsed } : { ...defaultAppFields };
  } catch {
    return { ...defaultAppFields };
  }
}

function isVisible(config: AppFieldsConfig, field: string): boolean {
  return (config[field] || "optional") !== "hidden";
}

function isRequired(config: AppFieldsConfig, field: string): boolean {
  return (config[field] || "optional") === "required";
}

function buildSchema(config: AppFieldsConfig) {
  const step1: Record<string, z.ZodTypeAny> = {
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Invalid email address"),
  };

  if (isVisible(config, "phone")) {
    step1.phone = isRequired(config, "phone")
      ? z.string().min(1, "Phone is required")
      : z.string().optional();
  }
  if (isVisible(config, "location")) {
    step1.location = isRequired(config, "location")
      ? z.string().min(1, "Location is required")
      : z.string().optional();
  }
  if (isVisible(config, "gender")) {
    step1.gender = isRequired(config, "gender")
      ? z.enum(["male", "female", "other", "prefer_not_to_say"])
      : z.enum(["male", "female", "other", "prefer_not_to_say"]).optional();
  }
  if (isVisible(config, "ndpaConsent")) {
    step1.ndpaConsent = z.boolean().refine(val => val === true, { message: "You must consent to proceed" });
  }

  const step2: Record<string, z.ZodTypeAny> = {};
  if (isVisible(config, "linkedinUrl")) {
    step2.linkedinUrl = isRequired(config, "linkedinUrl")
      ? z.string().min(1, "LinkedIn profile is required")
      : z.string().optional();
  }
  if (isVisible(config, "source")) {
    step2.source = isRequired(config, "source")
      ? z.enum(["website", "referral", "linkedin", "job_board", "agency", "direct", "other"])
      : z.enum(["website", "referral", "linkedin", "job_board", "agency", "direct", "other"]).optional();
  }
  if (isVisible(config, "website")) {
    step2.website = isRequired(config, "website")
      ? z.string().min(1, "Website is required")
      : z.string().optional();
  }
  if (isVisible(config, "coverLetter")) {
    step2.coverLetter = isRequired(config, "coverLetter")
      ? z.string().min(1, "Cover letter is required")
      : z.string().optional();
  }

  const step3: Record<string, z.ZodTypeAny> = {};
  if (isVisible(config, "resume")) {
    step3.resumeFileName = isRequired(config, "resume")
      ? z.string().min(1, "Resume is required")
      : z.string().optional();
  }

  const fullSchema = z.object({ ...step1, ...step2, ...step3 });
  return fullSchema;
}

export default function JobApplication() {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<JobPosting | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchJob() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/job-postings/${id}`);
        if (res.ok) {
          const data = await res.json();
          setJob(data);
        }
      } catch {
      } finally {
        setIsLoading(false);
      }
    }
    if (id) fetchJob();
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="max-w-2xl mx-auto px-4">
          <Skeleton className="h-8 w-32 mb-4" />
          <Card className="mb-6">
            <CardHeader>
              <Skeleton className="h-7 w-3/4" />
              <Skeleton className="h-4 w-1/2 mt-2" />
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-1/3" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Inbox className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground" data-testid="text-not-found">Job not found</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">This job posting may have been removed or is no longer available.</p>
          <Link href="/careers">
            <Button variant="outline" className="mt-4" data-testid="button-back-to-careers">
              <ArrowLeft className="h-4 w-4 mr-2" />
              View All Jobs
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (job.status !== "active") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Inbox className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground" data-testid="text-position-closed">Position closed</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">This position is no longer accepting applications.</p>
          <Link href="/careers">
            <Button variant="outline" className="mt-4" data-testid="button-back-to-careers">
              <ArrowLeft className="h-4 w-4 mr-2" />
              View Open Positions
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return <JobApplicationForm job={job} />;
}

function JobApplicationForm({ job }: { job: JobPosting }) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const fieldsConfig = useMemo(() => parseFieldsConfig(job), [job]);
  const schema = useMemo(() => buildSchema(fieldsConfig), [fieldsConfig]);

  const hasStep2Fields = isVisible(fieldsConfig, "linkedinUrl") || isVisible(fieldsConfig, "website") || isVisible(fieldsConfig, "source") || isVisible(fieldsConfig, "coverLetter");
  const hasStep3Fields = isVisible(fieldsConfig, "resume");

  const activeSteps = useMemo(() => {
    const steps: { key: number; label: string; title: string; description: string }[] = [
      { key: 1, label: "Personal Info", title: "Personal Information", description: "Tell us about yourself" },
    ];
    if (hasStep2Fields) {
      steps.push({ key: 2, label: "Professional Info", title: "Professional Information", description: "Share your professional details" });
    }
    steps.push({ key: 3, label: hasStep3Fields ? "Resume & Review" : "Review", title: hasStep3Fields ? "Resume & Review" : "Review Your Application", description: hasStep3Fields ? "Upload your resume and review your application" : "Review your application before submitting" });
    return steps;
  }, [hasStep2Fields, hasStep3Fields]);

  const totalSteps = activeSteps.length;
  const currentStepConfig = activeSteps[step - 1];
  const isLastStep = step === totalSteps;

  const form = useForm<any>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      location: "",
      gender: undefined,
      linkedinUrl: "",
      website: "",
      source: undefined,
      coverLetter: "",
      resumeFileName: "",
      ndpaConsent: false,
    },
    mode: "onTouched",
  });

  const getEmploymentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      "full-time": "Full-time",
      "part-time": "Part-time",
      "contract": "Contract",
      "internship": "Internship",
    };
    return labels[type] || type;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload/resume", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setUploadedFile(data.fileName);
        form.setValue("resumeFileName", data.fileName);
        toast({ title: "Resume uploaded", description: `${data.fileName} uploaded successfully.` });
      } else {
        toast({ title: "Upload failed", description: "Could not upload your resume. Please try again.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Upload failed", description: "Could not upload your resume. Please try again.", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const validateStep = async (currentStep: number): Promise<boolean> => {
    const stepConfig = activeSteps[currentStep - 1];
    if (!stepConfig) return true;

    if (stepConfig.key === 1) {
      const fields: any[] = ["firstName", "lastName", "email"];
      if (isVisible(fieldsConfig, "phone")) fields.push("phone");
      if (isVisible(fieldsConfig, "location")) fields.push("location");
      if (isVisible(fieldsConfig, "gender")) fields.push("gender");
      if (isVisible(fieldsConfig, "ndpaConsent")) fields.push("ndpaConsent");
      return form.trigger(fields);
    }
    if (stepConfig.key === 2) {
      const fields: any[] = [];
      if (isVisible(fieldsConfig, "linkedinUrl")) fields.push("linkedinUrl");
      if (isVisible(fieldsConfig, "website")) fields.push("website");
      if (isVisible(fieldsConfig, "source")) fields.push("source");
      if (isVisible(fieldsConfig, "coverLetter")) fields.push("coverLetter");
      return fields.length > 0 ? form.trigger(fields) : true;
    }
    return true;
  };

  const handleNext = async () => {
    const isValid = await validateStep(step);
    if (isValid) {
      setStep((s) => Math.min(s + 1, totalSteps));
    }
  };

  const handleBack = () => {
    setStep((s) => Math.max(s - 1, 1));
  };

  const handleSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/candidates/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: job.id,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone || null,
          location: data.location || null,
          linkedinUrl: data.linkedinUrl || null,
          gender: data.gender || null,
          coverLetter: data.coverLetter || null,
          website: data.website || null,
          source: data.source || "website",
          resumeFileName: data.resumeFileName || null,
          ndpaConsent: data.ndpaConsent || false,
        }),
      });

      if (res.ok) {
        setSubmitted(true);
        toast({ title: "Application Submitted", description: "Your application has been received." });
      } else {
        const err = await res.json().catch(() => ({ message: "Something went wrong" }));
        toast({ title: "Submission Failed", description: err.message || "Could not submit your application.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Submission Failed", description: "Could not submit your application. Please try again.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" data-testid="page-application-success">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="py-12 text-center">
            <div className="h-16 w-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-medium mb-2" data-testid="text-success-title">Application Submitted!</h3>
            <p className="text-muted-foreground mb-6">
              Thank you for applying for the <strong>{job.title}</strong> position. We've received your application and will review it shortly.
            </p>
            <div className="flex flex-col gap-2">
              <Link href="/careers">
                <Button variant="outline" className="w-full" data-testid="button-back-to-careers">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  View More Jobs
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const progressValue = (step / totalSteps) * 100;

  const renderStep1 = () => (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="firstName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>First Name <span className="text-red-500">*</span></FormLabel>
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
              <FormLabel>Last Name <span className="text-red-500">*</span></FormLabel>
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
            <FormLabel>Email <span className="text-red-500">*</span></FormLabel>
            <FormControl>
              <Input type="email" placeholder="john.doe@example.com" {...field} data-testid="input-email" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {isVisible(fieldsConfig, "phone") && (
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone{isRequired(fieldsConfig, "phone") && <span className="text-red-500 ml-1">*</span>}</FormLabel>
              <FormControl>
                <Input placeholder="+1 (555) 123-4567" {...field} data-testid="input-phone" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {isVisible(fieldsConfig, "location") && (
        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location{isRequired(fieldsConfig, "location") && <span className="text-red-500 ml-1">*</span>}</FormLabel>
              <FormControl>
                <Input placeholder="City, State" {...field} data-testid="input-location" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {isVisible(fieldsConfig, "gender") && (
        <FormField
          control={form.control}
          name="gender"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Gender{isRequired(fieldsConfig, "gender") && <span className="text-red-500 ml-1">*</span>}</FormLabel>
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
      )}

      {isVisible(fieldsConfig, "ndpaConsent") && (
        <FormField
          control={form.control}
          name="ndpaConsent"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  data-testid="checkbox-ndpa-consent"
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className="text-sm font-normal">
                  I consent to the processing of my personal data in accordance with the Nigeria Data Protection Act (NDPA) <span className="text-red-500">*</span>
                </FormLabel>
                <FormMessage />
              </div>
            </FormItem>
          )}
        />
      )}
    </>
  );

  const renderStep2 = () => (
    <>
      {isVisible(fieldsConfig, "linkedinUrl") && (
        <FormField
          control={form.control}
          name="linkedinUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>LinkedIn Profile{isRequired(fieldsConfig, "linkedinUrl") && <span className="text-red-500 ml-1">*</span>}</FormLabel>
              <FormControl>
                <Input placeholder="https://linkedin.com/in/yourprofile" {...field} data-testid="input-linkedin" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {isVisible(fieldsConfig, "website") && (
        <FormField
          control={form.control}
          name="website"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Website{isRequired(fieldsConfig, "website") && <span className="text-red-500 ml-1">*</span>}</FormLabel>
              <FormControl>
                <Input placeholder="https://yourwebsite.com" {...field} data-testid="input-website" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {isVisible(fieldsConfig, "source") && (
        <FormField
          control={form.control}
          name="source"
          render={({ field }) => (
            <FormItem>
              <FormLabel>How did you hear about us?{isRequired(fieldsConfig, "source") && <span className="text-red-500 ml-1">*</span>}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-source">
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="website">Company Website</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="job_board">Job Board</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                  <SelectItem value="agency">Agency</SelectItem>
                  <SelectItem value="direct">Direct</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {isVisible(fieldsConfig, "coverLetter") && (
        <FormField
          control={form.control}
          name="coverLetter"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cover Letter{isRequired(fieldsConfig, "coverLetter") && <span className="text-red-500 ml-1">*</span>}</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Tell us why you're interested in this role and what makes you a great fit..."
                  className="min-h-[150px]"
                  {...field}
                  data-testid="textarea-cover-letter"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </>
  );

  const renderReviewStep = () => (
    <>
      {isVisible(fieldsConfig, "resume") && (
        <div>
          <FormLabel>Resume / CV{isRequired(fieldsConfig, "resume") && <span className="text-red-500 ml-1">*</span>}</FormLabel>
          <div className="mt-2">
            <Input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleFileUpload}
              className="hidden"
              id="resume-upload"
              data-testid="input-resume-file"
            />
            <label
              htmlFor="resume-upload"
              className="flex items-center justify-center gap-2 px-4 py-8 border-2 border-dashed rounded-md cursor-pointer hover-elevate text-muted-foreground"
            >
              {isUploading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Upload className="h-5 w-5" />
              )}
              <span>{isUploading ? "Uploading..." : "Click to upload your resume"}</span>
            </label>
            <p className="text-xs text-muted-foreground mt-1">Accepted formats: PDF, DOC, DOCX</p>
          </div>
          {uploadedFile && (
            <div className="flex items-center gap-2 mt-3 p-3 bg-muted rounded-md">
              <FileText className="h-4 w-4 text-primary shrink-0" />
              <span className="text-sm font-medium truncate" data-testid="text-uploaded-file">{uploadedFile}</span>
            </div>
          )}
        </div>
      )}

      <div className={`${isVisible(fieldsConfig, "resume") ? "border-t pt-4 mt-4" : ""}`}>
        <h3 className="text-sm font-semibold mb-3">Review Your Application</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Name</span>
            <span className="font-medium" data-testid="text-review-name">{form.getValues("firstName")} {form.getValues("lastName")}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium" data-testid="text-review-email">{form.getValues("email")}</span>
          </div>
          {isVisible(fieldsConfig, "phone") && form.getValues("phone") && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Phone</span>
              <span className="font-medium">{form.getValues("phone")}</span>
            </div>
          )}
          {isVisible(fieldsConfig, "location") && form.getValues("location") && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Location</span>
              <span className="font-medium">{form.getValues("location")}</span>
            </div>
          )}
          {isVisible(fieldsConfig, "linkedinUrl") && form.getValues("linkedinUrl") && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">LinkedIn</span>
              <span className="font-medium truncate max-w-[200px]">{form.getValues("linkedinUrl")}</span>
            </div>
          )}
          {isVisible(fieldsConfig, "website") && form.getValues("website") && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Website</span>
              <span className="font-medium truncate max-w-[200px]">{form.getValues("website")}</span>
            </div>
          )}
          {isVisible(fieldsConfig, "ndpaConsent") && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">NDPA Consent</span>
              <span className="font-medium">{form.getValues("ndpaConsent") ? "Yes" : "No"}</span>
            </div>
          )}
          {isVisible(fieldsConfig, "resume") && uploadedFile && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Resume</span>
              <span className="font-medium">{uploadedFile}</span>
            </div>
          )}
        </div>
      </div>
    </>
  );

  const renderCurrentStep = () => {
    if (!currentStepConfig) return null;
    if (currentStepConfig.key === 1) return renderStep1();
    if (currentStepConfig.key === 2) return renderStep2();
    if (currentStepConfig.key === 3) return renderReviewStep();
    return null;
  };

  return (
    <div className="min-h-screen bg-background py-8" data-testid="page-job-application">
      <div className="max-w-2xl mx-auto px-4">
        <Link href={`/jobs/${job.id}`}>
          <Button variant="ghost" size="sm" className="mb-4" data-testid="button-back">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Job Details
          </Button>
        </Link>

        <Card className="mb-6">
          <CardHeader>
            <div className="space-y-2">
              <CardTitle className="text-lg" data-testid="text-job-title">{job.title}</CardTitle>
              <CardDescription className="flex flex-wrap items-center gap-3 text-sm">
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

        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            {activeSteps.map((s, idx) => (
              <div
                key={s.key}
                className={`text-xs font-medium ${idx + 1 <= step ? "text-primary" : "text-muted-foreground"}`}
                data-testid={`text-step-label-${idx + 1}`}
              >
                {idx + 1}. {s.label}
              </div>
            ))}
          </div>
          <Progress value={progressValue} className="h-2" data-testid="progress-steps" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle data-testid="text-step-title">
              {currentStepConfig?.title}
            </CardTitle>
            <CardDescription>
              {currentStepConfig?.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
                {renderCurrentStep()}

                <div className="flex items-center justify-between gap-4 pt-4 border-t">
                  {step > 1 ? (
                    <Button type="button" variant="outline" onClick={handleBack} data-testid="button-back-step">
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back
                    </Button>
                  ) : (
                    <div />
                  )}

                  {!isLastStep ? (
                    <Button type="button" onClick={handleNext} data-testid="button-next-step">
                      Next
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  ) : (
                    <Button type="button" disabled={isSubmitting} onClick={form.handleSubmit(handleSubmit)} data-testid="button-submit-application">
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        "Submit Application"
                      )}
                    </Button>
                  )}
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
