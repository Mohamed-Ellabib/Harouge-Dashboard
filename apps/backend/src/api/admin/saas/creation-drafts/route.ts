import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getPlatformSuperAdminActor } from "../../../_utils/platform-super-admin"
import { createCreationDraft, listCreationDrafts } from "../../../_utils/store-creation-drafts"

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  getPlatformSuperAdminActor(req)
  res.setHeader("Cache-Control", "no-store")
  return res.json({ drafts: await listCreationDrafts(req.scope) })
}
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const actor = getPlatformSuperAdminActor(req)
  res.setHeader("Cache-Control", "no-store")
  return res.status(201).json({ draft: await createCreationDraft(req.scope, req.body, actor.id) })
}
