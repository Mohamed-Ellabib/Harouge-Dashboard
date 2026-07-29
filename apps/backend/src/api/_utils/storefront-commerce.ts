import type { MedusaRequest } from "@medusajs/framework/http";
import {
  ContainerRegistrationKeys,
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
  variant: {
    id: string;
    title: string;
    unit_price: number;
    available_for_sale: boolean;
  };
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
      "variants.manage_inventory",
      "variants.allow_backorder",
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
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  const variant = variants.length === 1 ? variants[0] : null;
  const prices = Array.isArray(variant?.prices) ? variant.prices : [];
  const price = prices.length === 1 ? prices[0] : null;
  const calculatedPrice = variant?.calculated_price;
  const unitPrice = Number(calculatedPrice?.calculated_amount);

  if (
    !product ||
    product.handle !== handle ||
    product.status !== "published" ||
    !oneChannelOnly(product, context.salesChannelId) ||
    !variant ||
    typeof variant.id !== "string" ||
    !variant.id ||
    typeof variant.title !== "string" ||
    !variant.title.trim() ||
    variant.title.length > 240 ||
    variant.manage_inventory !== false ||
    variant.allow_backorder !== true ||
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
    product_handle: handle,
    currency_code: commerce.currencyCode,
    variant: {
      id: variant.id,
      title: variant.title.trim(),
      unit_price: unitPrice,
      available_for_sale: true,
    },
  };
};
