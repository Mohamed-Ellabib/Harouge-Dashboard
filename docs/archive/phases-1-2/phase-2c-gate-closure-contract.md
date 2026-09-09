# Phase 2C Gate-Closure Commerce Readiness Contract

Status: implemented in the current uncommitted working tree on 2026-07-18/19. Original accepted guarded-local evidence is commerce readiness 12/12, commerce-resource units 5/5, Phase 2B Cart/Order regression 12/12, immutable-policy-pin units 2 suites/9 tests, and backend regression 21 suites/139 tests (60 unit, 10 module, 69 HTTP). A later post-Phase-3B full regression passed 23 suites/144 tests. The selected current-tree Phase 2C authenticated real-backend API rerun passed on 2026-07-22 and is kept separate from Phase 3B browser evidence. This remains neither committed nor production-ready.

## Scope

This contract closes the Phase 2C Region-policy and shipping/Order design gaps without starting Phase 3. It adds durable checkout readiness and a platform-only setup operation. Store identity remains owned by the Phase 2C provisioning workflow at historical commit `8b02475`.

Exact compatible Region sharing is accepted: currency and the normalized complete country set must match. Region identity never grants Store ownership.

## Durable records

### StoreCommerceReadiness

One current record exists for each StoreProfile. It records:

- unique StoreProfile reference and `online_checkout` capability;
- plan snapshot;
- status: implemented `not_required`, `pending`, `configuring`, `ready`, `failed`, or `requires_attention`; reserved `disabled`;
- Store, Region, location, fulfillment provider, Shipping Profile, Fulfillment Set, Service Zone, and exact Shipping Option references when ready;
- latest setup reference;
- readiness revision and last validation time;
- allowlisted failure code and safe message.

Starter readiness is `not_required`. Professional readiness is `pending` until one exact completed setup validates the real graph.

### StoreCommerceSetup

The setup operation records:

- globally unique normalized idempotency key;
- canonical SHA-256 request digest;
- StoreProfile target and actor reference;
- implemented status: `pending`, `running`, `completed`, `failed`, or `requires_attention`; reserved `cancelled`;
- current implemented checkpoint;
- retry count;
- safe request snapshot and created/reused/retained resource references;
- allowlisted completed result or safe failure code/message.

The request snapshot contains StoreProfile ID, shipping-option input, a fixed provider-strategy label, and a versioned server-derived pinned policy. The pinned policy contains only non-secret provisioning/tenant/Store/Profile/plan/Region/location/channel/currency/country/provider identifiers. Provider credentials, publishable key tokens, database URLs, request headers, lease tokens, raw internal errors, and other secrets are excluded.

Before reservation, the server resolves exactly one completed StoreProvisioning record and proves that its immutable identity/default policy still matches the canonical Medusa graph. A canonical unkeyed SHA-256 request digest covers the normalized public shipping request and that pinned policy. Its payload contains no secrets, and it is intentionally independent of rotating authentication/session secrets. Retry and final completion re-resolve the current policy and require exact equality; changed Store, plan, Region, location, channel, country, currency, provisioning identity, or provider strategy fails with a safe operator-review conflict. Immutable policy-pinning has focused unit evidence of 2 suites/9 tests passing.

### StoreCommerceSetupEvent and StoreCommerceSetupLease

StoreCommerceSetupEvent stores append-only sanitized lifecycle/checkpoint evidence. StoreCommerceSetupLease gives one active Store-level lease to the setup executor. Normal release deletes only a token-matching lease. Expiry decisions use PostgreSQL time in one transaction that locks setup, lease, and readiness in order, revalidates the observed setup/token/current expiry, and atomically writes setup/readiness plus the single winning attention event. An expired lease is retained and causes setup/readiness `requires_attention`; it is not stolen on the assumption that the old process did no work. A stale expiry observation preserves a concurrent renewal or completion.

## Platform-only endpoints

