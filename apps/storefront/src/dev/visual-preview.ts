import type {
  StorefrontCatalogOrder,
  StorefrontCatalogPageDto,
  StorefrontCartDto,
  StorefrontCheckoutAddress,
  StorefrontCommerceCapabilitiesDto,
  StorefrontLocale,
  StorefrontOrderConfirmationDto,
  StorefrontPaymentMethod,
  StorefrontProductCardDto,
  StorefrontProductDetailDto,
  StorefrontProfileDto,
  StorefrontPurchaseOptionsDto,
  StorefrontShippingOptionDto,
  StorefrontTemplateKey,
} from "../types";
import { isLuxeCommerceTemplate } from "../types";
import { isStorefrontEditorPreviewEnabled } from "../config";
import { template6PreviewProfile, template6PreviewProducts } from "../templates/template-6/template-6-preview-data";
import { urbxPreviewProducts, urbxPreviewProfile } from "../templates/urbx/urbx-preview-data";
import {
  findStorefrontEditorPreviewProductByVariant,
  getStorefrontEditorPreviewProducts,
} from "../editor-preview-state";

const DEFAULT_VISUAL_PREVIEW_OPTIONS = {
  locale: "ar-LY",
  templateKey: "home-living",
} as const satisfies VisualPreviewOptions;

const VISUAL_PREVIEW_TEMPLATE_KEYS = new Set<string>([
  "luxe-commerce",
  "luxe-commerce-full",
  "modern-market",
  "home-living",
  "standard",
  "glow-beauty",
  "urbx",
  "template-6",
] satisfies StorefrontTemplateKey[]);

const VISUAL_PREVIEW_LOCALES = new Set<string>([
  "ar-LY",
  "en-LY",
] satisfies StorefrontLocale[]);

export type VisualPreviewOptions = {
  locale: StorefrontLocale;
  templateKey: StorefrontTemplateKey;
};

export const resolveVisualPreviewOptions = (
  search: string,
): VisualPreviewOptions => {
  const params = new URLSearchParams(search);
  const template = params.get("template");
  const locale = params.get("locale");

  return {
    templateKey: VISUAL_PREVIEW_TEMPLATE_KEYS.has(template ?? "")
      ? (template as StorefrontTemplateKey)
      : DEFAULT_VISUAL_PREVIEW_OPTIONS.templateKey,
    locale: VISUAL_PREVIEW_LOCALES.has(locale ?? "")
      ? (locale as StorefrontLocale)
      : DEFAULT_VISUAL_PREVIEW_OPTIONS.locale,
  };
};

const currentVisualPreviewSearch = (): string =>
  typeof window === "undefined" ? "" : window.location.search;

const previewProfile: StorefrontProfileDto = {
  name: "متجر نواة",
  handle: "nawa",
  domain: "nawa.ly",
  locale: "ar-LY",
  contact: {
    public_email: "hello@nawa.ly",
    public_phone: "+218 91 000 0000",
    whatsapp_number: "+218 92 000 0000",
  },
  branding: {
    logo_url: null,
    primary_color: "#1455e6",
    secondary_color: "#f2b134",
    typography_key: "cairo",
  },
  storefront: {
    schema_version: 1,
    template_key: "home-living",
    content: {
      navigation: {
        items: [
          { key: "home", label: { ar: "الرئيسية", en: "Main" }, enabled: true },
          { key: "categories", label: { ar: "التصنيفات", en: "Categories" }, enabled: true },
          { key: "favorites", label: { ar: "المفضلة", en: "Favorites" }, enabled: false },
          { key: "cart", label: { ar: "السلة", en: "Cart" }, enabled: false },
          { key: "account", label: { ar: "الحساب", en: "Account" }, enabled: false },
          { key: "orders", label: { ar: "الطلبات", en: "Orders" }, enabled: false },
          { key: "settings", label: { ar: "الإعدادات", en: "Settings" }, enabled: false },
        ],
      },
      hero: {
        eyebrow: { ar: "مرحباً بك في متجر نواة", en: "Welcome to Nawa" },
        heading: { ar: "تفاصيل هادئة لبيتك", en: "Quiet details for your home" },
        subheading: {
          ar: "منتجات مختارة بعناية لتضيف دفئاً وبساطة إلى مساحتك.",
          en: "Thoughtfully selected pieces that bring warmth and simplicity to your space.",
        },
        cta_label: { ar: "تصفح المنتجات", en: "Shop products" },
        cta_target: "catalog",
        image_url: "/assets/default-storefront-hero.png",
        slides: [],
        buttons: [],
        benefits: [],
      },
      brands: {
        heading: { ar: "علاماتنا التجارية", en: "Our brands" },
        subheading: { ar: "نقدم لكم نخبة من أشهر الماركات العالمية", en: "A curated selection of world-renowned brands" },
        items: [
          { id: "brand-hugo", name: { ar: "HUGO", en: "HUGO" }, slug: "hugo", image_url: null },
          { id: "brand-michael-kors", name: { ar: "MICHAEL KORS", en: "MICHAEL KORS" }, slug: "michael-kors", image_url: null },
          { id: "brand-just-cavalli", name: { ar: "Just Cavalli", en: "Just Cavalli" }, slug: "just-cavalli", image_url: null },
          { id: "brand-cavalli", name: { ar: "cavalli TIME", en: "cavalli TIME" }, slug: "cavalli", image_url: null },
          { id: "brand-fossil", name: { ar: "FOSSIL", en: "FOSSIL" }, slug: "fossil", image_url: null },
          { id: "brand-armani", name: { ar: "EMPORIO ARMANI", en: "EMPORIO ARMANI" }, slug: "emporio-armani", image_url: null },
          { id: "brand-timberland", name: { ar: "Timberland", en: "Timberland" }, slug: "timberland", image_url: null },
          { id: "brand-lacoste", name: { ar: "LACOSTE", en: "LACOSTE" }, slug: "lacoste", image_url: null },
        ],
      },
      about: {
        title: { ar: "عن متجر نواة", en: "About Nawa" },
        body: {
          ar: "نختار قطعاً منزلية بسيطة وعملية، مع اهتمام بالخامة والتفاصيل اليومية.",
          en: "We select simple, practical home pieces with care for materials and everyday details.",
        },
      },
      contact: {
        heading: { ar: "نحن هنا لمساعدتك", en: "We are here to help" },
        body: {
          ar: "تواصل معنا للاستفسار عن المنتجات والتوصيل.",
          en: "Contact us with questions about products and delivery.",
        },
      },
      policies: {
        delivery: {
          title: { ar: "سياسة التوصيل", en: "Delivery policy" },
          body: {
            ar: "نوصل الطلبات داخل ليبيا وفق المدة والتكلفة المؤكدتين عند إتمام الطلب.",
            en: "We deliver within Libya using the timing and fee confirmed at checkout.",
          },
        },
        returns: {
          title: { ar: "سياسة الإرجاع", en: "Returns policy" },
          body: {
            ar: "تواصل معنا مباشرة إذا احتجت إلى طلب إرجاع.",
            en: "Contact us directly if you need to request a return.",
          },
        },
        privacy: {
          title: { ar: "سياسة الخصوصية", en: "Privacy policy" },
          body: {
            ar: "نستخدم بيانات الطلب لإتمام الشراء والتواصل بشأنه فقط.",
            en: "We use order details only to complete your purchase and communicate about it.",
          },
        },
        terms: {
          title: { ar: "الشروط والأحكام", en: "Terms & conditions" },
          body: {
            ar: "يخضع استخدام المتجر وسياسات الطلب لهذه الشروط المنشورة.",
            en: "Use of this store and its ordering policies is subject to these published terms.",
          },
        },
      },
    },
  },
};

