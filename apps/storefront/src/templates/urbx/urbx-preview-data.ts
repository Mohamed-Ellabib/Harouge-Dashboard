import type { StorefrontProductDetailDto, StorefrontProfileDto } from "../../types";
import { urbxHomeContent } from "./urbx-home-content";
import { urbxShopContent } from "./urbx-shop-content";

// Design-preview fixtures only. Saved stores use the shared store-owned catalog API.
export const urbxPreviewProducts = [
  ["urbx-oversized-tee", "URBX Oversized Tee", "T-Shirts", "oversized-tee", 49],
  ["no-rules-hoodie", "No Rules Hoodie", "Hoodies", "no-rules-hoodie", 89],
  ["x-cargo-pants", "X Cargo Pants", "Bottoms", "x-cargo-pants", 79],
  ["chaos-hoodie", "Chaos Hoodie", "Hoodies", "chaos-hoodie", 89],
].map(([handle, title, category, image, amount]) => ({
  handle: String(handle), title: String(title), subtitle: String(category),
  description: "Premium heavyweight fabric with an oversized fit. Built for comfort. Made to make a statement.",
  thumbnail_url: `/assets/urbx/${image}-v1.png`,
  image_urls: handle === "chaos-hoodie"
    ? ["back", "front", "side", "print"].map(view => `/assets/urbx/detail-chaos-${view}-v1.png`)
    : [`/assets/urbx/${image}-v1.png`],
  price_lyd: Number(amount), brand: "URBX", category: String(category),
})) satisfies Array<StorefrontProductDetailDto & { price_lyd: number; brand: string; category: string }>;

const text = (en: string) => ({ en, ar: en });
export function urbxPreviewProfile(base: StorefrontProfileDto): StorefrontProfileDto {
  const storefront = structuredClone(base.storefront)!;
  storefront.template_key = "urbx";
  storefront.content.home = structuredClone(urbxHomeContent);
  storefront.content.shop = structuredClone(urbxShopContent);
  storefront.content.hero = {
    eyebrow: text("STAND OUT."), heading: text("BUILT DIFFERENT. MADE TO"),
    subheading: text("URBX is more than clothing. It’s a mindset. A movement. A way of life."),
    cta_label: text("START SHOPPING"), cta_target: "catalog", image_url: "/assets/urbx/welcome-alley-v1.png",
    slides: [{ id: "urbx-welcome", image_url: "/assets/urbx/welcome-alley-v1.png", alt: text("URBX streetwear in a nighttime city alley"), enabled: true }],
    buttons: [{ id: "urbx-shop", label: text("START SHOPPING"), href: "/products", background_color: "#d5ff00", text_color: "#070707", style: "solid", enabled: true }],
    benefits: [
      { id: "urbx-quality", icon: "award", title: text("PREMIUM"), subtitle: text("QUALITY") },
      { id: "urbx-culture", icon: "globe", title: text("GLOBAL"), subtitle: text("STREET CULTURE") },
      { id: "urbx-drops", icon: "sparkle", title: text("LIMITED"), subtitle: text("DROPS") },
    ],
  };
  storefront.content.about = { title: text("STREETWEAR"), body: text("URBX is more than clothing. It’s a mindset. A movement. A way of life.") };
  storefront.content.contact = { heading: text("Help & support"), body: text("Find answers or get in touch.") };
  storefront.content.brands = { heading: text("Shop by category"), subheading: text("Find your next statement piece."),
    search_placeholder: text("Search categories or products…"), explore_label: text("EXPLORE"), view_all_label: text("View all products"),
    items: [["Hoodies", "category-hoodies"], ["T-Shirts", "category-tshirts"], ["Bottoms", "category-bottoms"], ["Accessories", "category-accessories"]].map(([label, asset]) => ({
      id: `urbx-${label.toLowerCase()}`, slug: label.toLowerCase(), name: text(label), image_url: `/assets/urbx/${asset}-v1.png`,
      banner_image_url: `/assets/urbx/categories-${label.toLowerCase().replace("t-shirts", "tshirts")}-v1.png`,
    })) };
  return { ...base, name: "URBX", handle: "urbx-demo", domain: null, locale: "en-LY",
    contact: { public_email: null, public_phone: null, whatsapp_number: null },
    branding: { logo_url: null, primary_color: "#d5ff00", secondary_color: "#070707", typography_key: "cairo" }, storefront };
}
