import type { StorefrontBrandDto, StorefrontProductCardDto } from "../../types";
import { urbxCategoryResults } from "../urbx/urbx-categories";

export const template6ExploreCopy = {
  heading: "EXPLORE", subheading: "Discover something that feels like you.",
  search_placeholder: "Search categories, brands, or stores", explore_label: "Browse by Category",
  view_all_label: "Discover", promotion_heading: "FRESH FINDS", promotion_subheading: "Explore the latest arrivals",
};
export const template6ExploreArabicCopy: Record<keyof typeof template6ExploreCopy, string> = {
  heading: "استكشف", subheading: "اكتشف ما يعبّر عنك.",
  search_placeholder: "ابحث عن الفئات أو العلامات أو المتاجر", explore_label: "تصفّح حسب الفئة",
  view_all_label: "اكتشف", promotion_heading: "وصل حديثاً", promotion_subheading: "اكتشف أحدث المنتجات",
};
const arabicCategoryNames: Record<string, string> = {
  men: "رجالي", women: "نسائي", shoes: "الأحذية", bags: "الحقائب", accessories: "الإكسسوارات", streetwear: "أزياء الشارع",
  skincare: "العناية بالبشرة", makeup: "المكياج", fragrance: "العطور", haircare: "العناية بالشعر", tools: "الأدوات",
};

// Older template documents copied the English defaults into their Arabic fields.
// Translate those exact defaults without replacing merchant-written Arabic copy.
export function template6ExploreArabicText(key: keyof typeof template6ExploreCopy, value?: { en: string; ar: string }) {
  const saved = value?.ar.trim();
  return !saved || saved.toLowerCase() === template6ExploreCopy[key].toLowerCase()
    ? template6ExploreArabicCopy[key] : saved;
}

export function template6ExploreCategoryLabel(name: StorefrontBrandDto["name"], locale: "en-LY" | "ar-LY") {
  if (locale === "en-LY") return name.en;
  const saved = name.ar.trim() || name.en.trim();
  return arabicCategoryNames[saved.toLowerCase()] ?? saved;
}
export const template6ExploreImage = "/assets/template-6/explore-fresh-finds-v2.webp";
export const template6ExploreCategories = ["Men", "Women", "Shoes", "Bags", "Accessories", "Streetwear"];

export function template6CategoryPhoto(category: StorefrontBrandDto) {
  // Explicit removal and merchant artwork always win; no live fixture fallback.
  return category.banner_image_url !== undefined ? category.banner_image_url : category.image_url;
}
export function template6ExploreResults(categories: StorefrontBrandDto[], products: StorefrontProductCardDto[], query: string, stockedOnly: boolean, alphabetical: boolean, locale: "en-LY" | "ar-LY" = "en-LY") {
  const localizedCategories = locale === "ar-LY" ? categories.map(category => ({
    ...category, name: { ...category.name, ar: template6ExploreCategoryLabel(category.name, locale) },
  })) : categories;
  const results = urbxCategoryResults(localizedCategories, products, query).filter(item => !stockedOnly || item.count > 0);
  const language = locale === "ar-LY" ? "ar" : "en";
  return alphabetical ? results.sort((a, b) => a.category.name[language].localeCompare(b.category.name[language], locale)) : results;
}
export function template6CategoryHref(category: StorefrontBrandDto, query = "") {
  const params = new URLSearchParams({ category: category.slug });
  if (query) params.set("q", query);
  return `/?${params}`;
}
export function template6ExploreBrands(products: StorefrontProductCardDto[], query: string) {
  const brands = new Map<string, { name: string; count: number; image: string | null }>();
  for (const product of products) {
    const name = product.brand?.trim();
    if (!name || !name.toLowerCase().includes(query.toLowerCase().trim())) continue;
    const previous = brands.get(name.toLowerCase());
    brands.set(name.toLowerCase(), { name, count: (previous?.count ?? 0) + 1, image: previous?.image ?? product.thumbnail_url });
  }
  return [...brands.values()].sort((a, b) => a.name.localeCompare(b.name));
}