const previewProduct = (
  handle: string,
  title: string,
  subtitle: string,
  asset: string,
): StorefrontProductDetailDto => ({
  handle,
  title,
  subtitle,
  description: `${subtitle}. قطعة مختارة بعناية بتفاصيل أصلية، حضور أنيق وجودة مناسبة للاستخدام اليومي والمناسبات.`,
  thumbnail_url: `/assets/luxe/${asset}`,
  image_urls: [`/assets/luxe/${asset}`],
});

const previewProducts: StorefrontProductDetailDto[] = [
  previewProduct("black-sport-chronograph", "Black Sport Chronograph", "كرونوغراف رياضي أسود", "01-black-sport-chronograph.webp"),
  previewProduct("silver-dress-steel", "Silver Dress Steel", "ساعة كلاسيكية من الفولاذ", "02-silver-dress-steel.webp"),
  previewProduct("rose-gold-mesh", "Rose Gold Mesh", "أناقة روز جولد عصرية", "03-rose-gold-mesh.webp"),
  previewProduct("blue-dial-steel", "Blue Dial Steel", "واجهة زرقاء وسوار فولاذي", "04-blue-dial-steel.webp"),
  previewProduct("green-dial-leather", "Green Dial Leather", "واجهة خضراء مع جلد طبيعي", "05-green-dial-leather.webp"),
  previewProduct("skeleton-automatic", "Skeleton Automatic", "حركة أوتوماتيكية مكشوفة", "06-skeleton-automatic.webp"),
  previewProduct("gold-classic-leather", "Gold Leather", "ساعة ذهبية كلاسيكية", "09-gold-classic-leather.webp"),
  previewProduct("hybrid-smart-black", "Hybrid Smart Black", "تقنية ذكية بتصميم كلاسيكي", "10-hybrid-smart-black.webp"),
  previewProduct("black-square-sunglasses", "Black Square Sunglasses", "إطار أسود بعدسات مستقطبة", "glasses-01-black-square.webp"),
  previewProduct("silver-rollerball-pen", "Silver Rollerball Pen", "قلم فضي فاخر", "pens-02-silver-rollerball.webp"),
];

const standardPreviewProducts: StorefrontProductDetailDto[] = [
  {
    handle: "pastel-wrap-dress",
    title: "Pastel Wrap Dress",
    subtitle: "New collection",
    description: "A graceful wrap dress crafted from lightweight satin with a flattering waist and softly flowing sleeves.",
    thumbnail_url: "/assets/standard/product-pastel-wrap-dress.webp",
    image_urls: ["/assets/standard/product-pastel-wrap-dress.webp"],
  },
  {
    handle: "ivory-lounge-set",
    title: "Ivory Lounge Set",
    subtitle: "Soft tailoring",
    description: "An easy matching set in a warm ivory palette with relaxed modern proportions.",
    thumbnail_url: "/assets/standard/arrival-cream-set.webp",
    image_urls: ["/assets/standard/arrival-cream-set.webp"],
  },
  {
    handle: "heritage-leather-bag",
    title: "Heritage Leather Bag",
    subtitle: "Timeless accessories",
    description: "A structured espresso leather bag finished with polished heritage hardware.",
    thumbnail_url: "/assets/standard/favorite-heritage-leather-bag.webp",
    image_urls: ["/assets/standard/favorite-heritage-leather-bag.webp"],
  },
  {
    handle: "classic-beige-heels",
    title: "Classic Beige Heels",
    subtitle: "Everyday elegance",
    description: "A refined beige slingback with a comfortable heel and a clean pointed toe.",
    thumbnail_url: "/assets/standard/cart-classic-beige-heels.webp",
    image_urls: ["/assets/standard/cart-classic-beige-heels.webp"],
  },
  {
    handle: "cat-eye-sunglasses",
    title: "Cat-Eye Sunglasses",
    subtitle: "Statement eyewear",
    description: "Tortoiseshell cat-eye sunglasses with a softly sculpted frame.",
    thumbnail_url: "/assets/standard/trending-cat-eye-sunglasses.webp",
    image_urls: ["/assets/standard/trending-cat-eye-sunglasses.webp"],
  },
  {
    handle: "tailored-camel-coat",
    title: "Tailored Camel Coat",
    subtitle: "The neutral edit",
    description: "A double-breasted camel coat with a clean, softly structured silhouette.",
    thumbnail_url: "/assets/standard/recommended-tailored-camel-coat.webp",
    image_urls: ["/assets/standard/recommended-tailored-camel-coat.webp"],
  },
  {
    handle: "ivory-knit-set",
    title: "Ivory Knit Set",
    subtitle: "The neutral edit",
    description: "A coordinated ivory knit set designed for comfortable layering.",
    thumbnail_url: "/assets/standard/recommended-ivory-knit-set.webp",
    image_urls: ["/assets/standard/recommended-ivory-knit-set.webp"],
  },
  {
    handle: "espresso-tote",
    title: "Espresso Tote",
    subtitle: "Everyday accessories",
    description: "A spacious espresso tote with a minimal silhouette and practical interior.",
    thumbnail_url: "/assets/standard/recommended-espresso-tote.webp",
    image_urls: ["/assets/standard/recommended-espresso-tote.webp"],
  },
];

