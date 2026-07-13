# Data Ownership Matrix

Last verified: 2026-07-13 after Phase 2A implementation.

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
| Cart/order | none | current item filtering only | PHASE 2B REQUIRED |

One Tenant with multiple StoreProfiles is supported. Store A/Store B fixtures prove membership, domain, key, product-owner, and channel isolation.
