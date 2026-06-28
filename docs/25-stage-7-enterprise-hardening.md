# Stage 7 Enterprise Hardening

Status: completed.

This stage reviewed the completed backend foundation through Stage 7 and fixed issues that would weaken an enterprise internal control system before starting the tasks API.

## Hardening Implemented

- session tokens now include `sessionVersion`
- logout and password change increment `users.sessionVersion`
- old cookies are rejected when a user's session version changes
- unsafe authenticated requests require CSRF validation
- CSRF uses a signed readable cookie plus matching request header
- login errors no longer reveal inactive, suspended, or locked account state
- audit writes are fail-closed when `AUDIT_LOG_ENABLED=true`
- audit logging can still be intentionally disabled with `AUDIT_LOG_ENABLED=false`
- request lists and details now enforce row-level visibility
- request mutations now enforce row-level mutation policy
- internal request comments are visible only to Super Admin and IT Manager
- internal request comments can be created only by Super Admin and IT Manager
- request status changes now follow an explicit transition matrix
- closed requests remain editable only by Super Admin and IT Manager
- user management now prevents IT Manager from administering Super Admin accounts
- user management now prevents IT Manager from assigning the Super Admin role
- stale service entry points that bypassed actor context were removed

## Request Visibility Policy

Super Admin and IT Manager can view all requests.

Supervisor can view:

- requests they created
- requests assigned to them
- requests in their own department when `requestedForDepartment` matches their user department

Employee can view:

- requests they created
- requests assigned to them

## Request Mutation Policy

Super Admin and IT Manager can update, assign, change status, and comment on visible requests, including closed requests.

Supervisor can update, assign, change status, and comment on visible non-closed requests.

Employee can comment on visible non-closed requests. Employee request metadata updates and status changes remain denied unless a later business decision expands that role.

## Request Status Transition Matrix

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

Additional rules:

- `assigned`, `in_progress`, and `completed` require `assignedTo`
- reopening from `closed` is limited to Super Admin and IT Manager
- changing to `closed` sets `closedAt`
- changing away from `closed` clears `closedAt`

## CSRF Contract

Cookie sessions are protected by CSRF validation for unsafe authenticated methods.

Client flow:

```text
GET  /api/auth/csrf
POST /api/auth/login
```

The backend returns `csrfToken` and also sets a readable CSRF cookie. The frontend must send the same token in the header named by `CSRF_HEADER_NAME`, currently `x-csrf-token`, for unsafe requests:

```text
POST
PUT
PATCH
DELETE
```

`POST /api/auth/login` is exempt because there is no authenticated session yet. Authenticated unsafe routes fail with `403 csrf_token_invalid` when the CSRF cookie/header pair is missing, mismatched, or invalid.

## Seed Permission Note

Future seed defaults were tightened so:

- Employee no longer receives `comments:view`
- Supervisor no longer receives `users:view`

Important: the current seed script upserts defaults but does not remove permissions that already exist in a previously seeded database. Existing development or staging databases should be reviewed and cleaned before pilot use.

## Remaining Enterprise Work

The following items are still required before production use:

- automated tests for auth, CSRF, access policy, request transitions, and audit behavior
- MongoDB transaction strategy for sensitive write plus audit-log write atomicity
- audit log read API and retention policy
- production MongoDB Atlas network, backup, and restore policy
- real seeded database verification of login, request, task, comment, and user-management flows

## Verification

Completed checks:

```text
npm run api:build
```
