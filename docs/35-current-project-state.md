# Current Project State

Status date: 2026-06-25

This document is the single current-state reference for what exists in the
project now. It describes implemented code, database scope, seeded data,
frontend pages, backend APIs, security rules, and the remaining gaps.

## 1. Product Identity

The system name used in the application UI is:

```text
ERP Sprint Progress System
```

The system is now positioned as an ERP project sprint progress tracker. The
frontend uses sprint terminology:

- Sprint Areas
- Sprint Items
- Sprint Updates
- Team

Current UI sprint areas are:

1. Development Sprint
2. Facility Sprint
3. Infrastructure Sprint

The backend now has a real `sprints` collection for sprint area records. The
earlier `requests`, `tasks`, and `task_updates` collections still exist
temporarily and currently provide the sprint-item and sprint-update data.

The system is not currently a purchase, MR, product, asset, supplier,
attachment, notification, or settings system.

## 2. Locked Current Scope

The approved current scope currently contains nine active data entities:

1. Roles
2. Permissions
3. Users
4. Sprints
5. Requests
6. Tasks
7. Task updates
8. Comments
9. Audit logs

MongoDB Atlas is the primary database, and the implemented MongoDB collections
map to those nine entities.

Active collections:

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
```

Cancelled for now:

- Purchases / MR
- Products
- Assets
- Suppliers
- Attachments
- Notifications
- System settings

Do not build or scaffold those cancelled modules unless the project owner
approves a scope change.

## 3. Technology Stack

Root project:

- npm workspaces
- TypeScript
- `apps/api` backend workspace
- `apps/web` frontend workspace

Backend:

- Node.js
- Express 5
- TypeScript
- MongoDB Atlas
- Mongoose
- Zod validation
- bcryptjs password hashing
- pino logging
- helmet
- cors
- express-rate-limit
- Vitest and Supertest for API tests
- mongodb-memory-server for integration tests

Frontend:

- React 19
- TypeScript
- Vite
- React Router
- lucide-react icons
- plain CSS in `apps/web/src/styles.css`
- in-app API client in `apps/web/src/api/client.ts`

## 4. Repository Layout

Important folders and files:

```text
IT-Department-Control-Center/
  apps/
    api/
      src/
        app.ts
        server.ts
        config/
        database/
        middleware/
        modules/
        routes/
        shared/
        types/
      tests/
      package.json
    web/
      public/
      src/
        api/
        app/
        context/
        features/
        i18n/
        main.tsx
        styles.css
      index.html
      package.json
      vite.config.ts
  database/
    schema.sql
    mongodb/
  docs/
  .env.example
  package.json
