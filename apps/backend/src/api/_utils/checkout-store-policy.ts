import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils";

import { listStoreProductLinks } from "./legacy-vendor-compatibility";
import {
  checkoutScopeFor,
  type CheckoutScopeInput,
} from "./checkout-ownership-links";

const invalid = (message: string) =>
  new MedusaError(MedusaError.Types.INVALID_DATA, message);

const metadataList = (store: Record<string, any>, key: string): string[] => {
  const value = store.metadata?.[key];

  return Array.isArray(value)
    ? [
        ...new Set(
          value.filter(
            (entry): entry is string =>
              typeof entry === "string" && Boolean(entry),
          ),
        ),
      ]
    : [];
};

export const getCheckoutStore = async (
  input: CheckoutScopeInput,
  storeId: string,
): Promise<Record<string, any>> => {
  const service = checkoutScopeFor(input).resolve(Modules.STORE) as any;

  return await service.retrieveStore(storeId, {
    relations: ["supported_currencies"],
  });
};

export type StoreCommerceConfiguration = {
  currencyCode: string;
  countryCodes: string[];
  regionId: string;
};

export const resolveStoreCommerceConfiguration = async (
  input: CheckoutScopeInput,
  storeId: string,
): Promise<StoreCommerceConfiguration> => {
  const store = await getCheckoutStore(input, storeId);
  const allowedRegionIds = metadataList(store, "saas_allowed_region_ids");
  const supportedCurrencies = [
    ...new Set(
      (store.supported_currencies ?? [])
        .map((entry: any) =>
          String(entry.currency_code ?? "")
            .trim()
            .toLowerCase(),
        )
        .filter((entry: string) => /^[a-z]{3}$/.test(entry)),
    ),
  ];

  if (
    allowedRegionIds.length !== 1 ||
    store.default_region_id !== allowedRegionIds[0] ||
    supportedCurrencies.length !== 1
  ) {
    throw invalid("The Store commerce currency is unavailable.");
  }

  const regionService = checkoutScopeFor(input).resolve(Modules.REGION) as any;
  const region = await regionService
    .retrieveRegion(allowedRegionIds[0], { relations: ["countries"] })
    .catch(() => null);
  const currencyCode = String(region?.currency_code ?? "")
    .trim()
    .toLowerCase();
  const countryCodes: string[] = [
    ...new Set(
      (region?.countries ?? [])
        .map((country: any) =>
          String(country.iso_2 ?? "")
            .trim()
            .toLowerCase(),
        )
        .filter((countryCode: string) => /^[a-z]{2}$/.test(countryCode)),
    ),
  ].sort() as string[];

  if (
    !region ||
    currencyCode !== supportedCurrencies[0] ||
    !countryCodes.length
  ) {
    throw invalid("The Store commerce currency is unavailable.");
  }

  return {
    currencyCode,
    countryCodes,
    regionId: region.id,
  };
};

export const allowedRegionIdsForStore = async (
  input: CheckoutScopeInput,
  storeId: string,
): Promise<string[]> =>
  metadataList(
    await getCheckoutStore(input, storeId),
    "saas_allowed_region_ids",
  );

export const assertRegionAllowedForStore = async (
  input: CheckoutScopeInput,
  storeId: string,
  regionId: string,
  expectedCurrency?: string | null,
): Promise<Record<string, any>> => {
  const allowed = await allowedRegionIdsForStore(input, storeId);

  if (!allowed.length || !allowed.includes(regionId)) {
    throw invalid("The selected region is not available for this Store.");
  }

  const regionService = checkoutScopeFor(input).resolve(Modules.REGION) as any;
  const region = await regionService.retrieveRegion(regionId).catch(() => null);
  const store = await getCheckoutStore(input, storeId);
  const currencies = (store.supported_currencies ?? [])
    .map((entry: any) => entry.currency_code)
    .filter(Boolean);

  if (
    !region ||
    !currencies.includes(region.currency_code) ||
    (expectedCurrency && region.currency_code !== expectedCurrency)
  ) {
    throw invalid(
      "The Cart currency and region are incompatible with the Store.",
    );
  }

  return region;
};

