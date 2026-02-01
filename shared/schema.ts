import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Re-export auth models (users and sessions tables)
export * from "./models/auth";

// Departments Table
export const departments = pgTable("departments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  managerId: varchar("manager_id"),
});

export const insertDepartmentSchema = createInsertSchema(departments).omit({ id: true });
export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;
export type Department = typeof departments.$inferSelect;

// Employees Table
export const employees = pgTable("employees", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull(),
  departmentId: varchar("department_id").notNull(),
  position: text("position").notNull(),
  managerId: varchar("manager_id"),
  hireDate: date("hire_date").notNull(),
  profileImageUrl: text("profile_image_url"),
  status: text("status").notNull().default("active"),
});

export const insertEmployeeSchema = createInsertSchema(employees).omit({ id: true }).extend({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(1, "Phone is required"),
  departmentId: z.string().min(1, "Department is required"),
  position: z.string().min(1, "Position is required"),
  hireDate: z.string().min(1, "Hire date is required"),
  status: z.enum(["active", "inactive", "on_leave"]),
});
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Employee = typeof employees.$inferSelect;

// Leave Types Table
export const leaveTypes = pgTable("leave_types", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  defaultDays: integer("default_days").notNull(),
  color: text("color").notNull(),
});

export const insertLeaveTypeSchema = createInsertSchema(leaveTypes).omit({ id: true });
export type InsertLeaveType = z.infer<typeof insertLeaveTypeSchema>;
export type LeaveType = typeof leaveTypes.$inferSelect;

// Leave Balances Table
export const leaveBalances = pgTable("leave_balances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").notNull(),
  leaveTypeId: varchar("leave_type_id").notNull(),
  totalDays: integer("total_days").notNull(),
  usedDays: integer("used_days").notNull().default(0),
  remainingDays: integer("remaining_days").notNull(),
  year: integer("year").notNull(),
});

export type LeaveBalance = typeof leaveBalances.$inferSelect;

// Leave Requests Table
export const leaveRequests = pgTable("leave_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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
  id: true, 
  status: true, 
  approverId: true, 
  approverComment: true, 
  createdAt: true,
  totalDays: true,
}).extend({
  leaveTypeId: z.string().min(1, "Leave type is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  reason: z.string().min(1, "Reason is required"),
});
export type InsertLeaveRequest = z.infer<typeof insertLeaveRequestSchema>;
export type LeaveRequest = typeof leaveRequests.$inferSelect;

// Appraisal Templates Table
export const appraisalTemplates = pgTable("appraisal_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  isDefault: integer("is_default").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export type AppraisalTemplate = typeof appraisalTemplates.$inferSelect;

// Template Questions Table
export const templateQuestions = pgTable("template_questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: varchar("template_id").notNull(),
  competencyId: varchar("competency_id"), // nullable for custom questions
  questionText: text("question_text").notNull(),
  questionType: text("question_type").notNull(), // "rating" or "text"
  order: integer("order").notNull().default(0),
});

export type TemplateQuestion = typeof templateQuestions.$inferSelect;

// Appraisal Cycles Table
export const appraisalCycles = pgTable("appraisal_cycles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(), // "180" or "360"
  templateId: varchar("template_id"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  status: text("status").notNull().default("draft"), // "draft", "active", "completed", "cancelled"
  selfWeight: integer("self_weight").notNull().default(10),
  peerWeight: integer("peer_weight").notNull().default(30),
  managerWeight: integer("manager_weight").notNull().default(60),
});

export const insertAppraisalCycleSchema = createInsertSchema(appraisalCycles).omit({ id: true });
export type InsertAppraisalCycle = z.infer<typeof insertAppraisalCycleSchema>;
export type AppraisalCycle = typeof appraisalCycles.$inferSelect;

// Appraisals Table
export const appraisals = pgTable("appraisals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  cycleId: varchar("cycle_id").notNull(),
  employeeId: varchar("employee_id").notNull(),
  status: text("status").notNull().default("pending"),
  overallRating: integer("overall_rating"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type Appraisal = typeof appraisals.$inferSelect;

// Appraisal Feedback Table (review assignments)
export const appraisalFeedback = pgTable("appraisal_feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  appraisalId: varchar("appraisal_id").notNull(),
  reviewerId: varchar("reviewer_id").notNull(),
  reviewerType: text("reviewer_type").notNull(), // "self", "manager", "peer", "subordinate"
  overallComment: text("overall_comment"),
  submittedAt: timestamp("submitted_at"),
  status: text("status").notNull().default("pending"), // "pending", "draft", "submitted"
});

export const insertAppraisalFeedbackSchema = createInsertSchema(appraisalFeedback).omit({ 
  id: true, 
  submittedAt: true 
}).extend({
  overallComment: z.string().min(1, "Overall comment is required"),
});
export type InsertAppraisalFeedback = z.infer<typeof insertAppraisalFeedbackSchema>;
export type AppraisalFeedback = typeof appraisalFeedback.$inferSelect;

// Feedback Ratings Table (individual question ratings)
export const feedbackRatings = pgTable("feedback_ratings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  feedbackId: varchar("feedback_id").notNull(),
  questionId: varchar("question_id").notNull(),
  rating: integer("rating"), // 1-5 for rating questions
  textResponse: text("text_response"), // for text questions
});

export type FeedbackRating = typeof feedbackRatings.$inferSelect;

// Cycle Participants Table (who is being reviewed in a cycle)
export const cycleParticipants = pgTable("cycle_participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  cycleId: varchar("cycle_id").notNull(),
  employeeId: varchar("employee_id").notNull(),
});

