# Security Risks

Last updated: 2026-07-13

## Fixed and verified

| ID | Finding | Root cause | Remediation | Regression evidence | Remaining risk | Status |
| --- | --- | --- | --- | --- | --- | --- |
| S-01 | Cross-channel products | client/default channel ownership | server Store context, canonical Store owner, exact channel, dual-write adapter | Phase 0.5, Phase 1, Phase 2A product tests | real data needs approved backfill | FIXED |
| S-06 | Password reset retained sessions | stateless session had no revocation state | session version invalidation | multi-session tests | temporary identity metadata | FIXED |
| S-08 | Blocking/unbounded login | sync verification and no limits | async bounded verification and layered limiter | auth tests | shared limiter needed for replicas | FIXED LOCAL |
| S-10 | Public metadata exposure | unrestricted entity serialization | explicit public allowlist | exact-key tests | contract review for new fields | FIXED |
| P2A-01 | Vendor remained authorization boundary | temporary model drove contexts | Membership/StoreProfile/Tenant/Medusa Store chain | permanent context tests | auth password storage still legacy | FIXED |
| P2A-02 | Hostname used VendorDomain | legacy domain owned public routing | verified unique StoreDomain | public domain/key tests | DNS/SSL automation deferred | FIXED MODEL |
| P2A-03 | Product owner was Vendor | transitional link represented Store | one canonical Store-product link plus channel agreement | second-owner and isolation tests | dual write remains temporary | FIXED |
| P2A-04 | Unsafe migration could target shared DB | data conversion lacked guarded command | dry-run default; production/remote/protected/test guards | safety and backfill tests | production mechanism intentionally absent | FIXED FOR PHASE 2A |
| P2A-05 | Public products could satisfy channel scope without canonical Store ownership | public middleware trusted only the sales-channel filter | intersect list and direct product reads with exclusive Store-product ownership | Phase 1 and Phase 2A public product tests | channel and canonical owner must remain consistent | FIXED |

## Unresolved

The previously exposed Neon credential rotation cannot be verified. Production migration remains blocked. Carts and orders do not yet persist immutable Store ownership, so mixed-store prevention is Phase 2B work. Vendor authentication storage and dashboard vocabulary remain transitional. Durable audit events, shared rate limiting, event bus, and locking remain future production requirements.

All Phase 2A schema, link, backfill, and integration operations used guarded disposable local PostgreSQL. Neon was not accessed.

## Phase 2B findings

| ID | Finding | Root cause | Affected paths | Remediation | Regression evidence | Remaining risk | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P2B-01 | Cart could be unowned or cross-Store | no canonical Cart Store relationship | Store Cart routes and cart workflows | unique Store-Cart link from verified PublicStoreContext; centralized mutation guard | Phase 2B cart creation/retrieval/mutation tests | legacy data requires guarded reconciliation | FIXED |
| P2B-02 | Channel assignment could admit another Store's Product | channel availability was not canonical ownership | line-item add/update and completion | require exact Product Store owner and matching Cart channel | hostile variant, accidental-channel, bulk, concurrency, and archive tests | malformed production records must be diagnosed before migration | FIXED |
| P2B-03 | Merchant Order authorization was item-level | legacy Vendor relevance filtered individual items | merchant order list/detail | exact whole-Order Store link is authoritative; missing/ambiguous ownership fails closed | merchant isolation and response-contract tests | Vendor compatibility remains until later removal | FIXED |
| P2B-04 | Order could complete without Store ownership | completion did not persist Cart Store on Order | completeCart and direct createOrder workflows | preflight validation, Order Store link, post-link verification, durable repair record on failure | valid, duplicate, mixed, missing, mismatch, and simulated link-failure tests | repair processing and operator UI are deferred | FIXED WITH DEFERRED OPERATIONS |
| P2B-05 | Backfill could guess or target protected data | ownership evidence can conflict | Cart/Order backfill command | dry-run default, disposable/local apply guard, conflict reporting, unambiguous-only idempotent apply | backfill and reconciliation tests | production execution intentionally blocked | FIXED FOR LOCAL PHASE |

The previously exposed Neon credential rotation remains unverified. Production migration is still blocked. The current lock/event providers and rate limiter are process-local; horizontally scaled production needs shared infrastructure. Region, shipping, and promotion Store policies currently use explicit Store metadata allowlists and do not yet have a management UI.

All Phase 2B migrations, tests, diagnostics, and backfill validation used guarded disposable local PostgreSQL. Neon was not accessed.
