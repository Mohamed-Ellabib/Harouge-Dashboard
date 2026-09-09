import {
  getStorefrontRequestConfig,
  isStorefrontEditorPreviewEnabled,
  isVisualPreviewEnabled,
  StorefrontConfigurationError,
} from "../config";
import { defaultStorefrontNavigationItems } from "../lib/storefront-navigation";
import { creationTrialRequest, isCreationTrial } from "../creation-trial";
import { rememberOrderGrant } from "../commerce/order-history";
import type { TrackedOrder } from "../commerce/tracked-orders";
import { normalizeHexColor } from "../lib/theme";
import {
  STOREFRONT_CATALOG_ORDERS,
  STOREFRONT_DEFAULT_PAGE_SIZE,
  STOREFRONT_MAX_OFFSET,
  STOREFRONT_MAX_PAGE_SIZE,
  type StorefrontCatalogOrder,
  type StorefrontCatalogPageDto,
  type StorefrontCatalogQuery,
  type StorefrontCartDto,
  type StorefrontCheckoutAddress,
  type StorefrontCommerceCapabilitiesDto,
  type StorefrontOrderConfirmationDto,
  type StorefrontNavigationKey,
  type StorefrontProductCardDto,
  type StorefrontProductDetailDto,
  type StorefrontProfileDto,
  type StorefrontPurchaseOptionsDto,
  type StorefrontRequestOptions,
  type StorefrontShippingOptionDto,
} from "../types";

const CATALOG_PRODUCT_PRESENTATION_FIELDS =
  "handle,title,subtitle,thumbnail,+metadata,+variants.calculated_price";
const DETAIL_PRODUCT_PRESENTATION_FIELDS =
  "handle,title,subtitle,description,thumbnail,images.url,+metadata";
const MAX_HANDLE_LENGTH = 200;
const MAX_NAME_LENGTH = 180;
const MAX_PUBLIC_EMAIL_LENGTH = 254;
const MAX_PUBLIC_PHONE_LENGTH = 40;
const MAX_STOREFRONT_HERO_EYEBROW_LENGTH = 80;
const MAX_STOREFRONT_HERO_HEADING_LENGTH = 160;
const MAX_STOREFRONT_HERO_SUBHEADING_LENGTH = 600;
const MAX_STOREFRONT_HERO_CTA_LENGTH = 60;
const MAX_STOREFRONT_HERO_SLIDES = 12;
const MAX_STOREFRONT_HERO_BUTTONS = 5;
const MAX_STOREFRONT_HERO_BENEFITS = 8;
const MAX_STOREFRONT_BRANDS = 16;
const MAX_STOREFRONT_NAVIGATION_LABEL_LENGTH = 60;
const MAX_STOREFRONT_CONTENT_TITLE_LENGTH = 160;
const MAX_STOREFRONT_CONTACT_BODY_LENGTH = 3_000;
const MAX_STOREFRONT_CONTENT_BODY_LENGTH = 6_000;
const MAX_TITLE_LENGTH = 240;
const MAX_SUBTITLE_LENGTH = 320;
const MAX_DESCRIPTION_LENGTH = 6_000;
const MAX_SEARCH_LENGTH = 120;
const MAX_IMAGE_COUNT = 12;
const MAX_OPAQUE_ID_LENGTH = 200;
const MAX_CART_ITEMS = 50;
export const STOREFRONT_MAX_CART_QUANTITY = 20;
export const STOREFRONT_SYSTEM_PAYMENT_PROVIDER = "pp_system_default";

type UnknownRecord = Record<string, unknown>;

const STOREFRONT_NAVIGATION_KEYS: readonly StorefrontNavigationKey[] = [
  "home",
  "categories",
  "favorites",
  "cart",
  "account",
  "orders",
  "settings",
];

const defaultStorefrontNavigation = () => ({
  items: defaultStorefrontNavigationItems(),
});

const storefrontNavigation = (value: unknown) => {
  if (value === undefined) return defaultStorefrontNavigation();
  if (!isRecord(value) || !Array.isArray(value.items) || value.items.length !== STOREFRONT_NAVIGATION_KEYS.length) {
    throw new StorefrontApiError("invalid_response");
  }

  const seen = new Set<StorefrontNavigationKey>();
  const items = value.items.map((item) => {
    if (!isRecord(item) || typeof item.key !== "string" || !STOREFRONT_NAVIGATION_KEYS.includes(item.key as StorefrontNavigationKey) || typeof item.enabled !== "boolean") {
      throw new StorefrontApiError("invalid_response");
    }
    const key = item.key as StorefrontNavigationKey;
    if (seen.has(key)) throw new StorefrontApiError("invalid_response");
    seen.add(key);
    return {
      key,
      label: localizedStorefrontText(item.label, MAX_STOREFRONT_NAVIGATION_LABEL_LENGTH),
      enabled: item.enabled,
    };
  });
  if (seen.size !== STOREFRONT_NAVIGATION_KEYS.length) throw new StorefrontApiError("invalid_response");
  return { items };
};

export type StorefrontApiErrorCode =
  | "aborted"
  | "configuration"
  | "invalid_request"
  | "invalid_response"
  | "not_found"
  | "storefront_setup"
  | "unavailable";

const safeMessageForCode = (code: StorefrontApiErrorCode): string => {
  if (code === "aborted") {
    return "تم إلغاء الطلب.";
  }

  if (code === "not_found") {
    return "لم نتمكن من العثور على المحتوى المطلوب.";
  }

  if (code === "invalid_request") {
    return "تعذّر فتح المحتوى المطلوب.";
  }

  if (code === "storefront_setup") {
    return "إعداد واجهة المتجر غير مكتمل.";
  }

  return "تعذّر تحميل المحتوى الآن.";
};

export class StorefrontApiError extends Error {
  readonly code: StorefrontApiErrorCode;
  readonly retryable: boolean;

  constructor(code: StorefrontApiErrorCode, retryable = false) {
    super(safeMessageForCode(code));
    this.name = "StorefrontApiError";
    this.code = code;
    this.retryable = retryable;
  }
}

export const isStorefrontApiError = (
  value: unknown,
): value is StorefrontApiError => value instanceof StorefrontApiError;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasOwn = (value: UnknownRecord, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);

const containsUnsafeControlCharacter = (value: string): boolean =>
  /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value);

const inlineText = (
  value: unknown,
  maximumLength: number,
  required: boolean,
): string | null => {
  if (value === null || value === undefined) {
    if (required) {
      throw new StorefrontApiError("invalid_response");
    }
    return null;
  }

  if (typeof value !== "string" || containsUnsafeControlCharacter(value)) {
    throw new StorefrontApiError("invalid_response");
  }

  const normalized = value.normalize("NFC").trim().replace(/\s+/gu, " ");

  if (
    (required && normalized.length === 0) ||
    normalized.length > maximumLength
  ) {
    throw new StorefrontApiError("invalid_response");
  }

  return normalized || null;
};

const plainTextDescription = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "string" || containsUnsafeControlCharacter(value)) {
    throw new StorefrontApiError("invalid_response");
  }

  const normalized = value.normalize("NFC").replace(/\r\n?/g, "\n").trim();

  if (normalized.length > MAX_DESCRIPTION_LENGTH) {
    throw new StorefrontApiError("invalid_response");
  }

  return normalized || null;
};

export const normalizePublicHandle = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();

  if (
    normalized.length === 0 ||
    normalized.length > MAX_HANDLE_LENGTH ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized)
  ) {
    return null;
  }

  return normalized;
};

const requiredHandle = (value: unknown): string => {
  const handle = normalizePublicHandle(value);
  if (!handle) {
    throw new StorefrontApiError("invalid_response");
  }
  return handle;
};

const normalizedDomain = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "string") {
    throw new StorefrontApiError("invalid_response");
  }

  const normalized = value.trim().toLowerCase().replace(/\.$/, "");

  if (
    normalized.length === 0 ||
    normalized.length > 253 ||
    !/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(?:\.(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?))*$/.test(
      normalized,
    )
  ) {
    throw new StorefrontApiError("invalid_response");
  }

  return normalized;
};

const isLoopbackHostname = (hostname: string): boolean =>
  hostname === "localhost" ||
  hostname.endsWith(".localhost") ||
  hostname === "127.0.0.1" ||
  hostname === "[::1]" ||
  hostname === "::1";

