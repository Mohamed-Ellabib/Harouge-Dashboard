# SaaS Pivot Roadmap Status

Last updated: 2026-07-22

## Current phase

Phase 2C Store identity provisioning is implemented at historical commit `8b02475`. A later documentation handoff exists at `4a7497f`. The approved Phase 2C commerce-readiness gate-closure package and legacy Vendor lifecycle freeze are implemented only in the current uncommitted working tree.

The owner-authorized Phase 3A Customer Storefront Foundation is implemented in the same uncommitted working tree. Its guarded-local automated, visual-preview, real-backend browser, and manual keyboard evidence is recorded below. The Store A/Store B real-backend matrix, backend-only restart, and physical keyboard pass are recorded; the guarded-local Phase 3A exit gate closed on 2026-07-22.

The owner-approved Phase 3B guarded-local commerce pilot is implemented in the same uncommitted working tree. The exact capability/purchase contracts, Store-currency Product authority, guest Cart-to-Order journey, hostile two-Store matrix, merchant Order isolation, backend-restart persistence, responsive browser QA, regression, and cleanup passed on guarded disposable local PostgreSQL on 2026-07-22. Its distinct owner-performed physical-keyboard journey is still pending, so the Phase 3B exit gate remains open. No public pilot or production readiness is claimed.

The owner accepted exact compatible Region sharing on 2026-07-18. Store identity provisioning remains separate from online-checkout readiness. Starter checkout is `not_required` and disabled; Professional checkout is `pending` until a durable setup completes and the live deterministic Store fulfillment graph validates as `ready`.

Accepted guarded-local Phase 2C evidence is commerce-readiness integration 12/12, commerce-resource unit coverage 5/5, Phase 2B Cart/Order regression 12/12, and immutable-policy-pin units 2 suites/9 tests. Final post-Phase-3B backend regression passed 23 suites/144 tests (62 unit, 10 module, 72 HTTP). Backend typecheck/lint/build, all three frontend checks/builds, storefront Vitest 3 files/11 tests, SaaS generate/no-change, the unchanged Phase 3A harness, and the Phase 3B guarded harness passed. The selected current-tree Phase 2C real-backend API rerun also passed and is recorded separately below. Do not describe any working-tree package as committed or production-ready.

Earlier accepted phase commits:

| Commit    | Phase     | Outcome                                              |
| --------- | --------- | ---------------------------------------------------- |
| `3bc7f49` | Phase 0.5 | guarded test foundation and security fixes           |
| `f6b1b95` | Phase 1   | authoritative merchant/public Store contexts         |
| `939b6a6` | Phase 2A  | permanent Tenant/Store/Product ownership model       |
| `a769519` | Phase 2B  | immutable Cart and Order Store ownership             |
| `8b02475` | Phase 2C  | idempotent platform-only Store identity provisioning |

The branch remains local and has no configured remote.

## Delivered in committed Phase 2C

- Durable StoreProvisioning, event, and database lease models.
- Strict normalized input and safe status/result contracts.
- Platform-only provision/status/safe-cancel API.
- Idempotent Tenant, StoreProfile, Medusa Store, Sales Channel, key, compatible Region, location, domain, brand, owner, membership, and plan provisioning.
- Graph-gated activation with MerchantStoreContext/PublicStoreContext validation.
- Explicit multi-Store owner reuse and Store-selected merchant login.
- Retained retry checkpoints and deterministic conflicts.
- Guarded disposable migration/concurrency/failure/authorization/secret-handling coverage.

## Implemented in the current gate-closure working tree

- StoreCommerceReadiness, StoreCommerceSetup, StoreCommerceSetupEvent, and StoreCommerceSetupLease models plus migration/backfill.
- Platform-user-only commerce setup/status/readiness routes.
- Strict shipping display/amount input; Store/currency/Region/countries/providers/internal IDs derived server-side.
- Versioned permanent commerce policy derived from exactly one completed provisioning record and pinned into the stable setup SHA-256 digest/snapshot; retry/completion fail on drift.
- Same-key replay, changed-input conflict, identical concurrency convergence, retained exact-key retry, and completed-operation immutability.
- Expired lease retention with setup/readiness `requires_attention` and replay refusal.
- Sanitized unknown provider/core failure persistence and Admin response.
- Deterministic Store Fulfillment Set, exact country-only Service Zone, exclusive location/set link, singleton Store Shipping Option, exact rules/prices, pinned profile, and exact option allowlist.
- Deep plan/readiness/live-graph gates on public HTTP and project-owned hook-capable Cart/shipping workflows.
- Local payment-session provider restriction to `pp_system_default`.
- Automated integration HTTP checkout producing one canonical Store-owned Order and denying the other merchant.
- Standalone legacy Vendor creation disabled; mapped compatibility Vendor PATCH/DELETE blocked.
- Owner platform-dashboard lifecycle language/actions aligned to canonical client/Store provisioning and read-only legacy compatibility.
- Disposable test runner fixed to return a non-zero exit when its child suite fails.

