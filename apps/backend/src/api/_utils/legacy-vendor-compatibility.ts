import type { MedusaRequest } from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"

import { MARKETPLACE_MODULE } from "../../modules/marketplace"
import type MarketplaceModuleService from "../../modules/marketplace/service"
import { SAAS_MODULE } from "../../modules/saas"
import type SaasModuleService from "../../modules/saas/service"
import { updateMerchantStorePresentation } from "./platform-store-configuration"

type Scope = {
  resolve: (key: string) => any
}

type LinkRecord = Record<string, any>

export type PermanentStoreBinding = {
  membership: Record<string, any> | null
  tenant: Record<string, any>
  storeProfile: Record<string, any>
  medusaStore: Record<string, any>
}

const forbidden = (message: string) =>
  new MedusaError(MedusaError.Types.FORBIDDEN, message)

const configurationError = (message: string) =>
  new MedusaError(MedusaError.Types.INVALID_DATA, message)

export const scopeFor = (input: MedusaRequest | Scope): Scope =>
  "scope" in input ? (input as MedusaRequest).scope : input

export const getSaasService = (
  input: MedusaRequest | Scope
): SaasModuleService =>
  scopeFor(input).resolve(SAAS_MODULE) as SaasModuleService

export const getLegacyMarketplaceService = (
  input: MedusaRequest | Scope
): MarketplaceModuleService =>
  scopeFor(input).resolve(MARKETPLACE_MODULE) as MarketplaceModuleService

const getLinkService = (
  input: MedusaRequest | Scope,
  leftModule: string,
  leftField: string,
  rightModule: string,
  rightField: string
): any => {
  const link = scopeFor(input).resolve(ContainerRegistrationKeys.LINK) as any
  const linkModule = link.getLinkModule(
    leftModule,
    leftField,
    rightModule,
    rightField
  )

  if (!linkModule) {
    throw configurationError(
      "Required module link " +
        leftModule +
        "." +
        leftField +
        " -> " +
        rightModule +
        "." +
        rightField +
        " is unavailable."
    )
  }

  return linkModule
}

export const storeProfileStoreLinkDefinition = (
  storeProfileId: string,
  medusaStoreId: string
) => ({
  [SAAS_MODULE]: { store_profile_id: storeProfileId },
  [Modules.STORE]: { store_id: medusaStoreId },
})

export const storeProductLinkDefinition = (
  medusaStoreId: string,
  productId: string
) => ({
  [Modules.STORE]: { store_id: medusaStoreId },
  [Modules.PRODUCT]: { product_id: productId },
})

export const listStoreProfileStoreLinks = async (
  input: MedusaRequest | Scope,
  filters: Record<string, unknown> = {}
): Promise<LinkRecord[]> => {
  return await getLinkService(
    input,
    SAAS_MODULE,
    "store_profile_id",
    Modules.STORE,
    "store_id"
  ).list(filters)
}

export const listStoreProductLinks = async (
  input: MedusaRequest | Scope,
  filters: Record<string, unknown> = {}
): Promise<LinkRecord[]> => {
  return await getLinkService(
    input,
    Modules.STORE,
    "store_id",
    Modules.PRODUCT,
    "product_id"
  ).list(filters)
}

const resolveProfileChain = async (
  input: MedusaRequest | Scope,
  storeProfile: Record<string, any>,
  membership: Record<string, any> | null
): Promise<PermanentStoreBinding> => {
  const saas = getSaasService(input)

  if (storeProfile.status !== "active") {
    throw forbidden("The merchant store is unavailable.")
  }

  const tenant = await saas.retrieveTenant(storeProfile.tenant_id).catch(() => null)

  if (!tenant || tenant.status !== "active") {
    throw forbidden("The merchant tenant is unavailable.")
  }

  const profileLinks = await listStoreProfileStoreLinks(input, {
    store_profile_id: storeProfile.id,
  })
  const allLinksForStores =
    profileLinks.length === 1
      ? await listStoreProfileStoreLinks(input, {
          store_id: profileLinks[0].store_id,
        })
      : []

  if (
    profileLinks.length !== 1 ||
    allLinksForStores.length !== 1 ||
    allLinksForStores[0].store_profile_id !== storeProfile.id
  ) {
    throw configurationError(
      "The permanent store has a missing or ambiguous Medusa Store mapping."
    )
  }

  const storeService = scopeFor(input).resolve(Modules.STORE) as any
  const medusaStore = await storeService
    .retrieveStore(profileLinks[0].store_id)
    .catch(() => null)

  if (!medusaStore?.id || !medusaStore.default_sales_channel_id) {
    throw configurationError(
      "The permanent Medusa Store has no valid default sales channel."
    )
  }

  return { membership, tenant, storeProfile, medusaStore }
}

