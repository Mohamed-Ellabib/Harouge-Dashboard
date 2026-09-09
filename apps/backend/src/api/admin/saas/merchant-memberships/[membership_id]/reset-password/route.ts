import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { resetPlatformMerchantAccountPassword } from "../../../../../_utils/platform-merchant-memberships"

type ResetMerchantPasswordBody = {
  temporary_password?: unknown
}

export async function POST(
  req: MedusaRequest<ResetMerchantPasswordBody>,
  res: MedusaResponse,
) {
  const result = await resetPlatformMerchantAccountPassword(
    req.scope,
    req.params.membership_id,
    req.body,
  )

  res.setHeader("Cache-Control", "no-store")
  return res.status(200).json(result)
}
