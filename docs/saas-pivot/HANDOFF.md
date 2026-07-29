# Medusa SaaS Pivot Handoff

Last reconciled: 2026-07-29

This is the canonical orientation document for a new laptop, developer, or Codex session. Read it before changing the repository. Detailed decisions live in the other files in this directory.

## Repository snapshot

- Branch: `feat/saas-multi-store-pivot`
- Accepted Phase 2C implementation commit: `8b02475aba2ae89637f7b51057c5da7de2dfbf06`
- Later handoff documentation commit: `4a7497f`
- Phase 2C gate-closure, legacy-freeze, platform-dashboard, Phase 3A storefront, and Phase 3B pilot work: committed on 2026-07-29 as `8d58549` (backend), `0cc8903` (platform dashboard), `a369c34` (storefront), and `d043ce7` (docs/manifests)
- Working tree: clean at that reconciliation; inspect `git status` before editing
- Configured Git remotes: `origin` at `https://github.com/Ellabib-tech/EcommernceSaas.git`; `feat/saas-multi-store-pivot` and `master` pushed on 2026-07-29
- Runtime contract: Node.js 20 through 23, npm workspaces/Turbo, Medusa 2.17, PostgreSQL
- Phase 3A browse-only storefront: implemented; guarded real-backend Store A/Store B browser matrix and manual keyboard acceptance recorded, with the guarded-local exit gate closed on 2026-07-22
- Owner-approved Phase 3B guarded-local commerce pilot: implemented; guarded API/browser/restart/cleanup evidence passed on 2026-07-22, and the owner performed the distinct physical-keyboard Cart-to-confirmation journey on 2026-07-29, closing the guarded-local exit gate
- Production storefront: not deployed and not production-ready

Do not invent a gate-closure commit. Do not clean, reset, overwrite, or commit the working tree without inspecting ownership/scope and receiving any needed owner approval.

## Accepted phase commits

| Commit    | Phase     | Outcome                                              |
| --------- | --------- | ---------------------------------------------------- |
| `3f5f088` | Baseline  | clean pre-hardening baseline                         |
| `3bc7f49` | Phase 0.5 | guarded test foundation and four security fixes      |
| `f6b1b95` | Phase 1   | authoritative request Store contexts and isolation   |
| `939b6a6` | Phase 2A  | permanent Tenant/Store model and Product ownership   |
| `a769519` | Phase 2B  | immutable Cart and whole-Order Store ownership       |
| `8b02475` | Phase 2C  | idempotent platform-only Store identity provisioning |

The commerce-readiness gate closure described below is not in `8b02475`; it is uncommitted working-tree work. The owner-authorized Phase 3A Customer Storefront Foundation is also implemented only in this working tree. Its automated, visual-preview, guarded real-backend browser, and manual keyboard evidence is recorded below. Its guarded-local exit gate closed on 2026-07-22; no production or external acceptance is claimed.

## Product definition

This is a multi-store commerce SaaS, not a marketplace checkout and not one merchant's store dashboard. A client may own one or more independently branded Stores/storefronts/domains while sharing the platform backend and infrastructure. Platform administrators provision and operate Stores. Merchant owners sign into a restricted dashboard and manage only their Store. Platform administrators retain cross-platform control.

One Tenant may own multiple StoreProfiles. Medusa Store is the permanent commerce boundary. Sales Channel scopes availability but is not ownership.

## Repository layout

- `apps/backend`: Medusa backend, bundled Medusa Admin extensions, modules, APIs, workflows, migrations, scripts, and tests.
- `apps/vendor-dashboard`: separate Arabic-first merchant React/Vite dashboard on port 5173.
- `apps/platform-dashboard`: uncommitted owner/platform React/Vite dashboard on port 5174, including the branded sign-in and canonical client/first-Store provisioning UI.
- `apps/storefront`: uncommitted Arabic-first customer storefront on port 5175, with Phase 3A browse routes plus the guarded-local Phase 3B guest Cart, checkout, and reduced confirmation routes.
- `docs/saas-pivot`: ADRs, ownership rules, risks, runbooks, and phase evidence.
- `scripts/run-workspace-tests.js`: root test orchestrator and expected-test guard.

