# Stage 8: Tasks And Task Updates API

Status: completed.

This stage implemented task assignment, progress tracking, status control, and immutable task update history.

## Implemented Task API

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

## Task Behavior

- task list supports pagination, search, status, category, priority, request, creator, assignee, created-date, due-date, and overdue filters
- task list is filtered by row-level visibility for non-admin users
- task detail enforces row-level visibility
- task codes use `TASK-YYYYMMDD-######`
- create task starts with status `open` and progress `0`
- create task writes the first `task_updates` history record
- task metadata update does not change assignee, status, or progress
- reassignment is isolated behind `tasks:assign`
- progress updates are isolated behind task update permissions
- progress updates create immutable `task_updates` records
- status changes create immutable `task_updates` records
- progress above `0` moves an `open` task to `in_progress`
- empty progress updates are rejected unless they include a note

## Task Visibility

Super Admin and IT Manager can view all tasks.

Supervisor can view tasks they created, tasks assigned to them, and tasks linked to requests they can view.

Employee can view tasks assigned to them, tasks they created, and tasks linked to requests they can view.

## Task Mutation Policy

Super Admin and IT Manager can update, reassign, change status, review, and update progress on all tasks.

Supervisor can update, reassign, change status, review, and update progress on visible non-terminal tasks.

Employee can update progress and change status only on tasks assigned to them. Employee cannot update task metadata, reassign tasks, cancel tasks, or mark tasks completed.

Completed and cancelled tasks can only be changed by Super Admin and IT Manager.

## Status Transitions

```text
open           -> in_progress, blocked, cancelled
in_progress    -> blocked, waiting_review, completed, cancelled
blocked        -> in_progress, waiting_review, cancelled
waiting_review -> in_progress, completed, blocked, cancelled
completed      -> in_progress, cancelled
cancelled      -> open, in_progress
```

Additional rules:

- `blocked` requires `blockedReason`
- `waiting_review` requires progress `100`
- `completed` requires progress `100`
- `completed` sets `completedAt` and `reviewedBy`
- moving away from `completed` clears `completedAt` and `reviewedBy`
- `in_progress` sets `startDate` when missing

## Task Updates

`task_updates` are append-only through the current API.

History records include:

- `taskId`
- `previousStatus`
- `newStatus`
- `previousProgress`
- `newProgress`
- `note`
- `updatedBy`
- `createdAt`

No update or delete endpoints were created for task updates.

## Route Protection

Routes are protected with permission middleware:

```text
tasks:view
tasks:create
tasks:update
tasks:change_status
tasks:assign
tasks:review
task_updates:view
task_updates:create
```

Super Admin bypass applies to permission checks.

## Audit Logging

Implemented audit events:

- task create
- task metadata update
- task reassignment
- task status change
- task review/completion
- task progress update
- task update history creation

## Source Files

```text
apps/api/src/modules/tasks/task.routes.ts
apps/api/src/modules/tasks/task.controller.ts
apps/api/src/modules/tasks/task.service.ts
apps/api/src/modules/tasks/task.validation.ts
apps/api/src/modules/tasks/task.dto.ts
apps/api/src/modules/tasks/task-code.ts
apps/api/src/modules/task-updates/task-update.dto.ts
apps/api/src/shared/auth/access-policies.ts
```

## Verification

Completed checks:

```text
npm run api:build
npm run api:typecheck
```

Smoke check:

- called `GET /api/tasks` without a session cookie
- called `GET /api/tasks/:id/updates` without a session cookie
- confirmed both return `401 authentication_required`

The full create/reassign/progress/status flow still needs verification against a real MongoDB database with seeded roles, permissions, requests, and users.

## Next Stage

The next recommended stage is the comments module:

- view comment by ID
- edit comment if policy allows
- enforce internal comment visibility for direct comment routes
