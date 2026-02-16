# HRFlow - Comprehensive Test Cases

**Total Test Cases: 95**
**Last Updated: February 2026**

---

## 1. Authentication & Setup

| # | Test Case | Role | Steps | Expected Result |
|---|-----------|------|-------|-----------------|
| 1.1 | Company Setup | N/A | Visit app with empty DB, fill in company name, admin name, email, password | Company created, admin logged in, redirected to dashboard |
| 1.2 | Admin Login | Admin | Go to /login, enter admin email & password | Logged in, redirected to dashboard |
| 1.3 | Invalid Login | N/A | Enter wrong email/password | Error message shown, not logged in |
| 1.4 | Logout | Any | Click logout from sidebar | Session ends, redirected to login page |
| 1.5 | Session Persistence | Any | Log in, refresh page | Still logged in (session maintained) |

---

## 2. Employee Management

| # | Test Case | Role | Steps | Expected Result |
|---|-----------|------|-------|-----------------|
| 2.1 | Add Employee | Admin | Go to Employees, click Add, fill form with name/email/role/department | Employee created, invite link generated |
| 2.2 | Invite Acceptance | Invited User | Open invite link, set password | Employee account activated, can log in |
| 2.3 | Re-invite Employee | Admin | Click re-invite on a pending employee | New invite token generated |
| 2.4 | Edit Employee | Admin | Click edit on an employee, change role or department | Employee details updated |
| 2.5 | Delete Employee | Admin | Click delete on an employee, confirm | Employee removed |
| 2.6 | Employee Directory | Any | Navigate to Employees page | All employees listed with name, role, department, status |
| 2.7 | Role Restriction | Employee | Log in as Employee, try to access employee management actions | Add/edit/delete buttons not visible or actions blocked |
| 2.8 | Profile Update | Any | Log in as any user, update own profile | Profile changes saved |

---

## 3. Department Management

| # | Test Case | Role | Steps | Expected Result |
|---|-----------|------|-------|-----------------|
| 3.1 | Create Department | Admin | Go to Departments, click Add, enter name and optional manager | Department created |
| 3.2 | Edit Department | Admin | Click edit on a department, change name/manager | Department updated |
| 3.3 | Delete Department | Admin | Click delete on a department | Department removed (if no employees assigned) |
| 3.4 | Non-Admin Restriction | Employee | Log in as Employee, try to create/edit/delete department | Actions blocked or hidden |

---

## 4. Leave Management

| # | Test Case | Role | Steps | Expected Result |
|---|-----------|------|-------|-----------------|
| 4.1 | Create Leave Type | Admin | Go to Leave Settings, add a new leave type (e.g., Annual Leave, 20 days) | Leave type created |
| 4.2 | Initialize Leave Balances | Admin | Click Initialize Balances for a leave type | All eligible employees get balances |
| 4.3 | Update Leave Balances | Admin | Manually adjust an employee's leave balance | Balance updated |
| 4.4 | Submit Leave Request | Employee | Log in as employee, go to Leave, submit a request with dates and type | Request created with "pending" status |
| 4.5 | Approve Leave | Manager | Log in as manager, view pending requests, click Approve | Request approved, employee balance deducted |
| 4.6 | Reject Leave | Manager | Log in as manager, reject a leave request with reason | Request rejected, balance unchanged |
| 4.7 | Cancel Own Leave | Employee | Log in as employee, cancel own pending request | Request cancelled |
| 4.8 | Manager Scope | Manager | Log in as manager, check pending requests | Only sees requests from own direct reports |
| 4.9 | Admin Scope | Admin | Log in as admin, check all leave requests | Sees all company leave requests |
| 4.10 | Contract Worker Block | Contract | Log in as contract worker, navigate to Leave | Access blocked / module not visible in sidebar |
| 4.11 | Leave Analytics | Admin | Navigate to Leave Analytics page | Charts and stats displayed (leave usage, balances, trends) |
| 4.12 | Company Holidays | Admin | Add a company holiday with name and date | Holiday created and visible |

