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
