# Current Architecture

Last verified: 2026-07-17 after Phase 2C implementation and real-HTTP acceptance.

## Runtime identity

Merchant requests resolve signed merchant account -> active MerchantMembership -> active StoreProfile -> active Tenant -> one linked Medusa Store -> its default Sales Channel. Public requests resolve normalized verified StoreDomain -> active StoreProfile -> active Tenant -> one linked Medusa Store -> matching single-channel publishable key.

Medusa Store is the canonical commerce-store identity. Tenant groups Stores. StoreProfile owns SaaS metadata. MerchantMembership and StoreDomain are authoritative. Vendor is preserved only for authentication storage, current route/dashboard compatibility, and temporary dual writing.

Products have one canonical Medusa Store owner and one allowed Store channel. The Vendor-product link remains temporary and must agree with canonical ownership. Missing or inconsistent permanent links fail closed.

The application is a Medusa 2.17 modular monolith with bundled platform Admin extensions and a separate React/Vite Arabic-first merchant dashboard. The Store provisioning engine is implemented. Customer storefront UI and production deployment behavior are not.

## Cart and Order ownership

A Cart is linked to exactly one Medusa Store at creation. Completion links the resulting Order to that same Store before success is returned. Public Cart access requires the same verified hostname, single-channel publishable key, and Store context for the Cart lifetime.

Cart mutation validates canonical Product Store ownership, channel availability, Region, shipping option, promotion code, currency, and Store/Tenant status. Product channel mistakes cannot override canonical ownership. Merchant Order list/detail authorization starts from the Store-Order link; legacy Vendor item metadata is compatibility data only.

Order-link failures are checkout failures and create a durable repair record when the core Order cannot be compensated. Guarded backfills apply only unambiguous local ownership mappings.

## Phase 2C provisioning

The platform-only provisioning API invokes one durable orchestrator. StoreProvisioning checkpoints safe request identity, resource references, status, and audit events. StoreProvisioningLease provides database-backed idempotency and core Store-creation exclusion. Core Medusa resources use installed workflows; SaaS records use the SaaS module.

Activation is graph-gated. StoreProfile and the temporary legacy Vendor remain draft until structural invariants, MerchantStoreContext, and PublicStoreContext resolve. The owner account can be explicitly reused across Stores through one MerchantMembership per Store. Login requires Store selection when one account has multiple active memberships.

Compatible Regions may be shared because Medusa country ownership is unique globally; each Store records its allowed/default Region. Provisioning currently creates Stock Locations but not a compatible shipping option, so a newly provisioned Store cannot complete the real checkout journey until shipping/fulfillment is configured.

## Deferred risks and products

DNS verification, SSL issuance, customer storefront, WhatsApp checkout, customer OTP, platform dashboard UI, billing, and production migration are not implemented. The login and platform request limiters, event bus, and default runtime locking remain process-local where not replaced by the provisioning database lease.

Neon credential rotation is unverified and blocks production migration. Shared production infrastructure, monitoring, reviewed backups, and an approved migration runbook remain required.
