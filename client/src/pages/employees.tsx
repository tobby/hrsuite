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
import { 
  Search, 
  Plus, 
  Mail, 
  Phone, 
  Building2,
  MoreHorizontal,
  UserCircle,
  Filter,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRole, canManageEmployees } from "@/lib/role-context";
import { employees, departments, getDepartmentById, getEmployeeById } from "@/lib/demo-data";
import type { Employee } from "@shared/schema";

const statusStyles = {
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  inactive: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
  on_leave: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

const statusLabels = {
  active: "Active",
  inactive: "Inactive",
  on_leave: "On Leave",
};

export default function Employees() {
  const { role, currentUser } = useRole();
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // For managers, show only their direct reports
  // For admins, show all employees
  const visibleEmployees = role === "manager" 
    ? employees.filter(e => e.managerId === currentUser.id || e.id === currentUser.id)
    : employees;

  const filteredEmployees = visibleEmployees.filter((employee) => {
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

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-employees-title">
            {role === "manager" ? "My Team" : "Employees"}
          </h1>
          <p className="text-muted-foreground">
            {role === "manager" 
              ? "View and manage your direct reports" 
              : "Manage your organization's workforce"}
          </p>
        </div>
        {canManageEmployees(role) && (
          <Button data-testid="button-add-employee">
            <Plus className="mr-2 h-4 w-4" />
            Add Employee
          </Button>
        )}
      </div>

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
                    const department = getDepartmentById(employee.departmentId);
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
                          {new Date(employee.hireDate).toLocaleDateString()}
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
            Showing {filteredEmployees.length} of {visibleEmployees.length} employees
          </div>
        </CardContent>
      </Card>

      {/* Employee Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-lg">
          {selectedEmployee && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                      {selectedEmployee.firstName[0]}{selectedEmployee.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div data-testid="text-detail-employee-name">{selectedEmployee.firstName} {selectedEmployee.lastName}</div>
                    <DialogDescription className="font-normal">
                      {selectedEmployee.position}
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
                      {selectedEmployee.email}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Phone</Label>
                    <div className="flex items-center gap-2 text-sm" data-testid="text-detail-phone">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      {selectedEmployee.phone}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Department</Label>
                    <div className="flex items-center gap-2 text-sm" data-testid="text-detail-department">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      {getDepartmentById(selectedEmployee.departmentId)?.name}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <div>
                      <Badge variant="secondary" className={statusStyles[selectedEmployee.status]} data-testid="text-detail-status">
                        {statusLabels[selectedEmployee.status]}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Hire Date</Label>
                    <p className="text-sm" data-testid="text-detail-hire-date">{new Date(selectedEmployee.hireDate).toLocaleDateString()}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Manager</Label>
                    <p className="text-sm" data-testid="text-detail-manager">
                      {selectedEmployee.managerId 
                        ? `${getEmployeeById(selectedEmployee.managerId)?.firstName} ${getEmployeeById(selectedEmployee.managerId)?.lastName}`
                        : "—"}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 pt-4">
                  {canManageEmployees(role) && (
                    <Button className="flex-1" data-testid="button-edit-employee">
                      Edit Profile
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => setIsDetailOpen(false)} data-testid="button-close-detail">
                    Close
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
