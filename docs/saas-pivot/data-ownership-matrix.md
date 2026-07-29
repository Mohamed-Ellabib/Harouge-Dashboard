# Data Ownership Matrix

Last verified: 2026-07-22 against Phase 2C commit `8b02475` and the current uncommitted gate-closure/Phase 3A/Phase 3B working tree. Accepted evidence includes commerce readiness 12/12, commerce-resource units 5/5, Phase 2B Cart/Order regression 12/12, immutable-policy-pin units 2 suites/9 tests, storefront Vitest 3 files/11 tests, and final backend regression 23 suites/144 tests (62 unit, 10 module, 72 HTTP).

| Resource | Authoritative owner | Enforcement | Status |
| --- | --- | --- | --- |
| SaaS account | Tenant | active status required by contexts | PERMANENT |
| Commerce store | Medusa Store | one-to-one StoreProfile link | PERMANENT |
| SaaS store metadata | StoreProfile | unique handle and legacy mapping | PERMANENT |
| Merchant access | MerchantMembership | account/store pair, role, active status | PERMANENT |
| Public hostname | StoreDomain | unique normalized verified hostname | PERMANENT |
| Brand | StoreBrand | one record per StoreProfile; allowlisted output | PERMANENT |
| Product | Medusa Store-product link | one owner plus matching channel | PERMANENT |
| Sales availability | Sales Channel | must equal Medusa Store default/allowed channel | PERMANENT SCOPE |
| Publishable key | Medusa key-channel link | host Store channel must match key's only channel | VERIFIED |
| Vendor | StoreProfile legacy_vendor_id | compatibility only; cannot override permanent context | TRANSITIONAL |
| Order item | Canonically owned product | reduced merchant DTO | TEMPORARY |
| Cart | Medusa Store-Cart link | unique immutable ownership plus request-context checks | PERMANENT |
| Order | Medusa Store-Order link | unique immutable whole-order ownership | PERMANENT |
| Checkout entitlement | StoreProfile plan | Starter disabled; Professional requires current ready graph | PERMANENT POLICY |
| Checkout readiness | StoreCommerceReadiness | one StoreProfile row plus completed setup and live validation | OPERATIONAL AUTHORIZATION EVIDENCE |
| Public checkout capability | verified PublicStoreContext plus live commerce graph | exact allowlisted boolean response; never inferred by the browser | DERIVED PUBLIC POLICY |
| Purchase option | canonical Store Product/variant/channel plus Store currency | one opaque variant write reference and exact calculated price; revalidated on Cart write | DERIVED PUBLIC INPUT |
| Browser Cart reference | same-origin customer session | only opaque Cart ID in versioned sessionStorage; backend context remains authoritative | EPHEMERAL CLIENT REFERENCE |
| Customer checkout details | current browser memory | submitted only to guarded Cart APIs; not stored by the Storefront | EPHEMERAL CLIENT INPUT |
| Reduced confirmation | completed in-memory customer journey | allowlisted totals/count only; no public Order lookup | EPHEMERAL CLIENT VIEW |

One Tenant with multiple StoreProfiles is supported. Store A/Store B fixtures prove membership, domain, key, product-owner, and channel isolation.

## Phase 2B additions

| Resource | Authoritative owner | Enforcement | Status |
| --- | --- | --- | --- |
| Cart | Medusa Store-Cart link | unique link created from PublicStoreContext; immutable for Cart lifetime | PERMANENT |
| Cart item | Cart Store plus Product Store | exact canonical owner and matching channel required | PERMANENT |
| Order | Medusa Store-Order link | copied from validated Cart or derived unambiguously for direct Admin draft order | PERMANENT |
| Merchant order access | Order Store | membership Store must equal exact whole-Order owner | PERMANENT |
| Legacy Vendor order-item metadata | none | compatibility only; never authorizes Order access | TRANSITIONAL |
| Checkout repair record | Tenant/StoreProfile/Store | durable evidence for ownership-link failure | OPERATIONAL |

The Store-Cart and Store-Order link schemas also carry a unique `ownership_key`, giving the database a single-owner constraint for each Cart and Order under concurrent execution.

