# Phase 2A Schema

## SaaS module

| Model | Purpose | Key constraints |
| --- | --- | --- |
| Tenant | SaaS account grouping | status check; status index |
| StoreProfile | SaaS extension of Medusa Store | unique handle; unique nullable legacy Vendor; Tenant FK; status/plan checks |
| StoreDomain | Authoritative public hostname | globally unique normalized hostname; one primary domain per StoreProfile; status checks |
| StoreBrand | Safe visual configuration | one active record per StoreProfile |
| MerchantMembership | Merchant-to-store authorization | unique merchant/store pair; role/status checks |

StoreProfile links one-to-one with Medusa Store through store_profile_store. Medusa Store links one-to-many with Product through store_product, making one Store owner valid for each Product.

Initial defaults are ar-LY, Africa/Tripoli, and LYD for newly backfilled Medusa Stores. Plans are starter_whatsapp and professional_commerce. Brand JSON does not accept executable CSS, HTML, or JavaScript through any Phase 2A route.

The generated SaaS migration has a down migration. Link tables are managed by medusa db:sync-links.
