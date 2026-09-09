import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { getPublicStoreContext } from "../../../_utils/public-store-context"
import { readTrackedOrder } from "../../../_utils/store-order-progress"
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  res.setHeader("Cache-Control", "no-store")
  res.setHeader("Referrer-Policy", "no-referrer")
  const context = getPublicStoreContext(req)
  if (!context) throw new MedusaError(MedusaError.Types.NOT_FOUND, "Order status was not found.")
  return res.json({ order: await readTrackedOrder(req.scope, context.medusaStoreId, (req.body as { token?: unknown })?.token) })
}
