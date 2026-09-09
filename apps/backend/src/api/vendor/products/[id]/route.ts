import {
  createProductVariantsWorkflow,
  deleteProductsWorkflow,
  deleteProductVariantsWorkflow,
  updateProductVariantsWorkflow,
  updateProductsWorkflow,
} from "@medusajs/core-flows";
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MedusaError } from "@medusajs/framework/utils";

import {
  getMerchantStoreContext,
  requireMerchantPermission,
} from "../../../_utils/merchant-store-context";
import {
  assertProductBelongsExclusivelyToVendor,
  listProducts,
  listVendorProductLinks,
  normalizeHandle,
  stringOrNull,
  syncVendorProducts,
} from "../../../_utils/vendors";
import {
  assertStoreOnlineCheckoutReady,
  resolveStoreShippingProfileId,
} from "../../../_utils/store-commerce-readiness";
import {
  productPriceOrNull,
  resolveMerchantProductCurrency,
} from "../../../_utils/merchant-product-price";
import { normalizeMerchantProductVariants } from "../../../_utils/merchant-product-variants";
import {
  addMerchantInventoryToProducts,
  resolveStoreStockLocationId,
  setMerchantVariantStocks,
} from "../../../_utils/merchant-product-inventory";
import {
  merchantImageUrlOrNull,
  normalizeMerchantProductImages,
} from "../../../_utils/merchant-product-media";

const PRODUCT_STATUSES = ["draft", "published"] as const;

type ProductStatus = (typeof PRODUCT_STATUSES)[number];
type VendorProductUpdateBody = {
  title?: unknown;
  handle?: unknown;
  status?: unknown;
  thumbnail?: unknown;
  images?: unknown;
  description?: unknown;
  price?: unknown;
  currency_code?: unknown;
  sku?: unknown;
  variant_title?: unknown;
  variants?: unknown;
};

const statusOrNull = (value: unknown): ProductStatus | null =>
  typeof value === "string" && PRODUCT_STATUSES.includes(value as ProductStatus)
    ? (value as ProductStatus)
    : null;

const getOwnedProduct = async (
  req: MedusaRequest,
  vendorId: string,
  medusaStoreId: string,
  salesChannelId: string,
  productId: string,
): Promise<Record<string, any>> => {
  await assertProductBelongsExclusivelyToVendor(
    req,
    vendorId,
    productId,
    medusaStoreId,
  );
  const product = (await listProducts(req, { id: [productId] }, 1))[0];
  const channelIds = Array.isArray(product?.sales_channels)
    ? product.sales_channels.map((channel: any) => channel.id)
    : [];

  if (!product || channelIds.length !== 1 || channelIds[0] !== salesChannelId) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "Product was not found.",
    );
  }

  return product;
};

const presentProduct = async (
  req: MedusaRequest,
  medusaStoreId: string,
  product: Record<string, any>,
  stockLocationId?: string | null,
) => {
  const locationId =
    stockLocationId ??
    (await resolveStoreStockLocationId(req, medusaStoreId));
  return (
    await addMerchantInventoryToProducts(req, [product], locationId)
  )[0];
};

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const context = await getMerchantStoreContext(req);
  requireMerchantPermission(context, "products.read");
  const product = await getOwnedProduct(
    req,
    context.vendorId,
    context.medusaStoreId,
    context.allowedSalesChannelId,
    req.params.id,
  );

  return res.json({
    product: await presentProduct(req, context.medusaStoreId, product),
  });
}