const publicAssetUrl = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "string" || containsUnsafeControlCharacter(value)) {
    throw new StorefrontApiError("invalid_response");
  }

  const normalized = value.trim();

  if (!normalized || normalized.length > 2_048 || normalized.includes("\\")) {
    throw new StorefrontApiError("invalid_response");
  }

  if (normalized.startsWith("/") && !normalized.startsWith("//")) {
    return normalized;
  }

  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    throw new StorefrontApiError("invalid_response");
  }

  const developmentHttpAllowed =
    import.meta.env.DEV &&
    parsed.protocol === "http:" &&
    isLoopbackHostname(parsed.hostname);

  if (
    (parsed.protocol !== "https:" && !developmentHttpAllowed) ||
    parsed.username ||
    parsed.password ||
    !parsed.hostname
  ) {
    throw new StorefrontApiError("invalid_response");
  }

  return parsed.toString();
};

const storefrontLink = (value: unknown): string => {
  const normalized = inlineText(value, 2_048, true) as string;
  if (/[\\<>]/u.test(normalized)) {
    throw new StorefrontApiError("invalid_response");
  }
  if (/^#[A-Za-z0-9_-]{1,128}$/u.test(normalized)) return normalized;
  if (normalized.startsWith("/") && !normalized.startsWith("//") && !normalized.includes("..")) {
    return normalized;
  }
  try {
    const parsed = new URL(normalized);
    if (parsed.protocol === "https:" && !parsed.username && !parsed.password) {
      return parsed.toString();
    }
  } catch {
    // Invalid links are rejected below.
  }
  throw new StorefrontApiError("invalid_response");
};

const heroItemId = (value: unknown): string => {
  const id = inlineText(value, 80, true) as string;
  if (!/^[A-Za-z0-9_-]{1,80}$/u.test(id)) {
    throw new StorefrontApiError("invalid_response");
  }
  return id;
};

const storefrontHeroSlides = (value: unknown) => {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > MAX_STOREFRONT_HERO_SLIDES) {
    throw new StorefrontApiError("invalid_response");
  }
  const ids = new Set<string>();
  return value.map((slide) => {
    if (!isRecord(slide) || typeof slide.enabled !== "boolean") {
      throw new StorefrontApiError("invalid_response");
    }
    const id = heroItemId(slide.id);
    const imageUrl = publicAssetUrl(slide.image_url);
    if (ids.has(id) || !imageUrl) throw new StorefrontApiError("invalid_response");
    ids.add(id);
    return {
      id,
      image_url: imageUrl,
      alt: localizedStorefrontText(slide.alt, MAX_STOREFRONT_HERO_HEADING_LENGTH),
      enabled: slide.enabled,
    };
  });
};

const storefrontHeroButtons = (value: unknown) => {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > MAX_STOREFRONT_HERO_BUTTONS) {
    throw new StorefrontApiError("invalid_response");
  }
  const ids = new Set<string>();
  return value.map((button) => {
    if (!isRecord(button) || typeof button.enabled !== "boolean") {
      throw new StorefrontApiError("invalid_response");
    }
    const id = heroItemId(button.id);
    const backgroundColor = normalizeHexColor(button.background_color);
    const textColor = normalizeHexColor(button.text_color);
    if (
      ids.has(id) || !backgroundColor || !textColor ||
      (button.style !== "solid" && button.style !== "outline")
    ) {
      throw new StorefrontApiError("invalid_response");
    }
    ids.add(id);
    return {
      id,
      label: localizedStorefrontText(button.label, MAX_STOREFRONT_HERO_CTA_LENGTH),
      href: storefrontLink(button.href),
      background_color: backgroundColor,
      text_color: textColor,
      style: button.style === "outline" ? "outline" as const : "solid" as const,
      enabled: button.enabled,
    };
  });
};

const STOREFRONT_BENEFIT_ICONS = new Set([
  "award",
  "shield",
  "truck",
  "package",
  "check",
  "heart",
  "globe",
  "clock",
  "headset",
  "sparkle",
]);

const defaultStorefrontHeroBenefits = () => [
  { id: "hero-benefit-authentic", icon: "award" as const, title: { ar: "أصلية 100%", en: "100% authentic" }, subtitle: { ar: "منتجات موثوقة", en: "AUTHENTIC" } },
  { id: "hero-benefit-distributor", icon: "award" as const, title: { ar: "موزع رسمي", en: "Official distributor" }, subtitle: { ar: "وكيل معتمد", en: "OFFICIAL DISTRIBUTOR" } },
  { id: "hero-benefit-warranty", icon: "shield" as const, title: { ar: "ضمان دولي", en: "International warranty" }, subtitle: { ar: "تغطية موثوقة", en: "INTERNATIONAL WARRANTY" } },
  { id: "hero-benefit-delivery", icon: "truck" as const, title: { ar: "توصيل سريع", en: "Fast delivery" }, subtitle: { ar: "داخل ليبيا", en: "FAST DELIVERY" } },
];

const storefrontHeroBenefits = (value: unknown) => {
  if (value === undefined) return defaultStorefrontHeroBenefits();
  if (!Array.isArray(value) || value.length > MAX_STOREFRONT_HERO_BENEFITS) {
    throw new StorefrontApiError("invalid_response");
  }
  const ids = new Set<string>();
  return value.map((benefit) => {
    if (!isRecord(benefit) || !STOREFRONT_BENEFIT_ICONS.has(String(benefit.icon))) {
      throw new StorefrontApiError("invalid_response");
    }
    const id = heroItemId(benefit.id);
    if (ids.has(id)) throw new StorefrontApiError("invalid_response");
    ids.add(id);
    return {
      id,
      icon: benefit.icon as "award" | "shield" | "truck" | "package" | "check" | "heart" | "globe" | "clock" | "headset" | "sparkle",
      title: localizedStorefrontText(benefit.title, MAX_STOREFRONT_HERO_CTA_LENGTH),
      subtitle: localizedStorefrontText(benefit.subtitle, MAX_STOREFRONT_HERO_EYEBROW_LENGTH),
    };
  });
};

const defaultStorefrontBrands = () => ({
  heading: { ar: "علاماتنا التجارية", en: "Our brands" },
  subheading: {
    ar: "نقدم لكم نخبة من أشهر الماركات العالمية",
    en: "A curated selection of world-renowned brands",
  },
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
});

const storefrontBrands = (value: unknown) => {
  if (value === undefined) return defaultStorefrontBrands();
  if (!isRecord(value) || !Array.isArray(value.items) || value.items.length > MAX_STOREFRONT_BRANDS) {
    throw new StorefrontApiError("invalid_response");
  }
  const ids = new Set<string>();
  const slugs = new Set<string>();
  const items = value.items.map((brand) => {
    if (!isRecord(brand)) throw new StorefrontApiError("invalid_response");
    const id = heroItemId(brand.id);
    const slug = inlineText(brand.slug, 80, true) as string;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(slug) || ids.has(id) || slugs.has(slug)) {
      throw new StorefrontApiError("invalid_response");
    }
    ids.add(id);
    slugs.add(slug);
    return {
      id,
      name: localizedStorefrontText(brand.name, 80),
      slug,
      image_url: publicAssetUrl(brand.image_url),
      ...(brand.banner_image_url !== undefined ? { banner_image_url: publicAssetUrl(brand.banner_image_url) } : {}),
    };
  });
  return {
    heading: localizedStorefrontText(value.heading, MAX_STOREFRONT_CONTENT_TITLE_LENGTH),
    subheading: localizedStorefrontText(value.subheading, 300, true),
    ...(value.search_placeholder !== undefined ? { search_placeholder: localizedStorefrontText(value.search_placeholder, 80) } : {}),
    ...(value.explore_label !== undefined ? { explore_label: localizedStorefrontText(value.explore_label, 60) } : {}),
    ...(value.view_all_label !== undefined ? { view_all_label: localizedStorefrontText(value.view_all_label, 60) } : {}),
    ...(value.promotion_heading !== undefined ? { promotion_heading: localizedStorefrontText(value.promotion_heading, 100) } : {}),
    ...(value.promotion_subheading !== undefined ? { promotion_subheading: localizedStorefrontText(value.promotion_subheading, 160, true) } : {}),
    ...(value.promotion_image_url !== undefined ? { promotion_image_url: publicAssetUrl(value.promotion_image_url) } : {}),
    items,
  };
};

