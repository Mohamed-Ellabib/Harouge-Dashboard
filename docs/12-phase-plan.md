# Phase Plan

This is the short phase overview. Use `docs/17-implementation-roadmap.md` for the detailed implementation route, stage gates, verification steps, and frontend/backend sequencing.

Current detailed roadmap status:

- Stage 1 Backend Foundation: completed
- Stage 2 Shared Backend Infrastructure: completed
- Stage 3 MongoDB Models: completed
- Stage 4 Seed Data: completed
- Stage 5 Authentication And Authorization: completed
- Stage 6 Roles, Permissions, And Users Module: completed
- Stage 7 Requests Module: completed
- Stage 7.5 Enterprise Hardening Gate: completed
- Stage 8 Tasks And Task Updates Module: completed
- Stage 9 Comments Module: completed
- Stage 10 Audit Logs Module: completed
- Stage 11 Dashboard And Reports API: next

## Stage 0: Planning And Architecture

Deliverables:

- Project charter
- Scope document
- Role matrix
- Workflow definitions
- MongoDB collection model for current schema entities
- API list
- UI page map
- Permission rules

Acceptance gate:

- No coding until workflows and the MongoDB collection model are approved.

## Stage 1: Backend Foundation

Status: completed.

Build:

- Node.js server
- Express setup
- MongoDB Atlas connection
- Mongoose setup
- Environment config
- Global error handling
- Response format
- Basic health check API

Acceptance gate:

- Server runs
- MongoDB connects
- Errors return clean responses
- Environment variables work

## Stage 2: Authentication, Roles, Permissions, And Users

Status note: shared backend infrastructure has started separately in `docs/19-stage-2-shared-infrastructure.md`.

Build:

- Login
- Logout
- Current user endpoint
- Password hashing
- Password change
- HTTP-only cookie sessions
- Create users
- Disable users
- Role management
- Permission management
- Role middleware

Acceptance gate:

- Admin can create users
- Admin can assign roles
- Admin can manage permissions
- Employee can log in
- Disabled user cannot log in
- Employee cannot access admin APIs

## Stage 3: IT Request Module

Build:

- Create request
- View requests
- Update request status
- Assign request
- Add request comments

Acceptance gate:

- Request history is preserved through audit logs
- Status changes are logged
- Only authorized users can update requests

## Stage 4: Task Module

Status: completed in detailed roadmap Stage 8.

Build:

- Create task
- Assign employee
- Update status
- Update progress
- Task update history
- Task filters

Acceptance gate:

- Employee sees own tasks
- Manager sees all or team tasks
- Progress history is saved in `task_updates`
- Blocked task requires reason
- Overdue task is detected

## Stage 5: Dashboard And Reports

Build:

- Admin dashboard
- Employee dashboard
- Manager dashboard
- Request report
- Task report
- User workload report
- Audit log report

Acceptance gate:

- Dashboard numbers match MongoDB records
- No fake static data
- Role-based dashboard works
- Reports use only current-scope data

## Stage 6: Audit, Hardening, And Deployment

Build:

- Audit log coverage
- Validation hardening
- Security headers
- Rate limiting
- Backup plan
- Deployment guide
- Seed admin account

Acceptance gate:

- Unauthorized access is blocked
- Invalid data is rejected
- Critical actions are audited
- System can be deployed cleanly
