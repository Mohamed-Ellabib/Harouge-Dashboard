# ADR: Store Commerce Readiness

Status: accepted on 2026-07-18 and implemented in the current uncommitted Phase 2C gate-closure working tree. Its original accepted guarded-local evidence is commerce readiness 12/12, commerce-resource units 5/5, Phase 2B Cart/Order regression 12/12, immutable-policy-pin units 2 suites/9 tests, and backend regression 21 suites/139 tests (60 unit, 10 module, 69 HTTP). A later post-Phase-3B full regression passed 23 suites/144 tests, and the separately selected current-tree Phase 2C real-backend API rerun passed on 2026-07-22.

## Context

Phase 2C provisions the permanent identity and commerce-resource graph for a SaaS Store. The real-HTTP run recorded on 2026-07-14 proved public Cart isolation, but provisioning did not create a compatible shipping option. Checkout could not create an Order, so the final Store-Order and cross-merchant Order-authorization steps were not exercised in that run.

Medusa assigns a country to one Region. The owner accepted exact compatible Region sharing on 2026-07-18: two Stores may reuse one Region only when its currency and normalized complete country set match exactly. A Region is shared commerce configuration, never Store ownership.

Store identity and public catalog availability must not imply that online checkout is configured. The supported plans intentionally have different checkout entitlements.

## Decision

Store identity provisioning and online-checkout readiness are separate durable concerns.

`provisionSaasStoreWorkflow` remains authoritative for Tenant, StoreProfile, Medusa Store, Sales Channel, publishable API key, compatible Region, Stock Location, domain, brand, owner, membership, plan, and graph activation. Completing that workflow proves the Store identity graph; it does not prove that online checkout is ready.

One `StoreCommerceReadiness` record represents the current checkout capability of each StoreProfile. A separate idempotent `StoreCommerceSetup`, append-only `StoreCommerceSetupEvent` evidence, and a database-backed `StoreCommerceSetupLease` configure and validate the minimum local checkout graph.

Readiness is operational evidence, not an authorization shortcut. A Professional Store is usable for checkout only while the plan, completed setup record, current readiness row, actual Medusa graph, and canonical Store ownership all agree.

## Exact compatible Region sharing

- Multiple Stores may reference one Region only when its currency and normalized complete country set exactly match the requested Store policy.
- A shared Region never represents Tenant, Store, Product, Cart, Order, domain, key, channel, shipping option, or merchant ownership.
- Each Store keeps its own default/allowed Region reference and all permanent Store ownership constraints.
- A partially overlapping, incompatible-currency, missing, or ambiguous Region fails deterministically. Setup never creates a duplicate around Medusa's country invariant.
- Compensation and cleanup never delete a reused Region.
- Different delivery coverage within one country requires a later Store-specific service-area design; it is not modeled by duplicating Regions.

## Plan behavior

### `starter_whatsapp`

- Store identity may be active without online checkout.
- Readiness is `not_required`; this never means `ready`.
- Public profile and Product reads may operate through the normal Store contexts.
- Cart creation/mutation, shipping, payment, and completion fail closed.
- The commerce-setup endpoint rejects the Store.

### `professional_commerce`

- Store identity provisioning completes independently.
- Readiness begins as `pending` and remains non-ready until the setup operation completes a full graph validation.
- Public profile and Product reads may operate while setup is pending.
- Checkout operations fail closed unless readiness is `ready` and the referenced setup is `completed`.

`disabled` exists as a reserved readiness state, and `cancelled` exists as a reserved setup state. No current workflow transitions to either state. A controlled plan-change workflow is not implemented; callers must not mutate plan/readiness rows directly.

## Durable state and operation records

`StoreCommerceReadiness` is unique by StoreProfile. It records the plan snapshot, status, Medusa Store/Region/location/provider/profile/set/zone/option references, latest setup reference, safe failure information, revision, and last validation time. Its implemented states are `not_required`, `pending`, `configuring`, `ready`, `failed`, and `requires_attention`; `disabled` is reserved.

