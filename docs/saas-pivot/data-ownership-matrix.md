# Data Ownership Matrix

| Resource | Current ownership proof | Merchant path | Status | Required target control |
| --- | --- | --- | --- | --- |
| Vendor prototype | Primary ID | Session plus active membership lookup | PARTIAL | SaaS Store linked to Tenant and Medusa resources. |
| Vendor member | `vendor_member.vendor_id` | Signed session IDs revalidated server-side | PARTIAL | Store membership FK, identity policy, permissions, session version. |
| Domain | `vendor_domain.vendor_id` | Public lookup; Admin mutation | PARTIAL | Normalized unique hostname, verification/SSL state, trusted-host resolver. |
| Product | Vendor-product module link | Merchant list and PATCH use link | PARTIAL/UNSAFE | Database single-owner invariant, scoped channel, transactional creation. |
| Product variant | Inherits product | First variant only | PARTIAL | Resolve product Store before every variant/inventory operation. |
| Price | Inherits first variant | Merchant sets amount/currency | PARTIAL | Medusa price model with Store currency/region validation. |
| Sales channel | No Store ownership | Product creation assigns every channel | UNSAFE | One allowed channel per Store and server-enforced assignment. |
| Publishable key | No Store ownership | Standard Store middleware only | UNSAFE | Store-channel key cross-checked with verified hostname. |
| Stock location | No Store ownership | No merchant inventory API | MISSING | Store-linked location and workflow-based reservations. |
| Cart | No custom ownership | No custom cart flow | MISSING | Immutable Store/channel context and mixed-Store rejection. |
| Order | No custom ownership | Global top-100 query filtered by product link | UNSAFE | Complete order atomically linked to one Store and channel. |
| Order item | Current product ID used indirectly | Merchant sees linked items | PARTIAL/OBSOLETE | Inherit immutable order Store; preserve snapshots. |
| Customer/PII | No custom Store relationship | Order email returned with linked item | UNSAFE | Store-scoped customer profile and identity policy. |
| Branding | Vendor columns and metadata | Public and merchant profile read | PARTIAL | Store Brand and public allowlist. |
| Plan/entitlement | None | None | MISSING | Data-backed policy enforced by backend. |
| WhatsApp enquiry | None | None | MISSING | Store FK, idempotency, immutable snapshots, audited status. |
| Audit event | None | None | MISSING | Store, actor, request ID, action, resource, safe metadata. |

## Database constraints

- Vendor handle and stored domain have unique partial indexes for non-deleted
  rows.
- Vendor member email is not unique globally or per Store.
- `vendor_member.vendor_id` and `vendor_domain.vendor_id` are indexed text
  fields, not database foreign keys in the observed schema.
- The product-link primary key is `(vendor_id, product_id)`. It prevents a
  duplicate pair but permits one product ID under multiple vendors.
- Application code checks product assignment conflicts, but the database does
  not independently enforce the single-Store invariant.

## Isolation proof status

No two-Store fixture or automated isolation suite exists. Source checks are not
sufficient proof. Phase 1 must execute every direct-object, list, mutation,
order, customer, domain, role, suspended-Store, and hostile-body test from the
mandate against Store A and Store B.
