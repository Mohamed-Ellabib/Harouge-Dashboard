# Stage 3: Mongoose Models

Status: completed.

This stage created the strict MongoDB model layer for the current approved system scope.

## Implemented Collections

Only these collections were implemented:

- `roles`
- `permissions`
- `users`
- `requests`
- `tasks`
- `task_updates`
- `comments`
- `audit_logs`

No models were created for purchases, products, assets, suppliers, attachments, notifications, or settings.

## Source Files

```text
apps/api/src/modules/roles/role.model.ts
apps/api/src/modules/permissions/permission.model.ts
apps/api/src/modules/users/user.model.ts
apps/api/src/modules/it-requests/request.model.ts
apps/api/src/modules/tasks/task.model.ts
apps/api/src/modules/task-updates/task-update.model.ts
apps/api/src/modules/comments/comment.model.ts
apps/api/src/modules/audit-logs/audit-log.model.ts
apps/api/src/modules/index.ts
apps/api/src/shared/database/schema-options.ts
```

## Shared Model Behavior

All models use Mongoose strict schemas.

Shared schema options:

- collection name is explicitly set
- strict mode is enabled
- `__v` is disabled
- JSON/object serialization converts `_id` to `id`
- standard models use `createdAt` and `updatedAt`
- history-only models use `createdAt` only

Created-at-only models:

- `task_updates`
- `comments`
- `audit_logs`

## Enforced Values

The models import approved constants from `apps/api/src/shared/constants`.

Model enum validation covers:

- role names
- permission modules
- permission keys using `module:action` format
- user statuses
- request statuses
- request types
- priorities
- task categories
- task statuses
- audit actions
- audit entity types

## Authentication Fields

The `users` model includes the approved local-authentication fields:

- `passwordHash`
- `passwordChangedAt`
- `mustChangePassword`
- `failedLoginCount`
- `lockedUntil`

`passwordHash` uses `select: false` and is removed from serialized output.

## Model Rules

Current model-level rules:

- completed tasks must have `progress` equal to `100`
- blocked tasks must include `blockedReason`
- task progress and task update progress values must be between `0` and `100`
- comments must reference a request
- task updates must reference a task
- audit logs must include `action` and `entityType`

## Indexes Defined

The indexes from `docs/16-mongodb-collection-model.md` are defined in the Mongoose schemas.

Important note: these indexes are schema definitions. They are created in MongoDB when the application connects with index creation enabled by the runtime/database configuration.

## Verification

Completed checks:

```text
npm run api:build
npm run api:typecheck
```

Additional smoke check:

- imported the compiled model barrel from `apps/api/dist/modules`
- created an invalid completed task with `progress: 50`
- confirmed Mongoose validation rejects it

## Next Stage

The next recommended stage is seed data:

- seed default roles
- seed default permissions
- define first Super Admin creation flow
- make the seed repeat-safe
