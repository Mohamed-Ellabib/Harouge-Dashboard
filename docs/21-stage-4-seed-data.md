# Stage 4: Seed Data

Status: completed.

This stage added repeat-safe seed behavior for the initial access-control data.

## Implemented Seeds

The seed command creates or updates:

- default roles
- default role permissions

It can also create the first Super Admin user when the required environment variables are provided.

## Seed Command

```text
npm run api:seed
```

The command connects to MongoDB using:

- `MONGODB_URI`
- `MONGODB_DB_NAME`

## Initial Super Admin

To create the first Super Admin, set these values together:

```text
INITIAL_ADMIN_EMAIL=
INITIAL_ADMIN_FULL_NAME=
INITIAL_ADMIN_PASSWORD=
```

Optional profile values:

```text
INITIAL_ADMIN_JOB_TITLE=
INITIAL_ADMIN_DEPARTMENT=
INITIAL_ADMIN_PHONE=
```

Rules:

- `INITIAL_ADMIN_PASSWORD` must be at least 12 characters.
- the password is hashed with bcryptjs using `BCRYPT_SALT_ROUNDS`.
- `mustChangePassword` follows `FORCE_PASSWORD_CHANGE_ON_FIRST_LOGIN`.
- if the admin email already exists, the seed does not reset the password or reactivate the user.

## Repeat-Safe Behavior

The seed uses upserts for roles and permissions.

Repeat behavior:

- roles are matched by `name`
- permissions are matched by `roleId + name`
- existing permissions are updated with the latest display text and description
- no duplicate roles or permissions are created
- the initial admin user is created only if the email does not already exist

## Permission Name Format

Permission `name` values use this stable format:

```text
module:action
```

Examples:

```text
users:view
tasks:assign
requests:comment
audit_logs:view_audit
```

This matches the authorization permission key format in the backend.

## Source Files

```text
apps/api/src/database/seed.ts
apps/api/src/database/seeds/default-roles.seed.ts
apps/api/src/database/seeds/default-permissions.seed.ts
apps/api/src/database/seeds/seed-roles.ts
apps/api/src/database/seeds/seed-permissions.ts
apps/api/src/database/seeds/seed-admin.ts
apps/api/src/database/seeds/seed.types.ts
```

## Verification

Completed checks:

```text
npm run api:build
npm run api:typecheck
```

The command was not run against a real MongoDB Atlas cluster in this stage because no real `MONGODB_URI` was provided.

## Next Stage

The next recommended stage is authentication and authorization:

- login
- logout
- current user endpoint
- change password
- HTTP-only cookie sessions
- failed login lock
- first-login password change handling
