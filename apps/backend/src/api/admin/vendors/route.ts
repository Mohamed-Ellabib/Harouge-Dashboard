import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import {
  domainsForVendor,
  findDomainConflict,
  getMarketplaceService,
  listVendorProductLinks,
  membersForVendor,
  normalizeHandle,
  parseEmails,
  parseDomains,
  recordOrNull,
  serializeAdminVendor,
  statusOrDefault,
  stringOrNull,
  syncVendorMembers,
  type VendorPayload,
} from "../../_utils/vendors"
import { normalizeVendorPassword } from "../../_utils/vendor-auth"

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

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const marketplace = getMarketplaceService(req)
  const body = (req.body ?? {}) as VendorPayload
  const hasMemberPassword =
    body.member_password !== undefined &&
    body.member_password !== null &&
    body.member_password !== ""

  if (hasMemberPassword && !normalizeVendorPassword(body.member_password)) {
    return res.status(400).json({
      message: "Vendor member password must be at least 8 characters.",
    })
  }

  const name = stringOrNull(body.name)

  if (!name) {
    return res.status(400).json({
      message: "Vendor name is required.",
    })
  }

  const handle = normalizeHandle(body.handle) || normalizeHandle(name)

  if (!handle) {
    return res.status(400).json({
      message: "Vendor handle is required.",
    })
  }

  const existingVendors = await marketplace.listVendors({ handle })

  if (existingVendors.length) {
    return res.status(409).json({
      message: "A vendor with this handle already exists.",
    })
  }

  const domainValues = parseDomains(body.domains)
  const existingDomains = await marketplace.listVendorDomains()
  const domainConflict = findDomainConflict(existingDomains, domainValues)

  if (domainConflict) {
    return res.status(409).json({
      message: `Domain ${domainConflict.domain} is already assigned to another vendor.`,
    })
  }

  const vendor = await marketplace.createVendors({
    name,
    handle,
    status: statusOrDefault(body.status),
    contact_email: stringOrNull(body.contact_email),
    logo_url: stringOrNull(body.logo_url),
    primary_color: stringOrNull(body.primary_color),
    metadata: recordOrNull(body.metadata),
  })

  if (domainValues.length) {
    await marketplace.createVendorDomains(
      domainValues.map((domain, index) => ({
        domain,
        is_primary: index === 0,
        vendor_id: vendor.id,
      })) as any
    )
  }

  const memberEmails =
    body.members === undefined
      ? parseEmails(body.contact_email)
      : parseEmails(body.members)

  if (memberEmails.length) {
    await syncVendorMembers(req, vendor.id, memberEmails, body.member_password)
  }

  const domains = await marketplace.listVendorDomains()
  const members = await marketplace.listVendorMembers({ vendor_id: vendor.id })

  res.status(201).json({
    vendor: serializeAdminVendor(
      vendor,
      domainsForVendor(domains, vendor.id),
      members
    ),
  })
}
