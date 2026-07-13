# Phase 2C Operational Runbook

## Local execution prerequisites

Use NODE_ENV=test, a guarded disposable TEST_DATABASE_URL, and explicit disposable-database acknowledgement. The guarded runner refuses a missing URL, equality with DATABASE_URL, non-test execution, protected remote hosts, and databases not identified as disposable.

Set SAAS_TEMPORARY_DOMAIN_BASE for the environment. Development can use local.test. Production must provide a different approved base domain.

## Provision

Call the platform-only endpoint with a unique idempotency key and validated request. Do not log the body because it may contain the temporary owner password.

After success, confirm completed status and the safe resource summary. The key response is a reference only; obtain storefront key material through a separately controlled operational process.

## Retry

Repeat the exact request and idempotency key. A changed request with the same key is rejected. A failed attempt resumes from checkpoints. A requires_attention attempt must be reviewed before retry.

## Diagnose

Read the allowlisted status endpoint and StoreProvisioningEvent records. Inspect the failed invariant and resource dispositions. Do not edit core Medusa tables directly.

## Production gate

Do not run provisioning migrations or commands against Neon yet. Credential rotation for the previously exposed Neon secret remains unverified. Production migration requires owner confirmation, reviewed backups, a maintenance plan, and explicit authorization.
