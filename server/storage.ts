import { eq, and, like, desc, sql } from "drizzle-orm";
import { db } from "./db";
import {
  companies, type Company, type InsertCompany,
  departments, type Department, type InsertDepartment,
  employees, type Employee, type InsertEmployee,
  leaveTypes, type LeaveType, type InsertLeaveType,
  leaveBalances, type LeaveBalance,
  leaveRequests, type LeaveRequest, type InsertLeaveRequest,
  hrQueries, type HrQuery, type InsertHrQuery,
  hrQueryComments, type HrQueryComment,
  hrQueryTimeline, type HrQueryTimeline,
  hrQueryAttachments, type HrQueryAttachment,
  appraisalTemplates, type AppraisalTemplate,
  templateQuestions, type TemplateQuestion,
  appraisalCycles, type AppraisalCycle, type InsertAppraisalCycle,
  appraisals, type Appraisal,
  appraisalFeedback, type AppraisalFeedback, type InsertAppraisalFeedback,
  feedbackRatings, type FeedbackRating,
  cycleParticipants, type CycleParticipant,
  peerAssignments, type PeerAssignment,
  taskTemplates, type TaskTemplate, type InsertTaskTemplate,
  taskAssignments, type TaskAssignment, type InsertTaskAssignment,
  taskCompletions, type TaskCompletion,
  jobPostings, type JobPosting, type InsertJobPosting,
  candidates, type Candidate, type InsertCandidate,
  candidateActivities, type CandidateActivity,
  candidateNotes, type CandidateNote,
  candidateAssessments, type CandidateAssessment,
  candidateInterviews, type CandidateInterview,
  candidateCommunications, type CandidateCommunication,
  emailTemplates, type EmailTemplate, type InsertEmailTemplate,
  recruitmentSettings, type RecruitmentSetting,
} from "@shared/schema";
import { randomUUID, randomBytes } from "crypto";

export interface IStorage {
  // Companies
  createCompany(data: InsertCompany): Promise<Company>;
  getCompany(id: string): Promise<Company | undefined>;
  updateCompany(id: string, data: Partial<InsertCompany>): Promise<Company | undefined>;

  // Departments
  createDepartment(data: InsertDepartment): Promise<Department>;
  getDepartment(id: string): Promise<Department | undefined>;
  getDepartmentsByCompany(companyId: string): Promise<Department[]>;
  updateDepartment(id: string, data: Partial<InsertDepartment>): Promise<Department | undefined>;
  deleteDepartment(id: string): Promise<boolean>;

  // Employees
  createEmployee(data: InsertEmployee): Promise<Employee>;
  getEmployee(id: string): Promise<Employee | undefined>;
  getEmployeeByEmail(email: string): Promise<Employee | undefined>;
  getEmployeeByEmployeeId(employeeId: string): Promise<Employee | undefined>;
  getEmployeeByInviteToken(token: string): Promise<Employee | undefined>;
  getEmployeesByCompany(companyId: string): Promise<Employee[]>;
  updateEmployee(id: string, data: Partial<Employee>): Promise<Employee | undefined>;
  deleteEmployee(id: string): Promise<boolean>;
  generateEmployeeId(companyId: string): Promise<string>;
  generateInviteToken(employeeId: string): Promise<string>;

  // Leave Types
  createLeaveType(data: InsertLeaveType): Promise<LeaveType>;
  getLeaveTypesByCompany(companyId: string): Promise<LeaveType[]>;
  getLeaveType(id: string): Promise<LeaveType | undefined>;
  updateLeaveType(id: string, data: Partial<InsertLeaveType>): Promise<LeaveType | undefined>;
  deleteLeaveType(id: string): Promise<boolean>;

  // Leave Balances
  getLeaveBalancesByEmployee(employeeId: string, year: number): Promise<LeaveBalance[]>;
  getLeaveBalancesByCompany(companyId: string, year: number): Promise<LeaveBalance[]>;
  upsertLeaveBalance(data: { companyId: string; employeeId: string; leaveTypeId: string; totalDays: number; usedDays: number; remainingDays: number; year: number }): Promise<LeaveBalance>;
  initializeBalancesForEmployee(companyId: string, employeeId: string, year: number): Promise<void>;
  initializeBalancesForLeaveType(companyId: string, leaveTypeId: string, defaultDays: number, year: number): Promise<void>;

  // Leave Requests
  createLeaveRequest(data: InsertLeaveRequest & { companyId: string; employeeId: string; totalDays: number; status?: string }): Promise<LeaveRequest>;
  getLeaveRequestsByEmployee(employeeId: string): Promise<LeaveRequest[]>;
  getLeaveRequestsByCompany(companyId: string): Promise<LeaveRequest[]>;
  getPendingLeaveRequestsByCompany(companyId: string): Promise<LeaveRequest[]>;
  getLeaveRequest(id: string): Promise<LeaveRequest | undefined>;
  updateLeaveRequest(id: string, data: Partial<LeaveRequest>): Promise<LeaveRequest | undefined>;

  // HR Queries
  createHrQuery(data: InsertHrQuery): Promise<HrQuery>;
  getHrQueriesByCompany(companyId: string): Promise<HrQuery[]>;
  getHrQueriesByEmployee(employeeId: string): Promise<HrQuery[]>;
  getHrQuery(id: string): Promise<HrQuery | undefined>;
  updateHrQuery(id: string, data: Partial<HrQuery>): Promise<HrQuery | undefined>;

  // HR Query Comments
  createHrQueryComment(data: { queryId: string; content: string; authorId: string; isInternal: string }): Promise<HrQueryComment>;
  getHrQueryComments(queryId: string): Promise<HrQueryComment[]>;

  // HR Query Timeline
  createHrQueryTimeline(data: { queryId: string; action: string; details: string; actorId: string }): Promise<HrQueryTimeline>;
  getHrQueryTimeline(queryId: string): Promise<HrQueryTimeline[]>;

