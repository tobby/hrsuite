import { createContext, useContext, ReactNode } from "react";
import { useAuth, AuthEmployee } from "./auth-context";

export type UserRole = "employee" | "manager" | "admin" | "contract";

interface RoleContextType {
  role: UserRole;
  currentUser: AuthEmployee;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  const { employee, role } = useAuth();

  if (!employee) {
    return null;
  }

  return (
    <RoleContext.Provider value={{ role: role as UserRole, currentUser: employee }}>
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

export function canAccessLD(role: UserRole): boolean {
  return role !== "contract";
}
