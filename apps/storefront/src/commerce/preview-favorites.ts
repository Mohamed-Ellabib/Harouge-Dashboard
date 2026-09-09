import type { StorefrontProductCardDto } from "../types";

/** Resolve selection against the current draft, never stale or deleted products. */
export function resolvePreviewFavorites(products: StorefrontProductCardDto[], handles: string[]) {
  const catalog = new Map(products.map(product => [product.handle, product]));
  return handles.flatMap(handle => {
    const product = catalog.get(handle);
    return product ? [product] : [];
  });
}
