import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { 
  Plus, 
  Clock,
  CheckCircle2,
  XCircle,
  CalendarDays,
  Filter,
  ChevronLeft,
  ChevronRight,
  Calendar,
  AlertTriangle,
  AlertCircle,
  Star,
} from "lucide-react";
import { useRole, canApproveLeave, canViewAllRequests } from "@/lib/role-context";
import { 
  leaveRequests, 
  leaveTypes, 
  leaveBalances,
  companyHolidays,
  getEmployeeById,
  getLeaveTypeById,
} from "@/lib/demo-data";
import type { LeaveRequest, LeaveType as LeaveTypeSchema, CompanyHoliday } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

const leaveRequestFormSchema = z.object({
  leaveTypeId: z.string().min(1, "Please select a leave type"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  reason: z.string().min(1, "Please provide a reason for your leave request"),
});

type LeaveRequestFormValues = z.infer<typeof leaveRequestFormSchema>;

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  active: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  completed: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
};

const statusIcons: Record<string, typeof Clock> = {
  pending: Clock,
  approved: CheckCircle2,
  rejected: XCircle,
  active: Star,
  completed: CheckCircle2,
};

function isCurrentlyOnLeave(request: LeaveRequest): boolean {
  const today = new Date();
  const start = new Date(request.startDate);
  const end = new Date(request.endDate);
  return request.status === "approved" && today >= start && today <= end;
}

function getRequestDisplayStatus(request: LeaveRequest): string {
  if (isCurrentlyOnLeave(request)) return "active";
  if (request.status === "approved" && new Date(request.endDate) < new Date()) return "completed";
  return request.status;
}

