# Phase 3A Customer Storefront Foundation Contract

Status: owner-authorized guarded-local contract, defined and implemented in the current uncommitted working tree on 2026-07-19. Automated, visual-preview, guarded two-Store real-backend browser, and manual keyboard evidence is recorded below. The guarded-local exit gate closed on 2026-07-22; no deployment, production-readiness, or external-acceptance result is claimed.

## Objective

Create a reusable Arabic-first customer storefront application at `apps/storefront` that can render exactly one active Store's allowlisted public identity and exclusively owned Product catalog through the existing permanent public Store context.

The foundation is intentionally browse-only. It establishes the application, transport, isolation, response, accessibility, and acceptance boundaries needed before any later customer or checkout capability is considered.

## In scope

Phase 3A includes:

- a workspace application with guarded development, typecheck, lint, build, and preview scripts;
- Store shell and branded header/footer;
- home/catalog preview;
- paginated Product catalog;
- Product detail addressed by public Product handle;
- bounded Product search and sort state;
- responsive Arabic RTL presentation;
- loading, empty, not-found, unavailable, and retry states;
- relative same-origin Store API client;
- runtime response validation and exact DTO mapping;
- Store-aware document title and safe public metadata;
- automated isolation/contract tests and a guarded-local browser smoke path.

Phase 3A contains no write operation to Medusa or the SaaS modules.

## Required runtime configuration

The application may read only these public build/deployment values:

| Name                             | Purpose                                    | Rule                                                                                          |
| -------------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------- |
| `VITE_MEDUSA_PUBLISHABLE_KEY`    | one Store's public Store API key           | required outside test fixtures; header-only; never printed or placed in a URL                 |
| `VITE_STOREFRONT_DEV_HANDLE`     | local development/test Store selector      | accepted only by a development build; production builds must ignore or reject it              |
| `VITE_STOREFRONT_VISUAL_PREVIEW` | explicit local presentation-QA data switch | development-only; preview data and selector strings must be absent from the production bundle |

The browser API base is the current origin. A caller-selectable backend URL is not part of the production contract. Development tooling may proxy the same relative paths to a fixed local backend target selected by developer-owned configuration; browser input must never select that target.

No variable exposed to the browser may contain an Admin token, secret API key, session/JWT/cookie secret, provider credential, database URL, lease token, or private platform endpoint.

## Request contract

All requests use relative URLs and send `Accept: application/json` plus the configured `x-publishable-api-key`. Requests do not send credentials unless a later customer-auth contract explicitly requires them.

| View            | Request                                       | Constraints                                                                                                               |
| --------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Store bootstrap | `GET /store/vendors/resolve`                  | real effective hostname; exact matching publishable key                                                                   |
| Catalog         | `GET /store/products`                         | explicit fields; bounded `limit`; validated non-negative `offset`; server remains authoritative for canonical Product IDs |
| Product detail  | `GET /store/products?handle=<encoded-handle>` | explicit fields; exactly one mapped Product or local not-found                                                            |

The client must not call `/store/vendors/:handle` in production. During local development/test only, it may emit `x-store-handle` from `VITE_STOREFRONT_DEV_HANDLE`; it must not derive that header from the URL, a form, local storage, or persisted browser state.

The catalog client uses an explicit `fields` selection containing only the presentation data required by the DTOs below. It must not request metadata, Sales Channels, key records, internal Store relations, cost, inventory, customer data, or unrestricted relation expansion.

Every request has an abort signal and bounded timeout. Navigation aborts obsolete detail/catalog requests. Automatic retry is limited to idempotent GET requests and a small bounded count with jitter; 400, 401, 403, and 404 responses are not identity-discovery signals and are not retried with changed context.

## Exact client DTO allowlist

Network payloads are `unknown` until validated. Page components receive only these mapped DTOs; excess fields are discarded.

```ts
export type StorefrontProfileDto = {
  name: string;
  handle: string;
  domain: string | null;
  branding: {
    logo_url: string | null;
    primary_color: string | null;
  };
};

export type StorefrontProductCardDto = {
  handle: string;
  title: string;
  subtitle: string | null;
  thumbnail_url: string | null;
};

export type StorefrontProductDetailDto = {
  handle: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  thumbnail_url: string | null;
  image_urls: string[];
};

export type StorefrontCatalogPageDto = {
  products: StorefrontProductCardDto[];
  count: number;
  offset: number;
  limit: number;
};
```

The Store bootstrap network response is accepted only as an object with a `vendor` member that maps exactly to `StorefrontProfileDto`. Product list responses are accepted only when pagination is internally consistent and every rendered item has a valid non-empty handle and title. A detail response must yield exactly one mapped Product whose normalized handle matches the requested handle.

Product IDs may exist in the Medusa transport response so the backend can enforce canonical ownership, but Phase 3A discards them before view state and uses the public handle for customer routing. Unknown object members never become component props automatically.

