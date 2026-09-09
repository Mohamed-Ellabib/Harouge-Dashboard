# LabibTech Commerce SaaS Roadmap

Last updated: 2026-09-06

## Current phase

Creation recovery 2026-09-08: existing Template 5/6 registry migrations are now
applied on the pinned guarded Supabase development project; both report ready.
Confirmation preflights template support before provisioning and resumes saved
checkpoints with visible progress. Four category/recovery integration cases pass
on disposable PostgreSQL. Older development-migration-pending notes below are
historical; production and other acceptance boundaries remain unchanged.

Template 6 checkout/shared-navigation follow-up 2026-09-06: sixth Design2 screen
at `/checkout` uses shared cart/address/shipping/COD/bank-transfer/recovery.
Screenshot Visa/UAE/AED remain standalone DEV-only and cannot charge or submit
an order without explicit supported-payment selection. Shared bottom dock now
covers every Template 6 route; product Add to cart and Buy it now use the selected
quantity. 62 focused frontend tests and TypeScript passed; full storefront run
retains two unrelated failures documented in HANDOFF. Browser/mobile QA and a
network-free preview confirmation test passed. DB/migration/production gates unchanged.

Template 6 Explore follow-up 2026-09-06: fifth Design2 screen at `/categories`
adds six generated category photos, independent editable Fresh Finds banner,
catalog-backed search/tabs/filtering and category links into the existing home.
New drafts seed six categories with the existing four products; older drafts
remain untouched. No marketplace/geolocation service is implied. 24 focused
storefront and 6 platform tests plus all three application type checks passed;
browser/design QA passed. DB/migration/production gates remain unchanged.

Template 6 cart follow-up 2026-09-06: fourth supplied Design2 screen uses shared
cart/favorites/navigation, generated reference-only product crops and a responsive
cart layout. No coupon/shipping authority or order submission added. Reference
AED20 delivery is only a visual estimate; real checkout remains canonical LYD.
Focused frontend/type/browser checks passed; DB/migration gates remain unchanged.

Template 6 product-detail follow-up 2026-09-06: the third supplied screen now uses
shared product, variant and cart authorities, with three separately editable gallery
photos for new drafts. Offer/contact controls prepare requests only; no discount,
messaging or payment service was introduced. Focused frontend/type/browser checks
passed. Database activation and authenticated commerce acceptance remain pending.

Template 6 follow-up 2026-09-06: the supplied discovery home now renders at `/`
and `/store`, with `/welcome` retained. Four new-draft starter products use generated
images and shared catalog/favorites/editing; prior empty drafts are not reseeded.
Social/location/AI details remain explicit mock/unconnected surfaces, not new backend
authorities. Focused frontend checks passed. Registry migration and DB acceptance
remain pending; this supersedes the welcome-only catalog note immediately below.

2026-09-06 owner amendment: Template 6 (`template-6`, ninth registry key) now has its
first turquoise welcome screen and append-only Studio/editor/creation registration.
It intentionally has no starter catalog until later designs are supplied. Its additive
constraint migration and DB confirmation acceptance remain pending. Browser design/CTA
checks and focused frontend tests/types passed; no production or phase gate changed.

2026-09-06 owner amendment: URBX is Studio Template 5 / registry key 8, with
welcome, home, shop, categories, product detail, cart, checkout, confirmation, help/support, order details and wishlist implemented one page at a time on shared creation/commerce.
Other URBX page designs remain pending. Its constraint migration is not yet
applied to interactive development. No production or phase gate is changed;
see the latest HANDOFF amendment.

The 2026-09-05 owner-authorized creation slice now covers Glow Beauty, Standard,
Drops and Luxe Commerce — Full Source. It adds resumable private
DB drafts, inline original-design editing, independent starter catalogs,
checkpointed confirmation, isolated DB trial orders and capability-protected
manual order progress. See `adr-store-creation-drafts.md` and the dated HANDOFF
section for exact scope and evidence. The focused disposable integration suite
passed 5/5; backend/platform/storefront typechecks and DB-disconnected editor
browser checks for all four templates at two viewport sizes passed. The earlier
Glow slice also checked merchant types. Drops is the seventh code-owned registry
key and fourth visible Studio choice. Development migrations and hardening used only the guarded pinned
Supabase runner. Full authenticated browser/keyboard acceptance, all-page design
parity, migration-snapshot reconciliation and the pre-existing Phase 3C operational
gates remain open. Wishlists remain per-browser; customer accounts, card charging,
courier automation and production/public traffic are not authorized by this slice.

