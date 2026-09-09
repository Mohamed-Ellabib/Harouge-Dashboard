import type { PlatformStorefrontDocument } from "./types"
const text = (en: string, ar = en) => ({ en, ar })
// Backward-compatible first home edit for earlier welcome-only drafts.
export const template6HomeDefaults: NonNullable<PlatformStorefrontDocument["home"]> = {
  heading: text("HEY THERE!", "أهلاً بك!"), statement: text("Explore the best items here.", "اكتشف أفضل المنتجات هنا."),
  eyebrow: text("Search items, sellers, or brands", "ابحث عن المنتجات أو العلامات"),
  categories_heading: text("Explore Our Collections", "اكتشف مجموعاتنا"), products_heading: text("Discover Near You", "اكتشف منتجاتنا"),
  view_all_label: text("See All", "عرض الكل"), cta_label: text("Try AI Search", "البحث المساعد"),
  promotion_eyebrow: text(""), promotion_heading: text(""), promotion_detail: text(""),
  image_url: "/assets/template-6/profile-avatar-v1.webp", promotion_image_url: "/assets/template-6/home-background-v1.webp",
}
