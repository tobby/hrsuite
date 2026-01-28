# HRFlow - HR Management Platform

## Overview
HRFlow is a frontend-only HR management platform built for demonstration purposes. It provides three core modules: Leave Management, Performance Appraisals, and Employee Management. The platform uses static demo data instead of API calls, as per user requirements.

## Current State
- **Status**: Complete MVP with all core modules functional
- **Last Updated**: January 28, 2026
- **Tech Stack**: React + TypeScript, Vite, Tailwind CSS, shadcn/ui components

## Recent Changes
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
│   │   ├── performance.tsx  # Performance appraisals
│   │   └── settings.tsx     # User settings
│   ├── lib/
│   │   ├── demo-data.ts     # Static demo data
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
- `/leave` - Leave management
- `/performance` - Performance appraisals
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
