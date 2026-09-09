import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { createPlatformMerchantMembership } from "../../../../../_utils/platform-merchant-memberships"

type CreateMerchantMembershipBody = {
  email?: unknown
  display_name?: unknown
  role?: unknown
  reuse_existing_account?: unknown
  initial_password?: unknown
}

export async function POST(
  req: MedusaRequest<CreateMerchantMembershipBody>,
  res: MedusaResponse,
) {
  const result = await createPlatformMerchantMembership(
    req.scope,
    req.params.store_profile_id,
    req.body,
    req.headers["idempotency-key"],
  )

  res.setHeader("Cache-Control", "no-store")
  return res.status(result.created ? 201 : 200).json(result)
}
