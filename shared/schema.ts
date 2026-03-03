import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, date, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/auth";

// ==================== COMPANIES ====================

export const companies = pgTable("companies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  domain: text("domain"),
  logoUrl: text("logo_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCompanySchema = createInsertSchema(companies).omit({ id: true, createdAt: true }).extend({
  name: z.string().min(1, "Company name is required"),
});
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Company = typeof companies.$inferSelect;

// ==================== DEPARTMENTS ====================

export const departments = pgTable("departments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull(),
  name: text("name").notNull(),
  description: text("description").default(""),
  headId: varchar("head_id"),
});

export const insertDepartmentSchema = createInsertSchema(departments).omit({ id: true }).extend({
  name: z.string().min(1, "Department name is required"),
  description: z.string().optional().default(""),
});
export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;
export type Department = typeof departments.$inferSelect;

// ==================== EMPLOYEES (also serves as auth/users) ====================

export const employees = pgTable("employees", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").unique(),
  companyId: varchar("company_id").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  departmentId: varchar("department_id"),
  position: text("position").notNull(),
  managerId: varchar("manager_id"),
  hireDate: date("hire_date"),
  profileImageUrl: text("profile_image_url"),
  status: text("status").notNull().default("invited"),
  role: text("role").notNull().default("employee"),
  passwordHash: text("password_hash"),
  inviteToken: varchar("invite_token").unique(),
  inviteExpiresAt: timestamp("invite_expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertEmployeeSchema = createInsertSchema(employees).omit({
  id: true, employeeId: true, passwordHash: true, inviteToken: true, inviteExpiresAt: true, createdAt: true,
}).extend({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  position: z.string().min(1, "Position is required"),
  role: z.enum(["employee", "manager", "admin", "contract"]),
  status: z.enum(["invited", "active", "inactive", "on_leave"]).optional(),
});
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Employee = typeof employees.$inferSelect;

// ==================== LEAVE MANAGEMENT ====================

export const leaveTypes = pgTable("leave_types", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  defaultDays: integer("default_days").notNull(),
  color: text("color").notNull(),
});

export const insertLeaveTypeSchema = createInsertSchema(leaveTypes).omit({ id: true });
export type InsertLeaveType = z.infer<typeof insertLeaveTypeSchema>;
export type LeaveType = typeof leaveTypes.$inferSelect;

export const leaveBalances = pgTable("leave_balances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull(),
  employeeId: varchar("employee_id").notNull(),
  leaveTypeId: varchar("leave_type_id").notNull(),
  totalDays: integer("total_days").notNull(),
  usedDays: integer("used_days").notNull().default(0),
  remainingDays: integer("remaining_days").notNull(),
  year: integer("year").notNull(),
});

export type LeaveBalance = typeof leaveBalances.$inferSelect;

export const leaveRequests = pgTable("leave_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull(),
  employeeId: varchar("employee_id").notNull(),
  leaveTypeId: varchar("leave_type_id").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  totalDays: integer("total_days").notNull(),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("pending"),
  approverId: varchar("approver_id"),
  approverComment: text("approver_comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertLeaveRequestSchema = createInsertSchema(leaveRequests).omit({
  id: true, status: true, approverId: true, approverComment: true, createdAt: true, totalDays: true,
}).extend({
  leaveTypeId: z.string().min(1, "Leave type is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  reason: z.string().min(1, "Reason is required"),
});
export type InsertLeaveRequest = z.infer<typeof insertLeaveRequestSchema>;
export type LeaveRequest = typeof leaveRequests.$inferSelect;

// ==================== PERFORMANCE APPRAISALS ====================

export const appraisalTemplates = pgTable("appraisal_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  isDefault: integer("is_default").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export type AppraisalTemplate = typeof appraisalTemplates.$inferSelect;

export const templateSections = pgTable("template_sections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: varchar("template_id").notNull(),
  name: text("name").notNull(),
  order: integer("order").notNull().default(0),
});

export type TemplateSection = typeof templateSections.$inferSelect;

export const templateQuestions = pgTable("template_questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: varchar("template_id").notNull(),
  sectionId: varchar("section_id"),
  competencyId: varchar("competency_id"),
  questionText: text("question_text").notNull(),
  questionType: text("question_type").notNull(),
  order: integer("order").notNull().default(0),
  section: text("section"),
  reviewerTypes: text("reviewer_types").array().default(sql`ARRAY['self','peer','manager']`),
});

