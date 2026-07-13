# Phase 2B Checkout Failure Recovery

## Before Order creation

Ownership or policy validation failures abort the Medusa workflow. No success response is returned. Cart ownership remains unchanged, and bulk hostile item requests do not partially add accepted items.

## After Order creation

The completion hook links the Order to the Cart's exact Store and verifies one link. A duplicate/retry resolves the existing Order and does not create another Store-Order link. If linking fails after the core Order is committed, the workflow returns an error and creates a pending `CheckoutOwnershipRepair` record containing sanitized identifiers and reason `order_store_link_failed`.

The repair record is durable diagnostic evidence, not automatic authorization. Until repaired by a future authorized operator process, merchant APIs fail closed because the Order has no exact Store owner. A retry may safely establish the missing link if all canonical Cart checks still pass.

## Operator procedure

1. Keep the checkout response failed; do not manually tell the customer it succeeded without inspecting payment and Order state.
2. Locate the pending repair record by request, Cart, and Order identifiers.
3. Revalidate Tenant, StoreProfile, Store, channel, Cart items, Product owners, region, shipping, currency, payment, and existing links.
4. If evidence is exact, use a separately authorized audited repair workflow to create the unique link.
5. If evidence conflicts, quarantine the Order from merchant APIs and resolve through the data decision process.
6. Mark the repair record resolved only after link and Order visibility reconciliation.

Automated production repair processing, alerting, and operator UI are deferred to a later approved phase.