## Implemented in the Phase 3A working tree

- Arabic RTL browse-only customer storefront application at `apps/storefront`.
- Customer routes `/`, `/products`, and `/products/:handle`.
- Relative same-origin Store API client with bounded requests, exact runtime DTO mapping, and fail-closed response handling.
- Store shell, profile/catalog/detail views, search, sort, mobile navigation, responsive layouts, contrast-safe theming, and explicit loading/empty/not-found/unavailable states.
- Development-only visual-preview data that is excluded from production behavior and absent from the inspected production bundle.
- Recursive backend public Product response sanitizer that removes all `metadata` fields.
- Two-Store HTTP acceptance for exact Host/key profiles, canonical published-Product isolation, crossed context rejection, and inactive/unverified Store rejection.
- Browse-only parity for Starter and Professional without exposing or inferring plan/readiness state.
- Repeatable loopback-only real-backend harness with exclusive disposable-database locking, an encrypted runtime-key handoff, two isolated hostname/key deployments, safe live context probes, backend-only restart, and normal-shutdown schema scrubbing.
- Server-only `STOREFRONT_PROXY_TARGET`; the upstream target is no longer placed in Vite's browser-public environment namespace.

## Implemented in the Phase 3B working tree

- Exact public checkout-capability and one-simple-variant purchase-option DTOs derived from verified PublicStoreContext and the live Store commerce graph.
- Store-derived merchant Product currency, bounded amount/precision validation, and rejection of mismatched caller currency or unsupported multi-variant updates.
- Guest Cart restore using only an opaque Cart ID in versioned same-origin `sessionStorage`; customer contact/address remains in memory.
- Responsive Arabic RTL Cart, checkout, shipping review, fixed local system-payment step, indeterminate completion handling, and in-memory reduced confirmation.
- Exact Storefront response mapping and fail-closed recovery, including optional Medusa Cart line totals derived from unit price and quantity.
- Exact development proxy path/method allowlist, stripped forwarding headers, bounded body/header sizes, and upstream timeouts.
- Two-ready-Store guarded harness with runtime-only synthetic platform/merchant credentials, authenticated Admin provisioning/readiness, Store A browser completion, Store B hostile denial, reduced merchant Order verification, backend restart, schema scrub, and owned-process/port cleanup.

## Focused working-tree acceptance

`npm.cmd run test:commerce-readiness --workspace @dtc/backend` passes 12/12 on guarded disposable PostgreSQL. The commerce-resource unit suite passes 5/5 and the Phase 2B Cart/Order regression passes 12/12. Together, the accepted focused evidence covers plan gating, setup/replay/concurrency/retry, database-time transactional expired-lease handling, paused-owner fencing, stale-expiry preservation of concurrent renewal/completion, single-winner attention evidence, error sanitization, HTTP checkout/Order isolation, stale graph, exact shipping-rule/price corruption rejection, cross-Store fulfillment corruption, and authenticated Admin routes.

The immutable-policy-pin focused unit result is 2 suites/9 tests passing. Final guarded-local backend regression passed 23 suites/144 tests (62 unit, 10 module, 72 HTTP); backend and all frontend checks/builds passed; storefront Vitest passed 3 files/11 tests; SaaS generate reported no changes; and the unchanged Phase 3A guarded matrix/restart/cleanup passed. This is automated/local evidence, not the external manual run from 2026-07-14.

## Phase 3A guarded-local evidence

- Storefront Vitest: 2 files, 7 tests passing.
- Storefront typecheck and production build: passing.
- Production bundle scan: no visual-preview data, development Store selector, or plan strings.
- Backend Phase 3 exact public-field and isolation contract: 1 suite, 3 tests passing.
- Earlier focused Phase 3 plus Phase 1/2 isolation regression: 5 suites, 34 tests passing.
- Browser visual QA: home, catalog, detail, search, sort, mobile menu, empty, not-found, and unavailable states at 320, 375, 768, 1024, and 1440 CSS pixels; RTL, one `h1`, and no horizontal overflow.
- Real-backend browser QA: matching Store A and Store B home/catalog/detail, Store-exclusive Products, cross-Store Product denial, both crossed hostname/key directions with no stale identity, mobile/desktop RTL, generic error announcements, clean console logs, and persistence after verified backend-process termination and restart.
- Keyboard acceptance: native links/buttons, focusable skip link, visible focus, `aria-expanded`, and polite live region inspected. On 2026-07-22 the owner physically verified Tab-to-skip-link, Enter-to-main, reload, three Tabs to `فتح القائمة`, Enter-to-open, and Space-to-close; order and visible focus were accepted.

The earlier wide-viewport QA used explicitly enabled visual-preview data and remains presentation-only evidence. A later guarded smoke exercised the built real backend and permanent Store context. The distinct physical keyboard pass completed the remaining accessibility check and closed the guarded-local Phase 3A exit gate. The local Vite proxy is not production-edge acceptance.

