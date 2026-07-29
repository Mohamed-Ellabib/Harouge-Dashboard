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

Phase 2C is implemented at commit `8b02475`; the later commerce-readiness gate closure, platform dashboard, Phase 3A storefront, and Phase 3B commerce pilot were committed on 2026-07-29 (`8d58549`, `0cc8903`, `a369c34`, `d043ce7`) and pushed to the `origin` remote. Owner-authorized Phase 3A closed its guarded-local exit gate on 2026-07-22. Owner-authorized Phase 3B passed its guarded current-tree Phase 2C real-backend API rerun, automated/browser matrix, backend-restart persistence, and cleanup on 2026-07-22, and the owner performed the distinct physical-keyboard Cart-to-confirmation journey on 2026-07-29, closing the Phase 3B guarded-local exit gate. This is not production or public-pilot acceptance. Do not begin Phase 3C, production work, or Vendor removal without separate owner approval. Keep historical Phase 2C, current-tree Phase 2C rerun, Phase 3B browser, physical-keyboard, and cleanup evidence separate.
