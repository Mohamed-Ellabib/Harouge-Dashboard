import type { StorefrontProfileDto } from "../../types";
import { template6HomeContent } from "./template-6-home-content";
import { template6PremiumDescription, template6PremiumGallery } from "./template-6-product";
import { template6ExploreArabicCopy, template6ExploreCategories, template6ExploreCategoryLabel, template6ExploreCopy, template6ExploreImage } from "./template-6-explore";

// Only imported by the DEV visual-preview transport. Never a live catalog fallback.
export const template6PreviewProducts = [
  ["hoodie-foreign", "Hoodie (Foreign)", "Streetwear", 295],
  ["premium-hoodie", "Premium Hoodie", "Women", 295],
  ["urban-jacket", "Urban Jacket", "Men", 245],
  ["everyday-essentials", "Everyday Essentials", "Streetwear", 195],
].map(([handle, title, category, price]) => ({
  handle: String(handle), title: String(title), subtitle: String(category), category: String(category),
  description: handle === "premium-hoodie" ? template6PremiumDescription : `${title}. Explore the details and choose your preferred size.`,
  thumbnail_url: `/assets/template-6/${handle}-v1.webp`, image_urls: handle === "premium-hoodie" ? template6PremiumGallery : [`/assets/template-6/${handle}-v1.webp`],
  price_lyd: Number(price), brand: "Template 6", badge: handle === "urban-jacket" ? "NEW" : "BEST SELLER",
}));

export const template6ReferenceCards: Record<string, { location: string; rating: string }> = {
  "hoodie-foreign": { location: "Dubai Marina", rating: "4.5" },
  "premium-hoodie": { location: "New York City", rating: "4.5" },
  "urban-jacket": { location: "Downtown Dubai", rating: "4.7" },
  "everyday-essentials": { location: "Dubai Marina", rating: "4.8" },
};

export const template6Welcome = {
  heading: "DISCOVER BEST DEALS ITEMS NEARBY",
  subheading: "A smarter marketplace for the UAE & GCC — fast, trusted, and made for your lifestyle.",
  cta: "GET STARTED",
  image: "/assets/template-6/welcome-scene-v1.png",
};

// Standalone design source only. The editor and live stores use their saved document.
export function template6PreviewProfile(base: StorefrontProfileDto): StorefrontProfileDto {
  const storefront = structuredClone(base.storefront)!;
  const text = (en: string, ar = en) => ({ en, ar });
  storefront.template_key = "template-6";
  storefront.content.home = { ...structuredClone(template6HomeContent), heading: text("HEY ARAFAT!"), categories_heading: text("Explore Our Influencers") };
  delete storefront.content.shop;
  storefront.content.hero = {
    eyebrow: text(""), heading: text(template6Welcome.heading), subheading: text(template6Welcome.subheading),
    cta_label: text(template6Welcome.cta), cta_target: "catalog", image_url: template6Welcome.image,
    slides: [{ id: "template-6-welcome", image_url: template6Welcome.image, alt: text("Summer fashion with colorful sunglasses against a turquoise sky"), enabled: true }],
    buttons: [{ id: "template-6-start", label: text(template6Welcome.cta), href: "/", background_color: "#eeff66", text_color: "#080808", style: "solid", enabled: true }],
    benefits: [],
  };
  storefront.content.brands = {
    ...Object.fromEntries(Object.entries(template6ExploreCopy).map(([key, value]) => [key, text(value, template6ExploreArabicCopy[key as keyof typeof template6ExploreCopy])])) as { [K in keyof typeof template6ExploreCopy]: ReturnType<typeof text> },
    promotion_image_url: template6ExploreImage,
    items: template6ExploreCategories.map((name, index) => ({ id: `template-six-${name.toLowerCase()}`, slug: name.toLowerCase(), name: text(name, template6ExploreCategoryLabel(text(name), "ar-LY")),
      image_url: `/assets/template-6/${["creator-alex", "creator-david", "creator-you"][index % 3]}-v1.webp`,
      banner_image_url: `/assets/template-6/explore-${name.toLowerCase()}-v1.webp` })),
  };
  const nav = ["home", "categories", "cart", "favorites", "account"];
  storefront.content.navigation.items = storefront.content.navigation.items.map(item => ({ ...item, enabled: nav.includes(item.key) })).sort((a, b) => nav.indexOf(a.key) - nav.indexOf(b.key));
  storefront.content.about = { title: text("About our store"), body: text("") };
  storefront.content.contact = { heading: text("Contact us"), body: text("") };
  return { ...base, name: "Template 6", handle: "template-6-demo", domain: null, locale: "en-LY",
    contact: { public_email: null, public_phone: null, whatsapp_number: null },
    branding: { logo_url: null, primary_color: "#eeff66", secondary_color: "#2c9db6", typography_key: "cairo" }, storefront };
}
