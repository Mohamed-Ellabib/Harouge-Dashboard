import { randomUUID } from "crypto"
import type {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"

import {
  getPermanentBrand,
  listExclusivelyOwnedCanonicalProductIds,
  listPermanentDomains,
  listStoreProfileStoreLinks,
  resolvePermanentStoreByDomain,
  resolvePermanentStoreByHandle,
  serializePermanentPublicStoreProfile,
} from "./legacy-vendor-compatibility"
import {
  normalizeDomain,
  normalizeHandle,
  type PublicStoreProfile,
} from "./vendors"

export type PublicStoreContext = {
  tenantId: string
  storeProfileId: string
  medusaStoreId: string
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
  const hostname = requestHostname(req)
  const handleOverride = developmentHandle(
    req,
    options.developmentHandleOverride
  )
  const binding = handleOverride
    ? await resolvePermanentStoreByHandle(req, handleOverride).catch(() => null)
    : hostname
      ? await resolvePermanentStoreByDomain(req, hostname).catch(() => null)
      : null

  if (!binding) {
    throw notFound()
  }

  const salesChannelId = binding.medusaStore.default_sales_channel_id
  const publishableKeyContext = (req as any).publishable_key_context

  if (
    typeof salesChannelId !== "string" ||
    !publishableKeyContext ||
    typeof publishableKeyContext.key !== "string" ||
    !Array.isArray(publishableKeyContext.sales_channel_ids) ||
    publishableKeyContext.sales_channel_ids.length !== 1 ||
    publishableKeyContext.sales_channel_ids[0] !== salesChannelId
  ) {
    throw notFound()
  }

  const profileStoreLinks = await listStoreProfileStoreLinks(req)
  const storeService = req.scope.resolve(Modules.STORE) as any
  const sameChannelProfiles: string[] = []

  for (const link of profileStoreLinks) {
    const store = await storeService.retrieveStore(link.store_id).catch(() => null)

    if (store?.default_sales_channel_id === salesChannelId) {
      sameChannelProfiles.push(link.store_profile_id)
    }
  }

  if (
    sameChannelProfiles.length !== 1 ||
    sameChannelProfiles[0] !== binding.storeProfile.id
  ) {
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

  if (
    !apiKey ||
    apiKey.revoked_at ||
    keyChannelIds.length !== 1 ||
    keyChannelIds[0] !== salesChannelId
  ) {
    throw notFound()
  }

  const domains = await listPermanentDomains(req, binding.storeProfile.id)
  const brand = await getPermanentBrand(req, binding.storeProfile.id)
  const legacyVendorId = binding.storeProfile.legacy_vendor_id

  if (typeof legacyVendorId !== "string" || !legacyVendorId) {
    throw notFound()
  }

  const context: PublicStoreContext = {
    tenantId: binding.tenant.id,
    storeProfileId: binding.storeProfile.id,
    medusaStoreId: binding.medusaStore.id,
    vendorId: legacyVendorId,
    salesChannelId,
    publishableApiKeyId: apiKey.id,
    hostname:
      hostname ||
      normalizeDomain(
        domains.find((domain) => domain.is_primary)?.normalized_hostname ??
          domains[0]?.normalized_hostname
      ),
    requestId: randomUUID(),
    profile: serializePermanentPublicStoreProfile(binding, domains, brand),
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
    const context = await resolvePublicStoreContext(req)
    const canonicalIds = await listExclusivelyOwnedCanonicalProductIds(
      req,
      context.medusaStoreId
    )
    const path = String(
      (req as any).originalUrl ?? (req as any).url ?? ""
    ).split("?")[0]
    const directMatch = path.match(new RegExp("^/store/products/([^/]+)$"))

    if (directMatch) {
      if (!canonicalIds.includes(decodeURIComponent(directMatch[1]))) {
        throw notFound()
      }
    } else {
      const requested = (req as any).query?.id
      const requestedIds = Array.isArray(requested)
        ? requested.map(String)
        : typeof requested === "string"
          ? requested.split(",").filter(Boolean)
          : null
      const allowedIds = requestedIds
        ? canonicalIds.filter((id) => requestedIds.includes(id))
        : canonicalIds

      ;(req as any).query = {
        ...((req as any).query ?? {}),
        id: allowedIds.length ? allowedIds : ["__no_canonical_products__"],
      }
    }

    return next()
  } catch (error) {
    return next(error)
  }
}
