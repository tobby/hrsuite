import { eq, and, like, desc, sql } from "drizzle-orm";
import { db } from "./db";
import {
  companies, type Company, type InsertCompany,
  departments, type Department, type InsertDepartment,
  employees, type Employee, type InsertEmployee,
  leaveTypes, type LeaveType, type InsertLeaveType,
  leaveBalances, type LeaveBalance,
  leaveRequests, type LeaveRequest, type InsertLeaveRequest,
} from "@shared/schema";
import { randomUUID, randomBytes } from "crypto";

export interface IStorage {
  // Companies
  createCompany(data: InsertCompany): Promise<Company>;
  getCompany(id: string): Promise<Company | undefined>;
  updateCompany(id: string, data: Partial<InsertCompany>): Promise<Company | undefined>;

  // Departments
  createDepartment(data: InsertDepartment): Promise<Department>;
  getDepartment(id: string): Promise<Department | undefined>;
  getDepartmentsByCompany(companyId: string): Promise<Department[]>;
  updateDepartment(id: string, data: Partial<InsertDepartment>): Promise<Department | undefined>;
  deleteDepartment(id: string): Promise<boolean>;

  // Employees
  createEmployee(data: InsertEmployee): Promise<Employee>;
  getEmployee(id: string): Promise<Employee | undefined>;
  getEmployeeByEmail(email: string): Promise<Employee | undefined>;
  getEmployeeByEmployeeId(employeeId: string): Promise<Employee | undefined>;
  getEmployeeByInviteToken(token: string): Promise<Employee | undefined>;
  getEmployeesByCompany(companyId: string): Promise<Employee[]>;
  updateEmployee(id: string, data: Partial<Employee>): Promise<Employee | undefined>;
  deleteEmployee(id: string): Promise<boolean>;
  generateEmployeeId(companyId: string): Promise<string>;
  generateInviteToken(employeeId: string): Promise<string>;

  // Leave Types
  createLeaveType(data: InsertLeaveType): Promise<LeaveType>;
  getLeaveTypesByCompany(companyId: string): Promise<LeaveType[]>;
  getLeaveType(id: string): Promise<LeaveType | undefined>;
  updateLeaveType(id: string, data: Partial<InsertLeaveType>): Promise<LeaveType | undefined>;
  deleteLeaveType(id: string): Promise<boolean>;

  // Leave Balances
  getLeaveBalancesByEmployee(employeeId: string, year: number): Promise<LeaveBalance[]>;
  getLeaveBalancesByCompany(companyId: string, year: number): Promise<LeaveBalance[]>;
  upsertLeaveBalance(data: { companyId: string; employeeId: string; leaveTypeId: string; totalDays: number; usedDays: number; remainingDays: number; year: number }): Promise<LeaveBalance>;
  initializeBalancesForEmployee(companyId: string, employeeId: string, year: number): Promise<void>;
  initializeBalancesForLeaveType(companyId: string, leaveTypeId: string, defaultDays: number, year: number): Promise<void>;

  // Leave Requests
  createLeaveRequest(data: InsertLeaveRequest & { companyId: string; employeeId: string; totalDays: number; status?: string }): Promise<LeaveRequest>;
  getLeaveRequestsByEmployee(employeeId: string): Promise<LeaveRequest[]>;
  getLeaveRequestsByCompany(companyId: string): Promise<LeaveRequest[]>;
  getPendingLeaveRequestsByCompany(companyId: string): Promise<LeaveRequest[]>;
  getLeaveRequest(id: string): Promise<LeaveRequest | undefined>;
  updateLeaveRequest(id: string, data: Partial<LeaveRequest>): Promise<LeaveRequest | undefined>;
}

export class DatabaseStorage implements IStorage {
  // ==================== COMPANIES ====================

  async createCompany(data: InsertCompany): Promise<Company> {
    const [company] = await db.insert(companies).values(data).returning();
    return company;
  }

