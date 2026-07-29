# Phase 3B Guarded-Local Commerce Pilot Contract

Status: approved by the owner and implemented in the uncommitted working tree on 2026-07-22. The selected current-tree Phase 2C real-backend API rerun and Phase 3B automated/browser/restart/cleanup evidence passed on guarded disposable local PostgreSQL. The distinct owner-performed physical-keyboard journey is pending, so the Phase 3B exit gate remains open. No public use, deployment, production readiness, or Neon access is claimed.

## Objective

Prove the smallest complete SaaS commerce journey on guarded disposable local infrastructure:

platform-admin Store provisioning and assisted checkout setup -> merchant simple-Product publication -> anonymous Storefront Cart and checkout -> canonical Store-owned Order -> owning-merchant visibility and other-Store denial.

This is a technical/business-flow pilot, not an MVP launch and not production readiness.

## Entry conditions

Entry approval was recorded on 2026-07-22. The owner approved this contract and authorized the recommended current-tree Phase 2C external real-backend rerun on guarded disposable local PostgreSQL. That rerun and Phase 3B evidence must remain separately reported.

The implementation must preserve:

- the dirty working tree and all existing user work;
- Phase 3A's exact Host/key Store identity and public DTO boundaries;
- permanent Tenant/StoreProfile/Medusa Store/Product/Cart/Order ownership;
- the legacy Vendor compatibility freeze;
- guarded disposable PostgreSQL through `TEST_DATABASE_URL` only;
- the absolute Neon prohibition;
- separation of historical, automated, external-real-backend, visual-preview, and physical accessibility evidence.

Before exit-gate closure, the owner must either authorize the recommended current-tree Phase 2C external real-backend rerun or explicitly accept and record its deferral.

## Pilot journey

The accepted pilot must exercise all of these actors in order:

1. **Platform administrator**
   - authenticates through the existing platform session;
   - provisions one Professional Store using the canonical provisioning operation;
   - runs the existing immutable commerce setup with one local delivery option;
   - verifies readiness is `ready` without mutating rows or Medusa resources directly.
2. **Merchant owner**
   - signs into the vendor dashboard using the Store-selecting merchant context;
   - creates or updates one published simple Product;
   - supplies one price, while the backend derives and enforces the Store currency;
   - later sees only the resulting Store-owned Order.
3. **Guest customer**
   - browses the existing Phase 3A routes;
   - sees a purchase action only when the public commerce capability is `available`;
   - adds the one supported Store-owned variant to a Cart;
   - changes quantity or removes the line;
   - enters email and one Libya delivery address;
   - chooses the exact available Store shipping option;
   - creates the fixed local payment session;
   - reviews totals and completes the Cart;
   - sees an allowlisted confirmation without creating an account.
4. **Hostile Store/Merchant B**
   - cannot retrieve or mutate Store A's Cart;
   - cannot use Store A's variant or shipping option;
   - cannot retrieve Store A's Product purchase options;
   - cannot see Store A's completed Order.

## In scope

### Backend

- exact public commerce-capability endpoint;
- exact Store-scoped simple-Product purchase-options endpoint;
- server-derived Store currency enforcement on vendor Product create/update;
- one-variant Product invariant for pilot-purchasable Products;
- existing public Cart, line-item, shipping, payment, and completion routes, with their current deep guards;
- public response reduction for capability, purchase, Cart, shipping, and confirmation data;
- hostile Store A/Store B integration coverage;
- guarded real-backend pilot seeding and acceptance support.

### Storefront

- capability-aware purchase controls on Product detail;
- price display for the one supported variant;
- header Cart indicator;
- `/cart` route;
- `/checkout` route;
- completed-Order confirmation state;
- quantity update and line removal;
- guest contact and delivery form;
- shipping-option selection;
- fixed local payment-session creation;
- exact response adapters, fail-closed state handling, responsive Arabic RTL UI, and accessibility acceptance;
- same-origin session-scoped Cart recovery.

### Merchant dashboard

- derive the writable Product currency from the permanent merchant Store context;
- remove the hard-coded EUR/USD authority from Product writes;
- show the Store currency as read-only during Product create/update;
- support exactly one simple variant price for the pilot;
- preserve the existing Store-scoped Product and Order authorization behavior.

### Platform operation

- use the existing canonical provisioning, commerce-setup, status, and readiness APIs;
- assisted setup is acceptable for the pilot;
- no new mutable Store/plan/setup control plane is created.

