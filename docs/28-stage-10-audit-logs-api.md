# Stage 10: Audit Logs API

Status: completed.

This stage exposed protected, read-only audit history for administration.

## Implemented Audit API

```text
GET /api/audit-logs
GET /api/audit-logs/:id
```

## Audit List Behavior

The audit list supports:

- pagination
- search
- created-date range filtering
- action filtering
- actor filtering
- entity type filtering
- entity ID filtering
- sorting by approved audit fields

List responses return summary fields only. Full `oldValue` and `newValue` payloads are returned by the detail endpoint.

## Audit Detail Behavior

The detail endpoint returns:

- action
- actor ID
- entity type
- entity ID
- IP address
- user agent
- old value
- new value
- created date

## Access Policy

Route-level access accepts:

```text
audit_logs:view
audit_logs:view_audit
```

Service-level access is also restricted to:

- Super Admin
- IT Manager

This second check protects audit history if permissions are accidentally widened later.

## Read-Only Rule

No create, update, or delete endpoints were created for audit logs.

Audit reads are not recursively audit-logged in this MVP to avoid high-volume read amplification. A later production hardening stage can add explicit audit-log access events if required by company policy.

## Source Files

```text
apps/api/src/modules/audit-logs/audit-log.routes.ts
apps/api/src/modules/audit-logs/audit-log.controller.ts
apps/api/src/modules/audit-logs/audit-log.service.ts
apps/api/src/modules/audit-logs/audit-log.validation.ts
apps/api/src/modules/audit-logs/audit-log.dto.ts
apps/api/src/routes/api.routes.ts
```

## Verification

Completed checks:

```text
npm run api:build
npm run api:typecheck
```

Smoke check:

- called `GET /api/audit-logs` without a session cookie
- called `GET /api/audit-logs/:id` without a session cookie
- confirmed both return `401 authentication_required`

The full filtered list/detail flow still needs verification against a real MongoDB database with seeded roles, permissions, users, and audit events.

## Next Stage

The next recommended stage is dashboard and reports API:

- admin dashboard
- manager dashboard
- employee dashboard
- request reports
- task reports
- audit reports
