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
