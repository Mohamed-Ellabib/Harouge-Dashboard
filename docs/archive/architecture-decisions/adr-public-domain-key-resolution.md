# ADR: Public Domain and Key Resolution

- **Status:** Accepted for Phase 1
- **Date:** 2026-07-13

## Decision

`PublicStoreContext` resolves a public request only when all of these agree: normalized hostname, one active Vendor, the Vendor's explicitly configured sales channel, one non-revoked publishable API key, and that key's sole sales channel. Any missing, duplicate, ambiguous, inactive, or mismatched value fails closed.

`X-Forwarded-Host` is trusted only when the immediate remote address is listed in `TRUSTED_PROXY_IPS`. Query-string store selectors are ignored. Handle overrides are available only in development and test; production identity is hostname based.

## Response boundary

Public store profiles use an explicit `PublicStoreProfile` serializer. Database entities, metadata, private email, internal IDs, status details, timestamps, and future model fields are not serialized automatically.

## Consequences

- Domain/key/channel confusion cannot select another store.
- Custom-domain changes remain an internal platform operation in Phase 1.
- Deployment owners must configure trusted proxy IPs exactly.
- Phase 2 must move domain verification, key ownership, and channel ownership to permanent SaaS Store records.