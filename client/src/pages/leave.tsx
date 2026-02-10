import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Inbox, Plus, Check, X, Loader2, Info } from "lucide-react";
import { useRole, canApproveLeave, canViewAllRequests, canAccessLeave } from "@/lib/role-context";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertLeaveRequestSchema } from "@shared/schema";
import type { LeaveRequest, LeaveType, LeaveBalance, Employee } from "@shared/schema";
import { z } from "zod";

const leaveRequestFormSchema = insertLeaveRequestSchema.omit({ companyId: true, employeeId: true });
type LeaveRequestFormData = z.infer<typeof leaveRequestFormSchema>;

function getStatusBadge(status: string) {
  switch (status) {
    case "pending":
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" data-testid={`badge-status-${status}`}>Pending Manager</Badge>;
    case "manager_approved":
      return <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" data-testid={`badge-status-${status}`}>Awaiting Admin</Badge>;
    case "approved":
      return <Badge variant="default" className="bg-green-600 text-white" data-testid={`badge-status-${status}`}>Approved</Badge>;
    case "rejected":
      return <Badge variant="destructive" data-testid={`badge-status-${status}`}>Rejected</Badge>;
    case "cancelled":
      return <Badge variant="outline" data-testid={`badge-status-${status}`}>Cancelled</Badge>;
    default:
      return <Badge variant="outline" data-testid={`badge-status-${status}`}>{status}</Badge>;
  }
}

function getLeaveTypeName(leaveTypeId: string, leaveTypes: LeaveType[] | undefined) {
  if (!leaveTypes) return leaveTypeId;
  const lt = leaveTypes.find((t) => t.id === leaveTypeId);
  return lt ? lt.name : leaveTypeId;
}

function getEmployeeName(employeeId: string, employees: Employee[] | undefined) {
  if (!employees) return employeeId;
  const emp = employees.find((e) => e.id === employeeId);
  return emp ? `${emp.firstName} ${emp.lastName}` : employeeId;
}

