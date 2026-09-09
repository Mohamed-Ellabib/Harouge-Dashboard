# LabibTech Commerce SaaS Handoff

## 2026-09-08 remembered platform sign-in

Owner-approved admin session persistence adds a 30-day opt-in (default checked)
device cookie backed by `platform_device_session`. The opaque random credential
is HttpOnly, SameSite=Lax and Secure in staging/production. PostgreSQL stores only
its SHA-256 hash and an HMAC fingerprint of the current Medusa login credential.
No password or Admin bearer token is saved in browser storage. Session restoration
rechecks current Super Admin access and the credential; restored dashboard access
also checks expiry/revocation. Both logout routes revoke remembered access.

The frontend restores lost in-memory sessions once for concurrent 401 responses,
then retries those rejected requests once. Temporary network/server failures do
not sign the user out or replay mutations; initial verification offers Retry.
The sign-in page resumes valid sessions automatically. Unticked logins use a
browser-session cookie. Existing logins need one fresh sign-in to opt in.

The focused HTTP integration passed on owned disposable PostgreSQL, covering
cookie attributes, restoration without the old server-session cookie, ordinary
user/origin rejection, logout/replay, unchecked login, expiry, disabled account
and password-change rejection. Five Super Admin units and 14 frontend auth/recovery
checks passed. Backend typecheck passed. Browser QA observed the actual outage
screen and Retry without a login redirect; positive user-credential browser
reopening/restart acceptance remains separate. Migration `20260908230000` was
applied through the pinned guarded Supabase development runner; schema hardening
completed and the guarded backend is running on port 9000. Platform typecheck and
build passed. Browser QA also checked the default-enabled checkbox, toggle in
both directions, sign-in layout and clean console after recovery. No production,
Neon, public traffic, merchant-auth or commerce boundary changed.

## 2026-09-08 Studio preview / new-draft parity

The owner requires a template shown in Studio to match its fresh editable draft.
The authenticated template catalogue now includes `creation_previews`, produced
by the same validated `initialCreationValues` factory as draft creation. The
library and expanded preview use those values through the shared editor profile
and draft-catalog adapters. Selected EN/AR locale is passed into creation, and
the library uses the editor's 430 × 932 screen. The expanded action no longer
opens the unrelated DEV visual-demo route. Read-only demo mode remains separate;
no existing draft, Store presentation or installed catalog is overwritten.

After reauthentication, browser verification loaded the preset-backed URBX
library preview and opened its expanded Arabic view with matching catalog and
copy. The expanded-route allowlist now derives from the template registry,
including Drops, URBX and Template 6. No interactive draft or Store was created.

Platform/backend types and platform build passed. Eleven focused frontend tests
passed, plus the six-case creation integration suite on an owned disposable
PostgreSQL process. The authenticated integration checks compare catalogue
preview values against fresh persisted drafts for every visible template and
verify Arabic initialization, with existing isolation/replay/confirmation checks
retained. The disposable process exited. No Supabase automated test, migration,
production, public traffic, Store creation or publication was performed.

## 2026-09-08 Template 5 appearance settings

Owner-approved URBX settings add independent navbar background/inactive/active
colors, body/heading/muted/button text, panel color, and separate body/display
font selections. Existing accent/page background controls remain. Eight bounded
font keys use bundled or system fonts; arbitrary CSS and external font URLs are
rejected. Optional appearance JSON follows the versioned storefront document
through creation/save/confirmation/publication and the strict editor/public
profile mapper. No migration or product/commerce change is required.

The existing URBX page styles use shared variables with original fallbacks.
Settings include native color pickers, immediate valid hex entry and reset.
17 focused frontend tests and four owned-disposable backend integration cases
passed, including saved appearance through interrupted confirmation and retry.
Application typechecks and both frontend builds passed. Isolated browser QA
covered navbar/text/font changes, Home-to-Categories persistence, and reset;
the temporary component harness was removed. User Store edits were not saved or
published during browser QA. The harness's HMR-only duplicate-root warning did
not appear in the application implementation.

## 2026-09-08 creation confirmation recovery

An interactive URBX/Beauty creation stopped at presentation after owner/store,
commerce and six products were checkpointed. The guarded read-only development
probe confirmed missing Template 5/6 constraint migrations. The existing
`Migration20260905230000` and `Migration20260906180000` were applied through
`run-with-supabase-development.mjs migrate-core`; every other module was current.
The subsequent guarded probe reports both templates ready. This supersedes older
notes that these two registry migrations were still pending in development.

Confirmation now checks template schema support before provisioning, returns
safe stage-specific errors, and exposes only boolean saved-step progress. The
recovery dialog hides the temporary password once owner/store provisioning is
saved and labels the remaining action Resume store setup. No existing products
or credentials are replaced. The probe now includes read-only template support.
All four category integration cases passed on an owned disposable PostgreSQL,
including missing-template refusal before account creation and an interrupted
URBX/Beauty presentation retry without credentials or duplicate resources.
Backend/platform typechecks and the platform build passed. No production,
public traffic, Neon, publication or phase-gate authorization is implied.

After reauthentication, the original interactive draft resumed successfully
(confirmation HTTP 200) and displayed Store created / not published. It used
the retained owner, Store and six Beauty products; only presentation remained.

## 2026-09-08 owner amendment: category-based store creation

Add New Store now composes a chosen category catalog with any visible template,
then saves and confirms through the existing private draft workflow. Five
collections contain 4–10 products with existing images, variants and managed
stock; copies belong exclusively to the confirmed Store. The wizard preserves
client assignment, locale, contact, branding and optional pending custom domain.
Starter WhatsApp supports the explicit empty-catalog option; stock installation
still requires Professional Commerce. Publication remains separate.

Category/sample selection is pinned in optional draft JSON, with old drafts and
existing Stores unchanged. The new 3-case category integration suite, existing
6-case creation/trial regression, both application typechecks, and 6 focused
frontend tests pass. The category suite includes all 30 category/template
schema-and-asset combinations and real confirmation/isolation/replay checks.
Automated backend checks owned disposable loopback PostgreSQL. A damaged stopped
temporary cluster was preserved and rebuilt for these tests. No automated test
used Supabase, and no migration, public traffic or production action was added.
See `adr-store-creation-drafts.md` for the approved contract and evidence limits.

Last reconciled: 2026-09-07 (Template 6 order details; earlier gates unchanged)

## 2026-09-07 owner amendment: Template 6 order details

`/order-details` and `/order-details/:displayNumber` now render the supplied
pale-aqua receipt design with the single shared fixed dock. Confirmation and
profile Track Order actions, plus saved-order links, open this page. Public order
numbers only select already-authorized receipts; existing private tracking grants
remain the lookup authority. Merchant status, purchased variants and actual totals
win over presentation fixtures. Guest address reduction is unchanged.

The Arafat/UAE/AED/ZARA/address/paid Visa reference remains standalone DEV-only.
The invoice action explains that its downloadable text is an order summary, not
a tax invoice or proof of payment; official invoices require the store. Contact
and cancellation actions are user-controlled requests, never automatic messages
or order mutations. No new payment, courier, account or cancellation service.

Per owner request, checks were limited to storefront TypeScript, a brief mobile
comparison, bottom-dock clearance and opening the invoice panel. No backend or
database tests, download acceptance, order submission, migration or deployment.

## 2026-09-07 owner amendment: Template 6 favorites

`/favorites` now uses the supplied pale-aqua two-column reference, existing
photographs and shared fixed dock. Search, categories, price filtering, sorting,
individual removal and batch selection use the shared Store/browser favorites.
Saved cards resolve against the complete current catalog; no customer list is
seeded or refilled. Reference AED/location/ratings/badges stay standalone DEV-only.
The reference dock highlights Profile here; live published navigation is unchanged.
Per owner request, verification was limited to TypeScript, one mobile comparison
and a search check. No backend tests, database, order, migration or deployment.

## 2026-09-06 owner amendment: Template 6 profile

The supplied My Profile design now renders at `/account`, using the existing
portrait/background, shared fixed dock, browser/Store favorites, and authorized
order receipts. Standalone DEV preview alone shows Arafat, three sample orders,
the sample address and Visa label. Preview profile edits stay page-local. Live,
editor and trial surfaces do not invent customer identity, saved cards or accounts.
Unconnected account/preferences features explain their availability; no login,
payment, address-persistence or logout authority was added. Shared order pages
also defer to the single Template 6 dock.

Per owner request, verification was limited to a passing storefront TypeScript
check, one 432px visual check and opening the profile-edit panel. No broad tests,
database operations, order submission, production or deployment occurred.

## 2026-09-06 owner amendment: Template 6 checkout and shared navigation

The sixth Design2 reference now renders at `/checkout` using shared CartContext
address, shipping, completion and ambiguous-result recovery. Actual cart lines,
quantities, sizes, seller identity and totals remain authoritative. The screenshot's
Arafat/UAE/AED/ZARA/Visa presentation is isolated to standalone DEV; editor,
creation-trial and real stores retain supported Libya/LYD/COD/manual bank transfer.
Sample Visa never submits or silently converts to COD; it opens an explanation
and requires explicit COD selection. No card details are collected. Delivery
instructions are included in the existing bounded address field.

Template 6 has one fixed, safe-area-aware bottom dock in App, replacing separate
Home/Explore/Cart docks and covering all routes. Product Make an offer is replaced
by Add to cart plus minus/plus quantity controls; Buy it now uses the same amount
then opens checkout. Shared addItem defaults to one for unchanged templates.

