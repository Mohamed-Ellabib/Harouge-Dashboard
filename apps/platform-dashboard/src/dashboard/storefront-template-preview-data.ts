import type {
  PlatformStorefrontPreview,
  PlatformStorefrontPreviewProduct,
  PlatformStorefrontTemplateKey,
} from "./types"

type TemplatePreviewProduct = Pick<
  PlatformStorefrontPreviewProduct,
  "handle" | "title" | "description" | "thumbnail_url" | "price_lyd"
>

type StorefrontTemplatePreviewSource = Omit<
  PlatformStorefrontPreview,
  "products"
> & {
  template_key: PlatformStorefrontTemplateKey
  is_mock: true
  products: TemplatePreviewProduct[]
  hero: {
    eyebrow: string
    heading: string
    subheading: string
    cta_label: string
    image_url: string
  }
}

export type StorefrontTemplatePreviewModel = PlatformStorefrontPreview & {
  template_key: PlatformStorefrontTemplateKey
  is_mock: true
  hero: StorefrontTemplatePreviewSource["hero"]
}

const previewModels: Record<PlatformStorefrontTemplateKey, StorefrontTemplatePreviewSource> = {
  "template-6": {
    template_key: "template-6", is_mock: true, name: "Template 6", handle: "template-6-demo", domain: null, locale: "en-LY",
    contact: { public_email: null, public_phone: null, whatsapp_number: null },
    branding: { logo_url: null, primary_color: "#eeff66", secondary_color: "#2c9db6", typography_key: "manrope" },
    hero: { eyebrow: "", heading: "DISCOVER BEST DEALS ITEMS NEARBY", subheading: "A smarter marketplace for the UAE & GCC — fast, trusted, and made for your lifestyle.", cta_label: "GET STARTED", image_url: "/assets/template-6/welcome-scene-v1.png" },
    products: [], product_count: 0,
  },
  urbx: {
    template_key: "urbx", is_mock: true, name: "URBX", handle: "urbx-demo", domain: null, locale: "en-LY",
    contact: { public_email: null, public_phone: null, whatsapp_number: null },
    branding: { logo_url: null, primary_color: "#d5ff00", secondary_color: "#070707", typography_key: "manrope" },
    hero: { eyebrow: "STREETWEAR", heading: "BUILT DIFFERENT. MADE TO STAND OUT.", subheading: "URBX is more than clothing. It’s a mindset. A movement. A way of life.", cta_label: "START SHOPPING", image_url: "/assets/urbx/welcome-alley-v1.png" },
    products: [], product_count: 0,
  },
  drops: {
    template_key: "drops", is_mock: true, name: "DROPS", handle: "drops-demo", domain: null, locale: "en-LY",
    contact: { public_email: null, public_phone: null, whatsapp_number: null },
    branding: { logo_url: null, primary_color: "#009b4d", secondary_color: "#ffffff", typography_key: "manrope" },
    hero: { eyebrow: "", heading: "Year-End Sale", subheading: "Up To 90%", cta_label: "Shop Now", image_url: "/assets/drops/year-end-sale-hero.png" },
    products: [
      { handle: "jordan-retro-high-dior", title: "Jordan 1 Retro High Dior", description: "Sneaker collection", thumbnail_url: "/assets/drops/jordan-retro-high.png", price_lyd: 9000 },
      { handle: "adidas-iniki-runner-70s", title: "Adidas Iniki Runner 70S", description: "Sneaker collection", thumbnail_url: "/assets/drops/retro-runner-blue.png", price_lyd: 14200 },
    ], product_count: 2,
  },
  "luxe-commerce": {
    template_key: "luxe-commerce",
    is_mock: true,
    name: "السنوسي وأبنائه",
    handle: "al-sanousi-demo",
    domain: "alsanousi.ly",
    locale: "ar-LY",
    contact: {
      public_email: "hello@alsanousi.ly",
      public_phone: "+218 91 234 5678",
      whatsapp_number: "+218 91 234 5678",
    },
    branding: {
      logo_url: null,
      primary_color: "#b88a3b",
      secondary_color: "#e7c982",
      typography_key: "cairo",
    },
    hero: {
      eyebrow: "مجموعة الساعات الفاخرة",
      heading: "أناقة تتجاوز الزمن",
      subheading: "اكتشف ساعات استثنائية صُممت لترافق أجمل لحظاتك، بتفاصيل دقيقة وحضور لا يُنسى.",
      cta_label: "اكتشف المجموعة",
      image_url: "/assets/admin/template-preview/luxe-hero.webp",
    },
    products: [
      { handle: "heritage-black", title: "ساعة هيريتج السوداء", description: "هيكل فولاذي وسوار جلدي طبيعي بتفاصيل كلاسيكية.", thumbnail_url: "/assets/admin/template-preview/luxe-watch-black.webp", price_lyd: 2450 },
      { handle: "ocean-automatic", title: "أوشن أوتوماتيك", description: "ساعة أوتوماتيكية بواجهة زرقاء ومقاومة عالية للماء.", thumbnail_url: "/assets/admin/template-preview/luxe-watch-blue.webp", price_lyd: 3180 },
      { handle: "royal-gold", title: "رويال جولد", description: "تصميم ذهبي راقٍ للمناسبات والإطلالات المميزة.", thumbnail_url: "/assets/admin/template-preview/luxe-watch-gold.webp", price_lyd: 4290 },
      { handle: "rose-signature", title: "روز سيغنتشر", description: "لمسة ذهبية وردية بتصميم ناعم وأنيق.", thumbnail_url: "/assets/admin/template-preview/luxe-watch-rose.webp", price_lyd: 2890 },
    ],
    product_count: 4,
  },
  "luxe-commerce-full": {
    template_key: "luxe-commerce-full",
    is_mock: true,
    name: "السنوسي وأبنائه",
    handle: "al-sanousi-full-demo",
    domain: "alsanousi.ly",
    locale: "ar-LY",
    contact: {
      public_email: "hello@alsanousi.ly",
      public_phone: "+218 91 234 5678",
      whatsapp_number: "+218 91 234 5678",
    },
    branding: {
      logo_url: null,
      primary_color: "#b77f3f",
      secondary_color: "#e8b765",
      typography_key: "cairo",
    },
    hero: {
      eyebrow: "تشكيلة مختارة بعناية",
      heading: "أناقة أصيلة، لكل لحظة",
      subheading: "واجهة السنوسي الكاملة بكل صفحاتها ومسافاتها وحركاتها وتجربة التسوق الأصلية.",
      cta_label: "تسوق الآن",
      image_url: "/assets/admin/template-preview/luxe-hero.webp",
    },
    products: [
      { handle: "full-source-black", title: "ساعة كرونوغراف سوداء", description: "تصميم رياضي فاخر من الواجهة الأصلية.", thumbnail_url: "/assets/admin/template-preview/luxe-watch-black.webp", price_lyd: 2450 },
      { handle: "full-source-blue", title: "ساعة أوتوماتيكية زرقاء", description: "تفاصيل معدنية دقيقة وحضور كلاسيكي.", thumbnail_url: "/assets/admin/template-preview/luxe-watch-blue.webp", price_lyd: 3180 },
      { handle: "full-source-gold", title: "ساعة كلاسيكية ذهبية", description: "اختيار مميز للمناسبات والإطلالات الراقية.", thumbnail_url: "/assets/admin/template-preview/luxe-watch-gold.webp", price_lyd: 4290 },
      { handle: "full-source-rose", title: "ساعة روز سيغنتشر", description: "لون ذهبي وردي وتصميم خفيف وأنيق.", thumbnail_url: "/assets/admin/template-preview/luxe-watch-rose.webp", price_lyd: 2890 },
    ],
    product_count: 4,
  },
  "modern-market": {
    template_key: "modern-market",
    is_mock: true,
    name: "Nova Market",
    handle: "nova-market-demo",
    domain: "novamarket.ly",
    locale: "en-LY",
    contact: {
      public_email: "hello@novamarket.ly",
      public_phone: "+218 92 445 7810",
      whatsapp_number: "+218 92 445 7810",
    },
    branding: {
      logo_url: null,
      primary_color: "#1668e8",
      secondary_color: "#70c8ff",
      typography_key: "cairo",
    },
    hero: {
      eyebrow: "New season essentials",
      heading: "Everything you need, in one place.",
      subheading: "A flexible, product-first storefront for modern brands and growing catalogues.",
      cta_label: "Shop new arrivals",
      image_url: "/assets/admin/template-preview/modern-hero.webp",
    },
    products: [
      { handle: "noir-frame", title: "Noir Frame", description: "Lightweight sunglasses with polarized lenses and a timeless silhouette.", thumbnail_url: "/assets/admin/template-preview/modern-glasses-black.webp", price_lyd: 420 },
      { handle: "azure-frame", title: "Azure Frame", description: "Contemporary blue lenses with a comfortable everyday fit.", thumbnail_url: "/assets/admin/template-preview/modern-glasses-blue.webp", price_lyd: 460 },
      { handle: "essential-watch", title: "Essential Watch", description: "A clean everyday timepiece designed for work and weekends.", thumbnail_url: "/assets/admin/template-preview/luxe-watch-blue.webp", price_lyd: 780 },
      { handle: "studio-carryall", title: "Studio Carryall", description: "A versatile premium accessory for a modern daily routine.", thumbnail_url: "/assets/admin/template-preview/luxe-watch-black.webp", price_lyd: 590 },
    ],
    product_count: 4,
  },
  "home-living": {
    template_key: "home-living",
    is_mock: true,
    name: "Nawa Living",
    handle: "nawa-living-demo",
    domain: "nawaliving.ly",
    locale: "en-LY",
    contact: {
      public_email: "studio@nawaliving.ly",
      public_phone: "+218 94 882 1140",
      whatsapp_number: "+218 94 882 1140",
    },
    branding: {
      logo_url: null,
      primary_color: "#315d4c",
      secondary_color: "#b9c9aa",
      typography_key: "cairo",
    },
    hero: {
      eyebrow: "Thoughtful pieces for every room",
      heading: "Make your house a home.",
      subheading: "Warm textures, honest materials and considered objects selected for everyday living.",
      cta_label: "Explore the collection",
      image_url: "/assets/admin/template-preview/home-hero.png",
    },
    products: [
      { handle: "linen-cushion", title: "Linen Cushion", description: "A soft woven cushion in a calming natural palette.", thumbnail_url: "/assets/admin/template-preview/home-cushion.png", price_lyd: 135 },
      { handle: "stoneware-mug", title: "Stoneware Mug", description: "Hand-finished stoneware made for slow morning rituals.", thumbnail_url: "/assets/admin/template-preview/home-mug.png", price_lyd: 68 },
      { handle: "sculpted-vase", title: "Sculpted Vase", description: "An organic ceramic form for stems or a quiet shelf moment.", thumbnail_url: "/assets/admin/template-preview/home-vase.png", price_lyd: 190 },
      { handle: "cedar-candle", title: "Cedar Candle", description: "A clean-burning candle with warm cedar and amber notes.", thumbnail_url: "/assets/admin/template-preview/home-candle.png", price_lyd: 92 },
    ],
    product_count: 4,
  },
  standard: {
    template_key: "standard",
    is_mock: true,
    name: "STYLE.",
    handle: "standard-style-demo",
    domain: "style.labibtech.ly",
    locale: "en-LY",
    contact: {
      public_email: "hello@style.ly",
      public_phone: "+218 91 000 0000",
      whatsapp_number: "+218 91 000 0000",
    },
    branding: {
      logo_url: null,
      primary_color: "#3f2100",
      secondary_color: "#d7b488",
      typography_key: "cairo",
    },
    hero: {
      eyebrow: "New season 2026",
      heading: "Wear your confidence",
      subheading: "Thoughtfully selected pieces for effortless everyday style.",
      cta_label: "Shop new collection",
      image_url: "/assets/admin/templates/standard.svg",
    },
    products: [
      { handle: "ivory-lounge-set", title: "Ivory Lounge Set", description: "Soft neutral tailoring for everyday wear.", thumbnail_url: "/assets/admin/templates/standard.svg", price_lyd: 890 },
      { handle: "pastel-wrap-dress", title: "Pastel Wrap Dress", description: "A graceful striped wrap dress with a fluid silhouette.", thumbnail_url: "/assets/admin/templates/standard.svg", price_lyd: 1290 },
      { handle: "heritage-leather-bag", title: "Heritage Leather Bag", description: "Structured leather with timeless hardware.", thumbnail_url: "/assets/admin/templates/standard.svg", price_lyd: 1480 },
      { handle: "classic-beige-heels", title: "Classic Beige Heels", description: "A refined slingback heel in a soft neutral finish.", thumbnail_url: "/assets/admin/templates/standard.svg", price_lyd: 960 },
    ],
    product_count: 4,
  },
  "glow-beauty": {
    template_key: "glow-beauty",
    is_mock: true,
    name: "Glow Beauty",
    handle: "glow-beauty-demo",
    domain: "glowbeauty.ly",
    locale: "en-LY",
    contact: {
      public_email: "hello@glowbeauty.ly",
      public_phone: "+218 91 000 0000",
      whatsapp_number: "+218 91 000 0000",
    },
    branding: {
      logo_url: null,
      primary_color: "#d96856",
      secondary_color: "#f4c9bd",
      typography_key: "cairo",
    },
    hero: {
      eyebrow: "New beauty arrivals",
      heading: "Glow naturally, shine beautifully.",
      subheading: "Premium beauty essentials curated for your skin, style, and everyday confidence.",
      cta_label: "Explore beauty",
      image_url: "/assets/admin/templates/glow-beauty.svg",
    },
    products: [
      { handle: "radiance-serum", title: "Radiance Serum", description: "A lightweight brightening serum for a healthy natural glow.", thumbnail_url: "/assets/glow-beauty/product-radiance-serum.png", price_lyd: 125 },
      { handle: "hydra-moisturizer", title: "Hydra Moisturizer", description: "Everyday moisture with a soft, comfortable finish.", thumbnail_url: "/assets/glow-beauty/product-hydra-moisturizer.png", price_lyd: 98 },
      { handle: "matte-lipstick", title: "Matte Lipstick", description: "Long-lasting colour with a smooth matte texture.", thumbnail_url: "/assets/glow-beauty/product-matte-lipstick.png", price_lyd: 75 },
      { handle: "rose-eau-de-parfum", title: "Rose Eau de Parfum", description: "An elegant floral fragrance for every day.", thumbnail_url: "/assets/glow-beauty/product-rose-eau-de-parfum-wishlist.png", price_lyd: 150 },
      { handle: "glow-foundation", title: "Glow Foundation", description: "Buildable coverage with a natural luminous finish.", thumbnail_url: "/assets/glow-beauty/product-glow-foundation.png", price_lyd: 115 },
      { handle: "luxe-face-cream", title: "Luxe Face Cream", description: "A rich face cream designed to nourish dry skin.", thumbnail_url: "/assets/glow-beauty/product-luxe-face-cream.png", price_lyd: 140 },
    ],
    product_count: 6,
  },
}

export function createStorefrontTemplatePreview(
  templateKey: PlatformStorefrontTemplateKey,
): StorefrontTemplatePreviewModel {
  const source = structuredClone(previewModels[templateKey])
  return {
    ...source,
    products: source.products.map((product) => ({
      ...product,
      subtitle: null,
      image_urls: product.thumbnail_url ? [product.thumbnail_url] : [],
      compare_at_price_lyd: null,
      category: null,
      badge: null,
      options: [],
      variants: [],
    })),
  }
}
