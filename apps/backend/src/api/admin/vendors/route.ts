import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import {
  domainsForVendor,
  getMarketplaceService,
  listVendorProductLinks,
  membersForVendor,
  serializeAdminVendor,
} from "../../_utils/vendors"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const marketplace = getMarketplaceService(req)
  const query = typeof req.query.q === "string" ? req.query.q.toLowerCase() : ""

  const vendors = await marketplace.listVendors()
  const domains = await marketplace.listVendorDomains()
  const members = await marketplace.listVendorMembers()
  const productLinks = await listVendorProductLinks(req)

  const filtered = query
    ? vendors.filter((vendor) => {
        const vendorDomains = domainsForVendor(domains, vendor.id)

        return [
          vendor.name,
          vendor.handle,
          vendor.contact_email,
          ...vendorDomains.map((domain) => domain.domain),
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query))
      })
    : vendors

  res.json({
    vendors: filtered.map((vendor) => {
      const vendorProductCount = productLinks.filter(
        (link) => link.vendor_id === vendor.id
      ).length

      return serializeAdminVendor(
        vendor,
        domainsForVendor(domains, vendor.id),
        membersForVendor(members, vendor.id),
        vendorProductCount
      )
    }),
    count: filtered.length,
  })
}

export async function POST(_req: MedusaRequest, res: MedusaResponse) {
  return res.status(409).json({
    code: "legacy_vendor_creation_disabled",
    message:
      "Standalone Vendor creation is disabled. Use the canonical SaaS provisioning workflow.",
  })
}
