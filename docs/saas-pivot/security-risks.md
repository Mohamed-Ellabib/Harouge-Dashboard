# Phase 0.5 Security Risks

Last updated: 2026-07-12

Phase 0.5 was limited to the four confirmed findings and the test foundation.
It did not add SaaS Store schema, storefront, or provisioning work.

## S-01: Products assigned to every sales channel

- **Root cause:** merchant product writes loaded every sales channel.
- **Affected files:** vendor product create/update routes and vendor helpers.
- **Remediation:** derive the authenticated vendor and configured channel
  server-side, construct workflow input without client ownership/channel data,
  and retain vendor-product ownership checks.
- **Regression test:** the Store A/Store B HTTP suite verifies exact channel
  membership, later-channel isolation, scoped keys, hostile input, and
  cross-vendor denial.
- **Remaining risk:** existing production relationships were not changed. The
  dry-run diagnostic needs review before an owner-approved repair. Sensitive
  reassignment audit storage is not yet available.
- **Status:** fixed for new merchant writes; existing data needs diagnosis.

## S-06: Password changes do not revoke sessions

- **Root cause:** signed cookies had no server-validated revocation value.
- **Affected files:** vendor auth, password, member-sync, lookup, and admin
  member update paths.
- **Remediation:** store a session version in member metadata and signed
  cookies; compare it on every request; increment it on password changes,
  admin resets, and disabling.
- **Regression test:** two prior sessions are rejected after self-service
  changes, admin resets, and disabling; old credentials fail and new ones work.
- **Remaining risk:** revocation is account-wide, not per-device, and the
  version remains in metadata pending a dedicated identity model.
- **Status:** fixed.

## S-08: Unbounded synchronous password checks

- **Root cause:** synchronous scrypt and no request bounds or attempt limiter.
- **Affected files:** vendor auth, login route, and login limiter.
- **Remediation:** asynchronous scrypt, shape and 1024-character bounds before
  verification, normalized email, generic failures, and layered source plus
  normalized-identifier limits. Local limiter storage is capped and empty
  lookup keys are not retained.
- **Regression test:** unit and HTTP tests cover malformed/oversized input,
  generic responses, both limit dimensions, expiry, bounded key storage, and
  event-loop response.
- **Remaining risk:** the limiter is process-local. Multiple production
  replicas require a shared Redis-backed implementation and trusted-proxy
  configuration.
- **Status:** fixed for the current single-process deployment; production
  scaling action remains.

## S-10: Public Store response exposes vendor metadata

- **Root cause:** the public serializer included unrestricted metadata.
- **Affected files:** public vendor serializers and Store vendor routes.
- **Remediation:** an explicit `PublicStoreProfile` allowlist containing name,
  handle, primary domain, and public branding only.
- **Regression test:** exact allowed keys and known sensitive/internal key
  absence are asserted.
- **Remaining risk:** future public fields must be deliberately added to the
  type and contract test.
- **Status:** fixed.

## Unresolved risks

- Order ownership is still indirect and was outside Phase 0.5.
- Product single-owner uniqueness is not a database invariant.
- Hostname, publishable key, and channel are not one authoritative context.
- Vendor roles are stored but not enforced as permissions.
- Duplicate merchant emails across vendors remain ambiguous.
- CSRF hardening and security-event audit storage need later design.
- Fake Redis, local events, and in-memory locking are not production-safe.
- Rotation of the previously exposed Neon credential could not be verified.
  The owner must rotate it and confirm without placing either value in Git,
  reports, logs, or chat.

## Data safety

All Phase 0.5 integration work used local disposable PostgreSQL databases.
The shared remote database was not used by tests, migrations, fixtures, or
diagnostics. The diagnostic was not run against remote data.
