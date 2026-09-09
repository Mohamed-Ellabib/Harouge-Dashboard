import type {
  StorefrontLocale,
  StorefrontLocalizedTextDto,
} from "../types";

export type StorefrontLanguage = "ar" | "en";

export const storefrontLanguage = (
  locale: StorefrontLocale,
): StorefrontLanguage => (locale === "en-LY" ? "en" : "ar");

export const storefrontDirection = (
  locale: StorefrontLocale,
): "ltr" | "rtl" => (locale === "en-LY" ? "ltr" : "rtl");

export const localizedStorefrontText = (
  value: StorefrontLocalizedTextDto,
  locale: StorefrontLocale,
): string => value[storefrontLanguage(locale)];

export const storefrontUiText = (
  locale: StorefrontLocale,
  copy: { ar: string; en: string },
): string => copy[storefrontLanguage(locale)];

export const isEnglishStorefront = (locale: StorefrontLocale): boolean =>
  locale === "en-LY";

