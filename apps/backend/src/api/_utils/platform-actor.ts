import type { MedusaRequest } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

export const requirePlatformActorId = (req: MedusaRequest): string => {
  const actorId = (req as any).auth_context?.actor_id

  if (typeof actorId !== "string" || !actorId) {
    throw new MedusaError(
      MedusaError.Types.FORBIDDEN,
      "Platform administrator authentication is required.",
    )
  }

  return actorId
}