const standardPreviewProductMeta: Record<string, Pick<StorefrontProductCardDto, "brand" | "price_lyd" | "compare_at_price_lyd" | "badge">> = {
  "pastel-wrap-dress": { brand: "STYLE.", price_lyd: 129 },
  "ivory-lounge-set": { brand: "STYLE.", price_lyd: 89 },
  "heritage-leather-bag": { brand: "STYLE.", price_lyd: 148 },
  "classic-beige-heels": { brand: "STYLE.", price_lyd: 96 },
  "cat-eye-sunglasses": { brand: "STYLE.", price_lyd: 74 },
  "tailored-camel-coat": { brand: "STYLE.", price_lyd: 165 },
  "ivory-knit-set": { brand: "STYLE.", price_lyd: 112 },
  "espresso-tote": { brand: "STYLE.", price_lyd: 138 },
};

const glowBeautyPreviewProducts: StorefrontProductDetailDto[] = [
  {
    handle: "radiance-serum",
    title: "Radiance Serum",
    subtitle: "Brightening & Glow",
    description: "A lightweight illuminating serum that hydrates, brightens and restores a healthy natural glow.",
    thumbnail_url: "/assets/glow-beauty/product-radiance-serum.png",
    image_urls: ["/assets/glow-beauty/product-radiance-serum-detail.png"],
  },
  {
    handle: "hydra-moisturizer",
    title: "Hydra Moisturizer",
    subtitle: "24H Hydration",
    description: "Everyday hydration with a soft, comfortable finish for all skin types.",
    thumbnail_url: "/assets/glow-beauty/product-hydra-moisturizer.png",
    image_urls: ["/assets/glow-beauty/product-hydra-moisturizer.png"],
  },
  {
    handle: "matte-lipstick",
    title: "Matte Lipstick",
    subtitle: "Long Lasting Color",
    description: "Rich colour and a smooth matte finish made for comfortable everyday wear.",
    thumbnail_url: "/assets/glow-beauty/product-matte-lipstick.png",
    image_urls: ["/assets/glow-beauty/product-matte-lipstick.png"],
  },
  {
    handle: "rose-eau-de-parfum",
    title: "Rose Eau de Parfum",
    subtitle: "Elegant Floral Scent",
    description: "An elegant rose-led fragrance with a warm, softly lingering finish.",
    thumbnail_url: "/assets/glow-beauty/product-rose-eau-de-parfum-wishlist.png",
    image_urls: ["/assets/glow-beauty/product-rose-eau-de-parfum-wishlist.png"],
  },
  {
    handle: "glow-foundation",
    title: "Glow Foundation",
    subtitle: "Natural Finish",
    description: "Buildable coverage with a natural luminous finish.",
    thumbnail_url: "/assets/glow-beauty/product-glow-foundation.png",
    image_urls: ["/assets/glow-beauty/product-glow-foundation.png"],
  },
  {
    handle: "luxe-face-cream",
    title: "Luxe Face Cream",
    subtitle: "Deep Nourishment",
    description: "A rich face cream designed to comfort and nourish dry skin.",
    thumbnail_url: "/assets/glow-beauty/product-luxe-face-cream.png",
    image_urls: ["/assets/glow-beauty/product-luxe-face-cream.png"],
  },
];

const glowBeautyPreviewProductMeta: Record<string, Pick<StorefrontProductCardDto, "brand" | "price_lyd" | "compare_at_price_lyd" | "badge">> = {
  "radiance-serum": { brand: "GLOW BEAUTY", price_lyd: 125, compare_at_price_lyd: 160, badge: "BEST SELLER" },
  "hydra-moisturizer": { brand: "GLOW BEAUTY", price_lyd: 98, badge: "NEW" },
  "matte-lipstick": { brand: "GLOW BEAUTY", price_lyd: 75 },
  "rose-eau-de-parfum": { brand: "GLOW BEAUTY", price_lyd: 150 },
  "glow-foundation": { brand: "GLOW BEAUTY", price_lyd: 115 },
  "luxe-face-cream": { brand: "GLOW BEAUTY", price_lyd: 140 },
};

const activePreviewProducts = (): StorefrontProductDetailDto[] => {
  const editorProducts = getStorefrontEditorPreviewProducts();
  if (editorProducts) return editorProducts;
  const templateKey = resolveVisualPreviewOptions(currentVisualPreviewSearch()).templateKey;
  if (templateKey === "standard") return standardPreviewProducts;
  if (templateKey === "glow-beauty") return glowBeautyPreviewProducts;
  if (templateKey === "urbx") return urbxPreviewProducts;
  if (templateKey === "template-6") return template6PreviewProducts;
  return previewProducts;
};

const activePreviewProductMeta = (handle: string) => {
  const editorProduct = getStorefrontEditorPreviewProducts()
    ?.find((entry) => entry.handle === handle);
  if (editorProduct) {
    return {
      brand: null,
      price_lyd: editorProduct.price_lyd,
      compare_at_price_lyd: editorProduct.compare_at_price_lyd,
      badge: editorProduct.badge,
      category: editorProduct.category,
    };
  }
  const templateKey = resolveVisualPreviewOptions(currentVisualPreviewSearch()).templateKey;
  if (templateKey === "standard") return standardPreviewProductMeta[handle];
  if (templateKey === "glow-beauty") return glowBeautyPreviewProductMeta[handle];
  if (templateKey === "urbx") return urbxPreviewProducts.find(product => product.handle === handle);
  if (templateKey === "template-6") return template6PreviewProducts.find(product => product.handle === handle);
  return previewProductMeta[handle];
};

