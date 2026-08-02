# Phase 3C Concierge Commerce MVP Contract

Status: owner-approved for planning and implementation on 2026-08-01.

## Objective

Publish the first production-capable version of the SaaS for a small number of
Libyan merchants acquired through platform advertising and onboarded directly
by the platform owner.

This is a concierge MVP. Merchants cannot register themselves. The platform
owner creates each merchant, configures the Store, selects a shared storefront
template, applies the merchant brand, and connects the custom domain.

## Launch boundary

- Libya and LYD only;
- Arabic and English storefront content and controls;
- guest checkout without customer accounts;
- cash on delivery or manually verified bank transfer;
- one merchant per Cart and Order;
- one flat-rate Libya delivery option per Store;
- manual merchant subscription invoicing outside the platform;
- three reusable storefront templates sharing one commerce implementation;
- custom merchant domains connected through an assisted platform operation.

## Platform owner journey

The platform owner:

1. receives and reviews a merchant lead outside the application;
2. creates the merchant and canonical Store through platform-only provisioning;
3. assigns the commerce-enabled plan and runs assisted commerce setup;
4. selects one of three shared templates;
5. configures Store name, logo, colors, typography, contact details, bank-transfer
   instructions, policy content, and About content;
6. connects and verifies the merchant custom domain;
7. invoices the merchant manually outside the platform;
8. can inspect provisioning, readiness, domain, and notification failures without
   reading credentials or customer secrets.

Public merchant signup, automatic plan purchase, and automatic subscription
billing are not part of this phase.

## Merchant journey

An invited merchant can:

- sign in to the existing Store-scoped merchant dashboard;
- create and update physical Products with size and color options;
- create the resulting variant combinations with one LYD price each;
- set and update available stock per variant;
- publish or unpublish Products;
- view only Orders owned by the merchant's permanent Medusa Store;
- mark a manual bank transfer as verified;
- move an Order through `new`, `confirmed`, `preparing`, `shipped`, `delivered`,
  or `cancelled` operational states;
- add an optional shipment reference or tracking text;
- cancel an eligible Order and restore its deducted variant stock exactly once.

Courier booking, return merchandise authorization, refunds, labels, and invoices
are not part of the MVP.

## Customer journey

A guest customer can:

1. browse and search the bilingual Store catalog;
2. open a Product and select its size/color variant;
3. see current availability and add an available variant to the Cart;
4. change quantity or remove a line;
5. enter contact and Libya delivery details;
6. select the Store's one flat-rate delivery option;
7. choose cash on delivery or bank transfer;
8. review totals and submit the Order;
9. see a reduced confirmation and, for bank transfer, the merchant's allowlisted
   transfer instructions.

The customer contacts the merchant to cancel, request a return, or ask for
status. There is no customer account, public Order lookup, online cancellation,
or customer-facing Order history in this phase.

## Product variants and inventory

- MVP option types are size and color; values are merchant-defined bounded text.
- A Product may have multiple active variants formed from those options.
- Price currency is derived from the permanent Store and cannot be supplied as
  authority by the merchant client.
- Available stock is tracked per Store-owned variant.
- Adding to Cart does not reserve stock.
- Order submission atomically validates and deducts all required variant stock.
- Concurrent submission for the final unit has one winner; overselling fails
  closed with a generic customer-safe response.
- Eligible merchant cancellation restores stock exactly once.
- Returns are handled outside the platform and do not mutate inventory in the
  MVP.

## Payment methods

### Cash on delivery

Cash on delivery records the selected method without online authorization,
capture, settlement, or refund behavior.

### Manual bank transfer

- the Store owns allowlisted bank name, account-holder name, account reference,
  and bounded customer-facing instructions;
- bank details are returned only after the customer selects bank transfer and
  submits the Order;
- the customer sends proof outside the platform;
- the merchant verifies payment manually in the dashboard;
- there is no receipt upload, bank API, automatic reconciliation, settlement,
  or platform-managed refund.

## Merchant WhatsApp notification

- a successful new Order schedules an automatic WhatsApp notification to the
  owning merchant through an approved provider API;
- notification failure never rolls back or hides a valid Order;
- delivery attempts are idempotent, retryable, sanitized, and visible to an
  authorized operator;
