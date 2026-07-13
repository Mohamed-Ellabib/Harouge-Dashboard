# Phase 2B Checkout Entry Points

Last updated: 2026-07-13

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

## Workflow Boundaries

- `createCartWorkflow.hooks.validate` and `cartCreated`: validate Store policy and create the unique Store-Cart link.
- `updateCartWorkflow.hooks.validate`: reject channel, region, currency, or inactive-Store mutations.
- `addToCartWorkflow.hooks.validate` and `updateLineItemInCartWorkflow.hooks.validate`: enforce canonical product ownership and sales-channel availability.
- Shipping, promotion, and customer-transfer validation hooks: enforce the same Cart Store context outside HTTP routes.
- `completeCartWorkflow.hooks.validate`: fail closed before order creation for unowned, ambiguous, mixed, inactive, or inconsistent carts.
- `completeCartWorkflow.hooks.orderCreated`: copy Cart Store ownership to the Order and verify the link before success.
- `createOrderWorkflow.hooks.orderCreated`: assign direct Admin draft orders only when channel and item evidence identify one Store.

## Other Entry Points

- Admin `POST /admin/draft-orders` invokes `createOrderWorkflow`; its resulting draft Order is linked through the global order hook.
- Admin draft-order conversion keeps the existing Order ID and therefore keeps its immutable Store link.
- Existing Admin order update, fulfillment, archive, cancel, and transfer routes do not create Cart/Order ownership and cannot edit module links.
- Custom merchant order list/detail routes are read-only and will authorize exclusively through the Store-Order link.
- There are no custom Cart or checkout routes in the application at the Phase 2A baseline.

All controls are implemented at middleware and workflow boundaries so direct workflow execution cannot bypass the ownership invariants.
