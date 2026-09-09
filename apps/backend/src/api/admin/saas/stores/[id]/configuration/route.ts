import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import { getPlatformSuperAdminActor } from "../../../../../_utils/platform-super-admin"
import {
  readPlatformStoreConfiguration,
  updatePlatformStoreConfiguration,
} from "../../../../../_utils/platform-store-configuration"

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  await getPlatformSuperAdminActor(req)
  const result = await readPlatformStoreConfiguration(req.scope, req.params.id)
  res.setHeader("Cache-Control", "no-store")
  return res.status(200).json(result)
}

export async function PUT(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const actor = await getPlatformSuperAdminActor(req)
  const result = await updatePlatformStoreConfiguration(
    req.scope,
    req.params.id,
    req.body,
    actor.id,
  )
  res.setHeader("Cache-Control", "no-store")
  return res.status(200).json(result)
}
