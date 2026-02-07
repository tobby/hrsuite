import { create } from "zustand";
import type { HrQuery, HrQueryComment, HrQueryTimeline } from "@shared/schema";

const demoQueries: HrQuery[] = [
  {
    id: "query-1",
    subject: "Leave balance discrepancy",
    description: "My leave balance shows 10 days remaining but I believe I should have 12 days. I only took 3 days of annual leave this year but the system shows 5 days used. Could someone please review my leave records?",
    category: "leave",
    priority: "medium",
    status: "open",
    employeeId: "emp-3",
    assignedTo: "emp-4",
    createdAt: new Date("2026-01-28T09:15:00Z"),
    updatedAt: new Date("2026-01-28T09:15:00Z"),
    resolvedAt: null,
  },
  {
    id: "query-2",
    subject: "Noise levels in open office area",
    description: "The noise levels in the open office area on the 3rd floor have become increasingly disruptive. Multiple team members are finding it difficult to concentrate during peak hours. We would like to request noise-cancelling solutions or designated quiet zones.",
    category: "workplace",
    priority: "high",
    status: "in_progress",
    employeeId: "emp-2",
    assignedTo: "emp-4",
    createdAt: new Date("2026-01-25T14:30:00Z"),
    updatedAt: new Date("2026-01-27T10:00:00Z"),
    resolvedAt: null,
  },
  {
    id: "query-3",
    subject: "Remote work policy clarification",
    description: "I would like clarification on the updated remote work policy. Specifically, are we allowed to work remotely on Fridays? The current policy document seems ambiguous about which days are eligible for remote work.",
    category: "policy",
    priority: "low",
    status: "resolved",
    employeeId: "emp-8",
    assignedTo: "emp-4",
    createdAt: new Date("2026-01-20T11:00:00Z"),
    updatedAt: new Date("2026-01-22T16:30:00Z"),
    resolvedAt: new Date("2026-01-22T16:30:00Z"),
  },
  {
    id: "query-4",
    subject: "Request for ergonomic desk setup",
    description: "I have been experiencing back pain due to my current desk setup. I would like to request an ergonomic chair and adjustable standing desk as recommended by my doctor. I can provide a medical note if needed.",
    category: "workplace",
    priority: "medium",
    status: "open",
    employeeId: "emp-3",
    assignedTo: null,
    createdAt: new Date("2026-01-30T08:45:00Z"),
    updatedAt: new Date("2026-01-30T08:45:00Z"),
    resolvedAt: null,
  },
  {
    id: "query-5",
    subject: "Overtime compensation policy",
    description: "I worked 15 hours of overtime last month but I am unclear about the overtime compensation policy. Does the company offer time off in lieu or monetary compensation for overtime hours?",
    category: "policy",
    priority: "medium",
    status: "closed",
    employeeId: "emp-9",
    assignedTo: "emp-4",
    createdAt: new Date("2026-01-15T10:20:00Z"),
    updatedAt: new Date("2026-01-18T14:00:00Z"),
    resolvedAt: new Date("2026-01-17T11:00:00Z"),
  },
  {
    id: "query-6",
    subject: "Parking space allocation",
    description: "I recently changed my commuting method and now drive to work. I would like to request a parking space in the company lot. Are there available spots and what is the process for getting one assigned?",
    category: "other",
    priority: "low",
    status: "in_progress",
    employeeId: "emp-5",
    assignedTo: "emp-4",
    createdAt: new Date("2026-01-22T13:00:00Z"),
    updatedAt: new Date("2026-01-24T09:00:00Z"),
    resolvedAt: null,
  },
];

const demoComments: HrQueryComment[] = [
  {
    id: "comment-1",
    queryId: "query-1",
    content: "Thank you for raising this. I will review your leave records and get back to you within 2 business days.",
    authorId: "emp-4",
    isInternal: "false",
    createdAt: new Date("2026-01-28T11:00:00Z"),
  },
  {
    id: "comment-2",
    queryId: "query-2",
    content: "We have received similar feedback from other team members. We are looking into solutions including sound panels and quiet zones.",
    authorId: "emp-4",
    isInternal: "false",
    createdAt: new Date("2026-01-26T09:30:00Z"),
  },
  {
    id: "comment-3",
    queryId: "query-2",
    content: "Contacted facilities team about sound panel installation costs. Waiting for quote.",
    authorId: "emp-4",
    isInternal: "true",
    createdAt: new Date("2026-01-27T10:00:00Z"),
  },
  {
    id: "comment-4",
    queryId: "query-3",
    content: "The remote work policy has been clarified. Employees can work remotely up to 2 days per week, including Fridays, with manager approval. The updated policy document has been shared on the company intranet.",
    authorId: "emp-4",
    isInternal: "false",
    createdAt: new Date("2026-01-22T16:30:00Z"),
  },
  {
    id: "comment-5",
    queryId: "query-5",
    content: "Our overtime policy provides time off in lieu at a 1:1 ratio, or monetary compensation at 1.5x hourly rate for approved overtime. Please speak with your manager about which option works best for you.",
    authorId: "emp-4",
    isInternal: "false",
    createdAt: new Date("2026-01-17T11:00:00Z"),
  },
  {
    id: "comment-6",
    queryId: "query-6",
    content: "I have forwarded your request to facilities management. There are currently 3 spots available in Lot B.",
    authorId: "emp-4",
    isInternal: "false",
    createdAt: new Date("2026-01-24T09:00:00Z"),
  },
];

