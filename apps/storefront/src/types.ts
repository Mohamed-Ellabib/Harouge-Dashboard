export type StorefrontAppearance = {
  text_color?: string
  heading_color?: string
  muted_text_color?: string
  button_text_color?: string
  surface_color?: string
  navbar_background?: string
  navbar_text_color?: string
  navbar_active_color?: string
  body_font?: "original" | "cairo" | "manrope" | "condensed" | "anton" | "marker" | "system" | "serif"
  heading_font?: "original" | "cairo" | "manrope" | "condensed" | "anton" | "marker" | "system" | "serif"
}

export type StorefrontLocale = "ar-LY" | "en-LY";

export type StorefrontLocalizedTextDto = {
  ar: string;
  en: string;
};

// Optional independent home content: editing it never overwrites welcome copy.
export type StorefrontHomeContentDto = {
  eyebrow: StorefrontLocalizedTextDto;
  heading: StorefrontLocalizedTextDto;
  statement: StorefrontLocalizedTextDto;
  cta_label: StorefrontLocalizedTextDto;
  categories_heading: StorefrontLocalizedTextDto;
  products_heading: StorefrontLocalizedTextDto;
  view_all_label: StorefrontLocalizedTextDto;
  promotion_eyebrow: StorefrontLocalizedTextDto;
  promotion_heading: StorefrontLocalizedTextDto;
  promotion_detail: StorefrontLocalizedTextDto;
  image_url: string;
  promotion_image_url: string;
};

export type StorefrontShopContentDto = {
  heading: StorefrontLocalizedTextDto;
  statement: StorefrontLocalizedTextDto;
  search_placeholder: StorefrontLocalizedTextDto;
};

export type StorefrontHeroSlideDto = {
  id: string;
  image_url: string;
  alt: StorefrontLocalizedTextDto;
  enabled: boolean;
};

export type StorefrontHeroButtonDto = {
  id: string;
  label: StorefrontLocalizedTextDto;
  href: string;
  background_color: string;
  text_color: string;
  style: "solid" | "outline";
  enabled: boolean;
};

export type StorefrontBenefitIcon =
  | "award"
  | "shield"
  | "truck"
  | "package"
  | "check"
  | "heart"
  | "globe"
  | "clock"
  | "headset"
  | "sparkle";

export type StorefrontHeroBenefitDto = {
  id: string;
  icon: StorefrontBenefitIcon;
  title: StorefrontLocalizedTextDto;
  subtitle: StorefrontLocalizedTextDto;
};

export type StorefrontBrandDto = {
  id: string;
  name: StorefrontLocalizedTextDto;
  slug: string;
  image_url: string | null;
  banner_image_url?: string | null;
};

export type StorefrontNavigationKey =
  | "home"
  | "categories"
  | "favorites"
  | "cart"
  | "account"
  | "orders"
  | "settings";

export type StorefrontTemplateKey =
  | "luxe-commerce"
  | "luxe-commerce-full"
  | "modern-market"
  | "home-living"
  | "standard"
  | "glow-beauty"
  | "drops"
  | "urbx"
  | "template-6";

export const isLuxeCommerceTemplate = (
  key: StorefrontTemplateKey | null | undefined,
): boolean => key === "luxe-commerce" || key === "luxe-commerce-full";

export type StorefrontPublishedConfigurationDto = {
  schema_version: 1;
  template_key: StorefrontTemplateKey;
  content: {
    appearance?: StorefrontAppearance;
    home?: StorefrontHomeContentDto;
    shop?: StorefrontShopContentDto;
    hero: {
      eyebrow: StorefrontLocalizedTextDto;
      heading: StorefrontLocalizedTextDto;
      subheading: StorefrontLocalizedTextDto;
      cta_label: StorefrontLocalizedTextDto;
      cta_target: "catalog" | "contact";
      image_url: string | null;
      slides: StorefrontHeroSlideDto[];
      buttons: StorefrontHeroButtonDto[];
      benefits: StorefrontHeroBenefitDto[];
    };
    navigation: {
      items: Array<{
        key: StorefrontNavigationKey;
        label: StorefrontLocalizedTextDto;
        enabled: boolean;
      }>;
    };
    brands: {
      heading: StorefrontLocalizedTextDto;
      subheading: StorefrontLocalizedTextDto;
      search_placeholder?: StorefrontLocalizedTextDto;
      explore_label?: StorefrontLocalizedTextDto;
      view_all_label?: StorefrontLocalizedTextDto;
      promotion_heading?: StorefrontLocalizedTextDto;
      promotion_subheading?: StorefrontLocalizedTextDto;
      promotion_image_url?: string | null;
      items: StorefrontBrandDto[];
    };
    about: {
      title: StorefrontLocalizedTextDto;
      body: StorefrontLocalizedTextDto;
    };
    contact: {
      heading: StorefrontLocalizedTextDto;
      body: StorefrontLocalizedTextDto;
    };
    policies: {
      delivery: {
        title: StorefrontLocalizedTextDto;
        body: StorefrontLocalizedTextDto;
      };
      returns: {
        title: StorefrontLocalizedTextDto;
        body: StorefrontLocalizedTextDto;
      };
      privacy: {
        title: StorefrontLocalizedTextDto;
        body: StorefrontLocalizedTextDto;
      };
      terms: {
        title: StorefrontLocalizedTextDto;
        body: StorefrontLocalizedTextDto;
      };
    };
  };
};

