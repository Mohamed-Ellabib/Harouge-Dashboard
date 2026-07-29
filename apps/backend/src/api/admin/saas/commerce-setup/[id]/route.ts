import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { requirePlatformActorId } from "../../../../_utils/platform-actor"
import { SAAS_MODULE } from "../../../../../modules/saas"
import { serializeCommerceSetupStatus } from "../../../../../workflows/commerce-readiness-state"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  requirePlatformActorId(req)
  const saas = req.scope.resolve(SAAS_MODULE) as any
  const record = await saas.retrieveStoreCommerceSetup(req.params.id)

  return res.json({
    commerce_setup: serializeCommerceSetupStatus(record),
  })
}
