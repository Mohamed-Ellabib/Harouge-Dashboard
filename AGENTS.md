# Project Instructions

Before changing code in this repository:

1. Read `docs/saas-pivot/HANDOFF.md` completely.
2. Use `docs/README.md` to find current guidance, then read `docs/saas-pivot/roadmap-status.md` and the ADRs relevant to the requested phase.
3. Run `git status --short --branch` and `git log --oneline -8`.
4. Confirm the requested work does not cross a phase boundary without explicit owner approval.

## Safety rules

- Never print, commit, log, or place credentials in fixtures or documentation.
- Never access Neon for tests, migrations, diagnostics, backfills, or acceptance work.
- The previously exposed Neon credential rotation is unverified. Production migration remains blocked.
- Interactive development may use only the tracked, pinned Supabase development project through the guarded Supabase runner. Never use that project for production or automated tests.
- Use the guarded disposable PostgreSQL configuration and `TEST_DATABASE_URL` for tests.
- Every automated backend test and acceptance command must own its loopback disposable PostgreSQL process; never attach to an already-running database port.
- Do not silently use `DATABASE_URL` when a test database is unavailable.
- Do not remove the legacy Vendor compatibility layer until a separately approved migration phase.
- Do not perform a broad security scan unless the owner explicitly requests one.
- Do not push or configure a remote without explicit owner approval.

## Current boundary

Phase 2C is implemented at commit `8b02475`; the later commerce-readiness gate closure, platform dashboard, Phase 3A storefront, and Phase 3B commerce pilot were committed on 2026-07-29 (`8d58549`, `0cc8903`, `a369c34`, `d043ce7`) and pushed to the `origin` remote. Owner-authorized Phase 3A closed its guarded-local exit gate on 2026-07-22. Owner-authorized Phase 3B closed its guarded-local exit gate on 2026-07-29 after the separate automated/browser/restart/cleanup and physical-keyboard evidence.

On 2026-08-01 the owner approved `docs/saas-pivot/phase-3c-mvp-contract.md` for planning and implementation. Phase 3C is a concierge Libya/LYD MVP with assisted merchant onboarding, three shared bilingual templates, custom domains, size/color variants with stock, COD/manual bank transfer, merchant WhatsApp alerts, and manual fulfillment status. Follow that contract exactly. This authorization does not permit production deployment, public traffic, Neon access, or Vendor removal; those remain separately gated.
