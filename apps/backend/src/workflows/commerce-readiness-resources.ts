import {
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  updateStoresWorkflow,
} from "@medusajs/core-flows"
import type { MedusaContainer } from "@medusajs/framework/types"
import { LINKS, Modules } from "@medusajs/framework/utils"

import { resolvePermanentStoreByProfileId } from "../api/_utils/legacy-vendor-compatibility"
import {
  COMMERCE_GATE_FULFILLMENT_PROVIDER_ID,
  COMMERCE_GATE_PAYMENT_PROVIDER_ID,
  commerceFulfillmentSetName,
  commerceServiceZoneName,
  commerceShippingOptionCode,
  normalizeCommerceSetupPinnedPolicy,
  sameCommerceSetupPinnedPolicy,
  type CommerceSetupPinnedPolicy,
  type StoreCommerceSetupInput,
} from "./commerce-readiness-contract"
import {
  checkpointCommerceResource,
  checkpointCommerceStep,
  commerceReadinessServices,
  commerceSetupConflict,
  commerceSetupForbidden,
  commerceSetupInvalid,
  ensureStoreCommerceReadiness,
  requiredCommerceResource,
  updateCommerceReadiness,
  type CommerceReadinessRecord,
  type CommerceSetupRecord,
} from "./commerce-readiness-state"

const COMMERCE_GATE_SHIPPING_PROFILE_NAME =
  "LabibTech default shipping profile"

export type CommercePrerequisites = {
  profile: Record<string, any>
  tenant: Record<string, any>
  store: Record<string, any>
  region: Record<string, any>
  location: Record<string, any>
  readiness: CommerceReadinessRecord
  salesChannelId: string
  currencyCode: string
  countries: string[]
}

const metadataIds = (store: Record<string, any>, key: string): string[] => {
  const value = store.metadata?.[key]

  return Array.isArray(value)
    ? [...new Set(value.filter((entry): entry is string => Boolean(entry)))]
    : []
}

const exactStrings = (left: string[], right: string[]): boolean => {
  const normalizedLeft = [...new Set(left.map((value) => value.toLowerCase()))].sort()
  const normalizedRight = [
    ...new Set(right.map((value) => value.toLowerCase())),
  ].sort()

  return (
    normalizedLeft.length === normalizedRight.length &&
    normalizedLeft.every((value, index) => value === normalizedRight[index])
  )
}

const linkRecords = async (
  container: MedusaContainer,
  leftModule: string,
  leftField: string,
  rightModule: string,
  rightField: string,
  filters: Record<string, unknown>,
): Promise<Record<string, any>[]> => {
  const { link } = commerceReadinessServices(container)
  const linkModule = link.getLinkModule(
    leftModule,
    leftField,
    rightModule,
    rightField,
  )

  if (!linkModule) {
    throw commerceSetupInvalid("A required Medusa module link is unavailable.")
  }

  return await linkModule.list(filters)
}

const ensureExactLink = async (
  container: MedusaContainer,
  definition: Record<string, unknown>,
  leftModule: string,
  leftField: string,
  leftId: string,
  rightModule: string,
  rightField: string,
  rightId: string,
): Promise<void> => {
  let links = await linkRecords(
    container,
    leftModule,
    leftField,
    rightModule,
    rightField,
    { [leftField]: leftId },
  )
  const matches = links.filter((entry) => entry[rightField] === rightId)

  if (matches.length > 1) {
    throw commerceSetupInvalid("A required Medusa module link is ambiguous.")
  }
  if (!matches.length) {
    await commerceReadinessServices(container).link.create(definition)
    links = await linkRecords(
      container,
      leftModule,
      leftField,
      rightModule,
      rightField,
      { [leftField]: leftId },
    )
  }

  if (links.filter((entry) => entry[rightField] === rightId).length !== 1) {
    throw commerceSetupInvalid("A required Medusa module link was not established.")
  }
}

