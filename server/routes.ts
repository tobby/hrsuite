import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  sendInviteEmail,
  sendLeaveRequestNotification,
  sendLeaveApprovedEmail,
  sendLeaveRejectedEmail,
  sendLdRequestNotification,
  sendLdManagerApprovedToAdmin,
  sendLdApprovedEmail,
  sendLdRejectedEmail,
  sendLdAssignedEmail,
  sendLoanRequestNotification,
  sendLoanApprovedEmail,
  sendLoanRejectedEmail,
  sendLoanAssignedEmail,
  sendAppraisalAssignedEmail,
  sendAppraisalSelfReviewCompleteEmail,
  sendAppraisalCompletedEmail,
  sendQueryRaisedEmail,
  sendQueryStatusUpdateEmail,
  sendTaskAssignedEmail,
  sendTaskCompletedEmail,
} from "./email";
import { insertCompanySchema, insertDepartmentSchema, insertEmployeeSchema, insertLeaveTypeSchema, insertLeaveRequestSchema, insertHrQuerySchema, insertAppraisalCycleSchema, insertJobPostingSchema, insertCandidateSchema, insertEmailTemplateSchema, insertInterviewSchema, interviewFeedbackSchema, PIPELINE_STAGES, insertLdRequestSchema, insertLoanRequestSchema } from "@shared/schema";
import bcrypt from "bcryptjs";
import passport from "passport";
import type { GoogleUser } from "./auth/google";
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
    typeof a.fileUrl === "string" && a.fileUrl.startsWith("/api/uploads/") &&
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

  // ==================== GOOGLE AUTH ROUTES ====================

  app.get("/api/auth/google", (req: Request, res: Response, next: NextFunction) => {
    const context = (req.query.context as string) || "login";
    const inviteToken = req.query.inviteToken as string | undefined;
    const companyName = req.query.companyName as string | undefined;

    const state = Buffer.from(
      JSON.stringify({ context, inviteToken, companyName }),
    ).toString("base64url");

    passport.authenticate("google", {
      scope: ["profile", "email"],
      state,
      session: false,
    })(req, res, next);
  });

  app.get("/api/auth/google/callback", (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate("google", { session: false }, async (err: any, googleUser: GoogleUser | false) => {
      if (err || !googleUser) {
        return res.redirect("/login?error=google_auth_failed");
      }

      const { email, firstName, lastName, profileImageUrl } = googleUser;

      let state: { context: string; inviteToken?: string; companyName?: string };
      try {
        state = JSON.parse(
          Buffer.from(req.query.state as string, "base64url").toString(),
        );
      } catch {
        return res.redirect("/login?error=invalid_state");
      }

      try {
        switch (state.context) {
          case "login": {
            const employee = await storage.getEmployeeByEmail(email);
            if (!employee) {
              return res.redirect("/login?error=no_account");
            }
            if (employee.status === "inactive") {
              return res.redirect("/login?error=account_deactivated");
            }
            if (!employee.profileImageUrl && profileImageUrl) {
              await storage.updateEmployee(employee.id, { profileImageUrl });
            }
            (req.session as any).employeeId = employee.id;
            (req.session as any).companyId = employee.companyId;
            (req.session as any).role = employee.role;
            req.session.save(() => res.redirect("/"));
            return;
          }

          case "setup": {
            const existing = await storage.getEmployeeByEmail(email);
            if (existing) {
              (req.session as any).employeeId = existing.id;
              (req.session as any).companyId = existing.companyId;
              (req.session as any).role = existing.role;
              req.session.save(() => res.redirect("/"));
              return;
            }
            const companyName = state.companyName;
            if (!companyName) {
              return res.redirect("/setup?error=company_name_required");
            }
            const company = await storage.createCompany({ name: companyName });
            const admin = await storage.createEmployee({
              companyId: company.id,
              firstName,
              lastName,
              email,
              position: "Administrator",
              role: "admin",
              status: "active",
            });
            if (profileImageUrl) {
              await storage.updateEmployee(admin.id, { profileImageUrl });
            }
            (req.session as any).employeeId = admin.id;
            (req.session as any).companyId = company.id;
            (req.session as any).role = "admin";
            req.session.save(() => res.redirect("/"));
            return;
          }

          case "invite": {
            const { inviteToken } = state;
            if (!inviteToken) {
              return res.redirect("/login?error=missing_invite_token");
            }
            const employee = await storage.getEmployeeByInviteToken(inviteToken);
            if (!employee) {
              return res.redirect("/login?error=invalid_invite");
            }
            if (employee.inviteExpiresAt && new Date() > new Date(employee.inviteExpiresAt)) {
              return res.redirect("/login?error=invite_expired");
            }
            if (employee.status !== "invited") {
              return res.redirect("/login?error=invite_used");
            }
            if (employee.email.toLowerCase() !== email.toLowerCase()) {
              return res.redirect(`/invite/${inviteToken}?error=email_mismatch`);
            }
            await storage.updateEmployee(employee.id, {
              status: "active",
              inviteToken: null,
              inviteExpiresAt: null,
              ...(profileImageUrl && !employee.profileImageUrl ? { profileImageUrl } : {}),
            });
            (req.session as any).employeeId = employee.id;
            (req.session as any).companyId = employee.companyId;
            (req.session as any).role = employee.role;
            req.session.save(() => res.redirect("/"));
            return;
          }

          default:
            return res.redirect("/login?error=unknown_context");
        }
      } catch (error) {
        console.error("Google auth callback error:", error);
        return res.redirect("/login?error=server_error");
      }
    })(req, res, next);
  });

  // ==================== AUTH ROUTES ====================

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const employee = await storage.getEmployeeByEmail(email);
      if (!employee) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      if (!employee.passwordHash) {
        return res.status(401).json({ message: "This account uses Google sign-in. Please use the \"Sign in with Google\" button, or set a password in Settings." });
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
    return res.json({ employee: { ...safeEmployee, hasPassword: !!passwordHash } });
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

  app.get("/api/uploads/:filename", requireAuth, (req: Request, res: Response) => {
    const filename = path.basename(req.params.filename);
    const filePath = path.join(uploadsDir, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "File not found" });
    }
    return res.sendFile(filePath);
  });

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
      const role = (req.session as any).role;
      const emps = await storage.getEmployeesByCompany(companyId);
      const safeEmps = emps.map(({ passwordHash, inviteToken, inviteExpiresAt, ...rest }) => {
        if (role !== "admin") {
          const { dateOfBirth, homeAddress, ...filtered } = rest;
          return filtered;
        }
        return rest;
      });
      return res.json(safeEmps);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/employees/upcoming-birthdays", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const companyId = (req.session as any).companyId;
      const settings = await storage.getRecruitmentSettings(companyId);
      const reminderSetting = settings.find(s => s.key === "birthday_reminder_days");
      const reminderDays = parseInt(reminderSetting?.value || "3");

      const emps = await storage.getEmployeesByCompany(companyId);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const upcoming = emps
        .filter(e => e.dateOfBirth && e.status === "active")
        .map(e => {
          const dob = new Date(e.dateOfBirth!);
          const thisYearBirthday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
          if (thisYearBirthday < today) {
            thisYearBirthday.setFullYear(thisYearBirthday.getFullYear() + 1);
          }
          const diffTime = thisYearBirthday.getTime() - today.getTime();
          const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return {
            id: e.id,
            firstName: e.firstName,
            lastName: e.lastName,
            position: e.position,
            dateOfBirth: e.dateOfBirth,
            daysUntil,
            birthdayDate: thisYearBirthday.toISOString().split("T")[0],
          };
        })
        .filter(e => e.daysUntil >= 0 && e.daysUntil <= reminderDays)
        .sort((a, b) => a.daysUntil - b.daysUntil);

      return res.json(upcoming);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/employees/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const role = (req.session as any).role;
      const employee = await storage.getEmployee(req.params.id);
      if (!employee) return res.status(404).json({ message: "Employee not found" });
      const { passwordHash, inviteToken, inviteExpiresAt, ...safeEmployee } = employee;
      if (role !== "admin") {
        const { dateOfBirth, homeAddress, ...filtered } = safeEmployee;
        return res.json(filtered);
      }
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

      // Fire-and-forget email notification
      const fullInviteUrl = `${req.protocol}://${req.get("host")}/invite/${inviteToken}`;
      sendInviteEmail(parsed.data.email, `${parsed.data.firstName} ${parsed.data.lastName}`, fullInviteUrl);

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
      const { firstName, lastName, phone, dateOfBirth, homeAddress } = req.body;
      const updateData: Record<string, any> = {};
      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (phone !== undefined) updateData.phone = phone;
      if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth || null;
      if (homeAddress !== undefined) updateData.homeAddress = homeAddress || null;

      const employee = await storage.updateEmployee(employeeId, updateData);
      if (!employee) return res.status(404).json({ message: "Employee not found" });
      const { passwordHash, inviteToken, inviteExpiresAt, ...safeEmployee } = employee;
      return res.json({ employee: safeEmployee });
    } catch (error) {
      console.error("Error updating profile:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/profile/photo", requireAuth, upload.single("photo"), async (req: Request, res: Response) => {
    try {
      const employeeId = (req.session as any)?.employeeId;
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      const profileImageUrl = `/api/uploads/${req.file.filename}`;
      const employee = await storage.updateEmployee(employeeId, { profileImageUrl });
      if (!employee) return res.status(404).json({ message: "Employee not found" });
      const { passwordHash, inviteToken, inviteExpiresAt, ...safeEmployee } = employee;
      return res.json({ employee: safeEmployee });
    } catch (error) {
      console.error("Error uploading profile photo:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/profile/password", requireAuth, async (req: Request, res: Response) => {
    try {
      const employeeId = (req.session as any)?.employeeId;
      const { currentPassword, newPassword } = req.body;

      if (!newPassword || newPassword.length < 8) {
        return res.status(400).json({ message: "New password must be at least 8 characters" });
      }

      const employee = await storage.getEmployee(employeeId);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }

      // If user already has a password, require the current one
      if (employee.passwordHash) {
        if (!currentPassword) {
          return res.status(400).json({ message: "Current password is required" });
        }
        const isValid = await bcrypt.compare(currentPassword, employee.passwordHash);
        if (!isValid) {
          return res.status(401).json({ message: "Current password is incorrect" });
        }
      }

      const passwordHash = await bcrypt.hash(newPassword, 10);
      await storage.updateEmployee(employeeId, { passwordHash });
      return res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Error updating password:", error);
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

  // ==================== COMPANY SETTINGS ROUTES ====================

  app.get("/api/company-settings/birthday-reminder-days", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const companyId = (req.session as any).companyId;
      const settings = await storage.getRecruitmentSettings(companyId);
      const setting = settings.find(s => s.key === "birthday_reminder_days");
      return res.json({ value: setting?.value || "3" });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/company-settings/birthday-reminder-days", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const companyId = (req.session as any).companyId;
      const { value } = req.body;
      const days = parseInt(value);
      if (isNaN(days) || days < 1 || days > 30) {
        return res.status(400).json({ message: "Invalid value. Must be between 1 and 30." });
      }
      await storage.upsertRecruitmentSetting(companyId, "birthday_reminder_days", String(days));
      return res.json({ value: String(days) });
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

      // Fire-and-forget: notify manager or admins
      const leaveType = await storage.getLeaveType(parsed.data.leaveTypeId);
      const leaveTypeName = leaveType?.name || "Leave";
      const employeeName = `${employee.firstName} ${employee.lastName}`;
      if (employee.managerId) {
        const manager = await storage.getEmployee(employee.managerId);
        if (manager) {
          sendLeaveRequestNotification(manager.email, `${manager.firstName} ${manager.lastName}`, employeeName, leaveTypeName, parsed.data.startDate, parsed.data.endDate);
        }
      } else {
        const allEmps = await storage.getEmployeesByCompany(companyId);
        const admins = allEmps.filter(e => e.role === "admin");
        for (const admin of admins) {
          sendLeaveRequestNotification(admin.email, `${admin.firstName} ${admin.lastName}`, employeeName, leaveTypeName, parsed.data.startDate, parsed.data.endDate);
        }
      }

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

        // Fire-and-forget: notify employee of manager approval
        const empForMgr = await storage.getEmployee(request.employeeId);
        if (empForMgr) {
          const leaveTypeForMgr = await storage.getLeaveType(request.leaveTypeId);
          sendLeaveApprovedEmail(empForMgr.email, `${empForMgr.firstName} ${empForMgr.lastName}`, leaveTypeForMgr?.name || "Leave", request.startDate, request.endDate, "manager");
        }

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

        // Fire-and-forget: notify employee of admin approval
        const empForAdmin = await storage.getEmployee(request.employeeId);
        if (empForAdmin) {
          const leaveTypeForAdmin = await storage.getLeaveType(request.leaveTypeId);
          sendLeaveApprovedEmail(empForAdmin.email, `${empForAdmin.firstName} ${empForAdmin.lastName}`, leaveTypeForAdmin?.name || "Leave", request.startDate, request.endDate, "admin");
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

      // Fire-and-forget: notify employee of rejection
      const empForReject = await storage.getEmployee(request.employeeId);
      if (empForReject) {
        const leaveTypeForReject = await storage.getLeaveType(request.leaveTypeId);
        sendLeaveRejectedEmail(empForReject.email, `${empForReject.firstName} ${empForReject.lastName}`, leaveTypeForReject?.name || "Leave", req.body.approverComment.trim());
      }

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

  // ==================== L&D REQUEST ROUTES ====================

  app.get("/api/ld-requests", requireAuth, async (req: Request, res: Response) => {
    try {
      const employeeId = (req.session as any).employeeId;
      const requests = await storage.getLdRequestsByEmployee(employeeId);
      return res.json(requests);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/ld-requests/all", requireAuth, requireManagerOrAdmin, async (req: Request, res: Response) => {
    try {
      const companyId = (req.session as any).companyId;
      const role = (req.session as any).role;
      const requests = await storage.getLdRequestsByCompany(companyId);
      if (role === "admin") {
        return res.json(requests);
      }
      // Manager only sees requests from their direct reports
      const managerId = (req.session as any).employeeId;
      const employees = await storage.getEmployeesByCompany(companyId);
      const directReportIds = new Set(employees.filter(e => e.managerId === managerId).map(e => e.id));
      return res.json(requests.filter(r => directReportIds.has(r.employeeId)));
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/ld-requests/pending", requireAuth, requireManagerOrAdmin, async (req: Request, res: Response) => {
    try {
      const companyId = (req.session as any).companyId;
      const role = (req.session as any).role;
      if (role === "admin") {
        // Admin sees all non-final requests (pending + manager_approved)
        const pending = await storage.getPendingLdRequestsByCompany(companyId);
        const managerApproved = await storage.getManagerApprovedLdRequestsByCompany(companyId);
        return res.json([...pending, ...managerApproved]);
      }
      // Manager only sees pending requests from their direct reports
      const managerId = (req.session as any).employeeId;
      const allPending = await storage.getPendingLdRequestsByCompany(companyId);
      const employees = await storage.getEmployeesByCompany(companyId);
      const directReportIds = new Set(employees.filter(e => e.managerId === managerId).map(e => e.id));
      return res.json(allPending.filter(r => directReportIds.has(r.employeeId)));
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/ld-requests/manager-approved", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const companyId = (req.session as any).companyId;
      const requests = await storage.getManagerApprovedLdRequestsByCompany(companyId);
      return res.json(requests);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/ld-requests/assigned-to-me", requireAuth, async (req: Request, res: Response) => {
    try {
      const employeeId = (req.session as any).employeeId;
      const requests = await storage.getLdRequestsAssignedTo(employeeId);
      return res.json(requests);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/ld-requests", requireAuth, async (req: Request, res: Response) => {
    try {
      const companyId = (req.session as any).companyId;
      const employeeId = (req.session as any).employeeId;
      const parsed = insertLdRequestSchema.safeParse({ ...req.body, companyId, employeeId });
      if (!parsed.success) {
        return res.status(400).json({ message: "Validation failed", errors: parsed.error.flatten() });
      }
      const employee = await storage.getEmployee(employeeId);
      if (!employee) return res.status(401).json({ message: "Employee not found" });
      const initialStatus = employee.managerId ? "pending" : "manager_approved";
      const request = await storage.createLdRequest({ ...parsed.data, status: initialStatus } as any);

      // Fire-and-forget: notify manager or admins
      const ldEmployeeName = `${employee.firstName} ${employee.lastName}`;
      if (employee.managerId) {
        const manager = await storage.getEmployee(employee.managerId);
        if (manager) {
          sendLdRequestNotification(manager.email, `${manager.firstName} ${manager.lastName}`, ldEmployeeName, parsed.data.courseTitle, parsed.data.trainingProvider || "");
        }
      } else {
        const allEmps = await storage.getEmployeesByCompany(companyId);
        const admins = allEmps.filter(e => e.role === "admin");
        for (const admin of admins) {
          sendLdRequestNotification(admin.email, `${admin.firstName} ${admin.lastName}`, ldEmployeeName, parsed.data.courseTitle, parsed.data.trainingProvider || "");
        }
      }

      return res.status(201).json(request);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/ld-requests/:id/approve", requireAuth, requireManagerOrAdmin, async (req: Request, res: Response) => {
    try {
      const managerId = (req.session as any).employeeId;
      const role = (req.session as any).role;
      const request = await storage.getLdRequest(req.params.id);
      if (!request) return res.status(404).json({ message: "L&D request not found" });

      if (!req.body.managerComment || !req.body.managerComment.trim()) {
        return res.status(400).json({ message: "Comment is required for approval" });
      }

      if (role === "manager") {
        if (request.status !== "pending") {
          return res.status(400).json({ message: "Only pending requests can be approved by a manager" });
        }
        const updated = await storage.updateLdRequest(req.params.id, {
          status: "manager_approved",
          managerId,
          managerComment: req.body.managerComment.trim(),
        });

        // Fire-and-forget: notify employee of manager approval
        const ldEmpMgr = await storage.getEmployee(request.employeeId);
        if (ldEmpMgr) {
          sendLdApprovedEmail(ldEmpMgr.email, `${ldEmpMgr.firstName} ${ldEmpMgr.lastName}`, request.courseTitle, "manager");
        }
        // Fire-and-forget: notify admins that manager approved
        const ldAllEmpsMgr = await storage.getEmployeesByCompany(request.companyId);
        const ldAdminsMgr = ldAllEmpsMgr.filter(e => e.role === "admin");
        const ldEmpNameMgr = ldEmpMgr ? `${ldEmpMgr.firstName} ${ldEmpMgr.lastName}` : "Employee";
        for (const admin of ldAdminsMgr) {
          sendLdManagerApprovedToAdmin(admin.email, `${admin.firstName} ${admin.lastName}`, ldEmpNameMgr, request.courseTitle);
        }

        return res.json(updated);
      }

      if (role === "admin") {
        if (request.status !== "manager_approved" && request.status !== "pending") {
          return res.status(400).json({ message: "Only pending or manager-approved requests can be approved by admin" });
        }
        const newStatus = request.status === "pending" ? "manager_approved" : "approved";
        const updated = await storage.updateLdRequest(req.params.id, {
          status: newStatus,
          managerId,
          managerComment: req.body.managerComment.trim(),
        });

        // Fire-and-forget: notify employee
        const ldEmpAdmin = await storage.getEmployee(request.employeeId);
        if (ldEmpAdmin) {
          sendLdApprovedEmail(ldEmpAdmin.email, `${ldEmpAdmin.firstName} ${ldEmpAdmin.lastName}`, request.courseTitle, newStatus === "manager_approved" ? "manager" : "admin");
        }

        return res.json(updated);
      }

      return res.status(403).json({ message: "Unauthorized" });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/ld-requests/:id/reject", requireAuth, requireManagerOrAdmin, async (req: Request, res: Response) => {
    try {
      const managerId = (req.session as any).employeeId;
      const role = (req.session as any).role;
      const request = await storage.getLdRequest(req.params.id);
      if (!request) return res.status(404).json({ message: "L&D request not found" });

      if (!req.body.managerComment || !req.body.managerComment.trim()) {
        return res.status(400).json({ message: "Comment is required for rejection" });
      }

      if (role === "manager" && request.status !== "pending") {
        return res.status(400).json({ message: "Managers can only reject pending requests" });
      }
      if (role === "admin" && request.status !== "pending" && request.status !== "manager_approved") {
        return res.status(400).json({ message: "Only pending or manager-approved requests can be rejected" });
      }

      const updated = await storage.updateLdRequest(req.params.id, {
        status: "rejected",
        managerId,
        managerComment: req.body.managerComment.trim(),
      });

      // Fire-and-forget: notify employee of rejection
      const ldEmpReject = await storage.getEmployee(request.employeeId);
      if (ldEmpReject) {
        sendLdRejectedEmail(ldEmpReject.email, `${ldEmpReject.firstName} ${ldEmpReject.lastName}`, request.courseTitle, req.body.managerComment.trim());
      }

      return res.json(updated);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/ld-requests/:id/assign", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const request = await storage.getLdRequest(req.params.id);
      if (!request) return res.status(404).json({ message: "L&D request not found" });

      if (request.status !== "manager_approved" && request.status !== "approved") {
        return res.status(400).json({ message: "Only manager-approved or approved requests can be assigned" });
      }

      const updated = await storage.updateLdRequest(req.params.id, {
        status: "approved",
        assignedTo: req.body.assignedTo,
        adminComment: req.body.adminComment?.trim() || null,
      });

      // Fire-and-forget: notify assigned person
      if (req.body.assignedTo) {
        const ldAssignee = await storage.getEmployee(req.body.assignedTo);
        const ldEmpAssign = await storage.getEmployee(request.employeeId);
        if (ldAssignee && ldEmpAssign) {
          sendLdAssignedEmail(ldAssignee.email, `${ldAssignee.firstName} ${ldAssignee.lastName}`, `${ldEmpAssign.firstName} ${ldEmpAssign.lastName}`, request.courseTitle);
        }
      }

      return res.json(updated);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/ld-requests/:id/cancel", requireAuth, async (req: Request, res: Response) => {
    try {
      const employeeId = (req.session as any).employeeId;
      const request = await storage.getLdRequest(req.params.id);
      if (!request) return res.status(404).json({ message: "L&D request not found" });
      if (request.employeeId !== employeeId) {
        return res.status(403).json({ message: "You can only cancel your own requests" });
      }
      if (request.status !== "pending") {
        return res.status(400).json({ message: "Only pending requests can be cancelled" });
      }
      const updated = await storage.updateLdRequest(req.params.id, { status: "cancelled" });
      return res.json(updated);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // ==================== LOAN REQUEST ROUTES ====================

  app.get("/api/loan-requests", requireAuth, async (req: Request, res: Response) => {
    try {
      const employeeId = (req.session as any).employeeId;
      const requests = await storage.getLoanRequestsByEmployee(employeeId);
      return res.json(requests);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/loan-requests/all", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const companyId = (req.session as any).companyId;
      const requests = await storage.getLoanRequestsByCompany(companyId);
      return res.json(requests);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/loan-requests/pending", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const companyId = (req.session as any).companyId;
      const requests = await storage.getPendingLoanRequestsByCompany(companyId);
      return res.json(requests);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/loan-requests/assigned-to-me", requireAuth, async (req: Request, res: Response) => {
    try {
      const employeeId = (req.session as any).employeeId;
      const requests = await storage.getLoanRequestsAssignedTo(employeeId);
      return res.json(requests);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/loan-requests", requireAuth, async (req: Request, res: Response) => {
    try {
      const companyId = (req.session as any).companyId;
      const employeeId = (req.session as any).employeeId;
      const employee = await storage.getEmployee(employeeId);
      if (!employee) return res.status(401).json({ message: "Employee not found" });
      if (employee.role === "contract") {
        return res.status(403).json({ message: "Contract employees are not eligible for loans" });
      }
      const parsed = insertLoanRequestSchema.safeParse({ ...req.body, companyId, employeeId });
      if (!parsed.success) {
        return res.status(400).json({ message: "Validation failed", errors: parsed.error.flatten() });
      }
      const request = await storage.createLoanRequest(parsed.data);

      // Fire-and-forget: notify admins
      const loanEmployeeName = `${employee.firstName} ${employee.lastName}`;
      const loanAmount = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(Number(parsed.data.amountRequested));
      const allEmpsLoan = await storage.getEmployeesByCompany(companyId);
      const adminsLoan = allEmpsLoan.filter(e => e.role === "admin");
      for (const admin of adminsLoan) {
        sendLoanRequestNotification(admin.email, `${admin.firstName} ${admin.lastName}`, loanEmployeeName, loanAmount, parsed.data.purpose);
      }

      return res.status(201).json(request);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/loan-requests/:id/approve", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const reviewedBy = (req.session as any).employeeId;
      const request = await storage.getLoanRequest(req.params.id);
      if (!request) return res.status(404).json({ message: "Loan request not found" });
      if (request.status !== "pending") {
        return res.status(400).json({ message: "Only pending requests can be approved" });
      }
      const updated = await storage.updateLoanRequest(req.params.id, {
        status: "approved",
        reviewedBy,
        adminComment: req.body.adminComment?.trim() || null,
      });

      // Fire-and-forget: notify employee
      const loanEmpApprove = await storage.getEmployee(request.employeeId);
      if (loanEmpApprove) {
        const loanAmtApprove = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(Number(request.amountRequested));
        sendLoanApprovedEmail(loanEmpApprove.email, `${loanEmpApprove.firstName} ${loanEmpApprove.lastName}`, loanAmtApprove, request.purpose);
      }

      return res.json(updated);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/loan-requests/:id/reject", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const reviewedBy = (req.session as any).employeeId;
      const request = await storage.getLoanRequest(req.params.id);
      if (!request) return res.status(404).json({ message: "Loan request not found" });
      if (request.status !== "pending") {
        return res.status(400).json({ message: "Only pending requests can be rejected" });
      }
      if (!req.body.adminComment || !req.body.adminComment.trim()) {
        return res.status(400).json({ message: "Comment is required for rejection" });
      }
      const updated = await storage.updateLoanRequest(req.params.id, {
        status: "rejected",
        reviewedBy,
        adminComment: req.body.adminComment.trim(),
      });

      // Fire-and-forget: notify employee
      const loanEmpReject = await storage.getEmployee(request.employeeId);
      if (loanEmpReject) {
        sendLoanRejectedEmail(loanEmpReject.email, `${loanEmpReject.firstName} ${loanEmpReject.lastName}`, request.purpose, req.body.adminComment.trim());
      }

      return res.json(updated);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/loan-requests/:id/assign", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const request = await storage.getLoanRequest(req.params.id);
      if (!request) return res.status(404).json({ message: "Loan request not found" });
      if (request.status !== "pending" && request.status !== "approved") {
        return res.status(400).json({ message: "Only pending or approved requests can be assigned" });
      }
      const updated = await storage.updateLoanRequest(req.params.id, {
        status: "approved",
        assignedTo: req.body.assignedTo,
        adminComment: req.body.adminComment?.trim() || request.adminComment,
      });

      // Fire-and-forget: notify assigned person
      if (req.body.assignedTo) {
        const loanAssignee = await storage.getEmployee(req.body.assignedTo);
        const loanEmpAssign = await storage.getEmployee(request.employeeId);
        if (loanAssignee && loanEmpAssign) {
          const loanAmtAssign = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(Number(request.amountRequested));
          sendLoanAssignedEmail(loanAssignee.email, `${loanAssignee.firstName} ${loanAssignee.lastName}`, `${loanEmpAssign.firstName} ${loanEmpAssign.lastName}`, request.purpose, loanAmtAssign);
        }
      }

      return res.json(updated);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/loan-requests/:id/cancel", requireAuth, async (req: Request, res: Response) => {
    try {
      const employeeId = (req.session as any).employeeId;
      const request = await storage.getLoanRequest(req.params.id);
      if (!request) return res.status(404).json({ message: "Loan request not found" });
      if (request.employeeId !== employeeId) {
        return res.status(403).json({ message: "You can only cancel your own requests" });
      }
      if (request.status !== "pending") {
        return res.status(400).json({ message: "Only pending requests can be cancelled" });
      }
      const updated = await storage.updateLoanRequest(req.params.id, { status: "cancelled" });
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

      // Fire-and-forget: notify the employee that a query has been raised
      const queryEmployee = await storage.getEmployee(parsed.data.employeeId);
      if (queryEmployee) {
        sendQueryRaisedEmail(queryEmployee.email, `${queryEmployee.firstName} ${queryEmployee.lastName}`, parsed.data.subject);
      }

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

      // Fire-and-forget: notify the employee of status change
      const queryEmpStatus = await storage.getEmployee(query.employeeId);
      if (queryEmpStatus) {
        sendQueryStatusUpdateEmail(queryEmpStatus.email, `${queryEmpStatus.firstName} ${queryEmpStatus.lastName}`, query.subject, status);
      }

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
        fileUrl: `/api/uploads/${file.filename}`,
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
      const { questionText, questionType, order, competencyId, section, sectionId, reviewerTypes } = req.body;
      if (!questionText || !questionType) {
        return res.status(400).json({ message: "questionText and questionType are required" });
      }
      const question = await storage.createTemplateQuestion({
        templateId: req.params.id,
        questionText,
        questionType,
        order,
        competencyId,
        section: section || null,
        sectionId: sectionId || null,
        reviewerTypes: reviewerTypes || ["self", "peer", "manager"],
      });
      return res.status(201).json(question);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/template-questions/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const validReviewerTypes = ["self", "peer", "manager"];
      if (req.body.reviewerTypes) {
        if (!Array.isArray(req.body.reviewerTypes) || req.body.reviewerTypes.length === 0) {
          return res.status(400).json({ message: "reviewerTypes must be a non-empty array" });
        }
        if (!req.body.reviewerTypes.every((t: string) => validReviewerTypes.includes(t))) {
          return res.status(400).json({ message: "reviewerTypes must contain only: self, peer, manager" });
        }
      }
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

  // ==================== TEMPLATE SECTIONS ====================

  app.get("/api/appraisal-templates/:id/sections", requireAuth, async (req: Request, res: Response) => {
    try {
      const sections = await storage.getTemplateSections(req.params.id);
      return res.json(sections);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/appraisal-templates/:id/sections", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { name, order } = req.body;
      if (!name) {
        return res.status(400).json({ message: "Section name is required" });
      }
      const section = await storage.createTemplateSection({
        templateId: req.params.id,
        name,
        order: order || 0,
      });
      return res.status(201).json(section);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/template-sections/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const section = await storage.updateTemplateSection(req.params.id, req.body);
      if (!section) return res.status(404).json({ message: "Section not found" });
      return res.json(section);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/template-sections/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const deleted = await storage.deleteTemplateSection(req.params.id);
      if (!deleted) return res.status(404).json({ message: "Section not found" });
      return res.json({ message: "Section deleted" });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // ==================== COMPETENCIES ====================

  app.get("/api/competencies", requireAuth, async (req: Request, res: Response) => {
    try {
      const companyId = (req.session as any).companyId;
      const comps = await storage.getCompetenciesByCompany(companyId);
      return res.json(comps);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/competencies", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const companyId = (req.session as any).companyId;
      const { name, description, category } = req.body;
      if (!name || !category) {
        return res.status(400).json({ message: "name and category are required" });
      }
      const competency = await storage.createCompetency({
        companyId,
        name,
        description: description || "",
        category,
      });
      return res.status(201).json(competency);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/competencies/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const competency = await storage.getCompetency(req.params.id);
      if (!competency) return res.status(404).json({ message: "Competency not found" });
      return res.json(competency);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/competencies/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const competency = await storage.updateCompetency(req.params.id, req.body);
      if (!competency) return res.status(404).json({ message: "Competency not found" });
      return res.json(competency);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/competencies/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const deleted = await storage.deleteCompetency(req.params.id);
      if (!deleted) return res.status(404).json({ message: "Competency not found" });
      return res.json({ message: "Competency deleted" });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // ==================== COMPETENCY QUESTIONS ====================

  app.get("/api/competencies/:id/questions", requireAuth, async (req: Request, res: Response) => {
    try {
      const questions = await storage.getCompetencyQuestions(req.params.id);
      return res.json(questions);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/competencies/:id/questions", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { questionText, questionType, order } = req.body;
      if (!questionText) {
        return res.status(400).json({ message: "questionText is required" });
      }
      const question = await storage.createCompetencyQuestion({
        competencyId: req.params.id,
        questionText,
        questionType: questionType || "rating",
        order: order || 0,
      });
      return res.status(201).json(question);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/competency-questions/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const question = await storage.updateCompetencyQuestion(req.params.id, req.body);
      if (!question) return res.status(404).json({ message: "Question not found" });
      return res.json(question);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/competency-questions/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const deleted = await storage.deleteCompetencyQuestion(req.params.id);
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

        // Fire-and-forget: notify employee of appraisal assignment
        if (employee) {
          sendAppraisalAssignedEmail(employee.email, `${employee.firstName} ${employee.lastName}`, cycle.name);
        }

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

  app.get("/api/appraisal-cycles/:id/has-submitted-feedback", requireAuth, requireManagerOrAdmin, async (req: Request, res: Response) => {
    try {
      const appraisals = await storage.getAppraisalsByCycle(req.params.id);
      let hasSubmitted = false;
      for (const appraisal of appraisals) {
        const feedbacks = await storage.getAppraisalFeedbackByAppraisal(appraisal.id);
        if (feedbacks.some(f => f.status === "submitted")) {
          hasSubmitted = true;
          break;
        }
      }
      return res.json({ hasSubmittedFeedback: hasSubmitted });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/peer-assignments/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { revieweeId, reviewerId } = req.body;
      if (!revieweeId && !reviewerId) {
        return res.status(400).json({ message: "At least one of revieweeId or reviewerId is required" });
      }
      if (revieweeId && reviewerId && revieweeId === reviewerId) {
        return res.status(400).json({ message: "Reviewee and reviewer cannot be the same person" });
      }
      const currentAssignment = await storage.getPeerAssignment(req.params.id);
      if (!currentAssignment) return res.status(404).json({ message: "Peer assignment not found" });
      const cycleId = currentAssignment.cycleId;
      const finalRevieweeId = revieweeId || currentAssignment.revieweeId;
      const finalReviewerId = reviewerId || currentAssignment.reviewerId;
      if (finalRevieweeId === finalReviewerId) {
        return res.status(400).json({ message: "Reviewee and reviewer cannot be the same person" });
      }
      if (cycleId && finalRevieweeId && finalReviewerId) {
        const cycleAssignments = await storage.getPeerAssignmentsByCycle(cycleId);
        const duplicate = cycleAssignments.find(
          a => a.revieweeId === finalRevieweeId && a.reviewerId === finalReviewerId && a.id !== req.params.id
        );
        if (duplicate) {
          return res.status(400).json({ message: "This peer assignment already exists" });
        }
      }
      const updated = await storage.updatePeerAssignment(req.params.id, { revieweeId, reviewerId });
      if (!updated) return res.status(404).json({ message: "Peer assignment not found" });
      return res.json(updated);
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
      let sections: any[] = [];
      if (cycle && cycle.templateId) {
        questions = await storage.getTemplateQuestions(cycle.templateId);
        sections = await storage.getTemplateSections(cycle.templateId);
      }

      return res.json({
        appraisal,
        cycle: cycle ? { id: cycle.id, name: cycle.name, type: cycle.type, selfWeight: cycle.selfWeight, peerWeight: cycle.peerWeight, managerWeight: cycle.managerWeight } : null,
        feedbacks: feedbackWithRatings,
        questions,
        sections,
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

  app.get("/api/employees/:id/leave-requests", requireAuth, async (req: Request, res: Response) => {
    try {
      const currentEmployeeId = (req.session as any).employeeId;
      const companyId = (req.session as any).companyId;
      const role = (req.session as any).role;
      const targetId = req.params.id;

      if (role === "admin") {
        const employee = await storage.getEmployee(targetId);
        if (!employee || employee.companyId !== companyId) return res.status(403).json({ message: "Access denied" });
      } else if (role === "manager") {
        const employee = await storage.getEmployee(targetId);
        if (!employee || employee.managerId !== currentEmployeeId) return res.status(403).json({ message: "Access denied" });
      } else {
        if (targetId !== currentEmployeeId) return res.status(403).json({ message: "Access denied" });
      }

      const requests = await storage.getLeaveRequestsByEmployee(targetId);
      return res.json(requests);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/employees/:id/ld-requests", requireAuth, async (req: Request, res: Response) => {
    try {
      const currentEmployeeId = (req.session as any).employeeId;
      const companyId = (req.session as any).companyId;
      const role = (req.session as any).role;
      const targetId = req.params.id;

      if (role === "admin") {
        const employee = await storage.getEmployee(targetId);
        if (!employee || employee.companyId !== companyId) return res.status(403).json({ message: "Access denied" });
      } else if (role === "manager") {
        const employee = await storage.getEmployee(targetId);
        if (!employee || employee.managerId !== currentEmployeeId) return res.status(403).json({ message: "Access denied" });
      } else {
        if (targetId !== currentEmployeeId) return res.status(403).json({ message: "Access denied" });
      }

      const requests = await storage.getLdRequestsByEmployee(targetId);
      return res.json(requests);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/employees/:id/loan-requests", requireAuth, async (req: Request, res: Response) => {
    try {
      const currentEmployeeId = (req.session as any).employeeId;
      const companyId = (req.session as any).companyId;
      const role = (req.session as any).role;
      const targetId = req.params.id;

      // Loans: only admin and the employee themselves
      if (role === "admin") {
        const employee = await storage.getEmployee(targetId);
        if (!employee || employee.companyId !== companyId) return res.status(403).json({ message: "Access denied" });
      } else {
        if (targetId !== currentEmployeeId) return res.status(403).json({ message: "Access denied" });
      }

      const requests = await storage.getLoanRequestsByEmployee(targetId);
      return res.json(requests);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // ==================== FEEDBACK ====================

  app.get("/api/feedback/pending", requireAuth, async (req: Request, res: Response) => {
    try {
      const employeeId = (req.session as any).employeeId;
      const allFeedback = await storage.getAppraisalFeedbackByReviewer(employeeId);
      const enriched = await Promise.all(allFeedback.map(async (f) => {
        const appraisal = await storage.getAppraisal(f.appraisalId);
        let employeeName = "Unknown";
        let cycleName = "Review";
        if (appraisal) {
          const emp = await storage.getEmployee(appraisal.employeeId);
          if (emp) employeeName = `${emp.firstName} ${emp.lastName}`;
          const cycle = await storage.getAppraisalCycle(appraisal.cycleId);
          if (cycle) cycleName = cycle.name;
        }
        return { ...f, employeeName, cycleName };
      }));
      return res.json(enriched);
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
      let sections: any[] = [];
      let cycle: any = null;
      let employee: any = null;
      if (appraisal) {
        cycle = await storage.getAppraisalCycle(appraisal.cycleId);
        if (cycle && cycle.templateId) {
          questions = await storage.getTemplateQuestions(cycle.templateId);
          sections = await storage.getTemplateSections(cycle.templateId);
        }
        employee = await storage.getEmployee(appraisal.employeeId);
      }

      return res.json({
        feedback,
        appraisal,
        cycle: cycle ? { id: cycle.id, name: cycle.name, type: cycle.type } : null,
        questions,
        sections,
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

      // Fire-and-forget: if self-review, notify manager
      if (feedback.reviewerType === "self") {
        const selfAppraisal = await storage.getAppraisal(feedback.appraisalId);
        if (selfAppraisal) {
          const selfEmployee = await storage.getEmployee(selfAppraisal.employeeId);
          if (selfEmployee && selfEmployee.managerId) {
            const selfManager = await storage.getEmployee(selfEmployee.managerId);
            const selfCycle = await storage.getAppraisalCycle(selfAppraisal.cycleId);
            if (selfManager && selfCycle) {
              sendAppraisalSelfReviewCompleteEmail(selfManager.email, `${selfManager.firstName} ${selfManager.lastName}`, `${selfEmployee.firstName} ${selfEmployee.lastName}`, selfCycle.name);
            }
          }
        }
      }

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

          // Fire-and-forget: notify employee that appraisal is completed
          const completedEmp = await storage.getEmployee(appraisal.employeeId);
          const completedCycle = cycle || await storage.getAppraisalCycle(appraisal.cycleId);
          if (completedEmp && completedCycle) {
            sendAppraisalCompletedEmail(completedEmp.email, `${completedEmp.firstName} ${completedEmp.lastName}`, completedCycle.name);
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

      // Fire-and-forget: notify assigned employee(s)
      if (parsed.data.assignmentType === "individual" && parsed.data.targetEmployeeId) {
        const taskEmp = await storage.getEmployee(parsed.data.targetEmployeeId);
        if (taskEmp) {
          sendTaskAssignedEmail(taskEmp.email, `${taskEmp.firstName} ${taskEmp.lastName}`, parsed.data.title);
        }
      } else if (parsed.data.assignmentType === "department" && parsed.data.targetDepartmentId) {
        const deptEmps = await storage.getEmployeesByCompany(companyId);
        const deptEmployees = deptEmps.filter(e => e.departmentId === parsed.data.targetDepartmentId);
        for (const emp of deptEmployees) {
          sendTaskAssignedEmail(emp.email, `${emp.firstName} ${emp.lastName}`, parsed.data.title);
        }
      } else if (parsed.data.assignmentType === "everyone") {
        const companyEmps = await storage.getEmployeesByCompany(companyId);
        for (const emp of companyEmps) {
          sendTaskAssignedEmail(emp.email, `${emp.firstName} ${emp.lastName}`, parsed.data.title);
        }
      }

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

      const { itemId, acknowledge } = req.body;
      if (!itemId) return res.status(400).json({ message: "itemId is required" });

      const assignment = await storage.getTaskAssignment(req.params.id);
      if (!assignment || assignment.companyId !== companyId) return res.status(404).json({ message: "Assignment not found" });

      let items: any[] = [];
      try { items = JSON.parse(assignment.items); } catch {}
      const item = items.find((i: any) => i.id === itemId);
      if (!item) return res.status(400).json({ message: "Item not found in this assignment" });

      if (item.requiresAcknowledgment && !acknowledge) {
        return res.status(400).json({ message: "This item requires acknowledgment. Use the Acknowledge & Sign flow." });
      }

      if (acknowledge) {
        const existingCompletions = await storage.getTaskCompletionsByAssignment(req.params.id);
        const existing = existingCompletions.find(c => c.employeeId === employeeId && c.itemId === itemId);
        if (existing?.acknowledged) {
          return res.status(400).json({ message: "This item has already been acknowledged and cannot be changed" });
        }

        const employee = await storage.getEmployee(employeeId);
        const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : "Unknown";

        const completion = await storage.toggleTaskCompletion(req.params.id, employeeId, itemId, {
          acknowledged: true,
          acknowledgedByName: employeeName,
        });

        // Fire-and-forget: if all items completed via acknowledge, notify assigner
        if (completion.completed) {
          const ackCompletions = await storage.getTaskCompletionsByAssignment(req.params.id);
          const ackMyCompletions = ackCompletions.filter(c => c.employeeId === employeeId && c.completed);
          if (ackMyCompletions.length === items.length && items.length > 0) {
            const ackEmp = await storage.getEmployee(employeeId);
            if (ackEmp && assignment.assignedById) {
              const ackAssigner = await storage.getEmployee(assignment.assignedById);
              if (ackAssigner) {
                sendTaskCompletedEmail(ackAssigner.email, `${ackAssigner.firstName} ${ackAssigner.lastName}`, `${ackEmp.firstName} ${ackEmp.lastName}`, assignment.title);
              }
            }
          }
        }

        return res.json(completion);
      }

      const existingCompletions = await storage.getTaskCompletionsByAssignment(req.params.id);
      const existing = existingCompletions.find(c => c.employeeId === employeeId && c.itemId === itemId);
      if (existing?.acknowledged) {
        return res.status(400).json({ message: "This item has been acknowledged and cannot be unchecked" });
      }

      const completion = await storage.toggleTaskCompletion(req.params.id, employeeId, itemId);

      // Fire-and-forget: if all items completed, notify the assigner
      if (completion.completed) {
        const allCompletions = await storage.getTaskCompletionsByAssignment(req.params.id);
        const myCompletions = allCompletions.filter(c => c.employeeId === employeeId && c.completed);
        if (myCompletions.length === items.length && items.length > 0) {
          const taskEmpComplete = await storage.getEmployee(employeeId);
          if (taskEmpComplete && assignment.assignedById) {
            const assigner = await storage.getEmployee(assignment.assignedById);
            if (assigner) {
              sendTaskCompletedEmail(assigner.email, `${assigner.firstName} ${assigner.lastName}`, `${taskEmpComplete.firstName} ${taskEmpComplete.lastName}`, assignment.title);
            }
          }
        }
      }

      return res.json(completion);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // ==================== RECRUITMENT - JOB POSTINGS ====================

  app.get("/api/job-postings", requireAuth, requireManagerOrAdmin, async (req, res) => {
    try {
      const companyId = (req.session as any).companyId;
      const role = (req.session as any).role;
      const employeeId = (req.session as any).employeeId;
      if (!companyId) return res.status(401).json({ message: "Not authenticated" });

      let postings = await storage.getJobPostingsByCompany(companyId);

      if (role === "manager") {
        postings = postings.filter(p => p.assignedManagerId === employeeId);
      }

      return res.json(postings);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/job-postings/active", requireAuth, requireManagerOrAdmin, async (req, res) => {
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

  app.get("/api/job-postings/public/job/:id", async (req, res) => {
    try {
      const posting = await storage.getJobPosting(req.params.id);
      if (!posting || posting.status !== "active") {
        return res.status(404).json({ message: "Job posting not found" });
      }
      return res.json(posting);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/job-postings/:id", requireAuth, requireManagerOrAdmin, async (req, res) => {
    try {
      const posting = await storage.getJobPosting(req.params.id);
      if (!posting) return res.status(404).json({ message: "Job posting not found" });
      return res.json(posting);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/job-postings", requireAuth, requireAdmin, async (req, res) => {
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

  app.patch("/api/job-postings/:id", requireAuth, requireAdmin, async (req, res) => {
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

  app.delete("/api/job-postings/:id", requireAuth, requireAdmin, async (req, res) => {
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

  app.post("/api/job-postings/:id/archive", requireAuth, requireAdmin, async (req, res) => {
    try {
      const companyId = (req.session as any).companyId;
      const role = (req.session as any).role;
      if (!companyId) return res.status(401).json({ message: "Not authenticated" });
      if (role !== "admin") return res.status(403).json({ message: "Only admins can archive job postings" });

      const existing = await storage.getJobPosting(req.params.id);
      if (!existing || existing.companyId !== companyId) return res.status(404).json({ message: "Job posting not found" });

      const archived = await storage.archiveJobPosting(req.params.id);
      return res.json(archived);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/job-postings/:id/unarchive", requireAuth, requireAdmin, async (req, res) => {
    try {
      const companyId = (req.session as any).companyId;
      const role = (req.session as any).role;
      if (!companyId) return res.status(401).json({ message: "Not authenticated" });
      if (role !== "admin") return res.status(403).json({ message: "Only admins can unarchive job postings" });

      const existing = await storage.getJobPosting(req.params.id);
      if (!existing || existing.companyId !== companyId) return res.status(404).json({ message: "Job posting not found" });
      if (existing.status !== "archived") return res.status(400).json({ message: "Job posting is not archived" });

      const restored = await storage.unarchiveJobPosting(req.params.id);
      return res.json(restored);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // ==================== RECRUITMENT - CANDIDATES ====================

  async function canManagerAccessCandidate(employeeId: string, companyId: string, candidate: { jobId: string; assignedManagerId: string | null }): Promise<boolean> {
    const posting = await storage.getJobPosting(candidate.jobId);
    return (
      candidate.assignedManagerId === employeeId ||
      (!!posting && posting.assignedManagerId === employeeId)
    );
  }

  app.get("/api/candidates", requireAuth, requireManagerOrAdmin, async (req, res) => {
    try {
      const companyId = (req.session as any).companyId;
      const role = (req.session as any).role;
      const employeeId = (req.session as any).employeeId;
      if (!companyId) return res.status(401).json({ message: "Not authenticated" });

      let cands = await storage.getCandidatesByCompany(companyId);

      if (role === "manager") {
        const results = await Promise.all(cands.map(c => canManagerAccessCandidate(employeeId, companyId, c)));
        cands = cands.filter((_, i) => results[i]);
      }

      return res.json(cands);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/candidates/:id", requireAuth, requireManagerOrAdmin, async (req, res) => {
    try {
      const companyId = (req.session as any).companyId;
      const role = (req.session as any).role;
      const employeeId = (req.session as any).employeeId;
      if (!companyId) return res.status(401).json({ message: "Not authenticated" });
      const candidate = await storage.getCandidate(req.params.id);
      if (!candidate || candidate.companyId !== companyId) return res.status(404).json({ message: "Candidate not found" });

      if (role === "manager") {
        const hasAccess = await canManagerAccessCandidate(employeeId, companyId, candidate);
        if (!hasAccess) return res.status(404).json({ message: "Candidate not found" });
      }

      return res.json(candidate);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/candidates", requireAuth, requireAdmin, async (req, res) => {
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
      const { jobId, firstName, lastName, email, phone, location, linkedinUrl, gender, coverLetter, source, resumeFileName, resumeFileUrl, website, ndpaConsent } = req.body;
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
        website,
        source: source || "website",
        resumeFileName,
        resumeFileUrl,
        ndpaConsent: ndpaConsent || false,
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

  app.patch("/api/candidates/:id", requireAuth, requireManagerOrAdmin, async (req, res) => {
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

  app.delete("/api/candidates/:id", requireAuth, requireAdmin, async (req, res) => {
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

  app.get("/api/candidates/:id/activities", requireAuth, requireManagerOrAdmin, async (req, res) => {
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

  app.get("/api/candidates/:id/notes", requireAuth, requireManagerOrAdmin, async (req, res) => {
    try {
      const companyId = (req.session as any).companyId;
      if (!companyId) return res.status(401).json({ message: "Not authenticated" });
      const notes = await storage.getCandidateNotes(req.params.id);
      return res.json(notes);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/candidates/:id/notes", requireAuth, requireManagerOrAdmin, async (req, res) => {
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

  app.get("/api/candidates/:id/assessments", requireAuth, requireManagerOrAdmin, async (req, res) => {
    try {
      const companyId = (req.session as any).companyId;
      if (!companyId) return res.status(401).json({ message: "Not authenticated" });
      const assessments = await storage.getCandidateAssessments(req.params.id);
      return res.json(assessments);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/candidates/:id/assessments", requireAuth, requireManagerOrAdmin, async (req, res) => {
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

  app.get("/api/interviews", requireAuth, requireManagerOrAdmin, async (req, res) => {
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

  app.get("/api/candidates/:id/interviews", requireAuth, requireManagerOrAdmin, async (req, res) => {
    try {
      const companyId = (req.session as any).companyId;
      if (!companyId) return res.status(401).json({ message: "Not authenticated" });
      const interviews = await storage.getCandidateInterviews(req.params.id);
      return res.json(interviews);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/candidates/:id/interviews", requireAuth, requireAdmin, async (req, res) => {
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

  app.patch("/api/interviews/:id/feedback", requireAuth, requireManagerOrAdmin, async (req, res) => {
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

  app.delete("/api/interviews/:id", requireAuth, requireAdmin, async (req, res) => {
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

  app.get("/api/candidates/:id/communications", requireAuth, requireManagerOrAdmin, async (req, res) => {
    try {
      const companyId = (req.session as any).companyId;
      if (!companyId) return res.status(401).json({ message: "Not authenticated" });
      const comms = await storage.getCandidateCommunications(req.params.id);
      return res.json(comms);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/candidates/:id/communications", requireAuth, requireManagerOrAdmin, async (req, res) => {
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

  // ==================== PIPELINE STAGES ====================

  const DEFAULT_PIPELINE_STAGES = [
    { key: "new", label: "New Application", color: "#6b7280" },
    { key: "screening", label: "Screening", color: "#3b82f6" },
    { key: "manager_review", label: "Manager Review", color: "#6366f1" },
    { key: "phone_interview", label: "Phone Interview", color: "#8b5cf6" },
    { key: "technical_interview", label: "Technical Interview", color: "#7c3aed" },
    { key: "final_interview", label: "Final Interview", color: "#ec4899" },
    { key: "offer_extended", label: "Offer Extended", color: "#f59e0b" },
    { key: "hired", label: "Hired", color: "#22c55e" },
    { key: "rejected", label: "Rejected", color: "#ef4444" },
    { key: "withdrawn", label: "Withdrawn", color: "#6b7280" },
  ];

  app.get("/api/recruitment/pipeline-stages", requireAuth, requireManagerOrAdmin, async (req, res) => {
    try {
      const companyId = (req.session as any).companyId;
      if (!companyId) return res.status(401).json({ message: "Not authenticated" });
      const settings = await storage.getRecruitmentSettings(companyId);
      const setting = settings.find(s => s.key === "pipeline_stages");
      if (setting) {
        return res.json(JSON.parse(setting.value));
      }
      return res.json(DEFAULT_PIPELINE_STAGES);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/recruitment/pipeline-stages", requireAuth, requireAdmin, async (req, res) => {
    try {
      const companyId = (req.session as any).companyId;
      if (!companyId) return res.status(401).json({ message: "Not authenticated" });
      const stages = req.body;
      if (!Array.isArray(stages) || stages.length === 0) {
        return res.status(400).json({ message: "Stages must be a non-empty array" });
      }
      for (const stage of stages) {
        if (!stage.key || !stage.label || !stage.color) {
          return res.status(400).json({ message: "Each stage must have key, label, and color" });
        }
      }
      await storage.upsertRecruitmentSetting(companyId, "pipeline_stages", JSON.stringify(stages));
      return res.json(stages);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // ==================== EMAIL TEMPLATES ====================

  app.get("/api/email-templates", requireAuth, requireManagerOrAdmin, async (req, res) => {
    try {
      const companyId = (req.session as any).companyId;
      if (!companyId) return res.status(401).json({ message: "Not authenticated" });
      const templates = await storage.getEmailTemplatesByCompany(companyId);
      return res.json(templates);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/email-templates", requireAuth, requireAdmin, async (req, res) => {
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

  app.patch("/api/email-templates/:id", requireAuth, requireAdmin, async (req, res) => {
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

  app.delete("/api/email-templates/:id", requireAuth, requireAdmin, async (req, res) => {
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
        fileUrl: `/api/uploads/${req.file.filename}`,
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
