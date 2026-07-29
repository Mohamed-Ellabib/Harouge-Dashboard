# Medusa Multi-Store Commerce SaaS

Medusa 2.17 backend with owner and merchant administration, permanent Tenant/Store ownership, isolated Products/Carts/Orders, idempotent Store provisioning, and an Arabic-first customer storefront with a bounded guarded-local commerce pilot.

Before working in this repository, read [the project handoff](docs/saas-pivot/HANDOFF.md). Codex sessions must also follow [AGENTS.md](AGENTS.md).

## Applications

- Backend and platform Admin: `apps/backend`
- Merchant dashboard: `apps/vendor-dashboard`
- Owner platform dashboard: `apps/platform-dashboard`
- Phase 3A/3B customer storefront: `apps/storefront`
- Architecture and phase records: `docs/saas-pivot`

Phase 3A implements `/`, `/products`, and `/products/:handle` with an exact public DTO boundary and Store-scoped reads; its guarded-local gate is closed. The bounded Phase 3B pilot adds guest Cart, checkout, one Store shipping option, local system payment, reduced confirmation, and owning-merchant Order visibility. Its automated/browser/restart/regression/cleanup evidence passed on 2026-07-22, but its distinct owner-performed physical-keyboard journey remains pending, so the Phase 3B gate is open. No public pilot or production readiness is claimed.

## Requirements

- Node.js 20 through 23
- npm
- PostgreSQL 15 or newer

## Setup

```powershell
npm.cmd ci
```

Environment files are intentionally ignored. Recreate `apps/backend/.env` and the guarded `apps/backend/.env.test.local` without putting credentials in Git, documentation, or prompts.

Run the applications:

```powershell
npm.cmd run backend:dev
npm.cmd run vendor:dev
npm.cmd run platform:dev
npm.cmd run storefront:dev
```

- Platform Admin: `http://localhost:9000/app`
- Merchant dashboard: `http://127.0.0.1:5173/`
- Owner platform dashboard: `http://127.0.0.1:5174/`
- Customer storefront development server: `http://127.0.0.1:5175/`

## Validation

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run build
npm.cmd run typecheck --workspace @dtc/backend
npm.cmd run typecheck --workspace @dtc/vendor-dashboard
npm.cmd run typecheck --workspace @dtc/platform-dashboard
npm.cmd run typecheck --workspace @dtc/storefront
npm.cmd run test --workspace @dtc/storefront
```

The interactive guarded real-backend smokes are:

```powershell
npm.cmd run storefront:accept
npm.cmd run commerce:accept
```

They require Node 20 through 23 and free loopback ports 9000, 5175, and 5176. The wrapper exclusively locks and resets only the exact local disposable `medusa_phase05_disposable` database, so do not run another disposable-database command concurrently. Normal shutdown stops the owned processes and embedded local PostgreSQL, scrubs the synthetic schema, and removes the temporary encrypted handoff.

Use the guarded runner for disposable local migrations:

```powershell
node apps/backend/scripts/run-disposable-medusa.js db:migrate
```

Never run tests, backfills, diagnostics, or acceptance flows against Neon. Production migration remains blocked as documented in the handoff and migration runbook.