export type CycleParticipant = typeof cycleParticipants.$inferSelect;

// Peer Assignments Table (who reviews whom for peer feedback)
export const peerAssignments = pgTable("peer_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  cycleId: varchar("cycle_id").notNull(),
  revieweeId: varchar("reviewee_id").notNull(), // person being reviewed
  reviewerId: varchar("reviewer_id").notNull(), // peer doing the review
});

export type PeerAssignment = typeof peerAssignments.$inferSelect;

// Competencies Table
export const competencies = pgTable("competencies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
});

export type Competency = typeof competencies.$inferSelect;

// Company Holidays Table
export const companyHolidays = pgTable("company_holidays", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  date: date("date").notNull(),
  year: integer("year").notNull(),
});

export const insertCompanyHolidaySchema = createInsertSchema(companyHolidays).omit({ id: true });
export type InsertCompanyHoliday = z.infer<typeof insertCompanyHolidaySchema>;
export type CompanyHoliday = typeof companyHolidays.$inferSelect;

// ==================== RECRUITMENT/ATS TYPES ====================

// Job Postings Table
export const jobPostings = pgTable("job_postings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  departmentId: varchar("department_id").notNull(),
  location: text("location").notNull(),
  employmentType: text("employment_type").notNull(), // "full-time", "contract", "intern"
  experienceYears: integer("experience_years").notNull().default(0),
  status: text("status").notNull().default("open"), // "open", "closed", "draft"
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertJobPostingSchema = createInsertSchema(jobPostings).omit({ id: true, createdAt: true }).extend({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  departmentId: z.string().min(1, "Department is required"),
  location: z.string().min(1, "Location is required"),
  employmentType: z.enum(["full-time", "contract", "intern"]),
  experienceYears: z.number().min(0),
  status: z.enum(["open", "closed", "draft"]).optional(),
});
export type InsertJobPosting = z.infer<typeof insertJobPostingSchema>;
export type JobPosting = typeof jobPostings.$inferSelect;

// Candidates Table
export const candidates = pgTable("candidates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  location: text("location"),
  linkedinUrl: text("linkedin_url"),
  gender: text("gender"), // "male", "female", "other", "prefer_not_to_say"
  resumeFileName: text("resume_file_name"),
  stage: text("stage").notNull().default("applied"), // "applied", "screening", "interview", "offer", "hired", "rejected"
  appliedAt: timestamp("applied_at").defaultNow(),
});

export const insertCandidateSchema = createInsertSchema(candidates).omit({ id: true, appliedAt: true }).extend({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  location: z.string().optional(),
  linkedinUrl: z.string().optional(),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),
  resumeFileName: z.string().optional(),
  stage: z.enum(["applied", "screening", "interview", "offer", "hired", "rejected"]).optional(),
});
export type InsertCandidate = z.infer<typeof insertCandidateSchema>;
export type Candidate = typeof candidates.$inferSelect;

// Candidate Activities (Timeline)
export const candidateActivities = pgTable("candidate_activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  candidateId: varchar("candidate_id").notNull(),
  type: text("type").notNull(), // "stage_change", "note_added", "email_sent", "email_received", "interview_scheduled", "assessment_added"
  description: text("description").notNull(),
  metadata: text("metadata"), // JSON string for additional data
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: varchar("created_by"), // employee id
});

export type CandidateActivity = typeof candidateActivities.$inferSelect;

// Candidate Notes
export const candidateNotes = pgTable("candidate_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  candidateId: varchar("candidate_id").notNull(),
  content: text("content").notNull(),
  category: text("category").notNull().default("general"), // "general", "feedback", "concern", "positive"
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: varchar("created_by").notNull(),
});

export type CandidateNote = typeof candidateNotes.$inferSelect;

// Candidate Assessments
export const candidateAssessments = pgTable("candidate_assessments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  candidateId: varchar("candidate_id").notNull(),
  assessorId: varchar("assessor_id").notNull(),
  category: text("category").notNull(), // "technical", "communication", "culture_fit", "experience"
  score: integer("score").notNull(), // 1-5
  comments: text("comments"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type CandidateAssessment = typeof candidateAssessments.$inferSelect;

// Candidate Interviews
export const candidateInterviews = pgTable("candidate_interviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  candidateId: varchar("candidate_id").notNull(),
  interviewerId: varchar("interviewer_id").notNull(),
  scheduledAt: timestamp("scheduled_at").notNull(),
  duration: integer("duration").notNull().default(60), // minutes
  type: text("type").notNull(), // "phone", "video", "onsite"
  status: text("status").notNull().default("scheduled"), // "scheduled", "completed", "cancelled"
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type CandidateInterview = typeof candidateInterviews.$inferSelect;

// Candidate Communications (Emails)
export const candidateCommunications = pgTable("candidate_communications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  candidateId: varchar("candidate_id").notNull(),
  direction: text("direction").notNull(), // "sent", "received"
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  sentAt: timestamp("sent_at").defaultNow(),
  sentBy: varchar("sent_by"), // employee id if sent
});

export type CandidateCommunication = typeof candidateCommunications.$inferSelect;

// Email Templates
export const emailTemplates = pgTable("email_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  category: text("category").notNull(), // "application_received", "interview_scheduled", "offer_extended", "rejection", "general"
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

// Recruitment Settings
export const recruitmentSettings = pgTable("recruitment_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
});

export type RecruitmentSetting = typeof recruitmentSettings.$inferSelect;
