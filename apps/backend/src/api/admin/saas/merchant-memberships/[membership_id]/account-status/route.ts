import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { updatePlatformMerchantAccountStatus } from "../../../../../_utils/platform-merchant-memberships"

type UpdateMerchantAccountStatusBody = {
  status?: unknown
}

export async function PATCH(
  req: MedusaRequest<UpdateMerchantAccountStatusBody>,
  res: MedusaResponse,
) {
  const result = await updatePlatformMerchantAccountStatus(
    req.scope,
    req.params.membership_id,
    req.body,
  )

  res.setHeader("Cache-Control", "no-store")
  return res.status(200).json(result)
}
