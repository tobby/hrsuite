import type { 
  Employee, 
  Department, 
  LeaveType, 
  LeaveBalance, 
  LeaveRequest, 
  AppraisalCycle, 
  Appraisal, 
  AppraisalFeedback,
  Competency,
  CompanyHoliday,
  AppraisalTemplate,
  TemplateQuestion,
  FeedbackRating,
  CycleParticipant,
  PeerAssignment
} from "@shared/schema";

// Departments
export const departments: Department[] = [
  { id: "dept-1", name: "Engineering", description: "Software development and technical operations", managerId: "emp-1" },
  { id: "dept-2", name: "Human Resources", description: "People operations and talent management", managerId: "emp-4" },
  { id: "dept-3", name: "Marketing", description: "Brand, communications and growth", managerId: "emp-5" },
  { id: "dept-4", name: "Sales", description: "Revenue generation and client relationships", managerId: "emp-6" },
  { id: "dept-5", name: "Finance", description: "Financial planning and accounting", managerId: "emp-7" },
];

// Employees
export const employees: Employee[] = [
  {
    id: "emp-1",
    firstName: "Sarah",
    lastName: "Chen",
    email: "sarah.chen@company.com",
    phone: "+1 (555) 123-4567",
    departmentId: "dept-1",
    position: "VP of Engineering",
    managerId: null,
    hireDate: "2020-03-15",
    profileImageUrl: null,
    status: "active",
  },
  {
    id: "emp-2",
    firstName: "Marcus",
    lastName: "Johnson",
    email: "marcus.johnson@company.com",
    phone: "+1 (555) 234-5678",
    departmentId: "dept-1",
    position: "Senior Software Engineer",
    managerId: "emp-1",
    hireDate: "2021-06-01",
    profileImageUrl: null,
    status: "active",
  },
  {
    id: "emp-3",
    firstName: "Emily",
    lastName: "Rodriguez",
    email: "emily.rodriguez@company.com",
    phone: "+1 (555) 345-6789",
    departmentId: "dept-1",
    position: "Software Engineer",
    managerId: "emp-1",
    hireDate: "2022-01-10",
    profileImageUrl: null,
    status: "on_leave",
  },
  {
    id: "emp-4",
    firstName: "David",
    lastName: "Kim",
    email: "david.kim@company.com",
    phone: "+1 (555) 456-7890",
    departmentId: "dept-2",
    position: "HR Director",
    managerId: null,
    hireDate: "2019-08-20",
    profileImageUrl: null,
    status: "active",
  },
  {
    id: "emp-5",
    firstName: "Jessica",
    lastName: "Williams",
    email: "jessica.williams@company.com",
    phone: "+1 (555) 567-8901",
    departmentId: "dept-3",
    position: "Marketing Director",
    managerId: null,
    hireDate: "2020-11-05",
    profileImageUrl: null,
    status: "active",
  },
  {
    id: "emp-6",
    firstName: "Michael",
    lastName: "Brown",
    email: "michael.brown@company.com",
    phone: "+1 (555) 678-9012",
    departmentId: "dept-4",
    position: "Sales Director",
    managerId: null,
    hireDate: "2019-04-12",
    profileImageUrl: null,
    status: "active",
  },
  {
    id: "emp-7",
    firstName: "Amanda",
    lastName: "Taylor",
    email: "amanda.taylor@company.com",
    phone: "+1 (555) 789-0123",
    departmentId: "dept-5",
    position: "Finance Director",
    managerId: null,
    hireDate: "2018-09-01",
    profileImageUrl: null,
    status: "active",
  },
  {
    id: "emp-8",
    firstName: "James",
    lastName: "Wilson",
    email: "james.wilson@company.com",
    phone: "+1 (555) 890-1234",
    departmentId: "dept-1",
    position: "DevOps Engineer",
    managerId: "emp-1",
    hireDate: "2022-07-15",
    profileImageUrl: null,
    status: "active",
  },
  {
    id: "emp-9",
    firstName: "Lisa",
    lastName: "Anderson",
    email: "lisa.anderson@company.com",
    phone: "+1 (555) 901-2345",
    departmentId: "dept-2",
    position: "HR Specialist",
    managerId: "emp-4",
    hireDate: "2023-02-01",
    profileImageUrl: null,
    status: "active",
  },
  {
    id: "emp-10",
    firstName: "Robert",
    lastName: "Martinez",
    email: "robert.martinez@company.com",
    phone: "+1 (555) 012-3456",
    departmentId: "dept-3",
    position: "Content Strategist",
    managerId: "emp-5",
    hireDate: "2023-05-20",
    profileImageUrl: null,
    status: "inactive",
  },
];

