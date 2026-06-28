# API Map

Use REST API for the first version.

This is the planned business API. Health, auth, roles, permissions, users,
requests, request comments, tasks, task updates, direct comment endpoints,
audit logs, dashboard summary/activity, and request/task reports are
implemented. The active data direction is MongoDB Atlas with Mongoose strict
schemas mapped to the current SQL scope.

## Auth

```text
GET    /api/auth/csrf
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me
POST   /api/auth/change-password
```

Authentication uses local email/password with HTTP-only cookie sessions. There is no public registration endpoint.

Implemented auth behavior:

- `POST /api/auth/login` sets the HTTP-only session cookie
- `GET /api/auth/csrf` issues a signed CSRF token
- unsafe authenticated requests require the CSRF token header
- `POST /api/auth/logout` clears the session cookie
- `GET /api/auth/me` returns the current authenticated user
- `POST /api/auth/change-password` updates the password, clears first-login password-change requirement, and rotates the session cookie

## Roles

```text
GET    /api/roles
POST   /api/roles
GET    /api/roles/:id
PATCH  /api/roles/:id
```

## Permissions

```text
GET    /api/permissions
POST   /api/permissions
GET    /api/permissions/:id
PATCH  /api/permissions/:id
GET    /api/roles/:id/permissions
```

## Users

```text
GET    /api/users
POST   /api/users
GET    /api/users/:id
PATCH  /api/users/:id
PATCH  /api/users/:id/status
PATCH  /api/users/:id/role
PATCH  /api/users/:id/password
```

## IT Requests

```text
GET    /api/requests
POST   /api/requests
GET    /api/requests/:id
PATCH  /api/requests/:id
PATCH  /api/requests/:id/status
PATCH  /api/requests/:id/assign
GET    /api/requests/:id/comments
POST   /api/requests/:id/comments
```

## Tasks

```text
GET    /api/tasks
POST   /api/tasks
GET    /api/tasks/:id
PATCH  /api/tasks/:id
PATCH  /api/tasks/:id/status
POST   /api/tasks/:id/progress
POST   /api/tasks/:id/reassign
GET    /api/tasks/:id/updates
```

Implemented task behavior:

- task list and detail enforce row-level visibility
- progress and status changes create immutable `task_updates`
- completed and cancelled tasks are locked to Super Admin and IT Manager
- blocked tasks require a blocked reason
- waiting-review and completed tasks require progress `100`

## Comments

```text
GET    /api/comments/:id
PATCH  /api/comments/:id
```

Comment deletion is not planned for MVP.

Comments are request-only for MVP. Do not create task comment endpoints.

Implemented comment behavior:

- direct comment view enforces parent request visibility
- internal comments are visible only to Super Admin and IT Manager
- direct comment edit is protected by `comments:update`
- comment updates write audit logs

## Dashboard

```text
GET    /api/dashboard/summary
GET    /api/dashboard/activity
```

Implemented dashboard behavior:

- one role-aware summary endpoint instead of separate admin/manager/employee
  endpoints
- request and task counts are calculated by MongoDB
- dashboard values enforce existing row-level request/task visibility
- activity returns recent task updates and request comments

## Reports

```text
GET    /api/reports/requests
GET    /api/reports/tasks
```

Implemented report behavior:

- request and task reports support pagination, search, filtering, and sorting
- report rows include display references for related users and linked requests
- report data enforces existing row-level request/task visibility
- audit reporting is covered by `/api/audit-logs`
- user workload reporting is still future work

## Audit Logs

```text
GET    /api/audit-logs
GET    /api/audit-logs/:id
```

Implemented audit behavior:

- audit list supports pagination and filters
- audit detail returns old/new values
- audit APIs are read-only
- audit access is limited to Super Admin and IT Manager

## Cancelled Endpoints

Do not create endpoints for:

- Purchases / MR
- Products
- Assets
- Suppliers
- Attachments
- Notifications
- Settings
