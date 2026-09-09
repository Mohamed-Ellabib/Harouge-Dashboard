import {
  PiArrowLeft,
  PiArrowsOut,
  PiArrowSquareOut,
  PiBank,
  PiCheckCircle,
  PiClock,
  PiDeviceMobile,
  PiDesktop,
  PiFloppyDisk,
  PiGlobe,
  PiHeadset,
  PiHeart,
  PiImage,
  PiMedal,
  PiPackage,
  PiPalette,
  PiPlus,
  PiPhone,
  PiShieldCheck,
  PiSparkle,
  PiSpinnerGap,
  PiStorefront,
  PiTruck,
  PiUploadSimple,
  PiTrash,
  PiWarningCircle,
  PiX,
} from "react-icons/pi"
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react"
import { createPortal } from "react-dom"

import {
  getPlatformStoreConfiguration,
  getPlatformStorefront,
  getPlatformStorefrontPreview,
  publishPlatformStorefront,
  savePlatformStoreConfiguration,
  savePlatformStorefrontDraft,
  uploadPlatformImage,
} from "../api"
import { DASHBOARD_BEFORE_NAVIGATION_EVENT } from "../routing"
import {
  buildStorefrontEditorPreviewProfile,
  resolveStorefrontPreviewOrigin,
  STOREFRONT_EDITOR_PREVIEW_MESSAGE,
  STOREFRONT_EDITOR_PREVIEW_READY_MESSAGE,
  type StorefrontEditorPreviewMessage,
} from "../storefront-editor-preview"
import type {
  PlatformStore,
  PlatformStoreConfiguration,
  PlatformStoreConfigurationRecord,
  PlatformStoreConfigurationUpdate,
  PlatformStorefrontBankTransfer,
  PlatformStorefrontBrand,
  PlatformStorefrontBenefitIcon,
  PlatformStorefrontDocument,
  PlatformStorefrontHeroButton,
  PlatformStorefrontHeroBenefit,
  PlatformStorefrontHeroSlide,
  PlatformStorefrontLocalizedText,
  PlatformStorefrontNavigationKey,
  PlatformStorefrontRecord,
  PlatformStorefrontPreviewProduct,
  PlatformStorefrontTemplateKey,
} from "../types"

import "./admin-storefront-editor.css"
import "./glow-phone-editor.css"
import { applyGlowContent, glowContentField, GlowContentDialog } from "./GlowContentDialog"
import { GlowStoreSettings } from "./GlowStoreSettings"

type AdminStorefrontEditorPageProps = {
  error: string | null
  isDemo: boolean
  loading: boolean
  onBack: () => void
  onStorefrontUpdated: () => void | Promise<void>
  onToast: (message: string) => void
  store: PlatformStore | null
}

type EditorSection = "brand" | "navigation" | "hero" | "brands" | "about" | "contact" | "policies" | "bank"
type EditorLanguage = "ar" | "en"
type PreviewDevice = "desktop" | "mobile"
type PreviewScaleMode = "fit" | "actual"
type PreviewPreset = {
  id: string
  device: PreviewDevice
  label: string
  width: number
  height: number
}
type PolicyKey = keyof PlatformStorefrontDocument["policies"]

const PREVIEW_PRESETS: readonly PreviewPreset[] = [
  { id: "desktop-hd", device: "desktop", label: "Desktop HD", width: 1440, height: 900 },
  { id: "desktop-full-hd", device: "desktop", label: "Desktop Full HD", width: 1920, height: 1080 },
  { id: "laptop", device: "desktop", label: "Laptop", width: 1366, height: 768 },
  { id: "iphone-16-pro-max", device: "mobile", label: "iPhone 16 Pro Max", width: 440, height: 956 },
  { id: "iphone-15-pro-max", device: "mobile", label: "iPhone 15 Pro Max", width: 430, height: 932 },
  { id: "iphone-13-pro-max", device: "mobile", label: "iPhone 13 Pro Max", width: 428, height: 926 },
  { id: "iphone-12-pro-max", device: "mobile", label: "iPhone 12 Pro Max", width: 428, height: 926 },
  { id: "iphone-xs-max", device: "mobile", label: "iPhone XS Max (X series)", width: 414, height: 896 },
  { id: "galaxy-s24-ultra", device: "mobile", label: "Galaxy S24 Ultra", width: 412, height: 915 },
  { id: "galaxy-note-20-ultra", device: "mobile", label: "Galaxy Note 20 Ultra", width: 412, height: 915 },
  { id: "pixel-8-pro", device: "mobile", label: "Google Pixel 8 Pro", width: 412, height: 915 },
  { id: "compact-android", device: "mobile", label: "Compact Android", width: 360, height: 800 },
] as const

const DEFAULT_PREVIEW_PRESET: Record<PreviewDevice, string> = {
  desktop: "desktop-hd",
  mobile: "iphone-15-pro-max",
}

const TEMPLATE_KEYS = new Set<PlatformStorefrontTemplateKey>([
  "luxe-commerce",
  "luxe-commerce-full",
  "modern-market",
  "home-living",
  "standard",
  "glow-beauty",
  "drops",
  "urbx",
  "template-6",
])

const TEMPLATE_LABELS: Record<PlatformStorefrontTemplateKey, string> = {
  "luxe-commerce": "Luxe Commerce",
  "luxe-commerce-full": "Luxe Commerce — Full Source",
  "modern-market": "Modern Market",
  "home-living": "Home & Living",
  standard: "Standard",
  "glow-beauty": "Glow Beauty",
  drops: "Drops",
  urbx: "Template 5 · URBX",
  "template-6": "Template 6",
}

const POLICY_LABELS: Record<PolicyKey, string> = {
  delivery: "Delivery policy",
  returns: "Returns policy",
  privacy: "Privacy policy",
  terms: "Terms & conditions",
}

const NAVIGATION_PRESETS: Array<{
  key: PlatformStorefrontNavigationKey
  name: string
  description: string
  label: PlatformStorefrontLocalizedText
}> = [
  { key: "home", name: "Main", description: "Storefront home page", label: { ar: "الرئيسية", en: "Main" } },
  { key: "categories", name: "Categories", description: "Product catalog and categories", label: { ar: "التصنيفات", en: "Categories" } },
  { key: "favorites", name: "Favorites", description: "Customer saved products", label: { ar: "المفضلة", en: "Favorites" } },
  { key: "cart", name: "Cart", description: "Current shopping cart", label: { ar: "السلة", en: "Cart" } },
  { key: "account", name: "Account", description: "Customer account", label: { ar: "الحساب", en: "Account" } },
  { key: "orders", name: "Orders", description: "Customer order history", label: { ar: "الطلبات", en: "Orders" } },
  { key: "settings", name: "Settings", description: "Customer account settings", label: { ar: "الإعدادات", en: "Settings" } },
]

const defaultNavigation = (): PlatformStorefrontDocument["navigation"] => ({
  items: NAVIGATION_PRESETS.map((preset) => ({
    key: preset.key,
    label: { ...preset.label },
    enabled: preset.key === "home" || preset.key === "categories",
  })),
})

const FALLBACK_PRIMARY = "#1455e6"
const FALLBACK_SECONDARY = "#f2b134"
const FALLBACK_HERO_BUTTON = "#b77f3f"
const MAX_HERO_SLIDES = 12
const MAX_HERO_BUTTONS = 5
const MAX_HERO_BENEFITS = 8
const MAX_STOREFRONT_BRANDS = 16
const LUXE_FULL_HERO_IMAGES = [
  "/assets/luxe-full/customer-assets/home-hero-light-lifestyle.webp",
  "/assets/luxe-full/customer-assets/home-hero-light-watch.webp",
  "/assets/luxe-full/customer-assets/home-hero-light-accessories.webp",
] as const

const HERO_BENEFIT_ICON_OPTIONS: Array<{
  key: PlatformStorefrontBenefitIcon
  label: string
  icon: typeof PiMedal
}> = [
  { key: "award", label: "Award", icon: PiMedal },
  { key: "shield", label: "Protection", icon: PiShieldCheck },
  { key: "truck", label: "Delivery", icon: PiTruck },
  { key: "package", label: "Package", icon: PiPackage },
  { key: "check", label: "Verified", icon: PiCheckCircle },
  { key: "heart", label: "Care", icon: PiHeart },
  { key: "globe", label: "Worldwide", icon: PiGlobe },
  { key: "clock", label: "Fast service", icon: PiClock },
  { key: "headset", label: "Support", icon: PiHeadset },
  { key: "sparkle", label: "Premium", icon: PiSparkle },
]

const defaultHeroBenefits = (): PlatformStorefrontHeroBenefit[] => [
  { id: "hero-benefit-authentic", icon: "award", title: { ar: "أصلية 100%", en: "100% authentic" }, subtitle: { ar: "منتجات موثوقة", en: "AUTHENTIC" } },
  { id: "hero-benefit-distributor", icon: "award", title: { ar: "موزع رسمي", en: "Official distributor" }, subtitle: { ar: "وكيل معتمد", en: "OFFICIAL DISTRIBUTOR" } },
  { id: "hero-benefit-warranty", icon: "shield", title: { ar: "ضمان دولي", en: "International warranty" }, subtitle: { ar: "تغطية موثوقة", en: "INTERNATIONAL WARRANTY" } },
  { id: "hero-benefit-delivery", icon: "truck", title: { ar: "توصيل سريع", en: "Fast delivery" }, subtitle: { ar: "داخل ليبيا", en: "FAST DELIVERY" } },
]

const defaultStorefrontBrands = (): PlatformStorefrontDocument["brands"] => ({
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
})

const configurationFromStore = (
  store: PlatformStore,
): PlatformStoreConfiguration => ({
  name: store.name,
  locale: store.locale === "en-LY" ? "en-LY" : "ar-LY",
  contact: { ...store.contact },
  brand: {
    logo_url: store.brand?.logo_url ?? null,
    primary_color: store.brand?.primary_color ?? null,
    secondary_color: store.brand?.secondary_color ?? null,
    typography_key: store.brand?.typography_key === "cairo" ? "cairo" : null,
  },
})

const cloneConfiguration = (
  value: PlatformStoreConfiguration,
): PlatformStoreConfiguration => ({
  ...value,
  contact: { ...value.contact },
  brand: { ...value.brand },
})

const demoConfigurationRecord = (
  store: PlatformStore,
): PlatformStoreConfigurationRecord => ({
  configuration: configurationFromStore(store),
  revision: 3,
  updated_at: "2026-08-13T12:00:00.000Z",
  updated_by: "Demo administrator",
})

const cloneLocalized = (value: PlatformStorefrontLocalizedText) => ({ ...value })

const legacyHeroSlides = (
  value: PlatformStorefrontDocument,
): PlatformStorefrontHeroSlide[] => {
  if (value.hero.slides?.length) return value.hero.slides
  const urls = value.template_key === "luxe-commerce-full"
    ? [value.hero.image_url ?? LUXE_FULL_HERO_IMAGES[0], ...LUXE_FULL_HERO_IMAGES.slice(1)]
    : value.hero.image_url ? [value.hero.image_url] : []
  return Array.from(new Set(urls)).map((imageUrl, index) => ({
    id: `hero-slide-${index + 1}`,
    image_url: imageUrl,
    alt: { ar: `صورة الواجهة ${index + 1}`, en: `Hero image ${index + 1}` },
    enabled: true,
  }))
}

const legacyHeroButtons = (
  value: PlatformStorefrontDocument,
): PlatformStorefrontHeroButton[] => value.hero.buttons?.length
  ? value.hero.buttons
  : [{
      id: "hero-button-1",
      label: cloneLocalized(value.hero.cta_label),
      href: value.hero.cta_target === "contact" ? "#contact" : "/best-sellers",
      background_color: FALLBACK_HERO_BUTTON,
      text_color: "#ffffff",
      style: "solid",
      enabled: true,
    }]

const cloneDocument = (
  value: PlatformStorefrontDocument,
): PlatformStorefrontDocument => ({
  ...value,
  navigation: {
    items: (value.navigation?.items ?? defaultNavigation().items).map((item) => ({
      ...item,
      label: cloneLocalized(item.label),
    })),
  },
  hero: {
    ...value.hero,
    eyebrow: cloneLocalized(value.hero.eyebrow),
    heading: cloneLocalized(value.hero.heading),
    subheading: cloneLocalized(value.hero.subheading),
    cta_label: cloneLocalized(value.hero.cta_label),
    slides: legacyHeroSlides(value).map((slide) => ({
      ...slide,
      alt: cloneLocalized(slide.alt),
    })),
    buttons: legacyHeroButtons(value).map((button) => ({
      ...button,
      label: cloneLocalized(button.label),
    })),
    benefits: (value.hero.benefits ?? defaultHeroBenefits()).map((benefit) => ({
      ...benefit,
      title: cloneLocalized(benefit.title),
      subtitle: cloneLocalized(benefit.subtitle),
    })),
  },
  brands: {
    ...(value.brands ?? defaultStorefrontBrands()),
    heading: cloneLocalized((value.brands ?? defaultStorefrontBrands()).heading),
    subheading: cloneLocalized((value.brands ?? defaultStorefrontBrands()).subheading),
    items: (value.brands ?? defaultStorefrontBrands()).items.map((brand) => ({
      ...brand,
      name: cloneLocalized(brand.name),
    })),
  },
  about: {
    title: cloneLocalized(value.about.title),
    body: cloneLocalized(value.about.body),
  },
  contact: {
    heading: cloneLocalized(value.contact.heading),
    body: cloneLocalized(value.contact.body),
  },
  policies: Object.fromEntries(
    (Object.keys(value.policies) as PolicyKey[]).map((key) => [
      key,
      {
        title: cloneLocalized(value.policies[key].title),
        body: cloneLocalized(value.policies[key].body),
      },
    ]),
  ) as PlatformStorefrontDocument["policies"],
})

