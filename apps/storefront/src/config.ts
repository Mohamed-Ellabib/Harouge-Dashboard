const PUBLISHABLE_KEY_MAX_LENGTH = 512;
const HANDLE_MAX_LENGTH = 80;

const publicKeyIsValid = (value: string): boolean =>
  value.length > 0 &&
  value.length <= PUBLISHABLE_KEY_MAX_LENGTH &&
  /^[a-zA-Z0-9._-]+$/.test(value);

const developmentHandle = (): string | null => {
  if (!import.meta.env.DEV) {
    return null;
  }

  const value = String(import.meta.env.VITE_STOREFRONT_DEV_HANDLE ?? "")
    .trim()
    .toLowerCase();

  if (!value) {
    return null;
  }

  if (
    value.length > HANDLE_MAX_LENGTH ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
  ) {
    throw new StorefrontConfigurationError();
  }

  return value;
};

export class StorefrontConfigurationError extends Error {
  readonly code = "configuration" as const;

  constructor() {
    super("تعذّر إعداد واجهة المتجر.");
    this.name = "StorefrontConfigurationError";
  }
}

export const STOREFRONT_REQUEST_TIMEOUT_MS = 8_000;

export const isStorefrontEditorPreviewEnabled = (): boolean =>
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).get("editor-preview") === "1";

/**
 * Template preview data never resolves a tenant and never writes commerce
 * state. The general visual fixture remains development-only; the isolated
 * editor iframe is also available in production so an authenticated admin can
 * render an unsaved draft without publishing or putting it in a URL.
 */
export const isVisualPreviewEnabled = (): boolean =>
  isStorefrontEditorPreviewEnabled() ||
  (import.meta.env.DEV &&
    (import.meta.env.VITE_STOREFRONT_VISUAL_PREVIEW === "true" ||
      (typeof window !== "undefined" &&
        new URLSearchParams(window.location.search).get("preview") === "1")));

/** A direct development preview still uses the canonical Standard renderer. */
export const isStandardTemplatePreviewEnabled = (): boolean =>
  import.meta.env.DEV &&
  !isStorefrontEditorPreviewEnabled() &&
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).get("preview") === "1" &&
  new URLSearchParams(window.location.search).get("template") === "standard";

export type StorefrontRequestConfig = {
  publishableKey: string;
  developmentStoreHandle: string | null;
  timeoutMs: number;
};

export const getStorefrontRequestConfig = (): StorefrontRequestConfig => {
  const publishableKey = String(
    import.meta.env.VITE_MEDUSA_PUBLISHABLE_KEY ?? "",
  ).trim();

  if (!publicKeyIsValid(publishableKey)) {
    throw new StorefrontConfigurationError();
  }

  return {
    publishableKey,
    developmentStoreHandle: developmentHandle(),
    timeoutMs: STOREFRONT_REQUEST_TIMEOUT_MS,
  };
};
