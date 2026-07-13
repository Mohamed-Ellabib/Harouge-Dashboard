# SaaS Pivot Roadmap Status

Last updated: 2026-07-13

## Current phase

**Phase 1 - complete**

Phase 0.5 commit: `3bc7f49` on `feat/saas-multi-store-pivot` (local only, not pushed).

## Phase 1 delivered

- Central `MerchantStoreContext` for member/store status, role permissions, channel, domains, key reference, and request ID.
- Central `PublicStoreContext` for normalized host plus active Vendor, exact channel, and exact publishable key.
- Merchant product list/detail/create/update/publish/draft isolation with hostile ownership/channel rejection.
- Merchant order list/detail reduced DTO with current owned-item filtering.
- Owner/manager permission matrix and owner-only allowed store profile edits.
- Exact public profile response allowlist.
- Store A/Store B integration coverage for identity, products, public resolution, roles, inactive stores, and orders.
- Required route security matrix and Phase 1 ADRs.

## Database changes

No schema migration was added in Phase 1. Existing Vendor metadata and Medusa module links remain temporary compatibility storage. Tests create and drop only disposable local databases.

## Deferred to Phase 2

- Tenant and SaaS Store schema, migration/backfill, and provisioning.
- Immutable Store ownership for carts and whole orders.
- Verified-domain lifecycle and permanent Store-owned channel/key records.
- Plans, entitlements, audit events, storefront, and WhatsApp enquiry work.

## Owner actions

- Confirm rotation of the previously exposed Neon credential; it remains a production release blocker.
- Configure exact trusted proxy IPs before accepting forwarded host headers.
- Provide shared Redis-backed security/runtime infrastructure before horizontal scaling.

## Acceptance results

- Backend lint: passed.
- Backend type-check: passed.
- Backend build: passed.
- Merchant dashboard lint: passed.
- Merchant dashboard type-check: passed.
- Merchant dashboard build: passed.
- Unit tests: 27 passed, 0 failed.
- Module integration tests: 2 passed, 0 failed.
- HTTP integration tests: 13 passed, 0 failed.
- Root workspace test command: 42 passed, 0 failed.
- Focused modified-path security validation: no new plausible critical/high issue; the known whole-order ownership limitation remains deferred to Phase 2.

## Phase 2 gate

Phase 2 development is unblocked and should begin with permanent Tenant/SaaS Store ownership plus immutable cart/order Store context. The Neon rotation confirmation remains a production release blocker, not a reason to weaken or skip the Phase 2 data model.