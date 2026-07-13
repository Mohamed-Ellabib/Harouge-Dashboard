import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import {
  MAX_VENDOR_PASSWORD_LENGTH,
  createVendorSessionToken,
  getVendorPasswordHash,
  getVendorSessionVersion,
  setVendorSessionCookie,
  verifyVendorPassword,
} from "../../../_utils/vendor-auth"
import {
  getVendorLoginSource,
  vendorLoginRateLimiter,
} from "../../../_utils/vendor-login-rate-limit"
import {
  domainsForVendor,
  getMarketplaceService,
  normalizeEmail,
  serializeVendorProfile,
  resolveVendorSalesChannel,
} from "../../../_utils/vendors"

type VendorLoginBody = {
  email?: unknown
  password?: unknown
}

const DUMMY_VENDOR_PASSWORD_HASH =
  "scrypt$bWVkdXNhLWR1bW15LWxvZ2luLXNhbHQ$MCb60ByrqzY8O4BA3Z4DvUCKYCOTMh4V7m_yV5835QVV05NlHJwtwbIwgKyV04zKIXcrCwF3Hkx3JWQGjy99Hw"

const invalidCredentials = (res: MedusaResponse) => {
  return res.status(401).json({
    message: "Invalid vendor credentials.",
  })
}

export async function POST(
  req: MedusaRequest<VendorLoginBody>,
  res: MedusaResponse
) {
  const marketplace = getMarketplaceService(req)
  const body = req.body ?? {}
  const email = normalizeEmail(body.email)
  const password = typeof body.password === "string" ? body.password : ""
  const rateLimitInput = {
    source: getVendorLoginSource(req),
    identifier: email || "invalid",
  }
  const rateLimit = vendorLoginRateLimiter.check(rateLimitInput)

  if (!rateLimit.allowed) {
    res.setHeader("Retry-After", String(rateLimit.retryAfterSeconds))
    return res.status(429).json({
      message: "Too many login attempts. Try again later.",
    })
  }

  const validShape =
    email.length <= 320 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
    password.length >= 8 &&
    password.length <= MAX_VENDOR_PASSWORD_LENGTH

  if (!validShape) {
    vendorLoginRateLimiter.recordFailure(rateLimitInput)
    return invalidCredentials(res)
  }

  const members = await marketplace.listVendorMembers({
    email,
    status: "active",
  })
  const exactMembers = members.filter(
    (candidate) => normalizeEmail(candidate.email) === email
  )
  const member = exactMembers.length === 1 ? exactMembers[0] : null
  const passwordHash = member ? getVendorPasswordHash(member.metadata) : null
  const passwordValid = await verifyVendorPassword(
    password,
    passwordHash ?? DUMMY_VENDOR_PASSWORD_HASH
  )

  if (!member || !passwordValid) {
    vendorLoginRateLimiter.recordFailure(rateLimitInput)
    return invalidCredentials(res)
  }

  const vendor = await marketplace
    .retrieveVendor(member.vendor_id)
    .catch(() => null)

  if (!vendor || vendor.status !== "active") {
    vendorLoginRateLimiter.recordFailure(rateLimitInput)
    return invalidCredentials(res)
  }

  const salesChannel = await resolveVendorSalesChannel(req, vendor).catch(() => null)

  if (!salesChannel) {
    vendorLoginRateLimiter.recordFailure(rateLimitInput)
    return invalidCredentials(res)
  }

  vendorLoginRateLimiter.recordSuccess(rateLimitInput)
  const { token, expiresAt } = createVendorSessionToken({
    member_id: member.id,
    vendor_id: vendor.id,
    session_version: getVendorSessionVersion(member.metadata),
  })
  const domains = await marketplace.listVendorDomains()

  setVendorSessionCookie(res, token, expiresAt)

  return res.json({
    vendor: serializeVendorProfile(vendor, domainsForVendor(domains, vendor.id)),
    member: {
      id: member.id,
      email: member.email,
      role: member.role,
      status: member.status,
    },
  })
}
