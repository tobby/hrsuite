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

// Demo Job Postings
const demoJobs: JobPosting[] = [
  {
    id: "job-1",
    title: "Senior Frontend Developer",
    description: "We are looking for an experienced Frontend Developer to join our Engineering team. You will be responsible for building user-facing features using React and TypeScript.\n\nRequirements:\n- 5+ years of experience with React\n- Strong TypeScript skills\n- Experience with modern CSS frameworks\n- Excellent communication skills",
    departmentId: "dept-1",
    location: "San Francisco, CA",
    employmentType: "full-time",
    experienceYears: 5,
    status: "open",
    createdAt: new Date("2026-01-10T10:00:00Z"),
  },
  {
    id: "job-2",
    title: "Marketing Coordinator",
    description: "Join our Marketing team to help execute campaigns and manage our brand presence across multiple channels.\n\nResponsibilities:\n- Coordinate marketing campaigns\n- Manage social media accounts\n- Assist with content creation\n- Track marketing metrics",
    departmentId: "dept-3",
    location: "New York, NY",
    employmentType: "full-time",
    experienceYears: 2,
    status: "open",
    createdAt: new Date("2026-01-15T09:00:00Z"),
  },
  {
    id: "job-3",
    title: "DevOps Engineer",
    description: "We need a skilled DevOps Engineer to help us scale our infrastructure and improve our deployment processes.\n\nRequirements:\n- Experience with AWS/GCP\n- Kubernetes and Docker expertise\n- CI/CD pipeline experience\n- Infrastructure as Code (Terraform)",
    departmentId: "dept-1",
    location: "Remote",
    employmentType: "full-time",
    experienceYears: 4,
    status: "open",
    createdAt: new Date("2026-01-20T11:00:00Z"),
  },
  {
    id: "job-4",
    title: "Software Engineering Intern",
    description: "Summer internship opportunity for computer science students. Work alongside our engineering team on real projects.\n\nRequirements:\n- Currently pursuing CS degree\n- Basic programming knowledge\n- Eager to learn",
    departmentId: "dept-1",
    location: "San Francisco, CA",
    employmentType: "intern",
    experienceYears: 0,
    status: "open",
    createdAt: new Date("2026-01-25T10:00:00Z"),
  },
];

