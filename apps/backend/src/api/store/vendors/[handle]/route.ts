import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import {
  domainsForVendor,
  getMarketplaceService,
  normalizeHandle,
  serializePublicStoreProfile,
} from "../../../_utils/vendors"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const marketplace = getMarketplaceService(req)
  const handle = normalizeHandle(req.params.handle)

  if (!handle) {
    return res.status(400).json({
      message: "A vendor handle is required.",
    })
  }

  const vendors = await marketplace.listVendors({ handle })
  const vendor = vendors[0]

  if (!vendor || vendor.status !== "active") {
    return res.status(404).json({
      message: "Vendor was not found.",
    })
  }

  const domains = await marketplace.listVendorDomains()

  res.json({
    vendor: serializePublicStoreProfile(
      vendor,
      domainsForVendor(domains, vendor.id)
    ),
  })
}
