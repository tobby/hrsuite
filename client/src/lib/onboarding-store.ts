import { create } from "zustand";

export interface OnboardingTask {
  id: string;
  title: string;
  description: string;
  category: "it_setup" | "hr_paperwork" | "training" | "team_introduction" | "compliance" | "general";
  isRequired: boolean;
  dueOffsetDays: number;
}

export interface OnboardingTemplate {
  id: string;
  name: string;
  description: string;
  departmentId: string | null;
  tasks: OnboardingTask[];
  createdAt: Date;
  isDefault: boolean;
}

export interface AssignedTask {
  id: string;
  taskId: string;
  title: string;
  description: string;
  category: OnboardingTask["category"];
  isRequired: boolean;
  isCompleted: boolean;
  completedAt: Date | null;
  dueDate: Date;
}

export interface OnboardingAssignment {
  id: string;
  employeeId: string;
  templateId: string;
  templateName: string;
  assignedBy: string;
  startDate: Date;
  tasks: AssignedTask[];
  status: "in_progress" | "completed" | "overdue";
  createdAt: Date;
}

const categoryLabels: Record<OnboardingTask["category"], string> = {
  it_setup: "IT Setup",
  hr_paperwork: "HR Paperwork",
  training: "Training",
  team_introduction: "Team Introduction",
  compliance: "Compliance",
  general: "General",
};

export { categoryLabels };

