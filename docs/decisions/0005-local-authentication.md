# Decision 0005: Local Authentication

## Status

Accepted on 2026-06-24.

## Decision

Use local email/password authentication for MVP.

Do not use Microsoft/company SSO for the first version.

## Rules

- No public registration.
- Admin creates users.
- Passwords are never stored directly.
- Store `passwordHash` on the existing `users` collection.
- Use bcrypt for password hashing.
- Use HTTP-only cookie sessions.
- Do not store JWT tokens in browser localStorage.
- Inactive users cannot log in.
- Admin-created users should be required to change password on first login.

## User Collection Extension

The current SQL source does not include password fields. Because local auth is approved, the MongoDB `users` collection may add these auth-only fields:

- `passwordHash`
- `passwordChangedAt`
- `mustChangePassword`
- `failedLoginCount`
- `lockedUntil`

This does not add a new business entity and does not reopen cancelled modules.

## Relationship To `authUserId`

`users.authUserId` is not used for MVP local auth and can remain empty. It may be useful later if external authentication is added.

## Reason

The owner wants authentication to stay simple and does not want company Microsoft/SSO integration for the first version.

## Consequences

- The API owns password security.
- Password reset and first-login behavior must be designed.
- The frontend needs a login screen and change-password screen.
- Backend responses must never expose `passwordHash`.