```

Current frontend feature folders:

```text
apps/web/src/features/auth
apps/web/src/features/dashboard
apps/web/src/features/users
```

Current backend module folders:

```text
apps/api/src/modules/health
apps/api/src/modules/auth
apps/api/src/modules/roles
apps/api/src/modules/permissions
apps/api/src/modules/users
apps/api/src/modules/sprints
apps/api/src/modules/it-requests
apps/api/src/modules/tasks
apps/api/src/modules/task-updates
apps/api/src/modules/comments
apps/api/src/modules/audit-logs
apps/api/src/modules/dashboard
apps/api/src/modules/reports
```

## 5. Root Scripts

Run from the repository root:

```text
npm run api:build
npm run api:db:check
npm run api:db:clean-demo
npm run api:db:indexes
npm run api:db:setup
npm run api:dev
npm run api:seed
npm run api:seed:development
npm run api:start
npm run api:test
npm run api:test:typecheck
npm run api:typecheck
npm run web:build
npm run web:dev
npm run web:preview
npm run web:typecheck
```

API dev server:

```text
http://127.0.0.1:5000
```

Web dev server:

```text
http://127.0.0.1:3000
```

Vite proxies frontend `/api` calls to the API target configured by
`VITE_API_PROXY_TARGET`, defaulting to:

```text
http://127.0.0.1:5000
```

## 6. Environment Configuration

The root `.env.example` defines the expected environment variables.

Main runtime variables:

```text
NODE_ENV
APP_NAME
API_HOST
API_PORT
API_BASE_URL
TRUST_PROXY_HOPS
WEB_HOST
WEB_PORT
WEB_BASE_URL
VITE_API_PROXY_TARGET
```

MongoDB variables:

```text
MONGODB_URI
MONGODB_DB_NAME
MONGODB_AUTO_INDEX
MONGODB_MAX_POOL_SIZE
MONGODB_MIN_POOL_SIZE
MONGODB_SERVER_SELECTION_TIMEOUT_MS
MONGODB_CONNECT_TIMEOUT_MS
MONGODB_SOCKET_TIMEOUT_MS
```

Authentication variables:

```text
AUTH_PROVIDER
SESSION_SECRET
COOKIE_NAME
COOKIE_SECURE
COOKIE_SAME_SITE
CSRF_COOKIE_NAME
CSRF_HEADER_NAME
SESSION_TTL_HOURS
BCRYPT_SALT_ROUNDS
AUTH_MAX_FAILED_LOGIN_ATTEMPTS
AUTH_LOCK_MINUTES
AUTH_RATE_LIMIT_MAX_REQUESTS
FORCE_PASSWORD_CHANGE_ON_FIRST_LOGIN
```

Initial Super Admin seed variables:

```text
INITIAL_ADMIN_EMAIL
INITIAL_ADMIN_FULL_NAME
INITIAL_ADMIN_PASSWORD
INITIAL_ADMIN_JOB_TITLE
INITIAL_ADMIN_DEPARTMENT
INITIAL_ADMIN_PHONE
```

Development seed password variables:

```text
DEVELOPMENT_IT_MANAGER_PASSWORD
DEVELOPMENT_SUPERVISOR_PASSWORD
DEVELOPMENT_EMPLOYEE_PASSWORD
```

Security/audit variables:

```text
RATE_LIMIT_WINDOW_MINUTES
RATE_LIMIT_MAX_REQUESTS
CORS_ORIGIN
AUDIT_LOG_ENABLED
```

Do not document real `.env` secrets, Atlas passwords, session secrets, or seed
passwords.

## 7. MongoDB Atlas State

Development Atlas provisioning has been verified.

Verified items from the project docs and setup work:

- Atlas connectivity works from an allowlisted IP.
- Database name is `itdcc`.
- Nine approved collections exist after setup/seed.
- Declared indexes are provisioned.
- Four system roles are seeded.
- 100 role-permission documents are seeded after adding sprint permissions.
- Initial Super Admin seed exists.
- Development seed can populate realistic fictional operational data.

Commands:

```text
npm run api:db:check
npm run api:db:setup
npm run api:db:indexes
```

`api:db:setup` connects, pings MongoDB, creates indexes, seeds roles,
permissions, and the optional initial Super Admin.

Runtime automatic index creation is disabled by default through:

```text
MONGODB_AUTO_INDEX=false
```

## 8. Data Model

### Roles

Collection:

```text
roles
```

Model:

```text
RoleModel
```

Fields:

- `name`
- `displayName`
- `description`
- `isSystem`
- `createdAt`
- `updatedAt`

Indexes:

- unique `name`

Approved role keys:

```text
super_admin
it_manager
supervisor
employee
```

Display names:

- Super Admin
- IT Manager
- Supervisor
- Employee

### Permissions

Collection:

```text
permissions
```

Model:

```text
PermissionModel
```

Fields:

- `roleId`
- `name`
- `module`
- `displayName`
- `description`
- `createdAt`
- `updatedAt`

Indexes:

- unique `roleId + name`
- `module`

Permission name format:

```text
module:action
```

Permission modules:

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
dashboard
reports
```

Permission actions:

```text
view
create
update
change_status
assign
review
comment
view_audit
```

### Users

Collection:

```text
users
```

Model:

```text
UserModel
```

Fields:

- `email`
- `fullName`
- `passwordHash`
- `roleId`
- `status`
- `department`
- `jobTitle`
- `phone`
- `authUserId`
- `lastLoginAt`
- `failedLoginCount`
- `lockedUntil`
- `mustChangePassword`
- `passwordChangedAt`
- `sessionVersion`
- `createdAt`
- `updatedAt`

