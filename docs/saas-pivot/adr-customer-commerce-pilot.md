# ADR: Customer Commerce Pilot

Status: accepted by the owner and implemented on 2026-07-22; committed on 2026-07-29. The selected current-tree Phase 2C real-backend API rerun and Phase 3B automated/browser/restart/cleanup evidence passed on guarded disposable local PostgreSQL. The distinct owner-performed Phase 3B physical-keyboard journey passed on 2026-07-29, closing the exit gate. This decision does not authorize public use, deployment, production providers, production migration, or Neon access.

## Context

Phase 3A closed its guarded-local exit gate with an Arabic-first, browse-only Storefront, exact public DTO mapping, hostile Store A/Store B isolation, responsive browser evidence, and a physical keyboard pass.

The current uncommitted backend also has a locally verified Professional-Store commerce path. A platform-only setup operation creates one deterministic Store fulfillment graph, and deep public HTTP guards enforce plan, readiness, live graph, hostname/key, Product, Cart, shipping-option, payment-provider, and Order ownership. Automated integration evidence already completes one Cart into one canonically Store-owned Order and denies the other merchant.

At the decision point, that backend evidence was not yet a usable customer journey: the Storefront had no public commerce-capability contract, purchasable variant/price DTO, Cart state, address form, shipping selection, payment-session step, or Order confirmation. The merchant Product API also accepted a caller-selected currency and defaulted to EUR even when the permanent Store currency was different. The implementation result below records the correction of both gaps.

The business needs a fast pilot before a broader MVP. The pilot should prove the complete ownership and conversion path without pretending that local framework providers, assisted setup, or local infrastructure are production commerce.

## Decision

Phase 3B is an owner-authorized guarded-local, assisted, guest-commerce pilot for one simple Product variant per Product.

It proves this journey:

1. a platform administrator provisions one `professional_commerce` Store and completes its existing commerce setup through the authenticated platform operation;
2. the merchant signs into the restricted vendor dashboard and publishes one simple Product whose single variant price is derived and validated against the Store currency;
3. an anonymous customer visits that Store's hostname/key deployment, sees an explicit public checkout capability, adds the Store-owned variant to a Cart, updates quantity, enters contact and delivery details, selects the one Store-allowed shipping option, creates the local system-default payment session, and completes the Cart;
4. the customer receives an allowlisted Order confirmation without an account;
5. the owning merchant can see the complete Order through the existing reduced merchant Order surface, while another merchant and another Store context cannot access it.

Phase 3B preserves every permanent ownership boundary. The Storefront never selects a Tenant, StoreProfile, Medusa Store, Sales Channel, Region, shipping option, payment provider, or publishable key from customer input. The backend remains authoritative for every write and revalidates the live commerce graph.

## Pilot product boundary

The pilot supports:

- `professional_commerce` Stores whose readiness is currently and deeply validated as `ready`;
- guest checkout only;
- exactly one simple active variant per purchasable Product;
- one Store-derived currency price for that variant;
- untracked pilot inventory with backorders allowed, matching the existing vendor Product workflow;
- quantity update and item removal;
- one delivery address and one exact Store-allowed shipping option;
- the local `manual_manual` fulfillment provider;
- the local `pp_system_default` payment provider;
- one Cart-to-Order completion and reduced confirmation;
- merchant Order visibility through the existing Store-Order authorization boundary.

The pilot does not claim stock accuracy, inventory reservation, real carrier booking, payment capture, settlement, refundability, tax correctness, webhook processing, or customer identity.

## Explicit public capability

The Storefront may expose Cart controls only after a new exact public capability response says online checkout is available. The response is derived from the verified PublicStoreContext and the same deep readiness/live-graph assertion used by checkout. It must not expose plan, readiness status, failure reason, setup state, Store/Tenant/Profile IDs, Region ID, provider IDs, or internal resource references.

Starter, pending, configuring, failed, attention, disabled, stale-graph, and otherwise non-ready Stores remain browse-only. The UI must not infer checkout from a plan string, Product price, successful profile response, or build configuration.

## Exact purchase presentation

A separate Store-scoped purchase-options response supplies only the opaque variant write reference, display label, calculated Store-currency price, and a bounded availability boolean for the one supported variant. It is available only for a published Product that belongs canonically to the current Store and its sole Sales Channel.

The variant reference is public operational input, not authorization. Add-to-Cart still revalidates canonical Product/variant ownership, Sales Channel, Cart Store, hostname/key, and current readiness.

## Guest Cart state

The browser may persist only a versioned opaque Cart ID in same-origin `sessionStorage` for refresh recovery. It may not persist the publishable key, Store identity payload, Product payload, Cart response, address, email, phone, payment data, Order response, or upstream error details.

On restore, the Storefront retrieves the Cart through the current hostname/key context and exact-maps the response. A missing, completed, malformed, or cross-Store Cart clears the local Cart reference and fails closed. Cart IDs in browser storage never bypass backend authorization.

## Assisted platform operation

The pilot uses the existing authenticated platform provisioning and commerce-setup operations. It does not add setup reconfiguration, cancellation, expired-lease attention resolution, plan changes, billing, or automated deployment. A polished owner-dashboard setup workflow is an MVP/operations follow-up unless separately added to this contract before approval.

## External evidence boundary

Before the Phase 3B exit gate can close, the owner must choose one of the two already documented paths:

1. authorize and record a current-tree external real-backend Phase 2C acceptance rerun on guarded disposable local PostgreSQL; or
2. explicitly accept its continued deferral and record that the Phase 3B evidence is narrower.

The recommended choice is the first. The Phase 2C rerun and Phase 3B browser journey may use one guarded harness run, but their results must be reported as separate evidence sets. Neither may use Neon.

The owner selected the first path. On 2026-07-22 the authenticated current-tree Phase 2C real-backend API rerun passed with runtime-only synthetic credentials and a real Admin HTTP provisioning/setup/readiness journey on guarded disposable PostgreSQL. It is recorded separately from the Phase 3B browser and cleanup evidence and does not alter the historical Phase 2C record.

## Implementation result

The exact capability and purchase-option boundaries, Store-derived merchant Product currency, guest Cart/checkout/reduced-confirmation application, hostile two-Store enforcement, reduced merchant Order visibility, backend-restart persistence, responsive browser matrix, regression suite, artifact scan, and cleanup contract are implemented and passed locally. No real provider or real customer data was used. Automated semantic inspection is not counted as the required physical-keyboard check; that distinct check remains open.

## Consequences

- The shortest credible pilot proves owner -> merchant -> customer -> merchant value without customer accounts or real money.
- Existing Cart/Order ownership and readiness work is reused rather than duplicated in the frontend.
- Store currency becomes server-owned for merchant Product writes, closing a concrete pre-pilot correctness gap.
- A dedicated capability response prevents the frontend from guessing entitlement or readiness.
- A single-variant boundary keeps the pilot small; multi-option variant selection, tracked inventory, promotions, and tax are explicit MVP gaps.
- The local provider journey proves structure and isolation only. It is not safe to sell as production checkout.

## Deferred

Customer registration/login, OTP, password recovery, saved addresses, customer Order history, multi-variant configuration, tracked inventory, inventory reservations, promotions, coupons, taxes, invoices, real payment/fulfillment providers, webhooks, refunds, cancellations, returns, disputes, notifications, WhatsApp, billing/entitlements, public Store signup, DNS/SSL automation, hosting/deployment automation, shared production infrastructure, monitoring/alerting, backups/restore, attention repair, plan/setup mutation, Vendor removal, production migration, and Neon access are outside this proposal.