// Leave Types
export const leaveTypes: LeaveType[] = [
  { id: "lt-1", name: "Annual Leave", description: "Paid vacation days", defaultDays: 20, color: "#3b82f6" },
  { id: "lt-2", name: "Sick Leave", description: "Medical leave for illness", defaultDays: 10, color: "#ef4444" },
  { id: "lt-3", name: "Personal Leave", description: "Personal time off", defaultDays: 5, color: "#8b5cf6" },
  { id: "lt-4", name: "Parental Leave", description: "Maternity/Paternity leave", defaultDays: 90, color: "#10b981" },
  { id: "lt-5", name: "Bereavement", description: "Leave for family loss", defaultDays: 5, color: "#6b7280" },
];

// Leave Balances (for current employee - emp-2)
export const leaveBalances: LeaveBalance[] = [
  { id: "lb-1", employeeId: "emp-2", leaveTypeId: "lt-1", totalDays: 20, usedDays: 8, remainingDays: 12, year: 2026 },
  { id: "lb-2", employeeId: "emp-2", leaveTypeId: "lt-2", totalDays: 10, usedDays: 2, remainingDays: 8, year: 2026 },
  { id: "lb-3", employeeId: "emp-2", leaveTypeId: "lt-3", totalDays: 5, usedDays: 1, remainingDays: 4, year: 2026 },
  { id: "lb-4", employeeId: "emp-2", leaveTypeId: "lt-4", totalDays: 90, usedDays: 0, remainingDays: 90, year: 2026 },
  { id: "lb-5", employeeId: "emp-2", leaveTypeId: "lt-5", totalDays: 5, usedDays: 0, remainingDays: 5, year: 2026 },
];

// Leave Requests
export const leaveRequests: LeaveRequest[] = [
  {
    id: "lr-1",
    employeeId: "emp-2",
    leaveTypeId: "lt-1",
    startDate: "2026-02-10",
    endDate: "2026-02-14",
    totalDays: 5,
    reason: "Family vacation",
    status: "approved",
    approverId: "emp-1",
    approverComment: "Enjoy your vacation!",
    createdAt: new Date("2026-01-15T10:00:00Z"),
  },
  {
    id: "lr-2",
    employeeId: "emp-3",
    leaveTypeId: "lt-2",
    startDate: "2026-01-28",
    endDate: "2026-02-03",
    totalDays: 5,
    reason: "Medical appointment and recovery",
    status: "approved",
    approverId: "emp-1",
    approverComment: "Get well soon!",
    createdAt: new Date("2026-01-25T09:00:00Z"),
  },
  {
    id: "lr-3",
    employeeId: "emp-8",
    leaveTypeId: "lt-1",
    startDate: "2026-03-01",
    endDate: "2026-03-05",
    totalDays: 5,
    reason: "Personal travel",
    status: "pending",
    approverId: null,
    approverComment: null,
    createdAt: new Date("2026-01-26T14:30:00Z"),
  },
  {
    id: "lr-4",
    employeeId: "emp-9",
    leaveTypeId: "lt-3",
    startDate: "2026-02-20",
    endDate: "2026-02-21",
    totalDays: 2,
    reason: "Moving to new apartment",
    status: "pending",
    approverId: null,
    approverComment: null,
    createdAt: new Date("2026-01-27T11:00:00Z"),
  },
  {
    id: "lr-5",
    employeeId: "emp-2",
    leaveTypeId: "lt-2",
    startDate: "2026-01-20",
    endDate: "2026-01-21",
    totalDays: 2,
    reason: "Doctor's appointment",
    status: "rejected",
    approverId: "emp-1",
    approverComment: "Please reschedule - critical project deadline",
    createdAt: new Date("2026-01-18T08:00:00Z"),
  },
];

