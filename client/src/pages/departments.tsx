import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Plus, 
  Users, 
  UserCircle,
  MoreHorizontal,
  Edit,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { departments, employees, getEmployeeById } from "@/lib/demo-data";

export default function Departments() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-departments-title">
            Departments
          </h1>
          <p className="text-muted-foreground">
            Manage your organization's departments and teams
          </p>
        </div>
        <Button data-testid="button-add-department">
          <Plus className="mr-2 h-4 w-4" />
          Add Department
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {departments.map((department) => {
          const manager = department.managerId ? getEmployeeById(department.managerId) : null;
          const deptEmployees = employees.filter(e => e.departmentId === department.id);
          const activeCount = deptEmployees.filter(e => e.status === "active").length;
          
          return (
            <Card 
              key={department.id} 
              className="hover-elevate"
              data-testid={`card-department-${department.id}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{department.name}</CardTitle>
                      <CardDescription className="text-xs">
                        {deptEmployees.length} employees
                      </CardDescription>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" data-testid={`button-department-menu-${department.id}`}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Department
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {department.description}
                </p>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Active Members</span>
                  <Badge variant="secondary">
                    {activeCount} / {deptEmployees.length}
                  </Badge>
                </div>

                {manager && (
                  <div className="flex items-center gap-3 pt-2 border-t">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {manager.firstName[0]}{manager.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">
                        {manager.firstName} {manager.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Department Head
                      </p>
                    </div>
                  </div>
                )}

                {/* Team members preview */}
                <div className="pt-2">
                  <p className="text-xs text-muted-foreground mb-2">Team Members</p>
                  <div className="flex -space-x-2">
                    {deptEmployees.slice(0, 5).map((emp) => (
                      <Avatar 
                        key={emp.id} 
                        className="h-8 w-8 border-2 border-card"
                      >
                        <AvatarFallback className="bg-muted text-xs">
                          {emp.firstName[0]}{emp.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {deptEmployees.length > 5 && (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-muted text-xs font-medium">
                        +{deptEmployees.length - 5}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Department Stats Summary */}
      <Card data-testid="card-department-stats">
        <CardHeader>
          <CardTitle className="text-lg">Department Overview</CardTitle>
          <CardDescription>Employee distribution across departments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {departments.map((dept) => {
              const deptEmployees = employees.filter(e => e.departmentId === dept.id);
              const percentage = (deptEmployees.length / employees.length) * 100;
              return (
                <div key={dept.id} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{dept.name}</span>
                    <span className="text-muted-foreground">
                      {deptEmployees.length} employees ({percentage.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div 
                      className="h-2 rounded-full bg-primary transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
