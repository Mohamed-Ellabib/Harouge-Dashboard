import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { listPlatformMerchantMemberships } from "../../../_utils/platform-merchant-memberships"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  res.setHeader("Cache-Control", "no-store")
  return res.status(200).json(
    await listPlatformMerchantMemberships(req.scope, req.query),
  )
}
