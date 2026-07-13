# Phase 2B Cart and Order Backfill

## Command

```powershell
npm.cmd run saas:backfill-cart-order-store --workspace apps/backend -- --dry-run
npm.cmd run saas:backfill-cart-order-store --workspace apps/backend -- --apply
```

Dry-run is the default. Apply requires `NODE_ENV=test`, a dedicated `TEST_DATABASE_URL` selected as `DATABASE_URL`, the disposable-database guard, and a local/non-remote target. The command refuses protected or remote database hosts and does not contain a production override.

## Evidence and decisions

The command evaluates canonical Product Store links, Sales Channel to Store relationships, Cart/Order item ownership, related Cart evidence, and temporary legacy Vendor item evidence. It links only when all available evidence identifies one Store without conflict. It reports and skips unowned, mixed-Store, channel mismatch, missing Product ownership, and ambiguous records.

Dry-run performs no link writes. Apply preserves core Cart/Order records, creates only missing unambiguous links, and is idempotent. Existing exact links count as already linked. Conflicting links are never replaced automatically. Repeated runs retain reconciliation counts.

## Production status

Local disposable-database validation is in scope. Neon and production execution are blocked and require the separate migration runbook, credential-rotation confirmation, backups, isolated rehearsal, conflict review, and explicit authorization.
