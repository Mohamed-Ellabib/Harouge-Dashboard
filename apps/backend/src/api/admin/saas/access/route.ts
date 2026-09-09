import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import { getPlatformSuperAdminActor } from "../../../_utils/platform-super-admin"

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
) => {
  const actor = getPlatformSuperAdminActor(req)

  res.setHeader("Cache-Control", "no-store")
  res.status(200).json({
    authorized: true,
    actor,
  })
}
