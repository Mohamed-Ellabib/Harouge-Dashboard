import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { buildPlatformPortfolio } from "../../../_utils/platform-portfolio"
import { requirePlatformActorId } from "../../../_utils/platform-actor"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  requirePlatformActorId(req)
  return res.json(await buildPlatformPortfolio(req))
}