export const resolvePermanentMerchantBinding = async (
  input: MedusaRequest | Scope,
  merchantAccountReference: string,
  expectedStoreProfileId: string
): Promise<PermanentStoreBinding> => {
  const saas = getSaasService(input)
  const memberships = await saas.listMerchantMemberships({
    merchant_account_reference: merchantAccountReference,
    store_profile_id: expectedStoreProfileId,
  } as any)

  if (memberships.length !== 1 || memberships[0].status !== "active") {
    throw forbidden("The merchant membership is unavailable.")
  }

  const membership = memberships[0]
  const profile = await saas
    .retrieveStoreProfile(membership.store_profile_id)
    .catch(() => null)

  if (!profile || profile.id !== expectedStoreProfileId) {
    throw forbidden("The merchant store is unavailable.")
  }

  return await resolveProfileChain(input, profile, membership)
}

export const resolvePermanentStoreByProfileId = async (
  input: MedusaRequest | Scope,
  storeProfileId: string
): Promise<PermanentStoreBinding> => {
  const profile = await getSaasService(input)
    .retrieveStoreProfile(storeProfileId)
    .catch(() => null)

  if (!profile) {
    throw forbidden("Storefront was not found.")
  }

  return await resolveProfileChain(input, profile, null)
}

export const resolvePermanentStoreByHandle = async (
  input: MedusaRequest | Scope,
  handle: string
): Promise<PermanentStoreBinding> => {
  const profiles = await getSaasService(input).listStoreProfiles({ handle } as any)

  if (profiles.length !== 1) {
    throw forbidden("Storefront was not found.")
  }

  return await resolveProfileChain(input, profiles[0], null)
}
export const resolvePermanentStoreByLegacyVendor = async (
  input: MedusaRequest | Scope,
  legacyVendorId: string
): Promise<PermanentStoreBinding> => {
  const saas = getSaasService(input)
  const profiles = await saas.listStoreProfiles({
    legacy_vendor_id: legacyVendorId,
  } as any)

  if (profiles.length !== 1) {
    throw configurationError(
      "The legacy Vendor does not have one permanent StoreProfile mapping."
    )
  }

  return await resolveProfileChain(input, profiles[0], null)
}

export const resolvePermanentStoreByDomain = async (
  input: MedusaRequest | Scope,
  normalizedHostname: string
): Promise<PermanentStoreBinding & { domain: Record<string, any> }> => {
  const saas = getSaasService(input)
  const domains = await saas.listStoreDomains({
    normalized_hostname: normalizedHostname,
  } as any)

  if (domains.length !== 1 || domains[0].verification_status !== "verified") {
    throw forbidden("Storefront was not found.")
  }

  const profile = await saas
    .retrieveStoreProfile(domains[0].store_profile_id)
    .catch(() => null)

  if (!profile) {
    throw forbidden("Storefront was not found.")
  }

  return {
    ...(await resolveProfileChain(input, profile, null)),
    domain: domains[0],
  }
}

export const listPermanentDomains = async (
  input: MedusaRequest | Scope,
  storeProfileId: string
): Promise<Record<string, any>[]> => {
  return await getSaasService(input).listStoreDomains({
    store_profile_id: storeProfileId,
  } as any)
}