---

## 5. Performance Appraisals

| # | Test Case | Role | Steps | Expected Result |
|---|-----------|------|-------|-----------------|
| 5.1 | Create Template | Admin | Go to Appraisal Templates, create template with name and type (180/360) | Template created |
| 5.2 | Add Questions to Template | Admin | Open template, add star rating and text questions | Questions added to template |
| 5.3 | Edit/Delete Questions | Admin | Modify or remove a template question | Question updated/removed |
| 5.4 | Create Review Cycle | Admin | Go to Appraisal Cycles, create cycle with name, template, dates | Cycle created in draft status |
| 5.5 | Add Participants | Admin | Open cycle, add employees as participants | Participants added |
| 5.6 | Assign Peer Reviewers (360) | Admin | For 360 cycle, assign peer reviewers to participants | Peer assignments created |
| 5.7 | Activate Cycle | Admin | Click Activate on a draft cycle | Cycle activated, appraisals/feedback generated |
| 5.8 | Submit Self-Review | Employee | Log in as participant, complete self-review form | Self-review submitted with ratings and comments |
| 5.9 | Submit Manager Review | Manager | Log in as manager, complete review for direct report | Manager review submitted |
| 5.10 | Submit Peer Feedback (360) | Employee | Log in as peer reviewer, submit feedback | Peer feedback submitted |
| 5.11 | View Results | Admin/Manager | Open completed appraisal results page | Weighted scores, feedback summary, anonymous peer comments shown |
| 5.12 | Cycle Progress | Admin/Manager | View cycle progress page | Shows completion stats per participant |

---

## 6. Recruitment / ATS

| # | Test Case | Role | Steps | Expected Result |
|---|-----------|------|-------|-----------------|
| 6.1 | Create Job Posting | Admin | Go to Recruitment Jobs, create job with title, department, description, requirements | Job created in draft status |
| 6.2 | Publish Job | Admin | Change job status to "published" | Job visible on public careers page |
| 6.3 | Close Job | Admin | Change job status to "closed" | Job no longer on careers page |
| 6.4 | Edit Job Posting | Admin | Edit title, description, salary range | Job details updated |
| 6.5 | Delete Job Posting | Admin | Delete a job posting | Job removed |
| 6.6 | Public Careers Page | Public (No Auth) | Visit /careers (unauthenticated) | Lists all published jobs with company info |
| 6.7 | Public Job Details | Public (No Auth) | Click a job on careers page | Shows full job description, requirements, and Apply button |
| 6.8 | Submit Application | Public (No Auth) | Fill out application form with name, email, resume upload | Candidate created in "new" stage |
| 6.9 | View Candidates | Admin/Manager | Go to Recruitment Candidates page | All candidates listed (Kanban or table view) |
| 6.10 | Move Candidate Stage | Admin/Manager | Drag or change candidate stage (e.g., new -> screening) | Candidate stage updated, activity logged |
| 6.11 | Admin-Only Stages | Manager | Try to move candidate to offer_extended/hired as manager | Action blocked |
| 6.12 | Candidate Detail Page | Admin/Manager | Click on a candidate | Shows profile, resume, notes, interviews, assessments, communications |
| 6.13 | Add Candidate Note | Admin/Manager | Add a note on candidate detail page | Note saved and visible |
| 6.14 | Schedule Interview | Admin | Schedule interview with date, time, type, interviewers | Interview created |
| 6.15 | Submit Interview Feedback | Manager | Interviewer submits rating, strengths, weaknesses, recommendation | Feedback recorded |
| 6.16 | Add Assessment | Admin/Manager | Add assessment score for a candidate | Assessment saved |
| 6.17 | Send Communication | Admin/Manager | Send email/message to candidate | Communication logged |
| 6.18 | Manager Scope | Manager | Log in as manager, view candidates | Only sees candidates for own department's jobs |
| 6.19 | Email Templates | Admin | Create/edit/delete email templates in Recruitment Settings | Templates saved and available |

