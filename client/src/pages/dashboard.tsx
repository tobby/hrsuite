import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { 
  Users, 
  CalendarCheck, 
  ClipboardList, 
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Building2,
  ArrowRight,
} from "lucide-react";
import { useRole, canApproveLeave } from "@/lib/role-context";
import { 
  employees, 
  departments,
  leaveBalances, 
  leaveTypes, 
  leaveRequests,
  appraisals,
  appraisalCycles,
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
  const { role, currentUser } = useRole();

  const activeEmployees = employees.filter(e => e.status === "active").length;
  const pendingLeaveRequests = leaveRequests.filter(r => r.status === "pending").length;
  const activeAppraisals = appraisals.filter(a => a.status === "in_progress" || a.status === "pending").length;
  
  // User-specific data
  const userLeaveBalances = leaveBalances.filter(b => b.employeeId === currentUser.id);
  const myLeaveRequests = leaveRequests.filter(r => r.employeeId === currentUser.id);
  const myAppraisals = appraisals.filter(a => a.employeeId === currentUser.id);

  // Get team members for manager view
  const teamMembers = employees.filter(e => e.managerId === currentUser.id);
  const teamPendingLeave = leaveRequests.filter(
    r => r.status === "pending" && teamMembers.some(tm => tm.id === r.employeeId)
  );

  // Role-specific greeting
  const getGreeting = () => {
    switch (role) {
      case "admin":
        return "Organization Overview";
      case "manager":
        return `Team Dashboard`;
      default:
        return `Welcome back, ${currentUser.firstName}`;
    }
  };

  const getSubtitle = () => {
    switch (role) {
      case "admin":
        return "Manage the entire organization from here.";
      case "manager":
        return `Manage your team and pending approvals.`;
      default:
        return "Here's your personal HR overview.";
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-dashboard-title">
          {getGreeting()}
        </h1>
        <p className="text-muted-foreground">
          {getSubtitle()}
        </p>
      </div>

      {/* Stats Cards - vary by role */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {(role === "manager" || role === "admin") && (
          <Card data-testid="card-stat-employees">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {role === "manager" ? "Team Members" : "Total Employees"}
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {role === "manager" ? teamMembers.length : employees.length}
              </div>
              <p className="text-xs text-muted-foreground">
                {role === "manager" ? "Direct reports" : `${activeEmployees} active`}
              </p>
            </CardContent>
          </Card>
        )}

        {(role === "manager" || role === "admin") && (
          <Card data-testid="card-stat-pending-leave">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Leave</CardTitle>
              <CalendarCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {role === "manager" ? teamPendingLeave.length : pendingLeaveRequests}
              </div>
              <p className="text-xs text-muted-foreground">
                {role === "manager" ? "Team requests" : "Requests awaiting approval"}
              </p>
            </CardContent>
          </Card>
        )}

        {role === "admin" && (
          <Card data-testid="card-stat-departments">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Departments</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{departments.length}</div>
              <p className="text-xs text-muted-foreground">
                Active departments
              </p>
            </CardContent>
          </Card>
        )}

        <Card data-testid="card-stat-active-appraisals">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {role === "employee" ? "My Reviews" : "Active Appraisals"}
            </CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {role === "employee" ? myAppraisals.length : activeAppraisals}
            </div>
            <p className="text-xs text-muted-foreground">
              {role === "employee" ? "Performance reviews" : "Reviews in progress"}
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-stat-performance">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {role === "employee" ? "My Rating" : "Avg Performance"}
            </CardTitle>
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
        {/* My Leave Balance - All roles */}
        <Card data-testid="card-leave-balance">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">My Leave Balance</CardTitle>
              <CardDescription>Your available leave for 2026</CardDescription>
            </div>
            <Link href="/leave">
              <Button variant="ghost" size="sm" data-testid="button-view-all-leave">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            {(userLeaveBalances.length > 0 ? userLeaveBalances : leaveBalances.slice(0, 3)).map((balance) => {
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

        {/* Recent Leave Requests - Employee View */}
        {role === "employee" && (
          <Card data-testid="card-recent-leave">
            <CardHeader>
              <CardTitle className="text-lg">My Recent Requests</CardTitle>
              <CardDescription>Your latest leave applications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {myLeaveRequests.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No leave requests yet
                  </p>
                ) : (
                  myLeaveRequests.slice(0, 4).map((request) => {
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
                  })
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pending Approvals - Manager/Admin View */}
        {canApproveLeave(role) && (
          <Card data-testid="card-pending-approvals">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Pending Approvals</CardTitle>
                <CardDescription>
                  {role === "manager" ? "Team requests awaiting your review" : "All pending leave requests"}
                </CardDescription>
              </div>
              <Link href="/leave">
                <Button variant="ghost" size="sm" data-testid="button-view-all-approvals">
                  Review All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(() => {
                  const requests = role === "manager" 
                    ? teamPendingLeave 
                    : leaveRequests.filter(r => r.status === "pending");
                  
                  if (requests.length === 0) {
                    return (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No pending approvals
                      </p>
                    );
                  }

                  return requests.slice(0, 4).map((request) => {
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
                  });
                })()}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* My Appraisals - All roles */}
        <Card data-testid="card-my-appraisals">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">
                {role === "employee" ? "My Appraisals" : "Active Review Cycles"}
              </CardTitle>
              <CardDescription>
                {role === "employee" ? "Your performance review status" : "Organization-wide reviews"}
              </CardDescription>
            </div>
            <Link href="/performance">
              <Button variant="ghost" size="sm" data-testid="button-view-all-appraisals">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {role === "employee" ? (
                myAppraisals.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No appraisals yet
                  </p>
                ) : (
                  myAppraisals.map((appraisal) => {
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
                  })
                )
              ) : (
                appraisalCycles.filter(c => c.status === "active").map((cycle) => {
                  const cycleAppraisals = appraisals.filter(a => a.cycleId === cycle.id);
                  const completed = cycleAppraisals.filter(a => a.status === "completed").length;
                  return (
                    <div 
                      key={cycle.id} 
                      className="flex items-center justify-between gap-4"
                      data-testid={`cycle-${cycle.id}`}
                    >
                      <div>
                        <p className="text-sm font-medium">{cycle.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {cycle.type === "180" ? "180° Review" : "360° Review"} • {cycleAppraisals.length} participants
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{completed}/{cycleAppraisals.length}</p>
                        <p className="text-xs text-muted-foreground">Completed</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Team Members - Manager View */}
        {role === "manager" && teamMembers.length > 0 && (
          <Card data-testid="card-team-members">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Your Team</CardTitle>
                <CardDescription>Direct reports</CardDescription>
              </div>
              <Link href="/employees">
                <Button variant="ghost" size="sm" data-testid="button-view-all-team">
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {teamMembers.slice(0, 5).map((member) => (
                  <div 
                    key={member.id} 
                    className="flex items-center justify-between"
                    data-testid={`team-member-${member.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {member.firstName[0]}{member.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{member.firstName} {member.lastName}</p>
                        <p className="text-xs text-muted-foreground">{member.position}</p>
                      </div>
                    </div>
                    <Badge 
                      variant="secondary" 
                      className={
                        member.status === "active" 
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                          : member.status === "on_leave"
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                          : "bg-gray-100 text-gray-700"
                      }
                    >
                      {member.status === "on_leave" ? "On Leave" : member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions - Admin View */}
        {role === "admin" && (
          <Card data-testid="card-admin-actions">
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
              <CardDescription>Common administrative tasks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/employees">
                <Button variant="outline" className="w-full justify-start" data-testid="button-manage-employees">
                  <Users className="mr-2 h-4 w-4" />
                  Manage Employees
                </Button>
              </Link>
              <Link href="/departments">
                <Button variant="outline" className="w-full justify-start" data-testid="button-manage-departments">
                  <Building2 className="mr-2 h-4 w-4" />
                  Manage Departments
                </Button>
              </Link>
              <Link href="/performance">
                <Button variant="outline" className="w-full justify-start" data-testid="button-create-review-cycle">
                  <ClipboardList className="mr-2 h-4 w-4" />
                  Create Review Cycle
                </Button>
              </Link>
              <Link href="/leave">
                <Button variant="outline" className="w-full justify-start" data-testid="button-view-leave-requests">
                  <CalendarCheck className="mr-2 h-4 w-4" />
                  View All Leave Requests
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