// Competencies
export const competencies: Competency[] = [
  { id: "comp-1", name: "Technical Skills", description: "Proficiency in required technical areas", category: "Technical" },
  { id: "comp-2", name: "Problem Solving", description: "Ability to analyze and solve complex problems", category: "Technical" },
  { id: "comp-3", name: "Communication", description: "Clear and effective communication", category: "Soft Skills" },
  { id: "comp-4", name: "Teamwork", description: "Collaboration and team contribution", category: "Soft Skills" },
  { id: "comp-5", name: "Leadership", description: "Guiding and motivating others", category: "Leadership" },
  { id: "comp-6", name: "Initiative", description: "Self-motivation and proactivity", category: "Leadership" },
  { id: "comp-7", name: "Time Management", description: "Efficient use of time and meeting deadlines", category: "Professional" },
  { id: "comp-8", name: "Adaptability", description: "Flexibility in changing environments", category: "Professional" },
];

// Appraisal Templates
export const appraisalTemplates: AppraisalTemplate[] = [
  {
    id: "template-1",
    name: "Standard Performance Review",
    description: "General performance evaluation template for all roles",
    isDefault: 1,
    createdAt: new Date("2025-01-01T00:00:00Z"),
  },
  {
    id: "template-2",
    name: "Engineering Review",
    description: "Technical performance template with engineering-specific competencies",
    isDefault: 0,
    createdAt: new Date("2025-01-15T00:00:00Z"),
  },
  {
    id: "template-3",
    name: "Leadership Review",
    description: "Template for managers and team leads",
    isDefault: 0,
    createdAt: new Date("2025-02-01T00:00:00Z"),
  },
];

// Template Questions
export const templateQuestions: TemplateQuestion[] = [
  // Standard Performance Review questions
  { id: "q-1", templateId: "template-1", competencyId: "comp-3", questionText: "How effectively does this person communicate with team members?", questionType: "rating", order: 1 },
  { id: "q-2", templateId: "template-1", competencyId: "comp-4", questionText: "How well does this person collaborate with others on projects?", questionType: "rating", order: 2 },
  { id: "q-3", templateId: "template-1", competencyId: "comp-7", questionText: "How effectively does this person manage their time and meet deadlines?", questionType: "rating", order: 3 },
  { id: "q-4", templateId: "template-1", competencyId: "comp-8", questionText: "How well does this person adapt to changes in priorities or requirements?", questionType: "rating", order: 4 },
  { id: "q-5", templateId: "template-1", competencyId: null, questionText: "What are this person's greatest strengths?", questionType: "text", order: 5 },
  { id: "q-6", templateId: "template-1", competencyId: null, questionText: "What areas could this person improve on?", questionType: "text", order: 6 },
  // Engineering Review questions
  { id: "q-7", templateId: "template-2", competencyId: "comp-1", questionText: "How proficient is this person in their technical domain?", questionType: "rating", order: 1 },
  { id: "q-8", templateId: "template-2", competencyId: "comp-2", questionText: "How effectively does this person solve complex technical problems?", questionType: "rating", order: 2 },
  { id: "q-9", templateId: "template-2", competencyId: "comp-3", questionText: "How well does this person communicate technical concepts to others?", questionType: "rating", order: 3 },
  { id: "q-10", templateId: "template-2", competencyId: "comp-4", questionText: "How effectively does this person collaborate on code reviews and pair programming?", questionType: "rating", order: 4 },
  { id: "q-11", templateId: "template-2", competencyId: null, questionText: "Describe a specific technical contribution this person made that had significant impact.", questionType: "text", order: 5 },
  { id: "q-12", templateId: "template-2", competencyId: null, questionText: "What technical skills should this person focus on developing?", questionType: "text", order: 6 },
  // Leadership Review questions
  { id: "q-13", templateId: "template-3", competencyId: "comp-5", questionText: "How effectively does this person lead and motivate their team?", questionType: "rating", order: 1 },
  { id: "q-14", templateId: "template-3", competencyId: "comp-6", questionText: "How proactive is this person in identifying and addressing team needs?", questionType: "rating", order: 2 },
  { id: "q-15", templateId: "template-3", competencyId: "comp-3", questionText: "How well does this person communicate vision and expectations?", questionType: "rating", order: 3 },
  { id: "q-16", templateId: "template-3", competencyId: null, questionText: "Describe how this person has contributed to team development and growth.", questionType: "text", order: 4 },
];

