import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCompanySchema, insertDepartmentSchema, insertEmployeeSchema } from "@shared/schema";
import bcrypt from "bcryptjs";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ==================== AUTH ROUTES ====================

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const employee = await storage.getEmployeeByEmail(email);
      if (!employee || !employee.passwordHash) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const isValid = await bcrypt.compare(password, employee.passwordHash);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      if (employee.status === "inactive") {
        return res.status(403).json({ message: "Your account has been deactivated" });
      }

      (req.session as any).employeeId = employee.id;
      (req.session as any).companyId = employee.companyId;
      (req.session as any).role = employee.role;

      const { passwordHash, inviteToken, inviteExpiresAt, ...safeEmployee } = employee;
      return res.json({ employee: safeEmployee });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) return res.status(500).json({ message: "Failed to logout" });
      res.clearCookie("connect.sid");
      return res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", async (req: Request, res: Response) => {
    const employeeId = (req.session as any)?.employeeId;
    if (!employeeId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const employee = await storage.getEmployee(employeeId);
    if (!employee) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const { passwordHash, inviteToken, inviteExpiresAt, ...safeEmployee } = employee;
    return res.json({ employee: safeEmployee });
  });

  // ==================== INVITE ROUTES ====================

  app.get("/api/invite/:token", async (req: Request, res: Response) => {
    try {
      const employee = await storage.getEmployeeByInviteToken(req.params.token);
      if (!employee) {
        return res.status(404).json({ message: "Invalid or expired invite link" });
      }

      if (employee.inviteExpiresAt && new Date() > employee.inviteExpiresAt) {
        return res.status(410).json({ message: "Invite link has expired" });
      }

      if (employee.status !== "invited") {
        return res.status(400).json({ message: "This invite has already been used" });
      }

      const company = await storage.getCompany(employee.companyId);
      return res.json({
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        position: employee.position,
        companyName: company?.name || "",
      });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/invite/:token/accept", async (req: Request, res: Response) => {
    try {
      const { password } = req.body;
      if (!password || password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }

      const employee = await storage.getEmployeeByInviteToken(req.params.token);
      if (!employee) {
        return res.status(404).json({ message: "Invalid or expired invite link" });
      }

      if (employee.inviteExpiresAt && new Date() > employee.inviteExpiresAt) {
        return res.status(410).json({ message: "Invite link has expired" });
      }

      if (employee.status !== "invited") {
        return res.status(400).json({ message: "This invite has already been used" });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      await storage.updateEmployee(employee.id, {
        passwordHash,
        status: "active",
        inviteToken: null,
        inviteExpiresAt: null,
      });

      (req.session as any).employeeId = employee.id;
      (req.session as any).companyId = employee.companyId;
      (req.session as any).role = employee.role;

      return res.json({ message: "Account activated successfully" });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // ==================== COMPANY SETUP ROUTE ====================

  app.post("/api/setup", async (req: Request, res: Response) => {
    try {
      const { companyName, firstName, lastName, email, password } = req.body;

      if (!companyName || !firstName || !lastName || !email || !password) {
        return res.status(400).json({ message: "All fields are required" });
      }

      if (password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }

      const existingEmployee = await storage.getEmployeeByEmail(email);
      if (existingEmployee) {
        return res.status(400).json({ message: "An account with this email already exists" });
      }

      const company = await storage.createCompany({ name: companyName });

      const passwordHash = await bcrypt.hash(password, 10);
      const admin = await storage.createEmployee({
        companyId: company.id,
        firstName,
        lastName,
        email,
        position: "Administrator",
        role: "admin",
        status: "active",
      });

      await storage.updateEmployee(admin.id, { passwordHash });

      (req.session as any).employeeId = admin.id;
      (req.session as any).companyId = company.id;
      (req.session as any).role = "admin";

      return res.status(201).json({ company, message: "Company created successfully" });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // ==================== AUTH MIDDLEWARE ====================

  function requireAuth(req: Request, res: Response, next: NextFunction) {
    const employeeId = (req.session as any)?.employeeId;
    if (!employeeId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    next();
  }

  function requireAdmin(req: Request, res: Response, next: NextFunction) {
    const role = (req.session as any)?.role;
    if (role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }
    next();
  }

  function requireManagerOrAdmin(req: Request, res: Response, next: NextFunction) {
    const role = (req.session as any)?.role;
    if (role !== "admin" && role !== "manager") {
      return res.status(403).json({ message: "Manager or admin access required" });
    }
    next();
  }

  // ==================== COMPANY ROUTES ====================

  app.get("/api/company", requireAuth, async (req: Request, res: Response) => {
    try {
      const companyId = (req.session as any).companyId;
      const company = await storage.getCompany(companyId);
      if (!company) return res.status(404).json({ message: "Company not found" });
      return res.json(company);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/company", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const companyId = (req.session as any).companyId;
      const company = await storage.updateCompany(companyId, req.body);
      if (!company) return res.status(404).json({ message: "Company not found" });
      return res.json(company);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // ==================== DEPARTMENT ROUTES ====================

  app.get("/api/departments", requireAuth, async (req: Request, res: Response) => {
    try {
      const companyId = (req.session as any).companyId;
      const depts = await storage.getDepartmentsByCompany(companyId);
      return res.json(depts);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/departments", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const companyId = (req.session as any).companyId;
      const parsed = insertDepartmentSchema.safeParse({ ...req.body, companyId });
      if (!parsed.success) {
        return res.status(400).json({ message: "Validation failed", errors: parsed.error.flatten() });
      }
      const department = await storage.createDepartment(parsed.data);
      return res.status(201).json(department);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/departments/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const department = await storage.updateDepartment(req.params.id, req.body);
      if (!department) return res.status(404).json({ message: "Department not found" });
      return res.json(department);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/departments/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const deleted = await storage.deleteDepartment(req.params.id);
      if (!deleted) return res.status(404).json({ message: "Department not found" });
      return res.json({ message: "Department deleted" });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // ==================== EMPLOYEE ROUTES ====================

  app.get("/api/employees", requireAuth, async (req: Request, res: Response) => {
    try {
      const companyId = (req.session as any).companyId;
      const emps = await storage.getEmployeesByCompany(companyId);
      const safeEmps = emps.map(({ passwordHash, inviteToken, inviteExpiresAt, ...rest }) => rest);
      return res.json(safeEmps);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/employees/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const employee = await storage.getEmployee(req.params.id);
      if (!employee) return res.status(404).json({ message: "Employee not found" });
      const { passwordHash, inviteToken, inviteExpiresAt, ...safeEmployee } = employee;
      return res.json(safeEmployee);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/employees", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const companyId = (req.session as any).companyId;
      const parsed = insertEmployeeSchema.safeParse({ ...req.body, companyId });
      if (!parsed.success) {
        return res.status(400).json({ message: "Validation failed", errors: parsed.error.flatten() });
      }

      const existingEmployee = await storage.getEmployeeByEmail(parsed.data.email);
      if (existingEmployee) {
        return res.status(400).json({ message: "An employee with this email already exists" });
      }

      const employee = await storage.createEmployee({
        ...parsed.data,
        status: "invited",
      });

      const inviteToken = await storage.generateInviteToken(employee.id);

      const { passwordHash, inviteExpiresAt, ...safeEmployee } = employee;
      return res.status(201).json({
        employee: { ...safeEmployee, inviteToken: undefined },
        inviteLink: `/invite/${inviteToken}`,
      });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/employees/:id", requireAuth, requireManagerOrAdmin, async (req: Request, res: Response) => {
    try {
      const { passwordHash, inviteToken, inviteExpiresAt, companyId, id, createdAt, ...updateData } = req.body;
      const employee = await storage.updateEmployee(req.params.id, updateData);
      if (!employee) return res.status(404).json({ message: "Employee not found" });
      const { passwordHash: ph, inviteToken: it, inviteExpiresAt: ie, ...safeEmployee } = employee;
      return res.json(safeEmployee);
    } catch (error) {
      console.error("Error updating employee:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/employees/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const deleted = await storage.deleteEmployee(req.params.id);
      if (!deleted) return res.status(404).json({ message: "Employee not found" });
      return res.json({ message: "Employee deleted" });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/employees/:id/reinvite", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const employee = await storage.getEmployee(req.params.id);
      if (!employee) return res.status(404).json({ message: "Employee not found" });
      if (employee.status !== "invited") {
        return res.status(400).json({ message: "Employee has already accepted their invite" });
      }

      const inviteToken = await storage.generateInviteToken(employee.id);
      return res.json({ inviteLink: `/invite/${inviteToken}` });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  return httpServer;
}
