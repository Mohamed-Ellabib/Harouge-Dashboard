import {
  createProductsWorkflow,
  deleteProductsWorkflow,
} from "@medusajs/core-flows";
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import {
  MedusaError,
} from "@medusajs/framework/utils";

import {
  getMerchantStoreContext,
  requireMerchantPermission,
} from "../../_utils/merchant-store-context";
import {
  listExclusivelyOwnedProductIds,
  listProducts,
  listVendorProductLinks,
  normalizeHandle,
  stringOrNull,
  syncVendorProducts,
} from "../../_utils/vendors";
import {
  assertStoreOnlineCheckoutReady,
  resolveStoreShippingProfileId,
} from "../../_utils/store-commerce-readiness";
import {
  productPriceOrNull,
  resolveMerchantProductCurrency,
} from "../../_utils/merchant-product-price";
import { normalizeMerchantProductVariants } from "../../_utils/merchant-product-variants";
import {
  addMerchantInventoryToProducts,
  resolveStoreStockLocationId,
  setMerchantVariantStocks,
} from "../../_utils/merchant-product-inventory";
import {
  merchantImageUrlOrNull,
  normalizeMerchantProductImages,
} from "../../_utils/merchant-product-media";

const PRODUCT_STATUSES = ["draft", "published"] as const;

type ProductStatus = (typeof PRODUCT_STATUSES)[number];

type VendorProductCreateBody = {
  title?: unknown;
  handle?: unknown;
  status?: unknown;
  thumbnail?: unknown;
  description?: unknown;
  price?: unknown;
  currency_code?: unknown;
  sku?: unknown;
  variant_title?: unknown;
  variants?: unknown;
  images?: unknown;
};

const statusOrDefault = (value: unknown): ProductStatus =>
  typeof value === "string" && PRODUCT_STATUSES.includes(value as ProductStatus)
    ? (value as ProductStatus)
    : "published";

const hasOnlyAllowedChannel = (
  product: Record<string, any>,
  salesChannelId: string,
): boolean => {
  const channelIds = Array.isArray(product.sales_channels)
    ? product.sales_channels.map((channel: any) => channel.id)
    : [];

  return channelIds.length === 1 && channelIds[0] === salesChannelId;
};

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const context = await getMerchantStoreContext(req);
  requireMerchantPermission(context, "products.read");
  const productIds = await listExclusivelyOwnedProductIds(
    req,
    context.vendorId,
    context.medusaStoreId,
  );

  if (!productIds.length) {
    return res.json({ products: [], count: 0 });
  }

  const products = (
    await listProducts(req, { id: productIds }, productIds.length)
  ).filter((product) =>
    hasOnlyAllowedChannel(product, context.allowedSalesChannelId),
  );
  const stockLocationId = await resolveStoreStockLocationId(
    req,
    context.medusaStoreId,
  );
  const merchantProducts = await addMerchantInventoryToProducts(
    req,
    products,
    stockLocationId,
  );

  return res.json({ products: merchantProducts, count: merchantProducts.length });
}

export async function POST(
  req: MedusaRequest<VendorProductCreateBody>,
  res: MedusaResponse,
) {
  const context = await getMerchantStoreContext(req);
  requireMerchantPermission(context, "products.write");
  const body = req.body ?? {};
  const title = stringOrNull(body.title);
  const images =
    body.images === undefined
      ? []
      : normalizeMerchantProductImages(body.images);
  const suppliedThumbnail = merchantImageUrlOrNull(body.thumbnail);
  const thumbnail = suppliedThumbnail ?? images[0]?.url ?? null;

  if (!title) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Product title is required.",
    );
  }

  const handle = normalizeHandle(body.handle) || normalizeHandle(title);
  const currencyCode = await resolveMerchantProductCurrency(
    req,
    context.medusaStoreId,
    body.currency_code,
  );
  const variantInput =
    body.variants === undefined
      ? null
      : normalizeMerchantProductVariants(body.variants, currencyCode);
  const readiness = variantInput
    ? await assertStoreOnlineCheckoutReady(
        req,
        context.storeProfileId,
        context.medusaStoreId,
        { validateGraph: true },
      )
    : null;
  const stockLocationId = readiness?.stock_location_id;

  if (variantInput && (typeof stockLocationId !== "string" || !stockLocationId)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Product inventory could not be initialized.",
    );
  }

  const stockedQuantities =
    variantInput?.variants.map((variant) => variant.stocked_quantity) ?? [];
  const trackedVariants = variantInput?.variants.map(
    ({ stocked_quantity: _stockedQuantity, ...variant }) => variant,
  );
  const price = variantInput
    ? null
    : productPriceOrNull(body.price, currencyCode);

  if (!handle) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Product handle is required.",
    );
  }

  if ((await listProducts(req, { handle }, 1)).length) {
    throw new MedusaError(
      MedusaError.Types.CONFLICT,
      "A product with this handle already exists.",
    );
  }

  if (!variantInput && price === null) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Product price is required.",
    );
  }

  const shippingProfileId = await resolveStoreShippingProfileId(
    req,
    context.medusaStoreId,
  );
  const { result } = await createProductsWorkflow(req.scope).run({
    input: {
      products: [
        {
          title,
          handle,
          status: statusOrDefault(body.status),
          thumbnail,
          description: stringOrNull(body.description),
          images,
          shipping_profile_id: shippingProfileId,
          sales_channels: [{ id: context.allowedSalesChannelId }],
          options: variantInput?.options ?? [
            { title: "Default", values: ["Default"] },
          ],
          variants: trackedVariants ?? [
            {
              title: stringOrNull(body.variant_title) ?? title,
              sku: stringOrNull(body.sku),
              manage_inventory: false,
              allow_backorder: true,
              options: { Default: "Default" },
              prices: [{ amount: price as number, currency_code: currencyCode }],
            },
          ],
        },
      ],
    } as any,
  });
  const productId = result[0].id;

  if (variantInput) {
    try {
      const createdProducts = await listProducts(req, { id: [productId] }, 1);
      const variants = Array.isArray(createdProducts[0]?.variants)
        ? [...createdProducts[0].variants].sort(
            (left, right) =>
              Number(left.variant_rank) - Number(right.variant_rank),
          )
        : [];

      if (variants.length !== stockedQuantities.length) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "Product inventory could not be initialized.",
        );
      }

      await setMerchantVariantStocks(
        req,
        stockLocationId as string,
        variants.map((variant, index) => ({
          variant_id: variant.id,
          stock: stockedQuantities[index],
        })),
      );
    } catch (error) {
      await deleteProductsWorkflow(req.scope)
        .run({ input: { ids: [productId] } })
        .catch(() => undefined);
      throw error;
    }
  }

  const currentLinks = await listVendorProductLinks(req, {
    vendor_id: context.vendorId,
  });

  await syncVendorProducts(req, context.vendorId, [
    ...currentLinks.map((link) => link.product_id),
    productId,
  ]);

  const products = await listProducts(req, { id: [productId] }, 1);
  const merchantProducts = await addMerchantInventoryToProducts(
    req,
    products,
    stockLocationId ??
      (await resolveStoreStockLocationId(req, context.medusaStoreId)),
  );
  return res.status(201).json({ product: merchantProducts[0] ?? result[0] });
}