export type TemplateQuestion = typeof templateQuestions.$inferSelect;

export const appraisalCycles = pgTable("appraisal_cycles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  templateId: varchar("template_id"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  status: text("status").notNull().default("draft"),
  selfWeight: integer("self_weight").notNull().default(10),
  peerWeight: integer("peer_weight").notNull().default(30),
  managerWeight: integer("manager_weight").notNull().default(60),
});

export const insertAppraisalCycleSchema = createInsertSchema(appraisalCycles).omit({ id: true });
export type InsertAppraisalCycle = z.infer<typeof insertAppraisalCycleSchema>;
export type AppraisalCycle = typeof appraisalCycles.$inferSelect;

export const appraisals = pgTable("appraisals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  cycleId: varchar("cycle_id").notNull(),
  employeeId: varchar("employee_id").notNull(),
  status: text("status").notNull().default("pending"),
  overallRating: integer("overall_rating"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type Appraisal = typeof appraisals.$inferSelect;

export const appraisalFeedback = pgTable("appraisal_feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  appraisalId: varchar("appraisal_id").notNull(),
  reviewerId: varchar("reviewer_id").notNull(),
  reviewerType: text("reviewer_type").notNull(),
  overallComment: text("overall_comment"),
  submittedAt: timestamp("submitted_at"),
  status: text("status").notNull().default("pending"),
});

export const insertAppraisalFeedbackSchema = createInsertSchema(appraisalFeedback).omit({
  id: true, submittedAt: true,
}).extend({
  overallComment: z.string().min(1, "Overall comment is required"),
});
export type InsertAppraisalFeedback = z.infer<typeof insertAppraisalFeedbackSchema>;
export type AppraisalFeedback = typeof appraisalFeedback.$inferSelect;

export const feedbackRatings = pgTable("feedback_ratings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  feedbackId: varchar("feedback_id").notNull(),
  questionId: varchar("question_id").notNull(),
  rating: integer("rating"),
  textResponse: text("text_response"),
});

export type FeedbackRating = typeof feedbackRatings.$inferSelect;

export const cycleParticipants = pgTable("cycle_participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  cycleId: varchar("cycle_id").notNull(),
  employeeId: varchar("employee_id").notNull(),
});

export type CycleParticipant = typeof cycleParticipants.$inferSelect;

export const peerAssignments = pgTable("peer_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  cycleId: varchar("cycle_id").notNull(),
  revieweeId: varchar("reviewee_id").notNull(),
  reviewerId: varchar("reviewer_id").notNull(),
});

export type PeerAssignment = typeof peerAssignments.$inferSelect;

export const competencies = pgTable("competencies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
});

export type Competency = typeof competencies.$inferSelect;

export const competencyQuestions = pgTable("competency_questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  competencyId: varchar("competency_id").notNull(),
  questionText: text("question_text").notNull(),
  questionType: text("question_type").notNull().default("rating"),
  order: integer("order").notNull().default(0),
});

export type CompetencyQuestion = typeof competencyQuestions.$inferSelect;

// ==================== COMPANY HOLIDAYS ====================

export const companyHolidays = pgTable("company_holidays", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull(),
  name: text("name").notNull(),
  date: date("date").notNull(),
  year: integer("year").notNull(),
});

export const insertCompanyHolidaySchema = createInsertSchema(companyHolidays).omit({ id: true });
export type InsertCompanyHoliday = z.infer<typeof insertCompanyHolidaySchema>;
export type CompanyHoliday = typeof companyHolidays.$inferSelect;

