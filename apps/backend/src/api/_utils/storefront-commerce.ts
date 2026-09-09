import type { MedusaRequest } from "@medusajs/framework/http";
import {
  ContainerRegistrationKeys,
  getVariantAvailability,
  MedusaError,
  QueryContext,
} from "@medusajs/framework/utils";

import type { PublicStoreContext } from "./public-store-context";
import { listExclusivelyOwnedCanonicalProductIds } from "./legacy-vendor-compatibility";
import type { StoreCommerceConfiguration } from "./checkout-store-policy";

const notFound = () =>
  new MedusaError(MedusaError.Types.NOT_FOUND, "Product was not found.");

const normalizedHandle = (value: unknown): string => {
  if (typeof value !== "string") {
    throw notFound();
  }

  const handle = value.trim().toLowerCase();
  if (
    !handle ||
    handle.length > 200 ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(handle)
  ) {
    throw notFound();
  }

  return handle;
};

const oneChannelOnly = (
  product: Record<string, any>,
  salesChannelId: string,
): boolean => {
  const channelIds = Array.isArray(product.sales_channels)
    ? product.sales_channels.map((channel: any) => channel.id)
    : [];

  return channelIds.length === 1 && channelIds[0] === salesChannelId;
};

export type StorefrontPurchaseOptions = {
  product_handle: string;
  currency_code: string;
  options: Array<{
    name: "size" | "color";
    values: string[];
  }>;
  variants: Array<{
    id: string;
    title: string;
    options: {
      size: string | null;
      color: string | null;
    };
    unit_price: number;
    available_for_sale: boolean;
  }>;
};

const publicVariantOptions = (
  variant: Record<string, any>,
): { size: string | null; color: string | null } | null => {
  const entries = Array.isArray(variant.options) ? variant.options : [];
  const result = { size: null as string | null, color: null as string | null };

  for (const entry of entries) {
    const title = String(entry?.option?.title ?? "").trim().toLowerCase();
    const value = String(entry?.value ?? "").trim();

    if (title === "default") {
      continue;
    }
    if (
      !value ||
      value.length > 60 ||
      (title !== "size" && title !== "color") ||
      result[title] !== null
    ) {
      return null;
    }
    result[title] = value;
  }

  const isLegacy = entries.every(
    (entry: any) =>
      String(entry?.option?.title ?? "").trim().toLowerCase() === "default",
  );

  return isLegacy || (result.size && result.color) ? result : null;
};

export const resolveStorefrontPurchaseOptions = async (
  req: MedusaRequest,
  context: PublicStoreContext,
  commerce: StoreCommerceConfiguration,
  handleInput: unknown,
): Promise<StorefrontPurchaseOptions> => {
  const handle = normalizedHandle(handleInput);
  const canonicalIds = await listExclusivelyOwnedCanonicalProductIds(
    req,
    context.medusaStoreId,
  );

  if (!canonicalIds.length) {
    throw notFound();
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY) as any;
  const { data: products = [] } = await query.graph({
    entity: "product",
    fields: [
      "id",
      "handle",
      "status",
      "sales_channels.id",
      "variants.id",
      "variants.title",
      "variants.variant_rank",
      "variants.manage_inventory",
      "variants.allow_backorder",
      "variants.options.value",
      "variants.options.option.title",
      "variants.prices.amount",
      "variants.prices.currency_code",
      "variants.calculated_price.calculated_amount",
      "variants.calculated_price.currency_code",
    ],
    filters: {
      id: canonicalIds,
      handle,
      status: "published",
    },
    pagination: { skip: 0, take: 2 },
    context: {
      variants: {
        calculated_price: QueryContext({
          currency_code: commerce.currencyCode,
          region_id: commerce.regionId,
        }),
      },
    },
  } as any);
  const product = products.length === 1 ? products[0] : null;
  const variants = Array.isArray(product?.variants)
    ? [...product.variants].sort((left, right) => {
        const leftRank = Number(left?.variant_rank);
        const rightRank = Number(right?.variant_rank);

        if (Number.isFinite(leftRank) && Number.isFinite(rightRank)) {
          return leftRank - rightRank;
        }

        return String(left?.id ?? "").localeCompare(String(right?.id ?? ""));
      })
    : [];

  if (
    !product ||
    product.handle !== handle ||
    product.status !== "published" ||
    !oneChannelOnly(product, context.salesChannelId) ||
    variants.length < 1 ||
    variants.length > 50
  ) {
    throw notFound();
  }

  const variantIds = variants.map((variant: Record<string, any>) => variant.id);
  const availability = await getVariantAvailability(query, {
    variant_ids: variantIds,
    sales_channel_id: context.salesChannelId,
  });

  const publicVariants = variants.map((variant: Record<string, any>) => {
    const prices = Array.isArray(variant?.prices) ? variant.prices : [];
    const price = prices.length === 1 ? prices[0] : null;
    const calculatedPrice = variant?.calculated_price;
    const unitPrice = Number(calculatedPrice?.calculated_amount);
    const options = publicVariantOptions(variant);
    const availableQuantity = availability[variant.id]?.availability;
    const isLegacyUntracked =
      variant.manage_inventory === false && variant.allow_backorder === true;
    const isTracked =
      variant.manage_inventory === true &&
      variant.allow_backorder === false &&
      Number.isSafeInteger(availableQuantity) &&
      Number(availableQuantity) >= 0;

    if (
      typeof variant.id !== "string" ||
      !variant.id ||
      typeof variant.title !== "string" ||
      !variant.title.trim() ||
      variant.title.length > 240 ||
      (!isLegacyUntracked && !isTracked) ||
      !options ||
      !price ||
      String(price.currency_code ?? "").toLowerCase() !== commerce.currencyCode ||
      Number(price.amount) !== unitPrice ||
      String(calculatedPrice?.currency_code ?? "").toLowerCase() !==
        commerce.currencyCode ||
      !Number.isFinite(unitPrice) ||
      unitPrice < 0
    ) {
      throw notFound();
    }

    return {
      id: variant.id,
      title: variant.title.trim(),
      options,
      unit_price: unitPrice,
      available_for_sale:
        isLegacyUntracked || Number(availableQuantity) > 0,
    };
  });
  const valuesFor = (name: "size" | "color"): string[] => {
    const values = publicVariants
      .map((variant) => variant.options[name])
      .filter((value): value is string => typeof value === "string");

    return [...new Set<string>(values)];
  };
  const options = (["size", "color"] as const)
    .map((name) => ({ name, values: valuesFor(name) }))
    .filter((option) => option.values.length > 0);

  return {
    product_handle: handle,
    currency_code: commerce.currencyCode,
    options,
    variants: publicVariants,
  };
};
