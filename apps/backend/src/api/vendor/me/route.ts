import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import {
  domainsForVendor,
  getAuthenticatedVendor,
  getMarketplaceService,
  serializeVendorProfile,
} from "../../_utils/vendors"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const context = await getAuthenticatedVendor(req)

  if (!context) {
    return res.status(403).json({
      message: "This user is not linked to an active vendor.",
    })
  }

  const marketplace = getMarketplaceService(req)
  const domains = await marketplace.listVendorDomains()

  res.json({
    vendor: serializeVendorProfile(
      context.vendor,
      domainsForVendor(domains, context.vendor.id)
    ),
    member: {
      id: context.member.id,
      email: context.member.email,
      role: context.member.role,
      status: context.member.status,
    },
  })
}
