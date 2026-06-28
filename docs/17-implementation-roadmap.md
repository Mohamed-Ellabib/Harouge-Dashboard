# Implementation Roadmap

This document is the detailed build route for the current system.

## Scope Lock

The current implementation must include only the entities from `database/schema.sql`:

- `roles`
- `permissions`
- `users`
- `requests`
- `tasks`
- `task_updates`
- `comments`
- `audit_logs`

Do not implement purchases, MR, products, assets, suppliers, attachments, notifications, or settings during this roadmap.

## Build Direction

Build backend first, then frontend.

Reason:

- The frontend depends on API contracts.
- The dashboard depends on backend calculations.
- Permissions must be enforced by the backend before screens are connected.
- MongoDB models and validation should define the real data shape before UI forms are built.

## Global Definition Of Done

Every implementation stage is complete only when:

- Code builds without errors.
- Environment variables are documented.
- Routes are protected where required.
- Inputs are validated.
- Errors return a consistent response shape.
- Important actions are audit logged where required.
- Documentation is updated if behavior, fields, statuses, permissions, or API contracts change.

## Stage 0: Final Planning Gate

### Objective

Approve the minimum decisions needed before coding starts.

### Decisions Needed

- Confirm MongoDB Atlas will be used.
- Confirm permission modules and actions.

Authentication decision is already made: local email/password with HTTP-only cookie sessions.

Approved decisions:

- Roles: Super Admin, IT Manager, Supervisor, Employee.
- User statuses: `active`, `inactive`, `suspended`.
- Request statuses: `draft`, `submitted`, `assigned`, `in_progress`, `completed`, `rejected`, `cancelled`, `closed`.
- Task statuses: `open`, `in_progress`, `blocked`, `waiting_review`, `completed`, `cancelled`.
- Comments are assigned to requests only for MVP.
- 5 failed login attempts lock login for 15 minutes.
- First login password change is required.
- Priorities: `low`, `medium`, `high`, `urgent`.
- Task categories: `support`, `network`, `server`, `software`, `hardware`, `access`, `maintenance`, `other`.
- Request types: `support`, `access`, `hardware`, `software`, `network`, `server`, `other`.
- No-update task alerts are not part of MVP.
- Closed requests and tasks can be edited by Super Admin and IT Manager.

### Deliverables

- Approved `docs/05-data-model.md`
- Approved `docs/16-mongodb-collection-model.md`
- Approved `docs/06-api-map.md`
- Approved `docs/03-roles-and-permissions.md`
- Updated `.env.example` if auth requirements change

### Exit Criteria

- No major unknown blocks Stage 1.
- Current scope remains limited to the eight entities.

## Stage 1: Backend Foundation

Status: completed.

### Objective

Create the API base without business features.

### Build

- TypeScript setup for `apps/api`
- Express server
- Environment loader and validation
- MongoDB Atlas connection through Mongoose
- Health check endpoint
- Global error handler
- Standard API response format
- Request logging
- Security middleware
- CORS setup
- Rate limiting
- Route registration pattern

### API

```text
GET /api/health
```

Health response should include:

- API status
- Environment name
- MongoDB connection status

### Deliverables

- API starts locally.
- MongoDB connection works through `MONGODB_URI`.
- `.env.example` matches the required variables.
- Backend README explains how to run the API.

### Verification

- Run backend build.
- Run backend lint if configured.
- Call `GET /api/health`.
- Confirm clean failure when `MONGODB_URI` is missing.

### Exit Criteria

- Backend foundation is stable enough to add models and modules.

## Stage 2: Shared Backend Infrastructure

Status: completed.

### Objective

Create reusable backend patterns before adding business modules.

### Build

- Shared route wrapper
- Shared controller pattern
- Shared service pattern
- Shared repository/model access pattern
- Shared validation pattern
- Shared pagination helper
- Shared filtering helper
- Shared audit log helper
- Shared authorization middleware
- Shared constants for statuses and permission actions

### Deliverables

- Consistent response shape
- Consistent error shape
- Reusable validation strategy
- Reusable permission check strategy

### Verification

- Unit or smoke checks for response/error helpers if tests are configured.
- Manual invalid request check returns a controlled error.

### Exit Criteria

- Business modules can follow one clear structure.

