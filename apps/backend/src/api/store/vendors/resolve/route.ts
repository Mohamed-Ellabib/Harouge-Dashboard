import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import {
  domainsForVendor,
  getDomainVendorId,
  getMarketplaceService,
  normalizeDomain,
  serializePublicStoreProfile,
} from "../../../_utils/vendors"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const marketplace = getMarketplaceService(req)
  const domain = normalizeDomain(req.query.domain ?? req.headers.host)

  if (!domain) {
    return res.status(400).json({
      message: "A domain is required.",
    })
  }

  const domains = await marketplace.listVendorDomains()
  const vendorDomain = domains.find(
    (candidate) => normalizeDomain(candidate.domain) === domain
  )

  if (!vendorDomain) {
    return res.status(404).json({
      message: "No active vendor is configured for this domain.",
    })
  }

  const vendorId = getDomainVendorId(vendorDomain)

  if (!vendorId) {
    return res.status(404).json({
      message: "No active vendor is configured for this domain.",
    })
  }

  const vendor = await marketplace.retrieveVendor(vendorId).catch(() => null)

  if (!vendor || vendor.status !== "active") {
    return res.status(404).json({
      message: "No active vendor is configured for this domain.",
    })
  }

  res.json({
    vendor: serializePublicStoreProfile(
      vendor,
      domainsForVendor(domains, vendor.id)
    ),
  })
}
