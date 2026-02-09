import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRole, canManageEmployees } from "@/lib/role-context";
import { employees as demoEmployees, departments, getDepartmentById, getEmployeeById } from "@/lib/demo-data";
import type { Employee } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const statusStyles: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  inactive: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
  on_leave: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

const statusLabels: Record<string, string> = {
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

const editEmployeeSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().nullable(),
  position: z.string().min(1, "Position is required"),
  departmentId: z.string().nullable(),
  managerId: z.string().nullable(),
  status: z.enum(["active", "inactive", "on_leave"]),
});

type EditEmployeeForm = z.infer<typeof editEmployeeSchema>;

export default function Employees() {
  const { role } = useRole();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [employeeEdits, setEmployeeEdits] = useState<Record<string, Partial<Employee>>>({});

  const getEmployee = (id: string): Employee | undefined => {
    const base = getEmployeeById(id);
    if (!base) return undefined;
    const edits = employeeEdits[id];
    if (!edits) return base;
    return { ...base, ...edits } as Employee;
  };

  const allEmployees = demoEmployees.map((e) => {
    const edits = employeeEdits[e.id];
    if (!edits) return e;
    return { ...e, ...edits } as Employee;
  });

  const filteredEmployees = allEmployees.filter((employee) => {
    const matchesSearch =
      `${employee.firstName} ${employee.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.position.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDepartment = departmentFilter === "all" || employee.departmentId === departmentFilter;
    const matchesStatus = statusFilter === "all" || employee.status === statusFilter;

    return matchesSearch && matchesDepartment && matchesStatus;
  });

  const openEmployeeDetail = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsDetailOpen(true);
  };

  const openEditDialog = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsDetailOpen(false);
    setIsEditOpen(true);
  };

  const rootEmployees = allEmployees.filter((e) => e.managerId === null);

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
          <Button data-testid="button-add-employee">
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
                        <TableCell colSpan={6} className="h-24 text-center">
                          <p className="text-muted-foreground" data-testid="text-no-employees">No employees found</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredEmployees.map((employee) => {
                        const department = employee.departmentId ? getDepartmentById(employee.departmentId) : null;
                        return (
                          <TableRow
                            key={employee.id}
                            className="cursor-pointer hover-elevate"
                            onClick={() => openEmployeeDetail(employee)}
                            data-testid={`row-employee-${employee.id}`}
                          >
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
        <DialogContent className="max-w-lg" data-testid="dialog-employee-detail">
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
        onSave={(id, data) => {
          setEmployeeEdits((prev) => ({
            ...prev,
            [id]: { ...prev[id], ...data },
          }));
          toast({
            title: "Employee updated",
            description: `${data.firstName} ${data.lastName}'s profile has been updated.`,
          });
          setIsEditOpen(false);
        }}
      />
    </div>
  );
}

function EditEmployeeDialog({
  employee,
  open,
  onOpenChange,
  allEmployees,
  onSave,
}: {
  employee: Employee | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allEmployees: Employee[];
  onSave: (id: string, data: EditEmployeeForm) => void;
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
          status: employee.status as "active" | "inactive" | "on_leave",
        }
      : undefined,
  });

  const onSubmit = (data: EditEmployeeForm) => {
    if (employee) {
      onSave(employee.id, data);
    }
  };

  if (!employee) return null;

  const managerOptions = allEmployees.filter((e) => e.id !== employee.id);

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
            <Label>Department</Label>
            <Select
              value={form.watch("departmentId") ?? undefined}
              onValueChange={(val) => form.setValue("departmentId", val)}
            >
              <SelectTrigger data-testid="select-edit-department">
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
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
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={form.watch("status")}
              onValueChange={(val) => form.setValue("status", val as "active" | "inactive" | "on_leave")}
            >
              <SelectTrigger data-testid="select-edit-status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active" data-testid="option-edit-status-active">Active</SelectItem>
                <SelectItem value="inactive" data-testid="option-edit-status-inactive">Inactive</SelectItem>
                <SelectItem value="on_leave" data-testid="option-edit-status-on-leave">On Leave</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-edit">
              Cancel
            </Button>
            <Button type="submit" data-testid="button-save-employee">
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
