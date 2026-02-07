import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useRole } from "@/lib/role-context";
import { useQueryStore } from "@/lib/query-store";
import { employees } from "@/lib/demo-data";
import {
  ArrowLeft,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Send,
  CalendarDays,
  MessageSquare,
  Shield,
  UserPlus,
  Reply,
  FileWarning,
} from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";

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
  resolved: "Resolved",
  closed: "Closed",
};

const statusBgColors: Record<string, string> = {
  open: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  awaiting_response: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  responded: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  resolved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  closed: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
};

const timelineIcons: Record<string, typeof AlertCircle> = {
  created: FileWarning,
  status_changed: Clock,
  assigned: UserPlus,
  commented: MessageSquare,
  responded: Reply,
  resolved: CheckCircle2,
  closed: XCircle,
};

function getEmployee(id: string) {
  return employees.find(e => e.id === id);
}

export default function QueryDetail() {
  const [, params] = useRoute("/queries/:id");
  const [, navigate] = useLocation();
  const { role, currentUser } = useRole();
  const { toast } = useToast();
  const { getQueryById, getCommentsForQuery, getTimelineForQuery, addComment, addResponse, updateQueryStatus, assignQuery } = useQueryStore();

  const [commentText, setCommentText] = useState("");
  const [responseText, setResponseText] = useState("");
  const [isInternal, setIsInternal] = useState(false);

  const queryId = params?.id;
  const query = queryId ? getQueryById(queryId) : undefined;
  const comments = queryId ? getCommentsForQuery(queryId) : [];
  const timeline = queryId ? getTimelineForQuery(queryId) : [];

  const isAdmin = role === "admin";
  const isManager = role === "manager";
  const canManage = isAdmin || isManager;

  const hasAccess = query ? (() => {
    if (role === "admin") return true;
    if (role === "manager") {
      const teamIds = employees.filter(e => e.managerId === currentUser.id).map(e => e.id);
      return query.issuedBy === currentUser.id || query.employeeId === currentUser.id || teamIds.includes(query.employeeId);
    }
    return query.employeeId === currentUser.id;
  })() : false;

  if (!query || !hasAccess) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-bold mb-2">Query Not Found</h2>
        <p className="text-muted-foreground mb-4">The query you are looking for does not exist or you do not have access.</p>
        <Link href="/queries">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Queries
          </Button>
        </Link>
      </div>
    );
  }

  const targetEmployee = getEmployee(query.employeeId);
  const issuer = getEmployee(query.issuedBy);
  const assignee = query.assignedTo ? getEmployee(query.assignedTo) : null;
  const visibleComments = comments.filter(c => isAdmin || c.isInternal !== "true");
  const isTargetEmployee = query.employeeId === currentUser.id;
  const canRespond = isTargetEmployee && (query.status === "open" || query.status === "awaiting_response");

  const hrEmployees = employees.filter(e => e.departmentId === "dept-2");

  function handleAddComment() {
    if (!commentText.trim()) return;
    addComment(queryId!, commentText.trim(), currentUser.id, isInternal);
    toast({ title: isInternal ? "Internal note added" : "Comment added" });
    setCommentText("");
    setIsInternal(false);
  }

  function handleSubmitResponse() {
    if (!responseText.trim() || responseText.trim().length < 10) {
      toast({ title: "Validation Error", description: "Your response must be at least 10 characters.", variant: "destructive" });
      return;
    }
    addResponse(queryId!, responseText.trim(), currentUser.id);
    toast({ title: "Response submitted", description: "Your response has been submitted and is now under review." });
    setResponseText("");
  }

  function handleStatusChange(newStatus: string) {
    updateQueryStatus(queryId!, newStatus, currentUser.id);
    toast({ title: "Status updated", description: `Query status changed to ${statusLabels[newStatus]}` });
  }

  function handleAssign(assigneeId: string) {
    const emp = getEmployee(assigneeId);
    assignQuery(queryId!, assigneeId === "unassigned" ? null : assigneeId, currentUser.id);
    toast({ title: assigneeId === "unassigned" ? "Query unassigned" : "Query assigned", description: assigneeId !== "unassigned" ? `Assigned to ${emp?.firstName} ${emp?.lastName}` : undefined });
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/queries">
          <Button variant="ghost" size="icon" data-testid="button-back-queries">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold tracking-tight truncate" data-testid="text-query-detail-subject">{query.subject}</h1>
          <p className="text-sm text-muted-foreground">
            Query #{query.id.replace("query-", "")} &middot; Issued {format(new Date(query.createdAt!), "MMM d, yyyy 'at' h:mm a")}
          </p>
        </div>
      </div>

      {canRespond && (
        <Card className="border-amber-300 dark:border-amber-700">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 space-y-3">
                <div>
                  <p className="text-sm font-medium">Response Required</p>
                  <p className="text-sm text-muted-foreground">You have been issued a formal query. Please provide your written response below.</p>
                </div>
                <Textarea
                  value={responseText}
                  onChange={e => setResponseText(e.target.value)}
                  placeholder="Write your response here (minimum 10 characters)..."
                  rows={4}
                  data-testid="input-response"
                />
                <div className="flex justify-end">
                  <Button onClick={handleSubmitResponse} disabled={responseText.trim().length < 10} data-testid="button-submit-response">
                    <Reply className="h-4 w-4 mr-2" />
                    Submit Response
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Query Details</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap" data-testid="text-query-description">{query.description}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <CardTitle className="text-base">Comments & Responses ({visibleComments.length})</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {visibleComments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No comments or responses yet</p>
              ) : (
                visibleComments.map(comment => {
                  const author = getEmployee(comment.authorId);
                  const isInternalNote = comment.isInternal === "true";
                  const isEmployeeResponse = comment.authorId === query.employeeId;
                  return (
                    <div
                      key={comment.id}
                      className={`p-3 rounded-md border ${isInternalNote ? "border-yellow-300 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-900/20" : isEmployeeResponse ? "border-indigo-200 bg-indigo-50/50 dark:border-indigo-800 dark:bg-indigo-900/20" : ""}`}
                      data-testid={`comment-${comment.id}`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-[10px]">
                            {author ? `${author.firstName[0]}${author.lastName[0]}` : "??"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">
                          {author ? `${author.firstName} ${author.lastName}` : "Unknown"}
                        </span>
                        {isEmployeeResponse && (
                          <Badge variant="secondary" className="text-[10px] bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300">
                            <Reply className="h-3 w-3 mr-1" />
                            Response
                          </Badge>
                        )}
                        {isInternalNote && (
                          <Badge variant="secondary" className="text-[10px] bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                            <Shield className="h-3 w-3 mr-1" />
                            Internal
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground ml-auto">
                          {format(new Date(comment.createdAt!), "MMM d, yyyy 'at' h:mm a")}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                    </div>
                  );
                })
              )}

              {canManage && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <Textarea
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                      placeholder={isInternal ? "Add an internal note (only visible to admins)..." : "Add a comment or follow-up..."}
                      rows={3}
                      data-testid="input-comment"
                    />
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      {isAdmin && (
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="internal-note"
                            checked={isInternal}
                            onCheckedChange={(checked) => setIsInternal(checked === true)}
                            data-testid="checkbox-internal"
                          />
                          <Label htmlFor="internal-note" className="text-sm text-muted-foreground cursor-pointer">
                            Internal note (only visible to HR)
                          </Label>
                        </div>
                      )}
                      <Button
                        onClick={handleAddComment}
                        disabled={!commentText.trim()}
                        className="ml-auto"
                        data-testid="button-add-comment"
                      >
                        <Send className="h-4 w-4 mr-2" />
                        {isInternal ? "Add Note" : "Add Comment"}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Status</div>
                {canManage ? (
                  <Select value={query.status} onValueChange={handleStatusChange}>
                    <SelectTrigger data-testid="select-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="awaiting_response">Awaiting Response</SelectItem>
                      <SelectItem value="responded">Responded</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant="secondary" className={statusBgColors[query.status]} data-testid="badge-detail-status">
                    {statusLabels[query.status]}
                  </Badge>
                )}
              </div>

              <Separator />

              <div className="space-y-1">
                <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Category</div>
                <Badge variant="secondary" className={categoryColors[query.category]}>
                  {categoryLabels[query.category]}
                </Badge>
              </div>

              <Separator />

              <div className="space-y-1">
                <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Priority</div>
                <Badge variant="secondary" className={priorityColors[query.priority]}>
                  {priorityLabels[query.priority]}
                </Badge>
              </div>

              <Separator />

              <div className="space-y-1">
                <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Issued Against</div>
                {targetEmployee && (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-[10px]">{targetEmployee.firstName[0]}{targetEmployee.lastName[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-medium">{targetEmployee.firstName} {targetEmployee.lastName}</div>
                      <div className="text-xs text-muted-foreground">{targetEmployee.position}</div>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-1">
                <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Issued By</div>
                {issuer && (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-[10px]">{issuer.firstName[0]}{issuer.lastName[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-medium">{issuer.firstName} {issuer.lastName}</div>
                      <div className="text-xs text-muted-foreground">{issuer.position}</div>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-1">
                <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Assigned To</div>
                {canManage ? (
                  <Select value={query.assignedTo || "unassigned"} onValueChange={handleAssign}>
                    <SelectTrigger data-testid="select-assignee">
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {hrEmployees.map(emp => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.firstName} {emp.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : assignee ? (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-[10px]">{assignee.firstName[0]}{assignee.lastName[0]}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{assignee.firstName} {assignee.lastName}</span>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Unassigned</span>
                )}
              </div>

              <Separator />

              <div className="space-y-1">
                <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Date Issued</div>
                <div className="flex items-center gap-1.5 text-sm">
                  <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                  {format(new Date(query.createdAt!), "MMM d, yyyy")}
                </div>
              </div>

              {query.resolvedAt && (
                <>
                  <Separator />
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Resolved</div>
                    <div className="flex items-center gap-1.5 text-sm">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                      {format(new Date(query.resolvedAt), "MMM d, yyyy")}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {timeline.map((event, idx) => {
                  const actor = getEmployee(event.actorId);
                  const Icon = timelineIcons[event.action] || Clock;
                  return (
                    <div key={event.id} className="flex gap-3" data-testid={`timeline-${event.id}`}>
                      <div className="flex flex-col items-center">
                        <div className="rounded-full p-1 border bg-background">
                          <Icon className="h-3 w-3 text-muted-foreground" />
                        </div>
                        {idx < timeline.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                      </div>
                      <div className="pb-4 min-w-0">
                        <p className="text-sm">{event.details}</p>
                        <p className="text-xs text-muted-foreground">
                          {actor ? `${actor.firstName} ${actor.lastName}` : "System"} &middot; {format(new Date(event.createdAt!), "MMM d 'at' h:mm a")}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
