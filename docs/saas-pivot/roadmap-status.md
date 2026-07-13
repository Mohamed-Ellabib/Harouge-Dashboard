# SaaS Pivot Roadmap Status

Last updated: 2026-07-13

## Current phase

Phase 2A - complete and validated.

Phase 1 commit: f6b1b95. Phase 0.5 commit: 3bc7f49. The branch is local and has no configured remote.

## Delivered

- Tenant, StoreProfile, StoreDomain, StoreBrand, and MerchantMembership module.
- One-to-one StoreProfile-Medusa Store and one-to-many Store-Product links.
- Permanent merchant and public context switchover.
- Canonical product ownership with centralized temporary Vendor dual writing.
- LYD/default Arabic store backfill, dry-run/apply safety, idempotency, resumption, and conflict reporting.
- Generated SaaS migration with tested rollback/reapply path.
- Updated ADRs, ownership matrix, route matrix, migration guide, Neon runbook, and removal plan.
- Final gate: backend lint/typecheck/build PASS; dashboard lint/typecheck/build PASS; 31 unit + 8 module + 20 HTTP integration tests = 59/59 PASS; migration rollback/reapply and guarded backfill dry-run/apply/reconciliation PASS.
- Focused security validation found and fixed one public-product canonical ownership gap; no plausible critical/high issue remains in the modified Phase 2A paths.

## Gate

Phase 2B may begin after the Phase 2A commit. It must start with immutable cart and order Store ownership and mixed-store prevention. Production migration remains blocked until the owner confirms Neon credential rotation and explicitly approves the runbook.
