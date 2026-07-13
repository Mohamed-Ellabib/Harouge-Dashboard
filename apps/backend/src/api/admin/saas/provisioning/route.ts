import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MedusaError } from "@medusajs/framework/utils";

import {
  platformProvisioningRateLimiter,
  provisioningRequestSource,
} from "../../../_utils/platform-provisioning-rate-limit";
import { provisionSaasStoreWorkflow } from "../../../../workflows/provision-saas-store";

const platformActorId = (req: MedusaRequest): string => {
  const actorId = (req as any).auth_context?.actor_id;

  if (typeof actorId !== "string" || !actorId) {
    throw new MedusaError(
      MedusaError.Types.FORBIDDEN,
      "Platform administrator authentication is required.",
    );
  }

  return actorId;
};

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const actorId = platformActorId(req);
  const rateLimit = platformProvisioningRateLimiter.check({
    actorId,
    source: provisioningRequestSource(req),
  });

  if (!rateLimit.allowed) {
    res.setHeader("Retry-After", String(rateLimit.retryAfterSeconds));
    return res.status(429).json({
      message: "Too many provisioning requests. Try again later.",
    });
  }

  const header = req.headers["idempotency-key"];
  const idempotencyKey = Array.isArray(header) ? header[0] : (header ?? "");
  const { result } = await provisionSaasStoreWorkflow(req.scope).run({
    input: {
      idempotency_key: idempotencyKey,
      actor_id: actorId,
      request: req.body,
    },
  });

  return res.status(201).json({ provisioning: result });
}
