import type { StorefrontLocale } from "../types";

export const formatStorefrontMoney = (
  amount: number,
  currencyCode: string,
  locale: StorefrontLocale = "ar-LY",
): string =>
  new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyCode.toUpperCase(),
    currencyDisplay: "symbol",
  }).format(amount);
