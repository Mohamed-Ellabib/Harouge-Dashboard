# Phase 2C Gate-Closure Operational Runbook

Status: executable from the current uncommitted working tree. Original accepted guarded-local evidence is commerce readiness 12/12, commerce-resource units 5/5, Phase 2B Cart/Order regression 12/12, immutable-policy-pin units 2 suites/9 tests, and backend regression 21 suites/139 tests (60 unit, 10 module, 69 HTTP). A later post-Phase-3B full regression passed 23 suites/144 tests. The selected current-tree Phase 2C authenticated real-backend API rerun passed on 2026-07-22 and is documented separately from Phase 3B browser evidence.

## Boundary

This runbook is only for guarded local Phase 2C acceptance closure. It validates plan/readiness behavior, idempotent base commerce setup, HTTP checkout, canonical Order ownership, and cross-merchant denial.

It does not authorize Phase 3, a customer storefront, DNS/SSL automation, billing, production providers, deployment, Vendor removal, production migration, or Neon access.

## Non-negotiable database safety

- Use `NODE_ENV=test`.
- Use a dedicated guarded `TEST_DATABASE_URL` different from `DATABASE_URL`.
- Require the explicit disposable-database acknowledgement.
- Use the repository's disposable runner; do not bypass its target guards.
- Never use Neon for tests, migrations, diagnostics, backfills, setup, or acceptance.
- Use only synthetic accounts and local non-secret provider configuration.
- Never print an environment value, password, key token, session, or database URL.

The previously exposed Neon credential rotation remains unverified. Production migration is blocked regardless of local success.

## Local provider policy

The request must contain only the shipping-option display values and amount. The server derives `manual_manual`, `pp_system_default`, Store, Region, countries, currency, channel, location, profile, set, zone, option code, prices, and internal IDs.

Passing this local provider path is structural Store-isolation evidence only. It proves nothing about a production carrier, gateway, settlement, refunds, disputes, taxes, credentials, or webhooks.

## Focused automated acceptance

Run from the repository root:

```powershell
npm.cmd run test:commerce-readiness --workspace @dtc/backend
```

Recorded working-tree result on 2026-07-18/19: 9 passed, 0 failed. The suite uses guarded disposable PostgreSQL and covers:

- Starter checkout disabled and Professional pending;
- deterministic Store commerce graph and same-key replay;
- concurrent identical convergence and retained Shipping Option retry;
- database-time transactional expired-lease handling with paused-owner fencing, stale-expiry preservation of concurrent renewal/completion, one winning attention event, and retained setup/readiness `requires_attention` evidence;
- unknown provider error sanitized at persistence and Admin response;
- real integration HTTP Cart, shipping, payment, completion, canonical Order link, and cross-merchant denial;
- stale ready graph failing closed;
- cross-Store fulfillment-set corruption failing closed without option-ID exposure;
- Admin authentication and setup/readiness status handlers.

This is automated integration HTTP evidence. It is not a repeat of the separately recorded external real-backend run from 2026-07-14.

## Recorded guarded-local verification

The final working-tree verification recorded the following guarded-local results:

1. original gate-closure backend regression: 21 suites/139 tests passed (60 unit, 10 module, 69 HTTP); later post-Phase-3B full regression: 23 suites/144 tests passed (62 unit, 10 module, 72 HTTP);
2. backend typecheck, lint, and build passed;
3. platform and vendor builds passed;
4. SaaS migration generation reported no changes;
5. guarded local migration apply/up-to-date, rollback of `Migration20260718133719`, reapply, and link synchronization passed;
6. immutable-policy-pin focused units passed: 2 suites/9 tests;
7. `git diff --check` and a safe credential/secret-absence review remain normal release hygiene;
8. the later owner-selected current-tree authenticated real-backend API journey passed and is recorded separately in the handoff/roadmap rather than being folded into this original runbook evidence;
9. any commit remains separately authorized.

The historical 110/110 result belongs to commit `8b02475` before this gate-closure working tree.

## Provision Store identities

