import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import { getPlatformSuperAdminActor } from "../../../../../../_utils/platform-super-admin"
import { readPlatformStorefrontPreview } from "../../../../../../../modules/saas/platform-storefront-document"

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  await getPlatformSuperAdminActor(req)
  const result = await readPlatformStorefrontPreview(
    req.scope,
    req.params.id,
    (req as any).query?.revision,
  )
  res.setHeader("Cache-Control", "private, no-store")
  return res.status(200).json(result)
}