export const getPermanentBrand = async (
  input: MedusaRequest | Scope,
  storeProfileId: string
): Promise<Record<string, any> | null> => {
  const brands = await getSaasService(input).listStoreBrands({
    store_profile_id: storeProfileId,
  } as any)

  if (brands.length > 1) {
    throw configurationError("The permanent store has ambiguous branding.")
  }

  return brands[0] ?? null
}

export const listExclusivelyOwnedCanonicalProductIds = async (
  input: MedusaRequest | Scope,
  medusaStoreId: string
): Promise<string[]> => {
  const links = await listStoreProductLinks(input)
  const byProduct = new Map<string, LinkRecord[]>()

  for (const link of links) {
    const records = byProduct.get(link.product_id) ?? []
    records.push(link)
    byProduct.set(link.product_id, records)
  }

  return [...byProduct.entries()]
    .filter(([, records]) => records.length === 1 && records[0].store_id === medusaStoreId)
    .map(([productId]) => productId)
}

export const assertCanonicalProductOwner = async (
  input: MedusaRequest | Scope,
  medusaStoreId: string,
  productId: string
): Promise<void> => {
  const links = await listStoreProductLinks(input, { product_id: productId })

  if (links.length !== 1 || links[0].store_id !== medusaStoreId) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Product was not found.")
  }
}

export const syncCanonicalStoreProducts = async (
  input: MedusaRequest | Scope,
  medusaStoreId: string,
  productIds: string[]
): Promise<void> => {
  const scope = scopeFor(input)
  const link = scope.resolve(ContainerRegistrationKeys.LINK) as any
  const currentLinks = await listStoreProductLinks(input, {
    store_id: medusaStoreId,
  })
  const allLinks = await listStoreProductLinks(input)
  const targetIds = [...new Set(productIds.filter(Boolean))]
  const conflicts = allLinks.filter(
    (record) =>
      targetIds.includes(record.product_id) && record.store_id !== medusaStoreId
  )

  if (conflicts.length) {
    throw new MedusaError(
      MedusaError.Types.CONFLICT,
      "One or more products already have another canonical Store owner."
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
        storeProductLinkDefinition(record.store_id, record.product_id)
      )
    )
  }

  if (toAdd.length) {
    await link.create(
      toAdd.map((productId) =>
        storeProductLinkDefinition(medusaStoreId, productId)
      )
    )
  }
}

type CompatibleStoreUpdate = {
  name?: string
  public_contact_email?: string | null
  logo_url?: string | null
  primary_color?: string | null
}

export const updateLegacyCompatibleStore = async (
  input: MedusaRequest,
  binding: {
    vendorId: string
    storeProfileId: string
    medusaStoreId: string
  },
  update: CompatibleStoreUpdate,
  actorId: string,
): Promise<void> => {
  await updateMerchantStorePresentation(
    input.scope,
    binding,
    update,
    actorId,
  )
}
export const serializePermanentPublicStoreProfile = (
  binding: PermanentStoreBinding,
  domains: Record<string, any>[],
  brand: Record<string, any> | null,
  storefront: import("./vendors").PublicStoreProfile["storefront"],
) => {
  const primary =
    domains.find((domain) => domain.is_primary) ?? domains[0] ?? null

  return {
    name: binding.medusaStore.name,
    handle: binding.storeProfile.handle,
    domain: primary?.normalized_hostname ?? null,
    locale: (binding.storeProfile.locale === "en-LY"
      ? "en-LY"
      : "ar-LY") as "ar-LY" | "en-LY",
    contact: {
      public_email: binding.storeProfile.public_contact_email ?? null,
      public_phone: binding.storeProfile.public_phone ?? null,
      whatsapp_number: binding.storeProfile.whatsapp_number ?? null,
    },
    branding: {
      logo_url: brand?.logo_url ?? null,
      primary_color: brand?.primary_color ?? null,
      secondary_color: brand?.secondary_color ?? null,
      typography_key: "cairo" as const,
    },
    storefront,
  }
}
