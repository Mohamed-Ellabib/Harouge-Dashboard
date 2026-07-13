import { randomUUID } from "crypto"
import type {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import { getVendorSessionVersion } from "./vendor-auth"
import {
  domainsForVendor,
  getMarketplaceService,
  recordOrNull,
  resolveVendorSalesChannel,
} from "./vendors"

export const MERCHANT_PERMISSIONS = [
  "products.read",
  "products.write",
  "orders.read",
  "store.read",
  "store.manage",
  "security.self",
] as const

export type MerchantPermission = (typeof MERCHANT_PERMISSIONS)[number]
export type MerchantRole = "owner" | "manager"

const ROLE_PERMISSIONS: Record<MerchantRole, readonly MerchantPermission[]> = {
  owner: MERCHANT_PERMISSIONS,
  manager: [
    "products.read",
    "products.write",
    "orders.read",
    "store.read",
    "security.self",
  ],
}

export const permissionsForMerchantRole = (
  role: MerchantRole
): readonly MerchantPermission[] => ROLE_PERMISSIONS[role]

type VendorDomainContext = {
  id: string
  domain: string
  isPrimary: boolean
}

export type MerchantStoreContext = {
  merchantMemberId: string
  merchantUserId: string | null
  vendorId: string
  role: MerchantRole
  accountStatus: "active"
  storeStatus: "active"
  allowedSalesChannelId: string
  allowedPublishableKeyReference: string | null
  allowedDomains: VendorDomainContext[]
  permissions: readonly MerchantPermission[]
  requestId: string
  member: Record<string, any>
  vendor: Record<string, any>
}

const CONTEXT_KEY = "merchant_store_context"

const contextError = (message: string) =>
  new MedusaError(MedusaError.Types.FORBIDDEN, message)

const configurationError = (message: string) =>
  new MedusaError(MedusaError.Types.INVALID_DATA, message)

const requestIdFor = (req: MedusaRequest): string => {
  const existing = (req as any)[CONTEXT_KEY]?.requestId
  return typeof existing === "string" ? existing : randomUUID()
}

export const resolveMerchantStoreContext = async (
  req: MedusaRequest
): Promise<MerchantStoreContext> => {
  const marketplace = getMarketplaceService(req)
  const auth = (req as any).vendor_auth

  if (
    !auth ||
    typeof auth.member_id !== "string" ||
    typeof auth.vendor_id !== "string" ||
    typeof auth.session_version !== "number"
  ) {
    throw contextError("Vendor login is required.")
  }

  const members = await marketplace.listVendorMembers({ id: auth.member_id } as any)

  if (members.length !== 1) {
    throw contextError("The merchant account is unavailable.")
  }

  const member = members[0]

  if (
    member.id !== auth.member_id ||
    member.vendor_id !== auth.vendor_id ||
    member.status !== "active" ||
    getVendorSessionVersion(member.metadata) !== auth.session_version
  ) {
    throw contextError("The merchant session is no longer valid.")
  }

  if (member.role !== "owner" && member.role !== "manager") {
    throw contextError("The merchant role is not supported.")
  }

  const vendor = await marketplace.retrieveVendor(member.vendor_id).catch(() => null)

  if (!vendor || vendor.status !== "active") {
    throw contextError("The merchant store is unavailable.")
  }

  const salesChannel = await resolveVendorSalesChannel(req, vendor)
  const domains = domainsForVendor(
    await marketplace.listVendorDomains(),
    vendor.id
  ).map((domain) => ({
    id: domain.id,
    domain: domain.domain,
    isPrimary: Boolean(domain.is_primary),
  }))
  const normalizedDomains = domains.map((domain) => domain.domain.toLowerCase())

  if (new Set(normalizedDomains).size !== normalizedDomains.length) {
    throw configurationError("The merchant store has ambiguous domain configuration.")
  }

  const metadata = recordOrNull(vendor.metadata)
  const publishableKeyReference = metadata?.publishable_api_key_id

  if (
    publishableKeyReference !== undefined &&
    (typeof publishableKeyReference !== "string" || !publishableKeyReference)
  ) {
    throw configurationError("The merchant store publishable key configuration is invalid.")
  }

  const context: MerchantStoreContext = {
    merchantMemberId: member.id,
    merchantUserId: member.user_id ?? null,
    vendorId: vendor.id,
    role: member.role,
    accountStatus: "active",
    storeStatus: "active",
    allowedSalesChannelId: salesChannel.id,
    allowedPublishableKeyReference:
      typeof publishableKeyReference === "string" ? publishableKeyReference : null,
    allowedDomains: domains,
    permissions: permissionsForMerchantRole(member.role),
    requestId: requestIdFor(req),
    member,
    vendor,
  }

  ;(req as any)[CONTEXT_KEY] = context
  return context
}

export const getMerchantStoreContext = async (
  req: MedusaRequest
): Promise<MerchantStoreContext> => {
  return (req as any)[CONTEXT_KEY] ?? resolveMerchantStoreContext(req)
}

export const requireMerchantPermission = (
  context: MerchantStoreContext,
  permission: MerchantPermission
): void => {
  if (!context.permissions.includes(permission)) {
    throw contextError("This merchant role cannot perform that operation.")
  }
}

export const attachMerchantStoreContext = async (
  req: MedusaRequest,
  _res: MedusaResponse,
  next: MedusaNextFunction
) => {
  const path = String((req as any).originalUrl ?? (req as any).url ?? "").split("?")[0]

  if (
    path.startsWith("/vendor/auth/login") ||
    path.startsWith("/vendor/auth/logout")
  ) {
    return next()
  }

  try {
    await resolveMerchantStoreContext(req)
    return next()
  } catch (error) {
    return next(error)
  }
}
