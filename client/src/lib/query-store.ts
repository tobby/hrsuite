import { create } from "zustand";
import type { HrQuery, HrQueryComment, HrQueryTimeline } from "@shared/schema";

export interface CommentAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
}

export type CommentWithAttachments = HrQueryComment & {
  attachments?: CommentAttachment[];
};

export type QueryWithAttachments = HrQuery & {
  attachments?: CommentAttachment[];
};

const demoQueries: HrQuery[] = [];

const demoComments: HrQueryComment[] = [];

const demoTimeline: HrQueryTimeline[] = [];

interface QueryStore {
  queries: QueryWithAttachments[];
  comments: CommentWithAttachments[];
  timeline: HrQueryTimeline[];

  addQuery: (query: Omit<HrQuery, "id" | "createdAt" | "updatedAt" | "resolvedAt" | "status" | "assignedTo">, attachments?: CommentAttachment[]) => string;
  updateQueryStatus: (queryId: string, status: string, actorId: string) => void;
  assignQuery: (queryId: string, assigneeId: string | null, actorId: string) => void;
  addComment: (queryId: string, content: string, authorId: string, isInternal: boolean, attachments?: CommentAttachment[]) => void;
  addResponse: (queryId: string, content: string, employeeId: string, attachments?: CommentAttachment[]) => void;
  getQueryById: (queryId: string) => QueryWithAttachments | undefined;
  getCommentsForQuery: (queryId: string) => CommentWithAttachments[];
  getTimelineForQuery: (queryId: string) => HrQueryTimeline[];
}

export const useQueryStore = create<QueryStore>((set, get) => ({
  queries: demoQueries,
  comments: demoComments,
  timeline: demoTimeline,

  addQuery: (queryData, attachments) => {
    const id = `query-${Date.now()}`;
    const now = new Date();
    const newQuery: QueryWithAttachments = {
      ...queryData,
      id,
      status: "open",
      assignedTo: null,
      createdAt: now,
      updatedAt: now,
      resolvedAt: null,
      attachments: attachments && attachments.length > 0 ? attachments : undefined,
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

  addComment: (queryId, content, authorId, isInternal, attachments) => {
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
          attachments: attachments && attachments.length > 0 ? attachments : undefined,
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
          details: isInternal ? "Internal note added" : attachments && attachments.length > 0 ? `Comment added with ${attachments.length} attachment${attachments.length > 1 ? "s" : ""}` : "Comment added",
          actorId: authorId,
          createdAt: now,
        },
      ],
    }));
  },

  addResponse: (queryId, content, employeeId, attachments) => {
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
          attachments: attachments && attachments.length > 0 ? attachments : undefined,
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
