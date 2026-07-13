# Data Ownership Matrix

Last verified: 2026-07-13 after Phase 1 implementation.

| Resource | Current authoritative proof | Merchant/public enforcement | Phase 1 status | Permanent target |
| --- | --- | --- | --- | --- |
| Vendor compatibility store | Signed member/vendor session plus active records | Central `MerchantStoreContext` | VERIFIED TEMPORARY | SaaS Store linked to Tenant |
| Vendor member | Exact member ID, vendor ID, status, role, session version | Ambiguous/missing/inactive identities fail closed | VERIFIED TEMPORARY | Store membership and identity policy |
| Domain | Normalized `vendor_domain.vendor_id` | Public host resolution; merchant mutation blocked | VERIFIED TEMPORARY | Verified StoreDomain with approval/SSL state |
| Product | Exclusive vendor-product module link | List/detail/write plus exact channel checks | VERIFIED TEMPORARY | Store ownership invariant and migration FK/link |
| Product variant/price | Inherits authorized product | Merchant workflow input is server scoped | PARTIAL | Store-aware catalog, currency, inventory policy |
| Sales channel | Explicit Vendor metadata reference | Required; no fallback; server assigns one channel | VERIFIED TEMPORARY | Direct SaaS Store ownership |
| Publishable key | Explicit Vendor metadata reference plus Medusa key-channel link | Host/channel/key must agree exactly | VERIFIED TEMPORARY | Direct SaaS Store ownership and rotation policy |
| Order item | Current product ID | Exact reduced DTO includes owned items only | VERIFIED TEMPORARY | Inherit immutable order Store |
| Order | Presence of at least one currently owned item | List/detail filtered; no full entity serialization | PARTIAL/DEFERRED | Atomic immutable Store ownership |
| Customer/PII | No Store entity | Only order email is deliberately exposed; addresses/phone/customer internals omitted | PARTIAL | Store-scoped customer and PII policy |
| Branding | Vendor columns | Owner-editable allowlist and public allowlist | VERIFIED TEMPORARY | Store Brand model |
| Plan/entitlement | None | None | MISSING | Data-backed policy |
| Audit event | Request ID exists only in context | No durable event store | MISSING | Store/actor/request/action audit model |

## Isolation proof

Disposable Store A/Store B fixtures now cover merchant identity ambiguity, role permissions, suspended stores, product list/detail/create/update/publish/draft, hostile identifiers, public host/key/channel combinations, direct public reads, and mixed-order filtering. The generated Medusa link layer rejected a second Vendor link for one Product in integration testing; route code still fails closed when helper results are ambiguous.

## Explicit limitation

Current order filtering is not a substitute for whole-order Store ownership. A mixed order can be shown to each merchant as a reduced view containing only its own items. Phase 2 must prohibit or model mixed-store carts and persist one authoritative Store on the order.