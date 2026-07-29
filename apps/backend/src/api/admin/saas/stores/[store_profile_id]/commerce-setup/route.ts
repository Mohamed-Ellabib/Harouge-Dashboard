import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import {
  platformProvisioningRateLimiter,
  provisioningRequestSource,
} from "../../../../../_utils/platform-provisioning-rate-limit"
import { requirePlatformActorId } from "../../../../../_utils/platform-actor"
import { setupStoreCommerceWorkflow } from "../../../../../../workflows/setup-store-commerce"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const actorId = requirePlatformActorId(req)
  const rateLimit = platformProvisioningRateLimiter.check({
    actorId,
    source: provisioningRequestSource(req),
  })

  if (!rateLimit.allowed) {
    res.setHeader("Retry-After", String(rateLimit.retryAfterSeconds))
    return res.status(429).json({
      message: "Too many commerce setup requests. Try again later.",
    })
  }

  const header = req.headers["idempotency-key"]
  const idempotencyKey = Array.isArray(header) ? header[0] : (header ?? "")
  const { result } = await setupStoreCommerceWorkflow(req.scope).run({
    input: {
      idempotency_key: idempotencyKey,
      actor_id: actorId,
      store_profile_id: req.params.store_profile_id,
      request: req.body,
    },
  })

  return res.status(201).json({ commerce_setup: result })
}
