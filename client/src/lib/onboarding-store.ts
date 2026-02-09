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

const demoTemplates: OnboardingTemplate[] = [];

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

const demoAssignments: OnboardingAssignment[] = [];

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
