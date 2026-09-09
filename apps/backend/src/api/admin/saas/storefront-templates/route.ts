import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import { getPlatformSuperAdminActor } from "../../../_utils/platform-super-admin"
import { listPlatformStorefrontTemplates } from "../../../../modules/saas/platform-storefront-document"
import { CREATION_TEMPLATE_KEYS } from "../../../_utils/template-creation-presets"
import { initialCreationValues } from "../../../_utils/store-creation-contract"

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  await getPlatformSuperAdminActor(req)
  const result = await listPlatformStorefrontTemplates(req.scope)
  res.setHeader("Cache-Control", "no-store")
  const creation_previews = Object.fromEntries(CREATION_TEMPLATE_KEYS.map(key => [key, initialCreationValues(key)]))
  return res.status(200).json({ ...result, creation_previews })
}
