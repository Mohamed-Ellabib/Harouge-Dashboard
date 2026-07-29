import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MedusaError } from "@medusajs/framework/utils";

import { resolveStoreCommerceConfiguration } from "../../../../../_utils/checkout-store-policy";
import { getPublicStoreContext } from "../../../../../_utils/public-store-context";
import { assertStoreOnlineCheckoutReady } from "../../../../../_utils/store-commerce-readiness";
import { resolveStorefrontPurchaseOptions } from "../../../../../_utils/storefront-commerce";

const notFound = () =>
  new MedusaError(MedusaError.Types.NOT_FOUND, "Product was not found.");

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  res.setHeader("Cache-Control", "no-store");
  const context = getPublicStoreContext(req);

  if (!context) {
    throw notFound();
  }

  try {
    await assertStoreOnlineCheckoutReady(
      req,
      context.storeProfileId,
      context.medusaStoreId,
      { validateGraph: true },
    );
    const commerce = await resolveStoreCommerceConfiguration(
      req,
      context.medusaStoreId,
    );
    const purchaseOptions = await resolveStorefrontPurchaseOptions(
      req,
      context,
      commerce,
      req.params.handle,
    );

    return res.json(purchaseOptions);
  } catch {
    throw notFound();
  }
}