const demoTimeline: HrQueryTimeline[] = [
  { id: "tl-1", queryId: "query-1", action: "created", details: "Query submitted", actorId: "emp-3", createdAt: new Date("2026-01-28T09:15:00Z") },
  { id: "tl-2", queryId: "query-1", action: "assigned", details: "Assigned to David Kim", actorId: "emp-4", createdAt: new Date("2026-01-28T09:30:00Z") },
  { id: "tl-3", queryId: "query-2", action: "created", details: "Query submitted", actorId: "emp-2", createdAt: new Date("2026-01-25T14:30:00Z") },
  { id: "tl-4", queryId: "query-2", action: "assigned", details: "Assigned to David Kim", actorId: "emp-4", createdAt: new Date("2026-01-25T15:00:00Z") },
  { id: "tl-5", queryId: "query-2", action: "status_changed", details: "Status changed to In Progress", actorId: "emp-4", createdAt: new Date("2026-01-26T09:30:00Z") },
  { id: "tl-6", queryId: "query-3", action: "created", details: "Query submitted", actorId: "emp-8", createdAt: new Date("2026-01-20T11:00:00Z") },
  { id: "tl-7", queryId: "query-3", action: "assigned", details: "Assigned to David Kim", actorId: "emp-4", createdAt: new Date("2026-01-20T11:30:00Z") },
  { id: "tl-8", queryId: "query-3", action: "status_changed", details: "Status changed to Resolved", actorId: "emp-4", createdAt: new Date("2026-01-22T16:30:00Z") },
  { id: "tl-9", queryId: "query-4", action: "created", details: "Query submitted", actorId: "emp-3", createdAt: new Date("2026-01-30T08:45:00Z") },
  { id: "tl-10", queryId: "query-5", action: "created", details: "Query submitted", actorId: "emp-9", createdAt: new Date("2026-01-15T10:20:00Z") },
  { id: "tl-11", queryId: "query-5", action: "assigned", details: "Assigned to David Kim", actorId: "emp-4", createdAt: new Date("2026-01-15T10:45:00Z") },
  { id: "tl-12", queryId: "query-5", action: "status_changed", details: "Status changed to Resolved", actorId: "emp-4", createdAt: new Date("2026-01-17T11:00:00Z") },
  { id: "tl-13", queryId: "query-5", action: "status_changed", details: "Status changed to Closed", actorId: "emp-4", createdAt: new Date("2026-01-18T14:00:00Z") },
  { id: "tl-14", queryId: "query-6", action: "created", details: "Query submitted", actorId: "emp-5", createdAt: new Date("2026-01-22T13:00:00Z") },
  { id: "tl-15", queryId: "query-6", action: "assigned", details: "Assigned to David Kim", actorId: "emp-4", createdAt: new Date("2026-01-22T13:30:00Z") },
  { id: "tl-16", queryId: "query-6", action: "status_changed", details: "Status changed to In Progress", actorId: "emp-4", createdAt: new Date("2026-01-24T09:00:00Z") },
];

interface QueryStore {
  queries: HrQuery[];
  comments: HrQueryComment[];
  timeline: HrQueryTimeline[];

  addQuery: (query: Omit<HrQuery, "id" | "createdAt" | "updatedAt" | "resolvedAt" | "status" | "assignedTo">) => string;
  updateQueryStatus: (queryId: string, status: string, actorId: string) => void;
  assignQuery: (queryId: string, assigneeId: string | null, actorId: string) => void;
  addComment: (queryId: string, content: string, authorId: string, isInternal: boolean) => void;
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
      details: "Query submitted",
      actorId: queryData.employeeId,
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
      in_progress: "In Progress",
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

  getQueryById: (queryId) => get().queries.find(q => q.id === queryId),
  getCommentsForQuery: (queryId) => get().comments.filter(c => c.queryId === queryId).sort((a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime()),
  getTimelineForQuery: (queryId) => get().timeline.filter(t => t.queryId === queryId).sort((a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime()),
}));