const cloneBank = (
  value: PlatformStorefrontBankTransfer,
): PlatformStorefrontBankTransfer => ({
  ...value,
  instructions: cloneLocalized(value.instructions),
})

const demoDocument = (): PlatformStorefrontDocument => ({
  schema_version: 1,
  template_key: "glow-beauty",
  navigation: defaultNavigation(),
  hero: {
    eyebrow: { ar: "مختارات استثنائية", en: "Exceptional selections" },
    heading: { ar: "أناقة خالدة لكل لحظة", en: "Timeless elegance for every moment" },
    subheading: {
      ar: "اكتشف مجموعة مختارة بعناية من الساعات والإكسسوارات الفاخرة.",
      en: "Discover a carefully selected collection of luxury watches and accessories.",
    },
    cta_label: { ar: "تصفح المجموعة", en: "Shop the collection" },
    cta_target: "catalog",
    image_url: "/assets/glow-beauty/hero-beauty-collection.png",
    slides: [{
      id: "hero-slide-1",
      image_url: "/assets/glow-beauty/hero-beauty-collection.png",
      alt: { ar: "مجموعة جلو بيوتي", en: "Glow Beauty collection" },
      enabled: true,
    }],
    buttons: [{
      id: "hero-button-1",
      label: { ar: "تصفح المجموعة", en: "Shop the collection" },
      href: "/best-sellers",
      background_color: FALLBACK_HERO_BUTTON,
      text_color: "#ffffff",
      style: "solid",
      enabled: true,
    }],
    benefits: defaultHeroBenefits(),
  },
  brands: defaultStorefrontBrands(),
  about: {
    title: { ar: "قصتنا", en: "Our story" },
    body: {
      ar: "نختار قطعاً تجمع بين الجودة والتصميم لترافقك لسنوات.",
      en: "We select pieces that unite quality and design for years to come.",
    },
  },
  contact: {
    heading: { ar: "تواصل معنا", en: "Contact us" },
    body: {
      ar: "فريقنا جاهز لمساعدتك في اختيار القطعة المناسبة.",
      en: "Our team is ready to help you choose the right piece.",
    },
  },
  policies: {
    delivery: {
      title: { ar: "التوصيل", en: "Delivery" },
      body: { ar: "نوصل الطلبات داخل ليبيا.", en: "We deliver orders across Libya." },
    },
    returns: {
      title: { ar: "الاسترجاع", en: "Returns" },
      body: { ar: "تواصل معنا لطلب الاسترجاع.", en: "Contact us to request a return." },
    },
    privacy: {
      title: { ar: "الخصوصية", en: "Privacy" },
      body: { ar: "نستخدم بياناتك لإتمام طلبك فقط.", en: "We use your data only to fulfil your order." },
    },
    terms: {
      title: { ar: "الشروط", en: "Terms" },
      body: { ar: "تطبق شروط المتجر على جميع الطلبات.", en: "Store terms apply to all orders." },
    },
  },
})

const demoRecord = (): PlatformStorefrontRecord => ({
  storefront: {
    revision: 3,
    latest_revision: 3,
    published_revision: 3,
    status: "published",
    document: demoDocument(),
    bank_transfer: {
      bank_name: "Libyan Commercial Bank",
      account_holder_name: "Al-Sanousi & Sons",
      account_reference: "LY00 0000 0000 0000",
      instructions: {
        ar: "استخدم رقم الطلب كمرجع للتحويل.",
        en: "Use the order number as the transfer reference.",
      },
    },
    updated_at: "2026-08-13T12:00:00.000Z",
    updated_by: "Demo administrator",
    published_at: "2026-08-13T12:00:00.000Z",
    published_by: "Demo administrator",
  },
})

const demoStore = (): PlatformStore => ({
  id: "demo-store-reference",
  name: "Glow Beauty",
  handle: "glow-beauty",
  status: "active",
  plan_code: "professional_commerce",
  locale: "ar-LY",
  timezone: "Africa/Tripoli",
  contact: {
    public_email: "hello@glowbeauty.ly",
    public_phone: "+218 91 234 5678",
    whatsapp_number: "+218 92 234 5678",
  },
  brand: {
    logo_url: `${import.meta.env.VITE_STOREFRONT_PREVIEW_ORIGIN ?? "http://127.0.0.1:5176"}/assets/glow-beauty/glow-petal-mark-v1.png`,
    favicon_url: null,
    primary_color: "#ff6b35",
    secondary_color: "#ffccb5",
    typography_key: "cairo",
  },
  domains: [],
  memberships: [],
  product_count: 24,
  compatibility_vendor: null,
  provisioning: null,
  commerce_readiness: null,
  commerce_setup: null,
})

const sameValue = (left: unknown, right: unknown) =>
  JSON.stringify(left) === JSON.stringify(right)

const errorStatus = (error: unknown): number | null =>
  error && typeof error === "object" && "status" in error
    ? Number((error as { status?: unknown }).status) || null
    : null

const nullableText = (value: string) => value.trim() || null

const normalizeConfiguration = (
  value: PlatformStoreConfiguration,
): PlatformStoreConfigurationUpdate => ({
  name: value.name.trim(),
  locale: value.locale === "en-LY" ? "en-LY" : "ar-LY",
  contact: {
    public_email: value.contact.public_email?.trim().toLowerCase() || null,
    public_phone: nullableText(value.contact.public_phone ?? ""),
    whatsapp_number: nullableText(value.contact.whatsapp_number ?? ""),
  },
  brand: {
    logo_url: nullableText(value.brand.logo_url ?? ""),
    primary_color: value.brand.primary_color?.trim().toLowerCase() || null,
    secondary_color: value.brand.secondary_color?.trim().toLowerCase() || null,
    typography_key: value.brand.typography_key === "cairo" ? "cairo" : null,
  },
})

const validateConfiguration = (
  value: PlatformStoreConfiguration,
): string | null => {
  const name = value.name.trim()
  if (name.length < 2 || name.length > 120 || /[\u0000-\u001f\u007f]/u.test(name)) {
    return "Store name must contain 2–120 single-line characters."
  }
  if (value.contact.public_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value.contact.public_email.trim())) {
    return "Enter a valid public email address."
  }
  for (const [label, phone] of [
    ["Public phone", value.contact.public_phone],
    ["WhatsApp number", value.contact.whatsapp_number],
  ] as const) {
    if (phone && (phone.trim().length < 5 || phone.length > 40 || !/^[+0-9() .-]+$/u.test(phone.trim()))) {
      return `${label} may contain digits, spaces, +, -, and parentheses only.`
    }
  }
  for (const [label, color] of [
    ["Primary color", value.brand.primary_color],
    ["Secondary color", value.brand.secondary_color],
  ] as const) {
    if (color && !/^#[0-9a-f]{6}$/iu.test(color.trim())) {
      return `${label} must use the six-digit #RRGGBB format.`
    }
  }
  return null
}

const normalizeLocalized = (
  value: PlatformStorefrontLocalizedText,
): PlatformStorefrontLocalizedText => ({ ar: value.ar.trim(), en: value.en.trim() })

const normalizeDocument = (
  value: PlatformStorefrontDocument,
): PlatformStorefrontDocument => {
  const slides = value.hero.slides.map((slide) => ({
    ...slide,
    image_url: slide.image_url.trim(),
    alt: normalizeLocalized(slide.alt),
  }))
  const buttons = value.hero.buttons.map((button) => ({
    ...button,
    label: normalizeLocalized(button.label),
    href: button.href.trim(),
    background_color: button.background_color.trim().toLowerCase(),
    text_color: button.text_color.trim().toLowerCase(),
  }))
  const benefits = value.hero.benefits.map((benefit) => ({
    ...benefit,
    title: normalizeLocalized(benefit.title),
    subtitle: normalizeLocalized(benefit.subtitle),
  }))
  const brands = {
    ...(value.brands.search_placeholder ? { search_placeholder: normalizeLocalized(value.brands.search_placeholder) } : {}),
    ...(value.brands.explore_label ? { explore_label: normalizeLocalized(value.brands.explore_label) } : {}),
    ...(value.brands.view_all_label ? { view_all_label: normalizeLocalized(value.brands.view_all_label) } : {}),
    ...(value.brands.promotion_heading ? { promotion_heading: normalizeLocalized(value.brands.promotion_heading) } : {}),
    ...(value.brands.promotion_subheading ? { promotion_subheading: normalizeLocalized(value.brands.promotion_subheading) } : {}),
    ...(value.brands.promotion_image_url !== undefined ? { promotion_image_url: nullableText(value.brands.promotion_image_url ?? "") } : {}),
    heading: normalizeLocalized(value.brands.heading),
    subheading: normalizeLocalized(value.brands.subheading),
    items: value.brands.items.map((brand) => ({
      ...brand,
      name: normalizeLocalized(brand.name),
      slug: brand.slug.trim().toLowerCase(),
      image_url: nullableText(brand.image_url ?? ""),
    })),
  }
  const firstSlide = slides.find((slide) => slide.enabled) ?? slides[0]
  const firstButton = buttons.find((button) => button.enabled) ?? buttons[0]
  return ({
  ...value,
  navigation: {
    items: value.navigation.items.map((item) => ({
      ...item,
      label: normalizeLocalized(item.label),
    })),
  },
  hero: {
    ...value.hero,
    eyebrow: normalizeLocalized(value.hero.eyebrow),
    heading: normalizeLocalized(value.hero.heading),
    subheading: normalizeLocalized(value.hero.subheading),
    cta_label: firstButton ? firstButton.label : normalizeLocalized(value.hero.cta_label),
    cta_target: firstButton?.href === "#contact" ? "contact" : value.hero.cta_target,
    image_url: firstSlide?.image_url ?? nullableText(value.hero.image_url ?? ""),
    slides,
    buttons,
    benefits,
  },
  brands,
  about: {
    title: normalizeLocalized(value.about.title),
    body: normalizeLocalized(value.about.body),
  },
  contact: {
    heading: normalizeLocalized(value.contact.heading),
    body: normalizeLocalized(value.contact.body),
  },
  policies: Object.fromEntries(
    (Object.keys(value.policies) as PolicyKey[]).map((key) => [
      key,
      {
        title: normalizeLocalized(value.policies[key].title),
        body: normalizeLocalized(value.policies[key].body),
      },
    ]),
  ) as PlatformStorefrontDocument["policies"],
  })
}

const normalizeBank = (
  value: PlatformStorefrontBankTransfer,
): PlatformStorefrontBankTransfer => ({
  bank_name: nullableText(value.bank_name ?? ""),
  account_holder_name: nullableText(value.account_holder_name ?? ""),
  account_reference: nullableText(value.account_reference ?? ""),
  instructions: normalizeLocalized(value.instructions),
})

const requiredLocalizedValues = (document: PlatformStorefrontDocument) => [
  document.hero.eyebrow,
  document.hero.heading,
  document.hero.subheading,
  document.hero.cta_label,
  document.about.title,
  document.about.body,
  document.contact.heading,
  document.contact.body,
  ...Object.values(document.policies).flatMap((policy) => [policy.title, policy.body]),
]

const documentComplete = (document: PlatformStorefrontDocument) =>
  TEMPLATE_KEYS.has(document.template_key) &&
  document.navigation.items.length === NAVIGATION_PRESETS.length &&
  document.navigation.items.every((item) => item.label.ar.trim() && item.label.en.trim()) &&
  document.hero.buttons.length > 0 &&
  document.hero.buttons.every((button) => button.label.ar.trim() && button.label.en.trim()) &&
  document.hero.benefits.every((benefit) =>
    benefit.title.ar.trim() && benefit.title.en.trim() &&
    benefit.subtitle.ar.trim() && benefit.subtitle.en.trim(),
  ) &&
  (!document.brands.items.length || Boolean(
    document.brands.heading.ar.trim() && document.brands.heading.en.trim() &&
    document.brands.subheading.ar.trim() && document.brands.subheading.en.trim() &&
    document.brands.items.every((brand) => brand.name.ar.trim() && brand.name.en.trim())
  )) &&
  requiredLocalizedValues(document).every(
    (value) => value.ar.trim().length > 0 && value.en.trim().length > 0,
  )

