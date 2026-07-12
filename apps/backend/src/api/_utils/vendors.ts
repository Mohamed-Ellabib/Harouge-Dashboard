import type { MedusaRequest } from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"

import { MARKETPLACE_MODULE } from "../../modules/marketplace"
import type MarketplaceModuleService from "../../modules/marketplace/service"
import {
  hashVendorPassword,
  normalizeVendorPassword,
} from "./vendor-auth"

export const VENDOR_STATUSES = ["draft", "active", "suspended"] as const

export type VendorStatus = (typeof VENDOR_STATUSES)[number]

export type VendorPayload = {
  name?: unknown
  handle?: unknown
  status?: unknown
  contact_email?: unknown
  logo_url?: unknown
  primary_color?: unknown
  metadata?: unknown
  domains?: unknown
  members?: unknown
  member_password?: unknown
}

type DomainRecord = Record<string, any>
type MemberRecord = Record<string, any>
type VendorRecord = Record<string, any>
type ProductRecord = Record<string, any>
type LinkRecord = Record<string, any>

export const getMarketplaceService = (
  req: MedusaRequest
): MarketplaceModuleService => {
  return req.scope.resolve(MARKETPLACE_MODULE) as MarketplaceModuleService
}

export const normalizeHandle = (value: unknown): string => {
  if (typeof value !== "string") {
    return ""
  }

  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export const normalizeDomain = (value: unknown): string => {
  if (typeof value !== "string") {
    return ""
  }

  const raw = value.trim().toLowerCase()

  if (!raw) {
    return ""
  }

  let host = raw

  try {
    const url = new URL(raw.includes("://") ? raw : `https://${raw}`)
    host = url.host
  } catch {
    host = raw.split("/")[0]
  }

  return host.replace(/^www\./, "").replace(/\.$/, "")
}

export const parseDomains = (value: unknown): string[] => {
  const domains = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[\n,]+/)
      : []

  return [...new Set(domains.map(normalizeDomain).filter(Boolean))]
}

export const normalizeEmail = (value: unknown): string => {
  if (typeof value !== "string") {
    return ""
  }

  return value.trim().toLowerCase()
}

export const parseEmails = (value: unknown): string[] => {
  const emails = Array.isArray(value)
    ? value.map((entry) =>
        typeof entry === "string" ? entry : (entry as any)?.email
      )
    : typeof value === "string"
      ? value.split(/[\n,]+/)
      : []

  return [...new Set(emails.map(normalizeEmail).filter(Boolean))]
}

export const stringOrNull = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null
  }

  const trimmed = value.trim()

  return trimmed || null
}

export const recordOrNull = (
  value: unknown
): Record<string, unknown> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null
  }

  return value as Record<string, unknown>
}

export const statusOrDefault = (
  value: unknown,
  fallback: VendorStatus = "draft"
): VendorStatus => {
  return typeof value === "string" &&
    VENDOR_STATUSES.includes(value as VendorStatus)
    ? (value as VendorStatus)
    : fallback
}

export const getDomainVendorId = (domain: DomainRecord): string | undefined => {
  return domain.vendor_id ?? domain.vendor?.id
}

export const domainsForVendor = (
  domains: DomainRecord[],
  vendorId: string
): DomainRecord[] => {
  return domains.filter((domain) => getDomainVendorId(domain) === vendorId)
}

export const membersForVendor = (
  members: MemberRecord[],
  vendorId: string
): MemberRecord[] => {
  return members.filter((member) => member.vendor_id === vendorId)
}

