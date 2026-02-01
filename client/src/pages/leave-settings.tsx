import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Settings, Plus, Edit, Trash2 } from "lucide-react";
import { useRole, canEditOrgSettings } from "@/lib/role-context";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { 
  leaveTypes, 
  employees, 
  leaveBalances,
  companyHolidays,
} from "@/lib/demo-data";

const colorOptions = [
  { name: "Blue", value: "#3b82f6" },
  { name: "Green", value: "#22c55e" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Purple", value: "#a855f7" },
  { name: "Red", value: "#ef4444" },
  { name: "Teal", value: "#14b8a6" },
  { name: "Pink", value: "#ec4899" },
  { name: "Indigo", value: "#6366f1" },
];

const leaveTypeFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  defaultDays: z.string().min(1, "Default days is required").refine((val) => !isNaN(Number(val)) && Number(val) >= 0, "Must be a valid number"),
  color: z.string().min(1, "Please select a color"),
});

const holidayFormSchema = z.object({
  name: z.string().min(1, "Holiday name is required"),
  date: z.string().min(1, "Date is required"),
});

type LeaveTypeFormValues = z.infer<typeof leaveTypeFormSchema>;
type HolidayFormValues = z.infer<typeof holidayFormSchema>;

export default function LeaveSettings() {
  const { role } = useRole();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const [isAddTypeOpen, setIsAddTypeOpen] = useState(false);
  const [isAddHolidayOpen, setIsAddHolidayOpen] = useState(false);

  const leaveTypeForm = useForm<LeaveTypeFormValues>({
    resolver: zodResolver(leaveTypeFormSchema),
    defaultValues: {
      name: "",
      description: "",
      defaultDays: "",
      color: "#3b82f6",
    },
  });

  const holidayForm = useForm<HolidayFormValues>({
    resolver: zodResolver(holidayFormSchema),
    defaultValues: {
      name: "",
      date: "",
    },
  });

  if (!canEditOrgSettings(role)) {
    navigate("/leave");
    return null;
  }

  const handleAddLeaveType = (values: LeaveTypeFormValues) => {
    toast({
      title: "Leave Type Added",
      description: `"${values.name}" has been added successfully.`,
    });
    leaveTypeForm.reset();
    setIsAddTypeOpen(false);
  };

  const handleAddHoliday = (values: HolidayFormValues) => {
    toast({
      title: "Holiday Added",
      description: `"${values.name}" has been added successfully.`,
    });
    holidayForm.reset();
    setIsAddHolidayOpen(false);
  };

  const handleCloseTypeDialog = (open: boolean) => {
    if (!open) {
      leaveTypeForm.reset();
    }
    setIsAddTypeOpen(open);
  };

  const handleCloseHolidayDialog = (open: boolean) => {
    if (!open) {
      holidayForm.reset();
    }
    setIsAddHolidayOpen(open);
  };

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

      <div className="grid gap-6 lg:grid-cols-2">
        <Card data-testid="card-manage-leave-types">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg">Leave Types</CardTitle>
              <CardDescription>Configure leave type allocations</CardDescription>
            </div>
            <Button size="sm" onClick={() => setIsAddTypeOpen(true)} data-testid="button-add-leave-type">
              <Plus className="mr-2 h-4 w-4" />
              Add Type
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {leaveTypes.map((type) => (
                <div
                  key={type.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                  data-testid={`leave-type-row-${type.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-4 rounded-full" style={{ backgroundColor: type.color }} />
                    <div>
                      <p className="font-medium">{type.name}</p>
                      <p className="text-xs text-muted-foreground">{type.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{type.defaultDays} days</Badge>
                    <Button size="icon" variant="ghost" data-testid={`button-edit-leave-type-${type.id}`}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="text-destructive" data-testid={`button-delete-leave-type-${type.id}`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-manage-holidays">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg">Company Holidays</CardTitle>
              <CardDescription>Manage company-wide holidays for 2026</CardDescription>
            </div>
            <Button size="sm" onClick={() => setIsAddHolidayOpen(true)} data-testid="button-add-holiday">
              <Plus className="mr-2 h-4 w-4" />
              Add Holiday
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {companyHolidays.map((holiday) => (
                <div
                  key={holiday.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                  data-testid={`holiday-row-${holiday.id}`}
                >
                  <div>
                    <p className="font-medium">{holiday.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(holiday.date).toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" data-testid={`button-edit-holiday-${holiday.id}`}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="text-destructive" data-testid={`button-delete-holiday-${holiday.id}`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2" data-testid="card-manage-balances">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg">Employee Leave Balances</CardTitle>
              <CardDescription>Adjust individual employee leave allocations</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    {leaveTypes.slice(0, 4).map((type) => (
                      <TableHead key={type.id} className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: type.color }} />
                          {type.name.split(" ")[0]}
                        </div>
                      </TableHead>
                    ))}
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.slice(0, 8).map((emp) => (
                    <TableRow key={emp.id} data-testid={`balance-row-${emp.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {emp.firstName[0]}{emp.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{emp.firstName} {emp.lastName}</span>
                        </div>
                      </TableCell>
                      {leaveTypes.slice(0, 4).map((type) => {
                        const balance = leaveBalances.find((b) => b.employeeId === emp.id && b.leaveTypeId === type.id);
                        return (
                          <TableCell key={type.id} className="text-center">
                            <Badge variant="secondary">
                              {balance?.remainingDays ?? type.defaultDays} / {balance?.totalDays ?? type.defaultDays}
                            </Badge>
                          </TableCell>
                        );
                      })}
                      <TableCell>
                        <Button size="sm" variant="ghost" data-testid={`button-edit-balance-${emp.id}`}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Leave Type Dialog */}
      <Dialog open={isAddTypeOpen} onOpenChange={handleCloseTypeDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Leave Type</DialogTitle>
            <DialogDescription>
              Create a new leave type with default allocation days.
            </DialogDescription>
          </DialogHeader>
          <Form {...leaveTypeForm}>
            <form onSubmit={leaveTypeForm.handleSubmit(handleAddLeaveType)} className="space-y-4">
              <FormField
                control={leaveTypeForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Parental Leave"
                        {...field}
                        data-testid="input-leave-type-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={leaveTypeForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Brief description of this leave type"
                        {...field}
                        data-testid="input-leave-type-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={leaveTypeForm.control}
                name="defaultDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Days per Year <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        placeholder="e.g., 15"
                        {...field}
                        data-testid="input-leave-type-days"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={leaveTypeForm.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-leave-type-color">
                          <SelectValue placeholder="Select a color">
                            {field.value && (
                              <div className="flex items-center gap-2">
                                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: field.value }} />
                                <span>{colorOptions.find(c => c.value === field.value)?.name}</span>
                              </div>
                            )}
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {colorOptions.map((color) => (
                          <SelectItem key={color.value} value={color.value} data-testid={`color-option-${color.name.toLowerCase()}`}>
                            <div className="flex items-center gap-2">
                              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color.value }} />
                              <span>{color.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => handleCloseTypeDialog(false)} data-testid="button-cancel-add-type">
                  Cancel
                </Button>
                <Button type="submit" data-testid="button-confirm-add-type">
                  Add Leave Type
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Add Holiday Dialog */}
      <Dialog open={isAddHolidayOpen} onOpenChange={handleCloseHolidayDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Company Holiday</DialogTitle>
            <DialogDescription>
              Add a new company-wide holiday.
            </DialogDescription>
          </DialogHeader>
          <Form {...holidayForm}>
            <form onSubmit={holidayForm.handleSubmit(handleAddHoliday)} className="space-y-4">
              <FormField
                control={holidayForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Holiday Name <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Company Anniversary"
                        {...field}
                        data-testid="input-holiday-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={holidayForm.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        data-testid="input-holiday-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => handleCloseHolidayDialog(false)} data-testid="button-cancel-add-holiday">
                  Cancel
                </Button>
                <Button type="submit" data-testid="button-confirm-add-holiday">
                  Add Holiday
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
