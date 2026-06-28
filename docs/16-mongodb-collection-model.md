# MongoDB Collection Model

This document is the implementation-facing MongoDB blueprint.

## Scope Rule

MongoDB is the planned database technology, but the current business scope is limited to the supplied SQL file.

Create only these collections for the current system:

```text
roles
permissions
users
requests
tasks
task_updates
comments
audit_logs
```

Do not create collections for purchases, products, assets, suppliers, attachments, notifications, or settings unless the project owner approves a later scope change.

## Naming Rules

- Collection names use lowercase plural names.
- API field names use camelCase.
- Database fields should also use camelCase for consistency with Node.js and Mongoose.
- SQL `id` maps to MongoDB `_id`.
- Public codes such as `requestCode` and `taskCode` are separate from MongoDB `_id` values.
- Use ObjectId references for relationships.
- Use timestamps where the source schema includes timestamp fields.

## Approved Status Sets

Approved values:

```text
user.status: active, inactive, suspended
request.status: draft, submitted, assigned, in_progress, completed, rejected, cancelled, closed
task.status: open, in_progress, blocked, waiting_review, completed, cancelled
```

## Approved Roles

```text
super_admin
it_manager
supervisor
employee
```

## Approved Authentication Policy

```text
failedLoginAttemptsBeforeLock: 5
lockDurationMinutes: 15
forcePasswordChangeOnFirstLogin: true
```

## Approved Priority Values

```text
low
medium
high
urgent
```

## Approved Request Types

```text
support
access
hardware
software
network
server
other
```

## Approved Task Categories

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

## Closed Record Rule

Closed requests and tasks can be edited by Super Admin and IT Manager.

## No-Update Rule

No-update task alerts are not part of MVP.

## Role Document Shape

```text
roles
  _id
  name
  displayName
  description
  isSystem
  createdAt
  updatedAt
```

## Permission Document Shape

```text
permissions
  _id
  roleId
  name
  displayName
  module
  description
  createdAt
  updatedAt
```

## User Document Shape

```text
users
  _id
  authUserId
  fullName
  email
  passwordHash
  passwordChangedAt
  mustChangePassword
  failedLoginCount
  lockedUntil
  roleId
  jobTitle
  department
  phone
  status
  lastLoginAt
  createdAt
  updatedAt
```

## Request Document Shape

```text
requests
  _id
  requestCode
  title
  description
  type
  priority
  status
  requestedBy
  requestedForDepartment
  assignedTo
  requiredDate
  closedAt
  createdAt
  updatedAt
```

## Task Document Shape

```text
tasks
  _id
  taskCode
  title
  description
  category
  priority
  status
  progress
  assignedTo
  createdBy
  reviewedBy
  requestId
  startDate
  dueDate
  completedAt
  blockedReason
  lastProgressUpdateAt
  createdAt
  updatedAt
```

## Task Update Document Shape

```text
task_updates
  _id
  taskId
  updatedBy
  previousStatus
  newStatus
  previousProgress
  newProgress
  note
  createdAt
```

## Comment Document Shape

```text
comments
  _id
  requestId
  body
  isInternal
  createdBy
  createdAt
```

Comments are request-only for MVP. The SQL source includes `task_id`, but `taskId` should not be used unless task comments are approved later.

## Audit Log Document Shape

```text
audit_logs
  _id
  actorId
  action
  entityType
  entityId
  oldValue
  newValue
  ipAddress
  userAgent
  createdAt
```

## Index Plan

Create these indexes when implementation starts:

```text
roles.name unique
permissions.roleId + permissions.name unique
permissions.module
users.email unique
users.authUserId unique sparse
users.roleId
users.status
users.department
requests.requestCode unique
requests.status
requests.status + requests.createdAt
requests.priority
requests.type
requests.requestedBy
requests.assignedTo
requests.requiredDate
tasks.taskCode unique
tasks.requestId
tasks.assignedTo + tasks.status
tasks.status
tasks.status + tasks.dueDate
tasks.category
tasks.priority
tasks.dueDate
tasks.lastProgressUpdateAt
task_updates.taskId + task_updates.createdAt
task_updates.updatedBy
comments.requestId + comments.createdAt
comments.createdBy
audit_logs.entityType + audit_logs.entityId + audit_logs.createdAt
audit_logs.actorId + audit_logs.createdAt
audit_logs.action
```

## Validation Rules

Required validation before implementation:

- User password must be hashed before storage.
- `passwordHash` must never be returned in API responses.
- Inactive users cannot log in.
- Progress must be between 0 and 100.
- Completed tasks must have progress `100`.
- Blocked tasks must have `blockedReason`.
- `task_updates` must always reference a task.
- Comments must reference a request.
- Audit logs must include `action` and `entityType`.

## Dashboard Query Requirements

The collection model must support:

- Open requests
- Requests by status
- Active tasks by employee
- Overdue tasks
- Blocked tasks
- Tasks waiting review
- Recent task updates
- Recent audit activity
- Employee workload

These dashboard values must be calculated by the backend, not guessed in the frontend.
