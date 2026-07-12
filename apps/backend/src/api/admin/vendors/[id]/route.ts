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
  syncVendorProducts,
  type VendorPayload,
} from "../../../_utils/vendors"
import { normalizeVendorPassword } from "../../../_utils/vendor-auth"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const marketplace = getMarketplaceService(req)
  const { id } = req.params

  const vendor = await marketplace.retrieveVendor(id).catch(() => null)

  if (!vendor) {
    return res.status(404).json({
      message: "Vendor was not found.",
    })
  }

  const domains = await marketplace.listVendorDomains()
  const members = await marketplace.listVendorMembers({ vendor_id: vendor.id })
  const productLinks = await listVendorProductLinks(req, { vendor_id: vendor.id })

  res.json({
    vendor: serializeAdminVendor(
      vendor,
      domainsForVendor(domains, vendor.id),
      members,
      productLinks.length
    ),
  })
}

export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  const marketplace = getMarketplaceService(req)
  const { id } = req.params
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

  const existing = await marketplace.retrieveVendor(id).catch(() => null)

  if (!existing) {
    return res.status(404).json({
      message: "Vendor was not found.",
    })
  }

  const update: Record<string, unknown> = {
    id,
  }

  if (body.name !== undefined) {
    const name = stringOrNull(body.name)

    if (!name) {
      return res.status(400).json({
        message: "Vendor name cannot be empty.",
      })
    }

    update.name = name
  }

  if (body.handle !== undefined) {
    const handle = normalizeHandle(body.handle)

    if (!handle) {
      return res.status(400).json({
        message: "Vendor handle cannot be empty.",
      })
    }

    const existingVendors = await marketplace.listVendors({ handle })
    const handleConflict = existingVendors.find((vendor) => vendor.id !== id)

    if (handleConflict) {
      return res.status(409).json({
        message: "A vendor with this handle already exists.",
      })
    }

    update.handle = handle
  }

  if (body.status !== undefined) {
    update.status = statusOrDefault(body.status, existing.status)
  }

  if (body.contact_email !== undefined) {
    update.contact_email = stringOrNull(body.contact_email)
  }

  if (body.logo_url !== undefined) {
    update.logo_url = stringOrNull(body.logo_url)
  }

  if (body.primary_color !== undefined) {
    update.primary_color = stringOrNull(body.primary_color)
  }

  if (body.metadata !== undefined) {
    update.metadata = recordOrNull(body.metadata)
  }

  const allDomains = await marketplace.listVendorDomains()
  const domainValues =
    body.domains === undefined ? undefined : parseDomains(body.domains)

  if (domainValues) {
    const domainConflict = findDomainConflict(allDomains, domainValues, id)

    if (domainConflict) {
      return res.status(409).json({
        message: `Domain ${domainConflict.domain} is already assigned to another vendor.`,
      })
    }
  }

  const vendor = await marketplace.updateVendors(update as any)

  if (domainValues) {
    const currentDomains = domainsForVendor(allDomains, id)

    if (currentDomains.length) {
      await marketplace.deleteVendorDomains(
        currentDomains.map((domain) => domain.id)
      )
    }

    if (domainValues.length) {
      await marketplace.createVendorDomains(
        domainValues.map((domain, index) => ({
          domain,
          is_primary: index === 0,
          vendor_id: id,
        })) as any
      )
    }
  }

  if (body.members !== undefined || hasMemberPassword) {
    const memberEmails =
      body.members === undefined
        ? (await marketplace.listVendorMembers({ vendor_id: id })).map(
            (member) => member.email
          )
        : parseEmails(body.members)

    await syncVendorMembers(req, id, memberEmails, body.member_password)
  }

  const domains = await marketplace.listVendorDomains()
  const members = await marketplace.listVendorMembers({ vendor_id: vendor.id })
  const productLinks = await listVendorProductLinks(req, { vendor_id: vendor.id })

  res.json({
    vendor: serializeAdminVendor(
      vendor,
      domainsForVendor(domains, vendor.id),
      members,
      productLinks.length
    ),
  })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const marketplace = getMarketplaceService(req)
  const { id } = req.params

  const existing = await marketplace.retrieveVendor(id).catch(() => null)

  if (!existing) {
    return res.status(404).json({
      message: "Vendor was not found.",
    })
  }

  const allDomains = await marketplace.listVendorDomains()
  const currentDomains = domainsForVendor(allDomains, id)

  if (currentDomains.length) {
    await marketplace.deleteVendorDomains(
      currentDomains.map((domain) => domain.id)
    )
  }

  const currentMembers = await marketplace.listVendorMembers({ vendor_id: id })

  if (currentMembers.length) {
    await marketplace.deleteVendorMembers(
      currentMembers.map((member) => member.id)
    )
  }

  await syncVendorProducts(req, id, [])
  await marketplace.deleteVendors(id)

  res.status(204).send()
}