const ensureExclusiveLink = async (
  container: MedusaContainer,
  definition: Record<string, unknown>,
  leftModule: string,
  leftField: string,
  leftId: string,
  rightModule: string,
  rightField: string,
  rightId: string,
): Promise<void> => {
  let [leftLinks, rightLinks] = await Promise.all([
    linkRecords(
      container,
      leftModule,
      leftField,
      rightModule,
      rightField,
      { [leftField]: leftId },
    ),
    linkRecords(
      container,
      leftModule,
      leftField,
      rightModule,
      rightField,
      { [rightField]: rightId },
    ),
  ])

  const hasOnlyExpectedLink = (
    links: Record<string, any>[],
    expectedField: string,
    expectedId: string,
  ) =>
    links.length === 1 && links[0]?.[expectedField] === expectedId

  if (
    leftLinks.length > 1 ||
    rightLinks.length > 1 ||
    leftLinks.some((entry) => entry[rightField] !== rightId) ||
    rightLinks.some((entry) => entry[leftField] !== leftId)
  ) {
    throw commerceSetupConflict(
      "A Store-specific Medusa module link is already owned by another resource.",
    )
  }

  if (!leftLinks.length && !rightLinks.length) {
    await commerceReadinessServices(container).link.create(definition)
    const refreshedLinks = await Promise.all([
      linkRecords(
        container,
        leftModule,
        leftField,
        rightModule,
        rightField,
        { [leftField]: leftId },
      ),
      linkRecords(
        container,
        leftModule,
        leftField,
        rightModule,
        rightField,
        { [rightField]: rightId },
      ),
    ])
    leftLinks = refreshedLinks[0]
    rightLinks = refreshedLinks[1]
  }

  if (
    !hasOnlyExpectedLink(leftLinks, rightField, rightId) ||
    !hasOnlyExpectedLink(rightLinks, leftField, leftId)
  ) {
    throw commerceSetupInvalid(
      "The Store-specific Medusa module link was not established exclusively.",
    )
  }
}

export const resolveCommercePrerequisites = async (
  container: MedusaContainer,
  storeProfileId: string,
): Promise<CommercePrerequisites> => {
  let binding: Record<string, any>

  try {
    binding = await resolvePermanentStoreByProfileId(
      container as any,
      storeProfileId,
    )
  } catch {
    throw commerceSetupForbidden(
      "The Store is not an active canonical SaaS Store.",
    )
  }

  const {
    store: storeService,
    region: regionService,
    stockLocation,
    payment,
  } = commerceReadinessServices(container)
  const profile = binding.storeProfile

  if (profile.plan_code !== "professional_commerce") {
    await ensureStoreCommerceReadiness(container, profile)
    throw commerceSetupForbidden(
      "Online checkout is not included in this Store plan.",
    )
  }

  const store = await storeService.retrieveStore(binding.medusaStore.id, {
    relations: ["supported_currencies"],
  })
  const regionId = store.default_region_id
  const locationId = store.default_location_id
  const salesChannelId = store.default_sales_channel_id

  if (!regionId || !locationId || !salesChannelId) {
    throw commerceSetupInvalid(
      "The Store is missing a default Region, Stock Location, or Sales Channel.",
    )
  }

  const allowedRegions = metadataIds(store, "saas_allowed_region_ids")

  if (allowedRegions.length !== 1 || allowedRegions[0] !== regionId) {
    throw commerceSetupInvalid(
      "The Store Region policy is missing or ambiguous.",
    )
  }

  const [region, location, paymentProviderLinks, paymentProviders] =
    await Promise.all([
    regionService.retrieveRegion(regionId, {
      relations: ["countries"],
    }),
    stockLocation.retrieveStockLocation(locationId),
    linkRecords(
      container,
      Modules.REGION,
      "region_id",
      Modules.PAYMENT,
      "payment_provider_id",
      { region_id: regionId },
    ),
    payment.listPaymentProviders({
      id: COMMERCE_GATE_PAYMENT_PROVIDER_ID,
    }),
  ])
  const currencies = (store.supported_currencies ?? [])
    .map((entry: any) => String(entry.currency_code ?? "").toLowerCase())
    .filter(Boolean)
  const currencyCode = String(region.currency_code ?? "").toLowerCase()
  const countries = (region.countries ?? [])
    .map((country: any) => String(country.iso_2 ?? "").toLowerCase())
    .filter(Boolean)
    .sort()
  const compatibleProviderLinks = paymentProviderLinks.filter(
    (entry) =>
      entry.payment_provider_id === COMMERCE_GATE_PAYMENT_PROVIDER_ID,
  )

  if (!currencyCode || !currencies.includes(currencyCode) || !countries.length) {
    throw commerceSetupInvalid(
      "The Store currency and exact Region countries are incompatible.",
    )
  }
  if (
    compatibleProviderLinks.length !== 1 ||
    paymentProviders.length !== 1 ||
    paymentProviders[0].is_enabled === false
  ) {
    throw commerceSetupInvalid(
      "The Store Region has no compatible acceptance payment provider.",
    )
  }

  const channelLocationLinks = await linkRecords(
    container,
    Modules.SALES_CHANNEL,
    "sales_channel_id",
    Modules.STOCK_LOCATION,
    "stock_location_id",
    { stock_location_id: locationId },
  )

  if (
    channelLocationLinks.length !== 1 ||
    channelLocationLinks[0]?.sales_channel_id !== salesChannelId
  ) {
    throw commerceSetupInvalid(
      "The Store Stock Location is not linked exclusively to its Sales Channel.",
    )
  }

  const readiness = await ensureStoreCommerceReadiness(container, profile)

  return {
    profile,
    tenant: binding.tenant,
    store,
    region,
    location,
    readiness,
    salesChannelId,
    currencyCode,
    countries,
  }
}