## Public commerce capability contract

Proposed route:

`GET /store/saas/commerce-capabilities`

The route requires the normal PublicStoreContext. Unknown, inactive, ambiguous, or crossed hostname/key context remains generic not-found.

Exact response:

```ts
export type StorefrontCommerceCapabilitiesDto = {
  online_checkout: {
    status: "available" | "unavailable";
    currency_code: string | null;
    country_codes: string[];
  };
};
```

Rules:

- `available` is returned only after `assertStoreOnlineCheckoutReady(..., { validateGraph: true })` succeeds for the current permanent Store;
- `currency_code` and `country_codes` are present only when available and come from the validated current Store/Region graph;
- unavailable capability returns `currency_code: null` and `country_codes: []`;
- unavailable does not reveal plan, readiness state, setup state, failure code, failure message, or which invariant failed;
- the response contains no Tenant, StoreProfile, Medusa Store, Region, location, Sales Channel, key, provider, profile, set, zone, option, setup, Vendor, or membership identifier;
- the response is `no-store` and is exact-mapped before reaching UI state;
- capability never authorizes a later write by itself; every write performs the existing current-context checks again.

Plan behavior:

| Store state                                            | Browse | Capability  | Cart/checkout |
| ------------------------------------------------------ | ------ | ----------- | ------------- |
| Starter / `not_required`                               | yes    | unavailable | absent/denied |
| Professional / pending/configuring/failed/attention    | yes    | unavailable | absent/denied |
| Professional / stale or invalid supposedly-ready graph | yes    | unavailable | absent/denied |
| Professional / completed setup + current valid graph   | yes    | available   | allowed       |

## Purchase-options contract

Proposed route:

`GET /store/saas/products/:handle/purchase-options`

The backend resolves the Product handle through the current PublicStoreContext and requires:

- active Professional Store with deep current checkout readiness;
- one published Product canonically owned by the current Medusa Store;
- exactly the Store's one allowed Sales Channel;
- exactly one active Product variant for the pilot;
- one valid calculated price in the Store currency;
- no conflicting Product/variant/channel ownership;
- the current pilot inventory policy.

Exact response:

```ts
export type StorefrontPurchaseOptionsDto = {
  product_handle: string;
  currency_code: string;
  variant: {
    id: string;
    title: string;
    unit_price: number;
    available_for_sale: boolean;
  };
};
```

Rules:

- `variant.id` is an opaque public write reference required by the Medusa Cart API; it grants no authority;
- `unit_price` is the backend-calculated current amount and is formatted with `Intl.NumberFormat` using `currency_code`;
- the response never includes Product ID, price-set/price-list IDs, Store/Region/channel IDs, SKU, cost, stock count, raw inventory, metadata, rules, internal timestamps, or arbitrary future fields;
- missing price, extra variants, ambiguous ownership, wrong currency, unavailable commerce, or malformed data fails closed with a generic unavailable/not-found response;
- add-to-Cart revalidates the variant and must not trust this read response.

Phase 3B deliberately rejects multi-variant purchase presentation. Supporting size/color/options requires a later contract and hostile combination tests.

## Merchant Product price correction

The vendor Product create/update routes must stop treating `currency_code` from the request as authority.

Required behavior:

1. resolve the authenticated MerchantStoreContext;
2. resolve the linked Medusa Store and its supported/default Region currency;
3. require one unambiguous Store currency for this pilot;
4. derive that currency server-side;
5. accept a bounded non-negative Product amount with the currency's supported decimal precision;
6. create/update exactly one simple variant price in that currency;
7. reject a supplied currency when it differs, or remove `currency_code` from the public merchant write body entirely;
8. return only the merchant's Store-owned Product DTO;
9. keep `manage_inventory: false` and `allow_backorder: true` explicit for the pilot.

The vendor dashboard displays the derived currency read-only. It must not offer EUR/USD selectors unrelated to the Store.

## Exact Storefront Cart DTO

Every Cart network response is `unknown` until mapped into:

```ts
export type StorefrontCartDto = {
  id: string;
  currency_code: string;
  email: string | null;
  items: Array<{
    id: string;
    variant_id: string;
    title: string;
    thumbnail_url: string | null;
    quantity: number;
    unit_price: number;
    total: number;
  }>;
  item_subtotal: number;
  shipping_total: number;
  total: number;
  shipping_method_selected: boolean;
  payment_session_ready: boolean;
  completed: boolean;
};
```

