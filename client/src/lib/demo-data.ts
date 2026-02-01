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
  CompanyHoliday
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

// Appraisal Cycles
export const appraisalCycles: AppraisalCycle[] = [
  {
    id: "cycle-1",
    name: "Q4 2025 Performance Review",
    type: "180",
    startDate: "2025-12-01",
    endDate: "2025-12-31",
    status: "completed",
  },
  {
    id: "cycle-2",
    name: "Annual 360 Review 2026",
    type: "360",
    startDate: "2026-01-15",
    endDate: "2026-02-15",
    status: "active",
  },
  {
    id: "cycle-3",
    name: "Q1 2026 Performance Review",
    type: "180",
    startDate: "2026-03-01",
    endDate: "2026-03-31",
    status: "draft",
  },
];

// Appraisals
export const appraisals: Appraisal[] = [
  { id: "apr-1", cycleId: "cycle-1", employeeId: "emp-2", status: "completed", overallRating: 4, createdAt: new Date("2025-12-01T00:00:00Z") },
  { id: "apr-2", cycleId: "cycle-1", employeeId: "emp-3", status: "completed", overallRating: 4, createdAt: new Date("2025-12-01T00:00:00Z") },
  { id: "apr-3", cycleId: "cycle-2", employeeId: "emp-2", status: "in_progress", overallRating: null, createdAt: new Date("2026-01-15T00:00:00Z") },
  { id: "apr-4", cycleId: "cycle-2", employeeId: "emp-8", status: "pending", overallRating: null, createdAt: new Date("2026-01-15T00:00:00Z") },
  { id: "apr-5", cycleId: "cycle-2", employeeId: "emp-9", status: "in_progress", overallRating: null, createdAt: new Date("2026-01-15T00:00:00Z") },
];

// Appraisal Feedback
export const appraisalFeedback: AppraisalFeedback[] = [
  {
    id: "fb-1",
    appraisalId: "apr-1",
    reviewerId: "emp-2",
    reviewerType: "self",
    overallComment: "Had a productive quarter with significant contributions to the main product.",
    submittedAt: new Date("2025-12-15T10:00:00Z"),
    status: "submitted",
  },
  {
    id: "fb-2",
    appraisalId: "apr-1",
    reviewerId: "emp-1",
    reviewerType: "manager",
    overallComment: "Marcus has been a valuable team member. Looking forward to seeing more leadership from him.",
    submittedAt: new Date("2025-12-20T14:00:00Z"),
    status: "submitted",
  },
  {
    id: "fb-3",
    appraisalId: "apr-3",
    reviewerId: "emp-2",
    reviewerType: "self",
    overallComment: null,
    submittedAt: null,
    status: "pending",
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