// Appraisal Cycles
export const appraisalCycles: AppraisalCycle[] = [
  {
    id: "cycle-1",
    name: "Q4 2025 Performance Review",
    type: "180",
    templateId: "template-1",
    startDate: "2025-12-01",
    endDate: "2025-12-31",
    status: "completed",
    selfWeight: 10,
    peerWeight: 0,
    managerWeight: 90,
  },
  {
    id: "cycle-2",
    name: "Annual 360 Review 2026",
    type: "360",
    templateId: "template-2",
    startDate: "2026-01-15",
    endDate: "2026-02-15",
    status: "active",
    selfWeight: 10,
    peerWeight: 30,
    managerWeight: 60,
  },
  {
    id: "cycle-3",
    name: "Q1 2026 Performance Review",
    type: "180",
    templateId: "template-1",
    startDate: "2026-03-01",
    endDate: "2026-03-31",
    status: "draft",
    selfWeight: 15,
    peerWeight: 0,
    managerWeight: 85,
  },
];

// Cycle Participants (who is being reviewed in each cycle)
export const cycleParticipants: CycleParticipant[] = [
  // Q4 2025 - Engineering team
  { id: "cp-1", cycleId: "cycle-1", employeeId: "emp-2" },
  { id: "cp-2", cycleId: "cycle-1", employeeId: "emp-3" },
  // Annual 360 - Engineering team
  { id: "cp-3", cycleId: "cycle-2", employeeId: "emp-2" },
  { id: "cp-4", cycleId: "cycle-2", employeeId: "emp-3" },
  { id: "cp-5", cycleId: "cycle-2", employeeId: "emp-8" },
];

// Peer Assignments (who reviews whom for peer feedback in 360 cycles)
export const peerAssignments: PeerAssignment[] = [
  // Annual 360 - emp-2's peer reviewers
  { id: "pa-1", cycleId: "cycle-2", revieweeId: "emp-2", reviewerId: "emp-3" },
  { id: "pa-2", cycleId: "cycle-2", revieweeId: "emp-2", reviewerId: "emp-8" },
  // Annual 360 - emp-3's peer reviewers
  { id: "pa-3", cycleId: "cycle-2", revieweeId: "emp-3", reviewerId: "emp-2" },
  { id: "pa-4", cycleId: "cycle-2", revieweeId: "emp-3", reviewerId: "emp-8" },
  // Annual 360 - emp-8's peer reviewers
  { id: "pa-5", cycleId: "cycle-2", revieweeId: "emp-8", reviewerId: "emp-2" },
  { id: "pa-6", cycleId: "cycle-2", revieweeId: "emp-8", reviewerId: "emp-3" },
];

// Appraisals
export const appraisals: Appraisal[] = [
  { id: "apr-1", cycleId: "cycle-1", employeeId: "emp-2", status: "completed", overallRating: 4, createdAt: new Date("2025-12-01T00:00:00Z") },
  { id: "apr-2", cycleId: "cycle-1", employeeId: "emp-3", status: "completed", overallRating: 4, createdAt: new Date("2025-12-01T00:00:00Z") },
  { id: "apr-3", cycleId: "cycle-2", employeeId: "emp-2", status: "in_progress", overallRating: null, createdAt: new Date("2026-01-15T00:00:00Z") },
  { id: "apr-4", cycleId: "cycle-2", employeeId: "emp-8", status: "pending", overallRating: null, createdAt: new Date("2026-01-15T00:00:00Z") },
  { id: "apr-5", cycleId: "cycle-2", employeeId: "emp-9", status: "in_progress", overallRating: null, createdAt: new Date("2026-01-15T00:00:00Z") },
];

