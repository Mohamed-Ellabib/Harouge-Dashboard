# ADR: Storefront Document Publishing

Status: accepted for bounded Phase 3C implementation on 2026-08-14 and
amended by explicit owner authorization on 2026-08-24 to add the separately
versioned `luxe-commerce-full` template, on 2026-08-29 to add the separately
versioned `standard` template, and on 2026-08-31 to add the separately versioned
`glow-beauty` template as the third Templates Studio selection. This
decision authorizes implementation and guarded development evidence only. It
does not close Phase 3C, authorize public traffic, or approve production
deployment.

2026-09-05 owner amendment: `drops` joins the code-owned registry as its seventh
key and fourth visible Templates Studio choice. The other visible choices are
`standard`, `glow-beauty` and `luxe-commerce-full`; the original three keys remain
compatible but hidden in Studio. All four use the shared private creation flow
in `adr-store-creation-drafts.md`. The Drops enum migration is additive; it must
not rewrite an existing Store's document or delete immutable revision history.

## Context

Phase 3C originally required exactly three reusable storefront templates; the
2026-08-24, 2026-08-29, and 2026-08-31 owner amendments add three separately
keyed templates. The
contract continues to require Arabic RTL and English LTR content,
Store-owned presentation, About and contact content,
delivery and returns information, privacy and terms content, and manually
controlled bank-transfer instructions. The existing Templates Studio is a
visual demo: assignments, counters, drafts, duplication, archiving, and
publishing are component-local data and cannot be treated as operational
state.

Store identity, contact details, and brand tokens already have canonical
owners. `StoreProfile` owns Store metadata and contact details, `StoreBrand`
owns the bounded brand fields, and the Medusa Store remains the commerce
identity. A publishing system must not create a second mutable authority for
those fields, expose drafts to customers, or let a template alter Store
resolution, Product/Cart/Order isolation, checkout, inventory, or security.

Bank-transfer details have a stricter disclosure boundary than public Store
content. They may be stored and operated by the platform owner, but they must
never appear in the public Store profile. Phase 3C permits their reduced
allowlist only after a customer selects bank transfer and submits the owning
Store's Order.

## Decision

### Six code-owned templates

The supported template keys are exactly:

- `luxe-commerce`;
- `luxe-commerce-full`;
- `modern-market`;
- `home-living`;
- `standard`;
- `glow-beauty`.

Templates are versioned application code, not executable database content.
There is no import, upload, arbitrary HTML/CSS/JavaScript, merchant-specific
fork, create, duplicate, archive, or delete API. The database stores only an
allowlisted template key and bounded Store content. All six templates use
the same Store resolver, exact public DTO mapper, Product routes, Cart,
checkout, inventory, and accessibility/security controls.

`luxe-commerce-full` is a separately keyed, source-faithful port of the
owner-supplied Al-Sanousi customer frontend. Its original source and optimized
presentation assets are retained as a canonical reference inside the
Storefront package. Its live adapter must still use the platform-owned Store,
Product, favorites, Cart, checkout, and Order authorities; the copied legacy
API, authentication, and Supabase helpers are reference material only and are
not runtime authorities.

`standard` is a separately keyed responsive retail composition with the same
shared catalog, Product, favorites, Cart, checkout, payment, and Order
authorities. Its preview fixtures are development/editor-only and may not
become live Store business data.

`glow-beauty` is a separately keyed warm, mobile-first beauty composition. It
is the third visible Templates Studio selection and uses the same Store-owned
navigation, catalog, Product variants, favorites, Cart, shipping, COD/manual
bank-transfer checkout, and reduced Order confirmation authorities. Its beauty
design reference may also be installed by an authenticated Super Admin into an
empty, commerce-ready Store. Installation copies the allowlisted bilingual
document, six presentation assets, Products, size/color variants, LYD prices,
and managed stock into the existing Store-owned Medusa authorities. The copied
records become ordinary editable Store business data; the template code never
becomes a live catalog fallback. Installation is expected-revision guarded,
idempotent for the exact starter, refuses every non-empty or mixed catalog, and
does not invent ratings, payment details, addresses, or Order details.

