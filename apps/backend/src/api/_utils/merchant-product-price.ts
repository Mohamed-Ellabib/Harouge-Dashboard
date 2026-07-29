import { MedusaError } from "@medusajs/framework/utils";

import type { CheckoutScopeInput } from "./checkout-ownership-links";
import { resolveStoreCommerceConfiguration } from "./checkout-store-policy";

const invalid = (message: string) =>
  new MedusaError(MedusaError.Types.INVALID_DATA, message);

export const resolveMerchantProductCurrency = async (
  input: CheckoutScopeInput,
  medusaStoreId: string,
  suppliedCurrency?: unknown,
): Promise<string> => {
  const commerce = await resolveStoreCommerceConfiguration(
    input,
    medusaStoreId,
  );

  if (suppliedCurrency !== undefined) {
    if (
      typeof suppliedCurrency !== "string" ||
      suppliedCurrency.trim().toLowerCase() !== commerce.currencyCode
    ) {
      throw invalid("Product currency must match the Store currency.");
    }
  }

  return commerce.currencyCode;
};

export const productPriceOrNull = (
  value: unknown,
  currencyCode: string,
): number | null => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const amount =
    typeof value === "number" ? value : Number(String(value).replace(",", "."));
  const fractionDigits =
    new Intl.NumberFormat("en", {
      style: "currency",
      currency: currencyCode.toUpperCase(),
    }).resolvedOptions().maximumFractionDigits ?? 2;
  const scale = 10 ** fractionDigits;
  const scaledAmount = amount * scale;

  if (
    !Number.isFinite(amount) ||
    amount < 0 ||
    amount > 1_000_000_000 ||
    !Number.isSafeInteger(Math.round(scaledAmount)) ||
    Math.abs(scaledAmount - Math.round(scaledAmount)) > 1e-7
  ) {
    throw invalid(
      `Product price must be a bounded non-negative ${currencyCode.toUpperCase()} amount with at most ${fractionDigits} decimal places.`,
    );
  }

  return amount;
};
