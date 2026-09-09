import type { MedusaRequest } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

import { MARKETPLACE_MODULE } from "../../modules/marketplace"
import { SAAS_MODULE } from "../../modules/saas"
import {
  listStoreProductLinks,
  listStoreProfileStoreLinks,
} from "./legacy-vendor-compatibility"
import {
  serializeCommerceReadiness,
  serializeCommerceSetupStatus,
} from "../../workflows/commerce-readiness-state"

type RecordLike = Record<string, any>

const byNewest = (left: RecordLike, right: RecordLike) =>
  new Date(right.updated_at ?? right.created_at ?? 0).getTime() -
  new Date(left.updated_at ?? left.created_at ?? 0).getTime()

const stringOrNull = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null

const memberDisplayName = (member: RecordLike | undefined): string | null => {
  const metadata = member?.metadata
  return metadata && typeof metadata === "object" && !Array.isArray(metadata)
    ? stringOrNull(metadata.display_name)
    : null
}

const serializePortfolioProvisioning = (record: RecordLike) => ({
  id: record.id,
  status: record.status,
  current_step: stringOrNull(record.current_step),
  requested_handle: stringOrNull(record.requested_handle),
  requested_domain: stringOrNull(record.requested_domain),
  requested_owner_email: stringOrNull(record.requested_owner_email),
  requested_plan_code: stringOrNull(record.requested_plan_code),
  retry_count: Number(record.retry_count ?? 0),
  failure_code: stringOrNull(record.failure_code),
  failure_message: stringOrNull(record.failure_message_safe),
  created_at: record.created_at,
  updated_at: record.updated_at,
  completed_at: record.completed_at ?? null,
})

