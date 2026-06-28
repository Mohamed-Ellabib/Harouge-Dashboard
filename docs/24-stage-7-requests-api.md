# Stage 7: IT Requests API

Status: completed.

This stage implemented the IT request workflow API and request-only comments.

## Implemented Request API

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

## Request Behavior

- request list supports pagination, search, status, type, priority, requester, assignee, department, created-date, and required-date filters
- request list is filtered by row-level visibility for non-admin users
- request detail enforces row-level visibility
- create request sets `requestedBy` from the authenticated user
- create request starts with status `submitted`
- request codes use `REQ-YYYYMMDD-######`
- request-code generation checks for collisions before create
- request update changes request metadata only
- status changes are isolated behind `requests:change_status`
- assignment is isolated behind `requests:assign`
- assignment validates the assigned user exists and is active
- assigning a `draft` or `submitted` request moves it to `assigned`
- setting status `closed` sets `closedAt`
- moving a closed request away from `closed` clears `closedAt`

## Request Visibility

Super Admin and IT Manager can view all requests.

Supervisor can view requests they created, requests assigned to them, and requests in their own department when `requestedForDepartment` matches their user department.

Employee can view requests they created and requests assigned to them.

## Status Transitions

```text
draft       -> submitted, cancelled
submitted   -> assigned, rejected, cancelled
assigned    -> in_progress, completed, rejected, cancelled, closed
in_progress -> completed, rejected, cancelled
completed   -> in_progress, closed
rejected    -> closed
cancelled   -> closed
closed      -> assigned, in_progress, completed, rejected, cancelled
```

The statuses `assigned`, `in_progress`, and `completed` require an assigned user.

## Closed Request Rule

Closed requests can only be edited by:

- Super Admin
- IT Manager

This rule applies to:

- request update
- request status change
- request assignment
- adding request comments

## Request Comments

Comments remain request-only for MVP.

Implemented:

- list request comments
- create request comment
- internal comment flag
- comment audit logging
- internal comments are visible only to Super Admin and IT Manager
- internal comments can be created only by Super Admin and IT Manager

No task comment endpoints were created.

## Route Protection

Routes are protected with permission middleware:

```text
requests:view
requests:create
requests:update
requests:change_status
requests:assign
requests:comment
comments:view
comments:create
```

Super Admin bypass applies to permission checks.

## Audit Logging

Implemented audit events:

- request create
- request update
- request status change
- request assignment
- request comment creation

## Source Files

```text
apps/api/src/modules/it-requests/request.routes.ts
apps/api/src/modules/it-requests/request.controller.ts
apps/api/src/modules/it-requests/request.service.ts
apps/api/src/modules/it-requests/request.validation.ts
apps/api/src/modules/it-requests/request.dto.ts
apps/api/src/modules/it-requests/request-code.ts
apps/api/src/modules/comments/comment.validation.ts
apps/api/src/modules/comments/comment.dto.ts
```

## Verification

Completed checks:

```text
npm run api:build
npm run api:typecheck
```

Smoke check:

- called `GET /api/requests` without a session cookie
- called `GET /api/requests/:id/comments` without a session cookie
- confirmed both return `401 authentication_required`

The full create/update/list/comment flows still need verification against a real MongoDB database with seeded roles, permissions, and a Super Admin user.

## Next Stage

The next recommended stage is the tasks and task updates API:

- create task
- list tasks
- update task
- assign/reassign task
- change task status
- update task progress
- immutable task update history
