# Medusa SaaS Pivot Handoff

Last reconciled: 2026-07-17

This is the canonical orientation document for a new laptop, developer, or Codex session. Read it before making changes. Detailed decisions live in the other files in this directory.

## Repository snapshot

- Branch: `feat/saas-multi-store-pivot`
- Phase 2C HEAD before this handoff: `8b02475aba2ae89637f7b51057c5da7de2dfbf06`
- Working tree at handoff start: clean
- Configured Git remotes: none
- Nothing has been pushed from this repository
- Runtime: Node.js 20 through 23, npm workspaces/Turbo, Medusa 2.17, PostgreSQL
- Applications: Medusa backend/platform Admin and a separate React/Vite merchant dashboard
- Production storefront: not implemented

Verify Git after transferring the repository. Do not assume a new checkout has the expected branch or HEAD.

## Accepted phase commits

| Commit | Phase | Outcome |
| --- | --- | --- |
| `3f5f088` | Baseline | Clean pre-hardening baseline |
| `3bc7f49` | Phase 0.5 | Test foundation and four security fixes |
| `f6b1b95` | Phase 1 | Authoritative request Store contexts and isolation |
| `939b6a6` | Phase 2A | Permanent Tenant/Store model and Product ownership |
| `a769519` | Phase 2B | Immutable Cart and whole-Order Store ownership |
| `8b02475` | Phase 2C | Idempotent platform-only Store provisioning |

Phase 3 has not started. Customer storefront UI, WhatsApp checkout, customer OTP, platform dashboard UI, production migration, DNS/SSL automation, billing, and Vendor removal are not implemented.

## Product definition

This is a multi-store commerce SaaS, not a marketplace checkout. A client can have an independently designed storefront and domain while sharing one Medusa backend. Platform administrators provision Stores. Each merchant owner signs into a restricted Arabic-oriented dashboard and sees only their Store's Products and Orders. Platform administrators retain Medusa Admin access across the platform.

One Tenant may own multiple Stores. Medusa Store is the permanent commerce boundary. Sales Channel scopes availability but is not ownership.

## Repository layout

- `apps/backend`: Medusa backend, bundled Medusa Admin extensions, modules, APIs, workflows, migrations, scripts, and tests.
- `apps/vendor-dashboard`: separate Arabic-first merchant React/Vite dashboard on port 5173.
- `docs/saas-pivot`: ADRs, ownership rules, security risks, migration runbooks, and phase documentation.
- `scripts/run-workspace-tests.js`: root test orchestrator and expected-test guard.

The platform Admin is served at `http://localhost:9000/app`. The custom Admin extension includes Arabic translation assets, but do not assume every upstream Medusa screen has complete Arabic coverage.

## Canonical ownership

- Tenant groups one or more StoreProfiles.
- StoreProfile contains SaaS state, plan, handle, branding relation, domain relation, and the temporary legacy Vendor reference.
- StoreProfile links one-to-one to a Medusa Store.
- MerchantMembership authorizes one merchant account for one StoreProfile.
- StoreDomain is the permanent normalized hostname boundary.
- StoreBrand is allowlisted for public output.
- Product belongs to exactly one Medusa Store and its allowed Sales Channel.
- Cart belongs immutably to exactly one Medusa Store.
- Order belongs immutably to exactly one Medusa Store.
- Publishable key must map to exactly the Store's Sales Channel and agree with the request hostname.
- Legacy Vendor and VendorMember remain compatibility/authentication storage. They cannot override permanent Store ownership.

Important module links are StoreProfile-Store, Store-Product, Store-Cart, and Store-Order. Store-Cart and Store-Order use database uniqueness to prevent multiple owners.

## Models and contexts

The SaaS module includes Tenant, StoreProfile, StoreDomain, StoreBrand, MerchantMembership, CheckoutOwnershipRepair, StoreProvisioning, StoreProvisioningEvent, and StoreProvisioningLease.

The Marketplace module still includes Vendor, VendorMember, and VendorDomain for compatibility. Do not remove this layer without following `legacy-removal-plan.md`.