62 focused frontend tests and TypeScript passed. The broader storefront run had
121 passes and two unrelated failures: stale six-template registry expectation
and GlowBeautyCatalogPage SSR access to window. Browser checks cover quantities,
navigation, address/instructions, sample-card blocking and COD selection, plus
320/415/431/1440 viewport checks. The shared local preview confirmation adapter
was unit-tested with fetch forbidden; no browser order or database command ran.
Visual evidence and intentional deviations are recorded in `design-qa.md`.
No registry migration activation, DB acceptance, production, Neon or Vendor change.

## 2026-09-06 owner amendment: Template 6 Explore

The fifth Design2 screenshot now renders at `/categories`. The Template 6
compass navigation opens this screen, preserving its six photographic tiles,
search pill, tabs, Fresh Finds banner and dock. Full-catalog search, category
membership, Brands and Stores tabs use existing Store data. Categories open
matching products on the existing discovery home; Fresh Finds selects New
Arrived. Location discovery remains explicitly unconnected, not geolocation.

New draft presets and standalone preview now have Men, Women, Shoes, Bags,
Accessories and Streetwear; the same four products/prices/gallery remain, with
matching category membership. Empty categories stay empty. Older saved drafts
are not reseeded or migrated. Home creator images and category banner images
remain separate. Optional bounded `brands.promotion_heading`,
`promotion_subheading`, and `promotion_image_url` round-trip through the
canonical document/preview/editor, independently of home/welcome. The confirmed
Store editor save normalizer now preserves optional category copy and banner.

Seven individual generated photos (banner v2 selected), source prompts and
provenance are documented under `public/assets/template-6/EXPLORE-ASSETS.md`.
Storefront/platform/backend type checks passed; 24 focused storefront tests and
6 platform tests passed. Browser checks cover search, matching product links,
tabs, category filter, empty state, new arrivals, location notice and 320px
layout. Root `design-qa.md` holds normalized full/focused comparison evidence.
No DB, migration, order submission, backend acceptance or deployment performed.
This is within the owner-approved template presentation/editor slice; registry
migration and authenticated database confirmation acceptance remain pending.

## 2026-09-06 owner amendment: Template 6 cart

The fourth Design2 screen now renders at `/cart`, preserving the pale-aqua
canvas, seller row, two large photographic item cards, price/quantity pills,
summary, lime checkout action and published-navigation dock. Shared CartContext
still owns all cart mutations and totals. Save uses shared FavoritesContext;
there is no new wishlist, coupon, shipping, account or payment authority.
Change and Proceed to Checkout open the existing address/checkout screen, never
submit an order. Promo entry gives honest unsupported feedback and no discount.

Standalone DEV reference mode alone uses ZARA, Dubai, AED, Black fallback and
two generated alternate campaign crops. Its unselected delivery is a read-only
AED20 visual estimate; it does not select shipping or change the canonical LYD
checkout. Real/editor/trial carts keep saved thumbnails/variant labels, Store
identity and authoritative totals, with unselected delivery shown at checkout.
Never auto-seed, refill, or overwrite a customer cart. Preview QA populated the
two products through normal UI actions; an intentionally emptied cart stays empty.

Twelve focused frontend tests and storefront TypeScript passed. Browser checks
covered quantity totals, save/unsave, removal/empty state, promo feedback and
delivery navigation; 435/320px layouts were checked with no captured console
warnings/errors. A narrow-screen photo overflow was fixed and re-captured.
No database, order submission, migration, backend test, deployment or phase gate
change. Template registration migration and saved-store acceptance remain pending.
See root `design-qa.md` and the Template 6 asset README for visual evidence/prompts.

## 2026-09-06 owner amendment: Template 6 product details

The third Design2 reference now renders at `/products/:handle`, with the supplied
Premium Hoodie example at `/products/premium-hoodie?preview=1&template=template-6`.
Preserve its cyan photo gallery, glass controls, white information panel, seller
card, size pills and bottom offer/purchase actions. Three generated gallery photos
are independent of the original home thumbnail; new creation drafts seed them,
while existing saved galleries remain authoritative and are never reseeded.
Template 6 creation editing now exposes the existing independent gallery controls.

Shared product/purchase APIs and CartContext remain authoritative. Available large
is the initial choice when offered; unavailable variants fail closed. BUY IT NOW
adds the selected variant once and opens shared checkout only after success; it
does not submit an Order. Offer requests are local drafts to copy/contact the
configured Store, never accepted discounts or messages sent by the platform.
Gallery dots/swipe/zoom, description expansion, size guidance and contact dialogs
are functional. Reference ZARA branding, Dubai, AED and reviews remain standalone
DEV-only. Real stores retain their own name/logo, LYD and no fabricated reviews.

Eight focused frontend tests and all three affected package typechecks passed.
Browser checks covered gallery views/zoom, XL-to-checkout, offer preparation,
description expansion, size guidance and 443/320px layouts with no captured console
warnings/errors. No order submission, DB operation, migration, backend automated
test, full build or deployment ran. Registry migration and authenticated saved-store
acceptance remain pending. See `design-qa.md` and the Template 6 asset README.

## 2026-09-06 owner amendment: Template 6 discovery home

The second Design2 reference adds the generated-photo discovery home at `/` and
`/store`; the prior welcome remains at `/welcome`, and GET STARTED now opens home.
Preserve the pale-cyan canvas, creator-style horizontal rail, rounded search and
filters, two-column staggered product cards, floating-price pills and rounded dock.
Home uses independent strict `content.home` fields and the existing inline editor;
older welcome drafts initialize home defaults only when edited.

New creation drafts include four independent Template 6 products with four sizes
each and three categories. Previously saved empty welcome drafts stay valid and
are not reseeded. Live/editor catalog, prices, category names and navigation remain
Store-backed; the complete shared catalog loader powers search/filtering. Reference
AED labels, Arafat, influencer names, badges, ratings and location text are standalone
DEV-only. Saved stores use a neutral greeting and canonical collections/LYD. Preview
favorites are isolated in memory, while customer favorites keep their shared storage.
AI, location search, seller verification and stories are explicitly not connected;
their utility dialogs never claim real services or request new permissions.

Generated originals are retained; runtime WebP images total about 490 KB. Focused
home/filter/welcome/inline-compatibility tests passed (5), and storefront, platform
and backend typechecks passed. No database, backend acceptance, full build, migration,
order submission or production operation occurred. Template 6's registry migration
and authenticated draft/confirmation acceptance remain pending. Browser/design
evidence is in `artifacts/template-6` and root `design-qa.md`.

## 2026-09-06 owner amendment: Template 6 first welcome page

The owner supplied `Desktop/design2/c5e4e439-6b63-482c-9bc8-7d1cf9704368.png`.
Added append-only Studio Template 6 / registry key `template-6` (ninth key), without
renaming previous templates or Stores. `/`, `/welcome` and `/store` render the
turquoise fashion welcome. Generated reference-edited photo/annotations are separate
from real inline-editable headline, subtitle and CTA. The shared strict editor bridge,
Store identity/accent and canonical hero document are reused. GET STARTED navigates
to the shared `/products` route with preview/editor context preserved. Only this first
screen is designed; pagination marks are decorative pending further supplied screens.

No invented catalog is installed: this welcome-only preset has zero categories/products.
The creation contract permits that for Template 6 only; other starter identity/minimum
rules remain unchanged. Empty installation returns after Store ownership verification.
The existing owner/draft/confirmation pipeline is registered in source. The new additive
`Migration20260906180000` is **not applied**, and DB creation/confirmation acceptance
is **not verified**. URBX's earlier migration and snapshot reconciliation remain pending.
No database, backend automated test, account, order, production, or Neon action occurred.
The screenshot's UAE/GCC marketplace copy is presentation only; no geographic/currency,
multi-seller or phase boundary expansion is authorized.

Evidence: storefront/platform types passed; backend `tsconfig.typecheck.json` passed
(an initial default-tsconfig invocation hit existing admin import-attribute settings).
Two focused welcome tests and one Studio test passed. Browser source/render comparisons
at 432 × 912, native scrolling/button reachability at 320 × 640, CTA navigation to the
empty shared catalog, and zero captured warning/error logs passed. No full build run.
Capture: `artifacts/template-6/welcome-432.jpg`; same image is the Studio thumbnail.
Generated asset prompt/license: `apps/storefront/public/assets/template-6/README.md`.
See the latest section of `design-qa.md` for font/art approximation notes.

## 2026-09-06 owner amendment: URBX (Template 5)

Wishlist update: `/favorites` now renders the supplied two-column saved-products
design using the existing URBX assets. Favorites remain per-browser/per-Store;
no customer-account or database wishlist was added. Follow-up: the URBX editor
now initializes an isolated, in-memory four-product selection from its validated
draft catalog so a fresh phone preview is not empty. This selection is shared
across editor pages, never reads/writes customer wishlist storage, follows catalog
edits/removals, and does not refill deliberately removed selections. Customer
mode is unchanged. Three focused tests and TypeScript passed; the actual empty
editor was reproduced, but post-fix browser verification was blocked when browser
control disconnected. Refresh/reopen visual acceptance remains unverified.
Each card loads current
Store product/purchase options, selects an available variant, and removes the
saved item only after shared CartContext confirms an add. Missing products,
failed loads, sold-out choices and unavailable checkout fail closed. Product
images/names/prices retain explicit canonical editor targets. Standalone DEV
reference ordering/dollars never override real Store currency or favorites.
Four focused helper tests and storefront TypeScript passed; browser checks
covered selected XXL transfer, removal, restored four-card state, narrow widths
and reachable footer. No full build, backend test, DB access or order submission.
Saved-store/trial acceptance remains unverified; phase gates are unchanged.

