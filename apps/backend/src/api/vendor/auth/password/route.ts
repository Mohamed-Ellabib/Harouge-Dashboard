import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import {
  getVendorPasswordHash,
  hashVendorPassword,
  normalizeVendorPassword,
  verifyVendorPassword,
} from "../../../_utils/vendor-auth"
import {
  getAuthenticatedVendor,
  getMarketplaceService,
  recordOrNull,
} from "../../../_utils/vendors"

type VendorPasswordBody = {
  current_password?: unknown
  new_password?: unknown
}

export async function PATCH(
  req: MedusaRequest<VendorPasswordBody>,
  res: MedusaResponse
) {
  const context = await getAuthenticatedVendor(req)

  if (!context) {
    return res.status(403).json({
      message: "This user is not linked to an active vendor.",
    })
  }

  const body = req.body ?? {}
  const currentPassword =
    typeof body.current_password === "string" ? body.current_password : ""
  const newPassword = normalizeVendorPassword(body.new_password)
  const passwordHash = getVendorPasswordHash(context.member.metadata)

  if (!currentPassword || !verifyVendorPassword(currentPassword, passwordHash)) {
    return res.status(401).json({
      message: "Current password is incorrect.",
    })
  }

  if (!newPassword) {
    return res.status(400).json({
      message: "New password must be at least 8 characters.",
    })
  }

  const marketplace = getMarketplaceService(req)

  await marketplace.updateVendorMembers([
    {
      id: context.member.id,
      metadata: {
        ...(recordOrNull(context.member.metadata) ?? {}),
        password_hash: hashVendorPassword(newPassword),
      },
    },
  ] as any)

  res.json({
    success: true,
  })
}

export const POST = PATCH
