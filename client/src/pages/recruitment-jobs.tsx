import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Redirect } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { Department } from "@shared/schema";
import { useRecruitmentStore } from "@/lib/recruitment-store";
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
import { Briefcase, Plus, LayoutGrid, List, MapPin, Clock, Users, Copy, MoreHorizontal, Pencil, Trash2, ExternalLink, Inbox } from "lucide-react";

const jobFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  departmentId: z.string().min(1, "Department is required"),
  location: z.string().min(1, "Location is required"),
  employmentType: z.enum(["full-time", "contract", "intern"]),
  experienceYears: z.coerce.number().min(0),
  status: z.enum(["open", "closed", "draft"]),
});

type JobFormData = z.infer<typeof jobFormSchema>;

export default function RecruitmentJobs() {
  const { role } = useRole();
  const { toast } = useToast();
  const { jobs, addJob, updateJob, deleteJob, getCandidatesByJob } = useRecruitmentStore();
  const { data: departments = [] } = useQuery<Department[]>({ queryKey: ['/api/departments'] });

  if (!canEditOrgSettings(role)) {
    return <Redirect to="/" />;
  }
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<string | null>(null);

  const { currentPage, totalPages, paginatedItems: paginatedJobs, setCurrentPage, totalItems, pageSize } = usePagination(jobs, 10);

  const form = useForm<JobFormData>({
    resolver: zodResolver(jobFormSchema),
    defaultValues: {
      title: "",
      description: "",
      departmentId: "",
      location: "",
      employmentType: "full-time",
      experienceYears: 0,
      status: "open",
    },
  });

  const getDepartmentName = (id: string) => departments.find((d) => d.id === id)?.name || "Unknown";

  const getEmploymentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      "full-time": "Full-time",
      "contract": "Contract",
      "intern": "Intern",
    };
    return labels[type] || type;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      open: "default",
      closed: "secondary",
      draft: "outline",
    };
    return <Badge variant={variants[status] || "outline"}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
  };

  const handleOpenDialog = (jobId?: string) => {
    if (jobId) {
      const job = jobs.find((j) => j.id === jobId);
      if (job) {
        form.reset({
          title: job.title,
          description: job.description,
          departmentId: job.departmentId,
          location: job.location,
          employmentType: job.employmentType as "full-time" | "contract" | "intern",
          experienceYears: job.experienceYears,
          status: job.status as "open" | "closed" | "draft",
        });
        setEditingJob(jobId);
      }
    } else {
      form.reset({
        title: "",
        description: "",
        departmentId: "",
        location: "",
        employmentType: "full-time",
        experienceYears: 0,
        status: "open",
      });
      setEditingJob(null);
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = (data: JobFormData) => {
    if (editingJob) {
      updateJob(editingJob, data);
      toast({ title: "Job Updated", description: "The job posting has been updated." });
    } else {
      addJob({ ...data, companyId: "" });
      toast({ title: "Job Created", description: "The job posting has been created." });
    }
    setIsDialogOpen(false);
    form.reset();
  };

  const handleDelete = (jobId: string) => {
    deleteJob(jobId);
    toast({ title: "Job Deleted", description: "The job posting has been deleted." });
  };

  const copyShareableLink = (jobId: string) => {
    const url = `${window.location.origin}/jobs/${jobId}/apply`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link Copied", description: "Application link copied to clipboard." });
  };

  const openJobPreview = (jobId: string) => {
    window.open(`/careers?job=${jobId}`, "_blank");
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Job Postings</h1>
          <p className="text-muted-foreground">Manage your open positions and job listings</p>
        </div>
        <div className="flex items-center gap-2">
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
          <Button onClick={() => handleOpenDialog()} data-testid="button-create-job">
            <Plus className="h-4 w-4 mr-2" />
            Create Job
          </Button>
        </div>
      </div>

      {jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Inbox className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">No job postings yet</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">Create your first job posting to start attracting candidates.</p>
        </div>
      ) : viewMode === "card" ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {jobs.map((job) => {
            const candidateCount = getCandidatesByJob(job.id).length;
            return (
              <Card key={job.id} className="hover-elevate" data-testid={`card-job-${job.id}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{job.title}</CardTitle>
                      <CardDescription>{getDepartmentName(job.departmentId)}</CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" data-testid={`button-job-menu-${job.id}`}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenDialog(job.id)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => copyShareableLink(job.id)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Link
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openJobPreview(job.id)}>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Preview
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(job.id)} className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {getStatusBadge(job.status)}
                    <Badge variant="outline">{getEmploymentTypeLabel(job.employmentType)}</Badge>
                  </div>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3 w-3" />
                      <span>{job.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      <span>{job.experienceYears}+ years experience</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-3 w-3" />
                      <span>{candidateCount} applicants</span>
                    </div>
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
                <TableHead>Applicants</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedJobs.map((job) => {
                const candidateCount = getCandidatesByJob(job.id).length;
                return (
                  <TableRow key={job.id} data-testid={`row-job-${job.id}`}>
                    <TableCell className="font-medium">{job.title}</TableCell>
                    <TableCell>{getDepartmentName(job.departmentId)}</TableCell>
                    <TableCell>{job.location}</TableCell>
                    <TableCell>{getEmploymentTypeLabel(job.employmentType)}</TableCell>
                    <TableCell>{job.experienceYears}+ years</TableCell>
                    <TableCell>{candidateCount}</TableCell>
                    <TableCell>{getStatusBadge(job.status)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenDialog(job.id)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => copyShareableLink(job.id)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Copy Link
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(job.id)} className="text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
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
        <DialogContent className="sm:max-w-[600px]">
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
                          <SelectItem value="contract">Contract</SelectItem>
                          <SelectItem value="intern">Intern</SelectItem>
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
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                          <SelectItem value="draft">Draft</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the role, requirements, and responsibilities..."
                        className="min-h-[150px]"
                        {...field}
                        data-testid="input-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" data-testid="button-save-job">
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
