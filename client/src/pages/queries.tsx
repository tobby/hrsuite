import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useRole } from "@/lib/role-context";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Employee, HrQuery } from "@shared/schema";
import { Plus, Search, MessageSquare, Clock, AlertCircle, CheckCircle2, XCircle, Send, FileWarning, Paperclip, Info, ArrowRight, ShieldAlert, TriangleAlert } from "lucide-react";
import { FileUpload, type UploadedFile } from "@/components/file-upload";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

const categoryLabels: Record<string, string> = {
  attendance: "Attendance",
  conduct: "Conduct",
  performance: "Performance",
  policy_violation: "Policy Violation",
  other: "Other",
};

const categoryColors: Record<string, string> = {
  attendance: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  conduct: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  performance: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  policy_violation: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  other: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
};

const priorityLabels: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

const priorityColors: Record<string, string> = {
  low: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  urgent: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

const statusLabels: Record<string, string> = {
  open: "Open",
  awaiting_response: "Awaiting Response",
  responded: "Responded",
  acknowledged: "Acknowledged",
  under_review: "Under Review",
  resolved: "Resolved",
  escalated: "Escalated",
  closed: "Closed",
};

const statusIcons: Record<string, typeof AlertCircle> = {
  open: AlertCircle,
  awaiting_response: Send,
  responded: MessageSquare,
  acknowledged: CheckCircle2,
  under_review: Search,
  resolved: CheckCircle2,
  escalated: FileWarning,
  closed: XCircle,
};

const statusColors: Record<string, string> = {
  open: "text-blue-600 dark:text-blue-400",
  awaiting_response: "text-amber-600 dark:text-amber-400",
  responded: "text-indigo-600 dark:text-indigo-400",
  acknowledged: "text-teal-600 dark:text-teal-400",
  under_review: "text-orange-600 dark:text-orange-400",
  resolved: "text-green-600 dark:text-green-400",
  escalated: "text-red-600 dark:text-red-400",
  closed: "text-muted-foreground",
};

const statusDescriptions: Record<string, string> = {
  open: "The query/warning has been issued and is waiting for action.",
  awaiting_response: "A follow-up response is needed from the employee.",
  responded: "The employee has submitted their response.",
  acknowledged: "The warning has been acknowledged by the employee.",
  under_review: "The response is being reviewed by management.",
  resolved: "The item has been reviewed and closed with a resolution.",
  escalated: "The matter has been escalated for further investigation.",
  closed: "The item is fully concluded and no longer active.",
};

export default function Queries() {
  const { role, currentUser } = useRole();
  const { toast } = useToast();
  const { data: queries = [], isLoading: queriesLoading } = useQuery<HrQuery[]>({ queryKey: ['/api/hr-queries'] });
  const { data: employees = [] } = useQuery<Employee[]>({ queryKey: ['/api/employees'] });

  function getEmployee(id: string) {
    return employees.find(e => e.id === id);
  }

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [isIssueOpen, setIsIssueOpen] = useState(false);

  const [newType, setNewType] = useState<string>("query");
  const [newSubject, setNewSubject] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCategory, setNewCategory] = useState<string>("attendance");
  const [newPriority, setNewPriority] = useState<string>("medium");
  const [newEmployeeId, setNewEmployeeId] = useState<string>("");
  const [newAttachments, setNewAttachments] = useState<UploadedFile[]>([]);
  const [showStatusGuide, setShowStatusGuide] = useState(false);

  const canIssueQuery = role === "admin" || role === "manager";

  const createMutation = useMutation({
    mutationFn: async (data: { type: string; subject: string; description: string; category: string; priority: string; employeeId: string; attachments?: UploadedFile[] }) => {
      const res = await apiRequest("POST", "/api/hr-queries", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hr-queries'] });
      const label = newType === "warning" ? "Warning" : "Query";
      toast({ title: `${label} issued`, description: `The disciplinary ${label.toLowerCase()} has been issued successfully.` });
      setIsIssueOpen(false);
      setNewType("query");
      setNewSubject("");
      setNewDescription("");
      setNewCategory("attendance");
      setNewPriority("medium");
      setNewEmployeeId("");
      setNewAttachments([]);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const filteredQueries = queries.filter(q => {
    const emp = getEmployee(q.employeeId);
    const issuer = getEmployee(q.issuedBy);
    const matchesSearch =
      q.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp?.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp?.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issuer?.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issuer?.lastName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || q.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || q.category === categoryFilter;
    const matchesPriority = priorityFilter === "all" || q.priority === priorityFilter;
    const matchesType = typeFilter === "all" || q.type === typeFilter;
    return matchesSearch && matchesStatus && matchesCategory && matchesPriority && matchesType;
  }).sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());

  const stats = {
    total: queries.length,
    warnings: queries.filter(q => q.type === "warning").length,
    queriesCount: queries.filter(q => q.type === "query" || !q.type).length,
    open: queries.filter(q => q.status === "open").length,
    awaitingResponse: queries.filter(q => q.status === "awaiting_response").length,
  };

  const issuableEmployees = (() => {
    if (role === "admin") return employees.filter(e => e.id !== currentUser.id);
    if (role === "manager") return employees.filter(e => e.managerId === currentUser.id);
    return [];
  })();

  function handleIssueQuery() {
    if (!newSubject.trim() || newDescription.trim().length < 10 || !newEmployeeId) {
      toast({ title: "Validation Error", description: "Please fill in all required fields. Select an employee and provide a description (at least 10 characters).", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      type: newType,
      subject: newSubject.trim(),
      description: newDescription.trim(),
      category: newCategory,
      priority: newPriority,
      employeeId: newEmployeeId,
      attachments: newAttachments.length > 0 ? newAttachments : undefined,
    });
  }

  function handleOpenIssue() {
    setNewType("query");
    setNewSubject("");
    setNewDescription("");
    setNewCategory("attendance");
    setNewPriority("medium");
    setNewEmployeeId("");
    setNewAttachments([]);
    setIsIssueOpen(true);
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight" data-testid="text-queries-title">Queries & Warnings</h1>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setShowStatusGuide(!showStatusGuide)}
              data-testid="button-status-guide"
            >
              <Info className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-muted-foreground text-sm">
            {role === "employee"
              ? "View and respond to queries and warnings issued to you"
              : role === "manager"
                ? "Issue and manage queries and warnings for your team"
                : "Issue and manage all disciplinary queries and warnings"}
          </p>
        </div>
        {canIssueQuery && (
          <Button onClick={handleOpenIssue} data-testid="button-issue-query">
            <Plus className="h-4 w-4 mr-2" />
            Issue Query / Warning
          </Button>
        )}
      </div>

      {showStatusGuide && (
        <Card data-testid="card-status-guide">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4 mb-3">
              <h3 className="text-sm font-semibold">Status Guide</h3>
              <Button size="icon" variant="ghost" onClick={() => setShowStatusGuide(false)} data-testid="button-close-status-guide">
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {Object.entries(statusDescriptions).map(([key, description]) => {
                const StatusIcon = statusIcons[key] || AlertCircle;
                const color = statusColors[key] || "text-muted-foreground";
                const label = statusLabels[key] || key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
                return (
                  <div key={key} className="flex items-start gap-2 text-sm" data-testid={`status-guide-${key}`}>
                    <StatusIcon className={`h-4 w-4 mt-0.5 shrink-0 ${color}`} />
                    <div>
                      <span className="font-medium">{label}</span>
                      <span className="text-muted-foreground"> &mdash; {description}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs text-muted-foreground flex items-center gap-1 flex-wrap">
                Typical flow: Open <ArrowRight className="h-3 w-3 inline" /> Responded <ArrowRight className="h-3 w-3 inline" /> Under Review <ArrowRight className="h-3 w-3 inline" /> Resolved / Closed
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Total</div>
            <div className="text-2xl font-bold" data-testid="stat-total">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground flex items-center gap-1.5"><ShieldAlert className="h-3.5 w-3.5" /> Queries</div>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400" data-testid="stat-queries">{stats.queriesCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground flex items-center gap-1.5"><TriangleAlert className="h-3.5 w-3.5" /> Warnings</div>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400" data-testid="stat-warnings">{stats.warnings}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Open</div>
            <div className="text-2xl font-bold text-blue-600" data-testid="stat-open">{stats.open}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search queries..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9"
            data-testid="input-search-queries"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[140px]" data-testid="filter-type">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="query">Queries</SelectItem>
            <SelectItem value="warning">Warnings</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]" data-testid="filter-status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="awaiting_response">Awaiting Response</SelectItem>
            <SelectItem value="responded">Responded</SelectItem>
            <SelectItem value="acknowledged">Acknowledged</SelectItem>
            <SelectItem value="under_review">Under Review</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="escalated">Escalated</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[160px]" data-testid="filter-category">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="attendance">Attendance</SelectItem>
            <SelectItem value="conduct">Conduct</SelectItem>
            <SelectItem value="performance">Performance</SelectItem>
            <SelectItem value="policy_violation">Policy Violation</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[140px]" data-testid="filter-priority">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {queriesLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                    <Skeleton className="h-6 w-24" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredQueries.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <FileWarning className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <h3 className="font-medium mb-1">No queries or warnings found</h3>
              <p className="text-sm text-muted-foreground">
                {searchTerm || statusFilter !== "all" || categoryFilter !== "all" || priorityFilter !== "all" || typeFilter !== "all"
                  ? "Try adjusting your filters"
                  : role === "employee"
                    ? "No queries or warnings have been issued to you"
                    : "No queries or warnings have been issued yet"}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredQueries.map(query => <QueryCard key={query.id} query={query} role={role} currentUserId={currentUser.id} employees={employees} />)
        )}
      </div>

      <Dialog open={isIssueOpen} onOpenChange={setIsIssueOpen}>
        <DialogContent className="sm:max-w-[500px]" data-testid="dialog-issue-query">
          <DialogHeader>
            <DialogTitle>{newType === "warning" ? "Issue a Warning" : "Issue a Query"}</DialogTitle>
            <DialogDescription>
              {newType === "warning"
                ? "Issue a formal warning to an employee. This serves as a documented notice and does not require a response."
                : "Issue a formal disciplinary query to an employee. They will be notified and required to respond."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={newType} onValueChange={setNewType}>
                <SelectTrigger data-testid="select-query-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="query">
                    <span className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-red-500" /> Query (requires response)</span>
                  </SelectItem>
                  <SelectItem value="warning">
                    <span className="flex items-center gap-2"><TriangleAlert className="h-4 w-4 text-amber-500" /> Warning (notice only)</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Employee</Label>
              <Select value={newEmployeeId} onValueChange={setNewEmployeeId}>
                <SelectTrigger data-testid="select-query-employee">
                  <SelectValue placeholder="Select employee..." />
                </SelectTrigger>
                <SelectContent>
                  {issuableEmployees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} - {emp.position}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="query-subject">Subject</Label>
              <Input
                id="query-subject"
                value={newSubject}
                onChange={e => setNewSubject(e.target.value)}
                placeholder="Brief summary of the issue"
                data-testid="input-query-subject"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={newCategory} onValueChange={setNewCategory}>
                  <SelectTrigger data-testid="select-query-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="attendance">Attendance</SelectItem>
                    <SelectItem value="conduct">Conduct</SelectItem>
                    <SelectItem value="performance">Performance</SelectItem>
                    <SelectItem value="policy_violation">Policy Violation</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={newPriority} onValueChange={setNewPriority}>
                  <SelectTrigger data-testid="select-query-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="query-description">Description</Label>
              <Textarea
                id="query-description"
                value={newDescription}
                onChange={e => setNewDescription(e.target.value)}
                placeholder="Describe the issue in detail, including dates, evidence, and what response is expected (minimum 10 characters)"
                rows={5}
                data-testid="input-query-description"
              />
            </div>
            <div className="space-y-2">
              <Label>Attachments</Label>
              <FileUpload files={newAttachments} onFilesChange={setNewAttachments} disabled={createMutation.isPending} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsIssueOpen(false)} data-testid="button-cancel-query">Cancel</Button>
            <Button onClick={handleIssueQuery} disabled={createMutation.isPending} data-testid="button-confirm-issue-query">
              {createMutation.isPending ? "Issuing..." : newType === "warning" ? "Issue Warning" : "Issue Query"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function QueryCard({ query, role, currentUserId, employees }: { query: HrQuery; role: string; currentUserId: string; employees: Employee[] }) {
  const getEmployee = (id: string) => employees.find(e => e.id === id);
  const emp = getEmployee(query.employeeId);
  const issuer = getEmployee(query.issuedBy);
  const StatusIcon = statusIcons[query.status] || AlertCircle;
  const isIssuedToMe = query.employeeId === currentUserId;
  const isWarning = query.type === "warning";

  return (
    <Link href={`/queries/${query.id}`}>
      <Card className="hover-elevate cursor-pointer" data-testid={`card-query-${query.id}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <StatusIcon className={`h-4 w-4 flex-shrink-0 ${statusColors[query.status]}`} />
                <span className="font-medium truncate" data-testid={`text-query-subject-${query.id}`}>{query.subject}</span>
                <Badge
                  variant="secondary"
                  className={`text-[10px] ${isWarning ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"}`}
                  data-testid={`badge-type-${query.id}`}
                >
                  {isWarning ? <><TriangleAlert className="h-3 w-3 mr-1" />Warning</> : <><ShieldAlert className="h-3 w-3 mr-1" />Query</>}
                </Badge>
                {isIssuedToMe && role !== "employee" && (
                  <Badge variant="outline" className="text-xs">Issued to you</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">{query.description}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className={`text-xs ${categoryColors[query.category]}`}>
                  {categoryLabels[query.category]}
                </Badge>
                <Badge variant="secondary" className={`text-xs ${priorityColors[query.priority]}`}>
                  {priorityLabels[query.priority]}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(query.createdAt!), "MMM d, yyyy")}
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge variant="outline" className={statusColors[query.status]} data-testid={`badge-status-${query.id}`}>
                {statusLabels[query.status]}
              </Badge>
              {emp && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">Against:</span>
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="text-[10px]">{emp.firstName[0]}{emp.lastName[0]}</AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-muted-foreground">{emp.firstName} {emp.lastName}</span>
                </div>
              )}
              {issuer && (role === "admin" || role === "manager") && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">By:</span>
                  <span className="text-xs text-muted-foreground">{issuer.firstName} {issuer.lastName}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
