# Stage 2 Shared Backend Infrastructure

## Status

Started on 2026-06-24.

## Stage 2A Implemented

Shared constants:

- Approved role keys and display names
- User statuses
- Request statuses
- Request types
- Priority values
- Task statuses
- Task categories
- Auth policy values

Shared validation:

- Common MongoDB ObjectId schema
- Non-empty string schema
- Optional trimmed string schema
- ISO date string schema
- Enum schema helper
- Request validation middleware for `body`, `params`, and `query`
- Validated request data access helper
- Base list query schema with search, pagination, and date range support

Shared pagination:

- Standard pagination query schema
- Default page: `1`
- Default limit: `20`
- Max limit: `100`
- Sort order: `asc` or `desc`
- Skip calculation helper
- Pagination metadata helper
- `paginatedOk` response helper

## Stage 2B Implemented

Permission foundation:

- Permission module constants
- Permission action constants
- Typed permission requirement
- Permission key helper

Authentication and authorization shape:

- Authenticated user context type
- Express `res.locals.authUser` typing
- Auth user access helper
- `requireAuthentication` middleware
- `requirePermission` middleware
- `requireAnyPermission` middleware
- Super Admin permission bypass

Module conventions:

- Controller handler type
- Controller wrapper helper
- Service context type
- Repository list/options/result types
- API module registration type

Audit foundation:

- Audit entity type constants
- Audit action constants
- Audit event type
- Request audit context helper
- Pluggable audit writer interface
- No-op audit writer until the real `audit_logs` model is implemented

## Files

```text
apps/api/src/shared/constants/
apps/api/src/shared/auth/
apps/api/src/shared/audit/
apps/api/src/shared/controllers/
apps/api/src/shared/modules/
apps/api/src/shared/repositories/
apps/api/src/shared/services/
apps/api/src/shared/validation/
apps/api/src/shared/pagination/
apps/api/src/shared/http/api-response.ts
apps/api/src/middleware/authorization.ts
apps/api/src/types/express.d.ts
```

## Still Pending In Stage 2

- Filtering helper beyond base search/date range
- Real session loading middleware
- Real audit writer backed by the `audit_logs` collection
- Permission seed definitions
- Module-specific filter schemas

## Verification

Run:

```text
npm run api:build
npm run api:typecheck
```