export type StorefrontProfileDto = {
  name: string;
  handle: string;
  domain: string | null;
  locale: StorefrontLocale;
  contact: {
    public_email: string | null;
    public_phone: string | null;
    whatsapp_number: string | null;
  };
  branding: {
    logo_url: string | null;
    primary_color: string | null;
    secondary_color: string | null;
    typography_key: "cairo";
  };
  storefront: StorefrontPublishedConfigurationDto | null;
};

export type ConfiguredStorefrontProfileDto = StorefrontProfileDto & {
  storefront: StorefrontPublishedConfigurationDto;
};

export type StorefrontProductCardDto = {
  handle: string;
  title: string;
  subtitle: string | null;
  thumbnail_url: string | null;
  brand?: string | null;
  price_lyd?: number | null;
  compare_at_price_lyd?: number | null;
  badge?: string | null;
  category?: string | null;
};

export type StorefrontProductDetailDto = {
  handle: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  thumbnail_url: string | null;
  image_urls: string[];
  badge?: string | null;
  category?: string | null;
  compare_at_price_lyd?: number | null;
};

export type StorefrontCatalogPageDto = {
  products: StorefrontProductCardDto[];
  count: number;
  offset: number;
  limit: number;
};

export const STOREFRONT_DEFAULT_PAGE_SIZE = 12;
export const STOREFRONT_MAX_PAGE_SIZE = 24;
export const STOREFRONT_MAX_OFFSET = 10_000;

export const STOREFRONT_CATALOG_ORDERS = [
  "title",
  "-title",
  "created_at",
  "-created_at",
] as const;

export type StorefrontCatalogOrder = (typeof STOREFRONT_CATALOG_ORDERS)[number];

export type StorefrontRequestOptions = {
  signal?: AbortSignal;
};

export type StorefrontCommerceCapabilitiesDto = {
  online_checkout: {
    status: "available" | "unavailable";
    currency_code: string | null;
    country_codes: string[];
    payment_methods: StorefrontPaymentMethod[];
  };
};

export type StorefrontPaymentMethod = "cod" | "bank_transfer";

export type StorefrontPurchaseOptionsDto = {
  product_handle: string;
  currency_code: string;
  options: Array<{
    name: "size" | "color";
    values: string[];
  }>;
  variants: Array<{
    id: string;
    title: string;
    options: {
      size: string | null;
      color: string | null;
    };
    unit_price: number;
    available_for_sale: boolean;
  }>;
};

export type StorefrontCartDto = {
  id: string;
  currency_code: string;
  email: string | null;
  items: Array<{
    id: string;
    variant_id: string;
    title: string;
    variant_title?: string | null;
    product_handle?: string | null;
    thumbnail_url: string | null;
    quantity: number;
    unit_price: number;
    total: number;
  }>;
  item_subtotal: number;
  shipping_total: number;
  total: number;
  shipping_method_selected: boolean;
  payment_session_ready: boolean;
  completed: boolean;
};

export type StorefrontShippingOptionDto = {
  id: string;
  name: string;
  amount: number;
};

export type StorefrontCheckoutAddress = {
  email: string;
  first_name: string;
  last_name: string;
  address_1: string;
  city: string;
  country_code: string;
  phone?: string;
};

export type StorefrontOrderConfirmationDto = {
  tracking?: { token: string; expires_at: string };
  display_id: number | string;
  currency_code: string;
  items: Array<{
    title: string;
    variant_title?: string;
    thumbnail_url?: string | null;
    quantity: number;
    unit_price: number;
    total: number;
  }>;
  item_subtotal: number;
  shipping_total: number;
  total: number;
  payment:
    | {
        method: "cod";
        status: "pending_fulfillment";
      }
    | {
        method: "bank_transfer";
        status: "pending_verification";
        bank_transfer: {
          bank_name: string;
          account_holder_name: string;
          account_reference: string;
          instructions: string;
        };
      };
};

export type StorefrontCatalogQuery = StorefrontRequestOptions & {
  limit?: number;
  offset?: number;
  q?: string;
  order?: StorefrontCatalogOrder;
};
