import type {
  StorefrontLocale,
  StorefrontNavigationKey,
  StorefrontProfileDto,
} from "../types";

export type ResolvedStorefrontNavigationItem = {
  key: StorefrontNavigationKey;
  label: string;
  to: string;
};

export const defaultStorefrontNavigationItems = (): NonNullable<
  StorefrontProfileDto["storefront"]
>["content"]["navigation"]["items"] => [
  { key: "home", label: { ar: "الرئيسية", en: "Main" }, enabled: true },
  { key: "categories", label: { ar: "التصنيفات", en: "Categories" }, enabled: true },
  { key: "favorites", label: { ar: "المفضلة", en: "Favorites" }, enabled: false },
  { key: "cart", label: { ar: "السلة", en: "Cart" }, enabled: false },
  { key: "account", label: { ar: "الحساب", en: "Account" }, enabled: false },
  { key: "orders", label: { ar: "الطلبات", en: "Orders" }, enabled: false },
  { key: "settings", label: { ar: "الإعدادات", en: "Settings" }, enabled: false },
];

const ROUTES: Record<Exclude<StorefrontNavigationKey, "home">, string> = {
  categories: "/products",
  favorites: "/favorites",
  cart: "/cart",
  account: "/account",
  orders: "/orders",
  settings: "/account/settings",
};

export const storefrontNavigationRoute = (
  key: StorefrontNavigationKey,
  fullSource = false,
): string => key === "home" && fullSource
  ? "/store"
  : key === "categories" && fullSource
    ? "/watches"
    : key === "home"
      ? "/"
      : ROUTES[key];

export const storefrontNavigationLabel = (
  label: { ar: string; en: string },
  locale: StorefrontLocale,
): string => locale === "en-LY" ? label.en : label.ar;

export const resolvedStorefrontNavigation = (
  profile: StorefrontProfileDto,
): ResolvedStorefrontNavigationItem[] => {
  const fullSource = profile.storefront?.template_key === "luxe-commerce-full";
  const items = profile.storefront?.content?.navigation?.items
    ?? defaultStorefrontNavigationItems();
  return items
    .filter((item) => item.enabled)
    .map((item) => ({
      key: item.key,
      label: storefrontNavigationLabel(item.label, profile.locale),
      to: item.key === "categories" && ["glow-beauty", "drops", "urbx", "template-6"].includes(profile.storefront?.template_key ?? "") ? "/categories" : storefrontNavigationRoute(item.key, fullSource),
    }));
};

export const isStorefrontNavigationActive = (
  key: StorefrontNavigationKey,
  pathname: string,
): boolean => {
  if (key === "home") return pathname === "/" || pathname === "/store";
  if (key === "categories") {
    return pathname === "/categories" || pathname === "/products"
      || pathname.startsWith("/products/")
      || pathname === "/watches"
      || pathname === "/sunglasses"
      || pathname === "/pens"
      || pathname === "/offers"
      || pathname === "/best-sellers"
      || pathname.startsWith("/brands/");
  }
  if (key === "account") return pathname === "/account";
  if (key === "settings") return pathname === "/account/settings";
  if (key === "cart") return pathname === "/cart" || pathname === "/checkout";
  if (key === "orders") {
    return pathname === "/orders"
      || pathname.startsWith("/orders/")
      || pathname.startsWith("/order-details/");
  }
  return pathname === ROUTES[key];
};
