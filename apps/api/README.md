# API Application

Backend API for the Task & Requests Control System.

Planned stack:

- Node.js
- Express
- TypeScript
- MongoDB Atlas
- Mongoose with strict schemas, validation, and indexes
- Local email/password authentication
- bcrypt password hashing
- HTTP-only cookie sessions
- Zod or Joi validation
- Helmet
- rate limiting

Stage 11 initial API work is complete with the API foundation, MongoDB
connection management, global middleware, health endpoint, shared backend
infrastructure, strict Mongoose models for the eight approved collections,
repeat-safe seed data, local cookie-based authentication, access-management
APIs, IT request APIs, CSRF protection, row-level request/task visibility,
revocable session versions, strict audit writes, task APIs, immutable task
update history, direct comment APIs, read-only audit log APIs, dashboard
summary/activity/overview APIs, and request/task report APIs.

## Scripts

```text
npm run dev --workspace @itdcc/api
npm run build --workspace @itdcc/api
npm run db:check --workspace @itdcc/api
npm run db:indexes --workspace @itdcc/api
npm run db:setup --workspace @itdcc/api
npm run seed --workspace @itdcc/api
npm run seed:development --workspace @itdcc/api
npm run start --workspace @itdcc/api
npm run test --workspace @itdcc/api
npm run typecheck:tests --workspace @itdcc/api
npm run typecheck --workspace @itdcc/api
```

## Health Endpoint

```text
GET /api/health
```

The health response includes API status, environment, uptime, and MongoDB connection status.

## Auth Endpoints

```text
GET  /api/auth/csrf
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
POST /api/auth/change-password
```

Authentication uses an HTTP-only signed cookie. There is no public registration endpoint.

Unsafe authenticated requests require the CSRF header configured by `CSRF_HEADER_NAME`, default `x-csrf-token`.

## Access Management Endpoints

```text
GET   /api/roles
POST  /api/roles
GET   /api/roles/:id
PATCH /api/roles/:id
GET   /api/roles/:id/permissions

GET   /api/permissions
POST  /api/permissions
GET   /api/permissions/:id
PATCH /api/permissions/:id

GET   /api/users
POST  /api/users
GET   /api/users/:id
PATCH /api/users/:id
PATCH /api/users/:id/status
PATCH /api/users/:id/role
PATCH /api/users/:id/password
```

## Request Endpoints

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

## Task Endpoints

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

## Comment Endpoints

```text
GET   /api/comments/:id
PATCH /api/comments/:id
```

## Audit Log Endpoints

```text
GET /api/audit-logs
GET /api/audit-logs/:id
```

## Dashboard Endpoints

```text
GET /api/dashboard/overview
GET /api/dashboard/summary
GET /api/dashboard/activity
```

## Report Endpoints

```text
GET /api/reports/requests
GET /api/reports/tasks
```

## Active Source Layout

```text
src/
  config/
  database/
  modules/
    health/
    auth/
    roles/
    permissions/
    users/
    it-requests/
    tasks/
    task-updates/
    comments/
    dashboard/
    reports/
    audit-logs/
  middleware/
  routes/
  shared/
    auth/
    audit/
    constants/
    controllers/
    database/
    errors/
    http/
    logger/
    modules/
    pagination/
    repositories/
    services/
    validation/
  utils/
  validators/
```

The current data-backed modules are roles, permissions, users, requests, tasks, task updates, comments, and audit logs.

## Seed Command

```text
npm run seed --workspace @itdcc/api
```

Set `INITIAL_ADMIN_EMAIL`, `INITIAL_ADMIN_FULL_NAME`, and `INITIAL_ADMIN_PASSWORD` together to create the first Super Admin. If those values are missing, the seed creates roles and permissions only.

For realistic fictional development records, configure the three
`DEVELOPMENT_*_PASSWORD` values and run:

```text
npm run seed:development --workspace @itdcc/api
```

This command is repeat-safe, preserves changed account passwords, and refuses to
run in production. See `docs/31-development-data-seed.md`.

## MongoDB Setup

Runtime automatic index creation is disabled by default. After configuring the
root `.env`, use:

```text
npm run db:check --workspace @itdcc/api
npm run db:setup --workspace @itdcc/api
```

The setup command pings MongoDB, provisions declared indexes, and runs the
repeat-safe seeds. See `docs/30-mongodb-atlas-setup.md` for Atlas configuration.