The platform Admin/backend is served at `http://localhost:9000/app`. The owner dashboard proxies authenticated platform calls to the backend during development. Its operational destinations do not mean billing, DNS, deployment, monitoring, or all enterprise functions are implemented.

## Canonical ownership

- Tenant groups one or more StoreProfiles.
- StoreProfile contains SaaS state, plan, handle, brand/domain relations, and a temporary legacy Vendor reference.
- StoreProfile links one-to-one to one Medusa Store.
- MerchantMembership authorizes one merchant account for one StoreProfile.
- StoreDomain is the permanent normalized hostname boundary.
- StoreBrand is allowlisted for public output.
- Product belongs to exactly one Medusa Store and its allowed Sales Channel.
- Cart belongs immutably to exactly one Medusa Store.
- Order belongs immutably to exactly one Medusa Store.
- Publishable key maps to exactly the Store Sales Channel and must agree with the request hostname.
- Legacy Vendor/VendorMember remain compatibility/authentication storage and cannot override permanent ownership.

Important links are StoreProfile-Store, Store-Product, Store-Cart, and Store-Order. Database uniqueness prevents a Cart or Order from having multiple owners.

## Request contexts

MerchantStoreContext resolves signed merchant session -> active membership -> active StoreProfile -> active Tenant -> exactly one Medusa Store -> allowed Sales Channel. Missing, inactive, or ambiguous relationships fail closed.

PublicStoreContext resolves actual hostname -> verified StoreDomain -> active StoreProfile/Tenant/Store and requires the matching single-channel publishable key. Correct hostname with wrong key, or correct key with wrong hostname, returns 404.

CartStoreContext adds immutable Cart ownership, Region, currency, channel, publishable-key context, and status. Access/mutation must preserve the same hostname, key, and Store for the Cart lifetime.

## Important HTTP surfaces

Platform-only:

- `POST /admin/saas/provisioning`
- `GET /admin/saas/provisioning/:id`
- eligible safe `DELETE /admin/saas/provisioning/:id`
- `POST /admin/saas/stores/:store_profile_id/commerce-setup` (working tree)
- `GET /admin/saas/commerce-setup/:id` (working tree)
- `GET /admin/saas/stores/:store_profile_id/commerce-readiness` (working tree)
- read-only/transitional `/admin/vendors*` compatibility surfaces

Merchant:

- `POST /vendor/auth/login`
- `POST /vendor/auth/logout`
- `POST /vendor/auth/password`
- `GET /vendor/me`
- `GET|POST /vendor/products`
- `GET|PATCH /vendor/products/:id`
- `GET /vendor/orders`
- `GET /vendor/orders/:id`

Public/storefront API:

- `GET /store/vendors/resolve`
- `GET /store/vendors/:handle`
- Medusa `/store/products*`
- Medusa `/store/carts*`
- shipping-option and payment-collection/session routes used by checkout

Public requests must send the real hostname in `Host` and the Store token in `x-publishable-api-key`.

## Store identity provisioning

`provisionSaasStoreWorkflow` establishes Tenant, Medusa Store, StoreProfile, Sales Channel, publishable key/channel link, exact compatible Region/currency, Stock Location, StoreDomain, StoreBrand, legacy Vendor adapter, merchant owner, MerchantMembership, plan, checkpoints, events, and a database lease.

Activation is graph-gated. StoreProfile and legacy Vendor stay draft until invariants and both request contexts resolve. Same key/input replays; changed input conflicts. Plaintext passwords and key tokens are excluded from durable state/status/results.

The platform supplies a temporary owner password, the application stores only its hash, and password change is required. There is no invitation email. Credentials must be delivered out of band. A storefront key is obtained through controlled platform operations; never expose Admin bearer tokens or server secrets.

Allowed plans are `starter_whatsapp` and `professional_commerce`.

## Region decision