const previewProductMeta: Record<string, Pick<StorefrontProductCardDto, "brand" | "price_lyd" | "compare_at_price_lyd" | "badge">> = {
  "black-sport-chronograph": { brand: "HUGO BOSS", price_lyd: 3650, compare_at_price_lyd: 3950, badge: "خصم" },
  "silver-dress-steel": { brand: "Emporio Armani", price_lyd: 2890 },
  "rose-gold-mesh": { brand: "Just Cavalli", price_lyd: 1690, compare_at_price_lyd: 1890 },
  "blue-dial-steel": { brand: "FOSSIL", price_lyd: 2250, badge: "جديد" },
  "green-dial-leather": { brand: "LACOSTE", price_lyd: 1980 },
  "skeleton-automatic": { brand: "HUGO", price_lyd: 4200 },
  "gold-classic-leather": { brand: "Mediterraneo", price_lyd: 2000, compare_at_price_lyd: 3600 },
  "hybrid-smart-black": { brand: "Michael Kors", price_lyd: 3100, badge: "الأكثر طلباً" },
  "black-square-sunglasses": { brand: "Michael Kors", price_lyd: 920 },
  "silver-rollerball-pen": { brand: "Waterman", price_lyd: 510, compare_at_price_lyd: 540 },
};

const fullSourcePreviewSaleMeta: Record<
  string,
  Pick<StorefrontProductCardDto, "compare_at_price_lyd">
> = {
  "silver-dress-steel": { compare_at_price_lyd: 3190 },
  "black-square-sunglasses": { compare_at_price_lyd: 1080 },
};

const toCard = (
  product: StorefrontProductDetailDto,
): StorefrontProductCardDto => {
  const fullSource = resolveVisualPreviewOptions(currentVisualPreviewSearch()).templateKey ===
    "luxe-commerce-full";

  return {
    handle: product.handle,
    title: product.title,
    subtitle: product.subtitle,
    thumbnail_url: previewAssetUrl(product.thumbnail_url),
    ...activePreviewProductMeta(product.handle),
    ...(fullSource ? fullSourcePreviewSaleMeta[product.handle] : undefined),
  };
};

const previewAssetUrl = (value: string | null): string | null => {
  if (!value) return value;
  return resolveVisualPreviewOptions(currentVisualPreviewSearch()).templateKey ===
    "luxe-commerce-full"
    ? value.replace(
        "/assets/luxe/",
        "/assets/luxe-full/product-assets/",
      )
    : value;
};

const comparePreviewProducts = (
  first: StorefrontProductDetailDto,
  second: StorefrontProductDetailDto,
  order: StorefrontCatalogOrder | undefined,
): number => {
  if (order === "title" || order === "-title") {
    const comparison = first.title.localeCompare(second.title, "ar");
    return order === "-title" ? -comparison : comparison;
  }

  return 0;
};

