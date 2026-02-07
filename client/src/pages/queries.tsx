import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useQueryStore } from "@/lib/query-store";
import { employees } from "@/lib/demo-data";
import { Plus, Search, MessageSquare, Clock, AlertCircle, CheckCircle2, XCircle, Filter } from "lucide-react";
import { format } from "date-fns";
import type { HrQuery } from "@shared/schema";

const categoryLabels: Record<string, string> = {
  leave: "Leave",
  workplace: "Workplace",
  policy: "Policy",
  other: "Other",
};

const categoryColors: Record<string, string> = {
  leave: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  workplace: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  policy: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
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
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
};

const statusIcons: Record<string, typeof AlertCircle> = {
  open: AlertCircle,
  in_progress: Clock,
  resolved: CheckCircle2,
  closed: XCircle,
};

const statusColors: Record<string, string> = {
  open: "text-blue-600 dark:text-blue-400",
  in_progress: "text-yellow-600 dark:text-yellow-400",
  resolved: "text-green-600 dark:text-green-400",
  closed: "text-muted-foreground",
};

function getEmployee(id: string) {
  return employees.find(e => e.id === id);
}

export default function Queries() {
  const { role, currentUser } = useRole();
  const { toast } = useToast();
  const { queries, addQuery } = useQueryStore();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);

  const [newSubject, setNewSubject] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCategory, setNewCategory] = useState<string>("leave");
  const [newPriority, setNewPriority] = useState<string>("medium");

  const visibleQueries = queries.filter(q => {
    if (role === "employee") return q.employeeId === currentUser.id;
    if (role === "manager") {
      const teamIds = employees.filter(e => e.managerId === currentUser.id).map(e => e.id);
      return q.employeeId === currentUser.id || teamIds.includes(q.employeeId);
    }
    return true;
  });

  const filteredQueries = visibleQueries.filter(q => {
    const matchesSearch =
      q.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getEmployee(q.employeeId)?.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getEmployee(q.employeeId)?.lastName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || q.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || q.category === categoryFilter;
    const matchesPriority = priorityFilter === "all" || q.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesCategory && matchesPriority;
  }).sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());

  const stats = {
    total: visibleQueries.length,
    open: visibleQueries.filter(q => q.status === "open").length,
    inProgress: visibleQueries.filter(q => q.status === "in_progress").length,
    resolved: visibleQueries.filter(q => q.status === "resolved").length,
  };

  function handleSubmitQuery() {
    if (!newSubject.trim() || newDescription.trim().length < 10) {
      toast({ title: "Validation Error", description: "Please fill in all required fields. Description must be at least 10 characters.", variant: "destructive" });
      return;
    }
    addQuery({
      subject: newSubject.trim(),
      description: newDescription.trim(),
      category: newCategory,
      priority: newPriority,
      employeeId: currentUser.id,
    });
    toast({ title: "Query submitted", description: "Your query has been submitted successfully." });
    setIsSubmitOpen(false);
    setNewSubject("");
    setNewDescription("");
    setNewCategory("leave");
    setNewPriority("medium");
  }

  function handleOpenSubmit() {
    setNewSubject("");
    setNewDescription("");
    setNewCategory("leave");
    setNewPriority("medium");
    setIsSubmitOpen(true);
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-queries-title">Queries</h1>
          <p className="text-muted-foreground text-sm">
            {role === "employee" ? "Submit and track your HR queries" : role === "manager" ? "View your team's HR queries" : "Manage all HR queries and grievances"}
          </p>
        </div>
        <Button onClick={handleOpenSubmit} data-testid="button-submit-query">
          <Plus className="h-4 w-4 mr-2" />
          Submit Query
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Total</div>
            <div className="text-2xl font-bold" data-testid="stat-total">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Open</div>
            <div className="text-2xl font-bold text-blue-600" data-testid="stat-open">{stats.open}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">In Progress</div>
            <div className="text-2xl font-bold text-yellow-600" data-testid="stat-in-progress">{stats.inProgress}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Resolved</div>
            <div className="text-2xl font-bold text-green-600" data-testid="stat-resolved">{stats.resolved}</div>
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
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]" data-testid="filter-status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[140px]" data-testid="filter-category">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="leave">Leave</SelectItem>
            <SelectItem value="workplace">Workplace</SelectItem>
            <SelectItem value="policy">Policy</SelectItem>
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
        {filteredQueries.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <h3 className="font-medium mb-1">No queries found</h3>
              <p className="text-sm text-muted-foreground">
                {searchTerm || statusFilter !== "all" || categoryFilter !== "all" || priorityFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Submit your first query to get started"}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredQueries.map(query => <QueryCard key={query.id} query={query} role={role} />)
        )}
      </div>

      <Dialog open={isSubmitOpen} onOpenChange={setIsSubmitOpen}>
        <DialogContent className="sm:max-w-[500px]" data-testid="dialog-submit-query">
          <DialogHeader>
            <DialogTitle>Submit a Query</DialogTitle>
            <DialogDescription>Describe your query or concern and we will get back to you.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="query-subject">Subject</Label>
              <Input
                id="query-subject"
                value={newSubject}
                onChange={e => setNewSubject(e.target.value)}
                placeholder="Brief summary of your query"
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
                    <SelectItem value="leave">Leave</SelectItem>
                    <SelectItem value="workplace">Workplace</SelectItem>
                    <SelectItem value="policy">Policy</SelectItem>
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
                placeholder="Describe your query in detail (minimum 10 characters)"
                rows={5}
                data-testid="input-query-description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSubmitOpen(false)} data-testid="button-cancel-query">Cancel</Button>
            <Button onClick={handleSubmitQuery} data-testid="button-confirm-submit-query">Submit Query</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function QueryCard({ query, role }: { query: HrQuery; role: string }) {
  const emp = getEmployee(query.employeeId);
  const assignee = query.assignedTo ? getEmployee(query.assignedTo) : null;
  const StatusIcon = statusIcons[query.status] || AlertCircle;
  const { getCommentsForQuery } = useQueryStore();
  const commentCount = getCommentsForQuery(query.id).filter(c => role === "admin" || c.isInternal !== "true").length;

  return (
    <Link href={`/queries/${query.id}`}>
      <Card className="hover-elevate cursor-pointer" data-testid={`card-query-${query.id}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <StatusIcon className={`h-4 w-4 flex-shrink-0 ${statusColors[query.status]}`} />
                <span className="font-medium truncate" data-testid={`text-query-subject-${query.id}`}>{query.subject}</span>
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
                {commentCount > 0 && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MessageSquare className="h-3 w-3" />
                    {commentCount}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge variant="outline" className={statusColors[query.status]} data-testid={`badge-status-${query.id}`}>
                {statusLabels[query.status]}
              </Badge>
              {(role === "admin" || role === "manager") && emp && (
                <div className="flex items-center gap-1.5">
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="text-[10px]">{emp.firstName[0]}{emp.lastName[0]}</AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-muted-foreground">{emp.firstName} {emp.lastName}</span>
                </div>
              )}
              {role === "admin" && assignee && (
                <span className="text-xs text-muted-foreground">Assigned: {assignee.firstName}</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
