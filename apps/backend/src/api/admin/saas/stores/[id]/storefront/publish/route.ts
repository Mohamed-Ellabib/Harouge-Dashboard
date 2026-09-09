import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import { getPlatformSuperAdminActor } from "../../../../../../_utils/platform-super-admin"
import { publishPlatformStorefront } from "../../../../../../../modules/saas/platform-storefront-document"

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const actor = await getPlatformSuperAdminActor(req)
  const result = await publishPlatformStorefront(
    req.scope,
    req.params.id,
    req.body,
    actor.id,
  )
  res.setHeader("Cache-Control", "no-store")
  return res.status(200).json(result)
}