## Phase 2C additions

| Record | Canonical owner | Creation boundary | Mutability |
| --- | --- | --- | --- |
| StoreProvisioning | Platform | Platform provisioning API | Status/checkpoints only |
| StoreProvisioningEvent | StoreProvisioning | Provisioning orchestrator | Append-only evidence |
| StoreProvisioningLease | Database operation key | Provisioning orchestrator | Ephemeral, soft-deleted on release |
| Tenant key | Tenant | Provisioning reservation | Immutable through provisioning |
| Plan assignment | StoreProfile | Validated provisioning input | Later controlled plan workflow |
| Temporary domain | StoreProfile | Configured base-domain policy | Immutable hostname |
| Owner membership | StoreProfile and merchant account | Explicit provisioning relation | Controlled membership administration |

## Phase 2C gate-closure working-tree additions

| Resource/record | Authoritative scope | Enforcement | Sharing/mutability |
| --- | --- | --- | --- |
| StoreCommerceReadiness | StoreProfile | unique row; plan + completed setup + live graph must agree | Current operational state; `disabled` reserved |
| StoreCommerceSetup | StoreProfile and global idempotency key | one unfinished operation per Store; same-key/input replay | Completed immutable; update/reconfiguration unsupported |
| StoreCommerceSetupEvent | StoreCommerceSetup | sanitized append-only lifecycle/checkpoint evidence | Operational only |
| StoreCommerceSetupLease | StoreProfile execution key | one active database lease; token-matching release | Expired lease retained for attention |
| Compatible Region | Region currency + exact complete country set | Store retains one allowed/default Region reference | SHARED CONFIGURATION, NOT OWNERSHIP |
| Default Shipping Profile | Framework fulfillment configuration | Store metadata pins selected profile | SHARED FRAMEWORK RESOURCE |
| Fulfillment provider | Framework provider | enabled `manual_manual` linked to Store location | SHARED LOCAL PROVIDER |
| Payment provider | Framework provider/Region link | enabled `pp_system_default` linked to allowed Region | SHARED LOCAL PROVIDER |
| Fulfillment Set | StoreProfile-derived deterministic identity | exclusive Store Stock Location link in both directions | STORE-SPECIFIC |
| Service Zone | Store Fulfillment Set | exactly one country-only zone matching Region countries | STORE-SPECIFIC |
| Shipping Option | Store Service Zone | exactly one deterministic option; exact provider/profile/rules/prices | STORE-SPECIFIC |
| Shipping-option policy | Medusa Store metadata | exact singleton option allowlist | STORE-SPECIFIC POLICY |
| Shipping-profile policy | Medusa Store metadata | pinned profile reference | STORE-SPECIFIC POLICY |

Readiness never owns Product, Cart, or Order. It controls whether new online-checkout operations are allowed; canonical immutable Store links remain the ownership authority.

The setup SHA-256 digest pins the normalized shipping input plus a versioned server-derived policy tied to exactly one completed provisioning record: Tenant, StoreProfile, Medusa Store, plan, Region, location, channel, currency, countries, and local providers. The canonical non-secret digest is stable across authentication/session secret rotation. Retry and completion re-resolve that policy and fail on drift. Immutable-policy pinning has focused unit evidence of 2 suites/9 tests passing. No commerce update workflow is currently authorized.

## Legacy compatibility freeze

| Legacy surface | Current policy | Status |
| --- | --- | --- |
| Standalone Vendor create | Always rejected; use canonical SaaS provisioning | FROZEN |
| Mapped Vendor PATCH | Rejected when StoreProfile references the Vendor | READ-ONLY COMPATIBILITY |
| Mapped Vendor DELETE | Rejected when StoreProfile references the Vendor | DELETE BLOCKED |
| Unmapped historical Vendor | Legacy PATCH/DELETE retained for migration compatibility | TRANSITIONAL |
| VendorMember identity | Authentication/account compatibility remains | TRANSITIONAL |
| Vendor-product link | Must agree with canonical Store ownership | TRANSITIONAL |