Order details update: `/order-details` and `/order-details/:displayNumber` now
render the supplied status/timeline/items/address/payment/summary design.
Confirmation View Order, support's saved-order links and the shared order list
open this page. The display number selects only already-authorized Store orders;
private grants remain out of URLs. Merchant progress takes precedence over the
initial confirmation. Loading, not-found, retry, copy and order-options states
are present. Support retains the selected public order number. Cancel order
opens a request dialog and does not mutate order status. No cancellation,
courier, messaging or payment authority was added. Live guest receipts retain
their existing PII reduction: the address card explains privacy; Alex/address,
dollars and the delivery promise exist only in the isolated DEV design fixture.
Four focused helper tests, storefront TypeScript and mobile visual/copy/dialog/
navigation checks passed; no backend test, database, migration, order submission
or full build. Real saved-store/trial acceptance remains unverified.

Support update: `/contact` now renders the supplied URBX Help & Support page.
It reuses the existing wordmark, product photography and brush asset, with
searchable FAQ disclosures, a saved-order panel and public-contact dialogs.
Real/editor/trial modes read the shared Store-bound order grants/trial transport;
the standalone DEV reference is read-only and never creates an order. Contact
actions draft messages only to the Store's configured WhatsApp/email/phone;
unconfigured channels show an honest unavailable state. No support service,
message sending, returns or cancellation authority was introduced. Contact
heading/body use explicit canonical inline-editor keys; all other template
navigation remains published-configuration-driven. Three focused helper tests,
storefront TypeScript and source-paired mobile/search/FAQ/dialog checks passed.
No full build, backend suite, DB/migration, external message or order submission
ran. Authenticated saved-store/contact/editor acceptance remains unverified.

Confirmation update: `/order-confirmation` now uses the supplied black/lime
package-art design with the shared reduced confirmation. Optional purchased
variant titles are allowlisted by the canonical receipt serializer and frontend
mapper and copied by isolated trial/DEV transports; older receipts remain valid.
View Order opens a native receipt dialog and, when available, fetches current
progress through the existing Store-bound tracking grant. No new order authority
or public lookup was added. The read-only standalone DEV fixture shows the exact
two-item reference without submitting an order or modifying the cart. Real,
editor and trial receipts never fall back to that fixture or fabricate email
delivery/arrival promises. Bank instructions remain successful-confirmation-only.
Three focused receipt tests and storefront TypeScript passed. Reference/mobile,
copy and dialog checks passed; a React image-prop warning was found and removed.
No order submission, full build, backend suite, DB operation or migration ran.
Authenticated receipt/merchant-tracking acceptance remains pending. Generated
package prompt/path and visual evidence are in the asset README and design-qa.md.

Checkout update: `/checkout` now implements the supplied URBX delivery summary,
address-edit dialog, payment rows, order items/totals and Place Order CTA. Shared
CartContext remains the only address/shipping/completion/recovery authority.
Current-cart delivery review, supported payment choice and pending/recovery
locks gate submission. No backend schema/commerce authority changed. Real
stores and creation trials require customer-entered addresses and authoritative
Store shipping/payment data; only the standalone DEV design preview initializes
Alex and a free standard-delivery option. Card charging remains unavailable;
configured manual bank transfer remains supported without pre-order bank details.
Three focused frontend approval tests and storefront TypeScript passed. Browser
address editing/saving and reference comparison passed with no console errors.
The browser safety reviewer rejected clicking Place Order without explicit user
approval; no order or payment was submitted, and completion/recovery browser
acceptance remains unverified. No full build, database operation or migration.
The earlier URBX registry migration and authenticated persistence gate remain
pending. The confirmation design was implemented in the follow-up above.

Cart update: `/cart` now uses the supplied large-image horizontal cart design,
with generated catalog photos, selected size/color labels, quantity/removal,
Store-authoritative totals and navigation to shared checkout. Customer cart DTOs
allowlist optional public product handle/variant title; the creation trial emits
those same fields. No live fixture fallback or automatic cart seeding. Only
standalone DEV previews use reference dollars and $0 shipping; unselected real
shipping remains "At checkout". Coupon controls explain that codes are not yet
available and never invent discounts. Fourteen focused frontend units and the
storefront typecheck passed; browser quantity, removal, promo and checkout-link
checks used DEV-only items. No order, database command, migration, full build or
backend acceptance was run. The existing URBX constraint migration remains
unapplied to managed development, so persisted URBX onboarding acceptance is
still pending. Product detail was implemented in the preceding page slice;
other supplied destinations remain separate. See `design-qa.md` for visual evidence.

Categories update: `/categories` now uses the supplied two-wide/two-small panel
design, with four generated category photographs, searchable catalog-derived
counts and links into the existing shop. Strict optional category copy and
`brands.items[].banner_image_url` flow through creation, public profile mapping
and inline editing without changing the small home tiles. Older drafts retain
custom imagery; known starter tiles receive the separate banner fallback.
Seven focused storefront units and the three affected package typechecks passed.
Reference/mobile comparison and search-to-product interaction are recorded in
`design-qa.md`. No build, database command, migration or backend acceptance was
run. Interactive URBX constraint-migration acceptance remains pending below.

Shop update: `/products` now implements the supplied two-column Shop the Drop
reference, with shared catalog pagination, local category/search/price filtering,
sorting, browser wishlist and variant-aware CartContext quick-add. Strict optional
`content.shop` heading/statement/search copy persists independently of home and
welcome through the existing draft/editor bridge. Three focused units and the
three affected package typechecks passed; scoped browser interactions and
864/390/320px checks are recorded in `design-qa.md`. No build, migration, database
or backend acceptance was run. This does not change the pending interactive URBX
migration or any phase/launch gate. Other URBX destination designs remain pending.

The owner supplied twelve URBX references and requested implementation one page
at a time. URBX is now registry key eight and Studio choice five. This is bounded
Phase 3C development, not production approval. Welcome (`/welcome`) and home
(`/` and `/store`), shop (`/products`) and categories (`/categories`) have original-design renderers. Other URBX designs are pending;
their destinations currently use shared storefront pages.

Home uses generated hero/category/promotion art and three catalog-backed product
cards. Strict optional `content.home` fields persist separately from welcome
`content.hero`; older drafts initialize home defaults on their first home edit.
The URBX preset installs four products, five sizes each, and four category records.
Quick-add loads shared purchase options and uses CartContext. No live fixture
fallback; dollars are standalone DEV-reference labels only, while real stores
and creation trials retain LYD and existing payment authorities.

`Migration20260905230000` adds URBX to the document-revision constraint. The earlier
focused disposable creation case passed, but this migration has NOT been applied
to interactive Supabase here. Do not claim interactive store-confirmation
acceptance until the guarded development migration is applied and checked.

Home evidence is in `artifacts/urbx/home-774x2035.png` and root `design-qa.md`.
Two focused home/preview-boundary checks and storefront/platform/backend package
typechecks passed. No full build or automated backend suite was run for home.

This is the canonical orientation document for a new laptop, developer, or Codex session. Read it before changing the repository. Detailed decisions live in the other files in this directory.

## 2026-09-05 follow-up: shared creation for all four templates

The owner approved extending the creation workflow to Standard, Drops and Luxe
Commerce — Full Source, alongside Glow Beauty. This supersedes the Glow-only
scope of the original slice below; see `adr-store-creation-drafts.md`.

- All four Studio choices create resumable private DB drafts using the same
  centered, fitted phone editor, inline edits, name/colors and owner setup.
- Their independent starter catalogs contain 6 Glow, 9 Standard, 8 Drops and
  10 Luxe Full products respectively, using the original assets. Template-bound
  request keys and canonical checkpointed confirmation prevent cross-template
  draft reuse or duplicate Stores. Existing stores are not reseeded.
- Original Standard/Drops/Luxe components now consume shared Store-scoped
  catalog/cart/favorites and editor data. No fake live tracking advancement,
  reviews, paid-card claims or addresses. Real checkout uses LYD and supported
  payment methods. Missing template-specific pages use shared commerce surfaces.
- Drops is the seventh code-owned template registry key and fourth visible
  Studio choice. The three historical templates stay hidden and compatible.
- Focused owned-disposable PostgreSQL integration: 5/5 cases passed, including
  the three additional catalogs, draft recovery, confirmation/replay, image
  existence, isolated trial checkout, real COD and private merchant-updated
  tracking. Backend, platform and storefront TypeScript checks passed. No full
  build or broad regression suite was run.
- Database-disconnected Chrome checks passed for all four actual creation
  renderers at 1440×900 and 1160×768: full phone fit, inline text autosave,
  product edit dialog and internal product navigation, without app console
  errors or a framework overlay. Backend/external requests were blocked or
  intercepted. These are not authenticated real-backend browser acceptance.
- Interactive development migration `Migration20260905140000` and hardening
  completed through the pinned guarded Supabase runner. Backend restart uses
  port 9001; platform/storefront use 5174/5176. A stale runner lock was removed
  only after its two recorded PIDs were absent; no Store data was removed.

