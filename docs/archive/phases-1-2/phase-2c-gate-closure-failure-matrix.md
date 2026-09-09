# Phase 2C Gate-Closure Failure Matrix

Status: implemented in the current uncommitted working tree. Original accepted guarded-local evidence is commerce readiness 12/12, commerce-resource units 5/5, Phase 2B Cart/Order regression 12/12, immutable-policy-pin units 2 suites/9 tests, and backend regression 21 suites/139 tests (60 unit, 10 module, 69 HTTP). A later post-Phase-3B full regression passed 23 suites/144 tests. The working tree remains uncommitted, and the current-tree Phase 2C real-backend API rerun remains separate from browser evidence.

The commerce setup workflow is separate from Store identity provisioning. Failure never changes canonical Store ownership and never leaves a Professional Store usable for checkout without a completed setup and live graph validation.

## Implemented behavior

| Boundary | Result | Retry behavior | Cleanup behavior |
| --- | --- | --- | --- |
| Request/Store/plan validation before prerequisites resolve | setup `failed`; readiness remains its prior non-ready state | Correct the permanent graph and replay the exact key/request; Starter cannot run setup | No commerce resource is removed |
| Active setup reservation conflict | deterministic conflict | Replay the original key; different key is not accepted | No cleanup |
| Live unexpired Store lease | caller waits for the identical operation or receives a running conflict after the bounded wait | Poll status/replay later | Only token owner may release its lease |
| Expired Store lease | database-time transaction locks setup/lease/readiness, revalidates the observed token/current expiry, and atomically moves setup/readiness to `requires_attention`; lease retained; one winning event | Replay is rejected, retry count is unchanged, a paused owner is fenced, and stale expiry cannot overwrite concurrent renewal/completion | Do not steal/delete the lease; operator resolution and monitoring are not implemented |
| Region/currency/payment/location/channel prerequisite | setup/readiness `failed` once prerequisites are available | Repair the exact permanent graph, then replay the original key/request | Never delete a reused Region/provider or another Store's link |
| Fulfillment provider/location link | setup/readiness `failed` | Revalidate the derived provider and exact link, then replay | Retain shared provider resources |
| Default Shipping Profile | setup/readiness `failed` | Reuse exactly one compatible default profile or resume creation | Retain framework/shared profile |
| Deterministic Fulfillment Set/Service Zone | setup/readiness `failed` | Reuse the checkpointed exact Store set/zone or resume creation | Retain created resources; never delete a reused/shared resource automatically |
| Exclusive location/set relationship | setup/readiness `failed` | Repair only after Store ownership is proved; cross-Store references conflict | Never detach another Store's set as automatic compensation |
| Deterministic Shipping Option or prices | setup/readiness `failed` | Reuse the checkpointed exact option and requested amount or resume creation | Created resource becomes `retained_for_retry`; unrelated prices are untouched |
| Store profile/option allowlist | setup/readiness `failed` | Reapply the exact singleton Store policy and replay | Never clear another Store policy or broaden the allowlist |
| Complete graph validation/readiness persistence | setup/readiness `failed` | Re-read every invariant and replay the exact operation | All resources retained; checkout remains fail-closed |
| Unknown core/provider exception | setup/readiness `failed` with generic safe error | Replay from recorded checkpoint with the original key/request | No raw error is stored; resources retained |
| Explicit safe validation/conflict exception | setup/readiness non-ready with bounded allowlisted message | Resolve the stated invariant, then exact replay where permitted | No broad or destructive cleanup |
| Completed setup | immutable `completed`/`ready` evidence | Original key/request replays; new key is rejected | Completed resources are not removed by setup |
| Cancellation | reserved only; not implemented | No API or transition exists | No automatic destructive cleanup |

Ordinary execution errors use `failed`; the current executor does not dynamically select `requires_attention` for arbitrary Region, Service Zone, payment, or provider failures. `requires_attention` is implemented specifically for an expired execution lease. `cancelled` is schema-reserved.

## Cross-Store conflicts

An option, zone, fulfillment set, location, channel, key, Cart, Product, or Order belonging to another Store is never reused because its currency or country appears compatible. Exact Region sharing and framework/provider resources explicitly designed to be shared are the only accepted shared behavior.

The deterministic graph requires one Store location to one Store Fulfillment Set in both directions and exactly one Store Shipping Option in the Store Service Zone. Cross-Store corruption returns a sanitized failure, keeps checkout closed, and does not expose the other Store's option ID through public shipping listing.

## Retry and attention rules

- Failed retry uses the exact normalized request and idempotency key.
- Every checkpointed resource is retrieved and structurally revalidated before reuse.
- Attempt-created resource dispositions become `retained_for_retry` on ordinary failure.
- A new key is rejected while an unfinished setup exists and after setup has completed.
- `requires_attention` cannot be forced back into execution by replay.
- Readiness can become `ready` only after fresh complete graph validation.
- Lease expiry never proves that the prior process did no work.
- There is no current cancellation, destructive cleanup, attention resolution, or setup-update endpoint.

## Error and secret handling

Setup requests contain no provider/internal identifiers or credentials. Unknown errors are converted to the generic safe code/message before setup/readiness persistence and before the Admin response. Events, snapshots, failure state, and responses exclude provider credentials, publishable key tokens, lease tokens, database URLs, raw headers, stacks, and untagged core error text.

The event enum includes `resource_retained`, but the current ordinary failure path records retained dispositions in setup state and emits a sanitized `failed` event; it does not emit a separate retained event for each resource.

## Dynamic evidence boundary

The 12/12 focused commerce suite exercises retained retry through an injected `shipping_option` failure and separately exercises stale graph, cross-Store set corruption, exact shipping-rule/price corruption, database-time expired-lease handling, paused-owner fencing, stale-expiry preservation of concurrent renewal/completion, single-winner attention evidence, and unknown provider error behavior. Commerce-resource units pass 5/5, Phase 2B Cart/Order regression passes 12/12, and immutable-policy-pin units pass 2 suites/9 tests. This is not a dynamic injection of every row in this matrix. Final guarded-local backend regression, migration, and build evidence has passed; exhaustive dynamic injection of every row is still not claimed.

## Production boundary

The local gate derives `manual_manual` and `pp_system_default`. This matrix does not cover carrier bookings, production payment, settlement, refunds, disputes, tax, webhook replay, provider credentials, or production cleanup. Phase 3 and Neon are outside scope, and the unverified Neon credential rotation continues to block production migration.