// Appraisal Feedback (review assignments)
export const appraisalFeedback: AppraisalFeedback[] = [
  // Completed Q4 2025 feedback for emp-2 (Marcus)
  {
    id: "fb-1",
    appraisalId: "apr-1",
    reviewerId: "emp-2",
    reviewerType: "self",
    overallComment: "Had a productive quarter with significant contributions to the main product. Led the redesign of the user authentication system and mentored two junior developers.",
    submittedAt: new Date("2025-12-15T10:00:00Z"),
    status: "submitted",
  },
  {
    id: "fb-2",
    appraisalId: "apr-1",
    reviewerId: "emp-1",
    reviewerType: "manager",
    overallComment: "Marcus has been a valuable team member. His technical skills are excellent, and he consistently delivers high-quality work. Looking forward to seeing more leadership from him in the coming year.",
    submittedAt: new Date("2025-12-20T14:00:00Z"),
    status: "submitted",
  },
  // Active 360 feedback for emp-2 (Marcus) - some pending, one draft
  {
    id: "fb-3",
    appraisalId: "apr-3",
    reviewerId: "emp-2",
    reviewerType: "self",
    overallComment: "Working on expanding my technical skills...",
    submittedAt: null,
    status: "draft",
  },
  {
    id: "fb-4",
    appraisalId: "apr-3",
    reviewerId: "emp-1",
    reviewerType: "manager",
    overallComment: null,
    submittedAt: null,
    status: "pending",
  },
  {
    id: "fb-5",
    appraisalId: "apr-3",
    reviewerId: "emp-3",
    reviewerType: "peer",
    overallComment: null,
    submittedAt: null,
    status: "pending",
  },
  {
    id: "fb-6",
    appraisalId: "apr-3",
    reviewerId: "emp-8",
    reviewerType: "peer",
    overallComment: null,
    submittedAt: null,
    status: "pending",
  },
  // Active 360 feedback for emp-8 (James) - emp-2 needs to review him
  {
    id: "fb-7",
    appraisalId: "apr-4",
    reviewerId: "emp-8",
    reviewerType: "self",
    overallComment: null,
    submittedAt: null,
    status: "pending",
  },
  {
    id: "fb-8",
    appraisalId: "apr-4",
    reviewerId: "emp-1",
    reviewerType: "manager",
    overallComment: null,
    submittedAt: null,
    status: "pending",
  },
  {
    id: "fb-9",
    appraisalId: "apr-4",
    reviewerId: "emp-2",
    reviewerType: "peer",
    overallComment: null,
    submittedAt: null,
    status: "pending",
  },
  {
    id: "fb-10",
    appraisalId: "apr-4",
    reviewerId: "emp-3",
    reviewerType: "peer",
    overallComment: null,
    submittedAt: null,
    status: "pending",
  },
];

