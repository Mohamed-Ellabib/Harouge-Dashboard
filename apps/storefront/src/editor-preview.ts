import { mapStorefrontProfileResponse } from "./api/storefront-api";
import { isStorefrontEditorPreviewEnabled } from "./config";
import {
  clearStorefrontEditorPreviewSnapshot,
  setStorefrontEditorPreviewSnapshot,
  type StorefrontEditorPreviewProduct,
} from "./editor-preview-state";
import type { StorefrontProfileDto, StorefrontPurchaseOptionsDto } from "./types";

export const STOREFRONT_EDITOR_PREVIEW_MESSAGE =
  "labibtech:storefront-editor-preview" as const;
export const STOREFRONT_EDITOR_PREVIEW_READY_MESSAGE =
  "labibtech:storefront-editor-preview-ready" as const;

const CHANNEL = /^[a-zA-Z0-9-]{16,100}$/;

const channelFromLocation = (): string | null => {
  if (typeof window === "undefined") return null;
  const value = new URLSearchParams(window.location.search).get("channel") ?? "";
  return CHANNEL.test(value) ? value : null;
};

export const allowedStorefrontEditorOrigins = (
  configuredOrigin: string | undefined,
  development: boolean,
): string[] => {
  const candidates = [configuredOrigin?.trim() ?? ""];
  if (development) {
    candidates.push(
      "http://127.0.0.1:5174",
      "http://localhost:5174",
      "http://127.0.0.1:5177",
      "http://localhost:5177",
    );
  }

  return [...new Set(candidates.flatMap((candidate) => {
    if (!candidate) return [];
    try {
      const url = new URL(candidate);
      return ["http:", "https:"].includes(url.protocol) &&
        !url.username &&
        !url.password
        ? [url.origin]
        : [];
    } catch {
      return [];
    }
  }))];
};

export const parseStorefrontEditorPreviewProfile = (
  value: unknown,
): StorefrontProfileDto | null => {
  try {
    return mapStorefrontProfileResponse({ vendor: value });
  } catch {
    return null;
  }
};

const text = (
  value: unknown,
  maximum: number,
  required = false,
): string | null | undefined => {
  if ((value === null || value === undefined) && !required) return null;
  return typeof value === "string" &&
    value.length <= maximum &&
    !/[\u0000-\u001f\u007f<>]/u.test(value) &&
    (!required || value.trim())
    ? value.trim() || null
    : undefined;
};

const amount = (value: unknown): number | null | undefined =>
  value === null
    ? null
    : typeof value === "number" && Number.isFinite(value) && value >= 0
      ? value
      : undefined;

