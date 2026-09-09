import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { revokePlatformMerchantAccountSessions } from "../../../../../_utils/platform-merchant-memberships"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const result = await revokePlatformMerchantAccountSessions(
    req.scope,
    req.params.membership_id,
    req.body,
  )

  res.setHeader("Cache-Control", "no-store")
  return res.status(200).json(result)
}
