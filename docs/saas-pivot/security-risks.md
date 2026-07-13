# Security Risks

Last updated: 2026-07-13

## Fixed and verified

| ID | Finding | Root cause | Remediation | Regression evidence | Remaining risk | Status |
| --- | --- | --- | --- | --- | --- | --- |
| S-01 | Products assigned outside store channel | Merchant writes accepted broad/default channel scope | Server-derived `MerchantStoreContext`, exact configured channel, exclusive owner link, hostile-field rejection | Phase 0.5 and Phase 1 product/key tests | Existing real data requires dry-run diagnosis before repair | FIXED for writes |
| S-06 | Password changes retained sessions | Stateless cookie lacked server revocation state | Session version checked on every request and incremented on self/admin reset or disable | Multi-session HTTP tests | Version remains temporary metadata | FIXED |
| S-08 | Unbounded synchronous login checks | Sync scrypt and no bounds/limiter | Async verify, shape/length checks, generic response, source+email limiter | Unit and HTTP auth tests | Shared limiter required for multiple replicas | FIXED for single process |
| S-10 | Public entity metadata exposure | Unrestricted serialization | Exact `PublicStoreProfile` allowlist | Exact-key unit/HTTP contract | New fields require explicit contract change | FIXED |
| P1-01 | Merchant routes derived store inconsistently | Route-local session/vendor/channel logic | Central `MerchantStoreContext` and permission enforcement | Phase 1 identity, role, product, order tests | Vendor is still a temporary Store surrogate | FIXED TEMPORARILY |
| P1-02 | Host/key/channel confusion | Public host and key were not one authority | Central `PublicStoreContext`; trusted proxy allowlist; exact key/channel checks | Host/key matrix and direct public product tests | Deployment must configure trusted proxies | FIXED TEMPORARILY |
| P1-03 | Global/unsafe merchant order response | Global orders and broad entity shape | Owned-item filtering and explicit `MerchantOrder` DTO | Mixed-order list/detail contract tests | Whole-order ownership absent | MITIGATED; PHASE 2 REQUIRED |
| P1-04 | Role and shop-field overreach | Stored role was not a policy boundary | Central owner/manager matrix and PATCH allowlist/denylist | Role/shop HTTP and unit tests | Additional future roles require policy design | FIXED |

## Unresolved owner and architecture risks

- Rotation of the previously exposed Neon credential cannot be verified. The owner must rotate it and confirm without placing either credential in Git, logs, fixtures, reports, or chat.
- Existing production product-channel relationships were not changed; review dry-run diagnostics before any repair.
- Whole-order Store ownership and mixed-store cart rejection are deferred to Phase 2.
- Vendor-to-Store compatibility metadata has no permanent relational constraints.
- Domain verification/approval and trusted production proxy configuration remain deployment/platform responsibilities.
- Audit events are not durable; request IDs exist but there is no audit model.
- Redis-backed rate limiting, event bus, and distributed locking remain production scaling requirements.

## Data safety

All automated integration work used guarded disposable local PostgreSQL databases. No Phase 1 test, fixture, migration, or diagnostic used the shared remote database.