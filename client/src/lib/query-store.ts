import { create } from "zustand";
import type { HrQuery, HrQueryComment, HrQueryTimeline } from "@shared/schema";

const demoQueries: HrQuery[] = [
  {
    id: "query-1",
    subject: "Repeated tardiness - January 2026",
    description: "You have been late to work on 6 occasions during January 2026, exceeding the acceptable threshold of 2 late arrivals per month. Specifically, late arrivals were recorded on Jan 3, 7, 12, 15, 22, and 28. Please provide an explanation for these absences and any steps you plan to take to address this going forward.",
    category: "attendance",
    priority: "high",
    status: "awaiting_response",
    employeeId: "emp-2",
    issuedBy: "emp-1",
    assignedTo: "emp-4",
    createdAt: new Date("2026-01-29T09:00:00Z"),
    updatedAt: new Date("2026-01-29T10:00:00Z"),
    resolvedAt: null,
  },
  {
    id: "query-2",
    subject: "Unprofessional conduct during client meeting",
    description: "During the client presentation on January 24, 2026 with Acme Corp, your behaviour was reported as dismissive and unprofessional. You interrupted the client representative multiple times and used inappropriate language. This is a formal query requiring your written response within 3 business days.",
    category: "conduct",
    priority: "urgent",
    status: "responded",
    employeeId: "emp-9",
    issuedBy: "emp-4",
    assignedTo: "emp-4",
    createdAt: new Date("2026-01-25T14:30:00Z"),
    updatedAt: new Date("2026-01-28T11:00:00Z"),
    resolvedAt: null,
  },
  {
    id: "query-3",
    subject: "Missed project deadlines - Q4 2025",
    description: "You missed 3 critical project deadlines during Q4 2025: the API integration (due Oct 15), the security audit report (due Nov 30), and the year-end documentation (due Dec 20). Despite multiple reminders, these deliverables were submitted significantly late. Please explain the reasons for these delays.",
    category: "performance",
    priority: "high",
    status: "resolved",
    employeeId: "emp-8",
    issuedBy: "emp-1",
    assignedTo: "emp-4",
    createdAt: new Date("2026-01-10T11:00:00Z"),
    updatedAt: new Date("2026-01-20T16:30:00Z"),
    resolvedAt: new Date("2026-01-20T16:30:00Z"),
  },
  {
    id: "query-4",
    subject: "Unauthorized use of company equipment",
    description: "It has come to our attention that company-issued equipment (laptop and projector) was used for personal purposes outside of working hours on January 18-19, 2026. This is in violation of the company's IT and equipment usage policy (Section 4.2). Please provide your explanation.",
    category: "policy_violation",
    priority: "medium",
    status: "open",
    employeeId: "emp-3",
    issuedBy: "emp-4",
    assignedTo: null,
    createdAt: new Date("2026-01-30T08:45:00Z"),
    updatedAt: new Date("2026-01-30T08:45:00Z"),
    resolvedAt: null,
  },
  {
    id: "query-5",
    subject: "Failure to follow safety protocols",
    description: "On January 14, 2026, you were observed not wearing the required safety equipment in the server room (Section 7.1 of Workplace Safety Policy). This is a serious violation that could result in injury. This is your second warning regarding safety protocol adherence.",
    category: "policy_violation",
    priority: "urgent",
    status: "closed",
    employeeId: "emp-10",
    issuedBy: "emp-4",
    assignedTo: "emp-4",
    createdAt: new Date("2026-01-15T10:20:00Z"),
    updatedAt: new Date("2026-01-22T14:00:00Z"),
    resolvedAt: new Date("2026-01-20T11:00:00Z"),
  },
  {
    id: "query-6",
    subject: "Unapproved absence on January 22",
    description: "You were absent from work on January 22, 2026, without prior approval or notification to your manager. No leave request was submitted for this date. Please explain the reason for your absence and why no prior notice was given.",
    category: "attendance",
    priority: "medium",
    status: "awaiting_response",
    employeeId: "emp-5",
    issuedBy: "emp-4",
    assignedTo: "emp-4",
    createdAt: new Date("2026-01-23T09:00:00Z"),
    updatedAt: new Date("2026-01-23T09:30:00Z"),
    resolvedAt: null,
  },
];

