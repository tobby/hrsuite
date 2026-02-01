import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BarChart3 } from "lucide-react";
import { useRole, canEditOrgSettings } from "@/lib/role-context";
import { useLocation } from "wouter";
import { 
  leaveRequests, 
  leaveTypes, 
  employees, 
  departments,
} from "@/lib/demo-data";

export default function LeaveAnalytics() {
  const { role } = useRole();
  const [, navigate] = useLocation();

  if (!canEditOrgSettings(role)) {
    navigate("/leave");
    return null;
  }

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

      <div className="grid gap-4 md:grid-cols-3">
        <Card data-testid="card-analytics-by-type">
          <CardHeader>
            <CardTitle className="text-lg">Usage by Leave Type</CardTitle>
            <CardDescription>Total days used per leave type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {leaveTypes.map((type) => {
                const totalUsed = leaveRequests
                  .filter((r) => r.leaveTypeId === type.id && r.status === "approved")
                  .reduce((sum, r) => sum + r.totalDays, 0);
                const maxDays = type.defaultDays * employees.length;
                const percentage = Math.min((totalUsed / maxDays) * 100, 100);
                return (
                  <div key={type.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: type.color }} />
                        <span className="text-sm font-medium">{type.name}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{totalUsed} days</span>
                    </div>
                    <Progress value={percentage} className="h-2" style={{ backgroundColor: `${type.color}20` }} />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-analytics-by-dept">
          <CardHeader>
            <CardTitle className="text-lg">Leave by Department</CardTitle>
            <CardDescription>Distribution across departments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {departments.map((dept) => {
                const deptEmployees = employees.filter((e) => e.departmentId === dept.id);
                const totalDays = leaveRequests
                  .filter((r) => deptEmployees.some((e) => e.id === r.employeeId) && r.status === "approved")
                  .reduce((sum, r) => sum + r.totalDays, 0);
                return (
                  <div key={dept.id} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{dept.name}</span>
                    <Badge variant="secondary">{totalDays} days</Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-analytics-summary">
          <CardHeader>
            <CardTitle className="text-lg">Leave Summary</CardTitle>
            <CardDescription>Overall statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Requests (2026)</span>
                <span className="text-lg font-bold">{leaveRequests.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Approved</span>
                <span className="text-lg font-bold text-emerald-600">
                  {leaveRequests.filter((r) => r.status === "approved").length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Pending</span>
                <span className="text-lg font-bold text-amber-600">
                  {leaveRequests.filter((r) => r.status === "pending").length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Rejected</span>
                <span className="text-lg font-bold text-red-600">
                  {leaveRequests.filter((r) => r.status === "rejected").length}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-sm text-muted-foreground">Total Days Approved</span>
                <span className="text-lg font-bold">
                  {leaveRequests.filter((r) => r.status === "approved").reduce((sum, r) => sum + r.totalDays, 0)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card data-testid="card-analytics-monthly">
          <CardHeader>
            <CardTitle className="text-lg">Monthly Trends</CardTitle>
            <CardDescription>Leave requests by month in 2026</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {["January", "February", "March", "April", "May", "June"].map((month, idx) => {
                const monthNum = idx + 1;
                const monthRequests = leaveRequests.filter((r) => {
                  const startMonth = new Date(r.startDate).getMonth() + 1;
                  return startMonth === monthNum;
                });
                const totalDays = monthRequests.reduce((sum, r) => sum + r.totalDays, 0);
                const maxDays = 50;
                const percentage = Math.min((totalDays / maxDays) * 100, 100);
                return (
                  <div key={month} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>{month}</span>
                      <span className="text-muted-foreground">{totalDays} days ({monthRequests.length} requests)</span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-analytics-top-users">
          <CardHeader>
            <CardTitle className="text-lg">Top Leave Users</CardTitle>
            <CardDescription>Employees with most leave days taken</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {employees
                .map((emp) => {
                  const totalDays = leaveRequests
                    .filter((r) => r.employeeId === emp.id && r.status === "approved")
                    .reduce((sum, r) => sum + r.totalDays, 0);
                  return { ...emp, totalDays };
                })
                .sort((a, b) => b.totalDays - a.totalDays)
                .slice(0, 5)
                .map((emp, idx) => (
                  <div key={emp.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-4">{idx + 1}.</span>
                      <span className="font-medium">{emp.firstName} {emp.lastName}</span>
                    </div>
                    <Badge variant="secondary">{emp.totalDays} days</Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
