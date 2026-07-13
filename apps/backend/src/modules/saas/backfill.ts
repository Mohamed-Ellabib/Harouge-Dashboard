/* eslint-disable @medusajs/use-medusa-error-not-generic-error -- CLI safety failures are not HTTP errors */
import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import {
  listStoreProfileStoreLinks,
  listStoreProductLinks,
  storeProfileStoreLinkDefinition,
  syncCanonicalStoreProducts
} from "../../api/_utils/legacy-vendor-compatibility"
import {
  getDomainVendorId,
  normalizeDomain,
  normalizeEmail,
  recordOrNull
} from "../../api/_utils/vendors"
import { MARKETPLACE_MODULE } from "../marketplace"
import type MarketplaceModuleService from "../marketplace/service"
import { SAAS_MODULE } from "."
import type SaasModuleService from "./service"

export type BackfillConflict = {
  vendor_id: string | null
  code: string
  detail: string
}

export type BackfillCounts = {
  vendors_inspected: number
  tenants_created: number
  tenants_reused: number
  store_profiles_created: number
  store_profiles_reused: number
  medusa_stores_created: number
  medusa_stores_reused: number
  memberships_created: number
  memberships_reused: number
  domains_migrated: number
  products_linked: number
  conflicts: number
  unresolved_records: number
}

export type BackfillReport = {
  mode: "dry-run" | "apply"
  counts: BackfillCounts
  conflicts: BackfillConflict[]
}

type BackfillOptions = {
  apply?: boolean
}

const emptyCounts = (): BackfillCounts => ({
  vendors_inspected: 0,
  tenants_created: 0,
  tenants_reused: 0,
  store_profiles_created: 0,
  store_profiles_reused: 0,
  medusa_stores_created: 0,
  medusa_stores_reused: 0,
  memberships_created: 0,
  memberships_reused: 0,
  domains_migrated: 0,
  products_linked: 0,
  conflicts: 0,
  unresolved_records: 0
})

const normalizedDatabaseIdentity = (value: string): string => {
  const url = new URL(value)
  url.username = ""
  url.password = ""
  url.searchParams.sort()
  return url.toString()
}

export const assertBackfillApplySafety = (): void => {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Store backfill apply is disabled in production pending a separate owner-approved runbook."
    )
  }

  if (process.env.NODE_ENV !== "test") {
    throw new Error("Store backfill apply requires the dedicated disposable test environment.")
  }

  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for store backfill apply.")
  }

  if (
    process.env.PROTECTED_DATABASE_URL &&
    normalizedDatabaseIdentity(databaseUrl) ===
      normalizedDatabaseIdentity(process.env.PROTECTED_DATABASE_URL)
  ) {
    throw new Error("Store backfill refuses the protected database target.")
  }

  const parsed = new URL(databaseUrl)
  const local = ["127.0.0.1", "localhost", "::1"].includes(parsed.hostname)

  if (!local) {
    throw new Error("Store backfill apply is restricted to local databases in Phase 2A.")
  }

  if (
    process.env.TEST_DATABASE_GUARD_VALIDATED !== "true" ||
    process.env.TEST_DATABASE_DISPOSABLE !== "medusa_phase05_disposable"
  ) {
    throw new Error("Test backfill apply requires the disposable database safety guard.")
  }
}

const deterministicId = (prefix: string, legacyId: string): string =>
  prefix + "_" + legacyId.replace(/[^a-zA-Z0-9_-]/g, "_")

const vendorStatusToStoreStatus = (value: unknown): "draft" | "active" | "suspended" =>
  value === "active" || value === "suspended" ? value : "draft"

const conflict = (
  report: BackfillReport,
  vendorId: string | null,
  code: string,
  detail: string
): void => {
  report.conflicts.push({ vendor_id: vendorId, code, detail })
  report.counts.conflicts += 1
  report.counts.unresolved_records += 1
}