// ==================== RECRUITMENT/ATS ====================

export const jobPostings = pgTable("job_postings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  requirements: text("requirements"),
  responsibilities: text("responsibilities"),
  hiringProcess: text("hiring_process"),
  applicationFields: text("application_fields"),
  departmentId: varchar("department_id").notNull(),
  assignedManagerId: varchar("assigned_manager_id"),
  location: text("location").notNull(),
  locationType: text("location_type").notNull().default("on-site"),
  employmentType: text("employment_type").notNull(),
  experienceYears: integer("experience_years").notNull().default(0),
  salaryMin: integer("salary_min"),
  salaryMax: integer("salary_max"),
  numberOfOpenings: integer("number_of_openings").notNull().default(1),
  applicationDeadline: date("application_deadline"),
  status: text("status").notNull().default("draft"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertJobPostingSchema = createInsertSchema(jobPostings).omit({ id: true, createdAt: true }).extend({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  requirements: z.string().optional().nullable(),
  responsibilities: z.string().optional().nullable(),
  hiringProcess: z.string().optional().nullable(),
  applicationFields: z.string().optional().nullable(),
  departmentId: z.string().min(1, "Department is required"),
  assignedManagerId: z.string().optional().nullable(),
  location: z.string().min(1, "Location is required"),
  locationType: z.enum(["on-site", "remote", "hybrid"]).optional(),
  employmentType: z.enum(["full-time", "part-time", "contract", "internship"]),
  experienceYears: z.number().min(0),
  salaryMin: z.number().min(0).optional().nullable(),
  salaryMax: z.number().min(0).optional().nullable(),
  numberOfOpenings: z.number().min(1).optional(),
  applicationDeadline: z.string().optional().nullable(),
  status: z.enum(["draft", "active", "on-hold", "closed"]).optional(),
});
export type InsertJobPosting = z.infer<typeof insertJobPostingSchema>;
export type JobPosting = typeof jobPostings.$inferSelect;

export const candidates = pgTable("candidates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull(),
  jobId: varchar("job_id").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  location: text("location"),
  linkedinUrl: text("linkedin_url"),
  gender: text("gender"),
  coverLetter: text("cover_letter"),
  source: text("source").notNull().default("website"),
  resumeFileName: text("resume_file_name"),
  resumeFileUrl: text("resume_file_url"),
  website: text("website"),
  ndpaConsent: boolean("ndpa_consent"),
  assignedManagerId: varchar("assigned_manager_id"),
  stage: text("stage").notNull().default("new"),
  rejectionReason: text("rejection_reason"),
  appliedAt: timestamp("applied_at").defaultNow(),
});

export const PIPELINE_STAGES = [
  "new", "screening", "manager_review", "phone_interview",
  "technical_interview", "final_interview", "offer_extended",
  "hired", "rejected", "withdrawn"
] as const;

export const insertCandidateSchema = createInsertSchema(candidates).omit({ id: true, appliedAt: true }).extend({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  linkedinUrl: z.string().optional().nullable(),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional().nullable(),
  coverLetter: z.string().optional().nullable(),
  source: z.enum(["website", "referral", "linkedin", "job_board", "agency", "direct", "other"]).optional(),
  resumeFileName: z.string().optional().nullable(),
  resumeFileUrl: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  ndpaConsent: z.boolean().optional().nullable(),
  assignedManagerId: z.string().optional().nullable(),
  stage: z.enum(PIPELINE_STAGES).optional(),
  rejectionReason: z.string().optional().nullable(),
});
export type InsertCandidate = z.infer<typeof insertCandidateSchema>;
export type Candidate = typeof candidates.$inferSelect;

export const candidateActivities = pgTable("candidate_activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  candidateId: varchar("candidate_id").notNull(),
  type: text("type").notNull(),
  description: text("description").notNull(),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: varchar("created_by"),
});

export type CandidateActivity = typeof candidateActivities.$inferSelect;