Phase 2C Store identity provisioning is implemented at historical commit `8b02475`. The commerce-readiness gate closure, legacy Vendor freeze, platform dashboard, storefront, and guarded commerce pilot were committed and pushed on 2026-07-29.

The owner-authorized Phase 3A Customer Storefront Foundation is implemented. Its Store A/Store B real-backend matrix, backend-only restart, and physical keyboard pass are recorded; the guarded-local Phase 3A exit gate closed on 2026-07-22.

The owner-approved Phase 3B guarded-local commerce pilot is implemented in the same working tree. The exact capability/purchase contracts, Store-currency Product authority, guest Cart-to-Order journey, hostile two-Store matrix, merchant Order isolation, backend-restart persistence, responsive browser QA, regression, and cleanup passed on guarded disposable local PostgreSQL on 2026-07-22. The owner performed the distinct physical-keyboard Cart-to-confirmation journey on 2026-07-29, closing the Phase 3B guarded-local exit gate. No public pilot or production readiness is claimed.

On 2026-08-01 the owner approved Phase 3C planning and implementation under `phase-3c-mvp-contract.md`. By 2026-08-14 the working tree included the dedicated versioned provisioning-fingerprint key/key-ring, Store-owned size/color variants and stock foundations, the bounded Storefront-document publishing slice described in `adr-storefront-document-publishing.md`, and the guarded COD/manual-bank-transfer customer checkout slice. This is incremental implementation, not Phase 3C gate closure. Merchant payment verification and Order operations, WhatsApp delivery, custom-domain production operations, staging acceptance, production deployment, and public traffic remain incomplete or separately gated.

On 2026-08-11 the owner selected a fresh, pinned Supabase PostgreSQL project for normal interactive development. This replaces the persistent local database as the default development target, not the owned loopback disposable database used by automated tests and acceptance. It is development infrastructure only and does not constitute staging or production approval.

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

The branch is pushed to the configured private `origin` remote.

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

## Implemented in the bounded Phase 3C Storefront-document and manual-payment working tree

- `adr-storefront-document-publishing.md` now fixes six owner-approved code-owned template keys, immutable Store-scoped draft revisions, an atomic published pointer, strict bilingual plain-text content, and a separate protected manual-bank-transfer record.
- The SaaS module has Storefront document, immutable revision, and protected bank-configuration models plus deterministic provisioning/migration support. Draft replacement and publish use Store-scoped locking and expected-revision conflict checks; drafts never become a public fallback.
- Fail-closed Super Admin routes expose the exact template registry and protected Store draft/read/save/publish/preview operations. The platform editor consumes those operations and its bounded live frame hosts the real customer Storefront renderer.
- The permanent public profile reconstructs only the published schema/version, allowlisted template key, and bounded public content. It omits drafts, revision/audit/hash values, internal identifiers, and all bank-transfer configuration. An unpublished or malformed Storefront fails closed to an explicit setup state.
- The customer application consumes that exact public contract through one strict mapper and one shared commerce/router implementation. The six allowlisted compositions share catalog, Product, favorites, Cart, checkout, and Order behavior and add localized About, Contact, Delivery & Returns, Privacy, and Terms routes with RTL/LTR, bounded contact links, contrast-safe brand colors, and allowlisted Cairo typography.
- Checkout now advertises COD and advertises manual bank transfer only when the owning Store has a complete protected configuration. The public profile, capability response, templates, and pre-Order checkout state contain no bank values.
- `POST /store/saas/carts/:cart_id/complete` accepts an exact COD or bank-transfer choice, revalidates the public Store/Cart/readiness boundary, snapshots the selected Store's protected configuration, completes and verifies the owning Order, and returns only the reduced confirmation. Bank values are disclosed only in that successful bank-transfer confirmation, localized from the immutable Order-payment snapshot; COD responses contain no bank fields. Same-method retry is idempotent and a method change conflicts.

## Focused working-tree acceptance