const branding = (value: unknown): StorefrontProfileDto["branding"] => {
  if (
    !isRecord(value) ||
    !hasOwn(value, "secondary_color") ||
    !hasOwn(value, "typography_key")
  ) {
    throw new StorefrontApiError("invalid_response");
  }

  const logoUrl = publicAssetUrl(value.logo_url);
  const primaryColor =
    value.primary_color === null || value.primary_color === undefined
      ? null
      : normalizeHexColor(value.primary_color);
  const secondaryColor =
    value.secondary_color === null || value.secondary_color === undefined
      ? null
      : normalizeHexColor(value.secondary_color);

  if (
    (value.primary_color !== null &&
      value.primary_color !== undefined &&
      !primaryColor) ||
    (value.secondary_color !== null &&
      value.secondary_color !== undefined &&
      !secondaryColor) ||
    value.typography_key !== "cairo"
  ) {
    throw new StorefrontApiError("invalid_response");
  }

  return {
    logo_url: logoUrl,
    primary_color: primaryColor,
    secondary_color: secondaryColor,
    typography_key: "cairo",
  };
};

const locale = (value: unknown): StorefrontProfileDto["locale"] => {
  if (value !== "ar-LY" && value !== "en-LY") {
    throw new StorefrontApiError("invalid_response");
  }

  return value;
};

