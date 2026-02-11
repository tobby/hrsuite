# HRFlow - HR Management Platform

## Overview
HRFlow is a frontend-only HR management platform designed for demonstration purposes, showcasing four core modules: Leave Management, Performance Appraisals, Employee Management, and Recruitment/ATS. It utilizes static demo data instead of live API calls. The platform's vision is to provide a comprehensive HR solution with a user-friendly interface, offering robust tools for managing human resources efficiently.

## User Preferences
- Frontend-only implementation preferred
- No API/backend complexity
- Demo data for all modules
- Professional HR platform aesthetic

## System Architecture

### UI/UX Decisions
The platform features a professional HR platform aesthetic with dark mode support via a theme toggle. It uses a primary color of Blue (#3b82f6) and exclusively employs shadcn/ui components, adhering to universal design guidelines.

### Technical Implementations
The project is built with React + TypeScript, Vite, and Tailwind CSS. Zustand is used for state management across various modules, including appraisals, recruitment, HR queries, and task management. Form handling is standardized with `react-hook-form` for state management and `zodResolver` for validation, leveraging Drizzle-zod insert schemas for type safety. Role-based access control is implemented throughout the application, governing visibility and access to modules and features based on user roles (employee, manager, admin, contract).

### Feature Specifications
- **Leave Management**: Includes requests, analytics, and administrative settings for leave types, company holidays, and employee balances. Contract workers have no access to this module. Managers can only view, approve, and reject leave requests from their direct reports (not other managers or other teams). Admins see all company leave requests.
- **Performance Appraisals**: Supports 180° and 360° review cycles, template management, and progress tracking. Features include review forms with star ratings and text questions, and results pages with weighted scores and anonymous peer feedback.
- **Employee Management**: Provides employee directory, organogram views, and administrative tools for adding and editing employee details and managing departments.
- **Recruitment/ATS**: Comprehensive module with job postings, a public careers page, a multi-step job application form, a candidate pipeline with Kanban and table views, and candidate detail pages. Also includes recruitment settings for email templates.
- **Task Management**: Features task templates, a task tracker for administrators to assign and monitor checklists, and a "My Tasks" view for employees to manage their assigned tasks.
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