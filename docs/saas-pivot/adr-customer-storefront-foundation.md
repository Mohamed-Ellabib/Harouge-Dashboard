# ADR: Customer Storefront Foundation

Status: accepted for owner-authorized, guarded-local Phase 3A on 2026-07-19 and implemented in the current uncommitted working tree. Guarded-local automated, visual-preview, two-Store real-backend browser, and manual keyboard evidence is recorded below; the guarded-local Phase 3A exit gate closed on 2026-07-22. Nothing here claims deployment, production readiness, or external acceptance.

## Context

The platform has permanent Tenant, StoreProfile, Medusa Store, Product, Cart, and Order ownership boundaries. Public Store requests already fail closed unless the verified hostname, active Store graph, Store Sales Channel, and one matching non-revoked publishable API key agree. Public profile and Product reads are allowed for both current plans independently of online-checkout readiness.

At the time of this decision there was no `apps/storefront` application and no previously accepted Phase 3 product contract. Phase 3A therefore began with the smallest customer-facing slice that could use the existing public isolation boundary without changing commerce ownership, provisioning, readiness, or production infrastructure.

The current Phase 2C commerce-readiness work has guarded-local automated evidence. The later external real-backend manual run that would exercise the current working tree has not been repeated. Phase 3A does not rewrite that evidence or treat local checkout as production readiness.

## Decision

Phase 3A introduces one reusable customer storefront application whose first release is browse-only. It presents one active Store's allowlisted identity, a Store-scoped Product catalog, and Product details. It does not create customer, Cart, payment, shipping, Order, subscription, deployment, or support state.

The initial customer routes are:

- `/`: Store identity and a bounded catalog preview;
- `/products`: paginated Store-scoped catalog;
- `/products/:handle`: one Store-scoped Product detail;
- a not-found state for an unknown route, Store, or Product.

The application must include explicit loading, empty, not-found, unavailable, and retry states. Production rendering must never fall back to demo data or another Store when a public request fails.

## Store identity and public key

Production Store identity is the actual request hostname. The browser must not accept a StoreProfile ID, Tenant ID, Vendor ID, Medusa Store ID, domain, handle, Sales Channel, or publishable key from a query string, route parameter, form field, cookie, local storage, or other customer-controlled selector.

Each Store deployment receives exactly one publishable key through controlled deployment configuration. The key must be the key whose sole Sales Channel matches the Store selected by the hostname. A publishable key is intended for public Store API use, but it remains configuration: it must not be placed in a URL, error report, analytics property, application log, documentation, fixture, or source-controlled environment file. No Admin bearer token, secret API key, provider credential, session secret, database URL, or other server credential may be present in storefront code or browser configuration.

The browser sends the configured key only in `x-publishable-api-key`. The backend remains authoritative and returns not found when hostname, key, channel, or permanent Store ownership does not agree. The storefront must not retry a failure with another key or discover a key from an unauthenticated hostname-to-key endpoint.

`x-store-handle` is allowed only as an explicit local development/test override. A production bundle must neither configure nor emit it. Development use must remain visibly enabled by build-time development configuration and must not alter the production hostname contract.

## Same-origin reverse-proxy contract

The browser calls relative `/store/*` URLs on the storefront origin. A deployment-owned reverse proxy forwards those requests to Medusa without changing the Store API path.

The edge must:

- remove any client-supplied `Forwarded`, `X-Forwarded-Host`, and equivalent host-override headers before adding trusted forwarding metadata;
- preserve the customer-visible hostname as the backend `Host`, or set `X-Forwarded-Host` itself only when the proxy address is explicitly listed in backend `TRUSTED_PROXY_IPS`;
- preserve the request scheme through trusted metadata when needed;
- forward `x-publishable-api-key` without writing its value to access or error logs;
- apply bounded request and response timeouts;
- never proxy `/admin/*`, `/vendor/*`, internal health/diagnostic routes, or arbitrary caller-selected upstreams through the storefront origin.

This same-origin contract avoids making broad cross-origin access part of Phase 3A. Direct browser calls to a separately hosted backend and wildcard Store CORS are outside this decision.

