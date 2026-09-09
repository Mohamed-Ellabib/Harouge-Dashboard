import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import { getPublicStoreContext } from "../../../../../_utils/public-store-context"
import { completeStorefrontOrder } from "../../../../../../modules/saas/storefront-order-payment"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  res.setHeader("Cache-Control", "no-store")
  const context = getPublicStoreContext(req)
  if (!context) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Cart was not found.")
  }
  const result = await completeStorefrontOrder(
    req.scope,
    context,
    req.params.cart_id,
    (req as any).validatedBody ?? (req as any).body,
    (req as any).auth_context?.actor_id,
  )
  return res.status(200).json(result)
}