const demoComments: HrQueryComment[] = [
  {
    id: "comment-1",
    queryId: "query-1",
    content: "This query has been logged and forwarded to HR for review. Please respond within 5 business days.",
    authorId: "emp-1",
    isInternal: "false",
    createdAt: new Date("2026-01-29T09:30:00Z"),
  },
  {
    id: "comment-2",
    queryId: "query-2",
    content: "I would like to sincerely apologize for my behaviour during the Acme Corp meeting. I was under significant personal stress that day, which is not an excuse but context. I have already reached out to the client representative to apologize personally. I commit to maintaining professional conduct in all future interactions.",
    authorId: "emp-9",
    isInternal: "false",
    createdAt: new Date("2026-01-27T16:00:00Z"),
  },
  {
    id: "comment-3",
    queryId: "query-2",
    content: "Employee has responded. Need to verify with client if apology was received before closing.",
    authorId: "emp-4",
    isInternal: "true",
    createdAt: new Date("2026-01-28T10:00:00Z"),
  },
  {
    id: "comment-4",
    queryId: "query-3",
    content: "The delays were caused by unclear requirements from stakeholders and scope changes mid-project. I have documented the timeline with evidence. I have also implemented a personal task management system to prevent future delays. I take responsibility for not escalating the issues earlier.",
    authorId: "emp-8",
    isInternal: "false",
    createdAt: new Date("2026-01-12T14:00:00Z"),
  },
  {
    id: "comment-5",
    queryId: "query-3",
    content: "Response reviewed. Employee's explanation is reasonable. Scope changes were confirmed by project manager. Recommending a verbal warning with performance improvement plan.",
    authorId: "emp-1",
    isInternal: "false",
    createdAt: new Date("2026-01-15T11:00:00Z"),
  },
  {
    id: "comment-6",
    queryId: "query-3",
    content: "Confirmed with PM that scope changes were not properly communicated. Closing with verbal warning only.",
    authorId: "emp-4",
    isInternal: "true",
    createdAt: new Date("2026-01-20T16:00:00Z"),
  },
  {
    id: "comment-7",
    queryId: "query-5",
    content: "I acknowledge the violation and accept full responsibility. I have completed the safety refresher training and will ensure compliance going forward.",
    authorId: "emp-10",
    isInternal: "false",
    createdAt: new Date("2026-01-16T09:00:00Z"),
  },
  {
    id: "comment-8",
    queryId: "query-5",
    content: "Employee completed safety re-training on Jan 17. Certificate on file. Second written warning issued and placed in personnel file.",
    authorId: "emp-4",
    isInternal: "false",
    createdAt: new Date("2026-01-20T11:00:00Z"),
  },
];

