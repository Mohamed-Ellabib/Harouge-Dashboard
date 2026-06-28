# Official SQL Schema Review

## Source And Status

- Received: 2026-06-24
- Project copy: `database/schema.sql`
- Current status: active business scope reference
- Implementation database: MongoDB Atlas planned

## Current Decision

The system will mainly use MongoDB, but the current business scope is exactly what exists in the supplied SQL file.

That means the current system includes:

- Roles
- Permissions
- Users
- Requests
- Tasks
- Task updates
- Comments
- Audit logs

## Cancelled For Now

The SQL file does not contain tables for:

- Purchases / MR
- Products
- Assets
- Suppliers
- Attachments
- Notifications
- System settings

Therefore these modules are cancelled for now and should not be implemented.

## Useful Reference Points From The SQL File

- Roles and permissions are separate entities.
- Users include an external-style authentication identifier named `auth_user_id`, but MVP local auth will not depend on it.
- Requests, tasks, task updates, comments, and audit logs are first-class records.
- Comments are request-only for MVP even though the SQL source includes `task_id`.
- Task progress is stored both as current state on `tasks` and as history in `task_updates`.
- Audit old/new values were intended to store structured JSON.

## MongoDB Mapping

| SQL table | MongoDB collection |
| --- | --- |
| `roles` | `roles` |
| `permissions` | `permissions` |
| `users` | `users` |
| `requests` | `requests` |
| `tasks` | `tasks` |
| `task_updates` | `task_updates` |
| `comments` | `comments` |
| `audit_logs` | `audit_logs` |

## SQL Compatibility Note

The source combines backtick identifier quoting with the `jsonb` type. Backticks are not PostgreSQL identifier syntax, while `jsonb` is PostgreSQL-specific. I am certain this mixed syntax should not be treated as directly executable without review.

Because MongoDB is now the planned database, this compatibility issue is not a blocker. The SQL file is used to define scope and fields, not as an executable migration.

## Remaining Modeling Questions

1. Which fields must be required rather than optional in the MongoDB schemas?
2. Should soft-delete/archive fields be added later, or should MVP avoid destructive deletes?

## Implementation Gate

Do not generate Mongoose schemas until the MongoDB collection model and workflow statuses are approved.
