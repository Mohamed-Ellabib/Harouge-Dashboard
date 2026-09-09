import { glowBeautyStarterDocument, glowBeautyStarterProducts, type StarterProduct } from "./platform-storefront-template-starter"
import type { StorefrontDocumentV1 } from "../../modules/saas/platform-storefront-document"

// Installation sources only. Live storefronts always read their owned catalog.
export const CREATION_TEMPLATE_KEYS = ["glow-beauty", "standard", "drops", "luxe-commerce-full", "urbx", "template-6"] as const
export type CreationTemplateKey = typeof CREATION_TEMPLATE_KEYS[number]
const text = (en: string, ar = en) => ({ en, ar })
const product = (slug: string, title: string, category: string, image: string, amount: number, sizes = ["Standard"], images = [image]): StarterProduct => ({
  slug, title, category, thumbnail: image, images, subtitle: category,
  description: `${title}. Explore the details and choose your preferred size.`, badge: null, compareAtPrice: null,
  variants: sizes.map(size => ({ size, amount, stock: 20 })),
})
export function creationStarterProducts(key: CreationTemplateKey): StarterProduct[] {
  if (key === "template-6") return [
    product("hoodie-foreign", "Hoodie (Foreign)", "Streetwear", "/assets/template-6/hoodie-foreign-v1.webp", 295, ["S", "M", "L", "XL"]),
    { ...product("premium-hoodie", "Premium Hoodie", "Women", "/assets/template-6/premium-hoodie-v1.webp", 295, ["S", "M", "L", "XL"],
      ["main", "side", "fabric"].map(view => `/assets/template-6/product-premium-${view}-v1.webp`)),
      description: "Upgrade your wardrobe with our Premium Hoodie, crafted for comfort, style, and everyday wear." },
    product("urban-jacket", "Urban Jacket", "Men", "/assets/template-6/urban-jacket-v1.webp", 245, ["S", "M", "L", "XL"]),
    product("everyday-essentials", "Everyday Essentials", "Streetwear", "/assets/template-6/everyday-essentials-v1.webp", 195, ["S", "M", "L", "XL"]),
  ].map(item => ({ ...item, badge: item.slug === "urban-jacket" ? "NEW" as const : "BEST SELLER" as const }))
  if (key === "glow-beauty") return glowBeautyStarterProducts()
  if (key === "urbx") return [
    product("urbx-oversized-tee", "URBX Oversized Tee", "T-Shirts", "/assets/urbx/oversized-tee-v1.png", 49, ["S", "M", "L", "XL", "XXL"]),
    product("no-rules-hoodie", "No Rules Hoodie", "Hoodies", "/assets/urbx/no-rules-hoodie-v1.png", 89, ["S", "M", "L", "XL", "XXL"]),
    product("x-cargo-pants", "X Cargo Pants", "Bottoms", "/assets/urbx/x-cargo-pants-v1.png", 79, ["S", "M", "L", "XL", "XXL"]),
    product("chaos-hoodie", "Chaos Hoodie", "Hoodies", "/assets/urbx/chaos-hoodie-v1.png", 89, ["S", "M", "L", "XL", "XXL"],
      ["back", "front", "side", "print"].map(view => `/assets/urbx/detail-chaos-${view}-v1.png`)),
  ].map(item => ({ ...item, description: "Premium heavyweight fabric with an oversized fit. Built for comfort. Made to make a statement.",
    variants: item.variants.map(variant => ({ ...variant, color: "Black" })) }))
  if (key === "standard") {
    const asset = (name: string) => `/assets/standard/${name}.webp`
    return [
      product("ivory-lounge-set", "Ivory Lounge Set", "Casual", asset("arrival-cream-set"), 89, ["S", "M", "L", "XL"]),
      product("pastel-wrap-dress", "Pastel Wrap Dress", "Dresses", asset("arrival-striped-dress"), 129, ["S", "M", "L", "XL"], [asset("product-pastel-wrap-dress"), asset("arrival-striped-dress")]),
      product("heritage-leather-bag", "Heritage Leather Bag", "Handbags", asset("favorite-heritage-leather-bag"), 148),
      product("classic-beige-heels", "Classic Beige Heels", "Shoes", asset("cart-classic-beige-heels"), 96, ["36", "37", "38", "39", "40"]),
      product("cat-eye-sunglasses", "Cat-Eye Sunglasses", "Sunglasses", asset("trending-cat-eye-sunglasses"), 74),
      product("tailored-camel-coat", "Tailored Camel Coat", "Casual", asset("recommended-tailored-camel-coat"), 165, ["S", "M", "L", "XL"]),
      product("ivory-knit-set", "Ivory Knit Set", "Casual", asset("recommended-ivory-knit-set"), 112, ["S", "M", "L", "XL"]),
      product("espresso-tote", "Espresso Tote", "Handbags", asset("recommended-espresso-tote"), 138),
      product("satin-midi-dress", "Satin Midi Dress", "Dresses", asset("recommended-satin-midi-dress"), 124, ["S", "M", "L", "XL"]),
    ]
  }
  if (key === "drops") {
    const asset = (name: string) => `/assets/drops/${name}.png`
    const sizes = ["US 4", "US 4.5", "US 5", "US 5.5", "US 6"]
    return [
      product("jordan-retro-high-dior", "Jordan 1 Retro High Dior", "Basketball", asset("jordan-retro-high"), 9000, sizes),
      product("adidas-iniki-runner-70s", "Adidas Iniki Runner 70S", "Running", asset("retro-runner-blue"), 14200, sizes),
      product("jordan-retro-high-silver", "Jordan 1 Retro High Silver", "Basketball", asset("jordan-retro-high"), 8750, sizes),
      product("adidas-retro-runner-blue", "Adidas Retro Runner Blue", "Running", asset("retro-runner-blue"), 12900, sizes),
      product("jordan-1-low-grey-toe", "Jordan 1 Low Grey Toe", "Lifestyle", asset("product-green-hero"), 14200, sizes,
        ["product-green-hero", "product-green-pair", "product-green-rear", "product-green-top", "product-green-outsole"].map(asset)),
      product("jordan-lost-and-found", "Jordan 1 Retro High OG Lost and Found", "Basketball", asset("order-thumb-red-high"), 1050, sizes),
      product("adidas-human-race", "Adidas Pharrell N.E.R.D. NMD HumanRace Trail", "Running", asset("order-thumb-color-runner"), 425, sizes),
      product("new-balance-997s", "New Balance 997S Kith United Arrows & Sons", "Lifestyle", asset("order-thumb-grey-runner"), 495, sizes),
    ]
  }
  return [
    ["black-sport-chronograph", "Black Sport Chronograph", "01-black-sport-chronograph.webp", 2450],
    ["silver-dress-steel", "Silver Dress Steel", "02-silver-dress-steel.webp", 1950],
    ["rose-gold-mesh", "Rose Gold Mesh", "03-rose-gold-mesh.webp", 2200],
    ["blue-dial-steel", "Blue Dial Steel", "04-blue-dial-steel.webp", 3180],
    ["green-dial-leather", "Green Dial Leather", "05-green-dial-leather.webp", 1800],
    ["skeleton-automatic", "Skeleton Automatic", "06-skeleton-automatic.webp", 4290],
    ["gold-classic-leather", "Gold Leather", "09-gold-classic-leather.webp", 2890],
    ["hybrid-smart-black", "Hybrid Smart Black", "10-hybrid-smart-black.webp", 2150],
    ["black-square-sunglasses", "Black Square Sunglasses", "glasses-01-black-square.webp", 450],
    ["silver-rollerball-pen", "Silver Rollerball Pen", "pens-02-silver-rollerball.webp", 380],
  ].map(([slug, title, image, amount]) => product(String(slug), String(title), String(slug).includes("sunglasses") ? "Sunglasses" : String(slug).includes("pen") ? "Pens" : "Watches", `/assets/luxe/${image}`, Number(amount)))
}

