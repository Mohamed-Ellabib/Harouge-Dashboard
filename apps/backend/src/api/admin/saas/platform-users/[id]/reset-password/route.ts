import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import { getPlatformSuperAdminActor } from "../../../../../_utils/platform-super-admin"
import { resetPlatformUserPassword } from "../../../../../_utils/platform-users"

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  await getPlatformSuperAdminActor(req)
  res.setHeader("Cache-Control", "no-store")
  return res.status(200).json(
    await resetPlatformUserPassword(req.scope, req.params.id, req.body),
  )
}
