import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Banknote, Inbox, Check, X, Info, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, CartesianGrid, Legend } from "recharts";
import { useRole, canEditOrgSettings, canViewAllRequests } from "@/lib/role-context";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { LoanRequest, Employee, Department } from "@shared/schema";

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-lg" data-testid="chart-tooltip">
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

export default function LoanAnalytics() {
  const { role } = useRole();
  const [, navigate] = useLocation();

  if (!canEditOrgSettings(role)) {
    navigate("/loan-requests");
    return null;
  }

  const currentYear = new Date().getFullYear();

  const { data: allRequests, isLoading: loadingAll } = useQuery<LoanRequest[]>({
    queryKey: ["/api/loan-requests/all"],
    enabled: canViewAllRequests(role),
  });

  const { data: employees } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
    enabled: canViewAllRequests(role),
  });

  const { data: departments } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
    enabled: role === "admin",
  });

  const currentYearRequests = (allRequests || []).filter((r) => {
    if (!r.createdAt) return false;
    return new Date(r.createdAt).getFullYear() === currentYear;
  });

  const totalRequests = currentYearRequests.length;
  const nonPending = currentYearRequests.filter((r) => r.status !== "pending");
  const approvedCount = nonPending.filter((r) => r.status === "approved").length;
  const rejectedCount = nonPending.filter((r) => r.status === "rejected").length;
  const approvalRate = nonPending.length > 0 ? Math.round((approvedCount / nonPending.length) * 100) : 0;
  const rejectionRate = nonPending.length > 0 ? Math.round((rejectedCount / nonPending.length) * 100) : 0;
  const totalAmountRequested = currentYearRequests.reduce((sum, r) => sum + (r.amountRequested || 0), 0);
  const formattedAmount = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0 }).format(totalAmountRequested);

  // Requests by Status (bar chart data)
  const statusBarCounts: Record<string, number> = {};
  currentYearRequests.forEach((r) => {
    statusBarCounts[r.status] = (statusBarCounts[r.status] || 0) + 1;
  });
  const statusBarLabels: Record<string, string> = {
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
    cancelled: "Cancelled",
  };
  const statusBarOrder = ["pending", "approved", "rejected", "cancelled"];
  const statusBarData = statusBarOrder
    .filter((s) => statusBarCounts[s])
    .map((s) => ({
      name: statusBarLabels[s] || s,
      count: statusBarCounts[s],
    }));

  // Status Breakdown (pie chart data)
  const statusCounts: Record<string, number> = {};
  currentYearRequests.forEach((r) => {
    statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
  });
  const statusLabels: Record<string, string> = {
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
    cancelled: "Cancelled",
  };
  const statusGradients: Record<string, [string, string]> = {
    pending: ["#60a5fa", "#2563eb"],
    approved: ["#4ade80", "#16a34a"],
    rejected: ["#f87171", "#dc2626"],
    cancelled: ["#d4d4d8", "#71717a"],
  };
  const statusOrder = ["pending", "approved", "rejected", "cancelled"];
  const statusData = statusOrder
    .filter((s) => statusCounts[s])
    .map((s) => ({
      name: statusLabels[s] || s,
      value: statusCounts[s],
      color: statusGradients[s]?.[1] || "#3b82f6",
      gradientStart: statusGradients[s]?.[0] || "#60a5fa",
      gradientEnd: statusGradients[s]?.[1] || "#2563eb",
    }));

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthlyData = monthNames.map((month, idx) => ({
    month,
    count: currentYearRequests.filter((r) => {
      if (!r.createdAt) return false;
      return new Date(r.createdAt).getMonth() === idx;
    }).length,
  }));

  const deptCounts: Record<string, number> = {};
  currentYearRequests.forEach((r) => {
    const emp = employees?.find((e) => e.id === r.employeeId);
    const deptId = emp?.departmentId || "unknown";
    deptCounts[deptId] = (deptCounts[deptId] || 0) + 1;
  });
  const deptData = Object.entries(deptCounts).map(([deptId, count]) => {
    const dept = departments?.find((d) => d.id === deptId);
    return { name: dept?.name || "Unknown", count };
  });

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
          <Banknote className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-semibold tracking-tight" data-testid="text-loan-analytics-title">
            Loan Analytics
          </h1>
        </div>
        <p className="text-muted-foreground">
          View loan request statistics and trends across the organization
        </p>
      </div>

      {loadingAll ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !allRequests || allRequests.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Inbox className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground" data-testid="text-analytics-empty">No data available</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md" data-testid="text-analytics-empty-description">
                Loan analytics will appear here once there are loan requests.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card data-testid="card-total-requests">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                <Banknote className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-requests">{totalRequests}</div>
                <p className="text-xs text-muted-foreground">Current year ({currentYear})</p>
              </CardContent>
            </Card>
            <Card data-testid="card-approval-rate">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
                <Check className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-approval-rate">{approvalRate}%</div>
                <p className="text-xs text-muted-foreground">{approvedCount} approved of {nonPending.length} decided</p>
              </CardContent>
            </Card>
            <Card data-testid="card-rejection-rate">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Rejection Rate</CardTitle>
                <X className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-rejection-rate">{rejectionRate}%</div>
                <p className="text-xs text-muted-foreground">{rejectedCount} rejected of {nonPending.length} decided</p>
              </CardContent>
            </Card>
            <Card data-testid="card-total-amount">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Amount Requested</CardTitle>
                <Info className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-amount">{formattedAmount}</div>
                <p className="text-xs text-muted-foreground">Sum of all loan requests</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card data-testid="card-requests-by-status">
              <CardHeader>
                <CardTitle className="text-base">Requests by Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]" data-testid="chart-requests-by-status">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statusBarData} barCategoryGap="20%">
                      <defs>
                        <linearGradient id="loanBarGradientBlue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#60a5fa" stopOpacity={1} />
                          <stop offset="100%" stopColor="#2563eb" stopOpacity={0.85} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground))" strokeOpacity={0.15} />
                      <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted-foreground))", fillOpacity: 0.06 }} />
                      <Bar dataKey="count" fill="url(#loanBarGradientBlue)" radius={[6, 6, 0, 0]} animationDuration={800} animationEasing="ease-out" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <Card data-testid="card-status-breakdown">
              <CardHeader>
                <CardTitle className="text-base">Status Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]" data-testid="chart-status-breakdown">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <defs>
                        {statusData.map((entry, idx) => (
                          <linearGradient key={`loanPieGrad-${idx}`} id={`loanPieGrad-${idx}`} x1="0" y1="0" x2="1" y2="1">
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
                          <Cell key={`cell-${index}`} fill={`url(#loanPieGrad-${index})`} />
                        ))}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                      <text x="50%" y="48%" textAnchor="middle" dominantBaseline="central" fill="hsl(var(--foreground))" fontSize={24} fontWeight={700}>
                        {totalRequests}
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card data-testid="card-monthly-trends">
              <CardHeader>
                <CardTitle className="text-base">Monthly Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]" data-testid="chart-monthly-trends">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyData}>
                      <defs>
                        <linearGradient id="loanAreaGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground))" strokeOpacity={0.15} />
                      <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend formatter={() => <span className="text-xs text-muted-foreground">Requests</span>} />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke="#8b5cf6"
                        strokeWidth={2.5}
                        fill="url(#loanAreaGradient)"
                        name="Requests"
                        dot={{ r: 3, fill: "#8b5cf6", stroke: "#fff", strokeWidth: 2 }}
                        activeDot={{ r: 5, fill: "#8b5cf6", stroke: "#fff", strokeWidth: 2 }}
                        animationDuration={800}
                        animationEasing="ease-out"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <Card data-testid="card-loans-by-department">
              <CardHeader>
                <CardTitle className="text-base">Loans by Department</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]" data-testid="chart-loans-by-department">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={deptData} barCategoryGap="20%">
                      <defs>
                        <linearGradient id="loanBarGradientTeal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#2dd4bf" stopOpacity={1} />
                          <stop offset="100%" stopColor="#0d9488" stopOpacity={0.85} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground))" strokeOpacity={0.15} />
                      <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted-foreground))", fillOpacity: 0.06 }} />
                      <Bar dataKey="count" fill="url(#loanBarGradientTeal)" radius={[6, 6, 0, 0]} animationDuration={800} animationEasing="ease-out" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
