import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import { requirePlatformActorId } from "../../../../_utils/platform-actor"
import { SAAS_MODULE } from "../../../../../modules/saas"
import { serializeCommerceSetupStatus } from "../../../../../workflows/commerce-readiness-state"
import { setupStoreCommerceWorkflow } from "../../../../../workflows/setup-store-commerce"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  requirePlatformActorId(req)
  const saas = req.scope.resolve(SAAS_MODULE) as any
  const record = await saas.retrieveStoreCommerceSetup(req.params.id)

  return res.json({
    commerce_setup: serializeCommerceSetupStatus(record),
  })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const actorId = requirePlatformActorId(req)
  const saas = req.scope.resolve(SAAS_MODULE) as any
  const record = await saas.retrieveStoreCommerceSetup(req.params.id)

  if (record.status === "requires_attention") {
    throw new MedusaError(
      MedusaError.Types.CONFLICT,
      "Commerce setup requires operator attention and cannot be retried automatically.",
    )
  }

  const snapshot = record.request_snapshot
  const shippingOption =
    snapshot && typeof snapshot === "object" && !Array.isArray(snapshot)
      ? snapshot.shipping_option
      : null

  if (!shippingOption || typeof shippingOption !== "object") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "The original commerce setup request is unavailable.",
    )
  }

  const { result } = await setupStoreCommerceWorkflow(req.scope).run({
    input: {
      idempotency_key: record.idempotency_key,
      actor_id: actorId,
      store_profile_id: record.store_profile_id,
      request: { shipping_option: shippingOption },
    },
  })

  return res.json({ commerce_setup: result })
}