// Feedback Ratings (completed ratings for Q4 2025 reviews)
export const feedbackRatings: FeedbackRating[] = [
  // Self-assessment ratings for fb-1 (Marcus self-review Q4 2025)
  { id: "fr-1", feedbackId: "fb-1", questionId: "q-1", rating: 4, textResponse: null },
  { id: "fr-2", feedbackId: "fb-1", questionId: "q-2", rating: 5, textResponse: null },
  { id: "fr-3", feedbackId: "fb-1", questionId: "q-3", rating: 4, textResponse: null },
  { id: "fr-4", feedbackId: "fb-1", questionId: "q-4", rating: 4, textResponse: null },
  { id: "fr-5", feedbackId: "fb-1", questionId: "q-5", rating: null, textResponse: "Strong problem-solving skills and ability to mentor others. Quick to learn new technologies." },
  { id: "fr-6", feedbackId: "fb-1", questionId: "q-6", rating: null, textResponse: "Could improve on delegation and sharing workload more evenly with the team." },
  // Manager ratings for fb-2 (Sarah reviewing Marcus Q4 2025)
  { id: "fr-7", feedbackId: "fb-2", questionId: "q-1", rating: 4, textResponse: null },
  { id: "fr-8", feedbackId: "fb-2", questionId: "q-2", rating: 5, textResponse: null },
  { id: "fr-9", feedbackId: "fb-2", questionId: "q-3", rating: 4, textResponse: null },
  { id: "fr-10", feedbackId: "fb-2", questionId: "q-4", rating: 4, textResponse: null },
  { id: "fr-11", feedbackId: "fb-2", questionId: "q-5", rating: null, textResponse: "Excellent technical skills and a natural ability to break down complex problems. Great at code reviews." },
  { id: "fr-12", feedbackId: "fb-2", questionId: "q-6", rating: null, textResponse: "Should take on more leadership responsibilities and be more proactive in cross-team collaboration." },
  // Draft ratings for fb-3 (Marcus self-review 360, in progress)
  { id: "fr-13", feedbackId: "fb-3", questionId: "q-7", rating: 4, textResponse: null },
  { id: "fr-14", feedbackId: "fb-3", questionId: "q-8", rating: 5, textResponse: null },
];

// Helper functions
export function getEmployeeById(id: string): Employee | undefined {
  return employees.find(e => e.id === id);
}

export function getDepartmentById(id: string): Department | undefined {
  return departments.find(d => d.id === id);
}

export function getLeaveTypeById(id: string): LeaveType | undefined {
  return leaveTypes.find(lt => lt.id === id);
}

export function getEmployeesByDepartment(departmentId: string): Employee[] {
  return employees.filter(e => e.departmentId === departmentId);
}

export function getLeaveRequestsByEmployee(employeeId: string): LeaveRequest[] {
  return leaveRequests.filter(lr => lr.employeeId === employeeId);
}

export function getPendingLeaveRequests(): LeaveRequest[] {
  return leaveRequests.filter(lr => lr.status === "pending");
}

export function getAppraisalsByEmployee(employeeId: string): Appraisal[] {
  return appraisals.filter(a => a.employeeId === employeeId);
}

export function getAppraisalCycleById(id: string): AppraisalCycle | undefined {
  return appraisalCycles.find(c => c.id === id);
}

export function getFeedbackByAppraisal(appraisalId: string): AppraisalFeedback[] {
  return appraisalFeedback.filter(f => f.appraisalId === appraisalId);
}

export function getTemplateById(id: string): AppraisalTemplate | undefined {
  return appraisalTemplates.find(t => t.id === id);
}

export function getQuestionsByTemplate(templateId: string): TemplateQuestion[] {
  return templateQuestions.filter(q => q.templateId === templateId).sort((a, b) => a.order - b.order);
}

export function getCompetencyById(id: string): Competency | undefined {
  return competencies.find(c => c.id === id);
}

export function getRatingsByFeedback(feedbackId: string): FeedbackRating[] {
  return feedbackRatings.filter(r => r.feedbackId === feedbackId);
}

export function getParticipantsByCycle(cycleId: string): CycleParticipant[] {
  return cycleParticipants.filter(p => p.cycleId === cycleId);
}

export function getPeerAssignmentsByCycle(cycleId: string): PeerAssignment[] {
  return peerAssignments.filter(p => p.cycleId === cycleId);
}

export function getPeerAssignmentsForReviewee(cycleId: string, revieweeId: string): PeerAssignment[] {
  return peerAssignments.filter(p => p.cycleId === cycleId && p.revieweeId === revieweeId);
}

// Get reviews that a user needs to complete (as reviewer)
export function getPendingReviewsForUser(userId: string): AppraisalFeedback[] {
  return appraisalFeedback.filter(f => 
    f.reviewerId === userId && 
    (f.status === "pending" || f.status === "draft")
  );
}

