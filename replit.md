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
- **Performance Appraisals**: Supports 180° and 360° review cycles, template management, and progress tracking. Features include review forms with star ratings and text questions, and results pages with weighted scores and anonymous peer feedback. Template questions support named sections (e.g., "Leadership", "Technical Skills") — questions are grouped by section in templates, review forms, and results pages. Admins can edit (name, dates, weights) draft and active cycles (active only if no feedback submitted yet), and delete draft cycles. Department-based bulk participant adding is supported. Cycle deletion cascades to participants, peer assignments, appraisals, feedback, and ratings. API responses for `/api/feedback/:id` and `/api/appraisals/:id` use nested structures matching frontend interfaces. Dashboard shows live active appraisal counts and cycle/appraisal lists.
- **Employee Management**: Provides employee directory, organogram views, and administrative tools for adding and editing employee details and managing departments.
- **Recruitment/ATS**: Comprehensive module with job postings, a public careers page, a multi-step job application form, a candidate pipeline with Kanban and table views, and candidate detail pages. Also includes recruitment settings for email templates.
- **Task Management**: Full database-backed task management with `task_templates`, `task_assignments`, and `task_completions` tables. Supports 4 assignment types: Individual (specific employee), Department (all dept members), Managers (all managers), Everyone (company-wide). Features task templates for creating reusable checklists, a task tracker for admins/managers to assign and monitor progress, and a "My Tasks" view for employees to toggle completion on their assigned items. Per-person completion tracking via the `task_completions` table supports group assignments.
- **HR Disciplinary Query System**: Allows admins/managers to issue disciplinary queries, with a detailed view for employees to respond, and a robust workflow for status updates, comments, and internal notes. Supports file/image attachments when issuing queries, responding, or commenting (up to 5 files per action, 10MB max each). Attachments stored on disk via multer, tracked in `hr_query_attachments` table.
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