  // HR Query Attachments
  createHrQueryAttachment(data: { queryId: string; commentId?: string; fileName: string; fileUrl: string; fileSize: number; mimeType: string; uploadedBy: string }): Promise<HrQueryAttachment>;
  getHrQueryAttachment(id: string): Promise<HrQueryAttachment | undefined>;
  getHrQueryAttachmentsByQuery(queryId: string): Promise<HrQueryAttachment[]>;
  getHrQueryAttachmentsByComment(commentId: string): Promise<HrQueryAttachment[]>;

  // Appraisal Templates
  createAppraisalTemplate(data: { companyId: string; name: string; description?: string; isDefault?: number }): Promise<AppraisalTemplate>;
  getAppraisalTemplatesByCompany(companyId: string): Promise<AppraisalTemplate[]>;
  getAppraisalTemplate(id: string): Promise<AppraisalTemplate | undefined>;
  updateAppraisalTemplate(id: string, data: Partial<{ name: string; description: string; isDefault: number }>): Promise<AppraisalTemplate | undefined>;
  deleteAppraisalTemplate(id: string): Promise<boolean>;

  // Template Questions
  createTemplateQuestion(data: { templateId: string; questionText: string; questionType: string; order?: number; competencyId?: string }): Promise<TemplateQuestion>;
  getTemplateQuestions(templateId: string): Promise<TemplateQuestion[]>;
  updateTemplateQuestion(id: string, data: Partial<{ questionText: string; questionType: string; order: number; competencyId: string }>): Promise<TemplateQuestion | undefined>;
  deleteTemplateQuestion(id: string): Promise<boolean>;
  deleteTemplateQuestionsByTemplate(templateId: string): Promise<void>;

  // Appraisal Cycles
  createAppraisalCycle(data: InsertAppraisalCycle): Promise<AppraisalCycle>;
  getAppraisalCyclesByCompany(companyId: string): Promise<AppraisalCycle[]>;
  getAppraisalCycle(id: string): Promise<AppraisalCycle | undefined>;
  updateAppraisalCycle(id: string, data: Partial<AppraisalCycle>): Promise<AppraisalCycle | undefined>;

  // Appraisals
  createAppraisal(data: { cycleId: string; employeeId: string; status?: string }): Promise<Appraisal>;
  getAppraisalsByCycle(cycleId: string): Promise<Appraisal[]>;
  getAppraisalsByEmployee(employeeId: string): Promise<Appraisal[]>;
  getAppraisal(id: string): Promise<Appraisal | undefined>;
  updateAppraisal(id: string, data: Partial<Appraisal>): Promise<Appraisal | undefined>;

  // Appraisal Feedback
  createAppraisalFeedback(data: { appraisalId: string; reviewerId: string; reviewerType: string; status?: string }): Promise<AppraisalFeedback>;
  getAppraisalFeedbackByAppraisal(appraisalId: string): Promise<AppraisalFeedback[]>;
  getAppraisalFeedbackByReviewer(reviewerId: string): Promise<AppraisalFeedback[]>;
  getAppraisalFeedback(id: string): Promise<AppraisalFeedback | undefined>;
  updateAppraisalFeedback(id: string, data: Partial<AppraisalFeedback>): Promise<AppraisalFeedback | undefined>;

  // Feedback Ratings
  createFeedbackRating(data: { feedbackId: string; questionId: string; rating?: number; textResponse?: string }): Promise<FeedbackRating>;
  getFeedbackRatings(feedbackId: string): Promise<FeedbackRating[]>;
  getFeedbackRatingsByAppraisal(appraisalId: string): Promise<FeedbackRating[]>;

  // Cycle Participants
  addCycleParticipant(data: { cycleId: string; employeeId: string }): Promise<CycleParticipant>;
  getCycleParticipants(cycleId: string): Promise<CycleParticipant[]>;
  removeCycleParticipant(id: string): Promise<boolean>;
  removeCycleParticipantsByIds(cycleId: string, employeeIds: string[]): Promise<void>;

  // Peer Assignments
  createPeerAssignment(data: { cycleId: string; revieweeId: string; reviewerId: string }): Promise<PeerAssignment>;
  getPeerAssignmentsByCycle(cycleId: string): Promise<PeerAssignment[]>;
  getPeerAssignmentsByReviewee(cycleId: string, revieweeId: string): Promise<PeerAssignment[]>;
  deletePeerAssignment(id: string): Promise<boolean>;
  deletePeerAssignmentsByCycle(cycleId: string): Promise<void>;

  // Task Templates
  createTaskTemplate(data: InsertTaskTemplate): Promise<TaskTemplate>;
  getTaskTemplatesByCompany(companyId: string): Promise<TaskTemplate[]>;
  getTaskTemplate(id: string): Promise<TaskTemplate | undefined>;
  updateTaskTemplate(id: string, data: Partial<InsertTaskTemplate>): Promise<TaskTemplate | undefined>;
  deleteTaskTemplate(id: string): Promise<boolean>;

  // Task Assignments
  createTaskAssignment(data: InsertTaskAssignment): Promise<TaskAssignment>;
  getTaskAssignmentsByCompany(companyId: string): Promise<TaskAssignment[]>;
  getTaskAssignment(id: string): Promise<TaskAssignment | undefined>;
  deleteTaskAssignment(id: string): Promise<boolean>;

  // Task Completions
  getTaskCompletionsByAssignment(assignmentId: string): Promise<TaskCompletion[]>;
  getTaskCompletionsByEmployee(employeeId: string): Promise<TaskCompletion[]>;
  toggleTaskCompletion(assignmentId: string, employeeId: string, itemId: string): Promise<TaskCompletion>;

  // Job Postings
  createJobPosting(data: InsertJobPosting): Promise<JobPosting>;
  getJobPostingsByCompany(companyId: string): Promise<JobPosting[]>;
  getJobPosting(id: string): Promise<JobPosting | undefined>;
  updateJobPosting(id: string, data: Partial<InsertJobPosting>): Promise<JobPosting | undefined>;
  deleteJobPosting(id: string): Promise<boolean>;
  getActiveJobPostingsByCompany(companyId: string): Promise<JobPosting[]>;
  getAllActiveJobPostings(): Promise<JobPosting[]>;

