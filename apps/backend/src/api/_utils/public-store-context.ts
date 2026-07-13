import { randomUUID } from "crypto"
import type {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"

import {
  domainsForVendor,
  getDomainVendorId,
  getMarketplaceService,
  normalizeDomain,
  normalizeHandle,
  recordOrNull,
  resolveVendorSalesChannel,
  serializePublicStoreProfile,
  type PublicStoreProfile,
} from "./vendors"

export type PublicStoreContext = {
  vendorId: string
  salesChannelId: string
  publishableApiKeyId: string
  hostname: string
  requestId: string
  profile: PublicStoreProfile
}

type ResolvePublicStoreOptions = {
  developmentHandleOverride?: unknown
}

const CONTEXT_KEY = "public_store_context"

const notFound = () =>
  new MedusaError(MedusaError.Types.NOT_FOUND, "Storefront was not found.")

const trustedProxyIps = (): Set<string> =>
  new Set(
    (process.env.TRUSTED_PROXY_IPS ?? "")
      .split(",")
      .map((value) => value.trim().replace(/^::ffff:/, ""))
      .filter(Boolean)
  )

const requestHostname = (req: MedusaRequest): string => {
  const remoteAddress = String(
    (req as any).ip ?? (req as any).socket?.remoteAddress ?? ""
  ).replace(/^::ffff:/, "")
  const proxyTrusted = trustedProxyIps().has(remoteAddress)
  const forwardedHost = proxyTrusted
    ? String((req as any).headers?.["x-forwarded-host"] ?? "").split(",")[0]
    : ""
  const host = forwardedHost || String((req as any).headers?.host ?? "")

  return normalizeDomain(host)
}

const developmentHandle = (
  req: MedusaRequest,
  explicit: unknown
): string => {
  if (process.env.NODE_ENV === "production") {
    return ""
  }

  return normalizeHandle(
    explicit ?? (req as any).headers?.["x-store-handle"]
  )
}

export const resolvePublicStoreContext = async (
  req: MedusaRequest,
  options: ResolvePublicStoreOptions = {}
): Promise<PublicStoreContext> => {
  const marketplace = getMarketplaceService(req)
  const hostname = requestHostname(req)
  const handleOverride = developmentHandle(
    req,
    options.developmentHandleOverride
  )
  const domains = await marketplace.listVendorDomains()
  let vendor: Record<string, any> | null = null

  if (handleOverride) {
    const vendors = await marketplace.listVendors({ handle: handleOverride })
    vendor = vendors.length === 1 ? vendors[0] : null
  } else {
    if (!hostname) {
      throw notFound()
    }

    const domainMatches = domains.filter(
      (candidate) => normalizeDomain(candidate.domain) === hostname
    )

    if (domainMatches.length !== 1) {
      throw notFound()
    }

    const vendorId = getDomainVendorId(domainMatches[0])
    vendor = vendorId
      ? await marketplace.retrieveVendor(vendorId).catch(() => null)
      : null
  }

  if (!vendor || vendor.status !== "active") {
    throw notFound()
  }

  const salesChannel = await resolveVendorSalesChannel(req, vendor).catch(() => null)
  const publishableKeyContext = (req as any).publishable_key_context

  if (
    !salesChannel ||
    !publishableKeyContext ||
    typeof publishableKeyContext.key !== "string" ||
    !Array.isArray(publishableKeyContext.sales_channel_ids) ||
    publishableKeyContext.sales_channel_ids.length !== 1 ||
    publishableKeyContext.sales_channel_ids[0] !== salesChannel.id
  ) {
    throw notFound()
  }

  const vendors = await marketplace.listVendors({ status: "active" } as any)
  const matchingStoreIds = vendors
    .filter((candidate) => {
      const configuredId = recordOrNull(candidate.metadata)?.sales_channel_id
      return configuredId === salesChannel.id
    })
    .map((candidate) => candidate.id)

  if (matchingStoreIds.length !== 1 || matchingStoreIds[0] !== vendor.id) {
    throw notFound()
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY) as any
  const { data: apiKeys = [] } = await query.graph({
    entity: "api_key",
    fields: ["id", "token", "revoked_at", "sales_channels_link.sales_channel_id"],
    filters: { token: publishableKeyContext.key, type: "publishable" },
    pagination: { skip: 0, take: 2 },
  } as any)
  const apiKey = apiKeys.length === 1 ? apiKeys[0] : null
  const keyChannelIds = Array.isArray(apiKey?.sales_channels_link)
    ? apiKey.sales_channels_link.map((link: any) => link.sales_channel_id)
    : []
  const configuredKeyId = recordOrNull(vendor.metadata)?.publishable_api_key_id

  if (
    !apiKey ||
    apiKey.revoked_at ||
    keyChannelIds.length !== 1 ||
    keyChannelIds[0] !== salesChannel.id ||
    (typeof configuredKeyId === "string" && configuredKeyId !== apiKey.id)
  ) {
    throw notFound()
  }

  const vendorDomains = domainsForVendor(domains, vendor.id)
  const context: PublicStoreContext = {
    vendorId: vendor.id,
    salesChannelId: salesChannel.id,
    publishableApiKeyId: apiKey.id,
    hostname: hostname || normalizeDomain(vendorDomains[0]?.domain),
    requestId: randomUUID(),
    profile: serializePublicStoreProfile(vendor, vendorDomains),
  }

  ;(req as any)[CONTEXT_KEY] = context
  return context
}

export const getPublicStoreContext = (
  req: MedusaRequest
): PublicStoreContext | null => (req as any)[CONTEXT_KEY] ?? null

export const attachPublicStoreContext = async (
  req: MedusaRequest,
  _res: MedusaResponse,
  next: MedusaNextFunction
) => {
  try {
    await resolvePublicStoreContext(req)
    return next()
  } catch (error) {
    return next(error)
  }
}
