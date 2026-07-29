# Phase 2C Provisioning Contract

## Endpoint

POST /admin/saas/provisioning

Authentication: platform administrator only.
Required header: Idempotency-Key.
Rate limit: actor and source windows through the platform provisioning limiter.
Status: GET /admin/saas/provisioning/:id.
Cancellation: DELETE on the same status path is allowed only for an unfinished safe attempt; attempts with created resources move to requires_attention.

## Input

The strict contract contains Tenant name and key, Store name and handle, plan, locale, timezone, currency, owner identity and explicit reuse strategy, optional HTTPS brand URLs and colors, Region countries, Stock Location and Sales Channel names, public contacts, and an optional custom hostname.

Identifiers are normalized before reservation. Internal Tenant, Store, channel, Region, location, key, membership, and role identifiers are rejected by the strict parser.

Allowed plans are starter_whatsapp and professional_commerce. Supported currencies are configured. Locale, timezone, domain, email, color, and HTTPS URL values are validated.

## Output

The allowlisted result contains the provisioning ID and safe resource references, normalized handle, public and optional custom domain, owner email, plan, status, and created-versus-reused summary.

It does not contain passwords, password hashes, publishable key tokens, request snapshots, leases, actor data, database URLs, provider credentials, or internal failure state.

## Replay

The request fingerprint is an HMAC over the normalized complete input. The raw password is not stored. The same key and input returns the original result. The same key with materially different input is rejected.

Because the normalized input contains the initial owner password, this fingerprint must remain keyed; replacing it with an unkeyed digest would weaken password confidentiality. The current implementation derives that HMAC key from the first available vendor/JWT/cookie session secret. Rotating, reprioritizing, or removing those secrets can therefore change the fingerprint for an unfinished or replayed provisioning request. Production rollout is blocked on a dedicated versioned provisioning-fingerprint key/key-ring and an explicit rotation/migration runbook.

## Gate-closure clarification

The owner accepted exact compatible Region sharing on 2026-07-18. A completed provisioning result proves the Store identity and base ownership graph, not that online checkout is configured.

The follow-up in `adr-store-commerce-readiness.md` keeps commerce readiness separate. In the current uncommitted gate-closure working tree, `starter_whatsapp` is `not_required` for online checkout and fails closed at checkout entry points. `professional_commerce` begins `pending` and becomes `ready` only through a separate durable idempotent StoreCommerceSetup operation that derives currency, countries, providers, and internal identifiers server-side and validates the live deterministic Store fulfillment graph. The setup implementation pins a versioned policy derived from the completed provisioning record into its stable SHA-256 digest/snapshot and re-resolves it on retry/completion; immutable-policy-pin focused units pass 2 suites/9 tests.

That working-tree implementation does not change what a completed provisioning result means. It is not part of historical commit `8b02475`; final guarded-local verification is recorded. The owner-selected current-tree authenticated Phase 2C real-backend API rerun later passed on guarded disposable PostgreSQL and remains separate from historical and Storefront evidence. Separately owner-authorized Phase 3A and bounded Phase 3B are implemented in the same uncommitted working tree. Phase 3A's guarded-local exit gate closed on 2026-07-22; Phase 3B's automated/browser/restart/regression/cleanup evidence passed, while its distinct physical-keyboard acceptance remains pending.