Exact compatible Region sharing is accepted. Multiple Stores may reuse one Region only when currency and the complete normalized country set match. Region is shared configuration, never Store ownership. Each Store keeps its own allowed/default Region reference and all Store-specific links.

This resolves the first acceptance gap from 2026-07-14 by policy.

## Commerce-readiness gate-closure working tree

The current working tree separates Store identity from online-checkout capability:

- StoreCommerceReadiness: one StoreProfile readiness row;
- StoreCommerceSetup: durable idempotent setup/checkpoints/result;
- StoreCommerceSetupEvent: append-only sanitized evidence;
- StoreCommerceSetupLease: database Store-level execution exclusion.

Starter is `not_required` and checkout-disabled. Professional begins `pending`, becomes `configuring` during setup, and becomes `ready` only after the setup and live graph validate. Ordinary failure is `failed`. An expired retained lease makes both setup/readiness `requires_attention` and replay is rejected. There is no attention-resolution operation. `disabled`/`cancelled` are reserved states.

Setup accepts only shipping name, optional description, and amount. The server derives Store, Region, countries, currency, location, channel, local providers, Shipping Profile, deterministic Fulfillment Set/Service Zone/Shipping Option, prices, and IDs.

The Store-specific graph requires:

- deterministic Fulfillment Set and exactly one country-only Service Zone;
- exclusive Store Stock Location-to-Fulfillment Set relationship in both directions;
- Store location exclusive to its Sales Channel;
- exactly one deterministic Shipping Option in the zone;
- exact provider/profile/zone/type/rules/currency amount/Region amount;
- pinned Store Shipping Profile and singleton option allowlist;
- enabled `manual_manual` fulfillment and `pp_system_default` payment links for the local gate.

Shared exact Region/default framework profile/providers are not ownership. Set, zone, option, location relationship, allowlist, Product, Cart, and Order remain Store-specific.

Before reservation, setup resolves exactly one completed provisioning record and proves that Tenant, StoreProfile, Medusa Store, plan, Region, location, channel, currency, and countries still match. A versioned server-derived policy including the local provider strategy is stored safely and included with the public shipping input in a canonical SHA-256 digest that is independent of rotating authentication/session secrets. Retry and final completion re-resolve it and fail on drift. No reconfiguration/update workflow exists.

## Checkout enforcement boundary

Public HTTP deep-gates Cart creation/mutation, shipping listing/calculation/addition, payment collection/session operations, and completion. The readiness row is not trusted alone: the referenced setup must be `completed` and the current graph must still match.

Project hooks deep-gate hook-capable create/update Cart, add/update item, add shipping, non-empty promotions, customer transfer, both shipping-list workflows, and completion. The empty-promotion operation used by Medusa during Cart bootstrap intentionally returns early before Store-Cart linking.

Core workflows without a usable installed hook remain trusted internal surfaces. Current examples are line-item deletion, payment-collection creation, payment-session creation, and shipping-price calculation. Public HTTP is guarded, but arbitrary new direct imports are not universally intercepted. Keep them behind guarded routes/wrappers and review all new call sites.

## Legacy Vendor lifecycle freeze

- `POST /admin/vendors` is disabled and points callers to canonical provisioning.
- A Vendor referenced by a permanent StoreProfile cannot be PATCHed or DELETEd through legacy routes.
- Unmapped historical Vendors retain transitional cleanup behavior.
- VendorMember authentication/account controls and product compatibility links remain.
- Vendor removal is not authorized.

The owner platform dashboard reflects canonical client/Store provisioning and read-only legacy lifecycle. It does not create a second Store control plane.

## Phase 3A customer storefront working tree

The owner-authorized Phase 3A foundation adds an Arabic-first, responsive, browse-only customer application at `apps/storefront`. Implemented routes are `/`, `/products`, and `/products/:handle`. They provide Store branding, catalog preview/list, Product detail, search, sort, mobile navigation, and explicit empty/not-found/unavailable states.

The browser uses relative `/store/*` requests and maps unknown network responses into exact profile/catalog/detail DTOs before rendering. Production Store identity remains the actual hostname plus the controlled matching per-deployment publishable key. `x-store-handle` and local visual-preview data are development-only; a production bundle scan found no preview data, development Store selector, or plan strings.