export const serializeAdminVendor = (
  vendor: VendorRecord,
  domains: DomainRecord[] = [],
  members: MemberRecord[] = [],
  productCount = 0
) => {
  return {
    id: vendor.id,
    name: vendor.name,
    handle: vendor.handle,
    status: vendor.status,
    contact_email: vendor.contact_email,
    logo_url: vendor.logo_url,
    primary_color: vendor.primary_color,
    metadata: vendor.metadata,
    created_at: vendor.created_at,
    updated_at: vendor.updated_at,
    product_count: productCount,
    domains: domains.map((domain) => ({
      id: domain.id,
      domain: domain.domain,
      is_primary: domain.is_primary,
    })),
    members: members.map((member) => ({
      id: member.id,
      user_id: member.user_id,
      email: member.email,
      role: member.role,
      status: member.status,
    })),
  }
}

export const serializeStoreVendor = (
  vendor: VendorRecord,
  domains: DomainRecord[] = []
) => {
  return {
    id: vendor.id,
    name: vendor.name,
    handle: vendor.handle,
    domains: domains.map((domain) => domain.domain),
    branding: {
      logo_url: vendor.logo_url,
      primary_color: vendor.primary_color,
    },
    metadata: vendor.metadata,
  }
}

export const findDomainConflict = (
  domains: DomainRecord[],
  domainValues: string[],
  allowedVendorId?: string
): DomainRecord | undefined => {
  return domains.find((domain) => {
    if (!domainValues.includes(normalizeDomain(domain.domain))) {
      return false
    }

    return getDomainVendorId(domain) !== allowedVendorId
  })
}

export const resolveUserIdsByEmail = async (
  req: MedusaRequest,
  emails: string[]
): Promise<Map<string, string>> => {
  if (!emails.length) {
    return new Map()
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY) as any
  const { data: users = [] } = await query.graph({
    entity: "user",
    fields: ["id", "email"],
    filters: {
      email: emails,
    },
    pagination: {
      take: emails.length,
      skip: 0,
    },
  } as any)

  return new Map(
    users
      .filter((user: any) => user.email)
      .map((user: any) => [normalizeEmail(user.email), user.id])
  )
}

export const syncVendorMembers = async (
  req: MedusaRequest,
  vendorId: string,
  emails: string[],
  memberPassword?: unknown
): Promise<void> => {
  const marketplace = getMarketplaceService(req)
  const currentMembers = await marketplace.listVendorMembers({ vendor_id: vendorId })
  const normalizedEmails = [...new Set(emails.map(normalizeEmail).filter(Boolean))]
  const userIdsByEmail = await resolveUserIdsByEmail(req, normalizedEmails)
  const password = normalizeVendorPassword(memberPassword)
  const passwordHash = password ? hashVendorPassword(password) : null

  const currentEmails = new Set(
    currentMembers.map((member) => normalizeEmail(member.email))
  )

  const toDelete = currentMembers.filter(
    (member) => !normalizedEmails.includes(normalizeEmail(member.email))
  )

  if (toDelete.length) {
    await marketplace.deleteVendorMembers(toDelete.map((member) => member.id))
  }

  const toCreate = normalizedEmails.filter((email) => !currentEmails.has(email))

  if (toCreate.length) {
    await marketplace.createVendorMembers(
      toCreate.map((email) => ({
        vendor_id: vendorId,
        user_id: userIdsByEmail.get(email) ?? null,
        email,
        role: "owner",
        status: "active",
        ...(passwordHash
          ? {
              metadata: {
                password_hash: passwordHash,
              },
            }
          : {}),
      })) as any
    )
  }

  const toUpdate = currentMembers.filter((member) => {
    const email = normalizeEmail(member.email)

    return (
      normalizedEmails.includes(email) &&
      ((member.user_id ?? null) !== (userIdsByEmail.get(email) ?? null) ||
        Boolean(passwordHash))
    )
  })

  if (toUpdate.length) {
    await marketplace.updateVendorMembers(
      toUpdate.map((member) => {
        const email = normalizeEmail(member.email)

        return {
          id: member.id,
          user_id: userIdsByEmail.get(email) ?? null,
          ...(passwordHash
            ? {
                metadata: {
                  ...(recordOrNull(member.metadata) ?? {}),
                  password_hash: passwordHash,
                },
              }
            : {}),
        }
      }) as any
    )
  }
}

