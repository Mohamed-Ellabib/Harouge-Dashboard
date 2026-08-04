import {
  getStorefrontRequestConfig,
  isVisualPreviewEnabled,
  StorefrontConfigurationError,
} from "../config";
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
  type StorefrontProductCardDto,
  type StorefrontProductDetailDto,
  type StorefrontProfileDto,
  type StorefrontPurchaseOptionsDto,
  type StorefrontRequestOptions,
  type StorefrontShippingOptionDto,
} from "../types";

const CATALOG_PRODUCT_PRESENTATION_FIELDS = "handle,title,subtitle,thumbnail";
const DETAIL_PRODUCT_PRESENTATION_FIELDS =
  "handle,title,subtitle,description,thumbnail,images.url";
const MAX_HANDLE_LENGTH = 200;
const MAX_NAME_LENGTH = 180;
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

export type StorefrontApiErrorCode =
  | "aborted"
  | "configuration"
  | "invalid_request"
  | "invalid_response"
  | "not_found"
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

const branding = (value: unknown): StorefrontProfileDto["branding"] => {
  if (!isRecord(value)) {
    throw new StorefrontApiError("invalid_response");
  }

  const logoUrl = publicAssetUrl(value.logo_url);
  const primaryColor =
    value.primary_color === null || value.primary_color === undefined
      ? null
      : normalizeHexColor(value.primary_color);

  if (
    value.primary_color !== null &&
    value.primary_color !== undefined &&
    !primaryColor
  ) {
    throw new StorefrontApiError("invalid_response");
  }

  return {
    logo_url: logoUrl,
    primary_color: primaryColor,
  };
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
    branding: branding(payload.vendor.branding),
  };
};

const mapProductCard = (value: unknown): StorefrontProductCardDto => {
  if (!isRecord(value)) {
    throw new StorefrontApiError("invalid_response");
  }

  return {
    handle: requiredHandle(value.handle),
    title: inlineText(value.title, MAX_TITLE_LENGTH, true) as string,
    subtitle: inlineText(value.subtitle, MAX_SUBTITLE_LENGTH, false),
    thumbnail_url: publicAssetUrl(value.thumbnail),
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
      payload.online_checkout.country_codes.length !== 0
    ) {
      throw new StorefrontApiError("invalid_response");
    }
    return {
      online_checkout: {
        status: "unavailable",
        currency_code: null,
        country_codes: [],
      },
    };
  }

  if (
    status !== "available" ||
    !Array.isArray(payload.online_checkout.country_codes) ||
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

  return {
    online_checkout: {
      status: "available",
      currency_code: currencyCode(payload.online_checkout.currency_code),
      country_codes: countries,
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
    if (!isRecord(rawVariant) || rawVariant.available_for_sale !== true) {
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
      available_for_sale: true as const,
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

  return {
    display_id: displayId,
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
        quantity,
        unit_price: unitPrice,
        total: safeAmount(lineTotal),
      };
    }),
    item_subtotal: safeAmount(order.item_subtotal ?? 0),
    shipping_total: safeAmount(order.shipping_total ?? 0),
    total: safeAmount(order.total ?? 0),
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

  if (import.meta.env.DEV && isVisualPreviewEnabled()) {
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

  if (import.meta.env.DEV && isVisualPreviewEnabled()) {
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

  if (import.meta.env.DEV && isVisualPreviewEnabled()) {
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
  if (import.meta.env.DEV && isVisualPreviewEnabled()) {
    return {
      online_checkout: {
        status: "unavailable",
        currency_code: null,
        country_codes: [],
      },
    };
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

export const createStorefrontCart = async (
  expectedCurrency: string,
  options: StorefrontRequestOptions = {},
): Promise<StorefrontCartDto> => {
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
  if (
    !Number.isSafeInteger(quantity) ||
    quantity < 1 ||
    quantity > STOREFRONT_MAX_CART_QUANTITY
  ) {
    throw new StorefrontApiError("invalid_request");
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
  if (
    !Number.isSafeInteger(quantity) ||
    quantity < 1 ||
    quantity > STOREFRONT_MAX_CART_QUANTITY
  ) {
    throw new StorefrontApiError("invalid_request");
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
  const email = checkoutText(address.email, 320, true) as string;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) {
    throw new StorefrontApiError("invalid_request");
  }
  const countryCode = address.country_code.trim().toLowerCase();
  if (!/^[a-z]{2}$/.test(countryCode)) {
    throw new StorefrontApiError("invalid_request");
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
): Promise<StorefrontOrderConfirmationDto> => {
  const payload = await fetchUnknown(
    `/store/carts/${encodeURIComponent(requestId(cartId))}/complete`,
    undefined,
    { method: "POST", body: {} },
  );
  return mapStorefrontOrderConfirmationResponse(payload, expectedCurrency);
};

export {
  CATALOG_PRODUCT_PRESENTATION_FIELDS,
  DETAIL_PRODUCT_PRESENTATION_FIELDS,
};
