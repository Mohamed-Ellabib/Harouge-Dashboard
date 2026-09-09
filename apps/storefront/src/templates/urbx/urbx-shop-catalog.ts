import { fetchStorefrontCatalog } from "../../api/storefront-api";
import type { StorefrontProductCardDto } from "../../types";

export type UrbxShopSort = "featured" | "price-asc" | "price-desc" | "title";
const normalize = (value: string) => value.toLowerCase().replace(/[-\s]+/g, " ").trim();
const featured = ["urbx-oversized-tee", "no-rules-hoodie", "x-cargo-pants", "chaos-hoodie"];

// Fetch every page before applying client-side category/price filters. Never
// present the first API page as the complete merchant catalog.
export async function loadUrbxShopCatalog(signal: AbortSignal) {
  const products = new Map<string, StorefrontProductCardDto>();
  let offset = 0;
  do {
    const page = await fetchStorefrontCatalog({ limit: 24, offset, order: "created_at", signal });
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    page.products.forEach(product => products.set(product.handle, product));
    offset += page.products.length;
    if (offset >= page.count) return [...products.values()];
    if (!page.products.length || offset > 10000) throw new Error("Catalog is incomplete");
  } while (!signal.aborted);
  throw new DOMException("Aborted", "AbortError");
}

export function filterUrbxShopProducts(products: StorefrontProductCardDto[], options: {
  query: string; category: string; maxPrice: number | null; sort: UrbxShopSort;
}) {
  const query = normalize(options.query);
  return products.filter(product =>
    (!options.category || normalize(product.category ?? "") === normalize(options.category)) &&
    (!query || normalize([product.title, product.subtitle, product.category, product.brand].filter(Boolean).join(" ")).includes(query)) &&
    (options.maxPrice === null || (product.price_lyd != null && product.price_lyd <= options.maxPrice)),
  ).sort((a, b) => {
    if (options.sort === "title") return a.title.localeCompare(b.title);
    if (options.sort.startsWith("price")) {
      if (a.price_lyd == null) return b.price_lyd == null ? 0 : 1;
      if (b.price_lyd == null) return -1;
      return options.sort === "price-asc" ? a.price_lyd - b.price_lyd : b.price_lyd - a.price_lyd;
    }
    const rank = (handle: string) => { const index = featured.indexOf(handle); return index < 0 ? 99 : index; };
    return rank(a.handle) - rank(b.handle);
  });
}