---

## 7. HR Disciplinary Query System

| # | Test Case | Role | Steps | Expected Result |
|---|-----------|------|-------|-----------------|
| 7.1 | Issue Query | Admin/Manager | Go to Queries, create new query for an employee with subject, description | Query created in "open" status |
| 7.2 | Issue Query with Attachments | Admin/Manager | Attach files (up to 5, max 10MB each) when issuing a query | Files uploaded and linked to query |
| 7.3 | Employee View | Employee | Log in as queried employee, view queries | Sees own queries only |
| 7.4 | Query Detail Page | Any (authorized) | Open a query detail page | Shows full details, timeline, comments, attachments |
| 7.5 | Employee Response | Employee | Employee responds to query with text and optional attachments | Response recorded, timeline updated |
| 7.6 | Add Comment | Admin/Manager | Admin/manager adds comment on query | Comment visible in timeline |
| 7.7 | Change Status | Admin/Manager | Update query status (open -> under_review -> resolved -> closed) | Status updated, timeline entry added |
| 7.8 | Reassign Query | Admin/Manager | Assign query to different manager | Assignment updated |
| 7.9 | Download Attachment | Any (authorized) | Click download on an attachment | File downloads successfully |
| 7.10 | Internal Notes | Admin | Admin adds internal note (not visible to employee) | Note saved, hidden from employee view |

---

## 8. Task Management

| # | Test Case | Role | Steps | Expected Result |
|---|-----------|------|-------|-----------------|
| 8.1 | Create Task Template | Admin | Go to Onboarding Templates, create template with checklist items | Template created |
| 8.2 | Edit Task Template | Admin | Modify template name or items | Template updated |
| 8.3 | Delete Task Template | Admin | Delete a task template | Template removed |
| 8.4 | Assign Task - Individual | Admin/Manager | Assign task to a specific employee | Task assigned, visible in employee's My Tasks |
| 8.5 | Assign Task - Department | Admin/Manager | Assign task to entire department | All department members see the task |
| 8.6 | Assign Task - Managers | Admin/Manager | Assign task to all managers | All managers see the task |
| 8.7 | Assign Task - Everyone | Admin/Manager | Assign task company-wide | All employees see the task |
| 8.8 | My Tasks View | Employee | Log in as employee, go to My Tasks | Shows all assigned tasks with completion status |
| 8.9 | Toggle Task Completion | Employee | Click to mark a task item as complete | Completion recorded per-person |
| 8.10 | Task Tracker | Admin/Manager | View task tracker page | Shows assignment progress, who completed what |
| 8.11 | Delete Assignment | Admin | Admin deletes a task assignment | Assignment removed |

---

## 9. Reports & Analytics (Admin Only)

| # | Test Case | Role | Steps | Expected Result |
|---|-----------|------|-------|-----------------|
| 9.1 | Access Control | Employee/Manager | Log in as non-admin, try to access Reports | Module hidden or access blocked |
| 9.2 | Workforce Tab | Admin | View workforce analytics | Employee count by department, role distribution, headcount charts |
| 9.3 | Leave Tab | Admin | View leave analytics | Leave usage by type, department, approval rates |
| 9.4 | Recruitment Tab | Admin | View recruitment analytics | Job posting stats, pipeline funnel, time-to-hire metrics |
| 9.5 | Queries Tab | Admin | View HR queries analytics | Query counts by status, severity, resolution time |
| 9.6 | Tasks Tab | Admin | View tasks analytics | Completion rates, assignment stats |
| 9.7 | Filtering | Admin | Apply department or date filters on reports | Data filtered accordingly |

---

## 10. Settings & General

