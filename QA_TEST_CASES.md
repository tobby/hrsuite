# HRFlow - Comprehensive QA Test Cases

**Version:** 1.0
**Last Updated:** February 2026
**Platform:** HRFlow HR Management Platform

---

## Table of Contents

1. [Prerequisites & Setup](#1-prerequisites--setup)
2. [Module 1: Authentication & Onboarding](#2-module-1-authentication--onboarding)
3. [Module 2: Dashboard](#3-module-2-dashboard)
4. [Module 3: Employee Management](#4-module-3-employee-management)
5. [Module 4: Department Management](#5-module-4-department-management)
6. [Module 5: Leave Management](#6-module-5-leave-management)
7. [Module 6: HR Disciplinary Queries](#7-module-6-hr-disciplinary-queries)
8. [Module 7: Recruitment / ATS](#8-module-7-recruitment--ats)
9. [Module 8: Task Management (Onboarding)](#9-module-8-task-management-onboarding)
10. [Module 9: Performance Appraisals](#10-module-9-performance-appraisals)
11. [Module 10: Reports & Analytics](#11-module-10-reports--analytics)
12. [Module 11: Settings](#12-module-11-settings)
13. [Cross-Cutting Concerns](#13-cross-cutting-concerns)

---

## 1. Prerequisites & Setup

### Test Accounts Needed

You will create these accounts during testing. Keep track of the credentials.

| Role     | Purpose                                    |
|----------|--------------------------------------------|
| Admin    | Created during initial company setup       |
| Manager  | Invited by Admin, assigned manager role    |
| Employee | Invited by Admin, assigned employee role   |
| Contract | Invited by Admin, assigned contract role   |

### Environment

- Use a modern browser (Chrome, Firefox, Edge)
- Clear cookies/cache before starting a fresh test run
- Note: The app supports dark mode (toggle in top-right header)

---

## 2. Module 1: Authentication & Onboarding

### TC-AUTH-001: Company Setup (First-Time Registration)

**Precondition:** No company exists yet (fresh database)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to the app URL | Setup page is displayed |
| 2 | Leave all fields empty and click "Create Company" | Validation errors appear for all required fields |
| 3 | Enter a password shorter than 8 characters | Error message: "Password must be at least 8 characters" |
| 4 | Fill in: Company Name, First Name, Last Name, Email, Password (8+ chars) | All fields accept input |
| 5 | Click "Create Company" | Success message appears, you are redirected to the Dashboard |
| 6 | Verify the sidebar shows the company name | Company name is displayed in the sidebar |

### TC-AUTH-002: Login

**Precondition:** Company and Admin account exist from TC-AUTH-001

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Log out (if logged in) by clicking the logout option | Redirected to Login page |
| 2 | Leave email and password empty, click "Sign In" | Validation error messages appear |
| 3 | Enter correct email but wrong password | Error: "Invalid email or password" |
| 4 | Enter wrong email but correct password | Error: "Invalid email or password" |
| 5 | Enter correct email and correct password | Successfully logged in, redirected to Dashboard |

### TC-AUTH-003: Session Persistence

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Log in successfully | Dashboard loads |
| 2 | Refresh the page (F5) | User remains logged in, Dashboard reloads |
| 3 | Close the browser tab, open a new tab and navigate to the app | User remains logged in |

### TC-AUTH-004: Invite-Based Employee Onboarding

**Precondition:** Logged in as Admin

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Employees page | Employee list is displayed |
| 2 | Click "Add Employee" | Add employee dialog appears |
| 3 | Fill in employee details: First Name, Last Name, Email, Position, Role (set to "Manager"), Department | Form accepts all inputs |
| 4 | Submit the form | New employee appears in the list with "invited" status |
| 5 | Note the invite link/token generated for the employee | An invite token is created |
| 6 | Open a new incognito/private browser window | Fresh browser session |
| 7 | Navigate to the invite URL: `/invite/{token}` | Invite page loads showing the company name and employee's name |
| 8 | Set a password (8+ characters) and confirm it | Password fields accept input |
| 9 | Click "Complete Setup" or similar | Account is activated, redirected to Dashboard |
| 10 | Verify the user can now log in with their email and new password | Login succeeds |

### TC-AUTH-005: Duplicate Email Prevention

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | As Admin, try to add an employee with an email that already exists | Error message indicating email already exists |

### TC-AUTH-006: Logout

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | While logged in, click the logout button/option | Session is destroyed, redirected to Login page |
| 2 | Try navigating to a protected page (e.g., `/employees`) | Redirected back to Login page |

---

## 3. Module 2: Dashboard

### TC-DASH-001: Dashboard Display

**Precondition:** Logged in as Admin

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Dashboard (click "/" or home link) | Dashboard page loads |
| 2 | Verify summary cards/statistics are displayed | Key metrics (employee count, pending leave, etc.) are shown |
| 3 | Log in as Employee role | Dashboard loads with employee-appropriate content |
| 4 | Log in as Manager role | Dashboard loads with manager-appropriate content |

---

## 4. Module 3: Employee Management

### TC-EMP-001: View Employee Directory (Admin)

**Precondition:** Logged in as Admin, at least 2 employees exist

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to "Employees" from the sidebar | Employee directory page loads |
| 2 | Verify all employees are listed | All company employees appear in the list |
| 3 | Search for an employee by name | List filters to show matching employees |
| 4 | Click on an employee's name/row | Employee detail page opens |
| 5 | Verify employee details are displayed: name, email, position, department, role, hire date, status | All details are shown correctly |

### TC-EMP-002: Add Employee (Admin Only)

**Precondition:** Logged in as Admin

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Add Employee" button | Add employee dialog/form opens |
| 2 | Fill in all required fields (First Name, Last Name, Email, Position, Role, Department) | Fields accept input |
| 3 | Submit the form | Employee is created and appears in the directory |
| 4 | Verify the new employee has "invited" status | Status shows as invited |

### TC-EMP-003: Edit Employee (Admin Only)

**Precondition:** Logged in as Admin, employee exists

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to an employee's detail page | Employee details load |
| 2 | Click "Edit" button | Edit form/dialog opens with current values pre-filled |
| 3 | Change the employee's position | Field updates |
| 4 | Save the changes | Changes are persisted, detail page shows updated info |
| 5 | Refresh the page | Updated information persists |

### TC-EMP-004: Assign Manager to Employee (Admin)

**Precondition:** At least one manager and one employee exist

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Edit an employee's details | Edit form opens |
| 2 | Set the "Manager" field to an existing manager | Manager is selected |
| 3 | Save changes | Employee now shows the assigned manager |
| 4 | Navigate to the manager's detail page | The employee appears as a direct report |

### TC-EMP-005: View Employee Directory (Non-Admin Roles)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Log in as Employee role, navigate to Employees | Can view employee directory (read-only) |
| 2 | Verify "Add Employee" button is NOT visible | Button is hidden for non-admins |
| 3 | Click on an employee | Can view details but cannot edit |
| 4 | Log in as Manager role | Same as employee - can view but no admin controls |

### TC-EMP-006: Organogram View

**Precondition:** Employees with manager relationships exist

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Employees page | Employee page loads |
| 2 | Switch to "Organogram" or "Org Chart" view (if toggle exists) | Organizational chart is displayed |
| 3 | Verify reporting relationships are shown | Manager-report hierarchy is visible |

---

## 5. Module 4: Department Management

### TC-DEPT-001: View Departments

**Precondition:** Logged in as Admin

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to "Departments" from the sidebar | Departments page loads |
| 2 | Verify existing departments are listed | All departments appear |

### TC-DEPT-002: Create Department (Admin Only)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Add Department" button | Department creation dialog opens |
| 2 | Enter department name and description | Fields accept input |
| 3 | Submit the form | New department appears in the list |
| 4 | Try creating a department with the same name | Error or duplicate warning |

### TC-DEPT-003: Edit Department (Admin Only)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click edit on an existing department | Edit dialog opens with current values |
| 2 | Change the department name | Field updates |
| 3 | Save changes | Updated name is reflected in the list |

### TC-DEPT-004: Delete Department (Admin Only)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click delete on a department | Confirmation prompt appears |
| 2 | Confirm deletion | Department is removed from the list |
| 3 | Try deleting a department that has employees assigned | Observe behavior: either deletion succeeds (employees become unassigned) or an error/warning is shown |

### TC-DEPT-005: Department Access (Non-Admin)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Log in as Employee role, navigate to Departments | Can view departments (read-only) |
| 2 | Verify no "Add", "Edit", or "Delete" buttons are visible | Admin-only actions are hidden |

---

## 6. Module 5: Leave Management

### TC-LEAVE-001: Leave Request Submission (Employee)

**Precondition:** Logged in as Employee, leave types and balances exist

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to "Leave" from the sidebar | Leave Management page loads |
| 2 | Click "Request Leave" button | Leave request dialog opens |
| 3 | Select a leave type from dropdown | Leave types are listed |
| 4 | Choose start date and end date | Date pickers work correctly |
| 5 | Add an optional reason/note | Text field accepts input |
| 6 | Submit the request | Success message appears, request appears in "My Requests" tab |
| 7 | Verify the request shows "pending" status | Status badge shows "Pending" |

### TC-LEAVE-002: View My Leave Requests (Employee)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Leave page | "My Requests" tab is active by default |
| 2 | Verify submitted leave requests are listed | All personal requests appear with dates, type, status |
| 3 | Verify leave balance summary is displayed | Current balance for each leave type is shown |

### TC-LEAVE-003: Approve Leave Request (Manager)

**Precondition:** Logged in as Manager, a direct report has a pending leave request

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Leave page | Leave Management page loads |
| 2 | Click on "Pending Approvals" tab | Pending requests from direct reports are listed |
| 3 | Verify ONLY direct reports' requests appear (not other managers' or other teams') | Only subordinates' requests shown |
| 4 | Click "Approve" on a pending request | Confirmation dialog appears |
| 5 | Confirm the approval | Request status changes to "Approved" |
| 6 | Log in as the employee who made the request | Employee sees request status updated to "Approved" |

### TC-LEAVE-004: Reject Leave Request (Manager)

**Precondition:** A direct report has a pending leave request

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Pending Approvals tab | Pending requests listed |
| 2 | Click "Reject" on a pending request | Rejection dialog opens |
| 3 | Enter a rejection comment/reason | Text field accepts input |
| 4 | Confirm the rejection | Request status changes to "Rejected" |
| 5 | Log in as the employee | Employee sees request as "Rejected" with the comment |

### TC-LEAVE-005: View All Leave Requests (Admin)

**Precondition:** Logged in as Admin, multiple employees have leave requests

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Leave page | Leave Management loads |
| 2 | Click on "All Requests" tab | ALL company leave requests are displayed |
| 3 | Verify requests from all employees across all departments appear | Complete list is shown |
| 4 | Admin can also approve/reject any pending request | Approve/Reject actions available |

### TC-LEAVE-006: Contract Worker Leave Access

**Precondition:** Logged in as Contract role

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Look at the sidebar | "Leave" menu item is NOT visible or accessible |
| 2 | Try navigating directly to `/leave` in the URL | Redirected to Dashboard - access denied |
| 3 | Try navigating directly to `/leave/analytics` | Redirected to Dashboard - access denied |
| 4 | Try navigating directly to `/leave/settings` | Redirected to Dashboard - access denied |

### TC-LEAVE-007: Leave Analytics

**Precondition:** Logged in as Admin or Manager, leave data exists

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Leave Analytics (from Leave page or sidebar) | Analytics page loads |
| 2 | Verify charts are displayed: usage by type, status breakdown, monthly trends | Charts render with actual data |
| 3 | Verify departmental leave distribution is shown | Department-level data is displayed |

### TC-LEAVE-008: Leave Settings - Manage Leave Types (Admin Only)

**Precondition:** Logged in as Admin

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Leave Settings | Settings page loads with Leave Types tab |
| 2 | Click "Add Leave Type" | Dialog opens |
| 3 | Enter name (e.g., "Compassionate Leave"), description, default days (e.g., 5), select a color | All fields accept input |
| 4 | Save the leave type | New type appears in the leave types list |
| 5 | Edit an existing leave type | Edit dialog opens with pre-filled values |
| 6 | Change the default days | Field updates |
| 7 | Save changes | Updated values are reflected |
| 8 | Delete a leave type | Type is removed from the list |

### TC-LEAVE-009: Leave Settings - Manage Employee Balances (Admin Only)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Leave Settings, go to Balances tab | Employee balances are listed |
| 2 | Select a year filter | Balances for the selected year are shown |
| 3 | Edit an employee's leave balance for a specific type | Edit dialog opens |
| 4 | Change the total days or used days | Fields update |
| 5 | Save changes | Updated balance is reflected |

---

## 7. Module 6: HR Disciplinary Queries

### TC-QUERY-001: Issue a Disciplinary Query (Admin/Manager)

**Precondition:** Logged in as Admin or Manager

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to "Queries" from the sidebar | HR Queries page loads |
| 2 | Click "Issue Query" button | Issue query dialog opens |
| 3 | Select an employee from the dropdown | Employee list is shown |
| 4 | Enter Subject (e.g., "Late arrival - January") | Field accepts input |
| 5 | Enter Description with details of the issue | Text area accepts input |
| 6 | Select a Category (e.g., "Attendance") | Categories are available |
| 7 | Select Priority (e.g., "Medium") | Priority options available |
| 8 | Attach a file (optional, up to 10MB) | File upload works |
| 9 | Submit the query | Success message, query appears in the list with "Open" status |

### TC-QUERY-002: View Query List

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | As Admin: Navigate to Queries | ALL company queries are listed |
| 2 | As Manager: Navigate to Queries | Queries for direct reports are shown |
| 3 | As Employee: Navigate to Queries | Only queries issued TO this employee are shown |
| 4 | Verify each query shows: subject, employee name, status badge, priority, date | All columns display correctly |
| 5 | Click on a query | Query detail page opens |

### TC-QUERY-003: Employee Response to a Query

**Precondition:** Logged in as the Employee who has been issued a query with "Awaiting Response" status

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Queries | The issued query is visible |
| 2 | Click on the query | Query detail page opens |
| 3 | Verify a "Response Required" section is visible | Response form is shown |
| 4 | Type a response (minimum 10 characters) | Text area accepts input |
| 5 | Optionally attach files (up to 5 files, 10MB each) | File upload works |
| 6 | Click "Submit Response" | Response is saved, status changes to "Responded" |
| 7 | Verify the response appears in the timeline | Response is visible in the activity feed |

### TC-QUERY-004: Add Comment (Admin/Manager)

**Precondition:** Logged in as Admin or Manager, query exists

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open a query detail page | Detail page loads |
| 2 | Scroll to the comment section | Comment input area is visible |
| 3 | Type a comment | Text area accepts input |
| 4 | Optionally attach files | File upload works |
| 5 | Click "Add Comment" | Comment appears in the timeline |
| 6 | Log in as the employee | Employee can see the comment |

### TC-QUERY-005: Add Internal Note (Admin Only)

**Precondition:** Logged in as Admin

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open a query detail page | Detail page loads |
| 2 | Check the "Internal Note" checkbox/toggle | Comment mode switches to internal |
| 3 | Type an internal note | Text area accepts input |
| 4 | Submit the internal note | Note appears in timeline marked as "Internal" |
| 5 | Log in as the Employee the query was issued to | Employee CANNOT see the internal note |
| 6 | Log in as another Manager or Admin | Internal note IS visible |

### TC-QUERY-006: Change Query Status (Admin/Manager)

**Precondition:** Logged in as Admin or Manager

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open a query detail page | Detail page loads |
| 2 | Find the Status dropdown in the Details panel | Status selector is visible |
| 3 | Verify available statuses: Open, Awaiting Response, Responded, Resolved, Closed | All 5 statuses are in the dropdown |
| 4 | Change status from "Open" to "Awaiting Response" | Status updates |
| 5 | Change status to "Resolved" | Status updates |
| 6 | Change status to "Closed" | Status updates |
| 7 | Verify the timeline shows status change entries | Status changes are logged |

### TC-QUERY-007: Attachment Security

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Upload an attachment to a query | Attachment is saved |
| 2 | Click the download link on the attachment | File downloads correctly |
| 3 | Log out and try accessing the attachment URL directly | Access denied / unauthorized (requires login) |
| 4 | Log in as an unrelated employee (not the query subject) | Cannot download the attachment (access denied) |

### TC-QUERY-008: Status Guide

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Queries page | Status guide info card is visible |
| 2 | Expand/click the status guide | All statuses are explained with descriptions: Open, Awaiting Response, Responded, Under Review, Resolved, Escalated, Closed |
| 3 | Note: The status change dropdown on the detail page supports 5 statuses (Open, Awaiting Response, Responded, Resolved, Closed). Under Review and Escalated are display-only statuses shown in the guide for reference. | Informational |

---

## 8. Module 7: Recruitment / ATS

### TC-REC-001: Create Job Posting (Admin Only)

**Precondition:** Logged in as Admin, at least one department exists

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to "Recruitment" > "Job Postings" from sidebar | Job Postings page loads |
| 2 | Click "Create Job" button | Job creation dialog opens |
| 3 | Fill in: Title, Description, Department, Location, Employment Type, Experience Years, Status | All fields accept input |
| 4 | Set status to "Open" | Status is set |
| 5 | Submit the form | Job posting appears in the list |
| 6 | Switch between Card and Table view modes | Both views display the job correctly |

### TC-REC-002: Edit Job Posting (Admin Only)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click edit on an existing job posting | Edit dialog opens with current values |
| 2 | Change the title and status | Fields update |
| 3 | Save changes | Updated values are reflected in the list |

### TC-REC-003: Delete Job Posting (Admin Only)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click delete on a job posting | Confirmation dialog appears |
| 2 | Confirm deletion | Job is removed from the list |

### TC-REC-004: Public Careers Page

**Precondition:** At least one job posting with "Open" status exists

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Log out or open an incognito window | Not logged in |
| 2 | Navigate to `/careers` | Public careers page loads (no login required) |
| 3 | Verify open job postings are displayed | Open jobs are listed with title, location, type |
| 4 | Click on a job | Job details page opens showing full description |

### TC-REC-005: Job Application (Public)

**Precondition:** Public careers page, open job exists

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | On a job details page, click "Apply" | Multi-step application form opens at `/jobs/{id}/apply` |
| 2 | Fill in personal details (First Name, Last Name, Email, Phone) | Step 1 fields accept input |
| 3 | Proceed to next step | Form advances to next section |
| 4 | Complete all required steps of the application | All steps work correctly |
| 5 | Submit the application | Success message displayed |
| 6 | Log in as Admin, go to Candidates page | Verify if the new applicant appears in the pipeline (note: recruitment data may use local state - document actual behavior) |

### TC-REC-006: Candidate Pipeline - Kanban View (Admin Only)

**Precondition:** Logged in as Admin, candidates exist

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to "Candidates" page | Candidate pipeline loads |
| 2 | Verify Kanban board shows columns: Applied, Screening, Interview, Offer, Hired, Rejected | All 6 columns visible |
| 3 | Drag a candidate card from "Applied" to "Screening" | Card moves to Screening column |
| 4 | Verify the candidate's stage is updated | Stage badge updates |

### TC-REC-007: Candidate Pipeline - Table View

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Switch to Table view | Candidates are shown in a table format |
| 2 | Verify columns: Candidate, Job, Email, Stage, Applied Date, Actions | All columns present |
| 3 | Use the search/filter functionality | Results filter correctly |
| 4 | Filter by specific job | Only candidates for that job are shown |

### TC-REC-008: Candidate Detail Page

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click on a candidate's name | Candidate detail page opens |
| 2 | Verify candidate info is displayed: name, email, phone, applied job, current stage | All details shown |
| 3 | Change the candidate's pipeline stage from the detail page | Stage updates |

### TC-REC-009: Recruitment Access Control

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Log in as Employee role | No recruitment menu items in sidebar |
| 2 | Try navigating directly to `/recruitment/jobs` | Redirected to Dashboard |
| 3 | Log in as Manager role | No recruitment access (admin-only module) |

---

## 9. Module 8: Task Management (Onboarding)

### TC-TASK-001: Create Task Template (Admin Only)

**Precondition:** Logged in as Admin

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to "Onboarding" > "Templates" from sidebar | Task templates page loads |
| 2 | Click "Create Template" | Template creation form/dialog opens |
| 3 | Enter template name and add checklist items | Fields accept input |
| 4 | Save the template | Template appears in the list |

### TC-TASK-002: Task Tracker - Assign Tasks (Admin)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to "Onboarding" > "Tracker" | Task tracker page loads |
| 2 | Assign a task template to an employee | Assignment is created |
| 3 | Verify the assigned tasks appear with pending status | Tasks are listed with correct status |

### TC-TASK-003: My Tasks (Employee View)

**Precondition:** Logged in as Employee, tasks have been assigned

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to "My Tasks" from sidebar | My Tasks page loads |
| 2 | Verify assigned checklist items are displayed | All assigned tasks appear |
| 3 | Mark a task item as complete | Checkbox/status updates |
| 4 | Verify progress indicator updates | Completion percentage reflects the change |

---

## 10. Module 9: Performance Appraisals

### TC-APR-001: Create Appraisal Template (Admin Only)

**Precondition:** Logged in as Admin

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to "Appraisals" > "Templates" from sidebar | Templates page loads |
| 2 | Click "Create Template" | Template creation dialog opens |
| 3 | Enter template name (e.g., "Q1 2026 Review") and description | Fields accept input |
| 4 | Save the template | Template appears in the list |
| 5 | Click "Manage Questions" on the new template | Questions management dialog opens |
| 6 | Add a Rating question: title "Technical Skills", type "rating" | Question is added |
| 7 | Add a Text question: title "Areas for Improvement", type "text" | Question is added |
| 8 | Verify both questions appear in the list | Questions are displayed with correct types |

### TC-APR-002: Create Appraisal Cycle (Admin Only)

**Precondition:** At least one template exists

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to "Appraisals" > "Cycles" | Cycles page loads |
| 2 | Click "Create Cycle" | Cycle creation dialog opens |
| 3 | Enter: Name, select Template, choose Type (180 or 360), set Start/End dates | Fields accept input |
| 4 | Set weight percentages (e.g., Self: 20%, Manager: 50%, Peer: 30% for 360) | Weight fields accept values |
| 5 | Save the cycle | Cycle appears in the list with "Draft" status |

### TC-APR-003: Manage Cycle Participants (Admin Only)

**Precondition:** A draft cycle exists

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click on a cycle to open its progress/detail page | Cycle page loads |
| 2 | Add participants (select employees to be reviewed) | Employees are added as participants |
| 3 | For 360 cycles: Assign peer reviewers to participants | Peer assignments are saved |
| 4 | Verify participant list shows all added employees | All participants are listed |

### TC-APR-004: Activate Cycle (Admin Only)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | On the cycles page, click "Activate" on a draft cycle | Confirmation prompt appears |
| 2 | Confirm activation | Cycle status changes to "Active" |
| 3 | Verify appraisal records are created for all participants | Records exist (check Appraisals main page) |

### TC-APR-005: Submit Self-Review (Employee)

**Precondition:** Logged in as Employee, active cycle with this employee as participant

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to "Appraisals" from sidebar | Appraisals page loads |
| 2 | Verify a "Pending Reviews" section shows your self-review | Self-review card is displayed |
| 3 | Click on the self-review | Review form page opens |
| 4 | For Rating questions: click stars (1-5) to rate | Star rating is interactive, selected stars highlight |
| 5 | For Text questions: type your answer | Text area accepts input |
| 6 | Click "Submit Review" | Success message, review is submitted |
| 7 | Navigate back to Appraisals | Self-review no longer shows as pending |

### TC-APR-006: Submit Manager Review (Manager)

**Precondition:** Logged in as Manager, active cycle where this manager reviews a direct report

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Appraisals | Manager review appears in pending reviews |
| 2 | Click on the manager review | Review form opens |
| 3 | Complete all rating and text questions | All fields accept input |
| 4 | Submit the review | Review is saved |

### TC-APR-007: Submit Peer Review (360 Cycle)

**Precondition:** Active 360 cycle, logged in as an employee assigned as a peer reviewer

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Appraisals | Peer review appears in pending reviews |
| 2 | Click on the peer review | Review form opens, shows the employee being reviewed |
| 3 | Complete the review | All fields work |
| 4 | Submit | Review is saved |

### TC-APR-008: View Appraisal Results

**Precondition:** All reviews for an appraisal are completed

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Appraisals, find a completed appraisal | Completed appraisals are listed |
| 2 | Click "View Results" | Results page opens |
| 3 | Verify overall weighted score is calculated correctly | Score reflects configured weights (self/manager/peer) |
| 4 | Verify feedback breakdown shows scores per question | Individual question scores are displayed |
| 5 | For 360 reviews: Verify peer feedback shows as "Anonymous Peer" | Peer reviewer names are NOT revealed |

### TC-APR-009: Cycle Progress View (Admin/Manager)

**Precondition:** Active cycle with multiple participants

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to a cycle's progress page | Progress page loads |
| 2 | Verify completion status per participant is shown | Each participant shows how many reviews are done |
| 3 | As Manager: verify only direct reports' progress is visible | Scoped to managed employees |
| 4 | As Admin: verify all participants' progress is visible | Full company view |

### TC-APR-010: Appraisals on Employee Detail Page

**Precondition:** Employee has completed appraisals

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | As Admin: Navigate to an employee's detail page | Appraisals section is visible |
| 2 | Verify appraisal history for that employee is shown | Past appraisals with scores are listed |
| 3 | As Manager: View a direct report's detail page | Appraisals section is visible |
| 4 | As Manager: View a non-direct-report's detail page | Appraisals section is NOT visible |
| 5 | As Employee: View your own detail page | Can see your own appraisals |

### TC-APR-011: Appraisal Access Control

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | As Employee: Navigate to `/appraisals/templates` | Access denied or redirected (admin-only) |
| 2 | As Employee: Navigate to `/appraisals/cycles` | Can view cycles list but cannot create/edit/activate |
| 3 | As Manager: Navigate to `/appraisals/templates` | Access denied or redirected (admin-only) |

---

## 11. Module 10: Reports & Analytics

### TC-RPT-001: Reports Access Control

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Log in as Admin, navigate to "Reports" | Reports page loads with tabs |
| 2 | Log in as Employee, check sidebar | "Reports" is NOT visible or accessible |
| 3 | As Employee, navigate directly to `/reports` | Redirected - access denied |
| 4 | Log in as Manager, check sidebar | "Reports" is NOT visible or accessible |

### TC-RPT-002: Reports Dashboard Tabs (Admin Only)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | On Reports page, click "Workforce" tab | Workforce analytics dashboard loads with charts |
| 2 | Click "Leave" tab | Leave analytics with usage trends and breakdowns |
| 3 | Click "Recruitment" tab | Recruitment metrics and pipeline data |
| 4 | Click "Queries" tab | HR queries statistics and trends |
| 5 | Click "Tasks" tab | Task completion rates and progress data |
| 6 | Verify all charts render with actual data (not empty) | Charts display real data from the system |

---

## 12. Module 11: Settings

### TC-SET-001: Settings Page (Admin Only)

**Precondition:** Logged in as Admin

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to "Settings" from sidebar | Settings page loads |
| 2 | Verify company information is displayed | Company name and details shown |
| 3 | Edit company settings if available | Changes are saved |

### TC-SET-002: Settings Access Control

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Log in as Employee, check for Settings in sidebar | Settings not visible or limited access |
| 2 | Log in as Manager | Same as employee |

---

## 13. Cross-Cutting Concerns

### TC-CROSS-001: Dark Mode Toggle

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click the theme toggle button in the top-right header | Theme switches between light and dark mode |
| 2 | Verify all pages render correctly in dark mode | No text visibility issues, proper contrast |
| 3 | Refresh the page | Theme preference persists |

### TC-CROSS-002: Sidebar Navigation

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click on each sidebar menu item | Corresponding page loads |
| 2 | Click the sidebar collapse/toggle button | Sidebar collapses to icon-only mode |
| 3 | Click again | Sidebar expands back |
| 4 | Verify the active page is highlighted in the sidebar | Current page menu item is visually distinct |

### TC-CROSS-003: Role-Based Sidebar Visibility

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Log in as Admin | All sidebar items visible: Dashboard, Employees, Departments, Leave, Appraisals, Recruitment, Queries, Onboarding, Reports, Settings |
| 2 | Log in as Manager | Most items visible EXCEPT: Reports, Settings, some Recruitment items |
| 3 | Log in as Employee | Limited items: Dashboard, Employees, Departments, Leave, Appraisals, Queries, My Tasks |
| 4 | Log in as Contract | Same as Employee BUT without Leave |

### TC-CROSS-004: Responsive Layout

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Resize the browser window to tablet width (~768px) | Layout adapts, sidebar may collapse |
| 2 | Resize to mobile width (~375px) | Content remains usable, no horizontal overflow |
| 3 | Test on an actual mobile device or emulator | Touch interactions work (taps, scrolling) |

### TC-CROSS-005: Data Persistence

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create data in any module (employee, leave request, query, etc.) | Data is saved |
| 2 | Log out and log back in | Data persists |
| 3 | Open in a different browser | Same data is visible |

### TC-CROSS-006: Error Handling

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to a non-existent URL (e.g., `/nonexistent`) | 404 / Not Found page is displayed |
| 2 | Submit a form with invalid data | Appropriate validation error messages appear |
| 3 | Verify error messages are user-friendly (not raw technical errors) | Messages are clear and actionable |

### TC-CROSS-007: Multi-Tenant Isolation

**Precondition:** If possible, set up two separate companies

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Log in as Admin of Company A | Only Company A data is visible |
| 2 | Log in as Admin of Company B | Only Company B data is visible |
| 3 | Company A's employees, departments, queries, etc. are NOT visible to Company B | Complete data isolation |

---

## Test Execution Summary Template

| Module | Total Test Cases | Passed | Failed | Blocked | Notes |
|--------|-----------------|--------|--------|---------|-------|
| Authentication & Onboarding | 6 | | | | |
| Dashboard | 1 | | | | |
| Employee Management | 6 | | | | |
| Department Management | 5 | | | | |
| Leave Management | 9 | | | | |
| HR Disciplinary Queries | 8 | | | | |
| Recruitment / ATS | 9 | | | | |
| Task Management | 3 | | | | |
| Performance Appraisals | 11 | | | | |
| Reports & Analytics | 2 | | | | |
| Settings | 2 | | | | |
| Cross-Cutting Concerns | 7 | | | | |
| **TOTAL** | **69** | | | | |

---

## Bug Report Template

When reporting bugs, include:

1. **Test Case ID:** (e.g., TC-LEAVE-003)
2. **Summary:** Brief description
3. **Steps to Reproduce:** Exact steps taken
4. **Expected Result:** What should happen
5. **Actual Result:** What actually happened
6. **Severity:** Critical / High / Medium / Low
7. **Screenshots/Videos:** Attach if applicable
8. **Browser & Device:** Chrome 120, Windows 11, etc.
9. **User Role:** Which role was used during testing
