import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Redirect } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import type { JobPosting, Candidate, Department, Employee } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useRole, canEditOrgSettings } from "@/lib/role-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination, usePagination } from "@/components/ui/table-pagination";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Briefcase, Plus, LayoutGrid, List, MapPin, Clock, Users, Copy, MoreHorizontal, Pencil, Trash2, ExternalLink, Inbox, Loader2, DollarSign, Calendar, Building2, X, Archive } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const jobFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  requirements: z.string().optional(),
  responsibilities: z.string().optional(),
  hiringProcess: z.string().optional(),
  departmentId: z.string().min(1, "Department is required"),
  assignedManagerId: z.string().optional(),
  location: z.string().min(1, "Location is required"),
  locationType: z.enum(["on-site", "remote", "hybrid"]),
  employmentType: z.enum(["full-time", "part-time", "contract", "internship"]),
  experienceYears: z.coerce.number().min(0),
  salaryMin: z.coerce.number().min(0).optional(),
  salaryMax: z.coerce.number().min(0).optional(),
  numberOfOpenings: z.coerce.number().min(1),
  applicationDeadline: z.string().optional(),
  status: z.enum(["draft", "active", "on-hold", "closed", "archived"]),
});

type JobFormData = z.infer<typeof jobFormSchema>;

export default function RecruitmentJobs() {
  const { role, currentUser } = useRole();
  const { toast } = useToast();
  const isAdmin = canEditOrgSettings(role);

  const { data: jobs = [], isLoading: jobsLoading } = useQuery<JobPosting[]>({ queryKey: ['/api/job-postings'] });
  const { data: departments = [] } = useQuery<Department[]>({ queryKey: ['/api/departments'] });
  const { data: candidates = [] } = useQuery<Candidate[]>({ queryKey: ['/api/candidates'] });
  const { data: employees = [] } = useQuery<Employee[]>({ queryKey: ['/api/employees'] });

  if (role !== "admin" && role !== "manager") {
    return <Redirect to="/" />;
  }

  const managers = employees.filter((e) => e.role === "manager" || e.role === "admin");

  const candidateCountByJob = candidates.reduce<Record<string, number>>((acc, c) => {
    acc[c.jobId] = (acc[c.jobId] || 0) + 1;
    return acc;
  }, {});

  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const [showArchived, setShowArchived] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<string | null>(null);
  const [requirementItems, setRequirementItems] = useState<string[]>([]);
  const [responsibilityItems, setResponsibilityItems] = useState<string[]>([]);
  const [hiringProcessItems, setHiringProcessItems] = useState<string[]>([]);
  const [newRequirement, setNewRequirement] = useState("");
  const [newResponsibility, setNewResponsibility] = useState("");
  const [newHiringProcess, setNewHiringProcess] = useState("");

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

  const appFieldLabels: Record<string, string> = {
    phone: "Phone Number",
    location: "Location",
    gender: "Gender",
    linkedinUrl: "LinkedIn Profile",
    website: "Website",
    source: "How Did You Hear About Us",
    coverLetter: "Cover Letter",
    resume: "Resume / CV",
    ndpaConsent: "NDPA Consent",
  };

  const [applicationFieldsConfig, setApplicationFieldsConfig] = useState<AppFieldsConfig>({ ...defaultAppFields });

  const filteredJobs = showArchived ? jobs : jobs.filter(j => j.status !== "archived");
  const { currentPage, totalPages, paginatedItems: paginatedJobs, setCurrentPage, totalItems, pageSize } = usePagination(filteredJobs, 10);

  const form = useForm<JobFormData>({
    resolver: zodResolver(jobFormSchema),
    defaultValues: {
      title: "",
      description: "",
      requirements: "",
      responsibilities: "",
      hiringProcess: "",
      departmentId: "",
      assignedManagerId: "",
      location: "",
      locationType: "on-site",
      employmentType: "full-time",
      experienceYears: 0,
      salaryMin: undefined,
      salaryMax: undefined,
      numberOfOpenings: 1,
      applicationDeadline: "",
      status: "draft",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/job-postings", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/job-postings'] });
      toast({ title: "Job Created", description: "The job posting has been created." });
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PATCH", `/api/job-postings/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/job-postings'] });
      toast({ title: "Job Updated", description: "The job posting has been updated." });
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/job-postings/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/job-postings'] });
      toast({ title: "Job Deleted", description: "The job posting has been deleted." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/job-postings/${id}/archive`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/job-postings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/candidates'] });
      toast({ title: "Job Archived", description: "The job posting and all its candidates have been archived." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleArchive = (jobId: string) => {
    archiveMutation.mutate(jobId);
  };

  const getDepartmentName = (id: string) => departments.find((d) => d.id === id)?.name || "Unknown";

  const getEmploymentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      "full-time": "Full-time",
      "part-time": "Part-time",
      "contract": "Contract",
      "internship": "Internship",
    };
    return labels[type] || type;
  };

  const getLocationTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      "on-site": "On-site",
      "remote": "Remote",
      "hybrid": "Hybrid",
    };
    return labels[type] || type;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
      draft: "outline",
      active: "default",
      "on-hold": "secondary",
      closed: "secondary",
      archived: "outline",
    };
    const labels: Record<string, string> = {
      draft: "Draft",
      active: "Active",
      "on-hold": "On Hold",
      closed: "Closed",
      archived: "Archived",
    };
    return <Badge variant={variants[status] || "outline"} className={status === "archived" ? "text-muted-foreground" : ""} data-testid={`badge-status-${status}`}>{labels[status] || status}</Badge>;
  };

  const handleOpenDialog = (jobId?: string) => {
    if (jobId) {
      const job = jobs.find((j) => j.id === jobId);
      if (job) {
        form.reset({
          title: job.title,
          description: job.description,
          requirements: job.requirements || "",
          responsibilities: job.responsibilities || "",
          hiringProcess: job.hiringProcess || "",
          departmentId: job.departmentId,
          assignedManagerId: job.assignedManagerId || "",
          location: job.location,
          locationType: (job.locationType as "on-site" | "remote" | "hybrid") || "on-site",
          employmentType: job.employmentType as "full-time" | "part-time" | "contract" | "internship",
          experienceYears: job.experienceYears,
          salaryMin: job.salaryMin ?? undefined,
          salaryMax: job.salaryMax ?? undefined,
          numberOfOpenings: job.numberOfOpenings ?? 1,
          applicationDeadline: job.applicationDeadline || "",
          status: (job.status as "draft" | "active" | "on-hold" | "closed") || "draft",
        });
        setRequirementItems((job.requirements || "").split("\n").filter(s => s.trim()).map(s => s.replace(/^[-•*]\s*/, "").trim()));
        setResponsibilityItems((job.responsibilities || "").split("\n").filter(s => s.trim()).map(s => s.replace(/^[-•*]\s*/, "").trim()));
        setHiringProcessItems((job.hiringProcess || "").split("\n").filter(s => s.trim()).map(s => s.replace(/^[-•*]\s*/, "").trim()));
        try {
          const parsed = job.applicationFields ? JSON.parse(job.applicationFields) : null;
          setApplicationFieldsConfig(parsed ? { ...defaultAppFields, ...parsed } : { ...defaultAppFields });
        } catch {
          setApplicationFieldsConfig({ ...defaultAppFields });
        }
        setEditingJob(jobId);
      }
    } else {
      form.reset({
        title: "",
        description: "",
        requirements: "",
        responsibilities: "",
        hiringProcess: "",
        departmentId: "",
        assignedManagerId: "",
        location: "",
        locationType: "on-site",
        employmentType: "full-time",
        experienceYears: 0,
        salaryMin: undefined,
        salaryMax: undefined,
        numberOfOpenings: 1,
        applicationDeadline: "",
        status: "draft",
      });
      setRequirementItems([]);
      setResponsibilityItems([]);
      setHiringProcessItems([]);
      setApplicationFieldsConfig({ ...defaultAppFields });
      setEditingJob(null);
    }
    setNewRequirement("");
    setNewResponsibility("");
    setNewHiringProcess("");
    setIsDialogOpen(true);
  };

  const handleSubmit = (data: JobFormData) => {
    const finalRequirements = [...requirementItems];
    if (newRequirement.trim()) finalRequirements.push(newRequirement.trim());
    const finalResponsibilities = [...responsibilityItems];
    if (newResponsibility.trim()) finalResponsibilities.push(newResponsibility.trim());
    const finalHiringProcess = [...hiringProcessItems];
    if (newHiringProcess.trim()) finalHiringProcess.push(newHiringProcess.trim());
    const payload = {
      ...data,
      companyId: currentUser.companyId,
      requirements: finalRequirements.length > 0 ? finalRequirements.join("\n") : null,
      responsibilities: finalResponsibilities.length > 0 ? finalResponsibilities.join("\n") : null,
      hiringProcess: finalHiringProcess.length > 0 ? finalHiringProcess.join("\n") : null,
      applicationFields: JSON.stringify(applicationFieldsConfig),
      assignedManagerId: data.assignedManagerId || null,
      salaryMin: data.salaryMin || null,
      salaryMax: data.salaryMax || null,
      applicationDeadline: data.applicationDeadline || null,
    };
    if (editingJob) {
      updateMutation.mutate({ id: editingJob, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (jobId: string) => {
    deleteMutation.mutate(jobId);
  };

  const copyShareableLink = (jobId: string) => {
    const url = `${window.location.origin}/jobs/${jobId}/apply`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link Copied", description: "Application link copied to clipboard." });
  };

  const openJobPreview = (jobId: string) => {
    window.open(`/careers?job=${jobId}`, "_blank");
  };

  const formatSalary = (min?: number | null, max?: number | null) => {
    if (!min && !max) return null;
    if (min && max) return `$${min.toLocaleString()} - $${max.toLocaleString()}`;
    if (min) return `From $${min.toLocaleString()}`;
    return `Up to $${max!.toLocaleString()}`;
  };

  if (jobsLoading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="loading-spinner">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isMutating = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold tracking-tight" data-testid="text-page-title">Job Postings</h1>
          <p className="text-muted-foreground">Manage your open positions and job listings</p>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && jobs.some(j => j.status === "archived") && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="show-archived"
                checked={showArchived}
                onCheckedChange={(checked) => setShowArchived(!!checked)}
                data-testid="checkbox-show-archived"
              />
              <Label htmlFor="show-archived" className="text-sm text-muted-foreground cursor-pointer">
                Show archived
              </Label>
            </div>
          )}
          <div className="flex items-center border rounded-md">
            <Button
              variant={viewMode === "card" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("card")}
              data-testid="button-view-card"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "table" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("table")}
              data-testid="button-view-table"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          {isAdmin && (
            <Button onClick={() => handleOpenDialog()} data-testid="button-create-job">
              <Plus className="h-4 w-4 mr-2" />
              Create Job
            </Button>
          )}
        </div>
      </div>

      {filteredJobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Inbox className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">
            {!showArchived && jobs.some(j => j.status === "archived") ? "All jobs are archived" : "No job postings yet"}
          </h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">
            {!showArchived && jobs.some(j => j.status === "archived")
              ? "Enable \"Show archived\" to see archived job postings."
              : isAdmin ? "Create your first job posting to start attracting candidates." : "No job postings available for your department."}
          </p>
        </div>
      ) : viewMode === "card" ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {paginatedJobs.map((job) => {
            const candidateCount = candidateCountByJob[job.id] || 0;
            const salary = formatSalary(job.salaryMin, job.salaryMax);
            return (
              <Card key={job.id} className={`hover-elevate ${job.status === "archived" ? "opacity-60" : ""}`} data-testid={`card-job-${job.id}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{job.title}</CardTitle>
                      <CardDescription>{getDepartmentName(job.departmentId)}</CardDescription>
                    </div>
                    {isAdmin && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid={`button-job-menu-${job.id}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenDialog(job.id)} data-testid={`button-edit-job-${job.id}`}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => copyShareableLink(job.id)} data-testid={`button-copy-link-${job.id}`}>
                            <Copy className="h-4 w-4 mr-2" />
                            Copy Link
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openJobPreview(job.id)} data-testid={`button-preview-job-${job.id}`}>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Preview
                          </DropdownMenuItem>
                          {job.status !== "archived" && (
                            <DropdownMenuItem onClick={() => handleArchive(job.id)} data-testid={`button-archive-job-${job.id}`}>
                              <Archive className="h-4 w-4 mr-2" />
                              Archive
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleDelete(job.id)} className="text-destructive" data-testid={`button-delete-job-${job.id}`}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {getStatusBadge(job.status)}
                    <Badge variant="outline">{getEmploymentTypeLabel(job.employmentType)}</Badge>
                    <Badge variant="outline">{getLocationTypeLabel(job.locationType)}</Badge>
                  </div>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span>{job.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3 shrink-0" />
                      <span>{job.experienceYears}+ years experience</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-3 w-3 shrink-0" />
                      <span>{candidateCount} applicant{candidateCount !== 1 ? "s" : ""} / {job.numberOfOpenings} opening{job.numberOfOpenings !== 1 ? "s" : ""}</span>
                    </div>
                    {salary && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-3 w-3 shrink-0" />
                        <span>{salary}</span>
                      </div>
                    )}
                    {job.applicationDeadline && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3 shrink-0" />
                        <span>Deadline: {format(new Date(job.applicationDeadline), "MMM d, yyyy")}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Experience</TableHead>
                <TableHead>Openings</TableHead>
                <TableHead>Applicants</TableHead>
                <TableHead>Salary</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead>Status</TableHead>
                {isAdmin && <TableHead className="w-[80px]">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedJobs.map((job) => {
                const candidateCount = candidateCountByJob[job.id] || 0;
                const salary = formatSalary(job.salaryMin, job.salaryMax);
                return (
                  <TableRow key={job.id} data-testid={`row-job-${job.id}`}>
                    <TableCell className="font-medium">{job.title}</TableCell>
                    <TableCell>{getDepartmentName(job.departmentId)}</TableCell>
                    <TableCell>{job.location}</TableCell>
                    <TableCell>{getEmploymentTypeLabel(job.employmentType)}</TableCell>
                    <TableCell>{job.experienceYears}+ years</TableCell>
                    <TableCell>{job.numberOfOpenings}</TableCell>
                    <TableCell>{candidateCount}</TableCell>
                    <TableCell>{salary || "—"}</TableCell>
                    <TableCell>{job.applicationDeadline ? format(new Date(job.applicationDeadline), "MMM d, yyyy") : "—"}</TableCell>
                    <TableCell>{getStatusBadge(job.status)}</TableCell>
                    {isAdmin && (
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`button-table-job-menu-${job.id}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenDialog(job.id)} data-testid={`button-table-edit-job-${job.id}`}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => copyShareableLink(job.id)} data-testid={`button-table-copy-link-${job.id}`}>
                              <Copy className="h-4 w-4 mr-2" />
                              Copy Link
                            </DropdownMenuItem>
                            {job.status !== "archived" && (
                              <DropdownMenuItem onClick={() => handleArchive(job.id)} data-testid={`button-table-archive-job-${job.id}`}>
                                <Archive className="h-4 w-4 mr-2" />
                                Archive
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleDelete(job.id)} className="text-destructive" data-testid={`button-table-delete-job-${job.id}`}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={totalItems}
            pageSize={pageSize}
          />
        </Card>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingJob ? "Edit Job" : "Create Job"}</DialogTitle>
            <DialogDescription>
              {editingJob ? "Update the job posting details." : "Create a new job posting for your organization."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Senior Software Engineer" {...field} data-testid="input-job-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="departmentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-department">
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {departments.map((dept) => (
                            <SelectItem key={dept.id} value={dept.id}>
                              {dept.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="assignedManagerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assigned Manager</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-assigned-manager">
                            <SelectValue placeholder="Select manager (optional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {managers.map((mgr) => (
                            <SelectItem key={mgr.id} value={mgr.id}>
                              {mgr.firstName} {mgr.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., San Francisco, CA" {...field} data-testid="input-location" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="locationType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-location-type">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="on-site">On-site</SelectItem>
                          <SelectItem value="remote">Remote</SelectItem>
                          <SelectItem value="hybrid">Hybrid</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="employmentType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Employment Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-employment-type">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="full-time">Full-time</SelectItem>
                          <SelectItem value="part-time">Part-time</SelectItem>
                          <SelectItem value="contract">Contract</SelectItem>
                          <SelectItem value="internship">Internship</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="experienceYears"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Experience (years)</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} {...field} data-testid="input-experience" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-status">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="on-hold">On Hold</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="salaryMin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Min Salary</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} placeholder="e.g., 50000" {...field} value={field.value ?? ""} data-testid="input-salary-min" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="salaryMax"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Salary</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} placeholder="e.g., 100000" {...field} value={field.value ?? ""} data-testid="input-salary-max" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="numberOfOpenings"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Openings</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} {...field} data-testid="input-number-of-openings" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="applicationDeadline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Application Deadline</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value ?? ""} data-testid="input-application-deadline" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the role..."
                        className="min-h-[100px]"
                        {...field}
                        data-testid="input-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <FormLabel>Skills & Competencies</FormLabel>
                <div className="flex gap-2">
                  <Input
                    value={newRequirement}
                    onChange={(e) => setNewRequirement(e.target.value)}
                    placeholder="Add a skill or competency..."
                    data-testid="input-new-requirement"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (newRequirement.trim()) {
                          setRequirementItems([...requirementItems, newRequirement.trim()]);
                          setNewRequirement("");
                        }
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      if (newRequirement.trim()) {
                        setRequirementItems([...requirementItems, newRequirement.trim()]);
                        setNewRequirement("");
                      }
                    }}
                    data-testid="button-add-requirement"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {requirementItems.length > 0 && (
                  <ul className="space-y-1" data-testid="list-requirements">
                    {requirementItems.map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm p-2 rounded-md border bg-muted/30">
                        <span className="text-muted-foreground text-xs w-5 shrink-0">{i + 1}.</span>
                        <span className="flex-1" data-testid={`text-requirement-${i}`}>{item}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={() => setRequirementItems(requirementItems.filter((_, idx) => idx !== i))}
                          data-testid={`button-remove-requirement-${i}`}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="space-y-2">
                <FormLabel>Key Responsibilities</FormLabel>
                <div className="flex gap-2">
                  <Input
                    value={newResponsibility}
                    onChange={(e) => setNewResponsibility(e.target.value)}
                    placeholder="Add a key responsibility..."
                    data-testid="input-new-responsibility"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (newResponsibility.trim()) {
                          setResponsibilityItems([...responsibilityItems, newResponsibility.trim()]);
                          setNewResponsibility("");
                        }
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      if (newResponsibility.trim()) {
                        setResponsibilityItems([...responsibilityItems, newResponsibility.trim()]);
                        setNewResponsibility("");
                      }
                    }}
                    data-testid="button-add-responsibility"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {responsibilityItems.length > 0 && (
                  <ul className="space-y-1" data-testid="list-responsibilities">
                    {responsibilityItems.map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm p-2 rounded-md border bg-muted/30">
                        <span className="text-muted-foreground text-xs w-5 shrink-0">{i + 1}.</span>
                        <span className="flex-1" data-testid={`text-responsibility-${i}`}>{item}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={() => setResponsibilityItems(responsibilityItems.filter((_, idx) => idx !== i))}
                          data-testid={`button-remove-responsibility-${i}`}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="space-y-2">
                <FormLabel>What to Expect in the Hiring Process</FormLabel>
                <div className="flex gap-2">
                  <Input
                    value={newHiringProcess}
                    onChange={(e) => setNewHiringProcess(e.target.value)}
                    placeholder="Add a hiring process step..."
                    data-testid="input-new-hiring-process"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (newHiringProcess.trim()) {
                          setHiringProcessItems([...hiringProcessItems, newHiringProcess.trim()]);
                          setNewHiringProcess("");
                        }
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      if (newHiringProcess.trim()) {
                        setHiringProcessItems([...hiringProcessItems, newHiringProcess.trim()]);
                        setNewHiringProcess("");
                      }
                    }}
                    data-testid="button-add-hiring-process"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {hiringProcessItems.length > 0 && (
                  <ul className="space-y-1" data-testid="list-hiring-process">
                    {hiringProcessItems.map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm p-2 rounded-md border bg-muted/30">
                        <span className="text-muted-foreground text-xs w-5 shrink-0">{i + 1}.</span>
                        <span className="flex-1" data-testid={`text-hiring-process-${i}`}>{item}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={() => setHiringProcessItems(hiringProcessItems.filter((_, idx) => idx !== i))}
                          data-testid={`button-remove-hiring-process-${i}`}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="space-y-3">
                <FormLabel>Application Form Fields</FormLabel>
                <p className="text-xs text-muted-foreground">Configure which fields candidates see when applying. First Name, Last Name, and Email are always required.</p>
                <div className="border rounded-md divide-y">
                  {Object.entries(appFieldLabels).map(([key, label]) => (
                    <div key={key} className="flex items-center justify-between px-3 py-2">
                      <span className="text-sm">{label}</span>
                      <Select
                        value={applicationFieldsConfig[key]}
                        onValueChange={(val: string) => setApplicationFieldsConfig(prev => ({ ...prev, [key]: val as FieldVisibility }))}
                      >
                        <SelectTrigger className="w-[120px] h-8 text-xs" data-testid={`select-appfield-${key}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="required">Required</SelectItem>
                          <SelectItem value="optional">Optional</SelectItem>
                          <SelectItem value="hidden">Hidden</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} data-testid="button-cancel">
                  Cancel
                </Button>
                <Button type="submit" disabled={isMutating} data-testid="button-save-job">
                  {isMutating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingJob ? "Update Job" : "Create Job"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
