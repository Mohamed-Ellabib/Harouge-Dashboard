# Phase 0 Security Risks

This is the Phase 0 architecture risk register. The formal Codex Security scan
is complete and sealed separately. Four findings survived final policy review:
three medium-severity findings and one low-severity finding. The canonical
report is the authority for security severity; the groupings below express
implementation urgency for the SaaS pivot.

## High

### S-01: Product availability is global

Merchant product creation/publication assigns every sales channel. The database
currently has one channel, so cross-Store impact cannot yet be executed, but
adding stores without fixing this would expose products through the wrong
storefront. Evidence: both merchant product route files.

### S-02: Complete order ownership is absent

Merchant order access scans 100 global orders and filters items using current
product links. Orders can disappear through pagination or product reassignment,
and future mixed-Store orders would cross the SaaS boundary. Evidence:
`apps/backend/src/api/vendor/orders/route.ts`.

### S-03: Single product ownership is not a database invariant

Application code checks conflicts, but the observed link-table primary key
allows one product ID with multiple vendor IDs. Concurrent or future paths can
violate ownership. Evidence: the product link, ownership helper, and read-only
index inspection.

### S-04: Store context does not bind hostname, key, and channel

The resolver accepts a query-string domain before `Host`; any valid publishable
key passes the generic Store boundary. No Store-specific key/channel match or
trusted-proxy policy exists. Evidence: the Store vendor resolve route.

### S-05: Security regression tests are unavailable

There are no test files. Root tests execute zero tasks; backend scripts are not
Windows-compatible and Jest references a missing setup file.

## Medium

### S-06: Sessions cannot be revoked individually

Sessions last seven days and have no server-side version. Password changes do
not invalidate old sessions. Disabling the member or Store does block access
because status is rechecked on each request.

### S-07: Roles are stored but not enforced

Owner and manager values exist, but merchant routes check active membership
only. There is no backend permission policy.

### S-08: Login has no brute-force control

Credential failures use a uniform message, but there is no rate limit, backoff,
lockout, or audit event.

### S-09: Identity is ambiguous across stores

Email has no unique constraint. Login selects one active member by email before
password verification, so duplicate memberships can become inaccessible or
resolve unexpectedly.

### S-10: Public metadata is not allowlisted

The public vendor serializer returns the complete vendor metadata object.
Future internal configuration placed there could become public.

### S-11: CSRF protection is partial

SameSite Lax, JSON requests, and CORS preflight reduce risk, but mutations have
no explicit Origin check or CSRF token. Same-site subdomain assumptions are not
documented.

### S-12: Development infrastructure is not production-safe

Startup reports fake Redis, local event bus, and in-memory locking. These are
not suitable for multi-process idempotency, ordering, inventory, or durable
events.

## Operational

- There is no commit history and all project files are untracked.
- A database credential was previously shared in conversation. It is not in
  inspected source, but must be rotated before production.
- PostgreSQL warned that the current `sslmode=require` interpretation changes
  in a future `pg` major release; make the verification policy explicit.
- Request IDs, audit events, monitoring, backups, and restore tests are absent.

## Positive controls

- Salted scrypt password hashes with timing-safe verification.
- HMAC session signature and production secret requirement.
- HttpOnly cookie, Secure in production, SameSite Lax.
- Active member and active Store revalidation per protected request.
- Merchant Store identity is not accepted in product request bodies.
- Product PATCH verifies ownership before Medusa workflows.
- Admin vendor APIs require Medusa user authentication.
- Merchant dashboard contains no global Admin token or `/admin` calls.