## Historical real-HTTP manual acceptance

On 2026-07-14, the real backend/Admin and real HTTP routes were exercised on freshly recreated guarded local PostgreSQL for committed Phase 2C. Admin access, two Store provisions, restart persistence, merchant login, Product isolation, public domain/key isolation, and Cart isolation passed.

That run recorded two gaps:

1. Both Libya/LYD Stores reused one exact compatible Region. This is now accepted policy, not a defect.
2. No compatible Shipping Option existed, so checkout and Order authorization were skipped.

The current automated gate-closure suite exercises shipping, payment, completion, canonical Order ownership, and cross-merchant denial. Separately, the owner-selected current-tree real-backend API rerun passed on 2026-07-22 using a runtime-only synthetic authenticated platform administrator, real Admin HTTP provisioning of an additional Professional Store, and real commerce setup/readiness on guarded disposable PostgreSQL. It used no real credentials and no Neon. This result remains separate from both the historical 2026-07-14 run and the Phase 3B browser evidence.

The historical status API also did not expose raw Brand, Domain, and Membership IDs. That observation remains unchanged for the 2026-07-14 record.

## Implemented Phase 3B pilot boundary

The implemented contract deliberately keeps the pilot smaller than the MVP:

- Professional and deeply ready checkout only; all other Stores remain browse-only;
- anonymous customer, one simple untracked/backorderable variant per Product, one Store-derived currency price, one Store shipping option, and the local system-default payment provider;
- Cart, quantity/removal, address, shipping, review, completion, reduced confirmation, and merchant Order visibility;
- exact public capability/purchase/Cart/confirmation DTOs and hostile Store A/Store B tests;
- merchant Product currency derived server-side, with mismatched caller currency rejected;
- assisted existing platform setup, with no plan/setup reconfiguration or attention repair.

Customer accounts, multi-variant selection, tracked inventory, promotions, tax, production providers, billing, notifications, DNS/SSL/deployment, and production infrastructure remain later MVP/launch work.

## Boundaries after guarded-local verification

- The selected current-tree Phase 2C real-backend API rerun passed; keep it separate from historical, Phase 3B browser, physical-keyboard, and cleanup evidence.
- Phase 3A keyboard order, skip-link activation, and Enter/Space mobile-menu activation were manually accepted on 2026-07-22; automated HTTP, real-backend browser, physical keyboard, and visual-preview evidence remain separate.
- Phase 3B responsive and semantic browser QA passed, but its full owner-performed keyboard-only Cart-to-confirmation journey remains pending and keeps that exit gate open.
- Review the trusted no-hook Medusa internal workflow boundary; public HTTP is guarded, but arbitrary new direct core imports are not universally intercepted.
- The empty-promotion internal Cart-bootstrap exception remains deliberately narrow.
- The setup SHA-256 digest/request snapshot pins a versioned policy derived from one completed provisioning record; the digest remains stable across authentication/session secret rotation, while retry and completion re-resolve the policy and fail on Store/plan/Region/location/channel/currency/country/provider drift. Its focused unit result is 2 suites/9 tests passing.
- The older identity-provisioning fingerprint must remain keyed because its normalized input contains the initial password, but it currently derives its HMAC key from vendor/JWT/cookie session secrets. A dedicated versioned fingerprint key/key-ring and rotation/migration runbook are required before production so auth-secret rotation cannot strand unfinished/replayed provisioning operations.
- Attention resolution, setup update/cancellation, and controlled plan changes are not implemented.

## Enterprise and production backlog

Local gate evidence and the guarded-local Phase 3A/3B storefront are not enterprise production readiness. Required future work still includes a dedicated versioned provisioning-fingerprint key/key-ring, production payment/fulfillment providers, shared rate limiting/locks/events, monitoring/alerting, backups and restore drills, DNS/SSL/deployment automation, billing/entitlements, operational repair/attention workflows, audit/observability expansion, later storefront customer/account/commerce capabilities, and a controlled Vendor-removal migration.

The previously exposed Neon credential rotation is unverified. Production migration remains blocked, and Neon must not be used for tests, diagnostics, migrations, backfills, or acceptance.

## Gate

Phase 3A's guarded-local exit gate is complete. Phase 3B is implemented and its automated, real-browser, restart, regression, and cleanup evidence passed, but its exit gate remains open pending the distinct owner-performed physical-keyboard journey. The selected current-tree Phase 2C real-backend API rerun passed and remains a separate evidence set.

Do not begin Phase 3C or extend the approved pilot automatically. Customer authentication/OTP, WhatsApp, billing, DNS/SSL/deployment automation, production providers or migration, and Vendor removal require separate owner approval and contracts. Production remains blocked, including by the unverified Neon credential rotation and provisioning-fingerprint key rotation design.
