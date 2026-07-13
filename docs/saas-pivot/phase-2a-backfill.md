# Phase 2A Backfill

## Commands

From the backend workspace:

    npm run saas:backfill-stores -- --dry-run
    npm run saas:backfill-stores -- --apply

Dry-run is the default. Apply is local-only in Phase 2A and requires a database URL. Tests additionally require the disposable test guard. PROTECTED_DATABASE_URL, when configured by the owner outside Git, blocks the matching target without logging credentials.

## Behavior

The command reports inspected Vendors, created/reused Tenants, StoreProfiles, Medusa Stores and memberships, migrated domains, linked products, conflicts, and unresolved records. It normalizes domains with the Phase 1 normalizer and validates channel/product agreement.

Conflict codes cover missing or multiple channel configuration, duplicate normalized domains, ambiguous merchant accounts, multiple legacy or canonical product owners, missing products, channel mismatch, and Store-link conflicts. Apply exits unsuccessfully when unresolved conflicts remain.

Created custom records use deterministic IDs; existing records are retrieved by unique mapping keys. Repeating apply must create no duplicate profiles, memberships, domains, links, or product owners. Vendor rows are never deleted.

No rollback deletion command exists because safe provenance cannot yet be guaranteed for every reused Medusa Store. Recovery is restore/branch based as specified by the Neon runbook.
