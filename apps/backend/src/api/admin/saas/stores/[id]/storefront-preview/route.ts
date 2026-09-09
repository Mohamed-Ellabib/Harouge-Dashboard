import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { buildPlatformStorefrontPreview } from "../../../../../_utils/platform-storefront-preview"
import { getPlatformSuperAdminActor } from "../../../../../_utils/platform-super-admin"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  await getPlatformSuperAdminActor(req as any)
  const preview = await buildPlatformStorefrontPreview(req, req.params.id)
  res.setHeader("Cache-Control", "no-store")
  return res.json(preview)
}
