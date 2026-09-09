import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getPlatformSuperAdminActor } from "../../../../../_utils/platform-super-admin"
import { creationTrialCommand } from "../../../../../_utils/store-creation-drafts"

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  getPlatformSuperAdminActor(req)
  res.setHeader("Cache-Control", "no-store")
  return res.json({ result: await creationTrialCommand(req.scope, req.params.id, req.body) })
}
