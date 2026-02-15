import { useState, useEffect } from "react";
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
import { MapPin, Clock, Building2, CheckCircle2, ArrowLeft, ArrowRight, Upload, Inbox, FileText, Loader2 } from "lucide-react";

const step1Schema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  location: z.string().optional(),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),
});

const step2Schema = z.object({
  linkedinUrl: z.string().optional(),
  source: z.enum(["website", "referral", "linkedin", "job_board", "agency", "direct", "other"]).optional(),
  coverLetter: z.string().optional(),
});

const fullSchema = step1Schema.merge(step2Schema).extend({
  resumeFileName: z.string().optional(),
});

type ApplicationFormData = z.infer<typeof fullSchema>;

export default function JobApplication() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [job, setJob] = useState<JobPosting | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<ApplicationFormData>({
    resolver: zodResolver(fullSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      location: "",
      gender: undefined,
      linkedinUrl: "",
      source: "website",
      coverLetter: "",
      resumeFileName: "",
    },
    mode: "onTouched",
  });

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
    if (currentStep === 1) {
      const result = await form.trigger(["firstName", "lastName", "email", "phone", "location", "gender"]);
      return result;
    }
    if (currentStep === 2) {
      const result = await form.trigger(["linkedinUrl", "source", "coverLetter"]);
      return result;
    }
    return true;
  };

  const handleNext = async () => {
    const isValid = await validateStep(step);
    if (isValid) {
      setStep((s) => Math.min(s + 1, 3));
    }
  };

  const handleBack = () => {
    setStep((s) => Math.max(s - 1, 1));
  };

  const handleSubmit = async (data: ApplicationFormData) => {
    if (!job) return;
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
          source: data.source || "website",
          resumeFileName: data.resumeFileName || null,
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

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" data-testid="page-application-success">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="py-12 text-center">
            <div className="h-16 w-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-xl font-medium mb-2" data-testid="text-success-title">Application Submitted!</h3>
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

  const stepLabels = ["Personal Info", "Professional Info", "Resume & Review"];
  const progressValue = (step / 3) * 100;

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
              <CardTitle className="text-2xl" data-testid="text-job-title">{job.title}</CardTitle>
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
            {stepLabels.map((label, idx) => (
              <div
                key={label}
                className={`text-xs font-medium ${idx + 1 <= step ? "text-primary" : "text-muted-foreground"}`}
                data-testid={`text-step-label-${idx + 1}`}
              >
                {idx + 1}. {label}
              </div>
            ))}
          </div>
          <Progress value={progressValue} className="h-2" data-testid="progress-steps" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle data-testid="text-step-title">
              {step === 1 && "Personal Information"}
              {step === 2 && "Professional Information"}
              {step === 3 && "Resume & Review"}
            </CardTitle>
            <CardDescription>
              {step === 1 && "Tell us about yourself"}
              {step === 2 && "Share your professional details"}
              {step === 3 && "Upload your resume and review your application"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                {step === 1 && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  </>
                )}

                {step === 2 && (
                  <>
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
                      name="source"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>How did you hear about us?</FormLabel>
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

                    <FormField
                      control={form.control}
                      name="coverLetter"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cover Letter</FormLabel>
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
                  </>
                )}

                {step === 3 && (
                  <>
                    <div className="space-y-4">
                      <div>
                        <FormLabel>Resume / CV</FormLabel>
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

                      <div className="border-t pt-4 mt-4">
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
                          {form.getValues("phone") && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Phone</span>
                              <span className="font-medium">{form.getValues("phone")}</span>
                            </div>
                          )}
                          {form.getValues("location") && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Location</span>
                              <span className="font-medium">{form.getValues("location")}</span>
                            </div>
                          )}
                          {form.getValues("linkedinUrl") && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">LinkedIn</span>
                              <span className="font-medium truncate max-w-[200px]">{form.getValues("linkedinUrl")}</span>
                            </div>
                          )}
                          {uploadedFile && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Resume</span>
                              <span className="font-medium">{uploadedFile}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}

                <div className="flex items-center justify-between gap-4 pt-4 border-t">
                  {step > 1 ? (
                    <Button type="button" variant="outline" onClick={handleBack} data-testid="button-back-step">
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back
                    </Button>
                  ) : (
                    <div />
                  )}

                  {step < 3 ? (
                    <Button type="button" onClick={handleNext} data-testid="button-next-step">
                      Next
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  ) : (
                    <Button type="submit" disabled={isSubmitting} data-testid="button-submit-application">
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
