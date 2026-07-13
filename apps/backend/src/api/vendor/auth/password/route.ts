import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import {
  clearVendorSessionCookie,
  getVendorPasswordHash,
  hashVendorPassword,
  nextVendorSessionVersion,
  normalizeVendorPassword,
  verifyVendorPassword,
} from "../../../_utils/vendor-auth"
import {
  getMerchantStoreContext,
  requireMerchantPermission,
} from "../../../_utils/merchant-store-context"
import {
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
  const context = await getMerchantStoreContext(req)
  requireMerchantPermission(context, "security.self")
  const body = req.body ?? {}
  const currentPassword =
    typeof body.current_password === "string" ? body.current_password : ""
  const newPassword = normalizeVendorPassword(body.new_password)
  const passwordHash = getVendorPasswordHash(context.member.metadata)

  if (!currentPassword || !(await verifyVendorPassword(currentPassword, passwordHash))) {
    return res.status(401).json({ message: "Current password is incorrect." })
  }

  if (!newPassword) {
    return res.status(400).json({
      message: "New password must be between 8 and 1024 characters.",
    })
  }

  const marketplace = getMarketplaceService(req)
  const metadata = recordOrNull(context.member.metadata) ?? {}

  await marketplace.updateVendorMembers([
    {
      id: context.member.id,
      metadata: {
        ...metadata,
        password_hash: await hashVendorPassword(newPassword),
        session_version: nextVendorSessionVersion(metadata),
      },
    },
  ] as any)

  clearVendorSessionCookie(res)
  return res.json({ success: true, reauthentication_required: true })
}

export const POST = PATCH