export default function Leave() {
  const { role, currentUser } = useRole();
  const [activeTab, setActiveTab] = useState("my-requests");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [confirmAction, setConfirmAction] = useState<{ type: "approve" | "reject"; request: LeaveRequest } | null>(null);
  const { toast } = useToast();

  const form = useForm<LeaveRequestFormValues>({
    resolver: zodResolver(leaveRequestFormSchema),
    defaultValues: {
      leaveTypeId: "",
      startDate: "",
      endDate: "",
      reason: "",
    },
  });

  const watchedLeaveType = form.watch("leaveTypeId");
  const watchedStartDate = form.watch("startDate");
  const watchedEndDate = form.watch("endDate");

  const requestedDaysPreview = useMemo(() => {
    if (!watchedStartDate || !watchedEndDate) return null;
    const start = new Date(watchedStartDate);
    const end = new Date(watchedEndDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
    if (end < start) return { days: 0, error: "End date must be after start date" };
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return { days: diffDays, error: null };
  }, [watchedStartDate, watchedEndDate]);

  const balanceValidation = useMemo(() => {
    if (!watchedLeaveType || !requestedDaysPreview || requestedDaysPreview.error) return null;
    const available = leaveBalances.find(
      b => b.employeeId === currentUser.id && b.leaveTypeId === watchedLeaveType
    )?.remainingDays || 0;
    const exceeds = requestedDaysPreview.days > available;
    return { available, exceeds, requested: requestedDaysPreview.days };
  }, [watchedLeaveType, requestedDaysPreview, currentUser.id]);

  const myRequests = leaveRequests.filter(r => r.employeeId === currentUser.id);
  const pendingApprovals = leaveRequests.filter(r => r.status === "pending");
  const allRequests = leaveRequests;

  const filterRequests = (requests: LeaveRequest[]) => {
    if (statusFilter === "all") return requests;
    if (statusFilter === "active" || statusFilter === "completed") {
      return requests.filter(r => getRequestDisplayStatus(r) === statusFilter);
    }
    return requests.filter(r => r.status === statusFilter);
  };

  const openRequestDetail = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setIsDetailOpen(true);
  };

  const calculateDays = (startDate: string, endDate: string): number => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const onSubmit = (data: LeaveRequestFormValues) => {
    const requestedDays = calculateDays(data.startDate, data.endDate);
    const availableDays = getUserBalance(data.leaveTypeId);
    
    if (requestedDays > availableDays) {
      toast({
        title: "Insufficient Balance",
        description: `You only have ${availableDays} days available for this leave type. You're requesting ${requestedDays} days.`,
        variant: "destructive",
      });
      return;
    }

    if (new Date(data.endDate) < new Date(data.startDate)) {
      toast({
        title: "Invalid Dates",
        description: "End date must be after start date.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Leave Request Submitted",
      description: `Your ${requestedDays}-day leave request has been submitted for approval.`,
    });
    setIsNewRequestOpen(false);
    form.reset();
  };

  const handleApprove = (request?: LeaveRequest) => {
    const targetRequest = request || selectedRequest;
    if (!targetRequest) return;
    setConfirmAction({ type: "approve", request: targetRequest });
  };

  const handleReject = (request?: LeaveRequest) => {
    const targetRequest = request || selectedRequest;
    if (!targetRequest) return;
    setConfirmAction({ type: "reject", request: targetRequest });
  };

  const confirmApproval = () => {
    toast({
      title: "Leave Approved",
      description: `Leave request for ${getEmployeeById(confirmAction?.request.employeeId || "")?.firstName} has been approved.`,
    });
    setConfirmAction(null);
    setIsDetailOpen(false);
  };

  const confirmRejection = () => {
    toast({
      title: "Leave Rejected",
      description: `Leave request for ${getEmployeeById(confirmAction?.request.employeeId || "")?.firstName} has been rejected.`,
    });
    setConfirmAction(null);
    setIsDetailOpen(false);
  };

  // Calendar helpers
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const calendarDays = useMemo(() => {
    const days: { date: Date; isCurrentMonth: boolean }[] = [];
    const daysInMonth = getDaysInMonth(calendarDate);
    const firstDay = getFirstDayOfMonth(calendarDate);
    const prevMonthDays = getDaysInMonth(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1));

    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({
        date: new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, prevMonthDays - i),
        isCurrentMonth: false,
      });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(calendarDate.getFullYear(), calendarDate.getMonth(), i),
        isCurrentMonth: true,
      });
    }

    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        date: new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, i),
        isCurrentMonth: false,
      });
    }

    return days;
  }, [calendarDate]);

  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0];
    const leaves = leaveRequests.filter(r => {
      if (r.status !== "approved") return false;
      return dateStr >= r.startDate && dateStr <= r.endDate;
    });
    const holidays = companyHolidays.filter(h => h.date === dateStr);
    return { leaves, holidays };
  };

  const getUserBalance = (leaveTypeId: string) => {
    const balance = leaveBalances.find(b => b.employeeId === currentUser.id && b.leaveTypeId === leaveTypeId);
    return balance?.remainingDays || 0;
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-leave-title">
            Leave Management
          </h1>
          <p className="text-muted-foreground">
            Request time off and manage leave approvals
          </p>
        </div>
        <Button onClick={() => setIsNewRequestOpen(true)} data-testid="button-new-leave-request">
          <Plus className="mr-2 h-4 w-4" />
          New Request
        </Button>
      </div>

      {/* Leave Balance Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {leaveBalances.map((balance) => {
          const leaveType = getLeaveTypeById(balance.leaveTypeId);
          if (!leaveType) return null;
          const percentage = (balance.remainingDays / balance.totalDays) * 100;
          return (
            <Card key={balance.id} data-testid={`card-balance-${balance.id}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div 
                    className="h-3 w-3 rounded-full" 
                    style={{ backgroundColor: leaveType.color }}
                    data-testid={`indicator-leave-type-${balance.id}`}
                  />
                  <CardTitle className="text-sm font-medium">{leaveType.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid={`text-balance-remaining-${balance.id}`}>
                  {balance.remainingDays}
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  of {balance.totalDays} days remaining
                </p>
                <Progress value={percentage} className="h-1.5" />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Leave Requests Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="flex-wrap">
            <TabsTrigger value="my-requests" data-testid="tab-my-requests">
              My Requests
              <Badge variant="secondary" className="ml-2 text-xs">
                {myRequests.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="calendar" data-testid="tab-calendar">
              <Calendar className="mr-1 h-4 w-4" />
              Calendar
            </TabsTrigger>
            {canApproveLeave(role) && (
              <TabsTrigger value="pending-approvals" data-testid="tab-pending-approvals">
                Pending Approvals
                <Badge variant="secondary" className="ml-2 text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  {pendingApprovals.length}
                </Badge>
              </TabsTrigger>
            )}
            {canViewAllRequests(role) && (
              <TabsTrigger value="all-requests" data-testid="tab-all-requests">
                All Requests
              </TabsTrigger>
            )}
          </TabsList>
          {(activeTab === "my-requests" || activeTab === "pending-approvals" || activeTab === "all-requests") && (
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]" data-testid="select-leave-status-filter">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" data-testid="option-status-all">All Status</SelectItem>
                <SelectItem value="pending" data-testid="option-status-pending">Pending</SelectItem>
                <SelectItem value="approved" data-testid="option-status-approved">Approved</SelectItem>
                <SelectItem value="active" data-testid="option-status-active">Active (On Leave)</SelectItem>
                <SelectItem value="completed" data-testid="option-status-completed">Completed</SelectItem>
                <SelectItem value="rejected" data-testid="option-status-rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        <TabsContent value="my-requests" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <LeaveRequestsTable 
                requests={filterRequests(myRequests)} 
                onRowClick={openRequestDetail}
                showEmployee={false}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending-approvals" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <LeaveRequestsTable 
                requests={filterRequests(pendingApprovals)} 
                onRowClick={openRequestDetail}
                showEmployee={true}
                showActions={true}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all-requests" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <LeaveRequestsTable 
                requests={filterRequests(allRequests)} 
                onRowClick={openRequestDetail}
                showEmployee={true}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Calendar Tab */}
        <TabsContent value="calendar" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Leave Calendar</CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1))}
                    data-testid="button-prev-month"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium min-w-[120px] text-center" data-testid="text-calendar-month">
                    {calendarDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1))}
                    data-testid="button-next-month"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-2 text-sm">
                  <div className="h-3 w-3 rounded-full bg-blue-500" />
                  <span className="text-muted-foreground">Approved Leave</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <span className="text-muted-foreground">Company Holiday</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-px bg-muted rounded-lg overflow-hidden">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day} className="bg-muted-foreground/5 p-2 text-center text-xs font-medium text-muted-foreground">
                    {day}
                  </div>
                ))}
                {calendarDays.map(({ date, isCurrentMonth }, index) => {
                  const { leaves, holidays } = getEventsForDate(date);
                  const isToday = date.toDateString() === new Date().toDateString();
                  const dateStr = date.toISOString().split("T")[0];
                  return (
                    <div
                      key={index}
                      className={`bg-background p-1 min-h-[80px] ${!isCurrentMonth ? "opacity-50" : ""}`}
                      data-testid={`calendar-day-${dateStr}`}
                    >
                      <div className={`text-xs font-medium mb-1 ${isToday ? "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center" : ""}`}>
                        {date.getDate()}
                      </div>
                      <div className="space-y-0.5">
                        {holidays.map((h) => (
                          <div
                            key={h.id}
                            className="text-[10px] px-1 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 truncate"
                            title={h.name}
                          >
                            {h.name}
                          </div>
                        ))}
                        {leaves.slice(0, 2).map((l) => {
                          const emp = getEmployeeById(l.employeeId);
                          return (
                            <div
                              key={l.id}
                              className="text-[10px] px-1 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 truncate"
                              title={`${emp?.firstName} ${emp?.lastName}`}
                            >
                              {emp?.firstName?.charAt(0)}. {emp?.lastName}
                            </div>
                          );
                        })}
                        {leaves.length > 2 && (
                          <div className="text-[10px] text-muted-foreground">
                            +{leaves.length - 2} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      {/* New Request Dialog with Form */}
      <Dialog open={isNewRequestOpen} onOpenChange={setIsNewRequestOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Leave Request</DialogTitle>
            <DialogDescription>
              Submit a new time-off request for approval
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="leaveTypeId"
                render={({ field }) => {
                  const selectedType = leaveTypes.find(t => t.id === field.value);
                  const availableDays = field.value ? getUserBalance(field.value) : null;
                  return (
                    <FormItem>
                      <FormLabel>Leave Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-leave-type">
                            <SelectValue placeholder="Select leave type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {leaveTypes.map((type) => {
                            const balance = getUserBalance(type.id);
                            return (
                              <SelectItem key={type.id} value={type.id} data-testid={`option-leave-type-${type.id}`}>
                                <div className="flex items-center justify-between gap-4 w-full">
                                  <div className="flex items-center gap-2">
                                    <div 
                                      className="h-2 w-2 rounded-full" 
                                      style={{ backgroundColor: type.color }}
                                    />
                                    {type.name}
                                  </div>
                                  <span className="text-xs text-muted-foreground">
                                    {balance} days left
                                  </span>
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      {selectedType && availableDays !== null && (
                        <p className="text-xs text-muted-foreground" data-testid="text-available-balance">
                          Available: {availableDays} days of {selectedType.name}
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-start-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-end-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Real-time validation feedback */}
              {requestedDaysPreview?.error && (
                <div className="flex items-center gap-2 text-destructive text-sm" data-testid="error-date-validation">
                  <AlertCircle className="h-4 w-4" />
                  {requestedDaysPreview.error}
                </div>
              )}
              {balanceValidation && (
                <div className={`flex items-center gap-2 text-sm p-3 rounded-md ${
                  balanceValidation.exceeds 
                    ? "bg-destructive/10 text-destructive border border-destructive/20" 
                    : "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                }`} data-testid={balanceValidation.exceeds ? "error-balance-exceeded" : "info-balance-ok"}>
                  {balanceValidation.exceeds ? (
                    <>
                      <AlertCircle className="h-4 w-4" />
                      <span>
                        Insufficient balance: You're requesting <strong>{balanceValidation.requested} days</strong> but only have{" "}
                        <strong>{balanceValidation.available} days</strong> available.
                      </span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>
                        Requesting <strong>{balanceValidation.requested} days</strong> — {balanceValidation.available - balanceValidation.requested} days will remain after this request.
                      </span>
                    </>
                  )}
                </div>
              )}

              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Please provide a reason for your leave request..."
                        className="resize-none"
                        rows={3}
                        {...field}
                        data-testid="textarea-leave-reason"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsNewRequestOpen(false)} data-testid="button-cancel-leave-request">
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={!!balanceValidation?.exceeds || !!requestedDaysPreview?.error}
                  data-testid="button-submit-leave-request"
                >
                  Submit Request
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Request Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-md">
          {selectedRequest && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5" />
                  Leave Request Details
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {getEmployeeById(selectedRequest.employeeId)?.firstName[0]}
                        {getEmployeeById(selectedRequest.employeeId)?.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium" data-testid="text-request-employee-name">
                        {getEmployeeById(selectedRequest.employeeId)?.firstName}{" "}
                        {getEmployeeById(selectedRequest.employeeId)?.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {getEmployeeById(selectedRequest.employeeId)?.position}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className={statusColors[selectedRequest.status]} data-testid="badge-request-status">
                    {(() => {
                      const StatusIcon = statusIcons[selectedRequest.status];
                      return <StatusIcon className="mr-1 h-3 w-3" />;
                    })()}
                    {selectedRequest.status.charAt(0).toUpperCase() + selectedRequest.status.slice(1)}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Leave Type</Label>
                    <div className="flex items-center gap-2">
                      <div 
                        className="h-2 w-2 rounded-full" 
                        style={{ backgroundColor: getLeaveTypeById(selectedRequest.leaveTypeId)?.color }}
                      />
                      <span className="text-sm font-medium" data-testid="text-request-leave-type">
                        {getLeaveTypeById(selectedRequest.leaveTypeId)?.name}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Duration</Label>
                    <p className="text-sm font-medium" data-testid="text-request-duration">{selectedRequest.totalDays} days</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Start Date</Label>
                    <p className="text-sm" data-testid="text-request-start-date">{new Date(selectedRequest.startDate).toLocaleDateString()}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">End Date</Label>
                    <p className="text-sm" data-testid="text-request-end-date">{new Date(selectedRequest.endDate).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Reason</Label>
                  <p className="text-sm" data-testid="text-request-reason">{selectedRequest.reason}</p>
                </div>

                {selectedRequest.approverComment && (
                  <div className="space-y-1 pt-2 border-t">
                    <Label className="text-xs text-muted-foreground">Approver Comment</Label>
                    <p className="text-sm" data-testid="text-approver-comment">{selectedRequest.approverComment}</p>
                  </div>
                )}

                {selectedRequest.status === "pending" && selectedRequest.employeeId !== currentUser.id && canApproveLeave(role) && (
                  <div className="flex gap-2 pt-4">
                    <Button 
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700" 
                      onClick={() => handleApprove()}
                      data-testid="button-approve-leave"
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Approve
                    </Button>
                    <Button 
                      variant="destructive" 
                      className="flex-1" 
                      onClick={() => handleReject()}
                      data-testid="button-reject-leave"
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                )}

                {/* Active Leave Badge */}
                {isCurrentlyOnLeave(selectedRequest) && (
                  <div className="flex items-center gap-2 p-3 mt-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <Star className="h-4 w-4 text-blue-600" />
                    <span className="text-sm text-blue-700 dark:text-blue-400">Currently on leave</span>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {confirmAction?.type === "approve" ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-destructive" />
              )}
              {confirmAction?.type === "approve" ? "Approve Leave Request" : "Reject Leave Request"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === "approve" 
                ? `Are you sure you want to approve the leave request for ${getEmployeeById(confirmAction?.request.employeeId || "")?.firstName} ${getEmployeeById(confirmAction?.request.employeeId || "")?.lastName}? This will deduct ${confirmAction?.request.totalDays} days from their balance.`
                : `Are you sure you want to reject the leave request for ${getEmployeeById(confirmAction?.request.employeeId || "")?.firstName} ${getEmployeeById(confirmAction?.request.employeeId || "")?.lastName}? This action cannot be undone.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-confirm">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAction?.type === "approve" ? confirmApproval : confirmRejection}
              className={confirmAction?.type === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-destructive hover:bg-destructive/90"}
              data-testid={confirmAction?.type === "approve" ? "button-confirm-approve" : "button-confirm-reject"}
            >
              {confirmAction?.type === "approve" ? "Approve" : "Reject"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface LeaveRequestsTableProps {
  requests: LeaveRequest[];
  onRowClick: (request: LeaveRequest) => void;
  showEmployee?: boolean;
  showActions?: boolean;
}

function LeaveRequestsTable({ requests, onRowClick, showEmployee = true, showActions = false }: LeaveRequestsTableProps) {
  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <CalendarDays className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground" data-testid="text-no-leave-requests">No leave requests found</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {showEmployee && <TableHead>Employee</TableHead>}
            <TableHead>Leave Type</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Dates</TableHead>
            <TableHead>Status</TableHead>
            {showActions && <TableHead className="w-[120px]">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((request) => {
            const employee = getEmployeeById(request.employeeId);
            const leaveType = getLeaveTypeById(request.leaveTypeId);
            const displayStatus = getRequestDisplayStatus(request);
            const StatusIcon = statusIcons[displayStatus] || Clock;
            return (
              <TableRow 
                key={request.id}
                className="cursor-pointer hover-elevate"
                onClick={() => onRowClick(request)}
                data-testid={`row-leave-request-${request.id}`}
              >
                {showEmployee && (
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {employee?.firstName[0]}{employee?.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <span className="font-medium" data-testid={`text-employee-name-${request.id}`}>
                          {employee?.firstName} {employee?.lastName}
                        </span>
                        {isCurrentlyOnLeave(request) && (
                          <Badge variant="secondary" className="ml-2 text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                            On Leave
                          </Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                )}
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div 
                      className="h-2 w-2 rounded-full" 
                      style={{ backgroundColor: leaveType?.color }}
                    />
                    <span data-testid={`text-leave-type-${request.id}`}>{leaveType?.name}</span>
                  </div>
                </TableCell>
                <TableCell data-testid={`text-duration-${request.id}`}>{request.totalDays} days</TableCell>
                <TableCell>
                  <span className="text-sm" data-testid={`text-dates-${request.id}`}>
                    {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className={statusColors[displayStatus]} data-testid={`badge-status-${request.id}`}>
                    <StatusIcon className="mr-1 h-3 w-3" />
                    {displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1)}
                  </Badge>
                </TableCell>
                {showActions && (
                  <TableCell>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" variant="ghost" className="h-7 text-emerald-600" data-testid={`button-quick-approve-${request.id}`}>
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-destructive" data-testid={`button-quick-reject-${request.id}`}>
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
