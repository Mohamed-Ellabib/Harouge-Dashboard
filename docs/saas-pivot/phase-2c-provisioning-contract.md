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
