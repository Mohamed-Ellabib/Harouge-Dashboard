# SaaS Pivot Roadmap Status

Last updated: 2026-07-13

## Current phase

Phase 2B - implemented and validated; the commit SHA is reported by this execution.

Phase 2A commit: `939b6a6`. Phase 1 commit: `f6b1b95`. Phase 0.5 commit: `3bc7f49`. The branch is local and has no configured remote.

## Delivered

- Unique Medusa Store-Cart and Store-Order ownership links.
- Public Cart creation from authoritative hostname/key/Store context.
- Cross-domain, cross-key, cross-channel, mixed-Store, region, shipping, promotion, inactive-Store, and customer-account mutation guards.
- Completion preflight plus verified immutable Order Store ownership.
- Whole-Order merchant authorization and allowlisted Order DTOs.
- Durable repair records for post-order ownership-link failures.
- Guarded dry-run-first Cart/Order ownership diagnostic and backfill.
- Concurrency and idempotency regression coverage.
- Migration and link synchronization on disposable local PostgreSQL only.

## Gate

Phase 2C may begin after this work is committed with a clean tree. Production migration remains blocked until the owner confirms Neon credential rotation and separately authorizes the reviewed migration runbook. Storefront, provisioning, WhatsApp checkout, customer OTP, Redis/shared locks, and production repair processing remain deferred.