Remaining: full all-page visual parity, authenticated browser/keyboard checkout
and merchant acceptance, larger-catalog pagination (new catalog surfaces fetch
up to 24), and migration-snapshot reconciliation are not closed. Wishlists stay
per-browser, not customer-account DB sync. Preserve the dirty migration snapshot;
reconcile the prior four handwritten creation/tracking models and Drops enum in
an owned disposable database before generating another migration. No launch,
production/public-traffic, courier, card, WhatsApp or Vendor-removal gate changed.

## 2026-09-05 original slice: resumable Glow Beauty store creation

The owner authorized turning the existing Glow Beauty design into a persisted
creation flow. Follow `adr-store-creation-drafts.md`; this is a bounded Phase 3C
implementation slice, not a new launch or production approval.

- Templates Studio creates a private database draft immediately. Autosave uses
  revision checks, including unfinished owner fields, and saved drafts can resume.
  The centered, fit-to-screen phone retains the existing Glow components/images;
  click-to-edit text, images, navigation labels and starter products, plus name,
  colors and owner/setup controls, feed the saved document/catalog.
- Confirmation reuses canonical provisioning and commerce setup with serialized,
  resumable checkpoints. The six starter Products, variants, stock and categories
  become independent Store-owned records. Saved presentation is retained, and
  confirmation does not publish the Store. Transient owner passwords are never
  stored in drafts. Interrupted new-owner setup may need the same original
  temporary password before its provisioning checkpoint has completed.
- Private trial carts/orders persist separately from live Medusa Orders. Trial
  totals come from the saved draft, submitted snapshots are immutable, and trial
  purchases cannot charge, consume inventory, notify customers or become revenue.
- Real COD checkout returns an opaque, Store-bound tracking capability; only its
  hash is stored. Owning merchants can advance confirmed → processing → shipped
  → delivered with revision checks. The original Glow Orders surface displays
  persisted progress, not simulated courier movement. Browser storage remembers
  guest tracking capabilities, not customer accounts.
- Confirmed Store editing uses the canonical catalog with the original Glow
  renderer, rather than switching back to a fixture storefront. Publication is
  still an explicit review action. Merchant product editing remains the place to
  manage live catalog records after creation.

Focused evidence on an owned disposable loopback PostgreSQL process: the two
`store-creation-drafts.spec.ts` cases passed (65 seconds), covering private draft
auth/idempotency/CAS, unfinished-field recovery, isolated trials and immutable
submitted totals, one-store confirmation with exact saved document and catalog,
real COD completion, cross-Store tracking denial and merchant status revisions.
Backend, platform, storefront and merchant TypeScript checks passed. No full
build or broad regression suite was run for this slice.

Separate database-disconnected Chrome/Playwright fixture evidence at 1440×900
and 1160×768: the 430×932 phone fits fully, inline hero editing saves and rerenders,
and category navigation filters products without document reload. No framework
overlay or app console errors; all backend requests were intercepted or blocked.
This is not real-backend browser or physical-keyboard acceptance.

Interactive development only: migrations `Migration20260905120000` and
`Migration20260905130000` were applied through the pinned guarded Supabase runner,
then schema hardening succeeded. Development backend restarted on port 9001;
platform/storefront remain 5174/5176. No Supabase acceptance tests, Neon access,
production deployment or public traffic occurred. A stale runner lock was removed
only after both recorded process IDs were verified absent; no Store data removed.

Remaining boundaries: wishlists are still per-browser storage, not DB-synchronized
customer accounts; guest tracking is limited to retained browser capabilities;
live monetary values are LYD, and fabricated demo reviews, paid-card claims,
addresses and arrival promises are not emitted as real facts. The initial slice
was Glow-only; the follow-up above extends it to all four. Full all-page visual parity and authenticated browser
checkout/merchant-operation acceptance remain open. The hand-written migrations
add four models; preserve the existing dirty migration snapshot and reconcile it
using an owned disposable database before the next generated migration. These
items do not close Phase 3C, payment verification, courier, WhatsApp or launch gates.

## Repository snapshot

- Branch: `feat/saas-multi-store-pivot`
- Accepted Phase 2C implementation commit: `8b02475aba2ae89637f7b51057c5da7de2dfbf06`
- Later handoff documentation commit: `4a7497f`
- Phase 2C gate-closure, legacy-freeze, platform-dashboard, Phase 3A storefront, and Phase 3B pilot work: committed on 2026-07-29 as `8d58549` (backend), `0cc8903` (platform dashboard), `a369c34` (storefront), and `d043ce7` (docs/manifests)
- Working tree: extensively dirty with owner-authorized Phase 3C, Admin, merchant-dashboard, Storefront, infrastructure, and documentation work; inspect ownership and `git status` before every edit
- Configured Git remotes: `origin` at `https://github.com/Ellabib-tech/EcommernceSaas.git`; `feat/saas-multi-store-pivot` and `master` pushed on 2026-07-29
- Runtime contract: Node.js 20 through 23, npm workspaces/Turbo, Medusa 2.17, PostgreSQL
- Phase 3A browse-only storefront: implemented; guarded real-backend Store A/Store B browser matrix and manual keyboard acceptance recorded, with the guarded-local exit gate closed on 2026-07-22
- Owner-approved Phase 3B guarded-local commerce pilot: implemented; guarded API/browser/restart/cleanup evidence passed on 2026-07-22, and the owner performed the distinct physical-keyboard Cart-to-confirmation journey on 2026-07-29, closing the guarded-local exit gate
- Owner-approved Phase 3C: incremental working-tree implementation is in progress. The bounded Storefront-document publishing and COD/manual-bank-transfer checkout slices have focused automated evidence as of 2026-08-14, but this does not close the Phase 3C gate or authorize production/public traffic
- Production storefront: not deployed and not production-ready

Do not invent a gate-closure commit. Do not clean, reset, overwrite, or commit the working tree without inspecting ownership/scope and receiving any needed owner approval.

## Accepted phase commits

| Commit    | Phase     | Outcome                                              |
| --------- | --------- | ---------------------------------------------------- |
| `3f5f088` | Baseline  | clean pre-hardening baseline                         |
| `3bc7f49` | Phase 0.5 | guarded test foundation and four security fixes      |
| `f6b1b95` | Phase 1   | authoritative request Store contexts and isolation   |
| `939b6a6` | Phase 2A  | permanent Tenant/Store model and Product ownership   |
| `a769519` | Phase 2B  | immutable Cart and whole-Order Store ownership       |
| `8b02475` | Phase 2C  | idempotent platform-only Store identity provisioning |

The commerce-readiness gate closure described below is not in `8b02475`; it is uncommitted working-tree work. The owner-authorized Phase 3A Customer Storefront Foundation is also implemented only in this working tree. Its automated, visual-preview, guarded real-backend browser, and manual keyboard evidence is recorded below. Its guarded-local exit gate closed on 2026-07-22; no production or external acceptance is claimed.

## Product definition

This is a multi-store commerce SaaS, not a marketplace checkout and not one merchant's store dashboard. A client may own one or more independently branded Stores/storefronts/domains while sharing the platform backend and infrastructure. Platform administrators provision and operate Stores. Merchant owners sign into a restricted dashboard and manage only their Store. Platform administrators retain cross-platform control.

One Tenant may own multiple StoreProfiles. Medusa Store is the permanent commerce boundary. Sales Channel scopes availability but is not ownership.

## Repository layout

- `apps/backend`: Medusa backend, bundled Medusa Admin extensions, modules, APIs, workflows, migrations, scripts, and tests.
- `apps/vendor-dashboard`: separate Arabic-first merchant React/Vite dashboard on port 5175.
- `apps/platform-dashboard`: uncommitted owner/platform React/Vite dashboard on port 5174, including the branded sign-in and canonical client/first-Store provisioning UI.
- `apps/storefront`: uncommitted bilingual customer storefront on port 5176, with the Phase 3A browse routes, guarded-local Phase 3B guest Cart/checkout/confirmation routes, and the bounded Phase 3C published-template/content renderer.
- `docs/saas-pivot`: ADRs, ownership rules, risks, runbooks, and phase evidence.
- `scripts/run-workspace-tests.js`: root test orchestrator and expected-test guard.

The platform Admin/backend is served at `http://localhost:9000/app`. The owner dashboard proxies authenticated platform calls to the backend during development. Its operational destinations do not mean billing, DNS, deployment, monitoring, or all enterprise functions are implemented.

## Canonical ownership

- Tenant groups one or more StoreProfiles.
- StoreProfile contains SaaS state, plan, handle, brand/domain relations, and a temporary legacy Vendor reference.
- StoreProfile links one-to-one to one Medusa Store.
- MerchantMembership authorizes one merchant account for one StoreProfile.
- StoreDomain is the permanent normalized hostname boundary.
- StoreBrand is allowlisted for public output.
- StorefrontDocument owns the Store's draft and published pointers; StorefrontDocumentRevision rows are immutable Store-scoped bilingual presentation revisions.
- StoreManualBankTransferConfiguration is protected Store-scoped configuration. It is never part of the public Store profile, capability response, or templates.
- The Store-scoped `store_order_payment` record owns the immutable checkout method and, for bank transfer, the bounded configuration snapshot linked to the completed owning Order. Only the reduced successful bank-transfer confirmation discloses its localized allowlist.
- Product belongs to exactly one Medusa Store and its allowed Sales Channel.
- Cart belongs immutably to exactly one Medusa Store.
- Order belongs immutably to exactly one Medusa Store.
- Publishable key maps to exactly the Store Sales Channel and must agree with the request hostname.
- Legacy Vendor/VendorMember remain compatibility/authentication storage and cannot override permanent ownership.

