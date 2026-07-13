# Phase 2C Compensation and Cleanup

## Policy

Provisioning uses checkpointed reuse instead of broad deletion. This prevents compensation from deleting a shared merchant identity, compatible Region, or any resource that existed before the attempt.

On failure:

1. StoreProfile and compatibility Vendor remain draft.
2. Created resources are marked retained_for_retry.
3. A safe failure code and message are stored.
4. A durable audit event identifies the failed step.
5. Retry resumes from recorded identifiers and creates no duplicate resource.

If final context validation fails after temporary activation, both StoreProfile and Vendor are returned to draft before the failure is persisted.

## Cancellation

An empty pending attempt may be cancelled. An attempt that already created resources becomes requires_attention. Completed Stores cannot be cancelled or hard-deleted by this workflow.

## Operator cleanup

Automated destructive cleanup is intentionally deferred. A future operator tool must inspect resource disposition, customer data, links, and reuse before removal. Shared merchant accounts and compatible Regions must never be removed automatically.
