export type StorefrontProfileDto = {
  name: string;
  handle: string;
  domain: string | null;
  branding: {
    logo_url: string | null;
    primary_color: string | null;
  };
};

export type StorefrontProductCardDto = {
  handle: string;
  title: string;
  subtitle: string | null;
  thumbnail_url: string | null;
};

export type StorefrontProductDetailDto = {
  handle: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  thumbnail_url: string | null;
  image_urls: string[];
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
  };
};

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
  display_id: number | string;
  currency_code: string;
  items: Array<{
    title: string;
    quantity: number;
    unit_price: number;
    total: number;
  }>;
  item_subtotal: number;
  shipping_total: number;
  total: number;
};

export type StorefrontCatalogQuery = StorefrontRequestOptions & {
  limit?: number;
  offset?: number;
  q?: string;
  order?: StorefrontCatalogOrder;
};
