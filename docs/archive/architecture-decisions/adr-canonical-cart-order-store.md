# ADR: Canonical Cart and Order Store Ownership

Status: accepted for Phase 2B on 2026-07-13.

## Decision

Each commercial Cart and Order has exactly one immutable Medusa Store owner represented by a module link. Cart ownership is established from PublicStoreContext during Cart creation. On completion, the validated Cart Store is copied to the resulting Order and verified before the checkout response succeeds.

## Rationale

Item-level Vendor ownership is insufficient because an Order is one commercial, payment, fulfillment, customer-PII, and authorization boundary. Filtering items can expose or hide a malformed subset while still granting access to another Store's Order. Whole-Order ownership makes authorization exact and fails closed for missing or ambiguous links.

Sales channels remain availability boundaries, not ownership. The Cart and Order channel must agree with the Store's configured channel, but a mistaken Product-channel link cannot change Product, Cart, or Order ownership.

## Failure behavior

Pre-order checks reject inactive Stores/Tenants, unowned or ambiguous Carts, channel/region/shipping/currency mismatch, mixed Product ownership, unavailable Products, and already-completed conflicts. Store-Order linking runs in the controlled completion workflow. If the core Order is already committed and link creation fails, checkout returns failure and records a durable repair item with Cart, Order, Tenant, StoreProfile, Store, and request context. It never reports false success.

Normal Store or merchant routes cannot edit ownership. Future repair/migration actions must be explicit, authorized, audited, guarded, and idempotent.

## Consequences

Merchant Order APIs authorize only by exact Store-Order ownership and return allowlisted DTOs. Legacy Vendor item metadata is non-authoritative. Existing records require a conservative dry-run-first backfill.

Phase 2C must address production repair processing, shared locking/idempotency infrastructure where deployment topology requires it, and any approved expansion of checkout operations. It does not weaken this ownership model.