const assetUrl = (value: unknown): string | null | undefined => {
  if (value === null) return null;
  if (typeof value !== "string" || !value || value.length > 2_048) return undefined;
  if (
    value.startsWith("/assets/") ||
    value.startsWith("/static/") ||
    value.startsWith("/customer-assets/")
  ) {
    return value.includes("..") || /[?#\\\u0000-\u001f]/u.test(value)
      ? undefined
      : value;
  }
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
};

export const parseStorefrontEditorPreviewCatalog = (value: unknown): StorefrontEditorPreviewProduct[] | null => {
  if (!Array.isArray(value) || value.length > 24) return null;
  const products: StorefrontEditorPreviewProduct[] = [];
  const handles = new Set<string>();
  for (const entry of value) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
    const source = entry as Record<string, unknown>;
    const handle = text(source.handle, 80, true);
    const title = text(source.title, 255, true);
    const subtitle = text(source.subtitle, 255);
    const description = text(source.description, 10_000);
    const thumbnail = assetUrl(source.thumbnail_url);
    const price = amount(source.price_lyd);
    const compareAt = amount(source.compare_at_price_lyd);
    const category = text(source.category, 80);
    const badge = text(source.badge, 40);
    if (
      typeof handle !== "string" ||
      typeof title !== "string" ||
      subtitle === undefined ||
      description === undefined ||
      thumbnail === undefined ||
      price === undefined ||
      compareAt === undefined ||
      category === undefined ||
      badge === undefined ||
      handles.has(handle) ||
      !Array.isArray(source.image_urls) ||
      source.image_urls.length > 12 ||
      !Array.isArray(source.options) ||
      source.options.length > 2 ||
      !Array.isArray(source.variants) ||
      source.variants.length > 50
    ) return null;
    handles.add(handle);
    const imageUrls = source.image_urls.map(assetUrl);
    if (imageUrls.some((url) => typeof url !== "string")) return null;
    const options: StorefrontPurchaseOptionsDto["options"] = [];
    for (const option of source.options) {
      if (!option || typeof option !== "object" || Array.isArray(option)) return null;
      const candidate = option as Record<string, unknown>;
      if (
        !["size", "color"].includes(String(candidate.name)) ||
        !Array.isArray(candidate.values) ||
        !candidate.values.length ||
        candidate.values.length > 50
      ) return null;
      const values = candidate.values.map((item) => text(item, 80, true));
      if (values.some((item) => typeof item !== "string")) return null;
      options.push({
        name: candidate.name as "size" | "color",
        values: values as string[],
      });
    }
    const variants: StorefrontPurchaseOptionsDto["variants"] = [];
    for (const variant of source.variants) {
      if (!variant || typeof variant !== "object" || Array.isArray(variant)) return null;
      const candidate = variant as Record<string, unknown>;
      const id = text(candidate.id, 255, true);
      const variantTitle = text(candidate.title, 255, true);
      const unitPrice = amount(candidate.unit_price);
      const rawOptions = candidate.options;
      if (
        typeof id !== "string" ||
        typeof variantTitle !== "string" ||
        typeof unitPrice !== "number" ||
        typeof candidate.available_for_sale !== "boolean" ||
        !rawOptions ||
        typeof rawOptions !== "object" ||
        Array.isArray(rawOptions)
      ) return null;
      const size = text((rawOptions as Record<string, unknown>).size, 80);
      const color = text((rawOptions as Record<string, unknown>).color, 80);
      if (size === undefined || color === undefined) return null;
      variants.push({
        id,
        title: variantTitle,
        options: {
          size: typeof size === "string" ? size : null,
          color: typeof color === "string" ? color : null,
        },
        unit_price: unitPrice,
        available_for_sale: candidate.available_for_sale,
      });
    }
    products.push({
      handle,
      title,
      subtitle,
      description,
      thumbnail_url: thumbnail,
      image_urls: imageUrls as string[],
      price_lyd: price,
      compare_at_price_lyd: compareAt,
      category,
      badge,
      purchase: {
        product_handle: handle,
        currency_code: "lyd",
        options,
        variants,
      },
    });
  }
  return products;
};

export const subscribeToStorefrontEditorPreview = (
  onProfile: (profile: StorefrontProfileDto) => void,
): (() => void) => {
  if (!isStorefrontEditorPreviewEnabled() || window.parent === window) {
    return () => undefined;
  }

  const channel = channelFromLocation();
  const allowedOrigins = allowedStorefrontEditorOrigins(
    import.meta.env.VITE_PLATFORM_ADMIN_ORIGIN,
    import.meta.env.DEV,
  );
  if (!channel || allowedOrigins.length === 0) return () => undefined;

  const allowed = new Set(allowedOrigins);
  const receive = (event: MessageEvent<unknown>) => {
    if (event.source !== window.parent || !allowed.has(event.origin)) return;
    if (!event.data || typeof event.data !== "object") return;

    const message = event.data as Record<string, unknown>;
    if (
      message.type !== STOREFRONT_EDITOR_PREVIEW_MESSAGE ||
      message.version !== 1 ||
      message.channel !== channel
    ) {
      return;
    }

    const profile = parseStorefrontEditorPreviewProfile(message.profile);
    const catalog = parseStorefrontEditorPreviewCatalog(message.catalog);
    if (
      profile?.storefront &&
      catalog &&
      typeof message.commerce_available === "boolean"
    ) {
      setStorefrontEditorPreviewSnapshot({
        products: catalog,
        commerceAvailable: message.commerce_available,
      });
      onProfile(profile);
    }
  };

  window.addEventListener("message", receive);
  for (const origin of allowedOrigins) {
    window.parent.postMessage(
      {
        type: STOREFRONT_EDITOR_PREVIEW_READY_MESSAGE,
        version: 1,
        channel,
      },
      origin,
    );
  }

  return () => {
    window.removeEventListener("message", receive);
    clearStorefrontEditorPreviewSnapshot();
  };
};