  // Candidates
  createCandidate(data: InsertCandidate): Promise<Candidate>;
  getCandidatesByCompany(companyId: string): Promise<Candidate[]>;
  getCandidatesByJob(jobId: string): Promise<Candidate[]>;
  getCandidate(id: string): Promise<Candidate | undefined>;
  updateCandidate(id: string, data: Partial<InsertCandidate>): Promise<Candidate | undefined>;
  deleteCandidate(id: string): Promise<boolean>;

  // Candidate Activities
  createCandidateActivity(data: { candidateId: string; type: string; description: string; metadata?: string; createdBy?: string }): Promise<CandidateActivity>;
  getCandidateActivities(candidateId: string): Promise<CandidateActivity[]>;

  // Candidate Notes
  createCandidateNote(data: { candidateId: string; content: string; category?: string; createdBy: string }): Promise<CandidateNote>;
  getCandidateNotes(candidateId: string): Promise<CandidateNote[]>;
  deleteCandidateNote(id: string): Promise<boolean>;

  // Candidate Assessments
  createCandidateAssessment(data: { candidateId: string; assessorId: string; category: string; score: number; comments?: string }): Promise<CandidateAssessment>;
  getCandidateAssessments(candidateId: string): Promise<CandidateAssessment[]>;

  // Candidate Interviews
  createCandidateInterview(data: any): Promise<CandidateInterview>;
  getCandidateInterviews(candidateId: string): Promise<CandidateInterview[]>;
  getInterviewsByCompany(companyId: string): Promise<(CandidateInterview & { candidate?: Candidate })[]>;
  getInterviewsByInterviewer(interviewerId: string): Promise<CandidateInterview[]>;
  getCandidateInterview(id: string): Promise<CandidateInterview | undefined>;
  updateCandidateInterview(id: string, data: Partial<CandidateInterview>): Promise<CandidateInterview | undefined>;
  deleteCandidateInterview(id: string): Promise<boolean>;

  // Candidate Communications
  createCandidateCommunication(data: { candidateId: string; direction: string; subject: string; body: string; sentBy?: string }): Promise<CandidateCommunication>;
  getCandidateCommunications(candidateId: string): Promise<CandidateCommunication[]>;

  // Email Templates
  createEmailTemplate(data: InsertEmailTemplate): Promise<EmailTemplate>;
  getEmailTemplatesByCompany(companyId: string): Promise<EmailTemplate[]>;
  getEmailTemplate(id: string): Promise<EmailTemplate | undefined>;
  updateEmailTemplate(id: string, data: Partial<InsertEmailTemplate>): Promise<EmailTemplate | undefined>;
  deleteEmailTemplate(id: string): Promise<boolean>;

  // Recruitment Settings
  getRecruitmentSettings(companyId: string): Promise<RecruitmentSetting[]>;
  upsertRecruitmentSetting(companyId: string, key: string, value: string): Promise<RecruitmentSetting>;
}

export class DatabaseStorage implements IStorage {
  // ==================== COMPANIES ====================

  async createCompany(data: InsertCompany): Promise<Company> {
    const [company] = await db.insert(companies).values(data).returning();
    return company;
  }

