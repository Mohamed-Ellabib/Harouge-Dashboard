import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MedusaError } from "@medusajs/framework/utils";

import { resolveStoreCommerceConfiguration } from "../../../_utils/checkout-store-policy";
import { getPublicStoreContext } from "../../../_utils/public-store-context";
import { assertStoreOnlineCheckoutReady } from "../../../_utils/store-commerce-readiness";
import { listAvailableStorefrontPaymentMethods } from "../../../../modules/saas/storefront-order-payment";

const unavailable = {
  online_checkout: {
    status: "unavailable" as const,
    currency_code: null,
    country_codes: [] as string[],
    payment_methods: [] as string[],
  },
};

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  res.setHeader("Cache-Control", "no-store");
  const context = getPublicStoreContext(req);

  if (!context) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "Storefront was not found.",
    );
  }

  try {
    await assertStoreOnlineCheckoutReady(
      req,
      context.storeProfileId,
      context.medusaStoreId,
      { validateGraph: true },
    );
    const [commerce, paymentMethods] = await Promise.all([
      resolveStoreCommerceConfiguration(req, context.medusaStoreId),
      listAvailableStorefrontPaymentMethods(req.scope, context.storeProfileId),
    ]);

    return res.json({
      online_checkout: {
        status: "available",
        currency_code: commerce.currencyCode,
        country_codes: commerce.countryCodes,
        payment_methods: paymentMethods,
      },
    });
  } catch {
    return res.json(unavailable);
  }
}
