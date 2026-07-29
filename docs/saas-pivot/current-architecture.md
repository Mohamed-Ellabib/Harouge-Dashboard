# Current Architecture

Last verified: 2026-07-22 against historical Phase 2C commit `8b02475` plus the current uncommitted commerce-readiness, legacy-freeze, Phase 3A, and Phase 3B working tree. Accepted focused evidence includes commerce readiness 12/12, commerce-resource units 5/5, Phase 2B Cart/Order regression 12/12, immutable-policy-pin units 2 suites/9 tests, storefront Vitest 3 files/11 tests, and final guarded-local backend verification of 23 suites/144 tests (62 unit, 10 module, 72 HTTP).

## Runtime identity

Merchant requests resolve signed merchant account -> active MerchantMembership -> active StoreProfile -> active Tenant -> one linked Medusa Store -> its default Sales Channel. Public requests resolve normalized verified StoreDomain -> active StoreProfile -> active Tenant -> one linked Medusa Store -> matching single-channel publishable key.

Medusa Store is the canonical commerce-store identity. Tenant groups Stores. StoreProfile owns SaaS state and metadata. MerchantMembership and StoreDomain are authoritative. Vendor remains only for authentication storage and temporary compatibility/dual writing; it cannot override permanent ownership.

Products have one canonical Medusa Store owner and one allowed Store channel. The Vendor-product link remains transitional and must agree with canonical ownership. Missing or inconsistent permanent links fail closed.

The application is a Medusa 2.17 modular monolith with bundled Medusa Admin extensions, separate Arabic-first merchant and customer React/Vite applications, and an uncommitted owner platform-dashboard application. The owner dashboard can drive canonical client/first-Store provisioning and presents legacy Vendor lifecycle as read-only; DNS/SSL, billing, deployments, production operations, and full enterprise controls are not implemented merely because their UI destinations exist.

The customer storefront is guarded-local only; no production customer storefront is deployed.

## Cart and Order ownership

A Cart is linked immutably to exactly one Medusa Store at creation. Completion links the resulting Order to that same Store before success is returned. Public Cart access requires the same verified hostname, single-channel publishable key, and Store for the Cart lifetime.

Cart mutation validates canonical Product ownership, channel, Region, currency, shipping option, promotion policy, Store/Tenant status, plan entitlement, and commerce readiness. Product channel mistakes cannot override canonical ownership. Merchant Order list/detail starts from the Store-Order link; legacy Vendor item metadata never authorizes access.

Order-link failure is a checkout failure and records durable repair evidence when the core Order cannot be compensated. Guarded backfills apply only unambiguous local ownership mappings.

## Phase 2C Store identity provisioning

The platform-only provisioning API invokes one durable orchestrator. StoreProvisioning checkpoints safe request identity, resource references, status, and events. StoreProvisioningLease provides database-backed idempotency and exclusion for core Store creation. Core Medusa resources use installed workflows; SaaS records use the SaaS module.

Activation is graph-gated. StoreProfile and the compatibility Vendor remain draft until structural invariants, MerchantStoreContext, and PublicStoreContext resolve. The owner account can be explicitly reused across Stores through one MerchantMembership per Store. Login requires Store selection for an account with multiple memberships.

Compatible Regions may be shared because Medusa country ownership is global; each Store records its one allowed/default Region. Completed identity provisioning creates/ensures readiness but does not configure shipping or imply checkout availability.

## Commerce readiness and setup working tree

The current working tree adds four durable records:

- StoreCommerceReadiness: one current plan/capability/readiness row per StoreProfile;
- StoreCommerceSetup: immutable idempotent setup attempt/result and sanitized resource checkpoints;
- StoreCommerceSetupEvent: append-only sanitized operational evidence;
- StoreCommerceSetupLease: database-backed Store-level execution exclusion.

Starter readiness is `not_required` and checkout is disabled. Professional readiness begins `pending`, passes through `configuring`, and becomes `ready` only after a completed setup and full graph validation. Ordinary failures become `failed`. An expired retained lease makes setup and readiness `requires_attention`; no resolution API exists. `disabled` and `cancelled` are reserved states.

The authenticated Admin surfaces are:

- `POST /admin/saas/stores/:store_profile_id/commerce-setup`;
- `GET /admin/saas/commerce-setup/:id`;
- `GET /admin/saas/stores/:store_profile_id/commerce-readiness`.

Only shipping-option name, optional description, and amount are client input. The server derives all Store, Region, currency, country, provider, profile, set, zone, option, and price policy.

The setup uses local `manual_manual` fulfillment and `pp_system_default` payment. A default Shipping Profile/framework providers may be shared. Each Store has a deterministic Fulfillment Set and exact country-only Service Zone, an exclusive location-to-set relationship, exactly one deterministic Shipping Option, exact prices/rules, one pinned Shipping Profile, and a singleton option allowlist. Cross-Store links fail closed.

