import {
  ContainerRegistrationKeys,
  LINKS,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"

import {
  COMMERCE_GATE_FULFILLMENT_PROVIDER_ID,
  COMMERCE_GATE_PAYMENT_PROVIDER_ID,
  commerceFulfillmentSetName,
  commerceServiceZoneName,
  commerceShippingOptionCode,
} from "../../workflows/commerce-readiness-contract"
import { getSaasService } from "./legacy-vendor-compatibility"
import {
  checkoutScopeFor,
  type CheckoutScopeInput,
} from "./checkout-ownership-links"
import {
  hasExactCommerceShippingOptionPrices,
  hasExactCommerceShippingOptionRules,
} from "../../workflows/commerce-readiness-resources"

const unavailable = () =>
  new MedusaError(
    MedusaError.Types.INVALID_DATA,
    "Online checkout is not available for this Store.",
  )

const metadataIds = (store: Record<string, any>, key: string): string[] => {
  const value = store.metadata?.[key]

  return Array.isArray(value)
    ? [...new Set(value.filter((entry): entry is string => Boolean(entry)))].sort()
    : []
}

const exactStrings = (left: string[], right: string[]): boolean =>
  JSON.stringify([...new Set(left.map((value) => value.toLowerCase()))].sort()) ===
  JSON.stringify([...new Set(right.map((value) => value.toLowerCase()))].sort())

const linksFor = async (
  input: CheckoutScopeInput,
  leftModule: string,
  leftField: string,
  rightModule: string,
  rightField: string,
  filters: Record<string, unknown>,
): Promise<Record<string, any>[]> => {
  const link = checkoutScopeFor(input).resolve(
    ContainerRegistrationKeys.LINK,
  ) as any
  const linkModule = link.getLinkModule(
    leftModule,
    leftField,
    rightModule,
    rightField,
  )

  return linkModule ? await linkModule.list(filters) : []
}

export const assertStoreOnlineCheckoutReady = async (
  input: CheckoutScopeInput,
  storeProfileId: string,
  medusaStoreId: string,
  options: { validateGraph?: boolean } = {},
): Promise<Record<string, any>> => {
  const saas = getSaasService(input) as any
  const scope = checkoutScopeFor(input)
  const storeService = scope.resolve(Modules.STORE) as any
  const [profile, records, store] = await Promise.all([
    saas.retrieveStoreProfile(storeProfileId).catch(() => null),
    saas.listStoreCommerceReadinesses({
      store_profile_id: storeProfileId,
    }),
    storeService
      .retrieveStore(medusaStoreId, { relations: ["supported_currencies"] })
      .catch(() => null),
  ])
  const readiness = records.length === 1 ? records[0] : null
  const readinessOptions = Array.isArray(readiness?.shipping_option_ids)
    ? [...new Set(readiness.shipping_option_ids.filter(Boolean))].sort()
    : []

  if (
    !profile ||
    profile.status !== "active" ||
    profile.plan_code !== "professional_commerce" ||
    !readiness ||
    readiness.plan_code !== "professional_commerce" ||
    readiness.status !== "ready" ||
    readiness.medusa_store_id !== medusaStoreId ||
    readiness.region_id !== store?.default_region_id ||
    readiness.stock_location_id !== store?.default_location_id ||
    !readiness.fulfillment_provider_id ||
    !readiness.shipping_profile_id ||
    !readiness.fulfillment_set_id ||
    !readiness.service_zone_id ||
    readinessOptions.length !== 1 ||
    store?.metadata?.saas_shipping_profile_id !==
      readiness.shipping_profile_id ||
    JSON.stringify(metadataIds(store, "saas_allowed_shipping_option_ids")) !==
      JSON.stringify(readinessOptions) ||
    !exactStrings(metadataIds(store, "saas_allowed_region_ids"), [
      readiness.region_id,
    ]) ||
    !readiness.last_setup_id
  ) {
    throw unavailable()
  }

  const setup = await saas
    .retrieveStoreCommerceSetup(readiness.last_setup_id)
    .catch(() => null)

  if (
    setup?.status !== "completed" ||
    setup.store_profile_id !== storeProfileId
  ) {
    throw unavailable()
  }

  if (!options.validateGraph) {
    return readiness
  }

  const fulfillment = scope.resolve(Modules.FULFILLMENT) as any
  const payment = scope.resolve(Modules.PAYMENT) as any
  const regionService = scope.resolve(Modules.REGION) as any
  const stockLocation = scope.resolve(Modules.STOCK_LOCATION) as any
  const remoteQuery = scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY) as any
  const region = await regionService
    .retrieveRegion(readiness.region_id, { relations: ["countries"] })
    .catch(() => null)
  const location = await stockLocation
    .retrieveStockLocation(readiness.stock_location_id)
    .catch(() => null)
  const providers = await fulfillment.listFulfillmentProviders({
    id: readiness.fulfillment_provider_id,
  })
  const shippingProfile = await fulfillment
    .retrieveShippingProfile(readiness.shipping_profile_id)
    .catch(() => null)
  const fulfillmentSet = await fulfillment
    .retrieveFulfillmentSet(readiness.fulfillment_set_id, {
      relations: ["service_zones", "service_zones.geo_zones"],
    })
    .catch(() => null)
  const shippingOptions: Array<Record<string, any> | null> = []

  for (const id of readinessOptions) {
    shippingOptions.push(
      await fulfillment
        .retrieveShippingOption(id, {
          relations: ["rules", "service_zone", "type"],
        })
        .catch(() => null),
    )
  }

  const paymentProviders = await payment.listPaymentProviders({
    id: COMMERCE_GATE_PAYMENT_PROVIDER_ID,
  })
  const regionPaymentLinks = await linksFor(
    input,
    Modules.REGION,
    "region_id",
    Modules.PAYMENT,
    "payment_provider_id",
    { region_id: readiness.region_id },
  )
  const channelLocationLinks = await linksFor(
    input,
    Modules.SALES_CHANNEL,
    "sales_channel_id",
    Modules.STOCK_LOCATION,
    "stock_location_id",
    { stock_location_id: readiness.stock_location_id },
  )
  const locationProviderLinks = await linksFor(
    input,
    Modules.STOCK_LOCATION,
    "stock_location_id",
    Modules.FULFILLMENT,
    "fulfillment_provider_id",
    { stock_location_id: readiness.stock_location_id },
  )
  const locationSetLinks = await linksFor(
    input,
    Modules.STOCK_LOCATION,
    "stock_location_id",
    Modules.FULFILLMENT,
    "fulfillment_set_id",
    { stock_location_id: readiness.stock_location_id },
  )
  const reverseLocationSetLinks = await linksFor(
    input,
    Modules.STOCK_LOCATION,
    "stock_location_id",
    Modules.FULFILLMENT,
    "fulfillment_set_id",
    { fulfillment_set_id: readiness.fulfillment_set_id },
  )
  const serviceZones = Array.isArray(fulfillmentSet?.service_zones)
    ? fulfillmentSet.service_zones
    : []
  const serviceZone = serviceZones.find(
    (zone: Record<string, any>) => zone.id === readiness.service_zone_id,
  )
  const regionCountries = (region?.countries ?? [])
    .map((country: Record<string, any>) => String(country.iso_2 ?? ""))
    .filter(Boolean)
  const geoZones = Array.isArray(serviceZone?.geo_zones)
    ? serviceZone.geo_zones
    : []
  const zoneCountries = geoZones
    .map((zone: Record<string, any>) => String(zone.country_code ?? ""))
    .filter(Boolean)
  const supportedCurrencies = (store.supported_currencies ?? [])
    .map((currency: Record<string, any>) =>
      String(currency.currency_code ?? "").toLowerCase(),
    )
    .filter(Boolean)
  const setupAmount = Number(setup?.request_snapshot?.shipping_option?.amount)
  const optionPriceRows: Array<Record<string, any> | null> = []
  const zoneShippingOptions = serviceZone
    ? await fulfillment.listShippingOptions(
        { service_zone: { id: serviceZone.id } },
        { take: 2 },
      )
    : []

  for (const shippingOptionId of readinessOptions) {
    const rows = await remoteQuery({
        service: LINKS.ShippingOptionPriceSet,
        variables: { filters: { shipping_option_id: shippingOptionId } },
        fields: [
          "shipping_option_id",
          "price_set_id",
          "price_set.prices.*",
          "price_set.prices.price_rules.*",
        ],
    })
    optionPriceRows.push(rows.length === 1 ? rows[0] : null)
  }

  if (
    !region ||
    !location ||
    providers.length !== 1 ||
    providers[0].id !== COMMERCE_GATE_FULFILLMENT_PROVIDER_ID ||
    providers[0].is_enabled === false ||
    readiness.fulfillment_provider_id !==
      COMMERCE_GATE_FULFILLMENT_PROVIDER_ID ||
    !shippingProfile ||
    fulfillmentSet?.type !== "shipping" ||
    fulfillmentSet?.name !== commerceFulfillmentSetName(storeProfileId) ||
    serviceZones.length !== 1 ||
    !serviceZone ||
    serviceZone.name !== commerceServiceZoneName(storeProfileId) ||
    !regionCountries.length ||
    geoZones.length !== new Set(regionCountries.map((code: string) => code.toLowerCase())).size ||
    geoZones.some(
      (zone: Record<string, any>) =>
        zone.type !== "country" ||
        typeof zone.country_code !== "string" ||
        !zone.country_code.trim(),
    ) ||
    !exactStrings(regionCountries, zoneCountries) ||
    !supportedCurrencies.includes(String(region.currency_code).toLowerCase()) ||
    paymentProviders.length !== 1 ||
    paymentProviders[0].is_enabled === false ||
    setup?.status !== "completed" ||
    setup.store_profile_id !== storeProfileId ||
    !Number.isSafeInteger(setupAmount) ||
    regionPaymentLinks.filter(
      (entry) =>
        entry.payment_provider_id === COMMERCE_GATE_PAYMENT_PROVIDER_ID,
    ).length !== 1 ||
    channelLocationLinks.length !== 1 ||
    channelLocationLinks[0]?.sales_channel_id !==
      store.default_sales_channel_id ||
    locationProviderLinks.filter(
      (entry) =>
        entry.fulfillment_provider_id === readiness.fulfillment_provider_id,
    ).length !== 1 ||
    locationSetLinks.length !== 1 ||
    locationSetLinks[0]?.fulfillment_set_id !==
      readiness.fulfillment_set_id ||
    reverseLocationSetLinks.length !== 1 ||
    reverseLocationSetLinks[0]?.stock_location_id !==
      readiness.stock_location_id ||
    zoneShippingOptions.length !== 1 ||
    zoneShippingOptions[0]?.id !== readinessOptions[0] ||
    shippingOptions.some(
      (option) =>
        !option ||
        option.price_type !== "flat" ||
        option.provider_id !== readiness.fulfillment_provider_id ||
        option.shipping_profile_id !== readiness.shipping_profile_id ||
        option.service_zone_id !== readiness.service_zone_id ||
        option.type?.code !== commerceShippingOptionCode(storeProfileId) ||
        !hasExactCommerceShippingOptionRules(option.rules),
    ) ||
    optionPriceRows.some(
      (row, index) =>
        !row?.price_set_id ||
        row.shipping_option_id !== readinessOptions[index] ||
        !hasExactCommerceShippingOptionPrices(
          row.price_set?.prices,
          String(region.currency_code),
          readiness.region_id,
          setupAmount,
        ),
    )
  ) {
    throw unavailable()
  }

  return readiness
}

export const resolveStoreShippingProfileId = async (
  input: CheckoutScopeInput,
  medusaStoreId: string,
): Promise<string> => {
  const scope = checkoutScopeFor(input)
  const store = await (scope.resolve(Modules.STORE) as any).retrieveStore(
    medusaStoreId,
  )
  const fulfillment = scope.resolve(Modules.FULFILLMENT) as any
  const pinned = store.metadata?.saas_shipping_profile_id

  if (typeof pinned === "string" && pinned) {
    const profile = await fulfillment
      .retrieveShippingProfile(pinned)
      .catch(() => null)

    if (profile?.id === pinned) {
      return pinned
    }
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "The Store Shipping Profile is unavailable.",
    )
  }

  const profiles = await fulfillment.listShippingProfiles(
    { type: "default" },
    { take: 2 },
  )

  if (profiles.length !== 1) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Exactly one default Shipping Profile is required.",
    )
  }

  return profiles[0].id
}
