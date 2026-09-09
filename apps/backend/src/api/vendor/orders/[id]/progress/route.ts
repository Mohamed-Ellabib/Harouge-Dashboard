import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getMerchantStoreContext, requireMerchantPermission } from "../../../../_utils/merchant-store-context"
import { updateOrderProgress } from "../../../../_utils/store-order-progress"
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const context = await getMerchantStoreContext(req)
  requireMerchantPermission(context, "store.manage")
  requireMerchantPermission(context, "orders.read")
  res.setHeader("Cache-Control", "no-store")
  return res.json({ progress: await updateOrderProgress(req.scope, context.medusaStoreId, req.params.id, context.merchantMemberId, req.body) })
}
