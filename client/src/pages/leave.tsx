import { useState } from "react";
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
  Plus, 
  Clock,
  CheckCircle2,
  XCircle,
  CalendarDays,
  Filter,
} from "lucide-react";
import { 
  leaveRequests, 
  leaveTypes, 
  leaveBalances,
  currentUser,
  getEmployeeById,
  getLeaveTypeById,
} from "@/lib/demo-data";
import type { LeaveRequest } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

const leaveRequestFormSchema = z.object({
  leaveTypeId: z.string().min(1, "Please select a leave type"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  reason: z.string().min(1, "Please provide a reason for your leave request"),
});

type LeaveRequestFormValues = z.infer<typeof leaveRequestFormSchema>;

const statusColors = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const statusIcons = {
  pending: Clock,
  approved: CheckCircle2,
  rejected: XCircle,
};

export default function Leave() {
  const [activeTab, setActiveTab] = useState("my-requests");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
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

  const myRequests = leaveRequests.filter(r => r.employeeId === currentUser.id);
  const pendingApprovals = leaveRequests.filter(r => r.status === "pending");
  const allRequests = leaveRequests;

  const filterRequests = (requests: LeaveRequest[]) => {
    if (statusFilter === "all") return requests;
    return requests.filter(r => r.status === statusFilter);
  };

  const openRequestDetail = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setIsDetailOpen(true);
  };

  const onSubmit = (data: LeaveRequestFormValues) => {
    toast({
      title: "Leave Request Submitted",
      description: "Your leave request has been submitted for approval.",
    });
    setIsNewRequestOpen(false);
    form.reset();
  };

  const handleApprove = () => {
    toast({
      title: "Leave Approved",
      description: "The leave request has been approved.",
    });
    setIsDetailOpen(false);
  };

  const handleReject = () => {
    toast({
      title: "Leave Rejected",
      description: "The leave request has been rejected.",
    });
    setIsDetailOpen(false);
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
          <TabsList>
            <TabsTrigger value="my-requests" data-testid="tab-my-requests">
              My Requests
              <Badge variant="secondary" className="ml-2 text-xs">
                {myRequests.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="pending-approvals" data-testid="tab-pending-approvals">
              Pending Approvals
              <Badge variant="secondary" className="ml-2 text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                {pendingApprovals.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="all-requests" data-testid="tab-all-requests">
              All Requests
            </TabsTrigger>
          </TabsList>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]" data-testid="select-leave-status-filter">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" data-testid="option-status-all">All Status</SelectItem>
              <SelectItem value="pending" data-testid="option-status-pending">Pending</SelectItem>
              <SelectItem value="approved" data-testid="option-status-approved">Approved</SelectItem>
              <SelectItem value="rejected" data-testid="option-status-rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
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
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Leave Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-leave-type">
                          <SelectValue placeholder="Select leave type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {leaveTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id} data-testid={`option-leave-type-${type.id}`}>
                            <div className="flex items-center gap-2">
                              <div 
                                className="h-2 w-2 rounded-full" 
                                style={{ backgroundColor: type.color }}
                              />
                              {type.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
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
                <Button type="submit" data-testid="button-submit-leave-request">
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

                {selectedRequest.status === "pending" && selectedRequest.employeeId !== currentUser.id && (
                  <div className="flex gap-2 pt-4">
                    <Button 
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700" 
                      onClick={handleApprove}
                      data-testid="button-approve-leave"
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Approve
                    </Button>
                    <Button 
                      variant="destructive" 
                      className="flex-1" 
                      onClick={handleReject}
                      data-testid="button-reject-leave"
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
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
            const StatusIcon = statusIcons[request.status];
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
                      <span className="font-medium" data-testid={`text-employee-name-${request.id}`}>
                        {employee?.firstName} {employee?.lastName}
                      </span>
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
                  <Badge variant="secondary" className={statusColors[request.status]} data-testid={`badge-status-${request.id}`}>
                    <StatusIcon className="mr-1 h-3 w-3" />
                    {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
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
