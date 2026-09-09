import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import { getPlatformSuperAdminActor } from "../../../../../../_utils/platform-super-admin"
import { installPlatformStorefrontTemplateStarter } from "../../../../../../_utils/platform-storefront-template-starter"

export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
) {
  const actor = await getPlatformSuperAdminActor(req)
  const result = await installPlatformStorefrontTemplateStarter(
    req.scope,
    req.params.id,
    req.body,
    actor.id,
  )
  res.setHeader("Cache-Control", "no-store")
  return res.status(200).json(result)
}