const publicEmail = (value: unknown): string | null => {
  const email = inlineText(value, MAX_PUBLIC_EMAIL_LENGTH, false);

  if (
    email &&
    (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email) ||
      /[<>'"\\]/u.test(email))
  ) {
    throw new StorefrontApiError("invalid_response");
  }

  return email;
};

const publicPhone = (value: unknown): string | null => {
  const phone = inlineText(value, MAX_PUBLIC_PHONE_LENGTH, false);

  if (phone && !/^\+?[0-9](?:[0-9 ()-]{3,38}[0-9])?$/u.test(phone)) {
    throw new StorefrontApiError("invalid_response");
  }

  return phone;
};

const contact = (value: unknown): StorefrontProfileDto["contact"] => {
  if (
    !isRecord(value) ||
    !hasOwn(value, "public_email") ||
    !hasOwn(value, "public_phone") ||
    !hasOwn(value, "whatsapp_number")
  ) {
    throw new StorefrontApiError("invalid_response");
  }

  return {
    public_email: publicEmail(value.public_email),
    public_phone: publicPhone(value.public_phone),
    whatsapp_number: publicPhone(value.whatsapp_number),
  };
};

const storefrontInlineText = (
  value: unknown,
  maximumLength: number,
): string => {
  if (typeof value !== "string" || /[\t\r\n]/u.test(value)) {
    throw new StorefrontApiError("invalid_response");
  }

  const text = inlineText(value, maximumLength, true) as string;
  if (/[<>]/u.test(text)) {
    throw new StorefrontApiError("invalid_response");
  }
  return text;
};

const storefrontBodyText = (
  value: unknown,
  maximumLength: number,
): string => {
  if (
    typeof value !== "string" ||
    containsUnsafeControlCharacter(value) ||
    /[<>]/u.test(value)
  ) {
    throw new StorefrontApiError("invalid_response");
  }

  const normalized = value.normalize("NFC").replace(/\r\n?/gu, "\n").trim();
  if (!normalized || normalized.length > maximumLength) {
    throw new StorefrontApiError("invalid_response");
  }
  return normalized;
};

const localizedStorefrontText = (
  value: unknown,
  maximumLength: number,
  multiline = false,
  allowEmpty = false,
) => {
  if (!isRecord(value) || !hasOwn(value, "ar") || !hasOwn(value, "en")) {
    throw new StorefrontApiError("invalid_response");
  }

  const parse = multiline ? storefrontBodyText : storefrontInlineText;
  return {
    ar: allowEmpty && value.ar === "" ? "" : parse(value.ar, maximumLength),
    en: allowEmpty && value.en === "" ? "" : parse(value.en, maximumLength),
  };
};

const storefrontAppearance = (value: unknown): import("../types").StorefrontAppearance => {
  if (!isRecord(value)) throw new StorefrontApiError("invalid_response");
  const result: Record<string, string> = {};
  const colors = ["text_color","heading_color","muted_text_color","button_text_color","surface_color","navbar_background","navbar_text_color","navbar_active_color"];
  const fonts = ["original","cairo","manrope","condensed","anton","marker","system","serif"];
  for (const [key, entry] of Object.entries(value)) {
    if (colors.includes(key) && typeof entry === "string" && /^#[0-9a-f]{6}$/i.test(entry)) result[key] = entry;
    else if (["body_font", "heading_font"].includes(key) && typeof entry === "string" && fonts.includes(entry)) result[key] = entry;
    else throw new StorefrontApiError("invalid_response");
  }
  return result as import("../types").StorefrontAppearance;
};

const storefrontHomeContent = (value: unknown): import("../types").StorefrontHomeContentDto => {
  if (!isRecord(value)) throw new StorefrontApiError("invalid_response");
  const image = publicAssetUrl(value.image_url);
  const promotionImage = publicAssetUrl(value.promotion_image_url);
  if (!image || !promotionImage) throw new StorefrontApiError("invalid_response");
  return {
    eyebrow: localizedStorefrontText(value.eyebrow, 60), heading: localizedStorefrontText(value.heading, 100),
    statement: localizedStorefrontText(value.statement, 60), cta_label: localizedStorefrontText(value.cta_label, 60),
    categories_heading: localizedStorefrontText(value.categories_heading, 60), products_heading: localizedStorefrontText(value.products_heading, 60),
    view_all_label: localizedStorefrontText(value.view_all_label, 60),
    // Template 6 has no promotional copy; preserve the saved empty bilingual fields.
    promotion_eyebrow: localizedStorefrontText(value.promotion_eyebrow, 60, false, true),
    promotion_heading: localizedStorefrontText(value.promotion_heading, 100, false, true),
    promotion_detail: localizedStorefrontText(value.promotion_detail, 100, false, true),
    image_url: image, promotion_image_url: promotionImage,
  };
};

const storefrontShopContent = (value: unknown): import("../types").StorefrontShopContentDto => {
  if (!isRecord(value)) throw new StorefrontApiError("invalid_response");
  return {
    heading: localizedStorefrontText(value.heading, 60),
    statement: localizedStorefrontText(value.statement, 60),
    search_placeholder: localizedStorefrontText(value.search_placeholder, 80),
  };
};

const storefrontContentSection = (
  value: unknown,
  bodyMaximumLength = MAX_STOREFRONT_CONTENT_BODY_LENGTH,
) => {
  if (!isRecord(value)) {
    throw new StorefrontApiError("invalid_response");
  }

  return {
    title: localizedStorefrontText(
      value.title,
      MAX_STOREFRONT_CONTENT_TITLE_LENGTH,
    ),
    body: localizedStorefrontText(value.body, bodyMaximumLength, true),
  };
};

const storefrontContactSection = (value: unknown) => {
  if (!isRecord(value)) {
    throw new StorefrontApiError("invalid_response");
  }

  return {
    heading: localizedStorefrontText(
      value.heading,
      MAX_STOREFRONT_CONTENT_TITLE_LENGTH,
    ),
    body: localizedStorefrontText(
      value.body,
      MAX_STOREFRONT_CONTACT_BODY_LENGTH,
      true,
    ),
  };
};

const storefrontConfiguration = (
  value: unknown,
): StorefrontProfileDto["storefront"] => {
  if (value === null) return null;

  try {
    if (
      !isRecord(value) ||
      value.schema_version !== 1 ||
      (value.template_key !== "luxe-commerce" &&
        value.template_key !== "luxe-commerce-full" &&
        value.template_key !== "modern-market" &&
        value.template_key !== "home-living" &&
        value.template_key !== "standard" &&
        value.template_key !== "glow-beauty" && value.template_key !== "drops" && value.template_key !== "urbx" && value.template_key !== "template-6") ||
      !isRecord(value.content) ||
      !isRecord(value.content.hero) ||
      !isRecord(value.content.about) ||
      !isRecord(value.content.contact) ||
      !isRecord(value.content.policies)
    ) {
      throw new StorefrontApiError("invalid_response");
    }

    const hero = value.content.hero;
    const ctaTarget = hero.cta_target;
    if (ctaTarget !== "catalog" && ctaTarget !== "contact") {
      throw new StorefrontApiError("invalid_response");
    }

    return {
      schema_version: 1,
      template_key: value.template_key,
      content: {
        ...(value.content.home !== undefined ? { home: storefrontHomeContent(value.content.home) } : {}),
        ...(value.content.appearance !== undefined ? { appearance: storefrontAppearance(value.content.appearance) } : {}),
        ...(value.content.shop !== undefined ? { shop: storefrontShopContent(value.content.shop) } : {}),
        navigation: storefrontNavigation(value.content.navigation),
        hero: {
          eyebrow: localizedStorefrontText(
            hero.eyebrow,
            MAX_STOREFRONT_HERO_EYEBROW_LENGTH,
          ),
          heading: localizedStorefrontText(
            hero.heading,
            MAX_STOREFRONT_HERO_HEADING_LENGTH,
          ),
          subheading: localizedStorefrontText(
            hero.subheading,
            MAX_STOREFRONT_HERO_SUBHEADING_LENGTH,
            true,
          ),
          cta_label: localizedStorefrontText(
            hero.cta_label,
            MAX_STOREFRONT_HERO_CTA_LENGTH,
          ),
          cta_target: ctaTarget,
          image_url: publicAssetUrl(hero.image_url),
          slides: storefrontHeroSlides(hero.slides),
          buttons: storefrontHeroButtons(hero.buttons),
          benefits: storefrontHeroBenefits(hero.benefits),
        },
        brands: storefrontBrands(value.content.brands),
        about: storefrontContentSection(value.content.about),
        contact: storefrontContactSection(value.content.contact),
        policies: {
          delivery: storefrontContentSection(value.content.policies.delivery),
          returns: storefrontContentSection(value.content.policies.returns),
          privacy: storefrontContentSection(value.content.policies.privacy),
          terms: storefrontContentSection(value.content.policies.terms),
        },
      },
    };
  } catch (error: unknown) {
    if (isStorefrontApiError(error)) {
      throw new StorefrontApiError("storefront_setup");
    }
    throw error;
  }
};

export const mapStorefrontProfileResponse = (
  payload: unknown,
): StorefrontProfileDto => {
  if (!isRecord(payload) || !isRecord(payload.vendor)) {
    throw new StorefrontApiError("invalid_response");
  }

  return {
    name: inlineText(payload.vendor.name, MAX_NAME_LENGTH, true) as string,
    handle: requiredHandle(payload.vendor.handle),
    domain: normalizedDomain(payload.vendor.domain),
    locale: locale(payload.vendor.locale),
    contact: contact(payload.vendor.contact),
    branding: branding(payload.vendor.branding),
    storefront: storefrontConfiguration(payload.vendor.storefront),
  };
};

const mapProductCard = (value: unknown): StorefrontProductCardDto => {
  if (!isRecord(value)) {
    throw new StorefrontApiError("invalid_response");
  }

  const variants = value.variants;
  if (variants !== undefined && (!Array.isArray(variants) || variants.length > 50)) {
    throw new StorefrontApiError("invalid_response");
  }
  const prices = (Array.isArray(variants) ? variants : []).flatMap((variant) => {
    if (!isRecord(variant) || !isRecord(variant.calculated_price)) return [];
    const price = variant.calculated_price;
    return price.currency_code === "lyd" &&
      typeof price.calculated_amount === "number" &&
      Number.isFinite(price.calculated_amount) &&
      price.calculated_amount >= 0
      ? [price.calculated_amount]
      : [];
  });
  const priceLyd = prices.length ? Math.min(...prices) : null;
  const compareAt = typeof value.storefront_compare_at_price_lyd === "number" &&
    Number.isFinite(value.storefront_compare_at_price_lyd) &&
    value.storefront_compare_at_price_lyd > (priceLyd ?? Number.MAX_SAFE_INTEGER)
    ? value.storefront_compare_at_price_lyd
    : null;

  return {
    handle: requiredHandle(value.handle),
    title: inlineText(value.title, MAX_TITLE_LENGTH, true) as string,
    subtitle: inlineText(value.subtitle, MAX_SUBTITLE_LENGTH, false),
    thumbnail_url: publicAssetUrl(value.thumbnail),
    price_lyd: priceLyd,
    compare_at_price_lyd: compareAt,
    badge: inlineText(value.storefront_badge, 40, false),
    category: inlineText(value.storefront_category, 80, false),
  };
};

const imageUrls = (value: unknown): string[] => {
  if (value === null || value === undefined) {
    return [];
  }

  if (!Array.isArray(value) || value.length > MAX_IMAGE_COUNT * 2) {
    throw new StorefrontApiError("invalid_response");
  }

  const unique = new Set<string>();

  for (const image of value) {
    if (!isRecord(image)) {
      throw new StorefrontApiError("invalid_response");
    }

    const url = publicAssetUrl(image.url);
    if (!url) {
      throw new StorefrontApiError("invalid_response");
    }

    unique.add(url);
    if (unique.size > MAX_IMAGE_COUNT) {
      throw new StorefrontApiError("invalid_response");
    }
  }

  return [...unique];
};

const mapProductDetail = (value: unknown): StorefrontProductDetailDto => {
  if (!isRecord(value)) {
    throw new StorefrontApiError("invalid_response");
  }

  const thumbnailUrl = publicAssetUrl(value.thumbnail);
  const images = imageUrls(value.images);

  if (thumbnailUrl && !images.includes(thumbnailUrl)) {
    images.unshift(thumbnailUrl);
  }

  return {
    handle: requiredHandle(value.handle),
    title: inlineText(value.title, MAX_TITLE_LENGTH, true) as string,
    subtitle: inlineText(value.subtitle, MAX_SUBTITLE_LENGTH, false),
    description: plainTextDescription(value.description),
    thumbnail_url: thumbnailUrl,
    image_urls: images.slice(0, MAX_IMAGE_COUNT),
    badge: inlineText(value.storefront_badge, 40, false),
    category: inlineText(value.storefront_category, 80, false),
    compare_at_price_lyd:
      typeof value.storefront_compare_at_price_lyd === "number" &&
      Number.isFinite(value.storefront_compare_at_price_lyd) &&
      value.storefront_compare_at_price_lyd >= 0
        ? value.storefront_compare_at_price_lyd
        : null,
  };
};

const safeNonNegativeInteger = (value: unknown): number | null =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : null;

const safeAmount = (value: unknown): number => {
  const amount = typeof value === "number" ? value : Number.NaN;
  if (!Number.isFinite(amount) || amount < 0) {
    throw new StorefrontApiError("invalid_response");
  }
  return amount;
};

const opaqueId = (value: unknown): string => {
  if (
    typeof value !== "string" ||
    !value ||
    value.length > MAX_OPAQUE_ID_LENGTH ||
    containsUnsafeControlCharacter(value) ||
    /\s/u.test(value)
  ) {
    throw new StorefrontApiError("invalid_response");
  }
  return value;
};

const currencyCode = (value: unknown): string => {
  if (typeof value !== "string") {
    throw new StorefrontApiError("invalid_response");
  }
  const normalized = value.trim().toLowerCase();
  if (!/^[a-z]{3}$/.test(normalized)) {
    throw new StorefrontApiError("invalid_response");
  }
  return normalized;
};

export const mapStorefrontCatalogResponse = (
  payload: unknown,
  requestedOffset: number,
  requestedLimit: number,
): StorefrontCatalogPageDto => {
  if (!isRecord(payload) || !Array.isArray(payload.products)) {
    throw new StorefrontApiError("invalid_response");
  }

  const count = safeNonNegativeInteger(payload.count);
  const offset = safeNonNegativeInteger(payload.offset);
  const limit = safeNonNegativeInteger(payload.limit);

  if (
    count === null ||
    offset === null ||
    limit === null ||
    offset !== requestedOffset ||
    limit !== requestedLimit ||
    limit > STOREFRONT_MAX_PAGE_SIZE ||
    payload.products.length > limit ||
    count < payload.products.length ||
    (payload.products.length > 0 && offset + payload.products.length > count) ||
    (payload.products.length === 0 && offset < count)
  ) {
    throw new StorefrontApiError("invalid_response");
  }

  return {
    products: payload.products.map(mapProductCard),
    count,
    offset,
    limit,
  };
};

export const mapStorefrontCommerceCapabilitiesResponse = (
  payload: unknown,
): StorefrontCommerceCapabilitiesDto => {
  if (!isRecord(payload) || !isRecord(payload.online_checkout)) {
    throw new StorefrontApiError("invalid_response");
  }

  const status = payload.online_checkout.status;
  if (status === "unavailable") {
    if (
      payload.online_checkout.currency_code !== null ||
      !Array.isArray(payload.online_checkout.country_codes) ||
      payload.online_checkout.country_codes.length !== 0 ||
      !Array.isArray(payload.online_checkout.payment_methods) ||
      payload.online_checkout.payment_methods.length !== 0
    ) {
      throw new StorefrontApiError("invalid_response");
    }
    return {
      online_checkout: {
        status: "unavailable",
        currency_code: null,
        country_codes: [],
        payment_methods: [],
      },
    };
  }

  if (
    status !== "available" ||
    !Array.isArray(payload.online_checkout.country_codes) ||
    !Array.isArray(payload.online_checkout.payment_methods) ||
    payload.online_checkout.country_codes.length === 0 ||
    payload.online_checkout.country_codes.length > 20
  ) {
    throw new StorefrontApiError("invalid_response");
  }

  const countries = payload.online_checkout.country_codes.map((value) => {
    if (typeof value !== "string" || !/^[a-z]{2}$/i.test(value.trim())) {
      throw new StorefrontApiError("invalid_response");
    }
    return value.trim().toLowerCase();
  });

  if (new Set(countries).size !== countries.length) {
    throw new StorefrontApiError("invalid_response");
  }

  const paymentMethods = payload.online_checkout.payment_methods;
  if (
    paymentMethods.length < 1 ||
    paymentMethods.length > 2 ||
    paymentMethods[0] !== "cod" ||
    paymentMethods.some(
      (value) => value !== "cod" && value !== "bank_transfer",
    ) ||
    new Set(paymentMethods).size !== paymentMethods.length
  ) {
    throw new StorefrontApiError("invalid_response");
  }

  return {
    online_checkout: {
      status: "available",
      currency_code: currencyCode(payload.online_checkout.currency_code),
      country_codes: countries,
      payment_methods: paymentMethods as Array<"cod" | "bank_transfer">,
    },
  };
};

export const mapStorefrontPurchaseOptionsResponse = (
  payload: unknown,
  expectedHandle: string,
  expectedCurrency: string,
): StorefrontPurchaseOptionsDto => {
  if (!isRecord(payload)) {
    throw new StorefrontApiError("invalid_response");
  }
  const handle = requiredHandle(payload.product_handle);
  const currency = currencyCode(payload.currency_code);
  const rawVariants = Array.isArray(payload.variants)
    ? payload.variants
    : isRecord(payload.variant)
      ? [payload.variant]
      : null;

  if (
    handle !== expectedHandle ||
    currency !== expectedCurrency ||
    !rawVariants ||
    rawVariants.length < 1 ||
    rawVariants.length > 50
  ) {
    throw new StorefrontApiError("invalid_response");
  }

  const variants = rawVariants.map((rawVariant) => {
    if (
      !isRecord(rawVariant) ||
      typeof rawVariant.available_for_sale !== "boolean"
    ) {
      throw new StorefrontApiError("invalid_response");
    }
    const rawOptions = isRecord(rawVariant.options) ? rawVariant.options : {};
    const size =
      rawOptions.size === null || rawOptions.size === undefined
        ? null
        : inlineText(rawOptions.size, 60, true);
    const color =
      rawOptions.color === null || rawOptions.color === undefined
        ? null
        : inlineText(rawOptions.color, 60, true);

    return {
      id: opaqueId(rawVariant.id),
      title: inlineText(rawVariant.title, MAX_TITLE_LENGTH, true) as string,
      options: { size, color },
      unit_price: safeAmount(rawVariant.unit_price),
      available_for_sale: rawVariant.available_for_sale,
    };
  });
  const rawOptions = Array.isArray(payload.options) ? payload.options : [];
  const options = rawOptions.map((rawOption) => {
    if (!isRecord(rawOption) || !Array.isArray(rawOption.values)) {
      throw new StorefrontApiError("invalid_response");
    }
    const name = rawOption.name;
    if (name !== "size" && name !== "color") {
      throw new StorefrontApiError("invalid_response");
    }
    const values = rawOption.values.map(
      (value) => inlineText(value, 60, true) as string,
    );
    if (values.length < 1 || new Set(values).size !== values.length) {
      throw new StorefrontApiError("invalid_response");
    }
    return { name: name as "size" | "color", values };
  });

  return {
    product_handle: handle,
    currency_code: currency,
    options,
    variants,
  };
};

const mapCart = (
  value: unknown,
  expectedCurrency: string,
): StorefrontCartDto => {
  if (!isRecord(value) || !Array.isArray(value.items)) {
    throw new StorefrontApiError("invalid_response");
  }
  const currency = currencyCode(value.currency_code);
  if (currency !== expectedCurrency || value.items.length > MAX_CART_ITEMS) {
    throw new StorefrontApiError("invalid_response");
  }

  const items = value.items.map((item) => {
    if (!isRecord(item)) {
      throw new StorefrontApiError("invalid_response");
    }
    const quantity = safeNonNegativeInteger(item.quantity);
    if (
      quantity === null ||
      quantity < 1 ||
      quantity > STOREFRONT_MAX_CART_QUANTITY
    ) {
      throw new StorefrontApiError("invalid_response");
    }
    const unitPrice = safeAmount(item.unit_price);
    const lineTotal =
      item.total === null || item.total === undefined
        ? unitPrice * quantity
        : safeAmount(item.total);
    return {
      id: opaqueId(item.id),
      variant_id: opaqueId(item.variant_id),
      variant_title: inlineText(item.variant_title, MAX_TITLE_LENGTH, false),
      product_handle: normalizePublicHandle(item.product_handle) || null,
      title: inlineText(
        item.product_title ?? item.title,
        MAX_TITLE_LENGTH,
        true,
      ) as string,
      thumbnail_url: publicAssetUrl(item.thumbnail),
      quantity,
      unit_price: unitPrice,
      total: safeAmount(lineTotal),
    };
  });
  const paymentCollection = isRecord(value.payment_collection)
    ? value.payment_collection
    : null;
  const paymentSessions = Array.isArray(paymentCollection?.payment_sessions)
    ? paymentCollection.payment_sessions
    : [];

  return {
    id: opaqueId(value.id),
    currency_code: currency,
    email: inlineText(value.email, 320, false),
    items,
    item_subtotal: safeAmount(value.item_subtotal ?? 0),
    shipping_total: safeAmount(value.shipping_total ?? 0),
    total: safeAmount(value.total ?? 0),
    shipping_method_selected:
      Array.isArray(value.shipping_methods) &&
      value.shipping_methods.length === 1,
    payment_session_ready: paymentSessions.length === 1,
    completed: value.completed_at !== null && value.completed_at !== undefined,
  };
};

export const mapStorefrontCartResponse = (
  payload: unknown,
  expectedCurrency: string,
): StorefrontCartDto => {
  if (!isRecord(payload)) {
    throw new StorefrontApiError("invalid_response");
  }
  return mapCart(payload.cart, expectedCurrency);
};

export const mapStorefrontShippingOptionsResponse = (
  payload: unknown,
): StorefrontShippingOptionDto[] => {
  if (!isRecord(payload) || !Array.isArray(payload.shipping_options)) {
    throw new StorefrontApiError("invalid_response");
  }
  if (payload.shipping_options.length !== 1) {
    throw new StorefrontApiError("invalid_response");
  }
  return payload.shipping_options.map((option) => {
    if (!isRecord(option)) {
      throw new StorefrontApiError("invalid_response");
    }
    return {
      id: opaqueId(option.id),
      name: inlineText(option.name, MAX_TITLE_LENGTH, true) as string,
      amount: safeAmount(option.amount),
    };
  });
};

export const mapStorefrontOrderConfirmationResponse = (
  payload: unknown,
  expectedCurrency: string,
): StorefrontOrderConfirmationDto => {
  if (
    !isRecord(payload) ||
    payload.type !== "order" ||
    !isRecord(payload.order) ||
    !Array.isArray(payload.order.items)
  ) {
    throw new StorefrontApiError("invalid_response");
  }
  const order = payload.order;
  const orderItems = order.items as unknown[];
  const currency = currencyCode(order.currency_code);
  if (currency !== expectedCurrency || orderItems.length > MAX_CART_ITEMS) {
    throw new StorefrontApiError("invalid_response");
  }
  const displayId = order.display_id;
  if (!(
    (typeof displayId === "number" && Number.isSafeInteger(displayId)) ||
    (typeof displayId === "string" &&
      displayId.length > 0 &&
      displayId.length <= 80 &&
      !containsUnsafeControlCharacter(displayId))
  )) {
    throw new StorefrontApiError("invalid_response");
  }
  if (!isRecord(order.payment)) {
    throw new StorefrontApiError("invalid_response");
  }
  const payment =
    order.payment.method === "cod" &&
    order.payment.status === "pending_fulfillment" &&
    !hasOwn(order.payment, "bank_transfer")
      ? ({
          method: "cod",
          status: "pending_fulfillment",
        } as const)
      : order.payment.method === "bank_transfer" &&
          order.payment.status === "pending_verification" &&
          isRecord(order.payment.bank_transfer)
        ? ({
            method: "bank_transfer",
            status: "pending_verification",
            bank_transfer: {
              bank_name: storefrontInlineText(
                order.payment.bank_transfer.bank_name,
                160,
              ),
              account_holder_name: storefrontInlineText(
                order.payment.bank_transfer.account_holder_name,
                160,
              ),
              account_reference: storefrontInlineText(
                order.payment.bank_transfer.account_reference,
                160,
              ),
              instructions: storefrontBodyText(
                order.payment.bank_transfer.instructions,
                3_000,
              ),
            },
          } as const)
        : null;
  if (!payment) {
    throw new StorefrontApiError("invalid_response");
  }

  return {
    display_id: displayId,
    ...(isRecord(order.tracking) && typeof order.tracking.token === "string" && /^[a-f0-9]{64}$/.test(order.tracking.token) && typeof order.tracking.expires_at === "string"
      ? { tracking: { token: order.tracking.token, expires_at: order.tracking.expires_at } } : {}),
    currency_code: currency,
    items: orderItems.map((item) => {
      if (!isRecord(item)) {
        throw new StorefrontApiError("invalid_response");
      }
      const quantity = safeNonNegativeInteger(item.quantity);
      if (quantity === null || quantity < 1) {
        throw new StorefrontApiError("invalid_response");
      }
      const unitPrice = safeAmount(item.unit_price);
      const lineTotal =
        item.total === null || item.total === undefined
          ? unitPrice * quantity
          : safeAmount(item.total);
      return {
        title: inlineText(
          item.product_title ?? item.title,
          MAX_TITLE_LENGTH,
          true,
        ) as string,
        ...(typeof item.thumbnail_url === "string" ? { thumbnail_url: publicAssetUrl(item.thumbnail_url) } : {}),
        ...(typeof item.variant_title === "string" && item.variant_title.trim() ? { variant_title: inlineText(item.variant_title, MAX_TITLE_LENGTH, true) as string } : {}),
        quantity,
        unit_price: unitPrice,
        total: safeAmount(lineTotal),
      };
    }),
    item_subtotal: safeAmount(order.item_subtotal ?? 0),
    shipping_total: safeAmount(order.shipping_total ?? 0),
    total: safeAmount(order.total ?? 0),
    payment,
  };
};

const requestConfiguration = () => {
  try {
    return getStorefrontRequestConfig();
  } catch (error) {
    if (error instanceof StorefrontConfigurationError) {
      throw new StorefrontApiError("configuration");
    }
    throw new StorefrontApiError("configuration");
  }
};

const fetchUnknown = async (
  path: string,
  externalSignal?: AbortSignal,
  request: { method?: "GET" | "POST" | "DELETE"; body?: unknown } = {},
): Promise<unknown> => {
  const config = requestConfiguration();
  const controller = new AbortController();
  let timedOut = false;

  const abortFromCaller = () => controller.abort(externalSignal?.reason);
  if (externalSignal?.aborted) {
    throw new StorefrontApiError("aborted");
  }
  externalSignal?.addEventListener("abort", abortFromCaller, { once: true });

  const timeout = globalThis.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, config.timeoutMs);

  try {
    const headers = new Headers({
      Accept: "application/json",
      "x-publishable-api-key": config.publishableKey,
    });

    if (request.body !== undefined) {
      headers.set("Content-Type", "application/json");
    }

    if (import.meta.env.DEV && config.developmentStoreHandle) {
      headers.set("x-store-handle", config.developmentStoreHandle);
    }

    const response = await fetch(path, {
      method: request.method ?? "GET",
      headers,
      body:
        request.body === undefined ? undefined : JSON.stringify(request.body),
      credentials: "omit",
      cache: "no-store",
      redirect: "error",
      referrerPolicy: "same-origin",
      signal: controller.signal,
    });

    if (!response.ok) {
      if ([400, 401, 403, 404].includes(response.status)) {
        throw new StorefrontApiError("not_found");
      }

      throw new StorefrontApiError(
        "unavailable",
        response.status === 408 ||
          response.status === 429 ||
          response.status >= 500,
      );
    }

    try {
      return (await response.json()) as unknown;
    } catch {
      throw new StorefrontApiError("invalid_response");
    }
  } catch (error) {
    if (error instanceof StorefrontApiError) {
      throw error;
    }

    if (externalSignal?.aborted) {
      throw new StorefrontApiError("aborted");
    }

    if (timedOut) {
      throw new StorefrontApiError("unavailable", true);
    }

    throw new StorefrontApiError("unavailable", true);
  } finally {
    globalThis.clearTimeout(timeout);
    externalSignal?.removeEventListener("abort", abortFromCaller);
  }
};

const ensureNotAborted = (signal?: AbortSignal) => {
  if (signal?.aborted) {
    throw new StorefrontApiError("aborted");
  }
};

const normalizedCatalogInput = (query: StorefrontCatalogQuery) => {
  const requestedLimit = query.limit ?? STOREFRONT_DEFAULT_PAGE_SIZE;
  const requestedOffset = query.offset ?? 0;

  if (
    !Number.isSafeInteger(requestedLimit) ||
    requestedLimit <= 0 ||
    !Number.isSafeInteger(requestedOffset) ||
    requestedOffset < 0 ||
    requestedOffset > STOREFRONT_MAX_OFFSET
  ) {
    throw new StorefrontApiError("invalid_request");
  }

  const limit = Math.min(requestedLimit, STOREFRONT_MAX_PAGE_SIZE);
  let q: string | undefined;

  if (query.q !== undefined) {
    if (
      typeof query.q !== "string" ||
      containsUnsafeControlCharacter(query.q)
    ) {
      throw new StorefrontApiError("invalid_request");
    }

    const normalizedQuery = query.q
      .normalize("NFC")
      .trim()
      .replace(/\s+/gu, " ");

    if (normalizedQuery.length > MAX_SEARCH_LENGTH) {
      throw new StorefrontApiError("invalid_request");
    }

    q = normalizedQuery || undefined;
  }
  const order = query.order;

  if (
    order !== undefined &&
    !STOREFRONT_CATALOG_ORDERS.includes(order as StorefrontCatalogOrder)
  ) {
    throw new StorefrontApiError("invalid_request");
  }

  return { limit, offset: requestedOffset, q, order };
};

export const resolveStorefrontProfile = async (
  options: StorefrontRequestOptions = {},
): Promise<StorefrontProfileDto> => {
  ensureNotAborted(options.signal);

  if (isVisualPreviewEnabled()) {
    const { getVisualPreviewProfile } = await import("../dev/visual-preview");
    ensureNotAborted(options.signal);
    return getVisualPreviewProfile();
  }

  const payload = await fetchUnknown("/store/vendors/resolve", options.signal);
  return mapStorefrontProfileResponse(payload);
};

export const fetchStorefrontCatalog = async (
  query: StorefrontCatalogQuery = {},
): Promise<StorefrontCatalogPageDto> => {
  const input = normalizedCatalogInput(query);
  ensureNotAborted(query.signal);

  if (isVisualPreviewEnabled()) {
    if (isStorefrontEditorPreviewEnabled()) {
      const { getStorefrontEditorPreviewCatalog } = await import("../editor-preview-state");
      const catalog = getStorefrontEditorPreviewCatalog(input);
      if (catalog) return catalog;
    }
    const { getVisualPreviewCatalog } = await import("../dev/visual-preview");
    ensureNotAborted(query.signal);
    return getVisualPreviewCatalog(input);
  }

  const search = new URLSearchParams({
    fields: CATALOG_PRODUCT_PRESENTATION_FIELDS,
    limit: String(input.limit),
    offset: String(input.offset),
  });

  if (input.q) {
    search.set("q", input.q);
  }
  if (input.order) {
    search.set("order", input.order);
  }

  const payload = await fetchUnknown(
    `/store/products?${search.toString()}`,
    query.signal,
  );
  return mapStorefrontCatalogResponse(payload, input.offset, input.limit);
};

export const fetchStorefrontProductDetail = async (
  handleInput: string,
  options: StorefrontRequestOptions = {},
): Promise<StorefrontProductDetailDto> => {
  const handle = normalizePublicHandle(handleInput);
  if (!handle) {
    throw new StorefrontApiError("invalid_request");
  }

  ensureNotAborted(options.signal);

  if (isVisualPreviewEnabled()) {
    if (isStorefrontEditorPreviewEnabled()) {
      const { getStorefrontEditorPreviewProduct } = await import("../editor-preview-state");
      const product = getStorefrontEditorPreviewProduct(handle);
      if (product === null) throw new StorefrontApiError("not_found");
      if (product) return product;
    }
    const { getVisualPreviewProduct } = await import("../dev/visual-preview");
    ensureNotAborted(options.signal);
    const product = getVisualPreviewProduct(handle);
    if (!product) {
      throw new StorefrontApiError("not_found");
    }
    return product;
  }

  const search = new URLSearchParams({
    fields: DETAIL_PRODUCT_PRESENTATION_FIELDS,
    handle,
    limit: "2",
    offset: "0",
  });
  const payload = await fetchUnknown(
    `/store/products?${search.toString()}`,
    options.signal,
  );

  if (!isRecord(payload) || !Array.isArray(payload.products)) {
    throw new StorefrontApiError("invalid_response");
  }

  const count = safeNonNegativeInteger(payload.count);
  const offset = safeNonNegativeInteger(payload.offset);
  const limit = safeNonNegativeInteger(payload.limit);

  if (offset !== 0 || limit !== 2) {
    throw new StorefrontApiError("invalid_response");
  }

  if (count === 0 && payload.products.length === 0) {
    throw new StorefrontApiError("not_found");
  }

  if (count !== 1 || payload.products.length !== 1) {
    throw new StorefrontApiError("invalid_response");
  }

  const product = mapProductDetail(payload.products[0]);
  if (product.handle !== handle) {
    throw new StorefrontApiError("not_found");
  }

  return product;
};

const requestId = (value: string): string => {
  if (
    typeof value !== "string" ||
    !value ||
    value.length > MAX_OPAQUE_ID_LENGTH ||
    containsUnsafeControlCharacter(value) ||
    /\s/u.test(value)
  ) {
    throw new StorefrontApiError("invalid_request");
  }
  return value;
};

export const fetchStorefrontCommerceCapabilities = async (
  options: StorefrontRequestOptions = {},
): Promise<StorefrontCommerceCapabilitiesDto> => {
  ensureNotAborted(options.signal);
  if (isVisualPreviewEnabled()) {
    if (isStorefrontEditorPreviewEnabled()) {
      const { getStorefrontEditorPreviewCommerceCapabilities } = await import("../editor-preview-state");
      const capability = getStorefrontEditorPreviewCommerceCapabilities();
      if (capability) return capability;
    }
    const { getVisualPreviewCommerceCapabilities } = await import("../dev/visual-preview");
    return getVisualPreviewCommerceCapabilities();
  }
  const payload = await fetchUnknown(
    "/store/saas/commerce-capabilities",
    options.signal,
  );
  return mapStorefrontCommerceCapabilitiesResponse(payload);
};

export const fetchStorefrontPurchaseOptions = async (
  handleInput: string,
  expectedCurrency: string,
  options: StorefrontRequestOptions = {},
): Promise<StorefrontPurchaseOptionsDto> => {
  const handle = normalizePublicHandle(handleInput);
  if (!handle || currencyCode(expectedCurrency) !== expectedCurrency) {
    throw new StorefrontApiError("invalid_request");
  }
  if (isVisualPreviewEnabled()) {
    if (isStorefrontEditorPreviewEnabled()) {
      const { getStorefrontEditorPreviewPurchaseOptions } = await import("../editor-preview-state");
      const purchase = getStorefrontEditorPreviewPurchaseOptions(handle);
      if (purchase === null) throw new StorefrontApiError("not_found");
      if (purchase) return purchase;
    }
    const { getVisualPreviewPurchaseOptions } = await import("../dev/visual-preview");
    const purchase = getVisualPreviewPurchaseOptions(handle);
    if (!purchase) throw new StorefrontApiError("not_found");
    return purchase;
  }
  const payload = await fetchUnknown(
    `/store/saas/products/${encodeURIComponent(handle)}/purchase-options`,
    options.signal,
  );
  return mapStorefrontPurchaseOptionsResponse(
    payload,
    handle,
    expectedCurrency,
  );
};

const trialCartRequest = async (command: Record<string, unknown>, expectedCurrency: string, signal?: AbortSignal): Promise<StorefrontCartDto> => {
  const value = await creationTrialRequest(command, signal);
  if (!isRecord(value) || !Array.isArray(value.items) || typeof value.shipping_method_selected !== "boolean" || typeof value.payment_session_ready !== "boolean" || typeof value.completed !== "boolean") throw new StorefrontApiError("invalid_response");
  return mapCart({ ...value,
    items: value.items.map(item => isRecord(item) ? { ...item, thumbnail: item.thumbnail_url } : item),
    shipping_methods: value.shipping_method_selected ? [{}] : [],
    payment_collection: { payment_sessions: value.payment_session_ready ? [{}] : [] },
    completed_at: value.completed ? "completed" : null,
  }, expectedCurrency);
};

export const createStorefrontCart = async (
  expectedCurrency: string,
  options: StorefrontRequestOptions = {},
): Promise<StorefrontCartDto> => {
  if (isCreationTrial()) return trialCartRequest({ action: "create" }, expectedCurrency, options.signal);
  if (isVisualPreviewEnabled()) {
    const { createVisualPreviewCart } = await import("../dev/visual-preview");
    return createVisualPreviewCart();
  }
  const payload = await fetchUnknown("/store/carts", options.signal, {
    method: "POST",
    body: {},
  });
  return mapStorefrontCartResponse(payload, expectedCurrency);
};

export const fetchStorefrontCart = async (
  cartId: string,
  expectedCurrency: string,
  options: StorefrontRequestOptions = {},
): Promise<StorefrontCartDto> => {
  if (isCreationTrial()) return trialCartRequest({ action: "get", cart_id: cartId }, expectedCurrency, options.signal);
  if (isVisualPreviewEnabled()) {
    const { getVisualPreviewCart } = await import("../dev/visual-preview");
    const cart = getVisualPreviewCart();
    if (!cart) throw new StorefrontApiError("not_found");
    return cart;
  }
  const payload = await fetchUnknown(
    `/store/carts/${encodeURIComponent(requestId(cartId))}`,
    options.signal,
  );
  return mapStorefrontCartResponse(payload, expectedCurrency);
};

export const addStorefrontCartItem = async (
  cartId: string,
  variantId: string,
  quantity: number,
  expectedCurrency: string,
): Promise<StorefrontCartDto> => {
  if (isCreationTrial()) return trialCartRequest({ action: "add", cart_id: cartId, variant_id: variantId, quantity }, expectedCurrency);
  if (
    !Number.isSafeInteger(quantity) ||
    quantity < 1 ||
    quantity > STOREFRONT_MAX_CART_QUANTITY
  ) {
    throw new StorefrontApiError("invalid_request");
  }
  if (isVisualPreviewEnabled()) {
    const { addVisualPreviewCartItem } = await import("../dev/visual-preview");
    return addVisualPreviewCartItem(variantId, quantity);
  }
  const payload = await fetchUnknown(
    `/store/carts/${encodeURIComponent(requestId(cartId))}/line-items`,
    undefined,
    {
      method: "POST",
      body: { variant_id: requestId(variantId), quantity },
    },
  );
  return mapStorefrontCartResponse(payload, expectedCurrency);
};

export const updateStorefrontCartItem = async (
  cartId: string,
  lineId: string,
  quantity: number,
  expectedCurrency: string,
): Promise<StorefrontCartDto> => {
  if (isCreationTrial()) return trialCartRequest({ action: "quantity", cart_id: cartId, line_id: lineId, quantity }, expectedCurrency);
  if (
    !Number.isSafeInteger(quantity) ||
    quantity < 1 ||
    quantity > STOREFRONT_MAX_CART_QUANTITY
  ) {
    throw new StorefrontApiError("invalid_request");
  }
  if (isVisualPreviewEnabled()) {
    const { updateVisualPreviewCartItem } = await import("../dev/visual-preview");
    return updateVisualPreviewCartItem(lineId, quantity);
  }
  const payload = await fetchUnknown(
    `/store/carts/${encodeURIComponent(requestId(cartId))}/line-items/${encodeURIComponent(requestId(lineId))}`,
    undefined,
    { method: "POST", body: { quantity } },
  );
  return mapStorefrontCartResponse(payload, expectedCurrency);
};

export const removeStorefrontCartItem = async (
  cartId: string,
  lineId: string,
  expectedCurrency: string,
): Promise<StorefrontCartDto> => {
  if (isCreationTrial()) return trialCartRequest({ action: "remove", cart_id: cartId, line_id: lineId }, expectedCurrency);
  if (isVisualPreviewEnabled()) {
    const { removeVisualPreviewCartItem } = await import("../dev/visual-preview");
    return removeVisualPreviewCartItem(lineId);
  }
  const payload = await fetchUnknown(
    `/store/carts/${encodeURIComponent(requestId(cartId))}/line-items/${encodeURIComponent(requestId(lineId))}`,
    undefined,
    { method: "DELETE" },
  );
  if (!isRecord(payload)) {
    throw new StorefrontApiError("invalid_response");
  }
  return mapCart(payload.parent, expectedCurrency);
};

const checkoutText = (
  value: string,
  maximum: number,
  required: boolean,
): string | undefined => {
  const normalized = inlineText(value, maximum, required);
  return normalized ?? undefined;
};

export const updateStorefrontCheckoutAddress = async (
  cartId: string,
  address: StorefrontCheckoutAddress,
  expectedCurrency: string,
): Promise<StorefrontCartDto> => {
  if (isCreationTrial()) return trialCartRequest({ action: "address", cart_id: cartId, address }, expectedCurrency);
  const email = checkoutText(address.email, 320, true) as string;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) {
    throw new StorefrontApiError("invalid_request");
  }
  const countryCode = address.country_code.trim().toLowerCase();
  if (!/^[a-z]{2}$/.test(countryCode)) {
    throw new StorefrontApiError("invalid_request");
  }
  if (isVisualPreviewEnabled()) {
    const { updateVisualPreviewAddress } = await import("../dev/visual-preview");
    return updateVisualPreviewAddress(address);
  }
  const payload = await fetchUnknown(
    `/store/carts/${encodeURIComponent(requestId(cartId))}`,
    undefined,
    {
      method: "POST",
      body: {
        email,
        shipping_address: {
          first_name: checkoutText(address.first_name, 120, true),
          last_name: checkoutText(address.last_name, 120, true),
          address_1: checkoutText(address.address_1, 240, true),
          city: checkoutText(address.city, 120, true),
          country_code: countryCode,
          ...(address.phone
            ? { phone: checkoutText(address.phone, 40, false) }
            : {}),
        },
      },
    },
  );
  return mapStorefrontCartResponse(payload, expectedCurrency);
};

