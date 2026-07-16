# SaaS Pivot Roadmap Status

Last updated: 2026-07-17

## Current phase

Phase 2C is implemented at commit `8b02475`. Phase 3 has not started.

Phase 2B commit: `a769519`. Phase 2A commit: `939b6a6`. Phase 1 commit: `f6b1b95`. Phase 0.5 commit: `3bc7f49`. The branch is local and has no configured remote.

## Delivered

- Durable StoreProvisioning, audit event, and database lease models.
- Strict normalized input contract and safe allowlisted result/status contracts.
- Platform-admin-only create, status, and safe cancellation API.
- Idempotent Tenant, StoreProfile, Medusa Store, channel, key, compatible Region, location, domain, brand, owner, membership, and plan provisioning.
- Graph-gated activation with MerchantStoreContext and PublicStoreContext validation.
- Explicit multi-Store owner reuse and Store-selected merchant login.
- Failure checkpoints, retained-for-retry evidence, and deterministic conflicts.
- Disposable-database migration, concurrency, failure-injection, authorization, and secret-handling coverage.

## Manual acceptance

The real backend/Admin and real HTTP routes were exercised on a freshly recreated guarded local database. Admin access, two Store provisions, restart persistence, merchant login, Product isolation, public domain/key isolation, and Cart isolation passed.

The manual gate is not fully closed:

- Store B reused Store A's compatible Libya/LYD Region, while the acceptance text requested distinct Regions.
- Provisioning did not create a compatible shipping option, so the real checkout and resulting Order authorization steps were skipped.
- Raw Brand, Domain, and Membership IDs are not exposed by the current status API.

See `HANDOFF.md` for the complete result.

## Gate

Do not begin Phase 3 automatically. First accept the shared Region policy and decide where base shipping configuration belongs, then rerun real checkout. Production deployment and migration remain blocked. The owner must confirm Neon credential rotation and separately approve the production runbook. Shared rate limiting, lease monitoring, DNS/SSL automation, billing, and the platform dashboard remain required before production operation.
