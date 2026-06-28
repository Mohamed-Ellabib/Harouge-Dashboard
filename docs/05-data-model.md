# Data Model

## Authority

`database/schema.sql` defines the current business scope.

MongoDB Atlas is the planned implementation database, but current MongoDB collections must map to the eight entities in the SQL file.

Decision records:

- `docs/decisions/0003-mongodb-primary-database.md`
- `docs/decisions/0004-current-scope-from-sql-schema.md`

## Current Collections

| SQL table | MongoDB collection | Purpose |
| --- | --- | --- |
| `roles` | `roles` | System roles |
| `permissions` | `permissions` | Permission definitions assigned to roles |
| `users` | `users` | Employee/user profile linked to a role |
| `requests` | `requests` | IT department requests |
| `tasks` | `tasks` | Assigned work and current progress |
| `task_updates` | `task_updates` | Immutable task status/progress history |
| `comments` | `comments` | Comments attached to requests for MVP |
| `audit_logs` | `audit_logs` | Protected action history |

## Cancelled Collections

Do not create these collections for the current system:

- `purchases`
- `products`
- `assets`
- `suppliers`
- `attachments`
- `notifications`
- `settings`

## Approved Values

### Roles

- `super_admin`
- `it_manager`
- `supervisor`
- `employee`

### `user.status`

- `active`
- `inactive`
- `suspended`

### `request.status`

- `draft`
- `submitted`
- `assigned`
- `in_progress`
- `completed`
- `rejected`
- `cancelled`
- `closed`

### `task.status`

- `open`
- `in_progress`
- `blocked`
- `waiting_review`
- `completed`
- `cancelled`

### `priority`

- `low`
- `medium`
- `high`
- `urgent`

### `request.type`

- `support`
- `access`
- `hardware`
- `software`
- `network`
- `server`
- `other`

### `task.category`

- `support`
- `network`
- `server`
- `software`
- `hardware`
- `access`
- `maintenance`
- `other`

### Authentication Policy

- Failed login lock: 5 failed attempts.
- Lock duration: 15 minutes.
- First login password change: required.

### Comments

Comments are assigned to requests only for MVP. `comments.taskId` is reserved from the source schema but unused for now.

### Closed Record Editing

Closed requests and tasks can be edited by Super Admin and IT Manager.

### No-Update Rule

No-update task alerts are not part of MVP.

## MongoDB Mapping Rules

- SQL `id` maps to MongoDB `_id`.
- SQL snake_case fields map to camelCase application fields.
- SQL `uuid` references map to MongoDB ObjectId references.
- SQL `timestamp` and `date` map to JavaScript `Date` values.
- SQL `jsonb` maps to a controlled object field.
- Use Mongoose strict schemas for every collection.
- Do not add fields that are not in the current schema unless approved.

## Collection Fields

### `roles`

Source fields:

- `id`
- `name`
- `display_name`
- `description`
- `is_system`
- `created_at`
- `updated_at`

MongoDB fields:

- `_id`
- `name`
- `displayName`
- `description`
- `isSystem`
- `createdAt`
- `updatedAt`

Indexes:

- Unique `name`

### `permissions`

Source fields:

- `id`
- `role_id`
- `name`
- `display_name`
- `module`
- `description`
- `created_at`
- `updated_at`

MongoDB fields:

- `_id`
- `roleId`
- `name`
- `displayName`
- `module`
- `description`
- `createdAt`
- `updatedAt`

Indexes:

- Compound unique `roleId + name`
- `module`

### `users`

Source fields:

- `id`
- `auth_user_id`
- `full_name`
- `email`
- `role_id`
- `job_title`
- `department`
- `phone`
- `status`
- `last_login_at`
- `created_at`
- `updated_at`

MongoDB fields:

- `_id`
- `authUserId`
- `fullName`
- `email`
- `passwordHash`
- `passwordChangedAt`
- `mustChangePassword`
- `failedLoginCount`
- `lockedUntil`
- `roleId`
- `jobTitle`
- `department`
- `phone`
- `status`
- `lastLoginAt`
- `createdAt`
- `updatedAt`

