import { create } from "zustand";
import type { AppraisalFeedback, FeedbackRating, PeerAssignment } from "@shared/schema";

interface AppraisalState {
  feedback: AppraisalFeedback[];
  ratings: FeedbackRating[];
  peerAssignments: PeerAssignment[];
  
  updateFeedbackStatus: (feedbackId: string, status: "pending" | "draft" | "submitted", submittedAt?: string | null) => void;
  updateFeedbackComment: (feedbackId: string, comment: string) => void;
  updateRating: (feedbackId: string, questionId: string, rating: number | null, textResponse?: string | null) => void;
  saveDraft: (feedbackId: string, overallComment: string, ratingsData: Record<string, number | null>, textResponses: Record<string, string>) => void;
  submitReview: (feedbackId: string, overallComment: string, ratingsData: Record<string, number | null>, textResponses: Record<string, string>) => void;
  getFeedbackById: (id: string) => AppraisalFeedback | undefined;
  getRatingsByFeedback: (feedbackId: string) => FeedbackRating[];
  getPendingReviewsForUser: (userId: string) => AppraisalFeedback[];
  getCompletedReviewsByUser: (userId: string) => AppraisalFeedback[];
  
  getPeerAssignmentsForReviewee: (cycleId: string, revieweeId: string) => PeerAssignment[];
  setPeerAssignments: (cycleId: string, revieweeId: string, reviewerIds: string[]) => void;
  clearPeerAssignmentsForReviewee: (cycleId: string, revieweeId: string) => void;
}

export const useAppraisalStore = create<AppraisalState>()((set, get) => ({
  feedback: [],
  ratings: [],
  peerAssignments: [],

  updateFeedbackStatus: (feedbackId, status, submittedAt = null) => {
    set((state) => ({
      feedback: state.feedback.map((f) =>
        f.id === feedbackId
          ? { ...f, status, submittedAt: submittedAt ? new Date(submittedAt) : null }
          : f
      ),
    }));
  },

  updateFeedbackComment: (feedbackId, comment) => {
    set((state) => ({
      feedback: state.feedback.map((f) =>
        f.id === feedbackId ? { ...f, overallComment: comment } : f
      ),
    }));
  },

  updateRating: (feedbackId, questionId, rating, textResponse = null) => {
    set((state) => {
      const existingIndex = state.ratings.findIndex(
        (r) => r.feedbackId === feedbackId && r.questionId === questionId
      );

      if (existingIndex >= 0) {
        const newRatings = [...state.ratings];
        newRatings[existingIndex] = {
          ...newRatings[existingIndex],
          rating,
          textResponse,
        };
        return { ratings: newRatings };
      } else {
        const newRating: FeedbackRating = {
          id: `fr-new-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          feedbackId,
          questionId,
          rating,
          textResponse,
        };
        return { ratings: [...state.ratings, newRating] };
      }
    });
  },

  saveDraft: (feedbackId, overallComment, ratingsData, textResponses) => {
    const state = get();
    
    Object.entries(ratingsData).forEach(([questionId, rating]) => {
      state.updateRating(feedbackId, questionId, rating, textResponses[questionId] || null);
    });
    
    set((state) => ({
      feedback: state.feedback.map((f) =>
        f.id === feedbackId
          ? { ...f, status: "draft" as const, overallComment }
          : f
      ),
    }));
  },

  submitReview: (feedbackId, overallComment, ratingsData, textResponses) => {
    const state = get();
    
    Object.entries(ratingsData).forEach(([questionId, rating]) => {
      state.updateRating(feedbackId, questionId, rating, textResponses[questionId] || null);
    });
    
    set((s) => ({
      feedback: s.feedback.map((f) =>
        f.id === feedbackId
          ? { 
              ...f, 
              status: "submitted" as const, 
              overallComment,
              submittedAt: new Date()
            }
          : f
      ),
    }));
  },

  getFeedbackById: (id) => {
    return get().feedback.find((f) => f.id === id);
  },

  getRatingsByFeedback: (feedbackId) => {
    return get().ratings.filter((r) => r.feedbackId === feedbackId);
  },

  getPendingReviewsForUser: (userId) => {
    return get().feedback.filter(
      (f) => f.reviewerId === userId && (f.status === "pending" || f.status === "draft")
    );
  },

  getCompletedReviewsByUser: (userId) => {
    return get().feedback.filter(
      (f) => f.reviewerId === userId && f.status === "submitted"
    );
  },
  
  getPeerAssignmentsForReviewee: (cycleId, revieweeId) => {
    return get().peerAssignments.filter(
      (pa) => pa.cycleId === cycleId && pa.revieweeId === revieweeId
    );
  },
  
  setPeerAssignments: (cycleId, revieweeId, reviewerIds) => {
    set((state) => {
      const filtered = state.peerAssignments.filter(
        (pa) => !(pa.cycleId === cycleId && pa.revieweeId === revieweeId)
      );
      
      const newAssignments = reviewerIds.map((reviewerId, index) => ({
        id: `pa-new-${Date.now()}-${index}`,
        cycleId,
        revieweeId,
        reviewerId,
      }));
      
      return { peerAssignments: [...filtered, ...newAssignments] };
    });
  },
  
  clearPeerAssignmentsForReviewee: (cycleId, revieweeId) => {
    set((state) => ({
      peerAssignments: state.peerAssignments.filter(
        (pa) => !(pa.cycleId === cycleId && pa.revieweeId === revieweeId)
      ),
    }));
  },
}));