The backend public Product response boundary recursively removes `metadata`, and the existing PublicStoreContext continues to enforce exact Host, key, channel, active permanent Store, and canonical Product ownership. Two-Store HTTP acceptance proves matching Store profiles, only canonical published Products, crossed Host/key failure, cross-Store Product denial, and inactive/unverified failure.

Both plans remain browse-only in Phase 3A. The UI does not receive or infer checkout readiness and renders no Cart, checkout, customer authentication, OTP, WhatsApp, billing, DNS/deployment, or Vendor-removal action.

## Security work present

- Product ownership/channel are derived server-side.
- Product reads require canonical Store ownership.
- Password changes/resets/disable revoke sessions.
- Password verification is bounded, asynchronous, rate-limited, and non-enumerating.
- Public output uses explicit allowlists.
- Storefront network payloads are reduced to exact client DTOs, and public Product `metadata` is stripped recursively at the backend response boundary.
- Cart items require Product Store = Cart Store.
- Merchant Order access uses whole-Order Store ownership.
- Provisioning uses durable idempotency, graph-gated activation, safe serialization, and explicit owner reuse.
- Commerce setup uses durable Store exclusion, deterministic exclusive fulfillment resources, live fail-closed validation, and sanitized unknown failures.

Production still needs shared rate limiting/locks/events, monitoring, backups/restore, DNS/SSL/deployment, billing/entitlements, production providers, repair/attention operations, and reviewed credential/incident management.

## Historical committed validation

For Phase 2C commit `8b02475`, the recorded automated result was 110 passing tests:

- unit: 46;
- module integration: 8;
- HTTP integration: 56;
- total: 110 passed, 0 failed.

Backend lint/typecheck/build, merchant dashboard lint/typecheck/build, migration apply/rollback/reapply, and link synchronization passed for that committed tree. These numbers do not include the current gate-closure changes.

## Current focused working-tree validation

Accepted guarded-local evidence for the current working tree is: commerce-readiness integration 12/12, commerce-resource unit tests 5/5, and the Phase 2B Cart/Order regression 12/12. The commerce suite covers plan gating, deterministic setup/replay, concurrency, retained retry, database-time transactional expired-lease handling, paused-owner fencing, stale-expiry observation preserving a concurrent renewal/completion, single-winner attention evidence, unknown-error sanitization, automated integration HTTP checkout and canonical Order isolation, stale graph, exact shipping-rule/price corruption rejection, cross-Store fulfillment corruption, and authenticated Admin setup/status/readiness handlers.

The immutable provisioning-derived policy pin is implemented: its versioned server-derived policy is included in the setup SHA-256 digest/snapshot and is re-resolved on retry/completion. Its focused unit result is 2 suites/9 tests passing.

Final guarded-local verification for this working tree passed after Phase 3B: backend regression 23 suites/144 tests (62 unit, 10 module, 72 HTTP); backend typecheck, lint, and build; platform, vendor, and storefront typecheck/lint/build; storefront Vitest 3 files/11 tests; SaaS migration generation with no changes; and the unchanged Phase 3A guarded harness matrix/restart/cleanup. This closes automated local verification evidence only. The working tree remains uncommitted.

## Phase 3A guarded-local evidence

Recorded storefront evidence is:

