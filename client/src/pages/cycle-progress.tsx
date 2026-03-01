import { useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useRole } from "@/lib/role-context";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { AppraisalCycle, CycleParticipant, PeerAssignment, Appraisal, Employee, Department } from "@shared/schema";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, Users, UserPlus, Trash2, Play, CheckCircle2, Calendar,
  Weight, Link2, Clock, AlertCircle, Inbox, Settings, CircleCheck, Pencil, Building
} from "lucide-react";
import { format } from "date-fns";

const statusConfig: Record<string, { label: string; variant: "outline" | "secondary" | "default"; className: string }> = {
  draft: { label: "Draft", variant: "outline", className: "" },
  active: { label: "Active", variant: "secondary", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
  completed: { label: "Completed", variant: "secondary", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
};

const typeLabels: Record<string, string> = {
  "360": "360-Degree",
  self: "Self Review",
  manager: "Manager Review",
  peer: "Peer Review",
};

const appraisalStatusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300" },
  in_progress: { label: "In Progress", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  completed: { label: "Completed", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
};

export default function CycleProgress() {
  const params = useParams<{ id: string }>();
  const cycleId = params.id;
  const { role } = useRole();
  const { toast } = useToast();
  const isAdmin = role === "admin";

  const [isAddParticipantsOpen, setIsAddParticipantsOpen] = useState(false);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [isAddPeerOpen, setIsAddPeerOpen] = useState(false);
  const [peerRevieweeId, setPeerRevieweeId] = useState("");
  const [peerReviewerId, setPeerReviewerId] = useState("");
  const [isActivateOpen, setIsActivateOpen] = useState(false);
  const [isCompleteOpen, setIsCompleteOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editSelfWeight, setEditSelfWeight] = useState(10);
  const [editPeerWeight, setEditPeerWeight] = useState(30);
  const [editManagerWeight, setEditManagerWeight] = useState(60);
  const [, navigate] = useLocation();

  const { data: cycle, isLoading: cycleLoading } = useQuery<AppraisalCycle>({
    queryKey: ["/api/appraisal-cycles", cycleId],
  });

  const { data: participants = [], isLoading: participantsLoading } = useQuery<CycleParticipant[]>({
    queryKey: ["/api/appraisal-cycles", cycleId, "participants"],
  });

  const { data: peerAssignments = [] } = useQuery<PeerAssignment[]>({
    queryKey: ["/api/appraisal-cycles", cycleId, "peer-assignments"],
  });

  const { data: allAppraisals = [] } = useQuery<Appraisal[]>({
    queryKey: ["/api/appraisals"],
  });

  const { data: feedbackCheck } = useQuery<{ hasSubmittedFeedback: boolean }>({
    queryKey: ["/api/appraisal-cycles", cycleId, "has-submitted-feedback"],
    enabled: cycle?.status === "active",
  });

  const hasSubmittedFeedback = feedbackCheck?.hasSubmittedFeedback ?? false;

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
  });

  const cycleAppraisals = allAppraisals.filter(a => a.cycleId === cycleId);

  function getEmployee(id: string) {
    return employees.find(e => e.id === id);
  }

  function getEmployeeName(id: string) {
    const emp = getEmployee(id);
    return emp ? `${emp.firstName} ${emp.lastName}` : "Unknown";
  }

  function getAppraisalForParticipant(employeeId: string) {
    return cycleAppraisals.find(a => a.employeeId === employeeId);
  }

  const participantEmployeeIds = new Set(participants.map(p => p.employeeId));
  const availableEmployees = employees.filter(e => !participantEmployeeIds.has(e.id));

  const addParticipantsMutation = useMutation({
    mutationFn: async (employeeIds: string[]) => {
      const res = await apiRequest("POST", `/api/appraisal-cycles/${cycleId}/participants`, { employeeIds });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appraisal-cycles", cycleId, "participants"] });
      toast({ title: "Participants added", description: "Employees have been added to the cycle." });
      setIsAddParticipantsOpen(false);
      setSelectedEmployeeIds([]);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const removeParticipantMutation = useMutation({
    mutationFn: async (employeeIds: string[]) => {
      await apiRequest("DELETE", `/api/appraisal-cycles/${cycleId}/participants`, { employeeIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appraisal-cycles", cycleId, "participants"] });
      toast({ title: "Participant removed", description: "The employee has been removed from the cycle." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const addPeerMutation = useMutation({
    mutationFn: async (data: { revieweeId: string; reviewerId: string }) => {
      const res = await apiRequest("POST", `/api/appraisal-cycles/${cycleId}/peer-assignments`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appraisal-cycles", cycleId, "peer-assignments"] });
      toast({ title: "Peer assignment added", description: "The peer review assignment has been created." });
      setIsAddPeerOpen(false);
      setPeerRevieweeId("");
      setPeerReviewerId("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const removePeerMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/peer-assignments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appraisal-cycles", cycleId, "peer-assignments"] });
      toast({ title: "Assignment removed", description: "The peer review assignment has been removed." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const activateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/appraisal-cycles/${cycleId}/activate`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appraisal-cycles", cycleId] });
      queryClient.invalidateQueries({ queryKey: ["/api/appraisal-cycles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/appraisals"] });
      toast({ title: "Cycle activated", description: "The review cycle is now active. Appraisals have been created for all participants." });
      setIsActivateOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/appraisal-cycles/${cycleId}`, { status: "completed" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appraisal-cycles", cycleId] });
      queryClient.invalidateQueries({ queryKey: ["/api/appraisal-cycles"] });
      toast({ title: "Cycle completed", description: "The review cycle has been marked as completed." });
      setIsCompleteOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const editMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("PATCH", `/api/appraisal-cycles/${cycleId}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appraisal-cycles", cycleId] });
      queryClient.invalidateQueries({ queryKey: ["/api/appraisal-cycles"] });
      toast({ title: "Cycle updated", description: "The review cycle has been updated." });
      setIsEditOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/appraisal-cycles/${cycleId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appraisal-cycles"] });
      toast({ title: "Cycle deleted", description: "The review cycle has been deleted." });
      navigate("/appraisals/cycles");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  function openEditDialog() {
    if (!cycle) return;
    setEditName(cycle.name);
    setEditStartDate(cycle.startDate);
    setEditEndDate(cycle.endDate);
    setEditSelfWeight(cycle.selfWeight);
    setEditPeerWeight(cycle.peerWeight);
    setEditManagerWeight(cycle.managerWeight);
    setIsEditOpen(true);
  }

  function handleEditSave() {
    const is360Cycle = cycle?.type === "360";
    const peerW = is360Cycle ? editPeerWeight : 0;
    const totalWeight = editSelfWeight + peerW + editManagerWeight;
    if (totalWeight !== 100) {
      toast({ title: "Validation Error", description: `Weights must sum to 100%. Current total: ${totalWeight}%.`, variant: "destructive" });
      return;
    }
    if (!editName.trim()) {
      toast({ title: "Validation Error", description: "Please enter a cycle name.", variant: "destructive" });
      return;
    }
    editMutation.mutate({
      name: editName.trim(),
      startDate: editStartDate,
      endDate: editEndDate,
      selfWeight: editSelfWeight,
      peerWeight: peerW,
      managerWeight: editManagerWeight,
    });
  }

  function toggleEmployeeSelection(empId: string) {
    setSelectedEmployeeIds(prev =>
      prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
    );
  }

  if (cycleLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-9" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-7 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!cycle) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground" data-testid="text-cycle-not-found">Cycle not found</p>
        <Link href="/appraisals/cycles">
          <Button variant="ghost" className="mt-4" data-testid="button-back-cycles-error">Back to Cycles</Button>
        </Link>
      </div>
    );
  }

  const isDraft = cycle.status === "draft";
  const isActive = cycle.status === "active";
  const cycleStatusCfg = statusConfig[cycle.status] || statusConfig.draft;
  const is360 = cycle.type === "360";

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4 flex-wrap">
        <Link href="/appraisals/cycles">
          <Button variant="ghost" size="icon" data-testid="button-back-cycles">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-semibold tracking-tight" data-testid="text-cycle-progress-title">
              {cycle.name}
            </h1>
            <Badge variant={cycleStatusCfg.variant} className={cycleStatusCfg.className} data-testid="badge-cycle-status">
              {cycleStatusCfg.label}
            </Badge>
            <Badge variant="outline" data-testid="badge-cycle-type">
              {typeLabels[cycle.type] || cycle.type}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">Manage participants, assignments, and track review progress</p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2 flex-wrap">
            {(isDraft || isActive) && (
              <Button
                variant="outline"
                onClick={openEditDialog}
                disabled={isActive && hasSubmittedFeedback}
                title={isActive && hasSubmittedFeedback ? "Cannot edit: reviews have already been submitted" : undefined}
                data-testid="button-edit-cycle"
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
            {isDraft && (
              <>
                <Button
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setIsDeleteOpen(true)}
                  data-testid="button-delete-cycle"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
                <Button
                  onClick={() => setIsActivateOpen(true)}
                  disabled={participants.length === 0}
                  data-testid="button-activate-cycle"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Activate Cycle
                </Button>
              </>
            )}
            {isActive && (
              <Button
                variant="outline"
                onClick={() => setIsCompleteOpen(true)}
                data-testid="button-complete-cycle"
              >
                <CircleCheck className="h-4 w-4 mr-2" />
                Complete Cycle
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Date Range</span>
            </div>
            <p className="font-medium" data-testid="text-cycle-dates">
              {format(new Date(cycle.startDate), "MMM d, yyyy")} - {format(new Date(cycle.endDate), "MMM d, yyyy")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Weight className="h-4 w-4" />
              <span>Weight Distribution</span>
            </div>
            <div className="flex items-center gap-3 flex-wrap" data-testid="text-cycle-weights">
              <span className="text-sm">Self: <span className="font-medium">{cycle.selfWeight}%</span></span>
              <span className="text-sm">Peer: <span className="font-medium">{cycle.peerWeight}%</span></span>
              <span className="text-sm">Manager: <span className="font-medium">{cycle.managerWeight}%</span></span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold" data-testid="text-participants-heading">Participants</h2>
              <Badge variant="secondary" data-testid="badge-participant-count">{participants.length}</Badge>
            </div>
            {isAdmin && isDraft && (
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedEmployeeIds([]);
                  setIsAddParticipantsOpen(true);
                }}
                data-testid="button-add-participants"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add Participants
              </Button>
            )}
          </div>

          {participantsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : participants.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <Inbox className="h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground" data-testid="text-no-participants">No participants added yet</p>
              {isAdmin && isDraft && (
                <p className="text-xs text-muted-foreground mt-1">Add employees to this cycle to get started</p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {participants.map(participant => {
                const emp = getEmployee(participant.employeeId);
                const appraisal = getAppraisalForParticipant(participant.employeeId);
                const appraisalStatus = appraisal?.status || "pending";
                const statusCfg = appraisalStatusConfig[appraisalStatus] || appraisalStatusConfig.pending;

                return (
                  <div
                    key={participant.id}
                    className="flex items-center justify-between gap-4 p-3 rounded-md border flex-wrap"
                    data-testid={`participant-row-${participant.employeeId}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {emp ? `${emp.firstName[0]}${emp.lastName[0]}` : "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate" data-testid={`text-participant-name-${participant.employeeId}`}>
                          {emp ? `${emp.firstName} ${emp.lastName}` : "Unknown Employee"}
                        </p>
                        {emp && (
                          <p className="text-xs text-muted-foreground truncate">{emp.position}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {!isDraft && appraisal && (
                        <>
                          <Badge variant="secondary" className={statusCfg.className} data-testid={`badge-appraisal-status-${participant.employeeId}`}>
                            {statusCfg.label}
                          </Badge>
                          {appraisalStatus === "completed" && (
                            <Link href={`/appraisals/results/${appraisal.id}`}>
                              <Button variant="ghost" size="sm" data-testid={`button-view-results-${participant.employeeId}`}>
                                <Link2 className="h-3 w-3 mr-1" />
                                Results
                              </Button>
                            </Link>
                          )}
                        </>
                      )}
                      {isDraft && (
                        <Badge variant="outline" data-testid={`badge-draft-status-${participant.employeeId}`}>
                          <Clock className="h-3 w-3 mr-1" />
                          Awaiting activation
                        </Badge>
                      )}
                      {isAdmin && isDraft && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeParticipantMutation.mutate([participant.employeeId])}
                          disabled={removeParticipantMutation.isPending}
                          data-testid={`button-remove-participant-${participant.employeeId}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {is360 && isDraft && isAdmin && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Link2 className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold" data-testid="text-peer-assignments-heading">Peer Assignments</h2>
                <Badge variant="secondary" data-testid="badge-peer-count">{peerAssignments.length}</Badge>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setPeerRevieweeId("");
                  setPeerReviewerId("");
                  setIsAddPeerOpen(true);
                }}
                disabled={participants.length < 2}
                data-testid="button-add-peer-assignment"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add Peer Assignment
              </Button>
            </div>

            {peerAssignments.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <Inbox className="h-10 w-10 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground" data-testid="text-no-peer-assignments">No peer assignments yet</p>
                <p className="text-xs text-muted-foreground mt-1">Assign peers to review each other</p>
              </div>
            ) : (
              <div className="space-y-2">
                {peerAssignments.map(assignment => (
                  <div
                    key={assignment.id}
                    className="flex items-center justify-between gap-4 p-3 rounded-md border flex-wrap"
                    data-testid={`peer-assignment-row-${assignment.id}`}
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Reviewee:</span>
                      <span className="font-medium" data-testid={`text-peer-reviewee-${assignment.id}`}>
                        {getEmployeeName(assignment.revieweeId)}
                      </span>
                      <ArrowLeft className="h-3 w-3 text-muted-foreground rotate-180" />
                      <span className="text-muted-foreground">Reviewer:</span>
                      <span className="font-medium" data-testid={`text-peer-reviewer-${assignment.id}`}>
                        {getEmployeeName(assignment.reviewerId)}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removePeerMutation.mutate(assignment.id)}
                      disabled={removePeerMutation.isPending}
                      data-testid={`button-remove-peer-${assignment.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={isAddParticipantsOpen} onOpenChange={setIsAddParticipantsOpen}>
        <DialogContent className="sm:max-w-[480px]" data-testid="dialog-add-participants">
          <DialogHeader>
            <DialogTitle>Add Participants</DialogTitle>
            <DialogDescription>Select employees to add to this review cycle.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Building className="h-4 w-4" />
                Add by Department
              </Label>
              <Select
                value=""
                onValueChange={(deptId) => {
                  const deptEmployees = availableEmployees
                    .filter(e => e.departmentId === deptId)
                    .map(e => e.id);
                  if (deptEmployees.length === 0) {
                    toast({ title: "No employees", description: "All employees in this department are already participants.", variant: "destructive" });
                    return;
                  }
                  setSelectedEmployeeIds(prev => {
                    const newIds = new Set([...prev, ...deptEmployees]);
                    return Array.from(newIds);
                  });
                  const dept = departments.find(d => d.id === deptId);
                  toast({ title: "Department selected", description: `${deptEmployees.length} employee(s) from ${dept?.name || "department"} selected.` });
                }}
              >
                <SelectTrigger data-testid="select-department-filter">
                  <SelectValue placeholder="Select a department to add all its members..." />
                </SelectTrigger>
                <SelectContent>
                  {departments.map(dept => {
                    const deptAvailableCount = availableEmployees.filter(e => e.departmentId === dept.id).length;
                    return (
                      <SelectItem key={dept.id} value={dept.id} data-testid={`select-department-${dept.id}`}>
                        {dept.name} ({deptAvailableCount} available)
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="max-h-[300px] overflow-y-auto space-y-1">
              {availableEmployees.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">All employees are already in this cycle</p>
              ) : (
                availableEmployees.map(emp => (
                  <label
                    key={emp.id}
                    className="flex items-center gap-3 p-2 rounded-md hover-elevate cursor-pointer"
                    data-testid={`checkbox-employee-${emp.id}`}
                  >
                    <Checkbox
                      checked={selectedEmployeeIds.includes(emp.id)}
                      onCheckedChange={() => toggleEmployeeSelection(emp.id)}
                    />
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="text-[10px]">{emp.firstName[0]}{emp.lastName[0]}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{emp.firstName} {emp.lastName}</p>
                      <p className="text-xs text-muted-foreground truncate">{emp.position}{emp.departmentId ? ` — ${departments.find(d => d.id === emp.departmentId)?.name || ""}` : ""}</p>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddParticipantsOpen(false)} data-testid="button-cancel-add-participants">
              Cancel
            </Button>
            <Button
              onClick={() => addParticipantsMutation.mutate(selectedEmployeeIds)}
              disabled={selectedEmployeeIds.length === 0 || addParticipantsMutation.isPending}
              data-testid="button-confirm-add-participants"
            >
              {addParticipantsMutation.isPending ? "Adding..." : `Add ${selectedEmployeeIds.length} Participant${selectedEmployeeIds.length !== 1 ? "s" : ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddPeerOpen} onOpenChange={setIsAddPeerOpen}>
        <DialogContent className="sm:max-w-[420px]" data-testid="dialog-add-peer">
          <DialogHeader>
            <DialogTitle>Add Peer Assignment</DialogTitle>
            <DialogDescription>Select who will be reviewed and who will review them.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Reviewee (being reviewed)</Label>
              <Select value={peerRevieweeId} onValueChange={setPeerRevieweeId}>
                <SelectTrigger data-testid="select-peer-reviewee">
                  <SelectValue placeholder="Select reviewee..." />
                </SelectTrigger>
                <SelectContent>
                  {participants.map(p => {
                    const emp = getEmployee(p.employeeId);
                    return emp ? (
                      <SelectItem key={p.employeeId} value={p.employeeId}>
                        {emp.firstName} {emp.lastName}
                      </SelectItem>
                    ) : null;
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reviewer</Label>
              <Select value={peerReviewerId} onValueChange={setPeerReviewerId}>
                <SelectTrigger data-testid="select-peer-reviewer">
                  <SelectValue placeholder="Select reviewer..." />
                </SelectTrigger>
                <SelectContent>
                  {participants
                    .filter(p => p.employeeId !== peerRevieweeId)
                    .map(p => {
                      const emp = getEmployee(p.employeeId);
                      return emp ? (
                        <SelectItem key={p.employeeId} value={p.employeeId}>
                          {emp.firstName} {emp.lastName}
                        </SelectItem>
                      ) : null;
                    })}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddPeerOpen(false)} data-testid="button-cancel-add-peer">
              Cancel
            </Button>
            <Button
              onClick={() => addPeerMutation.mutate({ revieweeId: peerRevieweeId, reviewerId: peerReviewerId })}
              disabled={!peerRevieweeId || !peerReviewerId || addPeerMutation.isPending}
              data-testid="button-confirm-add-peer"
            >
              {addPeerMutation.isPending ? "Adding..." : "Add Assignment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isActivateOpen} onOpenChange={setIsActivateOpen}>
        <DialogContent data-testid="dialog-activate-cycle">
          <DialogHeader>
            <DialogTitle>Activate Review Cycle</DialogTitle>
            <DialogDescription>
              Are you sure you want to activate this cycle? This will create appraisals for all {participants.length} participants.
              Once activated, you cannot modify participants or peer assignments.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsActivateOpen(false)} data-testid="button-cancel-activate">
              Cancel
            </Button>
            <Button
              onClick={() => activateMutation.mutate()}
              disabled={activateMutation.isPending}
              data-testid="button-confirm-activate"
            >
              {activateMutation.isPending ? "Activating..." : "Activate Cycle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCompleteOpen} onOpenChange={setIsCompleteOpen}>
        <DialogContent data-testid="dialog-complete-cycle">
          <DialogHeader>
            <DialogTitle>Complete Review Cycle</DialogTitle>
            <DialogDescription>
              Are you sure you want to mark this cycle as completed? This action indicates the review period is over.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCompleteOpen(false)} data-testid="button-cancel-complete">
              Cancel
            </Button>
            <Button
              onClick={() => completeMutation.mutate()}
              disabled={completeMutation.isPending}
              data-testid="button-confirm-complete"
            >
              {completeMutation.isPending ? "Completing..." : "Complete Cycle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[500px]" data-testid="dialog-edit-cycle">
          <DialogHeader>
            <DialogTitle>Edit Review Cycle</DialogTitle>
            <DialogDescription>Update the cycle name, dates, and weight distribution.</DialogDescription>
          </DialogHeader>
          {isActive && !hasSubmittedFeedback && (
            <div className="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300" data-testid="text-active-edit-note">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>No reviews have been submitted yet, so changes are still allowed.</span>
            </div>
          )}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-cycle-name">Name</Label>
              <Input
                id="edit-cycle-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                data-testid="input-edit-cycle-name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-start-date">Start Date</Label>
                <Input
                  id="edit-start-date"
                  type="date"
                  value={editStartDate}
                  onChange={(e) => setEditStartDate(e.target.value)}
                  data-testid="input-edit-start-date"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-end-date">End Date</Label>
                <Input
                  id="edit-end-date"
                  type="date"
                  value={editEndDate}
                  onChange={(e) => setEditEndDate(e.target.value)}
                  data-testid="input-edit-end-date"
                />
              </div>
            </div>
            <div className="space-y-3">
              <Label>Weight Distribution</Label>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="edit-weight-self" className="text-xs text-muted-foreground">Self (%)</Label>
                  <Input
                    id="edit-weight-self"
                    type="number"
                    min={0}
                    max={100}
                    value={editSelfWeight}
                    onChange={(e) => setEditSelfWeight(Number(e.target.value))}
                    data-testid="input-edit-weight-self"
                  />
                </div>
                {cycle?.type === "360" && (
                  <div className="space-y-1">
                    <Label htmlFor="edit-weight-peer" className="text-xs text-muted-foreground">Peer (%)</Label>
                    <Input
                      id="edit-weight-peer"
                      type="number"
                      min={0}
                      max={100}
                      value={editPeerWeight}
                      onChange={(e) => setEditPeerWeight(Number(e.target.value))}
                      data-testid="input-edit-weight-peer"
                    />
                  </div>
                )}
                <div className="space-y-1">
                  <Label htmlFor="edit-weight-manager" className="text-xs text-muted-foreground">Manager (%)</Label>
                  <Input
                    id="edit-weight-manager"
                    type="number"
                    min={0}
                    max={100}
                    value={editManagerWeight}
                    onChange={(e) => setEditManagerWeight(Number(e.target.value))}
                    data-testid="input-edit-weight-manager"
                  />
                </div>
              </div>
              {(() => {
                const editTotal = editSelfWeight + (cycle?.type === "360" ? editPeerWeight : 0) + editManagerWeight;
                return (
                  <p className={`text-xs ${editTotal === 100 ? "text-muted-foreground" : "text-destructive"}`} data-testid="text-edit-weight-total">
                    Total: {editTotal}% {editTotal !== 100 ? "(must equal 100%)" : ""}
                  </p>
                );
              })()}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)} data-testid="button-cancel-edit">
              Cancel
            </Button>
            <Button onClick={handleEditSave} disabled={editMutation.isPending} data-testid="button-confirm-edit">
              {editMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent data-testid="dialog-delete-cycle">
          <DialogHeader>
            <DialogTitle>Delete Review Cycle</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{cycle?.name}&rdquo;? This will remove all participants and peer assignments. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)} data-testid="button-cancel-delete">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Cycle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
