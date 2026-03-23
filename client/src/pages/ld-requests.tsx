import { useState } from "react";
import { TablePagination, usePagination } from "@/components/ui/table-pagination";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
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
import { useRole, canApproveLeave, canAccessLD } from "@/lib/role-context";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertLdRequestSchema } from "@shared/schema";
import type { LdRequest, Employee } from "@shared/schema";
import { z } from "zod";

const ldRequestFormSchema = insertLdRequestSchema.omit({ companyId: true, employeeId: true });
type LdRequestFormData = z.infer<typeof ldRequestFormSchema>;

const COURSE_TYPE_LABELS: Record<string, string> = {
  professional_certification: "Professional Certification",
  technical_skill_development: "Technical/Skill Development",
  leadership_management: "Leadership/Management",
  other: "Other",
};

const DELIVERY_MODE_LABELS: Record<string, string> = {
  physical: "Physical",
  virtual: "Virtual",
  hybrid: "Hybrid",
};

function getStatusBadge(status: string) {
  switch (status) {
    case "pending":
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Pending</Badge>;
    case "manager_approved":
      return <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Manager Approved</Badge>;
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

export default function LdRequests() {
  const { role } = useRole();
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
  const [adminComment, setAdminComment] = useState("");

  const isManagerOrAdmin = canApproveLeave(role);
  const isAdmin = role === "admin";
  const isManager = role === "manager";

  const { data: myRequests, isLoading: loadingMyRequests } = useQuery<LdRequest[]>({
    queryKey: ["/api/ld-requests"],
  });

  const { data: pendingRequests, isLoading: loadingPending } = useQuery<LdRequest[]>({
    queryKey: ["/api/ld-requests/pending"],
    enabled: isManagerOrAdmin,
  });

  const { data: managerApprovedRequests, isLoading: loadingManagerApproved } = useQuery<LdRequest[]>({
    queryKey: ["/api/ld-requests/manager-approved"],
    enabled: isAdmin,
  });

  const { data: allRequests, isLoading: loadingAll } = useQuery<LdRequest[]>({
    queryKey: ["/api/ld-requests/all"],
    enabled: isAdmin,
  });

  const { data: assignedRequests, isLoading: loadingAssigned } = useQuery<LdRequest[]>({
    queryKey: ["/api/ld-requests/assigned-to-me"],
    enabled: isManager,
  });

  const { data: employees } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const { paginatedItems: paginatedAssigned, currentPage: assignedPage, totalPages: assignedTotalPages, setCurrentPage: setAssignedPage, totalItems: assignedTotal, pageSize: assignedPageSize } = usePagination<LdRequest>(assignedRequests || [], 10);
  const { paginatedItems: paginatedMyRequests, currentPage: myPage, totalPages: myTotalPages, setCurrentPage: setMyPage, totalItems: myTotal, pageSize: myPageSize } = usePagination<LdRequest>(myRequests || [], 10);
  const { paginatedItems: paginatedPending, currentPage: pendingPage, totalPages: pendingTotalPages, setCurrentPage: setPendingPage, totalItems: pendingTotal, pageSize: pendingPageSize } = usePagination<LdRequest>(pendingRequests || [], 10);
  const { paginatedItems: paginatedManagerApproved, currentPage: maPage, totalPages: maTotalPages, setCurrentPage: setMaPage, totalItems: maTotal, pageSize: maPageSize } = usePagination<LdRequest>(managerApprovedRequests || [], 10);
  const { paginatedItems: paginatedAll, currentPage: allPage, totalPages: allTotalPages, setCurrentPage: setAllPage, totalItems: allTotal, pageSize: allPageSize } = usePagination<LdRequest>(allRequests || [], 10);

  const form = useForm<LdRequestFormData>({
    resolver: zodResolver(ldRequestFormSchema),
    defaultValues: {
      courseTitle: "",
      trainingProvider: "",
      courseType: "professional_certification",
      courseTypeOther: "",
      deliveryMode: "virtual",
      startDate: "",
      endDate: "",
      courseLink: "",
      learningObjectives: "",
    },
  });

  const watchCourseType = form.watch("courseType");

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/ld-requests"] });
    queryClient.invalidateQueries({ queryKey: ["/api/ld-requests/pending"] });
    queryClient.invalidateQueries({ queryKey: ["/api/ld-requests/manager-approved"] });
    queryClient.invalidateQueries({ queryKey: ["/api/ld-requests/all"] });
  };

  const createMutation = useMutation({
    mutationFn: async (data: LdRequestFormData) => {
      const res = await apiRequest("POST", "/api/ld-requests", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "L&D request submitted successfully" });
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
      const res = await apiRequest("PATCH", `/api/ld-requests/${id}/cancel`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Request cancelled" });
      invalidateAll();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to cancel request", description: error.message, variant: "destructive" });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, comment }: { id: string; comment: string }) => {
      const res = await apiRequest("PATCH", `/api/ld-requests/${id}/approve`, { managerComment: comment });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Request approved" });
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
      const res = await apiRequest("PATCH", `/api/ld-requests/${id}/reject`, { managerComment: comment });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Request rejected" });
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
      const res = await apiRequest("PATCH", `/api/ld-requests/${id}/assign`, { assignedTo, adminComment });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Request approved and assigned" });
      setAssignDialogOpen(false);
      setAssignRequestId(null);
      setAssignTo("");
      setAdminComment("");
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

  function onSubmit(values: LdRequestFormData) {
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
    setAdminComment("");
    setAssignDialogOpen(true);
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Learning & Development</h1>
          <p className="text-muted-foreground">Request training courses and manage L&D approvals</p>
        </div>
        <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Request
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New L&D Request</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="courseTitle" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Course Title</FormLabel>
                    <FormControl><Input {...field} placeholder="Enter course title" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="trainingProvider" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Training Provider/Institution</FormLabel>
                    <FormControl><Input {...field} placeholder="Enter training provider" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="courseType" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Course Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select course type" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="professional_certification">Professional Certification</SelectItem>
                        <SelectItem value="technical_skill_development">Technical/Skill Development</SelectItem>
                        <SelectItem value="leadership_management">Leadership/Management</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                {watchCourseType === "other" && (
                  <FormField control={form.control} name="courseTypeOther" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Specify Course Type</FormLabel>
                      <FormControl><Input {...field} value={field.value || ""} placeholder="Specify the course type" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}
                <FormField control={form.control} name="deliveryMode" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mode of Delivery</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select delivery mode" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="physical">Physical</SelectItem>
                        <SelectItem value="virtual">Virtual</SelectItem>
                        <SelectItem value="hybrid">Hybrid</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="startDate" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="endDate" render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="courseLink" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Link to Course (optional)</FormLabel>
                    <FormControl><Input {...field} value={field.value || ""} placeholder="https://..." /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="learningObjectives" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Learning Objectives</FormLabel>
                    <FormControl><Textarea {...field} placeholder="Describe what you aim to learn" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
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
          {isManagerOrAdmin && <TabsTrigger value="pending-approval">Pending Approval</TabsTrigger>}
          {isAdmin && <TabsTrigger value="awaiting-assignment">Awaiting Assignment</TabsTrigger>}
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
                    <TableHead>Course Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedMyRequests.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell className="font-medium">{req.courseTitle}</TableCell>
                      <TableCell>{COURSE_TYPE_LABELS[req.courseType] || req.courseType}</TableCell>
                      <TableCell>{req.trainingProvider}</TableCell>
                      <TableCell className="whitespace-nowrap">{new Date(req.startDate).toLocaleDateString()} - {new Date(req.endDate).toLocaleDateString()}</TableCell>
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
              <h3 className="text-lg font-medium text-muted-foreground">No L&D requests yet</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">Your training requests will appear here once you submit them.</p>
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
                    <TableHead>Course Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Requested By</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead>Delivery Mode</TableHead>
                    <TableHead>Objectives</TableHead>
                    <TableHead>Course Link</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedAssigned.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell className="font-medium">{req.courseTitle}</TableCell>
                      <TableCell>{COURSE_TYPE_LABELS[req.courseType] || req.courseType}{req.courseType === "other" && req.courseTypeOther ? ` (${req.courseTypeOther})` : ""}</TableCell>
                      <TableCell>{req.trainingProvider}</TableCell>
                      <TableCell>{getEmployeeName(req.employeeId, employees)}</TableCell>
                      <TableCell className="whitespace-nowrap">{new Date(req.startDate).toLocaleDateString()} - {new Date(req.endDate).toLocaleDateString()}</TableCell>
                      <TableCell>{DELIVERY_MODE_LABELS[req.deliveryMode] || req.deliveryMode}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{req.learningObjectives}</TableCell>
                      <TableCell>{req.courseLink ? <a href={req.courseLink} target="_blank" rel="noopener noreferrer" className="text-primary underline">View</a> : "-"}</TableCell>
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
              <p className="text-sm text-muted-foreground mt-1 max-w-md">L&D requests assigned to you will appear here.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="pending-approval">
          {loadingPending ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : pendingRequests && pendingRequests.length > 0 ? (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Course Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Objectives</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedPending.map((req) => {
                    const isPending = req.status === "pending";
                    const isManagerApproved = req.status === "manager_approved";
                    return (
                      <TableRow key={req.id}>
                        <TableCell>{getEmployeeName(req.employeeId, employees)}</TableCell>
                        <TableCell className="font-medium">{req.courseTitle}</TableCell>
                        <TableCell>{COURSE_TYPE_LABELS[req.courseType] || req.courseType}</TableCell>
                        <TableCell>{req.trainingProvider}</TableCell>
                        <TableCell className="whitespace-nowrap">{new Date(req.startDate).toLocaleDateString()} - {new Date(req.endDate).toLocaleDateString()}</TableCell>
                        <TableCell>{getStatusBadge(req.status)}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{req.learningObjectives}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {isAdmin && isManagerApproved ? (
                              <Button size="sm" onClick={() => openAssignDialog(req.id)}>
                                Assign & Approve
                              </Button>
                            ) : (
                              <Button size="sm" onClick={() => openActionDialog("approve", req.id)}>
                                <Check className="mr-1 h-4 w-4" /> {isAdmin ? "Final Approve" : "Approve"}
                              </Button>
                            )}
                            {isPending && (
                              <Button size="sm" variant="destructive" onClick={() => openActionDialog("reject", req.id)}>
                                <X className="mr-1 h-4 w-4" /> Reject
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <TablePagination currentPage={pendingPage} totalPages={pendingTotalPages} onPageChange={setPendingPage} totalItems={pendingTotal} pageSize={pendingPageSize} />
            </Card>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Inbox className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground">No pending approvals</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">L&D requests awaiting your approval will appear here.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="awaiting-assignment">
          {loadingManagerApproved ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : managerApprovedRequests && managerApprovedRequests.length > 0 ? (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Course Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead>Manager Comment</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedManagerApproved.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell>{getEmployeeName(req.employeeId, employees)}</TableCell>
                      <TableCell className="font-medium">{req.courseTitle}</TableCell>
                      <TableCell>{COURSE_TYPE_LABELS[req.courseType] || req.courseType}</TableCell>
                      <TableCell>{req.trainingProvider}</TableCell>
                      <TableCell className="whitespace-nowrap">{new Date(req.startDate).toLocaleDateString()} - {new Date(req.endDate).toLocaleDateString()}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{req.managerComment || "-"}</TableCell>
                      <TableCell>
                        <Button size="sm" onClick={() => openAssignDialog(req.id)}>
                          Assign & Approve
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination currentPage={maPage} totalPages={maTotalPages} onPageChange={setMaPage} totalItems={maTotal} pageSize={maPageSize} />
            </Card>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Inbox className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground">No requests awaiting assignment</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">Manager-approved L&D requests will appear here for assignment.</p>
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
                    <TableHead>Course Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Dates</TableHead>
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
                      <TableCell className="font-medium">{req.courseTitle}</TableCell>
                      <TableCell>{COURSE_TYPE_LABELS[req.courseType] || req.courseType}</TableCell>
                      <TableCell>{req.trainingProvider}</TableCell>
                      <TableCell className="whitespace-nowrap">{new Date(req.startDate).toLocaleDateString()} - {new Date(req.endDate).toLocaleDateString()}</TableCell>
                      <TableCell>{getStatusBadge(req.status)}</TableCell>
                      <TableCell>{req.assignedTo ? getEmployeeName(req.assignedTo, employees) : "-"}</TableCell>
                      <TableCell>{req.createdAt ? new Date(req.createdAt).toLocaleDateString() : "-"}</TableCell>
                      <TableCell>
                        {(req.status === "approved" || req.status === "manager_approved") && (
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
              <h3 className="text-lg font-medium text-muted-foreground">No L&D requests yet</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">All organization L&D requests will appear here.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Approve/Reject Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={(open) => { setActionDialogOpen(open); if (!open) { setActionRequestId(null); setActionComment(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{actionType === "approve" ? "Approve" : "Reject"} L&D Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Comment <span className="text-destructive">*</span></Label>
              <Textarea
                value={actionComment}
                onChange={(e) => setActionComment(e.target.value)}
                placeholder={actionType === "approve" ? "Enter approval comment (required)" : "Enter reason for rejection (required)"}
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
              disabled={(actionType === "approve" ? approveMutation.isPending : rejectMutation.isPending) || !actionComment.trim()}
            >
              {(actionType === "approve" ? approveMutation.isPending : rejectMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {actionType === "approve" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={(open) => { setAssignDialogOpen(open); if (!open) { setAssignRequestId(null); setAssignTo(""); setAdminComment(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign & Approve L&D Request</DialogTitle>
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
              <Label>Admin Comment (optional)</Label>
              <Textarea
                value={adminComment}
                onChange={(e) => setAdminComment(e.target.value)}
                placeholder="Enter any notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAssignDialogOpen(false); setAssignRequestId(null); }}>
              Cancel
            </Button>
            <Button
              onClick={() => { if (assignRequestId) assignMutation.mutate({ id: assignRequestId, assignedTo: assignTo, adminComment }); }}
              disabled={assignMutation.isPending || !assignTo}
            >
              {assignMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Approve & Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