const permanentPolicyConflict = () =>
  commerceSetupConflict(
    "The permanent Store commerce policy changed and requires operator review.",
  )

export const assertCommerceSetupPinnedPolicy = (
  pinned: unknown,
  current: unknown,
): void => {
  if (!sameCommerceSetupPinnedPolicy(pinned, current)) {
    throw permanentPolicyConflict()
  }
}

/**
 * Resolves the immutable commerce policy from the completed provisioning
 * record and proves that every canonical Medusa default still matches it.
 * The setup request signs this value so retries cannot silently follow a
 * changed Store, Region, Location, Channel, country, currency, or provider.
 */
export const resolveCommerceSetupPinnedPolicy = async (
  container: MedusaContainer,
  prerequisites: CommercePrerequisites,
): Promise<CommerceSetupPinnedPolicy> => {
  const { saas } = commerceReadinessServices(container)
  const provisioningRecords = await saas.listStoreProvisionings(
    {
      store_profile_id: prerequisites.profile.id,
      status: "completed",
    },
    { take: 2 },
  )

  if (provisioningRecords.length !== 1) {
    throw permanentPolicyConflict()
  }

  const provisioning = provisioningRecords[0]
  const snapshot = provisioning.request_snapshot
  const snapshotStore = snapshot?.store
  const snapshotCommerce = snapshot?.commerce
  const snapshotCurrency =
    typeof snapshotStore?.currency_code === "string"
      ? snapshotStore.currency_code.trim().toLowerCase()
      : ""
  const snapshotCountries = Array.isArray(snapshotCommerce?.countries)
    ? snapshotCommerce.countries
        .filter((value: unknown): value is string => typeof value === "string")
        .map((value: string) => value.trim().toLowerCase())
        .filter(Boolean)
    : []
  const supportedCurrencies = (prerequisites.store.supported_currencies ?? [])
    .map((entry: any) => String(entry.currency_code ?? "").toLowerCase())
    .filter(Boolean)
  const defaultCurrencies = (prerequisites.store.supported_currencies ?? [])
    .filter((entry: any) => entry.is_default === true)
    .map((entry: any) => String(entry.currency_code ?? "").toLowerCase())
    .filter(Boolean)
  const identityMatches =
    provisioning.tenant_id === prerequisites.tenant.id &&
    provisioning.store_profile_id === prerequisites.profile.id &&
    provisioning.medusa_store_id === prerequisites.store.id &&
    provisioning.region_id === prerequisites.region.id &&
    provisioning.stock_location_id === prerequisites.location.id &&
    provisioning.sales_channel_id === prerequisites.salesChannelId
  const planMatches =
    provisioning.requested_plan_code === "professional_commerce" &&
    snapshotStore?.plan_code === "professional_commerce" &&
    prerequisites.profile.plan_code === "professional_commerce"
  const currencyMatches =
    Boolean(snapshotCurrency) &&
    snapshotCurrency === prerequisites.currencyCode &&
    exactStrings(supportedCurrencies, [snapshotCurrency]) &&
    exactStrings(defaultCurrencies, [snapshotCurrency])
  const countriesMatch =
    snapshotCountries.length > 0 &&
    exactStrings(snapshotCountries, prerequisites.countries)

  if (!identityMatches || !planMatches || !currencyMatches || !countriesMatch) {
    throw permanentPolicyConflict()
  }

  try {
    return normalizeCommerceSetupPinnedPolicy({
      version: 1,
      provisioning_id: provisioning.id,
      tenant_id: prerequisites.tenant.id,
      store_profile_id: prerequisites.profile.id,
      medusa_store_id: prerequisites.store.id,
      plan_code: "professional_commerce",
      region_id: prerequisites.region.id,
      stock_location_id: prerequisites.location.id,
      sales_channel_id: prerequisites.salesChannelId,
      currency_code: snapshotCurrency,
      countries: snapshotCountries,
      fulfillment_provider_id: COMMERCE_GATE_FULFILLMENT_PROVIDER_ID,
      payment_provider_id: COMMERCE_GATE_PAYMENT_PROVIDER_ID,
    })
  } catch {
    throw permanentPolicyConflict()
  }
}

