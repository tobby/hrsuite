import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRole, canEditOrgSettings } from "@/lib/role-context";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { Employee, Department, TaskAssignment, JobPosting, Candidate, HrQuery } from "@shared/schema";
import {
  PieChart,
  Users,
  CalendarDays,
  Briefcase,
  ClipboardCheck,
  HelpCircle,
  TrendingUp,
  Building2,
  UserCheck,
  UserX,
  Clock,
  ClipboardList,
  AlertTriangle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "#6366f1",
  "#ec4899",
  "#14b8a6",
];

export default function Reports() {
  const { role } = useRole();
  const [, navigate] = useLocation();
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const { data: taskAssignments = [] } = useQuery<TaskAssignment[]>({ queryKey: ['/api/task-assignments'] });
  const { data: hrQueries = [] } = useQuery<HrQuery[]>({ queryKey: ['/api/hr-queries'] });
  const { data: jobs = [] } = useQuery<JobPosting[]>({ queryKey: ['/api/job-postings'] });
  const { data: candidates = [] } = useQuery<Candidate[]>({ queryKey: ['/api/candidates'] });

  const { data: employees = [] } = useQuery<Employee[]>({ queryKey: ['/api/employees'] });
  const { data: departments = [] } = useQuery<Department[]>({ queryKey: ['/api/departments'] });

  if (!canEditOrgSettings(role)) {
    navigate("/");
    return null;
  }

  const filteredEmployees = departmentFilter === "all"
    ? employees
    : employees.filter((e) => e.departmentId === departmentFilter);

  const activeCount = filteredEmployees.filter((e) => e.status === "active").length;
  const onLeaveCount = filteredEmployees.filter((e) => e.status === "on_leave").length;
  const inactiveCount = filteredEmployees.filter((e) => e.status === "inactive").length;

  const filteredDepartments = departmentFilter === "all"
    ? departments
    : departments.filter((d) => d.id === departmentFilter);

  const deptDistribution = filteredDepartments.map((dept) => ({
    name: dept.name,
    value: filteredEmployees.filter((e) => e.departmentId === dept.id).length,
  }));

  const leaveByType: { name: string; approved: number; pending: number; rejected: number }[] = [];

  const leaveByDept: { name: string; days: number }[] = [];

  const leaveStatusCounts = {
    approved: 0,
    pending: 0,
    rejected: 0,
  };

  const openJobs = jobs.filter((j) => j.status === "active").length;
  const totalCandidates = candidates.length;
  const pipelineStages = [
    { name: "New", value: candidates.filter((c) => c.stage === "new").length },
    { name: "Screening", value: candidates.filter((c) => c.stage === "screening").length },
    { name: "Manager Review", value: candidates.filter((c) => c.stage === "manager_review").length },
    { name: "Phone", value: candidates.filter((c) => c.stage === "phone_interview").length },
    { name: "Technical", value: candidates.filter((c) => c.stage === "technical_interview").length },
    { name: "Final", value: candidates.filter((c) => c.stage === "final_interview").length },
    { name: "Offer", value: candidates.filter((c) => c.stage === "offer_extended").length },
    { name: "Hired", value: candidates.filter((c) => c.stage === "hired").length },
  ];

  const queryStatusData = [
    { name: "Open", value: hrQueries.filter((q) => q.status === "open").length },
    { name: "Awaiting", value: hrQueries.filter((q) => q.status === "awaiting_response").length },
    { name: "Responded", value: hrQueries.filter((q) => q.status === "responded").length },
    { name: "Resolved", value: hrQueries.filter((q) => q.status === "resolved").length },
    { name: "Closed", value: hrQueries.filter((q) => q.status === "closed").length },
  ].filter((d) => d.value > 0);

  const queryCategoryData = [
    { name: "Attendance", value: hrQueries.filter((q) => q.category === "attendance").length },
    { name: "Conduct", value: hrQueries.filter((q) => q.category === "conduct").length },
    { name: "Performance", value: hrQueries.filter((q) => q.category === "performance").length },
    { name: "Policy", value: hrQueries.filter((q) => q.category === "policy_violation").length },
    { name: "Other", value: hrQueries.filter((q) => q.category === "other").length },
  ].filter((d) => d.value > 0);

  const totalTaskAssignments = taskAssignments.length;
  const individualAssignments = taskAssignments.filter(a => a.assignmentType === "individual").length;
  const groupAssignments = taskAssignments.filter(a => a.assignmentType !== "individual").length;
  const overdueAssignments = taskAssignments.filter(a => a.dueDate && new Date(a.dueDate) < new Date()).length;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <PieChart className="h-6 w-6" />
            <h1 className="text-2xl font-bold tracking-tight" data-testid="text-reports-title">
              Reports & Analytics
            </h1>
          </div>
          <p className="text-muted-foreground">
            Cross-module insights and organizational metrics
          </p>
        </div>
        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
          <SelectTrigger className="w-[200px]" data-testid="select-department-filter">
            <Building2 className="h-4 w-4 mr-2" />
            <SelectValue placeholder="All Departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-metric-employees">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-100 dark:bg-blue-900/30">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{filteredEmployees.length}</p>
                <p className="text-xs text-muted-foreground">Total Employees</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-metric-active">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-green-100 dark:bg-green-900/30">
                <UserCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeCount}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-metric-leave">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-amber-100 dark:bg-amber-900/30">
                <CalendarDays className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{onLeaveCount}</p>
                <p className="text-xs text-muted-foreground">On Leave</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-metric-openings">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-purple-100 dark:bg-purple-900/30">
                <Briefcase className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{openJobs}</p>
                <p className="text-xs text-muted-foreground">Open Positions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="workforce" data-testid="tabs-reports">
        <TabsList>
          <TabsTrigger value="workforce" data-testid="tab-workforce">Workforce</TabsTrigger>
          <TabsTrigger value="leave" data-testid="tab-leave">Leave</TabsTrigger>
          <TabsTrigger value="recruitment" data-testid="tab-recruitment">Recruitment</TabsTrigger>
          <TabsTrigger value="queries" data-testid="tab-queries">Queries</TabsTrigger>
          <TabsTrigger value="onboarding" data-testid="tab-tasks">Tasks</TabsTrigger>
        </TabsList>

        <TabsContent value="workforce" className="space-y-4 mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card data-testid="card-dept-distribution">
              <CardHeader>
                <CardTitle className="text-base">Department Distribution</CardTitle>
                <CardDescription>Employee count by department</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={deptDistribution}
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {deptDistribution.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-employee-status">
              <CardHeader>
                <CardTitle className="text-base">Employee Status</CardTitle>
                <CardDescription>Current workforce status breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-green-500" />
                        <span className="text-sm">Active</span>
                      </div>
                      <span className="text-sm font-bold">{activeCount}</span>
                    </div>
                    <Progress value={(activeCount / filteredEmployees.length) * 100} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-amber-500" />
                        <span className="text-sm">On Leave</span>
                      </div>
                      <span className="text-sm font-bold">{onLeaveCount}</span>
                    </div>
                    <Progress value={(onLeaveCount / filteredEmployees.length) * 100} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-red-500" />
                        <span className="text-sm">Inactive</span>
                      </div>
                      <span className="text-sm font-bold">{inactiveCount}</span>
                    </div>
                    <Progress value={(inactiveCount / filteredEmployees.length) * 100} className="h-2" />
                  </div>
                </div>
                <div className="mt-6 space-y-3">
                  <h4 className="text-sm font-medium">Department Headcount</h4>
                  {filteredDepartments.map((dept) => {
                    const count = filteredEmployees.filter((e) => e.departmentId === dept.id).length;
                    return (
                      <div key={dept.id} className="flex items-center justify-between gap-2">
                        <span className="text-sm text-muted-foreground">{dept.name}</span>
                        <Badge variant="secondary">{count}</Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="leave" className="space-y-4 mt-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-green-100 dark:bg-green-900/30">
                    <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{leaveStatusCounts.approved}</p>
                    <p className="text-xs text-muted-foreground">Approved Requests</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-amber-100 dark:bg-amber-900/30">
                    <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{leaveStatusCounts.pending}</p>
                    <p className="text-xs text-muted-foreground">Pending Requests</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-red-100 dark:bg-red-900/30">
                    <UserX className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{leaveStatusCounts.rejected}</p>
                    <p className="text-xs text-muted-foreground">Rejected Requests</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card data-testid="card-leave-by-type">
              <CardHeader>
                <CardTitle className="text-base">Leave Days by Type</CardTitle>
                <CardDescription>Approved, pending, and rejected days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={leaveByType}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                      <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="approved" fill={CHART_COLORS[0]} name="Approved" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="pending" fill={CHART_COLORS[1]} name="Pending" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="rejected" fill={CHART_COLORS[2]} name="Rejected" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-leave-by-dept">
              <CardHeader>
                <CardTitle className="text-base">Leave Days by Department</CardTitle>
                <CardDescription>Approved leave days across departments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={leaveByDept} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis type="number" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={100} className="fill-muted-foreground" />
                      <Tooltip />
                      <Bar dataKey="days" fill={CHART_COLORS[3]} name="Days" radius={[0, 2, 2, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="recruitment" className="space-y-4 mt-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-purple-100 dark:bg-purple-900/30">
                    <Briefcase className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{jobs.length}</p>
                    <p className="text-xs text-muted-foreground">Total Jobs</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-100 dark:bg-blue-900/30">
                    <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totalCandidates}</p>
                    <p className="text-xs text-muted-foreground">Total Candidates</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-green-100 dark:bg-green-900/30">
                    <UserCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{candidates.filter((c) => c.stage === "hired").length}</p>
                    <p className="text-xs text-muted-foreground">Hired</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card data-testid="card-recruitment-pipeline">
            <CardHeader>
              <CardTitle className="text-base">Recruitment Pipeline</CardTitle>
              <CardDescription>Candidates across hiring stages</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pipelineStages}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                    <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                    <Tooltip />
                    <Bar dataKey="value" name="Candidates" radius={[4, 4, 0, 0]}>
                      {pipelineStages.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="queries" className="space-y-4 mt-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-amber-100 dark:bg-amber-900/30">
                    <HelpCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{hrQueries.length}</p>
                    <p className="text-xs text-muted-foreground">Total Queries</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-red-100 dark:bg-red-900/30">
                    <Clock className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {hrQueries.filter((q) => q.status === "open" || q.status === "awaiting_response").length}
                    </p>
                    <p className="text-xs text-muted-foreground">Open / Awaiting</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-green-100 dark:bg-green-900/30">
                    <ClipboardCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {hrQueries.filter((q) => q.status === "resolved" || q.status === "closed").length}
                    </p>
                    <p className="text-xs text-muted-foreground">Resolved / Closed</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card data-testid="card-query-status">
              <CardHeader>
                <CardTitle className="text-base">Queries by Status</CardTitle>
                <CardDescription>Distribution of query statuses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={queryStatusData}
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {queryStatusData.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-query-category">
              <CardHeader>
                <CardTitle className="text-base">Queries by Category</CardTitle>
                <CardDescription>Types of disciplinary queries</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={queryCategoryData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                      <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                      <Tooltip />
                      <Bar dataKey="value" name="Queries" radius={[4, 4, 0, 0]}>
                        {queryCategoryData.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="onboarding" className="space-y-4 mt-4">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-100 dark:bg-blue-900/30">
                    <ClipboardList className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totalTaskAssignments}</p>
                    <p className="text-xs text-muted-foreground">Total Assignments</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-purple-100 dark:bg-purple-900/30">
                    <UserCheck className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{individualAssignments}</p>
                    <p className="text-xs text-muted-foreground">Individual</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-green-100 dark:bg-green-900/30">
                    <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{groupAssignments}</p>
                    <p className="text-xs text-muted-foreground">Group/Company</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-red-100 dark:bg-red-900/30">
                    <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{overdueAssignments}</p>
                    <p className="text-xs text-muted-foreground">Past Due Date</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card data-testid="card-task-assignments">
            <CardHeader>
              <CardTitle className="text-base">Task Assignments</CardTitle>
              <CardDescription>All task assignments across the organization</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {taskAssignments.map((assignment) => {
                  const items = (() => { try { return JSON.parse(assignment.items); } catch { return []; } })();
                  return (
                    <div key={assignment.id} className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{assignment.title}</span>
                          <Badge variant="secondary" className="text-xs">{assignment.assignmentType}</Badge>
                          <Badge variant="secondary" className="text-xs">{assignment.priority}</Badge>
                        </div>
                        <span className="text-sm text-muted-foreground">{items.length} items</span>
                      </div>
                    </div>
                  );
                })}
                {taskAssignments.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No task assignments yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