export const candidateNotes = pgTable("candidate_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  candidateId: varchar("candidate_id").notNull(),
  content: text("content").notNull(),
  category: text("category").notNull().default("general"),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: varchar("created_by").notNull(),
});

export type CandidateNote = typeof candidateNotes.$inferSelect;

export const candidateAssessments = pgTable("candidate_assessments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  candidateId: varchar("candidate_id").notNull(),
  assessorId: varchar("assessor_id").notNull(),
  category: text("category").notNull(),
  score: integer("score").notNull(),
  comments: text("comments"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type CandidateAssessment = typeof candidateAssessments.$inferSelect;

export const candidateInterviews = pgTable("candidate_interviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  candidateId: varchar("candidate_id").notNull(),
  interviewerId: varchar("interviewer_id").notNull(),
  scheduledAt: timestamp("scheduled_at").notNull(),
  duration: integer("duration").notNull().default(60),
  type: text("type").notNull(),
  round: text("round"),
  status: text("status").notNull().default("scheduled"),
  meetingLink: text("meeting_link"),
  meetingLocation: text("meeting_location"),
  notes: text("notes"),
  rating: integer("rating"),
  strengths: text("strengths"),
  weaknesses: text("weaknesses"),
  recommendation: text("recommendation"),
  decision: text("decision"),
  feedbackSubmittedAt: timestamp("feedback_submitted_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertInterviewSchema = createInsertSchema(candidateInterviews).omit({ id: true, createdAt: true, feedbackSubmittedAt: true }).extend({
  candidateId: z.string().min(1),
  interviewerId: z.string().min(1),
  scheduledAt: z.string().min(1),
  duration: z.number().min(15).optional(),
  type: z.enum(["screening", "phone", "technical", "hr", "final", "panel"]),
  round: z.string().optional().nullable(),
  meetingLink: z.string().optional().nullable(),
  meetingLocation: z.string().optional().nullable(),
});
export type InsertInterview = z.infer<typeof insertInterviewSchema>;
export type CandidateInterview = typeof candidateInterviews.$inferSelect;

export const interviewFeedbackSchema = z.object({
  rating: z.number().min(1).max(5),
  strengths: z.string().optional(),
  weaknesses: z.string().optional(),
  recommendation: z.enum(["strong_yes", "yes", "maybe", "no"]),
  decision: z.enum(["move_forward", "reject", "hold"]),
  notes: z.string().optional(),
});
export type InterviewFeedback = z.infer<typeof interviewFeedbackSchema>;

export const candidateCommunications = pgTable("candidate_communications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  candidateId: varchar("candidate_id").notNull(),
  direction: text("direction").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  sentAt: timestamp("sent_at").defaultNow(),
  sentBy: varchar("sent_by"),
});

export type CandidateCommunication = typeof candidateCommunications.$inferSelect;

export const emailTemplates = pgTable("email_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull(),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  category: text("category").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertEmailTemplateSchema = createInsertSchema(emailTemplates).omit({ id: true, createdAt: true }).extend({
  name: z.string().min(1, "Name is required"),
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Body is required"),
  category: z.enum(["application_received", "interview_scheduled", "offer_extended", "rejection", "general"]),
});
export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;
export type EmailTemplate = typeof emailTemplates.$inferSelect;

export const recruitmentSettings = pgTable("recruitment_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull(),
  key: text("key").notNull(),
  value: text("value").notNull(),
});

export type RecruitmentSetting = typeof recruitmentSettings.$inferSelect;

// ==================== HR QUERIES / DISCIPLINARY ====================