export const ensureCommerceProvider = async (
  container: MedusaContainer,
  record: CommerceSetupRecord,
  prerequisites: CommercePrerequisites,
): Promise<CommerceSetupRecord> => {
  const { fulfillment } = commerceReadinessServices(container)
  const providers = await fulfillment.listFulfillmentProviders({
    id: COMMERCE_GATE_FULFILLMENT_PROVIDER_ID,
  })

  if (
    providers.length !== 1 ||
    providers[0].is_enabled === false
  ) {
    throw commerceSetupInvalid(
      "The acceptance fulfillment provider is unavailable.",
    )
  }

  await ensureExactLink(
    container,
    {
      [Modules.STOCK_LOCATION]: {
        stock_location_id: prerequisites.location.id,
      },
      [Modules.FULFILLMENT]: {
        fulfillment_provider_id: COMMERCE_GATE_FULFILLMENT_PROVIDER_ID,
      },
    },
    Modules.STOCK_LOCATION,
    "stock_location_id",
    prerequisites.location.id,
    Modules.FULFILLMENT,
    "fulfillment_provider_id",
    COMMERCE_GATE_FULFILLMENT_PROVIDER_ID,
  )

  return await checkpointCommerceResource(
    container,
    record,
    "fulfillment_provider",
    "fulfillment_provider",
    COMMERCE_GATE_FULFILLMENT_PROVIDER_ID,
    "reused",
  )
}

export const ensureCommerceShippingProfile = async (
  container: MedusaContainer,
  record: CommerceSetupRecord,
): Promise<CommerceSetupRecord> => {
  const { fulfillment } = commerceReadinessServices(container)
  const checkpointed = record.resource_state?.shipping_profile?.id
  let profile: Record<string, any> | null = null
  let disposition: "created" | "reused" = "reused"

  if (checkpointed) {
    profile = await fulfillment
      .retrieveShippingProfile(checkpointed)
      .catch(() => null)
  }
  if (!profile) {
    let profiles = await fulfillment.listShippingProfiles(
      { type: "default" },
      { take: 3 },
    )

    if (!profiles.length) {
      try {
        const { result } = await createShippingProfilesWorkflow(container).run({
          input: {
            data: [
              {
                name: COMMERCE_GATE_SHIPPING_PROFILE_NAME,
                type: "default",
              },
            ],
          },
        })
        profile = result[0]
        disposition = "created"
      } catch {
        // A concurrent Store setup may have won the unique-name race.
        const matches = await fulfillment.listShippingProfiles(
          { name: COMMERCE_GATE_SHIPPING_PROFILE_NAME, type: "default" },
          { take: 2 },
        )
        profile = matches.length === 1 ? matches[0] : null
      }

      profiles = await fulfillment.listShippingProfiles(
        { type: "default" },
        { take: 3 },
      )
    }

    if (profiles.length !== 1) {
      throw commerceSetupInvalid(
        "Exactly one default Shipping Profile is required.",
      )
    }
    profile = profile ?? profiles[0]
  }
  const shippingProfile = profile

  if (!shippingProfile || shippingProfile.type !== "default") {
    throw commerceSetupInvalid("The Shipping Profile is incompatible.")
  }

  return await checkpointCommerceResource(
    container,
    record,
    "shipping_profile",
    "shipping_profile",
    shippingProfile.id,
    disposition,
  )
}

