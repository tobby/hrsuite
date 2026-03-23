import { useRoute, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import {
  Mail,
  Phone,
  Building2,
  Calendar,
  Loader2,
  Hash,
  Cake,
  MapPin,
  ArrowLeft,
  Pencil,
  Star,
  ClipboardList,
  AlertTriangle,
  ExternalLink,
  CalendarDays,
  GraduationCap,
  Banknote,
} from "lucide-react";
import { useRole, canManageEmployees } from "@/lib/role-context";
import { useQuery } from "@tanstack/react-query";
import type { Employee, Department, HrQuery, Appraisal, AppraisalCycle, LeaveRequest, LeaveType, LdRequest, LoanRequest } from "@shared/schema";
import { Link as WouterLink } from "wouter";

const statusStyles: Record<string, string> = {
  invited: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  inactive: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
  on_leave: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

const statusLabels: Record<string, string> = {
  invited: "Invited",
  active: "Active",
  inactive: "Inactive",
  on_leave: "On Leave",
};

const requestStatusStyles: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  manager_approved: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  cancelled: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
  in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
};

const queryStatusStyles: Record<string, string> = {
  open: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  resolved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  escalated: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const queryPriorityStyles: Record<string, string> = {
  low: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0 }).format(amount);
}

export default function EmployeeProfile() {
  const [, params] = useRoute("/employees/:id");
  const [, navigate] = useLocation();
  const { role, currentUser } = useRole();
  const employeeId = params?.id;

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
  });

  const employee = employees.find((e) => e.id === employeeId);
  const department = employee?.departmentId ? departments.find((d) => d.id === employee.departmentId) : null;
  const manager = employee?.managerId ? employees.find((e) => e.id === employee.managerId) : null;

  const isOwnProfile = employeeId === currentUser.id;
  const isDirectReport = role === "manager" && employee?.managerId === currentUser.id;
  const isAdmin = role === "admin";
  const canViewRequests = isAdmin || isDirectReport || isOwnProfile;
  const canViewLoans = isAdmin || isOwnProfile;
  const canViewQueries = isAdmin || isDirectReport;

  // Leave requests
  const { data: leaveRequests = [], isLoading: loadingLeave } = useQuery<LeaveRequest[]>({
    queryKey: ["/api/employees", employeeId, "leave-requests"],
    queryFn: async () => {
      const res = await fetch(`/api/employees/${employeeId}/leave-requests`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: canViewRequests && !!employeeId,
    retry: false,
  });

  const { data: leaveTypes = [] } = useQuery<LeaveType[]>({
    queryKey: ["/api/leave-types"],
  });

  // L&D requests
  const { data: ldRequests = [], isLoading: loadingLd } = useQuery<LdRequest[]>({
    queryKey: ["/api/employees", employeeId, "ld-requests"],
    queryFn: async () => {
      const res = await fetch(`/api/employees/${employeeId}/ld-requests`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: canViewRequests && !!employeeId,
    retry: false,
  });

  // Loan requests
  const { data: loanRequests = [], isLoading: loadingLoans } = useQuery<LoanRequest[]>({
    queryKey: ["/api/employees", employeeId, "loan-requests"],
    queryFn: async () => {
      const res = await fetch(`/api/employees/${employeeId}/loan-requests`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: canViewLoans && !!employeeId,
    retry: false,
  });

  // Appraisals
  const { data: appraisals = [], isLoading: loadingAppraisals } = useQuery<Appraisal[]>({
    queryKey: ["/api/employees", employeeId, "appraisals"],
    queryFn: async () => {
      const res = await fetch(`/api/employees/${employeeId}/appraisals`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: canViewRequests && !!employeeId,
    retry: false,
  });

  const { data: cycles = [] } = useQuery<AppraisalCycle[]>({
    queryKey: ["/api/appraisal-cycles"],
  });

  // Queries
  const { data: queries = [], isLoading: loadingQueries } = useQuery<HrQuery[]>({
    queryKey: [`/api/employees/${employeeId}/queries`],
    enabled: canViewQueries && !!employeeId,
    retry: false,
  });

  if (!employee) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  function getCycleName(cycleId: string) {
    return cycles.find((c) => c.id === cycleId)?.name || "Review Cycle";
  }

  function getLeaveTypeName(id: string) {
    return leaveTypes.find((t) => t.id === id)?.name || "Leave";
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/employees")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold tracking-tight">Employee Profile</h1>
          <p className="text-muted-foreground">View employee details and records</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Profile info */}
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                    {employee.firstName[0]}{employee.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold">{employee.firstName} {employee.lastName}</h2>
                  <p className="text-sm text-muted-foreground">{employee.position}</p>
                  <Badge variant="secondary" className={statusStyles[employee.status]}>
                    {statusLabels[employee.status]}
                  </Badge>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Employee ID</Label>
                  <div className="flex items-center gap-2 text-sm font-mono">
                    <Hash className="h-4 w-4 text-muted-foreground" />
                    {employee.employeeId || "—"}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    {employee.email}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Phone</Label>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    {employee.phone || "—"}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Department</Label>
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    {department?.name || "—"}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Hire Date</Label>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    {employee.hireDate ? new Date(employee.hireDate).toLocaleDateString() : "—"}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Manager</Label>
                  <p className="text-sm">
                    {manager ? `${manager.firstName} ${manager.lastName}` : "—"}
                  </p>
                </div>

                {isAdmin && (
                  <>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Date of Birth</Label>
                      <div className="flex items-center gap-2 text-sm">
                        <Cake className="h-4 w-4 text-muted-foreground" />
                        {(employee as any).dateOfBirth
                          ? new Date((employee as any).dateOfBirth).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
                          : "Not set"}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Home Address</Label>
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        {(employee as any).homeAddress || "Not set"}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column - Records */}
        <div className="lg:col-span-2 space-y-6">
          {/* Leave Requests */}
          {canViewRequests && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  Leave Requests
                  {!loadingLeave && <Badge variant="secondary">{leaveRequests.length}</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingLeave ? (
                  <div className="flex items-center justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
                ) : leaveRequests.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">No leave requests found.</p>
                ) : (
                  <div className="space-y-2">
                    {leaveRequests.map((r) => (
                      <div key={r.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                        <div className="space-y-1 min-w-0 flex-1">
                          <p className="text-sm font-medium">{getLeaveTypeName(r.leaveTypeId)}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="secondary" className={`text-xs ${requestStatusStyles[r.status] || ""}`}>
                              {r.status.replace(/_/g, " ")}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{r.startDate} — {r.endDate}</span>
                            {r.totalDays != null && <span className="text-xs text-muted-foreground">({r.totalDays}d)</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* L&D Requests */}
          {canViewRequests && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-muted-foreground" />
                  L&D Requests
                  {!loadingLd && <Badge variant="secondary">{ldRequests.length}</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingLd ? (
                  <div className="flex items-center justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
                ) : ldRequests.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">No L&D requests found.</p>
                ) : (
                  <div className="space-y-2">
                    {ldRequests.map((r) => (
                      <div key={r.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                        <div className="space-y-1 min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{r.courseTitle}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="secondary" className={`text-xs ${requestStatusStyles[r.status] || ""}`}>
                              {r.status.replace(/_/g, " ")}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{r.trainingProvider}</span>
                            <span className="text-xs text-muted-foreground">{r.startDate} — {r.endDate}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Appraisals */}
          {canViewRequests && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-muted-foreground" />
                  Performance Appraisals
                  {!loadingAppraisals && <Badge variant="secondary">{appraisals.length}</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingAppraisals ? (
                  <div className="flex items-center justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
                ) : appraisals.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">No appraisals found.</p>
                ) : (
                  <div className="space-y-2">
                    {appraisals.map((a) => (
                      <WouterLink key={a.id} href={a.status === "completed" ? `/appraisals/results/${a.id}` : `/appraisals`}>
                        <div className="flex items-center justify-between gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                          <div className="space-y-1 min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{getCycleName(a.cycleId)}</p>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="secondary" className={`text-xs ${requestStatusStyles[a.status] || ""}`}>
                                {a.status.replace(/_/g, " ")}
                              </Badge>
                              {a.overallRating != null && (
                                <div className="flex items-center gap-1">
                                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                  <span className="text-xs font-medium">{(a.overallRating / 100).toFixed(1)}/5</span>
                                </div>
                              )}
                              <span className="text-xs text-muted-foreground">
                                {a.createdAt ? new Date(a.createdAt).toLocaleDateString() : ""}
                              </span>
                            </div>
                          </div>
                          <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
                        </div>
                      </WouterLink>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Loan Requests */}
          {canViewLoans && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-muted-foreground" />
                  Loan Requests
                  {!loadingLoans && <Badge variant="secondary">{loanRequests.length}</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingLoans ? (
                  <div className="flex items-center justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
                ) : loanRequests.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">No loan requests found.</p>
                ) : (
                  <div className="space-y-2">
                    {loanRequests.map((r) => (
                      <div key={r.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                        <div className="space-y-1 min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{r.purpose}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="secondary" className={`text-xs ${requestStatusStyles[r.status] || ""}`}>
                              {r.status}
                            </Badge>
                            <span className="text-xs font-medium">{formatCurrency(r.amountRequested)}</span>
                            <span className="text-xs text-muted-foreground">{r.repaymentDuration}mo</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Disciplinary Queries */}
          {canViewQueries && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                  Disciplinary Queries
                  {!loadingQueries && <Badge variant="secondary">{queries.length}</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingQueries ? (
                  <div className="flex items-center justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
                ) : queries.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">No disciplinary queries found.</p>
                ) : (
                  <div className="space-y-2">
                    {queries.map((q) => (
                      <WouterLink key={q.id} href={`/queries/${q.id}`}>
                        <div className="flex items-center justify-between gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                          <div className="space-y-1 min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{q.subject}</p>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="secondary" className={`text-xs ${queryStatusStyles[q.status] || ""}`}>
                                {q.status.replace(/_/g, " ")}
                              </Badge>
                              <Badge variant="secondary" className={`text-xs ${queryPriorityStyles[q.priority] || ""}`}>
                                {q.priority}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {q.createdAt ? new Date(q.createdAt).toLocaleDateString() : "—"}
                              </span>
                            </div>
                          </div>
                          <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
                        </div>
                      </WouterLink>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
