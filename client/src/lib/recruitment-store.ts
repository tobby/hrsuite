import { create } from "zustand";
import type {
  JobPosting,
  Candidate,
  CandidateActivity,
  CandidateNote,
  CandidateAssessment,
  CandidateInterview,
  CandidateCommunication,
  EmailTemplate,
  RecruitmentSetting,
} from "@shared/schema";

const demoJobs: JobPosting[] = [];

const demoCandidates: Candidate[] = [];

const demoActivities: CandidateActivity[] = [];

const demoNotes: CandidateNote[] = [];

const demoAssessments: CandidateAssessment[] = [];

const demoInterviews: CandidateInterview[] = [];

const demoCommunications: CandidateCommunication[] = [];

const demoEmailTemplates: EmailTemplate[] = [];

const demoSettings: RecruitmentSetting[] = [];

export type CandidateStage = "applied" | "screening" | "interview" | "offer" | "hired" | "rejected";

interface RecruitmentState {
  jobs: JobPosting[];
  candidates: Candidate[];
  activities: CandidateActivity[];
  notes: CandidateNote[];
  assessments: CandidateAssessment[];
  interviews: CandidateInterview[];
  communications: CandidateCommunication[];
  emailTemplates: EmailTemplate[];
  settings: RecruitmentSetting[];
  
  // Job actions
  addJob: (job: Omit<JobPosting, "id" | "createdAt">) => string;
  updateJob: (id: string, updates: Partial<JobPosting>) => void;
  deleteJob: (id: string) => void;
  
  // Candidate actions
  addCandidate: (candidate: Omit<Candidate, "id" | "appliedAt">) => string;
  updateCandidate: (id: string, updates: Partial<Candidate>) => void;
  updateCandidateStage: (id: string, stage: CandidateStage) => void;
  
  // Activity actions
  addActivity: (activity: Omit<CandidateActivity, "id" | "createdAt">) => void;
  
  // Note actions
  addNote: (note: Omit<CandidateNote, "id" | "createdAt">) => void;
  deleteNote: (id: string) => void;
  
  // Assessment actions
  addAssessment: (assessment: Omit<CandidateAssessment, "id" | "createdAt">) => void;
  
  // Interview actions
  addInterview: (interview: Omit<CandidateInterview, "id" | "createdAt">) => void;
  updateInterview: (id: string, updates: Partial<CandidateInterview>) => void;
  
  // Communication actions
  addCommunication: (comm: Omit<CandidateCommunication, "id" | "sentAt">) => void;
  
  // Email Template actions
  addEmailTemplate: (template: Omit<EmailTemplate, "id" | "createdAt">) => void;
  updateEmailTemplate: (id: string, updates: Partial<EmailTemplate>) => void;
  deleteEmailTemplate: (id: string) => void;
  
  // Settings actions
  updateSetting: (key: string, value: string) => void;
  getSetting: (key: string) => string | undefined;
  