const bankComplete = (bank: PlatformStorefrontBankTransfer) => {
  const configured = Boolean(
    bank.bank_name || bank.account_holder_name || bank.account_reference ||
      bank.instructions.ar.trim() || bank.instructions.en.trim(),
  )
  return !configured || Boolean(
    bank.bank_name && bank.account_holder_name && bank.account_reference &&
      bank.instructions.ar.trim() && bank.instructions.en.trim(),
  )
}

const containsMarkup = (value: string) => /[<>]/u.test(value)
const containsInlineControl = (value: string) => /[\u0000-\u001f\u007f]/u.test(value)
const containsBodyControl = (value: string) => /[\u0000-\u0008\u000b-\u001f\u007f]/u.test(value)
const safeStorefrontLink = (value: string) => {
  if (/^#[A-Za-z0-9_-]{1,128}$/u.test(value)) return true
  if (value.startsWith("/") && !value.startsWith("//") && !value.includes("..") && !/[\\<>]/u.test(value)) return true
  try {
    const parsed = new URL(value)
    return parsed.protocol === "https:" && !parsed.username && !parsed.password
  } catch {
    return false
  }
}

const validateDraft = (
  document: PlatformStorefrontDocument,
  bank: PlatformStorefrontBankTransfer,
): string | null => {
  if (!TEMPLATE_KEYS.has(document.template_key)) return "Choose one of the five approved Storefront templates."
  const navigationKeys = new Set(document.navigation.items.map((item) => item.key))
  if (document.navigation.items.length !== NAVIGATION_PRESETS.length || navigationKeys.size !== NAVIGATION_PRESETS.length || NAVIGATION_PRESETS.some((preset) => !navigationKeys.has(preset.key))) {
    return "The navigation must contain each approved destination exactly once."
  }
  if (document.hero.image_url && document.hero.image_url.length > 2048) return "The hero image URL exceeds 2,048 characters."
  if (document.hero.slides.length > MAX_HERO_SLIDES) return `Use no more than ${MAX_HERO_SLIDES} hero images.`
  if (document.hero.buttons.length < 1 || document.hero.buttons.length > MAX_HERO_BUTTONS) return `Use 1–${MAX_HERO_BUTTONS} hero buttons.`
  if (document.hero.benefits.length > MAX_HERO_BENEFITS) return `Use no more than ${MAX_HERO_BENEFITS} hero feature items.`
  if (document.brands.items.length > MAX_STOREFRONT_BRANDS) return `Use no more than ${MAX_STOREFRONT_BRANDS} brands.`
  const heroIds = [...document.hero.slides, ...document.hero.buttons, ...document.hero.benefits].map((item) => item.id)
  if (new Set(heroIds).size !== heroIds.length) return "Hero images and buttons must have unique identifiers."
  for (const slide of document.hero.slides) {
    if (!slide.image_url.trim() || slide.image_url.length > 2048) return "Every hero image needs a valid image URL."
    for (const language of ["ar", "en"] as const) {
      if (slide.alt[language].length > 160 || containsMarkup(slide.alt[language]) || containsInlineControl(slide.alt[language])) return "Hero image descriptions must be plain text up to 160 characters."
    }
  }
  for (const button of document.hero.buttons) {
    if (!safeStorefrontLink(button.href.trim())) return "Every hero button needs a safe internal path, section link, or HTTPS URL."
    if (!/^#[0-9a-f]{6}$/iu.test(button.background_color) || !/^#[0-9a-f]{6}$/iu.test(button.text_color)) return "Hero button colors must use the six-digit #RRGGBB format."
    for (const language of ["ar", "en"] as const) {
      if (!button.label[language].trim() || button.label[language].length > 60 || containsMarkup(button.label[language]) || containsInlineControl(button.label[language])) return "Complete every hero button label in Arabic and English (up to 60 characters)."
    }
  }
  for (const benefit of document.hero.benefits) {
    if (!HERO_BENEFIT_ICON_OPTIONS.some((option) => option.key === benefit.icon)) return "Choose an approved icon for every hero feature item."
    for (const language of ["ar", "en"] as const) {
      if (!benefit.title[language].trim() || benefit.title[language].length > 60 || containsMarkup(benefit.title[language]) || containsInlineControl(benefit.title[language])) return "Complete every hero feature title in Arabic and English (up to 60 characters)."
      if (!benefit.subtitle[language].trim() || benefit.subtitle[language].length > 80 || containsMarkup(benefit.subtitle[language]) || containsInlineControl(benefit.subtitle[language])) return "Complete every hero feature subtitle in Arabic and English (up to 80 characters)."
    }
  }
  const brandIds = new Set<string>()
  const brandSlugs = new Set<string>()
  for (const brand of document.brands.items) {
    if (brandIds.has(brand.id) || brandSlugs.has(brand.slug)) return "Every brand must use a unique identifier and link slug."
    brandIds.add(brand.id)
    brandSlugs.add(brand.slug)
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(brand.slug) || brand.slug.length > 80) return "Brand link slugs may contain lowercase letters, numbers and single hyphens only."
    if (brand.image_url && brand.image_url.length > 2048) return "A brand image URL exceeds 2,048 characters."
    for (const language of ["ar", "en"] as const) {
      if (!brand.name[language].trim() || brand.name[language].length > 80 || containsMarkup(brand.name[language]) || containsInlineControl(brand.name[language])) return "Complete every brand name in Arabic and English (up to 80 characters)."
    }
  }
  const inline: Array<[string, PlatformStorefrontLocalizedText, number]> = [
    ["Hero eyebrow", document.hero.eyebrow, 80],
    ["Hero heading", document.hero.heading, 160],
    ["Call-to-action label", document.hero.cta_label, 60],
    ...document.navigation.items.map((item) => [
      `${NAVIGATION_PRESETS.find((preset) => preset.key === item.key)?.name ?? item.key} navigation label`,
      item.label,
      60,
    ] as [string, PlatformStorefrontLocalizedText, number]),
    ["About title", document.about.title, 160],
    ["Contact heading", document.contact.heading, 160],
    ["Brands heading", document.brands.heading, 160],
    ...Object.entries(document.policies).map(([key, policy]) => [
      `${POLICY_LABELS[key as PolicyKey]} title`, policy.title, 160,
    ] as [string, PlatformStorefrontLocalizedText, number]),
  ]
  const body: Array<[string, PlatformStorefrontLocalizedText, number]> = [
    ["Hero subheading", document.hero.subheading, 600],
    ["About content", document.about.body, 6000],
    ["Contact content", document.contact.body, 3000],
    ["Brands introduction", document.brands.subheading, 300],
    ...Object.entries(document.policies).map(([key, policy]) => [
      `${POLICY_LABELS[key as PolicyKey]} content`, policy.body, 6000,
    ] as [string, PlatformStorefrontLocalizedText, number]),
    ["Bank transfer instructions", bank.instructions, 3000],
  ]
  for (const [label, value, maximum] of [...inline, ...body]) {
    const isInline = inline.some((entry) => entry[1] === value)
    for (const language of ["ar", "en"] as const) {
      if (value[language].length > maximum) return `${label} exceeds ${maximum} characters.`
      if (containsMarkup(value[language])) return `${label} must be plain text without angle brackets.`
      if (isInline ? containsInlineControl(value[language]) : containsBodyControl(value[language])) {
        return `${label} contains unsupported control characters.`
      }
    }
  }
  for (const [label, value] of [
    ["Bank name", bank.bank_name],
    ["Account holder", bank.account_holder_name],
    ["Account reference", bank.account_reference],
  ] as Array<[string, string | null]>) {
    if (value && value.length > 160) return `${label} exceeds 160 characters.`
    if (value && containsMarkup(value)) return `${label} must be plain text without angle brackets.`
    if (value && containsInlineControl(value)) return `${label} contains unsupported control characters.`
  }
  return null
}

export function AdminStorefrontEditorPage({
  error: portfolioError,
  isDemo,
  loading: portfolioLoading,
  onBack,
  onStorefrontUpdated,
  onToast,
  store,
}: AdminStorefrontEditorPageProps) {
  const currentStore = store ?? (isDemo ? demoStore() : null)
  const [record, setRecord] = useState<PlatformStorefrontRecord | null>(null)
  const [configurationRecord, setConfigurationRecord] =
    useState<PlatformStoreConfigurationRecord | null>(null)
  const [configuration, setConfiguration] =
    useState<PlatformStoreConfiguration | null>(null)
  const [document, setDocument] = useState<PlatformStorefrontDocument | null>(null)
  const [bank, setBank] = useState<PlatformStorefrontBankTransfer | null>(null)
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading")
  const [error, setError] = useState<string | null>(null)
  const [conflict, setConflict] = useState(false)
  const [retryToken, setRetryToken] = useState(0)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingBrandId, setUploadingBrandId] = useState<string | null>(null)
  const [publishOpen, setPublishOpen] = useState(false)
  const [section, setSection] = useState<EditorSection>("brand")
  const [language, setLanguage] = useState<EditorLanguage>("ar")
  const [previewPresetId, setPreviewPresetId] = useState(DEFAULT_PREVIEW_PRESET.desktop)
  const [previewScaleMode, setPreviewScaleMode] = useState<PreviewScaleMode>("fit")
  const [previewExpanded, setPreviewExpanded] = useState(false)
  const [glowEditMode, setGlowEditMode] = useState(true)
  const [glowSelectedKey, setGlowSelectedKey] = useState<string | null>(null)
  const uploadInputRef = useRef<HTMLInputElement>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const allowNextDashboardNavigation = useRef(false)

  const savedDocument = record?.storefront.document ?? null
  const savedBank = record?.storefront.bank_transfer ?? null
  const originalDesignPreview = Boolean(document && ["glow-beauty", "standard", "drops", "luxe-commerce-full", "urbx", "template-6"].includes(document.template_key))

  useEffect(() => {
    if (originalDesignPreview) setPreviewPresetId(DEFAULT_PREVIEW_PRESET.mobile)
  }, [originalDesignPreview])
  const storefrontDirty = Boolean(
    document && bank && savedDocument && savedBank &&
      (!sameValue(document, savedDocument) || !sameValue(bank, savedBank)),
  )
  const configurationDirty = Boolean(
    configuration && configurationRecord &&
      !sameValue(configuration, configurationRecord.configuration),
  )
  const dirty = storefrontDirty || configurationDirty
  const previewPreset = PREVIEW_PRESETS.find((preset) => preset.id === previewPresetId) ?? PREVIEW_PRESETS[0]

  const choosePreviewDevice = (device: PreviewDevice) => {
    setPreviewPresetId((currentId) => {
      const current = PREVIEW_PRESETS.find((preset) => preset.id === currentId)
      return current?.device === device ? currentId : DEFAULT_PREVIEW_PRESET[device]
    })
  }

  useEffect(() => {
    if (!previewExpanded) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreviewExpanded(false)
    }
    window.addEventListener("keydown", closeOnEscape)
    return () => window.removeEventListener("keydown", closeOnEscape)
  }, [previewExpanded])

  useEffect(() => {
    setRecord(null)
    setConfigurationRecord(null)
    setConfiguration(null)
    setDocument(null)
    setBank(null)
    setError(null)
    setConflict(false)
    if (!currentStore) return
    if (isDemo) {
      const next = demoRecord()
      const nextConfiguration = demoConfigurationRecord(currentStore)
      setRecord(next)
      setConfigurationRecord(nextConfiguration)
      setConfiguration(cloneConfiguration(nextConfiguration.configuration))
      setDocument(cloneDocument(next.storefront.document))
      setBank(cloneBank(next.storefront.bank_transfer))
      setStatus("ready")
      return
    }

    const controller = new AbortController()
    setStatus("loading")
    Promise.all([
      getPlatformStorefront(currentStore.id, controller.signal),
      getPlatformStoreConfiguration(currentStore.id, controller.signal),
    ])
      .then(([next, nextConfiguration]) => {
        if (controller.signal.aborted) return
        setRecord(next)
        setConfigurationRecord(nextConfiguration)
        setConfiguration(cloneConfiguration(nextConfiguration.configuration))
        setDocument(cloneDocument(next.storefront.document))
        setBank(cloneBank(next.storefront.bank_transfer))
        setStatus("ready")
      })
      .catch((loadError: unknown) => {
        if (loadError instanceof DOMException && loadError.name === "AbortError") return
        setError(loadError instanceof Error ? loadError.message : "The Storefront draft could not be loaded.")
        setStatus("failed")
      })
    return () => controller.abort()
  }, [currentStore?.id, isDemo, retryToken])

  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])

  useEffect(() => {
    if (!dirty) return
    const warn = (event: Event) => {
      if (allowNextDashboardNavigation.current) {
        allowNextDashboardNavigation.current = false
        return
      }
      if (!window.confirm("Discard the unsaved Storefront draft?")) event.preventDefault()
    }
    window.addEventListener(DASHBOARD_BEFORE_NAVIGATION_EVENT, warn)
    return () => window.removeEventListener(DASHBOARD_BEFORE_NAVIGATION_EVENT, warn)
  }, [dirty])

  const requestBack = () => {
    if (dirty && !window.confirm("Discard the unsaved Storefront draft?")) return
    if (dirty) allowNextDashboardNavigation.current = true
    onBack()
  }

  const clearTransientError = () => {
    if (!conflict) setError(null)
  }

  const updateLocalized = (
    current: PlatformStorefrontLocalizedText,
    value: string,
  ): PlatformStorefrontLocalizedText => ({ ...current, [language]: value })

  const updateHero = <Key extends keyof PlatformStorefrontDocument["hero"]>(
    key: Key,
    value: PlatformStorefrontDocument["hero"][Key],
  ) => {
    setDocument((current) => current ? ({
      ...current,
      hero: { ...current.hero, [key]: value },
    }) : current)
    clearTransientError()
  }

  const updateHeroSlide = (id: string, update: (slide: PlatformStorefrontHeroSlide) => PlatformStorefrontHeroSlide) => {
    setDocument((current) => current ? ({
      ...current,
      hero: { ...current.hero, slides: current.hero.slides.map((slide) => slide.id === id ? update(slide) : slide) },
    }) : current)
    clearTransientError()
  }

  const updateHeroButton = (id: string, update: (button: PlatformStorefrontHeroButton) => PlatformStorefrontHeroButton) => {
    setDocument((current) => current ? ({
      ...current,
      hero: { ...current.hero, buttons: current.hero.buttons.map((button) => button.id === id ? update(button) : button) },
    }) : current)
    clearTransientError()
  }

  const updateHeroBenefit = (id: string, update: (benefit: PlatformStorefrontHeroBenefit) => PlatformStorefrontHeroBenefit) => {
    setDocument((current) => current ? ({
      ...current,
      hero: { ...current.hero, benefits: current.hero.benefits.map((benefit) => benefit.id === id ? update(benefit) : benefit) },
    }) : current)
    clearTransientError()
  }

  const moveHeroItem = (kind: "slides" | "buttons" | "benefits", id: string, direction: -1 | 1) => {
    setDocument((current) => {
      if (!current) return current
      const items = [...current.hero[kind]]
      const index = items.findIndex((item) => item.id === id)
      const nextIndex = index + direction
      if (index < 0 || nextIndex < 0 || nextIndex >= items.length) return current
      const [item] = items.splice(index, 1)
      items.splice(nextIndex, 0, item)
      return { ...current, hero: { ...current.hero, [kind]: items } }
    })
    clearTransientError()
  }

  const addHeroButton = () => {
    setDocument((current) => {
      if (!current || current.hero.buttons.length >= MAX_HERO_BUTTONS) return current
      const next = current.hero.buttons.length + 1
      return {
        ...current,
        hero: {
          ...current.hero,
          buttons: [...current.hero.buttons, {
            id: `hero-button-${Date.now().toString(36)}-${next}`,
            label: { ar: "زر جديد", en: "New button" },
            href: "/best-sellers",
            background_color: configuration?.brand.primary_color ?? FALLBACK_HERO_BUTTON,
            text_color: "#ffffff",
            style: "solid",
            enabled: true,
          }],
        },
      }
    })
    clearTransientError()
  }

  const addHeroBenefit = () => {
    setDocument((current) => {
      if (!current || current.hero.benefits.length >= MAX_HERO_BENEFITS) return current
      const next = current.hero.benefits.length + 1
      return {
        ...current,
        hero: {
          ...current.hero,
          benefits: [...current.hero.benefits, {
            id: `hero-benefit-${Date.now().toString(36)}-${next}`,
            icon: "sparkle",
            title: { ar: "ميزة جديدة", en: "New benefit" },
            subtitle: { ar: "أضف وصفاً قصيراً", en: "Add a short description" },
          }],
        },
      }
    })
    clearTransientError()
  }

  const updateBrandItem = (id: string, update: (brand: PlatformStorefrontBrand) => PlatformStorefrontBrand) => {
    setDocument((current) => current ? ({
      ...current,
      brands: { ...current.brands, items: current.brands.items.map((brand) => brand.id === id ? update(brand) : brand) },
    }) : current)
    clearTransientError()
  }

  const moveBrandItem = (id: string, direction: -1 | 1) => {
    setDocument((current) => {
      if (!current) return current
      const items = [...current.brands.items]
      const index = items.findIndex((brand) => brand.id === id)
      const nextIndex = index + direction
      if (index < 0 || nextIndex < 0 || nextIndex >= items.length) return current
      const [item] = items.splice(index, 1)
      items.splice(nextIndex, 0, item)
      return { ...current, brands: { ...current.brands, items } }
    })
    clearTransientError()
  }

  const addBrandItem = () => {
    setDocument((current) => {
      if (!current || current.brands.items.length >= MAX_STOREFRONT_BRANDS) return current
      const suffix = Date.now().toString(36)
      return {
        ...current,
        brands: {
          ...current.brands,
          items: [...current.brands.items, {
            id: `brand-${suffix}`,
            name: { ar: "علامة جديدة", en: "New brand" },
            slug: `brand-${suffix}`,
            image_url: null,
          }],
        },
      }
    })
    clearTransientError()
  }

  const updateNavigationItem = (
    key: PlatformStorefrontNavigationKey,
    update: (item: PlatformStorefrontDocument["navigation"]["items"][number]) => PlatformStorefrontDocument["navigation"]["items"][number],
  ) => {
    setDocument((current) => current ? ({
      ...current,
      navigation: {
        items: current.navigation.items.map((item) => item.key === key ? update(item) : item),
      },
    }) : current)
    clearTransientError()
  }

  const moveNavigationItem = (key: PlatformStorefrontNavigationKey, direction: -1 | 1) => {
    setDocument((current) => {
      if (!current) return current
      const index = current.navigation.items.findIndex((item) => item.key === key)
      const nextIndex = index + direction
      if (index < 0 || nextIndex < 0 || nextIndex >= current.navigation.items.length) return current
      const items = [...current.navigation.items]
      const [item] = items.splice(index, 1)
      items.splice(nextIndex, 0, item)
      return { ...current, navigation: { items } }
    })
    clearTransientError()
  }

  const updatePolicy = (
    key: PolicyKey,
    field: "title" | "body",
    value: string,
  ) => {
    setDocument((current) => current ? ({
      ...current,
      policies: {
        ...current.policies,
        [key]: {
          ...current.policies[key],
          [field]: updateLocalized(current.policies[key][field], value),
        },
      },
    }) : current)
    clearTransientError()
  }

  const updateContact = (
    key: keyof PlatformStoreConfiguration["contact"],
    value: string,
  ) => {
    setConfiguration((current) => current ? ({
      ...current,
      contact: { ...current.contact, [key]: value || null },
    }) : current)
    clearTransientError()
  }

  const updateBrand = <Key extends keyof PlatformStoreConfiguration["brand"]>(
    key: Key,
    value: PlatformStoreConfiguration["brand"][Key],
  ) => {
    setConfiguration((current) => current ? ({
      ...current,
      brand: { ...current.brand, [key]: value },
    }) : current)
    clearTransientError()
  }

  const uploadLogo = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    if (isDemo) {
      onToast("Demo mode is read-only. No image was uploaded.")
      return
    }
    if (!new Set(["image/jpeg", "image/png", "image/webp"]).has(file.type) || file.size > 2 * 1024 * 1024) {
      setError("Choose a JPG, PNG, or WebP logo no larger than 2 MB.")
      return
    }
    setUploadingLogo(true)
    clearTransientError()
    try {
      const imageUrl = await uploadPlatformImage(file)
      updateBrand("logo_url", imageUrl)
      onToast("Logo uploaded. Save all changes to apply it to this Store.")
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "The logo could not be uploaded.")
    } finally {
      setUploadingLogo(false)
    }
  }

  const uploadHero = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ""
    if (!files.length) return
    if (isDemo) {
      onToast("Demo mode is read-only. No image was uploaded.")
      return
    }
    if (files.some((file) => !new Set(["image/jpeg", "image/png", "image/webp"]).has(file.type) || file.size > 2 * 1024 * 1024)) {
      setError("Choose JPG, PNG, or WebP images no larger than 2 MB each.")
      return
    }
    if ((document?.hero.slides.length ?? 0) + files.length > MAX_HERO_SLIDES) {
      setError(`A hero can contain up to ${MAX_HERO_SLIDES} images.`)
      return
    }
    setUploading(true)
    clearTransientError()
    try {
      const imageUrls = await Promise.all(files.map((file) => uploadPlatformImage(file)))
      setDocument((current) => current ? ({
        ...current,
        hero: {
          ...current.hero,
          slides: [
            ...current.hero.slides,
            ...imageUrls.map((imageUrl, index) => ({
              id: `hero-slide-${Date.now().toString(36)}-${index + 1}`,
              image_url: imageUrl,
              alt: { ar: `صورة الواجهة ${current.hero.slides.length + index + 1}`, en: `Hero image ${current.hero.slides.length + index + 1}` },
              enabled: true,
            })),
          ],
        },
      }) : current)
      onToast(`${imageUrls.length} hero image${imageUrls.length === 1 ? "" : "s"} uploaded. Save the draft to keep them.`)
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "The hero image could not be uploaded.")
    } finally {
      setUploading(false)
    }
  }

  const uploadBrandImage = async (brandId: string, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    if (isDemo) {
      onToast("Demo mode is read-only. No image was uploaded.")
      return
    }
    if (!new Set(["image/jpeg", "image/png", "image/webp"]).has(file.type) || file.size > 2 * 1024 * 1024) {
      setError("Choose a JPG, PNG, or WebP brand image no larger than 2 MB.")
      return
    }
    setUploadingBrandId(brandId)
    clearTransientError()
    try {
      const imageUrl = await uploadPlatformImage(file)
      updateBrandItem(brandId, (brand) => ({ ...brand, image_url: imageUrl }))
      onToast("Brand image uploaded. Save the draft to keep it.")
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "The brand image could not be uploaded.")
    } finally {
      setUploadingBrandId(null)
    }
  }

  const saveDraft = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault()
    if (isDemo) {
      onToast("Demo mode is read-only. No Storefront data was changed.")
      return
    }
    if (!currentStore || !record || !configurationRecord || !configuration || !document || !bank || saving || publishing) return
    const configurationError = validateConfiguration(configuration)
    if (configurationError) {
      setError(configurationError)
      return
    }
    const validationError = validateDraft(document, bank)
    if (validationError) {
      setError(validationError)
      return
    }
    setSaving(true)
    setError(null)
    setConflict(false)
    let configurationWasSaved = false
    try {
      if (configurationDirty) {
        const nextConfiguration = await savePlatformStoreConfiguration(
          currentStore.id,
          normalizeConfiguration(configuration),
          configurationRecord.revision,
        )
        configurationWasSaved = true
        setConfigurationRecord(nextConfiguration)
        setConfiguration(cloneConfiguration(nextConfiguration.configuration))
      }

      let next = record
      if (storefrontDirty) {
        next = await savePlatformStorefrontDraft(
          currentStore.id,
          record.storefront.revision,
          normalizeDocument(document),
          normalizeBank(bank),
        )
        setRecord(next)
        setDocument(cloneDocument(next.storefront.document))
        setBank(cloneBank(next.storefront.bank_transfer))
      }
      await onStorefrontUpdated()
      onToast(
        configurationDirty && storefrontDirty
          ? `Store identity and draft revision ${next.storefront.revision} saved.`
          : storefrontDirty
            ? `Storefront draft revision ${next.storefront.revision} saved.`
            : "Store identity settings saved to the database.",
      )
    } catch (saveError) {
      const stale = errorStatus(saveError) === 409
      setConflict(stale)
      if (configurationWasSaved) await onStorefrontUpdated()
      setError(
        configurationWasSaved
          ? `Store identity was saved, but the content draft was not. ${saveError instanceof Error ? saveError.message : "Reload the saved content revision and try again."}`
          : stale
            ? "This Store changed in another session. Your edits are preserved; reload the saved revisions before retrying."
            : saveError instanceof Error ? saveError.message : "The Storefront changes could not be saved.",
      )
    } finally {
      setSaving(false)
    }
  }

  const publish = async () => {
    if (isDemo || !currentStore || !record || dirty || publishing) return
    setPublishing(true)
    setError(null)
    try {
      const next = await publishPlatformStorefront(currentStore.id, record.storefront.revision)
      setRecord(next)
      setDocument(cloneDocument(next.storefront.document))
      setBank(cloneBank(next.storefront.bank_transfer))
      setPublishOpen(false)
      await onStorefrontUpdated()
      onToast(`Storefront revision ${next.storefront.published_revision} published.`)
    } catch (publishError) {
      const stale = errorStatus(publishError) === 409
      setConflict(stale)
      setError(stale
        ? "The draft changed before publishing. Reload the saved revision and review it again."
        : publishError instanceof Error ? publishError.message : "The Storefront could not be published.")
      setPublishOpen(false)
    } finally {
      setPublishing(false)
    }
  }

  const resetDraft = () => {
    if (!record || !configurationRecord) return
    setConfiguration(cloneConfiguration(configurationRecord.configuration))
    setDocument(cloneDocument(record.storefront.document))
    setBank(cloneBank(record.storefront.bank_transfer))
    setError(null)
    setConflict(false)
  }

  if (portfolioLoading) {
    return <div className="admin-storefront-editor-state" role="status"><PiSpinnerGap /><strong>Loading Storefront Studio…</strong></div>
  }
  if (!currentStore) {
    return (
      <section className="admin-storefront-editor-state" role="alert">
        <PiWarningCircle />
        <h1>Storefront Studio is unavailable</h1>
        <p>{portfolioError || "This Store could not be found."}</p>
        <div><button type="button" onClick={requestBack}>Back to Templates</button></div>
      </section>
    )
  }
  if (status === "loading" && !document) {
    return <div className="admin-storefront-editor-state" role="status"><PiSpinnerGap /><strong>Loading Storefront Studio…</strong></div>
  }
  if (status === "failed" || !record || !configurationRecord || !configuration || !document || !bank) {
    return (
      <section className="admin-storefront-editor-state" role="alert">
        <PiWarningCircle />
        <h1>Storefront Studio is unavailable</h1>
        <p>{portfolioError || error || "This Store could not be found."}</p>
        <div><button type="button" onClick={requestBack}>Back to Templates</button>{currentStore ? <button type="button" onClick={() => setRetryToken((value) => value + 1)}>Try again</button> : null}</div>
      </section>
    )
  }

  const complete = documentComplete(document)
  const paymentComplete = bankComplete(bank)
  if (originalDesignPreview) {
    const contentLanguage = ["urbx", "template-6"].includes(document.template_key) ? "en" : configuration.locale.startsWith("en") ? "en" : "ar"
    const selectedField = glowSelectedKey ? glowContentField(document, glowSelectedKey, contentLanguage) : null
    const phonePreset = previewPreset.device === "mobile" ? previewPreset : PREVIEW_PRESETS.find(item => item.id === DEFAULT_PREVIEW_PRESET.mobile)!
    return createPortal(<section className="glow-phone-editor" aria-label={`${TEMPLATE_LABELS[document.template_key]} visual editor`}>
      <header className="glow-phone-editor__header">
        <button type="button" onClick={requestBack} aria-label="Back to Templates Studio"><PiArrowLeft /></button>
        <h1>{configuration.name || "Your store"} <span>{TEMPLATE_LABELS[document.template_key]} · {contentLanguage === "ar" ? "Arabic" : "English"}</span></h1>
        <div className="glow-phone-editor__toolbar">
          <div className="glow-phone-editor__mode" role="group" aria-label="Phone interaction mode">
            <button type="button" aria-pressed={glowEditMode} onClick={() => setGlowEditMode(true)}>Edit content</button>
            <button type="button" aria-pressed={!glowEditMode} onClick={() => setGlowEditMode(false)}>Browse store</button>
          </div>
          <label><select aria-label="Phone size" value={phonePreset.id} onChange={event => setPreviewPresetId(event.target.value)}>{PREVIEW_PRESETS.filter(item => item.device === "mobile").map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
        </div>
        <span className="glow-phone-editor__save-status" role="status">{saving ? "Saving…" : dirty ? "Unsaved changes" : "Draft saved"}</span>
        <button className="is-primary" type="button" disabled={!dirty || saving || publishing || isDemo} onClick={() => void saveDraft()}><PiFloppyDisk /> {configurationDirty ? "Save changes" : "Save draft"}</button>
        <button type="button" disabled={dirty || saving || publishing || isDemo} onClick={() => setPublishOpen(true)}>Review & publish</button>
      </header>
      {error && <p className="glow-phone-editor__error" role="alert">{error}</p>}
      <GlowStoreSettings configuration={configuration} document={document} onAppearanceChange={appearance => { setDocument(current => current ? { ...current, appearance } : current); setError(null) }} disabled={saving || publishing || isDemo} onChange={update => {
        setConfiguration(current => current ? update(current) : current); setError(null)
      }} />
      <LiveDraftPreview configuration={configuration} document={document} expanded originalDesignPreview={false}
        designEditing={glowEditMode} onDesignSelect={setGlowSelectedKey} preset={phonePreset} scaleMode="fit" store={currentStore} />
      <p className="glow-phone-editor__hint">{glowEditMode ? "Click hero text, images, category labels or navigation labels to edit." : "Browse your saved design and store-owned catalog."} <span>This editor does not place customer orders. Use the store link for real checkout.</span></p>
      {publishOpen ? <PublishDialog bankComplete={paymentComplete} complete={complete} dirty={dirty} onClose={() => setPublishOpen(false)} onPublish={() => void publish()} publishing={publishing} revision={record.storefront.revision} storeName={configuration.name || currentStore.name} /> : null}
      {selectedField && <GlowContentDialog key={selectedField.key} field={selectedField} onClose={() => setGlowSelectedKey(null)} onApply={value => {
        setDocument(current => current ? applyGlowContent(current, selectedField.key, value, contentLanguage) : current)
        setGlowSelectedKey(null); setError(null)
      }} />}
    </section>, window.document.body)
  }
  const sectionTitle: Record<EditorSection, string> = {
    brand: "Brand identity",
    navigation: "Navigation",
    hero: "Hero",
    brands: "Collections",
    about: "About",
    contact: "Contact",
    policies: "Store policies",
    bank: "Bank transfer",
  }
  const sectionNavigation: Array<[EditorSection, string, ReactNode]> = [
    ["brand", "Brand", <PiStorefront key="brand" />],
    ["navigation", "Navigation", <PiSparkle key="navigation" />],
    ["hero", "Hero", <PiImage key="hero" />],
    ["brands", "Collections", <PiStorefront key="collections" />],
    ["about", "About", <PiStorefront key="about" />],
    ["contact", "Contact", <PiPhone key="contact" />],
  ]
  const previewPanel = (
    <aside className={`admin-storefront-editor__preview${previewExpanded ? " is-expanded" : ""}`} aria-labelledby="draft-preview-title">
      <header className="admin-storefront-editor__preview-header">
        <strong className="sr-only" id="draft-preview-title">{originalDesignPreview ? "Original Glow Beauty design preview" : "Live template preview"}</strong>
        <div className="admin-storefront-editor__preview-toolbar">
          <div className="admin-storefront-editor__device-switch" role="group" aria-label="Preview device family">
            <button type="button" className={previewPreset.device === "desktop" ? "is-active" : ""} aria-pressed={previewPreset.device === "desktop"} onClick={() => choosePreviewDevice("desktop")}><PiDesktop /> Desktop</button>
            <button type="button" className={previewPreset.device === "mobile" ? "is-active" : ""} aria-pressed={previewPreset.device === "mobile"} onClick={() => choosePreviewDevice("mobile")}><PiDeviceMobile /> Mobile</button>
          </div>
          <label className="admin-storefront-editor__preset-select">
            <span className="sr-only">Preview device size</span>
            <select value={previewPreset.id} onChange={(event) => setPreviewPresetId(event.target.value)}>
              <optgroup label="Desktop and laptop">
                {PREVIEW_PRESETS.filter((preset) => preset.device === "desktop").map((preset) => <option key={preset.id} value={preset.id}>{preset.label} — {preset.width} × {preset.height}</option>)}
              </optgroup>
              <optgroup label="Popular phones">
                {PREVIEW_PRESETS.filter((preset) => preset.device === "mobile").map((preset) => <option key={preset.id} value={preset.id}>{preset.label} — {preset.width} × {preset.height}</option>)}
              </optgroup>
            </select>
          </label>
          <div className="admin-storefront-editor__scale-switch" role="group" aria-label="Preview zoom">
            <button type="button" className={previewScaleMode === "fit" ? "is-active" : ""} aria-pressed={previewScaleMode === "fit"} onClick={() => setPreviewScaleMode("fit")}>Fit</button>
            <button type="button" className={previewScaleMode === "actual" ? "is-active" : ""} aria-pressed={previewScaleMode === "actual"} onClick={() => setPreviewScaleMode("actual")}>100%</button>
          </div>
          {previewExpanded ? (
            <button type="button" className="admin-storefront-editor__expand-preview" aria-pressed="true" onClick={() => setPreviewExpanded(false)}>
              <PiArrowsOut /> Exit full screen
            </button>
          ) : null}
        </div>
      </header>
      {originalDesignPreview ? <p className="admin-storefront-editor__reference-notice"><strong>Original design preview</strong> · Mock content. Store edits are not shown here.</p> : null}
      <LiveDraftPreview configuration={configuration} document={document} expanded={previewExpanded} originalDesignPreview={originalDesignPreview} preset={previewPreset} scaleMode={previewScaleMode} store={currentStore} />
    </aside>
  )

  return (
    <section className="admin-storefront-editor" aria-labelledby="storefront-editor-title">
      <header className="admin-storefront-editor__heading">
        <div className="admin-storefront-editor__heading-main">
          <button type="button" onClick={requestBack}><PiArrowLeft /> Templates Studio</button>
          <div className="admin-storefront-editor__title-row">
            <h1 id="storefront-editor-title">{configuration.name || currentStore.name} Storefront</h1>
            <StatusBadge status={record.storefront.status} />
          </div>
        </div>
        <div className="admin-storefront-editor__actions">
          <span className={`admin-storefront-editor__save-state${dirty ? " is-dirty" : ""}`}><PiCheckCircle /> {saving ? "Saving…" : dirty ? "Unsaved changes" : "Saved just now"}</span>
          <button type="button" onClick={() => setPreviewExpanded(true)}>Preview store <PiArrowSquareOut /></button>
          <button className="is-primary" type="button" disabled={isDemo || saving || publishing || uploading || uploadingLogo || Boolean(uploadingBrandId)} onClick={() => setPublishOpen(true)}>Publish changes</button>
        </div>
      </header>

      {error ? <div className="admin-storefront-editor__error" role="alert"><PiWarningCircle /><span>{error}</span>{conflict ? <button type="button" onClick={() => { if (!dirty || window.confirm("Replace your draft with the latest saved revision?")) setRetryToken((value) => value + 1) }}>Reload saved revision</button> : null}</div> : null}

      <div className="admin-storefront-editor__workspace">
        <nav className="admin-storefront-editor__section-nav" aria-label="Storefront editor sections">
          <div className="admin-storefront-editor__section-nav-items">
            {sectionNavigation.map(([id, label, icon]) => {
              const active = id === "contact" ? ["contact", "policies", "bank"].includes(section) : section === id
              return (
                <button type="button" key={id} className={active ? "is-active" : ""} aria-current={active ? "page" : undefined} onClick={() => setSection(id)}>
                  <span>{icon}{label}</span><PiCheckCircle aria-hidden="true" />
                </button>
              )
            })}
          </div>
          <div className="admin-storefront-editor__section-help"><PiSparkle /><p>Keep your brand details consistent to build trust and recognition across every customer touchpoint.</p></div>
        </nav>

        <form className="admin-storefront-editor__form" onSubmit={(event) => void saveDraft(event)}>
          <header className="admin-storefront-editor__form-header"><h2>{sectionTitle[section]}</h2></header>
          <div className="admin-storefront-editor__language" role="tablist" aria-label="Content language">
            {(["ar", "en"] as const).map((languageCode) => (
              <button
                aria-controls="storefront-editor-language-panel"
                aria-selected={language === languageCode}
                className={language === languageCode ? "is-active" : ""}
                id={`storefront-language-${languageCode}`}
                key={languageCode}
                role="tab"
                tabIndex={language === languageCode ? 0 : -1}
                type="button"
                onClick={() => setLanguage(languageCode)}
                onKeyDown={(event) => {
                  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return
                  event.preventDefault()
                  const next = event.key === "Home"
                    ? "ar"
                    : event.key === "End"
                      ? "en"
                      : event.key === "ArrowRight"
                        ? languageCode === "ar" ? "en" : "ar"
                        : languageCode === "en" ? "ar" : "en"
                  setLanguage(next)
                  window.requestAnimationFrame(() => globalThis.document.getElementById(`storefront-language-${next}`)?.focus())
                }}
              >
                {languageCode === "ar" ? "العربية" : "English"}
              </button>
            ))}
          </div>
          {["contact", "policies", "bank"].includes(section) ? (
            <nav className="admin-storefront-editor__subsections" aria-label="Contact and policy settings">
              <button type="button" className={section === "contact" ? "is-active" : ""} onClick={() => setSection("contact")}>Contact</button>
              <button type="button" className={section === "policies" ? "is-active" : ""} onClick={() => setSection("policies")}>Policies</button>
              <button type="button" className={section === "bank" ? "is-active" : ""} onClick={() => setSection("bank")}>Bank transfer</button>
            </nav>
          ) : null}

          <div
            aria-labelledby={`storefront-language-${language}`}
            className="admin-storefront-editor__fields"
            dir="ltr"
            id="storefront-editor-language-panel"
            role="tabpanel"
          >
            <label>
              <span>Template</span>
              <select value={document.template_key} onChange={(event) => {
                const key = event.target.value as PlatformStorefrontTemplateKey
                if (TEMPLATE_KEYS.has(key)) setDocument((current) => current ? ({ ...current, template_key: key }) : current)
              }}>
                {(Object.keys(TEMPLATE_LABELS) as PlatformStorefrontTemplateKey[]).map((key) => <option key={key} value={key}>{TEMPLATE_LABELS[key]}</option>)}
              </select>
            </label>

            {section === "brand" ? <>
              <div className="admin-storefront-editor__identity-note">
                <PiStorefront />
                <span><strong>One identity, used everywhere</strong><small>Name and logo changes update the header, footer, page titles and Store content anywhere the brand appears.</small></span>
              </div>
              <label>
                <span>Store name<small>{configuration.name.length}/120</small></span>
                <input
                  maxLength={120}
                  minLength={2}
                  required
                  value={configuration.name}
                  onChange={(event) => {
                    setConfiguration((current) => current ? ({ ...current, name: event.target.value }) : current)
                    clearTransientError()
                  }}
                />
              </label>
              <div className="admin-storefront-editor__upload admin-storefront-editor__upload--logo">
                <div>{configuration.brand.logo_url ? <img src={configuration.brand.logo_url} alt="Current Store logo" /> : <PiImage />}</div>
                <span><strong>Logo</strong><small>Used across the header, footer and Store pages · up to 2 MB</small></span>
                <div className="admin-storefront-editor__upload-actions">
                  <button type="button" disabled={isDemo || uploadingLogo} onClick={() => logoInputRef.current?.click()}><PiUploadSimple /> {uploadingLogo ? "Uploading…" : "Change logo"}</button>
                  {configuration.brand.logo_url ? <button className="is-remove" type="button" disabled={isDemo || uploadingLogo} onClick={() => updateBrand("logo_url", null)}>Remove</button> : null}
                </div>
                <input hidden ref={logoInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void uploadLogo(event)} />
              </div>
              <EditorColorField disabled={false} fallback={FALLBACK_PRIMARY} label="Brand color" value={configuration.brand.primary_color} onChange={(value) => updateBrand("primary_color", value)} />
              <label>
                <span>Default language</span>
                <select
                  value={configuration.locale === "en-LY" ? "en-LY" : "ar-LY"}
                  onChange={(event) => {
                    const locale = event.target.value === "en-LY" ? "en-LY" : "ar-LY"
                    setConfiguration((current) => current ? ({ ...current, locale }) : current)
                    setLanguage(locale === "en-LY" ? "en" : "ar")
                    clearTransientError()
                  }}
                >
                  <option value="ar-LY">Arabic (Libya)</option>
                  <option value="en-LY">English (Libya)</option>
                </select>
              </label>
              <details className="admin-storefront-editor__advanced-brand">
                <summary>Advanced brand styling</summary>
                <EditorColorField disabled={false} fallback={FALLBACK_SECONDARY} label="Secondary storefront color" value={configuration.brand.secondary_color} onChange={(value) => updateBrand("secondary_color", value)} />
                <label>
                  <span>Typography</span>
                  <select value={configuration.brand.typography_key ?? ""} onChange={(event) => updateBrand("typography_key", event.target.value === "cairo" ? "cairo" : null)}>
                    <option value="">Platform default (Cairo)</option>
                    <option value="cairo">Cairo</option>
                  </select>
                </label>
                <small className="admin-storefront-editor__palette-note">Brand colors apply across every Storefront page. Hero button colors remain independently editable.</small>
              </details>
            </> : null}

            {section === "hero" ? <>
              <div className="admin-storefront-editor__identity-note">
                <PiPalette />
                <span><strong>Live, reusable hero</strong><small>Every image and button below is stored with this Store. Reorder them here and the live preview updates immediately.</small></span>
              </div>
              <LocalizedField disabled={false} label="Eyebrow" language={language} maxLength={80} value={document.hero.eyebrow} onChange={(value) => updateHero("eyebrow", updateLocalized(document.hero.eyebrow, value))} />
              <LocalizedField disabled={false} label="Heading" language={language} maxLength={160} value={document.hero.heading} onChange={(value) => updateHero("heading", updateLocalized(document.hero.heading, value))} />
              <LocalizedField disabled={false} label="Subheading" language={language} maxLength={600} value={document.hero.subheading} multiline onChange={(value) => updateHero("subheading", updateLocalized(document.hero.subheading, value))} />

              <section className="admin-storefront-editor__hero-group" aria-labelledby="hero-images-title">
                <header><span><strong id="hero-images-title">Hero images</strong><small>{document.hero.slides.length}/{MAX_HERO_SLIDES} · drag-free ordering controls</small></span><button type="button" disabled={isDemo || uploading || document.hero.slides.length >= MAX_HERO_SLIDES} onClick={() => uploadInputRef.current?.click()}><PiUploadSimple /> {uploading ? "Uploading…" : "Add images"}</button></header>
                <input hidden multiple ref={uploadInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void uploadHero(event)} />
                <div className="admin-storefront-editor__hero-list">
                  {document.hero.slides.map((slide, index) => <article className={slide.enabled ? "is-enabled" : ""} key={slide.id}>
                    <img src={slide.image_url} alt="" />
                    <div className="admin-storefront-editor__hero-item-fields">
                      <label><span>Image URL</span><input dir="ltr" maxLength={2048} value={slide.image_url} onChange={(event) => updateHeroSlide(slide.id, (current) => ({ ...current, image_url: event.target.value }))} /></label>
                      <LocalizedField disabled={false} label="Image description" language={language} maxLength={160} value={slide.alt} onChange={(value) => updateHeroSlide(slide.id, (current) => ({ ...current, alt: updateLocalized(current.alt, value) }))} />
                    </div>
                    <div className="admin-storefront-editor__hero-item-actions">
                      <label className="admin-storefront-editor__hero-enabled"><input checked={slide.enabled} type="checkbox" onChange={(event) => updateHeroSlide(slide.id, (current) => ({ ...current, enabled: event.target.checked }))} /><span>Visible</span></label>
                      <div><button aria-label={`Move hero image ${index + 1} up`} disabled={index === 0} type="button" onClick={() => moveHeroItem("slides", slide.id, -1)}>↑</button><button aria-label={`Move hero image ${index + 1} down`} disabled={index === document.hero.slides.length - 1} type="button" onClick={() => moveHeroItem("slides", slide.id, 1)}>↓</button><button className="is-danger" aria-label={`Remove hero image ${index + 1}`} disabled={document.hero.slides.length <= 1} type="button" onClick={() => updateHero("slides", document.hero.slides.filter((item) => item.id !== slide.id))}><PiTrash /></button></div>
                    </div>
                  </article>)}
                </div>
              </section>

              <section className="admin-storefront-editor__hero-group" aria-labelledby="hero-buttons-title">
                <header><span><strong id="hero-buttons-title">Hero buttons</strong><small>Each button has its own destination and colors.</small></span><button type="button" disabled={document.hero.buttons.length >= MAX_HERO_BUTTONS} onClick={addHeroButton}><PiPlus /> Add button</button></header>
                <div className="admin-storefront-editor__hero-list admin-storefront-editor__hero-list--buttons">
                  {document.hero.buttons.map((button, index) => <article className={button.enabled ? "is-enabled" : ""} key={button.id}>
                    <div className="admin-storefront-editor__hero-button-number">{index + 1}</div>
                    <div className="admin-storefront-editor__hero-item-fields">
                      <LocalizedField disabled={false} label="Button label" language={language} maxLength={60} value={button.label} onChange={(value) => updateHeroButton(button.id, (current) => ({ ...current, label: updateLocalized(current.label, value) }))} />
                      <label><span>Link<small>Internal path, #section, or HTTPS URL</small></span><input dir="ltr" maxLength={2048} placeholder="/best-sellers" value={button.href} onChange={(event) => updateHeroButton(button.id, (current) => ({ ...current, href: event.target.value }))} /></label>
                      <label><span>Appearance</span><select value={button.style} onChange={(event) => updateHeroButton(button.id, (current) => ({ ...current, style: event.target.value === "outline" ? "outline" : "solid" }))}><option value="solid">Solid</option><option value="outline">Outline</option></select></label>
                      <div className="admin-storefront-editor__color-grid">
                        <EditorColorField disabled={false} fallback={FALLBACK_HERO_BUTTON} label="Button color" value={button.background_color} onChange={(value) => updateHeroButton(button.id, (current) => ({ ...current, background_color: value ?? FALLBACK_HERO_BUTTON }))} />
                        <EditorColorField disabled={false} fallback="#ffffff" label="Text color" value={button.text_color} onChange={(value) => updateHeroButton(button.id, (current) => ({ ...current, text_color: value ?? "#ffffff" }))} />
                      </div>
                    </div>
                    <div className="admin-storefront-editor__hero-item-actions">
                      <label className="admin-storefront-editor__hero-enabled"><input checked={button.enabled} type="checkbox" onChange={(event) => updateHeroButton(button.id, (current) => ({ ...current, enabled: event.target.checked }))} /><span>Visible</span></label>
                      <div><button aria-label={`Move hero button ${index + 1} up`} disabled={index === 0} type="button" onClick={() => moveHeroItem("buttons", button.id, -1)}>↑</button><button aria-label={`Move hero button ${index + 1} down`} disabled={index === document.hero.buttons.length - 1} type="button" onClick={() => moveHeroItem("buttons", button.id, 1)}>↓</button><button className="is-danger" aria-label={`Remove hero button ${index + 1}`} disabled={document.hero.buttons.length <= 1} type="button" onClick={() => updateHero("buttons", document.hero.buttons.filter((item) => item.id !== button.id))}><PiTrash /></button></div>
                    </div>
                  </article>)}
                </div>
              </section>

              <section className="admin-storefront-editor__hero-group" aria-labelledby="hero-benefits-title">
                <header>
                  <span>
                    <strong id="hero-benefits-title">Feature strip below the hero</strong>
                    <small>{document.hero.benefits.length}/{MAX_HERO_BENEFITS} · remove every item to hide the strip completely</small>
                  </span>
                  <button type="button" disabled={document.hero.benefits.length >= MAX_HERO_BENEFITS} onClick={addHeroBenefit}><PiPlus /> Add feature</button>
                </header>
                {document.hero.benefits.length ? (
                  <div className="admin-storefront-editor__hero-list admin-storefront-editor__hero-list--benefits">
                    {document.hero.benefits.map((benefit, index) => {
                      const Icon = HERO_BENEFIT_ICON_OPTIONS.find((option) => option.key === benefit.icon)?.icon ?? PiMedal
                      return <article key={benefit.id}>
                        <div className="admin-storefront-editor__benefit-icon" aria-hidden="true"><Icon /></div>
                        <div className="admin-storefront-editor__hero-item-fields">
                          <label>
                            <span>Icon</span>
                            <select value={benefit.icon} onChange={(event) => updateHeroBenefit(benefit.id, (current) => ({ ...current, icon: event.target.value as PlatformStorefrontBenefitIcon }))}>
                              {HERO_BENEFIT_ICON_OPTIONS.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
                            </select>
                          </label>
                          <LocalizedField disabled={false} label="Feature title" language={language} maxLength={60} value={benefit.title} onChange={(value) => updateHeroBenefit(benefit.id, (current) => ({ ...current, title: updateLocalized(current.title, value) }))} />
                          <LocalizedField disabled={false} label="Short description" language={language} maxLength={80} value={benefit.subtitle} onChange={(value) => updateHeroBenefit(benefit.id, (current) => ({ ...current, subtitle: updateLocalized(current.subtitle, value) }))} />
                        </div>
                        <div className="admin-storefront-editor__hero-item-actions">
                          <div>
                            <button aria-label={`Move hero feature ${index + 1} up`} disabled={index === 0} type="button" onClick={() => moveHeroItem("benefits", benefit.id, -1)}>↑</button>
                            <button aria-label={`Move hero feature ${index + 1} down`} disabled={index === document.hero.benefits.length - 1} type="button" onClick={() => moveHeroItem("benefits", benefit.id, 1)}>↓</button>
                            <button className="is-danger" aria-label={`Remove hero feature ${index + 1}`} type="button" onClick={() => updateHero("benefits", document.hero.benefits.filter((item) => item.id !== benefit.id))}><PiTrash /></button>
                          </div>
                        </div>
                      </article>
                    })}
                  </div>
                ) : (
                  <div className="admin-storefront-editor__benefits-empty">
                    <PiCheckCircle />
                    <span><strong>Feature strip hidden</strong><small>No empty container or spacing will appear below the hero.</small></span>
                  </div>
                )}
              </section>
            </> : null}

            {section === "brands" ? <>
              <div className="admin-storefront-editor__identity-note">
                <PiSparkle />
                <span><strong>Store-owned brand showcase</strong><small>Edit the section copy, reorder every card, and use either an uploaded logo or a text-only brand name. The live Storefront updates immediately.</small></span>
              </div>
              <LocalizedField disabled={false} label="Brands heading" language={language} maxLength={160} value={document.brands.heading} onChange={(value) => setDocument((current) => current ? ({ ...current, brands: { ...current.brands, heading: updateLocalized(current.brands.heading, value) } }) : current)} />
              <LocalizedField disabled={false} label="Brands introduction" language={language} maxLength={300} value={document.brands.subheading} multiline onChange={(value) => setDocument((current) => current ? ({ ...current, brands: { ...current.brands, subheading: updateLocalized(current.brands.subheading, value) } }) : current)} />
              <section className="admin-storefront-editor__hero-group" aria-labelledby="storefront-brands-title">
                <header>
                  <span><strong id="storefront-brands-title">Brand cards</strong><small>{document.brands.items.length}/{MAX_STOREFRONT_BRANDS} · image optional · remove every card to hide the section</small></span>
                  <button type="button" disabled={document.brands.items.length >= MAX_STOREFRONT_BRANDS} onClick={addBrandItem}><PiPlus /> Add brand</button>
                </header>
                {document.brands.items.length ? (
                  <div className="admin-storefront-editor__hero-list admin-storefront-editor__brand-list">
                    {document.brands.items.map((brand, index) => {
                      const inputId = `brand-image-${brand.id}`
                      return <article key={brand.id}>
                        <div className="admin-storefront-editor__brand-image">
                          {brand.image_url ? <img src={brand.image_url} alt="" /> : <span><PiImage /><small>Text only</small></span>}
                        </div>
                        <div className="admin-storefront-editor__hero-item-fields">
                          <LocalizedField disabled={false} label="Brand name" language={language} maxLength={80} value={brand.name} onChange={(value) => updateBrandItem(brand.id, (current) => ({ ...current, name: updateLocalized(current.name, value) }))} />
                          <label><span>Brand page slug<small>Used for /brands/…</small></span><input dir="ltr" maxLength={80} value={brand.slug} onChange={(event) => updateBrandItem(brand.id, (current) => ({ ...current, slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/gu, "").replace(/-{2,}/gu, "-") }))} /></label>
                          <label><span>Image URL<small>Optional — leave empty for a name-only card</small></span><input dir="ltr" maxLength={2048} placeholder="https://…" value={brand.image_url ?? ""} onChange={(event) => updateBrandItem(brand.id, (current) => ({ ...current, image_url: event.target.value || null }))} /></label>
                          <div className="admin-storefront-editor__brand-upload-actions">
                            <label className={isDemo || Boolean(uploadingBrandId) ? "is-disabled" : ""} htmlFor={inputId}><PiUploadSimple /> {uploadingBrandId === brand.id ? "Uploading…" : "Upload image"}</label>
                            <input hidden id={inputId} type="file" accept="image/jpeg,image/png,image/webp" disabled={isDemo || Boolean(uploadingBrandId)} onChange={(event) => void uploadBrandImage(brand.id, event)} />
                            {brand.image_url ? <button type="button" disabled={Boolean(uploadingBrandId)} onClick={() => updateBrandItem(brand.id, (current) => ({ ...current, image_url: null }))}>Use name only</button> : null}
                          </div>
                        </div>
                        <div className="admin-storefront-editor__hero-item-actions">
                          <div>
                            <button aria-label={`Move brand ${index + 1} up`} disabled={index === 0} type="button" onClick={() => moveBrandItem(brand.id, -1)}>↑</button>
                            <button aria-label={`Move brand ${index + 1} down`} disabled={index === document.brands.items.length - 1} type="button" onClick={() => moveBrandItem(brand.id, 1)}>↓</button>
                            <button className="is-danger" aria-label={`Remove brand ${index + 1}`} type="button" onClick={() => setDocument((current) => current ? ({ ...current, brands: { ...current.brands, items: current.brands.items.filter((item) => item.id !== brand.id) } }) : current)}><PiTrash /></button>
                          </div>
                        </div>
                      </article>
                    })}
                  </div>
                ) : (
                  <div className="admin-storefront-editor__benefits-empty">
                    <PiCheckCircle />
                    <span><strong>Brands section hidden</strong><small>No container or blank space will appear in the Storefront.</small></span>
                  </div>
                )}
              </section>
            </> : null}

            {section === "navigation" ? <>
              <div className="admin-storefront-editor__identity-note">
                <PiStorefront />
                <span><strong>Ready-to-use customer links</strong><small>Choose what appears, rename it in both languages, and move it into the exact order you want. Destinations are fixed and safe.</small></span>
              </div>
              <div className="admin-storefront-editor__navigation-list">
                {document.navigation.items.map((item, index) => {
                  const preset = NAVIGATION_PRESETS.find((candidate) => candidate.key === item.key)
                  return <article className={item.enabled ? "is-enabled" : ""} key={item.key}>
                    <label className="admin-storefront-editor__navigation-toggle">
                      <input
                        checked={item.enabled}
                        type="checkbox"
                        onChange={(event) => updateNavigationItem(item.key, (current) => ({ ...current, enabled: event.target.checked }))}
                      />
                      <span><strong>{preset?.name ?? item.key}</strong><small>{preset?.description}</small></span>
                    </label>
                    <label>
                      <span>{language === "ar" ? "Arabic label" : "English label"}<small>{item.label[language].length}/60</small></span>
                      <input
                        dir={language === "ar" ? "rtl" : "ltr"}
                        maxLength={60}
                        value={item.label[language]}
                        onChange={(event) => updateNavigationItem(item.key, (current) => ({
                          ...current,
                          label: updateLocalized(current.label, event.target.value),
                        }))}
                      />
                    </label>
                    <div className="admin-storefront-editor__navigation-order" aria-label={`Position ${index + 1} of ${document.navigation.items.length}`}>
                      <span>{index + 1}</span>
                      <button aria-label={`Move ${preset?.name ?? item.key} up`} disabled={index === 0} type="button" onClick={() => moveNavigationItem(item.key, -1)}>↑</button>
                      <button aria-label={`Move ${preset?.name ?? item.key} down`} disabled={index === document.navigation.items.length - 1} type="button" onClick={() => moveNavigationItem(item.key, 1)}>↓</button>
                    </div>
                  </article>
                })}
              </div>
            </> : null}

            {section === "about" ? <>
              <LocalizedField disabled={false} label="About title" language={language} maxLength={160} value={document.about.title} onChange={(value) => setDocument((current) => current ? ({ ...current, about: { ...current.about, title: updateLocalized(current.about.title, value) } }) : current)} />
              <LocalizedField disabled={false} label="About content" language={language} maxLength={6000} value={document.about.body} multiline onChange={(value) => setDocument((current) => current ? ({ ...current, about: { ...current.about, body: updateLocalized(current.about.body, value) } }) : current)} />
            </> : null}

            {section === "contact" ? <>
              <fieldset>
                <legend>Public contact details</legend>
                <label><span>Public email</span><input autoComplete="email" maxLength={254} type="email" value={configuration.contact.public_email ?? ""} onChange={(event) => updateContact("public_email", event.target.value)} /></label>
                <label><span>Public phone</span><input autoComplete="tel" inputMode="tel" maxLength={40} value={configuration.contact.public_phone ?? ""} onChange={(event) => updateContact("public_phone", event.target.value)} /></label>
                <label><span>WhatsApp number</span><input autoComplete="tel" inputMode="tel" maxLength={40} value={configuration.contact.whatsapp_number ?? ""} onChange={(event) => updateContact("whatsapp_number", event.target.value)} /></label>
              </fieldset>
              <LocalizedField disabled={false} label="Contact heading" language={language} maxLength={160} value={document.contact.heading} onChange={(value) => setDocument((current) => current ? ({ ...current, contact: { ...current.contact, heading: updateLocalized(current.contact.heading, value) } }) : current)} />
              <LocalizedField disabled={false} label="Contact content" language={language} maxLength={3000} value={document.contact.body} multiline onChange={(value) => setDocument((current) => current ? ({ ...current, contact: { ...current.contact, body: updateLocalized(current.contact.body, value) } }) : current)} />
            </> : null}

            {section === "policies" ? (Object.keys(POLICY_LABELS) as PolicyKey[]).map((key) => (
              <fieldset key={key}><legend>{POLICY_LABELS[key]}</legend><LocalizedField disabled={false} label="Title" language={language} maxLength={160} value={document.policies[key].title} onChange={(value) => updatePolicy(key, "title", value)} /><LocalizedField disabled={false} label="Content" language={language} maxLength={6000} value={document.policies[key].body} multiline onChange={(value) => updatePolicy(key, "body", value)} /></fieldset>
            )) : null}

            {section === "bank" ? <>
              <div className="admin-storefront-editor__protected"><PiBank /><span><strong>Protected operational content</strong><small>Bank details are stored with the draft but are never included in this public-facing preview.</small></span></div>
              <label><span>Bank name</span><input maxLength={160} value={bank.bank_name ?? ""} onChange={(event) => setBank((current) => current ? ({ ...current, bank_name: event.target.value || null }) : current)} /></label>
              <label><span>Account holder</span><input maxLength={160} value={bank.account_holder_name ?? ""} onChange={(event) => setBank((current) => current ? ({ ...current, account_holder_name: event.target.value || null }) : current)} /></label>
              <label><span>Account reference</span><input dir="ltr" maxLength={160} value={bank.account_reference ?? ""} onChange={(event) => setBank((current) => current ? ({ ...current, account_reference: event.target.value || null }) : current)} /></label>
              <LocalizedField disabled={false} label="Transfer instructions" language={language} maxLength={3000} value={bank.instructions} multiline onChange={(value) => setBank((current) => current ? ({ ...current, instructions: updateLocalized(current.instructions, value) }) : current)} />
            </> : null}
          </div>
          <footer className="admin-storefront-editor__form-footer">
            <button type="button" disabled={!dirty || saving} onClick={resetDraft}>Reset</button>
            <button className="is-primary" type="submit" disabled={isDemo || !dirty || saving || publishing || uploading || uploadingLogo || Boolean(uploadingBrandId)}><PiFloppyDisk /> {saving ? "Saving…" : "Save draft"}</button>
          </footer>
        </form>

        {previewExpanded ? createPortal(previewPanel, globalThis.document.body) : previewPanel}
      </div>

      {publishOpen ? <PublishDialog bankComplete={paymentComplete} complete={complete} dirty={dirty} onClose={() => setPublishOpen(false)} onPublish={() => void publish()} publishing={publishing} revision={record.storefront.revision} storeName={configuration.name || currentStore.name} /> : null}
    </section>
  )
}

