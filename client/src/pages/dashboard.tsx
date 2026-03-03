import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { 
  Users, 
  CalendarCheck, 
  ClipboardList, 
  TrendingUp,
  Clock,
  Building2,
  ArrowRight,
  Calendar,
  FileText,
  Settings,
  Send,
  Inbox,
  Loader2,
  Palmtree,
  AlertTriangle,
  CheckCircle2,
  MessageSquareWarning,
} from "lucide-react";
import { useRole, canApproveLeave, canAccessLeave } from "@/lib/role-context";
import type { Employee, Department, LeaveRequest, LeaveBalance, LeaveType, AppraisalCycle, Appraisal, HrQuery, TaskAssignment, TaskCompletion } from "@shared/schema";
import { Badge } from "@/components/ui/badge";

function parseItems(str: string): { id: string; title: string }[] {
  try { return JSON.parse(str); } catch { return []; }
}

export default function Dashboard() {
  const { role, currentUser } = useRole();

  const { data: employees = [], isLoading: isLoadingEmployees } = useQuery<Employee[]>({
    queryKey: ['/api/employees'],
  });

  const { data: departments = [], isLoading: isLoadingDepartments } = useQuery<Department[]>({
    queryKey: ['/api/departments'],
  });

  const currentYear = new Date().getFullYear();

  const { data: leaveRequests = [] } = useQuery<LeaveRequest[]>({
    queryKey: ['/api/leave-requests'],
    enabled: canAccessLeave(role),
  });

  const { data: pendingRequests = [] } = useQuery<LeaveRequest[]>({
    queryKey: ['/api/leave-requests/pending'],
    enabled: canApproveLeave(role),
  });

  const { data: leaveBalances = [] } = useQuery<LeaveBalance[]>({
    queryKey: ['/api/leave-balances', `?year=${currentYear}`],
    enabled: canAccessLeave(role),
  });

  const { data: leaveTypes = [] } = useQuery<LeaveType[]>({
    queryKey: ['/api/leave-types'],
    enabled: canAccessLeave(role),
  });

  const { data: onLeaveToday = [] } = useQuery<(LeaveRequest & { employeeName: string; employeePosition: string; leaveTypeName: string })[]>({
    queryKey: ['/api/leave-requests/on-leave-today'],
  });

  const { data: appraisalCycles = [] } = useQuery<AppraisalCycle[]>({
    queryKey: ['/api/appraisal-cycles'],
    enabled: role === "admin" || role === "manager",
  });

  const { data: myAppraisals = [] } = useQuery<Appraisal[]>({
    queryKey: ['/api/appraisals'],
    enabled: role === "employee",
  });

  const { data: hrQueries = [] } = useQuery<HrQuery[]>({
    queryKey: ['/api/hr-queries'],
    enabled: role !== "contract",
  });

  const { data: taskAssignments = [] } = useQuery<TaskAssignment[]>({
    queryKey: ['/api/task-assignments'],
    enabled: role === "admin" || role === "manager",
  });

  const { data: myTaskAssignments = [] } = useQuery<TaskAssignment[]>({
    queryKey: ['/api/my-task-assignments'],
    enabled: role === "employee",
  });

  const { data: myTaskCompletions = [] } = useQuery<TaskCompletion[]>({
    queryKey: ['/api/my-task-completions'],
    enabled: role === "employee",
  });

  const isLoading = isLoadingEmployees || isLoadingDepartments;

  const activeEmployees = employees.filter(e => e.status === "active").length;
  const teamMembers = employees.filter(e => e.managerId === currentUser.id);

  const myPendingCount = leaveRequests.filter(r => r.status === "pending").length;
  const totalDaysUsed = leaveBalances.reduce((sum, b) => sum + b.usedDays, 0);
  const pendingApprovalCount = pendingRequests.length;

  const activeCycles = appraisalCycles.filter(c => c.status === "active");
  const activeAppraisalCount = role === "employee"
    ? myAppraisals.filter(a => a.status === "pending" || a.status === "in_progress").length
    : activeCycles.length;

  const pendingHrQueries = hrQueries.filter(q => q.status === "open" || q.status === "pending" || q.status === "in_progress");
  const myPendingQueries = role === "employee"
    ? hrQueries.filter(q => q.employeeId === currentUser.id && (q.status === "open" || q.status === "pending" || q.status === "in_progress"))
    : pendingHrQueries;

  const pendingTaskAssignments = (role === "admin" || role === "manager")
    ? taskAssignments
    : myTaskAssignments;

  const myPendingTaskItems = role === "employee"
    ? myTaskAssignments.reduce((sum, a) => {
        const items = parseItems(a.items);
        const completedIds = myTaskCompletions.filter(c => c.assignmentId === a.id && c.completed).map(c => c.itemId);
        return sum + items.filter(item => !completedIds.includes(item.id)).length;
      }, 0)
    : 0;

  const getGreeting = () => {
    switch (role) {
      case "admin":
        return "Organization Overview";
      case "manager":
        return "Team Dashboard";
      default:
        return `Welcome back, ${currentUser.firstName}`;
    }
  };

  const getSubtitle = () => {
    switch (role) {
      case "admin":
        return "Manage the entire organization from here.";
      case "manager":
        return "Manage your team and pending approvals.";
      default:
        return "Here's your personal HR overview.";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight" data-testid="text-dashboard-title">
          {getGreeting()}
        </h1>
        <p className="text-muted-foreground" data-testid="text-dashboard-subtitle">
          {getSubtitle()}
        </p>
      </div>

      {/* 1. Stats Overview */}
      <div className={`grid gap-4 md:grid-cols-2 ${role === "admin" ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
        {role === "employee" && (
          <>
            <Card data-testid="card-stat-pending-requests">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{myPendingCount}</div>
                <p className="text-xs text-muted-foreground">Awaiting approval</p>
              </CardContent>
            </Card>

            <Card data-testid="card-stat-days-used">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Days Used</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalDaysUsed}</div>
                <p className="text-xs text-muted-foreground">This year</p>
              </CardContent>
            </Card>
          </>
        )}

        {(role === "manager" || role === "admin") && (
          <Card data-testid="card-stat-employees">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {role === "manager" ? "Team Members" : "Total Employees"}
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-stat-employees-count">
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
              <div className="text-2xl font-bold">{pendingApprovalCount}</div>
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
              <div className="text-2xl font-bold" data-testid="text-stat-departments-count">
                {departments.length}
              </div>
              <p className="text-xs text-muted-foreground">Active departments</p>
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
            <div className="text-2xl font-bold" data-testid="text-stat-active-appraisals-count">{activeAppraisalCount}</div>
            <p className="text-xs text-muted-foreground">
              {role === "employee" ? "Performance reviews" : "Reviews in progress"}
            </p>
          </CardContent>
        </Card>

        {(role === "contract") && (
          <Card data-testid="card-stat-employees">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Your Role</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-base">Contract</div>
              <p className="text-xs text-muted-foreground">{currentUser.position}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 2. Pending Items Requiring Action */}
      {role !== "contract" && (
        <div className="grid gap-6 lg:grid-cols-3">
          {canApproveLeave(role) && (
            <Card data-testid="card-pending-approvals">
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-lg">Pending Leave</CardTitle>
                  <CardDescription>
                    {role === "manager" ? "Team requests to review" : "Requests awaiting approval"}
                  </CardDescription>
                </div>
                <Link href="/leave">
                  <Button variant="ghost" size="sm" data-testid="button-view-all-approvals">
                    Review
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {pendingRequests.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <CheckCircle2 className="h-8 w-8 text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">No pending approvals</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingRequests.slice(0, 5).map((req) => {
                      const emp = employees.find(e => e.id === req.employeeId);
                      const lt = leaveTypes.find(t => t.id === req.leaveTypeId);
                      return (
                        <div key={req.id} className="flex items-center justify-between" data-testid={`pending-approval-${req.id}`}>
                          <div>
                            <p className="text-sm font-medium">{emp ? `${emp.firstName} ${emp.lastName}` : "Employee"}</p>
                            <p className="text-xs text-muted-foreground">
                              {lt?.name || "Leave"} &middot; {req.totalDays} day{req.totalDays !== 1 ? "s" : ""}
                            </p>
                          </div>
                          <Link href="/leave">
                            <Button variant="outline" size="sm" data-testid={`button-review-${req.id}`}>
                              Review
                            </Button>
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card data-testid="card-pending-tasks">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle className="text-lg">Pending Tasks</CardTitle>
                <CardDescription>
                  {role === "employee" ? "Your incomplete task items" : "Active task assignments"}
                </CardDescription>
              </div>
              <Link href={role === "employee" ? "/onboarding/my-tasks" : "/onboarding/tracker"}>
                <Button variant="ghost" size="sm" data-testid="button-view-all-tasks">
                  {role === "employee" ? "My Tasks" : "Tracker"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {role === "employee" ? (
                myTaskAssignments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <CheckCircle2 className="h-8 w-8 text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">No tasks assigned</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myTaskAssignments.slice(0, 5).map((a) => {
                      const items = parseItems(a.items);
                      const completedIds = myTaskCompletions.filter(c => c.assignmentId === a.id && c.completed).map(c => c.itemId);
                      const pendingCount = items.filter(item => !completedIds.includes(item.id)).length;
                      const progressPercent = items.length > 0 ? Math.round(((items.length - pendingCount) / items.length) * 100) : 0;
                      return (
                        <div key={a.id} className="space-y-1" data-testid={`pending-task-${a.id}`}>
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium truncate">{a.title}</p>
                            <span className="text-xs text-muted-foreground shrink-0">{pendingCount} pending</span>
                          </div>
                          <Progress value={progressPercent} className="h-1.5" />
                        </div>
                      );
                    })}
                    {myPendingTaskItems > 0 && (
                      <p className="text-xs text-muted-foreground">{myPendingTaskItems} total items remaining</p>
                    )}
                  </div>
                )
              ) : (
                pendingTaskAssignments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <CheckCircle2 className="h-8 w-8 text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">No active assignments</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingTaskAssignments.slice(0, 5).map((a) => {
                      const items = parseItems(a.items);
                      const target = a.targetEmployeeId ? employees.find(e => e.id === a.targetEmployeeId) : null;
                      return (
                        <div key={a.id} className="flex items-center justify-between" data-testid={`pending-task-${a.id}`}>
                          <div>
                            <p className="text-sm font-medium truncate">{a.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {target ? `${target.firstName} ${target.lastName}` : a.assignmentType} &middot; {items.length} items
                            </p>
                          </div>
                          <Badge variant="outline" className="text-xs shrink-0">{a.priority}</Badge>
                        </div>
                      );
                    })}
                  </div>
                )
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-pending-queries">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle className="text-lg">Pending Queries</CardTitle>
                <CardDescription>
                  {role === "employee" ? "Queries requiring your response" : "Open HR queries"}
                </CardDescription>
              </div>
              <Link href="/queries">
                <Button variant="ghost" size="sm" data-testid="button-view-all-queries">
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {myPendingQueries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <CheckCircle2 className="h-8 w-8 text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">No pending queries</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {myPendingQueries.slice(0, 5).map((q) => {
                    const emp = employees.find(e => e.id === q.employeeId);
                    return (
                      <div key={q.id} className="flex items-center justify-between" data-testid={`pending-query-${q.id}`}>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{q.subject}</p>
                          <p className="text-xs text-muted-foreground">
                            {role !== "employee" && emp ? `${emp.firstName} ${emp.lastName} · ` : ""}{q.category}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-xs shrink-0 ${
                            q.priority === "high" || q.priority === "urgent"
                              ? "border-red-200 text-red-700 dark:border-red-800 dark:text-red-400"
                              : ""
                          }`}
                        >
                          {q.priority}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* 3. Who's on Leave */}
      <Card data-testid="card-on-leave-today">
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle className="text-lg">Who's on Leave</CardTitle>
            <CardDescription>Employees currently out of office</CardDescription>
          </div>
          <Palmtree className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {onLeaveToday.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <CalendarCheck className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm font-medium text-muted-foreground">No one is on leave today</p>
              <p className="text-xs text-muted-foreground mt-1">Everyone is in the office.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {onLeaveToday.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between" data-testid={`on-leave-${entry.id}`}>
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30 text-xs font-medium text-orange-600 dark:text-orange-400">
                      {entry.employeeName.split(" ").map(n => n[0]).join("")}
                    </div>
                    <div>
                      <p className="text-sm font-medium" data-testid={`text-on-leave-name-${entry.id}`}>{entry.employeeName}</p>
                      <p className="text-xs text-muted-foreground">{entry.employeePosition}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                      {entry.leaveTypeName}
                    </span>
                    <p className="text-xs text-muted-foreground mt-1">
                      Returns {new Date(entry.endDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. Leave Balance / Recent Requests */}
      {role === "employee" && (
        <Card data-testid="card-quick-actions">
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
            <CardDescription>Common tasks at your fingertips</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-3">
              <Link href="/leave">
                <Button 
                  variant="outline" 
                  className="w-full h-auto flex-col gap-2 py-4"
                  data-testid="button-quick-request-leave"
                >
                  <Send className="h-5 w-5 text-primary" />
                  <span>Request Leave</span>
                </Button>
              </Link>
              <Link href="/appraisals">
                <Button 
                  variant="outline" 
                  className="w-full h-auto flex-col gap-2 py-4"
                  data-testid="button-quick-view-performance"
                >
                  <FileText className="h-5 w-5 text-primary" />
                  <span>View Performance</span>
                </Button>
              </Link>
              <Link href="/settings">
                <Button 
                  variant="outline" 
                  className="w-full h-auto flex-col gap-2 py-4"
                  data-testid="button-quick-update-profile"
                >
                  <Settings className="h-5 w-5 text-primary" />
                  <span>Update Profile</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {canAccessLeave(role) && (
          <Card data-testid="card-leave-balance">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle className="text-lg">My Leave Balance</CardTitle>
                <CardDescription>Your available leave for {currentYear}</CardDescription>
              </div>
              <Link href="/leave">
                <Button variant="ghost" size="sm" data-testid="button-view-all-leave">
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {leaveBalances.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Inbox className="h-10 w-10 text-muted-foreground/50 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">No leave balances yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Leave types and balances will appear here once configured.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {leaveBalances.map((balance) => {
                    const lt = leaveTypes.find(t => t.id === balance.leaveTypeId);
                    return (
                      <div key={balance.id} className="flex items-center justify-between" data-testid={`balance-row-${balance.id}`}>
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: lt?.color || "#3b82f6" }} />
                          <span className="text-sm font-medium">{lt?.name || "Leave"}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {balance.remainingDays} / {balance.totalDays} days
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {role === "employee" && (
          <Card data-testid="card-recent-leave">
            <CardHeader>
              <CardTitle className="text-lg">My Recent Requests</CardTitle>
              <CardDescription>Your latest leave applications</CardDescription>
            </CardHeader>
            <CardContent>
              {leaveRequests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Inbox className="h-10 w-10 text-muted-foreground/50 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">No leave requests yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Your leave requests will appear here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {leaveRequests.slice(0, 5).map((req) => {
                    const lt = leaveTypes.find(t => t.id === req.leaveTypeId);
                    return (
                      <div key={req.id} className="flex items-center justify-between" data-testid={`recent-request-${req.id}`}>
                        <div>
                          <p className="text-sm font-medium">{lt?.name || "Leave"}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(req.startDate).toLocaleDateString()} - {new Date(req.endDate).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          req.status === "approved" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                          req.status === "rejected" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                          req.status === "cancelled" ? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" :
                          req.status === "manager_approved" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                          "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                        }`}>
                          {req.status === "manager_approved" ? "Awaiting Admin" : req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* 5. Appraisals / Review Cycles */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card data-testid="card-my-appraisals">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="text-lg">
                {role === "employee" ? "My Appraisals" : "Active Review Cycles"}
              </CardTitle>
              <CardDescription>
                {role === "employee" ? "Your performance review status" : "Organization-wide reviews"}
              </CardDescription>
            </div>
            <Link href="/appraisals">
              <Button variant="ghost" size="sm" data-testid="button-view-all-appraisals">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {role === "employee" ? (
              myAppraisals.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Inbox className="h-10 w-10 text-muted-foreground/50 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">No appraisals yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Your performance reviews will appear here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {myAppraisals.slice(0, 5).map((appraisal) => (
                    <div key={appraisal.id} className="flex items-center justify-between" data-testid={`appraisal-row-${appraisal.id}`}>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Performance Review</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={appraisal.status === "completed" ? "default" : appraisal.status === "pending" || appraisal.status === "in_progress" ? "outline" : "secondary"}>
                          {appraisal.status === "in_progress" ? "In Progress" : appraisal.status.charAt(0).toUpperCase() + appraisal.status.slice(1)}
                        </Badge>
                        <Link href={`/appraisals/${appraisal.id}/results`}>
                          <Button variant="ghost" size="icon" data-testid={`button-view-appraisal-${appraisal.id}`}>
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              activeCycles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Inbox className="h-10 w-10 text-muted-foreground/50 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">No active review cycles</p>
                  <p className="text-xs text-muted-foreground mt-1">Review cycles will appear here once created.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeCycles.slice(0, 5).map((cycle) => (
                    <div key={cycle.id} className="flex items-center justify-between" data-testid={`cycle-row-${cycle.id}`}>
                      <div>
                        <p className="text-sm font-medium" data-testid={`text-cycle-name-${cycle.id}`}>{cycle.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(cycle.startDate).toLocaleDateString()} - {new Date(cycle.endDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="default">Active</Badge>
                        <Link href={`/appraisals/cycles/${cycle.id}`}>
                          <Button variant="ghost" size="icon" data-testid={`button-view-cycle-${cycle.id}`}>
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </CardContent>
        </Card>

        {/* 6. Team / Admin Quick Links */}
        {role === "manager" && (
          <Card data-testid="card-team-members">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
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
              {teamMembers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Inbox className="h-10 w-10 text-muted-foreground/50 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">No team members yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Team members assigned to you will appear here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {teamMembers.slice(0, 5).map((member) => (
                    <div 
                      key={member.id} 
                      className="flex items-center gap-3"
                      data-testid={`team-member-${member.id}`}
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                        {member.firstName[0]}{member.lastName[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{member.firstName} {member.lastName}</p>
                        <p className="text-xs text-muted-foreground">{member.position}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {role === "admin" && (
          <Card data-testid="card-admin-quick-links">
            <CardHeader>
              <CardTitle className="text-lg">Admin Quick Links</CardTitle>
              <CardDescription>Manage your organization</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                <Link href="/employees">
                  <Button 
                    variant="outline" 
                    className="w-full h-auto flex-col gap-2 py-4"
                    data-testid="button-admin-employees"
                  >
                    <Users className="h-5 w-5 text-primary" />
                    <span>Manage Employees</span>
                  </Button>
                </Link>
                <Link href="/departments">
                  <Button 
                    variant="outline" 
                    className="w-full h-auto flex-col gap-2 py-4"
                    data-testid="button-admin-departments"
                  >
                    <Building2 className="h-5 w-5 text-primary" />
                    <span>Manage Departments</span>
                  </Button>
                </Link>
                <Link href="/recruitment/jobs">
                  <Button 
                    variant="outline" 
                    className="w-full h-auto flex-col gap-2 py-4"
                    data-testid="button-admin-recruitment"
                  >
                    <ClipboardList className="h-5 w-5 text-primary" />
                    <span>Recruitment</span>
                  </Button>
                </Link>
                <Link href="/reports">
                  <Button 
                    variant="outline" 
                    className="w-full h-auto flex-col gap-2 py-4"
                    data-testid="button-admin-reports"
                  >
                    <TrendingUp className="h-5 w-5 text-primary" />
                    <span>View Reports</span>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
