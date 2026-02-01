import { useState } from "react";
import { Link, useSearch } from "wouter";
import { useRecruitmentStore } from "@/lib/recruitment-store";
import { departments } from "@/lib/demo-data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Briefcase, MapPin, Clock, Search, Building2 } from "lucide-react";

export default function Careers() {
  const searchParams = useSearch();
  const highlightedJobId = new URLSearchParams(searchParams).get("job");
  const { jobs } = useRecruitmentStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const openJobs = jobs.filter((j) => j.status === "open");

  const filteredJobs = openJobs.filter((job) => {
    const matchesSearch =
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = departmentFilter === "all" || job.departmentId === departmentFilter;
    const matchesType = typeFilter === "all" || job.employmentType === typeFilter;
    return matchesSearch && matchesDepartment && matchesType;
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

  const companyName = useRecruitmentStore((s) => s.getSetting("company_name")) || "Our Company";

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-primary/5 border-b">
        <div className="max-w-5xl mx-auto px-6 py-12 text-center">
          <h1 className="text-4xl font-bold mb-4" data-testid="text-careers-title">
            Join {companyName}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            We're building the future of work. Explore our open positions and find your next career opportunity.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search jobs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-jobs"
            />
          </div>
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-full md:w-[200px]" data-testid="select-department-filter">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept.id} value={dept.id}>
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full md:w-[180px]" data-testid="select-type-filter">
              <SelectValue placeholder="Job Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="full-time">Full-time</SelectItem>
              <SelectItem value="contract">Contract</SelectItem>
              <SelectItem value="intern">Intern</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="mb-4">
          <p className="text-sm text-muted-foreground">
            {filteredJobs.length} open position{filteredJobs.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="space-y-4">
          {filteredJobs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No positions found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || departmentFilter !== "all" || typeFilter !== "all"
                    ? "Try adjusting your filters."
                    : "Check back later for new opportunities."}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredJobs.map((job) => (
              <Card
                key={job.id}
                className={`hover-elevate ${highlightedJobId === job.id ? "ring-2 ring-primary" : ""}`}
                data-testid={`card-career-job-${job.id}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <CardTitle className="text-xl">{job.title}</CardTitle>
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
                    <Link href={`/jobs/${job.id}/apply`}>
                      <Button data-testid={`button-apply-${job.id}`}>Apply Now</Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 mb-4">
                    <Badge variant="outline">{getEmploymentTypeLabel(job.employmentType)}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-line line-clamp-3">
                    {job.description}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
