import { MedusaError } from "@medusajs/framework/utils";

const MAX_PRODUCT_IMAGES = 12;
const MAX_IMAGE_URL_LENGTH = 2_048;

export type MerchantProductImageInput = {
  id?: string;
  url: string;
};

const invalid = (message: string): never => {
  throw new MedusaError(MedusaError.Types.INVALID_DATA, message);
};

const imageUrl = (value: unknown, index: number): string => {
  if (typeof value !== "string") {
    return invalid(`Product image ${index + 1} URL is invalid.`);
  }

  const normalized = value.trim();
  if (!normalized || normalized.length > MAX_IMAGE_URL_LENGTH) {
    return invalid(`Product image ${index + 1} URL is invalid.`);
  }

  if (!normalized.startsWith("/")) {
    let parsed: URL;
    try {
      parsed = new URL(normalized);
    } catch {
      return invalid(`Product image ${index + 1} URL is invalid.`);
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return invalid(`Product image ${index + 1} URL is invalid.`);
    }
  }

  return normalized;
};

export const normalizeMerchantProductImages = (
  value: unknown,
  allowedImageIds: Set<string> = new Set(),
): MerchantProductImageInput[] => {
  if (!Array.isArray(value) || value.length > MAX_PRODUCT_IMAGES) {
    return invalid("Product images must be an array of at most 12 images.");
  }

  const ids = new Set<string>();
  const urls = new Set<string>();

  return value.map((entry, index) => {
    const candidate =
      typeof entry === "string"
        ? { url: entry }
        : entry && typeof entry === "object" && !Array.isArray(entry)
          ? (entry as Record<string, unknown>)
          : invalid(`Product image ${index + 1} is invalid.`);
    const url = imageUrl(candidate.url, index);
    const id = candidate.id;

    if (urls.has(url)) {
      return invalid("Each Product image URL must be unique.");
    }
    urls.add(url);

    if (id !== undefined) {
      if (
        typeof id !== "string" ||
        !allowedImageIds.has(id) ||
        ids.has(id)
      ) {
        return invalid(`Product image ${index + 1} ID is invalid.`);
      }
      ids.add(id);
      return { id, url };
    }

    return { url };
  });
};

export const merchantImageUrlOrNull = (value: unknown): string | null => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  return imageUrl(value, 0);
};
