# Current Architecture

Last verified: 2026-07-13 after Phase 2B implementation.

## Runtime identity

Merchant requests resolve signed merchant account -> active MerchantMembership -> active StoreProfile -> active Tenant -> one linked Medusa Store -> its default Sales Channel. Public requests resolve normalized verified StoreDomain -> active StoreProfile -> active Tenant -> one linked Medusa Store -> matching single-channel publishable key.

Medusa Store is the canonical commerce-store identity. Tenant groups stores. StoreProfile owns SaaS metadata. MerchantMembership and StoreDomain are authoritative. Vendor is preserved only for authentication storage, current route/dashboard response compatibility, and temporary dual writing.

Products have one canonical Medusa Store owner and one allowed Store channel. The Vendor-product link remains temporarily and must agree with canonical ownership. Missing or inconsistent permanent links fail closed.

The application remains a Medusa 2.17 modular monolith with a separate React/Vite Arabic merchant dashboard. Phase 2B adds checkout ownership enforcement without adding a storefront, provisioning engine, or deployment behavior.

## Deferred risks

DNS verification and SSL issuance are not implemented. The login limiter, event bus, and locking provider remain process-local. Neon credential rotation is unverified and blocks production migration.

## Phase 2B checkout ownership

Phase 2B adds immutable whole-resource ownership. A Cart is linked to exactly one Medusa Store at creation, and completion links the resulting Order to that same Store before success is returned. Public cart access requires the same verified hostname, single-channel publishable key, and Store context for the Cart lifetime.

Cart mutation policy validates canonical Product Store ownership, channel availability, region, shipping option, promotion code, currency, and Store/Tenant status. Product channel mistakes cannot override canonical ownership. Merchant order list/detail authorization starts from the Store-Order link; legacy Vendor item metadata is compatibility data only.

Order-link failures are reported as checkout failures and create a durable checkout ownership repair record when the core Order can no longer be safely compensated. The guarded backfill diagnoses existing Cart/Order ownership and applies only unambiguous local mappings. Production execution remains blocked.

Phase 2C still owns production-grade shared locking/idempotency infrastructure and any broader checkout capabilities. Storefront UI, provisioning, customer OTP, WhatsApp checkout, and production migration are not implemented.

## Phase 2C provisioning

The platform-only provisioning API invokes one durable orchestrator. StoreProvisioning checkpoints safe input identity, resource references, status, and audit events. StoreProvisioningLease provides database-backed idempotency and core Store-creation exclusion. Core Medusa resources are created through installed workflows; SaaS records use the SaaS module.

Activation is graph-gated. StoreProfile and the temporary legacy Vendor remain draft until structural invariants, MerchantStoreContext, and PublicStoreContext resolve. Product, Cart, and Order ownership helpers remain canonical and unchanged.

The owner account can be explicitly reused across Stores through one MerchantMembership per Store. Login requires Store selection when an account has multiple active memberships. Compatible Regions may be shared because Medusa country ownership is unique globally; each Store still records its allowed and default Region.
