import {
  IoBagHandleOutline,
  IoHeartOutline,
  IoHeartSharp,
  IoHome,
  IoHomeOutline,
  IoPersonOutline,
  IoSearchOutline,
} from "react-icons/io5";

import { navigate } from "../../lib/navigation";
import { resolvedStorefrontNavigation, isStorefrontNavigationActive } from "../../lib/storefront-navigation";
import { useTemplateProfile } from "../TemplateProfileContext";

export const standardRoute = (pathname: string) => {
  if (typeof window === "undefined") return pathname;
  if (/^https:\/\//i.test(pathname) || pathname.startsWith("#")) return pathname;
  const [path, existingSearch = ""] = pathname.split("?", 2);
  const current = new URLSearchParams(window.location.search);
  const preview = new URLSearchParams(existingSearch);
  for (const key of ["preview", "editor-preview", "template", "locale", "channel", "setup-preview", "design-editor"]) {
    const value = current.get(key);
    if (value) preview.set(key, value);
  }
  return preview.size ? `${path}?${preview.toString()}` : path;
};

export function StandardMobileNavigation({ pathname }: { pathname: string }) {
  const profile = useTemplateProfile();
  const items = profile ? resolvedStorefrontNavigation(profile) : [
    { key: "home" as const, label: "Home", to: "/" },
    { key: "categories" as const, label: "Search", to: "/products" },
    { key: "cart" as const, label: "Cart", to: "/cart" },
    { key: "favorites" as const, label: "Saved", to: "/favorites" },
    { key: "account" as const, label: "Profile", to: "/account" },
  ];

  return <nav className="standard-mobile-nav" aria-label="Store navigation" dir="ltr"
    style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
    {items.map(item => {
      const active = isStorefrontNavigationActive(item.key, pathname);
      const Icon = item.key === "home" ? (active ? IoHome : IoHomeOutline)
        : item.key === "categories" ? IoSearchOutline
        : item.key === "favorites" ? (active ? IoHeartSharp : IoHeartOutline)
        : item.key === "cart" || item.key === "orders" ? IoBagHandleOutline : IoPersonOutline;
      return <button key={item.key} data-glow-edit={`navigation.${item.key}`}
        className={item.key === "cart" ? "standard-mobile-nav__cart" : undefined}
        type="button" aria-label={item.label} aria-current={active ? "page" : undefined}
        onClick={() => navigate(standardRoute(item.to))}>
        <Icon aria-hidden="true" />
        {item.key !== "cart" && <span>{item.label}</span>}
      </button>;
    })}
  </nav>;
}
