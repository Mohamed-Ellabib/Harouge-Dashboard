/* eslint-disable @medusajs/use-medusa-error-not-generic-error -- CLI diagnostics are not HTTP errors */
import type { ExecArgs } from "@medusajs/framework/types";

import { runCheckoutOwnershipBackfill } from "../modules/saas/checkout-ownership-backfill";

export default async function saasBackfillCartOrderStore({
  container,
}: ExecArgs): Promise<void> {
  const flags = new Set(process.argv.slice(2));
  const apply = flags.has("--apply");

  if (apply && flags.has("--dry-run")) {
    throw new Error("Choose either --dry-run or --apply, not both.");
  }

  const report = await runCheckoutOwnershipBackfill(container, { apply });
  console.log(JSON.stringify(report, null, 2));

  if (report.counts.conflicts > 0 && apply) {
    throw new Error(
      "Cart/Order backfill completed with unresolved conflicts; review the sanitized report.",
    );
  }
}
