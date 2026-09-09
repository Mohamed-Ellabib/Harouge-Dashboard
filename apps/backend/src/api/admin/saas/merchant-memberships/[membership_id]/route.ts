import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import {
  retrievePlatformMerchantMembership,
  updatePlatformMerchantMembership,
} from "../../../../_utils/platform-merchant-memberships"

type UpdateMerchantMembershipBody = {
  role?: unknown
  status?: unknown
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const membership = await retrievePlatformMerchantMembership(
    req.scope,
    req.params.membership_id,
  )

  res.setHeader("Cache-Control", "no-store")
  return res.status(200).json({ membership })
}

export async function PATCH(
  req: MedusaRequest<UpdateMerchantMembershipBody>,
  res: MedusaResponse,
) {
  const result = await updatePlatformMerchantMembership(
    req.scope,
    req.params.membership_id,
    req.body,
  )

  res.setHeader("Cache-Control", "no-store")
  return res.status(200).json(result)
}