The setup derives a versioned immutable policy from exactly one completed provisioning record and proves it matches the current Tenant, StoreProfile, Medusa Store, plan, Region, location, channel, currency, countries, and local providers. A canonical SHA-256 digest and safe request snapshot pin that policy with the normalized shipping request. The non-secret digest remains stable across authentication/session secret rotation. Retry and completion re-resolve it and fail on drift. Immutable-policy pinning has focused unit evidence of 2 suites/9 tests passing. No mutable reconfiguration contract exists.

## Checkout enforcement boundary

Public Store HTTP performs deep readiness/graph validation for Cart creation and mutation, shipping listing/calculation/addition, payment collection/session routes, and completion. It returns a generic non-sensitive unavailable message on graph failure and rejects a payment provider other than the local allowed provider.

Project-owned hooks deep-gate the hook-capable create/update Cart, add/update item, add shipping, non-empty promotion, customer transfer, shipping-list, and complete Cart workflows. The empty-promotion call used internally during Cart bootstrap returns early because the Cart link does not exist yet.

Installed Medusa core workflows without a usable hook remain trusted internal surfaces. Line-item deletion, payment-collection creation, payment-session creation, and shipping-price calculation are protected when reached through public HTTP, but arbitrary new direct imports are not automatically intercepted. They must remain behind guarded routes or explicit project wrappers. The architecture therefore does not claim universal interception of every core-flow call.

## Phase 3A/3B customer storefront working tree

Phase 3A supplies Arabic RTL Store branding and browse-only home, catalog, and Product detail routes. Phase 3B adds exact public commerce-capability and one-simple-variant purchase-option contracts. The backend derives them from verified PublicStoreContext, the canonical published Product/Store/channel graph, exact Store currency, and current deep checkout readiness; unsupported shapes and stale or crossed contexts fail closed.

The customer application now supports a guarded-local guest Cart, quantity/removal, in-memory delivery details, the one deeply allowed shipping option, fixed local system payment, completion, and an in-memory reduced confirmation. Only the opaque Cart ID is persisted in versioned same-origin `sessionStorage`. Customer PII, Store/key identity, Product/Cart/Order payloads, provider details, and raw errors are not persisted. There is no customer account or public Order lookup.

Merchant Product writes derive the canonical Store currency server-side and reject a mismatched supplied currency. The pilot accepts exactly one simple variant, untracked inventory, and allowed backorders. It does not represent stock accuracy, money movement, carrier booking, tax, refunds, webhooks, or production provider operations.

## Legacy Vendor lifecycle freeze

Standalone legacy `POST /admin/vendors` is disabled. A Vendor mapped by StoreProfile to a permanent Store cannot be changed or deleted through legacy PATCH/DELETE. Unmapped historical Vendors retain the old compatibility path, including product-link cleanup, until migration/reconciliation is separately approved.

VendorMember enable/disable, password/authentication, and transitional product assignment remain compatibility functions. Vendor data has not been removed.

## Evidence boundary

The historical 2026-07-14 external manual run and 110-test record apply only to committed Phase 2C `8b02475`. The current working tree separately passed backend regression 23 suites/144 tests (62 unit, 10 module, 72 HTTP), all backend/frontend checks and builds, storefront Vitest 3 files/11 tests, migration generation with no changes, and the unchanged Phase 3A harness. The selected current-tree Phase 2C authenticated real-backend API rerun passed and is recorded separately from the Phase 3B Store A browser completion, hostile Store B matrix, merchant Order isolation, restart persistence, responsive/semantic inspection, pending physical-keyboard acceptance, and cleanup evidence.

## Deferred production risks and products

Customer commerce beyond the implemented guarded-local Phase 3B pilot, customer OTP, WhatsApp provider integration, public signup, production DNS/SSL, deployment orchestration, billing, production payment/fulfillment providers, tax and webhook operations, attention/repair UI, controlled plan/setup updates, and Vendor removal remain deferred. The Phase 3B exit gate remains open only for its distinct owner-performed physical-keyboard journey.

Rate limiting, event processing, and runtime locks remain process-local where not replaced by a database lease. Production needs shared infrastructure, monitoring/alerting, backups/restore validation, credential management, and incident operations.

Neon credential rotation is unverified and blocks production migration. Phase 3A and the bounded Phase 3B pilot are implemented in the current uncommitted working tree. Phase 3A's guarded-local gate is closed; Phase 3B's automated/browser/restart/regression/cleanup evidence passed, but its distinct owner-performed physical-keyboard acceptance is pending. No Phase 3C, public pilot, or production work is authorized.
