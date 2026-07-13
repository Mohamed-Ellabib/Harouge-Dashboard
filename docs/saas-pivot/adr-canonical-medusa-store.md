# ADR: Canonical Medusa Store

Status: accepted for Phase 2A, 2026-07-13.

## Decision

The identity chain is Tenant -> StoreProfile -> Medusa Store.

Medusa Store is the canonical commerce-store identity. StoreProfile extends it with SaaS-facing status, handle, locale, timezone, plan, public contacts, domains, brand, and memberships. Tenant groups one or more StoreProfiles without duplicating commerce identity.

## Rationale

Medusa Store already owns commerce defaults such as currency, sales channel, region, and stock location. A second custom commerce Store would require synchronization and ambiguous lifecycle ownership. Tenant is separate because one business account can own multiple stores. StoreProfile is separate because SaaS, domain, and branding concerns do not belong in Medusa core tables.

Vendor is transitional. The legacy_vendor_id field supports non-destructive migration and the current route/dashboard response vocabulary, but Vendor does not authorize migrated merchant or public requests.

A Sales Channel controls catalog availability. It is not a Tenant or Store identity. Product ownership is the single Medusa Store-product link; channel membership must additionally equal that Store's allowed channel.

## Consequences

StoreProfile and Medusa Store are linked one-to-one and missing or ambiguous links fail closed. New product writes create both canonical Store ownership and the temporary Vendor link through one compatibility boundary. Cart and order ownership are deliberately not part of this decision; Phase 2B must persist immutable Store identity on those resources.