Important links are StoreProfile-Store, Store-Product, Store-Cart, and Store-Order. Database uniqueness prevents a Cart or Order from having multiple owners.

## Request contexts

MerchantStoreContext resolves signed merchant session -> active membership -> active StoreProfile -> active Tenant -> exactly one Medusa Store -> allowed Sales Channel. Missing, inactive, or ambiguous relationships fail closed.

PublicStoreContext resolves actual hostname -> verified StoreDomain -> active StoreProfile/Tenant/Store and requires the matching single-channel publishable key. Correct hostname with wrong key, or correct key with wrong hostname, returns 404.

CartStoreContext adds immutable Cart ownership, Region, currency, channel, publishable-key context, and status. Access/mutation must preserve the same hostname, key, and Store for the Cart lifetime.

## Important HTTP surfaces

Platform-only:

- `POST /admin/saas/provisioning`
- `GET /admin/saas/provisioning/:id`
- eligible safe `DELETE /admin/saas/provisioning/:id`
- `POST /admin/saas/stores/:store_profile_id/commerce-setup` (working tree)
- `GET /admin/saas/commerce-setup/:id` (working tree)
- `GET /admin/saas/stores/:store_profile_id/commerce-readiness` (working tree)
- `GET /admin/saas/storefront-templates` (working tree)
- `GET /admin/saas/stores/:store_profile_id/storefront` (working tree)
- `PUT /admin/saas/stores/:store_profile_id/storefront/draft` (working tree)
- `POST /admin/saas/stores/:store_profile_id/storefront/publish` (working tree)
- protected Storefront preview under `/admin/saas/stores/:store_profile_id/storefront/preview` (working tree)
- read-only/transitional `/admin/vendors*` compatibility surfaces

Merchant:

- `POST /vendor/auth/login`
- `POST /vendor/auth/logout`
- `POST /vendor/auth/password`
- `GET /vendor/me`
- `GET|POST /vendor/products`
- `GET|PATCH /vendor/products/:id`
- `GET /vendor/orders`
- `GET /vendor/orders/:id`

Public/storefront API:

- `GET /store/vendors/resolve`
- `GET /store/vendors/:handle`
- Medusa `/store/products*`
- Medusa `/store/carts*`
- shipping-option and payment-collection/session routes used by checkout
- `POST /store/saas/carts/:cart_id/complete` for the exact COD/manual-bank-transfer completion contract (working tree)

Public requests must send the real hostname in `Host` and the Store token in `x-publishable-api-key`.

The permanent public Store profile includes either `storefront: null` or one exact published Storefront document. It never returns the draft, revision/audit/hash data, internal identifiers, or protected bank-transfer configuration.

## Store identity provisioning

`provisionSaasStoreWorkflow` establishes Tenant, Medusa Store, StoreProfile, Sales Channel, publishable key/channel link, exact compatible Region/currency, Stock Location, StoreDomain, StoreBrand, legacy Vendor adapter, merchant owner, MerchantMembership, plan, checkpoints, events, and a database lease.

Activation is graph-gated. StoreProfile and legacy Vendor stay draft until invariants and both request contexts resolve. Same key/input replays; changed input conflicts. Plaintext passwords and key tokens are excluded from durable state/status/results.

The platform supplies a temporary owner password, the application stores only its hash, and password change is required. There is no invitation email. Credentials must be delivered out of band. A storefront key is obtained through controlled platform operations; never expose Admin bearer tokens or server secrets.

Allowed plans are `starter_whatsapp` and `professional_commerce`.

## Region decision

Exact compatible Region sharing is accepted. Multiple Stores may reuse one Region only when currency and the complete normalized country set match. Region is shared configuration, never Store ownership. Each Store keeps its own allowed/default Region reference and all Store-specific links.

This resolves the first acceptance gap from 2026-07-14 by policy.

## Commerce-readiness gate-closure working tree

The current working tree separates Store identity from online-checkout capability:

- StoreCommerceReadiness: one StoreProfile readiness row;
- StoreCommerceSetup: durable idempotent setup/checkpoints/result;
- StoreCommerceSetupEvent: append-only sanitized evidence;
- StoreCommerceSetupLease: database Store-level execution exclusion.

Starter is `not_required` and checkout-disabled. Professional begins `pending`, becomes `configuring` during setup, and becomes `ready` only after the setup and live graph validate. Ordinary failure is `failed`. An expired retained lease makes both setup/readiness `requires_attention` and replay is rejected. There is no attention-resolution operation. `disabled`/`cancelled` are reserved states.

Setup accepts only shipping name, optional description, and amount. The server derives Store, Region, countries, currency, location, channel, local providers, Shipping Profile, deterministic Fulfillment Set/Service Zone/Shipping Option, prices, and IDs.

The Store-specific graph requires:

- deterministic Fulfillment Set and exactly one country-only Service Zone;
- exclusive Store Stock Location-to-Fulfillment Set relationship in both directions;
- Store location exclusive to its Sales Channel;
- exactly one deterministic Shipping Option in the zone;
- exact provider/profile/zone/type/rules/currency amount/Region amount;
- pinned Store Shipping Profile and singleton option allowlist;
- enabled `manual_manual` fulfillment and `pp_system_default` payment links for the local gate.

Shared exact Region/default framework profile/providers are not ownership. Set, zone, option, location relationship, allowlist, Product, Cart, and Order remain Store-specific.

Before reservation, setup resolves exactly one completed provisioning record and proves that Tenant, StoreProfile, Medusa Store, plan, Region, location, channel, currency, and countries still match. A versioned server-derived policy including the local provider strategy is stored safely and included with the public shipping input in a canonical SHA-256 digest that is independent of rotating authentication/session secrets. Retry and final completion re-resolve it and fail on drift. No reconfiguration/update workflow exists.

## Checkout enforcement boundary

Public HTTP deep-gates Cart creation/mutation, shipping listing/calculation/addition, payment collection/session operations, and completion. The readiness row is not trusted alone: the referenced setup must be `completed` and the current graph must still match.

Project hooks deep-gate hook-capable create/update Cart, add/update item, add shipping, non-empty promotions, customer transfer, both shipping-list workflows, and completion. The empty-promotion operation used by Medusa during Cart bootstrap intentionally returns early before Store-Cart linking.

Core workflows without a usable installed hook remain trusted internal surfaces. Current examples are line-item deletion, payment-collection creation, payment-session creation, and shipping-price calculation. Public HTTP is guarded, but arbitrary new direct imports are not universally intercepted. Keep them behind guarded routes/wrappers and review all new call sites.

## Legacy Vendor lifecycle freeze

- `POST /admin/vendors` is disabled and points callers to canonical provisioning.
- A Vendor referenced by a permanent StoreProfile cannot be PATCHed or DELETEd through legacy routes.
- Unmapped historical Vendors retain transitional cleanup behavior.
- VendorMember authentication/account controls and product compatibility links remain.
- Vendor removal is not authorized.

The owner platform dashboard reflects canonical client/Store provisioning and read-only legacy lifecycle. It does not create a second Store control plane.

## Phase 3A customer storefront working tree

The owner-authorized Phase 3A foundation adds an Arabic-first, responsive, browse-only customer application at `apps/storefront`. Implemented routes are `/`, `/products`, and `/products/:handle`. They provide Store branding, catalog preview/list, Product detail, search, sort, mobile navigation, and explicit empty/not-found/unavailable states.

The browser uses relative `/store/*` requests and maps unknown network responses into exact profile/catalog/detail DTOs before rendering. Production Store identity remains the actual hostname plus the controlled matching per-deployment publishable key. `x-store-handle` and local visual-preview data are development-only; a production bundle scan found no preview data, development Store selector, or plan strings.

The backend public Product response boundary recursively removes `metadata`, and the existing PublicStoreContext continues to enforce exact Host, key, channel, active permanent Store, and canonical Product ownership. Two-Store HTTP acceptance proves matching Store profiles, only canonical published Products, crossed Host/key failure, cross-Store Product denial, and inactive/unverified failure.

Both plans remain browse-only in Phase 3A. The UI does not receive or infer checkout readiness and renders no Cart, checkout, customer authentication, OTP, WhatsApp, billing, DNS/deployment, or Vendor-removal action.

## Bounded Phase 3C Storefront-document working tree

`adr-storefront-document-publishing.md` authorizes this implementation slice only. With the explicit 2026-08-24, 2026-08-29, and 2026-08-31 owner amendments it fixes six code-owned templates (`luxe-commerce`, `luxe-commerce-full`, `modern-market`, `home-living`, `standard`, and `glow-beauty`), one Store-scoped document, immutable bilingual revisions, an atomic published pointer, and a separate protected manual-bank-transfer configuration. Templates are presentation compositions, not executable merchant code, and cannot fork Store resolution or commerce behavior.

The working tree implements deterministic migration/provisioning records, Store-scoped locking and expected-revision conflicts, strict draft replacement and publish operations, an exact template registry, a protected sanitized draft preview, and public reconstruction of only the published allowlist. Drafts never become public fallback content. Unknown, malformed, unpublished, or crossed Storefront state fails closed.

