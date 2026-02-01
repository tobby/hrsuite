import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
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
  Calendar, 
  Plus, 
  Edit, 
  Trash2,
  Play,
  Pause,
  Users,
  User,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronRight,
} from "lucide-react";
import { useRole, canEditOrgSettings } from "@/lib/role-context";
import { useLocation, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import {
  appraisalCycles,
  appraisalTemplates,
  employees,
  departments,
  getParticipantsByCycle,
  getEmployeeById,
  getDepartmentById,
  getTemplateById,
} from "@/lib/demo-data";
import { useAppraisalStore } from "@/lib/appraisal-store";

const cycleFormSchema = z.object({
  name: z.string().min(1, "Cycle name is required"),
  type: z.enum(["180", "360"]),
  templateId: z.string().min(1, "Template is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  selfWeight: z.number().min(0).max(100),
  peerWeight: z.number().min(0).max(100),
  managerWeight: z.number().min(0).max(100),
});

type CycleFormValues = z.infer<typeof cycleFormSchema>;

const statusIcons: Record<string, typeof Clock> = {
  draft: Clock,
  active: Play,
  completed: CheckCircle2,
  cancelled: XCircle,
};

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  completed: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  cancelled: "bg-destructive/10 text-destructive",
};

export default function AppraisalCycles() {
  const { role } = useRole();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [isPeerAssignOpen, setIsPeerAssignOpen] = useState(false);
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [currentParticipantForPeers, setCurrentParticipantForPeers] = useState<string | null>(null);
  const [tempPeerAssignments, setTempPeerAssignments] = useState<string[]>([]);
  const isAdmin = canEditOrgSettings(role);
  
  const { 
    getPeerAssignmentsForReviewee, 
    setPeerAssignments, 
    clearPeerAssignmentsForReviewee 
  } = useAppraisalStore();

  const cycleForm = useForm<CycleFormValues>({
    resolver: zodResolver(cycleFormSchema),
    defaultValues: {
      name: "",
      type: "180",
      templateId: "",
      startDate: "",
      endDate: "",
      selfWeight: 10,
      peerWeight: 30,
      managerWeight: 60,
    },
  });

  const watchedType = cycleForm.watch("type");

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <p className="text-muted-foreground">Access restricted to administrators only</p>
        <Link href="/appraisals">
          <Button variant="ghost" className="mt-4">Back to Appraisals</Button>
        </Link>
      </div>
    );
  }

  const handleCreateCycle = (values: CycleFormValues) => {
    // For 360° reviews, validate weights add up to 100%
    if (values.type === "360") {
      const totalWeight = values.selfWeight + values.peerWeight + values.managerWeight;
      if (totalWeight !== 100) {
        toast({
          title: "Invalid Weights",
          description: "Weights must add up to 100%",
          variant: "destructive",
        });
        return;
      }
    }
    // For 180° reviews, manager weight is automatically 100%
    
    toast({
      title: "Cycle Created",
      description: `"${values.name}" has been created as a draft.`,
    });
    cycleForm.reset();
    setIsCreateOpen(false);
  };

  const handleCloseCycleDialog = (open: boolean) => {
    if (!open) cycleForm.reset();
    setIsCreateOpen(open);
  };

  const handleOpenParticipants = (cycleId: string) => {
    setSelectedCycleId(cycleId);
    const participants = getParticipantsByCycle(cycleId);
    setSelectedParticipants(participants.map(p => p.employeeId));
    setIsParticipantsOpen(true);
  };
  
  const handleOpenPeerAssignment = (participantId: string) => {
    setCurrentParticipantForPeers(participantId);
    // Load existing assignments from store
    const existingPeers = getPeerAssignmentsForReviewee(selectedCycleId || "", participantId);
    setTempPeerAssignments(existingPeers.map(pa => pa.reviewerId));
    setIsPeerAssignOpen(true);
  };
  
  const handleTogglePeerReviewer = (reviewerId: string) => {
    setTempPeerAssignments(prev => {
      if (prev.includes(reviewerId)) {
        return prev.filter(id => id !== reviewerId);
      } else {
        return [...prev, reviewerId];
      }
    });
  };
  
  const handleSavePeerAssignment = () => {
    if (!currentParticipantForPeers || !selectedCycleId) return;
    
    // Persist to Zustand store
    setPeerAssignments(selectedCycleId, currentParticipantForPeers, tempPeerAssignments);
    
    const participant = getEmployeeById(currentParticipantForPeers);
    toast({
      title: "Peer Reviewers Assigned",
      description: `${tempPeerAssignments.length} peer reviewer(s) assigned to ${participant?.firstName} ${participant?.lastName}.`,
    });
    setIsPeerAssignOpen(false);
    setCurrentParticipantForPeers(null);
    setTempPeerAssignments([]);
  };
  
  // Get available peers: only other participants in the same cycle (excluding the reviewee and their manager)
  const getAvailablePeers = (participantId: string): typeof employees => {
    const participant = getEmployeeById(participantId);
    if (!participant) return [];
    
    // Available peers: only selected participants, excluding the participant and their manager
    return employees.filter(emp => 
      selectedParticipants.includes(emp.id) &&
      emp.id !== participantId && 
      emp.id !== participant.managerId
    );
  };
  
  // Get peer count from store
  const getPeerCountForParticipant = (participantId: string): number => {
    if (!selectedCycleId) return 0;
    return getPeerAssignmentsForReviewee(selectedCycleId, participantId).length;
  };

  const handleSaveParticipants = () => {
    toast({
      title: "Participants Saved",
      description: `${selectedParticipants.length} participants assigned to the cycle.`,
    });
    setIsParticipantsOpen(false);
  };

  const handleToggleParticipant = (employeeId: string) => {
    const isRemoving = selectedParticipants.includes(employeeId);
    
    if (isRemoving && selectedCycleId) {
      // Clear peer assignments when removing a participant
      clearPeerAssignmentsForReviewee(selectedCycleId, employeeId);
      
      // Also remove this employee as a peer reviewer from other participants
      selectedParticipants.forEach(participantId => {
        if (participantId !== employeeId) {
          const currentPeers = getPeerAssignmentsForReviewee(selectedCycleId, participantId);
          const filteredPeers = currentPeers.filter(pa => pa.reviewerId !== employeeId);
          if (currentPeers.length !== filteredPeers.length) {
            setPeerAssignments(selectedCycleId, participantId, filteredPeers.map(pa => pa.reviewerId));
          }
        }
      });
    }
    
    setSelectedParticipants(prev =>
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const handleToggleDepartment = (deptId: string) => {
    const deptEmployees = employees.filter(e => e.departmentId === deptId).map(e => e.id);
    const allSelected = deptEmployees.every(id => selectedParticipants.includes(id));
    
    if (allSelected && selectedCycleId) {
      // Clean up peer assignments for removed participants
      deptEmployees.forEach(empId => {
        // Clear their peer assignments
        clearPeerAssignmentsForReviewee(selectedCycleId, empId);
        
        // Remove them as a reviewer from other participants
        selectedParticipants.forEach(participantId => {
          if (!deptEmployees.includes(participantId)) {
            const currentPeers = getPeerAssignmentsForReviewee(selectedCycleId, participantId);
            const filteredPeers = currentPeers.filter(pa => pa.reviewerId !== empId);
            if (currentPeers.length !== filteredPeers.length) {
              setPeerAssignments(selectedCycleId, participantId, filteredPeers.map(pa => pa.reviewerId));
            }
          }
        });
      });
      
      setSelectedParticipants(prev => prev.filter(id => !deptEmployees.includes(id)));
    } else {
      setSelectedParticipants(prev => Array.from(new Set([...prev, ...deptEmployees])));
    }
  };

  const handleActivateCycle = (cycleId: string) => {
    toast({
      title: "Cycle Activated",
      description: "Review assignments have been generated for all participants.",
    });
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight" data-testid="text-cycles-title">
              Appraisal Cycles
            </h1>
          </div>
          <p className="text-muted-foreground">
            Manage performance review cycles and participant assignments
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create-cycle">
          <Plus className="mr-2 h-4 w-4" />
          Create Cycle
        </Button>
      </div>

      {/* Cycles Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Cycles</CardTitle>
          <CardDescription>
            View and manage performance review cycles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cycle Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Participants</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[150px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appraisalCycles.map((cycle) => {
                  const template = cycle.templateId ? getTemplateById(cycle.templateId) : null;
                  const participants = getParticipantsByCycle(cycle.id);
                  const StatusIcon = statusIcons[cycle.status] || Clock;
                  
                  return (
                    <TableRow key={cycle.id} data-testid={`cycle-row-${cycle.id}`}>
                      <TableCell className="font-medium">{cycle.name}</TableCell>
                      <TableCell>
                        <Badge variant={cycle.type === "360" ? "default" : "secondary"}>
                          {cycle.type === "360" ? "360° Review" : "Simple (180°)"}
                        </Badge>
                      </TableCell>
                      <TableCell>{template?.name || "-"}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {new Date(cycle.startDate).toLocaleDateString()} - {new Date(cycle.endDate).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleOpenParticipants(cycle.id)}
                          data-testid={`button-manage-participants-${cycle.id}`}
                        >
                          <Users className="h-4 w-4 mr-1" />
                          {participants.length} people
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[cycle.status]}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {cycle.status.charAt(0).toUpperCase() + cycle.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Link href={`/appraisals/cycles/${cycle.id}`}>
                            <Button 
                              size="sm" 
                              variant="outline"
                              data-testid={`button-view-progress-${cycle.id}`}
                            >
                              <ChevronRight className="h-3 w-3 mr-1" />
                              Progress
                            </Button>
                          </Link>
                          {cycle.status === "draft" && (
                            <Button 
                              size="sm" 
                              variant="default"
                              onClick={() => handleActivateCycle(cycle.id)}
                              data-testid={`button-activate-${cycle.id}`}
                            >
                              <Play className="h-3 w-3 mr-1" />
                              Activate
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" data-testid={`button-edit-cycle-${cycle.id}`}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          {cycle.status === "draft" && (
                            <Button size="icon" variant="ghost" className="text-destructive" data-testid={`button-delete-cycle-${cycle.id}`}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      
      {/* Create Cycle Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={handleCloseCycleDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create Appraisal Cycle</DialogTitle>
            <DialogDescription>
              Set up a new performance review cycle with participant selection and scoring weights.
            </DialogDescription>
          </DialogHeader>
          <Form {...cycleForm}>
            <form onSubmit={cycleForm.handleSubmit(handleCreateCycle)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={cycleForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Cycle Name <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Q1 2026 Performance Review"
                          {...field}
                          data-testid="input-cycle-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={cycleForm.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Review Type <span className="text-destructive">*</span></FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-cycle-type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="180">Simple (180°) - Manager only</SelectItem>
                          <SelectItem value="360">360° - Full feedback loop</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {watchedType === "360" 
                          ? "Includes self, peer, and manager reviews"
                          : "Manager reviews employees only"
                        }
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={cycleForm.control}
                  name="templateId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Template <span className="text-destructive">*</span></FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-template">
                            <SelectValue placeholder="Select template" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {appraisalTemplates.map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={cycleForm.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-start-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={cycleForm.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-end-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Weights - Only show for 360° reviews */}
              {watchedType === "360" && (
                <div className="space-y-4 pt-4 border-t">
                  <Label>Scoring Weights (must total 100%)</Label>
                  <p className="text-sm text-muted-foreground">
                    Configure how self, peer, and manager ratings contribute to the final score.
                  </p>
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={cycleForm.control}
                      name="selfWeight"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Self: {field.value}%</FormLabel>
                          <FormControl>
                            <Slider
                              min={0}
                              max={100}
                              step={5}
                              value={[field.value]}
                              onValueChange={([value]) => field.onChange(value)}
                              data-testid="slider-self-weight"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={cycleForm.control}
                      name="peerWeight"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Peer: {field.value}%</FormLabel>
                          <FormControl>
                            <Slider
                              min={0}
                              max={100}
                              step={5}
                              value={[field.value]}
                              onValueChange={([value]) => field.onChange(value)}
                              data-testid="slider-peer-weight"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={cycleForm.control}
                      name="managerWeight"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Manager: {field.value}%</FormLabel>
                          <FormControl>
                            <Slider
                              min={0}
                              max={100}
                              step={5}
                              value={[field.value]}
                              onValueChange={([value]) => field.onChange(value)}
                              data-testid="slider-manager-weight"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  {(() => {
                    const total = cycleForm.watch("selfWeight") + cycleForm.watch("peerWeight") + cycleForm.watch("managerWeight");
                    return total !== 100 && (
                      <p className="text-sm text-destructive">
                        Total: {total}% (must equal 100%)
                      </p>
                    );
                  })()}
                </div>
              )}
              {watchedType === "180" && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    180° reviews use manager-only scoring (100% manager weight).
                  </p>
                </div>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => handleCloseCycleDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" data-testid="button-confirm-create-cycle">
                  Create Cycle
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Participants Dialog */}
      <Dialog open={isParticipantsOpen} onOpenChange={setIsParticipantsOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Manage Participants</DialogTitle>
            <DialogDescription>
              Select employees to include in this review cycle. 
              {selectedCycleId && appraisalCycles.find(c => c.id === selectedCycleId)?.type === "360" && (
                " For 360° reviews, you can also assign peer reviewers for each participant."
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 overflow-y-auto max-h-[500px]">
            {/* Department Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">By Department</Label>
              <div className="flex flex-wrap gap-2">
                {departments.map((dept) => {
                  const deptEmployees = employees.filter(e => e.departmentId === dept.id);
                  const selectedCount = deptEmployees.filter(e => selectedParticipants.includes(e.id)).length;
                  const allSelected = selectedCount === deptEmployees.length;
                  
                  return (
                    <Button
                      key={dept.id}
                      variant={allSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleToggleDepartment(dept.id)}
                      data-testid={`button-select-dept-${dept.id}`}
                    >
                      {dept.name}
                      <Badge variant="secondary" className="ml-2">
                        {selectedCount}/{deptEmployees.length}
                      </Badge>
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Individual Selection with Peer Assignment */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Participants
                {selectedCycleId && appraisalCycles.find(c => c.id === selectedCycleId)?.type === "360" && (
                  <span className="font-normal text-muted-foreground ml-2">
                    (Click "Assign Peers" to select peer reviewers)
                  </span>
                )}
              </Label>
              <div className="rounded-md border divide-y max-h-[300px] overflow-y-auto">
                {employees.map((emp) => {
                  const isSelected = selectedParticipants.includes(emp.id);
                  const is360Cycle = selectedCycleId && appraisalCycles.find(c => c.id === selectedCycleId)?.type === "360";
                  const assignedPeerCount = getPeerCountForParticipant(emp.id);
                  
                  return (
                    <div 
                      key={emp.id}
                      className="flex items-center gap-3 p-3"
                    >
                      <div 
                        className="flex items-center gap-3 flex-1 cursor-pointer hover-elevate rounded-md p-1 -m-1"
                        onClick={() => handleToggleParticipant(emp.id)}
                      >
                        <Checkbox 
                          checked={isSelected}
                          onCheckedChange={() => handleToggleParticipant(emp.id)}
                          data-testid={`checkbox-participant-${emp.id}`}
                        />
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {emp.firstName[0]}{emp.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{emp.firstName} {emp.lastName}</p>
                          <p className="text-xs text-muted-foreground truncate">{emp.position}</p>
                        </div>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {getDepartmentById(emp.departmentId)?.name}
                        </Badge>
                      </div>
                      
                      {/* Peer Assignment Button (only for 360° cycles and selected participants) */}
                      {is360Cycle && isSelected && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenPeerAssignment(emp.id);
                          }}
                          className="shrink-0"
                          data-testid={`button-assign-peers-${emp.id}`}
                        >
                          <Users className="h-3 w-3 mr-1" />
                          Assign Peers
                          {assignedPeerCount > 0 && (
                            <Badge variant="secondary" className="ml-1">
                              {assignedPeerCount}
                            </Badge>
                          )}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter>
            <div className="flex items-center justify-between w-full">
              <p className="text-sm text-muted-foreground">
                {selectedParticipants.length} participants selected
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsParticipantsOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveParticipants} data-testid="button-save-participants">
                  Save Participants
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Peer Assignment Dialog */}
      <Dialog open={isPeerAssignOpen} onOpenChange={setIsPeerAssignOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Assign Peer Reviewers
            </DialogTitle>
            <DialogDescription>
              {currentParticipantForPeers && (() => {
                const participant = getEmployeeById(currentParticipantForPeers);
                return participant ? (
                  <>
                    Select employees who will provide peer feedback for <span className="font-medium text-foreground">{participant.firstName} {participant.lastName}</span>.
                  </>
                ) : null;
              })()}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="rounded-md border divide-y max-h-[350px] overflow-y-auto">
              {currentParticipantForPeers && getAvailablePeers(currentParticipantForPeers).map((peer) => {
                const isAssigned = tempPeerAssignments.includes(peer.id);
                
                return (
                  <div 
                    key={peer.id}
                    className="flex items-center gap-3 p-3 hover-elevate cursor-pointer"
                    onClick={() => handleTogglePeerReviewer(peer.id)}
                  >
                    <Checkbox 
                      checked={isAssigned}
                      onCheckedChange={() => handleTogglePeerReviewer(peer.id)}
                      data-testid={`checkbox-peer-${peer.id}`}
                    />
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {peer.firstName[0]}{peer.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{peer.firstName} {peer.lastName}</p>
                      <p className="text-xs text-muted-foreground">{peer.position}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {getDepartmentById(peer.departmentId)?.name}
                    </Badge>
                  </div>
                );
              })}
            </div>
            
            <p className="text-sm text-muted-foreground">
              {tempPeerAssignments.length} peer reviewer(s) selected
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsPeerAssignOpen(false);
              setCurrentParticipantForPeers(null);
              setTempPeerAssignments([]);
            }}>
              Cancel
            </Button>
            <Button onClick={handleSavePeerAssignment} data-testid="button-save-peer-assignment">
              Save Peer Reviewers
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
