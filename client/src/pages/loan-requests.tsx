import { useState } from "react";
import { TablePagination, usePagination } from "@/components/ui/table-pagination";
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
import { Inbox, Plus, Check, X, Loader2 } from "lucide-react";
import { useRole, canAccessLD } from "@/lib/role-context";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertLoanRequestSchema } from "@shared/schema";
import type { LoanRequest, Employee, Department } from "@shared/schema";
import { z } from "zod";

const loanFormSchema = insertLoanRequestSchema.omit({ companyId: true, employeeId: true });
type LoanFormData = z.infer<typeof loanFormSchema>;

function getStatusBadge(status: string) {
  switch (status) {
    case "pending":
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Pending</Badge>;
    case "approved":
      return <Badge variant="default" className="bg-green-600 text-white">Approved</Badge>;
    case "rejected":
      return <Badge variant="destructive">Rejected</Badge>;
    case "cancelled":
      return <Badge variant="outline">Cancelled</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function getEmployeeName(employeeId: string, employees: Employee[] | undefined) {
  if (!employees) return employeeId;
  const emp = employees.find((e) => e.id === employeeId);
  return emp ? `${emp.firstName} ${emp.lastName}` : employeeId;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0 }).format(amount);
}

export default function LoanRequests() {
  const { role, currentUser } = useRole();
  const [activeTab, setActiveTab] = useState("my-requests");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<"approve" | "reject">("approve");
  const [actionRequestId, setActionRequestId] = useState<string | null>(null);
  const [actionComment, setActionComment] = useState("");
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignRequestId, setAssignRequestId] = useState<string | null>(null);
  const [assignTo, setAssignTo] = useState("");
  const [assignComment, setAssignComment] = useState("");

  const isAdmin = role === "admin";
  const isManager = role === "manager";

  const { data: myRequests, isLoading: loadingMyRequests } = useQuery<LoanRequest[]>({
    queryKey: ["/api/loan-requests"],
  });

  const { data: assignedRequests, isLoading: loadingAssigned } = useQuery<LoanRequest[]>({
    queryKey: ["/api/loan-requests/assigned-to-me"],
    enabled: isManager,
  });

  const { data: pendingRequests, isLoading: loadingPending } = useQuery<LoanRequest[]>({
    queryKey: ["/api/loan-requests/pending"],
    enabled: isAdmin,
  });

  const { data: allRequests, isLoading: loadingAll } = useQuery<LoanRequest[]>({
    queryKey: ["/api/loan-requests/all"],
    enabled: isAdmin,
  });

  const { data: employees } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const { data: departments } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
  });

  const { paginatedItems: paginatedMy, currentPage: myPage, totalPages: myTotalPages, setCurrentPage: setMyPage, totalItems: myTotal, pageSize: myPageSize } = usePagination<LoanRequest>(myRequests || [], 10);
  const { paginatedItems: paginatedAssigned, currentPage: assignedPage, totalPages: assignedTotalPages, setCurrentPage: setAssignedPage, totalItems: assignedTotal, pageSize: assignedPageSize } = usePagination<LoanRequest>(assignedRequests || [], 10);
  const { paginatedItems: paginatedPending, currentPage: pendingPage, totalPages: pendingTotalPages, setCurrentPage: setPendingPage, totalItems: pendingTotal, pageSize: pendingPageSize } = usePagination<LoanRequest>(pendingRequests || [], 10);
  const { paginatedItems: paginatedAll, currentPage: allPage, totalPages: allTotalPages, setCurrentPage: setAllPage, totalItems: allTotal, pageSize: allPageSize } = usePagination<LoanRequest>(allRequests || [], 10);

  const form = useForm<LoanFormData>({
    resolver: zodResolver(loanFormSchema),
    defaultValues: {
      purpose: "",
      amountRequested: 0,
      repaymentDuration: 1,
      monthlyInstallment: 0,
    },
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/loan-requests"] });
    queryClient.invalidateQueries({ queryKey: ["/api/loan-requests/pending"] });
    queryClient.invalidateQueries({ queryKey: ["/api/loan-requests/all"] });
    queryClient.invalidateQueries({ queryKey: ["/api/loan-requests/assigned-to-me"] });
  };

  const createMutation = useMutation({
    mutationFn: async (data: LoanFormData) => {
      const res = await apiRequest("POST", "/api/loan-requests", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Loan request submitted successfully" });
      invalidateAll();
      setRequestDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to submit request", description: error.message, variant: "destructive" });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PATCH", `/api/loan-requests/${id}/cancel`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Loan request cancelled" });
      invalidateAll();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to cancel request", description: error.message, variant: "destructive" });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, comment }: { id: string; comment: string }) => {
      const res = await apiRequest("PATCH", `/api/loan-requests/${id}/approve`, { adminComment: comment });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Loan request approved" });
      setActionDialogOpen(false);
      setActionRequestId(null);
      setActionComment("");
      invalidateAll();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to approve request", description: error.message, variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, comment }: { id: string; comment: string }) => {
      const res = await apiRequest("PATCH", `/api/loan-requests/${id}/reject`, { adminComment: comment });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Loan request rejected" });
      setActionDialogOpen(false);
      setActionRequestId(null);
      setActionComment("");
      invalidateAll();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to reject request", description: error.message, variant: "destructive" });
    },
  });

  const assignMutation = useMutation({
    mutationFn: async ({ id, assignedTo, adminComment }: { id: string; assignedTo: string; adminComment: string }) => {
      const res = await apiRequest("PATCH", `/api/loan-requests/${id}/assign`, { assignedTo, adminComment });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Loan request assigned" });
      setAssignDialogOpen(false);
      setAssignRequestId(null);
      setAssignTo("");
      setAssignComment("");
      invalidateAll();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to assign request", description: error.message, variant: "destructive" });
    },
  });

  if (!canAccessLD(role)) {
    navigate("/");
    return null;
  }

  function onSubmit(values: LoanFormData) {
    createMutation.mutate(values);
  }

  function openActionDialog(type: "approve" | "reject", id: string) {
    setActionType(type);
    setActionRequestId(id);
    setActionComment("");
    setActionDialogOpen(true);
  }

  function submitAction() {
    if (!actionRequestId) return;
    if (actionType === "approve") {
      approveMutation.mutate({ id: actionRequestId, comment: actionComment });
    } else {
      rejectMutation.mutate({ id: actionRequestId, comment: actionComment });
    }
  }

  function openAssignDialog(id: string) {
    setAssignRequestId(id);
    setAssignTo("");
    setAssignComment("");
    setAssignDialogOpen(true);
  }

  const watchAmount = form.watch("amountRequested");
  const watchDuration = form.watch("repaymentDuration");

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Loan Requests</h1>
          <p className="text-muted-foreground">Request salary advances and loans</p>
        </div>
        <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Loan Request
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New Loan Request</DialogTitle>
            </DialogHeader>

            <div className="rounded-md bg-muted/50 border p-4 text-sm space-y-2 mb-2">
              <p className="font-semibold">Loan Policy</p>
              <p className="text-muted-foreground text-xs">This loan is given to full-time employees with the following conditions:</p>
              <ol className="text-muted-foreground text-xs list-decimal list-inside space-y-1">
                <li>You agree to monthly deductions from your pay as indicated</li>
                <li>You agree to pay the loan in the duration indicated, or face a penalty</li>
                <li>The penalty shall be as determined by the Finance Committee or the Executive Committee</li>
              </ol>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="purpose" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purpose of Loan</FormLabel>
                    <FormControl><Textarea {...field} placeholder="Describe the purpose of this loan request" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="amountRequested" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount Requested (NGN)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        {...field}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          field.onChange(val);
                          const duration = form.getValues("repaymentDuration");
                          if (duration > 0) {
                            form.setValue("monthlyInstallment", Math.ceil(val / duration));
                          }
                        }}
                        placeholder="Enter amount"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="repaymentDuration" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Payment Duration (months)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        {...field}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 1;
                          field.onChange(val);
                          const amount = form.getValues("amountRequested");
                          if (val > 0) {
                            form.setValue("monthlyInstallment", Math.ceil(amount / val));
                          }
                        }}
                        placeholder="Number of months"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="monthlyInstallment" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monthly Installment (NGN)</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} placeholder="Monthly deduction amount" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {watchAmount > 0 && watchDuration > 0 && (
                  <div className="rounded-md bg-muted px-3 py-2 text-sm">
                    <span className="text-muted-foreground">Summary: </span>
                    <span className="font-medium">{formatCurrency(watchAmount)}</span>
                    <span className="text-muted-foreground"> over </span>
                    <span className="font-medium">{watchDuration} month{watchDuration > 1 ? "s" : ""}</span>
                    <span className="text-muted-foreground"> at </span>
                    <span className="font-medium">{formatCurrency(form.watch("monthlyInstallment"))}/mo</span>
                  </div>
                )}

                <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-sm">
                  <p className="text-muted-foreground">By submitting this request, I understand and accept the terms of the loan outlined above.</p>
                </div>

                <DialogFooter>
                  <Button type="submit" disabled={createMutation.isPending}>
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
          <TabsTrigger value="my-requests">My Requests</TabsTrigger>
          {isManager && <TabsTrigger value="my-assignments">My Assignments</TabsTrigger>}
          {isAdmin && <TabsTrigger value="pending">Pending Approval</TabsTrigger>}
          {isAdmin && <TabsTrigger value="all-requests">All Requests</TabsTrigger>}
        </TabsList>

        <TabsContent value="my-requests">
          {loadingMyRequests ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : myRequests && myRequests.length > 0 ? (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Purpose</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Monthly Installment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedMy.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell className="max-w-[200px] truncate">{req.purpose}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(req.amountRequested)}</TableCell>
                      <TableCell>{req.repaymentDuration} month{req.repaymentDuration > 1 ? "s" : ""}</TableCell>
                      <TableCell>{formatCurrency(req.monthlyInstallment)}</TableCell>
                      <TableCell>{getStatusBadge(req.status)}</TableCell>
                      <TableCell>{req.createdAt ? new Date(req.createdAt).toLocaleDateString() : "-"}</TableCell>
                      <TableCell>
                        {req.status === "pending" && (
                          <Button variant="outline" size="sm" onClick={() => cancelMutation.mutate(req.id)} disabled={cancelMutation.isPending}>
                            Cancel
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination currentPage={myPage} totalPages={myTotalPages} onPageChange={setMyPage} totalItems={myTotal} pageSize={myPageSize} />
            </Card>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Inbox className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground">No loan requests yet</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">Your loan requests will appear here once you submit them.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="my-assignments">
          {loadingAssigned ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : assignedRequests && assignedRequests.length > 0 ? (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Requested By</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Monthly Installment</TableHead>
                    <TableHead>Submitted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedAssigned.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell>{getEmployeeName(req.employeeId, employees)}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{req.purpose}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(req.amountRequested)}</TableCell>
                      <TableCell>{req.repaymentDuration} month{req.repaymentDuration > 1 ? "s" : ""}</TableCell>
                      <TableCell>{formatCurrency(req.monthlyInstallment)}</TableCell>
                      <TableCell>{req.createdAt ? new Date(req.createdAt).toLocaleDateString() : "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination currentPage={assignedPage} totalPages={assignedTotalPages} onPageChange={setAssignedPage} totalItems={assignedTotal} pageSize={assignedPageSize} />
            </Card>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Inbox className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground">No assignments yet</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">Loan requests assigned to you will appear here.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="pending">
          {loadingPending ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : pendingRequests && pendingRequests.length > 0 ? (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Monthly Installment</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedPending.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell>{getEmployeeName(req.employeeId, employees)}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{req.purpose}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(req.amountRequested)}</TableCell>
                      <TableCell>{req.repaymentDuration} month{req.repaymentDuration > 1 ? "s" : ""}</TableCell>
                      <TableCell>{formatCurrency(req.monthlyInstallment)}</TableCell>
                      <TableCell>{req.createdAt ? new Date(req.createdAt).toLocaleDateString() : "-"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button size="sm" onClick={() => openActionDialog("approve", req.id)}>
                            <Check className="mr-1 h-4 w-4" /> Approve
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => openActionDialog("reject", req.id)}>
                            <X className="mr-1 h-4 w-4" /> Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination currentPage={pendingPage} totalPages={pendingTotalPages} onPageChange={setPendingPage} totalItems={pendingTotal} pageSize={pendingPageSize} />
            </Card>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Inbox className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground">No pending loan requests</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">Loan requests awaiting your approval will appear here.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="all-requests">
          {loadingAll ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : allRequests && allRequests.length > 0 ? (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Monthly Installment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedAll.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell>{getEmployeeName(req.employeeId, employees)}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{req.purpose}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(req.amountRequested)}</TableCell>
                      <TableCell>{req.repaymentDuration} month{req.repaymentDuration > 1 ? "s" : ""}</TableCell>
                      <TableCell>{formatCurrency(req.monthlyInstallment)}</TableCell>
                      <TableCell>{getStatusBadge(req.status)}</TableCell>
                      <TableCell>{req.assignedTo ? getEmployeeName(req.assignedTo, employees) : "-"}</TableCell>
                      <TableCell>{req.createdAt ? new Date(req.createdAt).toLocaleDateString() : "-"}</TableCell>
                      <TableCell>
                        {(req.status === "approved" || req.status === "pending") && (
                          <Button size="sm" variant="outline" onClick={() => openAssignDialog(req.id)}>
                            {req.assignedTo ? "Reassign" : "Assign"}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination currentPage={allPage} totalPages={allTotalPages} onPageChange={setAllPage} totalItems={allTotal} pageSize={allPageSize} />
            </Card>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Inbox className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground">No loan requests yet</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">All organization loan requests will appear here.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Approve/Reject Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={(open) => { setActionDialogOpen(open); if (!open) { setActionRequestId(null); setActionComment(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{actionType === "approve" ? "Approve" : "Reject"} Loan Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Comment {actionType === "reject" && <span className="text-destructive">*</span>}</Label>
              <Textarea
                value={actionComment}
                onChange={(e) => setActionComment(e.target.value)}
                placeholder={actionType === "approve" ? "Optional comment" : "Enter reason for rejection (required)"}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setActionDialogOpen(false); setActionRequestId(null); setActionComment(""); }}>
              Cancel
            </Button>
            <Button
              variant={actionType === "reject" ? "destructive" : "default"}
              onClick={submitAction}
              disabled={(actionType === "approve" ? approveMutation.isPending : rejectMutation.isPending) || (actionType === "reject" && !actionComment.trim())}
            >
              {(actionType === "approve" ? approveMutation.isPending : rejectMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {actionType === "approve" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={(open) => { setAssignDialogOpen(open); if (!open) { setAssignRequestId(null); setAssignTo(""); setAssignComment(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Loan Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Assign To</Label>
              <Select onValueChange={setAssignTo} value={assignTo}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {employees?.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Comment (optional)</Label>
              <Textarea
                value={assignComment}
                onChange={(e) => setAssignComment(e.target.value)}
                placeholder="Enter any notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAssignDialogOpen(false); setAssignRequestId(null); }}>
              Cancel
            </Button>
            <Button
              onClick={() => { if (assignRequestId) assignMutation.mutate({ id: assignRequestId, assignedTo: assignTo, adminComment: assignComment }); }}
              disabled={assignMutation.isPending || !assignTo}
            >
              {assignMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