The platform editor is connected to those protected operations. Its live preview sends the bounded sanitized draft to the real customer Storefront renderer through an exact-origin, channel-bound bridge. That preview remains editor evidence only and is not authenticated real-backend shared-commerce acceptance.

The customer Storefront strictly maps the published profile and renders the six templates through the same routing, Product, favorites, Cart, checkout, and confirmation authorities. It adds localized About, Contact, Delivery & Returns, Privacy, and Terms pages, safe public email/phone/WhatsApp links, RTL/LTR, contrast-safe primary theming, decorative secondary color, and allowlisted Cairo typography. Null, unknown, or malformed published content shows an explicit setup-unavailable state rather than invented or cross-Store defaults.

The customer checkout now offers COD and offers manual bank transfer only when the owning Store has a complete protected configuration. The exact completion route revalidates Store/Cart/readiness ownership, snapshots the method and protected bank configuration before completion, verifies the resulting owning Order, and returns a reduced confirmation. COD contains no bank fields. Bank transfer discloses only the localized allowlisted snapshot after successful Order submission; same-method retry returns that immutable snapshot and a changed method conflicts. No bank field belongs in the public profile, capability response, or template renderer.

On 2026-08-24 the owner explicitly expanded the code-owned registry with a fourth, separately keyed template, `luxe-commerce-full`, copied from `D:\Projects\السنوسي وأبنائه\apps\web`. The existing three template keys remain unchanged. The exact source snapshot and optimized assets are retained under the Storefront package as reference material, while the live adapter continues to use LabibTech's shared Store, catalog, favorites, Cart, checkout, and Order authorities. This amendment does not authorize production deployment, public traffic, Neon access, or legacy Vendor removal. The historical 30-case matrix below covers only the original three templates and is not evidence for the new key.

On 2026-08-29 the owner explicitly expanded the code-owned registry with a fifth, separately keyed `standard` template. Its responsive retail presentation is selected and edited through the existing Store-scoped Templates Studio document; its live renderer uses the shared Store, catalog, favorites, Cart, variant, shipping, payment, checkout, and confirmation authorities. The complete-template preview and editor frame host that same renderer. Static design fixtures remain limited to development/editor preview and component tests. This amendment does not authorize production deployment, public traffic, Neon access, or legacy Vendor removal.

On 2026-08-31 the owner explicitly expanded the code-owned registry with a sixth, separately keyed `glow-beauty` template and made it the third visible Templates Studio selection after `luxe-commerce-full` and `standard`. Its warm beauty presentation is selected, edited, previewed, published, and rendered through the same Storefront document path as `standard`; live catalog, Product variants, favorites, Cart, shipping, COD/manual bank transfer, checkout, and confirmation all remain on the shared Store authorities. The owner's later correction authorizes an explicit Super Admin install operation that copies the exact six-product beauty reference, images, LYD prices, variants, managed stock, and bilingual draft into an empty commerce-ready Store as ordinary Store-owned records. It is idempotent for that exact starter, refuses an existing merchant catalog, and provides no runtime fixture fallback. Ratings, addresses, payment details, and Order details remain preview/test-only. This amendment does not authorize production deployment, public traffic, Neon access, or legacy Vendor removal.

Focused 2026-08-31 evidence for the corrected Glow Beauty amendment is green: backend typecheck and production build; the owned-disposable PostgreSQL Storefront-document HTTP suite passed 8/8 and the public Product sanitizer unit suite passed 2/2; Storefront production build and all 31 Vitest files/65 tests passed; Platform Dashboard production build and all 4 Vitest files/20 tests passed. The guarded pinned Supabase development runner applied migration `20260831100000`, installed and published the six ordinary Store-owned Products plus their variants, managed inventory, images, and bilingual Storefront document for `dev-glow-beauty`, and finished with seven active fixture Stores and eight Store access records; its backend health check passed 3/3. Browser QA rendered the canonical editor iframe with all six Product records and verified that every Glow Product, category, hero, and offer image loaded at its natural dimensions; the runtime showed real LYD prices and no fabricated review counts. This is guarded development-only evidence; it is not authenticated Admin Browser, staging, production, public-traffic, physical-keyboard, or Phase 3C exit-gate evidence. Automated tests used only disposable PostgreSQL, and no work accessed Neon.

Focused 2026-08-29 evidence for that amendment is green: Storefront typecheck and production build passed; all 17 Storefront test files passed with 49 tests; Platform Dashboard typecheck, production build, and the focused Templates Studio/editor/renderer tests passed; backend typecheck and the disposable-PostgreSQL Storefront-document integration passed 7/7. The guarded managed-development runner applied core migrations `20260824100000` and `20260829100000`, completed safe link synchronization, and restarted the bounded loopback backend on port 9000. A rendered Standard development journey then exercised canonical catalog data, variant selection, favorites/Cart state, address submission, a real Store shipping option, COD selection, completion, and truthful Order confirmation. Responsive Browser checks covered the shared 430px mobile navigation and the 1440px desktop composition with no fresh console errors. This is guarded development evidence only; it is not staging, production, public-traffic, positive Admin-authentication, or Phase 3C exit-gate evidence.

## Security work present

- Product ownership/channel are derived server-side.
- Product reads require canonical Store ownership.
- Password changes/resets/disable revoke sessions.
- Password verification is bounded, asynchronous, rate-limited, and non-enumerating.
- Public output uses explicit allowlists.
- Storefront network payloads are reduced to exact client DTOs, and public Product `metadata` is stripped recursively at the backend response boundary.
- Cart items require Product Store = Cart Store.
- Merchant Order access uses whole-Order Store ownership.
- Provisioning uses durable idempotency, graph-gated activation, safe serialization, and explicit owner reuse.
- Commerce setup uses durable Store exclusion, deterministic exclusive fulfillment resources, live fail-closed validation, and sanitized unknown failures.
- Platform-owner authentication timeouts use one real `AbortController` signal across login/session creation and separately across access probes, logout, and password reset, preventing a timed-out request from mutating a session later.
- Manual payment selection is Store/Cart/Order-bound and idempotent, while protected bank values are copied to an immutable Order-payment snapshot before their one authorized post-Order disclosure.

Production still needs shared rate limiting/locks/events, monitoring, backups/restore, DNS/SSL/deployment, billing/entitlements, production providers, repair/attention operations, and reviewed credential/incident management.

## Historical committed validation

For Phase 2C commit `8b02475`, the recorded automated result was 110 passing tests:

- unit: 46;
- module integration: 8;
- HTTP integration: 56;
- total: 110 passed, 0 failed.

Backend lint/typecheck/build, merchant dashboard lint/typecheck/build, migration apply/rollback/reapply, and link synchronization passed for that committed tree. These numbers do not include the current gate-closure changes.

## Current focused working-tree validation

Accepted guarded-local evidence for the current working tree is: commerce-readiness integration 12/12, commerce-resource unit tests 5/5, and the Phase 2B Cart/Order regression 12/12. The commerce suite covers plan gating, deterministic setup/replay, concurrency, retained retry, database-time transactional expired-lease handling, paused-owner fencing, stale-expiry observation preserving a concurrent renewal/completion, single-winner attention evidence, unknown-error sanitization, automated integration HTTP checkout and canonical Order isolation, stale graph, exact shipping-rule/price corruption rejection, cross-Store fulfillment corruption, and authenticated Admin setup/status/readiness handlers.

The immutable provisioning-derived policy pin is implemented: its versioned server-derived policy is included in the setup SHA-256 digest/snapshot and is re-resolved on retry/completion. Its focused unit result is 2 suites/9 tests passing.

Final guarded-local verification for this working tree passed after Phase 3B: backend regression 23 suites/144 tests (62 unit, 10 module, 72 HTTP); backend typecheck, lint, and build; platform, vendor, and storefront typecheck/lint/build; storefront Vitest 3 files/11 tests; SaaS migration generation with no changes; and the unchanged Phase 3A guarded harness matrix/restart/cleanup. This closes automated local verification evidence only. The working tree remains uncommitted.

Focused 2026-08-14 Storefront-document checks ran on supported Node 22.23.1. Backend typecheck passed. The owned-disposable Storefront-document HTTP suite passed 7/7, covering the forward corrective migration, malformed/incomplete persisted-data fail-closed behavior, real Super Admin mutation/preview authorization, strict invalid-request no-mutation, publication, public Store isolation, and truthful template assignment totals while draft and published templates differ. The existing public Storefront foundation HTTP suite passed 3/3 and the `vendors.unit` suite passed 6/6. Platform-dashboard typecheck and production build passed, with only the existing Vite chunk-size warning. Storefront typecheck, 4 Vitest files/21 tests, and production build passed; the production bundle scan contained no protected bank/revision/draft keys or development preview fixtures. No automated test accessed Supabase. This evidence is scoped automated evidence, not a full regression or Phase 3C gate closure.

