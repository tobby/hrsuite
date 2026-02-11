import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TablePagination, usePagination } from "@/components/ui/table-pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Search,
  Plus,
  Mail,
  Phone,
  Building2,
  MoreHorizontal,
  UserCircle,
  Filter,
  List,
  GitBranchPlus,
  Pencil,
  Calendar,
  Loader2,
  Copy,
  Check,
  Link,
  Trash2,
  Hash,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRole, canManageEmployees } from "@/lib/role-context";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Employee, Department, HrQuery, Appraisal, AppraisalCycle } from "@shared/schema";
import { Star, ClipboardList } from "lucide-react";
import { Link as WouterLink } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

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

const deptColors: Record<string, string> = {
  "dept-1": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "dept-2": "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  "dept-3": "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  "dept-4": "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  "dept-5": "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
};

const addEmployeeSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  position: z.string().min(1, "Position is required"),
  role: z.enum(["employee", "manager", "admin", "contract"]),
  departmentId: z.string().nullable(),
  managerId: z.string().nullable(),
  hireDate: z.string().nullable(),
  status: z.enum(["active", "inactive", "on_leave"]).default("active"),
});

type AddEmployeeForm = z.infer<typeof addEmployeeSchema>;

const editEmployeeSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().nullable(),
  position: z.string().min(1, "Position is required"),
  departmentId: z.string().nullable(),
  managerId: z.string().nullable(),
  hireDate: z.string().nullable(),
  status: z.enum(["invited", "active", "inactive", "on_leave"]),
  employeeId: z.string().nullable(),
  role: z.enum(["employee", "manager", "admin", "contract"]),
});

type EditEmployeeForm = z.infer<typeof editEmployeeSchema>;

const queryStatusStyles: Record<string, string> = {
  open: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  in_progress: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  awaiting_response: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  responded: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  resolved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  escalated: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  closed: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
};

const queryPriorityStyles: Record<string, string> = {
  low: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
  medium: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  critical: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

function EmployeeAppraisalsSection({ employeeId }: { employeeId: string }) {
  const { data: appraisals = [], isLoading } = useQuery<Appraisal[]>({
    queryKey: ['/api/employees', employeeId, 'appraisals'],
    queryFn: async () => {
      const res = await fetch(`/api/employees/${employeeId}/appraisals`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    retry: false,
  });

  const { data: cycles = [] } = useQuery<AppraisalCycle[]>({
    queryKey: ['/api/appraisal-cycles'],
  });

  function getCycleName(cycleId: string) {
    const cycle = cycles.find(c => c.id === cycleId);
    return cycle?.name || "Review Cycle";
  }

  const appraisalStatusStyles: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  };

  return (
    <div className="space-y-3 border-t pt-4" data-testid="section-employee-appraisals">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-muted-foreground" />
          <Label className="text-sm font-medium">Performance Appraisals</Label>
          {!isLoading && (
            <Badge variant="secondary" data-testid="text-appraisal-count">{appraisals.length}</Badge>
          )}
        </div>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : appraisals.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2" data-testid="text-no-appraisals">No appraisals found.</p>
      ) : (
        <div className="space-y-2">
          {appraisals.map((a) => (
            <WouterLink key={a.id} href={a.status === "completed" ? `/appraisals/results/${a.id}` : `/appraisals`}>
              <Card className="hover-elevate cursor-pointer" data-testid={`card-appraisal-${a.id}`}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0 flex-1">
                      <p className="text-sm font-medium truncate" data-testid={`text-appraisal-cycle-${a.id}`}>
                        {getCycleName(a.cycleId)}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className={`text-xs ${appraisalStatusStyles[a.status] || ""}`} data-testid={`badge-appraisal-status-${a.id}`}>
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
                    <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  </div>
                </CardContent>
              </Card>
            </WouterLink>
          ))}
        </div>
      )}
    </div>
  );
}

