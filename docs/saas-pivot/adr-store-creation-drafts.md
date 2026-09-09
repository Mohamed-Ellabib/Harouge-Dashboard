# ADR: resumable template-based Store creation

Deletion amendment, 2026-09-08: owner-approved permanent draft deletion uses a
Super Admin-only DELETE with the reviewed revision. It takes the confirmation
advisory lock and draft row lock, then physically removes every draft-owned trial
row (including soft-deleted rows) and the draft record atomically. Other drafts,
shared image assets and real Store resources are unaffected. Confirming/confirmed
drafts, Store-linked rows and provisioning checkpoints are rejected to preserve
setup recovery. The UI names the draft in an irreversible-action confirmation
and updates the saved-draft count and resume strip only after success. Missing
drafts return 404 to reads, saves and trials, preventing stale editors from
recreating them. The six-case owned-disposable PostgreSQL suite passed with
authentication, revision/confirmation-lock rejection, physical deletion,
isolation and stale-request coverage. Three frontend checks, both typechecks
and isolated browser cancel/delete/refresh checks passed. No existing user draft
was deleted during QA.

Preview parity amendment, 2026-09-08: the owner requires the library preview and
a fresh editable draft to be identical. The authenticated template catalogue now
returns validated `creation_previews` from `initialCreationValues`, also used by
draft creation. This is a read-only preset response, with no account, Store,
draft or product installation side effects. Library and expanded views consume
those values through the existing editor profile/catalog adapters; creating a
draft carries the selected EN/AR locale. The Studio phone uses the editor's
430 × 932 viewport. Saved drafts and stores are never reseeded. Category-selected
onboarding continues to use its explicitly selected category catalog.

Recovery amendment, 2026-09-08: confirmation checks the selected template against
the installed storefront constraint before creating owner or Store resources.
Saved-step booleans tell the dialog when the owner password is no longer needed.
Known workflow-safe errors retain their actionable message; unexpected errors
expose only the failed stage, with no raw SQL/provider/credential details.
Existing Template 5/6 migrations are now active on guarded development only.
A disposable integration regression covers a missing registry entry and a later
presentation interruption, then verifies password-free replay without duplicates.

Owner approved implementation on 2026-09-05 after reviewing the proposed draft,
starter catalog, isolated trial checkout, confirmation and publication workflow.
This is bounded development work, not deployment or public-traffic approval.

## 2026-09-08 owner amendment: category-based starter catalogs

The owner approved separate store-category and template choices in Add New Store.
Fashion (9 products), Beauty (6), Watches & Accessories (10), Home & Living (4),
and General Retail (8) can be composed with any of the six visible templates.
The category supplies independent product/category/variant/stock copies; the
template retains its layout and artwork. Sample products are optional. The
current installer requires Professional Commerce; Starter WhatsApp remains an
empty-catalog option and does not acquire checkout capabilities.

The regular wizard now uses the same private creation draft, revision checks,
confirmation checkpoints and catalog installer as Studio creation. Optional JSON
fields pin the category and sample choice, and retain client assignment, domain,
plan and locale. Existing drafts without these fields retain their original
template-specific catalog rules. No data migration or existing-store reseeding
is performed. Confirmation still leaves the presentation unpublished; editable
sample products must be reviewed or replaced before publication.

Focused verification: 30 category/template schema-and-asset combinations, two
independent confirmed Home & Living catalogs, confirmation replay, category
conflicts, an empty Starter store, and legacy draft compatibility passed in the
3-case owned-disposable PostgreSQL suite. The existing 6-case draft/trial/order
suite and 6 focused frontend tests passed. Browser preview verified the new step
order and category/template/product-count review. This is development evidence,
not deployment, public-traffic or Phase 3C gate closure.

## 2026-09-08 owner amendment: category-based starter catalogs

The owner approved separate store-category and template choices in Add New Store.
Fashion (9 products), Beauty (6), Watches & Accessories (10), Home & Living (4),
and General Retail (8) can be composed with any of the six visible templates.
The category supplies independent product/category/variant/stock copies; the
template retains its layout and artwork. Sample products are optional. The
current installer requires Professional Commerce; Starter WhatsApp remains an
empty-catalog option and does not acquire checkout capabilities.

The regular wizard now uses the same private creation draft, revision checks,
confirmation checkpoints and catalog installer as Studio creation. Optional JSON
fields pin the category and sample choice, and retain client assignment, domain,
plan and locale. Existing drafts without these fields retain their original
template-specific catalog rules. No data migration or existing-store reseeding
is performed. Confirmation still leaves the presentation unpublished; editable
sample products must be reviewed or replaced before publication.

Focused verification: 30 category/template schema-and-asset combinations, two
independent confirmed Home & Living catalogs, confirmation replay, category
conflicts, an empty Starter store, and legacy draft compatibility passed in the
3-case owned-disposable PostgreSQL suite. The existing 6-case draft/trial/order
suite and 6 focused frontend tests passed. Browser preview verified the new step
order and category/template/product-count review. This is development evidence,
not deployment, public-traffic or Phase 3C gate closure.

## 2026-09-05 owner amendment: all four Studio templates

### Subsequent URBX amendment, 2026-09-06

