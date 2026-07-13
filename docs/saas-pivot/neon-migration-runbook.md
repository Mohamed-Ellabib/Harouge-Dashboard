# Future Neon Migration Runbook

Status: not authorized and not executed.

1. Owner confirms rotation of the previously exposed credential without sharing either value.
2. Create a Neon backup or isolated branch.
3. Restore that backup to a separate target and verify the restore.
4. Configure the protected target identity outside source control.
5. Run schema and link diagnostics against the isolated branch.
6. Run the backfill in dry-run mode and archive the sanitized conflict report.
7. Obtain explicit owner approval and choose a maintenance/read-only strategy.
8. Apply schema, synchronize links, then apply the backfill.
9. Reconcile Vendor, StoreProfile, Medusa Store, domain, membership, product-owner, and channel counts.
10. At the decision point, either continue or restore/redirect to the verified backup.

Production apply support is intentionally disabled in the Phase 2A command. A separately reviewed approval mechanism is required before this runbook can be executed.

## Future Cart and Order ownership migration

Before any protected-environment apply, extend the isolated restore rehearsal to include:

1. Synchronize `store_cart` and `store_order` links and verify their unique ownership indexes.
2. Run `npm run saas:backfill-cart-order-store -- --dry-run` against the isolated restore.
3. Review unowned, mixed, channel-mismatch, missing-product-owner, and ambiguous records without guessing.
4. Resolve conflicts through an approved data decision log; do not modify source records silently.
5. Run the apply command only with the separately reviewed protected-target authorization mechanism.
6. Rerun dry-run and reconcile exact Cart, Order, Store-link, conflict, and repair-record counts.
7. Verify merchant APIs fail closed for every record still missing or having ambiguous ownership.
8. Exercise checkout rollback and Store-Order link failure recovery before traffic is restored.

The Phase 2B command deliberately refuses remote/protected targets. This runbook does not authorize Neon access.
