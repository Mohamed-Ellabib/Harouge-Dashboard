# ADR: Authoritative Store Provisioning Workflow

Status: accepted for Phase 2C
Date: 2026-07-13

## Decision

One server-side provisioning orchestrator owns creation of every SaaS Store graph. The platform-only API is the supported entry point. It requires platform administrator authentication and an idempotency key.

The orchestrator uses Medusa workflows for core resources and the SaaS module for permanent records. It stores checkpoints after every successful step so retries survive process restarts.

## Canonical resources

Each successful operation establishes a Tenant, StoreProfile, Medusa Store, Sales Channel, publishable API key and channel association, compatible Region and currency, Stock Location and channel link, StoreDomain, StoreBrand, legacy Vendor compatibility record, merchant owner, active MerchantMembership, and plan assignment.

A Region can be reused only when currency and the complete country set match. This is required because Medusa assigns each country to one Region. All other Store-specific relationships remain distinct.

## Idempotency and concurrency

StoreProvisioning has unique normalized reservations for the idempotency key, handle, and requested domain. StoreProvisioningLease provides database-backed exclusion for one request and for the Medusa core Store creation section. Identical concurrent requests converge on one result. Conflicting reservations fail deterministically.

The in-process Medusa locking provider is not treated as the correctness boundary.

## Activation

The StoreProfile and compatibility Vendor remain draft until structural graph validation succeeds. The workflow then activates both and validates MerchantStoreContext and PublicStoreContext. Context failure returns them to draft and records a safe failure.

## Credentials

The initial implementation accepts a platform-supplied temporary password, hashes it asynchronously in memory, and marks password change as required. The platform API uses a non-persisting workflow facade so plaintext credentials are not written to Medusa workflow state. Passwords are excluded from snapshots, results, events, and logs.

## Compensation

Created resources are retained inactive for idempotent retry. A failed operation records each resource as retained_for_retry. The workflow never deletes reused resources. Destructive cleanup requires later operator review; completed Stores are never deleted by provisioning.

## Domains

A verified temporary hostname is generated from the configured base domain. A custom hostname is recorded as pending and is not primary until later verification. DNS verification and SSL issuance are not part of Phase 2C.

## Deferred

The platform dashboard, public self-service signup, billing, DNS and SSL automation, distributed runtime infrastructure, production deployment, and Neon migration remain deferred.

## Gate-closure clarification

On 2026-07-18, the owner accepted exact compatible Region sharing and approved `adr-store-commerce-readiness.md` as a follow-up decision. Completion of this provisioning workflow proves the permanent Store identity graph; it does not prove online-checkout readiness. Base shipping configuration and validation belong to a separate durable, idempotent StoreCommerceSetup workflow.

That separate gate-closure workflow is now implemented in the current uncommitted working tree. Provisioning creates/ensures one readiness row: Starter is `not_required`; Professional is `pending`. StoreCommerceSetup later configures and validates the deterministic Store fulfillment graph before Professional readiness becomes `ready`. This does not expand the identity-provisioning contract and does not start Phase 3.

Legacy compatibility is frozen further in the same working tree. Standalone `POST /admin/vendors` returns a deterministic conflict, and compatibility Vendors mapped to a permanent Store cannot be changed or deleted through legacy PATCH/DELETE. The legacy row and VendorMember authentication layer remain in place; removal is still a separately approved migration phase.