### POST `/admin/saas/stores/:store_profile_id/commerce-setup`

Authentication: Medusa platform `user` actor through the Admin middleware and route actor check.

Required header: `Idempotency-Key`.

The route accepts only an active canonical `professional_commerce` StoreProfile. Merchant and unauthenticated callers are rejected. Starter setup is rejected.

Strict body:

```json
{
  "shipping_option": {
    "name": "Local delivery",
    "description": "Standard local delivery",
    "amount": 1000
  }
}
```

Rules:

- `name` is trimmed, 2-120 characters;
- `description` is optional, trimmed, 2-240 characters;
- `amount` is a non-negative safe integer up to 1,000,000,000;
- additional keys are rejected;
- currency, countries, Region, providers, channel, location, profile, set, zone, option ID, Store ID, Tenant ID, and other internal identifiers cannot be supplied by the client.

The server derives StoreProfile, Tenant, Medusa Store, Sales Channel, plan, currency, exact Region/countries, Stock Location, `manual_manual`, `pp_system_default`, the default Shipping Profile, deterministic Store Fulfillment Set/Service Zone/Shipping Option identities, prices, rules, and internal IDs.

The allowlisted completed result currently includes setup, StoreProfile, Medusa Store, Region, location, provider, Shipping Profile, Fulfillment Set, Service Zone, Shipping Option IDs, currency, countries, readiness outcome, and created/reused dispositions. These are authenticated platform-admin references, not storefront output. No token or credential is returned.

The internal `executeStoreCommerceSetup` function only checks that its actor string is non-empty; it does not authenticate the actor independently. It is a trusted internal callable. Untrusted access must use the authenticated Admin route.

### GET `/admin/saas/commerce-setup/:id`

Authentication: platform `user` actor only.

Returns the allowlisted setup ID, StoreProfile ID, status, checkpoint, retry count, safe failure, timestamps, and completed result when applicable. It does not return the request snapshot, raw event payloads, leases, tokens, credentials, or internal error objects.

### GET `/admin/saas/stores/:store_profile_id/commerce-readiness`

Authentication: platform `user` actor only.

Returns the allowlisted readiness row, including authenticated internal resource references, status, latest setup, revision, validation time, and safe failure. It is diagnostic and never bypasses live graph validation.

## Idempotency and concurrency

- Same Store, key, and normalized request return the original operation/result.
- Changed material input with the same key conflicts deterministically.
- Identical concurrent calls converge on one operation.
- An unfinished operation blocks a different setup key for that Store.
- Failed setup resumes only with its exact original key/request.
- A completed setup is immutable; a new key for that Store is rejected because reconfiguration is not implemented.
- Store-level execution is protected by a database lease; process-local locking is not the correctness boundary.
- An expired lease moves the operation to `requires_attention`, retains the lease, and rejects replay. There is no attention-resolution route yet.

## Implemented checkpoints

The durable checkpoint names are:

1. `validate_store` — resolve the canonical active Store, enforce Professional plan, exact Region/payment policy, currency, location, and exclusive channel/location relationship; transition readiness to `configuring`;
2. `fulfillment_provider` — validate `manual_manual` and establish the exact location/provider link;
3. `shipping_profile` — retrieve or create exactly one default profile;
4. `fulfillment_set` — retrieve or create the deterministic Store set and exact country-only zone, then establish the exclusive location/set link;
5. `shipping_option` — retrieve or create the deterministic singleton option, rules, currency price, and Region price;
6. `store_allowlist` — pin the Shipping Profile and exact singleton option allowlist on the Store;
7. `graph_validation` — re-read and validate the complete graph, update readiness to `ready`, then mark setup `completed`.

Created/reused references are checkpointed. On ordinary failure, attempt-created references become `retained_for_retry` in setup state and the setup records a sanitized failure event.

## Deterministic and exclusive graph policy