// Demo Candidates
const demoCandidates: Candidate[] = [
  {
    id: "cand-1",
    jobId: "job-1",
    firstName: "Alex",
    lastName: "Thompson",
    email: "alex.thompson@email.com",
    phone: "+1 (555) 111-2222",
    location: "San Francisco, CA",
    linkedinUrl: "https://linkedin.com/in/alexthompson",
    gender: "male",
    resumeFileName: "alex_thompson_resume.pdf",
    stage: "interview",
    appliedAt: new Date("2026-01-12T14:30:00Z"),
  },
  {
    id: "cand-2",
    jobId: "job-1",
    firstName: "Priya",
    lastName: "Patel",
    email: "priya.patel@email.com",
    phone: "+1 (555) 222-3333",
    location: "Austin, TX",
    linkedinUrl: "https://linkedin.com/in/priyapatel",
    gender: "female",
    resumeFileName: "priya_patel_cv.pdf",
    stage: "screening",
    appliedAt: new Date("2026-01-14T09:15:00Z"),
  },
  {
    id: "cand-3",
    jobId: "job-1",
    firstName: "Jordan",
    lastName: "Lee",
    email: "jordan.lee@email.com",
    phone: "+1 (555) 333-4444",
    location: "Seattle, WA",
    linkedinUrl: null,
    gender: "other",
    resumeFileName: "jordan_lee_resume.pdf",
    stage: "offer",
    appliedAt: new Date("2026-01-11T16:00:00Z"),
  },
  {
    id: "cand-4",
    jobId: "job-2",
    firstName: "Emma",
    lastName: "Wilson",
    email: "emma.wilson@email.com",
    phone: "+1 (555) 444-5555",
    location: "New York, NY",
    linkedinUrl: "https://linkedin.com/in/emmawilson",
    gender: "female",
    resumeFileName: "emma_wilson_cv.pdf",
    stage: "applied",
    appliedAt: new Date("2026-01-20T10:30:00Z"),
  },
  {
    id: "cand-5",
    jobId: "job-2",
    firstName: "Marcus",
    lastName: "Chen",
    email: "marcus.chen@email.com",
    phone: "+1 (555) 555-6666",
    location: "Los Angeles, CA",
    linkedinUrl: "https://linkedin.com/in/marcuschen",
    gender: "male",
    resumeFileName: null,
    stage: "interview",
    appliedAt: new Date("2026-01-18T08:45:00Z"),
  },
  {
    id: "cand-6",
    jobId: "job-3",
    firstName: "Sarah",
    lastName: "Kim",
    email: "sarah.kim@email.com",
    phone: "+1 (555) 666-7777",
    location: "Denver, CO",
    linkedinUrl: "https://linkedin.com/in/sarahkim",
    gender: "female",
    resumeFileName: "sarah_kim_resume.pdf",
    stage: "screening",
    appliedAt: new Date("2026-01-22T11:20:00Z"),
  },
  {
    id: "cand-7",
    jobId: "job-3",
    firstName: "David",
    lastName: "Nguyen",
    email: "david.nguyen@email.com",
    phone: "+1 (555) 777-8888",
    location: "Portland, OR",
    linkedinUrl: "https://linkedin.com/in/davidnguyen",
    gender: "male",
    resumeFileName: "david_nguyen_cv.pdf",
    stage: "hired",
    appliedAt: new Date("2026-01-05T13:00:00Z"),
  },
  {
    id: "cand-8",
    jobId: "job-4",
    firstName: "Lily",
    lastName: "Zhang",
    email: "lily.zhang@university.edu",
    phone: "+1 (555) 888-9999",
    location: "San Francisco, CA",
    linkedinUrl: "https://linkedin.com/in/lilyzhang",
    gender: "female",
    resumeFileName: "lily_zhang_resume.pdf",
    stage: "applied",
    appliedAt: new Date("2026-01-27T15:30:00Z"),
  },
  {
    id: "cand-9",
    jobId: "job-1",
    firstName: "Ryan",
    lastName: "Garcia",
    email: "ryan.garcia@email.com",
    phone: "+1 (555) 999-0000",
    location: "Miami, FL",
    linkedinUrl: null,
    gender: "male",
    resumeFileName: "ryan_garcia_resume.pdf",
    stage: "rejected",
    appliedAt: new Date("2026-01-08T10:00:00Z"),
  },
];

// Demo Activities
const demoActivities: CandidateActivity[] = [
  { id: "act-1", candidateId: "cand-1", type: "stage_change", description: "Application received", metadata: '{"from": null, "to": "applied"}', createdAt: new Date("2026-01-12T14:30:00Z"), createdBy: null },
  { id: "act-2", candidateId: "cand-1", type: "stage_change", description: "Moved to Screening", metadata: '{"from": "applied", "to": "screening"}', createdAt: new Date("2026-01-13T10:00:00Z"), createdBy: "emp-4" },
  { id: "act-3", candidateId: "cand-1", type: "email_sent", description: "Sent screening confirmation email", metadata: null, createdAt: new Date("2026-01-13T10:05:00Z"), createdBy: "emp-4" },
  { id: "act-4", candidateId: "cand-1", type: "stage_change", description: "Moved to Interview", metadata: '{"from": "screening", "to": "interview"}', createdAt: new Date("2026-01-15T09:00:00Z"), createdBy: "emp-4" },
  { id: "act-5", candidateId: "cand-1", type: "interview_scheduled", description: "Technical interview scheduled with Sarah Chen", metadata: '{"date": "2026-01-20", "type": "video"}', createdAt: new Date("2026-01-15T09:30:00Z"), createdBy: "emp-4" },
  { id: "act-6", candidateId: "cand-3", type: "stage_change", description: "Application received", metadata: '{"from": null, "to": "applied"}', createdAt: new Date("2026-01-11T16:00:00Z"), createdBy: null },
  { id: "act-7", candidateId: "cand-3", type: "stage_change", description: "Moved to Offer", metadata: '{"from": "interview", "to": "offer"}', createdAt: new Date("2026-01-25T14:00:00Z"), createdBy: "emp-1" },
  { id: "act-8", candidateId: "cand-7", type: "stage_change", description: "Hired", metadata: '{"from": "offer", "to": "hired"}', createdAt: new Date("2026-01-28T10:00:00Z"), createdBy: "emp-4" },
];

