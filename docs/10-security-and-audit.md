# Security And Audit

## Security Requirements

Minimum security:

- Local email/password authentication
- Role-based access control
- Protected API routes
- Input validation
- Rate limiting
- Helmet security headers
- Audit logging
- No public registration
- Disable inactive users
- Environment variables for secrets
- Protected MongoDB Atlas connection
- Backup plan
- Clean error messages that do not expose server details

## Authentication Decision

Use local email/password authentication for MVP.

Rules:

- No Microsoft/company SSO for MVP.
- No public registration.
- Admin creates users.
- Passwords are never stored directly.
- Store `passwordHash` on the existing `users` collection.
- Use bcrypt for password hashing.
- Use HTTP-only cookie sessions.
- Do not store JWT tokens in browser localStorage.
- Use signed session cookie payloads with `SESSION_SECRET`.
- Use CSRF protection for unsafe authenticated requests.
- Block inactive users from login.
- Require password change when an admin creates a temporary password.
- Allow authorized admins to reset another user's password.
- Lock a user for 15 minutes after 5 failed login attempts.
- Do not reveal whether a login email belongs to an inactive, suspended, or locked account.

The current schema includes `users.auth_user_id`, mapped to `users.authUserId`. This field is not used for MVP local auth and can remain empty. The password fields are an approved auth-only extension to the existing `users` collection.

Implemented session behavior:

- session cookie contains signed `userId`, `issuedAt`, `expiresAt`, and `sessionVersion`
- session cookie is HTTP-only
- session cookie is cleared when invalid or expired
- session is rejected if the user is not active
- session is rejected if the user's password changed after the session was issued
- session is rejected if `users.sessionVersion` no longer matches the token
- logout and password change increment `users.sessionVersion`
- admin password reset increments `users.sessionVersion`
- no sessions collection is used in MVP

## CSRF Protection

Cookie-based sessions require CSRF protection.

Implemented behavior:

- `GET /api/auth/csrf` issues a signed CSRF token
- login and password change responses include a fresh `csrfToken`
- the CSRF token is also stored in a readable cookie named by `CSRF_COOKIE_NAME`
- unsafe authenticated requests must send the same token in the header named by `CSRF_HEADER_NAME`
- unsafe methods are `POST`, `PUT`, `PATCH`, and `DELETE`
- missing, mismatched, or invalid CSRF values return `403 csrf_token_invalid`

## Database Hosting Note

MongoDB Atlas is the planned database host. The department must verify company policy before storing internal employee and operational task/request data with any cloud provider.

Provider selection, network access, encryption, backups, and retention must be approved before production use.

## Audit Log Coverage

Audit these actions:

- Login failures when relevant
- Login success
- Logout
- Password changes
- Admin password resets
- User creation
- User disabled/enabled
- Role changes
- Permission changes
- Request creation
- Request assignment
- Request status changes
- Task creation
- Task reassignment
- Task status changes
- Task progress updates
- Task review/completion
- Sensitive edits

When `AUDIT_LOG_ENABLED=true`, audit writes are required and write failures propagate as API errors. When audit logging is intentionally disabled with `AUDIT_LOG_ENABLED=false`, audit writes are skipped.

## Cancelled Security Areas

File upload validation and attachment storage are not part of the current system because there is no attachment table in the current scope.