Mapping rules:

- all identifiers are bounded opaque strings;
- currency must match the capability currency;
- quantities are positive safe integers and are capped by the UI pilot limit;
- amounts are finite non-negative numbers;
- each Cart line must correspond to the current Store's one supported Product variant;
- URLs follow the Phase 3A public-asset policy;
- customer ID, raw addresses, payment-collection/session details, provider data, metadata, internal Store relations, raw adjustments, raw tax lines, raw errors, and arbitrary future fields are discarded before view state;
- malformed responses clear unsafe state and show a generic recoverable/unavailable experience.

## Cart lifecycle

### Creation and add

1. fetch current capability;
2. fetch exact purchase options;
3. `POST /store/carts` without a client-selected Store, Region, channel, key ID, or ownership metadata;
4. backend derives Region/currency/channel from PublicStoreContext;
5. `POST /store/carts/:id/line-items` with only the opaque `variant_id` and bounded quantity;
6. exact-map the returned Cart;
7. store only the Cart ID in session storage after success.

### Recovery

- storage key is versioned and same-origin, for example `labibtech:storefront:cart:v1`;
- storage value contains only the Cart ID;
- restore uses `GET /store/carts/:id` under the current hostname/key;
- 404, cross-Store denial, completed Cart, wrong currency, malformed response, or unavailable capability clears the ID;
- Storefront code never tries the Cart against another key or Store.

### Quantity and removal

- quantity is a positive safe integer with a documented small pilot maximum;
- update uses the current Store-owned line-item route;
- removal uses the current guarded HTTP delete route;
- optimistic UI may show a pending state but the server response is authoritative;
- failed mutation restores the last exact-mapped server state or refetches; it never invents totals.

## Checkout contract

The pilot checkout is anonymous and single-address.

Allowed customer input:

- email;
- first name;
- last name;
- address line 1;
- city;
- country code selected only from capability `country_codes`;
- optional bounded phone.

Not accepted from customer input:

- Store, Tenant, Profile, Region, Sales Channel, key, provider, payment method, shipping-option ID outside the server response, currency, price, total, tax, discount, Product ownership, or Order ownership;
- executable markup or unbounded free-form metadata.

Input stays in component memory, is sent only to the current Cart update route, and is never written to browser storage, analytics, logs, URLs, screenshots, fixtures, or documentation.

Checkout sequence:

1. validate Cart is non-empty and capability remains available;
2. update Cart email/shipping address;
3. list shipping options for the current Cart;
4. exact-map only option ID, display name, and calculated amount;
5. require exactly the Store-allowed pilot option and let the customer select it;
6. add that shipping method;
7. create the payment collection for the current Cart;
8. create the payment session with the fixed backend-allowed `pp_system_default` provider; the UI does not let the customer select or submit a provider ID;
9. refetch/review server totals;
10. complete the Cart once;
11. exact-map the completed Order confirmation and clear the stored Cart ID.

The UI must clearly describe this as a local pilot confirmation. It must not say that money was captured, a carrier was booked, or a production payment succeeded.

## Exact confirmation DTO

```ts
export type StorefrontOrderConfirmationDto = {
  display_id: number | string;
  currency_code: string;
  items: Array<{
    title: string;
    quantity: number;
    unit_price: number;
    total: number;
  }>;
  item_subtotal: number;
  shipping_total: number;
  total: number;
};
```

The confirmation omits Order ID, customer ID, Store IDs, addresses, phone, payment collection/session/provider details, metadata, internal status history, raw fulfillment data, and internal timestamps. It lives only in memory for the completed navigation. Refresh may show a generic already-completed message; Phase 3B does not add public Order lookup or customer Order history.

## Same-origin proxy allowlist

Production-like acceptance must replace Phase 3A's GET-only proxy allowlist with an exact method/path matrix for only:

- `GET /store/vendors/resolve`;
- required `GET /store/products*` browse routes;
- `GET /store/saas/commerce-capabilities`;
- `GET /store/saas/products/:handle/purchase-options`;
- `POST /store/carts`;
- `GET|POST /store/carts/:id`;
- `POST /store/carts/:id/line-items`;
- `POST|DELETE /store/carts/:id/line-items/:line_id`;
- `GET /store/shipping-options?cart_id=...`;
- `POST /store/carts/:id/shipping-methods`;
- `POST /store/payment-collections`;
- `POST /store/payment-collections/:id/payment-sessions`;
- `POST /store/carts/:id/complete`.

