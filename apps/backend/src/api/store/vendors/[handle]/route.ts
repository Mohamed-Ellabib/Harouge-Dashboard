import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { resolvePublicStoreContext } from "../../../_utils/public-store-context"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const context = await resolvePublicStoreContext(req, {
    developmentHandleOverride: req.params.handle,
  })

  return res.json({ vendor: context.profile })
}
