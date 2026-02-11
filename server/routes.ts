import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCompanySchema, insertDepartmentSchema, insertEmployeeSchema, insertLeaveTypeSchema, insertLeaveRequestSchema, insertHrQuerySchema } from "@shared/schema";
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
      const currentYear = new Date().getFullYear();
      await storage.initializeBalancesForLeaveType(companyId, leaveType.id, leaveType.defaultDays, currentYear);
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
      const role = (req.session as any).role;
      const employeeId = (req.session as any).employeeId;
      let requests = await storage.getLeaveRequestsByCompany(companyId);
      if (role === "manager") {
        const employees = await storage.getEmployeesByCompany(companyId);
        const directReportIds = new Set(employees.filter(e => e.managerId === employeeId).map(e => e.id));
        requests = requests.filter(r => directReportIds.has(r.employeeId));
      }
      const enriched = await enrichLeaveRequestsWithApprover(requests);
      return res.json(enriched);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/leave-requests/pending", requireAuth, requireManagerOrAdmin, async (req: Request, res: Response) => {
    try {
      const companyId = (req.session as any).companyId;
      const role = (req.session as any).role;
      const employeeId = (req.session as any).employeeId;
      let requests = await storage.getPendingLeaveRequestsByCompany(companyId);
      if (role === "manager") {
        const employees = await storage.getEmployeesByCompany(companyId);
        const directReportIds = new Set(employees.filter(e => e.managerId === employeeId).map(e => e.id));
        requests = requests.filter(r => directReportIds.has(r.employeeId));
      }
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
      let totalDays = 0;
      const current = new Date(startDate);
      while (current <= endDate) {
        const day = current.getDay();
        if (day !== 0 && day !== 6) {
          totalDays++;
        }
        current.setDate(current.getDate() + 1);
      }
      if (totalDays <= 0) {
        return res.status(400).json({ message: "Selected dates contain no business days. Weekends are excluded from leave calculation." });
      }
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
        const companyId = (req.session as any).companyId;
        const employees = await storage.getEmployeesByCompany(companyId);
        const directReportIds = new Set(employees.filter(e => e.managerId === approverId).map(e => e.id));
        if (!directReportIds.has(request.employeeId)) {
          return res.status(403).json({ message: "You can only approve leave requests from your direct reports" });
        }
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

      if (role === "manager") {
        const companyId = (req.session as any).companyId;
        const employees = await storage.getEmployeesByCompany(companyId);
        const directReportIds = new Set(employees.filter(e => e.managerId === approverId).map(e => e.id));
        if (!directReportIds.has(request.employeeId)) {
          return res.status(403).json({ message: "You can only reject leave requests from your direct reports" });
        }
        if (request.status !== "pending") {
          return res.status(400).json({ message: "Managers can only reject pending requests" });
        }
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

  // ==================== EMPLOYEE QUERIES ====================

  app.get("/api/employees/:id/queries", requireAuth, requireManagerOrAdmin, async (req: Request, res: Response) => {
    try {
      const companyId = (req.session as any).companyId;
      const role = (req.session as any).role;
      const currentEmployeeId = (req.session as any).employeeId;
      const targetEmployeeId = req.params.id;

      const targetEmployee = await storage.getEmployee(targetEmployeeId);
      if (!targetEmployee || targetEmployee.companyId !== companyId) {
        return res.status(404).json({ message: "Employee not found" });
      }

      if (role === "manager") {
        if (targetEmployee.managerId !== currentEmployeeId) {
          return res.status(403).json({ message: "You can only view queries for your direct reports" });
        }
      }

      const queries = await storage.getHrQueriesByEmployee(targetEmployeeId);
      return res.json(queries);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // ==================== HR QUERY HELPERS ====================

  async function checkQueryAccess(employeeId: string, companyId: string, role: string, queryRecord: { companyId: string; issuedBy: string; employeeId: string }): Promise<boolean> {
    if (queryRecord.companyId !== companyId) return false;
    if (role === "admin") return true;
    if (role === "manager") {
      const employees = await storage.getEmployeesByCompany(companyId);
      const teamIds = employees.filter(e => e.managerId === employeeId).map(e => e.id);
      return queryRecord.issuedBy === employeeId || queryRecord.employeeId === employeeId || teamIds.includes(queryRecord.employeeId);
    }
    return queryRecord.employeeId === employeeId;
  }

  // ==================== HR QUERY ROUTES ====================

  app.get("/api/hr-queries", requireAuth, async (req: Request, res: Response) => {
    try {
      const companyId = (req.session as any).companyId;
      const employeeId = (req.session as any).employeeId;
      const role = (req.session as any).role;
      const allQueries = await storage.getHrQueriesByCompany(companyId);

      if (role === "admin") {
        return res.json(allQueries);
      }

      if (role === "manager") {
        const employees = await storage.getEmployeesByCompany(companyId);
        const teamIds = employees.filter(e => e.managerId === employeeId).map(e => e.id);
        const visible = allQueries.filter(q =>
          q.issuedBy === employeeId || q.employeeId === employeeId || teamIds.includes(q.employeeId)
        );
        return res.json(visible);
      }

      const myQueries = allQueries.filter(q => q.employeeId === employeeId);
      return res.json(myQueries);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/hr-queries/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const employeeId = (req.session as any).employeeId;
      const companyId = (req.session as any).companyId;
      const role = (req.session as any).role;
      const query = await storage.getHrQuery(req.params.id);
      if (!query) {
        return res.status(404).json({ message: "Query not found" });
      }

      const hasAccess = await checkQueryAccess(employeeId, companyId, role, query);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      return res.json(query);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/hr-queries", requireAuth, requireManagerOrAdmin, async (req: Request, res: Response) => {
    try {
      const companyId = (req.session as any).companyId;
      const employeeId = (req.session as any).employeeId;
      const role = (req.session as any).role;

      const parsed = insertHrQuerySchema.safeParse({
        ...req.body,
        companyId,
        issuedBy: employeeId,
      });

      if (!parsed.success) {
        return res.status(400).json({ message: "Validation failed", errors: parsed.error.flatten() });
      }

      if (role === "manager") {
        const employees = await storage.getEmployeesByCompany(companyId);
        const teamIds = employees.filter(e => e.managerId === employeeId).map(e => e.id);
        if (!teamIds.includes(parsed.data.employeeId)) {
          return res.status(403).json({ message: "Managers can only issue queries to their direct reports" });
        }
      }

      const query = await storage.createHrQuery(parsed.data);

      await storage.createHrQueryTimeline({
        queryId: query.id,
        action: "created",
        details: "Query issued",
        actorId: employeeId,
      });

      return res.status(201).json(query);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/hr-queries/:id/status", requireAuth, async (req: Request, res: Response) => {
    try {
      const employeeId = (req.session as any).employeeId;
      const companyId = (req.session as any).companyId;
      const role = (req.session as any).role;
      const { status } = req.body;

      const validStatuses = ["open", "awaiting_response", "responded", "resolved", "closed"];
      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const query = await storage.getHrQuery(req.params.id);
      if (!query || query.companyId !== companyId) {
        return res.status(404).json({ message: "Query not found" });
      }

      if (role !== "admin" && role !== "manager") {
        return res.status(403).json({ message: "Only managers and admins can change query status" });
      }

      const statusLabels: Record<string, string> = {
        open: "Open", awaiting_response: "Awaiting Response", responded: "Responded", resolved: "Resolved", closed: "Closed",
      };

      const updateData: Record<string, any> = { status };
      if (status === "resolved") {
        updateData.resolvedAt = new Date();
      }

      const updated = await storage.updateHrQuery(req.params.id, updateData);

      await storage.createHrQueryTimeline({
        queryId: query.id,
        action: "status_changed",
        details: `Status changed to ${statusLabels[status] || status}`,
        actorId: employeeId,
      });

      return res.json(updated);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/hr-queries/:id/assign", requireAuth, requireManagerOrAdmin, async (req: Request, res: Response) => {
    try {
      const employeeId = (req.session as any).employeeId;
      const companyId = (req.session as any).companyId;
      const { assignedTo } = req.body;

      const query = await storage.getHrQuery(req.params.id);
      if (!query || query.companyId !== companyId) {
        return res.status(404).json({ message: "Query not found" });
      }

      const updated = await storage.updateHrQuery(req.params.id, {
        assignedTo: assignedTo || null,
      });

      await storage.createHrQueryTimeline({
        queryId: query.id,
        action: "assigned",
        details: assignedTo ? "Query assigned" : "Query unassigned",
        actorId: employeeId,
      });

      return res.json(updated);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // ==================== HR QUERY COMMENTS ====================

  app.get("/api/hr-queries/:id/comments", requireAuth, async (req: Request, res: Response) => {
    try {
      const employeeId = (req.session as any).employeeId;
      const companyId = (req.session as any).companyId;
      const role = (req.session as any).role;

      const query = await storage.getHrQuery(req.params.id);
      if (!query) {
        return res.status(404).json({ message: "Query not found" });
      }

      const hasAccess = await checkQueryAccess(employeeId, companyId, role, query);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      let comments = await storage.getHrQueryComments(req.params.id);
      if (role !== "admin") {
        comments = comments.filter(c => c.isInternal !== "true");
      }

      return res.json(comments);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/hr-queries/:id/comments", requireAuth, requireManagerOrAdmin, async (req: Request, res: Response) => {
    try {
      const employeeId = (req.session as any).employeeId;
      const companyId = (req.session as any).companyId;
      const role = (req.session as any).role;
      const { content, isInternal } = req.body;

      if (!content || !content.trim()) {
        return res.status(400).json({ message: "Content is required" });
      }

      const query = await storage.getHrQuery(req.params.id);
      if (!query || query.companyId !== companyId) {
        return res.status(404).json({ message: "Query not found" });
      }

      const isInternalStr = isInternal && role === "admin" ? "true" : "false";

      const comment = await storage.createHrQueryComment({
        queryId: req.params.id,
        content: content.trim(),
        authorId: employeeId,
        isInternal: isInternalStr,
      });

      await storage.updateHrQuery(req.params.id, {});

      await storage.createHrQueryTimeline({
        queryId: req.params.id,
        action: "commented",
        details: isInternalStr === "true" ? "Internal note added" : "Comment added",
        actorId: employeeId,
      });

      return res.status(201).json(comment);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/hr-queries/:id/respond", requireAuth, async (req: Request, res: Response) => {
    try {
      const employeeId = (req.session as any).employeeId;
      const companyId = (req.session as any).companyId;
      const { content } = req.body;

      if (!content || content.trim().length < 10) {
        return res.status(400).json({ message: "Response must be at least 10 characters" });
      }

      const query = await storage.getHrQuery(req.params.id);
      if (!query || query.companyId !== companyId) {
        return res.status(404).json({ message: "Query not found" });
      }

      if (query.employeeId !== employeeId) {
        return res.status(403).json({ message: "Only the queried employee can respond" });
      }

      if (query.status !== "open" && query.status !== "awaiting_response") {
        return res.status(400).json({ message: "This query is no longer accepting responses" });
      }

      const comment = await storage.createHrQueryComment({
        queryId: req.params.id,
        content: content.trim(),
        authorId: employeeId,
        isInternal: "false",
      });

      await storage.updateHrQuery(req.params.id, { status: "responded" });

      await storage.createHrQueryTimeline({
        queryId: req.params.id,
        action: "responded",
        details: "Employee submitted response",
        actorId: employeeId,
      });

      await storage.createHrQueryTimeline({
        queryId: req.params.id,
        action: "status_changed",
        details: "Status changed to Responded",
        actorId: employeeId,
      });

      return res.status(201).json(comment);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // ==================== HR QUERY TIMELINE ====================

  app.get("/api/hr-queries/:id/timeline", requireAuth, async (req: Request, res: Response) => {
    try {
      const employeeId = (req.session as any).employeeId;
      const companyId = (req.session as any).companyId;
      const role = (req.session as any).role;

      const query = await storage.getHrQuery(req.params.id);
      if (!query) {
        return res.status(404).json({ message: "Query not found" });
      }

      const hasAccess = await checkQueryAccess(employeeId, companyId, role, query);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      const timeline = await storage.getHrQueryTimeline(req.params.id);
      return res.json(timeline);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  return httpServer;
}