export const fetchStorefrontShippingOptions = async (
  cartId: string,
): Promise<StorefrontShippingOptionDto[]> => {
  if (isCreationTrial()) return mapStorefrontShippingOptionsResponse({ shipping_options: await creationTrialRequest({ action: "shipping-options", cart_id: cartId }) });
  if (isVisualPreviewEnabled()) {
    const { getVisualPreviewShippingOptions } = await import("../dev/visual-preview");
    return getVisualPreviewShippingOptions();
  }
  const search = new URLSearchParams({ cart_id: requestId(cartId) });
  const payload = await fetchUnknown(
    `/store/shipping-options?${search.toString()}`,
  );
  return mapStorefrontShippingOptionsResponse(payload);
};

export const selectStorefrontShippingOption = async (
  cartId: string,
  optionId: string,
  expectedCurrency: string,
): Promise<StorefrontCartDto> => {
  if (isCreationTrial()) return trialCartRequest({ action: "shipping", cart_id: cartId, option_id: optionId }, expectedCurrency);
  if (isVisualPreviewEnabled()) {
    const { selectVisualPreviewShipping } = await import("../dev/visual-preview");
    return selectVisualPreviewShipping(optionId);
  }
  const payload = await fetchUnknown(
    `/store/carts/${encodeURIComponent(requestId(cartId))}/shipping-methods`,
    undefined,
    { method: "POST", body: { option_id: requestId(optionId) } },
  );
  return mapStorefrontCartResponse(payload, expectedCurrency);
};