  async getCompany(id: string): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    return company;
  }

  async updateCompany(id: string, data: Partial<InsertCompany>): Promise<Company | undefined> {
    const [company] = await db.update(companies).set(data).where(eq(companies.id, id)).returning();
    return company;
  }

  // ==================== DEPARTMENTS ====================

  async createDepartment(data: InsertDepartment): Promise<Department> {
    const [department] = await db.insert(departments).values(data).returning();
    return department;
  }

  async getDepartment(id: string): Promise<Department | undefined> {
    const [department] = await db.select().from(departments).where(eq(departments.id, id));
    return department;
  }

  async getDepartmentsByCompany(companyId: string): Promise<Department[]> {
    return db.select().from(departments).where(eq(departments.companyId, companyId));
  }

  async updateDepartment(id: string, data: Partial<InsertDepartment>): Promise<Department | undefined> {
    const [department] = await db.update(departments).set(data).where(eq(departments.id, id)).returning();
    return department;
  }

  async deleteDepartment(id: string): Promise<boolean> {
    const result = await db.delete(departments).where(eq(departments.id, id)).returning();
    return result.length > 0;
  }

  // ==================== EMPLOYEES ====================

  async generateEmployeeId(companyId: string): Promise<string> {
    const existing = await db.select({ employeeId: employees.employeeId })
      .from(employees)
      .where(and(eq(employees.companyId, companyId), like(employees.employeeId, 'DOJ-%')))
      .orderBy(desc(employees.employeeId));

    let maxNum = 0;
    for (const row of existing) {
      if (row.employeeId) {
        const num = parseInt(row.employeeId.replace('DOJ-', ''), 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    }
    const next = maxNum + 1;
    return `DOJ-${String(next).padStart(3, '0')}`;
  }

  async createEmployee(data: InsertEmployee): Promise<Employee> {
    const employeeId = await this.generateEmployeeId(data.companyId);
    const [employee] = await db.insert(employees).values({ ...data, employeeId }).returning();
    return employee;
  }

  async getEmployee(id: string): Promise<Employee | undefined> {
    const [employee] = await db.select().from(employees).where(eq(employees.id, id));
    return employee;
  }

  async getEmployeeByEmail(email: string): Promise<Employee | undefined> {
    const [employee] = await db.select().from(employees).where(eq(employees.email, email));
    return employee;
  }

  async getEmployeeByEmployeeId(employeeId: string): Promise<Employee | undefined> {
    const [employee] = await db.select().from(employees).where(eq(employees.employeeId, employeeId));
    return employee;
  }

  async getEmployeeByInviteToken(token: string): Promise<Employee | undefined> {
    const [employee] = await db.select().from(employees).where(eq(employees.inviteToken, token));
    return employee;
  }

  async getEmployeesByCompany(companyId: string): Promise<Employee[]> {
    return db.select().from(employees).where(eq(employees.companyId, companyId)).orderBy(desc(employees.createdAt));
  }

  async updateEmployee(id: string, data: Partial<Employee>): Promise<Employee | undefined> {
    const [employee] = await db.update(employees).set(data).where(eq(employees.id, id)).returning();
    return employee;
  }

  async deleteEmployee(id: string): Promise<boolean> {
    const result = await db.delete(employees).where(eq(employees.id, id)).returning();
    return result.length > 0;
  }

  async generateInviteToken(employeeId: string): Promise<string> {
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await db.update(employees).set({
      inviteToken: token,
      inviteExpiresAt: expiresAt,
    }).where(eq(employees.id, employeeId));

    return token;
  }

  // ==================== LEAVE TYPES ====================

  async createLeaveType(data: InsertLeaveType): Promise<LeaveType> {
    const [leaveType] = await db.insert(leaveTypes).values(data).returning();
    return leaveType;
  }

  async getLeaveTypesByCompany(companyId: string): Promise<LeaveType[]> {
    return db.select().from(leaveTypes).where(eq(leaveTypes.companyId, companyId));
  }

  async getLeaveType(id: string): Promise<LeaveType | undefined> {
    const [leaveType] = await db.select().from(leaveTypes).where(eq(leaveTypes.id, id));
    return leaveType;
  }

  async updateLeaveType(id: string, data: Partial<InsertLeaveType>): Promise<LeaveType | undefined> {
    const [leaveType] = await db.update(leaveTypes).set(data).where(eq(leaveTypes.id, id)).returning();
    return leaveType;
  }

  async deleteLeaveType(id: string): Promise<boolean> {
    const result = await db.delete(leaveTypes).where(eq(leaveTypes.id, id)).returning();
    return result.length > 0;
  }

  // ==================== LEAVE BALANCES ====================

  async getLeaveBalancesByEmployee(employeeId: string, year: number): Promise<LeaveBalance[]> {
    return db.select().from(leaveBalances).where(
      and(eq(leaveBalances.employeeId, employeeId), eq(leaveBalances.year, year))
    );
  }

  async getLeaveBalancesByCompany(companyId: string, year: number): Promise<LeaveBalance[]> {
    return db.select().from(leaveBalances).where(
      and(eq(leaveBalances.companyId, companyId), eq(leaveBalances.year, year))
    );
  }

  async upsertLeaveBalance(data: { companyId: string; employeeId: string; leaveTypeId: string; totalDays: number; usedDays: number; remainingDays: number; year: number }): Promise<LeaveBalance> {
    const [existing] = await db.select().from(leaveBalances).where(
      and(
        eq(leaveBalances.companyId, data.companyId),
        eq(leaveBalances.employeeId, data.employeeId),
        eq(leaveBalances.leaveTypeId, data.leaveTypeId),
        eq(leaveBalances.year, data.year)
      )
    );

    if (existing) {
      const [updated] = await db.update(leaveBalances).set({
        totalDays: data.totalDays,
        usedDays: data.usedDays,
        remainingDays: data.remainingDays,
      }).where(eq(leaveBalances.id, existing.id)).returning();
      return updated;
    }

    const [created] = await db.insert(leaveBalances).values(data).returning();
    return created;
  }

  async initializeBalancesForEmployee(companyId: string, employeeId: string, year: number): Promise<void> {
    const types = await this.getLeaveTypesByCompany(companyId);
    for (const lt of types) {
      await this.upsertLeaveBalance({
        companyId,
        employeeId,
        leaveTypeId: lt.id,
        totalDays: lt.defaultDays,
        usedDays: 0,
        remainingDays: lt.defaultDays,
        year,
      });
    }
  }

  async initializeBalancesForLeaveType(companyId: string, leaveTypeId: string, defaultDays: number, year: number): Promise<void> {
    const companyEmployees = await this.getEmployeesByCompany(companyId);
    for (const emp of companyEmployees) {
      if (emp.role === 'contract' || emp.status !== 'active') continue;
      await this.upsertLeaveBalance({
        companyId,
        employeeId: emp.id,
        leaveTypeId,
        totalDays: defaultDays,
        usedDays: 0,
        remainingDays: defaultDays,
        year,
      });
    }
  }

  // ==================== LEAVE REQUESTS ====================

  async createLeaveRequest(data: InsertLeaveRequest & { companyId: string; employeeId: string; totalDays: number; status?: string }): Promise<LeaveRequest> {
    const [request] = await db.insert(leaveRequests).values(data).returning();
    return request;
  }

  async getLeaveRequestsByEmployee(employeeId: string): Promise<LeaveRequest[]> {
    return db.select().from(leaveRequests).where(eq(leaveRequests.employeeId, employeeId)).orderBy(desc(leaveRequests.createdAt));
  }

  async getLeaveRequestsByCompany(companyId: string): Promise<LeaveRequest[]> {
    return db.select().from(leaveRequests).where(eq(leaveRequests.companyId, companyId)).orderBy(desc(leaveRequests.createdAt));
  }

  async getPendingLeaveRequestsByCompany(companyId: string): Promise<LeaveRequest[]> {
    return db.select().from(leaveRequests).where(
      and(
        eq(leaveRequests.companyId, companyId),
        sql`${leaveRequests.status} IN ('pending', 'manager_approved')`
      )
    ).orderBy(desc(leaveRequests.createdAt));
  }

  async getLeaveRequest(id: string): Promise<LeaveRequest | undefined> {
    const [request] = await db.select().from(leaveRequests).where(eq(leaveRequests.id, id));
    return request;
  }

  async updateLeaveRequest(id: string, data: Partial<LeaveRequest>): Promise<LeaveRequest | undefined> {
    const [request] = await db.update(leaveRequests).set(data).where(eq(leaveRequests.id, id)).returning();
    return request;
  }

  // ==================== HR QUERIES ====================

  async createHrQuery(data: InsertHrQuery): Promise<HrQuery> {
    const [query] = await db.insert(hrQueries).values(data).returning();
    return query;
  }

  async getHrQueriesByCompany(companyId: string): Promise<HrQuery[]> {
    return db.select().from(hrQueries).where(eq(hrQueries.companyId, companyId)).orderBy(desc(hrQueries.createdAt));
  }

  async getHrQueriesByEmployee(employeeId: string): Promise<HrQuery[]> {
    return db.select().from(hrQueries).where(eq(hrQueries.employeeId, employeeId)).orderBy(desc(hrQueries.createdAt));
  }

  async getHrQuery(id: string): Promise<HrQuery | undefined> {
    const [query] = await db.select().from(hrQueries).where(eq(hrQueries.id, id));
    return query;
  }

  async updateHrQuery(id: string, data: Partial<HrQuery>): Promise<HrQuery | undefined> {
    const [query] = await db.update(hrQueries).set({ ...data, updatedAt: new Date() }).where(eq(hrQueries.id, id)).returning();
    return query;
  }

  // ==================== HR QUERY COMMENTS ====================

  async createHrQueryComment(data: { queryId: string; content: string; authorId: string; isInternal: string }): Promise<HrQueryComment> {
    const [comment] = await db.insert(hrQueryComments).values(data).returning();
    return comment;
  }

  async getHrQueryComments(queryId: string): Promise<HrQueryComment[]> {
    return db.select().from(hrQueryComments).where(eq(hrQueryComments.queryId, queryId)).orderBy(hrQueryComments.createdAt);
  }

  // ==================== HR QUERY TIMELINE ====================

  async createHrQueryTimeline(data: { queryId: string; action: string; details: string; actorId: string }): Promise<HrQueryTimeline> {
    const [entry] = await db.insert(hrQueryTimeline).values(data).returning();
    return entry;
  }

  async getHrQueryTimeline(queryId: string): Promise<HrQueryTimeline[]> {
    return db.select().from(hrQueryTimeline).where(eq(hrQueryTimeline.queryId, queryId)).orderBy(hrQueryTimeline.createdAt);
  }

  // ==================== HR QUERY ATTACHMENTS ====================

  async createHrQueryAttachment(data: { queryId: string; commentId?: string; fileName: string; fileUrl: string; fileSize: number; mimeType: string; uploadedBy: string }): Promise<HrQueryAttachment> {
    const [attachment] = await db.insert(hrQueryAttachments).values(data).returning();
    return attachment;
  }

  async getHrQueryAttachment(id: string): Promise<HrQueryAttachment | undefined> {
    const [attachment] = await db.select().from(hrQueryAttachments).where(eq(hrQueryAttachments.id, id));
    return attachment;
  }

  async getHrQueryAttachmentsByQuery(queryId: string): Promise<HrQueryAttachment[]> {
    return db.select().from(hrQueryAttachments).where(eq(hrQueryAttachments.queryId, queryId)).orderBy(hrQueryAttachments.createdAt);
  }

  async getHrQueryAttachmentsByComment(commentId: string): Promise<HrQueryAttachment[]> {
    return db.select().from(hrQueryAttachments).where(eq(hrQueryAttachments.commentId, commentId)).orderBy(hrQueryAttachments.createdAt);
  }

  // ==================== APPRAISAL TEMPLATES ====================

  async createAppraisalTemplate(data: { companyId: string; name: string; description?: string; isDefault?: number }): Promise<AppraisalTemplate> {
    const [template] = await db.insert(appraisalTemplates).values(data).returning();
    return template;
  }

  async getAppraisalTemplatesByCompany(companyId: string): Promise<AppraisalTemplate[]> {
    return db.select().from(appraisalTemplates).where(eq(appraisalTemplates.companyId, companyId)).orderBy(desc(appraisalTemplates.createdAt));
  }

  async getAppraisalTemplate(id: string): Promise<AppraisalTemplate | undefined> {
    const [template] = await db.select().from(appraisalTemplates).where(eq(appraisalTemplates.id, id));
    return template;
  }

  async updateAppraisalTemplate(id: string, data: Partial<{ name: string; description: string; isDefault: number }>): Promise<AppraisalTemplate | undefined> {
    const [template] = await db.update(appraisalTemplates).set(data).where(eq(appraisalTemplates.id, id)).returning();
    return template;
  }

  async deleteAppraisalTemplate(id: string): Promise<boolean> {
    const result = await db.delete(appraisalTemplates).where(eq(appraisalTemplates.id, id)).returning();
    return result.length > 0;
  }

  // ==================== TEMPLATE QUESTIONS ====================

  async createTemplateQuestion(data: { templateId: string; questionText: string; questionType: string; order?: number; competencyId?: string }): Promise<TemplateQuestion> {
    const [question] = await db.insert(templateQuestions).values(data).returning();
    return question;
  }

  async getTemplateQuestions(templateId: string): Promise<TemplateQuestion[]> {
    return db.select().from(templateQuestions).where(eq(templateQuestions.templateId, templateId)).orderBy(templateQuestions.order);
  }

  async updateTemplateQuestion(id: string, data: Partial<{ questionText: string; questionType: string; order: number; competencyId: string }>): Promise<TemplateQuestion | undefined> {
    const [question] = await db.update(templateQuestions).set(data).where(eq(templateQuestions.id, id)).returning();
    return question;
  }

  async deleteTemplateQuestion(id: string): Promise<boolean> {
    const result = await db.delete(templateQuestions).where(eq(templateQuestions.id, id)).returning();
    return result.length > 0;
  }

  async deleteTemplateQuestionsByTemplate(templateId: string): Promise<void> {
    await db.delete(templateQuestions).where(eq(templateQuestions.templateId, templateId));
  }

  // ==================== APPRAISAL CYCLES ====================

  async createAppraisalCycle(data: InsertAppraisalCycle): Promise<AppraisalCycle> {
    const [cycle] = await db.insert(appraisalCycles).values(data).returning();
    return cycle;
  }

  async getAppraisalCyclesByCompany(companyId: string): Promise<AppraisalCycle[]> {
    return db.select().from(appraisalCycles).where(eq(appraisalCycles.companyId, companyId));
  }

  async getAppraisalCycle(id: string): Promise<AppraisalCycle | undefined> {
    const [cycle] = await db.select().from(appraisalCycles).where(eq(appraisalCycles.id, id));
    return cycle;
  }

  async updateAppraisalCycle(id: string, data: Partial<AppraisalCycle>): Promise<AppraisalCycle | undefined> {
    const [cycle] = await db.update(appraisalCycles).set(data).where(eq(appraisalCycles.id, id)).returning();
    return cycle;
  }

  // ==================== APPRAISALS ====================

  async createAppraisal(data: { cycleId: string; employeeId: string; status?: string }): Promise<Appraisal> {
    const [appraisal] = await db.insert(appraisals).values(data).returning();
    return appraisal;
  }

  async getAppraisalsByCycle(cycleId: string): Promise<Appraisal[]> {
    return db.select().from(appraisals).where(eq(appraisals.cycleId, cycleId)).orderBy(desc(appraisals.createdAt));
  }

  async getAppraisalsByEmployee(employeeId: string): Promise<Appraisal[]> {
    return db.select().from(appraisals).where(eq(appraisals.employeeId, employeeId)).orderBy(desc(appraisals.createdAt));
  }

  async getAppraisal(id: string): Promise<Appraisal | undefined> {
    const [appraisal] = await db.select().from(appraisals).where(eq(appraisals.id, id));
    return appraisal;
  }

  async updateAppraisal(id: string, data: Partial<Appraisal>): Promise<Appraisal | undefined> {
    const [appraisal] = await db.update(appraisals).set(data).where(eq(appraisals.id, id)).returning();
    return appraisal;
  }

  // ==================== APPRAISAL FEEDBACK ====================

  async createAppraisalFeedback(data: { appraisalId: string; reviewerId: string; reviewerType: string; status?: string }): Promise<AppraisalFeedback> {
    const [feedback] = await db.insert(appraisalFeedback).values(data).returning();
    return feedback;
  }

  async getAppraisalFeedbackByAppraisal(appraisalId: string): Promise<AppraisalFeedback[]> {
    return db.select().from(appraisalFeedback).where(eq(appraisalFeedback.appraisalId, appraisalId));
  }

  async getAppraisalFeedbackByReviewer(reviewerId: string): Promise<AppraisalFeedback[]> {
    return db.select().from(appraisalFeedback).where(eq(appraisalFeedback.reviewerId, reviewerId));
  }

  async getAppraisalFeedback(id: string): Promise<AppraisalFeedback | undefined> {
    const [feedback] = await db.select().from(appraisalFeedback).where(eq(appraisalFeedback.id, id));
    return feedback;
  }

  async updateAppraisalFeedback(id: string, data: Partial<AppraisalFeedback>): Promise<AppraisalFeedback | undefined> {
    const [feedback] = await db.update(appraisalFeedback).set(data).where(eq(appraisalFeedback.id, id)).returning();
    return feedback;
  }

  // ==================== FEEDBACK RATINGS ====================

  async createFeedbackRating(data: { feedbackId: string; questionId: string; rating?: number; textResponse?: string }): Promise<FeedbackRating> {
    const [rating] = await db.insert(feedbackRatings).values(data).returning();
    return rating;
  }

  async getFeedbackRatings(feedbackId: string): Promise<FeedbackRating[]> {
    return db.select().from(feedbackRatings).where(eq(feedbackRatings.feedbackId, feedbackId));
  }

  async getFeedbackRatingsByAppraisal(appraisalId: string): Promise<FeedbackRating[]> {
    const feedbacks = await db.select().from(appraisalFeedback).where(eq(appraisalFeedback.appraisalId, appraisalId));
    const feedbackIds = feedbacks.map(f => f.id);
    if (feedbackIds.length === 0) return [];
    return db.select().from(feedbackRatings).where(sql`${feedbackRatings.feedbackId} IN (${sql.join(feedbackIds.map(id => sql`${id}`), sql`, `)})`);
  }

  // ==================== CYCLE PARTICIPANTS ====================

  async addCycleParticipant(data: { cycleId: string; employeeId: string }): Promise<CycleParticipant> {
    const [participant] = await db.insert(cycleParticipants).values(data).returning();
    return participant;
  }

  async getCycleParticipants(cycleId: string): Promise<CycleParticipant[]> {
    return db.select().from(cycleParticipants).where(eq(cycleParticipants.cycleId, cycleId));
  }

  async removeCycleParticipant(id: string): Promise<boolean> {
    const result = await db.delete(cycleParticipants).where(eq(cycleParticipants.id, id)).returning();
    return result.length > 0;
  }

  async removeCycleParticipantsByIds(cycleId: string, employeeIds: string[]): Promise<void> {
    if (employeeIds.length === 0) return;
    await db.delete(cycleParticipants).where(
      and(
        eq(cycleParticipants.cycleId, cycleId),
        sql`${cycleParticipants.employeeId} IN (${sql.join(employeeIds.map(id => sql`${id}`), sql`, `)})`
      )
    );
  }

  // ==================== PEER ASSIGNMENTS ====================

  async createPeerAssignment(data: { cycleId: string; revieweeId: string; reviewerId: string }): Promise<PeerAssignment> {
    const [assignment] = await db.insert(peerAssignments).values(data).returning();
    return assignment;
  }

  async getPeerAssignmentsByCycle(cycleId: string): Promise<PeerAssignment[]> {
    return db.select().from(peerAssignments).where(eq(peerAssignments.cycleId, cycleId));
  }

  async getPeerAssignmentsByReviewee(cycleId: string, revieweeId: string): Promise<PeerAssignment[]> {
    return db.select().from(peerAssignments).where(
      and(eq(peerAssignments.cycleId, cycleId), eq(peerAssignments.revieweeId, revieweeId))
    );
  }

  async deletePeerAssignment(id: string): Promise<boolean> {
    const result = await db.delete(peerAssignments).where(eq(peerAssignments.id, id)).returning();
    return result.length > 0;
  }

  async deletePeerAssignmentsByCycle(cycleId: string): Promise<void> {
    await db.delete(peerAssignments).where(eq(peerAssignments.cycleId, cycleId));
  }

  // ==================== TASK TEMPLATES ====================

  async createTaskTemplate(data: InsertTaskTemplate): Promise<TaskTemplate> {
    const [template] = await db.insert(taskTemplates).values(data).returning();
    return template;
  }

  async getTaskTemplatesByCompany(companyId: string): Promise<TaskTemplate[]> {
    return db.select().from(taskTemplates).where(eq(taskTemplates.companyId, companyId)).orderBy(desc(taskTemplates.createdAt));
  }

  async getTaskTemplate(id: string): Promise<TaskTemplate | undefined> {
    const [template] = await db.select().from(taskTemplates).where(eq(taskTemplates.id, id));
    return template;
  }

  async updateTaskTemplate(id: string, data: Partial<InsertTaskTemplate>): Promise<TaskTemplate | undefined> {
    const [template] = await db.update(taskTemplates).set(data).where(eq(taskTemplates.id, id)).returning();
    return template;
  }

  async deleteTaskTemplate(id: string): Promise<boolean> {
    const result = await db.delete(taskTemplates).where(eq(taskTemplates.id, id)).returning();
    return result.length > 0;
  }

  // ==================== TASK ASSIGNMENTS ====================

  async createTaskAssignment(data: InsertTaskAssignment): Promise<TaskAssignment> {
    const [assignment] = await db.insert(taskAssignments).values(data).returning();
    return assignment;
  }

  async getTaskAssignmentsByCompany(companyId: string): Promise<TaskAssignment[]> {
    return db.select().from(taskAssignments).where(eq(taskAssignments.companyId, companyId)).orderBy(desc(taskAssignments.createdAt));
  }

  async getTaskAssignment(id: string): Promise<TaskAssignment | undefined> {
    const [assignment] = await db.select().from(taskAssignments).where(eq(taskAssignments.id, id));
    return assignment;
  }

  async deleteTaskAssignment(id: string): Promise<boolean> {
    await db.delete(taskCompletions).where(eq(taskCompletions.assignmentId, id));
    const result = await db.delete(taskAssignments).where(eq(taskAssignments.id, id)).returning();
    return result.length > 0;
  }

  // ==================== TASK COMPLETIONS ====================

  async getTaskCompletionsByAssignment(assignmentId: string): Promise<TaskCompletion[]> {
    return db.select().from(taskCompletions).where(eq(taskCompletions.assignmentId, assignmentId));
  }

  async getTaskCompletionsByEmployee(employeeId: string): Promise<TaskCompletion[]> {
    return db.select().from(taskCompletions).where(eq(taskCompletions.employeeId, employeeId));
  }

  async toggleTaskCompletion(assignmentId: string, employeeId: string, itemId: string): Promise<TaskCompletion> {
    const [existing] = await db.select().from(taskCompletions).where(
      and(
        eq(taskCompletions.assignmentId, assignmentId),
        eq(taskCompletions.employeeId, employeeId),
        eq(taskCompletions.itemId, itemId)
      )
    );

    if (existing) {
      const newCompleted = !existing.completed;
      const [updated] = await db.update(taskCompletions).set({
        completed: newCompleted,
        completedAt: newCompleted ? new Date() : null,
      }).where(eq(taskCompletions.id, existing.id)).returning();
      return updated;
    } else {
      const [created] = await db.insert(taskCompletions).values({
        assignmentId,
        employeeId,
        itemId,
        completed: true,
        completedAt: new Date(),
      }).returning();
      return created;
    }
  }

  // ==================== JOB POSTINGS ====================

  async createJobPosting(data: InsertJobPosting): Promise<JobPosting> {
    const [posting] = await db.insert(jobPostings).values(data).returning();
    return posting;
  }

  async getJobPostingsByCompany(companyId: string): Promise<JobPosting[]> {
    return db.select().from(jobPostings).where(eq(jobPostings.companyId, companyId)).orderBy(desc(jobPostings.createdAt));
  }

  async getActiveJobPostingsByCompany(companyId: string): Promise<JobPosting[]> {
    return db.select().from(jobPostings).where(and(eq(jobPostings.companyId, companyId), eq(jobPostings.status, "active"))).orderBy(desc(jobPostings.createdAt));
  }

  async getAllActiveJobPostings(): Promise<JobPosting[]> {
    return db.select().from(jobPostings).where(eq(jobPostings.status, "active")).orderBy(desc(jobPostings.createdAt));
  }

  async getJobPosting(id: string): Promise<JobPosting | undefined> {
    const [posting] = await db.select().from(jobPostings).where(eq(jobPostings.id, id));
    return posting;
  }

  async updateJobPosting(id: string, data: Partial<InsertJobPosting>): Promise<JobPosting | undefined> {
    const [posting] = await db.update(jobPostings).set(data).where(eq(jobPostings.id, id)).returning();
    return posting;
  }

  async deleteJobPosting(id: string): Promise<boolean> {
    const result = await db.delete(jobPostings).where(eq(jobPostings.id, id)).returning();
    return result.length > 0;
  }

  // ==================== CANDIDATES ====================

  async createCandidate(data: InsertCandidate): Promise<Candidate> {
    const [candidate] = await db.insert(candidates).values(data).returning();
    return candidate;
  }

  async getCandidatesByCompany(companyId: string): Promise<Candidate[]> {
    return db.select().from(candidates).where(eq(candidates.companyId, companyId)).orderBy(desc(candidates.appliedAt));
  }

  async getCandidatesByJob(jobId: string): Promise<Candidate[]> {
    return db.select().from(candidates).where(eq(candidates.jobId, jobId)).orderBy(desc(candidates.appliedAt));
  }

  async getCandidate(id: string): Promise<Candidate | undefined> {
    const [candidate] = await db.select().from(candidates).where(eq(candidates.id, id));
    return candidate;
  }

  async updateCandidate(id: string, data: Partial<InsertCandidate>): Promise<Candidate | undefined> {
    const [candidate] = await db.update(candidates).set(data).where(eq(candidates.id, id)).returning();
    return candidate;
  }

  async deleteCandidate(id: string): Promise<boolean> {
    const result = await db.delete(candidates).where(eq(candidates.id, id)).returning();
    return result.length > 0;
  }

  // ==================== CANDIDATE ACTIVITIES ====================

  async createCandidateActivity(data: { candidateId: string; type: string; description: string; metadata?: string; createdBy?: string }): Promise<CandidateActivity> {
    const [activity] = await db.insert(candidateActivities).values(data).returning();
    return activity;
  }

  async getCandidateActivities(candidateId: string): Promise<CandidateActivity[]> {
    return db.select().from(candidateActivities).where(eq(candidateActivities.candidateId, candidateId)).orderBy(desc(candidateActivities.createdAt));
  }

  // ==================== CANDIDATE NOTES ====================

  async createCandidateNote(data: { candidateId: string; content: string; category?: string; createdBy: string }): Promise<CandidateNote> {
    const [note] = await db.insert(candidateNotes).values({ ...data, category: data.category || "general" }).returning();
    return note;
  }

  async getCandidateNotes(candidateId: string): Promise<CandidateNote[]> {
    return db.select().from(candidateNotes).where(eq(candidateNotes.candidateId, candidateId)).orderBy(desc(candidateNotes.createdAt));
  }

  async deleteCandidateNote(id: string): Promise<boolean> {
    const result = await db.delete(candidateNotes).where(eq(candidateNotes.id, id)).returning();
    return result.length > 0;
  }

  // ==================== CANDIDATE ASSESSMENTS ====================

  async createCandidateAssessment(data: { candidateId: string; assessorId: string; category: string; score: number; comments?: string }): Promise<CandidateAssessment> {
    const [assessment] = await db.insert(candidateAssessments).values(data).returning();
    return assessment;
  }

  async getCandidateAssessments(candidateId: string): Promise<CandidateAssessment[]> {
    return db.select().from(candidateAssessments).where(eq(candidateAssessments.candidateId, candidateId)).orderBy(desc(candidateAssessments.createdAt));
  }

  // ==================== CANDIDATE INTERVIEWS ====================

  async createCandidateInterview(data: any): Promise<CandidateInterview> {
    const [interview] = await db.insert(candidateInterviews).values(data).returning();
    return interview;
  }

  async getCandidateInterviews(candidateId: string): Promise<CandidateInterview[]> {
    return db.select().from(candidateInterviews).where(eq(candidateInterviews.candidateId, candidateId)).orderBy(desc(candidateInterviews.scheduledAt));
  }

  async getInterviewsByCompany(companyId: string): Promise<(CandidateInterview & { candidate?: Candidate })[]> {
    const allCandidates = await db.select().from(candidates).where(eq(candidates.companyId, companyId));
    const candidateIds = allCandidates.map(c => c.id);
    if (candidateIds.length === 0) return [];
    const allInterviews = await db.select().from(candidateInterviews).orderBy(desc(candidateInterviews.scheduledAt));
    const filtered = allInterviews.filter(i => candidateIds.includes(i.candidateId));
    return filtered.map(i => ({ ...i, candidate: allCandidates.find(c => c.id === i.candidateId) }));
  }

  async getInterviewsByInterviewer(interviewerId: string): Promise<CandidateInterview[]> {
    return db.select().from(candidateInterviews).where(eq(candidateInterviews.interviewerId, interviewerId)).orderBy(desc(candidateInterviews.scheduledAt));
  }

  async getCandidateInterview(id: string): Promise<CandidateInterview | undefined> {
    const [interview] = await db.select().from(candidateInterviews).where(eq(candidateInterviews.id, id));
    return interview;
  }

  async updateCandidateInterview(id: string, data: Partial<CandidateInterview>): Promise<CandidateInterview | undefined> {
    const [interview] = await db.update(candidateInterviews).set(data).where(eq(candidateInterviews.id, id)).returning();
    return interview;
  }

  async deleteCandidateInterview(id: string): Promise<boolean> {
    const result = await db.delete(candidateInterviews).where(eq(candidateInterviews.id, id)).returning();
    return result.length > 0;
  }

  // ==================== CANDIDATE COMMUNICATIONS ====================

  async createCandidateCommunication(data: { candidateId: string; direction: string; subject: string; body: string; sentBy?: string }): Promise<CandidateCommunication> {
    const [comm] = await db.insert(candidateCommunications).values(data).returning();
    return comm;
  }

  async getCandidateCommunications(candidateId: string): Promise<CandidateCommunication[]> {
    return db.select().from(candidateCommunications).where(eq(candidateCommunications.candidateId, candidateId)).orderBy(desc(candidateCommunications.sentAt));
  }

  // ==================== EMAIL TEMPLATES ====================

  async createEmailTemplate(data: InsertEmailTemplate): Promise<EmailTemplate> {
    const [template] = await db.insert(emailTemplates).values(data).returning();
    return template;
  }

  async getEmailTemplatesByCompany(companyId: string): Promise<EmailTemplate[]> {
    return db.select().from(emailTemplates).where(eq(emailTemplates.companyId, companyId)).orderBy(desc(emailTemplates.createdAt));
  }

  async getEmailTemplate(id: string): Promise<EmailTemplate | undefined> {
    const [template] = await db.select().from(emailTemplates).where(eq(emailTemplates.id, id));
    return template;
  }

  async updateEmailTemplate(id: string, data: Partial<InsertEmailTemplate>): Promise<EmailTemplate | undefined> {
    const [template] = await db.update(emailTemplates).set(data).where(eq(emailTemplates.id, id)).returning();
    return template;
  }

  async deleteEmailTemplate(id: string): Promise<boolean> {
    const result = await db.delete(emailTemplates).where(eq(emailTemplates.id, id)).returning();
    return result.length > 0;
  }

  // ==================== RECRUITMENT SETTINGS ====================

  async getRecruitmentSettings(companyId: string): Promise<RecruitmentSetting[]> {
    return db.select().from(recruitmentSettings).where(eq(recruitmentSettings.companyId, companyId));
  }

  async upsertRecruitmentSetting(companyId: string, key: string, value: string): Promise<RecruitmentSetting> {
    const [existing] = await db.select().from(recruitmentSettings).where(and(eq(recruitmentSettings.companyId, companyId), eq(recruitmentSettings.key, key)));
    if (existing) {
      const [updated] = await db.update(recruitmentSettings).set({ value }).where(eq(recruitmentSettings.id, existing.id)).returning();
      return updated;
    }
    const [created] = await db.insert(recruitmentSettings).values({ companyId, key, value }).returning();
    return created;
  }
}

export const storage = new DatabaseStorage();
