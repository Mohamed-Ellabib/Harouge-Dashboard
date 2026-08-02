# Provisioning Fingerprint Key Rotation

Status: Phase 3C production-operation contract.

## Purpose

Store provisioning fingerprints contain an HMAC of normalized input that may
include a temporary owner password. The fingerprint must remain keyed, and its
keys must be independent from JWT, cookie, and merchant-session secrets.

## Configuration

Production requires both variables:

```text
PROVISIONING_FINGERPRINT_ACTIVE_KEY_ID=v2
PROVISIONING_FINGERPRINT_KEYS={"v2":"<active-secret>","v1":"<previous-secret>"}
```

- the key-ring is a JSON object with one to five entries;
- key IDs contain only letters, numbers, `_`, or `-` and are at most 32
  characters;
- each secret is at least 32 characters and is generated randomly;
- the active ID must exist in the key-ring;
- values are supplied through the deployment secret manager, never source,
  fixtures, logs, screenshots, or shell history;
- new records store `<active-key-id>:<hmac>`; replay accepts versioned
  fingerprints produced by any retained key and historical unversioned HMACs;
- production startup/provisioning fails closed if dedicated configuration is
  missing or invalid.

## Initial migration from session secrets

Historical fingerprints may have used the first configured vendor, JWT, or
cookie session secret. Do not copy that value into source or documentation.

1. Confirm which secret was effective when each protected-environment
   provisioning record was created without printing it.
2. Add that value to the production secret manager under a bounded legacy key
   ID such as `legacy_session_v1`.
3. Generate an independent active key such as `v2`.
4. Configure both keys with `v2` active.
5. In an isolated restored environment, replay one sanitized known request for
   each historical key generation and confirm it resolves the existing record.
6. Create a new synthetic provisioning request and confirm its fingerprint no
   longer changes when JWT, cookie, or merchant-session secrets rotate.
7. Rotate those authentication secrets independently and repeat the checks.

This procedure does not authorize Neon access. Protected-environment rehearsal
requires the separately approved backup/restore and migration process.

## Routine rotation

1. Generate a new random key in the secret manager.
2. Add it to the key-ring without removing previous keys.
3. Deploy with the old active key still active and verify configuration health.
4. Change the active key ID to the new key and deploy.
5. Verify a new synthetic request uses a different HMAC candidate than before.
6. Verify replay for records created under each retained key still succeeds.
7. Rotate authentication/session secrets independently to prove separation.
8. Record only key IDs, deployment versions, timestamps, and sanitized outcomes.

## Key retirement

New database records store the key ID with the HMAC, but historical records store
only the HMAC. Neither form stores the source request password. An old
fingerprint cannot be recomputed after its key is removed. Retiring a key
therefore invalidates replay for every record created under that key.

A previous key may be removed only after an owner-approved retention decision
proves one of these conditions for every dependent record:

- the record and its idempotency contract are intentionally retained together
  with the key; or
- the record has passed an approved idempotency-retention window and is removed
  through a separately reviewed archival/deletion operation.

There is currently no provisioning-record deletion operation. Until one is
approved and reconciled, retain every historical production fingerprint key.
The application accepts at most five keys, so define record retention before a
sixth production rotation would be required.

## Failure and rollback

- Missing active key: restore the last known-good key-ring and active ID.
- Replay conflict after rotation: restore the omitted previous key; do not alter
  the stored request hash.
- Suspected key exposure: disable new provisioning, preserve existing records,
  add a new active key, assess affected logs and secret stores, and follow the
  incident process before retiring the exposed key.
- Never replace an HMAC with an unkeyed digest or a hash of the safe request
  snapshot; those inputs do not preserve the original idempotency contract.