`StoreCommerceSetup` records the normalized idempotency key, canonical SHA-256 request digest, StoreProfile target, actor reference, status, current checkpoint, sanitized request snapshot, created/reused/retained resource references, retry count, safe result, and safe failure information. Its active implementation uses `pending`, `running`, `completed`, `failed`, and `requires_attention`; `cancelled` is reserved.

`StoreCommerceSetupEvent` is append-only safe operational evidence. `StoreCommerceSetupLease` provides database-backed Store-level exclusion. Process-local locking is not the correctness boundary.

An expired lease is not assumed safe to steal or delete. Lease decisions use PostgreSQL time inside one transaction that locks setup, lease, and readiness in that order, revalidates the observed setup/token/current expiry, atomically moves setup/readiness to `requires_attention`, and lets only the winning transition write one sanitized attention event. A paused stale owner is fenced, while a stale expiry observation cannot overwrite a concurrent renewal or completion. Replay is rejected without incrementing retries. There is not yet an operator-resolution API.

## Idempotent setup

The platform-only HTTP API is the supported untrusted entry point. It accepts only a shipping-option name, optional description, and non-negative amount in the Store currency's minor unit. The StoreProfile route parameter and permanent graph derive the Store, plan, currency, Region, countries, Stock Location, Sales Channel, providers, profile, fulfillment set, service zone, option code, and internal identifiers server-side.

The same idempotency key and normalized request return the original operation and result. Changed input with the same key conflicts. Concurrent identical requests converge. A failed attempt can resume only with its original key and request. After one setup completes, a different key for that Store is rejected because update/reconfiguration is not implemented.

Before reserving setup, the server resolves one completed StoreProvisioning record and proves that its Tenant, StoreProfile, Medusa Store, plan, Region, Stock Location, Sales Channel, currency, and countries still match the canonical Medusa graph. It creates a versioned server-only pinned policy containing those identities plus the derived fulfillment/payment providers. A canonical unkeyed SHA-256 digest covers that normalized pinned policy and the public shipping request, and the safe request snapshot retains the pinned policy. The digest payload contains no secrets and deliberately does not depend on rotating authentication/session secrets, so same-key replay remains stable across credential rotation. Retry and final completion re-resolve and compare the policy; drift fails with an operator-review conflict instead of silently following new defaults. Immutable derived-policy pinning has focused unit evidence of 2 suites/9 tests passing.

The internal `executeStoreCommerceSetup` callable requires a non-empty actor string but does not authenticate that actor itself. It is a trusted application boundary; the Admin route and middleware perform platform-user authentication.

## Deterministic Store fulfillment graph

The gate uses one framework default Shipping Profile and the local shared providers, but all authorization-bearing fulfillment resources are Store-specific:

- one deterministic Fulfillment Set named from StoreProfile ID;
- exactly one deterministic Service Zone on that set;
- exact country-only geo zones matching the Region;
- an exclusive Stock Location-to-Fulfillment Set link in both directions;
- an exclusive Stock Location-to-Sales Channel relation for the Store;
- exactly one deterministic Shipping Option in the Store Service Zone;
- exact currency and Region prices for the requested amount;
- a singleton Store shipping-option allowlist and a pinned Store shipping-profile reference.

Cross-Store fulfillment-set, zone, option, location, or allowlist references fail closed. Exact Region sharing and framework/provider resources explicitly designed to be shared are the only sharing permitted by this gate.

## Readiness invariants

A Professional Store becomes and remains checkout-ready only when all of these are true:

- the Tenant and StoreProfile are active and the StoreProfile resolves to exactly one Medusa Store;
- plan and readiness are `professional_commerce`/`ready`;
- the referenced setup belongs to the StoreProfile and is `completed`;
- Store currency, default Region, one allowed Region, and exact Region countries agree;
- the default Stock Location is linked exclusively to the Store Sales Channel;
- the local fulfillment provider is enabled and linked to the location;
- the deterministic default profile/set/zone/option structure exists and is exact;
- the location-to-set link is exclusive in both directions;
- the Service Zone exposes exactly one allowed Shipping Option;
- option provider, profile, zone, type code, rules, currency amount, and Region amount agree;
- Store metadata pins the Shipping Profile and exact singleton option allowlist;
- the local payment provider is enabled and linked to the Region;
- the Cart, Product, channel, hostname/key, Tenant, and Store ownership controls continue to agree.

