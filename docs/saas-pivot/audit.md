# Phase 0 Verified Audit

Audit date: 2026-07-12

Scope: `C:\Users\MSI\Documents\Medusa-commernce-backend`

This audit describes the current implementation. It does not claim that the
project is production-ready or that multi-store isolation has been proven.

## Repository and runtime evidence

- Git branch: `master`.
- Git state: no commits; all project files are untracked. No branch was created
  because doing so would not protect or isolate the existing uncommitted work.
- Package manager: npm workspaces with Turbo (`npm 11.12.1`).
- Runtime observed: Node `24.15.0`; package contract requires Node 20 or newer.
- Installed Medusa packages: `@medusajs/medusa`, `@medusajs/framework`, and
  `@medusajs/dashboard` are all `2.17.0`.
- Applications: `apps/backend` and `apps/vendor-dashboard`.
- Database: remote PostgreSQL configured through ignored `apps/backend/.env`.
  No secret value was printed or copied into these documents.
- Database records observed through read-only queries: one current vendor, one
  vendor member, one vendor domain, and three vendor-product links.
- Medusa commerce resources observed: one Medusa store, one sales channel, one
  publishable key, one region, and one stock location.

## Executable verification

| Check | Result | Evidence |
| --- | --- | --- |
| Backend build | PASS | `npm.cmd run build` in `apps/backend`; backend and Admin frontend completed, exit 0. |
| Backend lint | PASS | `npm.cmd run lint` in `apps/backend`, exit 0. |
| Merchant dashboard build | PASS | TypeScript and Vite build completed, exit 0. |
| Merchant dashboard typecheck | PASS | `npm.cmd run lint`, exit 0. |
| Root tests | BROKEN/EMPTY | `npm.cmd test` exited 0 but Turbo executed 0 tasks. |
| Backend unit test script | BROKEN | Windows rejected POSIX-style environment assignment in `apps/backend/package.json`. |
| Direct Jest attempt | BROKEN | `apps/backend/jest.config.js` references missing `integration-tests/setup.js`. |
| Backend startup | PASS | `medusa develop`; server ready on port 9000 and connected to PostgreSQL. |
| Merchant dashboard startup | PASS | Vite ready on `http://127.0.0.1:5173/`. |
| Health endpoint | PASS | `GET /health` returned 200. |
| Medusa Admin asset | PASS | `GET /app` returned 200; browser rendered the Medusa sign-in screen. |
| Merchant dashboard asset | PASS | `GET /` returned 200; browser rendered Arabic login UI. |
| Unauthenticated merchant protection | PASS | `GET /vendor/me` returned 401. |
| Unauthenticated platform protection | PASS | `GET /admin/vendors` returned 401. |
| Invalid merchant login | PASS | Browser submitted synthetic invalid credentials and received `Invalid vendor credentials.` with no console error. |
| Authenticated merchant workflow | NOT VERIFIED THIS RUN | No plaintext development credential was used or reset during Phase 0. |
| Public handle/domain resolution with key | BLOCKED | A read-only smoke test requiring temporary access to the existing key timed out at the permission gate; no key was printed. |

Startup commands:

```powershell
cd apps\backend
npm.cmd run dev

cd ..\vendor-dashboard
npm.cmd run dev
```

## Current-state classification