// Demo Notes
const demoNotes: CandidateNote[] = [
  { id: "note-1", candidateId: "cand-1", content: "Strong portfolio with excellent React projects. Previous experience at a startup.", category: "positive", createdAt: new Date("2026-01-13T11:00:00Z"), createdBy: "emp-4" },
  { id: "note-2", candidateId: "cand-1", content: "Phone screen went well. Good communication skills.", category: "feedback", createdAt: new Date("2026-01-14T16:00:00Z"), createdBy: "emp-4" },
  { id: "note-3", candidateId: "cand-3", content: "Excellent technical interview. Solved all coding challenges.", category: "positive", createdAt: new Date("2026-01-20T15:00:00Z"), createdBy: "emp-1" },
  { id: "note-4", candidateId: "cand-9", content: "Does not meet minimum experience requirements.", category: "concern", createdAt: new Date("2026-01-09T10:00:00Z"), createdBy: "emp-4" },
];

// Demo Assessments
const demoAssessments: CandidateAssessment[] = [
  { id: "assess-1", candidateId: "cand-1", assessorId: "emp-1", category: "technical", score: 4, comments: "Strong React skills, good understanding of TypeScript", createdAt: new Date("2026-01-16T14:00:00Z") },
  { id: "assess-2", candidateId: "cand-1", assessorId: "emp-1", category: "communication", score: 5, comments: "Excellent communicator, explains concepts clearly", createdAt: new Date("2026-01-16T14:00:00Z") },
  { id: "assess-3", candidateId: "cand-3", assessorId: "emp-1", category: "technical", score: 5, comments: "Outstanding problem-solving skills", createdAt: new Date("2026-01-20T15:30:00Z") },
  { id: "assess-4", candidateId: "cand-3", assessorId: "emp-1", category: "culture_fit", score: 4, comments: "Would be a great addition to the team", createdAt: new Date("2026-01-20T15:30:00Z") },
  { id: "assess-5", candidateId: "cand-3", assessorId: "emp-2", category: "experience", score: 4, comments: "Solid experience with similar tech stack", createdAt: new Date("2026-01-21T10:00:00Z") },
];

// Demo Interviews
const demoInterviews: CandidateInterview[] = [
  { id: "int-1", candidateId: "cand-1", interviewerId: "emp-1", scheduledAt: new Date("2026-02-03T14:00:00Z"), duration: 60, type: "video", status: "scheduled", notes: null, createdAt: new Date("2026-01-15T09:30:00Z") },
  { id: "int-2", candidateId: "cand-3", interviewerId: "emp-1", scheduledAt: new Date("2026-01-18T10:00:00Z"), duration: 90, type: "video", status: "completed", notes: "Excellent interview, strong candidate", createdAt: new Date("2026-01-14T11:00:00Z") },
  { id: "int-3", candidateId: "cand-5", interviewerId: "emp-5", scheduledAt: new Date("2026-02-05T11:00:00Z"), duration: 45, type: "phone", status: "scheduled", notes: null, createdAt: new Date("2026-01-25T10:00:00Z") },
];

