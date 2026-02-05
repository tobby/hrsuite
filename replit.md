# HRFlow - HR Management Platform

## Overview
HRFlow is a frontend-only HR management platform built for demonstration purposes. It provides four core modules: Leave Management, Performance Appraisals, Employee Management, and Recruitment/ATS. The platform uses static demo data instead of API calls, as per user requirements.

## Current State
- **Status**: Complete MVP with all core modules functional
- **Last Updated**: February 01, 2026
- **Tech Stack**: React + TypeScript, Vite, Tailwind CSS, shadcn/ui, Zustand for state management

## Recent Changes
- 2026-02-05: Employees & Departments tabs rework
  - Employees and Departments pages now visible to ALL roles (employee, manager, admin)
  - Employees page has Directory/Organogram tab views
  - Directory view: table with search, department filter, status filter - all roles see all employees
  - Organogram view: tree visualization grouped by department with color-coded headers, CSS connecting lines
  - Admin-only: Add Employee button, Edit Employee dialog with full form (name, email, phone, position, department, manager, status)
  - Employee edits persist in React state within session via employeeEdits pattern
  - Departments page: all roles can view, admin-only Add/Edit/Delete department operations
  - Admin edit department dialog with name, description, department head dropdown
  - Admin delete department with session persistence
  - Sidebar updated to show Employees and Departments to all roles
- 2026-02-01: Comprehensive Recruitment/ATS Module implemented
  - Jobs page (`/recruitment/jobs`) with card/table view toggle, CRUD operations, and shareable application links
  - Public Careers page (`/careers`) with job listings, filters by department and type
  - Job Application form (`/jobs/:id/apply`) with privacy disclaimer, multi-step flow, and success confirmation
  - Candidate Pipeline page (`/recruitment/candidates`) with Kanban board (drag-drop) and table view across 6 stages
  - Candidate Detail page (`/recruitment/candidates/:id`) with 5 tabs: Overview, Assessments, Interviews, Communications, Notes
  - Recruitment Settings page (`/recruitment/settings`) for email templates with variables, privacy disclaimer, and terms editing
  - Zustand recruitment store for state management with demo data (4 jobs, 9 candidates, 4 email templates)
  - Role-based access control: Recruitment pages are Admin-only with route guards
- 2026-02-01: Peer Reviewer Assignment for 360° Cycles
  - Admins can now assign peer reviewers for each participant in 360° cycles
  - "Assign Peers" button appears next to each selected participant in the Manage Participants dialog
  - Peer reviewers are limited to other cycle participants (excluding the reviewee and their manager)
  - Peer assignments persist via Zustand store and are automatically cleaned up when participants are removed
- 2026-02-01: Appraisal Cycles and Results redesign
  - 180° reviews now hide weight configuration (manager-only scoring, 100% manager weight)
  - New Cycle Progress page (`/appraisals/cycles/:id`) for admins to track participant review status
  - Progress page shows overall stats, review completion progress bar, and expandable participant details
  - Results page redesigned with unified header (employee info + score integrated)
  - Results now use tabs for "Competency Ratings" and "Written Feedback" sections
  - Competency ratings grouped by category with category averages
- 2026-02-01: Comprehensive Performance Appraisals system implemented
  - My Appraisals page with Pending/Completed/Received tabs
  - Review Form with star ratings (1-5), text questions, and overall comments
  - Results page with weighted scores, competency averages, and anonymous peer feedback
  - Templates page (Admin-only) for creating review templates with rating/text questions
  - Cycles page (Admin-only) for managing cycles with weight configuration and participant selection
  - In-memory state management via Zustand for Save Draft/Submit functionality
  - Peer feedback anonymous to employees, visible with names to admins only
- 2026-02-01: Leave Management restructured with nested sidebar navigation
  - Added `/leave/analytics` page with charts (leave usage by type, department distribution, monthly trends)
  - Added `/leave/settings` page (Admin-only) for leave types, company holidays, and employee balances
  - Sidebar now shows collapsible "Leave Management" with sub-items for Admin users (Requests, Analytics, Settings)
  - Non-admin users see single "Leave Management" link
- 2026-01-28: Initial MVP completed with all core modules
  - Dashboard with statistics and widgets
  - Employee and Department management
  - Leave management with request/approval workflow
  - Performance appraisals with 180°/360° review support
  - Settings with profile management

## Project Architecture

