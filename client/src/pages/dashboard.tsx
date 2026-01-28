import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Users, 
  CalendarCheck, 
  ClipboardList, 
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { 
  employees, 
  leaveBalances, 
  leaveTypes, 
  leaveRequests,
  appraisals,
  appraisalCycles,
  currentUser,
  getEmployeeById,
  getLeaveTypeById,
  getAppraisalCycleById,
} from "@/lib/demo-data";

const statusColors = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
};

export default function Dashboard() {
  const activeEmployees = employees.filter(e => e.status === "active").length;
  const pendingLeaveRequests = leaveRequests.filter(r => r.status === "pending").length;
  const activeAppraisals = appraisals.filter(a => a.status === "in_progress" || a.status === "pending").length;
  const myLeaveRequests = leaveRequests.filter(r => r.employeeId === currentUser.id);
  const myAppraisals = appraisals.filter(a => a.employeeId === currentUser.id);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-dashboard-title">
          Welcome back, {currentUser.firstName}
        </h1>
        <p className="text-muted-foreground">
          Here's what's happening in your organization today.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-stat-employees">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees.length}</div>
            <p className="text-xs text-muted-foreground">
              {activeEmployees} active
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-stat-pending-leave">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Leave</CardTitle>
            <CalendarCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingLeaveRequests}</div>
            <p className="text-xs text-muted-foreground">
              Requests awaiting approval
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-stat-active-appraisals">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Appraisals</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeAppraisals}</div>
            <p className="text-xs text-muted-foreground">
              Reviews in progress
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-stat-performance">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Performance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4.1</div>
            <p className="text-xs text-muted-foreground">
              Out of 5.0 rating
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* My Leave Balance */}
        <Card data-testid="card-leave-balance">
          <CardHeader>
            <CardTitle className="text-lg">My Leave Balance</CardTitle>
            <CardDescription>Your available leave for 2026</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {leaveBalances.map((balance) => {
              const leaveType = getLeaveTypeById(balance.leaveTypeId);
              if (!leaveType) return null;
              const percentage = (balance.remainingDays / balance.totalDays) * 100;
              return (
                <div key={balance.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="h-3 w-3 rounded-full" 
                        style={{ backgroundColor: leaveType.color }}
                      />
                      <span className="text-sm font-medium">{leaveType.name}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {balance.remainingDays} / {balance.totalDays} days
                    </span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Recent Leave Requests */}
        <Card data-testid="card-recent-leave">
          <CardHeader>
            <CardTitle className="text-lg">Recent Leave Requests</CardTitle>
            <CardDescription>Your latest leave applications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {myLeaveRequests.slice(0, 4).map((request) => {
                const leaveType = getLeaveTypeById(request.leaveTypeId);
                return (
                  <div 
                    key={request.id} 
                    className="flex items-center justify-between gap-4"
                    data-testid={`leave-request-${request.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="h-2 w-2 rounded-full" 
                        style={{ backgroundColor: leaveType?.color }}
                      />
                      <div>
                        <p className="text-sm font-medium">{leaveType?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge 
                      variant="secondary" 
                      className={statusColors[request.status]}
                    >
                      {request.status === "pending" && <Clock className="mr-1 h-3 w-3" />}
                      {request.status === "approved" && <CheckCircle2 className="mr-1 h-3 w-3" />}
                      {request.status === "rejected" && <XCircle className="mr-1 h-3 w-3" />}
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pending Approvals (for managers) */}
        <Card data-testid="card-pending-approvals">
          <CardHeader>
            <CardTitle className="text-lg">Pending Approvals</CardTitle>
            <CardDescription>Leave requests awaiting your review</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {leaveRequests.filter(r => r.status === "pending").slice(0, 4).map((request) => {
                const employee = getEmployeeById(request.employeeId);
                const leaveType = getLeaveTypeById(request.leaveTypeId);
                return (
                  <div 
                    key={request.id} 
                    className="flex items-center justify-between gap-4"
                    data-testid={`pending-approval-${request.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs bg-muted">
                          {employee?.firstName[0]}{employee?.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {employee?.firstName} {employee?.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {leaveType?.name} • {request.totalDays} days
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className={statusColors.pending}>
                      <AlertCircle className="mr-1 h-3 w-3" />
                      Pending
                    </Badge>
                  </div>
                );
              })}
              {leaveRequests.filter(r => r.status === "pending").length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No pending approvals
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* My Appraisals */}
        <Card data-testid="card-my-appraisals">
          <CardHeader>
            <CardTitle className="text-lg">My Appraisals</CardTitle>
            <CardDescription>Your performance review status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {myAppraisals.map((appraisal) => {
                const cycle = getAppraisalCycleById(appraisal.cycleId);
                return (
                  <div 
                    key={appraisal.id} 
                    className="flex items-center justify-between gap-4"
                    data-testid={`appraisal-${appraisal.id}`}
                  >
                    <div>
                      <p className="text-sm font-medium">{cycle?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {cycle?.type === "180" ? "180° Review" : "360° Review"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {appraisal.overallRating && (
                        <span className="text-sm font-medium">
                          {appraisal.overallRating.toFixed(1)}
                        </span>
                      )}
                      <Badge 
                        variant="secondary" 
                        className={statusColors[appraisal.status]}
                      >
                        {appraisal.status === "pending" && <Clock className="mr-1 h-3 w-3" />}
                        {appraisal.status === "in_progress" && <AlertCircle className="mr-1 h-3 w-3" />}
                        {appraisal.status === "completed" && <CheckCircle2 className="mr-1 h-3 w-3" />}
                        {appraisal.status.replace("_", " ").charAt(0).toUpperCase() + appraisal.status.slice(1).replace("_", " ")}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