  async getCompany(id: string): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    return company;
  }

  async updateCompany(id: string, data: Partial<InsertCompany>): Promise<Company | undefined> {
    const [company] = await db.update(companies).set(data).where(eq(companies.id, id)).returning();
    return company;
  }

  // ==================== DEPARTMENTS ====================

  async createDepartment(data: InsertDepartment): Promise<Department> {
    const [department] = await db.insert(departments).values(data).returning();
    return department;
  }

  async getDepartment(id: string): Promise<Department | undefined> {
    const [department] = await db.select().from(departments).where(eq(departments.id, id));
    return department;
  }

  async getDepartmentsByCompany(companyId: string): Promise<Department[]> {
    return db.select().from(departments).where(eq(departments.companyId, companyId));
  }

  async updateDepartment(id: string, data: Partial<InsertDepartment>): Promise<Department | undefined> {
    const [department] = await db.update(departments).set(data).where(eq(departments.id, id)).returning();
    return department;
  }

  async deleteDepartment(id: string): Promise<boolean> {
    const result = await db.delete(departments).where(eq(departments.id, id)).returning();
    return result.length > 0;
  }

  // ==================== EMPLOYEES ====================

  async generateEmployeeId(companyId: string): Promise<string> {
    const existing = await db.select({ employeeId: employees.employeeId })
      .from(employees)
      .where(and(eq(employees.companyId, companyId), like(employees.employeeId, 'DOJ-%')))
      .orderBy(desc(employees.employeeId));

    let maxNum = 0;
    for (const row of existing) {
      if (row.employeeId) {
        const num = parseInt(row.employeeId.replace('DOJ-', ''), 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    }
    const next = maxNum + 1;
    return `DOJ-${String(next).padStart(3, '0')}`;
  }

  async createEmployee(data: InsertEmployee): Promise<Employee> {
    const employeeId = await this.generateEmployeeId(data.companyId);
    const [employee] = await db.insert(employees).values({ ...data, employeeId }).returning();
    return employee;
  }

  async getEmployee(id: string): Promise<Employee | undefined> {
    const [employee] = await db.select().from(employees).where(eq(employees.id, id));
    return employee;
  }

  async getEmployeeByEmail(email: string): Promise<Employee | undefined> {
    const [employee] = await db.select().from(employees).where(eq(employees.email, email));
    return employee;
  }

  async getEmployeeByEmployeeId(employeeId: string): Promise<Employee | undefined> {
    const [employee] = await db.select().from(employees).where(eq(employees.employeeId, employeeId));
    return employee;
  }

  async getEmployeeByInviteToken(token: string): Promise<Employee | undefined> {
    const [employee] = await db.select().from(employees).where(eq(employees.inviteToken, token));
    return employee;
  }

  async getEmployeesByCompany(companyId: string): Promise<Employee[]> {
    return db.select().from(employees).where(eq(employees.companyId, companyId)).orderBy(desc(employees.createdAt));
  }

  async updateEmployee(id: string, data: Partial<Employee>): Promise<Employee | undefined> {
    const [employee] = await db.update(employees).set(data).where(eq(employees.id, id)).returning();
    return employee;
  }

  async deleteEmployee(id: string): Promise<boolean> {
    const result = await db.delete(employees).where(eq(employees.id, id)).returning();
    return result.length > 0;
  }

  async generateInviteToken(employeeId: string): Promise<string> {
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await db.update(employees).set({
      inviteToken: token,
      inviteExpiresAt: expiresAt,
    }).where(eq(employees.id, employeeId));

    return token;
  }

  // ==================== LEAVE TYPES ====================

  async createLeaveType(data: InsertLeaveType): Promise<LeaveType> {
    const [leaveType] = await db.insert(leaveTypes).values(data).returning();
    return leaveType;
  }

  async getLeaveTypesByCompany(companyId: string): Promise<LeaveType[]> {
    return db.select().from(leaveTypes).where(eq(leaveTypes.companyId, companyId));
  }

  async getLeaveType(id: string): Promise<LeaveType | undefined> {
    const [leaveType] = await db.select().from(leaveTypes).where(eq(leaveTypes.id, id));
    return leaveType;
  }

  async updateLeaveType(id: string, data: Partial<InsertLeaveType>): Promise<LeaveType | undefined> {
    const [leaveType] = await db.update(leaveTypes).set(data).where(eq(leaveTypes.id, id)).returning();
    return leaveType;
  }

  async deleteLeaveType(id: string): Promise<boolean> {
    const result = await db.delete(leaveTypes).where(eq(leaveTypes.id, id)).returning();
    return result.length > 0;
  }

  // ==================== LEAVE BALANCES ====================

  async getLeaveBalancesByEmployee(employeeId: string, year: number): Promise<LeaveBalance[]> {
    return db.select().from(leaveBalances).where(
      and(eq(leaveBalances.employeeId, employeeId), eq(leaveBalances.year, year))
    );
  }

  async getLeaveBalancesByCompany(companyId: string, year: number): Promise<LeaveBalance[]> {
    return db.select().from(leaveBalances).where(
      and(eq(leaveBalances.companyId, companyId), eq(leaveBalances.year, year))
    );
  }

  async upsertLeaveBalance(data: { companyId: string; employeeId: string; leaveTypeId: string; totalDays: number; usedDays: number; remainingDays: number; year: number }): Promise<LeaveBalance> {
    const [existing] = await db.select().from(leaveBalances).where(
      and(
        eq(leaveBalances.companyId, data.companyId),
        eq(leaveBalances.employeeId, data.employeeId),
        eq(leaveBalances.leaveTypeId, data.leaveTypeId),
        eq(leaveBalances.year, data.year)
      )
    );

    if (existing) {
      const [updated] = await db.update(leaveBalances).set({
        totalDays: data.totalDays,
        usedDays: data.usedDays,
        remainingDays: data.remainingDays,
      }).where(eq(leaveBalances.id, existing.id)).returning();
      return updated;
    }

    const [created] = await db.insert(leaveBalances).values(data).returning();
    return created;
  }

  async initializeBalancesForEmployee(companyId: string, employeeId: string, year: number): Promise<void> {
    const types = await this.getLeaveTypesByCompany(companyId);
    for (const lt of types) {
      await this.upsertLeaveBalance({
        companyId,
        employeeId,
        leaveTypeId: lt.id,
        totalDays: lt.defaultDays,
        usedDays: 0,
        remainingDays: lt.defaultDays,
        year,
      });
    }
  }

  async initializeBalancesForLeaveType(companyId: string, leaveTypeId: string, defaultDays: number, year: number): Promise<void> {
    const companyEmployees = await this.getEmployeesByCompany(companyId);
    for (const emp of companyEmployees) {
      if (emp.role === 'contract' || emp.status !== 'active') continue;
      await this.upsertLeaveBalance({
        companyId,
        employeeId: emp.id,
        leaveTypeId,
        totalDays: defaultDays,
        usedDays: 0,
        remainingDays: defaultDays,
        year,
      });
    }
  }

  // ==================== LEAVE REQUESTS ====================

  async createLeaveRequest(data: InsertLeaveRequest & { companyId: string; employeeId: string; totalDays: number; status?: string }): Promise<LeaveRequest> {
    const [request] = await db.insert(leaveRequests).values(data).returning();
    return request;
  }

  async getLeaveRequestsByEmployee(employeeId: string): Promise<LeaveRequest[]> {
    return db.select().from(leaveRequests).where(eq(leaveRequests.employeeId, employeeId)).orderBy(desc(leaveRequests.createdAt));
  }

  async getLeaveRequestsByCompany(companyId: string): Promise<LeaveRequest[]> {
    return db.select().from(leaveRequests).where(eq(leaveRequests.companyId, companyId)).orderBy(desc(leaveRequests.createdAt));
  }

  async getPendingLeaveRequestsByCompany(companyId: string): Promise<LeaveRequest[]> {
    return db.select().from(leaveRequests).where(
      and(
        eq(leaveRequests.companyId, companyId),
        sql`${leaveRequests.status} IN ('pending', 'manager_approved')`
      )
    ).orderBy(desc(leaveRequests.createdAt));
  }

  async getLeaveRequest(id: string): Promise<LeaveRequest | undefined> {
    const [request] = await db.select().from(leaveRequests).where(eq(leaveRequests.id, id));
    return request;
  }

  async updateLeaveRequest(id: string, data: Partial<LeaveRequest>): Promise<LeaveRequest | undefined> {
    const [request] = await db.update(leaveRequests).set(data).where(eq(leaveRequests.id, id)).returning();
    return request;
  }
}

export const storage = new DatabaseStorage();