`npm.cmd run test:commerce-readiness --workspace @dtc/backend` passes 12/12 on guarded disposable PostgreSQL. The commerce-resource unit suite passes 5/5 and the Phase 2B Cart/Order regression passes 12/12. Together, the accepted focused evidence covers plan gating, setup/replay/concurrency/retry, database-time transactional expired-lease handling, paused-owner fencing, stale-expiry preservation of concurrent renewal/completion, single-winner attention evidence, error sanitization, HTTP checkout/Order isolation, stale graph, exact shipping-rule/price corruption rejection, cross-Store fulfillment corruption, and authenticated Admin routes.

The immutable-policy-pin focused unit result is 2 suites/9 tests passing. Final guarded-local backend regression passed 23 suites/144 tests (62 unit, 10 module, 72 HTTP); backend and all frontend checks/builds passed; storefront Vitest passed 3 files/11 tests; SaaS generate reported no changes; and the unchanged Phase 3A guarded matrix/restart/cleanup passed. This is automated/local evidence, not the external manual run from 2026-07-14.

Focused 2026-08-14 Storefront-document evidence was run on the supported Node 22.23.1 runtime. Backend typecheck passed. The owned-disposable Storefront-document HTTP suite passed 7/7, covering the forward corrective migration, malformed/incomplete persisted-data fail-closed behavior, real Super Admin mutation/preview authorization, strict invalid-request no-mutation, publication, public Store isolation, and truthful draft/published template assignment totals. The existing public Storefront foundation HTTP suite passed 3/3 and the `vendors.unit` suite passed 6/6. Platform-dashboard typecheck and production build passed, with only the existing Vite chunk-size warning. Storefront typecheck, its then-current 4 Vitest files/21 tests, and production build passed, and its production bundle scan contained no private bank/revision/draft fields or development preview fixtures. No automated test accessed Supabase. The initial rendered Browser QA covered the read-only Admin template catalog/editor at the default 1265x720 viewport and 390x844 plus the Arabic `home-living` customer renderer at 390x844, mobile-menu-to-About navigation, console health, and zero horizontal document overflow. That initial result was limited visual-preview evidence and must not borrow the historical Phase 3A/3B browser evidence; the later complete matrix is recorded below.

Later focused 2026-08-14 evidence for the new slices is: the owned-disposable Phase 3C manual-payment HTTP suite reran 2/2 after correcting Arabic mojibake, with backend typecheck passing; the current owned-disposable Phase 2C commerce-readiness regression passed 13/13; platform-auth tests passed 9/9, with platform-dashboard typecheck and production build passing; storefront tests passed 6 files/30 tests, with storefront typecheck and production build passing; and the Supabase development/database guard suite passed 19/19. The Storefront production bundle scan contained no visual-preview fixture, enablement flag, selector helper, or mojibake strings. The authentication tests prove the timeout path aborts the actual login, session-creation, access-probe, logout, and password-reset requests instead of only rejecting a wrapper promise. The guard tests cover strict configuration, exact process ownership/lock parsing, bounded health classification, and disposable-test isolation without contacting Supabase. This is focused automated evidence only.

The final development-only Browser matrix passed 30/30 combinations: the exact three templates (`luxe-commerce`, `modern-market`, and `home-living`) x `ar-LY`/`en-LY` x 320/375/768/1024/1440 CSS pixels. Every combination had the requested template, correct language and direction, one `h1` and one `main`, a skip link, no horizontal document overflow, and no mojibake. Focused keyboard acceptance proved visible skip-link focus and transfer to main content. At 390 CSS pixels, the Admin Store Details, Vendor Details, Settings, Templates Studio, Domains, Requests, Plans, and Analytics routes remained vertically scrollable with no horizontal document overflow. This is renderer/responsive visual-preview evidence only, not authenticated real-backend shared-commerce, real COD/bank-transfer, positive-authentication, full physical-keyboard, staging, or production acceptance.

On 2026-08-24 the owner explicitly authorized a fourth code-owned key, `luxe-commerce-full`, as a source-faithful port from the supplied Al-Sanousi frontend while retaining the original three unchanged. Its copied legacy data/auth helpers are reference-only; the runtime adapter remains on LabibTech's shared commerce authority. The historical 30-case result above does not cover the new key, which requires its own automated and rendered evidence before staging rehearsal.

