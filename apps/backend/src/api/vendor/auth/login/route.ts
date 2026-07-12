import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import {
  createVendorSessionToken,
  getVendorPasswordHash,
  setVendorSessionCookie,
  verifyVendorPassword,
} from "../../../_utils/vendor-auth"
import {
  domainsForVendor,
  getMarketplaceService,
  normalizeEmail,
  serializeStoreVendor,
} from "../../../_utils/vendors"

type VendorLoginBody = {
  email?: unknown
  password?: unknown
}

export async function POST(
  req: MedusaRequest<VendorLoginBody>,
  res: MedusaResponse
) {
  const marketplace = getMarketplaceService(req)
  const body = req.body ?? {}
  const email = normalizeEmail(body.email)
  const password = typeof body.password === "string" ? body.password : ""

  if (!email || !password) {
    return res.status(400).json({
      message: "Email and password are required.",
    })
  }

  const members = await marketplace.listVendorMembers({
    email,
    status: "active",
  })
  const member = members.find(
    (candidate) => normalizeEmail(candidate.email) === email
  )
  const passwordHash = member ? getVendorPasswordHash(member.metadata) : null

  if (!member || !verifyVendorPassword(password, passwordHash)) {
    return res.status(401).json({
      message: "Invalid vendor credentials.",
    })
  }

  const vendor = await marketplace
    .retrieveVendor(member.vendor_id)
    .catch(() => null)

  if (!vendor || vendor.status !== "active") {
    return res.status(403).json({
      message: "This vendor is not active.",
    })
  }

  const { token, expiresAt } = createVendorSessionToken({
    member_id: member.id,
    vendor_id: vendor.id,
  })
  const domains = await marketplace.listVendorDomains()

  setVendorSessionCookie(res, token, expiresAt)

  return res.json({
    vendor: serializeStoreVendor(vendor, domainsForVendor(domains, vendor.id)),
    member: {
      id: member.id,
      email: member.email,
      role: member.role,
      status: member.status,
    },
  })
}