export const getVisualPreviewProfile = (
  search = currentVisualPreviewSearch(),
): StorefrontProfileDto => {
  const options = resolveVisualPreviewOptions(search);
  if (options.templateKey === "urbx") return urbxPreviewProfile(previewProfile);
  if (options.templateKey === "template-6") return template6PreviewProfile(previewProfile);
  const standardPreview = options.templateKey === "standard";
  const glowBeautyPreview = options.templateKey === "glow-beauty";
  const storefront = previewProfile.storefront
    ? structuredClone(previewProfile.storefront)
    : null;

  if (storefront) {
    storefront.template_key = options.templateKey;
    if (isLuxeCommerceTemplate(options.templateKey)) {
      storefront.content.hero = {
        eyebrow: { ar: "تطبيق السنوسي", en: "Al-Sanousi Collection" },
        heading: { ar: "احصل على 30% تخفيض لأول طلبية", en: "30% off your first order" },
        subheading: { ar: "تراث من الدقة .. أناقة تدوم", en: "A legacy of precision. Elegance that lasts." },
        cta_label: { ar: "تصفح منتجاتنا", en: "Browse our products" },
        cta_target: "catalog",
        image_url:
          options.templateKey === "luxe-commerce-full"
            ? "/assets/luxe-full/customer-assets/home-hero-light-lifestyle.webp"
            : "/assets/luxe/home-hero-watch.webp",
        slides: options.templateKey === "luxe-commerce-full" ? [
          { id: "hero-slide-1", image_url: "/assets/luxe-full/customer-assets/home-hero-light-lifestyle.webp", alt: { ar: "رجل يرتدي ساعة فاخرة", en: "Man wearing a luxury watch" }, enabled: true },
          { id: "hero-slide-2", image_url: "/assets/luxe-full/customer-assets/home-hero-light-watch.webp", alt: { ar: "ساعة كلاسيكية", en: "Classic watch" }, enabled: true },
          { id: "hero-slide-3", image_url: "/assets/luxe-full/customer-assets/home-hero-light-accessories.webp", alt: { ar: "إكسسوارات مختارة", en: "Curated accessories" }, enabled: true },
        ] : [],
        buttons: [
          { id: "hero-button-1", label: { ar: "تصفح منتجاتنا", en: "Browse our products" }, href: "/best-sellers", background_color: "#b77f3f", text_color: "#ffffff", style: "solid", enabled: true },
          { id: "hero-button-2", label: { ar: "تعرف علينا", en: "Our story" }, href: "/about", background_color: "#b77f3f", text_color: "#17243a", style: "outline", enabled: true },
        ],
        benefits: [
          { id: "hero-benefit-authentic", icon: "award", title: { ar: "أصلية 100%", en: "100% authentic" }, subtitle: { ar: "منتجات موثوقة", en: "AUTHENTIC" } },
          { id: "hero-benefit-distributor", icon: "award", title: { ar: "موزع رسمي", en: "Official distributor" }, subtitle: { ar: "وكيل معتمد", en: "OFFICIAL DISTRIBUTOR" } },
          { id: "hero-benefit-warranty", icon: "shield", title: { ar: "ضمان دولي", en: "International warranty" }, subtitle: { ar: "تغطية موثوقة", en: "INTERNATIONAL WARRANTY" } },
          { id: "hero-benefit-delivery", icon: "truck", title: { ar: "توصيل سريع", en: "Fast delivery" }, subtitle: { ar: "داخل ليبيا", en: "FAST DELIVERY" } },
        ],
      };
      storefront.content.about = {
        title: options.templateKey === "luxe-commerce-full"
          ? { ar: "الأصالة تهمنا", en: "Authenticity matters" }
          : { ar: "منذ 1970", en: "Since 1970" },
        body: {
          ar: options.templateKey === "luxe-commerce-full"
            ? "جميع منتجاتنا أصلية 100% ومستوردة من الوكلاء المعتمدين في ضمان دولي."
            : "السنوسي وأبنائه وجهتكم للساعات والنظارات والأقلام الأصلية، بخبرة تمتد لأكثر من خمسة عقود.",
          en: options.templateKey === "luxe-commerce-full"
            ? "Every product is 100% authentic, sourced from authorized distributors and backed by international warranty."
            : "Al-Sanousi & Sons has curated authentic watches, eyewear and pens for more than five decades.",
        },
      };
      storefront.content.contact = {
        heading: { ar: "خدمة تليق باختيارك", en: "Service worthy of your choice" },
        body: {
          ar: "فريقنا متاح لمساعدتك في اختيار المنتج والتوصيل وخدمة ما بعد البيع.",
          en: "Our team can help with product selection, delivery and after-sales support.",
        },
      };
    }
    if (standardPreview) {
      storefront.content.navigation.items = storefront.content.navigation.items.map((item) => ({
        ...item,
        enabled: ["home", "categories", "favorites", "cart", "account"].includes(item.key),
      }));
      storefront.content.hero = {
        eyebrow: { ar: "موسم جديد 2026", en: "New season 2026" },
        heading: { ar: "ارتدي ثقتك", en: "Wear your confidence" },
        subheading: {
          ar: "قطع مختارة بعناية لإطلالة يومية سهلة وأنيقة.",
          en: "Thoughtfully selected pieces for effortless everyday style.",
        },
        cta_label: { ar: "تسوقي المجموعة", en: "Shop new collection" },
        cta_target: "catalog",
        image_url: "/assets/standard/desktop-hero-editorial.webp",
        slides: [
          { id: "standard-hero", image_url: "/assets/standard/desktop-hero-editorial.webp", alt: { ar: "عارضة ترتدي فستاناً بلون جملي", en: "Model wearing a camel dress" }, enabled: true },
        ],
        buttons: [
          { id: "standard-shop", label: { ar: "تسوقي المجموعة", en: "Shop new collection" }, href: "/products", background_color: "#3f2100", text_color: "#ffffff", style: "solid", enabled: true },
          { id: "standard-explore", label: { ar: "اكتشفي الإطلالات", en: "Explore styles" }, href: "/products", background_color: "#ffffff", text_color: "#3f2100", style: "outline", enabled: true },
        ],
        benefits: [
          { id: "standard-delivery", icon: "truck", title: { ar: "توصيل", en: "Free delivery" }, subtitle: { ar: "وفق شروط المتجر", en: "Store terms apply" } },
          { id: "standard-returns", icon: "package", title: { ar: "إرجاع سهل", en: "Easy returns" }, subtitle: { ar: "راجع سياسة الإرجاع", en: "See returns policy" } },
          { id: "standard-payment", icon: "shield", title: { ar: "دفع آمن", en: "Secure payment" }, subtitle: { ar: "دفع محمي", en: "Protected checkout" } },
        ],
      };
      storefront.content.brands = {
        heading: { ar: "تسوقي حسب الفئة", en: "Shop by category" },
        subheading: { ar: "اكتشفي مجموعاتنا المختارة", en: "Explore our curated collections" },
        items: [
          { id: "standard-handbags", name: { ar: "حقائب", en: "Handbags" }, slug: "handbags", image_url: "/assets/standard/category-handbags.webp" },
          { id: "standard-watches", name: { ar: "ساعات", en: "Watches" }, slug: "watches", image_url: "/assets/standard/category-watches.webp" },
          { id: "standard-sunglasses", name: { ar: "نظارات شمسية", en: "Sunglasses" }, slug: "sunglasses", image_url: "/assets/standard/category-sunglasses.webp" },
          { id: "standard-shoes", name: { ar: "أحذية", en: "Shoes" }, slug: "shoes", image_url: "/assets/standard/category-shoes.webp" },
          { id: "standard-dresses", name: { ar: "فساتين", en: "Dresses" }, slug: "dresses", image_url: "/assets/standard/category-dresses.webp" },
          { id: "standard-casual", name: { ar: "كاجوال", en: "Casual" }, slug: "casual", image_url: "/assets/standard/category-casual.webp" },
        ],
      };
      storefront.content.about = {
        title: { ar: "أناقة يومية", en: "Always be stylish" },
        body: {
          ar: "أزياء وإكسسوارات مختارة بعناية لتناسب أسلوبك اليومي.",
          en: "Thoughtfully selected fashion and accessories for effortless everyday style.",
        },
      };
    }
    if (glowBeautyPreview) {
      storefront.content.navigation.items = storefront.content.navigation.items.map((item) => ({
        ...item,
        enabled: ["home", "categories", "favorites", "cart", "account"].includes(item.key),
      }));
      storefront.content.hero = {
        eyebrow: { ar: "وصل حديثاً", en: "New beauty arrivals" },
        heading: { ar: "تألقي بطبيعتك", en: "Glow naturally, shine beautifully" },
        subheading: {
          ar: "أساسيات جمال مختارة لبشرتك وأناقتك وثقتك اليومية.",
          en: "Premium beauty essentials curated for your skin, style, and everyday confidence.",
        },
        cta_label: { ar: "اكتشفي المجموعة", en: "Explore beauty" },
        cta_target: "catalog",
        image_url: "/assets/glow-beauty/hero-beauty-collection.png",
        slides: [{ id: "glow-beauty-hero", image_url: "/assets/glow-beauty/hero-beauty-collection.png", alt: { ar: "مجموعة عناية وجمال بدرجات وردية", en: "Rose-toned beauty and skincare collection" }, enabled: true }],
        buttons: [{ id: "glow-beauty-shop", label: { ar: "تسوقي الآن", en: "Shop now" }, href: "/products", background_color: "#d96856", text_color: "#ffffff", style: "solid", enabled: true }],
        benefits: [
          { id: "glow-beauty-delivery", icon: "truck", title: { ar: "توصيل داخل ليبيا", en: "Libya delivery" }, subtitle: { ar: "يظهر عند الدفع", en: "Shown at checkout" } },
          { id: "glow-beauty-care", icon: "sparkle", title: { ar: "عناية مختارة", en: "Curated care" }, subtitle: { ar: "منتجات المتجر", en: "Store products" } },
        ],
      };
      storefront.content.brands = {
        heading: { ar: "تسوقي حسب الفئة", en: "Shop by category" },
        subheading: { ar: "اكتشفي أساسيات جمال مختارة", en: "Explore curated beauty essentials" },
        items: [
          { id: "glow-skincare", name: { ar: "العناية بالبشرة", en: "Skincare" }, slug: "skincare", image_url: "/assets/glow-beauty/product-radiance-serum.png" },
          { id: "glow-makeup", name: { ar: "المكياج", en: "Makeup" }, slug: "makeup", image_url: "/assets/glow-beauty/product-matte-lipstick.png" },
          { id: "glow-fragrance", name: { ar: "العطور", en: "Fragrance" }, slug: "fragrance", image_url: "/assets/glow-beauty/category-fragrance.png" },
          { id: "glow-haircare", name: { ar: "العناية بالشعر", en: "Haircare" }, slug: "haircare", image_url: "/assets/glow-beauty/category-haircare.png" },
          { id: "glow-tools", name: { ar: "الأدوات", en: "Tools" }, slug: "tools", image_url: "/assets/glow-beauty/category-tools.png" },
        ],
      };
      storefront.content.about = {
        title: { ar: "جمالك بطريقتك", en: "Beauty, your way" },
        body: { ar: "نختار أساسيات جمال موثوقة للعناية اليومية.", en: "We curate trusted beauty essentials for confident everyday care." },
      };
      storefront.content.contact = {
        heading: { ar: "نحن هنا لمساعدتك", en: "Beauty support" },
        body: { ar: "تواصلي معنا للاستفسار عن المنتجات والتوصيل.", en: "Contact us with questions about products and delivery." },
      };
    }
  }

  return {
    ...previewProfile,
    name: glowBeautyPreview
      ? "Glow Beauty"
      : standardPreview
      ? "STYLE."
      : isLuxeCommerceTemplate(options.templateKey)
        ? "السنوسي وأبنائه"
        : previewProfile.name,
    handle: glowBeautyPreview
      ? "glow-beauty"
      : standardPreview
      ? "standard-style"
      : isLuxeCommerceTemplate(options.templateKey)
        ? "al-sanousi"
        : previewProfile.handle,
    domain: glowBeautyPreview
      ? "glowbeauty.ly"
      : standardPreview
      ? "style.labibtech.ly"
      : isLuxeCommerceTemplate(options.templateKey)
        ? "alsanousi.ly"
        : previewProfile.domain,
    locale:
      (standardPreview || glowBeautyPreview) && !new URLSearchParams(search).has("locale")
        ? "en-LY"
        : options.locale,
    contact: { ...previewProfile.contact },
    branding: glowBeautyPreview
      ? {
          logo_url: "/assets/glow-beauty/glow-petal-mark-v1.png",
          primary_color: "#d96856",
          secondary_color: "#f4c9bd",
          typography_key: "cairo",
        }
      : standardPreview
      ? {
          logo_url: null,
          primary_color: "#3f2100",
          secondary_color: "#d7b488",
          typography_key: "cairo",
        }
      : isLuxeCommerceTemplate(options.templateKey)
      ? {
          logo_url:
            options.templateKey === "luxe-commerce-full"
              ? "/assets/luxe-full/customer-assets/store-header-logo.png"
              : "/assets/luxe/store-header-logo.png",
          primary_color: "#171513",
          secondary_color: "#c8954c",
          typography_key: "cairo",
        }
      : { ...previewProfile.branding },
    storefront,
  };
};