On 2026-08-29 the owner explicitly authorized a fifth code-owned key, `standard`. The Admin registry, Store editor, new-Store template selector, public profile allowlist, canonical renderer, and real shared catalog/favorites/Cart/variant/checkout/confirmation surfaces now recognize it. Live mode does not use its design fixtures for promotions, ratings, shipping, payment, address, or Order state. This amendment remains guarded-development work and does not authorize production deployment or public traffic.

On 2026-08-31 the owner explicitly authorized a sixth code-owned key, `glow-beauty`, as the third visible Templates Studio selection. The exact Admin registry/editor/new-Store selector/public profile/canonical renderer path used by `standard` now recognizes it, while its live adapters use the shared navigation, catalog, Product variants, favorites, Cart, shipping, COD/manual bank transfer, checkout, and reduced confirmation authorities. The owner's later correction authorizes explicit Super Admin installation of the six-product beauty reference, images, LYD prices, size/color variants, managed stock, and bilingual draft into an empty commerce-ready Store as ordinary Store-owned data. The operation is expected-revision guarded, idempotent, and refuses to overwrite or merge with an existing merchant catalog; template fixtures never become a runtime fallback. This amendment remains guarded-development work and does not authorize production deployment or public traffic.

Focused evidence for the corrected amendment passed on 2026-08-31: backend typecheck and production build; owned-disposable PostgreSQL Storefront-document HTTP 8/8; public Product sanitizer unit 2/2; Storefront production build and 31 files/65 tests; Platform Dashboard production build and 4 files/20 tests. The guarded pinned Supabase development runner applied `20260831100000`, installed and published the six Store-owned Glow Products, variants, managed inventory, exact images, and bilingual Storefront document, then reported seven active fixture Stores, eight Store access records, and a 3/3 backend health check. Browser QA rendered the canonical editor iframe with all six real-shaped Product records and verified that every Product/category/hero/offer image loaded at its natural dimensions, with LYD prices and no fabricated runtime review counts. This remains scoped guarded-development evidence, not authenticated Admin Browser, physical-keyboard, staging, production, public-traffic, or gate-closure evidence; automated tests used disposable PostgreSQL and no work accessed Neon.

Focused implementation evidence on 2026-08-29 is green: Storefront typecheck and production build passed; 17 Storefront test files passed with 49 tests; Platform Dashboard typecheck, production build, and focused Templates Studio/editor/renderer tests passed; backend typecheck and the disposable-PostgreSQL Storefront-document integration passed 7/7. The guarded managed-development runner applied migrations `20260824100000` and `20260829100000`, completed safe link synchronization, and restarted the loopback backend. Rendered development checks exercised Standard catalog → Product variant → Cart → address/shipping → COD → Order confirmation and its shared 430px mobile/1440px desktop compositions without fresh console errors. This evidence is development-scoped and does not close staging, production, public-traffic, authenticated Admin Browser, or Phase 3C exit gates.

Separate interactive managed-development evidence completed through the guarded runner on 2026-08-14: the core migration operation applied Store Order-payment migration `20260814200000`, schema hardening passed, and the guarded single-connection probe passed. After the guarded backend restarted in `develop` mode, five bounded loopback health requests returned 200 and `backend:status` classified the run healthy with 3/3 probes. Synthetic invalid-login requests sent directly to the backend and through the platform-dashboard proxy returned the expected 401 without timing out. This proves the bounded negative-authentication path and live development runtime only; it is not positive-credential authentication, rendered COD/bank-transfer Browser, staging, production, public-traffic, or gate-closure evidence. A sustained `backend:monitor` soak was not recorded.

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

- The platform-owner System Settings surface now has a real revisioned SaaS-module singleton and Super Admin-only GET/PUT API for whole-system identity and official contact data. A separate Super Admin-only API manages platform administrator accounts. Store provisioning/default settings remain in their dedicated Store operations surfaces; this work does not add excluded automated billing, production email delivery, or production deployment.
- The bounded Storefront-document implementation has automated contract/build evidence plus a historical complete 30-case development-only renderer matrix across the original three templates, both directions, and the five required viewport widths. The fourth, fifth, and sixth templates require their own complete matrix. The Admin live preview is sanitized and truthful and now hosts the real customer renderer, but authenticated real-backend all-template shared-commerce checks, real COD/bank-transfer journeys, and full physical-keyboard acceptance remain required.
- Protected bank-transfer configuration is not present in the public Store profile, capability response, or templates. The new checkout path snapshots it privately and discloses only the allowlisted localized values after the owning bank-transfer Order completes; COD discloses none. Merchant verification and fulfillment operations remain outstanding.
- The pinned managed Supabase development project has the bounded Storefront and Order-payment schema applied. Core migration `20260814100000`, safe link synchronization, forward corrective migration `20260814110000`, and Store Order-payment migration `20260814200000` completed; schema access was re-hardened and the guarded single-connection probe passed. The guarded backend passed five bounded health requests and `backend:status` classified its recorded `develop` run healthy with 3/3 probes; a sustained `backend:monitor` soak was not recorded. Automated acceptance continues to use owned disposable loopback PostgreSQL; none of this is staging or production evidence.

