import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCompanySchema, insertDepartmentSchema, insertEmployeeSchema, insertLeaveTypeSchema, insertLeaveRequestSchema, insertHrQuerySchema, insertAppraisalCycleSchema, insertJobPostingSchema, insertCandidateSchema, insertEmailTemplateSchema, insertInterviewSchema, interviewFeedbackSchema, PIPELINE_STAGES } from "@shared/schema";
import bcrypt from "bcryptjs";
import multer from "multer";
import path from "path";
import fs from "fs";
import express from "express";

const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const uploadStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  },
});

const upload = multer({
  storage: uploadStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      "image/jpeg", "image/png", "image/gif", "image/webp",
      "application/pdf",
      "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/plain", "text/csv",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("File type not allowed. Supported: images, PDF, Word, Excel, text, CSV"));
    }
  },
});

function validateAttachments(attachments: any): attachments is Array<{ fileName: string; fileUrl: string; fileSize: number; mimeType: string }> {
  if (!Array.isArray(attachments)) return false;
  if (attachments.length > 5) return false;
  return attachments.every(a =>
    typeof a.fileName === "string" && a.fileName.length > 0 &&
    typeof a.fileUrl === "string" && a.fileUrl.startsWith("/uploads/") &&
    typeof a.fileSize === "number" && a.fileSize > 0 && a.fileSize <= 10 * 1024 * 1024 &&
    typeof a.mimeType === "string" && a.mimeType.length > 0
  );
}