export const vendorProductLinkDefinition = (
  vendorId: string,
  productId: string
) => ({
  [MARKETPLACE_MODULE]: {
    vendor_id: vendorId,
  },
  [Modules.PRODUCT]: {
    product_id: productId,
  },
})

export const getVendorProductLinkService = (req: MedusaRequest): any => {
  const link = req.scope.resolve(ContainerRegistrationKeys.LINK) as any
  const linkModule = link.getLinkModule(
    MARKETPLACE_MODULE,
    "vendor_id",
    Modules.PRODUCT,
    "product_id"
  )

  if (!linkModule) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "The vendor-product link module is not available."
    )
  }

  return linkModule
}

export const listVendorProductLinks = async (
  req: MedusaRequest,
  filters: Record<string, unknown> = {}
): Promise<LinkRecord[]> => {
  const linkModule = getVendorProductLinkService(req)

  return await linkModule.list(filters)
}

export const syncVendorProducts = async (
  req: MedusaRequest,
  vendorId: string,
  productIds: string[]
): Promise<void> => {
  const link = req.scope.resolve(ContainerRegistrationKeys.LINK) as any
  const currentLinks = await listVendorProductLinks(req, { vendor_id: vendorId })
  const allLinks = await listVendorProductLinks(req)
  const targetIds = [...new Set(productIds.filter(Boolean))]
  const conflicts = allLinks.filter(
    (linkRecord) =>
      targetIds.includes(linkRecord.product_id) &&
      linkRecord.vendor_id !== vendorId
  )

  if (conflicts.length) {
    throw new MedusaError(
      MedusaError.Types.CONFLICT,
      "One or more products are already assigned to another vendor."
    )
  }

  const currentIds = new Set(currentLinks.map((record) => record.product_id))
  const targetSet = new Set(targetIds)
  const toRemove = currentLinks.filter(
    (record) => !targetSet.has(record.product_id)
  )
  const toAdd = targetIds.filter((productId) => !currentIds.has(productId))

  if (toRemove.length) {
    await link.dismiss(
      toRemove.map((record) =>
        vendorProductLinkDefinition(record.vendor_id, record.product_id)
      )
    )
  }

  if (toAdd.length) {
    await link.create(
      toAdd.map((productId) => vendorProductLinkDefinition(vendorId, productId))
    )
  }
}

export const listProducts = async (
  req: MedusaRequest,
  filters: Record<string, unknown> = {},
  take = 100
): Promise<ProductRecord[]> => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY) as any
  const { data: products = [] } = await query.graph({
    entity: "product",
    fields: [
      "id",
      "title",
      "handle",
      "status",
      "thumbnail",
      "description",
      "variants.id",
      "variants.title",
      "variants.sku",
      "variants.manage_inventory",
      "variants.allow_backorder",
      "variants.prices.id",
      "variants.prices.amount",
      "variants.prices.currency_code",
      "sales_channels.id",
      "sales_channels.name",
    ],
    filters,
    pagination: {
      skip: 0,
      take,
    },
  } as any)

  return products
}

export const getAuthenticatedVendor = async (req: MedusaRequest) => {
  const marketplace = getMarketplaceService(req)
  const vendorAuth = (req as any).vendor_auth

  if (!vendorAuth?.member_id || !vendorAuth?.vendor_id) {
    return null
  }

  const members = await marketplace.listVendorMembers({
    id: vendorAuth.member_id,
  } as any)
  const member = members.find(
    (candidate) =>
      candidate.id === vendorAuth.member_id &&
      candidate.vendor_id === vendorAuth.vendor_id &&
      candidate.status === "active"
  )

  if (!member) {
    return null
  }

  const vendor = await marketplace
    .retrieveVendor(member.vendor_id)
    .catch(() => null)

  if (!vendor || vendor.status !== "active") {
    return null
  }

  return {
    member,
    vendor,
  }
}
