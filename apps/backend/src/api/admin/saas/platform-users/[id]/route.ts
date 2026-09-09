import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import { getPlatformSuperAdminActor } from "../../../../_utils/platform-super-admin"
import {
  deletePlatformUser,
  updatePlatformUser,
} from "../../../../_utils/platform-users"

export async function PATCH(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const actor = await getPlatformSuperAdminActor(req)
  res.setHeader("Cache-Control", "no-store")
  return res.status(200).json(
    await updatePlatformUser(req.scope, req.params.id, req.body, actor.id),
  )
}

export async function DELETE(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const actor = await getPlatformSuperAdminActor(req)
  res.setHeader("Cache-Control", "no-store")
  return res.status(200).json(
    await deletePlatformUser(req.scope, req.params.id, actor.id),
  )
}