- Vitest: 2 files, 7 tests passing;
- storefront typecheck and production build passing;
- production bundle scan: no visual-preview data, development Store selector, or plan strings;
- backend Phase 3 exact public-field and Store-isolation contract: 1 suite, 3 tests passing;
- earlier focused Phase 3 plus Phase 1/2 isolation regression: 5 suites, 34 tests passing;
- browser QA for home, catalog, detail, search, sort, mobile menu, empty, not-found, and unavailable states at 320, 375, 768, 1024, and 1440 CSS pixels, with RTL, one `h1`, and no horizontal overflow.
- repeatable `npm.cmd run storefront:accept` harness guarded by the exact disposable local database contract; it resets only `medusa_phase05_disposable`, migrates, seeds two synthetic Store graphs with no customer or merchant credentials and runtime-only public keys, starts the built backend plus two hostname/key storefront deployments, supports backend-only restart, and decrypts then removes its ephemeral key handoff during startup;
- real-backend browser QA for Store A and Store B home/catalog/detail identity and Product isolation, cross-Store Product denial, both crossed hostname/key directions with no stale Store rendering, mobile/desktop RTL with no horizontal overflow, generic unavailable announcements, clean browser warning/error logs, and the same resolution after a backend-only restart;
- inspection confirming native links/buttons, a focusable skip link, visible focus state, expanded-state semantics, and a polite error live region;
- owner-performed physical keyboard acceptance on 2026-07-22: from the initial body focus, one Tab exposed the skip link and Enter moved focus to main content; after reload, three Tabs reached `فتح القائمة`, Enter opened the mobile menu, and Space closed it. Focus visibility and order were accepted.

The earlier wide-viewport browser screenshots used explicitly enabled local visual-preview data and remain presentation-only evidence. The later guarded smoke used the real Medusa backend and permanent Store context. The in-app browser runtime did not reliably synthesize native keyboard activation, so its semantics inspection was kept separate from the owner-performed physical keyboard pass rather than being counted as accessibility acceptance by itself.

## Phase 3B guarded-local implementation and evidence

The approved pilot is implemented only in this working tree. It adds exact public `GET /store/saas/commerce-capabilities` and `GET /store/saas/products/:handle/purchase-options` responses, server-owned Store currency on merchant Product writes, a same-origin guest Cart, quantity/removal, delivery details, the one deeply allowed shipping option, local `pp_system_default` payment-session creation, Cart completion, an in-memory reduced confirmation, and the existing reduced owning-merchant Order view. Unsupported Product shapes, mismatched currencies, hostile hostname/key/Product/Cart/shipping/payment/Order combinations, stale graphs, and non-ready Stores fail closed.

The storefront persists only the opaque Cart ID in versioned same-origin `sessionStorage`. Email, phone, address, Product/Cart/Order payloads, publishable keys, provider details, and upstream errors are not persisted. The reduced confirmation omits Order/customer/Store IDs, address, contact, payment/session/provider data, metadata, internal history, and raw fulfillment details.

Recorded Phase 3B storefront evidence, kept separate from the Phase 2C API rerun, is:

- a real built Store A browser journey from Product through Cart, delivery, shipping, local payment, and reduced confirmation, totaling 125.000 LYD plus 15.000 LYD shipping = 140.000 LYD;
- an independent ready Professional Store B plus crossed Host/key, cross-Store Product, hostile Cart, shipping, and payment cases that fail closed;
- owning merchant A can list/read the reduced Order and merchant B receives 404, both before and after a verified backend-only restart;
- responsive RTL checks at 320, 375, 768, 1024, and 1440 CSS pixels with no horizontal overflow, required field labels, one main/heading structure, skip-link/focus semantics, invalid-email focus, and zero browser warnings/errors;
- a real-browser mapper correction discovered during acceptance: Medusa Cart line `total` is optional unless expanded, so the exact mapper safely derives it from `unit_price * quantity`;
- production/source artifact scans found no visual-preview Store selector, demo Cart, hidden deferred controls, database environment values, private keys, credentials, publishable-key token, or persisted PII;
- normal harness shutdown left ports 9000/5175/5176/55432 closed, the exclusive lock absent, the disposable smoke directory empty, and no owned Phase 3B processes; the disposable schema was scrubbed.

The owner-selected current-tree Phase 2C real-backend API rerun also passed inside the guarded harness, but remains a separate evidence set: a runtime-only synthetic platform administrator authenticated through real HTTP, provisioned an additional Professional Store through the real Admin surface, and completed commerce setup/readiness without real credentials or Neon. This does not rewrite the historical 2026-07-14 evidence.

