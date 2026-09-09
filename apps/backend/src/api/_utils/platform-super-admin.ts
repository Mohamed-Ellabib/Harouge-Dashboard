import type {
  AuthenticatedMedusaRequest,
  MedusaNextFunction,
  MedusaResponse,
} from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { readValidDeviceSession } from "./platform-device-session-store"

export const PLATFORM_SUPER_ADMIN_ROLE_ID = "role_super_admin"

export type PlatformSuperAdminActor = {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
}

const CONTEXT_KEY = Symbol("platform_super_admin_actor")

const accessDenied = () =>
  new MedusaError(
    MedusaError.Types.FORBIDDEN,
    "Super Admin access is required.",
  )

const optionalString = (value: unknown): string | null =>
  typeof value === "string" && value ? value : null

export const resolvePlatformSuperAdminActor = async (
  req: AuthenticatedMedusaRequest,
): Promise<PlatformSuperAdminActor> => {
  const actorId = req.auth_context?.actor_id
  const actorType = req.auth_context?.actor_type

  if (actorType !== "user" || typeof actorId !== "string" || !actorId) {
    throw accessDenied()
  }

  try {
    const deviceHash = (req.session as any)?.platform_device_hash
    if (deviceHash && req.auth_context === req.session?.auth_context && !await readValidDeviceSession(req.scope, deviceHash, actorId)) throw accessDenied()
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY) as any
    const result = await query.graph({
      entity: "user",
      fields: [
        "id",
        "email",
        "first_name",
        "last_name",
        "avatar_url",
        "metadata",
        "rbac_roles.id",
      ],
      filters: { id: actorId },
    })
    const actors = Array.isArray(result?.data) ? result.data : []

    if (actors.length !== 1 || actors[0]?.id !== actorId) {
      throw accessDenied()
    }

    const roles = Array.isArray(actors[0].rbac_roles)
      ? actors[0].rbac_roles
      : []
    const isSuperAdmin = roles.some(
      (role: unknown) =>
        Boolean(role) &&
        typeof role === "object" &&
        (role as { id?: unknown }).id === PLATFORM_SUPER_ADMIN_ROLE_ID,
    )

    if (!isSuperAdmin) {
      throw accessDenied()
    }

    if (actors[0]?.metadata?.platform_access_status === "disabled") {
      throw accessDenied()
    }

    const email = optionalString(actors[0].email)

    if (!email) {
      throw accessDenied()
    }

    return {
      id: actorId,
      email,
      first_name: optionalString(actors[0].first_name),
      last_name: optionalString(actors[0].last_name),
      avatar_url: optionalString(actors[0].avatar_url),
    }
  } catch (error) {
    // Fail closed on every error, but distinguish an outage from revoked access
    // so the dashboard does not delete a valid device session during an outage.
    if (error instanceof MedusaError && error.type === MedusaError.Types.FORBIDDEN) throw error
    throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, "Platform access verification is temporarily unavailable.")
  }
}

export const requirePlatformSuperAdmin = async (
  req: AuthenticatedMedusaRequest,
  _res: MedusaResponse,
  next: MedusaNextFunction,
) => {
  try {
    ;(req as any)[CONTEXT_KEY] = await resolvePlatformSuperAdminActor(req)
    return next()
  } catch (error) {
    return next(error)
  }
}

export const getPlatformSuperAdminActor = (
  req: AuthenticatedMedusaRequest,
): PlatformSuperAdminActor => {
  const actor = (req as any)[CONTEXT_KEY]

  if (
    !actor ||
    typeof actor !== "object" ||
    typeof actor.id !== "string" ||
    actor.id !== req.auth_context?.actor_id
  ) {
    throw accessDenied()
  }

  return actor as PlatformSuperAdminActor
}
