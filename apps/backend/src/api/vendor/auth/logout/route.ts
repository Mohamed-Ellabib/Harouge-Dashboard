import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { clearVendorSessionCookie } from "../../../_utils/vendor-auth"

const clearSession = (_req: MedusaRequest, res: MedusaResponse) => {
  clearVendorSessionCookie(res)

  return res.json({
    success: true,
  })
}

export const POST = clearSession
export const DELETE = clearSession
