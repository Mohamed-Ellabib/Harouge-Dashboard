# Phase 1 Route Security Matrix

Status legend: `SAFE` is a verified current control, `FIXED` was changed in Phase 1, `INTERNAL ONLY` is outside merchant authority, and `OBSOLETE` is intentionally unavailable.

| Method and path | Actor / permission | Authoritative context | Ownership decision | Cross-store behavior | Evidence | Status |
| --- | --- | --- | --- | --- | --- | --- |
| `POST /vendor/auth/login` | Anonymous | Normalized email resolves exactly one active member and active vendor; configured channel must resolve | Session receives server-side member/vendor/version only | Ambiguous email, missing channel, inactive member/store fail with generic credentials response | Phase 1 HTTP identity tests | FIXED |
| `POST, DELETE /vendor/auth/logout` | Merchant session optional | Clears signed cookie | No resource mutation | Cannot affect another member | Existing auth tests | SAFE |
| `PATCH, POST /vendor/auth/password` | `security.self` | `MerchantStoreContext` | Current member only; current password required; version increments | Cannot reset another member; all prior sessions revoked | Phase 0.5 HTTP tests | SAFE |
| `GET /vendor/me` | `store.read` | `MerchantStoreContext` | Returns current vendor profile | No client vendor selector | Phase 1 role/shop test | FIXED |
| `PATCH /vendor/me` | `store.manage` (owner) | `MerchantStoreContext` | Allows name, private contact email, logo, primary color | Rejects IDs, handle, status, domains, metadata, channel, key, plan, provisioning, and permission fields | Phase 1 role/shop test | FIXED |
| `GET /vendor/products` | `products.read` | `MerchantStoreContext` | Requires exclusive vendor link and exactly the allowed channel | Other-store and ambiguous products omitted | Phase 1 product test | FIXED |
| `POST /vendor/products` | `products.write` | `MerchantStoreContext` | Server assigns current vendor link and one allowed channel | Hostile vendor/store/channel fields rejected | Phase 0.5 and Phase 1 HTTP tests | FIXED |
| `GET /vendor/products/:id` | `products.read` | `MerchantStoreContext` | Exclusive vendor link plus exact channel | Other-store IDs return 404 | Phase 1 product test | FIXED |
| `PATCH /vendor/products/:id` | `products.write` | `MerchantStoreContext` | Exclusive owner; server preserves allowed channel | Cross-store IDs return 404; hostile ownership/channel fields rejected | Phase 0.5 and Phase 1 HTTP tests | FIXED |
| `DELETE /vendor/products/:id` | None | None | Product deletion/archive is not implemented | Returns 404 | Phase 1 product test | OBSOLETE |
| `GET /vendor/orders` | `orders.read` | `MerchantStoreContext` | Includes only orders with current owned product items; serializes only owned items | Other-store line items and internal fields omitted | Phase 1 order tests | FIXED |
| `GET /vendor/orders/:id` | `orders.read` | `MerchantStoreContext` | Same filtered DTO as list | Orders with no owned items return 404 | Phase 1 order tests | FIXED |
| `GET /store/vendors/resolve` | Public | `PublicStoreContext` | Normalized trusted host, active vendor, exact channel, exact publishable key | Unknown, inactive, mismatched, ambiguous contexts fail closed | Phase 1 public matrix | FIXED |
| `GET /store/vendors/:handle` | Public | `PublicStoreContext`; handle override only in dev/test | Explicit public profile allowlist | Production identity remains host/key/channel based | Public contract and Phase 1 matrix | FIXED |
| `GET /store/products*` | Public | `PublicStoreContext` middleware plus Medusa key scope | Host vendor channel must equal the key's sole channel | Store A key/host cannot list or directly read Store B product | Phase 1 public product tests | FIXED |
| `/admin/vendors*` | Medusa internal user | Medusa session/bearer auth | Platform operator control surface | Not exposed to merchant dashboard | Middleware and route inventory | INTERNAL ONLY |

## Role matrix

| Capability | Owner | Manager |
| --- | --- | --- |
| Read products/orders/store | Allow | Allow |
| Create/update/publish/draft products | Allow | Allow |
| Change own password | Allow | Allow |
| Edit allowed store profile fields | Allow | Deny |
| Change domain, channel, key, handle, status, plan, provisioning | Internal only | Internal only |

## Deferred boundary

Orders do not yet carry immutable whole-order Store ownership. Phase 1 returns a deliberately reduced DTO and filters line items by current exclusive product ownership. Phase 2 must add atomic Store ownership to carts/orders and replace this compatibility rule.