Indexes:

- unique `email`
- sparse unique `authUserId`
- `roleId`
- `status`
- `department`

User statuses:

```text
active
inactive
suspended
```

Security behavior:

- `passwordHash` is excluded from normal JSON serialization.
- `sessionVersion` is selected only when needed for auth/session operations.
- failed login lockout is implemented.
- first-login password-change requirement is implemented.

### Sprints

Collection:

```text
sprints
```

Model:

```text
SprintModel
```

Fields:

- `code`
- `name`
- `description`
- `sprintArea`
- `status`
- `ownerId`
- `createdBy`
- `progressTarget`
- `active`
- `notifyLater`
- `startDate`
- `targetDate`
- `createdAt`
- `updatedAt`

Indexes:

- unique `code`
- `sprintArea + status`
- `ownerId`
- `status`
- `targetDate`
- `active`
- `createdAt`

Sprint areas:

```text
development
facility
infrastructure
```

Sprint statuses:

```text
planned
in_progress
at_risk
completed
cancelled
```

Current implementation note:

- Sprint creation is real and writes to MongoDB through `/api/sprints`.
- Sprint item/task counts still come from the existing task/report data.

### Requests

Collection:

```text
requests
```

Model:

```text
ItRequestModel
```

Fields:

- `requestCode`
- `title`
- `description`
- `type`
- `priority`
- `status`
- `requestedBy`
- `requestedForDepartment`
- `assignedTo`
- `requiredDate`
- `closedAt`
- `createdAt`
- `updatedAt`

Indexes:

- unique `requestCode`
- `status`
- `status + createdAt`
- `priority`
- `type`
- `requestedBy`
- `assignedTo`
- `requiredDate`
- `status + closedAt`

Request statuses:

```text
draft
submitted
assigned
in_progress
completed
rejected
cancelled
closed
```

Request types:

```text
support
access
hardware
software
network
server
other
```

Priorities:

```text
low
medium
high
urgent
```

### Tasks

Collection:

```text
tasks
```

Model:

```text
TaskModel
```

Fields:

- `taskCode`
- `title`
- `description`
- `category`
- `priority`
- `status`
- `progress`
- `requestId`
- `createdBy`
- `assignedTo`
- `reviewedBy`
- `startDate`
- `dueDate`
- `completedAt`
- `lastProgressUpdateAt`
- `blockedReason`
- `createdAt`
- `updatedAt`

Indexes:

- unique `taskCode`
- `requestId`
- `assignedTo`
- `assignedTo + status`
- `status`
- `status + dueDate`
- `category`
- `priority`
- `dueDate`
- `lastProgressUpdateAt`
- `status + completedAt`
- `assignedTo + status + completedAt`

Task statuses:

```text
open
in_progress
blocked
waiting_review
completed
cancelled
```

Task categories:

```text
support
network
server
software
hardware
access
maintenance
other
```

Task rules implemented at model/service level include:

- completed tasks must have progress `100`
- blocked tasks require `blockedReason`
- task progress updates create immutable `task_updates` history

### Task Updates

Collection:

```text
task_updates
```

Model:

```text
TaskUpdateModel
```

Fields:

- `taskId`
- `updatedBy`
- `previousStatus`
- `newStatus`
- `previousProgress`
- `newProgress`
- `note`
- `createdAt`

Indexes:

- `taskId + createdAt`
- `updatedBy`
- `createdAt`

Task updates are created when progress/status changes are submitted through the
task progress API.

### Comments

Collection:

```text
comments
```

Model:

```text
CommentModel
```

Fields:

- `requestId`
- `createdBy`
- `body`
- `isInternal`
- `createdAt`

Indexes:

- `requestId + createdAt`
- `createdBy`
- `createdAt`

Important scope note:

- Comments are currently assigned to requests for MVP.
- There is no task-comment model in the active implementation.

### Audit Logs

Collection:

```text
audit_logs
```

Model:

```text
AuditLogModel
```

Fields:

- `action`
- `entityType`
- `entityId`
- `actorId`
- `oldValue`
- `newValue`
- `ipAddress`
- `userAgent`
- `createdAt`

Indexes:

- `entityType + entityId + createdAt`
- `actorId + createdAt`
- `action`
- `createdAt`

Audit logs are read-only through the public API.

## 9. Authentication And Security

Authentication decision:

- Local email/password authentication.
- No Microsoft/company SSO for MVP.
- No public registration.
- Admin creates users.
- Passwords are hashed with bcryptjs.
- Browser sessions use an HTTP-only cookie.
- JWT/localStorage token storage is not used.

Implemented auth endpoints:

```text
GET  /api/auth/csrf
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
POST /api/auth/change-password
```

Session behavior:

- server creates a signed HMAC session token
- token contains `userId`, `issuedAt`, `expiresAt`, and `sessionVersion`
- token is stored in HTTP-only cookie configured by `COOKIE_NAME`
- default session duration is `SESSION_TTL_HOURS=8`
- logout increments `sessionVersion`, invalidating existing sessions
- password change increments `sessionVersion`

CSRF behavior:

- CSRF token endpoint is available at `/api/auth/csrf`
- unsafe authenticated requests require matching CSRF cookie and header
- default CSRF header is `x-csrf-token`
- login and CSRF endpoints are exempt from CSRF validation

Lockout behavior:

- recommended and implemented default: 5 failed attempts
- lock duration default: 15 minutes
- locked, inactive, and suspended users cannot sign in

First-login password-change behavior:

- users can be marked `mustChangePassword=true`
- password-change enforcement blocks access to most endpoints until changed
- allowed paths during required password change are auth/me, CSRF, login,
  logout, and change-password

Global API security:

- helmet enabled
- CORS with credentials and explicit allowed origins
- global rate limiting
- login-specific rate limiting
- JSON body limit set to `1mb`
- URL-encoded body limit set to `1mb`
- safe HTTP logging avoids cookies, CSRF headers, authorization, and set-cookie
  values

Production config guardrails:

- production requires secure cookies
- production requires audit logging
- production rejects weak or placeholder session secrets
- production CORS must use explicit HTTPS origins

## 10. Authorization And Visibility

Authorization uses role permissions stored in MongoDB.

Default role permission shape:

- Super Admin: system administration, sprints, requests, tasks, dashboard, reports,
  audit logs
- IT Manager: user view/update, sprint/request/task management, dashboard, reports,
  audit logs
- Supervisor: sprint/request/task management, comments, dashboard, reports
- Employee: visible sprints, visible requests, comments, visible tasks, task
  updates, dashboard

Enterprise admin behavior:

- Super Admin and IT Manager are treated as enterprise admins for current MVP
  dashboard/report visibility.

Dashboard/report visibility:

- Super Admin and IT Manager see all current MVP operational data.
- Supervisor and Employee see records according to row-level visibility.
- Non-admin activity excludes internal comments where applicable.

## 11. Backend API Map

All endpoints are under `/api`.

### Health

```text
GET /api/health
```

Health includes API status, environment, uptime, and MongoDB status. It returns
degraded status when MongoDB ping fails.

### Auth

```text
GET  /api/auth/csrf
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
POST /api/auth/change-password
```

### Roles

```text
GET   /api/roles
POST  /api/roles
GET   /api/roles/:id
PATCH /api/roles/:id
GET   /api/roles/:id/permissions
```

### Permissions

```text
GET   /api/permissions
POST  /api/permissions
GET   /api/permissions/:id
PATCH /api/permissions/:id
```

### Users

```text
GET   /api/users
POST  /api/users
GET   /api/users/:id
PATCH /api/users/:id
PATCH /api/users/:id/status
PATCH /api/users/:id/role
PATCH /api/users/:id/password
```

### Sprints

```text
GET  /api/sprints
POST /api/sprints
GET  /api/sprints/:id
```

### Requests

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

### Tasks

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

### Comments

```text
GET   /api/comments/:id
PATCH /api/comments/:id
```