The local gate uses `manual_manual` and `pp_system_default`. Passing it proves a local structural isolation journey only. It is not production carrier, payment, settlement, refund, dispute, tax, webhook, or credential evidence.

## Checkout enforcement and trusted internal boundary

Public Store HTTP routes perform deep graph checks for Cart creation/mutation, shipping-option listing/calculation, shipping-method addition, payment collection/session creation, and Cart completion. The local payment-session route accepts only `pp_system_default`.

Project-owned hooks also perform deep readiness checks for hook-capable Medusa workflows: Cart create/update, add/update items, add shipping, non-empty promotion changes, customer transfer, both shipping-option listing workflows, and Cart completion. Completion still persists and verifies canonical Order ownership.

Medusa core workflows that expose no usable hook remain trusted internal surfaces. In the installed version these include line-item deletion, payment-collection creation, payment-session creation, and shipping-price calculation. The public HTTP routes are guarded, but an arbitrary new internal import of a no-hook core flow is not automatically intercepted. Such calls must remain behind the guarded API or an explicit project wrapper. Therefore the documentation does not claim that every possible direct Medusa core invocation is impossible.

The promotion hook intentionally returns early for an empty promotion-code list because Medusa uses that empty operation while bootstrapping Cart creation before the canonical Cart link exists. Non-empty internal promotion mutations are gated, and public HTTP mutations remain gated. This narrow bootstrap exception must not be generalized.

Public failures use a non-sensitive generic checkout contract. Unknown setup/provider/core errors are reduced to a generic safe code/message before persistence or response. Only explicitly tagged allowlisted validation/conflict errors preserve bounded messages.

## Failure and recovery

Ordinary setup failures leave readiness non-ready, mark the setup `failed`, retain created resources for exact-key retry, and store only sanitized evidence. Reused Regions/providers are never removed automatically. The current focused dynamic failure injection proves retained shipping-option retry; it is not a claim that every checkpoint has been dynamically injected.

Expired execution leases move the setup and readiness to `requires_attention` and are retained for operator review. Destructive cleanup, attention resolution, cancellation, production repair automation, and provider-specific remediation require separately approved work.

## Evidence and gate status

The guarded local focused commerce-readiness suite passes 12/12. The commerce-resource unit suite passes 5/5, and the Phase 2B Cart/Order regression passes 12/12. The commerce suite covers plan gating, setup/replay, concurrency, retained retry, database-time transactional expired-lease handling, paused-owner fencing, stale-expiry observation preserving a concurrent renewal/completion, single-winner attention evidence, unknown-error sanitization, HTTP checkout and canonical Order isolation, stale-graph failure, exact shipping-rule/price corruption rejection, cross-Store fulfillment corruption, and platform authentication/status routes.

The original gate-closure backend regression passed 21 suites/139 tests (60 unit, 10 module, 69 HTTP). Backend typecheck/lint/build, platform and vendor builds, SaaS generate/no-change, and guarded local migration apply/up-to-date, rollback of `Migration20260718133719`, reapply, and link synchronization passed. A later post-Phase-3B full regression passed 23 suites/144 tests (62 unit, 10 module, 72 HTTP). The selected authenticated current-tree Phase 2C real-backend API rerun also passed on guarded disposable PostgreSQL and is documented separately from Phase 3B browser evidence. The 2026-07-14 manual evidence remains historical evidence for commit `8b02475`.

## Deferred

Phase 3 product work is outside this ADR even though bounded Phase 3A/3B contracts were later separately authorized and implemented locally. Public signup, billing, DNS/SSL automation, production payment and fulfillment providers, distributed production infrastructure, production deployment, Neon migration, Vendor removal, plan updates, setup cancellation, and attention-resolution operations remain unauthorized by this decision.