export const validateCommerceFulfillmentSet = (
  set: Record<string, any>,
  countries: string[],
  storeProfileId: string,
): Record<string, any> => {
  const zones = Array.isArray(set.service_zones) ? set.service_zones : []

  if (
    set.type !== "shipping" ||
    set.name !== commerceFulfillmentSetName(storeProfileId) ||
    zones.length !== 1 ||
    zones[0]?.name !== commerceServiceZoneName(storeProfileId)
  ) {
    throw commerceSetupConflict(
      "The deterministic Fulfillment Set is structurally incompatible.",
    )
  }

  const geoZones = Array.isArray(zones[0].geo_zones)
    ? zones[0].geo_zones
    : []
  const zoneCountries = geoZones
    .map((zone: any) => String(zone.country_code ?? "").toLowerCase())
    .filter(Boolean)
  const expectedCountryCount = new Set(
    countries.map((country) => country.toLowerCase()),
  ).size

  if (
    geoZones.length !== expectedCountryCount ||
    geoZones.some(
      (zone: any) =>
        zone.type !== "country" ||
        typeof zone.country_code !== "string" ||
        !zone.country_code.trim(),
    ) ||
    !exactStrings(zoneCountries, countries)
  ) {
    throw commerceSetupConflict(
      "The deterministic Service Zone countries are incompatible.",
    )
  }

  return zones[0]
}

export const ensureCommerceFulfillmentSet = async (
  container: MedusaContainer,
  record: CommerceSetupRecord,
  prerequisites: CommercePrerequisites,
): Promise<CommerceSetupRecord> => {
  const { fulfillment } = commerceReadinessServices(container)
  const checkpointed = record.resource_state?.fulfillment_set?.id
  const readinessId = prerequisites.readiness.fulfillment_set_id
  const recordedIds = [...new Set([checkpointed, readinessId].filter(Boolean))]
  let set: Record<string, any> | null = null
  let disposition: "created" | "reused" = "reused"

  if (recordedIds.length > 1) {
    throw commerceSetupConflict(
      "The recorded Store Fulfillment Set references are incompatible.",
    )
  }

  for (const id of recordedIds) {
    set = await fulfillment
      .retrieveFulfillmentSet(id, {
        relations: ["service_zones", "service_zones.geo_zones"],
      })
      .catch(() => null)
    if (set) {
      break
    }
  }

  if (!set) {
    const matches = await fulfillment.listFulfillmentSets(
      {
        name: commerceFulfillmentSetName(prerequisites.profile.id),
        type: "shipping",
      },
      {
        take: 2,
        relations: ["service_zones", "service_zones.geo_zones"],
      },
    )

    if (matches.length > 1) {
      throw commerceSetupConflict(
        "The deterministic Fulfillment Set is ambiguous.",
      )
    }
    set = matches[0] ?? null
  }

  if (!set) {
    set = await fulfillment.createFulfillmentSets({
      name: commerceFulfillmentSetName(prerequisites.profile.id),
      type: "shipping",
      service_zones: [
        {
          name: commerceServiceZoneName(prerequisites.profile.id),
          geo_zones: prerequisites.countries.map((countryCode) => ({
            country_code: countryCode,
            type: "country",
          })),
        },
      ],
    })
    disposition = "created"
  }

  const fulfillmentSet = set

  if (!fulfillmentSet) {
    throw commerceSetupInvalid("The Fulfillment Set could not be retrieved.")
  }

  const zone = validateCommerceFulfillmentSet(
    fulfillmentSet,
    prerequisites.countries,
    prerequisites.profile.id,
  )
  let current = await checkpointCommerceResource(
    container,
    record,
    "fulfillment_set",
    "fulfillment_set",
    fulfillmentSet.id,
    disposition,
  )
  current = await checkpointCommerceResource(
    container,
    current,
    "fulfillment_set",
    "service_zone",
    zone.id,
    disposition,
  )

  await ensureExclusiveLink(
    container,
    {
      [Modules.STOCK_LOCATION]: {
        stock_location_id: prerequisites.location.id,
      },
      [Modules.FULFILLMENT]: { fulfillment_set_id: fulfillmentSet.id },
    },
    Modules.STOCK_LOCATION,
    "stock_location_id",
    prerequisites.location.id,
    Modules.FULFILLMENT,
    "fulfillment_set_id",
    fulfillmentSet.id,
  )

  return current
}

const retrieveOptionWithRelations = async (
  container: MedusaContainer,
  id: string,
): Promise<Record<string, any> | null> =>
  await commerceReadinessServices(container).fulfillment
    .retrieveShippingOption(id, {
      relations: ["type", "rules", "service_zone"],
    })
    .catch(() => null)