## Stage 3: MongoDB Models

Status: completed.

### Objective

Create strict Mongoose models for the eight current entities.

### Build Models

- `Role`
- `Permission`
- `User`
- `Request`
- `Task`
- `TaskUpdate`
- `Comment`
- `AuditLog`

### Model Rules

- Use strict schemas.
- Add required fields based on the current data model.
- Add indexes from `docs/16-mongodb-collection-model.md`.
- Add enum validation after statuses are approved.
- Do not add cancelled module fields.
- Add password fields to `users` because local authentication is approved.

### Deliverables

- Mongoose schemas and models
- Index definitions
- Model-level validation
- Seed strategy document or seed script plan

### Verification

- Backend build passes.
- Model imports do not create circular dependency problems.
- Invalid model data fails validation.

### Exit Criteria

- All current database entities are represented in MongoDB.

## Stage 4: Seed Data

Status: completed.

### Objective

Create the first controlled access data.

### Build

- Seed default roles.
- Seed default permissions.
- Seed first admin user strategy.

### Required Seeds

Draft role seeds:

- Super Admin
- IT Manager
- Supervisor
- Employee

Draft permission modules:

- `roles`
- `permissions`
- `users`
- `requests`
- `tasks`
- `task_updates`
- `comments`
- `audit_logs`
- `dashboard`
- `reports`

### Deliverables

- Seed script or documented manual seed route for development only
- Repeat-safe seed behavior
- No duplicate roles or permissions on rerun

### Verification

- Run seed twice.
- Confirm duplicate records are not created.
- Confirm role/permission counts are correct.

### Exit Criteria

- Access control has initial data for authentication and authorization work.

## Stage 5: Authentication And Authorization

Status: completed.

### Objective

Allow approved users to sign in and access only permitted APIs.

### Build

- Login
- Logout
- Current user endpoint
- Change password
- bcrypt password hashing
- HTTP-only cookie session handling
- First-login password change handling
- 5 failed attempts lock for 15 minutes
- Auth middleware
- Role middleware
- Permission middleware
- Disabled user blocking

### API

```text
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
POST /api/auth/change-password
```

### Deliverables

- Protected routes work.
- User identity is available to controllers.
- Permission checks are centralized.
- Password hash is never returned in API responses.
- Failed login and unauthorized access return controlled errors.

### Verification

- Valid user can log in.
- Invalid login fails.
- Disabled user cannot log in.
- User can change password.
- User without permission cannot access protected admin route.

### Exit Criteria

- Backend can safely expose business modules.

## Stage 6: Roles, Permissions, And Users Module

Status: completed.

### Objective

Build administrative user and access management.

### Build

- Role list/create/update
- Permission list/create/update
- User list/create/update
- User status change
- Assign role to user
- Audit logs for sensitive changes

### API

```text
GET   /api/roles
POST  /api/roles
GET   /api/roles/:id
PATCH /api/roles/:id

GET   /api/permissions
POST  /api/permissions
GET   /api/permissions/:id
PATCH /api/permissions/:id
GET   /api/roles/:id/permissions

GET   /api/users
POST  /api/users
GET   /api/users/:id
PATCH /api/users/:id
PATCH /api/users/:id/status
PATCH /api/users/:id/role
PATCH /api/users/:id/password
```

### Deliverables

- Admin can manage users.
- Admin can manage role permissions.
- User list supports search/filter/pagination.
- Sensitive changes write audit logs.

### Verification

- Create role.
- Add permission to role.
- Create user.
- Assign role.
- Disable user.
- Confirm audit logs exist for sensitive actions.

### Exit Criteria

- Access management is complete enough for request/task modules.

## Stage 7: Requests Module

Status: completed.

### Objective

Build IT request management.

### Build

- Create request
- List requests
- View request details
- Update request
- Change request status
- Assign request
- Add request comment
- Audit request changes

### API

```text
GET   /api/requests
POST  /api/requests
GET   /api/requests/:id
PATCH /api/requests/:id
PATCH /api/requests/:id/status
PATCH /api/requests/:id/assign
GET   /api/requests/:id/comments
POST  /api/requests/:id/comments
```

### Deliverables

- Request code generation strategy
- Request filters
- Request status validation
- Request comments
- Audit logs for important request changes

