# ADR: Legacy Vendor Migration

Status: accepted for Phase 2A, 2026-07-13.

Vendor rows are preserved as compatibility records. The backfill creates or reuses Tenant, StoreProfile, Medusa Store, domain, brand, membership, Store link, and product ownership records. StoreProfile.legacy_vendor_id is the unique mapping key.

The migration is separate from schema migration, defaults to dry-run, uses deterministic IDs for created custom records, and is resumable. Apply is refused in production, on remote databases, on a configured protected target, and in tests without the disposable-database acknowledgement.

Existing Medusa Store reuse is allowed only when there is one Vendor and exactly one unlinked Store. Ambiguous mappings are reported and skipped. Legacy product links remain until the removal plan is completed.

Temporary dual writing is centralized in legacy-vendor-compatibility.ts and syncVendorProducts. Permanent writes happen first and are compensated if the legacy write fails. This boundary is scheduled for removal after all routes and dashboards stop using Vendor terminology.
