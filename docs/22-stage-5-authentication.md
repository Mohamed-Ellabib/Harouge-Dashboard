# Stage 5: Authentication And Authorization

Status: completed.

This stage implemented local email/password authentication and backend authorization foundations.

## Implemented API

```text
GET  /api/auth/csrf
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
POST /api/auth/change-password
```

There is no public registration endpoint.

## Session Design

The backend uses an HTTP-only cookie named by `COOKIE_NAME`.

The cookie value is a signed session token:

- payload contains `userId`, `issuedAt`, and `expiresAt`
- payload also contains `sessionVersion`
- payload is signed with HMAC-SHA256 using `SESSION_SECRET`
- cookie is `httpOnly`
- cookie `secure` follows `COOKIE_SECURE`
- cookie `sameSite` follows `COOKIE_SAME_SITE`
- expiry follows `SESSION_TTL_HOURS`
- password change and logout increment `users.sessionVersion`
- admin password reset increments `users.sessionVersion`
- sessions are rejected when token `sessionVersion` does not match the user record

The session token is not stored in browser localStorage.

No new sessions collection was added because the approved MVP scope is limited to the eight current collections.

## Auth Context

Requests after `/api/health` pass through `attachAuthContext`.

If a valid session cookie is present, the backend loads:

- active user
- role
- role permissions

The resulting context is stored in `res.locals.authUser`.

If the user is inactive, suspended, missing, missing a role, or the token is invalid, the cookie is cleared and the request continues unauthenticated.

## Password Rules

- passwords are hashed with bcryptjs
- new passwords must be at least 12 characters
- password hash is selected only when needed
- password hash is not returned in API responses
- password change sets `mustChangePassword` to `false`
- password change rotates the session cookie
- password change rotates the CSRF token
- sessions issued before `passwordChangedAt` are rejected

## Failed Login Lock

Implemented policy:

```text
AUTH_MAX_FAILED_LOGIN_ATTEMPTS=5
AUTH_LOCK_MINUTES=15
```

Behavior:

- failed password attempts increment `failedLoginCount`
- when the configured limit is reached, `lockedUntil` is set
- public login responses remain `invalid_credentials` for inactive, suspended, locked, missing, and wrong-password accounts
- audit logs keep the detailed failure reason
- expired locks are cleared on the next login attempt
- successful login resets `failedLoginCount` and clears `lockedUntil`

## CSRF Protection

Implemented CSRF behavior:

- `GET /api/auth/csrf` returns a signed CSRF token
- `POST /api/auth/login` returns a fresh CSRF token
- `POST /api/auth/change-password` returns a fresh CSRF token
- unsafe authenticated requests require the CSRF cookie and header to match
- the header name defaults to `x-csrf-token`

## Authorization Middleware

Available middleware:

```text
requireAuthentication
requireRole
requireAnyRole
requirePermission
requireAnyPermission
```

Super Admin bypass applies to permission checks. Role checks remain explicit.

## Audit Logging

Authentication actions write audit log attempts:

- `login_failed`
- `login_succeeded`
- `logout`
- `password_changed`

Admin password resets also write `password_changed` audit events with `passwordResetByAdmin: true`.

Audit write failures propagate when `AUDIT_LOG_ENABLED=true`.

## Source Files

```text
apps/api/src/modules/auth/auth.routes.ts
apps/api/src/modules/auth/auth.controller.ts
apps/api/src/modules/auth/auth.service.ts
apps/api/src/modules/auth/auth.validation.ts
apps/api/src/middleware/auth-context.ts
apps/api/src/middleware/authorization.ts
apps/api/src/shared/auth/auth-context-loader.ts
apps/api/src/shared/auth/passwords.ts
apps/api/src/shared/auth/session-cookie.ts
apps/api/src/shared/auth/session-token.ts
apps/api/src/shared/auth/csrf-token.ts
apps/api/src/middleware/csrf-protection.ts
```

## Verification

Completed checks:

```text
npm run api:build
npm run api:typecheck
```

Smoke checks:

- created and verified a signed session token
- called `GET /api/auth/me` without a cookie and confirmed `401 authentication_required`

The full login and change-password flow still needs verification against a real MongoDB database with seeded roles, permissions, and a Super Admin user.

## Next Stage

The next recommended stage is the access-management API:

- roles list/update
- permissions list/update
- users list/create/update
- user status changes
- role assignment