export function creationTemplatePreset(key: CreationTemplateKey) {
  const document = glowBeautyStarterDocument()
  document.template_key = key
  if (key === "template-6") {
    document.home = {
      heading: text("HEY THERE!", "أهلاً بك!"), statement: text("Explore the best items here.", "اكتشف أفضل المنتجات هنا."),
      eyebrow: text("Search items, sellers, or brands", "ابحث عن المنتجات أو العلامات"),
      categories_heading: text("Explore Our Collections", "اكتشف مجموعاتنا"), products_heading: text("Discover Near You", "اكتشف منتجاتنا"),
      view_all_label: text("See All", "عرض الكل"), cta_label: text("Try AI Search", "البحث المساعد"),
      promotion_eyebrow: text(""), promotion_heading: text(""), promotion_detail: text(""),
      image_url: "/assets/template-6/profile-avatar-v1.webp", promotion_image_url: "/assets/template-6/home-background-v1.webp",
    }
    const image = "/assets/template-6/welcome-scene-v1.png"
    document.hero = { ...document.hero, eyebrow: text(""), heading: text("DISCOVER BEST DEALS ITEMS NEARBY"),
      subheading: text("A smarter marketplace for the UAE & GCC — fast, trusted, and made for your lifestyle."),
      cta_label: text("GET STARTED"), image_url: image,
      slides: [{ id: "template-6-welcome", image_url: image, alt: text("Summer fashion with colorful sunglasses against a turquoise sky"), enabled: true }],
      buttons: [{ id: "template-6-start", label: text("GET STARTED"), href: "/", background_color: "#eeff66", text_color: "#080808", enabled: true, style: "solid" }],
      benefits: [],
    }
    document.brands = { heading: text("EXPLORE"), subheading: text("Discover something that feels like you."),
      search_placeholder: text("Search categories, brands, or stores"), explore_label: text("Browse by Category"), view_all_label: text("Discover"),
      promotion_heading: text("FRESH FINDS"), promotion_subheading: text("Explore the latest arrivals"), promotion_image_url: "/assets/template-6/explore-fresh-finds-v2.webp", items:
      ["Men", "Women", "Shoes", "Bags", "Accessories", "Streetwear"].map((name, index) => ({
        id: `template-six-${name.toLowerCase()}`, slug: name.toLowerCase(), name: text(name), image_url: `/assets/template-6/${["creator-alex", "creator-david", "creator-you"][index % 3]}-v1.webp`,
        banner_image_url: `/assets/template-6/explore-${name.toLowerCase()}-v1.webp`,
      })) }
    const nav = ["home", "categories", "cart", "favorites", "account"]
    document.navigation.items = document.navigation.items.map(item => ({ ...item, enabled: nav.includes(item.key) })).sort((a, b) => nav.indexOf(a.key) - nav.indexOf(b.key))
    document.about = { title: text("About our store"), body: text("") }
    document.contact = { heading: text("Contact us"), body: text("") }
    return { name: "Template 6", primary: "#eeff66", background: "#2c9db6", document: document as StorefrontDocumentV1, products: creationStarterProducts(key) }
  }
  if (key === "urbx") {
    document.shop = { heading: text("SHOP"), statement: text("THE DROP"), search_placeholder: text("Search streetwear…") }
    document.home = {
      eyebrow: text("NEW DROP"), heading: text("URBAN VIBES."), statement: text("REAL YOU."),
      cta_label: text("SHOP NOW"), categories_heading: text("Categories"), products_heading: text("Best Sellers"),
      view_all_label: text("View all"), promotion_eyebrow: text("LIMITED DROP"),
      promotion_heading: text("SHADOW HOODIE"), promotion_detail: text("ONLY 200 PIECES"),
      image_url: "/assets/urbx/home-hero-v1.png", promotion_image_url: "/assets/urbx/limited-drop-v1.png",
    }
    const image = "/assets/urbx/welcome-alley-v1.png"
    document.hero = { ...document.hero, eyebrow: text("STAND OUT."), heading: text("BUILT DIFFERENT. MADE TO"),
      subheading: text("URBX is more than clothing. It’s a mindset. A movement. A way of life."),
      cta_label: text("START SHOPPING"), image_url: image,
      slides: [{ id: "urbx-welcome", image_url: image, alt: text("URBX streetwear in a nighttime city alley"), enabled: true }],
      buttons: [{ id: "urbx-shop", label: text("START SHOPPING"), href: "/products", background_color: "#d5ff00", text_color: "#070707", enabled: true, style: "solid" }],
      benefits: [
        { id: "urbx-quality", icon: "award", title: text("PREMIUM"), subtitle: text("QUALITY") },
        { id: "urbx-culture", icon: "globe", title: text("GLOBAL"), subtitle: text("STREET CULTURE") },
        { id: "urbx-drops", icon: "sparkle", title: text("LIMITED"), subtitle: text("DROPS") },
      ],
    }
    document.navigation.items = document.navigation.items.map(item => ({ ...item,
      enabled: ["home", "categories", "favorites", "orders", "account"].includes(item.key) }))
    document.brands = { heading: text("Shop by category"), subheading: text("Find your next statement piece."),
      search_placeholder: text("Search categories or products…"), explore_label: text("EXPLORE"), view_all_label: text("View all products"),
      items: [["Hoodies", "category-hoodies"], ["T-Shirts", "category-tshirts"], ["Bottoms", "category-bottoms"], ["Accessories", "category-accessories"]].map(([label, asset]) => ({
        id: `urbx-${label.toLowerCase()}`, slug: label.toLowerCase(), name: text(label), image_url: `/assets/urbx/${asset}-v1.png`,
        banner_image_url: `/assets/urbx/categories-${label.toLowerCase().replace("t-shirts", "tshirts")}-v1.png`,
      })) }
    document.about = { title: text("STREETWEAR"), body: text("URBX is more than clothing. It’s a mindset. A movement. A way of life.") }
    document.contact = { heading: text("Help & support"), body: text("Find answers or get in touch with the store.") }
    return { name: "URBX", primary: "#d5ff00", background: "#070707", document: document as StorefrontDocumentV1, products: creationStarterProducts(key) }
  }
  const primary = key === "drops" ? "#009b4d" : key === "standard" ? "#3f2100" : key === "luxe-commerce-full" ? "#b77f3f" : "#f35b05"
  const background = key === "drops" ? "#ffffff" : key === "standard" ? "#fcf8f3" : "#fffaf5"
  const name = key === "drops" ? "DROPS" : key === "standard" ? "STYLE." : key === "luxe-commerce-full" ? "Al-Sanousi & Sons" : "My Glow Store"
  const enabled = key === "drops" ? ["home", "categories", "favorites", "account"] : key === "standard" ? ["home", "categories", "cart", "favorites", "account"] : key === "luxe-commerce-full" ? ["home", "categories", "favorites", "cart", "account"] : ["home", "categories", "favorites", "orders", "account"]
  document.navigation.items = document.navigation.items.map(item => ({ ...item, enabled: enabled.includes(item.key),
    label: item.key === "categories" && key === "standard" ? text("Search", "بحث") : item.key === "favorites" && key === "standard" ? text("Saved", "المحفوظات") : item.label,
  })).sort((a, b) => (enabled.indexOf(a.key) < 0 ? 99 : enabled.indexOf(a.key)) - (enabled.indexOf(b.key) < 0 ? 99 : enabled.indexOf(b.key)))
  if (key !== "glow-beauty") {
    const heading = key === "standard" ? "Swift Dress" : key === "drops" ? "Year-End Sale" : "Get 30% off your first order"
    const hero = key === "standard" ? "/assets/standard/hero-editorial.webp" : key === "drops" ? "/assets/drops/year-end-sale-hero.png" : "/assets/luxe-full/customer-assets/home-hero-light-lifestyle.webp"
    document.hero = { ...document.hero, eyebrow: text("New season"), heading: text(heading),
      subheading: text(key === "drops" ? "Up To 90%" : "Thoughtfully selected pieces for effortless everyday style."),
      cta_label: text("Shop Now", "تسوق الآن"), image_url: hero,
      slides: [{ id: `${key}-hero`, image_url: hero, alt: text(heading), enabled: true },
        ...(key === "standard" ? [{ id: "neutral-edit", image_url: "/assets/standard/neutral-edit-banner.webp", alt: text("The Neutral Edit"), enabled: true }] : [])],
      buttons: [{ id: `${key}-shop`, label: text("Shop Now", "تسوق الآن"), href: "/products", background_color: primary, text_color: "#ffffff", enabled: true, style: "solid" }],
      benefits: document.hero.benefits.slice(0, 2),
    }
    const categories = key === "standard" ? ["Handbags", "Watches", "Sunglasses", "Shoes", "Dresses", "Casual"] : key === "drops" ? ["Running", "Lifestyle", "Basketball", "Skateboarding"] : ["Watches", "Sunglasses", "Pens"]
    document.brands = { heading: text("Shop by category", "تسوق حسب الفئة"), subheading: text("Find your next favorite"), items: categories.map(label => ({
      id: `${key}-${label.toLowerCase()}`, slug: label.toLowerCase(), name: text(label), image_url: key === "luxe-commerce-full" ? null : `/assets/${key}/category-${label.toLowerCase()}.${key === "drops" ? "png" : "webp"}`,
    })) }
    document.about = { title: text("About our store", "عن متجرنا"), body: text("Discover our carefully selected collection and make it your own.", "اكتشف مجموعتنا المختارة بعناية.") }
    document.contact.heading = text("Contact our store", "تواصل مع متجرنا")
  }
  return { name, primary, background, document: document as StorefrontDocumentV1, products: creationStarterProducts(key) }
}