export const buildPlatformPortfolio = async (
  req: MedusaRequest,
): Promise<Record<string, unknown>> => {
  const saas = req.scope.resolve(SAAS_MODULE) as any
  const marketplace = req.scope.resolve(MARKETPLACE_MODULE) as any
  const storeService = req.scope.resolve(Modules.STORE) as any
  const query =
    typeof req.query.q === "string" ? req.query.q.trim().toLowerCase() : ""
  const listConfig = { take: 1_000 }

  const [
    tenants,
    profiles,
    domains,
    brands,
    memberships,
    readinessRecords,
    setupRecords,
    provisioningRecords,
    vendors,
    vendorMembers,
    profileStoreLinks,
    storeProductLinks,
  ] = await Promise.all([
    saas.listTenants({}, listConfig),
    saas.listStoreProfiles({}, listConfig),
    saas.listStoreDomains({}, listConfig),
    saas.listStoreBrands({}, listConfig),
    saas.listMerchantMemberships({}, listConfig),
    saas.listStoreCommerceReadinesses({}, listConfig),
    saas.listStoreCommerceSetups({}, listConfig),
    saas.listStoreProvisionings({}, listConfig),
    marketplace.listVendors({}, listConfig),
    marketplace.listVendorMembers({}, listConfig),
    listStoreProfileStoreLinks(req),
    listStoreProductLinks(req),
  ])

  const storeIds = [
    ...new Set(
      profileStoreLinks
        .map((link: RecordLike) => stringOrNull(link.store_id))
        .filter(Boolean),
    ),
  ] as string[]
  const medusaStores = storeIds.length
    ? await storeService.listStores({ id: storeIds }, listConfig)
    : []

  const storeById = new Map<string, RecordLike>(
    medusaStores.map((store: RecordLike) => [store.id, store]),
  )
  const vendorById = new Map<string, RecordLike>(
    vendors.map((vendor: RecordLike) => [vendor.id, vendor]),
  )
  const vendorMemberById = new Map<string, RecordLike>(
    vendorMembers.map((member: RecordLike) => [member.id, member]),
  )
  const storeIdByProfileId = new Map(
    profileStoreLinks.map((link: RecordLike) => [
      link.store_profile_id,
      link.store_id,
    ]),
  )
  const productCountByStoreId = new Map<string, number>()
  for (const link of storeProductLinks as RecordLike[]) {
    const storeId = stringOrNull(link.store_id)
    if (storeId) {
      productCountByStoreId.set(
        storeId,
        (productCountByStoreId.get(storeId) ?? 0) + 1,
      )
    }
  }

  const domainsByProfileId = new Map<string, RecordLike[]>()
  for (const domain of domains as RecordLike[]) {
    const current = domainsByProfileId.get(domain.store_profile_id) ?? []
    current.push(domain)
    domainsByProfileId.set(domain.store_profile_id, current)
  }

  const brandByProfileId = new Map<string, RecordLike>(
    brands.map((brand: RecordLike) => [brand.store_profile_id, brand]),
  )
  const membershipsByProfileId = new Map<string, RecordLike[]>()
  for (const membership of memberships as RecordLike[]) {
    const current =
      membershipsByProfileId.get(membership.store_profile_id) ?? []
    current.push(membership)
    membershipsByProfileId.set(membership.store_profile_id, current)
  }

  const readinessByProfileId = new Map<string, RecordLike>(
    readinessRecords.map((readiness: RecordLike) => [
      readiness.store_profile_id,
      readiness,
    ]),
  )
  const setupById = new Map<string, RecordLike>(
    setupRecords.map((setup: RecordLike) => [setup.id, setup]),
  )
  const provisioningByProfileId = new Map<string, RecordLike>()
  for (const provisioning of (provisioningRecords as RecordLike[]).sort(byNewest)) {
    if (
      provisioning.store_profile_id &&
      !provisioningByProfileId.has(provisioning.store_profile_id)
    ) {
      provisioningByProfileId.set(provisioning.store_profile_id, provisioning)
    }
  }

  const profilesByTenantId = new Map<string, RecordLike[]>()
  for (const profile of profiles as RecordLike[]) {
    const current = profilesByTenantId.get(profile.tenant_id) ?? []
    current.push(profile)
    profilesByTenantId.set(profile.tenant_id, current)
  }

  const clients = (tenants as RecordLike[])
    .sort(byNewest)
    .map((tenant) => {
      const stores = (profilesByTenantId.get(tenant.id) ?? [])
        .sort(byNewest)
        .map((profile) => {
          const medusaStoreId = storeIdByProfileId.get(profile.id) ?? null
          const medusaStore = medusaStoreId
            ? storeById.get(medusaStoreId)
            : undefined
          const vendor = profile.legacy_vendor_id
            ? vendorById.get(profile.legacy_vendor_id)
            : undefined
          const readiness = readinessByProfileId.get(profile.id)
          const setup = readiness?.last_setup_id
            ? setupById.get(readiness.last_setup_id)
            : undefined
          const profileDomains = (domainsByProfileId.get(profile.id) ?? [])
            .sort((left, right) => Number(right.is_primary) - Number(left.is_primary))
            .map((domain) => ({
              id: domain.id,
              hostname: domain.normalized_hostname,
              type: domain.type,
              verification_status: domain.verification_status,
              ssl_status: domain.ssl_status,
              is_primary: Boolean(domain.is_primary),
            }))
          const brand = brandByProfileId.get(profile.id)
          const storeMemberships = (
            membershipsByProfileId.get(profile.id) ?? []
          ).map((membership) => {
            const account = vendorMemberById.get(
              membership.merchant_account_reference,
            )
            return {
              id: membership.id,
              email: stringOrNull(account?.email),
              display_name: memberDisplayName(account),
              role: membership.role,
              status: membership.status,
            }
          })
          const provisioning = provisioningByProfileId.get(profile.id)

          return {
            id: profile.id,
            name:
              stringOrNull(medusaStore?.name) ??
              stringOrNull(vendor?.name) ??
              profile.handle,
            handle: profile.handle,
            status: profile.status,
            plan_code: profile.plan_code,
            locale: profile.locale,
            timezone: profile.timezone,
            contact: {
              public_email: stringOrNull(profile.public_contact_email),
              public_phone: stringOrNull(profile.public_phone),
              whatsapp_number: stringOrNull(profile.whatsapp_number),
            },
            brand: brand
              ? {
                  logo_url: stringOrNull(brand.logo_url),
                  favicon_url: stringOrNull(brand.favicon_url),
                  primary_color: stringOrNull(brand.primary_color),
                  secondary_color: stringOrNull(brand.secondary_color),
                  typography_key: stringOrNull(brand.typography_key),
                }
              : null,
            domains: profileDomains,
            memberships: storeMemberships,
            product_count: medusaStoreId
              ? (productCountByStoreId.get(medusaStoreId) ?? 0)
              : 0,
            compatibility_vendor: vendor
              ? {
                  id: vendor.id,
                  status: vendor.status,
                }
              : null,
            provisioning: provisioning
              ? serializePortfolioProvisioning(provisioning)
              : null,
            commerce_readiness: readiness
              ? serializeCommerceReadiness(readiness)
              : null,
            commerce_setup: setup ? serializeCommerceSetupStatus(setup) : null,
            created_at: profile.created_at,
            updated_at: profile.updated_at,
          }
        })

      return {
        id: tenant.id,
        key: tenant.key,
        name: tenant.name,
        status: tenant.status,
        stores,
        created_at: tenant.created_at,
        updated_at: tenant.updated_at,
      }
    })

  const filteredClients = query
    ? clients.filter((client) =>
        [
          client.name,
          client.key,
          ...client.stores.flatMap((store) => [
            store.name,
            store.handle,
            store.contact.public_email,
            store.contact.public_phone,
            store.contact.whatsapp_number,
            ...store.domains.map((domain) => domain.hostname),
            ...store.memberships.map((membership) => membership.email),
          ]),
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query)),
      )
    : clients

  const allStores = filteredClients.flatMap((client) => client.stores)
  const needsAttention = allStores.filter(
    (store) =>
      ["failed", "requires_attention"].includes(
        String(store.provisioning?.status ?? ""),
      ) ||
      ["failed", "requires_attention"].includes(
        String(store.commerce_readiness?.status ?? ""),
      ),
  ).length

  return {
    clients: filteredClients,
    count: filteredClients.length,
    summary: {
      active_clients: filteredClients.filter(
        (client) => client.status === "active",
      ).length,
      total_stores: allStores.length,
      active_stores: allStores.filter((store) => store.status === "active")
        .length,
      commerce_ready: allStores.filter(
        (store) => store.commerce_readiness?.status === "ready",
      ).length,
      needs_attention: needsAttention,
    },
  }
}
