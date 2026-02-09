import { createContext, useContext, ReactNode } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, getQueryFn } from "./queryClient";
import { useLocation } from "wouter";

export type UserRole = "employee" | "manager" | "admin";

export interface AuthEmployee {
  id: string;
  companyId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  departmentId: string | null;
  position: string;
  managerId: string | null;
  hireDate: string | null;
  profileImageUrl: string | null;
  status: string;
  role: UserRole;
  createdAt: string;
}

interface AuthContextType {
  employee: AuthEmployee | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  role: UserRole;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [, setLocation] = useLocation();

  const { data, isLoading } = useQuery<{ employee: AuthEmployee } | null>({
    queryKey: ["/api/auth/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const employee = data?.employee ?? null;
  const isAuthenticated = !!employee;
  const role = employee?.role ?? "employee";

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const res = await apiRequest("POST", "/api/auth/login", { email, password });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      queryClient.clear();
      setLocation("/login");
    },
  });

  const login = async (email: string, password: string) => {
    await loginMutation.mutateAsync({ email, password });
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  return (
    <AuthContext.Provider value={{ employee, isLoading, isAuthenticated, role, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
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