| # | Test Case | Role | Steps | Expected Result |
|---|-----------|------|-------|-----------------|
| 10.1 | Company Settings | Admin | Edit company name or settings | Company info updated |
| 10.2 | Dark Mode Toggle | Any | Toggle dark/light mode | Theme switches throughout app |
| 10.3 | Sidebar Navigation | Any | Click each sidebar menu item | Navigates to correct page |
| 10.4 | Sidebar Collapse | Any | Toggle sidebar collapse | Sidebar collapses/expands properly |
| 10.5 | 404 Page | Any | Navigate to non-existent route | Shows "Not Found" page |
| 10.6 | Responsive Layout | Any | Resize browser window | Layout adapts appropriately |

---

## 11. Role-Based Access Control (Cross-Cutting)

| # | Test Case | Role | Steps | Expected Result |
|---|-----------|------|-------|-----------------|
| 11.1 | Admin Full Access | Admin | Log in as admin | All modules and actions accessible |
| 11.2 | Manager Limited Access | Manager | Log in as manager | Can manage own team, cannot access admin-only features |
| 11.3 | Employee Restricted | Employee | Log in as employee | Can only view own data, submit requests, complete tasks |
| 11.4 | Contract Worker - Basic Access | Contract | Log in as contract | Dashboard visible, limited module access |
| 11.5 | API Authorization | N/A | Make API calls without valid session | Returns 401 Unauthorized |
| 11.6 | Admin-Only Endpoints | Employee/Manager | Call admin endpoints as employee/manager | Returns 403 Forbidden |
| 11.7 | Contract - No Leave Module | Contract | Log in as contract, check sidebar | Leave module not visible in sidebar |
| 11.8 | Contract - Leave API Block | Contract | Contract calls leave API endpoints directly | Returns 403 or empty result |
| 11.9 | Contract - Can View Tasks | Contract | Contract goes to My Tasks | Can see and complete assigned tasks |
| 11.10 | Contract - Can View Own Queries | Contract | Contract views HR Queries | Sees only queries issued against them |
| 11.11 | Contract - No Admin Features | Contract | Contract checks sidebar and navigates | No access to Reports, Settings, or admin actions |
| 11.12 | Contract - Can Submit Appraisals | Contract | Contract participates in review cycle | Can submit self-review if added as participant |

---

## Role Coverage Summary

| Role | Test Cases Covering This Role |
|------|-------------------------------|
| **Admin** | 1.1, 1.2, 1.4, 1.5, 2.1, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 4.9, 4.11, 4.12, 5.1-5.7, 5.11, 5.12, 6.1-6.5, 6.9, 6.10, 6.12-6.14, 6.16, 6.17, 6.19, 7.1, 7.2, 7.6, 7.7, 7.8, 7.10, 8.1-8.3, 8.10, 8.11, 9.2-9.7, 10.1, 11.1 |
| **Manager** | 1.4, 1.5, 2.7, 4.5, 4.6, 4.8, 5.9, 5.11, 5.12, 6.9, 6.10, 6.11, 6.12, 6.13, 6.15, 6.16, 6.17, 6.18, 7.1, 7.2, 7.6, 7.7, 7.8, 8.4-8.7, 8.10, 9.1, 11.2, 11.6 |
| **Employee** | 1.4, 1.5, 2.7, 2.8, 3.4, 4.4, 4.7, 5.8, 5.10, 7.3, 7.4, 7.5, 7.9, 8.8, 8.9, 9.1, 11.3, 11.5, 11.6 |
| **Contract** | 4.10, 11.4, 11.7, 11.8, 11.9, 11.10, 11.11, 11.12 |
| **Public (No Auth)** | 6.6, 6.7, 6.8, 11.5 |

---

## Pipeline Stages (Recruitment)

The recruitment pipeline uses 10 stages:
1. `new` - Initial application
2. `screening` - HR screening
3. `manager_review` - Department manager review
4. `phone_interview` - Phone screen
5. `technical_interview` - Technical assessment
6. `final_interview` - Final round
7. `offer_extended` - Offer sent (Admin only)
8. `hired` - Candidate hired (Admin only)
9. `rejected` - Candidate rejected
10. `withdrawn` - Candidate withdrew