Later focused 2026-08-14 checks passed: the owned-disposable Phase 3C manual-payment HTTP suite reran 2/2 after correcting Arabic mojibake, with backend typecheck passing; the current owned-disposable Phase 2C commerce-readiness regression passed 13/13; platform-auth tests passed 9/9, with platform-dashboard typecheck and production build passing; storefront tests passed 6 files/30 tests, with storefront typecheck and production build passing; and the Supabase development/database guard suite passed 19/19. The Storefront production bundle scan contained no visual-preview fixture, enablement flag, selector helper, or mojibake strings. The auth result covers real request cancellation for login, session creation, access probes, logout, and password reset. The guard result covers strict development configuration, exact guarded-process ownership, bounded health classification, and disposable-test isolation without contacting Supabase. These are focused automated results, not a full regression, rendered COD/bank-transfer Browser acceptance, or Phase 3C gate closure.

Separate interactive managed-development evidence completed through the guarded Supabase runner on 2026-08-14. The core migration operation applied Store Order-payment migration `20260814200000`; schema hardening and the guarded single-connection probe then passed. After a guarded backend restart, five bounded loopback health requests returned 200 and `backend:status` classified the recorded `develop` run healthy with 3/3 probes. Synthetic invalid-login requests sent directly to the backend and through the platform-dashboard proxy returned the expected 401 without the earlier timeout. This is development-runtime evidence only: it is not an automated test, positive-credential authentication acceptance, staging, production, public-traffic, or Phase 3C gate evidence. A sustained `backend:monitor` soak was not recorded.

Rendered Browser QA on 2026-08-14 first covered the read-only Admin template catalog/editor at the default 1265x720 viewport and 390x844 plus the Arabic `home-living` customer renderer at 390x844. The final development-only visual-preview matrix then passed all 30 combinations: the exact three templates (`luxe-commerce`, `modern-market`, and `home-living`) x `ar-LY`/`en-LY` x 320/375/768/1024/1440 CSS pixels. Every combination rendered the requested template with the correct language and direction, exactly one `h1` and one `main`, a skip link, no horizontal document overflow, and no mojibake. A focused keyboard check proved visible skip-link focus and transfer to main content. At 390 CSS pixels, Store Details, Vendor Details, Settings, Templates Studio, Domains, Requests, Plans, and Analytics remained vertically scrollable without horizontal document overflow. This is development-only renderer/responsive evidence; it is not authenticated real-backend shared-commerce, real COD/bank-transfer, positive-authentication, full physical-keyboard, staging, or production acceptance. Do not reuse the historical Phase 3A/3B browser and physical-keyboard results as evidence for these new checks.

## Phase 3A guarded-local evidence

Recorded storefront evidence is:

- Vitest: 2 files, 7 tests passing;
- storefront typecheck and production build passing;
- production bundle scan: no visual-preview data, development Store selector, or plan strings;
- backend Phase 3 exact public-field and Store-isolation contract: 1 suite, 3 tests passing;
- earlier focused Phase 3 plus Phase 1/2 isolation regression: 5 suites, 34 tests passing;
- browser QA for home, catalog, detail, search, sort, mobile menu, empty, not-found, and unavailable states at 320, 375, 768, 1024, and 1440 CSS pixels, with RTL, one `h1`, and no horizontal overflow.
- repeatable `npm.cmd run storefront:accept` harness guarded by the exact disposable local database contract; it resets only `medusa_phase05_disposable`, migrates, seeds two synthetic Store graphs with no customer or merchant credentials and runtime-only public keys, starts the built backend plus two hostname/key storefront deployments, supports backend-only restart, and decrypts then removes its ephemeral key handoff during startup;
- real-backend browser QA for Store A and Store B home/catalog/detail identity and Product isolation, cross-Store Product denial, both crossed hostname/key directions with no stale Store rendering, mobile/desktop RTL with no horizontal overflow, generic unavailable announcements, clean browser warning/error logs, and the same resolution after a backend-only restart;
- inspection confirming native links/buttons, a focusable skip link, visible focus state, expanded-state semantics, and a polite error live region;
- owner-performed physical keyboard acceptance on 2026-07-22: from the initial body focus, one Tab exposed the skip link and Enter moved focus to main content; after reload, three Tabs reached `فتح القائمة`, Enter opened the mobile menu, and Space closed it. Focus visibility and order were accepted.

The earlier wide-viewport browser screenshots used explicitly enabled local visual-preview data and remain presentation-only evidence. The later guarded smoke used the real Medusa backend and permanent Store context. The in-app browser runtime did not reliably synthesize native keyboard activation, so its semantics inspection was kept separate from the owner-performed physical keyboard pass rather than being counted as accessibility acceptance by itself.

## Phase 3B guarded-local implementation and evidence

The approved pilot is implemented only in this working tree. It adds exact public `GET /store/saas/commerce-capabilities` and `GET /store/saas/products/:handle/purchase-options` responses, server-owned Store currency on merchant Product writes, a same-origin guest Cart, quantity/removal, delivery details, the one deeply allowed shipping option, local `pp_system_default` payment-session creation, Cart completion, an in-memory reduced confirmation, and the existing reduced owning-merchant Order view. Unsupported Product shapes, mismatched currencies, hostile hostname/key/Product/Cart/shipping/payment/Order combinations, stale graphs, and non-ready Stores fail closed.

The storefront persists only the opaque Cart ID in versioned same-origin `sessionStorage`. Email, phone, address, Product/Cart/Order payloads, publishable keys, provider details, and upstream errors are not persisted. The reduced confirmation omits Order/customer/Store IDs, address, contact, payment/session/provider data, metadata, internal history, and raw fulfillment details.

Recorded Phase 3B storefront evidence, kept separate from the Phase 2C API rerun, is:

- a real built Store A browser journey from Product through Cart, delivery, shipping, local payment, and reduced confirmation, totaling 125.000 LYD plus 15.000 LYD shipping = 140.000 LYD;
- an independent ready Professional Store B plus crossed Host/key, cross-Store Product, hostile Cart, shipping, and payment cases that fail closed;
- owning merchant A can list/read the reduced Order and merchant B receives 404, both before and after a verified backend-only restart;
- responsive RTL checks at 320, 375, 768, 1024, and 1440 CSS pixels with no horizontal overflow, required field labels, one main/heading structure, skip-link/focus semantics, invalid-email focus, and zero browser warnings/errors;
- a real-browser mapper correction discovered during acceptance: Medusa Cart line `total` is optional unless expanded, so the exact mapper safely derives it from `unit_price * quantity`;
- production/source artifact scans found no visual-preview Store selector, demo Cart, hidden deferred controls, database environment values, private keys, credentials, publishable-key token, or persisted PII;
- normal harness shutdown left ports 9000/5175/5176/55432 closed, the exclusive lock absent, the disposable smoke directory empty, and no owned Phase 3B processes; the disposable schema was scrubbed.

The owner-selected current-tree Phase 2C real-backend API rerun also passed inside the guarded harness, but remains a separate evidence set: a runtime-only synthetic platform administrator authenticated through real HTTP, provisioned an additional Professional Store through the real Admin surface, and completed commerce setup/readiness without real credentials or Neon. This does not rewrite the historical 2026-07-14 evidence.

Automated semantic inspection is not physical-keyboard acceptance. On 2026-07-29 the owner performed the distinct Phase 3B keyboard-only journey through add-to-Cart, quantity/removal, checkout fields, shipping selection, review, and completion inside the guarded harness; focus remained visible and no pointer input was required. Together with the automated, real-browser, persistence, regression, and cleanup checks recorded on 2026-07-22, this closed the Phase 3B guarded-local exit gate.

`npm.cmd run storefront:accept` is destructive only to the exact loopback `medusa_phase05_disposable` schema. It requires Node 20 through 23, free ports 9000/5175/5176, and exclusive use of the disposable database. The wrapper records both wrapper and child ownership, refuses overlap, starts the built backend bound to `127.0.0.1`, supplies runtime-only synthetic session secrets, keeps backend secrets out of Vite, verifies A/B/crossed contexts before and after restart, and on normal shutdown scrubs the synthetic schema and stops embedded PostgreSQL. During the 2026-07-22 acceptance shutdown, owned HTTP processes and the schema stopped cleanly, but the third-party Windows embedded-PostgreSQL stop path waited on an already-fired process event; the exact owned process was terminated and ports, lock, schema handoff, and temporary artifacts were verified clean. The wrapper now performs a bounded `pg_ctl` stop against only its owned Windows data directory and clears the stale process reference; a fresh guarded wrapper probe then exited successfully with the disposable port and lock released. The local Vite `/store` proxy is acceptance infrastructure; it does not certify or replace the production edge allowlist, forwarding-header stripping, timeout, and redacted-logging contract.

## Historical external real-HTTP acceptance

On 2026-07-14, a temporary ignored runner recreated guarded local PostgreSQL, ran normal migrations, created a real platform admin, started the real backend/Admin, and used real HTTP routes. It was removed and never committed.

Recorded outcome for committed Phase 2C:

- Admin `/app`: 200;
- 33/33 recorded API operations matched expectation;
- Starter Store A and Professional Store B provisioned with 201;
- provisioning survived backend restart;
- owners logged in and created/listed only their Product;
- cross-merchant Product reads/updates returned 404;
- matching domain/key pairs returned 200 and crossed pairs returned 404;
- public Product lists were Store-isolated;
- Cart A accepted Product A, rejected Product B, and was inaccessible from Domain B/Key B;
- no generated credential appeared in captured output/snapshots/API responses;
- Neon was not accessed.

The run found:

1. one exact compatible Libya/LYD Region was reused. This is now accepted policy;
2. no Shipping Option existed, so real checkout, resulting Order ownership, and merchant-B Order denial were not exercised.

