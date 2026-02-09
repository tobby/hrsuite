import { createContext, useContext, useState, ReactNode } from "react";
import { employees } from "./demo-data";
import type { Employee } from "@shared/schema";

export type UserRole = "employee" | "manager" | "admin" | "contract";

interface RoleContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  currentUser: Employee;
}

// Demo users for each role
export const demoUsers: Record<UserRole, Employee> = {
  employee: employees.find(e => e.id === "emp-3")!, // Emily Rodriguez - Software Engineer
  manager: employees.find(e => e.id === "emp-1")!,  // Sarah Chen - VP of Engineering
  admin: employees.find(e => e.id === "emp-4")!,    // David Kim - HR Director
  contract: employees.find(e => e.id === "emp-3")!, // Reuses employee demo user for contract role
};

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<UserRole>("employee");

  const currentUser = demoUsers[role];

  return (
    <RoleContext.Provider value={{ role, setRole, currentUser }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error("useRole must be used within a RoleProvider");
  }
  return context;
}

// Helper to check permissions
export function canApproveLeave(role: UserRole): boolean {
  return role === "manager" || role === "admin";
}

export function canManageEmployees(role: UserRole): boolean {
  return role === "admin";
}

export function canCreateAppraisalCycles(role: UserRole): boolean {
  return role === "admin";
}

export function canViewAllRequests(role: UserRole): boolean {
  return role === "manager" || role === "admin";
}

export function canEditOrgSettings(role: UserRole): boolean {
  return role === "admin";
}

export function canAccessLeave(role: UserRole): boolean {
  return role !== "contract";
}