const demoTimeline: HrQueryTimeline[] = [
  { id: "tl-1", queryId: "query-1", action: "created", details: "Query issued by Sarah Chen against Marcus Johnson", actorId: "emp-1", createdAt: new Date("2026-01-29T09:00:00Z") },
  { id: "tl-2", queryId: "query-1", action: "assigned", details: "Assigned to David Kim (HR)", actorId: "emp-1", createdAt: new Date("2026-01-29T09:15:00Z") },
  { id: "tl-3", queryId: "query-1", action: "status_changed", details: "Status changed to Awaiting Response", actorId: "emp-4", createdAt: new Date("2026-01-29T10:00:00Z") },

  { id: "tl-4", queryId: "query-2", action: "created", details: "Query issued by David Kim against Robert Davis", actorId: "emp-4", createdAt: new Date("2026-01-25T14:30:00Z") },
  { id: "tl-5", queryId: "query-2", action: "status_changed", details: "Status changed to Awaiting Response", actorId: "emp-4", createdAt: new Date("2026-01-25T15:00:00Z") },
  { id: "tl-6", queryId: "query-2", action: "responded", details: "Employee submitted response", actorId: "emp-9", createdAt: new Date("2026-01-27T16:00:00Z") },
  { id: "tl-7", queryId: "query-2", action: "status_changed", details: "Status changed to Responded", actorId: "emp-9", createdAt: new Date("2026-01-27T16:00:00Z") },

  { id: "tl-8", queryId: "query-3", action: "created", details: "Query issued by Sarah Chen against James Wilson", actorId: "emp-1", createdAt: new Date("2026-01-10T11:00:00Z") },
  { id: "tl-9", queryId: "query-3", action: "assigned", details: "Assigned to David Kim (HR)", actorId: "emp-1", createdAt: new Date("2026-01-10T11:30:00Z") },
  { id: "tl-10", queryId: "query-3", action: "status_changed", details: "Status changed to Awaiting Response", actorId: "emp-4", createdAt: new Date("2026-01-10T12:00:00Z") },
  { id: "tl-11", queryId: "query-3", action: "responded", details: "Employee submitted response", actorId: "emp-8", createdAt: new Date("2026-01-12T14:00:00Z") },
  { id: "tl-12", queryId: "query-3", action: "status_changed", details: "Status changed to Resolved", actorId: "emp-4", createdAt: new Date("2026-01-20T16:30:00Z") },

  { id: "tl-13", queryId: "query-4", action: "created", details: "Query issued by David Kim against Emily Rodriguez", actorId: "emp-4", createdAt: new Date("2026-01-30T08:45:00Z") },

  { id: "tl-14", queryId: "query-5", action: "created", details: "Query issued by David Kim against Lisa Anderson", actorId: "emp-4", createdAt: new Date("2026-01-15T10:20:00Z") },
  { id: "tl-15", queryId: "query-5", action: "status_changed", details: "Status changed to Awaiting Response", actorId: "emp-4", createdAt: new Date("2026-01-15T10:45:00Z") },
  { id: "tl-16", queryId: "query-5", action: "responded", details: "Employee submitted response", actorId: "emp-10", createdAt: new Date("2026-01-16T09:00:00Z") },
  { id: "tl-17", queryId: "query-5", action: "status_changed", details: "Status changed to Resolved", actorId: "emp-4", createdAt: new Date("2026-01-20T11:00:00Z") },
  { id: "tl-18", queryId: "query-5", action: "status_changed", details: "Status changed to Closed", actorId: "emp-4", createdAt: new Date("2026-01-22T14:00:00Z") },

  { id: "tl-19", queryId: "query-6", action: "created", details: "Query issued by David Kim against Jessica Williams", actorId: "emp-4", createdAt: new Date("2026-01-23T09:00:00Z") },
  { id: "tl-20", queryId: "query-6", action: "status_changed", details: "Status changed to Awaiting Response", actorId: "emp-4", createdAt: new Date("2026-01-23T09:30:00Z") },
];

interface QueryStore {
  queries: HrQuery[];
  comments: HrQueryComment[];
  timeline: HrQueryTimeline[];

  addQuery: (query: Omit<HrQuery, "id" | "createdAt" | "updatedAt" | "resolvedAt" | "status" | "assignedTo">) => string;
  updateQueryStatus: (queryId: string, status: string, actorId: string) => void;
  assignQuery: (queryId: string, assigneeId: string | null, actorId: string) => void;
  addComment: (queryId: string, content: string, authorId: string, isInternal: boolean) => void;
  addResponse: (queryId: string, content: string, employeeId: string) => void;
  getQueryById: (queryId: string) => HrQuery | undefined;
  getCommentsForQuery: (queryId: string) => HrQueryComment[];
  getTimelineForQuery: (queryId: string) => HrQueryTimeline[];
}

