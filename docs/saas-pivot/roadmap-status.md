# SaaS Pivot Roadmap Status

Last updated: 2026-07-12

## Current phase

**Phase 0.5 - complete**

No Phase 1 schema, storefront, provisioning, marketplace payment, commission,
or payout work was added.

## Completed

- A clean pre-hardening baseline commit was created locally and not pushed.
- Root/backend test scripts execute real tests and propagate failures.
- An intentional failing assertion was proven to fail, then removed.
- A dedicated local PostgreSQL target is protected by `TEST_DATABASE_URL`,
  `NODE_ENV=test`, disposable acknowledgement, database-name checks, and
  normal/test URL inequality.
- Official Medusa HTTP and module integration runners work on Windows with
  Node 20/22.
- Merchant A/B, vendor A/B, channel A/B, key A/B, and product A/B fixtures run
  only in disposable databases.
- The four confirmed findings have regression coverage and fixes.
- A product-channel dry-run diagnostic exists and was not run remotely.

## Database changes

No schema migration was added. Session versions and vendor sales-channel
configuration use existing metadata. Tests create/drop only disposable local
databases.

## Remaining owner actions

- Confirm rotation of the previously exposed Neon credential. Rotation could
  not be verified during Phase 0.5.
- Before horizontal production scaling, provide a shared rate-limiter backend.
- Review dry-run output before authorizing repair of existing channel links.

## Phase 1 gate

Phase 1 development is unblocked. Backend and dashboard lint, type-check, and
build gates pass; the root command discovers 28 tests and passes all 28; the
single targeted discovery and validation passes found no surviving new
critical/high issue. Neon credential rotation remains a production release
blocker, and the documented out-of-scope architecture risks remain Phase 1
design inputs.
