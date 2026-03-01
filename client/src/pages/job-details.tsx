import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import type { JobPosting } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Clock, Building2, ArrowLeft, Inbox, Briefcase, Users, DollarSign, Calendar, Globe } from "lucide-react";

export default function JobDetails() {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<JobPosting | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [departmentName, setDepartmentName] = useState<string>("");

  useEffect(() => {
    async function fetchJob() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/job-postings/${id}`);
        if (res.ok) {
          const data = await res.json();
          setJob(data);

          try {
            const deptRes = await fetch("/api/departments", { credentials: "include" });
            if (deptRes.ok) {
              const depts = await deptRes.json();
              const dept = depts.find((d: { id: string; name: string }) => d.id === data.departmentId);
              if (dept) setDepartmentName(dept.name);
            }
          } catch {
          }
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

  const getLocationTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      "on-site": "On-site",
      "remote": "Remote",
      "hybrid": "Hybrid",
    };
    return labels[type] || type;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="bg-primary/5 border-b">
          <div className="max-w-4xl mx-auto px-6 py-8">
            <Skeleton className="h-8 w-32 mb-4" />
            <Skeleton className="h-10 w-3/4 mb-2" />
            <Skeleton className="h-5 w-1/2 mb-4" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="grid gap-8 md:grid-cols-3">
            <div className="md:col-span-2 space-y-6">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-24 w-full" />
            </div>
            <div>
              <Skeleton className="h-64 w-full" />
            </div>
          </div>
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

  return (
    <div className="min-h-screen bg-background" data-testid="page-job-details">
      <div className="bg-primary/5 border-b">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <Link href="/careers">
            <Button variant="ghost" size="sm" className="mb-4" data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to All Jobs
            </Button>
          </Link>

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold mb-2" data-testid="text-job-title">{job.title}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mt-2">
                {departmentName && (
                  <span className="flex items-center gap-1" data-testid="text-department">
                    <Building2 className="h-4 w-4" />
                    {departmentName}
                  </span>
                )}
                <span className="flex items-center gap-1" data-testid="text-location">
                  <MapPin className="h-4 w-4" />
                  {job.location}
                </span>
                <span className="flex items-center gap-1" data-testid="text-location-type">
                  <Globe className="h-4 w-4" />
                  {getLocationTypeLabel(job.locationType)}
                </span>
                <span className="flex items-center gap-1" data-testid="text-experience">
                  <Clock className="h-4 w-4" />
                  {job.experienceYears}+ years experience
                </span>
              </div>
            </div>
            <Link href={`/jobs/${job.id}/apply`}>
              <Button size="lg" className="w-full md:w-auto" data-testid="button-apply">
                Apply for this Position
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="grid gap-8 md:grid-cols-3">
          <div className="md:col-span-2 space-y-8">
            <section>
              <h2 className="text-xl font-semibold mb-4">About This Role</h2>
              <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-line" data-testid="text-job-description">
                {job.description}
              </div>
            </section>

            {job.responsibilities && (
              <section>
                <h2 className="text-xl font-semibold mb-4">Responsibilities</h2>
                <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-line" data-testid="text-responsibilities">
                  {job.responsibilities}
                </div>
              </section>
            )}

            {job.requirements && (
              <section>
                <h2 className="text-xl font-semibold mb-4">Requirements</h2>
                <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-line" data-testid="text-requirements">
                  {job.requirements}
                </div>
              </section>
            )}
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Job Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase mb-1">Employment Type</p>
                  <Badge variant="outline" data-testid="badge-employment-type">{getEmploymentTypeLabel(job.employmentType)}</Badge>
                </div>
                {departmentName && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase mb-1">Department</p>
                    <p className="text-sm font-medium" data-testid="text-dept-detail">{departmentName}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground uppercase mb-1">Location</p>
                  <p className="text-sm font-medium" data-testid="text-location-detail">{job.location}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase mb-1">Work Type</p>
                  <p className="text-sm font-medium" data-testid="text-work-type">{getLocationTypeLabel(job.locationType)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase mb-1">Experience</p>
                  <p className="text-sm font-medium" data-testid="text-experience-detail">{job.experienceYears}+ years</p>
                </div>
                {(job.salaryMin || job.salaryMax) && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase mb-1">Salary Range</p>
                    <p className="text-sm font-medium flex items-center gap-1" data-testid="text-salary">
                      <DollarSign className="h-3 w-3" />
                      {job.salaryMin?.toLocaleString()}{job.salaryMax ? ` - $${job.salaryMax.toLocaleString()}` : "+"}
                    </p>
                  </div>
                )}
                {job.numberOfOpenings > 1 && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase mb-1">Openings</p>
                    <p className="text-sm font-medium flex items-center gap-1" data-testid="text-openings">
                      <Users className="h-3 w-3" />
                      {job.numberOfOpenings} positions
                    </p>
                  </div>
                )}
                {job.applicationDeadline && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase mb-1">Application Deadline</p>
                    <p className="text-sm font-medium flex items-center gap-1" data-testid="text-deadline">
                      <Calendar className="h-3 w-3" />
                      {new Date(job.applicationDeadline).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {job.createdAt && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase mb-1">Posted</p>
                    <p className="text-sm font-medium" data-testid="text-posted-date">
                      {new Date(job.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="py-6">
                <p className="text-sm text-muted-foreground mb-4">
                  Interested in this role? We'd love to hear from you.
                </p>
                <Link href={`/jobs/${job.id}/apply`}>
                  <Button className="w-full" data-testid="button-apply-sidebar">
                    Apply Now
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <footer className="border-t mt-12">
        <div className="max-w-4xl mx-auto px-6 py-6 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
