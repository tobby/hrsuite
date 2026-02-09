import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { Department } from "@shared/schema";
import { useRecruitmentStore } from "@/lib/recruitment-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Briefcase, MapPin, Clock, Building2, ArrowLeft, Inbox } from "lucide-react";

export default function JobDetails() {
  const { id } = useParams<{ id: string }>();
  const { getJobById, getSetting } = useRecruitmentStore();
  const { data: departments = [] } = useQuery<Department[]>({ queryKey: ['/api/departments'] });

  const job = getJobById(id || "");
  const companyName = getSetting("company_name") || "Our Company";

  const getDepartmentName = (deptId: string) => departments.find((d) => d.id === deptId)?.name || "Unknown";

  const getEmploymentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      "full-time": "Full-time",
      "contract": "Contract",
      "intern": "Intern",
    };
    return labels[type] || type;
  };

  if (!job) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Inbox className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">Job not found</h3>
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

  if (job.status !== "open") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Inbox className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">Position closed</h3>
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
    <div className="min-h-screen bg-background">
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
              <h1 className="text-3xl font-bold mb-2" data-testid="text-job-title">{job.title}</h1>
              <p className="text-lg text-muted-foreground mb-4">{companyName}</p>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Building2 className="h-4 w-4" />
                  {getDepartmentName(job.departmentId)}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {job.location}
                </span>
                <span className="flex items-center gap-1">
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

            <section>
              <h2 className="text-xl font-semibold mb-4">What We Offer</h2>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  Competitive salary and benefits package
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  Flexible working arrangements
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  Professional development opportunities
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  Collaborative and inclusive work environment
                </li>
              </ul>
            </section>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Job Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase mb-1">Employment Type</p>
                  <Badge variant="outline">{getEmploymentTypeLabel(job.employmentType)}</Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase mb-1">Department</p>
                  <p className="text-sm font-medium">{getDepartmentName(job.departmentId)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase mb-1">Location</p>
                  <p className="text-sm font-medium">{job.location}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase mb-1">Experience</p>
                  <p className="text-sm font-medium">{job.experienceYears}+ years</p>
                </div>
                {job.createdAt && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase mb-1">Posted</p>
                    <p className="text-sm font-medium">
                      {new Date(job.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="py-6">
                <p className="text-sm text-muted-foreground mb-4">
                  Ready to join our team? We'd love to hear from you.
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
          <p>&copy; {new Date().getFullYear()} {companyName}. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
