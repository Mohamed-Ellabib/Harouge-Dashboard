# Migration Strategy

## Decision

Use separate Tenant and SaaS Store entities as the target. Keep Vendor
temporarily through a compatibility service. This combines mandate options B
and C without a destructive rename.

Reasons:

- Vendor currently represents store, tenant, branding, domain parent, and
  membership parent at once.
- A future tenant may own multiple stores.
- Existing IDs, product links, routes, and test data must remain usable.
- A mass rename would add risk without improving isolation.

## Phase 2 outline

1. Add Tenant, SaaS Store, Store Domain, Store Brand, Plan, Entitlement, and
   provisioning-state entities through additive migrations.
2. Add nullable compatibility references from Vendor to Tenant and Store.
3. Backfill one Tenant and one Store for each included Vendor.
4. Provision or link a Medusa store record, sales channel, publishable key,
   region/currency configuration, and stock-location relationship per Store,
   where Medusa 2.17.0 supports the mapping.
5. Backfill product ownership and restrict availability to the Store channel.
6. Keep `/vendor` as compatibility routes resolving Store context server-side.
7. Validate counts, orphans, uniqueness, and Store A/Store B isolation.
8. Switch reads, then writes, only after reconciliation.
9. Retain old records until separately approved cleanup.

## Idempotency and recovery

- Provisioning uses a durable idempotency key for target Store and operation.
- Each step records status and created/reused resource references.
- Retries reuse matching resources rather than creating duplicates.
- Compensation removes only resources created by the failed attempt; existing
  Medusa resources are never deleted automatically.
- Additive migrations provide down migrations where safe. Data backfills use a
  documented forward-fix and restore procedure rather than deleting source.
- Back up and rehearse restoration before destructive cleanup. Phase 0
  authorizes no destructive migration.

## Reconciliation gates

- Included Vendor count equals backfilled Store count.
- Every Store has exactly one Tenant and one compatibility Vendor.
- Every current vendor-product link maps to exactly one Store.
- No product appears under multiple stores.
- Every Store has one allowed sales channel and matching publishable key.
- Existing merchant login/dashboard behavior remains functional.
- Store A and Store B isolation tests pass before storefront work.

## Deferred

- No schema change or backfill occurs in Phase 0.
- No Vendor table or route rename occurs before compatibility tests exist.
- Marketplace commissions, payouts, split payments, and multi-vendor carts are
  non-goals and will not be migrated.
