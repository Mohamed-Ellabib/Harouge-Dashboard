import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getPlatformSuperAdminActor } from "../../../../_utils/platform-super-admin"
import { readCreationDraft, saveCreationDraft, deleteCreationDraft } from "../../../../_utils/store-creation-drafts"
import { creationCatalog } from "../../../../_utils/store-creation-contract"

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  getPlatformSuperAdminActor(req)
  res.setHeader("Cache-Control", "no-store")
  const draft = await readCreationDraft(req.scope, req.params.id)
  return res.json({ draft, catalog: creationCatalog(draft.values, draft.id) })
}
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  getPlatformSuperAdminActor(req)
  res.setHeader("Cache-Control", "no-store")
  const draft = await saveCreationDraft(req.scope, req.params.id, req.body)
  return res.json({ draft, catalog: creationCatalog(draft.values, draft.id) })
}

export async function DELETE(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  getPlatformSuperAdminActor(req)
  res.setHeader("Cache-Control", "no-store")
  return res.json(await deleteCreationDraft(req.scope, req.params.id, req.body))
}
