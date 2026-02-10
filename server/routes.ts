import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCompanySchema, insertDepartmentSchema, insertEmployeeSchema, insertLeaveTypeSchema, insertLeaveRequestSchema } from "@shared/schema";
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

  async function requireAuth(req: Request, res: Response, next: NextFunction) {
    const employeeId = (req.session as any)?.employeeId;
    if (!employeeId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    try {
      const employee = await storage.getEmployee(employeeId);
      if (!employee || employee.status === "inactive") {
        req.session.destroy(() => {});
        return res.status(401).json({ message: "Account no longer active" });
      }
      (req.session as any).role = employee.role;
      (req.session as any).companyId = employee.companyId;
    } catch (error) {
      return res.status(500).json({ message: "Authentication check failed" });
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

  app.patch("/api/profile", requireAuth, async (req: Request, res: Response) => {
    try {
      const employeeId = (req.session as any)?.employeeId;
      const { firstName, lastName, phone } = req.body;
      const updateData: Record<string, string> = {};
      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (phone !== undefined) updateData.phone = phone;

      const employee = await storage.updateEmployee(employeeId, updateData);
      if (!employee) return res.status(404).json({ message: "Employee not found" });
      const { passwordHash, inviteToken, inviteExpiresAt, ...safeEmployee } = employee;
      return res.json({ employee: safeEmployee });
    } catch (error) {
      console.error("Error updating profile:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/employees/:id", requireAuth, requireManagerOrAdmin, async (req: Request, res: Response) => {
    try {
      const { passwordHash, inviteToken, inviteExpiresAt, companyId, id, createdAt, ...updateData } = req.body;
      if (updateData.employeeId) {
        const existing = await storage.getEmployeeByEmployeeId(updateData.employeeId);
        if (existing && existing.id !== req.params.id) {
          return res.status(400).json({ message: "An employee with this ID already exists" });
        }
      }
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

  // ==================== LEAVE TYPE ROUTES ====================

  app.get("/api/leave-types", requireAuth, async (req: Request, res: Response) => {
    try {
      const companyId = (req.session as any).companyId;
      const types = await storage.getLeaveTypesByCompany(companyId);
      return res.json(types);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/leave-types", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const companyId = (req.session as any).companyId;
      const parsed = insertLeaveTypeSchema.safeParse({ ...req.body, companyId });
      if (!parsed.success) {
        return res.status(400).json({ message: "Validation failed", errors: parsed.error.flatten() });
      }
      const leaveType = await storage.createLeaveType(parsed.data);
      return res.status(201).json(leaveType);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/leave-types/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const leaveType = await storage.updateLeaveType(req.params.id, req.body);
      if (!leaveType) return res.status(404).json({ message: "Leave type not found" });
      return res.json(leaveType);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/leave-types/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const deleted = await storage.deleteLeaveType(req.params.id);
      if (!deleted) return res.status(404).json({ message: "Leave type not found" });
      return res.json({ message: "Leave type deleted" });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // ==================== LEAVE BALANCE ROUTES ====================

  app.get("/api/leave-balances", requireAuth, async (req: Request, res: Response) => {
    try {
      const employeeId = (req.session as any).employeeId;
      const companyId = (req.session as any).companyId;
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      let balances = await storage.getLeaveBalancesByEmployee(employeeId, year);
      const leaveTypes = await storage.getLeaveTypesByCompany(companyId);
      const existingTypeIds = new Set(balances.map(b => b.leaveTypeId));
      const missingTypes = leaveTypes.filter(lt => !existingTypeIds.has(lt.id));
      if (missingTypes.length > 0) {
        for (const lt of missingTypes) {
          await storage.upsertLeaveBalance({
            companyId,
            employeeId,
            leaveTypeId: lt.id,
            totalDays: lt.defaultDays,
            usedDays: 0,
            remainingDays: lt.defaultDays,
            year,
          });
        }
        balances = await storage.getLeaveBalancesByEmployee(employeeId, year);
      }
      return res.json(balances);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/leave-balances/all", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const companyId = (req.session as any).companyId;
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      const balances = await storage.getLeaveBalancesByCompany(companyId, year);
      return res.json(balances);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/leave-balances/initialize", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const companyId = (req.session as any).companyId;
      const { employeeId, year } = req.body;
      if (!employeeId || !year) {
        return res.status(400).json({ message: "employeeId and year are required" });
      }
      await storage.initializeBalancesForEmployee(companyId, employeeId, year);
      return res.json({ message: "Balances initialized successfully" });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/leave-balances/initialize-all", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const companyId = (req.session as any).companyId;
      const { year } = req.body;
      if (!year) {
        return res.status(400).json({ message: "year is required" });
      }
      const employees = await storage.getEmployeesByCompany(companyId);
      const activeEmployees = employees.filter(e => e.status === "active");
      for (const emp of activeEmployees) {
        await storage.initializeBalancesForEmployee(companyId, emp.id, year);
      }
      return res.json({ message: `Balances initialized for ${activeEmployees.length} employees` });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/leave-balances/update", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const companyId = (req.session as any).companyId;
      const { employeeId, leaveTypeId, totalDays, usedDays, year } = req.body;
      if (!employeeId || !leaveTypeId || totalDays === undefined || usedDays === undefined || !year) {
        return res.status(400).json({ message: "employeeId, leaveTypeId, totalDays, usedDays, and year are required" });
      }
      if (totalDays < 0 || usedDays < 0) {
        return res.status(400).json({ message: "Days cannot be negative" });
      }
      const remainingDays = Math.max(0, totalDays - usedDays);
      const updated = await storage.upsertLeaveBalance({
        companyId,
        employeeId,
        leaveTypeId,
        totalDays,
        usedDays,
        remainingDays,
        year,
      });
      return res.json(updated);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // ==================== LEAVE REQUEST ROUTES ====================

  async function enrichLeaveRequestsWithApprover(requests: LeaveRequest[]) {
    const approverIds = [...new Set(requests.map(r => r.approverId).filter(Boolean))] as string[];
    const approverMap: Record<string, string> = {};
    for (const id of approverIds) {
      const emp = await storage.getEmployee(id);
      if (emp) approverMap[id] = `${emp.firstName} ${emp.lastName}`;
    }
    return requests.map(r => ({
      ...r,
      approverName: r.approverId ? approverMap[r.approverId] || null : null,
    }));
  }

  app.get("/api/leave-requests", requireAuth, async (req: Request, res: Response) => {
    try {
      const employeeId = (req.session as any).employeeId;
      const requests = await storage.getLeaveRequestsByEmployee(employeeId);
      const enriched = await enrichLeaveRequestsWithApprover(requests);
      return res.json(enriched);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/leave-requests/all", requireAuth, requireManagerOrAdmin, async (req: Request, res: Response) => {
    try {
      const companyId = (req.session as any).companyId;
      const requests = await storage.getLeaveRequestsByCompany(companyId);
      const enriched = await enrichLeaveRequestsWithApprover(requests);
      return res.json(enriched);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/leave-requests/pending", requireAuth, requireManagerOrAdmin, async (req: Request, res: Response) => {
    try {
      const companyId = (req.session as any).companyId;
      const requests = await storage.getPendingLeaveRequestsByCompany(companyId);
      const enriched = await enrichLeaveRequestsWithApprover(requests);
      return res.json(enriched);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/leave-requests", requireAuth, async (req: Request, res: Response) => {
    try {
      const companyId = (req.session as any).companyId;
      const employeeId = (req.session as any).employeeId;
      const parsed = insertLeaveRequestSchema.safeParse({ ...req.body, companyId, employeeId });
      if (!parsed.success) {
        return res.status(400).json({ message: "Validation failed", errors: parsed.error.flatten() });
      }
      const startDate = new Date(parsed.data.startDate);
      const endDate = new Date(parsed.data.endDate);
      const totalDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const employee = await storage.getEmployee(employeeId);
      if (!employee) return res.status(401).json({ message: "Employee not found" });
      const initialStatus = employee.managerId ? "pending" : "manager_approved";
      const request = await storage.createLeaveRequest({
        ...parsed.data,
        companyId,
        employeeId,
        totalDays,
        status: initialStatus,
      });
      return res.status(201).json(request);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/leave-requests/:id/approve", requireAuth, requireManagerOrAdmin, async (req: Request, res: Response) => {
    try {
      const approverId = (req.session as any).employeeId;
      const role = (req.session as any).role;
      const request = await storage.getLeaveRequest(req.params.id);
      if (!request) return res.status(404).json({ message: "Leave request not found" });

      if (role === "manager") {
        if (request.status !== "pending") {
          return res.status(400).json({ message: "Only pending requests can be approved by a manager" });
        }
        const updated = await storage.updateLeaveRequest(req.params.id, {
          status: "manager_approved",
          approverId,
        });
        return res.json(updated);
      }

      if (role === "admin") {
        if (request.status !== "manager_approved" && request.status !== "pending") {
          return res.status(400).json({ message: "Only pending or manager-approved requests can be approved by admin" });
        }
        const updated = await storage.updateLeaveRequest(req.params.id, {
          status: "approved",
          approverId,
        });

        const startDate = new Date(request.startDate);
        const year = startDate.getFullYear();
        const balances = await storage.getLeaveBalancesByEmployee(request.employeeId, year);
        const balance = balances.find(b => b.leaveTypeId === request.leaveTypeId);
        if (balance) {
          await storage.upsertLeaveBalance({
            companyId: balance.companyId,
            employeeId: balance.employeeId,
            leaveTypeId: balance.leaveTypeId,
            totalDays: balance.totalDays,
            usedDays: balance.usedDays + request.totalDays,
            remainingDays: balance.remainingDays - request.totalDays,
            year: balance.year,
          });
        } else {
          const leaveType = await storage.getLeaveType(request.leaveTypeId);
          const defaultDays = leaveType?.defaultDays || 0;
          const remaining = Math.max(0, defaultDays - request.totalDays);
          await storage.upsertLeaveBalance({
            companyId: request.companyId,
            employeeId: request.employeeId,
            leaveTypeId: request.leaveTypeId,
            totalDays: defaultDays,
            usedDays: request.totalDays,
            remainingDays: remaining,
            year,
          });
        }
        return res.json(updated);
      }

      return res.status(403).json({ message: "Unauthorized" });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/leave-requests/:id/reject", requireAuth, requireManagerOrAdmin, async (req: Request, res: Response) => {
    try {
      const approverId = (req.session as any).employeeId;
      const role = (req.session as any).role;
      const request = await storage.getLeaveRequest(req.params.id);
      if (!request) return res.status(404).json({ message: "Leave request not found" });

      if (role === "manager" && request.status !== "pending") {
        return res.status(400).json({ message: "Managers can only reject pending requests" });
      }
      if (role === "admin" && request.status !== "pending" && request.status !== "manager_approved") {
        return res.status(400).json({ message: "Only pending or manager-approved requests can be rejected" });
      }

      if (!req.body.approverComment || !req.body.approverComment.trim()) {
        return res.status(400).json({ message: "Rejection reason is required" });
      }

      const updated = await storage.updateLeaveRequest(req.params.id, {
        status: "rejected",
        approverId,
        approverComment: req.body.approverComment.trim(),
      });
      return res.json(updated);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/leave-requests/:id/cancel", requireAuth, async (req: Request, res: Response) => {
    try {
      const employeeId = (req.session as any).employeeId;
      const request = await storage.getLeaveRequest(req.params.id);
      if (!request) return res.status(404).json({ message: "Leave request not found" });
      if (request.employeeId !== employeeId) {
        return res.status(403).json({ message: "You can only cancel your own requests" });
      }
      if (request.status !== "pending" && request.status !== "manager_approved") {
        return res.status(400).json({ message: "Only pending or manager-approved requests can be cancelled" });
      }

      const updated = await storage.updateLeaveRequest(req.params.id, {
        status: "cancelled",
      });
      return res.json(updated);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  return httpServer;
}