export const prepareStorefrontSystemPayment = async (
  cartId: string,
): Promise<void> => {
  if (isCreationTrial()) { await creationTrialRequest({ action: "payment", cart_id: cartId }); return; }
  if (isVisualPreviewEnabled()) {
    const { prepareVisualPreviewPayment } = await import("../dev/visual-preview");
    prepareVisualPreviewPayment();
    return;
  }
  const collectionPayload = await fetchUnknown(
    "/store/payment-collections",
    undefined,
    { method: "POST", body: { cart_id: requestId(cartId) } },
  );
  if (
    !isRecord(collectionPayload) ||
    !isRecord(collectionPayload.payment_collection)
  ) {
    throw new StorefrontApiError("invalid_response");
  }
  const collectionId = opaqueId(collectionPayload.payment_collection.id);
  await fetchUnknown(
    `/store/payment-collections/${encodeURIComponent(collectionId)}/payment-sessions`,
    undefined,
    {
      method: "POST",
      body: { provider_id: STOREFRONT_SYSTEM_PAYMENT_PROVIDER },
    },
  );
};

export const completeStorefrontCart = async (
  cartId: string,
  expectedCurrency: string,
  paymentMethod: "cod" | "bank_transfer",
  options: StorefrontRequestOptions = {},
): Promise<StorefrontOrderConfirmationDto> => {
  if (isCreationTrial()) return mapStorefrontOrderConfirmationResponse({ type: "order", order: await creationTrialRequest({ action: "complete", cart_id: cartId, payment_method: paymentMethod }, options.signal) }, expectedCurrency);
  if (isVisualPreviewEnabled()) {
    const { completeVisualPreviewOrder } = await import("../dev/visual-preview");
    return completeVisualPreviewOrder(paymentMethod);
  }
  const payload = await fetchUnknown(
    `/store/saas/carts/${encodeURIComponent(requestId(cartId))}/complete`,
    options.signal,
    { method: "POST", body: { payment_method: paymentMethod } },
  );
  const confirmation = mapStorefrontOrderConfirmationResponse(payload, expectedCurrency);
  if (confirmation.tracking) rememberOrderGrant(confirmation.tracking.token);
  return confirmation;
};

export const fetchStorefrontTrackedOrder = async (token: string): Promise<TrackedOrder> => {
  if (!/^[a-f0-9]{64}$/.test(token)) throw new StorefrontApiError("invalid_request");
  const payload = await fetchUnknown("/store/saas/order-status", undefined, { method: "POST", body: { token } });
  if (!isRecord(payload) || !isRecord(payload.order) || !["confirmed", "processing", "shipped", "delivered"].includes(String(payload.order.progress)) ||
    typeof payload.order.created_at !== "string" || typeof payload.order.updated_at !== "string") throw new StorefrontApiError("invalid_response");
  return { ...mapStorefrontOrderConfirmationResponse({ type: "order", order: payload.order }, "lyd"),
    progress: payload.order.progress as TrackedOrder["progress"], created_at: payload.order.created_at, updated_at: payload.order.updated_at };
};

export {
  CATALOG_PRODUCT_PRESENTATION_FIELDS,
  DETAIL_PRODUCT_PRESENTATION_FIELDS,
};