### Store-scoped draft and publication pointers

Each `StoreProfile` has one `StorefrontDocument`. It records the current draft
revision, the optional published revision, and bounded audit metadata.
`StorefrontDocumentRevision` rows are immutable. Each revision is bound to the
same StoreProfile and document, has a monotonically increasing revision, a
schema version, one approved template key, a strict document payload, a
creating platform actor, and database-managed creation timestamps.

Saving a draft:

1. validates the complete request before opening a transaction;
2. acquires the established Store-scoped transaction advisory lock;
3. locks the StoreProfile and current document in a fixed order;
4. compares the caller's expected draft revision;
5. inserts one immutable next revision; and
6. atomically advances only the draft pointer.

Publishing validates the saved draft for complete Arabic and English content
and atomically moves only the published pointer. A stale write or publish is a
conflict. The previous published revision remains live until the new pointer
commits. Drafts are never a public fallback.

The document schema is an exact versioned allowlist containing the template
key and bilingual plain-text hero, brand showcase, About, contact introduction,
delivery, returns, privacy, and terms content. The Store-owned brand showcase
has bounded bilingual heading/copy and up to sixteen ordered brand cards. Each
card has a bounded internal slug, bilingual plain-text name, and an optional
bounded safe image URL; a card without an image renders its name, and an empty
card list removes the entire section without reserved layout space. Hero media
is one bounded safe image URL.
Section order and composition remain template code. Unknown keys, markup,
control characters, unsupported template keys, unsafe image URLs, and
overlength content are rejected without mutation.

Store name, locale, canonical contact methods, logo, colors, and typography
remain in their existing canonical Store configuration records. Public
rendering merges those live canonical values with the immutable published
Storefront document. Storefront publication has its own revision token and
does not reuse the Store configuration revision.

### Protected bank-transfer configuration

`StoreManualBankTransferConfiguration` is a separate one-to-one Store-scoped
record. It stores only bounded bank name, account-holder name, account
reference, and Arabic/English customer instructions plus revision/audit data.
It is updated in the same Store lock and draft compare-and-swap transaction so
an editor cannot partially save the aggregate.

Public profile and template queries do not join or load this table. No public
Storefront response may contain this record, its revision, or any of its
fields. The separately implemented Phase 3C Order-payment slice re-authorizes
the selected public Store and Cart, snapshots the configuration before Order
completion, verifies the resulting owning Order, and discloses only the
localized allowlist in that reduced successful bank-transfer confirmation.
The snapshot is immutable across later configuration changes. COD responses
contain no bank values, and there is no public bank-details endpoint.

### API boundary

All mutation and draft-preview routes remain under authenticated
`/admin/saas` routes and the independent fail-closed Super Admin guard.

- `GET /admin/saas/storefront-templates` returns the exact code-owned registry
  and Store assignment counts derived from current draft/published pointers.
- `GET /admin/saas/stores/:id/storefront` returns the Store's private draft,
  publication status, revision metadata, and protected bank configuration.
- `PUT /admin/saas/stores/:id/storefront/draft` performs a strict full draft
  replacement with an expected revision.
- `POST /admin/saas/stores/:id/storefront/publish` atomically publishes the
  exact saved draft revision.
- `POST /admin/saas/stores/:id/storefront/starter` installs the exact
  `glow-beauty` starter into an empty commerce-ready Store without replacing
  existing merchant Products.
- The protected preview route returns only the requested Store's sanitized
  draft presentation plus the Store's sanitized real Product/variant/inventory
  snapshot and never changes public state.

The separate public `POST /store/saas/carts/:cart_id/complete` route accepts
only `cod` or `bank_transfer`. It must pass the existing public Store, Cart,
readiness, and completed-Order ownership checks. Bank transfer is available
only for a complete protected Store configuration; same-method completion is
idempotent and a method change conflicts.

The permanent public Store profile returns either no published Storefront
document or an exact reconstructed allowlist containing only schema version,
template key, and public content. It never returns draft state, internal IDs,
revision/audit values, hashes, plan/readiness data, raw JSON, or bank-transfer
configuration. Missing, ambiguous, crossed, or malformed Store context fails
closed through the existing hostname, Store key, channel, and ownership
checks.

