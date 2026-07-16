# Medusa Multi-Store Commerce SaaS

Medusa 2.17 backend with a platform Admin, an Arabic-first merchant dashboard, permanent Tenant/Store ownership, isolated Products/Carts/Orders, and idempotent Store provisioning.

Before working in this repository, read [the project handoff](docs/saas-pivot/HANDOFF.md). Codex sessions must also follow [AGENTS.md](AGENTS.md).

## Applications

- Backend and platform Admin: `apps/backend`
- Merchant dashboard: `apps/vendor-dashboard`
- Architecture and phase records: `docs/saas-pivot`

A customer storefront has not been implemented.

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
```

- Platform Admin: `http://localhost:9000/app`
- Merchant dashboard: `http://127.0.0.1:5173/`

## Validation

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run build
npm.cmd run typecheck --workspace @dtc/backend
npm.cmd run typecheck --workspace @dtc/vendor-dashboard
```

Use the guarded runner for disposable local migrations:

```powershell
node apps/backend/scripts/run-disposable-medusa.js db:migrate
```

Never run tests, backfills, diagnostics, or acceptance flows against Neon. Production migration remains blocked as documented in the handoff and migration runbook.