MerchantStoreContext resolves signed merchant session -> active membership -> active StoreProfile -> active Tenant -> exactly one Medusa Store -> allowed Sales Channel. Missing, inactive, or ambiguous relationships fail closed.

PublicStoreContext resolves actual request hostname -> verified StoreDomain -> active StoreProfile/Tenant/Store and requires the matching single-channel publishable key. Correct hostname with the wrong key, or correct key with the wrong hostname, returns 404.

CartStoreContext adds immutable Cart ownership, Region, currency, channel, publishable-key context, and status. Cart access and mutation must keep the same hostname, key, and Store for the Cart lifetime.

## Important HTTP surfaces

Platform-only:

- `POST /admin/saas/provisioning`, with platform auth and `Idempotency-Key`
- `GET /admin/saas/provisioning/:id`
- `DELETE /admin/saas/provisioning/:id`, only for eligible unfinished attempts
- `/admin/vendors*`, transitional platform management routes

Merchant:

- `POST /vendor/auth/login`
- `POST /vendor/auth/logout`
- `POST /vendor/auth/password`
- `GET /vendor/me`
- `GET|POST /vendor/products`
- `GET|PATCH /vendor/products/:id`
- `GET /vendor/orders`
- `GET /vendor/orders/:id`

Public/storefront:

- `GET /store/vendors/resolve`
- `GET /store/vendors/:handle`
- Medusa `/store/products*`
- Medusa `/store/carts*`
- Medusa payment-collection and shipping-option routes used by checkout

Public requests must send the real hostname in `Host` and the Store's publishable token in `x-publishable-api-key`.

## Provisioning behavior

The authoritative `provisionSaasStoreWorkflow` creates or configures Tenant, Medusa Store, StoreProfile, Sales Channel, publishable API key, compatible Region/currency, Stock Location, StoreDomain, StoreBrand, merchant owner, MerchantMembership, plan assignment, checkpoints, events, and a database lease.

Provisioning is graph-gated. The Store stays draft until required invariants and both request contexts resolve. Repeating the same input and idempotency key returns the same result; changed input with the same key fails. Passwords and key tokens are excluded from durable snapshots and provisioning responses.

Owner onboarding currently uses a platform-supplied temporary password. The application stores its hash, marks password change as required, and does not send invitation email. The operator must deliver credentials out of band. Owners authenticate at `/vendor/auth/login` and can change their password at `/vendor/auth/password`.

A future storefront receives its publishable key through operator-controlled deployment configuration. An authenticated platform administrator can retrieve publishable keys from Medusa's Admin API. Never expose an Admin bearer token or server secret to a storefront.

Allowed plans are `starter_whatsapp` and `professional_commerce`.

## Completed security work

- Product ownership and Sales Channel are derived server-side.
- Product reads require canonical Store ownership, not channel assignment alone.
- Password changes, platform resets, and disabled accounts revoke prior sessions.
- Password verification is asynchronous, bounded, rate-limited, and non-enumerating.
- Public Store responses use an explicit allowlist.
- Cart items require Product Store = Cart Store even when channels are misconfigured.
- Merchant Order authorization uses whole-Order Store ownership.
- Provisioning uses durable idempotency, graph-gated activation, safe serialization, and explicit owner reuse.

Production still needs shared rate limiting, distributed event/lock infrastructure or an approved equivalent, monitoring, DNS/SSL operations, and reviewed credential management.

## Automated validation last recorded

Phase 2C completion recorded 110 passing tests:

- Unit: 46
- Module integration: 8
- HTTP integration: 56
- Total: 110 passed, 0 failed

Backend lint, typecheck, and build passed. Merchant-dashboard lint, typecheck, and build passed. Migration apply, rollback/recovery, reapply, and link synchronization passed on guarded disposable PostgreSQL. These were not rerun while writing this handoff; verify them before a new implementation phase.

## Real-HTTP manual acceptance

On 2026-07-14, a temporary ignored runner recreated the guarded local database, ran the normal migration command, created a real platform administrator, started the real backend/Admin, and used real HTTP routes. The runner was removed afterward and was never committed.

Recorded outcome:

- Medusa Admin `/app`: 200
- 33 of 33 recorded API operations produced expected results
- Store A (Starter, Arabic, LYD) and Store B (Professional, Arabic, LYD) provisioned with 201
- both completed provisioning records survived backend restart
- both owners logged in and created/listed only their own Product
- cross-merchant Product reads and updates returned 404
- matching domain/key pairs resolved with 200; crossed pairs returned 404
- each public Product list contained only its Store's canonical Product
- Cart A accepted Product A, rejected Product B with 400, and was inaccessible from Domain B/Key B
- no generated credential appeared in captured output, snapshots, or API responses
- Neon was not accessed

Two acceptance gaps remain:

1. Both Stores requested Libya and LYD. Medusa permits one compatible Region to own that country, so Store B reused Store A's Region. Accept shared compatible Regions or change the requirement; do not force duplicate Regions around Medusa's invariant.
2. The provisioned Store had no compatible shipping option. `/store/shipping-options` returned 200 with an empty list, so real checkout, resulting Order ownership, and merchant-B Order denial were not exercised. Phase 2B integration fixtures create shipping configuration explicitly, unlike the real provisioning journey.

The status API does not expose raw StoreBrand, StoreDomain, or MerchantMembership IDs. The run proved separate created-resource records, distinct domains/brand inputs, distinct owner accounts, and independently resolving memberships, but not raw-ID inequality through HTTP.

## Database and secret safety

Never use Neon for development tests, migrations, diagnostics, acceptance runs, or backfills. The previously exposed Neon password rotation has not been verified. Never reproduce the old credential in a prompt, document, command, fixture, or log. Production migration is blocked until rotation is confirmed and the owner explicitly approves the runbook.

Tests require `NODE_ENV=test`, a dedicated `TEST_DATABASE_URL`, explicit disposable acknowledgement, a URL different from `DATABASE_URL`, and local PostgreSQL or an explicitly isolated disposable branch.

The current guard expects database `medusa_phase05_disposable`. The last acceptance used local PostgreSQL at `localhost:55432`. A new laptop may use another local port but must preserve every guard invariant.

Environment files are ignored and are not included in Git history or the transfer bundle. Recreate `apps/backend/.env` and `apps/backend/.env.test.local` securely. Do not transfer the old Neon credential as the production value.

## Commands

```powershell
npm.cmd ci
npm.cmd test
npm.cmd run lint
npm.cmd run build
npm.cmd run typecheck --workspace @dtc/backend
npm.cmd run typecheck --workspace @dtc/vendor-dashboard
node apps/backend/scripts/run-disposable-medusa.js db:migrate
npm.cmd run backend:dev
npm.cmd run vendor:dev
```

URLs:

- Platform Admin: `http://localhost:9000/app`
- Merchant dashboard: `http://127.0.0.1:5173/`

## Next decision, not an automatic phase

Do not begin Phase 3 automatically. First:

1. Confirm shared compatible Region reuse is accepted.
2. Decide whether base shipping/fulfillment belongs in provisioning or a separate setup workflow.
3. Rerun real checkout and prove canonical Order ownership after shipping exists.
4. Confirm Neon credential rotation before production planning.

After those decisions, start only an explicitly approved Phase 3A scope. Do not add OTP, WhatsApp checkout, billing, DNS automation, production migration, or Vendor removal unless requested.

## New Codex session bootstrap prompt

```text
Read AGENTS.md and docs/saas-pivot/HANDOFF.md completely before doing anything.
Then run git status --short --branch and git log --oneline -8.
Confirm the expected branch and phase commits, summarize the current architecture,
the two open manual-acceptance gaps, database safety rules, and the exact requested
phase boundary. Do not access Neon, expose environment values, start Phase 3, or
change code until I give the next explicit scope.
```

## Detailed source documents

- `roadmap-status.md`
- `current-architecture.md`
- `data-ownership-matrix.md`
- `security-risks.md`
- `neon-migration-runbook.md`
- `legacy-removal-plan.md`
- `adr-canonical-medusa-store.md`
- `adr-canonical-cart-order-store.md`
- `adr-store-provisioning-workflow.md`
- `phase-2c-provisioning-contract.md`
- `phase-2c-operational-runbook.md`
- `phase-2c-failure-matrix.md`