const demoTemplates: OnboardingTemplate[] = [
  {
    id: "tmpl-1",
    name: "Standard Onboarding",
    description: "Default checklist for all new hires",
    departmentId: null,
    isDefault: true,
    createdAt: new Date("2025-06-01"),
    tasks: [
      { id: "task-1", title: "Set up company email account", description: "Create corporate email and configure on devices", category: "it_setup", isRequired: true, dueOffsetDays: 1 },
      { id: "task-2", title: "Issue laptop and equipment", description: "Provide company laptop, monitor, keyboard and mouse", category: "it_setup", isRequired: true, dueOffsetDays: 1 },
      { id: "task-3", title: "Configure VPN and security access", description: "Set up VPN client and configure MFA", category: "it_setup", isRequired: true, dueOffsetDays: 2 },
      { id: "task-4", title: "Grant system access permissions", description: "Set up access to internal tools, repos, and dashboards", category: "it_setup", isRequired: true, dueOffsetDays: 2 },
      { id: "task-5", title: "Submit employment contract", description: "Sign and submit the employment contract and offer letter", category: "hr_paperwork", isRequired: true, dueOffsetDays: 1 },
      { id: "task-6", title: "Complete tax forms", description: "Fill out W-4 and state tax withholding forms", category: "hr_paperwork", isRequired: true, dueOffsetDays: 3 },
      { id: "task-7", title: "Set up direct deposit", description: "Provide banking details for salary payments", category: "hr_paperwork", isRequired: true, dueOffsetDays: 5 },
      { id: "task-8", title: "Enroll in benefits", description: "Select health insurance, dental, and other benefit plans", category: "hr_paperwork", isRequired: false, dueOffsetDays: 14 },
      { id: "task-9", title: "Emergency contact information", description: "Submit emergency contact details to HR", category: "hr_paperwork", isRequired: true, dueOffsetDays: 3 },
      { id: "task-10", title: "Company orientation session", description: "Attend company history, values, and culture presentation", category: "training", isRequired: true, dueOffsetDays: 3 },
      { id: "task-11", title: "HR policies overview", description: "Review employee handbook and acknowledge key policies", category: "training", isRequired: true, dueOffsetDays: 5 },
      { id: "task-12", title: "Safety and compliance training", description: "Complete workplace safety and compliance modules", category: "compliance", isRequired: true, dueOffsetDays: 7 },
      { id: "task-13", title: "Data protection training", description: "Complete GDPR/data privacy awareness training", category: "compliance", isRequired: true, dueOffsetDays: 7 },
      { id: "task-14", title: "Anti-harassment training", description: "Complete workplace harassment prevention course", category: "compliance", isRequired: true, dueOffsetDays: 10 },
      { id: "task-15", title: "Meet with direct manager", description: "Introductory meeting with reporting manager to discuss role expectations", category: "team_introduction", isRequired: true, dueOffsetDays: 1 },
      { id: "task-16", title: "Team meet and greet", description: "Schedule introductions with all team members", category: "team_introduction", isRequired: true, dueOffsetDays: 3 },
      { id: "task-17", title: "Assign onboarding buddy", description: "Get paired with an onboarding buddy for first month", category: "team_introduction", isRequired: false, dueOffsetDays: 2 },
      { id: "task-18", title: "Office tour", description: "Tour of office facilities, meeting rooms, and common areas", category: "general", isRequired: true, dueOffsetDays: 1 },
      { id: "task-19", title: "Set up profile on internal directory", description: "Upload photo and bio to the employee directory", category: "general", isRequired: false, dueOffsetDays: 5 },
      { id: "task-20", title: "30-day check-in meeting", description: "Schedule 30-day performance and satisfaction check-in", category: "general", isRequired: true, dueOffsetDays: 30 },
    ],
  },
  {
    id: "tmpl-2",
    name: "Engineering Onboarding",
    description: "Additional technical onboarding for engineering team members",
    departmentId: "dept-1",
    isDefault: false,
    createdAt: new Date("2025-07-15"),
    tasks: [
      { id: "task-e1", title: "Set up development environment", description: "Install IDE, compilers, and required dev tools", category: "it_setup", isRequired: true, dueOffsetDays: 2 },
      { id: "task-e2", title: "Access code repositories", description: "Set up GitHub/GitLab access and clone key repos", category: "it_setup", isRequired: true, dueOffsetDays: 2 },
      { id: "task-e3", title: "CI/CD pipeline overview", description: "Walkthrough of build, test, and deployment pipelines", category: "training", isRequired: true, dueOffsetDays: 5 },
      { id: "task-e4", title: "Architecture review session", description: "Deep-dive into system architecture with senior engineer", category: "training", isRequired: true, dueOffsetDays: 7 },
      { id: "task-e5", title: "Code review standards", description: "Review coding standards and PR review process", category: "training", isRequired: true, dueOffsetDays: 5 },
      { id: "task-e6", title: "First ticket assignment", description: "Complete a starter ticket to familiarize with workflow", category: "general", isRequired: false, dueOffsetDays: 10 },
      { id: "task-e7", title: "Security best practices", description: "Complete secure coding practices training", category: "compliance", isRequired: true, dueOffsetDays: 10 },
    ],
  },
  {
    id: "tmpl-3",
    name: "Sales Onboarding",
    description: "Sales-specific onboarding for new sales team members",
    departmentId: "dept-4",
    isDefault: false,
    createdAt: new Date("2025-08-01"),
    tasks: [
      { id: "task-s1", title: "CRM system training", description: "Set up CRM account and complete platform training", category: "it_setup", isRequired: true, dueOffsetDays: 3 },
      { id: "task-s2", title: "Product knowledge training", description: "Complete product catalog and feature deep-dive", category: "training", isRequired: true, dueOffsetDays: 7 },
      { id: "task-s3", title: "Sales methodology training", description: "Learn company sales process and pitch framework", category: "training", isRequired: true, dueOffsetDays: 10 },
      { id: "task-s4", title: "Territory/account assignment", description: "Receive territory or account portfolio assignment", category: "general", isRequired: true, dueOffsetDays: 5 },
      { id: "task-s5", title: "Shadow senior sales rep", description: "Observe 3 client meetings with an experienced team member", category: "team_introduction", isRequired: true, dueOffsetDays: 14 },
    ],
  },
];

function createAssignedTasks(template: OnboardingTemplate, startDate: Date): AssignedTask[] {
  return template.tasks.map((task, index) => {
    const dueDate = new Date(startDate);
    dueDate.setDate(dueDate.getDate() + task.dueOffsetDays);
    return {
      id: `assigned-${template.id}-${index}`,
      taskId: task.id,
      title: task.title,
      description: task.description,
      category: task.category,
      isRequired: task.isRequired,
      isCompleted: false,
      completedAt: null,
      dueDate,
    };
  });
}

const emp3StartDate = new Date("2026-01-20");
const emp3Tasks = createAssignedTasks(demoTemplates[0], emp3StartDate);
emp3Tasks[0].isCompleted = true;
emp3Tasks[0].completedAt = new Date("2026-01-20T09:30:00Z");
emp3Tasks[1].isCompleted = true;
emp3Tasks[1].completedAt = new Date("2026-01-20T10:00:00Z");
emp3Tasks[4].isCompleted = true;
emp3Tasks[4].completedAt = new Date("2026-01-20T11:00:00Z");
emp3Tasks[14].isCompleted = true;
emp3Tasks[14].completedAt = new Date("2026-01-20T14:00:00Z");
emp3Tasks[17].isCompleted = true;
emp3Tasks[17].completedAt = new Date("2026-01-21T09:00:00Z");
emp3Tasks[9].isCompleted = true;
emp3Tasks[9].completedAt = new Date("2026-01-22T10:00:00Z");