  // Helpers
  getJobById: (id: string) => JobPosting | undefined;
  getCandidateById: (id: string) => Candidate | undefined;
  getCandidatesByJob: (jobId: string) => Candidate[];
  getCandidatesByStage: (stage: CandidateStage) => Candidate[];
  getActivitiesForCandidate: (candidateId: string) => CandidateActivity[];
  getNotesForCandidate: (candidateId: string) => CandidateNote[];
  getAssessmentsForCandidate: (candidateId: string) => CandidateAssessment[];
  getInterviewsForCandidate: (candidateId: string) => CandidateInterview[];
  getCommunicationsForCandidate: (candidateId: string) => CandidateCommunication[];
}

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export const useRecruitmentStore = create<RecruitmentState>((set, get) => ({
  jobs: demoJobs,
  candidates: demoCandidates,
  activities: demoActivities,
  notes: demoNotes,
  assessments: demoAssessments,
  interviews: demoInterviews,
  communications: demoCommunications,
  emailTemplates: demoEmailTemplates,
  settings: demoSettings,
  
  // Job actions
  addJob: (job) => {
    const id = generateId("job");
    set((state) => ({
      jobs: [...state.jobs, { ...job, id, createdAt: new Date() }],
    }));
    return id;
  },
  
  updateJob: (id, updates) => {
    set((state) => ({
      jobs: state.jobs.map((j) => (j.id === id ? { ...j, ...updates } : j)),
    }));
  },
  
  deleteJob: (id) => {
    set((state) => ({
      jobs: state.jobs.filter((j) => j.id !== id),
    }));
  },
  
  // Candidate actions
  addCandidate: (candidate) => {
    const id = generateId("cand");
    set((state) => ({
      candidates: [...state.candidates, { ...candidate, id, appliedAt: new Date() }],
    }));
    get().addActivity({
      candidateId: id,
      type: "stage_change",
      description: "Application received",
      metadata: JSON.stringify({ from: null, to: "applied" }),
      createdBy: null,
    });
    return id;
  },
  
  updateCandidate: (id, updates) => {
    set((state) => ({
      candidates: state.candidates.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    }));
  },
  
  updateCandidateStage: (id, stage) => {
    const candidate = get().getCandidateById(id);
    if (!candidate) return;
    
    const oldStage = candidate.stage;
    set((state) => ({
      candidates: state.candidates.map((c) => (c.id === id ? { ...c, stage } : c)),
    }));
    
    get().addActivity({
      candidateId: id,
      type: "stage_change",
      description: `Moved to ${stage.charAt(0).toUpperCase() + stage.slice(1)}`,
      metadata: JSON.stringify({ from: oldStage, to: stage }),
      createdBy: "emp-4",
    });
  },
  
  // Activity actions
  addActivity: (activity) => {
    set((state) => ({
      activities: [...state.activities, { ...activity, id: generateId("act"), createdAt: new Date() }],
    }));
  },
  
  // Note actions
  addNote: (note) => {
    set((state) => ({
      notes: [...state.notes, { ...note, id: generateId("note"), createdAt: new Date() }],
    }));
    get().addActivity({
      candidateId: note.candidateId,
      type: "note_added",
      description: "Note added",
      metadata: null,
      createdBy: note.createdBy,
    });
  },
  
  deleteNote: (id) => {
    set((state) => ({
      notes: state.notes.filter((n) => n.id !== id),
    }));
  },
  
  // Assessment actions
  addAssessment: (assessment) => {
    set((state) => ({
      assessments: [...state.assessments, { ...assessment, id: generateId("assess"), createdAt: new Date() }],
    }));
    get().addActivity({
      candidateId: assessment.candidateId,
      type: "assessment_added",
      description: `Assessment added: ${assessment.category}`,
      metadata: JSON.stringify({ category: assessment.category, score: assessment.score }),
      createdBy: assessment.assessorId,
    });
  },
  
  // Interview actions
  addInterview: (interview) => {
    set((state) => ({
      interviews: [...state.interviews, { ...interview, id: generateId("int"), createdAt: new Date() }],
    }));
    get().addActivity({
      candidateId: interview.candidateId,
      type: "interview_scheduled",
      description: `Interview scheduled`,
      metadata: JSON.stringify({ date: interview.scheduledAt, type: interview.type }),
      createdBy: interview.interviewerId,
    });
  },
  
  updateInterview: (id, updates) => {
    set((state) => ({
      interviews: state.interviews.map((i) => (i.id === id ? { ...i, ...updates } : i)),
    }));
  },
  
  // Communication actions
  addCommunication: (comm) => {
    set((state) => ({
      communications: [...state.communications, { ...comm, id: generateId("comm"), sentAt: new Date() }],
    }));
    if (comm.direction === "sent") {
      get().addActivity({
        candidateId: comm.candidateId,
        type: "email_sent",
        description: `Email sent: ${comm.subject}`,
        metadata: null,
        createdBy: comm.sentBy || null,
      });
    }
  },
  
  // Email Template actions
  addEmailTemplate: (template) => {
    set((state) => ({
      emailTemplates: [...state.emailTemplates, { ...template, id: generateId("tmpl"), createdAt: new Date() }],
    }));
  },
  
  updateEmailTemplate: (id, updates) => {
    set((state) => ({
      emailTemplates: state.emailTemplates.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }));
  },
  
  deleteEmailTemplate: (id) => {
    set((state) => ({
      emailTemplates: state.emailTemplates.filter((t) => t.id !== id),
    }));
  },
  
  // Settings actions
  updateSetting: (key, value) => {
    set((state) => {
      const exists = state.settings.find((s) => s.key === key);
      if (exists) {
        return {
          settings: state.settings.map((s) => (s.key === key ? { ...s, value } : s)),
        };
      }
      return {
        settings: [...state.settings, { id: generateId("set"), key, value, companyId: "" }],
      };
    });
  },
  
  getSetting: (key) => {
    return get().settings.find((s) => s.key === key)?.value;
  },
  
  // Helpers
  getJobById: (id) => get().jobs.find((j) => j.id === id),
  getCandidateById: (id) => get().candidates.find((c) => c.id === id),
  getCandidatesByJob: (jobId) => get().candidates.filter((c) => c.jobId === jobId),
  getCandidatesByStage: (stage) => get().candidates.filter((c) => c.stage === stage),
  getActivitiesForCandidate: (candidateId) => 
    get().activities.filter((a) => a.candidateId === candidateId).sort((a, b) => 
      new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    ),
  getNotesForCandidate: (candidateId) => 
    get().notes.filter((n) => n.candidateId === candidateId).sort((a, b) => 
      new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    ),
  getAssessmentsForCandidate: (candidateId) => 
    get().assessments.filter((a) => a.candidateId === candidateId),
  getInterviewsForCandidate: (candidateId) => 
    get().interviews.filter((i) => i.candidateId === candidateId).sort((a, b) => 
      new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()
    ),
  getCommunicationsForCandidate: (candidateId) => 
    get().communications.filter((c) => c.candidateId === candidateId).sort((a, b) => 
      new Date(b.sentAt!).getTime() - new Date(a.sentAt!).getTime()
    ),
}));