### Scalar validation

- Text is bounded in length, normalized for display, and rendered as text.
- Handles use the existing normalized public-handle grammar and are URL-encoded before use.
- URLs must use `https:` in production. Development may additionally allow the fixed local `http:` origin. Other schemes and credential-bearing URLs are rejected.
- Repeated image URLs are deduplicated and their count is bounded.
- `primary_color` is accepted only in an explicitly supported color syntax, normalized, and passed through contrast-safe theme derivation.
- `count`, `offset`, and `limit` must be safe non-negative integers; the client clamps page size to its documented maximum.

The following are not part of any Phase 3A DTO: Tenant, StoreProfile, Medusa Store, Vendor, membership, Region, location, Sales Channel or key identifiers; raw `metadata`; contact email; plan/readiness/setup/failure state; brand configuration JSON; variants, price lists, inventory, cost, tax, shipping, payment, customer, Cart, or Order state; internal timestamps; or arbitrary future API fields.

## Page behavior

### Store shell and home

- Resolve the Store before rendering Store-derived navigation or branding.
- Render the public Store name, validated logo, and contrast-safe theme.
- Show a bounded catalog preview only after Store resolution succeeds.
- Never flash previous-Store data during resolution or after an identity error.

### Catalog

- Use URL pagination with validated public page parameters only; Store identity never appears in those parameters.
- Preserve a stable heading and pagination announcement for assistive technology.
- Treat an empty catalog as a valid Store-scoped state, not an error.
- Product cards link by encoded handle and have meaningful accessible names.

### Product detail

- Resolve by the path handle and require one matching Store-scoped Product.
- Render description as plain text with preserved readable paragraphs; do not interpret markup.
- Present a keyboard-operable image gallery when multiple valid images exist.
- Provide an explicit return to the catalog.
- Do not render price, stock, variant, Cart, WhatsApp, or checkout controls in Phase 3A.

### Error and not-found behavior

- Unknown Store, crossed hostname/key, inactive Store, ambiguous graph, and unknown Product use a generic Arabic unavailable/not-found experience.
- Error UI contains no upstream message, identifier, stack, endpoint, header, key, or Store-resolution detail.
- A retry repeats only the same authoritative request context.
- Production never substitutes demo Products, placeholder merchant identity, or cached data from another hostname.

## Plan behavior

Both current plans receive the same browsing contract:

| Plan/readiness                                | Profile/catalog/detail                   | Cart/checkout               |
| --------------------------------------------- | ---------------------------------------- | --------------------------- |
| `starter_whatsapp` / `not_required`           | allowed through permanent public context | absent and backend-disabled |
| `professional_commerce` / any readiness state | allowed through permanent public context | absent from Phase 3A        |

The browser does not receive plan/readiness merely to implement this table. It exposes only browse behavior and lets the backend enforce the active permanent Store context. No UI copy may claim that a Store can accept an online Order.

## Same-origin proxy and header handling

The storefront origin proxies only the allowlisted `GET /store/vendors/resolve` and Phase 3A `GET /store/products*` surfaces. A broader path proxy may be used in local development only if it cannot be deployed as the production Phase 3A edge configuration.

The production edge contract is:

1. derive the effective public hostname from the accepted connection;
2. strip untrusted host-forwarding headers;
3. forward that hostname in `Host`, or inject `X-Forwarded-Host` only from an address listed in `TRUSTED_PROXY_IPS`;
4. retain the fixed Medusa upstream outside request-controlled data;
5. redact `x-publishable-api-key` from logs and tracing baggage;
6. reject non-GET methods for the Phase 3A proxy allowlist;
7. set bounded body, header, and timeout limits;
8. return generic public errors rather than proxy diagnostics.

The application must behave correctly behind this proxy; success obtained only through a development handle override is not production acceptance.

## Cache and browser-state contract

Phase 3A sets Store API fetches to `no-store` and does not install a service worker that caches Store-derived requests or responses.

The browser may retain view-only UI state such as the current catalog page in the URL. It must not persist the publishable key, Store profile, Product responses, identity selectors, or error details in local storage, session storage, IndexedDB, analytics, or a cross-host global state container.

If caching is introduced later, its reviewed key must include:

- normalized effective hostname;
- validated key identity or a non-reversible server-side key fingerprint, never the raw token;
- normalized path and complete allowlisted query;
- representation locale and content encoding;
- deployment/release version where HTML or asset references can differ.

Cache purge and negative-cache behavior must be Store-partitioned. Cache configuration requires a hostile Store A/Store B test before activation.

## RTL, responsive, and accessibility acceptance

The root document uses Arabic language and RTL direction. Phase 3A is accepted only when all three routes and every state meet these requirements:

- usable at 320, 375, 768, 1024, and 1440 CSS-pixel viewport widths;
- no unintended horizontal document overflow;
- no content clipping caused by fixed viewport heights;
- logical CSS properties and correct RTL icon/directional behavior;
- keyboard access in a meaningful order, including skip link and visible focus;
- semantic heading hierarchy and one primary page heading;
- labeled navigation and pagination;
- programmatic loading/error status announcements without repeated screen-reader noise;
- meaningful image alternatives and decorative-image suppression;
- WCAG 2.2 AA text, focus, and essential-icon contrast under configured and fallback themes;
- usable content at 200% zoom and with text spacing overrides;
- reduced-motion compliance;
- pointer targets suitable for touch and not dependent on hover;
- document title updated to the validated Store/page title without exposing internal state.

Automated accessibility checks are required, but they do not replace keyboard, zoom, screen-reader announcement, and contrast review.

## Automated acceptance matrix

### Public API and isolation

| Scenario                                              | Required result                                                              |
| ----------------------------------------------------- | ---------------------------------------------------------------------------- |
| Store A hostname + Store A key                        | Store A profile and only Store A Products                                    |
| Store B hostname + Store B key                        | Store B profile and only Store B Products                                    |
| Store A hostname + Store B key                        | generic 404; no Store A or B public data                                     |
| Store B hostname + Store A key                        | generic 404; no Store A or B public data                                     |
| unknown/inactive/ambiguous Store                      | generic not found; no fallback                                               |
| Store A requests Store B Product handle               | not found and no Product leakage                                             |
| profile response contains unexpected private fields   | adapter discards them; exact DTO snapshot remains unchanged                  |
| Product response contains metadata or extra relations | adapter discards them before view state                                      |
| malformed profile/Product/pagination payload          | fail closed with generic unavailable state                                   |
| production build has a development handle value       | build/configuration check fails or value is ignored and no header is emitted |

### Frontend behavior

- home, catalog, and detail render from validated DTOs;
- loading, empty, not-found, unavailable, and retry states are deterministic;
- route handles and pagination reject malformed or excessive input;
- aborted navigation does not overwrite the newer route with a stale response;
- previous-Store data is cleared before a new identity result can render;
- API content is never rendered as HTML;
- no deferred action appears in the DOM, including visually hidden or disabled checkout/WhatsApp controls;
- responsive and accessibility acceptance above is exercised at representative viewports.

### Regression

- the storefront typecheck, lint, and production build pass;
- the existing guarded backend suite remains green on disposable PostgreSQL;
- existing Phase 1 public isolation and Phase 2C browse/readiness behavior remain green;
- no SaaS schema or migration change is generated by Phase 3A;
- repository checks find no credential or publishable-key token in source, fixtures, snapshots, build logs, or documentation;
- Neon is not accessed.

## Current implementation and recorded evidence

The current uncommitted implementation delivers the three customer routes, relative API client, exact DTO adapters, Arabic RTL responsive shell, search, sort, mobile navigation, and the required empty/not-found/unavailable behavior. The backend adds a recursive public Product response boundary that removes every `metadata` member before sending Product JSON. Visual-preview data is available only behind the explicit development flag and is not a production fallback.

Recorded evidence:

| Evidence                           | Result                        | Boundary                                                                                                                                                                                                                    |
| ---------------------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Storefront Vitest                  | PASS — 2 files, 7 tests       | DTO mapping, field disposal, fail-closed pagination/handles, relative detail request, contrast-safe theme                                                                                                                   |
| Storefront typecheck               | PASS                          | current `apps/storefront` source                                                                                                                                                                                            |
| Storefront production build        | PASS                          | production Vite output                                                                                                                                                                                                      |
| Production bundle inspection       | PASS                          | no visual-preview data, development Store selector, or plan strings found                                                                                                                                                   |
| Phase 3 backend HTTP contract      | PASS — 1 suite, 3 tests       | exact hostname/key profiles, Store-exclusive published Products, metadata boundary, inactive/unverified failure                                                                                                             |
| Focused isolation regression       | PASS — 5 suites, 34 tests     | Phase 3 plus Phase 1/2 public/Product/Cart/Order isolation surfaces selected for this change                                                                                                                                |
| Browser visual QA                  | PASS at 320/375/768/1024/1440 | home, catalog, detail, search, sort, mobile menu, empty, not-found, unavailable; RTL, one `h1`, no horizontal overflow                                                                                                      |
| Guarded real-backend browser smoke | PASS                          | matching Store A/Store B profile/catalog/detail, crossed contexts, cross-Store Product denial, mobile/desktop RTL, generic announcements, clean console, verified backend-only restart, and distinct physical keyboard pass |

The earlier wide-viewport browser QA used explicitly enabled local visual-preview data and remains presentation-only evidence. The later guarded smoke exercised the built Medusa backend and permanent Store context. The owner-performed physical keyboard check is recorded separately from browser-runtime semantics inspection and closes the final accessibility item.