- messages contain the minimum data needed to identify the Order in the merchant
  dashboard and do not expose credentials, payment secrets, or internal IDs;
- provider selection, Meta Business onboarding, and message-template approval
  are launch dependencies with dashboard-only operation as the temporary
  fallback during provider approval.

## Storefront templates and content

The MVP contains exactly three templates. They share the same routing, Store
context, DTO mappers, Cart, checkout, inventory, accessibility, and security
code. A template changes presentation and section composition; it cannot weaken
Store isolation or create a separate commerce implementation.

Each template supports:

- Arabic RTL and English LTR layouts;
- logo, Store name, colors, typography, and merchandising imagery;
- About content;
- Contact and WhatsApp content;
- delivery and returns policy;
- privacy policy and terms;
- responsive mobile and desktop layouts with keyboard-visible focus.

## Domain operation

- each public Store uses a verified custom hostname plus its matching controlled
  publishable key;
- the temporary platform hostname remains available until custom verification
  and SSL activation complete;
- DNS instructions and verification are platform-assisted for the MVP;
- unknown, inactive, unverified, ambiguous, or crossed hostname/key contexts
  fail closed without revealing another Store;
- production edge configuration must strip untrusted forwarding headers,
  enforce method/path/body/time limits, and redact sensitive logs.

## Production prerequisites

Before public traffic:

1. configure the dedicated versioned provisioning-fingerprint key-ring through
  the deployment secret manager and rehearse migration and rotation;
2. provide shared rate limiting, runtime locks, and notification jobs suitable
   for the selected deployment topology;
3. configure production secrets outside source control;
4. deploy fresh managed PostgreSQL without using the prohibited historical Neon
   credential or migrating unreviewed legacy data;
5. enable automated backups and complete one restore rehearsal;
6. add health, error, database, lease-attention, inventory, and notification
   monitoring;
7. configure the production edge, DNS, and SSL path;
8. retain the legacy Vendor compatibility layer until a separately approved
   migration phase.

## Explicit exclusions

- public merchant registration or self-service onboarding;
- automated merchant billing, renewals, entitlements purchase, or invoices;
- customer accounts, OTP, saved addresses, Order lookup, or Order history;
- customer online cancellation;
- returns, refunds, exchanges, or return inventory automation;
- online card or wallet payments;
- bank receipt upload or automatic bank reconciliation;
- courier API integration or shipping-label generation;
- promotions, coupons, gift cards, or automated tax calculation;
- multi-country or multi-currency commerce;
- custom code forks for individual merchants;
- legacy Vendor removal.

## Target sequence

1. production security foundation and fingerprint key rotation;
2. multi-variant Product and merchant editor;
3. variant inventory deduction and cancellation restoration;
4. COD and manual bank-transfer Order methods;
5. merchant Order operations and WhatsApp notifications;
6. three bilingual templates and required content surfaces;
7. custom-domain production edge, backups, monitoring, and staging;
8. two-Store staging acceptance followed by a limited merchant launch.

The target is eight weeks, but security, data isolation, inventory correctness,
backup restoration, and domain/key enforcement cannot be waived to meet a date.

## Exit gate

Phase 3C is complete only when:

1. the production prerequisites above pass in a non-production staging environment;
2. platform onboarding creates two independently branded custom-domain Stores;
3. both Stores pass Arabic/English catalog, variant, Cart, COD, bank-transfer,
   confirmation, and merchant Order journeys;
4. concurrent final-unit acceptance proves no oversell and exact cancellation
   stock restoration;
5. crossed Store hostname/key/Product/variant/Cart/Order attempts fail closed;
6. WhatsApp success, retry, duplicate-delivery, and provider-outage behavior is
   accepted, or the documented dashboard fallback is explicitly approved for
   initial launch;
7. all three templates pass responsive, RTL/LTR, keyboard, and production-bundle
   checks;
8. backup restoration and backend restart persistence pass;
9. no production credential or customer personal data appears in source,
   fixtures, logs, URLs, screenshots, or build artifacts;
10. the owner separately approves limited production launch after reviewing the
    staging evidence.

This contract authorizes Phase 3C implementation. It does not by itself
authorize production deployment, public traffic, Neon access, or Vendor removal.