Automated semantic inspection is not physical-keyboard acceptance. On 2026-07-29 the owner performed the distinct Phase 3B keyboard-only journey through add-to-Cart, quantity/removal, checkout fields, shipping selection, review, and completion inside the guarded harness; focus remained visible and no pointer input was required. Together with the automated, real-browser, persistence, regression, and cleanup checks recorded on 2026-07-22, this closed the Phase 3B guarded-local exit gate.

`npm.cmd run storefront:accept` is destructive only to the exact loopback `medusa_phase05_disposable` schema. It requires Node 20 through 23, free ports 9000/5175/5176, and exclusive use of the disposable database. The wrapper records both wrapper and child ownership, refuses overlap, starts the built backend bound to `127.0.0.1`, supplies runtime-only synthetic session secrets, keeps backend secrets out of Vite, verifies A/B/crossed contexts before and after restart, and on normal shutdown scrubs the synthetic schema and stops embedded PostgreSQL. During the 2026-07-22 acceptance shutdown, owned HTTP processes and the schema stopped cleanly, but the third-party Windows embedded-PostgreSQL stop path waited on an already-fired process event; the exact owned process was terminated and ports, lock, schema handoff, and temporary artifacts were verified clean. The wrapper now performs a bounded `pg_ctl` stop against only its owned Windows data directory and clears the stale process reference; a fresh guarded wrapper probe then exited successfully with the disposable port and lock released. The local Vite `/store` proxy is acceptance infrastructure; it does not certify or replace the production edge allowlist, forwarding-header stripping, timeout, and redacted-logging contract.

## Historical external real-HTTP acceptance

On 2026-07-14, a temporary ignored runner recreated guarded local PostgreSQL, ran normal migrations, created a real platform admin, started the real backend/Admin, and used real HTTP routes. It was removed and never committed.

Recorded outcome for committed Phase 2C:

- Admin `/app`: 200;
- 33/33 recorded API operations matched expectation;
- Starter Store A and Professional Store B provisioned with 201;
- provisioning survived backend restart;
- owners logged in and created/listed only their Product;
- cross-merchant Product reads/updates returned 404;
- matching domain/key pairs returned 200 and crossed pairs returned 404;
- public Product lists were Store-isolated;
- Cart A accepted Product A, rejected Product B, and was inaccessible from Domain B/Key B;
- no generated credential appeared in captured output/snapshots/API responses;
- Neon was not accessed.

The run found:

1. one exact compatible Libya/LYD Region was reused. This is now accepted policy;
2. no Shipping Option existed, so real checkout, resulting Order ownership, and merchant-B Order denial were not exercised.

The current automated 12/12 suite now exercises the second journey, but the 2026-07-14 external run has not been repeated. Keep these evidence sets separate.

The historical status API did not expose raw Brand/Domain/Membership IDs. It proved distinct records and resolving relationships without raw-ID comparison.

## Database and secret safety

Never use Neon for development tests, migrations, diagnostics, acceptance, or backfills. The previously exposed Neon password rotation has not been verified. Never reproduce the old value in prompts, documents, commands, fixtures, or logs. Production migration is blocked until rotation is confirmed and the owner explicitly approves the runbook.

Identity provisioning fingerprints the normalized password-bearing request with HMAC, so it must not be converted to an unkeyed digest. Its key currently follows the first available vendor/JWT/cookie session secret. Before production, introduce a dedicated versioned provisioning-fingerprint key/key-ring and rotation/migration runbook; otherwise authentication-secret rotation or priority changes can strand unfinished/replayed provisioning operations. This is separate from the commerce-setup SHA-256 digest, whose payload contains no credential and is intentionally stable across session-secret rotation.

Tests require `NODE_ENV=test`, a dedicated `TEST_DATABASE_URL`, disposable acknowledgement, a URL different from `DATABASE_URL`, and local PostgreSQL or an explicitly isolated disposable branch. Never silently fall back to `DATABASE_URL`.

The current guard expects database `medusa_phase05_disposable`; prior acceptance used local PostgreSQL on port 55432. Preserve every guard even if the port changes.

Ignored environment files are not part of Git history. Recreate them securely and never transfer the old Neon credential as a production value.

## Commands

