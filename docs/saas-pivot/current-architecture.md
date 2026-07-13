# Current Architecture

Last verified: 2026-07-13 after Phase 2A implementation.

## Runtime identity

Merchant requests resolve signed merchant account -> active MerchantMembership -> active StoreProfile -> active Tenant -> one linked Medusa Store -> its default Sales Channel. Public requests resolve normalized verified StoreDomain -> active StoreProfile -> active Tenant -> one linked Medusa Store -> matching single-channel publishable key.

Medusa Store is the canonical commerce-store identity. Tenant groups stores. StoreProfile owns SaaS metadata. MerchantMembership and StoreDomain are authoritative. Vendor is preserved only for authentication storage, current route/dashboard response compatibility, and temporary dual writing.

Products have one canonical Medusa Store owner and one allowed Store channel. The Vendor-product link remains temporarily and must agree with canonical ownership. Missing or inconsistent permanent links fail closed.

The application remains a Medusa 2.17 modular monolith with a separate React/Vite Arabic merchant dashboard. Phase 2A added no storefront, provisioning engine, checkout changes, or deployment behavior.

## Deferred risks

Carts and orders still lack immutable Store ownership. Current merchant order filtering remains a compatibility mitigation. DNS verification and SSL issuance are not implemented. The login limiter, event bus, and locking provider remain process-local. Neon credential rotation is unverified and blocks production migration.