The edge continues to strip untrusted forwarding headers, preserve the actual Store hostname, use a fixed upstream, forward but never log the public key, reject unlisted methods/paths, bound body/header/time limits, and return generic errors. It must never proxy Admin, vendor, customer-auth, diagnostics, or caller-selected upstreams.

## Failure behavior

- capability failure leaves browsing available but removes all purchase actions;
- add/update/remove failure never changes totals locally without a confirmed response;
- readiness or graph becoming stale during checkout produces one generic unavailable state and blocks further mutation;
- crossed Store/key/Cart/variant/shipping context is generic not-found or unavailable with no identity clue;
- completion timeout is treated as indeterminate: the UI disables repeated blind completion, attempts one guarded Cart refetch, and never tells the customer that an Order failed or succeeded without authoritative evidence;
- unknown backend text, stack traces, IDs, provider messages, and headers never cross the DTO boundary;
- no failure retries with another Store, key, provider, Region, currency, shipping option, or variant.

## Accessibility and responsive acceptance

The new Cart, checkout, and confirmation states must retain Phase 3A's Arabic `lang`, RTL direction, contrast-safe brand theme, one primary heading, skip link, visible focus, reduced motion, logical CSS, and no horizontal overflow.

Manual acceptance includes:

- keyboard-only add to Cart, quantity update, removal, checkout fields, shipping selection, review, and completion;
- focus moves to meaningful status/error content after asynchronous failure;
- validation errors are associated with fields and announced;
- totals are not communicated by color alone;
- dialogs/drawers, if used, trap and restore focus correctly and close with Escape;
- usable layouts at 320, 375, 768, 1024, and 1440 CSS pixels, 200% zoom, and text-spacing overrides;
- touch targets and mobile checkout remain operable without hover.

## Automated acceptance matrix

### Capability and Product purchase boundary

| Scenario                                    | Required result                                 |
| ------------------------------------------- | ----------------------------------------------- |
| ready Professional Store A + A key          | available + Store A currency/countries          |
| Starter or non-ready Professional           | unavailable; no reason or internal state        |
| stale supposedly-ready graph                | unavailable                                     |
| crossed hostname/key                        | generic not-found                               |
| Store A asks for Store B Product handle     | generic not-found                               |
| Product has zero or multiple pilot variants | non-purchasable/fail closed                     |
| Product price currency differs from Store   | merchant write rejected or purchase unavailable |
| response contains unexpected private fields | exact adapter discards them                     |

### Cart and checkout isolation

| Scenario                                         | Required result                                  |
| ------------------------------------------------ | ------------------------------------------------ |
| Store A variant added to Store A Cart            | success                                          |
| Store B variant added to Store A Cart            | rejected                                         |
| Store A Cart read/mutated with Store B context   | generic not-found                                |
| Store B shipping option added to Store A Cart    | rejected                                         |
| caller-selected Region/channel/currency/provider | rejected or ignored in favor of server authority |
| stale readiness after Cart creation              | later mutations and completion denied            |
| duplicate completion attempt                     | no duplicate Order and deterministic state       |
| completed Store A Order viewed by merchant A     | reduced Order returned                           |
| completed Store A Order viewed by merchant B     | not found                                        |

### Browser journey

- Store A completes the full guest journey from Product detail to confirmation;
- Store B remains independently browsable and cannot restore Store A's Cart;
- reload restores only a valid current-Store Cart ID;
- address/email never appears in storage, URL, console, screenshot artifact, or documentation;
- capability becoming unavailable removes purchase controls and blocks checkout;
- navigation, responsive states, empty Cart, validation failure, transient failure, indeterminate completion, and confirmation are visually and manually checked;
- browser warning/error logs contain no secrets, PII, raw provider errors, or uncontrolled identifiers.

### Regression

- storefront unit tests, typecheck, lint, and production build pass;
- vendor dashboard typecheck/lint/build pass;
- backend exact DTO, currency, capability, and hostile isolation tests pass;
- existing Phase 1, Phase 2B, Phase 2C readiness, and Phase 3A browse/isolation suites remain green;
- guarded migration generation reports no unexpected schema change;
- the production bundle contains no visual-preview data, development Store selector, raw provider choice, demo Cart, or hidden deferred controls;
- no credential, publishable-key token, PII, or database URL appears in source-controlled artifacts or logs;
- Neon is not accessed.

