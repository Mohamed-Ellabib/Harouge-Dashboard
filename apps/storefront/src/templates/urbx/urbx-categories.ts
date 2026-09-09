import type { StorefrontBrandDto, StorefrontProductCardDto } from "../../types";

const normalize = (value: string) => value.toLowerCase().replace(/[-\s]+/g, " ").trim();
const starterSlugs = ["hoodies", "t-shirts", "bottoms", "accessories"];

export function urbxCategoryBanner(category: StorefrontBrandDto): string | null {
  if (category.banner_image_url !== undefined) return category.banner_image_url;
  // Older URBX drafts retain their original small home tiles. Only the known
  // starter artwork receives the new banner; a merchant's custom image wins.
  if (starterSlugs.includes(category.slug) && category.image_url?.startsWith("/assets/urbx/category-")) {
    return `/assets/urbx/categories-${category.slug.replace("t-shirts", "tshirts")}-v1.png`;
  }
  return category.image_url;
}

export function urbxProductInCategory(product: StorefrontProductCardDto, category: StorefrontBrandDto) {
  const name = normalize(product.category ?? "");
  return Boolean(name) && [category.slug, category.name.en, category.name.ar].some(value => normalize(value) === name);
}

export function urbxCategoryResults(categories: StorefrontBrandDto[], products: StorefrontProductCardDto[], query: string) {
  const term = normalize(query);
  return categories.map(category => {
    const items = products.filter(product => urbxProductInCategory(product, category));
    const categoryMatch = !term || normalize(`${category.name.en} ${category.name.ar} ${category.slug}`).includes(term);
    const productMatch = items.some(product => normalize(`${product.title} ${product.subtitle ?? ""} ${product.brand ?? ""}`).includes(term));
    return { category, count: items.length, matches: categoryMatch || productMatch, productQuery: categoryMatch ? "" : query.trim() };
  }).filter(result => result.matches);
}