## Guarded-local browser acceptance

A local smoke uses synthetic Store A and Store B records on guarded disposable PostgreSQL, fixed local hostnames/proxy configuration, and controlled synthetic publishable keys. It verifies:

1. Store A home/catalog/detail branding and Products;
2. Store B home/catalog/detail branding and Products;
3. crossed hostname/key failure with no stale prior Store rendering;
4. mobile and desktop RTL layout;
5. keyboard navigation and error announcements;
6. backend restart followed by the same browse-only resolution.

Captured screenshots, logs, and test output must redact key values and contain no generated credential. The smoke is local Phase 3A evidence only.

Recorded on 2026-07-19 with `npm.cmd run storefront:accept`:

- the harness required Node 20 through 23 and free loopback ports 9000/5175/5176, exclusively locked the exact local disposable database, reset only `medusa_phase05_disposable`, applied current migrations, and built the current backend;
- it seeded two synthetic Store graphs without customer or merchant credentials, generated runtime-only public keys, transferred them in an AES-256-GCM encrypted random temporary handoff, decrypted/unlinked that file immediately, and excluded backend/database/session configuration from the Vite process environments;
- Store A and Store B matching hostname/key deployments rendered only their own identity and published Products across home and detail routes;
- a Store B deployment requesting Store A's Product returned the generic Product-not-found state;
- both crossed hostname/key directions returned the generic unavailable Store state without stale identity or Products;
- desktop and mobile layouts remained Arabic RTL with one `h1`; the mobile menu operated by pointer and exposed native button/expanded semantics;
- unavailable-state text used a polite live announcement, and browser warning/error logs were empty;
- the harness terminated the owned backend process, required port 9000 to close, started a new built-backend process without reseeding, passed its safe A/B/crossed context probes, and the browser then repeated matching Store A/Store B and crossed-isolation checks;
- the 2026-07-22 acceptance shutdown terminated owned HTTP processes and scrubbed the synthetic schema. A third-party Windows embedded-PostgreSQL stop wait then hung on an already-fired process event; the exact owned process was terminated and all acceptance ports, ownership locks, and temporary artifacts were verified clear. The wrapper was hardened with a bounded owned-data-directory `pg_ctl` stop, and a fresh guarded wrapper probe subsequently exited successfully with the disposable port and lock released;
- the in-app browser runtime focused native controls but could not be treated as native keyboard activation evidence. The owner therefore performed the physical check on 2026-07-22: one Tab exposed the skip link, Enter moved focus to main content, reload restored the initial state, three Tabs reached `فتح القائمة`, Enter opened the menu, and Space closed it. Meaningful order and visible focus were accepted.

This local smoke uses the Vite development proxy. It does not accept or replace the production edge allowlist, forwarding-header stripping, timeout, request-limit, or redacted-logging implementation required above.

## External Phase 2C acceptance dependency

The current-tree external Phase 2C real-backend manual rerun remains deferred while Phase 3A is browse-only. Historical 2026-07-14 evidence and current automated checkout evidence remain separate and must not be relabeled.

Before a future storefront milestone performs integrated Cart, shipping, payment, completion, or Cart-to-Order acceptance, the owner must either:

1. authorize and record the external Phase 2C current-tree manual rerun on guarded disposable local PostgreSQL; or
2. explicitly accept its continued deferral for that milestone and record the narrower evidence boundary.

Neither option authorizes Neon, production migration, production providers, or deployment.

## Exit gate

Phase 3A Customer Storefront Foundation is complete only when:

1. the ADR and this contract remain aligned with implementation;
2. the three customer routes and all required states are implemented without deferred controls;
3. exact DTO validation and Store identity rules are enforced;
4. the automated acceptance matrix passes;
5. guarded-local two-Store browser acceptance is recorded;
6. existing backend isolation/readiness regression remains green;
7. no schema/migration change, secret exposure, Neon access, production deployment, commit, or push is falsely claimed.

Current status: implementation, automated evidence, earlier visual-preview QA, the guarded real-backend Store A/Store B matrix, backend-only restart, and physical keyboard acceptance are present. Item 5 and the guarded-local Phase 3A exit gate are complete as of 2026-07-22. Phase 3A remains local, uncommitted, browse-only, and not production-ready.

Completion of this gate authorizes no checkout or production work. A proposed Phase 3B commerce-pilot contract now exists, but it requires explicit owner approval and an external-evidence choice before implementation.

## Out of scope

Cart, checkout, customer authentication, customer OTP, WhatsApp, billing, DNS/SSL, hosting/deployment automation, production infrastructure/providers/migration, plan/setup mutation, operational repair, public signup, and Vendor removal are outside Phase 3A.