The owner approved URBX as Studio Template 5 and registry key 8, using the same
private drafts and independent catalog installation. Four starter products have
five sizes each; the four categories include Accessories (initially no product).
Welcome, home, shop and categories are implemented; other routes use existing shared surfaces
until their individual design turns. Optional strictly validated `home` content
persists independently of welcome `hero` content. Existing documents without it
remain valid. Optional strict `shop` fields similarly keep shop copy independent
and editable without a new database schema migration. Categories use optional
strict localized copy and per-category `banner_image_url`, independent from the
small home tiles. Catalog-derived counts and slug-compatible category links
preserve real store ownership without inventing reference inventory.
No customer accounts, card payments, automated fulfillment, or
launch approval is added. The new registry constraint migration still requires
the guarded development runner before interactive DB confirmation acceptance.

The owner subsequently approved applying the same flow to Standard, Drops and
Luxe Commerce — Full Source. All four visible choices use the same private draft,
trial transport, confirmation and Store-scoped commerce authorities. Each choice
has its own code-owned starter catalog and document: Glow Beauty (6 products),
Standard (9), Drops (8), and Luxe Commerce — Full Source (10). Creation request
keys are template-bound; changing a choice must not resume a different template.
Copies become independent products/variants/stock/categories; template fixtures
are never used to mask a missing live catalog. Existing stores are not reseeded.

Drops is the seventh code-owned document registry key and fourth visible Studio
choice; historical Home & Living, Modern Market and Luxe Commerce remain hidden.
This is a bounded amendment within Phase 3C, not a phase or launch gate closure.
Existing template components, images and geometry remain the rendering source;
pages without a supplied template-specific implementation use shared commerce
surfaces. Full all-page visual parity remains unverified. LYD and supported
payment methods replace fictional demo money/payment claims in real stores.

The five focused disposable PostgreSQL integration cases passed. Separate
database-disconnected Chrome checks covered all four creation canvases, phone
fit at 1440×900 and 1160×768, inline autosave, product editing and navigation.
These checks are not authenticated browser checkout or merchant acceptance.

## 2026-09-05 owner amendment: all four Studio templates

The owner subsequently approved applying the same flow to Standard, Drops and
Luxe Commerce — Full Source. All four visible choices use the same private draft,
trial transport, confirmation and Store-scoped commerce authorities. Each choice
has its own code-owned starter catalog and document: Glow Beauty (6 products),
Standard (9), Drops (8), and Luxe Commerce — Full Source (10). Creation request
keys are template-bound; changing a choice must not resume a different template.
Copies become independent products/variants/stock/categories; template fixtures
are never used to mask a missing live catalog. Existing stores are not reseeded.

Drops is the seventh code-owned document registry key and fourth visible Studio
choice; historical Home & Living, Modern Market and Luxe Commerce remain hidden.
This is a bounded amendment within Phase 3C, not a phase or launch gate closure.
Existing template components, images and geometry remain the rendering source;
pages without a supplied template-specific implementation use shared commerce
surfaces. Full all-page visual parity remains unverified. LYD and supported
payment methods replace fictional demo money/payment claims in real stores.

The five focused disposable PostgreSQL integration cases passed. Separate
database-disconnected Chrome checks covered all four creation canvases, phone
fit at 1440×900 and 1160×768, inline autosave, product editing and navigation.
These checks are not authenticated browser checkout or merchant acceptance.

- A private, Super Admin-only creation draft is persisted before identity
  provisioning. It owns pending owner/contact/brand data, versioned presentation
  and catalog choices. It is not another active Store or a public resolver input.
- Confirmation runs the existing idempotent canonical provisioning and commerce
  authorities, copies the selected catalog once, and records the resulting
  StoreProfile reference. Retrying resumes checkpoints; it never provisions a
  second Store. Credentials remain transient and are never saved in the draft.
- A confirmed Store remains unpublished until an explicit publication. Saved
  presentation is not replaced by template defaults during confirmation.
- Each Store receives independent Products, variants, stock and categories using
  the template's existing images. Template fixtures are an installation source,
  never a live catalog fallback. Existing merchant catalogs are not overwritten.
- Trial carts/orders belong only to a private creation draft. Their server-derived
  totals and immutable submission snapshots are persisted separately from Medusa
  customer Orders. They cannot send notifications, charge payments, alter live
  inventory or become merchant revenue at confirmation.
- Glow Beauty retains its original English geometry, typography and components.
  Only content/data bindings change. Trial and live interactions share the same
  UI and DTO contracts; the transport is explicitly different and fail-closed.
- The proposed private guest status link is a bounded amendment to the earlier
  no-public-lookup rule: possession of an unguessable, hashed, Store-bound grant
  may disclose only reduced merchant-updated progress. It must not become public
  order-number search, customer accounts, saved-address history, or courier APIs.
- COD/manual bank transfer and LYD remain the supported live checkout scope.
  Cards, coupons, automated tax, customer accounts and courier booking remain out
  of scope. Demo ratings, addresses and paid claims cannot be real runtime facts.

Verification must use an owned disposable PostgreSQL process. No automated
acceptance may attach to Supabase, Neon, or an already-running database port.
