import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import {
  getMerchantStoreContext,
  requireMerchantPermission,
} from "../../_utils/merchant-store-context"
import { listMerchantOrders } from "../../_utils/merchant-order"
import { listExclusivelyOwnedProductIds } from "../../_utils/vendors"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const context = await getMerchantStoreContext(req)
  requireMerchantPermission(context, "orders.read")
  const productIds = new Set(
    await listExclusivelyOwnedProductIds(req, context.vendorId)
  )

  if (!productIds.size) {
    return res.json({ orders: [], count: 0 })
  }

  const orders = await listMerchantOrders(req, productIds)
  return res.json({ orders, count: orders.length })
}