export async function PATCH(
  req: MedusaRequest<VendorProductUpdateBody>,
  res: MedusaResponse,
) {
  const context = await getMerchantStoreContext(req);
  requireMerchantPermission(context, "products.write");
  const productId = req.params.id;
  const currentProduct = await getOwnedProduct(
    req,
    context.vendorId,
    context.medusaStoreId,
    context.allowedSalesChannelId,
    productId,
  );
  const body = req.body ?? {};
  const currencyCode = await resolveMerchantProductCurrency(
    req,
    context.medusaStoreId,
    body.currency_code,
  );
  const update: Record<string, unknown> = {
    sales_channels: [{ id: context.allowedSalesChannelId }],
  };

  if ("title" in body) {
    const title = stringOrNull(body.title);
    if (!title) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Product title is required.",
      );
    }
    update.title = title;
  }

  if ("handle" in body) {
    const handle = normalizeHandle(body.handle);
    if (!handle) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Product handle is required.",
      );
    }

    const conflictingProduct = (await listProducts(req, { handle }, 2)).find(
      (product) => product.id !== productId,
    );
    if (conflictingProduct) {
      throw new MedusaError(
        MedusaError.Types.CONFLICT,
        "A product with this handle already exists.",
      );
    }
    update.handle = handle;
  }

  if ("status" in body) {
    const status = statusOrNull(body.status);
    if (!status) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Product status is invalid.",
      );
    }
    update.status = status;
  }

  if ("description" in body) {
    update.description = stringOrNull(body.description);
  }

  if ("images" in body) {
    const allowedImageIds = new Set<string>(
      Array.isArray(currentProduct.images)
        ? currentProduct.images
            .map((image: any) => image.id)
            .filter((id: unknown): id is string => typeof id === "string")
        : [],
    );
    const images = normalizeMerchantProductImages(
      body.images,
      allowedImageIds,
    );
    update.images = images;
    update.thumbnail =
      "thumbnail" in body
        ? merchantImageUrlOrNull(body.thumbnail)
        : images[0]?.url ?? null;
  } else if ("thumbnail" in body) {
    update.thumbnail = merchantImageUrlOrNull(body.thumbnail);
  }

  const variantInput =
    "variants" in body
      ? normalizeMerchantProductVariants(body.variants, currencyCode)
      : null;
  const legacyVariantRequested =
    "price" in body || "sku" in body || "variant_title" in body;
  const supportedProductChange = [
    "title",
    "handle",
    "status",
    "thumbnail",
    "images",
    "description",
  ].some((key) => key in body);

  if (!supportedProductChange && !variantInput && !legacyVariantRequested) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "No supported product fields were provided.",
    );
  }

  let stockLocationId: string | null = null;
  if (variantInput) {
    const readiness = await assertStoreOnlineCheckoutReady(
      req,
      context.storeProfileId,
      context.medusaStoreId,
      { validateGraph: true },
    );
    stockLocationId =
      typeof readiness.stock_location_id === "string"
        ? readiness.stock_location_id
        : null;

    if (!stockLocationId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Product inventory could not be updated.",
      );
    }

    const currentVariants = Array.isArray(currentProduct.variants)
      ? currentProduct.variants
      : [];
    const currentVariantById = new Map<string, Record<string, any>>(
      currentVariants
        .filter((variant: any) => typeof variant?.id === "string")
        .map((variant: any) => [variant.id, variant]),
    );

    for (const variant of variantInput.variants) {
      if (variant.id && !currentVariantById.has(variant.id)) {
        throw new MedusaError(
          MedusaError.Types.NOT_FOUND,
          "Product variant was not found.",
        );
      }
    }

    const currentOptions = Array.isArray(currentProduct.options)
      ? currentProduct.options
      : [];
    const submittedOptionsByTitle = new Map(
      variantInput.options.map((option) => [option.title, option]),
    );
    const preservedOptions = currentOptions.flatMap((option: any) => {
      if (
        option?.title === "Size" ||
        option?.title === "Color" ||
        typeof option?.title !== "string"
      ) {
        return [];
      }

      const values = Array.isArray(option.values)
        ? option.values
            .map((value: any) => value?.value)
            .filter((value: unknown): value is string => typeof value === "string")
        : [];
      return values.length ? [{ title: option.title, values }] : [];
    });
    const fixedOptions = Object.fromEntries(
      preservedOptions.map((option) => [option.title, option.values[0]]),
    );
    update.options = [
      ...preservedOptions,
      submittedOptionsByTitle.get("Size"),
      submittedOptionsByTitle.get("Color"),
    ].filter(Boolean);

    if (body.status === "published") {
      update.shipping_profile_id = await resolveStoreShippingProfileId(
        req,
        context.medusaStoreId,
      );
    }

    await updateProductsWorkflow(req.scope).run({
      input: { selector: { id: productId }, update } as any,
    });

    const retainedVariants = variantInput.variants.filter(
      (variant) =>
        variant.id && currentVariantById.get(variant.id)?.manage_inventory,
    );
    const variantsToCreate = variantInput.variants.filter(
      (variant) =>
        !variant.id || !currentVariantById.get(variant.id)?.manage_inventory,
    );
    const retainedIds = new Set(
      retainedVariants.map((variant) => variant.id as string),
    );
    const variantsToDelete = currentVariants
      .map((variant: any) => variant.id)
      .filter(
        (id: unknown): id is string =>
          typeof id === "string" && !retainedIds.has(id),
      );

    if (retainedVariants.length) {
      await updateProductVariantsWorkflow(req.scope).run({
        input: {
          product_variants: retainedVariants.map(
            ({ stocked_quantity: _stock, ...variant }) => ({
              ...variant,
              product_id: productId,
              options: { ...fixedOptions, ...variant.options },
            }),
          ),
        } as any,
      });
    }

    let createdVariants: Array<Record<string, any>> = [];
    if (variantsToCreate.length) {
      const { result } = await createProductVariantsWorkflow(req.scope).run({
        input: {
          product_variants: variantsToCreate.map(
            ({ id: _id, stocked_quantity: _stock, ...variant }) => ({
              ...variant,
              product_id: productId,
              options: { ...fixedOptions, ...variant.options },
            }),
          ),
        } as any,
      });
      createdVariants = result;
    }

    try {
      await setMerchantVariantStocks(req, stockLocationId, [
        ...retainedVariants.map((variant) => ({
          variant_id: variant.id as string,
          stock: variant.stocked_quantity,
        })),
        ...createdVariants.map((variant, index) => ({
          variant_id: variant.id,
          stock: variantsToCreate[index].stocked_quantity,
        })),
      ]);
    } catch (error) {
      if (createdVariants.length) {
        await deleteProductVariantsWorkflow(req.scope)
          .run({ input: { ids: createdVariants.map((variant) => variant.id) } })
          .catch(() => undefined);
      }
      throw error;
    }

    if (variantsToDelete.length) {
      await deleteProductVariantsWorkflow(req.scope).run({
        input: { ids: variantsToDelete },
      });
    }
  } else {
    const primaryVariant = Array.isArray(currentProduct.variants)
      ? currentProduct.variants[0]
      : null;

    if (
      legacyVariantRequested &&
      Array.isArray(currentProduct.variants) &&
      currentProduct.variants.length > 1
    ) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Use the Product variants editor to update a multi-variant Product.",
      );
    }

    if (body.status === "published" || "price" in body) {
      update.shipping_profile_id = await resolveStoreShippingProfileId(
        req,
        context.medusaStoreId,
      );
    }

    await updateProductsWorkflow(req.scope).run({
      input: { selector: { id: productId }, update } as any,
    });

    if (legacyVariantRequested) {
      const variantUpdate: Record<string, unknown> = {};
      if ("sku" in body) {
        variantUpdate.sku = stringOrNull(body.sku);
      }
      if ("variant_title" in body) {
        variantUpdate.title =
          stringOrNull(body.variant_title) ??
          update.title ??
          currentProduct.title ??
          "Default";
      }
      if ("price" in body) {
        const price = productPriceOrNull(body.price, currencyCode);
        if (price === null) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            "Product price is required.",
          );
        }
        variantUpdate.prices = [{ amount: price, currency_code: currencyCode }];
      }

      if (primaryVariant?.id) {
        await updateProductVariantsWorkflow(req.scope).run({
          input: {
            product_variants: [
              { id: primaryVariant.id, product_id: productId, ...variantUpdate },
            ],
          } as any,
        });
      } else {
        const price = productPriceOrNull(body.price, currencyCode);
        if (price === null) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            "Product price is required before creating the first variant.",
          );
        }
        await createProductVariantsWorkflow(req.scope).run({
          input: {
            product_variants: [
              {
                product_id: productId,
                title:
                  stringOrNull(body.variant_title) ??
                  update.title ??
                  currentProduct.title ??
                  "Default",
                sku: stringOrNull(body.sku),
                manage_inventory: false,
                allow_backorder: true,
                options: { Default: "Default" },
                prices: [{ amount: price, currency_code: currencyCode }],
              },
            ],
          } as any,
        });
      }
    }
  }

  const product = await getOwnedProduct(
    req,
    context.vendorId,
    context.medusaStoreId,
    context.allowedSalesChannelId,
    productId,
  );
  return res.json({
    product: await presentProduct(
      req,
      context.medusaStoreId,
      product,
      stockLocationId,
    ),
  });
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const context = await getMerchantStoreContext(req);
  requireMerchantPermission(context, "products.write");
  const productId = req.params.id;
  await getOwnedProduct(
    req,
    context.vendorId,
    context.medusaStoreId,
    context.allowedSalesChannelId,
    productId,
  );

  const currentLinks = await listVendorProductLinks(req, {
    vendor_id: context.vendorId,
  });
  const remainingProductIds = currentLinks
    .map((link) => link.product_id)
    .filter((id) => id !== productId);

  await deleteProductsWorkflow(req.scope).run({
    input: { ids: [productId] },
  });
  await syncVendorProducts(req, context.vendorId, remainingProductIds);

  return res.json({ id: productId, object: "product", deleted: true });
}
