# LabibTech Commerce SaaS

Multi-store ecommerce SaaS for independently branded Libyan merchants. The
platform provides owner onboarding, isolated merchant operations, bilingual
storefronts, product variants and inventory, and guest checkout in LYD.

## Start here

1. Read [`AGENTS.md`](AGENTS.md) for repository safety rules.
2. Read the current [`project handoff`](docs/saas-pivot/HANDOFF.md).
3. Read the approved [`Phase 3C MVP contract`](docs/saas-pivot/phase-3c-mvp-contract.md).
4. Use the [`documentation index`](docs/README.md) instead of searching through historical files.

## Applications

| Application | Location | Local URL |
| --- | --- | --- |
| Commerce backend and framework Admin | `apps/backend` | `http://localhost:9000/app` |
| Merchant dashboard | `apps/vendor-dashboard` | `http://127.0.0.1:5175/` |
| Platform-owner dashboard | `apps/platform-dashboard` | `http://127.0.0.1:5174/` |
| Customer storefront | `apps/storefront` | `http://127.0.0.1:5176/` |

## Current product boundary

Phase 3C is the active, owner-approved concierge MVP: Libya/LYD, assisted
merchant onboarding, Store-owned size/color variants and stock, COD or manual
bank transfer, merchant Order operations, three shared Arabic/English
storefront templates, custom domains, and merchant WhatsApp alerts.

Production deployment, public traffic, customer accounts, automated billing,
online payments, courier integration, returns automation, and removal of the
legacy Vendor compatibility layer are not authorized.

## Development

Requirements: Node.js 20 through 23 and npm; `.nvmrc` pins the recommended
Node.js 22 runtime. Interactive development uses the
owner-approved, pinned Supabase development project; automated tests continue
to use owned disposable PostgreSQL on loopback.

Complete the one-time guarded setup in the
[`Supabase development runbook`](docs/saas-pivot/supabase-development-runbook.md),
then run:

```powershell
npm.cmd ci
npm.cmd run backend:dev
npm.cmd run vendor:dev
npm.cmd run platform:dev
npm.cmd run storefront:dev
```

Or start all four applications together:

```powershell
npm.cmd run dev
```

The Supabase database connection is entered through a hidden prompt and stored
with Windows DPAPI outside the repository. Never paste it into chat, an
environment template, a command, or Git. Never use the historical Neon
configuration. Production and public traffic remain blocked.

## Focused checks

Use the smallest check that covers the change. Common commands are:

```powershell
npm.cmd run typecheck --workspace @dtc/vendor-dashboard
npm.cmd run typecheck --workspace @dtc/platform-dashboard
npm.cmd run typecheck --workspace @dtc/storefront
npm.cmd run typecheck --workspace @dtc/backend
npm.cmd run build
```

The guarded storefront and commerce acceptance runners are destructive only to
their exact disposable local database. Read the handoff before running them.
