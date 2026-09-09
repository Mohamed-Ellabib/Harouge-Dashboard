# Phase 2C Focused Security Review

Date: 2026-07-13
Scope: provisioning authorization, input validation, idempotency, conflict handling, compensation, owner creation, secret handling, result serialization, and graph activation.

## Validation rubric

- [x] Merchant and unauthenticated callers cannot reach platform provisioning.
- [x] Database uniqueness and leases prevent duplicate or conflicting graphs.
- [x] Partial failure cannot leave a Store active and retries reuse checkpoints.
- [x] Passwords, key tokens, provider credentials, leases, and internal snapshots are absent from public results and status responses.
- [x] MerchantStoreContext and PublicStoreContext agree before activation.

## Method and evidence

Static source-to-control tracing was limited to the changed API, provisioning workflow, SaaS models, authentication selection, and context resolvers. Dynamic evidence came from the 46 unit, 8 module, and 56 HTTP tests. The HTTP suite includes real unauthorized requests, concurrent same-key and conflict requests, every injected failure step, disabled-account reuse, safe serialization, and domain/key context mismatch.

## Findings resolved during review

1. Brand asset validation accepted HTTPS URLs with literal private hosts. Literal loopback, link-local, private, local, and internal hosts are now rejected. The application does not fetch these assets server-side.
2. Untagged Medusa error text could enter durable failure state. Only explicitly tagged provisioning validation/conflict errors can preserve their message; unknown core failures store a generic message.
3. Passing a temporary password through Medusa workflow transaction input could have persisted it in workflow state. The platform route now uses the non-persisting durable workflow facade while core resource steps continue to use installed Medusa workflows.

## Closure

No plausible critical or high-severity finding remains in the reviewed Phase 2C paths based on the scoped static trace and passing dynamic tests.

Residual risks are operational: the platform limiter is process-local, lease expiry needs production monitoring, retained failed resources require an operator repair process, DNS and SSL are not implemented, and merchant credentials remain in the transitional legacy identity module. These block production readiness. The later commerce-readiness gate-closure working tree adds its own deep checkout controls, trusted no-hook internal boundary, and final-verification requirements; this historical review does not authorize Phase 3 or any next product phase.