### Verification

- Create request.
- Assign request.
- Change request status.
- Add comment.
- Confirm unauthorized users cannot edit.
- Confirm audit logs exist.

### Exit Criteria

- Tasks can now be linked to requests.

## Stage 7.5: Enterprise Hardening Gate

Status: completed.

### Objective

Fix serious security and enterprise-readiness issues before expanding the business surface with tasks.

### Completed

- Revocable cookie sessions through `users.sessionVersion`
- CSRF protection for unsafe authenticated requests
- Generic login errors for inactive, suspended, locked, missing, and wrong-password accounts
- Row-level request visibility
- Internal comment visibility restrictions
- Request status transition validation
- User administration restrictions around Super Admin accounts
- Strict audit writes when `AUDIT_LOG_ENABLED=true`
- Updated security and stage documentation

### Remaining Before Production

- Automated API tests
- Transaction strategy for sensitive write plus audit write atomicity
- Production MongoDB Atlas network, backup, and restore policy
- Real seeded database verification

### Exit Criteria

- Stage 8 can start with the access-control patterns already enforced for requests and users.

## Stage 8: Tasks And Task Updates Module

Status: completed.

### Objective

Build task assignment, progress tracking, and task history.

### Build

- Create task
- List tasks
- View task details
- Update task
- Reassign task
- Change task status
- Update task progress
- Create immutable task updates
- Detect overdue tasks

### API

```text
GET   /api/tasks
POST  /api/tasks
GET   /api/tasks/:id
PATCH /api/tasks/:id
PATCH /api/tasks/:id/status
POST  /api/tasks/:id/progress
POST  /api/tasks/:id/reassign
GET   /api/tasks/:id/updates
```

### Deliverables

- Task code generation strategy
- Task filters
- Progress validation
- Blocked reason validation
- Completion validation
- Task update history
- Audit logs for important task changes

### Verification

- Create task linked to request.
- Assign task to employee.
- Update progress.
- Confirm `task_updates` record is created.
- Try to complete task below 100 percent and confirm it fails.
- Mark blocked without reason and confirm it fails.
- Confirm overdue detection works.

### Exit Criteria

- The core operational workflow is complete.

## Stage 9: Comments Module

Status: completed.

### Objective

Complete comment management for requests.

### Build

- View comment by ID
- Edit comment if policy allows
- Enforce internal comment visibility
- Enforce request ownership rules

### API

```text
GET   /api/comments/:id
PATCH /api/comments/:id
```

### Deliverables

- Comment permissions
- Comment validation
- Internal comment visibility rules

### Verification

- Request comments appear only on the correct request.
- Unauthorized users cannot edit comments.
- Internal comments are hidden from users without permission.

### Exit Criteria

- Request and task collaboration is complete for MVP.

## Stage 10: Audit Logs Module

Status: completed.

### Objective

Expose protected audit history.

### Build

- Audit log list
- Audit log filters
- Audit detail view
- Actor/entity filtering

### API

```text
GET /api/audit-logs
GET /api/audit-logs/:id
```

### Deliverables

- Audit list endpoint
- Date filtering
- Actor filtering
- Entity filtering
- Action filtering

### Verification

- Admin can view audit logs.
- Normal employee cannot view audit logs.
- Filters return expected records.
- Audit logs are not editable through normal APIs.

### Exit Criteria

- Administrative traceability is available.

## Stage 11: Dashboard And Reports API

Status: initial API completed.

### Objective

Create backend-calculated operational visibility.

### Build Dashboard APIs

```text
GET /api/dashboard/summary
GET /api/dashboard/activity
```

### Build Report APIs

```text
GET /api/reports/requests
GET /api/reports/tasks
```

### Dashboard Metrics

- Open requests
- Requests by status
- Active tasks
- Overdue tasks
- Blocked tasks
- Waiting review tasks
- Recent task updates
- Recent request comments

### Deliverables

- Backend aggregation queries
- Role-aware dashboard data
- Report filters
- Pagination for report data
- Display references for report user/request fields

Remaining:

- User workload report endpoint
- CSV/Excel export formats if approved later
- Saved report presets if approved later

### Verification