## Guarded real-backend acceptance

The Phase 3A harness may be extended only if it preserves its exact disposable-database guards, exclusive lock, runtime-only synthetic secrets/keys, two Store deployments, backend restart support, schema scrub, port cleanup, and artifact cleanup.

The Phase 3B harness must seed:

- ready Professional Store A with one simple published Product;
- ready Professional Store B with a distinct Product and shipping option;
- distinct real hostname/key contexts;
- merchant owners for A and B without printing credentials;
- no real customer data.

It must record separately:

1. current-tree Phase 2C external-real-backend API evidence, if owner-authorized;
2. Phase 3B Storefront browser evidence;
3. physical keyboard/accessibility evidence;
4. cleanup evidence.

## Recorded implementation evidence

Current-tree Phase 2C real-backend API rerun, recorded separately:

- runtime-only synthetic platform authentication exercised real HTTP session/current-user/Admin routes;
- a new Professional Store was provisioned through real Admin HTTP and its commerce setup/readiness passed;
- no real credential or Neon access was used.

Phase 3B automated and Storefront browser evidence:

- exact capability/purchase DTOs, Store currency authority, and hostile Host/key/Product/Cart/shipping/payment cases passed;
- the built Store A customer journey completed Product -> Cart -> shipping -> local payment -> reduced confirmation at 125.000 LYD + 15.000 LYD = 140.000 LYD;
- merchant A listed/read the reduced Order, merchant B received 404, and the same checks passed after backend restart;
- Store B remained independently resolvable while crossed Store contexts failed closed;
- 320/375/768/1024/1440 RTL layouts had no horizontal overflow and browser warning/error logs were empty;
- only the opaque Cart ID was stored; customer details remained in memory and did not appear in storage, URLs, screenshots, documents, or logs;
- backend regression passed 23 suites/144 tests, storefront Vitest passed 3 files/11 tests, all backend/frontend checks and builds passed, Phase 3A acceptance remained green, and migration generation reported no model changes.

Cleanup evidence:

- ports 9000, 5175, 5176, and 55432 had no listeners;
- the exclusive lock and temporary smoke entries were absent;
- no owned Phase 3B process remained and the disposable schema was scrubbed.

Physical-keyboard evidence remains separate and pending. Automated semantics inspection does not satisfy it.

## Exit gate

Phase 3B is complete only when:

1. this contract and `adr-customer-commerce-pilot.md` are owner-approved and aligned with implementation;
2. the Store currency authority gap is fixed and covered;
3. the capability and purchase DTOs are exact and hostile-tested;
4. the full Store A guest Cart-to-Order browser journey passes;
5. Store B hostile Cart/Product/shipping/Order cases fail closed;
6. merchant A sees the reduced Order and merchant B does not;
7. responsive and physical keyboard acceptance is recorded;
8. existing backend and Phase 3A regression remains green;
9. the external Phase 2C evidence choice and its result/deferral are recorded separately;
10. all owned processes, disposable schema, locks, ports, and temporary artifacts are clean;
11. no production provider, money movement, customer account, deployment, production readiness, Neon access, commit, or push is falsely claimed.

Closing this gate authorizes no MVP, public pilot traffic, or production work. Those require a separate launch contract covering production infrastructure and provider operations.

As of 2026-07-22, exit items 1-6 and 8-11 are satisfied by the recorded guarded-local evidence. Item 7 is only partially satisfied: responsive and semantic browser checks passed, but the distinct owner-performed keyboard-only journey is pending. The gate is therefore open.

## Explicitly out of scope

- customer accounts, sessions, OTP, password recovery, saved addresses, and Order history;
- multi-variant Products, option combinations, tracked inventory, reservations, and low-stock behavior;
- promotions, gift cards, coupons, tax calculation/filing, invoices, and multiple currencies;
- production payment and fulfillment providers, payment details, capture, settlement, refunds, returns, disputes, and webhooks;
- email/SMS/WhatsApp notifications;
- owner self-service commerce reconfiguration, cancellation, expired-lease attention resolution, and plan changes;
- billing, entitlements, public signup, DNS/SSL, hosting/deployment automation, monitoring, backup/restore, production migration, and Vendor removal;
- Neon access.
