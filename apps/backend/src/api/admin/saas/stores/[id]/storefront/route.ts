import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import { getPlatformSuperAdminActor } from "../../../../../_utils/platform-super-admin"
import { readPlatformStorefront } from "../../../../../../modules/saas/platform-storefront-document"

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  await getPlatformSuperAdminActor(req)
  const result = await readPlatformStorefront(req.scope, req.params.id)
  res.setHeader("Cache-Control", "no-store")
  return res.status(200).json(result)
}