export default function Leave() {
  const { role } = useRole();
  const [activeTab, setActiveTab] = useState("my-requests");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [approvingRequestId, setApprovingRequestId] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingRequestId, setRejectingRequestId] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState("");
  const [rejectionDetailOpen, setRejectionDetailOpen] = useState(false);
  const [rejectionDetail, setRejectionDetail] = useState<{ name: string; reason: string } | null>(null);

  const currentYear = new Date().getFullYear();

  const { data: leaveTypes, isLoading: loadingTypes } = useQuery<LeaveType[]>({
    queryKey: ["/api/leave-types"],
  });

  const { data: leaveBalances, isLoading: loadingBalances } = useQuery<LeaveBalance[]>({
    queryKey: ["/api/leave-balances", `?year=${currentYear}`],
  });

  const { data: myRequests, isLoading: loadingMyRequests } = useQuery<LeaveRequest[]>({
    queryKey: ["/api/leave-requests"],
  });

  const { data: pendingRequests, isLoading: loadingPending } = useQuery<LeaveRequest[]>({
    queryKey: ["/api/leave-requests/pending"],
    enabled: canApproveLeave(role),
  });

  const { data: allRequests, isLoading: loadingAll } = useQuery<LeaveRequest[]>({
    queryKey: ["/api/leave-requests/all"],
    enabled: canViewAllRequests(role),
  });

  const { data: employees } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
    enabled: canApproveLeave(role) || canViewAllRequests(role),
  });


  const form = useForm<LeaveRequestFormData>({
    resolver: zodResolver(leaveRequestFormSchema),
    defaultValues: {
      leaveTypeId: "",
      startDate: "",
      endDate: "",
      reason: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: LeaveRequestFormData) => {
      const res = await apiRequest("POST", "/api/leave-requests", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Leave request submitted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/leave-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leave-balances"] });
      setRequestDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to submit leave request", description: error.message, variant: "destructive" });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PATCH", `/api/leave-requests/${id}/cancel`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Leave request cancelled" });
      queryClient.invalidateQueries({ queryKey: ["/api/leave-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leave-balances"] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to cancel request", description: error.message, variant: "destructive" });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PATCH", `/api/leave-requests/${id}/approve`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Leave request approved" });
      setApproveDialogOpen(false);
      setApprovingRequestId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/leave-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leave-requests/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leave-requests/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leave-balances"] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to approve request", description: error.message, variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, comment }: { id: string; comment: string }) => {
      const res = await apiRequest("PATCH", `/api/leave-requests/${id}/reject`, { approverComment: comment });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Leave request rejected" });
      setRejectDialogOpen(false);
      setRejectingRequestId(null);
      setRejectComment("");
      queryClient.invalidateQueries({ queryKey: ["/api/leave-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leave-requests/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leave-requests/all"] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to reject request", description: error.message, variant: "destructive" });
    },
  });

  if (!canAccessLeave(role)) {
    navigate("/");
    return null;
  }

  function onSubmitLeave(values: LeaveRequestFormData) {
    createMutation.mutate(values);
  }

  function handleLeaveTypeChange(leaveTypeId: string) {
    const lt = leaveTypes?.find((t) => t.id === leaveTypeId);
    if (lt) {
      form.setValue("companyId", lt.companyId);
    }
    form.setValue("leaveTypeId", leaveTypeId);
  }

  function handleReject(id: string) {
    setRejectingRequestId(id);
    setRejectComment("");
    setRejectDialogOpen(true);
  }

  function submitReject() {
    if (rejectingRequestId) {
      rejectMutation.mutate({ id: rejectingRequestId, comment: rejectComment });
    }
  }

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
        <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-request-leave">
              <Plus className="mr-2 h-4 w-4" />
              Request Leave
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Leave</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmitLeave)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="leaveTypeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Leave Type</FormLabel>
                      <Select
                        onValueChange={(val) => {
                          field.onChange(val);
                          handleLeaveTypeChange(val);
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-leave-type">
                            <SelectValue placeholder="Select leave type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {leaveTypes?.map((lt) => (
                            <SelectItem key={lt.id} value={lt.id} data-testid={`option-leave-type-${lt.id}`}>
                              {lt.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Enter reason for leave" data-testid="input-reason" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-leave">
                    {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Submit Request
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="my-requests" data-testid="tab-my-requests">
            My Requests
          </TabsTrigger>
          {canApproveLeave(role) && (
            <TabsTrigger value="pending-approvals" data-testid="tab-pending-approvals">
              Pending Approvals
            </TabsTrigger>
          )}
          {canViewAllRequests(role) && (
            <TabsTrigger value="all-requests" data-testid="tab-all-requests">
              All Requests
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="my-requests">
          <div className="space-y-6">
            {loadingBalances || loadingTypes ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : leaveBalances && leaveBalances.length > 0 ? (
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {leaveBalances.map((balance) => {
                  const lt = leaveTypes?.find((t) => t.id === balance.leaveTypeId);
                  const color = lt?.color || "#6b7280";
                  return (
                    <Card key={balance.id} className="min-w-[200px] flex-shrink-0" data-testid={`card-balance-${balance.id}`}>
                      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                          {lt?.name || "Unknown"}
                        </CardTitle>
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold" data-testid={`text-remaining-${balance.id}`}>
                          {balance.remainingDays}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {balance.usedDays} used of {balance.totalDays} days
                        </p>
                        <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              backgroundColor: color,
                              width: `${balance.totalDays > 0 ? (balance.usedDays / balance.totalDays) * 100 : 0}%`,
                            }}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : null}

            {loadingMyRequests ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : myRequests && myRequests.length > 0 ? (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Leave Type</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Days</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted On</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myRequests.map((req) => (
                      <TableRow key={req.id} data-testid={`row-request-${req.id}`}>
                        <TableCell>{getLeaveTypeName(req.leaveTypeId, leaveTypes)}</TableCell>
                        <TableCell>{new Date(req.startDate).toLocaleDateString()}</TableCell>
                        <TableCell>{new Date(req.endDate).toLocaleDateString()}</TableCell>
                        <TableCell>{req.totalDays}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            {getStatusBadge(req.status)}
                            {req.status === "rejected" && ((req as any).approverComment || (req as any).approverName) && (
                              <button
                                className="inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                                onClick={() => {
                                  setRejectionDetail({
                                    name: (req as any).approverName || "Unknown",
                                    reason: (req as any).approverComment || "No reason provided",
                                  });
                                  setRejectionDetailOpen(true);
                                }}
                                data-testid={`button-view-rejection-${req.id}`}
                              >
                                <Info className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{req.createdAt ? new Date(req.createdAt).toLocaleDateString() : "-"}</TableCell>
                        <TableCell>
                          {(req.status === "pending" || req.status === "manager_approved") && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => cancelMutation.mutate(req.id)}
                              disabled={cancelMutation.isPending}
                              data-testid={`button-cancel-${req.id}`}
                            >
                              Cancel
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Inbox className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground">No leave requests yet</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-md">
                  Your leave requests will appear here once you submit them.
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="pending-approvals">
          {loadingPending ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : pendingRequests && pendingRequests.length > 0 ? (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Leave Type</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingRequests.map((req) => {
                    const canApproveThis = (role === "manager" && req.status === "pending") || (role === "admin" && (req.status === "pending" || req.status === "manager_approved"));
                    const canRejectThis = (role === "manager" && req.status === "pending") || (role === "admin" && (req.status === "pending" || req.status === "manager_approved"));
                    return (
                      <TableRow key={req.id} data-testid={`row-pending-${req.id}`}>
                        <TableCell>{getEmployeeName(req.employeeId, employees)}</TableCell>
                        <TableCell>{getLeaveTypeName(req.leaveTypeId, leaveTypes)}</TableCell>
                        <TableCell>{new Date(req.startDate).toLocaleDateString()}</TableCell>
                        <TableCell>{new Date(req.endDate).toLocaleDateString()}</TableCell>
                        <TableCell>{req.totalDays}</TableCell>
                        <TableCell>{getStatusBadge(req.status)}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{req.reason}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 flex-wrap">
                            {canApproveThis && (
                              <Button
                                size="sm"
                                onClick={() => { setApprovingRequestId(req.id); setApproveDialogOpen(true); }}
                                disabled={approveMutation.isPending}
                                data-testid={`button-approve-${req.id}`}
                              >
                                <Check className="mr-1 h-4 w-4" />
                                {role === "manager" ? "Approve" : "Final Approve"}
                              </Button>
                            )}
                            {canRejectThis && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleReject(req.id)}
                                disabled={rejectMutation.isPending}
                                data-testid={`button-reject-${req.id}`}
                              >
                                <X className="mr-1 h-4 w-4" />
                                Reject
                              </Button>
                            )}
                            {!canApproveThis && !canRejectThis && (
                              <span className="text-xs text-muted-foreground">Awaiting manager</span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Inbox className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground">No pending approvals</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">
                Leave requests awaiting your approval will appear here.
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="all-requests">
          {loadingAll ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : allRequests && allRequests.length > 0 ? (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Leave Type</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted On</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allRequests.map((req) => (
                    <TableRow key={req.id} data-testid={`row-all-${req.id}`}>
                      <TableCell>{getEmployeeName(req.employeeId, employees)}</TableCell>
                      <TableCell>{getLeaveTypeName(req.leaveTypeId, leaveTypes)}</TableCell>
                      <TableCell>{new Date(req.startDate).toLocaleDateString()}</TableCell>
                      <TableCell>{new Date(req.endDate).toLocaleDateString()}</TableCell>
                      <TableCell>{req.totalDays}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {getStatusBadge(req.status)}
                          {req.status === "rejected" && ((req as any).approverComment || (req as any).approverName) && (
                            <button
                              className="inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                              onClick={() => {
                                setRejectionDetail({
                                  name: (req as any).approverName || "Unknown",
                                  reason: (req as any).approverComment || "No reason provided",
                                });
                                setRejectionDetailOpen(true);
                              }}
                              data-testid={`button-view-rejection-all-${req.id}`}
                            >
                              <Info className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{req.createdAt ? new Date(req.createdAt).toLocaleDateString() : "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Inbox className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground">No leave requests yet</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">
                All organization leave requests will appear here.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>



      <Dialog open={approveDialogOpen} onOpenChange={(open) => { setApproveDialogOpen(open); if (!open) setApprovingRequestId(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Approval</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure you want to approve this leave request?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setApproveDialogOpen(false); setApprovingRequestId(null); }} data-testid="button-cancel-approve">
              Cancel
            </Button>
            <Button
              onClick={() => { if (approvingRequestId) approveMutation.mutate(approvingRequestId); }}
              disabled={approveMutation.isPending}
              data-testid="button-confirm-approve"
            >
              {approveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Leave Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reject-comment">Reason for rejection <span className="text-destructive">*</span></Label>
              <Textarea
                id="reject-comment"
                value={rejectComment}
                onChange={(e) => setRejectComment(e.target.value)}
                placeholder="Enter reason for rejection (required)"
                data-testid="input-reject-comment"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)} data-testid="button-cancel-reject">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={submitReject}
              disabled={rejectMutation.isPending || !rejectComment.trim()}
              data-testid="button-confirm-reject"
            >
              {rejectMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectionDetailOpen} onOpenChange={(open) => { setRejectionDetailOpen(open); if (!open) setRejectionDetail(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rejection Details</DialogTitle>
          </DialogHeader>
          {rejectionDetail && (
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Rejected by</p>
                <p className="text-sm" data-testid="text-rejector-name">{rejectionDetail.name}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Reason</p>
                <p className="text-sm" data-testid="text-rejection-reason">{rejectionDetail.reason}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