- The selected current-tree Phase 2C real-backend API rerun passed; keep it separate from historical, Phase 3B browser, physical-keyboard, and cleanup evidence.
- Phase 3A keyboard order, skip-link activation, and Enter/Space mobile-menu activation were manually accepted on 2026-07-22; automated HTTP, real-backend browser, physical keyboard, and visual-preview evidence remain separate.
- Phase 3B responsive and semantic browser QA passed on 2026-07-22, and the owner performed the full keyboard-only Cart-to-confirmation journey on 2026-07-29, closing that exit gate.
- Review the trusted no-hook Medusa internal workflow boundary; public HTTP is guarded, but arbitrary new direct core imports are not universally intercepted.
- The empty-promotion internal Cart-bootstrap exception remains deliberately narrow.
- The setup SHA-256 digest/request snapshot pins a versioned policy derived from one completed provisioning record; the digest remains stable across authentication/session secret rotation, while retry and completion re-resolve the policy and fail on Store/plan/Region/location/channel/currency/country/provider drift. Its focused unit result is 2 suites/9 tests passing.
- The older identity-provisioning fingerprint must remain keyed because its normalized input contains the initial password, but it currently derives its HMAC key from vendor/JWT/cookie session secrets. A dedicated versioned fingerprint key/key-ring and rotation/migration runbook are required before production so auth-secret rotation cannot strand unfinished/replayed provisioning operations.
- Attention resolution, setup update/cancellation, and controlled plan changes are not implemented.

## Enterprise and production backlog

Local gate evidence and the guarded-local Phase 3A/3B storefront are not enterprise production readiness. Phase 3C implements the dedicated versioned provisioning-fingerprint key/key-ring and rotation runbook; protected-environment key provisioning and isolated rehearsal remain required. Other future work includes shared rate limiting/locks/events, monitoring/alerting, backups and restore drills, DNS/SSL/deployment operations, merchant payment verification and fulfillment operations, audit/observability expansion, and a controlled Vendor-removal migration.

The previously exposed Neon credential rotation is unverified. Production migration remains blocked, and Neon must not be used for tests, diagnostics, migrations, backfills, or acceptance.

## Gate

Phase 3A's guarded-local exit gate is complete. Phase 3B's guarded-local exit gate closed on 2026-07-29: its automated, real-browser, restart, regression, and cleanup evidence passed on 2026-07-22, and the owner performed the distinct physical-keyboard journey on 2026-07-29. The selected current-tree Phase 2C real-backend API rerun passed and remains a separate evidence set.

Phase 3C planning and implementation are owner-authorized as of 2026-08-01 only within `phase-3c-mvp-contract.md`. Customer accounts/OTP, automated billing, online payments, courier integration, returns, public merchant signup, production migration, and Vendor removal remain excluded. Production deployment and public traffic require separate owner approval. Production remains blocked until the Phase 3C exit conditions pass, including protected-environment fingerprint-key rotation rehearsal, shared runtime infrastructure, backups/restore, monitoring, edge/DNS/SSL, and staging isolation evidence.

The bounded Storefront-document, manual-payment, authentication-cancellation, and development-runtime diagnostic work and its 2026-08-14 evidence do not close the Phase 3C gate. Managed-development Order-payment migration, hardening, probe, live health/status checks, and the 30-case development-only renderer matrix are complete development evidence. A sustained monitor soak, positive-credential authentication journey, authenticated real-backend all-template shared-commerce and COD/bank-transfer Browser journeys, full physical-keyboard acceptance, staging acceptance, and the remaining production prerequisites are still pending. No production deployment or public traffic is authorized.
