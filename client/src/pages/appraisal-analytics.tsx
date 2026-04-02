import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, Inbox, Star, Users, CheckCircle2, TrendingUp, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from "recharts";
import { useRole, canEditOrgSettings } from "@/lib/role-context";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { AppraisalWithFeedback, AppraisalCycle, Employee, Department } from "@shared/schema";

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-foreground mb-1">{label}</p>
      {payload.map((entry: any, idx: number) => (
        <p key={idx} className="text-xs" style={{ color: entry.color }}>
          {entry.name || "Count"}: <span className="font-semibold">{entry.value}</span>
        </p>
      ))}
    </div>
  );
}

function PieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-lg">
      <p className="text-xs font-medium" style={{ color: payload[0].payload.color }}>
        {payload[0].name}: <span className="font-semibold">{payload[0].value}</span>
      </p>
    </div>
  );
}

export default function AppraisalAnalytics() {
  const { role } = useRole();
  const [, navigate] = useLocation();

  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [employeeFilter, setEmployeeFilter] = useState<string>("all");
  const [cycleFilter, setCycleFilter] = useState<string>("all");

  if (!canEditOrgSettings(role)) {
    navigate("/appraisals");
    return null;
  }

  const { data: appraisals = [], isLoading: appraisalsLoading } = useQuery<AppraisalWithFeedback[]>({
    queryKey: ["/api/appraisals"],
  });

  const { data: cycles = [] } = useQuery<AppraisalCycle[]>({
    queryKey: ["/api/appraisal-cycles"],
  });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
  });

  const getEmployee = (id: string) => employees.find((e) => e.id === id);
  const getEmployeeName = (id: string) => {
    const emp = getEmployee(id);
    return emp ? `${emp.firstName} ${emp.lastName}` : "Unknown";
  };
  const getDepartmentName = (id: string) => {
    const dept = departments.find((d) => d.id === id);
    return dept?.name || "Unknown";
  };

  // Apply filters
  let filtered = appraisals;

  if (cycleFilter !== "all") {
    filtered = filtered.filter((a) => a.cycleId === cycleFilter);
  }

  if (departmentFilter !== "all") {
    filtered = filtered.filter((a) => {
      const emp = getEmployee(a.employeeId);
      return emp?.departmentId === departmentFilter;
    });
  }

  if (employeeFilter !== "all") {
    filtered = filtered.filter((a) => a.employeeId === employeeFilter);
  }

  const completedAppraisals = filtered.filter((a) => a.status === "completed");
  const rated = completedAppraisals.filter((a) => a.overallRating != null);

  // KPIs
  const totalCount = filtered.length;
  const completedCount = completedAppraisals.length;
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const avgRating = rated.length > 0
    ? (rated.reduce((sum, a) => sum + (a.overallRating || 0), 0) / rated.length).toFixed(1)
    : "—";

  // Top performer
  const topPerformer = rated.length > 0
    ? rated.reduce((best, a) => (a.overallRating || 0) > (best.overallRating || 0) ? a : best, rated[0])
    : null;

  // Rating distribution (1-5)
  const ratingDist = [1, 2, 3, 4, 5].map((r) => ({
    rating: `${r} Star${r > 1 ? "s" : ""}`,
    count: rated.filter((a) => a.overallRating === r).length,
  }));

  // Average rating by department
  const deptRatings: Record<string, { total: number; count: number }> = {};
  rated.forEach((a) => {
    const emp = getEmployee(a.employeeId);
    const deptId = emp?.departmentId || "unknown";
    if (!deptRatings[deptId]) deptRatings[deptId] = { total: 0, count: 0 };
    deptRatings[deptId].total += a.overallRating || 0;
    deptRatings[deptId].count += 1;
  });
  const deptAvgData = Object.entries(deptRatings).map(([deptId, { total, count }]) => ({
    name: getDepartmentName(deptId),
    average: parseFloat((total / count).toFixed(1)),
    count,
  }));

  // Completion by cycle
  const cycleCompletionData = cycles
    .filter((c) => c.status !== "draft")
    .map((c) => {
      const cycleAppraisals = filtered.filter((a) => a.cycleId === c.id);
      const done = cycleAppraisals.filter((a) => a.status === "completed").length;
      const pending = cycleAppraisals.filter((a) => a.status !== "completed").length;
      return { name: c.name, completed: done, pending };
    })
    .filter((d) => d.completed + d.pending > 0);

  // Completion status pie
  const statusData = [
    { name: "Completed", value: completedCount, color: "#16a34a", gradientStart: "#4ade80", gradientEnd: "#16a34a" },
    { name: "Pending", value: totalCount - completedCount, color: "#ca8a04", gradientStart: "#facc15", gradientEnd: "#ca8a04" },
  ].filter((d) => d.value > 0);

  // Top performers list (up to 10)
  const topPerformers = [...rated]
    .sort((a, b) => (b.overallRating || 0) - (a.overallRating || 0))
    .slice(0, 10);

  // Employees in the current filter for the employee dropdown
  const employeesInScope = departmentFilter !== "all"
    ? employees.filter((e) => e.departmentId === departmentFilter)
    : employees;

  const renderCustomLabel = ({ name, value, cx, cy, midAngle, outerRadius }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 28;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill="hsl(var(--muted-foreground))" textAnchor={x > cx ? "start" : "end"} dominantBaseline="central" fontSize={11} fontWeight={500}>
        {`${name} (${value})`}
      </text>
    );
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-semibold tracking-tight" data-testid="text-appraisal-analytics-title">
            Performance Analytics
          </h1>
        </div>
        <p className="text-muted-foreground">
          View performance ratings, trends, and completion rates across the organization
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={cycleFilter} onValueChange={setCycleFilter}>
          <SelectTrigger className="w-[200px]" data-testid="filter-cycle">
            <SelectValue placeholder="All Cycles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Cycles</SelectItem>
            {cycles.filter((c) => c.status !== "draft").map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={departmentFilter} onValueChange={(v) => { setDepartmentFilter(v); setEmployeeFilter("all"); }}>
          <SelectTrigger className="w-[200px]" data-testid="filter-department">
            <SelectValue placeholder="All Departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
          <SelectTrigger className="w-[200px]" data-testid="filter-employee">
            <SelectValue placeholder="All Employees" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Employees</SelectItem>
            {employeesInScope.map((e) => (
              <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {appraisalsLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Inbox className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground" data-testid="text-analytics-empty">No data available</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">
                Performance analytics will appear here once appraisal cycles have been activated.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card data-testid="card-total-appraisals">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Appraisals</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-appraisals">{totalCount}</div>
                <p className="text-xs text-muted-foreground">{completedCount} completed</p>
              </CardContent>
            </Card>
            <Card data-testid="card-avg-rating">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-avg-rating">{avgRating}</div>
                <p className="text-xs text-muted-foreground">Out of 5 ({rated.length} rated)</p>
              </CardContent>
            </Card>
            <Card data-testid="card-completion-rate">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-completion-rate">{completionRate}%</div>
                <p className="text-xs text-muted-foreground">{completedCount} of {totalCount} appraisals</p>
              </CardContent>
            </Card>
            <Card data-testid="card-top-performer">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Top Performer</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold truncate" data-testid="text-top-performer">
                  {topPerformer ? getEmployeeName(topPerformer.employeeId) : "—"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {topPerformer?.overallRating ? `Rating: ${topPerformer.overallRating}/5` : "No ratings yet"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card data-testid="card-rating-distribution">
              <CardHeader>
                <CardTitle className="text-base">Rating Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]" data-testid="chart-rating-distribution">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ratingDist} barCategoryGap="20%">
                      <defs>
                        <linearGradient id="barGradientAmber" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#fbbf24" stopOpacity={1} />
                          <stop offset="100%" stopColor="#d97706" stopOpacity={0.85} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground))" strokeOpacity={0.15} />
                      <XAxis dataKey="rating" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted-foreground))", fillOpacity: 0.06 }} />
                      <Bar dataKey="count" fill="url(#barGradientAmber)" radius={[6, 6, 0, 0]} animationDuration={800} animationEasing="ease-out" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <Card data-testid="card-completion-status">
              <CardHeader>
                <CardTitle className="text-base">Completion Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]" data-testid="chart-completion-status">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <defs>
                        {statusData.map((entry, idx) => (
                          <linearGradient key={`pieGrad-${idx}`} id={`pieGradAppr-${idx}`} x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor={entry.gradientStart} stopOpacity={1} />
                            <stop offset="100%" stopColor={entry.gradientEnd} stopOpacity={0.9} />
                          </linearGradient>
                        ))}
                      </defs>
                      <Pie
                        data={statusData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={3}
                        cornerRadius={4}
                        label={renderCustomLabel}
                        animationDuration={800}
                        animationEasing="ease-out"
                        stroke="none"
                      >
                        {statusData.map((_entry, index) => (
                          <Cell key={`cell-${index}`} fill={`url(#pieGradAppr-${index})`} />
                        ))}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                      <text x="50%" y="48%" textAnchor="middle" dominantBaseline="central" fill="hsl(var(--foreground))" fontSize={24} fontWeight={700}>
                        {totalCount}
                      </text>
                      <text x="50%" y="58%" textAnchor="middle" dominantBaseline="central" fill="hsl(var(--muted-foreground))" fontSize={11}>
                        Total
                      </text>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card data-testid="card-avg-by-department">
              <CardHeader>
                <CardTitle className="text-base">Average Rating by Department</CardTitle>
              </CardHeader>
              <CardContent>
                {deptAvgData.length === 0 ? (
                  <div className="flex items-center justify-center h-[300px] text-sm text-muted-foreground">
                    No completed ratings to display
                  </div>
                ) : (
                  <div className="h-[300px]" data-testid="chart-avg-by-department">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={deptAvgData} barCategoryGap="20%">
                        <defs>
                          <linearGradient id="barGradientIndigo" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#818cf8" stopOpacity={1} />
                            <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.85} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground))" strokeOpacity={0.15} />
                        <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} axisLine={false} tickLine={false} />
                        <YAxis domain={[0, 5]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted-foreground))", fillOpacity: 0.06 }} />
                        <Bar dataKey="average" name="Avg Rating" fill="url(#barGradientIndigo)" radius={[6, 6, 0, 0]} animationDuration={800} animationEasing="ease-out" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card data-testid="card-completion-by-cycle">
              <CardHeader>
                <CardTitle className="text-base">Completion by Cycle</CardTitle>
              </CardHeader>
              <CardContent>
                {cycleCompletionData.length === 0 ? (
                  <div className="flex items-center justify-center h-[300px] text-sm text-muted-foreground">
                    No cycle data to display
                  </div>
                ) : (
                  <div className="h-[300px]" data-testid="chart-completion-by-cycle">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={cycleCompletionData} barCategoryGap="20%">
                        <defs>
                          <linearGradient id="barGradientGreen" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#4ade80" stopOpacity={1} />
                            <stop offset="100%" stopColor="#16a34a" stopOpacity={0.85} />
                          </linearGradient>
                          <linearGradient id="barGradientYellow" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#facc15" stopOpacity={1} />
                            <stop offset="100%" stopColor="#ca8a04" stopOpacity={0.85} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground))" strokeOpacity={0.15} />
                        <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted-foreground))", fillOpacity: 0.06 }} />
                        <Bar dataKey="completed" name="Completed" fill="url(#barGradientGreen)" radius={[6, 6, 0, 0]} stackId="stack" animationDuration={800} />
                        <Bar dataKey="pending" name="Pending" fill="url(#barGradientYellow)" radius={[6, 6, 0, 0]} stackId="stack" animationDuration={800} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Top Performers Table */}
          {topPerformers.length > 0 && (
            <Card data-testid="card-top-performers">
              <CardHeader>
                <CardTitle className="text-base">Top Performers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {topPerformers.map((appraisal, idx) => {
                    const emp = getEmployee(appraisal.employeeId);
                    const cycleName = cycles.find((c) => c.id === appraisal.cycleId)?.name || "—";
                    return (
                      <div
                        key={appraisal.id}
                        className="flex items-center justify-between gap-4 p-3 rounded-md border"
                        data-testid={`row-performer-${idx}`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-sm font-medium text-muted-foreground w-6 text-right">
                            #{idx + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {emp ? `${emp.firstName} ${emp.lastName}` : "Unknown"}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {emp?.position} {emp?.departmentId ? `· ${getDepartmentName(emp.departmentId)}` : ""} · {cycleName}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Star className="h-4 w-4 text-amber-500" />
                          <span className="text-sm font-semibold">{appraisal.overallRating}/5</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