async function saveAttachments(attachments: any[], queryId: string, uploadedBy: string, commentId?: string) {
  if (!validateAttachments(attachments)) return;
  for (const att of attachments) {
    await storage.createHrQueryAttachment({
      queryId,
      commentId,
      fileName: att.fileName,
      fileUrl: att.fileUrl,
      fileSize: att.fileSize,
      mimeType: att.mimeType,
      uploadedBy,
    });
  }
}

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
        const passwordValid = existingEmployee.passwordHash
          ? await bcrypt.compare(password, existingEmployee.passwordHash)
          : false;
        if (passwordValid) {
          const existingCompany = await storage.getCompany(existingEmployee.companyId);
          (req.session as any).employeeId = existingEmployee.id;
          (req.session as any).companyId = existingEmployee.companyId;
          (req.session as any).role = existingEmployee.role;
          return res.status(200).json({
            company: existingCompany || { id: existingEmployee.companyId, name: companyName },
            message: "Company already set up. Logged in successfully.",
          });
        }
        return res.status(400).json({ message: "An account with this email already exists. Please use the login page instead." });
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
    } catch (error: any) {
      console.error("Setup error:", error?.message || error);
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

  app.get("/api/leave-requests/on-leave-today", requireAuth, async (req: Request, res: Response) => {
    try {
      const companyId = (req.session as any).companyId;
      const onLeave = await storage.getOnLeaveTodayByCompany(companyId);
      const companyEmployees = await storage.getEmployeesByCompany(companyId);
      const companyLeaveTypes = await storage.getLeaveTypesByCompany(companyId);
      const empMap = Object.fromEntries(companyEmployees.map(e => [e.id, e]));
      const ltMap = Object.fromEntries(companyLeaveTypes.map(t => [t.id, t]));
      const result = onLeave.map(r => ({
        ...r,
        employeeName: empMap[r.employeeId] ? `${empMap[r.employeeId].firstName} ${empMap[r.employeeId].lastName}` : "Unknown",
        employeePosition: empMap[r.employeeId]?.position || "",
        leaveTypeName: ltMap[r.leaveTypeId]?.name || "Leave",
      }));
      return res.json(result);
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

      if (req.body.attachments) {
        await saveAttachments(req.body.attachments, query.id, employeeId);
      }

      await storage.createHrQueryTimeline({
        queryId: query.id,
        action: "created",
        details: parsed.data.type === "warning" ? "Warning issued" : "Query issued",
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

      const validStatuses = ["open", "awaiting_response", "responded", "acknowledged", "resolved", "closed"];
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

      if (req.body.attachments) {
        await saveAttachments(req.body.attachments, req.params.id, employeeId, comment.id);
      }

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

      if (req.body.attachments) {
        await saveAttachments(req.body.attachments, req.params.id, employeeId, comment.id);
      }

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

  // ==================== FILE UPLOADS ====================

  app.get("/api/attachments/:attachmentId/download", requireAuth, async (req: Request, res: Response) => {
    try {
      const employeeId = (req.session as any).employeeId;
      const companyId = (req.session as any).companyId;
      const role = (req.session as any).role;

      const attachment = await storage.getHrQueryAttachment(req.params.attachmentId);
      if (!attachment) {
        return res.status(404).json({ message: "Attachment not found" });
      }

      const query = await storage.getHrQuery(attachment.queryId);
      if (!query) {
        return res.status(404).json({ message: "Query not found" });
      }

      const hasAccess = await checkQueryAccess(employeeId, companyId, role, query);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      const safeName = path.basename(attachment.fileUrl);
      const filePath = path.join(uploadsDir, safeName);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File not found on disk" });
      }

      res.setHeader("Content-Disposition", `inline; filename="${attachment.fileName}"`);
      res.setHeader("Content-Type", attachment.mimeType);
      return res.sendFile(filePath);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/uploads", requireAuth, upload.array("files", 5), async (req: Request, res: Response) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }

      const uploadedFiles = files.map(file => ({
        fileName: file.originalname,
        fileUrl: `/uploads/${file.filename}`,
        fileSize: file.size,
        mimeType: file.mimetype,
      }));

      return res.status(201).json(uploadedFiles);
    } catch (error: any) {
      return res.status(500).json({ message: error.message || "Upload failed" });
    }
  });

  // ==================== HR QUERY ATTACHMENTS ====================

  app.get("/api/hr-queries/:id/attachments", requireAuth, async (req: Request, res: Response) => {
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

      const attachments = await storage.getHrQueryAttachmentsByQuery(req.params.id);
      return res.json(attachments);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // ==================== APPRAISAL TEMPLATES ====================

  app.get("/api/appraisal-templates", requireAuth, async (req: Request, res: Response) => {
    try {
      const companyId = (req.session as any).companyId;
      const templates = await storage.getAppraisalTemplatesByCompany(companyId);
      return res.json(templates);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/appraisal-templates", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const companyId = (req.session as any).companyId;
      const { name, description, isDefault } = req.body;
      if (!name) {
        return res.status(400).json({ message: "Template name is required" });
      }
      const template = await storage.createAppraisalTemplate({ companyId, name, description, isDefault });
      return res.status(201).json(template);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/appraisal-templates/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const template = await storage.getAppraisalTemplate(req.params.id);
      if (!template) return res.status(404).json({ message: "Template not found" });
      const questions = await storage.getTemplateQuestions(req.params.id);
      return res.json({ ...template, questions });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/appraisal-templates/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const template = await storage.updateAppraisalTemplate(req.params.id, req.body);
      if (!template) return res.status(404).json({ message: "Template not found" });
      return res.json(template);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/appraisal-templates/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      await storage.deleteTemplateQuestionsByTemplate(req.params.id);
      const deleted = await storage.deleteAppraisalTemplate(req.params.id);
      if (!deleted) return res.status(404).json({ message: "Template not found" });
      return res.json({ message: "Template deleted" });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // ==================== TEMPLATE QUESTIONS ====================

  app.get("/api/appraisal-templates/:id/questions", requireAuth, async (req: Request, res: Response) => {
    try {
      const questions = await storage.getTemplateQuestions(req.params.id);
      return res.json(questions);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/appraisal-templates/:id/questions", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { questionText, questionType, order, competencyId } = req.body;
      if (!questionText || !questionType) {
        return res.status(400).json({ message: "questionText and questionType are required" });
      }
      const question = await storage.createTemplateQuestion({
        templateId: req.params.id,
        questionText,
        questionType,
        order,
        competencyId,
      });
      return res.status(201).json(question);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/template-questions/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const question = await storage.updateTemplateQuestion(req.params.id, req.body);
      if (!question) return res.status(404).json({ message: "Question not found" });
      return res.json(question);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/template-questions/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const deleted = await storage.deleteTemplateQuestion(req.params.id);
      if (!deleted) return res.status(404).json({ message: "Question not found" });
      return res.json({ message: "Question deleted" });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // ==================== APPRAISAL CYCLES ====================

  app.get("/api/appraisal-cycles", requireAuth, async (req: Request, res: Response) => {
    try {
      const companyId = (req.session as any).companyId;
      const cycles = await storage.getAppraisalCyclesByCompany(companyId);
      return res.json(cycles);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/appraisal-cycles", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const companyId = (req.session as any).companyId;
      const parsed = insertAppraisalCycleSchema.safeParse({ ...req.body, companyId });
      if (!parsed.success) {
        return res.status(400).json({ message: "Validation failed", errors: parsed.error.flatten() });
      }
      const cycle = await storage.createAppraisalCycle(parsed.data);
      return res.status(201).json(cycle);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/appraisal-cycles/:id", requireAuth, requireManagerOrAdmin, async (req: Request, res: Response) => {
    try {
      const cycle = await storage.getAppraisalCycle(req.params.id);
      if (!cycle) return res.status(404).json({ message: "Cycle not found" });
      return res.json(cycle);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/appraisal-cycles/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const cycle = await storage.updateAppraisalCycle(req.params.id, req.body);
      if (!cycle) return res.status(404).json({ message: "Cycle not found" });
      return res.json(cycle);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/appraisal-cycles/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const companyId = (req.session as any).companyId;
      const cycle = await storage.getAppraisalCycle(req.params.id);
      if (!cycle) return res.status(404).json({ message: "Cycle not found" });
      if (cycle.companyId !== companyId) return res.status(403).json({ message: "Access denied" });
      if (cycle.status !== "draft") {
        return res.status(400).json({ message: "Only draft cycles can be deleted" });
      }
      const deleted = await storage.deleteAppraisalCycle(req.params.id);
      if (!deleted) return res.status(404).json({ message: "Cycle not found" });
      return res.json({ message: "Cycle deleted successfully" });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/appraisal-cycles/:id/activate", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const cycle = await storage.getAppraisalCycle(req.params.id);
      if (!cycle) return res.status(404).json({ message: "Cycle not found" });
      if (cycle.status !== "draft") {
        return res.status(400).json({ message: "Only draft cycles can be activated" });
      }

      const participants = await storage.getCycleParticipants(req.params.id);
      if (participants.length === 0) {
        return res.status(400).json({ message: "Cannot activate cycle with no participants" });
      }

      for (const participant of participants) {
        const appraisal = await storage.createAppraisal({
          cycleId: cycle.id,
          employeeId: participant.employeeId,
          status: "pending",
        });

        await storage.createAppraisalFeedback({
          appraisalId: appraisal.id,
          reviewerId: participant.employeeId,
          reviewerType: "self",
          status: "pending",
        });

        const employee = await storage.getEmployee(participant.employeeId);
        if (employee && employee.managerId) {
          await storage.createAppraisalFeedback({
            appraisalId: appraisal.id,
            reviewerId: employee.managerId,
            reviewerType: "manager",
            status: "pending",
          });
        }

        if (cycle.type === "360") {
          const peerAssignments = await storage.getPeerAssignmentsByReviewee(cycle.id, participant.employeeId);
          for (const pa of peerAssignments) {
            await storage.createAppraisalFeedback({
              appraisalId: appraisal.id,
              reviewerId: pa.reviewerId,
              reviewerType: "peer",
              status: "pending",
            });
          }
        }
      }

      const updatedCycle = await storage.updateAppraisalCycle(req.params.id, { status: "active" });
      return res.json(updatedCycle);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // ==================== CYCLE PARTICIPANTS ====================

  app.get("/api/appraisal-cycles/:id/participants", requireAuth, requireManagerOrAdmin, async (req: Request, res: Response) => {
    try {
      const participants = await storage.getCycleParticipants(req.params.id);
      return res.json(participants);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/appraisal-cycles/:id/participants", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { employeeIds } = req.body;
      if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
        return res.status(400).json({ message: "employeeIds array is required" });
      }
      const results = [];
      for (const employeeId of employeeIds) {
        const participant = await storage.addCycleParticipant({ cycleId: req.params.id, employeeId });
        results.push(participant);
      }
      return res.status(201).json(results);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/appraisal-cycles/:id/participants", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { employeeIds } = req.body;
      if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
        return res.status(400).json({ message: "employeeIds array is required" });
      }
      await storage.removeCycleParticipantsByIds(req.params.id, employeeIds);
      return res.json({ message: "Participants removed" });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // ==================== PEER ASSIGNMENTS ====================

  app.get("/api/appraisal-cycles/:id/peer-assignments", requireAuth, requireManagerOrAdmin, async (req: Request, res: Response) => {
    try {
      const assignments = await storage.getPeerAssignmentsByCycle(req.params.id);
      return res.json(assignments);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/appraisal-cycles/:id/peer-assignments", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { revieweeId, reviewerId } = req.body;
      if (!revieweeId || !reviewerId) {
        return res.status(400).json({ message: "revieweeId and reviewerId are required" });
      }
      const assignment = await storage.createPeerAssignment({ cycleId: req.params.id, revieweeId, reviewerId });
      return res.status(201).json(assignment);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/peer-assignments/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const deleted = await storage.deletePeerAssignment(req.params.id);
      if (!deleted) return res.status(404).json({ message: "Peer assignment not found" });
      return res.json({ message: "Peer assignment deleted" });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // ==================== APPRAISALS ====================

  app.get("/api/appraisals", requireAuth, async (req: Request, res: Response) => {
    try {
      const employeeId = (req.session as any).employeeId;
      const companyId = (req.session as any).companyId;
      const role = (req.session as any).role;

      if (role === "admin") {
        const cycles = await storage.getAppraisalCyclesByCompany(companyId);
        const allAppraisals = [];
        for (const cycle of cycles) {
          const cycleAppraisals = await storage.getAppraisalsByCycle(cycle.id);
          allAppraisals.push(...cycleAppraisals);
        }
        return res.json(allAppraisals);
      } else if (role === "manager") {
        const allEmployees = await storage.getEmployeesByCompany(companyId);
        const directReportIds = allEmployees
          .filter(e => e.managerId === employeeId)
          .map(e => e.id);
        const cycles = await storage.getAppraisalCyclesByCompany(companyId);
        const allAppraisals = [];
        for (const cycle of cycles) {
          const cycleAppraisals = await storage.getAppraisalsByCycle(cycle.id);
          allAppraisals.push(...cycleAppraisals.filter(a => directReportIds.includes(a.employeeId)));
        }
        return res.json(allAppraisals);
      } else {
        const appraisals = await storage.getAppraisalsByEmployee(employeeId);
        return res.json(appraisals);
      }
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/appraisals/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const employeeId = (req.session as any).employeeId;
      const companyId = (req.session as any).companyId;
      const role = (req.session as any).role;

      const appraisal = await storage.getAppraisal(req.params.id);
      if (!appraisal) return res.status(404).json({ message: "Appraisal not found" });

      if (role === "admin") {
        const cycle = await storage.getAppraisalCycle(appraisal.cycleId);
        if (!cycle || cycle.companyId !== companyId) {
          return res.status(403).json({ message: "Access denied" });
        }
      } else if (role === "manager") {
        const employee = await storage.getEmployee(appraisal.employeeId);
        if (!employee || employee.managerId !== employeeId) {
          return res.status(403).json({ message: "Access denied" });
        }
      } else {
        if (appraisal.employeeId !== employeeId) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const feedback = await storage.getAppraisalFeedbackByAppraisal(appraisal.id);
      const feedbackWithRatings = [];
      for (const fb of feedback) {
        const ratings = await storage.getFeedbackRatings(fb.id);
        const reviewer = await storage.getEmployee(fb.reviewerId);
        feedbackWithRatings.push({
          feedback: fb,
          ratings,
          reviewer: reviewer ? { id: reviewer.id, firstName: reviewer.firstName, lastName: reviewer.lastName } : null,
        });
      }

      const cycle = await storage.getAppraisalCycle(appraisal.cycleId);
      const employee = await storage.getEmployee(appraisal.employeeId);
      let questions: any[] = [];
      if (cycle && cycle.templateId) {
        questions = await storage.getTemplateQuestions(cycle.templateId);
      }

      return res.json({
        appraisal,
        cycle: cycle ? { id: cycle.id, name: cycle.name, type: cycle.type, selfWeight: cycle.selfWeight, peerWeight: cycle.peerWeight, managerWeight: cycle.managerWeight } : null,
        feedbacks: feedbackWithRatings,
        questions,
        employee: employee ? { id: employee.id, firstName: employee.firstName, lastName: employee.lastName } : null,
      });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/employees/:id/appraisals", requireAuth, async (req: Request, res: Response) => {
    try {
      const currentEmployeeId = (req.session as any).employeeId;
      const companyId = (req.session as any).companyId;
      const role = (req.session as any).role;
      const targetId = req.params.id;

      if (role === "admin") {
        const employee = await storage.getEmployee(targetId);
        if (!employee || employee.companyId !== companyId) {
          return res.status(403).json({ message: "Access denied" });
        }
      } else if (role === "manager") {
        const employee = await storage.getEmployee(targetId);
        if (!employee || employee.managerId !== currentEmployeeId) {
          return res.status(403).json({ message: "Access denied" });
        }
      } else {
        if (targetId !== currentEmployeeId) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const appraisals = await storage.getAppraisalsByEmployee(targetId);
      return res.json(appraisals);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // ==================== FEEDBACK ====================

  app.get("/api/feedback/pending", requireAuth, async (req: Request, res: Response) => {
    try {
      const employeeId = (req.session as any).employeeId;
      const allFeedback = await storage.getAppraisalFeedbackByReviewer(employeeId);
      const pending = allFeedback.filter(f => f.status === "pending");
      return res.json(pending);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/feedback/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const employeeId = (req.session as any).employeeId;
      const role = (req.session as any).role;

      const feedback = await storage.getAppraisalFeedback(req.params.id);
      if (!feedback) return res.status(404).json({ message: "Feedback not found" });

      if (role !== "admin" && feedback.reviewerId !== employeeId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const ratings = await storage.getFeedbackRatings(feedback.id);
      const appraisal = await storage.getAppraisal(feedback.appraisalId);
      let questions: any[] = [];
      let cycle: any = null;
      let employee: any = null;
      if (appraisal) {
        cycle = await storage.getAppraisalCycle(appraisal.cycleId);
        if (cycle && cycle.templateId) {
          questions = await storage.getTemplateQuestions(cycle.templateId);
        }
        employee = await storage.getEmployee(appraisal.employeeId);
      }

      return res.json({
        feedback,
        appraisal,
        cycle: cycle ? { id: cycle.id, name: cycle.name, type: cycle.type } : null,
        questions,
        ratings,
        employee: employee ? { id: employee.id, firstName: employee.firstName, lastName: employee.lastName } : null,
      });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/feedback/:id/submit", requireAuth, async (req: Request, res: Response) => {
    try {
      const employeeId = (req.session as any).employeeId;

      const feedback = await storage.getAppraisalFeedback(req.params.id);
      if (!feedback) return res.status(404).json({ message: "Feedback not found" });

      if (feedback.reviewerId !== employeeId) {
        return res.status(403).json({ message: "Only the assigned reviewer can submit this feedback" });
      }

      if (feedback.status === "submitted") {
        return res.status(400).json({ message: "Feedback has already been submitted" });
      }

      const { overallComment, ratings } = req.body;
      if (!overallComment) {
        return res.status(400).json({ message: "overallComment is required" });
      }

      if (Array.isArray(ratings)) {
        for (const r of ratings) {
          await storage.createFeedbackRating({
            feedbackId: feedback.id,
            questionId: r.questionId,
            rating: r.rating,
            textResponse: r.textResponse,
          });
        }
      }

      await storage.updateAppraisalFeedback(feedback.id, {
        overallComment,
        status: "submitted",
        submittedAt: new Date(),
      });

      const allFeedback = await storage.getAppraisalFeedbackByAppraisal(feedback.appraisalId);
      const allSubmitted = allFeedback.every(f => f.id === feedback.id ? true : f.status === "submitted");

      if (allSubmitted) {
        const appraisal = await storage.getAppraisal(feedback.appraisalId);
        if (appraisal) {
          const cycle = await storage.getAppraisalCycle(appraisal.cycleId);
          if (cycle && cycle.templateId) {
            const questions = await storage.getTemplateQuestions(cycle.templateId);
            const ratingQuestions = questions.filter(q => q.questionType === "rating");

            if (ratingQuestions.length > 0) {
              let totalWeightedSum = 0;
              let totalWeight = 0;

              for (const question of ratingQuestions) {
                for (const fb of allFeedback) {
                  const fbRatings = await storage.getFeedbackRatings(fb.id);
                  const questionRating = fbRatings.find(r => r.questionId === question.id);
                  if (questionRating && questionRating.rating !== null && questionRating.rating !== undefined) {
                    let weight = 0;
                    if (fb.reviewerType === "self") weight = cycle.selfWeight;
                    else if (fb.reviewerType === "peer") weight = cycle.peerWeight;
                    else if (fb.reviewerType === "manager") weight = cycle.managerWeight;

                    totalWeightedSum += questionRating.rating * weight;
                    totalWeight += weight;
                  }
                }
              }

              const overallRating = totalWeight > 0 ? Math.round(totalWeightedSum / totalWeight) : null;
              await storage.updateAppraisal(appraisal.id, { status: "completed", overallRating });
            } else {
              await storage.updateAppraisal(appraisal.id, { status: "completed" });
            }
          } else {
            await storage.updateAppraisal(appraisal.id, { status: "completed" });
          }
        }
      }

      return res.json({ message: "Feedback submitted successfully" });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // ==================== TASK MANAGEMENT ====================

  // Task Templates CRUD
  app.get("/api/task-templates", async (req, res) => {
    try {
      const companyId = (req.session as any).companyId;
      if (!companyId) return res.status(401).json({ message: "Not authenticated" });
      const role = (req.session as any).role;
      if (role !== "admin" && role !== "manager") return res.status(403).json({ message: "Only admins and managers can view templates" });
      const templates = await storage.getTaskTemplatesByCompany(companyId);
      return res.json(templates);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/task-templates", async (req, res) => {
    try {
      const companyId = (req.session as any).companyId;
      const role = (req.session as any).role;
      if (!companyId) return res.status(401).json({ message: "Not authenticated" });
      if (role !== "admin") return res.status(403).json({ message: "Only admins can create templates" });

      const { insertTaskTemplateSchema } = await import("@shared/schema");
      const parsed = insertTaskTemplateSchema.safeParse({ ...req.body, companyId });
      if (!parsed.success) return res.status(400).json({ message: "Validation error", errors: parsed.error.errors });

      const template = await storage.createTaskTemplate(parsed.data);
      return res.json(template);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/task-templates/:id", async (req, res) => {
    try {
      const companyId = (req.session as any).companyId;
      const role = (req.session as any).role;
      if (!companyId) return res.status(401).json({ message: "Not authenticated" });
      if (role !== "admin") return res.status(403).json({ message: "Only admins can update templates" });

      const template = await storage.getTaskTemplate(req.params.id);
      if (!template || template.companyId !== companyId) return res.status(404).json({ message: "Template not found" });

      const updated = await storage.updateTaskTemplate(req.params.id, req.body);
      return res.json(updated);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/task-templates/:id", async (req, res) => {
    try {
      const companyId = (req.session as any).companyId;
      const role = (req.session as any).role;
      if (!companyId) return res.status(401).json({ message: "Not authenticated" });
      if (role !== "admin") return res.status(403).json({ message: "Only admins can delete templates" });

      const template = await storage.getTaskTemplate(req.params.id);
      if (!template || template.companyId !== companyId) return res.status(404).json({ message: "Template not found" });

      await storage.deleteTaskTemplate(req.params.id);
      return res.json({ message: "Template deleted" });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Task Assignments - admins/managers see all, employees see their own
  app.get("/api/task-assignments", async (req, res) => {
    try {
      const companyId = (req.session as any).companyId;
      const role = (req.session as any).role;
      if (!companyId) return res.status(401).json({ message: "Not authenticated" });
      if (role !== "admin" && role !== "manager") return res.status(403).json({ message: "Only admins and managers can view all assignments" });
      const assignments = await storage.getTaskAssignmentsByCompany(companyId);
      return res.json(assignments);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/my-task-assignments", async (req, res) => {
    try {
      const companyId = (req.session as any).companyId;
      const employeeId = (req.session as any).employeeId;
      const role = (req.session as any).role;
      if (!companyId || !employeeId) return res.status(401).json({ message: "Not authenticated" });

      const employee = await storage.getEmployee(employeeId);
      if (!employee) return res.status(404).json({ message: "Employee not found" });
      const departmentId = employee.departmentId;

      const allAssignments = await storage.getTaskAssignmentsByCompany(companyId);
      const myAssignments = allAssignments.filter((a: any) => {
        if (a.assignmentType === "individual" && a.targetEmployeeId === employeeId) return true;
        if (a.assignmentType === "department" && departmentId && a.targetDepartmentId === departmentId) return true;
        if (a.assignmentType === "managers" && (role === "manager" || role === "admin")) return true;
        if (a.assignmentType === "everyone") return true;
        return false;
      });

      return res.json(myAssignments);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/task-assignments", async (req, res) => {
    try {
      const companyId = (req.session as any).companyId;
      const employeeId = (req.session as any).employeeId;
      const role = (req.session as any).role;
      if (!companyId) return res.status(401).json({ message: "Not authenticated" });
      if (role !== "admin" && role !== "manager") return res.status(403).json({ message: "Only admins and managers can assign tasks" });

      const { insertTaskAssignmentSchema } = await import("@shared/schema");
      const parsed = insertTaskAssignmentSchema.safeParse({ ...req.body, companyId, assignedById: employeeId });
      if (!parsed.success) return res.status(400).json({ message: "Validation error", errors: parsed.error.errors });

      if (parsed.data.assignmentType === "individual" && !parsed.data.targetEmployeeId) {
        return res.status(400).json({ message: "Target employee is required for individual assignments" });
      }
      if (parsed.data.assignmentType === "department" && !parsed.data.targetDepartmentId) {
        return res.status(400).json({ message: "Target department is required for department assignments" });
      }

      const assignment = await storage.createTaskAssignment(parsed.data);
      return res.json(assignment);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/task-assignments/:id", async (req, res) => {
    try {
      const companyId = (req.session as any).companyId;
      const role = (req.session as any).role;
      if (!companyId) return res.status(401).json({ message: "Not authenticated" });
      if (role !== "admin" && role !== "manager") return res.status(403).json({ message: "Only admins and managers can delete assignments" });

      const assignment = await storage.getTaskAssignment(req.params.id);
      if (!assignment || assignment.companyId !== companyId) return res.status(404).json({ message: "Assignment not found" });

      await storage.deleteTaskAssignment(req.params.id);
      return res.json({ message: "Assignment deleted" });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Task Completions
  app.get("/api/task-assignments/:id/completions", async (req, res) => {
    try {
      const companyId = (req.session as any).companyId;
      if (!companyId) return res.status(401).json({ message: "Not authenticated" });
      const completions = await storage.getTaskCompletionsByAssignment(req.params.id);
      return res.json(completions);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/my-task-completions", async (req, res) => {
    try {
      const employeeId = (req.session as any).employeeId;
      if (!employeeId) return res.status(401).json({ message: "Not authenticated" });
      const completions = await storage.getTaskCompletionsByEmployee(employeeId);
      return res.json(completions);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/task-assignments/:id/toggle", async (req, res) => {
    try {
      const employeeId = (req.session as any).employeeId;
      const companyId = (req.session as any).companyId;
      if (!employeeId || !companyId) return res.status(401).json({ message: "Not authenticated" });

      const { itemId } = req.body;
      if (!itemId) return res.status(400).json({ message: "itemId is required" });

      const assignment = await storage.getTaskAssignment(req.params.id);
      if (!assignment || assignment.companyId !== companyId) return res.status(404).json({ message: "Assignment not found" });

      const completion = await storage.toggleTaskCompletion(req.params.id, employeeId, itemId);
      return res.json(completion);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // ==================== RECRUITMENT - JOB POSTINGS ====================

  app.get("/api/job-postings", async (req, res) => {
    try {
      const companyId = (req.session as any).companyId;
      const role = (req.session as any).role;
      const employeeId = (req.session as any).employeeId;
      if (!companyId) return res.status(401).json({ message: "Not authenticated" });

      let postings = await storage.getJobPostingsByCompany(companyId);

      if (role === "manager") {
        const employee = await storage.getEmployee(employeeId);
        if (employee) {
          postings = postings.filter(p => p.departmentId === employee.departmentId || p.assignedManagerId === employeeId);
        }
      }

      return res.json(postings);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/job-postings/active", async (req, res) => {
    try {
      const companyId = (req.session as any).companyId;
      if (!companyId) return res.status(401).json({ message: "Not authenticated" });
      const postings = await storage.getActiveJobPostingsByCompany(companyId);
      return res.json(postings);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/job-postings/public", async (req, res) => {
    try {
      const allJobs = await storage.getAllActiveJobPostings();
      return res.json(allJobs);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/job-postings/public/:companyId", async (req, res) => {
    try {
      const postings = await storage.getActiveJobPostingsByCompany(req.params.companyId);
      return res.json(postings);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/job-postings/:id", async (req, res) => {
    try {
      const posting = await storage.getJobPosting(req.params.id);
      if (!posting) return res.status(404).json({ message: "Job posting not found" });
      return res.json(posting);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/job-postings", async (req, res) => {
    try {
      const companyId = (req.session as any).companyId;
      const role = (req.session as any).role;
      if (!companyId) return res.status(401).json({ message: "Not authenticated" });
      if (role !== "admin") return res.status(403).json({ message: "Only admins can create job postings" });

      const parsed = insertJobPostingSchema.safeParse({ ...req.body, companyId });
      if (!parsed.success) return res.status(400).json({ message: "Validation failed", errors: parsed.error.flatten() });

      const posting = await storage.createJobPosting(parsed.data);
      return res.status(201).json(posting);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/job-postings/:id", async (req, res) => {
    try {
      const companyId = (req.session as any).companyId;
      const role = (req.session as any).role;
      if (!companyId) return res.status(401).json({ message: "Not authenticated" });
      if (role !== "admin") return res.status(403).json({ message: "Only admins can edit job postings" });

      const existing = await storage.getJobPosting(req.params.id);
      if (!existing || existing.companyId !== companyId) return res.status(404).json({ message: "Job posting not found" });

      const posting = await storage.updateJobPosting(req.params.id, req.body);
      return res.json(posting);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/job-postings/:id", async (req, res) => {
    try {
      const companyId = (req.session as any).companyId;
      const role = (req.session as any).role;
      if (!companyId) return res.status(401).json({ message: "Not authenticated" });
      if (role !== "admin") return res.status(403).json({ message: "Only admins can delete job postings" });

      const existing = await storage.getJobPosting(req.params.id);
      if (!existing || existing.companyId !== companyId) return res.status(404).json({ message: "Job posting not found" });

      await storage.deleteJobPosting(req.params.id);
      return res.json({ success: true });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // ==================== RECRUITMENT - CANDIDATES ====================

  app.get("/api/candidates", async (req, res) => {
    try {
      const companyId = (req.session as any).companyId;
      const role = (req.session as any).role;
      const employeeId = (req.session as any).employeeId;
      if (!companyId) return res.status(401).json({ message: "Not authenticated" });

      let cands = await storage.getCandidatesByCompany(companyId);

      if (role === "manager") {
        const employee = await storage.getEmployee(employeeId);
        const postings = await storage.getJobPostingsByCompany(companyId);
        const deptJobIds = postings.filter(p => p.departmentId === employee?.departmentId || p.assignedManagerId === employeeId).map(p => p.id);
        cands = cands.filter(c => deptJobIds.includes(c.jobId) || c.assignedManagerId === employeeId);
      }

      return res.json(cands);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/candidates/:id", async (req, res) => {
    try {
      const companyId = (req.session as any).companyId;
      if (!companyId) return res.status(401).json({ message: "Not authenticated" });
      const candidate = await storage.getCandidate(req.params.id);
      if (!candidate || candidate.companyId !== companyId) return res.status(404).json({ message: "Candidate not found" });
      return res.json(candidate);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/candidates", async (req, res) => {
    try {
      const companyId = (req.session as any).companyId;
      const role = (req.session as any).role;
      if (!companyId) return res.status(401).json({ message: "Not authenticated" });
      if (role !== "admin") return res.status(403).json({ message: "Only admins can add candidates" });

      const parsed = insertCandidateSchema.safeParse({ ...req.body, companyId });
      if (!parsed.success) return res.status(400).json({ message: "Validation failed", errors: parsed.error.flatten() });

      const candidate = await storage.createCandidate(parsed.data);
      await storage.createCandidateActivity({
        candidateId: candidate.id,
        type: "application",
        description: "Candidate added manually",
        createdBy: (req.session as any).employeeId,
      });
      return res.status(201).json(candidate);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/candidates/apply", async (req, res) => {
    try {
      const { jobId, firstName, lastName, email, phone, location, linkedinUrl, gender, coverLetter, source, resumeFileName } = req.body;
      const posting = await storage.getJobPosting(jobId);
      if (!posting) return res.status(404).json({ message: "Job posting not found" });
      if (posting.status !== "active") return res.status(400).json({ message: "This position is no longer accepting applications" });

      const parsed = insertCandidateSchema.safeParse({
        companyId: posting.companyId,
        jobId,
        firstName,
        lastName,
        email,
        phone,
        location,
        linkedinUrl,
        gender,
        coverLetter,
        source: source || "website",
        resumeFileName,
      });
      if (!parsed.success) return res.status(400).json({ message: "Validation failed", errors: parsed.error.flatten() });

      const candidate = await storage.createCandidate(parsed.data);
      await storage.createCandidateActivity({
        candidateId: candidate.id,
        type: "application",
        description: `Applied via ${source || "website"}`,
      });
      return res.status(201).json(candidate);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/candidates/:id", async (req, res) => {
    try {
      const companyId = (req.session as any).companyId;
      const role = (req.session as any).role;
      const employeeId = (req.session as any).employeeId;
      if (!companyId) return res.status(401).json({ message: "Not authenticated" });

      const existing = await storage.getCandidate(req.params.id);
      if (!existing || existing.companyId !== companyId) return res.status(404).json({ message: "Candidate not found" });

      if (req.body.stage) {
        const offerStages = ["offer_extended", "hired"];
        if (offerStages.includes(req.body.stage) && role !== "admin") {
          return res.status(403).json({ message: "Only admins can move candidates to offer/hired stage" });
        }
      }

      const candidate = await storage.updateCandidate(req.params.id, req.body);

      if (req.body.stage && req.body.stage !== existing.stage) {
        await storage.createCandidateActivity({
          candidateId: req.params.id,
          type: "stage_change",
          description: `Stage changed from ${existing.stage} to ${req.body.stage}`,
          createdBy: employeeId,
        });
      }

      if (req.body.assignedManagerId && req.body.assignedManagerId !== existing.assignedManagerId) {
        await storage.createCandidateActivity({
          candidateId: req.params.id,
          type: "assignment",
          description: "Assigned to manager for review",
          createdBy: employeeId,
        });
      }

      return res.json(candidate);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/candidates/:id", async (req, res) => {
    try {
      const companyId = (req.session as any).companyId;
      const role = (req.session as any).role;
      if (!companyId) return res.status(401).json({ message: "Not authenticated" });
      if (role !== "admin") return res.status(403).json({ message: "Only admins can delete candidates" });

      const existing = await storage.getCandidate(req.params.id);
      if (!existing || existing.companyId !== companyId) return res.status(404).json({ message: "Candidate not found" });

      await storage.deleteCandidate(req.params.id);
      return res.json({ success: true });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // ==================== CANDIDATE ACTIVITIES ====================

  app.get("/api/candidates/:id/activities", async (req, res) => {
    try {
      const companyId = (req.session as any).companyId;
      if (!companyId) return res.status(401).json({ message: "Not authenticated" });
      const activities = await storage.getCandidateActivities(req.params.id);
      return res.json(activities);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // ==================== CANDIDATE NOTES ====================

  app.get("/api/candidates/:id/notes", async (req, res) => {
    try {
      const companyId = (req.session as any).companyId;
      if (!companyId) return res.status(401).json({ message: "Not authenticated" });
      const notes = await storage.getCandidateNotes(req.params.id);
      return res.json(notes);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/candidates/:id/notes", async (req, res) => {
    try {
      const companyId = (req.session as any).companyId;
      const employeeId = (req.session as any).employeeId;
      if (!companyId) return res.status(401).json({ message: "Not authenticated" });

      const { content, category } = req.body;
      if (!content) return res.status(400).json({ message: "Content is required" });

      const note = await storage.createCandidateNote({
        candidateId: req.params.id,
        content,
        category,
        createdBy: employeeId,
      });

      await storage.createCandidateActivity({
        candidateId: req.params.id,
        type: "note",
        description: "Note added",
        createdBy: employeeId,
      });

      return res.status(201).json(note);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // ==================== CANDIDATE ASSESSMENTS ====================

  app.get("/api/candidates/:id/assessments", async (req, res) => {
    try {
      const companyId = (req.session as any).companyId;
      if (!companyId) return res.status(401).json({ message: "Not authenticated" });
      const assessments = await storage.getCandidateAssessments(req.params.id);
      return res.json(assessments);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/candidates/:id/assessments", async (req, res) => {
    try {
      const companyId = (req.session as any).companyId;
      const employeeId = (req.session as any).employeeId;
      if (!companyId) return res.status(401).json({ message: "Not authenticated" });

      const { category, score, comments } = req.body;
      if (!category || score === undefined) return res.status(400).json({ message: "Category and score are required" });

      const assessment = await storage.createCandidateAssessment({
        candidateId: req.params.id,
        assessorId: employeeId,
        category,
        score,
        comments,
      });
      return res.status(201).json(assessment);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // ==================== CANDIDATE INTERVIEWS ====================

  app.get("/api/interviews", async (req, res) => {
    try {
      const companyId = (req.session as any).companyId;
      const role = (req.session as any).role;
      const employeeId = (req.session as any).employeeId;
      if (!companyId) return res.status(401).json({ message: "Not authenticated" });

      if (role === "admin") {
        const interviews = await storage.getInterviewsByCompany(companyId);
        return res.json(interviews);
      } else {
        const interviews = await storage.getInterviewsByInterviewer(employeeId);
        return res.json(interviews);
      }
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/candidates/:id/interviews", async (req, res) => {
    try {
      const companyId = (req.session as any).companyId;
      if (!companyId) return res.status(401).json({ message: "Not authenticated" });
      const interviews = await storage.getCandidateInterviews(req.params.id);
      return res.json(interviews);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/candidates/:id/interviews", async (req, res) => {
    try {
      const companyId = (req.session as any).companyId;
      const role = (req.session as any).role;
      const employeeId = (req.session as any).employeeId;
      if (!companyId) return res.status(401).json({ message: "Not authenticated" });
      if (role !== "admin") return res.status(403).json({ message: "Only admins can schedule interviews" });

      const parsed = insertInterviewSchema.safeParse({ ...req.body, candidateId: req.params.id });
      if (!parsed.success) return res.status(400).json({ message: "Validation failed", errors: parsed.error.flatten() });

      const interview = await storage.createCandidateInterview({
        ...parsed.data,
        scheduledAt: new Date(parsed.data.scheduledAt),
      });

      await storage.createCandidateActivity({
        candidateId: req.params.id,
        type: "interview_scheduled",
        description: `${parsed.data.type} interview scheduled`,
        createdBy: employeeId,
      });

      return res.status(201).json(interview);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/interviews/:id/feedback", async (req, res) => {
    try {
      const companyId = (req.session as any).companyId;
      const employeeId = (req.session as any).employeeId;
      if (!companyId) return res.status(401).json({ message: "Not authenticated" });

      const interview = await storage.getCandidateInterview(req.params.id);
      if (!interview) return res.status(404).json({ message: "Interview not found" });

      const role = (req.session as any).role;
      if (interview.interviewerId !== employeeId && role !== "admin") {
        return res.status(403).json({ message: "Only the interviewer or admin can submit feedback" });
      }

      const parsed = interviewFeedbackSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Validation failed", errors: parsed.error.flatten() });

      const updated = await storage.updateCandidateInterview(req.params.id, {
        ...parsed.data,
        status: "completed",
        feedbackSubmittedAt: new Date(),
      });

      await storage.createCandidateActivity({
        candidateId: interview.candidateId,
        type: "interview_feedback",
        description: `Interview feedback submitted: ${parsed.data.recommendation}`,
        createdBy: employeeId,
      });

      return res.json(updated);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/interviews/:id", async (req, res) => {
    try {
      const companyId = (req.session as any).companyId;
      const role = (req.session as any).role;
      if (!companyId) return res.status(401).json({ message: "Not authenticated" });
      if (role !== "admin") return res.status(403).json({ message: "Only admins can delete interviews" });

      await storage.deleteCandidateInterview(req.params.id);
      return res.json({ success: true });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // ==================== CANDIDATE COMMUNICATIONS ====================

  app.get("/api/candidates/:id/communications", async (req, res) => {
    try {
      const companyId = (req.session as any).companyId;
      if (!companyId) return res.status(401).json({ message: "Not authenticated" });
      const comms = await storage.getCandidateCommunications(req.params.id);
      return res.json(comms);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/candidates/:id/communications", async (req, res) => {
    try {
      const companyId = (req.session as any).companyId;
      const employeeId = (req.session as any).employeeId;
      if (!companyId) return res.status(401).json({ message: "Not authenticated" });

      const { subject, body, direction } = req.body;
      if (!subject || !body) return res.status(400).json({ message: "Subject and body are required" });

      const comm = await storage.createCandidateCommunication({
        candidateId: req.params.id,
        direction: direction || "outbound",
        subject,
        body,
        sentBy: employeeId,
      });

      await storage.createCandidateActivity({
        candidateId: req.params.id,
        type: "communication",
        description: `Email sent: ${subject}`,
        createdBy: employeeId,
      });

      return res.status(201).json(comm);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // ==================== EMAIL TEMPLATES ====================

  app.get("/api/email-templates", async (req, res) => {
    try {
      const companyId = (req.session as any).companyId;
      if (!companyId) return res.status(401).json({ message: "Not authenticated" });
      const templates = await storage.getEmailTemplatesByCompany(companyId);
      return res.json(templates);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/email-templates", async (req, res) => {
    try {
      const companyId = (req.session as any).companyId;
      const role = (req.session as any).role;
      if (!companyId) return res.status(401).json({ message: "Not authenticated" });
      if (role !== "admin") return res.status(403).json({ message: "Only admins can create email templates" });

      const parsed = insertEmailTemplateSchema.safeParse({ ...req.body, companyId });
      if (!parsed.success) return res.status(400).json({ message: "Validation failed", errors: parsed.error.flatten() });

      const template = await storage.createEmailTemplate(parsed.data);
      return res.status(201).json(template);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/email-templates/:id", async (req, res) => {
    try {
      const companyId = (req.session as any).companyId;
      const role = (req.session as any).role;
      if (!companyId) return res.status(401).json({ message: "Not authenticated" });
      if (role !== "admin") return res.status(403).json({ message: "Only admins can edit email templates" });

      const existing = await storage.getEmailTemplate(req.params.id);
      if (!existing || existing.companyId !== companyId) return res.status(404).json({ message: "Template not found" });

      const template = await storage.updateEmailTemplate(req.params.id, req.body);
      return res.json(template);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/email-templates/:id", async (req, res) => {
    try {
      const companyId = (req.session as any).companyId;
      const role = (req.session as any).role;
      if (!companyId) return res.status(401).json({ message: "Not authenticated" });
      if (role !== "admin") return res.status(403).json({ message: "Only admins can delete email templates" });

      const existing = await storage.getEmailTemplate(req.params.id);
      if (!existing || existing.companyId !== companyId) return res.status(404).json({ message: "Template not found" });

      await storage.deleteEmailTemplate(req.params.id);
      return res.json({ success: true });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // ==================== RESUME UPLOAD ====================

  app.post("/api/upload/resume", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      return res.json({
        fileName: req.file.originalname,
        fileUrl: `/uploads/${req.file.filename}`,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
      });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // ==================== DEV SEED ROUTE ====================

  app.post("/api/dev/seed", async (_req: Request, res: Response) => {
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({ message: "Not available in production" });
    }

    try {
      const existingAdmin = await storage.getEmployeeByEmail("admin@test.com");
      if (existingAdmin) {
        return res.json({ message: "Test accounts already exist", seeded: false });
      }

      const company = await storage.createCompany({ name: "Test Corp" });
      const department = await storage.createDepartment({ companyId: company.id, name: "Engineering" });

      const passwordHash = await bcrypt.hash("password123", 10);

      const testAccounts = [
        { firstName: "Test", lastName: "Admin", email: "admin@test.com", role: "admin" as const, position: "HR Administrator" },
        { firstName: "Test", lastName: "Manager", email: "manager@test.com", role: "manager" as const, position: "Engineering Manager" },
        { firstName: "Test", lastName: "Employee", email: "employee@test.com", role: "employee" as const, position: "Software Engineer" },
        { firstName: "Test", lastName: "Contractor", email: "contract@test.com", role: "contract" as const, position: "Contract Developer" },
      ];

      const created = [];
      for (const account of testAccounts) {
        const emp = await storage.createEmployee({
          companyId: company.id,
          departmentId: department.id,
          firstName: account.firstName,
          lastName: account.lastName,
          email: account.email,
          role: account.role,
          position: account.position,
          status: "active",
        });
        await storage.updateEmployee(emp.id, { passwordHash });
        created.push({ email: account.email, role: account.role, employeeId: emp.employeeId });
      }

      return res.json({ message: "Test accounts created", seeded: true, accounts: created });
    } catch (error: any) {
      console.error("Dev seed error:", error?.message || error);
      return res.status(500).json({ message: "Failed to seed test accounts" });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    (async () => {
      try {
        const existingAdmin = await storage.getEmployeeByEmail("admin@test.com");
        if (!existingAdmin) {
          const company = await storage.createCompany({ name: "Test Corp" });
          const department = await storage.createDepartment({ companyId: company.id, name: "Engineering" });
          const hash = await bcrypt.hash("password123", 10);
          const accounts = [
            { firstName: "Test", lastName: "Admin", email: "admin@test.com", role: "admin" as const, position: "HR Administrator" },
            { firstName: "Test", lastName: "Manager", email: "manager@test.com", role: "manager" as const, position: "Engineering Manager" },
            { firstName: "Test", lastName: "Employee", email: "employee@test.com", role: "employee" as const, position: "Software Engineer" },
            { firstName: "Test", lastName: "Contractor", email: "contract@test.com", role: "contract" as const, position: "Contract Developer" },
          ];
          for (const a of accounts) {
            const emp = await storage.createEmployee({ companyId: company.id, departmentId: department.id, ...a, status: "active" });
            await storage.updateEmployee(emp.id, { passwordHash: hash });
          }
          console.log("Auto-seed: Test accounts created");
        }
      } catch (e: any) {
        console.log("Auto-seed skipped:", e?.message || e);
      }
    })();
  }

  return httpServer;
}