export const hasExactCommerceShippingOptionRules = (
  value: unknown,
): boolean => {
  if (!Array.isArray(value) || value.length !== 2) {
    return false
  }

  const normalized = value.map((entry: any) => {
    if (
      typeof entry?.attribute !== "string" ||
      entry.operator !== "eq" ||
      typeof entry.value !== "string"
    ) {
      return null
    }

    return `${entry.attribute}|${entry.operator}|${entry.value}`
  })

  return (
    !normalized.includes(null) &&
    JSON.stringify(normalized.sort()) ===
      JSON.stringify([
        "enabled_in_store|eq|true",
        "is_return|eq|false",
      ])
  )
}

export const hasExactCommerceShippingOptionPrices = (
  value: unknown,
  currencyCode: string,
  regionId: string,
  amount: number,
): boolean => {
  if (!Array.isArray(value) || value.length !== 2) {
    return false
  }

  const normalizedCurrency = currencyCode.toLowerCase()
  const hasNoApplicabilityBounds = (price: Record<string, any>) =>
    price.min_quantity == null &&
    price.max_quantity == null &&
    price.price_list_id == null
  const priceRules = (price: Record<string, any>) =>
    Array.isArray(price.price_rules) ? price.price_rules : []
  const isExpectedAmount = (price: Record<string, any>) =>
    String(price.currency_code ?? "").toLowerCase() === normalizedCurrency &&
    Number(price.amount) === amount &&
    hasNoApplicabilityBounds(price)
  const basePrices = value.filter(
    (price: Record<string, any>) =>
      isExpectedAmount(price) && priceRules(price).length === 0,
  )
  const regionPrices = value.filter((price: Record<string, any>) => {
    const rules = priceRules(price)

    return (
      isExpectedAmount(price) &&
      rules.length === 1 &&
      rules[0]?.attribute === "region_id" &&
      rules[0]?.operator === "eq" &&
      String(rules[0]?.value) === regionId &&
      Number(rules[0]?.priority ?? 0) === 0
    )
  })

  return basePrices.length === 1 && regionPrices.length === 1
}

const validateShippingOption = (
  option: Record<string, any>,
  serviceZoneId: string,
  shippingProfileId: string,
  code: string,
): void => {
  if (
    option.price_type !== "flat" ||
    option.provider_id !== COMMERCE_GATE_FULFILLMENT_PROVIDER_ID ||
    option.service_zone_id !== serviceZoneId ||
    option.shipping_profile_id !== shippingProfileId ||
    option.type?.code !== code ||
    !hasExactCommerceShippingOptionRules(option.rules)
  ) {
    throw commerceSetupConflict(
      "The deterministic Shipping Option is structurally incompatible.",
    )
  }
}

const validateShippingOptionPrice = async (
  container: MedusaContainer,
  optionId: string,
  currencyCode: string,
  regionId: string,
  amount: number,
): Promise<void> => {
  const rows = await commerceReadinessServices(container).remoteQuery({
    service: LINKS.ShippingOptionPriceSet,
    variables: { filters: { shipping_option_id: optionId } },
    fields: [
      "shipping_option_id",
      "price_set_id",
      "price_set.prices.*",
      "price_set.prices.price_rules.*",
    ],
  })
  const row = rows.length === 1 ? rows[0] : null

  if (
    !row?.price_set_id ||
    row.shipping_option_id !== optionId ||
    !hasExactCommerceShippingOptionPrices(
      row.price_set?.prices,
      currencyCode,
      regionId,
      amount,
    )
  ) {
    throw commerceSetupConflict(
      "The Shipping Option price is missing or incompatible.",
    )
  }
}