### Audit Logs

```text
GET /api/audit-logs
GET /api/audit-logs/:id
```

### Dashboard

```text
GET /api/dashboard/overview
GET /api/dashboard/summary
GET /api/dashboard/activity
```

Dashboard metrics are calculated by the API, not the frontend.

### Reports

```text
GET /api/reports/requests
GET /api/reports/tasks
```

Report endpoints support filtering, sorting, pagination, and visibility rules.

## 12. Dashboard API Rules

Reporting timezone:

```text
Africa/Tripoli
```

Week boundary:

```text
Monday 00:00 through next Monday 00:00
```

Open request statuses:

```text
draft
submitted
assigned
```

Request in-progress status:

```text
in_progress
```

Active task statuses:

```text
open
in_progress
blocked
waiting_review
```

Overdue tasks:

```text
active tasks with dueDate before now
```

Dashboard overview returns:

- summary
- focus items
- work queue
- workload
- recent requests
- recent activity

Dashboard summary includes:

- request counts
- task counts
- request groupings by status, priority, type
- task groupings by status, priority, category
- average task progress
- user status grouping for enterprise admins
- current week window
- generated timestamp

## 13. Report API Rules

Request reports can filter/sort request rows with user references for requester
and assignee.

Task reports can filter/sort task rows with user references for assignee,
creator, reviewer, and linked request reference.

Not implemented yet:

- export to CSV/Excel
- saved report presets
- dedicated workload report endpoint
- frontend report pages

## 14. Seed Data

### Access-Control Seed

Command:

```text
npm run api:seed
```

Creates or updates:

- four system roles
- default role permissions
- optional first Super Admin when initial admin env variables are present

Repeat behavior:

- roles matched by `name`
- permissions matched by `roleId + name`
- initial admin user is created only when email does not already exist
- existing initial admin passwords are not overwritten

### Development Data Seed

Command:

```text
npm run api:seed:development
```

Guards:

- refuses to run when `NODE_ENV=production`
- skips unless `ALLOW_DEVELOPMENT_SEED=true`

Seeded development dataset:

- 23 development users plus active Super Admin
- 6 IT requests
- 9 tasks
- 12 task updates
- 8 request comments
- 26 audit-log records

Development roles represented:

- IT Manager
- Supervisor
- Employee
- existing Super Admin

Stable demo codes:

```text
REQ-DEMO-*
TASK-DEMO-*
```

The data is fictional and uses reserved `.example` / `example.com` email
patterns where appropriate.

### Demo Data Cleanup

Command:

```text
npm run api:db:clean-demo
```

Current cleanup behavior:

- keeps the initial system admin account
- deletes every other user account
- clears requests, tasks, task updates, comments, and sprints
- removes seeded/user-linked audit-log records
- keeps roles and permissions

Latest Atlas cleanup result:

```text
users: 24 -> 1
requests: 6 -> 0
tasks: 9 -> 0
task_updates: 12 -> 0
comments: 8 -> 0
sprints: 0 -> 0
```

## 15. Frontend Pages

Implemented browser routes:

```text
/login
/
/dashboard
/sprints
/sprints/:areaKey
/sprint-items
/users
*
```

Route behavior:

- `/` redirects to `/dashboard`
- `*` redirects to `/dashboard`
- protected routes require an authenticated session
- unauthenticated users are redirected to `/login`

### Login Page

Implemented file:

```text
apps/web/src/features/auth/LoginPage.tsx
```

Features:

- email/password login
- English/Arabic language switch
- Harouge logo
- IT operations background image
- white overlay style
- connects to `POST /api/auth/login`
- uses session context after login
- redirects authenticated users to `/dashboard`

### Dashboard Shell

Implemented file:

```text
apps/web/src/features/dashboard/DashboardShell.tsx
```

Features:

- shared application layout for dashboard and users page
- sidebar navigation
- collapsible sidebar with icon-only mode
- top search field
- current date display
- account button
- dropdown with language switch and sign out
- English/Arabic layout support
- RTL mirroring for Arabic
- Harouge logo
- internal-use footer
- responsive layout rules