export const useQueryStore = create<QueryStore>((set, get) => ({
  queries: demoQueries,
  comments: demoComments,
  timeline: demoTimeline,

  addQuery: (queryData) => {
    const id = `query-${Date.now()}`;
    const now = new Date();
    const newQuery: HrQuery = {
      ...queryData,
      id,
      status: "open",
      assignedTo: null,
      createdAt: now,
      updatedAt: now,
      resolvedAt: null,
    };
    const timelineEntry: HrQueryTimeline = {
      id: `tl-${Date.now()}`,
      queryId: id,
      action: "created",
      details: "Query issued",
      actorId: queryData.issuedBy,
      createdAt: now,
    };
    set(state => ({
      queries: [newQuery, ...state.queries],
      timeline: [...state.timeline, timelineEntry],
    }));
    return id;
  },

  updateQueryStatus: (queryId, status, actorId) => {
    const now = new Date();
    const statusLabels: Record<string, string> = {
      open: "Open",
      awaiting_response: "Awaiting Response",
      responded: "Responded",
      resolved: "Resolved",
      closed: "Closed",
    };
    set(state => ({
      queries: state.queries.map(q =>
        q.id === queryId
          ? {
              ...q,
              status,
              updatedAt: now,
              resolvedAt: status === "resolved" ? now : q.resolvedAt,
            }
          : q
      ),
      timeline: [
        ...state.timeline,
        {
          id: `tl-${Date.now()}`,
          queryId,
          action: "status_changed",
          details: `Status changed to ${statusLabels[status] || status}`,
          actorId,
          createdAt: now,
        },
      ],
    }));
  },

  assignQuery: (queryId, assigneeId, actorId) => {
    const now = new Date();
    set(state => ({
      queries: state.queries.map(q =>
        q.id === queryId ? { ...q, assignedTo: assigneeId, updatedAt: now } : q
      ),
      timeline: [
        ...state.timeline,
        {
          id: `tl-${Date.now()}-assign`,
          queryId,
          action: "assigned",
          details: assigneeId ? `Query assigned` : "Query unassigned",
          actorId,
          createdAt: now,
        },
      ],
    }));
  },

  addComment: (queryId, content, authorId, isInternal) => {
    const now = new Date();
    set(state => ({
      comments: [
        ...state.comments,
        {
          id: `comment-${Date.now()}`,
          queryId,
          content,
          authorId,
          isInternal: isInternal ? "true" : "false",
          createdAt: now,
        },
      ],
      queries: state.queries.map(q =>
        q.id === queryId ? { ...q, updatedAt: now } : q
      ),
      timeline: [
        ...state.timeline,
        {
          id: `tl-${Date.now()}-comment`,
          queryId,
          action: "commented",
          details: isInternal ? "Internal note added" : "Comment added",
          actorId: authorId,
          createdAt: now,
        },
      ],
    }));
  },

  addResponse: (queryId, content, employeeId) => {
    const now = new Date();
    set(state => ({
      comments: [
        ...state.comments,
        {
          id: `comment-${Date.now()}`,
          queryId,
          content,
          authorId: employeeId,
          isInternal: "false",
          createdAt: now,
        },
      ],
      queries: state.queries.map(q =>
        q.id === queryId ? { ...q, status: "responded", updatedAt: now } : q
      ),
      timeline: [
        ...state.timeline,
        {
          id: `tl-${Date.now()}-response`,
          queryId,
          action: "responded",
          details: "Employee submitted response",
          actorId: employeeId,
          createdAt: now,
        },
        {
          id: `tl-${Date.now()}-status`,
          queryId,
          action: "status_changed",
          details: "Status changed to Responded",
          actorId: employeeId,
          createdAt: now,
        },
      ],
    }));
  },

  getQueryById: (queryId) => get().queries.find(q => q.id === queryId),
  getCommentsForQuery: (queryId) => get().comments.filter(c => c.queryId === queryId).sort((a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime()),
  getTimelineForQuery: (queryId) => get().timeline.filter(t => t.queryId === queryId).sort((a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime()),
}));
