# SaaS Pivot Roadmap Status

Last updated: 2026-07-12

## Current phase

**Phase 0 - Verified Audit (audit complete; implementation gate not satisfied)**

No Phase 1 implementation, storefront, tenant schema, mass rename, or
marketplace feature was added.

## Completed evidence

- Repository, package, version, environment, route, and module inventory.
- Merchant login, product create/update, ownership, order, and domain flows
  traced in source.
- Live PostgreSQL schema and Medusa resource counts inspected read-only.
- Local secrets remained unprinted and `.env` is ignored.
- Backend build/lint and merchant dashboard build/typecheck passed.
- Backend and merchant dashboard started successfully.
- Health, Admin asset, merchant asset, and unauthenticated boundaries tested.
- Arabic login and invalid-login behavior browser-tested without console error.
- Six required Phase 0 documents created.
- Codex Security repository scan sealed with 53 first-party review receipts.
- Four reportable findings finalized: three medium and one low.

## Failed gates and blockers

- Root tests execute zero tests.
- Backend unit script fails on Windows before Jest starts.
- Jest references a missing setup file; no tests exist.
- No Store A/Store B fixtures or automated isolation suite exists.
- Authenticated merchant positive flow was not rerun because Phase 0 did not
  reset or expose a plaintext credential.
- Public key/domain positive smoke test remains unverified after its read-only
  permission request timed out twice.

## Architecture decisions

- Keep a modular monolith with shared backend and database.
- Keep the separate branded merchant dashboard.
- Keep Medusa Admin internal only.
- Target separate Tenant and SaaS Store entities.
- Keep Vendor temporarily through a compatibility service.
- Do not add marketplace commissions, payouts, split payments, or shared cart.
- Enforce Store isolation in the backend and automated tests.

## Database migrations

None in Phase 0. Existing custom migrations create Vendor, Vendor Domain, and
Vendor Member. The Medusa link creates the vendor-product link table.

## Tests added

None. Phase 0 proved the existing harness is broken. Repair and the mandatory
isolation suite are required before Phase 1 can pass.

## Known risks

- Global product sales-channel assignment.
- No whole-order Store ownership.
- No database single-owner invariant for products.
- No authoritative hostname/key/channel Store context.
- No role policy, session revocation, rate limiting, or audit log.
- Unrestricted public vendor metadata.
- Fake Redis, local event bus, and in-memory locking.
- No Git history; all files are untracked.
- Previously exposed database credential requires rotation before production.

## Exact next action

Repair the test harness, add disposable Store A/Store B fixtures, and implement
the mandatory isolation and authentication regression suite. Then rerun the
full gate. Do not begin Phase 1 schema or storefront work until those tests pass
and the medium findings have approved remediation plans.