export const hrQueries = pgTable("hr_queries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull(),
  type: text("type").notNull().default("query"),
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  priority: text("priority").notNull().default("medium"),
  status: text("status").notNull().default("open"),
  employeeId: varchar("employee_id").notNull(),
  issuedBy: varchar("issued_by").notNull(),
  assignedTo: varchar("assigned_to"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

export const insertHrQuerySchema = createInsertSchema(hrQueries).omit({
  id: true, createdAt: true, updatedAt: true, resolvedAt: true, status: true, assignedTo: true,
}).extend({
  type: z.enum(["warning", "query"]).default("query"),
  subject: z.string().min(1, "Subject is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  category: z.enum(["attendance", "conduct", "performance", "policy_violation", "other"]),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  employeeId: z.string().min(1, "Employee is required"),
  issuedBy: z.string().min(1),
});
export type InsertHrQuery = z.infer<typeof insertHrQuerySchema>;
export type HrQuery = typeof hrQueries.$inferSelect;

export const hrQueryComments = pgTable("hr_query_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  queryId: varchar("query_id").notNull(),
  content: text("content").notNull(),
  authorId: varchar("author_id").notNull(),
  isInternal: text("is_internal").notNull().default("false"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type HrQueryComment = typeof hrQueryComments.$inferSelect;

export const hrQueryTimeline = pgTable("hr_query_timeline", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  queryId: varchar("query_id").notNull(),
  action: text("action").notNull(),
  details: text("details"),
  actorId: varchar("actor_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type HrQueryTimeline = typeof hrQueryTimeline.$inferSelect;

// ==================== HR QUERY ATTACHMENTS ====================

export const hrQueryAttachments = pgTable("hr_query_attachments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  queryId: varchar("query_id").notNull(),
  commentId: varchar("comment_id"),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: text("mime_type").notNull(),
  uploadedBy: varchar("uploaded_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type HrQueryAttachment = typeof hrQueryAttachments.$inferSelect;

// ==================== TASK MANAGEMENT ====================

export const taskTemplates = pgTable("task_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull().default("general"),
  departmentId: varchar("department_id"),
  defaultAssignmentType: text("default_assignment_type").default("individual"),
  isDefault: boolean("is_default").notNull().default(false),
  items: text("items").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTaskTemplateSchema = createInsertSchema(taskTemplates).omit({ id: true, createdAt: true }).extend({
  name: z.string().min(1, "Template name is required"),
  category: z.enum(["onboarding", "compliance", "training", "it_setup", "hr_paperwork", "general"]).default("general"),
  defaultAssignmentType: z.enum(["individual", "department", "managers", "everyone"]).default("individual"),
  items: z.string().min(1, "At least one task item is required"),
});
export type InsertTaskTemplate = z.infer<typeof insertTaskTemplateSchema>;
export type TaskTemplate = typeof taskTemplates.$inferSelect;

export const taskAssignments = pgTable("task_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull(),
  templateId: varchar("template_id"),
  title: text("title").notNull(),
  description: text("description"),
  assignmentType: text("assignment_type").notNull().default("individual"),
  targetEmployeeId: varchar("target_employee_id"),
  targetDepartmentId: varchar("target_department_id"),
  assignedById: varchar("assigned_by_id").notNull(),
  items: text("items").notNull(),
  dueDate: timestamp("due_date"),
  priority: text("priority").notNull().default("medium"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTaskAssignmentSchema = createInsertSchema(taskAssignments).omit({ id: true, createdAt: true }).extend({
  title: z.string().min(1, "Title is required"),
  assignmentType: z.enum(["individual", "department", "managers", "everyone"]),
  items: z.string().min(1, "At least one task item is required"),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
});
export type InsertTaskAssignment = z.infer<typeof insertTaskAssignmentSchema>;
export type TaskAssignment = typeof taskAssignments.$inferSelect;

export const taskCompletions = pgTable("task_completions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assignmentId: varchar("assignment_id").notNull(),
  employeeId: varchar("employee_id").notNull(),
  itemId: text("item_id").notNull(),
  completed: boolean("completed").notNull().default(false),
  completedAt: timestamp("completed_at"),
  acknowledged: boolean("acknowledged").notNull().default(false),
  acknowledgedAt: timestamp("acknowledged_at"),
  acknowledgedByName: text("acknowledged_by_name"),
});

export type TaskCompletion = typeof taskCompletions.$inferSelect;
