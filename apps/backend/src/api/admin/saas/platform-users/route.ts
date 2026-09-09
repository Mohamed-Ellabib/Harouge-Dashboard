import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import { getPlatformSuperAdminActor } from "../../../_utils/platform-super-admin"
import {
  createPlatformUser,
  listPlatformUsers,
} from "../../../_utils/platform-users"

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  await getPlatformSuperAdminActor(req)
  res.setHeader("Cache-Control", "no-store")
  return res.status(200).json(await listPlatformUsers(req.scope))
}

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  await getPlatformSuperAdminActor(req)
  res.setHeader("Cache-Control", "no-store")
  return res.status(201).json(await createPlatformUser(req.scope, req.body))
}
