# Phase 2B Checkout Entry Points

Last updated: 2026-07-19 for the current uncommitted Phase 2C gate-closure working tree.

Installed commerce version: Medusa 2.17.0.

## Public Store API

| Route | Installed operation | Phase 2B control |
| --- | --- | --- |
| `POST /store/carts` | `createCartWorkflow` | PublicStoreContext, server channel/region policy, cart Store link |
| `GET /store/carts/:id` | cart refetch | hostname/key and canonical Cart Store match |
| `POST /store/carts/:id` | `updateCartWorkflow` | immutable Store/channel, region/currency and active Store policy |
| `POST /store/carts/:id/customer` | `transferCartCustomerWorkflow` | Cart Store check; customer cannot move ownership |
| `POST /store/carts/:id/line-items` | `addToCartWorkflow` | canonical product owner and channel validation |
| `POST /store/carts/:id/line-items/:line_id` | `updateLineItemInCartWorkflow` | existing item ownership revalidation |
| `DELETE /store/carts/:id/line-items/:line_id` | `deleteLineItemsWorkflow` | Cart Store and active Store validation |
| `POST/DELETE /store/carts/:id/promotions` | `updateCartPromotionsWorkflow` | Store promotion allowlist |
| `POST /store/carts/:id/shipping-methods` | `addShippingMethodToCartWorkflow` | Store shipping-option allowlist |
| `POST /store/carts/:id/taxes` | tax refresh | Cart Store validation |
| `POST /store/carts/:id/complete` | `completeCartWorkflow` | pre-order ownership validation and immutable Order Store link |
| `POST /store/payment-collections` | `createPaymentCollectionForCartWorkflow` | referenced Cart Store validation |
| `GET /store/shipping-options?cart_id=...` | `listShippingOptionsForCartWorkflow` | Cart Store validation and response filtering |
| `POST /store/shipping-options/:id/calculate` | shipping price workflow | Cart Store and option allowlist validation |

For every mutating, shipping, payment, and completion entry above, the current public middleware also requires a Professional plan, one `ready` readiness row, its referenced `completed` setup, and a deep live deterministic commerce graph. Cart retrieval may remain available for recovery, but it never makes a non-ready Cart mutable. Payment-session creation additionally accepts only the local gate provider `pp_system_default`.

## Workflow Boundaries

- `createCartWorkflow.hooks.validate` and `cartCreated`: validate Store policy and create the unique Store-Cart link.
- `updateCartWorkflow.hooks.validate`: reject channel, region, currency, or inactive-Store mutations.
- `addToCartWorkflow.hooks.validate` and `updateLineItemInCartWorkflow.hooks.validate`: enforce canonical product ownership and sales-channel availability.
- Add-shipping, non-empty promotion, customer-transfer, and both shipping-option-listing hooks: enforce the same Cart Store and deep readiness graph outside HTTP routes.
- `completeCartWorkflow.hooks.validate`: fail closed before order creation for unowned, ambiguous, mixed, inactive, or inconsistent carts.
- `completeCartWorkflow.hooks.orderCreated`: copy Cart Store ownership to the Order and verify the link before success.
- `createOrderWorkflow.hooks.orderCreated`: assign direct Admin draft orders only when channel and item evidence identify one Store.

Cart create/update, add/update item, add shipping, non-empty promotions, customer transfer, shipping listing, and completion currently expose usable installed hooks and are deep-gated by project registrations.

The promotion hook intentionally returns early when `promo_codes` is empty. Medusa invokes this empty operation while bootstrapping Cart creation before Store-Cart ownership has been linked. Public HTTP mutation remains gated, and non-empty internal promotion changes are gated.

## Other Entry Points

- Admin `POST /admin/draft-orders` invokes `createOrderWorkflow`; its resulting draft Order is linked through the global order hook.
- Admin draft-order conversion keeps the existing Order ID and therefore keeps its immutable Store link.
- Existing Admin order update, fulfillment, archive, cancel, and transfer routes do not create Cart/Order ownership and cannot edit module links.
- Custom merchant order list/detail routes are read-only and will authorize exclusively through the Store-Order link.
- There are no custom Cart or checkout routes in the application at the Phase 2A baseline.

## Trusted internal no-hook boundary

The public HTTP entry points above are guarded. The installed Medusa version does not expose a usable project hook for every core flow. Current no-hook examples include line-item deletion, payment-collection creation, payment-session creation, and shipping-price calculation.

An arbitrary internal import of one of those core workflows is therefore a trusted application surface and is not automatically intercepted by the public middleware. Project code must invoke it only behind a guarded API or an explicit wrapper that calls the same Store/readiness assertions. New direct imports require ownership/readiness review. Do not claim universal direct-workflow interception until this boundary is eliminated.

Accepted guarded-local evidence is commerce readiness 12/12, commerce-resource units 5/5, and the Phase 2B Cart/Order regression 12/12. It proves public integration HTTP behavior and the registered project flows described above; it does not prove that arbitrary future internal core imports cannot bypass a no-hook boundary.
