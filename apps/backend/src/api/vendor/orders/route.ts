import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import {
  getMerchantStoreContext,
  requireMerchantPermission
} from "../../_utils/merchant-store-context"
import { listMerchantOrders } from "../../_utils/merchant-order"
import { listExclusivelyOwnedCanonicalProductIds } from "../../_utils/legacy-vendor-compatibility"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const context = await getMerchantStoreContext(req)
  requireMerchantPermission(context, "orders.read")
  const productIds = new Set(
    await listExclusivelyOwnedCanonicalProductIds(req, context.medusaStoreId)
  )
  const orders = await listMerchantOrders(req, context.medusaStoreId, productIds)

  return res.json({ orders, count: orders.length })
}