- The default Shipping Profile and the local framework providers may be shared.
- Fulfillment Set and Service Zone names include StoreProfile ID.
- The zone contains exactly the Region's country geo zones, all at country level.
- One location links to exactly one Store Fulfillment Set, and that set links back to exactly that location.
- The Store location is linked exclusively to its Sales Channel.
- The Service Zone exposes exactly one deterministic Store Shipping Option.
- Option provider, profile, zone, type code, rules, currency/Region amount, Store allowlist, and readiness references must all agree.
- Cross-Store set, zone, option, location, or allowlist exposure fails closed.

## Plan and checkout policy

### Starter

- readiness: `not_required`;
- profile and Product reads: allowed through existing Store contexts;
- Cart, shipping, payment, and completion: fail closed;
- commerce setup: rejected.

### Professional non-ready

- profile and Product reads: allowed through existing Store contexts;
- online checkout: fail closed;
- failed setup: exact-key retry only;
- attention setup: no replay until a future approved operator-resolution action exists.

### Professional ready

Checkout is allowed only while plan, setup completion, readiness, live graph, hostname/key, Cart Store, Product owners, channel, Region, currency, option, payment provider, and active Tenant/Store status all agree.

Public HTTP performs deep readiness checks. Project-owned hooks enforce the hook-capable Cart and shipping workflows. Direct Medusa workflows with no hook remain trusted internal surfaces and must be called only behind a guarded route/wrapper. The current no-hook set includes line-item deletion, payment-collection creation, payment-session creation, and shipping-price calculation.

The empty-promotion hook call used during Cart bootstrap intentionally returns before readiness/ownership resolution. Non-empty internal promotion changes and all public HTTP Cart mutations are gated.

## Replay and failure behavior

An ordinary failure leaves readiness non-ready, marks setup `failed`, converts attempt-created resource dispositions to `retained_for_retry`, and preserves exact-key retry evidence. Reused Regions/providers are never removed automatically.

Lease expiry is different: setup and readiness become `requires_attention`; the expired lease and any evidence are retained; replay does not start execution or increment retry count.

Unknown provider/core exceptions are replaced with `commerce_setup_failed` and `Commerce setup failed at the recorded step.` before persistence and response. Only explicitly tagged safe Medusa validation/conflict errors can retain a bounded message.

`cancelled` and `disabled` are schema-reserved states with no current transition or endpoint.

## Acceptance evidence and remaining gate

The guarded local focused commerce suite passes 12/12; commerce-resource unit tests pass 5/5; and the Phase 2B Cart/Order regression passes 12/12. The commerce suite covers:

- Starter/Professional pre-setup gating;
- deterministic setup and replay;
- concurrent identical convergence;
- retained Shipping Option retry;
- database-time transactional expired-lease attention, paused-owner fencing, stale-expiry preservation of concurrent renewal/completion, and a single winning attention event;
- unknown provider error sanitization;
- HTTP Cart-to-Order completion and cross-merchant Order denial;
- stale-ready graph failure;
- cross-Store fulfillment corruption failure;
- platform authentication plus setup/readiness status routes.

The original gate-closure backend regression passed 21 suites/139 tests (60 unit, 10 module, 69 HTTP). Backend typecheck/lint/build, platform and vendor builds, SaaS generate/no-change, and guarded local migration apply/up-to-date, rollback of `Migration20260718133719`, reapply, and link synchronization passed. A later post-Phase-3B full regression passed 23 suites/144 tests (62 unit, 10 module, 72 HTTP). The separately selected current-tree authenticated real-backend API rerun also passed; neither result rewrites the historical external manual run recorded on 2026-07-14.

## Excluded

Phase 3, customer storefront UI, WhatsApp provider integration, billing, DNS/SSL automation, production payment/fulfillment providers, deployment infrastructure, production migration, Neon access, Vendor removal, setup updates, plan changes, cancellation, and attention resolution are outside this contract.
