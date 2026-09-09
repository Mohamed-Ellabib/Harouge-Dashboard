import { MedusaError } from "@medusajs/framework/utils";

import { productPriceOrNull } from "./merchant-product-price";

const MAX_VARIANTS = 50;
const MAX_OPTION_VALUE_LENGTH = 60;
const MAX_SKU_LENGTH = 120;
const MAX_STOCK_QUANTITY = 1_000_000_000;

export type NormalizedMerchantVariant = {
  id?: string;
  title: string;
  sku: string | null;
  options: Record<string, string>;
  prices: Array<{ amount: number; currency_code: string }>;
  manage_inventory: true;
  allow_backorder: false;
  stocked_quantity: number;
};

export type NormalizedMerchantVariantInput = {
  options: Array<{ title: "Size" | "Color"; values: string[] }>;
  variants: NormalizedMerchantVariant[];
};

const invalid = (message: string): never => {
  throw new MedusaError(MedusaError.Types.INVALID_DATA, message);
};

const optionValue = (value: unknown, label: string): string => {
  if (typeof value !== "string") {
    return invalid(`${label} is invalid.`);
  }

  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized || normalized.length > MAX_OPTION_VALUE_LENGTH) {
    return invalid(`${label} is invalid.`);
  }

  return normalized;
};

const optionalSku = (value: unknown): string | null => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    return invalid("Variant SKU is invalid.");
  }

  const normalized = value.trim();
  if (!normalized || normalized.length > MAX_SKU_LENGTH) {
    return invalid("Variant SKU is invalid.");
  }

  return normalized;
};

const optionalVariantId = (value: unknown, index: number): string | undefined => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value !== "string") {
    return invalid(`Variant ${index + 1} ID is invalid.`);
  }

  const normalized = value.trim();
  if (!normalized || normalized.length > 200) {
    return invalid(`Variant ${index + 1} ID is invalid.`);
  }

  return normalized;
};

const stockQuantity = (value: unknown, index: number): number => {
  const quantity = typeof value === "string" && value.trim() ? Number(value) : value;

  if (
    typeof quantity !== "number" ||
    !Number.isSafeInteger(quantity) ||
    quantity < 0 ||
    quantity > MAX_STOCK_QUANTITY
  ) {
    return invalid(`Variant ${index + 1} stock is invalid.`);
  }

  return quantity;
};

export const normalizeMerchantProductVariants = (
  value: unknown,
  currencyCode: string,
): NormalizedMerchantVariantInput => {
  if (
    !Array.isArray(value) ||
    value.length < 1 ||
    value.length > MAX_VARIANTS
  ) {
    return invalid(
      "Product variants are required and must be between 1 and 50.",
    );
  }

  const sizes = new Set<string>();
  const colors = new Set<string>();
  const combinations = new Set<string>();
  const skus = new Set<string>();
  const ids = new Set<string>();
  const variants = value.map((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return invalid(`Variant ${index + 1} is invalid.`);
    }

    const candidate = entry as Record<string, unknown>;
    const size = optionValue(candidate.size, `Variant ${index + 1} size`);
    const color = optionValue(candidate.color, `Variant ${index + 1} color`);
    const price = productPriceOrNull(candidate.price, currencyCode);
    const sku = optionalSku(candidate.sku);
    const id = optionalVariantId(candidate.id, index);
    const stockedQuantity = stockQuantity(candidate.stock, index);

    if (price === null) {
      return invalid(`Variant ${index + 1} price is required.`);
    }

    const combination = `${size.toLocaleLowerCase("en-US")}\u0000${color.toLocaleLowerCase("en-US")}`;
    if (combinations.has(combination)) {
      return invalid("Each size and color combination must be unique.");
    }
    combinations.add(combination);

    if (sku) {
      const normalizedSku = sku.toLocaleLowerCase("en-US");
      if (skus.has(normalizedSku)) {
        return invalid("Each variant SKU must be unique within the Product.");
      }
      skus.add(normalizedSku);
    }

    if (id) {
      if (ids.has(id)) {
        return invalid("Each Product variant ID must be unique.");
      }
      ids.add(id);
    }

    sizes.add(size);
    colors.add(color);

    return {
      ...(id ? { id } : {}),
      title: `${size} / ${color}`,
      sku,
      options: { Size: size, Color: color },
      prices: [{ amount: price, currency_code: currencyCode }],
      manage_inventory: true as const,
      allow_backorder: false as const,
      stocked_quantity: stockedQuantity,
    };
  });

  return {
    options: [
      { title: "Size", values: [...sizes] },
      { title: "Color", values: [...colors] },
    ],
    variants,
  };
};