Indexes:

- Unique `email`
- Unique sparse `authUserId`
- `roleId`
- `status`
- `department`

Authentication decision: local email/password. The password fields are an approved auth-only extension to the existing `users` collection. They do not create a new business entity. `authUserId` is not used for MVP local auth and can remain empty.

### `requests`

Source fields:

- `id`
- `request_code`
- `title`
- `description`
- `type`
- `priority`
- `status`
- `requested_by`
- `requested_for_department`
- `assigned_to`
- `required_date`
- `closed_at`
- `created_at`
- `updated_at`

MongoDB fields:

- `_id`
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

- Unique `requestCode`
- `status`
- Compound `status + createdAt`
- `priority`
- `type`
- `requestedBy`
- `assignedTo`
- `requiredDate`

### `tasks`

Source fields:

- `id`
- `task_code`
- `title`
- `description`
- `category`
- `priority`
- `status`
- `progress`
- `assigned_to`
- `created_by`
- `reviewed_by`
- `request_id`
- `start_date`
- `due_date`
- `completed_at`
- `blocked_reason`
- `last_progress_update_at`
- `created_at`
- `updated_at`

MongoDB fields:

- `_id`
- `taskCode`
- `title`
- `description`
- `category`
- `priority`
- `status`
- `progress`
- `assignedTo`
- `createdBy`
- `reviewedBy`
- `requestId`
- `startDate`
- `dueDate`
- `completedAt`
- `blockedReason`
- `lastProgressUpdateAt`
- `createdAt`
- `updatedAt`

Indexes:

- Unique `taskCode`
- `requestId`
- `assignedTo`
- Compound `assignedTo + status`
- `status`
- Compound `status + dueDate`
- `category`
- `priority`
- `dueDate`
- `lastProgressUpdateAt`

### `task_updates`

Source fields:

- `id`
- `task_id`
- `updated_by`
- `previous_status`
- `new_status`
- `previous_progress`
- `new_progress`
- `note`
- `created_at`

MongoDB fields:

- `_id`
- `taskId`
- `updatedBy`
- `previousStatus`
- `newStatus`
- `previousProgress`
- `newProgress`
- `note`
- `createdAt`

Indexes:

- Compound `taskId + createdAt`
- `updatedBy`

### `comments`

Source fields:

- `id`
- `request_id`
- `task_id`
- `body`
- `is_internal`
- `created_by`
- `created_at`

MongoDB fields:

- `_id`
- `requestId`
- `body`
- `isInternal`
- `createdBy`
- `createdAt`

Indexes:

- Compound `requestId + createdAt`
- `createdBy`

### `audit_logs`

Source fields:

- `id`
- `actor_id`
- `action`
- `entity_type`
- `entity_id`
- `old_value`
- `new_value`
- `ip_address`
- `user_agent`
- `created_at`

MongoDB fields:

- `_id`
- `actorId`
- `action`
- `entityType`
- `entityId`
- `oldValue`
- `newValue`
- `ipAddress`
- `userAgent`
- `createdAt`

Indexes:

- Compound `entityType + entityId + createdAt`
- Compound `actorId + createdAt`
- `action`

## Relationship Summary

```text
roles 1 -> many permissions
roles 1 -> many users
users 1 -> many requests (requestedBy)
users 1 -> many requests (assignedTo)
requests 1 -> many tasks
users 1 -> many tasks (assignedTo / createdBy / reviewedBy)
tasks 1 -> many task_updates
requests 1 -> many comments
users 1 -> many comments
users 1 -> many audit_logs (actorId)
```

## Readiness Notes

The current schema does not define:

- Soft-delete/archive fields
- Default timestamp rules
- Whether task comments should be enabled later
- External authentication provider ownership for `authUserId`; this field is not used in MVP

These are open design questions, not approved fields.