1. Provision one `starter_whatsapp` Store and at least two `professional_commerce` Stores through `POST /admin/saas/provisioning`.
2. Use one unique provisioning idempotency key per normalized request.
3. Confirm completed identity provisioning and restart persistence.
4. Confirm Starter readiness is `not_required` and Professional readiness is `pending`.
5. Confirm exact Libya/LYD Stores may reuse one compatible Region.
6. Confirm Tenant, StoreProfile, Medusa Store, Sales Channel, key, location, domain, brand, membership, Products, Carts, fulfillment graph, option, and Orders remain Store-specific where required.

Completed identity provisioning is not checkout readiness.

## Verify pre-setup enforcement

For Starter and pending Professional Stores:

- allow public profile/Product reads only through valid Store contexts;
- verify Cart, shipping, payment, and completion fail closed;
- verify Starter setup is rejected;
- verify public errors do not reveal which internal resource is missing.

Project-owned hook-capable flows must also fail closed. Direct Medusa core workflows with no hook remain trusted internal surfaces and must not be invoked outside guarded routes/wrappers. The empty-promotion bootstrap call is the one documented early-return exception.

## Run commerce setup

Call `POST /admin/saas/stores/:store_profile_id/commerce-setup` as a platform user with a unique `Idempotency-Key` and only:

```json
{
  "shipping_option": {
    "name": "Local delivery",
    "description": "Synthetic local acceptance option",
    "amount": 1000
  }
}
```

Verify:

1. the setup completes and readiness becomes `ready` only after graph validation;
2. exact request/key replay returns the same result;
3. changed input with the same key conflicts;
4. a new key after completion conflicts because reconfiguration is unsupported;
5. identical concurrency converges;
6. failed exact-key retry reuses checkpointed resources;
7. setup/readiness status endpoints return only allowlisted fields;
8. unknown internal errors are reduced to the generic safe failure;
9. completed graph survives restart and deep revalidation.

Do not log full request/response bodies to a production-style sink and do not edit core Medusa tables manually.

## Expired-lease procedure

An expired setup lease is an attention state, not a retry signal:

- setup and readiness move to `requires_attention`;
- the lease is retained;
- replay is rejected without incrementing retry count or starting work;
- no current API resolves the attention state.

Stop and preserve evidence. Do not delete/steal the lease or mutate rows. Operator repair/attention resolution requires a separately designed and approved operation.

## HTTP checkout acceptance

For Store A:

1. resolve the synthetic hostname with its matching publishable key;
2. prove crossed Store-B hostname/key fails;
3. create a Cart and add Store-A Product;
4. reject Store-B Product;
5. list exactly Store-A's allowed Shipping Option;
6. reject Store-B option;
7. add Store-A shipping;
8. create the payment collection;
9. reject a non-allowed payment provider and accept `pp_system_default`;
10. complete the Cart;
11. verify exactly one immutable Store-A Order link;
12. verify Merchant A list/detail access;
13. verify Merchant B list exclusion/detail 404;
14. verify Domain B/Key B cannot access Store-A Cart.

Repeat for Store B when practical. At minimum prove its fulfillment set/option is distinct and cannot appear through Store A.

## Corruption and recovery checks

- Delete or detach one recorded resource in a controlled disposable test and confirm deep readiness fails closed.
- Attempt a cross-Store location/Fulfillment Set association and confirm shipping listing returns a sanitized failure without exposing the other option ID.
- Retry an injected Shipping Option failure with the exact key and confirm the same option is reused.
- Confirm canonical existing Orders remain authorized by their Store link if readiness later becomes unavailable.
- Confirm no duplicate setup, set, zone, option, allowlist entry, or Store relationship appears.

Current focused evidence does not dynamically inject every setup checkpoint. Expand failure injection before claiming a complete checkpoint matrix.

## Reconciliation output

Record sanitized counts and invariant outcomes for readiness/setup statuses, events/leases, compatible Region reuse, Store-specific location/set/zone/option relationships, Cart/Order Store links, repairs, and failed/attention operations.

Never expose credentials, key tokens, provider secrets, lease tokens, URLs containing credentials, password hashes, sessions, or raw snapshots.

## Gate closure rule

The design gap is implemented and guarded-local verification is recorded. A new external manual run, if required, must still be described separately from automated integration HTTP evidence. The working tree remains uncommitted.

Phase 3 remains not started. Local success cannot remove production blockers: unverified Neon credential rotation, production providers, shared rate limiting/locks/events, monitoring, backups, DNS/SSL/deployment, billing, and operational repair remain unresolved.
