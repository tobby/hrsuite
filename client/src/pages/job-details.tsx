import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import type { JobPosting } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { MapPin, ArrowLeft, Inbox, Briefcase, DollarSign, Calendar, Globe, Clock, Users, Building2 } from "lucide-react";

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
        <div className="max-w-3xl mx-auto px-6 py-8">
          <Skeleton className="h-5 w-28 mb-6" />
          <Skeleton className="h-8 w-3/4 mb-3" />
          <Skeleton className="h-4 w-1/3 mb-6" />
          <Skeleton className="h-10 w-32 mb-10" />
          <Skeleton className="h-px w-full mb-8" />
          <Skeleton className="h-5 w-40 mb-4" />
          <Skeleton className="h-24 w-full mb-8" />
          <Skeleton className="h-5 w-40 mb-4" />
          <Skeleton className="h-20 w-full" />
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
      <div className="max-w-3xl mx-auto px-6 py-8">
        <Link href="/careers">
          <Button variant="ghost" size="sm" className="mb-6 -ml-2" data-testid="button-back">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to jobs
          </Button>
        </Link>

        <h1 className="text-2xl font-bold mb-2" data-testid="text-job-title">{job.title}</h1>
        <p className="text-muted-foreground mb-6" data-testid="text-job-location">
          {getLocationTypeLabel(job.locationType)}{job.location ? `, ${job.location}` : ""}
        </p>

        <Link href={`/jobs/${job.id}/apply`}>
          <Button size="lg" data-testid="button-apply">
            Apply
          </Button>
        </Link>

        <Separator className="my-8" />

        <div className="space-y-8">
          <section>
            <h2 className="text-base font-semibold mb-3">About This Role</h2>
            <div className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed" data-testid="text-job-description">
              {job.description}
            </div>
          </section>

          {job.responsibilities && (
            <section>
              <h2 className="text-base font-semibold mb-3">Key Responsibilities</h2>
              <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground" data-testid="text-responsibilities">
                {job.responsibilities.split("\n").filter(line => line.trim()).map((line, i) => (
                  <li key={i}>{line.replace(/^[-•*]\s*/, "").trim()}</li>
                ))}
              </ul>
            </section>
          )}

          {job.requirements && (
            <section>
              <h2 className="text-base font-semibold mb-3">Skills & Competencies</h2>
              <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground" data-testid="text-requirements">
                {job.requirements.split("\n").filter(line => line.trim()).map((line, i) => (
                  <li key={i}>{line.replace(/^[-•*]\s*/, "").trim()}</li>
                ))}
              </ul>
            </section>
          )}

          {job.hiringProcess && (
            <section>
              <h2 className="text-base font-semibold mb-3">What to Expect in the Hiring Process</h2>
              <ol className="list-decimal pl-5 space-y-2 text-sm text-muted-foreground" data-testid="text-hiring-process">
                {job.hiringProcess.split("\n").filter(line => line.trim()).map((line, i) => (
                  <li key={i}>{line.replace(/^[-•*\d.]\s*/, "").trim()}</li>
                ))}
              </ol>
            </section>
          )}

          <section>
            <h2 className="text-base font-semibold mb-3">Job Details</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground w-32 shrink-0">Employment Type</span>
                <span data-testid="badge-employment-type">{getEmploymentTypeLabel(job.employmentType)}</span>
              </div>
              {departmentName && (
                <div className="flex items-center gap-3">
                  <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground w-32 shrink-0">Department</span>
                  <span data-testid="text-dept-detail">{departmentName}</span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground w-32 shrink-0">Location</span>
                <span data-testid="text-location-detail">{job.location}</span>
              </div>
              <div className="flex items-center gap-3">
                <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground w-32 shrink-0">Work Type</span>
                <span data-testid="text-work-type">{getLocationTypeLabel(job.locationType)}</span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground w-32 shrink-0">Experience</span>
                <span data-testid="text-experience-detail">{job.experienceYears}+ years</span>
              </div>
              {(job.salaryMin || job.salaryMax) && (
                <div className="flex items-center gap-3">
                  <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground w-32 shrink-0">Salary Range</span>
                  <span data-testid="text-salary">
                    ${job.salaryMin?.toLocaleString()}{job.salaryMax ? ` - $${job.salaryMax.toLocaleString()}` : "+"}
                  </span>
                </div>
              )}
              {job.numberOfOpenings > 1 && (
                <div className="flex items-center gap-3">
                  <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground w-32 shrink-0">Openings</span>
                  <span data-testid="text-openings">{job.numberOfOpenings} positions</span>
                </div>
              )}
              {job.applicationDeadline && (
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground w-32 shrink-0">Deadline</span>
                  <span data-testid="text-deadline">{new Date(job.applicationDeadline).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </section>
        </div>

        <Separator className="my-8" />

        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground mb-4">Interested in this role? We'd love to hear from you.</p>
          <Link href={`/jobs/${job.id}/apply`}>
            <Button size="lg" data-testid="button-apply-sidebar">
              Apply for this Position
            </Button>
          </Link>
        </div>
      </div>

      <footer className="border-t mt-8">
        <div className="max-w-3xl mx-auto px-6 py-6 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