| Subsystem | Status | Disposition | Evidence and conclusion |
| --- | --- | --- | --- |
| Medusa v2 backend | VERIFIED | KEEP | `apps/backend/package.json`; build and startup passed on 2.17.0. |
| PostgreSQL/Neon configuration | VERIFIED | KEEP, HARDEN | `apps/backend/medusa-config.ts`; startup and read-only schema query passed. The connection emits an SSL-mode forward-compatibility warning. |
| Standard Medusa Admin | VERIFIED | DEFER/INTERNAL ONLY | Browser rendered `/app`; keep for engineering and emergency use only. |
| Custom Admin vendor management | VERIFIED | REFACTOR | `apps/backend/src/admin/routes/settings/vendors/page.tsx` calls authenticated `/admin/vendors` routes. Transitional platform control only. |
| Separate Arabic RTL merchant dashboard | VERIFIED | KEEP, REFACTOR | `apps/vendor-dashboard/src/App.tsx` renders login, overview, products, orders, profile, and security. Merchant-facing term `vendor` remains in code/API and strings are hard-coded in the component. |
| Merchant email/password authentication | VERIFIED | REFACTOR | Login route, HMAC session, and browser invalid-login test passed. No automated positive/negative suite exists. |
| Password hashing | VERIFIED | KEEP, HARDEN | `scryptSync`, random 16-byte salt, 64-byte output, timing-safe comparison in `vendor-auth.ts`. Work factors are implicit Node defaults and not versioned in the hash. |
| Cookie session | PARTIAL | REFACTOR | HttpOnly, SameSite Lax, Secure in production, seven-day expiry, HMAC signature. No server-side revocation/session version. |
| Merchant password change | PARTIAL | REFACTOR | Current password is checked and hash updated, but existing sessions remain valid. |
| Super-admin password reset | VERIFIED | KEEP, AUDIT | Protected Admin member route updates the hash. No audit event is recorded. |
| Account/store disable | VERIFIED | KEEP | `getAuthenticatedVendor` re-checks active member and vendor on every protected request. |
| Vendor/store profile and domains | VERIFIED | REFACTOR | Vendor, member, and domain tables exist. They currently conflate tenant and store concepts. |
| Product ownership link | PARTIAL/UNSAFE | REPLACE BOUNDARY | Link table exists and merchant update checks it. Database primary key is `(vendor_id, product_id)`, which does not make `product_id` globally unique; application validation is the only single-owner control. |
| Merchant product list isolation | PARTIAL | REFACTOR + TEST | List derives product IDs from the authenticated vendor. There are no two-store automated tests. |
| Merchant direct product mutation isolation | VERIFIED IN SOURCE | KEEP + TEST | PATCH calls `ensureProductBelongsToVendor` before Medusa workflows. No direct GET/delete/archive route exists. |
| Merchant product creation/editing | PARTIAL | REFACTOR | Uses Medusa workflows, but creates one untracked backorderable variant and assigns every sales channel. Product creation and ownership linking are not atomic. |
| Draft/published states | VERIFIED | KEEP/EXTEND | Merchant API permits draft and published only; archived is missing. |
| EUR/USD pricing | VERIFIED/OBSOLETE | REPLACE | Dashboard hard-codes EUR/USD; target requires LYD-first configuration. |
| Vendor order visibility | UNSAFE FOR SAAS | REPLACE | `/vendor/orders` loads 100 global orders then derives item visibility from current product links. Complete order ownership is not persisted. |
| Handle/domain Store API | PARTIAL/UNSAFE | REPLACE CONTEXT | Routes exist and Medusa requires a publishable key, but domain may be supplied by query string and is not cross-checked against a store-specific key/channel. |
| Arabic/English Admin translations | VERIFIED | KEEP | `apps/backend/src/admin/i18n` contains Arabic and English resources for the custom Admin page. |
| Merchant dashboard English support | MISSING | IMPLEMENT LATER | Merchant strings are embedded Arabic text in `App.tsx`; no merchant translation resources exist. |
| Customer storefront | MISSING | PHASE 3 | No `apps/storefront` exists. |
| Store-scoped public products | MISSING/UNSAFE | PHASE 1/3 | Standard Store API availability relies on one shared key/channel and merchant-created products are assigned to all channels. |
| Custom-domain automation | MISSING | DEFER | Domain rows exist; verification, DNS, SSL, and deployment state do not. |
| Whole-order store ownership | MISSING | PHASE 2/5 | Current order access is item-derived. |
| Merchant order operations | MISSING | PHASE 5 | Dashboard is read-only for orders. |
| Variants/options/inventory/images/categories | PARTIAL | PHASE 4 | One default variant, image URL only, no tracked inventory, no category UI. |
| Owner/manager authorization | MISSING/UNSAFE | PHASE 1 | Role is stored but no backend permission policy uses it. |
| Automated tests | BROKEN | REPLACE NOW | No test files; scripts/configuration do not execute on this Windows workspace. |
| Production deployment/SSL/monitoring/backups | MISSING | PHASE 8 | Development uses fake Redis, local event bus, and in-memory locking. |

## Flow traces

### Merchant login

`POST /vendor/auth/login` normalizes email, loads an active member, verifies the
scrypt hash, checks that the linked vendor is active, creates an HMAC-signed
payload containing member ID, vendor ID and expiry, and sets an HttpOnly cookie.
Protected routes pass through `authenticateVendorSession`, then
`getAuthenticatedVendor` revalidates membership and store status.

### Product creation and ownership

`POST /vendor/products` derives store identity only from the authenticated
session, validates basic product fields, calls Medusa `createProductsWorkflow`,
then creates the vendor-product module link. The browser cannot choose a vendor
ID, which is good. The workflow and link are separate operations, so link
failure can leave an unowned product. The product is assigned to every current
sales channel, which is incompatible with store isolation.

### Product update

`PATCH /vendor/products/:id` resolves the authenticated vendor and checks the
vendor-product link before invoking Medusa update workflows. Cross-store direct
mutation is therefore guarded in source, but no automated two-store test proves
the behavior.

### Order query

`GET /vendor/orders` retrieves up to 100 global non-draft orders, keeps items
whose current product IDs are linked to the merchant, and returns order email
plus the filtered items. This is marketplace item filtering, not SaaS whole-
order ownership; pagination and historical reassignment are incorrect.

### Domain and handle resolution

Public routes normalize a handle or domain and return active vendor branding.
The public serializer also returns unrestricted vendor metadata. The domain
resolver accepts a query-string domain before `Host`; no trusted-proxy policy,
store-specific publishable-key match, or sales-channel match exists.

## Phase 0 gate

The Phase 0 audit is **complete**, including the sealed Codex Security scan.
The implementation gate for Phase 1 is **not satisfied** because automated
tests are broken, authenticated/two-store isolation is untested, and the public
key/domain positive smoke test was not completed. No Phase 1 schema or product
changes were made.
