# Data Ownership Matrix

Last verified: 2026-07-13 after Phase 2B implementation.

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