The current automated 12/12 suite now exercises the second journey, but the 2026-07-14 external run has not been repeated. Keep these evidence sets separate.

The historical status API did not expose raw Brand/Domain/Membership IDs. It proved distinct records and resolving relationships without raw-ID comparison.

## Database and secret safety

Never use Neon for development tests, migrations, diagnostics, acceptance, or backfills. The previously exposed Neon password rotation has not been verified. Never reproduce the old value in prompts, documents, commands, fixtures, or logs. Production migration is blocked until rotation is confirmed and the owner explicitly approves the runbook.

On 2026-08-11 the owner selected a fresh Supabase PostgreSQL project for interactive Phase 3C development. Only the tracked, pinned project may be used, and only through the guarded Supabase development runner documented in `supabase-development-runbook.md`. The connection and independent runtime secrets are protected with Windows DPAPI outside the repository. Supabase Auth and browser database access are not part of this architecture. This approval does not authorize staging, production, public traffic, or customer data.

The managed-development schema rollout completed on 2026-08-14 through the guarded runner. Core schema migration `20260814100000`, safe link synchronization, forward corrective migration `20260814110000`, and Store Order-payment migration `20260814200000` completed; the application schema was re-hardened and the guarded single-connection probe passed. The corrective change is a core migration and required no migration-script stage. A guarded `develop` backend then passed five bounded loopback health requests and `backend:status` classified it healthy with 3/3 probes. A sustained `backend:monitor` soak was not recorded. Automated tests and acceptance remain on owned disposable loopback PostgreSQL; managed Supabase development results are not test, staging, or production evidence.

Identity provisioning fingerprints the normalized password-bearing request with HMAC, so it must not be converted to an unkeyed digest. Phase 3C implements a dedicated versioned key-ring: new hashes carry the active key ID, replay accepts retained versioned keys and historical unversioned hashes, and production fails closed without dedicated configuration. Before public traffic, provision real keys through the deployment secret manager and rehearse the migration and rotation runbook in an approved isolated restore. This is separate from the commerce-setup SHA-256 digest, whose payload contains no credential and is intentionally stable across session-secret rotation.

Tests require `NODE_ENV=test`, a dedicated loopback `TEST_DATABASE_URL`, disposable acknowledgement, a URL different from `DATABASE_URL`, and live ownership of the embedded PostgreSQL process. They reject remote targets and already-open unowned ports. Never silently fall back to `DATABASE_URL`, and never pass Supabase development credentials into test children.

The current guard expects database `medusa_phase05_disposable`; prior acceptance used local PostgreSQL on port 55432. Preserve every guard even if the port changes.

Ignored environment files are not part of Git history. Recreate them securely and never transfer the old Neon credential as a production value.

## Commands

```powershell
npm.cmd ci
npm.cmd run test:commerce-readiness --workspace @dtc/backend
npm.cmd run test:database-guards --workspace @dtc/backend
npm.cmd run test:with-db --workspace @dtc/backend
npm.cmd run lint
npm.cmd run build
npm.cmd run typecheck --workspace @dtc/backend
npm.cmd run typecheck --workspace @dtc/vendor-dashboard
npm.cmd run typecheck --workspace @dtc/platform-dashboard
npm.cmd run typecheck --workspace @dtc/storefront
npm.cmd run test --workspace @dtc/storefront
npm.cmd run storefront:accept
npm.cmd run commerce:accept
npm.cmd run medusa:disposable --workspace @dtc/backend -- db:migrate
npm.cmd run backend:configure -- --project-ref YOUR_20_CHARACTER_REF
npm.cmd run backend:migrate
npm.cmd run backend:harden
npm.cmd run backend:platform-admin
npm.cmd run backend:status
npm.cmd run backend:monitor
npm.cmd run backend:dev
npm.cmd run vendor:dev
npm.cmd run platform:dev
npm.cmd run storefront:dev
```

URLs:

- Medusa platform Admin/backend: `http://localhost:9000/app`
- merchant dashboard: `http://127.0.0.1:5175/`
- owner platform dashboard: `http://127.0.0.1:5174/`
- customer storefront: `http://127.0.0.1:5176/`

## Current gate, not an automatic next milestone

Phase 3A was separately authorized. Its browse-only implementation, guarded real-backend browser matrix, backend-only restart, and distinct physical keyboard pass are recorded. The guarded-local Phase 3A exit gate closed on 2026-07-22. This result remains uncommitted, local-only evidence and does not authorize production or external acceptance.

The archived `../archive/architecture-decisions/adr-customer-commerce-pilot.md` and `../archive/phases-3a-3b/phase-3b-commerce-pilot-contract.md` define the owner-approved and implemented Phase 3B boundary: an assisted guarded-local Professional Store, one simple Store-currency Product variant, explicit public checkout capability, guest Cart/shipping/local-payment completion, reduced confirmation, and owning-merchant Order visibility with hostile Store B denial. The vendor Product currency authority is fixed and covered. The owner completed the distinct physical-keyboard journey on 2026-07-29, closing the Phase 3B guarded-local exit gate.

Continue to keep automated HTTP, real-backend browser, physical keyboard, and earlier visual-preview evidence separate. Preserve the trusted internal no-hook workflow boundary when reviewing new call sites. Commit only if/when requested; never push or configure a remote without explicit approval.

The owner-selected current-tree Phase 2C real-backend rerun passed on guarded disposable local PostgreSQL on 2026-07-22 and is reported separately from Phase 3B Storefront browser, physical accessibility, and cleanup evidence. Neither evidence set used Neon.

On 2026-08-12 the owner-authorized System Settings page was connected to a canonical, revisioned `platform_setting` singleton in the SaaS module. `/admin/saas/settings` is protected by the fail-closed Super Admin boundary and stores only whole-system identity/contact fields (system/company names, logo, system/support emails, and company website). A separate Super Admin-only platform-user API manages Medusa-backed platform administrators, including profile/photo, access status, password reset, and protected deletion. Store provisioning/default settings remain outside this system-level page. Demo mode remains browser-session-only and never writes the development database.

On 2026-08-01 the owner approved Phase 3C planning and implementation under `phase-3c-mvp-contract.md`. Follow that exact concierge MVP boundary. Customer authentication/OTP, automated billing, online payments, courier integration, returns, public merchant signup, production migration, and Vendor removal remain excluded. The provisioning-fingerprint key-ring is implemented and locally verified; protected-environment configuration and rotation rehearsal remain required with the other operational blockers before rollout. Neon remains prohibited for development and acceptance. Production deployment and public traffic require separate owner approval after the Phase 3C staging gate.

The bounded Storefront-document and manual-payment implementations and their 2026-08-14 focused evidence do not close Phase 3C. Managed-development application of the new Order-payment migration, schema re-hardening, the guarded connection probe, live guarded health/status acceptance, and the 30-case development-only template/locale/viewport renderer matrix are complete development evidence. A sustained monitor soak, authenticated real-backend all-template shared-commerce and COD/bank-transfer journeys, positive-credential authentication acceptance, full physical-keyboard acceptance, staging isolation, merchant payment verification and Order operations, production prerequisites, and separate owner launch approval remain outstanding.

## URBX product-detail slice — 2026-09-06

- Added the owner-requested product-detail surface at `/products/chaos-hoodie?preview=1&template=urbx`; all URBX product handles use this renderer. Four generated gallery photos remain independent from the catalog thumbnail. Prompts/dimensions: `apps/storefront/public/assets/urbx/README.md`.
- Shared product/purchase APIs, available size/color variants, wishlist, cart, delivery/returns policies and inline product-edit selection remain authoritative. Standalone DEV reference prices are dollars; store/editor prices remain LYD. No runtime fixture fallback for missing saved products.
- New URBX starter drafts seed the four Chaos Hoodie images through existing `StarterProduct.images`. Existing drafts/stores are NOT reseeded. The creation product dialog can replace/add/remove URBX gallery photos (1–8) independently of the catalog thumbnail. No schema change in this slice.
- Focused evidence: five pure frontend gallery/variant tests, storefront/platform TypeScript checks, browser gallery/wishlist/size-guide/accordion/cart interactions and phone reference comparison. No full build, backend acceptance, database access, migration, payment or order completion. The prior URBX registry migration is still unapplied to managed development; this is not authenticated saved-store/database acceptance. Phase/production boundaries are unchanged.

## New Codex session bootstrap prompt

```text
Read AGENTS.md and docs/saas-pivot/HANDOFF.md completely before doing anything.
Then run git status --short --branch and git log --oneline -8.
Confirm the expected branch, historical Phase 2C commit, committed Phase 3A/3B
work, closed guarded-local gates, Phase 3C contract, database safety rules,
remaining production blockers, and exact requested implementation slice. Do not
access Neon, expose environment values, deploy production, remove Vendor, or
change Phase 3C scope without approval.
```

## Detailed source documents

- `roadmap-status.md`
- `current-architecture.md`
- `data-ownership-matrix.md`
- `security-risks.md`
- `adr-store-provisioning-workflow.md`
- `adr-store-commerce-readiness.md`
- `adr-storefront-document-publishing.md`
- `provisioning-fingerprint-key-rotation.md`
- `neon-migration-runbook.md`
- `legacy-removal-plan.md`
- `phase-3c-mvp-contract.md`
- `vendor-dashboard-design-qa.md`
- `../archive/README.md` for completed phase contracts, older ADRs, backfill notes, and failure matrices