export const selectRegionForStore = async (
  input: CheckoutScopeInput,
  storeId: string,
  requestedRegionId?: string | null,
): Promise<Record<string, any>> => {
  const allowed = await allowedRegionIdsForStore(input, storeId);

  if (!requestedRegionId && allowed.length !== 1) {
    throw invalid(
      "The Cart must explicitly select one Store-compatible region.",
    );
  }

  return await assertRegionAllowedForStore(
    input,
    storeId,
    requestedRegionId ?? allowed[0],
  );
};

export const assertShippingOptionsAllowedForStore = async (
  input: CheckoutScopeInput,
  storeId: string,
  optionIds: string[],
): Promise<void> => {
  const allowed = metadataList(
    await getCheckoutStore(input, storeId),
    "saas_allowed_shipping_option_ids",
  );
  const requested = [...new Set(optionIds.filter(Boolean))];

  if (
    !requested.length ||
    !allowed.length ||
    requested.some((id) => !allowed.includes(id))
  ) {
    throw invalid("A shipping option is not available for this Store.");
  }
};

export const assertPromotionCodesAllowedForStore = async (
  input: CheckoutScopeInput,
  storeId: string,
  promoCodes: string[],
): Promise<void> => {
  if (!promoCodes.length) {
    return;
  }

  const allowed = metadataList(
    await getCheckoutStore(input, storeId),
    "saas_allowed_promotion_codes",
  ).map((code) => code.toLowerCase());

  if (
    !allowed.length ||
    promoCodes.some((code) => !allowed.includes(String(code).toLowerCase()))
  ) {
    throw invalid("A promotion is not available for this Store.");
  }
};

export const validateVariantsForStore = async (
  input: CheckoutScopeInput,
  storeId: string,
  salesChannelId: string,
  variantIds: string[],
): Promise<Map<string, string>> => {
  const ids = [...new Set(variantIds.filter(Boolean))];

  if (!ids.length) {
    return new Map();
  }

  const productService = checkoutScopeFor(input).resolve(
    Modules.PRODUCT,
  ) as any;
  const variants = await productService.listProductVariants(
    { id: ids },
    { take: ids.length },
  );
  const variantProducts = new Map<string, string>();

  for (const variant of variants) {
    const productId = variant.product_id ?? variant.product?.id;

    if (variant.id && productId) {
      variantProducts.set(variant.id, productId);
    }
  }

  if (variantProducts.size !== ids.length) {
    throw invalid("A Cart item references an unavailable product variant.");
  }

  const productIds = [...new Set(variantProducts.values())];
  const query = checkoutScopeFor(input).resolve(
    ContainerRegistrationKeys.QUERY,
  ) as any;
  const { data: products = [] } = await query.graph({
    entity: "product",
    fields: ["id", "status", "sales_channels.id"],
    filters: { id: productIds },
    pagination: { skip: 0, take: productIds.length },
  } as any);
  const productById = new Map(
    products.map((product: any) => [product.id, product]),
  );

  for (const productId of productIds) {
    const product = productById.get(productId) as any;
    const owners = await listStoreProductLinks(input, {
      product_id: productId,
    });
    const channelIds = Array.isArray(product?.sales_channels)
      ? product.sales_channels.map((channel: any) => channel.id)
      : [];

    if (
      !product ||
      product.status !== "published" ||
      owners.length !== 1 ||
      owners[0].store_id !== storeId ||
      !channelIds.includes(salesChannelId)
    ) {
      throw invalid("A Cart item is not available for this Store.");
    }
  }

  return variantProducts;
};

export const validateCartItemsForStore = async (
  input: CheckoutScopeInput,
  cart: Record<string, any>,
  storeId: string,
  salesChannelId: string,
): Promise<void> => {
  const items = Array.isArray(cart.items) ? cart.items : [];
  const variantIds = items.map((item: any) => item.variant_id).filter(Boolean);

  if (variantIds.length !== items.length) {
    throw invalid(
      "Every commercial Cart item must reference a product variant.",
    );
  }

  const variantProducts = await validateVariantsForStore(
    input,
    storeId,
    salesChannelId,
    variantIds,
  );

  for (const item of items) {
    const itemProductId =
      item.product_id ?? item.variant?.product_id ?? item.variant?.product?.id;

    if (
      itemProductId &&
      variantProducts.get(item.variant_id) !== itemProductId
    ) {
      throw invalid("A Cart item's product and variant ownership disagree.");
    }
  }
};
