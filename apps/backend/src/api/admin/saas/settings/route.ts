import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import { getPlatformSuperAdminActor } from "../../../_utils/platform-super-admin"
import {
  readPlatformSettings,
  updatePlatformSettings,
} from "../../../_utils/platform-settings"

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  await getPlatformSuperAdminActor(req)
  res.setHeader("Cache-Control", "no-store")
  return res.status(200).json(await readPlatformSettings(req.scope))
}

export async function PUT(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const actor = await getPlatformSuperAdminActor(req)
  const body = (req.body ?? {}) as Record<string, unknown>
  const result = await updatePlatformSettings(req.scope, {
    settings: body.settings,
    revision: body.revision,
    actorId: actor.id,
  })
  res.setHeader("Cache-Control", "no-store")
  return res.status(200).json(result)
}
