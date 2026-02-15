import { useState, useEffect } from "react";
import { Link, useSearch } from "wouter";
import type { JobPosting } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Clock, Search, Building2, Inbox, Briefcase, Calendar } from "lucide-react";

export default function Careers() {
  const searchParams = useSearch();
  const params = new URLSearchParams(searchParams);
  const companyId = params.get("company") || "";
  const highlightedJobId = params.get("job") || "";

  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  useEffect(() => {
    async function fetchJobs() {
      setIsLoading(true);
      try {
        if (companyId) {
          const res = await fetch(`/api/job-postings/public/${companyId}`);
          if (res.ok) {
            const data = await res.json();
            setJobs(data);
          }
        } else {
          const res = await fetch("/api/job-postings/public");
          if (res.ok) {
            const data = await res.json();
            setJobs(data);
          }
        }
      } catch {
      } finally {
        setIsLoading(false);
      }
    }
    fetchJobs();
  }, [companyId]);

  const departments = Array.from(new Set(jobs.map((j) => j.departmentId)));

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = departmentFilter === "all" || job.departmentId === departmentFilter;
    const matchesType = typeFilter === "all" || job.employmentType === typeFilter;
    return matchesSearch && matchesDepartment && matchesType;
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

  const getLocationTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      "on-site": "On-site",
      "remote": "Remote",
      "hybrid": "Hybrid",
    };
    return labels[type] || type;
  };

  return (
    <div className="min-h-screen bg-background" data-testid="page-careers">
      <div className="relative bg-primary/5 border-b">
        <div className="max-w-5xl mx-auto px-6 py-16 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Briefcase className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-4xl font-bold mb-3" data-testid="text-careers-title">
            Career Opportunities
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Join our team and help build the future. Explore open positions and find where you belong.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search positions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-jobs"
            />
          </div>
          {departments.length > 1 && (
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-full md:w-[200px]" data-testid="select-department-filter">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((deptId) => (
                  <SelectItem key={deptId} value={deptId}>
                    {deptId}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full md:w-[180px]" data-testid="select-type-filter">
              <SelectValue placeholder="Job Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="full-time">Full-time</SelectItem>
              <SelectItem value="part-time">Part-time</SelectItem>
              <SelectItem value="contract">Contract</SelectItem>
              <SelectItem value="internship">Internship</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="mb-4">
          <p className="text-sm text-muted-foreground" data-testid="text-job-count">
            {isLoading ? "Loading..." : `${filteredJobs.length} open position${filteredJobs.length !== 1 ? "s" : ""}`}
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2 mt-2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3 mt-2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Inbox className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground" data-testid="text-no-jobs">No open positions</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              {searchTerm || departmentFilter !== "all" || typeFilter !== "all"
                ? "Try adjusting your filters."
                : jobs.length === 0 && !companyId
                  ? "Visit this page with a company link to see available positions."
                  : "Check back later for new opportunities."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredJobs.map((job) => (
              <Link key={job.id} href={`/jobs/${job.id}`}>
                <Card
                  className={`hover-elevate cursor-pointer ${highlightedJobId === job.id ? "ring-2 ring-primary" : ""}`}
                  data-testid={`card-career-job-${job.id}`}
                >
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <CardTitle className="text-xl" data-testid={`text-job-title-${job.id}`}>{job.title}</CardTitle>
                        <CardDescription className="flex flex-wrap items-center gap-3 text-sm">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 shrink-0" />
                            {job.location}
                          </span>
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3 shrink-0" />
                            {getLocationTypeLabel(job.locationType)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3 shrink-0" />
                            {job.experienceYears}+ years
                          </span>
                        </CardDescription>
                      </div>
                      <Button data-testid={`button-view-${job.id}`}>View Details</Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <Badge variant="outline">{getEmploymentTypeLabel(job.employmentType)}</Badge>
                      {job.salaryMin && job.salaryMax && (
                        <Badge variant="secondary">
                          ${job.salaryMin.toLocaleString()} - ${job.salaryMax.toLocaleString()}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {job.description}
                    </p>
                    {job.createdAt && (
                      <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Posted {new Date(job.createdAt).toLocaleDateString()}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      <footer className="border-t mt-12">
        <div className="max-w-5xl mx-auto px-6 py-6 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