export const ensureCommerceShippingOption = async (
  container: MedusaContainer,
  record: CommerceSetupRecord,
  prerequisites: CommercePrerequisites,
  request: StoreCommerceSetupInput,
): Promise<CommerceSetupRecord> => {
  const { fulfillment } = commerceReadinessServices(container)
  const serviceZoneId = requiredCommerceResource(record, "service_zone")
  const shippingProfileId = requiredCommerceResource(record, "shipping_profile")
  const code = commerceShippingOptionCode(prerequisites.profile.id)
  const checkpointed = record.resource_state?.shipping_option?.id
  const readyIds = Array.isArray(prerequisites.readiness.shipping_option_ids)
    ? prerequisites.readiness.shipping_option_ids
    : []
  const recordedIds = [...new Set([checkpointed, ...readyIds].filter(Boolean))]
  let option: Record<string, any> | null = null
  let disposition: "created" | "reused" = "reused"

  if (recordedIds.length > 1) {
    throw commerceSetupConflict(
      "The recorded Store Shipping Option references are incompatible.",
    )
  }

  for (const id of recordedIds) {
    option = await retrieveOptionWithRelations(container, id)
    if (option) {
      break
    }
  }

  let candidates = await fulfillment.listShippingOptions(
    { service_zone: { id: serviceZoneId } },
    { take: 2, relations: ["type", "rules", "service_zone"] },
  )
  const matches = candidates.filter(
    (candidate: any) => candidate.type?.code === code,
  )

  if (
    candidates.length > 1 ||
    matches.length > 1 ||
    (option &&
      (candidates.length !== 1 || candidates[0]?.id !== option.id)) ||
    (!option && candidates.length === 1 && matches.length !== 1)
  ) {
    throw commerceSetupConflict(
      "The Store-specific Service Zone exposes an incompatible Shipping Option.",
    )
  }

  if (!option) {
    option = matches[0] ?? null
  }

  if (!option) {
    const { result } = await createShippingOptionsWorkflow(container).run({
      input: [
        {
          name: request.shipping_option.name,
          price_type: "flat",
          provider_id: COMMERCE_GATE_FULFILLMENT_PROVIDER_ID,
          service_zone_id: serviceZoneId,
          shipping_profile_id: shippingProfileId,
          type: {
            label: request.shipping_option.name,
            description:
              request.shipping_option.description ??
              "Base delivery for " + prerequisites.profile.handle,
            code,
          },
          prices: [
            {
              currency_code: prerequisites.currencyCode,
              amount: request.shipping_option.amount,
            },
            {
              region_id: prerequisites.region.id,
              amount: request.shipping_option.amount,
            },
          ],
          rules: [
            { attribute: "enabled_in_store", value: "true", operator: "eq" },
            { attribute: "is_return", value: "false", operator: "eq" },
          ],
        },
      ],
    })
    option = await retrieveOptionWithRelations(container, result[0].id)
    disposition = "created"
  }

  if (!option) {
    throw commerceSetupInvalid("The Shipping Option could not be retrieved.")
  }
  validateShippingOption(
    option,
    serviceZoneId,
    shippingProfileId,
    code,
  )
  await validateShippingOptionPrice(
    container,
    option.id,
    prerequisites.currencyCode,
    prerequisites.region.id,
    request.shipping_option.amount,
  )

  candidates = await fulfillment.listShippingOptions(
    { service_zone: { id: serviceZoneId } },
    { take: 2 },
  )
  if (candidates.length !== 1 || candidates[0]?.id !== option.id) {
    throw commerceSetupConflict(
      "The Store-specific Service Zone must expose exactly one Shipping Option.",
    )
  }

  return await checkpointCommerceResource(
    container,
    record,
    "shipping_option",
    "shipping_option",
    option.id,
    disposition,
  )
}

export const applyCommerceStoreAllowlist = async (
  container: MedusaContainer,
  record: CommerceSetupRecord,
  prerequisites: CommercePrerequisites,
): Promise<CommerceSetupRecord> => {
  const shippingProfileId = requiredCommerceResource(record, "shipping_profile")
  const shippingOptionId = requiredCommerceResource(record, "shipping_option")
  const currentStore = await commerceReadinessServices(
    container,
  ).store.retrieveStore(prerequisites.store.id)

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: prerequisites.store.id },
      update: {
        metadata: {
          ...(currentStore.metadata ?? {}),
          saas_shipping_profile_id: shippingProfileId,
          saas_allowed_shipping_option_ids: [shippingOptionId],
        },
      },
    },
  })

  return await checkpointCommerceStep(container, record, "store_allowlist", {
    shipping_option_count: 1,
  })
}