export const runLegacyVendorBackfill = async (
  container: MedusaContainer,
  options: BackfillOptions = {}
): Promise<BackfillReport> => {
  const apply = options.apply === true

  if (apply) {
    assertBackfillApplySafety()
  }

  const report: BackfillReport = {
    mode: apply ? "apply" : "dry-run",
    counts: emptyCounts(),
    conflicts: []
  }
  const marketplace = container.resolve(MARKETPLACE_MODULE) as MarketplaceModuleService
  const saas = container.resolve(SAAS_MODULE) as SaasModuleService
  const storeService = container.resolve(Modules.STORE) as any
  const salesChannelService = container.resolve(Modules.SALES_CHANNEL) as any
  const link = container.resolve(ContainerRegistrationKeys.LINK) as any
  const query = container.resolve(ContainerRegistrationKeys.QUERY) as any
  const vendorProductLink = link.getLinkModule(
    MARKETPLACE_MODULE,
    "vendor_id",
    Modules.PRODUCT,
    "product_id"
  )

  if (!vendorProductLink) {
    throw new Error("The legacy Vendor-product link module is unavailable.")
  }

  const [
    vendors,
    vendorDomains,
    vendorMembers,
    vendorProductLinks,
    profiles,
    profileStoreLinks,
    canonicalProductLinks,
    existingStores
  ] = await Promise.all([
    marketplace.listVendors(),
    marketplace.listVendorDomains(),
    marketplace.listVendorMembers(),
    vendorProductLink.list(),
    saas.listStoreProfiles(),
    listStoreProfileStoreLinks(container),
    listStoreProductLinks(container),
    storeService.listStores({}, { take: 1000 })
  ])

  report.counts.vendors_inspected = vendors.length

  const domainOwners = new Map<string, Set<string>>()
  for (const domain of vendorDomains) {
    const hostname = normalizeDomain(domain.domain)
    const vendorId = getDomainVendorId(domain)

    if (hostname && vendorId) {
      const owners = domainOwners.get(hostname) ?? new Set<string>()
      owners.add(vendorId)
      domainOwners.set(hostname, owners)
    }
  }

  const memberEmailOwners = new Map<string, Set<string>>()
  for (const member of vendorMembers) {
    const email = normalizeEmail(member.email)

    if (email && member.vendor_id) {
      const owners = memberEmailOwners.get(email) ?? new Set<string>()
      owners.add(member.vendor_id)
      memberEmailOwners.set(email, owners)
    }
  }

  const productOwners = new Map<string, Set<string>>()
  for (const owner of vendorProductLinks) {
    const owners = productOwners.get(owner.product_id) ?? new Set<string>()
    owners.add(owner.vendor_id)
    productOwners.set(owner.product_id, owners)
  }

  for (const vendor of vendors.sort((a, b) => a.id.localeCompare(b.id))) {
    const metadata = recordOrNull(vendor.metadata)
    const channelId = metadata?.sales_channel_id

    if (typeof channelId !== "string" || !channelId) {
      conflict(
        report,
        vendor.id,
        Array.isArray(channelId)
          ? "vendor_multiple_candidate_channels"
          : "vendor_missing_sales_channel",
        "Vendor must identify exactly one sales channel before migration."
      )
      continue
    }

    const channel = (
      await salesChannelService.listSalesChannels({ id: [channelId] }, { take: 2 })
    )[0]

    if (!channel) {
      conflict(
        report,
        vendor.id,
        "vendor_missing_sales_channel",
        "Configured sales channel does not exist."
      )
      continue
    }

    const domains = vendorDomains.filter((domain) => getDomainVendorId(domain) === vendor.id)
    const members = vendorMembers.filter((member) => member.vendor_id === vendor.id)
    const legacyProducts = vendorProductLinks
      .filter((owner) => owner.vendor_id === vendor.id)
      .map((owner) => owner.product_id)
    let blocked = false

    for (const domain of domains) {
      const hostname = normalizeDomain(domain.domain)
      if (!hostname || (domainOwners.get(hostname)?.size ?? 0) !== 1) {
        conflict(
          report,
          vendor.id,
          "duplicate_normalized_domain",
          "A legacy domain is empty or belongs to multiple Vendors."
        )
        blocked = true
      }
    }

    for (const member of members) {
      const email = normalizeEmail(member.email)
      if ((memberEmailOwners.get(email)?.size ?? 0) > 1) {
        conflict(
          report,
          vendor.id,
          "ambiguous_merchant_account",
          "A merchant email belongs to multiple legacy Vendors."
        )
        blocked = true
      }
    }

    for (const productId of legacyProducts) {
      if ((productOwners.get(productId)?.size ?? 0) !== 1) {
        conflict(
          report,
          vendor.id,
          "product_multiple_legacy_owners",
          "A product has multiple or missing legacy Vendor owners."
        )
        blocked = true
      }
    }

    if (legacyProducts.length) {
      const { data: products = [] } = await query.graph({
        entity: "product",
        fields: ["id", "sales_channels.id"],
        filters: { id: legacyProducts },
        pagination: { skip: 0, take: legacyProducts.length }
      } as any)

      for (const product of products) {
        const channels = Array.isArray(product.sales_channels)
          ? product.sales_channels.map((candidate: any) => candidate.id)
          : []

        if (channels.length !== 1 || channels[0] !== channelId) {
          conflict(
            report,
            vendor.id,
            "product_sales_channel_mismatch",
            "Product channel availability disagrees with the Vendor channel."
          )
          blocked = true
        }
      }

      if (products.length !== legacyProducts.length) {
        conflict(
          report,
          vendor.id,
          "missing_legacy_ownership",
          "One or more legacy product links target missing products."
        )
        blocked = true
      }
    }

    const existingProfileMatches = profiles.filter(
      (profile) => profile.legacy_vendor_id === vendor.id
    )

    if (existingProfileMatches.length > 1) {
      conflict(
        report,
        vendor.id,
        "ambiguous_store_profile",
        "Vendor maps to multiple StoreProfiles."
      )
      continue
    }

    let storeProfile = existingProfileMatches[0] ?? null
    let tenant = storeProfile
      ? await saas.retrieveTenant(storeProfile.tenant_id).catch(() => null)
      : null
    let storeId = storeProfile
      ? profileStoreLinks.find((candidate) => candidate.store_profile_id === storeProfile.id)
          ?.store_id
      : undefined

    if (storeId) {
      const owners = profileStoreLinks.filter((candidate) => candidate.store_id === storeId)
      const mappedStore = existingStores.find((candidate) => candidate.id === storeId)

      if (!mappedStore || mappedStore.default_sales_channel_id !== channelId) {
        conflict(
          report,
          vendor.id,
          "medusa_store_channel_mismatch",
          "Mapped Medusa Store does not use the Vendor sales channel."
        )
        blocked = true
      }

      if (owners.length !== 1) {
        conflict(
          report,
          vendor.id,
          "medusa_store_already_owned",
          "Medusa Store is linked to more than one StoreProfile."
        )
        blocked = true
      }
    }

    const unlinkedStores = existingStores.filter(
      (store) => !profileStoreLinks.some((candidate) => candidate.store_id === store.id)
    )
    const canReuseOnlyStore = !storeId && vendors.length === 1 && unlinkedStores.length === 1

    if (blocked) {
      continue
    }

    if (tenant) {
      report.counts.tenants_reused += 1
    } else {
      report.counts.tenants_created += 1
      if (apply) {
        tenant = await saas.createTenants({
          id: deterministicId("tenant", vendor.id),
          name: vendor.name,
          status: vendor.status === "suspended" ? "suspended" : "active"
        } as any)
      }
    }

    if (storeProfile) {
      report.counts.store_profiles_reused += 1
    } else {
      report.counts.store_profiles_created += 1
      if (apply) {
        storeProfile = await saas.createStoreProfiles({
          id: deterministicId("stprof", vendor.id),
          tenant_id: tenant!.id,
          legacy_vendor_id: vendor.id,
          handle: vendor.handle,
          status: vendorStatusToStoreStatus(vendor.status),
          locale: "ar-LY",
          timezone: "Africa/Tripoli",
          plan_code: "starter_whatsapp"
        } as any)
      }
    }

    if (storeId || canReuseOnlyStore) {
      report.counts.medusa_stores_reused += 1
      storeId = storeId ?? unlinkedStores[0].id
    } else {
      report.counts.medusa_stores_created += 1
      if (apply) {
        const created = await storeService.upsertStores({
          id: deterministicId("store", vendor.id),
          name: vendor.name,
          default_sales_channel_id: channelId,
          supported_currencies: [{ currency_code: "lyd", is_default: true }]
        })
        storeId = created.id
      }
    }

    if (apply && canReuseOnlyStore) {
      await storeService.updateStores(storeId!, {
        name: vendor.name,
        default_sales_channel_id: channelId,
        supported_currencies: [{ currency_code: "lyd", is_default: true }]
      })
    }

    if (!apply) {
      report.counts.memberships_created += members.length
      report.counts.domains_migrated += domains.length
      report.counts.products_linked += legacyProducts.length
      continue
    }

    const currentProfileLinks = await listStoreProfileStoreLinks(container, {
      store_profile_id: storeProfile!.id
    })

    if (!currentProfileLinks.length) {
      await link.create(storeProfileStoreLinkDefinition(storeProfile!.id, storeId!))
    } else if (currentProfileLinks.length !== 1 || currentProfileLinks[0].store_id !== storeId) {
      conflict(
        report,
        vendor.id,
        "store_profile_link_conflict",
        "Existing StoreProfile link differs from the planned Medusa Store."
      )
      continue
    }

    const existingDomains = await saas.listStoreDomains({
      store_profile_id: storeProfile!.id
    } as any)

    for (const legacyDomain of domains) {
      const hostname = normalizeDomain(legacyDomain.domain)
      const found = existingDomains.find((candidate) => candidate.normalized_hostname === hostname)

      if (!found) {
        await saas.createStoreDomains({
          id: deterministicId("stdom", legacyDomain.id),
          store_profile_id: storeProfile!.id,
          normalized_hostname: hostname,
          original_hostname: legacyDomain.domain,
          type: "custom",
          verification_status: "verified",
          ssl_status: "active",
          is_primary: Boolean(legacyDomain.is_primary)
        } as any)
        report.counts.domains_migrated += 1
      }
    }

    const brands = await saas.listStoreBrands({
      store_profile_id: storeProfile!.id
    } as any)

    if (!brands.length) {
      await saas.createStoreBrands({
        id: deterministicId("stbrand", vendor.id),
        store_profile_id: storeProfile!.id,
        logo_url: vendor.logo_url ?? null,
        primary_color: vendor.primary_color ?? null
      } as any)
    }

    const existingMemberships = await saas.listMerchantMemberships({
      store_profile_id: storeProfile!.id
    } as any)

    for (const member of members) {
      const found = existingMemberships.find(
        (candidate) => candidate.merchant_account_reference === member.id
      )

      if (found) {
        report.counts.memberships_reused += 1
      } else {
        await saas.createMerchantMemberships({
          id: deterministicId("mship", member.id),
          store_profile_id: storeProfile!.id,
          merchant_account_reference: member.id,
          role: member.role === "manager" ? "manager" : "owner",
          status: member.status === "disabled" ? "disabled" : "active"
        } as any)
        report.counts.memberships_created += 1
      }
    }

    const existingCanonical = canonicalProductLinks.filter((owner) =>
      legacyProducts.includes(owner.product_id)
    )
    const otherStoreOwnership = existingCanonical.some((owner) => owner.store_id !== storeId)

    if (otherStoreOwnership) {
      conflict(
        report,
        vendor.id,
        "canonical_product_owner_conflict",
        "A legacy product already has another canonical Store owner."
      )
      continue
    }

    const before = new Set(
      canonicalProductLinks
        .filter((owner) => owner.store_id === storeId)
        .map((owner) => owner.product_id)
    )
    await syncCanonicalStoreProducts(container, storeId!, legacyProducts)
    report.counts.products_linked += legacyProducts.filter(
      (productId) => !before.has(productId)
    ).length
  }

  return report
}
