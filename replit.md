# HRFlow - HR Management Platform

## Overview
HRFlow is a full-stack HR management platform with PostgreSQL backend, session-based authentication, invite-based onboarding, and multi-tenant architecture. It features seven core modules: Leave Management, Performance Appraisals, Employee Management, Recruitment/ATS, Task Management, HR Disciplinary Query System, and Reports & Analytics. Role-based access control (Employee, Manager, Admin, Contract) governs all features.

## User Preferences
- Full-stack implementation with PostgreSQL
- Professional HR platform aesthetic
- Role-based access control throughout

## System Architecture

### UI/UX Decisions
The platform features a professional HR platform aesthetic with dark mode support via a theme toggle. It uses a primary color of Blue (#3b82f6) and exclusively employs shadcn/ui components, adhering to universal design guidelines.

### Technical Implementations
The project is built with React + TypeScript, Vite, and Tailwind CSS. Zustand is used for state management across various modules, including appraisals, recruitment, HR queries, and task management. Form handling is standardized with `react-hook-form` for state management and `zodResolver` for validation, leveraging Drizzle-zod insert schemas for type safety. Role-based access control is implemented throughout the application, governing visibility and access to modules and features based on user roles (employee, manager, admin, contract).

### Feature Specifications
- **Leave Management**: Includes requests, analytics, and administrative settings for leave types, company holidays, and employee balances. Contract workers have no access to this module. Managers can only view, approve, and reject leave requests from their direct reports (not other managers or other teams). Admins see all company leave requests.
- **Performance Appraisals**: Supports 180° and 360° review cycles, template management, and progress tracking. Features include review forms with star ratings and text questions, and results pages with weighted scores and anonymous peer feedback. Templates use a **section-based structure** — `template_sections` table stores named sections per template, and `template_questions` reference a `sectionId`. Each question has a `reviewerTypes` text array (`["self","peer","manager"]`) controlling which reviewer types see it. Review forms filter questions by the current reviewer's type, and results pages only show questions relevant to each reviewer. A **Competency Library** (`competencies` + `competency_questions` tables) lets admins create reusable competencies with predefined questions, then import them into template sections. Admins can edit (name, dates, weights) and delete cycles regardless of status (draft, active, completed). Department-based bulk participant adding is supported. Cycle deletion cascades to participants, peer assignments, appraisals, feedback, and ratings. API responses for `/api/feedback/:id` and `/api/appraisals/:id` include `sections` array and `reviewerTypes`/`sectionId` on questions. Dashboard shows live active appraisal counts and cycle/appraisal lists.
- **Employee Management**: Provides employee directory, organogram views, and administrative tools for adding and editing employee details and managing departments. Employees have `dateOfBirth` and `homeAddress` fields editable from Settings. These fields are private — only admins can view other employees' DOB and address (stripped from API responses for non-admins). A configurable **birthday reminder** system shows upcoming birthdays on the admin dashboard. The reminder window (default 3 days) is configurable via Organization settings, stored in `recruitment_settings` table with key `birthday_reminder_days`.
- **Recruitment/ATS**: Comprehensive module with job postings, a public careers page, a multi-step job application form, a candidate pipeline with Kanban and table views, and candidate detail pages. Also includes recruitment settings for email templates. Job creation form uses dynamic list inputs for Skills & Competencies, Key Responsibilities, and What to Expect in the Hiring Process. The job details page (`/jobs/:id`) follows a Greenhouse-style single-column layout. **Configurable application form fields**: each job posting stores an `applicationFields` JSON config controlling which candidate-facing fields (phone, location, gender, LinkedIn, website, source, cover letter, resume, NDPA consent) are hidden, optional, or required. The application form dynamically builds its Zod schema and conditionally renders fields based on this config. The form uses a wrapper + inner component pattern to ensure the schema is built after the job is loaded. All form steps are rendered simultaneously (hidden with CSS) to keep fields registered with react-hook-form. Resume uploads store both `resumeFileName` and `resumeFileUrl` (pointing to `/api/uploads/filename`), and the candidate detail page shows the resume as a clickable link for authenticated users. **Job archiving**: Admins can archive a job posting via the dropdown menu, which sets the job status to "archived" and moves all its candidates to an "archived" stage. Archived jobs are hidden by default but can be shown via a "Show archived" toggle. Archived jobs appear with muted styling and an "Archived" badge. The archive endpoint is `POST /api/job-postings/:id/archive`.
- **Task Management**: Full database-backed task management with `task_templates`, `task_assignments`, and `task_completions` tables. Supports 4 assignment types: Individual (specific employee), Department (all dept members), Managers (all managers), Everyone (company-wide). Features task templates for creating reusable checklists, a task tracker for admins/managers to assign and monitor progress, and a "My Tasks" view for employees to toggle completion on their assigned items. Per-person completion tracking via the `task_completions` table supports group assignments. **Acknowledgment & Sign**: Task items can optionally require acknowledgment (`requiresAcknowledgment` flag in item JSON). Admins can also attach a document (`documentUrl`, `documentName`) that employees must read before signing. The `task_completions` table stores `acknowledged`, `acknowledgedAt`, and `acknowledgedByName` for audit. Acknowledged items are locked and cannot be un-toggled. My Tasks page shows a distinct "Acknowledge & Sign" button with a confirmation dialog for these items, and displays the signer's name and timestamp after signing.
- **HR Disciplinary Query System**: Allows admins/managers to issue disciplinary queries, with a detailed view for employees to respond, and a robust workflow for status updates, comments, and internal notes. Supports file/image attachments when issuing queries, responding, or commenting (up to 5 files per action, 10MB max each). Attachments stored on disk via multer, tracked in `hr_query_attachments` table. All uploaded files served via authenticated `/api/uploads/:filename` endpoint (not public static).
- **Reports & Analytics**: An admin-only module providing tabbed dashboards for workforce, leave, recruitment, queries, and tasks, featuring various charts and filtering capabilities using recharts.

### System Design Choices
The application architecture is organized into `components`, `pages`, and `lib` directories. `lib` contains demo data, Zustand stores, and role-based access control logic. The routing structure is comprehensive, covering all modules and sub-features. A multi-tenant architecture with `companyId` scoping is implemented for all queries. Authentication is session-based, using the employees table for users, with login/logout/me API routes and bcryptjs for password hashing. A company setup flow and invite-based employee onboarding are also part of the system.

## External Dependencies
- **React**: Frontend library
- **TypeScript**: Superset of JavaScript for type safety
- **Vite**: Build tool
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: UI component library
- **Zustand**: State management library
- **react-hook-form**: Form state management
- **zodResolver**: Validation for react-hook-form
- **Drizzle-zod**: Schema validation
- **recharts**: Charting library for reports
- **TanStack Query**: Data fetching and caching
- **bcryptjs**: Password hashing (for authentication)
- **connect-pg-simple**: PostgreSQL session store (for authentication)