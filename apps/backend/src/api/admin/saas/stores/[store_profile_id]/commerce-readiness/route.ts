import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import { requirePlatformActorId } from "../../../../../_utils/platform-actor"
import { SAAS_MODULE } from "../../../../../../modules/saas"
import { serializeCommerceReadiness } from "../../../../../../workflows/commerce-readiness-state"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  requirePlatformActorId(req)
  const saas = req.scope.resolve(SAAS_MODULE) as any
  await saas.retrieveStoreProfile(req.params.store_profile_id)
  const records = await saas.listStoreCommerceReadinesses({
    store_profile_id: req.params.store_profile_id,
  })

  if (records.length !== 1) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "The Store commerce-readiness record is missing or ambiguous.",
    )
  }

  return res.json({
    commerce_readiness: serializeCommerceReadiness(records[0]),
  })
}
