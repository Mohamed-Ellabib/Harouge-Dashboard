import type {
  StorefrontCatalogOrder,
  StorefrontCatalogPageDto,
  StorefrontCommerceCapabilitiesDto,
  StorefrontProductCardDto,
  StorefrontProductDetailDto,
  StorefrontPurchaseOptionsDto,
} from "./types";

export type StorefrontEditorPreviewProduct = StorefrontProductCardDto &
  StorefrontProductDetailDto & {
    price_lyd: number | null;
    compare_at_price_lyd: number | null;
    category: string | null;
    badge: string | null;
    purchase: StorefrontPurchaseOptionsDto;
  };

type StorefrontEditorPreviewSnapshot = {
  products: StorefrontEditorPreviewProduct[];
  commerceAvailable: boolean;
};

let currentSnapshot: StorefrontEditorPreviewSnapshot | null = null;

export const setStorefrontEditorPreviewSnapshot = (
  snapshot: StorefrontEditorPreviewSnapshot,
) => {
  currentSnapshot = structuredClone(snapshot);
};

export const clearStorefrontEditorPreviewSnapshot = () => {
  currentSnapshot = null;
};

export const getStorefrontEditorPreviewProducts = () =>
  currentSnapshot ? structuredClone(currentSnapshot.products) : null;

export const getStorefrontEditorPreviewCatalog = (input: {
  limit: number;
  offset: number;
  q?: string;
  order?: StorefrontCatalogOrder;
}): StorefrontCatalogPageDto | null => {
  if (!currentSnapshot) return null;
  const query = input.q?.trim().toLocaleLowerCase("en");
  const products = currentSnapshot.products
    .filter((product) =>
      !query ||
      `${product.title} ${product.subtitle ?? ""} ${product.category ?? ""}`
        .toLocaleLowerCase("en")
        .includes(query),
    )
    .sort((left, right) => {
      if (input.order === "title" || input.order === "-title") {
        const comparison = left.title.localeCompare(right.title);
        return input.order === "-title" ? -comparison : comparison;
      }
      return 0;
    });
  if (input.order === "-created_at") products.reverse();
  return {
    products: products
      .slice(input.offset, input.offset + input.limit)
      .map(({ purchase: _purchase, description: _description, image_urls: _images, ...product }) => product),
    count: products.length,
    offset: input.offset,
    limit: input.limit,
  };
};

export const getStorefrontEditorPreviewProduct = (
  handle: string,
): StorefrontProductDetailDto | null | undefined => {
  if (!currentSnapshot) return undefined;
  const product = currentSnapshot.products.find((entry) => entry.handle === handle);
  if (!product) return null;
  return {
    handle: product.handle,
    title: product.title,
    subtitle: product.subtitle,
    description: product.description,
    thumbnail_url: product.thumbnail_url,
    image_urls: [...product.image_urls],
    badge: product.badge,
    category: product.category,
    compare_at_price_lyd: product.compare_at_price_lyd,
  };
};

export const getStorefrontEditorPreviewPurchaseOptions = (
  handle: string,
): StorefrontPurchaseOptionsDto | null | undefined => {
  if (!currentSnapshot) return undefined;
  const product = currentSnapshot.products.find((entry) => entry.handle === handle);
  return product ? structuredClone(product.purchase) : null;
};

export const getStorefrontEditorPreviewCommerceCapabilities = ():
  | StorefrontCommerceCapabilitiesDto
  | null => {
  if (!currentSnapshot) return null;
  return {
    online_checkout: currentSnapshot.commerceAvailable
      ? {
          status: "available",
          currency_code: "lyd",
          country_codes: ["ly"],
          payment_methods: ["cod"],
        }
      : {
          status: "unavailable",
          currency_code: null,
          country_codes: [],
          payment_methods: [],
        },
  };
};

export const findStorefrontEditorPreviewProductByVariant = (
  variantId: string,
) => {
  if (!currentSnapshot) return null;
  for (const product of currentSnapshot.products) {
    const variant = product.purchase.variants.find((entry) => entry.id === variantId);
    if (variant) return { product, variant };
  }
  return null;
};
