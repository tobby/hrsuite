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
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const isAdmin = canEditOrgSettings(role);

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
    const totalWeight = values.selfWeight + values.peerWeight + values.managerWeight;
    if (totalWeight !== 100) {
      toast({
        title: "Invalid Weights",
        description: "Weights must add up to 100%",
        variant: "destructive",
      });
      return;
    }
    
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

  const handleSaveParticipants = () => {
    toast({
      title: "Participants Saved",
      description: `${selectedParticipants.length} participants assigned to the cycle.`,
    });
    setIsParticipantsOpen(false);
  };

  const handleToggleParticipant = (employeeId: string) => {
    setSelectedParticipants(prev =>
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const handleToggleDepartment = (deptId: string) => {
    const deptEmployees = employees.filter(e => e.departmentId === deptId).map(e => e.id);
    const allSelected = deptEmployees.every(id => selectedParticipants.includes(id));
    
    if (allSelected) {
      setSelectedParticipants(prev => prev.filter(id => !deptEmployees.includes(id)));
    } else {
      setSelectedParticipants(prev => [...new Set([...prev, ...deptEmployees])]);
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

      {/* Weights Legend */}
      <Card>
        <CardHeader>
          <CardTitle>Scoring Weights</CardTitle>
          <CardDescription>
            How final scores are calculated for each cycle
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {appraisalCycles.map((cycle) => (
              <div key={cycle.id} className="p-4 rounded-lg border">
                <p className="font-medium text-sm mb-2">{cycle.name}</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Self</span>
                    <Badge variant="outline">{cycle.selfWeight}%</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Peer</span>
                    <Badge variant="outline">{cycle.peerWeight}%</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Manager</span>
                    <Badge variant="outline">{cycle.managerWeight}%</Badge>
                  </div>
                </div>
              </div>
            ))}
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

              {/* Weights */}
              <div className="space-y-4 pt-4 border-t">
                <Label>Scoring Weights (must total 100%)</Label>
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
                            disabled={watchedType === "180"}
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
        <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Manage Participants</DialogTitle>
            <DialogDescription>
              Select employees to include in this review cycle. You can select by department or individually.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 overflow-y-auto max-h-[400px]">
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

            {/* Individual Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Individual Employees</Label>
              <div className="rounded-md border divide-y max-h-[250px] overflow-y-auto">
                {employees.map((emp) => (
                  <div 
                    key={emp.id}
                    className="flex items-center gap-3 p-3 hover-elevate cursor-pointer"
                    onClick={() => handleToggleParticipant(emp.id)}
                  >
                    <Checkbox 
                      checked={selectedParticipants.includes(emp.id)}
                      onCheckedChange={() => handleToggleParticipant(emp.id)}
                      data-testid={`checkbox-participant-${emp.id}`}
                    />
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {emp.firstName[0]}{emp.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{emp.firstName} {emp.lastName}</p>
                      <p className="text-xs text-muted-foreground">{emp.position}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {getDepartmentById(emp.departmentId)?.name}
                    </Badge>
                  </div>
                ))}
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
    </div>
  );
}
