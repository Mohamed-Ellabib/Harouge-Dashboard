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

Phase 2C is implemented at commit `8b02475`; later commerce-readiness gate closure is uncommitted and documented in the handoff. Owner-authorized Phase 3A is implemented in the uncommitted working tree, and its guarded-local exit gate was closed on 2026-07-22 after the recorded real-backend matrix and manual keyboard pass. Owner-authorized Phase 3B is also implemented in the uncommitted working tree. Its guarded current-tree Phase 2C real-backend API rerun, Phase 3B automated/browser matrix, backend-restart persistence, and cleanup passed on 2026-07-22; its distinct owner-performed physical-keyboard acceptance is still pending, so the Phase 3B exit gate remains open. This is not production or public-pilot acceptance. Do not begin Phase 3C, production work, or Vendor removal without separate owner approval. Keep historical Phase 2C, current-tree Phase 2C rerun, Phase 3B browser, physical-keyboard, and cleanup evidence separate.