function LocalizedField({ disabled, label, language, maxLength, multiline = false, onChange, value }: { disabled: boolean; label: string; language: EditorLanguage; maxLength: number; multiline?: boolean; onChange: (value: string) => void; value: PlatformStorefrontLocalizedText }) {
  const direction = language === "ar" ? "rtl" : "ltr"
  return <label><span>{label}<small>{language === "ar" ? "Arabic" : "English"} · {value[language].length}/{maxLength}</small></span>{multiline ? <textarea dir={direction} disabled={disabled} maxLength={maxLength} rows={4} value={value[language]} onChange={(event) => onChange(event.target.value)} /> : <input dir={direction} disabled={disabled} maxLength={maxLength} value={value[language]} onChange={(event) => onChange(event.target.value)} />}</label>
}

function StatusBadge({ status }: { status: PlatformStorefrontRecord["storefront"]["status"] }) {
  const label = status === "draft_changes" ? "Unpublished changes" : status === "published" ? "Published" : "Unpublished"
  return <span className={`admin-storefront-status is-${status}`}>{label}</span>
}

export function LiveDraftPreview({
  configuration,
  document,
  expanded,
  originalDesignPreview,
  designEditing = false,
  onDesignSelect,
  creationDraftId,
  catalogOverride,
  onTrialRequest,
  preset,
  scaleMode,
  store,
}: {
  configuration: PlatformStoreConfiguration
  document: PlatformStorefrontDocument
  expanded: boolean
  originalDesignPreview: boolean
  designEditing?: boolean
  onDesignSelect?: (key: string) => void
  creationDraftId?: string
  catalogOverride?: PlatformStorefrontPreviewProduct[]
  onTrialRequest?: (command: unknown) => Promise<unknown>
  preset: PreviewPreset
  scaleMode: PreviewScaleMode
  store: Pick<PlatformStore, "id" | "handle" | "domains" | "commerce_readiness">
}) {
  const frameRef = useRef<HTMLIFrameElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const channelRef = useRef(
    globalThis.crypto?.randomUUID?.() ??
      `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-preview`,
  )
  const [ready, setReady] = useState(false)
  const [catalog, setCatalog] = useState<PlatformStorefrontPreviewProduct[]>([])
  const [fitScale, setFitScale] = useState(1)
  const safeAreaTop = preset.device === "mobile" && document.template_key !== "luxe-commerce-full" ? 44 : 0
  const frameBorder = preset.device === "mobile" ? 8 : 1
  const previewOrigin = useMemo(
    () => resolveStorefrontPreviewOrigin(
      import.meta.env.VITE_STOREFRONT_PREVIEW_ORIGIN,
      import.meta.env.DEV,
    ),
    [],
  )
  const profile = useMemo(
    () => buildStorefrontEditorPreviewProfile(store, configuration, document),
    [configuration, document, store],
  )
  useEffect(() => {
    if (catalogOverride) { setCatalog(catalogOverride); return }
    if (originalDesignPreview || store.id === "demo-store-reference") {
      setCatalog([])
      return
    }
    const controller = new AbortController()
    getPlatformStorefrontPreview(store.id)
      .then((preview) => {
        if (!controller.signal.aborted) setCatalog(preview.products)
      })
      .catch(() => {
        if (!controller.signal.aborted) setCatalog([])
      })
    return () => controller.abort()
  }, [catalogOverride, originalDesignPreview, store.id])
  const previewUrl = useMemo(() => {
    if (!previewOrigin) return null
    const url = new URL(previewOrigin)
    if (originalDesignPreview) {
      url.pathname = "/"
      url.search = `?preview=1&template=${document.template_key}`
      url.searchParams.set("design-editor", "1")
      url.searchParams.set("channel", channelRef.current)
      url.hash = ""
      return url.toString()
    }
    url.searchParams.set("editor-preview", "1")
    if (["glow-beauty", "standard", "drops", "luxe-commerce-full", "urbx", "template-6"].includes(document.template_key)) url.searchParams.set("design-editor", "1")
    if (creationDraftId) {
      url.searchParams.set("setup-preview", creationDraftId)
      url.searchParams.set("design-editor", "1")
    }
    url.searchParams.set("template", document.template_key)
    url.searchParams.set("locale", configuration.locale === "en-LY" ? "en-LY" : "ar-LY")
    url.searchParams.set("channel", channelRef.current)
    return url.toString()
  }, [configuration.locale, creationDraftId, document.template_key, originalDesignPreview, previewOrigin])

  const sendProfile = useCallback(() => {
    if (!previewOrigin || !frameRef.current?.contentWindow) return
    if (originalDesignPreview || ["glow-beauty", "standard", "drops", "luxe-commerce-full", "urbx", "template-6"].includes(profile.storefront?.template_key ?? "")) {
      frameRef.current.contentWindow.postMessage({ type: "labibtech:glow-design-content", version: 1,
        channel: channelRef.current, profile, editing: designEditing }, previewOrigin)
      if (originalDesignPreview) return
    }
    const message: StorefrontEditorPreviewMessage = {
      type: STOREFRONT_EDITOR_PREVIEW_MESSAGE,
      version: 1,
      channel: channelRef.current,
      profile,
      catalog,
      commerce_available: Boolean(creationDraftId) || store.commerce_readiness?.status === "ready",
    }
    frameRef.current.contentWindow.postMessage(message, previewOrigin)
  }, [catalog, creationDraftId, designEditing, originalDesignPreview, previewOrigin, profile, store.commerce_readiness?.status])

  useEffect(() => {
    if (!previewOrigin) return
    const receive = (event: MessageEvent<unknown>) => {
      if (
        event.origin !== previewOrigin ||
        event.source !== frameRef.current?.contentWindow ||
        !event.data ||
        typeof event.data !== "object"
      ) {
        return
      }
      const message = event.data as Record<string, unknown>
      if (creationDraftId && onTrialRequest && message.type === "labibtech:creation-trial-request" && message.version === 1 && message.channel === channelRef.current &&
        typeof message.request_id === "string" && /^[a-f0-9-]{36}$/.test(message.request_id)) {
        const destination = event.source as Window
        const respond = (result: unknown, error?: string) => destination.postMessage({ type: "labibtech:creation-trial-response", version: 1,
          channel: channelRef.current, request_id: message.request_id, result, ...(error ? { error } : {}) }, previewOrigin)
        void onTrialRequest(message.command).then(result => respond(result)).catch(() => respond(null, "The trial request could not be saved. Check the draft and try again."))
        return
      }
      if ((originalDesignPreview || ["glow-beauty", "standard", "drops", "luxe-commerce-full", "urbx", "template-6"].includes(document.template_key)) && message.version === 1 && message.channel === channelRef.current) {
        if (message.type === "labibtech:glow-design-ready") { setReady(true); sendProfile() }
        if (designEditing && message.type === "labibtech:glow-design-select" && typeof message.key === "string" &&
          (glowContentField(document, message.key) || (creationDraftId && /^product\.[a-z0-9-]{1,80}$/.test(message.key)))) onDesignSelect?.(message.key)
        if (originalDesignPreview) return
      }
      if (
        message.type === STOREFRONT_EDITOR_PREVIEW_READY_MESSAGE &&
        message.version === 1 &&
        message.channel === channelRef.current
      ) {
        setReady(true)
        sendProfile()
      }
    }
    window.addEventListener("message", receive)
    return () => window.removeEventListener("message", receive)
  }, [creationDraftId, designEditing, document, onDesignSelect, onTrialRequest, originalDesignPreview, previewOrigin, sendProfile])

  useEffect(() => {
    if (ready) sendProfile()
  }, [ready, sendProfile])

  useEffect(() => setReady(false), [previewUrl])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const updateScale = () => {
      const styles = window.getComputedStyle(canvas)
      const horizontalPadding = Number.parseFloat(styles.paddingLeft) + Number.parseFloat(styles.paddingRight)
      const verticalPadding = Number.parseFloat(styles.paddingTop) + Number.parseFloat(styles.paddingBottom)
      const availableWidth = Math.max(1, canvas.clientWidth - horizontalPadding)
      const availableHeight = Math.max(1, canvas.clientHeight - verticalPadding)
      const deviceWidth = preset.width + (frameBorder * 2)
      const deviceHeight = preset.height + (frameBorder * 2)
      const nextScale = !originalDesignPreview && !expanded && preset.device === "mobile"
        ? Math.min(0.8, availableWidth / deviceWidth)
        : Math.min(1, availableWidth / deviceWidth, availableHeight / deviceHeight)
      setFitScale(Number.isFinite(nextScale) ? Math.max(0.01, nextScale) : 1)
    }
    updateScale()
    const observer = new ResizeObserver(updateScale)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [expanded, frameBorder, originalDesignPreview, preset.device, preset.height, preset.width])

  if (!previewUrl) {
    return (
      <div className="storefront-live-frame__unavailable" role="status">
        <PiWarningCircle />
        <strong>Real template preview is not configured</strong>
        <p>Set VITE_STOREFRONT_PREVIEW_ORIGIN to the customer Storefront origin for this environment.</p>
      </div>
    )
  }

  const scale = scaleMode === "fit" ? fitScale : 1
  const scaledWidth = (preset.width + (frameBorder * 2)) * scale
  const scaledHeight = (preset.height + (frameBorder * 2)) * scale
  const template6Background = document.template_key === "template-6"
    ? new URL(document.home?.promotion_image_url || "/assets/template-6/home-background-v1.webp", previewOrigin!).href
    : null

  return (
    <div
      className={`storefront-live-frame is-${preset.device} is-${scaleMode}${expanded ? " is-expanded-preview" : ""}`}
      ref={canvasRef}
      role="region"
      aria-label={`${preset.label} storefront preview at ${preset.width} by ${preset.height} pixels`}
    >
      {!ready ? <span className="storefront-live-frame__loading"><PiSpinnerGap /> Loading real template…</span> : null}
      <div className="storefront-live-frame__stage" style={{ width: scaledWidth, height: scaledHeight }}>
        <div className="storefront-live-frame__device" style={{ width: preset.width, transform: `scale(${scale})` }}>
          {preset.device === "mobile" ? <div className="storefront-live-frame__hardware" aria-hidden="true">
            <span className="storefront-live-frame__button is-action" />
            <span className="storefront-live-frame__button is-volume-up" />
            <span className="storefront-live-frame__button is-volume-down" />
            <span className="storefront-live-frame__button is-power" />
          </div> : null}
          <div className="storefront-live-frame__screen" style={{
            paddingTop: safeAreaTop,
            backgroundColor: template6Background ? "#f6fdfd" : configuration.brand.secondary_color || "#fff",
            ...(template6Background ? { backgroundImage: `url(${JSON.stringify(template6Background)})`, backgroundSize: `100% ${preset.height - safeAreaTop}px`, backgroundPosition: "center top", backgroundRepeat: "no-repeat" } : {}),
          }}>
          {safeAreaTop > 0 ? <span className="storefront-live-frame__island" aria-hidden="true"><span className="storefront-live-frame__camera" /></span> : null}
          <iframe
            key={previewUrl}
            ref={frameRef}
            src={previewUrl}
            title={originalDesignPreview ? "Original Glow Beauty design preview" : `Live ${document.template_key} draft preview for ${configuration.name}`}
            sandbox="allow-forms allow-same-origin allow-scripts"
            style={{ height: preset.height - safeAreaTop }}
            onLoad={sendProfile}
          />
          </div>
        </div>
      </div>
    </div>
  )
}

