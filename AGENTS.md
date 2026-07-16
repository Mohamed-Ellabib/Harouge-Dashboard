# Project Instructions

Before changing code in this repository:

1. Read `docs/saas-pivot/HANDOFF.md` completely.
2. Read `docs/saas-pivot/roadmap-status.md` and the ADRs relevant to the requested phase.
3. Run `git status --short --branch` and `git log --oneline -8`.
4. Confirm the requested work does not cross a phase boundary without explicit owner approval.

## Safety rules

- Never print, commit, log, or place credentials in fixtures or documentation.
- Never access Neon for tests, migrations, diagnostics, backfills, or acceptance work.
- The previously exposed Neon credential rotation is unverified. Production migration remains blocked.
- Use the guarded disposable PostgreSQL configuration and `TEST_DATABASE_URL` for tests.
- Do not silently use `DATABASE_URL` when a test database is unavailable.
- Do not remove the legacy Vendor compatibility layer until a separately approved migration phase.
- Do not perform a broad security scan unless the owner explicitly requests one.
- Do not push or configure a remote without explicit owner approval.

## Current boundary

Phase 2C is implemented at commit `8b02475`. Its real-HTTP manual acceptance is recorded in the handoff. Phase 3 has not started. Resolve or explicitly accept the Region and shipping-option acceptance gaps before treating the Phase 2C manual gate as fully complete.
