# Stage 6: Roles, Permissions, And Users API

Status: completed.

This stage implemented the administrative access-management APIs.

## Implemented Role API

```text
GET   /api/roles
POST  /api/roles
GET   /api/roles/:id
PATCH /api/roles/:id
GET   /api/roles/:id/permissions
```

Behavior:

- role list supports pagination and search
- role create is limited to approved role keys
- role update changes display metadata only
- role create/update is service-level restricted to Super Admin
- role create/update writes audit logs

## Implemented Permission API

```text
GET   /api/permissions
POST  /api/permissions
GET   /api/permissions/:id
PATCH /api/permissions/:id
```

Behavior:

- permission list supports pagination, search, role filter, and module filter
- permission names use `module:action` keys
- permission create validates the target role exists
- permission update can change module/action/display metadata
- permission create/update is service-level restricted to Super Admin
- permission create/update writes audit logs

## Implemented User API

```text
GET   /api/users
POST  /api/users
GET   /api/users/:id
PATCH /api/users/:id
PATCH /api/users/:id/status
PATCH /api/users/:id/role
PATCH /api/users/:id/password
```

Behavior:

- user list supports pagination, search, status filter, role filter, and department filter
- user create validates the target role exists
- user create hashes the temporary password
- created users follow `FORCE_PASSWORD_CHANGE_ON_FIRST_LOGIN`
- user profile update does not change password, role, or status
- status change is isolated behind `users:change_status`
- role assignment is isolated behind `users:assign`
- users cannot disable, suspend, or reassign themselves through these endpoints
- admin password reset is isolated behind `users:update`
- admin password reset revokes existing sessions and can force password change
- users cannot reset their own password through the admin reset endpoint
- IT Manager cannot administer Super Admin accounts
- IT Manager cannot assign the Super Admin role
- user create/update/status/role/password changes write audit logs

## Route Protection

Routes are protected with permission middleware:

```text
roles:view
roles:create
roles:update
permissions:view
permissions:create
permissions:update
users:view
users:create
users:update
users:change_status
users:assign
```

Super Admin bypass applies to permission checks.

## Source Files

```text
apps/api/src/modules/roles/role.routes.ts
apps/api/src/modules/roles/role.controller.ts
apps/api/src/modules/roles/role.service.ts
apps/api/src/modules/roles/role.validation.ts
apps/api/src/modules/roles/role.dto.ts
apps/api/src/modules/permissions/permission.routes.ts
apps/api/src/modules/permissions/permission.controller.ts
apps/api/src/modules/permissions/permission.service.ts
apps/api/src/modules/permissions/permission.validation.ts
apps/api/src/modules/permissions/permission.dto.ts
apps/api/src/modules/users/user.routes.ts
apps/api/src/modules/users/user.controller.ts
apps/api/src/modules/users/user.service.ts
apps/api/src/modules/users/user.validation.ts
apps/api/src/modules/users/user.dto.ts
apps/api/src/shared/audit/audit-log-recorder.ts
apps/api/src/shared/database/mongo-errors.ts
apps/api/src/shared/database/query-helpers.ts
```

## Verification

Completed checks:

```text
npm run api:build
npm run api:typecheck
```

Smoke check:

- called `GET /api/roles`, `GET /api/permissions`, and `GET /api/users` without a session cookie
- confirmed all return `401 authentication_required`

The full create/update/list flows still need verification against a real MongoDB database with seeded roles, permissions, and a Super Admin user.

## Next Stage

The next recommended stage is the IT requests API:

- create request
- list requests
- update request
- assign request
- change request status
- request comments