const emp10StartDate = new Date("2026-01-27");
const emp10Tasks = createAssignedTasks(demoTemplates[0], emp10StartDate);
emp10Tasks[0].isCompleted = true;
emp10Tasks[0].completedAt = new Date("2026-01-27T09:00:00Z");
emp10Tasks[1].isCompleted = true;
emp10Tasks[1].completedAt = new Date("2026-01-27T10:00:00Z");

const demoAssignments: OnboardingAssignment[] = [
  {
    id: "onb-1",
    employeeId: "emp-3",
    templateId: "tmpl-1",
    templateName: "Standard Onboarding",
    assignedBy: "emp-4",
    startDate: emp3StartDate,
    tasks: emp3Tasks,
    status: "in_progress",
    createdAt: new Date("2026-01-18"),
  },
  {
    id: "onb-2",
    employeeId: "emp-10",
    templateId: "tmpl-1",
    templateName: "Standard Onboarding",
    assignedBy: "emp-4",
    startDate: emp10StartDate,
    tasks: emp10Tasks,
    status: "in_progress",
    createdAt: new Date("2026-01-25"),
  },
];

interface OnboardingStore {
  templates: OnboardingTemplate[];
  assignments: OnboardingAssignment[];
  addTemplate: (template: Omit<OnboardingTemplate, "id" | "createdAt">) => void;
  updateTemplate: (id: string, updates: Partial<OnboardingTemplate>) => void;
  deleteTemplate: (id: string) => void;
  assignOnboarding: (employeeId: string, templateId: string, assignedBy: string, startDate: Date) => void;
  toggleTask: (assignmentId: string, taskId: string) => void;
  getAssignmentForEmployee: (employeeId: string) => OnboardingAssignment | undefined;
  getAssignmentProgress: (assignmentId: string) => { completed: number; total: number; percentage: number };
}

export const useOnboardingStore = create<OnboardingStore>((set, get) => ({
  templates: demoTemplates,
  assignments: demoAssignments,

  addTemplate: (template) => {
    const newTemplate: OnboardingTemplate = {
      ...template,
      id: `tmpl-${Date.now()}`,
      createdAt: new Date(),
    };
    set((state) => ({ templates: [...state.templates, newTemplate] }));
  },

  updateTemplate: (id, updates) => {
    set((state) => ({
      templates: state.templates.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }));
  },

  deleteTemplate: (id) => {
    set((state) => ({
      templates: state.templates.filter((t) => t.id !== id),
    }));
  },

  assignOnboarding: (employeeId, templateId, assignedBy, startDate) => {
    const template = get().templates.find((t) => t.id === templateId);
    if (!template) return;
    const tasks = createAssignedTasks(template, startDate);
    const assignment: OnboardingAssignment = {
      id: `onb-${Date.now()}`,
      employeeId,
      templateId,
      templateName: template.name,
      assignedBy,
      startDate,
      tasks,
      status: "in_progress",
      createdAt: new Date(),
    };
    set((state) => ({ assignments: [...state.assignments, assignment] }));
  },

  toggleTask: (assignmentId, taskId) => {
    set((state) => ({
      assignments: state.assignments.map((a) => {
        if (a.id !== assignmentId) return a;
        const updatedTasks = a.tasks.map((t) => {
          if (t.id !== taskId) return t;
          const isCompleted = !t.isCompleted;
          return { ...t, isCompleted, completedAt: isCompleted ? new Date() : null };
        });
        const allDone = updatedTasks.every((t) => t.isCompleted);
        return { ...a, tasks: updatedTasks, status: allDone ? "completed" as const : "in_progress" as const };
      }),
    }));
  },

  getAssignmentForEmployee: (employeeId) => {
    return get().assignments.find((a) => a.employeeId === employeeId);
  },

  getAssignmentProgress: (assignmentId) => {
    const assignment = get().assignments.find((a) => a.id === assignmentId);
    if (!assignment) return { completed: 0, total: 0, percentage: 0 };
    const completed = assignment.tasks.filter((t) => t.isCompleted).length;
    const total = assignment.tasks.length;
    return { completed, total, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 };
  },
}));
