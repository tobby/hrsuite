import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Settings,
  Plus,
  Edit,
  Trash2,
  Loader2,
  Inbox,
  RefreshCw,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useRole, canEditOrgSettings } from "@/lib/role-context";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { LeaveType, LeaveBalance, Employee } from "@shared/schema";

const COLOR_PRESETS = [
  { value: "#3b82f6", label: "Blue" },
  { value: "#22c55e", label: "Green" },
  { value: "#ef4444", label: "Red" },
  { value: "#f97316", label: "Orange" },
  { value: "#8b5cf6", label: "Purple" },
  { value: "#14b8a6", label: "Teal" },
  { value: "#ec4899", label: "Pink" },
  { value: "#eab308", label: "Yellow" },
];

const leaveTypeFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  defaultDays: z.coerce.number().min(1, "Must be at least 1 day"),
  color: z.string().min(1, "Color is required"),
});

type LeaveTypeFormData = z.infer<typeof leaveTypeFormSchema>;

export default function LeaveSettings() {
  const { role } = useRole();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingLeaveType, setEditingLeaveType] = useState<LeaveType | null>(null);
  const [deletingLeaveType, setDeletingLeaveType] = useState<LeaveType | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [editingBalance, setEditingBalance] = useState<{
    employeeId: string;
    employeeName: string;
    leaveTypeId: string;
    leaveTypeName: string;
    totalDays: number;
    usedDays: number;
  } | null>(null);
  const [balanceTotal, setBalanceTotal] = useState(0);
  const [balanceUsed, setBalanceUsed] = useState(0);

  if (!canEditOrgSettings(role)) {
    navigate("/leave");
    return null;
  }

  const { data: leaveTypes = [], isLoading: isLoadingTypes } = useQuery<LeaveType[]>({
    queryKey: ["/api/leave-types"],
  });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const { data: leaveBalances = [], isLoading: isLoadingBalances } = useQuery<LeaveBalance[]>({
    queryKey: ["/api/leave-balances/all", `?year=${selectedYear}`],
  });

  const addForm = useForm<LeaveTypeFormData>({
    resolver: zodResolver(leaveTypeFormSchema),
    defaultValues: { name: "", description: "", defaultDays: 10, color: "#3b82f6" },
  });

  const editForm = useForm<LeaveTypeFormData>({
    resolver: zodResolver(leaveTypeFormSchema),
    defaultValues: { name: "", description: "", defaultDays: 10, color: "#3b82f6" },
  });

  const createMutation = useMutation({
    mutationFn: async (data: LeaveTypeFormData) => {
      await apiRequest("POST", "/api/leave-types", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leave-types"] });
      setIsAddDialogOpen(false);
      addForm.reset();
      toast({ title: "Leave type created", description: "The leave type has been added successfully." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: LeaveTypeFormData }) => {
      await apiRequest("PATCH", `/api/leave-types/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leave-types"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leave-balances/all"] });
      setEditingLeaveType(null);
      toast({ title: "Leave type updated", description: "The leave type has been updated successfully." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/leave-types/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leave-types"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leave-balances/all"] });
      setDeletingLeaveType(null);
      toast({ title: "Leave type deleted", description: "The leave type has been removed." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateBalanceMutation = useMutation({
    mutationFn: async (data: { employeeId: string; leaveTypeId: string; totalDays: number; usedDays: number; year: number }) => {
      await apiRequest("PATCH", "/api/leave-balances/update", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leave-balances/all"] });
      setEditingBalance(null);
      toast({ title: "Balance updated", description: "The employee's leave balance has been updated." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const initializeAllMutation = useMutation({
    mutationFn: async (year: number) => {
      const res = await apiRequest("POST", "/api/leave-balances/initialize-all", { year });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/leave-balances/all"] });
      toast({ title: "Balances initialized", description: data.message });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  function handleAddOpen() {
    addForm.reset({ name: "", description: "", defaultDays: 10, color: "#3b82f6" });
    setIsAddDialogOpen(true);
  }

  function handleEditOpen(lt: LeaveType) {
    editForm.reset({
      name: lt.name,
      description: lt.description,
      defaultDays: lt.defaultDays,
      color: lt.color,
    });
    setEditingLeaveType(lt);
  }

  function handleAddSave(data: LeaveTypeFormData) {
    createMutation.mutate(data);
  }

  function handleEditSave(data: LeaveTypeFormData) {
    if (editingLeaveType) {
      updateMutation.mutate({ id: editingLeaveType.id, data });
    }
  }

  function handleDeleteConfirm() {
    if (deletingLeaveType) {
      deleteMutation.mutate(deletingLeaveType.id);
    }
  }

  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear - 1, currentYear, currentYear + 1];

  const balancesByEmployee = employees
    .filter((e) => e.status === "active")
    .map((emp) => {
      const empBalances = leaveBalances.filter((b) => b.employeeId === emp.id);
      return { employee: emp, balances: empBalances };
    })
    .filter((row) => row.balances.length > 0);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-leave-settings-title">
            Leave Settings
          </h1>
        </div>
        <p className="text-muted-foreground">
          Configure leave types, company holidays, and employee balances
        </p>
      </div>

      <div className="grid gap-6">
        <Card data-testid="card-manage-leave-types">
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
            <CardTitle className="text-lg">Leave Types</CardTitle>
            <Button data-testid="button-add-leave-type" onClick={handleAddOpen}>
              <Plus className="mr-2 h-4 w-4" />
              Add Leave Type
            </Button>
          </CardHeader>
          <CardContent>
            {isLoadingTypes ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : leaveTypes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Inbox className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground">No leave types yet</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-md">
                  Add your first leave type to get started.
                </p>
              </div>
            ) : (
              <Table data-testid="table-leave-types">
                <TableHeader>
                  <TableRow>
                    <TableHead>Color</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Default Days</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaveTypes.map((lt) => (
                    <TableRow key={lt.id} data-testid={`row-leave-type-${lt.id}`}>
                      <TableCell>
                        <div
                          className="h-4 w-4 rounded-full"
                          style={{ backgroundColor: lt.color }}
                          data-testid={`color-swatch-${lt.id}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium" data-testid={`text-leave-type-name-${lt.id}`}>
                        {lt.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground" data-testid={`text-leave-type-desc-${lt.id}`}>
                        {lt.description}
                      </TableCell>
                      <TableCell data-testid={`text-leave-type-days-${lt.id}`}>
                        {lt.defaultDays} days
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            data-testid={`button-edit-leave-type-${lt.id}`}
                            onClick={() => handleEditOpen(lt)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            data-testid={`button-delete-leave-type-${lt.id}`}
                            onClick={() => setDeletingLeaveType(lt)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-manage-balances">
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
            <CardTitle className="text-lg">Employee Leave Balances</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Select
                value={String(selectedYear)}
                onValueChange={(val) => setSelectedYear(Number(val))}
              >
                <SelectTrigger className="w-[120px]" data-testid="select-year">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((y) => (
                    <SelectItem key={y} value={String(y)} data-testid={`option-year-${y}`}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                data-testid="button-initialize-all-balances"
                onClick={() => initializeAllMutation.mutate(selectedYear)}
                disabled={initializeAllMutation.isPending || leaveTypes.length === 0}
              >
                {initializeAllMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Initialize All Balances
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingBalances ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : leaveTypes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Inbox className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground">No leave types configured</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-md">
                  Add leave types first, then initialize employee balances.
                </p>
              </div>
            ) : balancesByEmployee.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Inbox className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground">No balances for {selectedYear}</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-md">
                  Click "Initialize All Balances" to create default balances for all active employees.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table data-testid="table-leave-balances">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      {leaveTypes.map((lt) => (
                        <TableHead key={lt.id} data-testid={`header-balance-${lt.id}`}>
                          <div className="flex items-center gap-2">
                            <div
                              className="h-3 w-3 rounded-full shrink-0"
                              style={{ backgroundColor: lt.color }}
                            />
                            {lt.name}
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {balancesByEmployee.map(({ employee, balances }) => (
                      <TableRow key={employee.id} data-testid={`row-balance-${employee.id}`}>
                        <TableCell className="font-medium" data-testid={`text-balance-employee-${employee.id}`}>
                          {employee.firstName} {employee.lastName}
                        </TableCell>
                        {leaveTypes.map((lt) => {
                          const bal = balances.find((b) => b.leaveTypeId === lt.id);
                          return (
                            <TableCell key={lt.id} data-testid={`text-balance-${employee.id}-${lt.id}`}>
                              <button
                                className="hover-elevate rounded-md px-2 py-1 text-left cursor-pointer"
                                data-testid={`button-edit-balance-${employee.id}-${lt.id}`}
                                onClick={() => {
                                  setEditingBalance({
                                    employeeId: employee.id,
                                    employeeName: `${employee.firstName} ${employee.lastName}`,
                                    leaveTypeId: lt.id,
                                    leaveTypeName: lt.name,
                                    totalDays: bal?.totalDays || 0,
                                    usedDays: bal?.usedDays || 0,
                                  });
                                  setBalanceTotal(bal?.totalDays || 0);
                                  setBalanceUsed(bal?.usedDays || 0);
                                }}
                              >
                                {bal ? (
                                  <span>
                                    <span className="text-muted-foreground">{bal.usedDays}</span>
                                    {" / "}
                                    <span>{bal.totalDays}</span>
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </button>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent data-testid="dialog-add-leave-type">
          <DialogHeader>
            <DialogTitle>Add Leave Type</DialogTitle>
            <DialogDescription>Create a new leave type for your organization.</DialogDescription>
          </DialogHeader>
          <form onSubmit={addForm.handleSubmit(handleAddSave)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="add-name">Name</Label>
              <Input
                id="add-name"
                data-testid="input-add-leave-type-name"
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
                data-testid="input-add-leave-type-description"
                {...addForm.register("description")}
              />
              {addForm.formState.errors.description && (
                <p className="text-sm text-destructive">{addForm.formState.errors.description.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-defaultDays">Default Days</Label>
              <Input
                id="add-defaultDays"
                type="number"
                data-testid="input-add-leave-type-default-days"
                {...addForm.register("defaultDays")}
              />
              {addForm.formState.errors.defaultDays && (
                <p className="text-sm text-destructive">{addForm.formState.errors.defaultDays.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <Select
                value={addForm.watch("color")}
                onValueChange={(val) => addForm.setValue("color", val)}
              >
                <SelectTrigger data-testid="select-add-leave-type-color">
                  <SelectValue placeholder="Select a color" />
                </SelectTrigger>
                <SelectContent>
                  {COLOR_PRESETS.map((c) => (
                    <SelectItem key={c.value} value={c.value} data-testid={`option-color-${c.label.toLowerCase()}`}>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: c.value }}
                        />
                        {c.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {addForm.formState.errors.color && (
                <p className="text-sm text-destructive">{addForm.formState.errors.color.message}</p>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
                data-testid="button-cancel-add-leave-type"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                data-testid="button-save-add-leave-type"
              >
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingLeaveType} onOpenChange={(open) => { if (!open) setEditingLeaveType(null); }}>
        <DialogContent data-testid="dialog-edit-leave-type">
          <DialogHeader>
            <DialogTitle>Edit Leave Type</DialogTitle>
            <DialogDescription>Update the leave type details.</DialogDescription>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(handleEditSave)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                data-testid="input-edit-leave-type-name"
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
                data-testid="input-edit-leave-type-description"
                {...editForm.register("description")}
              />
              {editForm.formState.errors.description && (
                <p className="text-sm text-destructive">{editForm.formState.errors.description.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-defaultDays">Default Days</Label>
              <Input
                id="edit-defaultDays"
                type="number"
                data-testid="input-edit-leave-type-default-days"
                {...editForm.register("defaultDays")}
              />
              {editForm.formState.errors.defaultDays && (
                <p className="text-sm text-destructive">{editForm.formState.errors.defaultDays.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <Select
                value={editForm.watch("color")}
                onValueChange={(val) => editForm.setValue("color", val)}
              >
                <SelectTrigger data-testid="select-edit-leave-type-color">
                  <SelectValue placeholder="Select a color" />
                </SelectTrigger>
                <SelectContent>
                  {COLOR_PRESETS.map((c) => (
                    <SelectItem key={c.value} value={c.value} data-testid={`option-edit-color-${c.label.toLowerCase()}`}>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: c.value }}
                        />
                        {c.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {editForm.formState.errors.color && (
                <p className="text-sm text-destructive">{editForm.formState.errors.color.message}</p>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingLeaveType(null)}
                data-testid="button-cancel-edit-leave-type"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateMutation.isPending}
                data-testid="button-save-edit-leave-type"
              >
                {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingLeaveType} onOpenChange={(open) => { if (!open) setDeletingLeaveType(null); }}>
        <AlertDialogContent data-testid="dialog-delete-leave-type">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Leave Type</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingLeaveType?.name}"? This action cannot be undone and will remove all associated balances.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-leave-type">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              data-testid="button-confirm-delete-leave-type"
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!editingBalance} onOpenChange={(open) => { if (!open) setEditingBalance(null); }}>
        <DialogContent data-testid="dialog-edit-balance">
          <DialogHeader>
            <DialogTitle>Edit Leave Balance</DialogTitle>
            <DialogDescription>
              Adjust {editingBalance?.leaveTypeName} balance for {editingBalance?.employeeName} ({selectedYear})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="balance-total" className="text-muted-foreground">Total Days</Label>
              <Input
                id="balance-total"
                type="number"
                value={balanceTotal}
                disabled
                data-testid="input-balance-total"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="balance-used">Used Days</Label>
              <Input
                id="balance-used"
                type="number"
                min={0}
                max={balanceTotal}
                value={balanceUsed}
                onChange={(e) => setBalanceUsed(Number(e.target.value))}
                data-testid="input-balance-used"
              />
            </div>
            <div className="rounded-md bg-muted p-3">
              <p className="text-sm text-muted-foreground">
                Remaining: <span className="font-semibold text-foreground">{Math.max(0, balanceTotal - balanceUsed)}</span> days
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingBalance(null)}
              data-testid="button-cancel-edit-balance"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (editingBalance) {
                  if (balanceUsed > balanceTotal) {
                    toast({ title: "Validation error", description: "Used days cannot exceed total days.", variant: "destructive" });
                    return;
                  }
                  updateBalanceMutation.mutate({
                    employeeId: editingBalance.employeeId,
                    leaveTypeId: editingBalance.leaveTypeId,
                    totalDays: balanceTotal,
                    usedDays: balanceUsed,
                    year: selectedYear,
                  });
                }
              }}
              disabled={updateBalanceMutation.isPending || balanceUsed > balanceTotal}
              data-testid="button-save-edit-balance"
            >
              {updateBalanceMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