### Key Directories
```
client/
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── ui/              # shadcn/ui base components
│   │   ├── app-sidebar.tsx  # Main navigation sidebar
│   │   └── theme-toggle.tsx # Dark/light mode toggle
│   ├── pages/               # Route pages
│   │   ├── dashboard.tsx    # Main dashboard
│   │   ├── employees.tsx    # Employee management
│   │   ├── departments.tsx  # Department management
│   │   ├── leave.tsx        # Leave request/approval
│   │   ├── leave-analytics.tsx  # Leave analytics (Admin-only)
│   │   ├── leave-settings.tsx   # Leave settings (Admin-only)
│   │   ├── appraisals.tsx   # My Appraisals dashboard
│   │   ├── appraisal-review.tsx  # Review form with ratings
│   │   ├── appraisal-results.tsx # Results with weighted scores
│   │   ├── appraisal-templates.tsx # Template management (Admin)
│   │   ├── appraisal-cycles.tsx  # Cycle management (Admin)
│   │   ├── cycle-progress.tsx    # Cycle progress tracking (Admin)
│   │   ├── recruitment-jobs.tsx  # Job postings management (Admin)
│   │   ├── recruitment-candidates.tsx  # Candidate pipeline (Admin)
│   │   ├── candidate-detail.tsx  # Candidate details with 5 tabs (Admin)
│   │   ├── recruitment-settings.tsx  # Email templates & settings (Admin)
│   │   ├── careers.tsx       # Public job listings
│   │   ├── job-application.tsx  # Public job application form
│   │   └── settings.tsx     # User settings
│   ├── lib/
│   │   ├── demo-data.ts     # Static demo data
│   │   ├── appraisal-store.ts # Zustand store for appraisal state
│   │   ├── recruitment-store.ts # Zustand store for recruitment/ATS state
│   │   ├── role-context.tsx # Role-based access control
│   │   └── queryClient.ts   # TanStack Query setup
│   └── App.tsx              # Root component with routing
shared/
└── schema.ts                # Drizzle ORM schema definitions
server/
├── routes.ts                # API routes (minimal for this demo)
└── storage.ts               # Storage interface
```

### Routes
- `/` - Dashboard
- `/employees` - Employee management
- `/departments` - Department management
- `/leave` - Leave management (requests, calendar, balances)
- `/leave/analytics` - Leave analytics with charts (Admin-only)
- `/leave/settings` - Leave types, holidays, and balances configuration (Admin-only)
- `/appraisals` - My Appraisals dashboard
- `/appraisals/review/:id` - Fill/view a review form
- `/appraisals/results/:id` - View appraisal results with tabbed ratings/feedback
- `/appraisals/templates` - Manage review templates (Admin-only)
- `/appraisals/cycles` - Manage review cycles (Admin-only)
- `/appraisals/cycles/:id` - View cycle progress and participant status (Admin-only)
- `/recruitment/jobs` - Job postings management (Admin-only)
- `/recruitment/candidates` - Candidate pipeline with Kanban/Table view (Admin-only)
- `/recruitment/candidates/:id` - Candidate details with 5 tabs (Admin-only)
- `/recruitment/settings` - Email templates and legal settings (Admin-only)
- `/careers` - Public careers page with job listings (standalone, no sidebar)
- `/jobs/:id` - Public job details page (standalone, no sidebar)
- `/jobs/:id/apply` - Public job application form (standalone, no sidebar)
- `/settings` - User settings

## Data Model

### Core Entities
- **Employees**: Staff members with roles, departments, and managers
- **Departments**: Organizational units with managers
- **Leave Types**: Categories of leave (Annual, Sick, Personal, etc.)
- **Leave Balances**: Employee leave allocations per year
- **Leave Requests**: Time-off requests with approval workflow
- **Appraisal Cycles**: Performance review periods (180° or 360°)
- **Appraisals**: Individual employee reviews within a cycle
- **Feedback**: Review submissions from various reviewer types

### Demo User
The current demo user is **Marcus Johnson** (emp-2), a Senior Software Engineer in the Engineering department. This is used throughout the demo to simulate a logged-in user experience.

## Development Notes

### Design System
- Primary color: Blue (#3b82f6)
- Uses shadcn/ui components exclusively
- Follows the project's universal design guidelines
- Dark mode support via theme toggle

### Form Handling
All forms use:
- react-hook-form for form state management
- zodResolver for validation
- Drizzle-zod insert schemas for type safety

### Testing
All interactive elements have `data-testid` attributes for Playwright testing:
- Pattern for interactive elements: `{action}-{target}` (e.g., `button-submit`)
- Pattern for display elements: `{type}-{content}` (e.g., `text-username`)
- Pattern for dynamic elements: `{type}-{description}-{id}` (e.g., `card-product-123`)

## User Preferences
- Frontend-only implementation preferred
- No API/backend complexity
- Demo data for all modules
- Professional HR platform aesthetic
