# ADR: Temporary Vendor Store Context

- **Status:** Accepted for Phase 1
- **Date:** 2026-07-13

## Decision

`MerchantStoreContext` is the only merchant-route source for member, vendor, role, active state, sales channel, domains, publishable-key reference, permissions, and request ID. It is derived from the signed session and current database records on every protected request. Client-supplied vendor, store, ownership, channel, role, and permission identifiers are never authoritative.

The current Vendor record temporarily represents one merchant store. This is compatibility architecture, not the permanent tenant model.

## Consequences

- Missing, stale, inactive, ambiguous, or misconfigured identity fails closed.
- Owner and manager permissions are centralized and testable.
- Product and order routes cannot choose a different vendor from request data.
- Internal Medusa Admin routes remain a separate operator boundary.
- Phase 2 must replace the compatibility mapping with Tenant, SaaS Store, membership, and immutable resource ownership while preserving API behavior.