## Public response boundary

The storefront consumes only the explicit DTOs in `phase-3a-storefront-contract.md`. It must map network responses into those DTOs and discard all other fields before they reach page components, client state, telemetry, or caches.

The Store profile allowlist is limited to:

- public name;
- public handle;
- canonical public hostname;
- logo URL;
- primary color.

The Product presentation allowlist is limited to public handle, title, optional subtitle, optional plain-text description, optional thumbnail URL, and an ordered set of public image URLs. Phase 3A deliberately does not expose SaaS model identifiers, Tenant or Store identifiers, Vendor data, contact email, plan/readiness state, metadata, raw brand configuration, executable content, inventory, price lists, cost, Sales Channels, publishable-key records, internal timestamps, or future response fields automatically.

Product content and URLs are untrusted presentation data. Descriptions render as text, not HTML. The storefront must not use `dangerouslySetInnerHTML` for API content. Brand configuration may set only documented design tokens after validation; it cannot inject CSS, markup, JavaScript, external scripts, or arbitrary attributes.

## Catalog policy for current plans

Both `starter_whatsapp` and `professional_commerce` may browse the public Store profile and Product catalog while their permanent Store context is active and unambiguous.

Phase 3A does not expose plan or readiness state and does not imply checkout readiness:

- Starter remains `not_required` for online checkout and checkout-disabled.
- Professional may be pending, configuring, ready, failed, or require attention without changing browse-only behavior.
- No Cart, checkout, payment, shipping, Order, WhatsApp, or customer-account action is rendered.

A later storefront commerce phase must consume an explicitly designed public capability contract and continue to rely on backend readiness/live-graph enforcement. It must not infer capability from plan names, the presence of Products, a successful profile response, or client-side configuration.

## Cache isolation

Phase 3A assumes Store API JSON is not shared-cached. The reverse proxy and any service worker must use `no-store` for Store profile and Product API responses until a separately reviewed cache implementation exists.

Any later shared cache must partition entries by at least normalized effective hostname, the server-side identity of the validated publishable key without recording its raw token, normalized path, complete allowlisted query, representation language, and content encoding. A cache hit must never bypass backend hostname/key validation or serve stale Store A data to Store B.

The generic application shell may be shared only when it contains no Store-derived branding, Product data, key, or customer state. Store-derived HTML, metadata, JSON, image transformations, prefetches, and error pages require the same tenant-aware partition. Negative and authorization failures must not be converted into a cross-Store fallback.

## Experience and accessibility

The storefront is Arabic-first and uses `lang="ar"` and `dir="rtl"` at the document boundary. Layouts must remain usable from a 320 CSS-pixel mobile viewport through ordinary desktop widths without horizontal page scrolling, clipped controls, or fixed-height content loss.

The foundation requires:

- semantic landmarks, headings, navigation, lists, links, and buttons;
- complete keyboard operation and a visible focus indicator;
- a working skip link;
- text alternatives for meaningful images and empty alternatives for decorative images;
- status/error announcements that do not rely on color alone;
- minimum WCAG 2.2 AA contrast after applying the Store primary color;
- touch targets and spacing suitable for mobile use;
- respect for reduced-motion preferences;
- stable focus and document-title changes during client navigation;
- Arabic copy without embedded implementation terminology such as Medusa, Vendor, StoreProfile, or publishable key.

If a supplied brand color cannot meet the contrast requirement, the storefront uses a safe derived or platform fallback color while preserving the configured color for non-critical decoration where contrast is not required.

## Failure behavior

Unknown Store, inactive or ambiguous graph, hostname/key mismatch, non-owned Product, and malformed public response all fail closed. Customer-facing errors are generic and must not distinguish which part of Store resolution failed.

The application may offer a bounded retry for transient network/server failures. It must not retry a 404 with another Store identity, retain another Store's last successful data, or render stale cached tenant data after an identity failure.

## Explicitly deferred

Phase 3A does not authorize:

- Cart creation or mutation, checkout, shipping, payment, Order placement, or Order lookup;
- customer registration, login, sessions, profiles, addresses, OTP, or password recovery;
- WhatsApp messaging, deep-link checkout, provider integration, or message templates;
- public signup or self-service Store creation;
- billing, subscriptions, entitlements, invoicing, tax, settlements, refunds, disputes, or webhooks;
- DNS verification, SSL issuance, hosting, deployment automation, release orchestration, or production migration;
- production payment or fulfillment providers;
- a hostname-to-publishable-key discovery endpoint;
- plan changes, commerce-setup update/cancellation, or attention/repair operations;
- legacy Vendor removal or weakening of the compatibility freeze;
- Neon access of any kind.

Each deferred area needs its own owner-approved contract and acceptance gate.

## Current implementation and evidence

The current uncommitted working tree implements:

- `apps/storefront`, an Arabic RTL React/Vite application with `/`, `/products`, and `/products/:handle`;
- a relative Store API client with runtime validation and exact profile, catalog-card, catalog-page, and Product-detail DTO mapping;
- search, sort, mobile navigation, bounded route/query parsing, empty/not-found/unavailable states, and contrast-safe Store branding;
- a development-only visual-preview module that is excluded from production behavior;
- recursive public Product response sanitization that removes every `metadata` field before public JSON is sent;
- Store-specific profile and canonical published-Product enforcement through the existing Host/key/PublicStoreContext boundary;
- a repeatable guarded-local harness that creates synthetic Store A/Store B graphs without customer or merchant credentials on the exact loopback disposable database, starts two hostname/key storefront deployments against the built backend, verifies safe contexts, and supports backend-only restart.

Recorded guarded-local evidence is:

- storefront Vitest: 2 files, 7 tests passing;
- storefront typecheck and production build passing;
- production bundle scan finding no visual-preview data, development Store selector, or plan strings;
- backend Phase 3 exact public-field/Store-isolation contract: 1 suite, 3 tests passing;
- focused Phase 3 plus Phase 1/2 isolation regression: 5 suites, 34 tests passing;
- browser visual QA of home, catalog, detail, search, sort, mobile menu, empty, not-found, and unavailable states at 320, 375, 768, 1024, and 1440 CSS pixels, with RTL, one `h1`, and no horizontal overflow;
- guarded real-backend browser QA of matching Store A/Store B profile/catalog/detail, cross-Store Product denial, both crossed hostname/key directions without stale data, mobile/desktop RTL, generic error announcements, clean console logs, and persistence after verified backend-process termination and restart;
- native keyboard semantics and visible focus inspected, followed by an owner-performed physical keyboard pass on 2026-07-22: Tab exposed the skip link, Enter moved focus to main content, reload restored the initial state, three Tabs reached the mobile-menu button, Enter opened it, and Space closed it.

The earlier wide-viewport screenshots used explicitly enabled local visual-preview data and prove presentation behavior only. The later guarded smoke proves browser-to-real-backend Store isolation and restart behavior. The distinct physical keyboard pass closes the guarded-local accessibility requirement without inferring it from native semantics. The Vite development proxy used for this local smoke does not certify the production edge implementation.

## External acceptance boundary

The new external Phase 2C real-backend manual rerun is explicitly deferred during this browse-only foundation. Phase 3A may not claim that it repeated or superseded the historical 2026-07-14 run.

Before any later milestone performs integrated storefront Cart-to-Order acceptance, the owner must decide to run that current-tree external Phase 2C acceptance, or explicitly accept its deferral for that milestone. The resulting evidence must remain separate from unit/integration evidence and must never use Neon.

## Consequences

- Phase 3 can begin without expanding production or checkout scope.
- One storefront implementation can be branded per deployment while permanent Store identity remains server-owned.
- Both plans receive the same safe browsing foundation without presenting false commerce capability.
- Same-origin routing and fail-closed DTO mapping reduce cross-Store and accidental-field exposure risk.
- Per-deployment key configuration is intentionally limited; dynamic shared-host deployment and key bootstrap require a later architectural decision.
- Price, inventory, variants, customer accounts, and conversion flows remain visible product gaps rather than being guessed into the foundation.