function EmployeeQueriesSection({ employeeId }: { employeeId: string }) {
  const { data: queries = [], isLoading, isError } = useQuery<HrQuery[]>({
    queryKey: [`/api/employees/${employeeId}/queries`],
    retry: false,
  });

  return (
    <div className="space-y-3 border-t pt-4" data-testid="section-employee-queries">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          <Label className="text-sm font-medium">Disciplinary Queries</Label>
          {!isLoading && (
            <Badge variant="secondary" data-testid="text-query-count">{queries.length}</Badge>
          )}
        </div>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : isError ? (
        <p className="text-sm text-muted-foreground py-2">Unable to load queries for this employee.</p>
      ) : queries.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2" data-testid="text-no-queries">No disciplinary queries found.</p>
      ) : (
        <div className="space-y-2">
          {queries.map((q) => (
            <WouterLink key={q.id} href={`/queries/${q.id}`}>
              <Card className="hover-elevate cursor-pointer" data-testid={`card-query-${q.id}`}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0 flex-1">
                      <p className="text-sm font-medium truncate" data-testid={`text-query-subject-${q.id}`}>{q.subject}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className={`text-xs ${queryStatusStyles[q.status] || ""}`} data-testid={`badge-query-status-${q.id}`}>
                          {q.status.replace(/_/g, " ")}
                        </Badge>
                        <Badge variant="secondary" className={`text-xs ${queryPriorityStyles[q.priority] || ""}`} data-testid={`badge-query-priority-${q.id}`}>
                          {q.priority}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {q.createdAt ? new Date(q.createdAt).toLocaleDateString() : "—"}
                        </span>
                      </div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  </div>
                </CardContent>
              </Card>
            </WouterLink>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Employees() {
  const { role, currentUser } = useRole();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteEmployeeName, setInviteEmployeeName] = useState("");
  const [isInviteLinkOpen, setIsInviteLinkOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);

  const { data: allEmployees = [], isLoading: isLoadingEmployees } = useQuery<Employee[]>({
    queryKey: ['/api/employees'],
  });

  const { data: departments = [], isLoading: isLoadingDepartments } = useQuery<Department[]>({
    queryKey: ['/api/departments'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: AddEmployeeForm) => {
      const res = await apiRequest("POST", "/api/employees", data);
      return res.json() as Promise<{ employee: Employee; inviteLink: string }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<EditEmployeeForm> }) => {
      await apiRequest("PATCH", `/api/employees/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/employees/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
    },
  });

  const getDepartmentById = (id: string): Department | undefined => {
    return departments.find((d) => d.id === id);
  };

  const getEmployee = (id: string): Employee | undefined => {
    return allEmployees.find((e) => e.id === id);
  };

  const filteredEmployees = allEmployees.filter((employee) => {
    const matchesSearch =
      `${employee.firstName} ${employee.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.position.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDepartment = departmentFilter === "all" || employee.departmentId === departmentFilter;
    const matchesStatus = statusFilter === "all" || employee.status === statusFilter;

    return matchesSearch && matchesDepartment && matchesStatus;
  });

  const { currentPage, totalPages, paginatedItems, setCurrentPage, totalItems, pageSize } = usePagination(filteredEmployees, 10);

  const openEmployeeDetail = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsDetailOpen(true);
  };

  const openEditDialog = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsDetailOpen(false);
    setIsEditOpen(true);
  };

  const openDeleteDialog = (employee: Employee) => {
    setEmployeeToDelete(employee);
    setIsDeleteOpen(true);
  };

  function OrgNode({ employee, depth, departmentId }: { employee: Employee; depth: number; departmentId: string }) {
    const dept = employee.departmentId ? getDepartmentById(employee.departmentId) : null;
    const reports = allEmployees.filter((e) => e.managerId === employee.id && e.departmentId === departmentId);
    const deptColor = (employee.departmentId && deptColors[employee.departmentId]) || "bg-muted text-muted-foreground";

    return (
      <div className="flex flex-col items-center" data-testid={`org-node-${employee.id}`}>
        <Card
          className="cursor-pointer hover-elevate w-48 p-3"
          onClick={() => openEmployeeDetail(employee)}
          data-testid={`org-card-${employee.id}`}
        >
          <div className="flex flex-col items-center gap-2 text-center">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                {employee.firstName[0]}{employee.lastName[0]}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <p className="font-medium text-sm leading-tight" data-testid={`org-name-${employee.id}`}>
                {employee.firstName} {employee.lastName}
              </p>
              <p className="text-xs text-muted-foreground leading-tight">{employee.position}</p>
              {dept && (
                <Badge variant="secondary" className={`text-xs ${deptColor}`} data-testid={`org-dept-${employee.id}`}>
                  {dept.name}
                </Badge>
              )}
            </div>
          </div>
        </Card>
        {reports.length > 0 && (
          <div className="flex flex-col items-center">
            <div className="w-px h-6 bg-border" />
            <div className="relative flex gap-8">
              {reports.length > 1 && (
                <div
                  className="absolute top-0 border-t border-border"
                  style={{
                    left: "calc(50% - " + ((reports.length - 1) * 128 + (reports.length - 1) * 32) / 2 + "px)",
                    right: "calc(50% - " + ((reports.length - 1) * 128 + (reports.length - 1) * 32) / 2 + "px)",
                  }}
                />
              )}
              {reports.map((r) => (
                <div key={r.id} className="flex flex-col items-center">
                  <div className="w-px h-6 bg-border" />
                  <OrgNode employee={r} depth={depth + 1} departmentId={departmentId} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (isLoadingEmployees || isLoadingDepartments) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-employees-title">
            Employees
          </h1>
          <p className="text-muted-foreground">
            Manage your organization's workforce
          </p>
        </div>
        {canManageEmployees(role) && (
          <Button onClick={() => setIsAddOpen(true)} data-testid="button-add-employee">
            <Plus className="mr-2 h-4 w-4" />
            Add Employee
          </Button>
        )}
      </div>

      <Tabs defaultValue="directory" data-testid="tabs-view-toggle">
        <TabsList data-testid="tabs-list-view">
          <TabsTrigger value="directory" data-testid="tab-directory">
            <List className="mr-2 h-4 w-4" />
            Directory
          </TabsTrigger>
          <TabsTrigger value="organogram" data-testid="tab-organogram">
            <GitBranchPlus className="mr-2 h-4 w-4" />
            Organogram
          </TabsTrigger>
        </TabsList>

        <TabsContent value="directory">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search employees..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                    data-testid="input-search-employees"
                  />
                </div>
                <div className="flex flex-wrap gap-3">
                  <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                    <SelectTrigger className="w-[180px]" data-testid="select-department-filter">
                      <Building2 className="mr-2 h-4 w-4" />
                      <SelectValue placeholder="Department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id} data-testid={`option-dept-${dept.id}`}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[140px]" data-testid="select-status-filter">
                      <Filter className="mr-2 h-4 w-4" />
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" data-testid="option-status-all">All Status</SelectItem>
                      <SelectItem value="invited" data-testid="option-status-invited">Invited</SelectItem>
                      <SelectItem value="active" data-testid="option-status-active">Active</SelectItem>
                      <SelectItem value="inactive" data-testid="option-status-inactive">Inactive</SelectItem>
                      <SelectItem value="on_leave" data-testid="option-status-on-leave">On Leave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee ID</TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Hire Date</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmployees.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                          <p className="text-muted-foreground" data-testid="text-no-employees">No employees found</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedItems.map((employee) => {
                        const department = employee.departmentId ? getDepartmentById(employee.departmentId) : null;
                        return (
                          <TableRow
                            key={employee.id}
                            className="cursor-pointer hover-elevate"
                            onClick={() => openEmployeeDetail(employee)}
                            data-testid={`row-employee-${employee.id}`}
                          >
                            <TableCell data-testid={`text-employee-id-${employee.id}`}>
                              <span className="font-mono text-sm">{employee.employeeId || "—"}</span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9">
                                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                    {employee.firstName[0]}{employee.lastName[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium" data-testid={`text-employee-name-${employee.id}`}>
                                    {employee.firstName} {employee.lastName}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {employee.email}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell data-testid={`text-employee-position-${employee.id}`}>{employee.position}</TableCell>
                            <TableCell data-testid={`text-employee-dept-${employee.id}`}>{department?.name}</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className={statusStyles[employee.status]} data-testid={`badge-employee-status-${employee.id}`}>
                                {statusLabels[employee.status]}
                              </Badge>
                            </TableCell>
                            <TableCell data-testid={`text-employee-hire-${employee.id}`}>
                              {employee.hireDate ? new Date(employee.hireDate).toLocaleDateString() : "—"}
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                  <Button variant="ghost" size="icon" data-testid={`button-employee-menu-${employee.id}`}>
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={(e) => { e.stopPropagation(); openEmployeeDetail(employee); }}
                                    data-testid={`menu-view-profile-${employee.id}`}
                                  >
                                    <UserCircle className="mr-2 h-4 w-4" />
                                    View Profile
                                  </DropdownMenuItem>
                                  {canManageEmployees(role) && (
                                    <DropdownMenuItem
                                      onClick={(e) => { e.stopPropagation(); openEditDialog(employee); }}
                                      data-testid={`menu-edit-employee-${employee.id}`}
                                    >
                                      <Pencil className="mr-2 h-4 w-4" />
                                      Edit
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem
                                    onClick={(e) => e.stopPropagation()}
                                    data-testid={`menu-send-email-${employee.id}`}
                                  >
                                    <Mail className="mr-2 h-4 w-4" />
                                    Send Email
                                  </DropdownMenuItem>
                                  {role === "admin" && (
                                    <DropdownMenuItem
                                      className="text-destructive focus:text-destructive"
                                      onClick={(e) => { e.stopPropagation(); openDeleteDialog(employee); }}
                                      data-testid={`menu-delete-employee-${employee.id}`}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
              <TablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={totalItems}
                pageSize={pageSize}
              />
              <div className="mt-4 text-sm text-muted-foreground" data-testid="text-employee-count">
                Showing {filteredEmployees.length} of {allEmployees.length} employees
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="organogram">
          <div className="space-y-8">
            {departments.map((dept) => {
              const deptColor = deptColors[dept.id] || "bg-muted text-muted-foreground";
              const deptRoots = allEmployees.filter(
                (e) => e.departmentId === dept.id && (e.managerId === null || !allEmployees.find((m) => m.id === e.managerId && m.departmentId === dept.id))
              );
              if (deptRoots.length === 0) return null;
              return (
                <Card key={dept.id} data-testid={`org-department-${dept.id}`}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3 mb-6">
                      <Badge variant="secondary" className={deptColor} data-testid={`org-dept-header-${dept.id}`}>
                        {dept.name}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {allEmployees.filter((e) => e.departmentId === dept.id).length} members
                      </span>
                    </div>
                    <div className="overflow-auto pb-4">
                      <div className="flex gap-16 justify-center min-w-max py-4">
                        {deptRoots.map((root) => (
                          <OrgNode key={root.id} employee={root} depth={0} departmentId={dept.id} />
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" data-testid="dialog-employee-detail">
          {selectedEmployee && (() => {
            const emp = getEmployee(selectedEmployee.id) || selectedEmployee;
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                        {emp.firstName[0]}{emp.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div data-testid="text-detail-employee-name">{emp.firstName} {emp.lastName}</div>
                      <DialogDescription className="font-normal">
                        {emp.position}
                      </DialogDescription>
                    </div>
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Employee ID</Label>
                      <div className="flex items-center gap-2 text-sm font-mono" data-testid="text-detail-employee-id">
                        <Hash className="h-4 w-4 text-muted-foreground" />
                        {emp.employeeId || "—"}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Email</Label>
                      <div className="flex items-center gap-2 text-sm" data-testid="text-detail-email">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {emp.email}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Phone</Label>
                      <div className="flex items-center gap-2 text-sm" data-testid="text-detail-phone">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        {emp.phone}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Department</Label>
                      <div className="flex items-center gap-2 text-sm" data-testid="text-detail-department">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {emp.departmentId ? getDepartmentById(emp.departmentId)?.name : "—"}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Status</Label>
                      <div>
                        <Badge variant="secondary" className={statusStyles[emp.status]} data-testid="text-detail-status">
                          {statusLabels[emp.status]}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Hire Date</Label>
                      <div className="flex items-center gap-2 text-sm" data-testid="text-detail-hire-date">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {emp.hireDate ? new Date(emp.hireDate).toLocaleDateString() : "—"}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Manager</Label>
                      <p className="text-sm" data-testid="text-detail-manager">
                        {emp.managerId
                          ? (() => {
                              const mgr = getEmployee(emp.managerId);
                              return mgr ? `${mgr.firstName} ${mgr.lastName}` : "---";
                            })()
                          : "---"}
                      </p>
                    </div>
                  </div>

                  {(role === "admin" || (role === "manager" && emp.managerId === currentUser.id)) && (
                    <>
                      <EmployeeAppraisalsSection employeeId={emp.id} />
                      <EmployeeQueriesSection employeeId={emp.id} />
                    </>
                  )}

                  <div className="flex gap-2 pt-4">
                    {canManageEmployees(role) && (
                      <Button
                        className="flex-1"
                        onClick={() => openEditDialog(emp)}
                        data-testid="button-edit-employee"
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit Profile
                      </Button>
                    )}
                    <Button variant="outline" onClick={() => setIsDetailOpen(false)} data-testid="button-close-detail">
                      Close
                    </Button>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      <EditEmployeeDialog
        employee={selectedEmployee ? getEmployee(selectedEmployee.id) || selectedEmployee : null}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        allEmployees={allEmployees}
        departments={departments}
        onSave={(id, data) => {
          updateMutation.mutate(
            { id, data },
            {
              onSuccess: () => {
                toast({
                  title: "Employee updated",
                  description: `${data.firstName} ${data.lastName}'s profile has been updated.`,
                });
                setIsEditOpen(false);
              },
              onError: (error) => {
                toast({
                  title: "Error",
                  description: error.message || "Failed to update employee.",
                  variant: "destructive",
                });
              },
            }
          );
        }}
        isSaving={updateMutation.isPending}
      />

      <AddEmployeeDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        allEmployees={allEmployees}
        departments={departments}
        onSave={(data) => {
          createMutation.mutate(data, {
            onSuccess: (result) => {
              toast({
                title: "Employee added",
                description: `${data.firstName} ${data.lastName} has been added.`,
              });
              setIsAddOpen(false);
              if (result?.inviteLink) {
                const fullUrl = `${window.location.origin}${result.inviteLink}`;
                setInviteLink(fullUrl);
                setInviteEmployeeName(`${data.firstName} ${data.lastName}`);
                setCopiedLink(false);
                setIsInviteLinkOpen(true);
              }
            },
            onError: (error) => {
              toast({
                title: "Error",
                description: error.message || "Failed to add employee.",
                variant: "destructive",
              });
            },
          });
        }}
        isSaving={createMutation.isPending}
      />

      <Dialog open={isInviteLinkOpen} onOpenChange={setIsInviteLinkOpen}>
        <DialogContent className="max-w-md" data-testid="dialog-invite-link">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" data-testid="text-invite-dialog-title">
              <Link className="h-5 w-5 text-primary" />
              Invite Link Created
            </DialogTitle>
            <DialogDescription>
              Share this registration link with <span className="font-medium">{inviteEmployeeName}</span> so they can set up their account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={inviteLink || ""}
                className="flex-1 font-mono text-sm"
                data-testid="input-invite-link"
              />
              <Button
                size="icon"
                variant="outline"
                onClick={() => {
                  if (inviteLink) {
                    navigator.clipboard.writeText(inviteLink);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                    toast({
                      title: "Copied",
                      description: "Invite link copied to clipboard.",
                    });
                  }
                }}
                data-testid="button-copy-invite-link"
              >
                {copiedLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              This link will expire after the employee completes their registration.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsInviteLinkOpen(false)} data-testid="button-close-invite-link">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={(open) => { setIsDeleteOpen(open); if (!open) setEmployeeToDelete(null); }}>
        <DialogContent className="max-w-sm" data-testid="dialog-delete-employee">
          <DialogHeader>
            <DialogTitle data-testid="text-delete-dialog-title">Delete Employee</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium">
                {employeeToDelete ? `${employeeToDelete.firstName} ${employeeToDelete.lastName}` : ""}
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsDeleteOpen(false)}
              data-testid="button-cancel-delete"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (employeeToDelete) {
                  deleteMutation.mutate(employeeToDelete.id, {
                    onSuccess: () => {
                      toast({
                        title: "Employee deleted",
                        description: `${employeeToDelete.firstName} ${employeeToDelete.lastName} has been removed.`,
                      });
                      setIsDeleteOpen(false);
                      setEmployeeToDelete(null);
                      if (selectedEmployee?.id === employeeToDelete.id) {
                        setIsDetailOpen(false);
                        setSelectedEmployee(null);
                      }
                    },
                    onError: (error) => {
                      toast({
                        title: "Error",
                        description: error.message || "Failed to delete employee.",
                        variant: "destructive",
                      });
                    },
                  });
                }
              }}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EditEmployeeDialog({
  employee,
  open,
  onOpenChange,
  allEmployees,
  departments,
  onSave,
  isSaving,
}: {
  employee: Employee | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allEmployees: Employee[];
  departments: Department[];
  onSave: (id: string, data: EditEmployeeForm) => void;
  isSaving: boolean;
}) {
  const form = useForm<EditEmployeeForm>({
    resolver: zodResolver(editEmployeeSchema),
    values: employee
      ? {
          firstName: employee.firstName,
          lastName: employee.lastName,
          email: employee.email,
          phone: employee.phone,
          position: employee.position,
          departmentId: employee.departmentId,
          managerId: employee.managerId,
          hireDate: employee.hireDate ?? null,
          status: employee.status as "invited" | "active" | "inactive" | "on_leave",
          employeeId: employee.employeeId,
          role: employee.role as "employee" | "manager" | "admin" | "contract",
        }
      : undefined,
  });

  const onSubmit = (data: EditEmployeeForm) => {
    if (employee) {
      onSave(employee.id, { ...data, hireDate: data.hireDate || null });
    }
  };

  if (!employee) return null;

  const managerOptions = allEmployees.filter(
    (e) => e.id !== employee.id && (e.role === "manager" || e.role === "admin")
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" data-testid="dialog-edit-employee">
        <DialogHeader>
          <DialogTitle data-testid="text-edit-dialog-title">Edit Employee</DialogTitle>
          <DialogDescription>
            Update {employee.firstName} {employee.lastName}'s profile information.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-employeeId">Employee ID</Label>
            <Input
              id="edit-employeeId"
              {...form.register("employeeId")}
              placeholder="DOJ-001"
              className="font-mono"
              data-testid="input-edit-employee-id"
            />
            {form.formState.errors.employeeId && (
              <p className="text-sm text-destructive">{form.formState.errors.employeeId.message}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-firstName">First Name</Label>
              <Input
                id="edit-firstName"
                {...form.register("firstName")}
                data-testid="input-edit-first-name"
              />
              {form.formState.errors.firstName && (
                <p className="text-sm text-destructive">{form.formState.errors.firstName.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-lastName">Last Name</Label>
              <Input
                id="edit-lastName"
                {...form.register("lastName")}
                data-testid="input-edit-last-name"
              />
              {form.formState.errors.lastName && (
                <p className="text-sm text-destructive">{form.formState.errors.lastName.message}</p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-email">Email</Label>
            <Input
              id="edit-email"
              type="email"
              {...form.register("email")}
              data-testid="input-edit-email"
            />
            {form.formState.errors.email && (
              <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-phone">Phone</Label>
            <Input
              id="edit-phone"
              {...form.register("phone")}
              data-testid="input-edit-phone"
            />
            {form.formState.errors.phone && (
              <p className="text-sm text-destructive">{form.formState.errors.phone.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-position">Position</Label>
            <Input
              id="edit-position"
              {...form.register("position")}
              data-testid="input-edit-position"
            />
            {form.formState.errors.position && (
              <p className="text-sm text-destructive">{form.formState.errors.position.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-hireDate">Hire Date</Label>
            <Input
              id="edit-hireDate"
              type="date"
              {...form.register("hireDate")}
              data-testid="input-edit-hire-date"
            />
          </div>
          <div className="space-y-2">
            <Label>Department</Label>
            <Select
              value={form.watch("departmentId") ?? "none"}
              onValueChange={(val) => form.setValue("departmentId", val === "none" ? null : val)}
            >
              <SelectTrigger data-testid="select-edit-department">
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id} data-testid={`option-edit-dept-${dept.id}`}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Manager</Label>
            <Select
              value={form.watch("managerId") || "none"}
              onValueChange={(val) => form.setValue("managerId", val === "none" ? null : val)}
            >
              <SelectTrigger data-testid="select-edit-manager">
                <SelectValue placeholder="Select manager" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {managerOptions.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id} data-testid={`option-edit-manager-${emp.id}`}>
                    {emp.firstName} {emp.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.watch("status")}
                onValueChange={(val) => form.setValue("status", val as "invited" | "active" | "inactive" | "on_leave")}
              >
                <SelectTrigger data-testid="select-edit-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="invited" data-testid="option-edit-status-invited">Invited</SelectItem>
                  <SelectItem value="active" data-testid="option-edit-status-active">Active</SelectItem>
                  <SelectItem value="inactive" data-testid="option-edit-status-inactive">Inactive</SelectItem>
                  <SelectItem value="on_leave" data-testid="option-edit-status-on-leave">On Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={form.watch("role")}
                onValueChange={(val) => form.setValue("role", val as "employee" | "manager" | "admin" | "contract")}
              >
                <SelectTrigger data-testid="select-edit-role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee" data-testid="option-edit-role-employee">Employee</SelectItem>
                  <SelectItem value="manager" data-testid="option-edit-role-manager">Manager</SelectItem>
                  <SelectItem value="admin" data-testid="option-edit-role-admin">Admin</SelectItem>
                  <SelectItem value="contract" data-testid="option-edit-role-contract">Contract</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-edit">
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving} data-testid="button-save-employee">
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const roleLabels: Record<string, string> = {
  employee: "Employee",
  manager: "Manager",
  admin: "Admin",
  contract: "Contract",
};

function AddEmployeeDialog({
  open,
  onOpenChange,
  allEmployees,
  departments,
  onSave,
  isSaving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allEmployees: Employee[];
  departments: Department[];
  onSave: (data: AddEmployeeForm) => void;
  isSaving: boolean;
}) {
  const form = useForm<AddEmployeeForm>({
    resolver: zodResolver(addEmployeeSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      position: "",
      role: "employee",
      departmentId: null,
      managerId: null,
      hireDate: null,
      status: "active",
    },
  });

  const onSubmit = (data: AddEmployeeForm) => {
    onSave({ ...data, hireDate: data.hireDate || null });
  };

  const handleOpenChange = (val: boolean) => {
    if (!val) form.reset();
    onOpenChange(val);
  };

  const managerOptions = allEmployees.filter(
    (e) => e.role === "manager" || e.role === "admin"
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg" data-testid="dialog-add-employee">
        <DialogHeader>
          <DialogTitle data-testid="text-add-dialog-title">Add Employee</DialogTitle>
          <DialogDescription>
            Fill in the details below to add a new employee.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="add-firstName">First Name</Label>
              <Input
                id="add-firstName"
                {...form.register("firstName")}
                data-testid="input-add-first-name"
              />
              {form.formState.errors.firstName && (
                <p className="text-sm text-destructive">{form.formState.errors.firstName.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-lastName">Last Name</Label>
              <Input
                id="add-lastName"
                {...form.register("lastName")}
                data-testid="input-add-last-name"
              />
              {form.formState.errors.lastName && (
                <p className="text-sm text-destructive">{form.formState.errors.lastName.message}</p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="add-email">Email</Label>
            <Input
              id="add-email"
              type="email"
              {...form.register("email")}
              data-testid="input-add-email"
            />
            {form.formState.errors.email && (
              <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="add-position">Position</Label>
            <Input
              id="add-position"
              {...form.register("position")}
              data-testid="input-add-position"
            />
            {form.formState.errors.position && (
              <p className="text-sm text-destructive">{form.formState.errors.position.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="add-hireDate">Hire Date</Label>
            <Input
              id="add-hireDate"
              type="date"
              {...form.register("hireDate")}
              data-testid="input-add-hire-date"
            />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select
              value={form.watch("role")}
              onValueChange={(val) => form.setValue("role", val as AddEmployeeForm["role"])}
            >
              <SelectTrigger data-testid="select-add-role">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {(["employee", "manager", "admin", "contract"] as const).map((r) => (
                  <SelectItem key={r} value={r} data-testid={`option-add-role-${r}`}>
                    {roleLabels[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Department</Label>
            <Select
              value={form.watch("departmentId") ?? "none"}
              onValueChange={(val) => form.setValue("departmentId", val === "none" ? null : val)}
            >
              <SelectTrigger data-testid="select-add-department">
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id} data-testid={`option-add-dept-${dept.id}`}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Manager</Label>
            <Select
              value={form.watch("managerId") || "none"}
              onValueChange={(val) => form.setValue("managerId", val === "none" ? null : val)}
            >
              <SelectTrigger data-testid="select-add-manager">
                <SelectValue placeholder="Select manager" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {managerOptions.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id} data-testid={`option-add-manager-${emp.id}`}>
                    {emp.firstName} {emp.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={form.watch("status")}
              onValueChange={(val) => form.setValue("status", val as AddEmployeeForm["status"])}
            >
              <SelectTrigger data-testid="select-add-status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active" data-testid="option-add-status-active">Active</SelectItem>
                <SelectItem value="inactive" data-testid="option-add-status-inactive">Inactive</SelectItem>
                <SelectItem value="on_leave" data-testid="option-add-status-on-leave">On Leave</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} data-testid="button-cancel-add">
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving} data-testid="button-save-new-employee">
              {isSaving ? "Adding..." : "Add Employee"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