export const getVisualPreviewCatalog = (input: {
  limit: number;
  offset: number;
  q?: string;
  order?: StorefrontCatalogOrder;
}): StorefrontCatalogPageDto => {
  const query = input.q
    ?.replace(/-/g, " ")
    .toLocaleLowerCase("ar");
  const filtered = activePreviewProducts()
    .filter((product) => {
      if (!query) {
        return true;
      }

      if (query === "watch" || query === "watches") {
        return !product.handle.includes("sunglasses") && !product.handle.includes("pen");
      }

      if (query === "sunglasses" || query === "glasses") {
        return product.handle.includes("sunglasses");
      }

      if (query === "pen" || query === "pens") {
        return product.handle.includes("pen");
      }

      return `${product.title} ${product.subtitle ?? ""} ${activePreviewProductMeta(product.handle)?.brand ?? ""}`
        .replace(/-/g, " ")
        .toLocaleLowerCase("ar")
        .includes(query);
    })
    .sort((first, second) =>
      comparePreviewProducts(first, second, input.order),
    );

  if (input.order === "-created_at") {
    filtered.reverse();
  }

  return {
    products: filtered
      .slice(input.offset, input.offset + input.limit)
      .map(toCard),
    count: filtered.length,
    offset: input.offset,
    limit: input.limit,
  };
};

