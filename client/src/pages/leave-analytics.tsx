import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Inbox, Check, X, Info, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend } from "recharts";
import { useRole, canEditOrgSettings, canViewAllRequests } from "@/lib/role-context";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { LeaveRequest, LeaveType, Employee, Department } from "@shared/schema";

function getLeaveTypeName(leaveTypeId: string, leaveTypes: LeaveType[] | undefined) {
  if (!leaveTypes) return leaveTypeId;
  const lt = leaveTypes.find((t) => t.id === leaveTypeId);
  return lt ? lt.name : leaveTypeId;
}

export default function LeaveAnalytics() {
  const { role } = useRole();
  const [, navigate] = useLocation();

  if (!canEditOrgSettings(role)) {
    navigate("/leave");
    return null;
  }

  const currentYear = new Date().getFullYear();

  const { data: allRequests, isLoading: loadingAll } = useQuery<LeaveRequest[]>({
    queryKey: ["/api/leave-requests/all"],
    enabled: canViewAllRequests(role),
  });

  const { data: leaveTypes } = useQuery<LeaveType[]>({
    queryKey: ["/api/leave-types"],
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
  const avgDays = totalRequests > 0 ? (currentYearRequests.reduce((sum, r) => sum + (r.totalDays || 0), 0) / totalRequests).toFixed(1) : "0";

  const usageByType: Record<string, number> = {};
  currentYearRequests.forEach((r) => {
    usageByType[r.leaveTypeId] = (usageByType[r.leaveTypeId] || 0) + 1;
  });
  const usageByTypeData = Object.entries(usageByType).map(([id, count]) => ({
    name: getLeaveTypeName(id, leaveTypes),
    count,
  }));

  const statusCounts: Record<string, number> = {};
  currentYearRequests.forEach((r) => {
    statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
  });
  const statusLabels: Record<string, string> = {
    pending: "Pending",
    manager_approved: "Manager Approved",
    approved: "Approved",
    rejected: "Rejected",
    cancelled: "Cancelled",
  };
  const statusColors = ["#3b82f6", "#6366f1", "#22c55e", "#ef4444", "#a1a1aa"];
  const statusOrder = ["pending", "manager_approved", "approved", "rejected", "cancelled"];
  const statusData = statusOrder
    .filter((s) => statusCounts[s])
    .map((s) => ({
      name: statusLabels[s] || s,
      value: statusCounts[s],
      color: statusColors[statusOrder.indexOf(s)],
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
    const radius = outerRadius + 25;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill="hsl(var(--muted-foreground))" textAnchor={x > cx ? "start" : "end"} dominantBaseline="central" fontSize={12}>
        {`${name} (${value})`}
      </text>
    );
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-leave-analytics-title">
            Leave Analytics
          </h1>
        </div>
        <p className="text-muted-foreground">
          View leave usage statistics and trends across the organization
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
                Leave analytics will appear here once there are leave requests.
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
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
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
            <Card data-testid="card-avg-days">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Days Per Request</CardTitle>
                <Info className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-avg-days">{avgDays}</div>
                <p className="text-xs text-muted-foreground">Average leave duration</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card data-testid="card-usage-by-type">
              <CardHeader>
                <CardTitle className="text-base">Leave Usage by Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]" data-testid="chart-usage-by-type">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={usageByTypeData}>
                      <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))" }} fontSize={12} />
                      <YAxis tick={{ fill: "hsl(var(--muted-foreground))" }} fontSize={12} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
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
                      <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={renderCustomLabel}>
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
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
                    <LineChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))" }} fontSize={12} />
                      <YAxis tick={{ fill: "hsl(var(--muted-foreground))" }} fontSize={12} allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} name="Requests" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <Card data-testid="card-leave-by-department">
              <CardHeader>
                <CardTitle className="text-base">Leave by Department</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]" data-testid="chart-leave-by-department">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={deptData}>
                      <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))" }} fontSize={12} />
                      <YAxis tick={{ fill: "hsl(var(--muted-foreground))" }} fontSize={12} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
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