Visible nav items:

- Dashboard
- Sprints
- Sprint Items
- Team
- Roles
- Permissions
- Audit Logs
- Reports

Dashboard, Sprints, Sprint Items, and Team are routed at the frontend right now.
The Team route is still implemented at `/users` internally.

### Dashboard Page

Implemented file:

```text
apps/web/src/features/dashboard/DashboardContent.tsx
```

Data source:

```text
GET /api/dashboard/overview
```

Current dashboard summary cards:

- none

Removed from summary cards by user request:

- Open Sprint Items
- Active Sprint Items
- Team Members
- Pending Review
- Overdue Tasks

Current dashboard panels:

- Sprint Areas
- Sprint Focus
- Current Sprint Work
- Team Workload
- Recent Sprint Items
- Recent Activity

Dashboard values are real API data from MongoDB, not hard-coded static values.
The three Sprint Area cards are calculated in the frontend from the existing
task report API while the backend still stores sprint item data in `tasks`.
Sprint Areas are the first dashboard content block under the welcome/actions
area, and each area shows:

- latest five sprint items
- item state and progress
- View more navigation to `/sprints/:areaKey`

Item state is derived from the current task data as Done, Cancelled, Delayed,
Blocked, or In Progress.

### Sprints Page

Implemented file:

```text
apps/web/src/features/dashboard/SprintsContent.tsx
```

Data sources:

```text
GET  /api/sprints
POST /api/sprints
GET  /api/reports/tasks
GET  /api/users
```

Current behavior:

- displays the three calculated sprint areas from existing sprint-item/task
  data
- displays MongoDB-backed sprint records created through the Create Sprint
  modal
- Create Sprint opens a modal and writes to MongoDB through `POST /api/sprints`
- Sprint form supports owner, status, dates, progress target, sprint area,
  description, active flag, and notify-later flag
- sprint list metrics include both calculated sprint areas and stored sprint
  records

### Sprint Area Detail Page

Implemented file:

```text
apps/web/src/features/dashboard/SprintAreaContent.tsx
```

Current sprint area routes:

```text
/sprints/development
/sprints/facility
/sprints/infrastructure
```

The detail page uses the existing task report API and displays all sprint items
for the selected area with ID, Sprint Item, Owner, State, Progress, and Updated.

### Sprint Items Page

Implemented file:

```text
apps/web/src/features/dashboard/SprintItemsContent.tsx
```

Route:

```text
/sprint-items
```

Data source:

```text
GET /api/reports/tasks
```

The page presents existing task report rows as Sprint Items while the backend
still stores them in `tasks`. It includes:

- summary cards for total, completed, in progress, review, and blocked sprint
  items
- page actions for export, filters, and new sprint item, UI only at this stage
- filter toolbar for status, priority, assignee, sprint area, due date range,
  and search
- sprint item table with ID, title, sprint area, assignee, priority, status,
  due date, updated date, and actions
- client-side filtering and pagination over the loaded task report rows

### Team Page

Implemented file:

```text
apps/web/src/features/users/UsersContent.tsx
```

Data sources:

```text
GET /api/users
GET /api/roles
```

Current users summary cards:

- Total Team Members
- Active Team Members
- Inactive Team Members
- Administrators

Metric rules in the frontend:

- Total Users uses all users count.
- Active Users uses users with `status=active`.
- Inactive Users combines inactive and suspended counts.
- Administrators counts users with role `super_admin` or `it_manager`.

Current team table columns:

- Team Member
- Email
- Department
- Role
- Status
- Last Login
- Actions

The row-selection checkbox column has been removed.

Current users page controls:

- Create Team Member button opens a real create-user modal
- role filter
- status filter
- search by name, email, or department
- filter button
- sort buttons for supported columns
- row edit/action icon buttons open a manage-user modal
- manage-user modal supports role assignment, status change, and admin password reset
- pagination

## 16. Frontend API Client

Implemented file:

```text
apps/web/src/api/client.ts
```

Currently used frontend API methods:

- `getSession`
- `login`
- `logout`
- `getDashboardOverview`
- `getTaskReport`
- `getSprints`
- `createSprint`
- `getRoles`
- `getUsers`
- `createUser`
- `assignUserRole`
- `updateUserStatus`
- `resetUserPassword`

Client behavior:

- sends `credentials: include`
- sends `Accept-Language` from stored UI language
- fetches CSRF token for unsafe authenticated requests
- sends `x-csrf-token` by default for unsafe authenticated requests
- maps API failures into `ApiError`

## 17. Internationalization

Implemented files:

```text
apps/web/src/i18n/index.tsx
apps/web/src/i18n/locale.ts
apps/web/src/i18n/messages.ts
```

Supported languages:

```text
en
ar
```

Language storage key:

```text
itdcc.ui.language
```

Language behavior:

- English uses `ltr`
- Arabic uses `rtl`
- document `lang` and `dir` are updated by the i18n provider
- language switch exists on login page
- language switch exists in the dashboard user dropdown
- Arabic layout mirrors the English layout

## 18. Visual Assets

Frontend public assets:

```text
apps/web/public/harouge-logo.svg
apps/web/public/background.png
apps/web/public/login-background.png
```

Current UI style:

- Harouge-branded sidebar
- IT operations background image
- white translucent overlay treatment
- blue primary action/nav style
- red accent on sign-in page after recent color adjustment
- lucide-react icons
- responsive dashboard and users layouts

## 19. Business Rules Implemented

Implemented:

- no public registration
- admin-created users
- role/permission authorization from the start
- failed-login account lock
- first-login password change enforcement
- request closure blocked when linked tasks remain active
- task progress/status changes create task update history
- blocked tasks require a blocked reason
- completed tasks require 100 percent progress
- sprint creation writes to MongoDB and records an audit log
- important actions write audit logs
- dashboard totals come from backend calculations
- closed records are still editable by Super Admin and IT Manager according to
  approved owner decision
- no task no-update rule in MVP

## 20. Testing And Verification State

Recently verified during frontend work:

```text
npm run api:typecheck
npm run api:build
npm run api:test:typecheck
npm run api:test
npm run web:typecheck
npm run web:build
```

The Vite build currently reports a chunk-size warning for the main JS bundle.
That is a warning, not a build failure.

Atlas setup has been run and verified from an allowlisted machine/IP after
adding `sprints`.

## 21. Known Current Gaps

Frontend gaps:

- Sprints overview/list page exists, but update/delete/status workflows are not
  implemented yet.
- Sprint Items page exists, but export, due date picker, create item, view row,
  and row action workflows are UI only at this stage.
- Roles page is not implemented yet.
- Permissions page is not implemented yet.
- Audit Logs page is not implemented yet.
- Reports page is not implemented yet.
- Dashboard quick actions are visual buttons only at this stage.
- Top search input is visual only at this stage.
- Password-change UI is not implemented in the frontend yet.

Backend gaps:

- Sprints API currently supports list/create/get; update/delete/status endpoints
  are not implemented yet.
- Request/task report APIs exist, but frontend report pages do not.
- CSV/Excel export is not implemented.
- Saved report presets are not implemented.
- Dedicated workload report endpoint is not implemented.
- Attachments are not implemented and are outside current scope.
- Notifications are not implemented and are outside current scope.

Deployment/operations gaps:

- Production Atlas environment is not configured in this repo.
- Production backup/restore policy must be configured in Atlas by admins.
- Production monitoring/alerting is not implemented in this repo.
- Production deployment automation is not implemented.
- Credential rotation process is not automated.

## 22. Recommended Next Implementation Order

Recommended next frontend stages:

1. Sprints update/status/delete and dedicated stored-sprint detail screens.
2. Sprint Items list/detail/create/update/reassign/progress/status screens.
3. Team create/edit/status/role/reset-password workflows.
4. Roles and permissions management screens.
5. Audit logs screen.
6. Reports screens for request and task reports.
7. Password-change-required screen.
8. Production deployment and operational hardening.

Keep all future work inside the nine approved entities unless the owner
approves a scope change.
