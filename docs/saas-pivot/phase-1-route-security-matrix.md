# Route Security Matrix After Phase 2A

| Method/path | Authoritative context | Ownership decision | Status |
| --- | --- | --- | --- |
| POST /vendor/auth/login | exact active legacy identity plus permanent Membership/Profile/Tenant/Store | session receives StoreProfile identity; generic failure | UPDATED SAFE |
| PATCH /vendor/auth/password | permanent merchant context | current account; session version revoked | SAFE |
| GET/PATCH /vendor/me | permanent merchant context and owner permission | permanent Store/Profile update plus temporary Vendor compatibility write | UPDATED SAFE |
| GET/POST /vendor/products | permanent merchant context | canonical Store owner, matching channel, matching temporary Vendor link | UPDATED SAFE |
| GET/PATCH /vendor/products/:id | permanent merchant context | all ownership layers must agree; cross-store is 404 | UPDATED SAFE |
| GET /vendor/orders and /:id | permanent merchant context | items selected by consistent canonical product ownership | TEMPORARY MITIGATION |
| GET /store/vendors/resolve | verified Domain/Profile/Tenant/Store plus key/channel | exact public allowlist | UPDATED SAFE |
| GET /store/vendors/:handle | permanent context; dev/test handle override only | exact public allowlist | UPDATED SAFE |
| GET /store/products* | public permanent context plus Medusa key scope | host Store channel and key must agree | UPDATED SAFE |
| /admin/vendors* | Medusa internal user | compatibility management; run backfill after standalone legacy creation | INTERNAL TRANSITIONAL |

Owner and manager retain product/order/store read access and self-security access. Only owners can edit the allowed store profile fields. Domains, IDs, handles, status, plan, channels, keys, and permissions remain platform-controlled.

Orders still lack immutable whole-order Store ownership. Phase 2B must replace item-derived ownership and reject mixed-store carts before completion.