function EditorColorField({
  disabled,
  fallback,
  label,
  onChange,
  value,
}: {
  disabled: boolean
  fallback: string
  label: string
  onChange: (value: string | null) => void
  value: string | null
}) {
  const pickerValue = value && /^#[0-9a-f]{6}$/iu.test(value) ? value : fallback
  return (
    <label className="admin-storefront-editor__color-field">
      <span>{label}</span>
      <div>
        <input aria-label={`${label} picker`} disabled={disabled} type="color" value={pickerValue} onChange={(event) => onChange(event.target.value)} />
        <input disabled={disabled} maxLength={7} pattern="#[0-9A-Fa-f]{6}" placeholder={fallback} spellCheck={false} value={value ?? ""} onChange={(event) => onChange(event.target.value || null)} />
        {value ? <button type="button" disabled={disabled} onClick={() => onChange(null)}>Reset</button> : null}
      </div>
    </label>
  )
}

function PublishDialog({ bankComplete: paymentComplete, complete, dirty, onClose, onPublish, publishing, revision, storeName }: { bankComplete: boolean; complete: boolean; dirty: boolean; onClose: () => void; onPublish: () => void; publishing: boolean; revision: number; storeName: string }) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const previousFocus = useRef(document.activeElement as HTMLElement | null)
  const close = useCallback(() => { if (!publishing) onClose() }, [onClose, publishing])
  useEffect(() => {
    const root = document.getElementById("root")
    const overflow = document.body.style.overflow
    const previousAriaHidden = root?.getAttribute("aria-hidden") ?? null
    const rootWasInert = root?.hasAttribute("inert") ?? false
    document.body.style.overflow = "hidden"
    root?.setAttribute("aria-hidden", "true")
    root?.setAttribute("inert", "")
    window.setTimeout(() => dialogRef.current?.querySelector<HTMLElement>("button:not(:disabled)")?.focus(), 0)
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); close(); return }
      if (event.key !== "Tab" || !dialogRef.current) return
      const items = Array.from(dialogRef.current.querySelectorAll<HTMLElement>("button:not(:disabled)"))
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener("keydown", keydown)
    return () => {
      document.removeEventListener("keydown", keydown)
      document.body.style.overflow = overflow
      if (previousAriaHidden === null) root?.removeAttribute("aria-hidden")
      else root?.setAttribute("aria-hidden", previousAriaHidden)
      if (!rootWasInert) root?.removeAttribute("inert")
      const target = previousFocus.current
      if (target?.isConnected) window.requestAnimationFrame(() => target.focus())
    }
  }, [close])
  return createPortal(<div className="storefront-publish-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) close() }}><div className="storefront-publish-dialog" role="dialog" aria-modal="true" aria-labelledby="publish-title" aria-describedby="publish-description" ref={dialogRef}><header><span><PiCheckCircle /></span><div><h2 id="publish-title">Publish Storefront revision {revision}?</h2><p id="publish-description">This makes the saved content for {storeName} customer-facing.</p></div><button type="button" aria-label="Close publish confirmation" disabled={publishing} onClick={close}><PiX /></button></header><ul><li className={complete ? "is-complete" : ""}><PiCheckCircle /> Arabic and English content is complete</li><li className={!dirty ? "is-complete" : ""}><PiCheckCircle /> The latest draft is saved</li><li className={paymentComplete ? "is-complete" : ""}><PiCheckCircle /> Bank instructions are complete or unused</li></ul><p>Only this saved revision is published. Later edits remain private until published again.</p><footer><button type="button" disabled={publishing} onClick={close}>Cancel</button><button className="is-primary" type="button" disabled={!complete || dirty || !paymentComplete || publishing} onClick={onPublish}>{publishing ? <PiSpinnerGap /> : <PiCheckCircle />}{publishing ? "Publishing…" : "Publish now"}</button></footer></div></div>, document.body)
}
