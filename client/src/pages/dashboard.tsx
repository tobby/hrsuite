import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";
import { useRole, canApproveLeave, canAccessLeave } from "@/lib/role-context";
import type { Employee, Department } from "@shared/schema";

export default function Dashboard() {
  const { role, currentUser } = useRole();

  const { data: employees = [], isLoading: isLoadingEmployees } = useQuery<Employee[]>({
    queryKey: ['/api/employees'],
  });

  const { data: departments = [], isLoading: isLoadingDepartments } = useQuery<Department[]>({
    queryKey: ['/api/departments'],
  });

  const isLoading = isLoadingEmployees || isLoadingDepartments;

  const activeEmployees = employees.filter(e => e.status === "active").length;
  const teamMembers = employees.filter(e => e.managerId === currentUser.id);

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
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-dashboard-title">
          {getGreeting()}
        </h1>
        <p className="text-muted-foreground" data-testid="text-dashboard-subtitle">
          {getSubtitle()}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {role === "employee" && (
          <>
            <Card data-testid="card-stat-pending-requests">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">Awaiting approval</p>
              </CardContent>
            </Card>

            <Card data-testid="card-stat-days-used">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Days Used</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
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
              <div className="text-2xl font-bold">0</div>
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
            <div className="text-2xl font-bold">0</div>
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
                <CardDescription>Your available leave for 2026</CardDescription>
              </div>
              <Link href="/leave">
                <Button variant="ghost" size="sm" data-testid="button-view-all-leave">
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Inbox className="h-10 w-10 text-muted-foreground/50 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No leave balances yet</p>
                <p className="text-xs text-muted-foreground mt-1">Leave types and balances will appear here once configured.</p>
              </div>
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
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Inbox className="h-10 w-10 text-muted-foreground/50 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No leave requests yet</p>
                <p className="text-xs text-muted-foreground mt-1">Your leave requests will appear here.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {canApproveLeave(role) && (
          <Card data-testid="card-pending-approvals">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
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
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Inbox className="h-10 w-10 text-muted-foreground/50 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No pending approvals</p>
                <p className="text-xs text-muted-foreground mt-1">Leave requests needing your review will appear here.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

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
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Inbox className="h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">
                {role === "employee" ? "No appraisals yet" : "No active review cycles"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {role === "employee" 
                  ? "Your performance reviews will appear here." 
                  : "Review cycles will appear here once created."}
              </p>
            </div>
          </CardContent>
        </Card>

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