export const getVisualPreviewProduct = (
  handle: string,
): StorefrontProductDetailDto | null => {
  const product = activePreviewProducts().find((entry) => entry.handle === handle);

  const editorProduct = getStorefrontEditorPreviewProducts()
    ?.find((entry) => entry.handle === handle);
  return product
    ? {
        ...product,
        thumbnail_url: previewAssetUrl(product.thumbnail_url),
        image_urls: product.image_urls.map((value) => previewAssetUrl(value)!),
        ...(editorProduct
          ? {
              badge: editorProduct.badge,
              category: editorProduct.category,
              compare_at_price_lyd: editorProduct.compare_at_price_lyd,
            }
          : undefined),
      }
    : null;
};

export const getVisualPreviewCommerceCapabilities = (): StorefrontCommerceCapabilitiesDto => ({
  online_checkout: {
    status: "available",
    currency_code: "lyd",
    country_codes: ["ly"],
    payment_methods: ["cod", "bank_transfer"],
  },
});

export const getVisualPreviewPurchaseOptions = (
  handle: string,
): StorefrontPurchaseOptionsDto | null => {
  const editorProduct = getStorefrontEditorPreviewProducts()
    ?.find((entry) => entry.handle === handle);
  if (editorProduct) return structuredClone(editorProduct.purchase);
  const product = activePreviewProducts().find((entry) => entry.handle === handle);
  if (!product) return null;
  const templateKey = resolveVisualPreviewOptions(currentVisualPreviewSearch()).templateKey;
  const glowBeautyVariants = templateKey === "glow-beauty" && handle === "radiance-serum";
  return {
    product_handle: handle,
    currency_code: "lyd",
    options: templateKey === "template-6"
      ? [{ name: "size", values: ["S", "M", "L", "XL"] }]
      : templateKey === "urbx"
      ? [{ name: "size", values: ["S", "M", "L", "XL", "XXL"] }, { name: "color", values: ["Black"] }]
      : templateKey === "standard" && handle === "pastel-wrap-dress"
      ? [
          { name: "size", values: ["S", "M", "L", "XL"] },
          { name: "color", values: ["Coral", "Powder blue", "Gold", "Cream"] },
        ]
      : glowBeautyVariants
        ? [
            { name: "size", values: ["30 ml", "50 ml", "100 ml"] },
            { name: "color", values: ["Rose", "Pearl"] },
          ]
      : [],
    variants: templateKey === "template-6"
      ? ["S", "M", "L", "XL"].map(size => ({ id: `preview:${handle}:${size}`, title: size,
          options: { size, color: null }, unit_price: activePreviewProductMeta(handle)?.price_lyd ?? 0, available_for_sale: true }))
      : templateKey === "urbx"
      ? ["S", "M", "L", "XL", "XXL"].map(size => ({ id: `preview:${handle}:${size}:Black`, title: `${size} / Black`,
          options: { size, color: "Black" }, unit_price: activePreviewProductMeta(handle)?.price_lyd ?? 0, available_for_sale: true }))
      : templateKey === "standard" && handle === "pastel-wrap-dress"
      ? ["S", "M", "L", "XL"].flatMap((size) => ["Coral", "Powder blue", "Gold", "Cream"].map((color) => ({
          id: `preview:${handle}:${size}:${color}`,
          title: `${size} / ${color}`,
          options: { size, color },
          unit_price: standardPreviewProductMeta[handle]?.price_lyd ?? 129,
          available_for_sale: true,
        })))
      : glowBeautyVariants
        ? ["30 ml", "50 ml", "100 ml"].flatMap((size) => ["Rose", "Pearl"].map((color) => ({
            id: `preview:${handle}:${size}:${color}`,
            title: `${size} / ${color}`,
            options: { size, color },
            unit_price: glowBeautyPreviewProductMeta[handle]?.price_lyd ?? 125,
            available_for_sale: true,
          })))
      : [{
          id: `preview:${handle}`,
          title: "Standard",
          options: { size: null, color: null },
          unit_price: activePreviewProductMeta(handle)?.price_lyd ?? 1000,
          available_for_sale: true,
        }],
  };
};

let previewCart: StorefrontCartDto | null = null;
let previewLineCounter = 0;
const PREVIEW_CART_STORAGE_KEY = "labibtech:storefront:visual-preview-cart:v1";

const readStoredPreviewCart = (): StorefrontCartDto | null => {
  if (typeof window === "undefined") return null;
  try {
    const value = JSON.parse(window.sessionStorage.getItem(PREVIEW_CART_STORAGE_KEY) ?? "null");
    return value && typeof value === "object" && value.id === "preview-cart"
      ? (value as StorefrontCartDto)
      : null;
  } catch {
    return null;
  }
};

const storePreviewCart = () => {
  if (typeof window === "undefined") return;
  try {
    if (previewCart) window.sessionStorage.setItem(PREVIEW_CART_STORAGE_KEY, JSON.stringify(previewCart));
    else window.sessionStorage.removeItem(PREVIEW_CART_STORAGE_KEY);
  } catch {
    // The interactive preview remains usable in memory when storage is unavailable.
  }
};

const currentPreviewCart = (): StorefrontCartDto | null => {
  previewCart ??= readStoredPreviewCart();
  return previewCart;
};

const previewCartTotals = (cart: StorefrontCartDto): StorefrontCartDto => {
  const itemSubtotal = cart.items.reduce((total, item) => total + item.unit_price * item.quantity, 0);
  return {
    ...cart,
    items: cart.items.map((item) => ({ ...item, total: item.unit_price * item.quantity })),
    item_subtotal: itemSubtotal,
    total: itemSubtotal + cart.shipping_total,
  };
};

export const createVisualPreviewCart = (): StorefrontCartDto => {
  previewCart = {
    id: "preview-cart",
    currency_code: "lyd",
    email: null,
    items: [],
    item_subtotal: 0,
    shipping_total: 0,
    total: 0,
    shipping_method_selected: false,
    payment_session_ready: false,
    completed: false,
  };
  storePreviewCart();
  return structuredClone(previewCart);
};

export const getVisualPreviewCart = (): StorefrontCartDto | null =>
  currentPreviewCart() ? structuredClone(previewCart!) : null;

