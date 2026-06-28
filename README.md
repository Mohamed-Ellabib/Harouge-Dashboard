# ERP Sprint Progress System

ERP Sprint Progress System is an internal Harouge Oil Operations web system for
tracking ERP project progress across sprint areas, sprint items, assigned work,
team activity, and audit history.

The system is built for administrators, project managers, supervisors, and ERP
team members. Admin users can manage sprint progress, sprint items, team users,
roles, permissions, and audit records. Employee users have a focused workflow for
their assigned work and progress reporting.

## What The System Has

### Sprint Progress Dashboard

- Admin dashboard for ERP sprint progress visibility.
- Overall project progress card with a manually editable percentage.
- Sprint area cards for:
  - Development Sprint
  - Facility Sprint
  - Infrastructure Sprint
- Current sprint work, sprint focus, workload, recent sprint items, and recent
  activity sections.

### Sprints

- Sprints page for monitoring the main ERP sprint areas.
- Sprint area detail pages for Development, Facility, and Infrastructure.
- Create Sprint workflow connected to MongoDB.
- Sprint owner, status, dates, area, description, active flag, and progress
  information.

### Sprint Items

- Sprint Items page for ERP work items.
- Sprint item list with status, progress, priority, due date, assignees, and
  actions.
- Create Sprint Item workflow.
- View/edit sprint item details.
- Progress update workflow with required progress notes.
- Support for assigned work and sprint item history through task updates.

### My Tasks

- Employee-focused My Tasks page.
- Employees see their assigned sprint items.
- Employees can open task details and update progress.
- Progress updates require a written report/note.
- When progress reaches 100%, the item is treated as completed.

### Team Management

- Team page backed by the Users API.
- Create team member workflow.
- Edit team member workflow.
- Role assignment.
- Status changes.
- Admin password reset for users.
- First-login password-change requirement.

### Access Control

- Local email/password authentication.
- HTTP-only cookie session authentication.
- CSRF protection for unsafe requests.
- Failed-login lockout.
- Role-based authorization.
- Approved roles:
  - Super Admin
  - IT Manager
  - Supervisor
  - Employee

### Audit Logs

- Audit Logs page for reviewing system activity.
- Audit API for listing and viewing audit records.
- Important actions are recorded with actor, entity, action, and timestamp.

### Reports

- Report API endpoints for request and task/sprint-item reporting.
- Frontend Reports route exists in the application navigation.

### Bilingual Interface

- English and Arabic language support.
- RTL layout support for Arabic.
- Language switch on the sign-in page and inside the authenticated layout.

## Active Data Collections

MongoDB Atlas is the primary database.

Current active collections:

```text
roles
permissions
users
sprints
requests
tasks
task_updates
comments
audit_logs
project_progress
```

The frontend uses sprint terminology. Some backend collections still use earlier
request/task names while they support the current sprint-item workflows.

## Technology Stack

- React 19
- TypeScript
- Vite
- React Router
- Node.js
- Express 5
- MongoDB Atlas
- Mongoose
- Zod
- bcryptjs
- pino logging
- helmet
- cors
- express-rate-limit
- Vitest and Supertest

## Project Structure

```text
IT-Department-Control-Center/
  apps/
    api/                 Node.js + Express API
    web/                 React + Vite frontend
  database/              Database reference and MongoDB planning
  docs/                  Project documentation and decisions
  render.yaml            Render deployment blueprint
  .env.example           Environment variable template
  package.json           npm workspace scripts
```

## Main Frontend Routes

```text
/login
/dashboard
/project-progress
/sprints
/sprints/:areaKey
/sprint-items
/my-tasks
/users
/audit-logs
/reports
/settings
```

## Main API Areas

All API routes are under `/api`.

```text
/api/health
/api/auth
/api/roles
/api/permissions
/api/users
/api/sprints
/api/requests
/api/tasks
/api/comments
/api/audit-logs
/api/dashboard
/api/project-progress
/api/reports
```

## Local Development

Install dependencies:

```bash
npm install
```

Run the API:

```bash
npm run api:dev
```

Run the frontend:

```bash
npm run web:dev
```

Default local URLs:

```text
API: http://127.0.0.1:5000
Web: http://127.0.0.1:3000
```

## Build

```bash
npm run api:build
npm run web:build
```

## Database Commands

```bash
npm run api:db:check
npm run api:db:setup
npm run api:db:indexes
```

## Deployment

The repository includes a Render Blueprint:

```text
render.yaml
```

Production secrets such as `MONGODB_URI` and `SESSION_SECRET` must be configured
in Render environment variables. They must not be committed to the repository.