- Dashboard values match database records.
- Employee dashboard only shows own allowed data.
- Manager/admin dashboard follows permission rules.
- Reports use only current-scope collections.
- `npm run api:test` covers dashboard summary/activity and request/task reports.

### Exit Criteria

- Frontend can be built against stable dashboard/report APIs.

## Stage 12: Frontend Foundation

Status: started; sign-in page completed.

### Objective

Create the React application shell.

### Build

- TypeScript setup for `apps/web`
- Routing
- API client
- Auth context
- Sign-in page
- Protected route placeholder
- Layout shell
- Sidebar navigation
- Topbar
- Error and loading states
- Basic design tokens/styles

### Deliverables

- Login route: completed
- Protected app layout
- API client connected to backend base URL
- Role-aware navigation shell

### Verification

- Frontend builds.
- Login page renders.
- User can log in.
- Protected route redirects unauthenticated user.
- Navigation only shows current-scope modules.

### Exit Criteria

- Feature screens can be built inside the shell.

## Stage 13: Frontend Access Management Screens

### Objective

Build admin screens for roles, permissions, and users.

### Screens

- Users list
- User details/edit
- Roles list
- Role details/edit
- Permissions list

### Deliverables

- Tables with filters
- Create/edit forms
- Status controls
- Role assignment UI
- Permission assignment UI

### Verification

- Admin can create/edit users.
- Admin can change user status.
- Admin can manage role permissions.
- Unauthorized users cannot access screens.

### Exit Criteria

- Admin can manage access without direct database work.

## Stage 14: Frontend Requests Screens

### Objective

Build request management UI.

### Screens

- Requests list
- Request detail
- Request create/edit form
- Request comments panel

### Deliverables

- Filters
- Status badges
- Assignment controls
- Comment form
- Related tasks section

### Verification

- User can create request if permitted.
- Manager can assign request.
- Request comments work.
- Request list filters work.

### Exit Criteria

- Request workflow is usable from the UI.

## Stage 15: Frontend Tasks Screens

### Objective

Build task management and progress UI.

### Screens

- Tasks list
- My tasks
- Task detail
- Task create/edit form
- Task progress panel
- Task update timeline

### Deliverables

- Filters
- Progress controls
- Status controls
- Assignment controls
- Blocked reason field
- Review/completion action
- Task update timeline

### Verification

- Employee can update own task progress.
- Manager can assign/reassign tasks.
- Invalid progress transitions are blocked by backend and shown clearly in UI.
- Task update timeline displays history.

### Exit Criteria

- Core task workflow is usable from the UI.

## Stage 16: Frontend Dashboard, Reports, And Audit Screens

### Objective

Complete visibility screens.

### Screens

- Admin dashboard
- Manager dashboard
- Employee dashboard
- Request report
- Task report
- User workload report
- Audit logs

### Deliverables

- KPI panels
- Workload table
- Overdue, blocked, and waiting review lists
- Report filters
- Audit log filters

### Verification

- Dashboard numbers match API.
- Role-specific dashboards show only allowed data.
- Reports filter correctly.
- Audit log screen is protected.

### Exit Criteria

- MVP has operational visibility.

## Stage 17: Hardening And QA

### Objective

Make the MVP reliable enough for controlled internal testing.

### Build

- Validation review
- Permission review
- Error state review
- Empty state review
- Loading state review
- Audit coverage review
- Index/performance review
- Basic backup/restore note
- Deployment readiness note

### Verification

- Backend build passes.
- Frontend build passes.
- Key API flows tested manually or with automated tests.
- Main UI flows tested manually.
- No cancelled modules appear in navigation, API docs, or folder structure.

### Exit Criteria

- System is ready for internal demo or pilot.

## Recommended First Coding Task

Start with Stage 1 only:

```text
API foundation + MongoDB connection + health endpoint
```

Do not start authentication, users, requests, or tasks until the API foundation is stable.

## Roadmap Change Rule

If scope changes, update these files in the same change:

- `docs/05-data-model.md`
- `docs/06-api-map.md`
- `docs/07-ui-page-map.md`
- `docs/12-phase-plan.md`
- `docs/13-project-structure.md`
- `docs/16-mongodb-collection-model.md`
- `docs/17-implementation-roadmap.md`
- a new decision record under `docs/decisions/`