export const addVisualPreviewCartItem = (variantId: string, quantity = 1): StorefrontCartDto => {
  const editorSelection = findStorefrontEditorPreviewProductByVariant(variantId);
  const handle = editorSelection?.product.handle ??
    (variantId.startsWith("preview:") ? variantId.slice(8).split(":")[0] : "");
  const product = editorSelection?.product ??
    activePreviewProducts().find((entry) => entry.handle === handle);
  if (!product) throw new Error("Unknown preview product");
  if (!currentPreviewCart()) createVisualPreviewCart();
  const existing = previewCart!.items.find((item) => item.variant_id === variantId);
  if (existing) existing.quantity += quantity;
  else previewCart!.items.push({
    id: `preview-line-${Date.now()}-${++previewLineCounter}`,
    variant_id: variantId,
    title: product.title,
    product_handle: handle,
    variant_title: (editorSelection?.variant ?? getVisualPreviewPurchaseOptions(handle)?.variants.find(variant => variant.id === variantId))?.title ?? null,
    thumbnail_url: previewAssetUrl(product.thumbnail_url),
    quantity,
    unit_price: editorSelection?.variant.unit_price ?? activePreviewProductMeta(handle)?.price_lyd ?? 1000,
    total: editorSelection?.variant.unit_price ?? activePreviewProductMeta(handle)?.price_lyd ?? 1000,
  });
  previewCart = previewCartTotals(previewCart!);
  storePreviewCart();
  return structuredClone(previewCart);
};

export const updateVisualPreviewCartItem = (lineId: string, quantity: number): StorefrontCartDto => {
  const cart = currentPreviewCart();
  if (!cart) throw new Error("Preview cart missing");
  const item = cart.items.find((entry) => entry.id === lineId);
  if (!item) throw new Error("Preview line missing");
  item.quantity = quantity;
  previewCart = previewCartTotals(cart);
  storePreviewCart();
  return structuredClone(previewCart);
};

export const removeVisualPreviewCartItem = (lineId: string): StorefrontCartDto => {
  const cart = currentPreviewCart();
  if (!cart) throw new Error("Preview cart missing");
  cart.items = cart.items.filter((entry) => entry.id !== lineId);
  previewCart = previewCartTotals(cart);
  storePreviewCart();
  return structuredClone(previewCart);
};

export const updateVisualPreviewAddress = (address: StorefrontCheckoutAddress): StorefrontCartDto => {
  const cart = currentPreviewCart();
  if (!cart) throw new Error("Preview cart missing");
  cart.email = address.email;
  previewCart = cart;
  storePreviewCart();
  return structuredClone(previewCart);
};

export const urbxCheckoutReferenceAddress = (): StorefrontCheckoutAddress => ({
  first_name: "Alex", last_name: "Morgan", email: "alex@example.com",
  address_1: "24 Market Street, Apartment 3", city: "Tripoli", country_code: "ly", phone: "",
});

// Fictional screenshot data, imported only by the standalone DEV Template 6 preview.
export const template6CheckoutReferenceAddress = (): StorefrontCheckoutAddress => ({
  first_name: "Arafat", last_name: "", email: "arafat@example.com",
  address_1: "Apartment 1204, Marina Heights", city: "Dubai Marina, Dubai", country_code: "ae", phone: "+971 5X XXX 4821",
});

export const getVisualPreviewShippingOptions = (): StorefrontShippingOptionDto[] =>
  resolveVisualPreviewOptions(currentVisualPreviewSearch()).templateKey === "urbx" &&
  !isStorefrontEditorPreviewEnabled() && !new URLSearchParams(currentVisualPreviewSearch()).has("setup-preview")
  ? [{ id: "preview-urbx-standard", name: "Standard delivery", amount: 0 }]
  : resolveVisualPreviewOptions(currentVisualPreviewSearch()).templateKey === "template-6" &&
    !isStorefrontEditorPreviewEnabled() && !new URLSearchParams(currentVisualPreviewSearch()).has("setup-preview")
  ? [{ id: "preview-six-standard", name: "Standard Delivery", amount: 20 }]
  : [
  { id: "preview-delivery", name: "توصيل داخل طرابلس", amount: 20 },
  { id: "preview-pickup", name: "استلام من المتجر", amount: 0 },
];

export const selectVisualPreviewShipping = (optionId: string): StorefrontCartDto => {
  const cart = currentPreviewCart();
  if (!cart) throw new Error("Preview cart missing");
  const option = getVisualPreviewShippingOptions().find(item => item.id === optionId);
  if (!option) throw new Error("Unknown preview shipping option");
  cart.shipping_total = option.amount;
  cart.shipping_method_selected = true;
  previewCart = previewCartTotals(cart);
  storePreviewCart();
  return structuredClone(previewCart);
};

export const prepareVisualPreviewPayment = (): void => {
  if (currentPreviewCart()) {
    previewCart!.payment_session_ready = true;
    storePreviewCart();
  }
};

export const completeVisualPreviewOrder = (
  paymentMethod: StorefrontPaymentMethod,
): StorefrontOrderConfirmationDto => {
  const cart = currentPreviewCart();
  if (!cart) throw new Error("Preview cart missing");
  const confirmation: StorefrontOrderConfirmationDto = {
    display_id: "PREVIEW-1048",
    currency_code: "lyd",
    items: cart.items.map(({ title, variant_title, thumbnail_url, quantity, unit_price, total }) => ({ title, variant_title: variant_title ?? undefined, thumbnail_url, quantity, unit_price, total })),
    item_subtotal: cart.item_subtotal,
    shipping_total: cart.shipping_total,
    total: cart.total,
    payment: paymentMethod === "cod"
      ? { method: "cod", status: "pending_fulfillment" }
      : {
          method: "bank_transfer",
          status: "pending_verification",
          bank_transfer: {
            bank_name: "مصرف الجمهورية",
            account_holder_name: "السنوسي وأبنائه",
            account_reference: "LY00 0000 0000 1048",
            instructions: "اكتب رقم الطلب في وصف التحويل ثم تواصل معنا عبر واتساب.",
          },
        },
  };
  previewCart = null;
  storePreviewCart();
  return confirmation;
};