export const validateCommerceReadinessGraph = async (
  container: MedusaContainer,
  record: CommerceSetupRecord,
  prerequisites: CommercePrerequisites,
  request: StoreCommerceSetupInput,
): Promise<CommerceReadinessRecord> => {
  const providerId = requiredCommerceResource(record, "fulfillment_provider")
  const shippingProfileId = requiredCommerceResource(record, "shipping_profile")
  const fulfillmentSetId = requiredCommerceResource(record, "fulfillment_set")
  const serviceZoneId = requiredCommerceResource(record, "service_zone")
  const shippingOptionId = requiredCommerceResource(record, "shipping_option")
  const store = await commerceReadinessServices(container).store.retrieveStore(
    prerequisites.store.id,
  )

  if (
    store.default_region_id !== prerequisites.region.id ||
    store.default_location_id !== prerequisites.location.id ||
    store.default_sales_channel_id !== prerequisites.salesChannelId ||
    !exactStrings(
      metadataIds(store, "saas_allowed_region_ids"),
      [prerequisites.region.id],
    ) ||
    !exactStrings(
      metadataIds(store, "saas_allowed_shipping_option_ids"),
      [shippingOptionId],
    ) ||
    store.metadata?.saas_shipping_profile_id !== shippingProfileId
  ) {
    throw commerceSetupInvalid(
      "The Store commerce allowlist does not match the configured resources.",
    )
  }

  const set = await commerceReadinessServices(container).fulfillment
    .retrieveFulfillmentSet(fulfillmentSetId, {
      relations: ["service_zones", "service_zones.geo_zones"],
    })
    .catch(() => null)
  const option = await retrieveOptionWithRelations(container, shippingOptionId)

  if (
    !set ||
    validateCommerceFulfillmentSet(
      set,
      prerequisites.countries,
      prerequisites.profile.id,
    ).id !== serviceZoneId
  ) {
    throw commerceSetupInvalid("The Fulfillment Set graph is incompatible.")
  }
  if (!option) {
    throw commerceSetupInvalid("The Shipping Option graph is unavailable.")
  }
  validateShippingOption(
    option,
    serviceZoneId,
    shippingProfileId,
    commerceShippingOptionCode(prerequisites.profile.id),
  )
  await validateShippingOptionPrice(
    container,
    shippingOptionId,
    prerequisites.currencyCode,
    prerequisites.region.id,
    request.shipping_option.amount,
  )

  const [providerLinks, setLinks, reverseSetLinks, zoneOptions] = await Promise.all([
    linkRecords(
      container,
      Modules.STOCK_LOCATION,
      "stock_location_id",
      Modules.FULFILLMENT,
      "fulfillment_provider_id",
      { stock_location_id: prerequisites.location.id },
    ),
    linkRecords(
      container,
      Modules.STOCK_LOCATION,
      "stock_location_id",
      Modules.FULFILLMENT,
      "fulfillment_set_id",
      { stock_location_id: prerequisites.location.id },
    ),
    linkRecords(
      container,
      Modules.STOCK_LOCATION,
      "stock_location_id",
      Modules.FULFILLMENT,
      "fulfillment_set_id",
      { fulfillment_set_id: fulfillmentSetId },
    ),
    commerceReadinessServices(container).fulfillment.listShippingOptions(
      { service_zone: { id: serviceZoneId } },
      { take: 2 },
    ),
  ])

  if (
    providerLinks.filter(
      (entry) => entry.fulfillment_provider_id === providerId,
    ).length !== 1 ||
    setLinks.length !== 1 ||
    setLinks[0]?.fulfillment_set_id !== fulfillmentSetId ||
    reverseSetLinks.length !== 1 ||
    reverseSetLinks[0]?.stock_location_id !== prerequisites.location.id ||
    zoneOptions.length !== 1 ||
    zoneOptions[0]?.id !== shippingOptionId
  ) {
    throw commerceSetupInvalid(
      "The Stock Location fulfillment links are incompatible.",
    )
  }

  return await updateCommerceReadiness(
    container,
    prerequisites.readiness,
    {
      plan_code: "professional_commerce",
      status: "ready",
      medusa_store_id: prerequisites.store.id,
      region_id: prerequisites.region.id,
      stock_location_id: prerequisites.location.id,
      fulfillment_provider_id: providerId,
      shipping_profile_id: shippingProfileId,
      fulfillment_set_id: fulfillmentSetId,
      service_zone_id: serviceZoneId,
      shipping_option_ids: [shippingOptionId],
      last_setup_id: record.id,
      failure_code: null,
      failure_message_safe: null,
      validated_at: new Date(),
      revision: Number(prerequisites.readiness.revision ?? 0) + 1,
    },
  )
}