```powershell
npm.cmd ci
npm.cmd run test:commerce-readiness --workspace @dtc/backend
npm.cmd run test:with-db --workspace @dtc/backend
npm.cmd run lint
npm.cmd run build
npm.cmd run typecheck --workspace @dtc/backend
npm.cmd run typecheck --workspace @dtc/vendor-dashboard
npm.cmd run typecheck --workspace @dtc/platform-dashboard
npm.cmd run typecheck --workspace @dtc/storefront
npm.cmd run test --workspace @dtc/storefront
npm.cmd run storefront:accept
npm.cmd run commerce:accept
node apps/backend/scripts/run-disposable-medusa.js db:migrate
npm.cmd run backend:dev
npm.cmd run vendor:dev
npm.cmd run platform:dev
npm.cmd run storefront:dev
```

URLs:

- Medusa platform Admin/backend: `http://localhost:9000/app`
- merchant dashboard: `http://127.0.0.1:5173/`
- owner platform dashboard: `http://127.0.0.1:5174/`
- customer storefront: `http://127.0.0.1:5175/`

## Current gate, not an automatic next milestone

Phase 3A was separately authorized. Its browse-only implementation, guarded real-backend browser matrix, backend-only restart, and distinct physical keyboard pass are recorded. The guarded-local Phase 3A exit gate closed on 2026-07-22. This result remains uncommitted, local-only evidence and does not authorize production or external acceptance.

`adr-customer-commerce-pilot.md` and `phase-3b-commerce-pilot-contract.md` define the owner-approved and now implemented Phase 3B boundary: an assisted guarded-local Professional Store, one simple Store-currency Product variant, explicit public checkout capability, guest Cart/shipping/local-payment completion, reduced confirmation, and owning-merchant Order visibility with hostile Store B denial. The vendor Product currency authority is fixed and covered. The remaining exit-gate item is the distinct owner-performed physical-keyboard journey.

Continue to keep automated HTTP, real-backend browser, physical keyboard, and earlier visual-preview evidence separate. Preserve the trusted internal no-hook workflow boundary when reviewing new call sites. Commit only if/when requested; never push or configure a remote without explicit approval.

The owner-selected current-tree Phase 2C real-backend rerun passed on guarded disposable local PostgreSQL on 2026-07-22 and is reported separately from Phase 3B Storefront browser, pending physical accessibility, and cleanup evidence. Neither evidence set used Neon.

Do not extend Cart/checkout beyond the approved Phase 3B contract, close its gate without the physical-keyboard record, or add customer authentication/OTP, WhatsApp, billing, DNS/SSL or deployment automation, production providers/migration, or Vendor removal unless separately approved. Resolve the provisioning-fingerprint key-versioning/rotation blocker and the other documented operational blockers before any production rollout. Neon remains prohibited for development and acceptance. Local storefront and commerce success is not production readiness.

## New Codex session bootstrap prompt

```text
Read AGENTS.md and docs/saas-pivot/HANDOFF.md completely before doing anything.
Then run git status --short --branch and git log --oneline -8.
Confirm the expected branch, historical Phase 2C commit, uncommitted gate-closure
and completed guarded-local Phase 3A working tree, database safety rules,
remaining production blockers, and exact requested phase boundary. Do not access Neon, expose environment
values, reset the dirty tree, expand beyond Phase 3A, commit, push, or change scope
without approval.
```

## Detailed source documents

- `roadmap-status.md`
- `current-architecture.md`
- `data-ownership-matrix.md`
- `security-risks.md`
- `adr-store-provisioning-workflow.md`
- `adr-store-commerce-readiness.md`
- `phase-2c-provisioning-contract.md`
- `phase-2c-gate-closure-contract.md`
- `phase-2c-gate-closure-failure-matrix.md`
- `phase-2c-gate-closure-operational-runbook.md`
- `neon-migration-runbook.md`
- `legacy-removal-plan.md`
- `adr-customer-storefront-foundation.md`
- `phase-3a-storefront-contract.md`
- `adr-customer-commerce-pilot.md`
- `phase-3b-commerce-pilot-contract.md`