// Demo Communications
const demoCommunications: CandidateCommunication[] = [
  { id: "comm-1", candidateId: "cand-1", direction: "sent", subject: "Application Received - Senior Frontend Developer", body: "Dear Alex,\n\nThank you for applying for the Senior Frontend Developer position. We have received your application and our team is reviewing it.\n\nBest regards,\nHR Team", sentAt: new Date("2026-01-12T14:35:00Z"), sentBy: "emp-4" },
  { id: "comm-2", candidateId: "cand-1", direction: "sent", subject: "Interview Invitation", body: "Dear Alex,\n\nWe would like to invite you for a technical interview. Please let us know your availability.\n\nBest regards,\nHR Team", sentAt: new Date("2026-01-15T09:35:00Z"), sentBy: "emp-4" },
  { id: "comm-3", candidateId: "cand-1", direction: "received", subject: "Re: Interview Invitation", body: "Hi,\n\nThank you for the invitation! I am available on February 3rd at 2 PM.\n\nBest,\nAlex", sentAt: new Date("2026-01-15T12:00:00Z"), sentBy: null },
  { id: "comm-4", candidateId: "cand-3", direction: "sent", subject: "Offer Letter - Senior Frontend Developer", body: "Dear Jordan,\n\nWe are pleased to extend an offer for the Senior Frontend Developer position. Please review the attached offer letter.\n\nBest regards,\nHR Team", sentAt: new Date("2026-01-25T14:05:00Z"), sentBy: "emp-4" },
  { id: "comm-5", candidateId: "cand-9", direction: "sent", subject: "Application Update", body: "Dear Ryan,\n\nThank you for your interest in the Senior Frontend Developer position. After careful consideration, we have decided to move forward with other candidates.\n\nBest regards,\nHR Team", sentAt: new Date("2026-01-10T10:00:00Z"), sentBy: "emp-4" },
];

// Demo Email Templates
const demoEmailTemplates: EmailTemplate[] = [
  { id: "tmpl-1", name: "Application Received", subject: "Application Received - {{jobTitle}}", body: "Dear {{candidateName}},\n\nThank you for applying for the {{jobTitle}} position at {{companyName}}. We have received your application and our team is reviewing it.\n\nWe will be in touch soon.\n\nBest regards,\nHR Team", category: "application_received", createdAt: new Date("2025-01-01T00:00:00Z") },
  { id: "tmpl-2", name: "Interview Scheduled", subject: "Interview Scheduled - {{jobTitle}}", body: "Dear {{candidateName}},\n\nWe would like to invite you for an interview for the {{jobTitle}} position. Your interview is scheduled for {{interviewDate}}.\n\nPlease confirm your availability.\n\nBest regards,\nHR Team", category: "interview_scheduled", createdAt: new Date("2025-01-01T00:00:00Z") },
  { id: "tmpl-3", name: "Offer Letter", subject: "Offer Letter - {{jobTitle}}", body: "Dear {{candidateName}},\n\nWe are pleased to extend an offer for the {{jobTitle}} position at {{companyName}}. Please review the attached offer letter.\n\nWe look forward to welcoming you to our team!\n\nBest regards,\nHR Team", category: "offer_extended", createdAt: new Date("2025-01-01T00:00:00Z") },
  { id: "tmpl-4", name: "Rejection - After Review", subject: "Application Update - {{jobTitle}}", body: "Dear {{candidateName}},\n\nThank you for your interest in the {{jobTitle}} position at {{companyName}}. After careful consideration, we have decided to move forward with other candidates.\n\nWe appreciate your time and wish you the best in your job search.\n\nBest regards,\nHR Team", category: "rejection", createdAt: new Date("2025-01-01T00:00:00Z") },
  { id: "tmpl-5", name: "General Follow-up", subject: "Following up on your application", body: "Dear {{candidateName}},\n\nWe wanted to follow up regarding your application for the {{jobTitle}} position.\n\n[Your message here]\n\nBest regards,\nHR Team", category: "general", createdAt: new Date("2025-01-01T00:00:00Z") },
];

// Demo Settings
const demoSettings: RecruitmentSetting[] = [
  { id: "set-1", key: "privacy_disclaimer", value: "By submitting this application, you agree to allow us to process your personal data for recruitment purposes. Your data will be stored securely and only used to evaluate your candidacy. You may request deletion of your data at any time by contacting hr@company.com." },
  { id: "set-2", key: "terms_of_use", value: "By applying for a position, you confirm that all information provided is accurate and complete. Any false or misleading information may result in disqualification from consideration or termination of employment if discovered after hiring." },
  { id: "set-3", key: "company_name", value: "TechCorp Inc." },
];

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
        settings: [...state.settings, { id: generateId("set"), key, value }],
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
