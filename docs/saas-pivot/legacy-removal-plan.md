# Legacy Vendor Removal Plan

Vendor is retained during Phase 2A.

1. Backfill and reconcile every Vendor.
2. Stop creating standalone Vendors without permanent records.
3. Move dashboard response types from Vendor vocabulary to StoreProfile.
4. Remove Vendor metadata dependence for publishable-key references.
5. Replace legacy member identity with the long-term merchant account model if required.
6. Remove Vendor-product dual writing after canonical ownership has remained consistent through an agreed observation period.
7. Remove legacy route adapters.
8. Archive or delete Vendor data only under a separately approved, reversible migration.

Fallback to Vendor is not implemented for migrated contexts. Missing permanent relationships fail closed in all environments. Phase 2B completed canonical Cart/Order ownership, but legacy removal still requires the later reconciliation and observation gates below.

## Phase 2B status

Cart and Order authorization now uses canonical whole-resource Medusa Store links. Legacy Vendor/order-item metadata may remain for compatibility but cannot grant access or override Store ownership. Vendor removal still requires reconciliation of all StoreProduct, StoreCart, and StoreOrder links, resolution of ownership conflicts, an observation period, and a separately approved reversible migration. Phase 2B does not remove Vendor data.

## Phase 2C impact

Provisioning still creates one draft-then-active legacy Vendor as a compatibility adapter. The permanent authority is Tenant, StoreProfile, Medusa Store, MerchantMembership, StoreDomain, and canonical Product/Cart/Order links. StoreProvisioning records legacy_vendor_id only for retry and later reconciliation.

Legacy removal remains blocked until merchant authentication no longer stores identity credentials in VendorMember, all dashboard routes use MerchantMembership and Medusa Store, and domain/product/order compatibility reads have been removed.