// Get reviews that have been completed by a user
export function getCompletedReviewsByUser(userId: string): AppraisalFeedback[] {
  return appraisalFeedback.filter(f => 
    f.reviewerId === userId && 
    f.status === "submitted"
  );
}

// Get reviews received by a user (reviews about them)
export function getReceivedReviewsForUser(userId: string): AppraisalFeedback[] {
  const userAppraisals = appraisals.filter(a => a.employeeId === userId);
  const appraisalIds = userAppraisals.map(a => a.id);
  return appraisalFeedback.filter(f => 
    appraisalIds.includes(f.appraisalId) && 
    f.status === "submitted"
  );
}

// Calculate weighted average score for an appraisal
export function calculateAppraisalScore(appraisalId: string): number | null {
  const appraisal = appraisals.find(a => a.id === appraisalId);
  if (!appraisal) return null;
  
  const cycle = getAppraisalCycleById(appraisal.cycleId);
  if (!cycle) return null;
  
  const feedback = getFeedbackByAppraisal(appraisalId).filter(f => f.status === "submitted");
  if (feedback.length === 0) return null;
  
  let selfScore = 0, peerScore = 0, managerScore = 0;
  let selfCount = 0, peerCount = 0, managerCount = 0;
  
  feedback.forEach(f => {
    const ratings = getRatingsByFeedback(f.id).filter(r => r.rating !== null);
    if (ratings.length === 0) return;
    
    const avgRating = ratings.reduce((sum, r) => sum + (r.rating || 0), 0) / ratings.length;
    
    if (f.reviewerType === "self") {
      selfScore += avgRating;
      selfCount++;
    } else if (f.reviewerType === "peer") {
      peerScore += avgRating;
      peerCount++;
    } else if (f.reviewerType === "manager") {
      managerScore += avgRating;
      managerCount++;
    }
  });
  
  let weightedSum = 0;
  let totalWeight = 0;
  
  if (selfCount > 0) {
    weightedSum += (selfScore / selfCount) * cycle.selfWeight;
    totalWeight += cycle.selfWeight;
  }
  if (peerCount > 0) {
    weightedSum += (peerScore / peerCount) * cycle.peerWeight;
    totalWeight += cycle.peerWeight;
  }
  if (managerCount > 0) {
    weightedSum += (managerScore / managerCount) * cycle.managerWeight;
    totalWeight += cycle.managerWeight;
  }
  
  return totalWeight > 0 ? weightedSum / totalWeight : null;
}

export function getFeedbackById(id: string): AppraisalFeedback | undefined {
  return appraisalFeedback.find(f => f.id === id);
}

export function getAppraisalById(id: string): Appraisal | undefined {
  return appraisals.find(a => a.id === id);
}

// Company Holidays
export const companyHolidays: CompanyHoliday[] = [
  { id: "hol-1", name: "New Year's Day", date: "2026-01-01", year: 2026 },
  { id: "hol-2", name: "Martin Luther King Jr. Day", date: "2026-01-19", year: 2026 },
  { id: "hol-3", name: "Presidents' Day", date: "2026-02-16", year: 2026 },
  { id: "hol-4", name: "Memorial Day", date: "2026-05-25", year: 2026 },
  { id: "hol-5", name: "Independence Day", date: "2026-07-03", year: 2026 },
  { id: "hol-6", name: "Labor Day", date: "2026-09-07", year: 2026 },
  { id: "hol-7", name: "Thanksgiving", date: "2026-11-26", year: 2026 },
  { id: "hol-8", name: "Day After Thanksgiving", date: "2026-11-27", year: 2026 },
  { id: "hol-9", name: "Christmas Eve", date: "2026-12-24", year: 2026 },
  { id: "hol-10", name: "Christmas Day", date: "2026-12-25", year: 2026 },
];

export function getCompanyHolidaysByYear(year: number): CompanyHoliday[] {
  return companyHolidays.filter(h => h.year === year);
}

// Current logged in user (for demo)
export const currentUser = employees[1]; // Marcus Johnson - emp-2
