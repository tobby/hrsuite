import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Users,
  UserCircle,
  MoreHorizontal,
  Edit,
  Trash2,
  Loader2,
  Inbox,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useRole, canManageEmployees, canEditOrgSettings } from "@/lib/role-context";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useForm } from "react-hook-form";
import type { Department, Employee } from "@shared/schema";

const departmentFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  managerId: z.string().nullable(),
});

type DepartmentFormValues = z.infer<typeof departmentFormSchema>;

export default function Departments() {
  const { role, currentUser } = useRole();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const isAdmin = canEditOrgSettings(role);

  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const { data: departments = [], isLoading: isLoadingDepartments } = useQuery<Department[]>({
    queryKey: ['/api/departments'],
  });

  const { data: employees = [], isLoading: isLoadingEmployees } = useQuery<Employee[]>({
    queryKey: ['/api/employees'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; companyId: string; headId?: string | null }) => {
      await apiRequest("POST", "/api/departments", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/departments'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Department> }) => {
      await apiRequest("PATCH", `/api/departments/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/departments'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/departments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/departments'] });
    },
  });

  const editForm = useForm<DepartmentFormValues>({
    resolver: zodResolver(departmentFormSchema),
    defaultValues: { name: "", description: "", managerId: null },
  });

  const addForm = useForm<DepartmentFormValues>({
    resolver: zodResolver(departmentFormSchema),
    defaultValues: { name: "", description: "", managerId: null },
  });

  if (!isAdmin) {
    navigate("/");
    return null;
  }

  function handleEditOpen(department: Department) {
    setEditingDepartment(department);
    editForm.reset({
      name: department.name,
      description: department.description,
      managerId: department.headId || null,
    });
  }

  function handleEditSave(values: DepartmentFormValues) {
    if (!editingDepartment) return;
    updateMutation.mutate(
      {
        id: editingDepartment.id,
        data: {
          name: values.name,
          description: values.description,
          headId: values.managerId || null,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Department updated", description: `${values.name} has been updated.` });
          setEditingDepartment(null);
        },
        onError: (error) => {
          toast({ title: "Error", description: error.message, variant: "destructive" });
        },
      }
    );
  }

  function handleAddSave(values: DepartmentFormValues) {
    createMutation.mutate(
      {
        name: values.name,
        description: values.description,
        companyId: currentUser.companyId,
        headId: values.managerId || null,
      },
      {
        onSuccess: () => {
          toast({ title: "Department created", description: `${values.name} has been created.` });
          setIsAddDialogOpen(false);
          addForm.reset({ name: "", description: "", managerId: null });
        },
        onError: (error) => {
          toast({ title: "Error", description: error.message, variant: "destructive" });
        },
      }
    );
  }

  function handleDelete(department: Department) {
    deleteMutation.mutate(department.id, {
      onSuccess: () => {
        toast({ title: "Department deleted", description: `${department.name} has been removed.` });
      },
      onError: (error) => {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      },
    });
  }

  function handleAddOpen() {
    addForm.reset({ name: "", description: "", managerId: null });
    setIsAddDialogOpen(true);
  }

  const totalEmployees = employees.length;

  if (isLoadingDepartments || isLoadingEmployees) {
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
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-departments-title">
            Departments
          </h1>
          <p className="text-muted-foreground" data-testid="text-departments-subtitle">
            Manage your organization's departments and teams
          </p>
        </div>
        {isAdmin && (
          <Button data-testid="button-add-department" onClick={handleAddOpen}>
            <Plus className="mr-2 h-4 w-4" />
            Add Department
          </Button>
        )}
      </div>

      {departments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-1" data-testid="text-departments-empty-title">No departments yet</h3>
            <p className="text-sm text-muted-foreground mb-4" data-testid="text-departments-empty-description">
              Create your first department to organize your team
            </p>
            {isAdmin && (
              <Button onClick={handleAddOpen} data-testid="button-add-department-empty">
                <Plus className="mr-2 h-4 w-4" />
                Add Department
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
      <>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {departments.map((department) => {
          const manager = department.headId ? employees.find(e => e.id === department.headId) : null;
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
                      <CardTitle className="text-lg" data-testid={`text-department-name-${department.id}`}>
                        {department.name}
                      </CardTitle>
                      <CardDescription className="text-xs" data-testid={`text-department-count-${department.id}`}>
                        {deptEmployees.length} employees
                      </CardDescription>
                    </div>
                  </div>
                  {isAdmin && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" data-testid={`button-department-menu-${department.id}`}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleEditOpen(department)}
                          data-testid={`button-edit-department-${department.id}`}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Department
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDelete(department)}
                          data-testid={`button-delete-department-${department.id}`}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground" data-testid={`text-department-description-${department.id}`}>
                  {department.description}
                </p>

                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">Active Members</span>
                  <Badge variant="secondary" data-testid={`badge-department-active-${department.id}`}>
                    {activeCount} / {deptEmployees.length}
                  </Badge>
                </div>

                {manager && (
                  <div className="flex items-center gap-3 pt-2 border-t" data-testid={`section-department-head-${department.id}`}>
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {manager.firstName[0]}{manager.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium" data-testid={`text-department-head-name-${department.id}`}>
                        {manager.firstName} {manager.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Department Head
                      </p>
                    </div>
                  </div>
                )}

                <div className="pt-2">
                  <p className="text-xs text-muted-foreground mb-2">Team Members</p>
                  <div className="flex -space-x-2">
                    {deptEmployees.slice(0, 5).map((emp) => (
                      <Avatar
                        key={emp.id}
                        className="h-8 w-8 border-2 border-card"
                        data-testid={`avatar-team-member-${emp.id}`}
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

      <Card data-testid="card-department-stats">
        <CardHeader>
          <CardTitle className="text-lg">Department Overview</CardTitle>
          <CardDescription>Employee distribution across departments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {departments.map((dept) => {
              const deptEmployees = employees.filter(e => e.departmentId === dept.id);
              const percentage = totalEmployees > 0 ? (deptEmployees.length / totalEmployees) * 100 : 0;
              return (
                <div key={dept.id} className="space-y-2" data-testid={`stat-department-${dept.id}`}>
                  <div className="flex items-center justify-between gap-2 text-sm">
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
      </>
      )}

      <Dialog open={!!editingDepartment} onOpenChange={(open) => { if (!open) setEditingDepartment(null); }}>
        <DialogContent data-testid="dialog-edit-department">
          <DialogHeader>
            <DialogTitle>Edit Department</DialogTitle>
            <DialogDescription>Update department information</DialogDescription>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(handleEditSave)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                data-testid="input-edit-department-name"
                {...editForm.register("name")}
              />
              {editForm.formState.errors.name && (
                <p className="text-sm text-destructive">{editForm.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                data-testid="input-edit-department-description"
                {...editForm.register("description")}
              />
              {editForm.formState.errors.description && (
                <p className="text-sm text-destructive">{editForm.formState.errors.description.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Department Head</Label>
              <Select
                value={editForm.watch("managerId") || "none"}
                onValueChange={(val) => editForm.setValue("managerId", val === "none" ? null : val)}
              >
                <SelectTrigger data-testid="select-edit-department-manager">
                  <SelectValue placeholder="Select a manager" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Manager</SelectItem>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id} data-testid={`option-manager-${emp.id}`}>
                      {emp.firstName} {emp.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingDepartment(null)} data-testid="button-cancel-edit">
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending} data-testid="button-save-edit">
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent data-testid="dialog-add-department">
          <DialogHeader>
            <DialogTitle>Add Department</DialogTitle>
            <DialogDescription>Create a new department</DialogDescription>
          </DialogHeader>
          <form onSubmit={addForm.handleSubmit(handleAddSave)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="add-name">Name</Label>
              <Input
                id="add-name"
                data-testid="input-add-department-name"
                {...addForm.register("name")}
              />
              {addForm.formState.errors.name && (
                <p className="text-sm text-destructive">{addForm.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-description">Description</Label>
              <Textarea
                id="add-description"
                data-testid="input-add-department-description"
                {...addForm.register("description")}
              />
              {addForm.formState.errors.description && (
                <p className="text-sm text-destructive">{addForm.formState.errors.description.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Department Head</Label>
              <Select
                value={addForm.watch("managerId") || "none"}
                onValueChange={(val) => addForm.setValue("managerId", val === "none" ? null : val)}
              >
                <SelectTrigger data-testid="select-add-department-manager">
                  <SelectValue placeholder="Select a manager" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Manager</SelectItem>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id} data-testid={`option-add-manager-${emp.id}`}>
                      {emp.firstName} {emp.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)} data-testid="button-cancel-add">
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending} data-testid="button-save-add">
                {createMutation.isPending ? "Creating..." : "Create Department"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
