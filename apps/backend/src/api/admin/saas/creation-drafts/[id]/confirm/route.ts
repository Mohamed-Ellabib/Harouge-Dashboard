import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getPlatformSuperAdminActor } from "../../../../../_utils/platform-super-admin"
import { confirmCreationDraft } from "../../../../../_utils/store-creation-drafts"

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const actor = getPlatformSuperAdminActor(req)
  res.setHeader("Cache-Control", "no-store")
  try {
    return res.json({ draft: await confirmCreationDraft(req.scope, req.params.id, req.body, actor.id) })
  } catch (error) {
    if (error instanceof Error && (error as Error & { creation_safe?: boolean }).creation_safe === true) {
      return res.status(409).json({ message: error.message })
    }
    // Provisioning can include provider errors. Never expose them or the
    // transient owner password in an HTTP response or log.
    return res.status(409).json({ message: "Confirmation did not finish. Check the owner account, unique handle and saved revision, then retry this draft. Completed steps are retained; no new draft is needed." })
  }
}