### Database and concurrency rules

- Foreign-key columns and current-pointer lookup columns are indexed.
- Unique active constraints enforce one current document and one bank record
  per StoreProfile, plus one immutable revision number per document.
- Database check constraints bound positive revisions, schema version, and
  template keys where practical.
- Transactions contain database work only; validation and any file upload
  complete before locks are acquired.
- Reads of template statistics load only current draft/published revisions,
  never the unbounded immutable history.
- Supabase Data API access remains disabled. Medusa and the guarded backend
  connection remain the authority; browser-side Supabase access and RLS are
  not introduced.

## Migration and compatibility

The migration creates the new records and deterministic draft revision 1 for
each existing non-deleted StoreProfile. The initial document uses the platform
default template key with empty content and is deliberately unpublished; the
migration does not invent merchant policies or copy the unrelated
`StoreBrand.configuration` JSON. New Store provisioning creates the same
default records idempotently.

An unpublished Store has no custom published document. The customer
application must show an explicit safe setup state rather than leaking a draft
or silently borrowing another Store's content. The concierge owner publishes
complete bilingual content before storefront launch.

The legacy Vendor compatibility layer remains. This decision does not permit
Vendor removal or a second merchant-facing content writer.

## Required evidence

Before this slice can be described as ready for staging rehearsal:

- the base migration passes apply, rollback, reapply, and no-change checks on
  an owned disposable loopback PostgreSQL instance; the forward safety
  correction passes apply, reapply, and no-change checks and deliberately does
  not republish compatibility content on rollback;
- unauthenticated and ordinary users are denied while Super Admin reads,
  saves, previews, and publishes succeed;
- strict-schema, unsafe-URL, markup, overlength, malformed-persisted-data, and
  no-mutation tests pass;
- stale and concurrent same-revision saves/publishes produce one winner;
- draft content is never public and atomic publish changes only the target
  Store;
- Store A/Store B and crossed hostname/key isolation pass;
- exact public-key scans prove bank, draft, revision, actor, hash, plan, and
  internal identifiers are absent;
- all six templates pass Arabic RTL and English LTR at 320, 375, 768, 1024,
  and 1440 CSS pixels with no clipping or horizontal overflow;
- keyboard navigation, one-H1/landmark structure, visible focus, reduced
  motion, safe links, and contrast-safe brand colors pass;
- catalog, Product, Cart, checkout, and Order behavior remains identical under
  all six template compositions; and
- backend restart persistence and a separately authorized backup/restore
  rehearsal pass.

Guarded Supabase development migration is development evidence only. On
2026-08-14 Store Order-payment migration `20260814200000` applied through the
guarded core-migration operation, schema hardening and the single-connection
probe passed, and the guarded `develop` backend passed bounded loopback health
checks plus a healthy 3/3 `backend:status` classification. A sustained
`backend:monitor` soak was not recorded. Automated tests continue
to own disposable local PostgreSQL. The development-only Storefront Browser
matrix passed 30/30 combinations across the exact three templates,
`ar-LY`/`en-LY`, and 320/375/768/1024/1440 CSS pixels, with correct
template/language/direction, one `h1` and `main`, a skip link, no horizontal
document overflow, and no mojibake. Focused skip-link visible-focus and
main-content-transfer checks passed. This is renderer/responsive evidence, not
authenticated real-backend shared-commerce or COD/bank-transfer acceptance.
Neon, production/public traffic, positive-authentication and real-payment
Browser acceptance, deployment, and the Phase 3C exit gate remain separately
blocked until their explicit acceptance work is complete. The focused
owned-disposable manual-payment HTTP result reran 2/2 after correcting Arabic
mojibake, with backend typecheck passing; it is not staging or gate-closure
evidence.
# Template 5 appearance amendment — 2026-09-08

URBX stores may save optional bounded appearance settings with the existing
versioned document: eight six-digit colors plus allowlisted body and heading
fonts. Editor previews copy these settings; published profiles use the saved
revision. Missing settings preserve the original design. No arbitrary CSS,
font upload, external font URL, or new schema migration is introduced.
