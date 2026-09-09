import {
  IoGridOutline,
  IoHeartOutline,
  IoHome,
  IoPersonOutline,
} from "react-icons/io5";
import { PiBagSimple } from "react-icons/pi";

import { useOptionalCart } from "../../commerce/CartContext";
import { useOptionalFavorites } from "../../commerce/FavoritesContext";
import { StorefrontLink } from "../../lib/navigation";
import {
  isStorefrontNavigationActive,
  resolvedStorefrontNavigation,
} from "../../lib/storefront-navigation";
import type {
  StorefrontNavigationKey,
  StorefrontProfileDto,
} from "../../types";
import "./glow-beauty-chrome.css";
import { useGlowBeautyDesignEditor } from "./GlowBeautyDesignEditor";

const previewQuery = "preview=1&template=glow-beauty";

const navigation = [
  { key: "home", label: "Home", href: `/?${previewQuery}`, icon: <IoHome /> },
  { key: "categories", label: "Categories", href: `/categories?${previewQuery}`, icon: <IoGridOutline /> },
  { key: "wishlist", label: "Wishlist", href: `/favorites?${previewQuery}`, icon: <IoHeartOutline /> },
  { key: "orders", label: "Orders", href: `/orders?${previewQuery}`, icon: <PiBagSimple /> },
  { key: "profile", label: "Profile", href: `/?${previewQuery}#profile`, icon: <IoPersonOutline /> },
] as const;

export function GlowBeautyStatusBar({ preview = true }: { preview?: boolean } = {}) {
  void preview;
  return null;
}

const iconForNavigationKey = (key: StorefrontNavigationKey) => {
  if (key === "home") return <IoHome />;
  if (key === "categories") return <IoGridOutline />;
  if (key === "favorites") return <IoHeartOutline />;
  if (key === "cart" || key === "orders") return <PiBagSimple />;
  return <IoPersonOutline />;
};

export function GlowBeautyBottomNav({
  pathname = "/",
  profile,
}: {
  pathname?: string;
  profile?: StorefrontProfileDto;
}) {
  const cartContext = useOptionalCart();
  const favoritesContext = useOptionalFavorites();
  const design = useGlowBeautyDesignEditor();

  if (profile) {
    const cartCount = cartContext?.cart?.items.reduce(
      (total, item) => total + item.quantity,
      0,
    ) ?? 0;
    const favoritesCount = favoritesContext?.favorites.length ?? 0;

    return (
      <nav className="glow-beauty-bottom-nav" aria-label="Store navigation" dir={profile.locale === "ar-LY" ? "rtl" : "ltr"}
        style={{ gridTemplateColumns: `repeat(${resolvedStorefrontNavigation(profile).length}, minmax(0, 1fr))` }}>
        {resolvedStorefrontNavigation(profile).map((item) => {
          const count = item.key === "favorites"
            ? favoritesCount
            : item.key === "cart"
              ? cartCount
              : 0;
          const active = isStorefrontNavigationActive(item.key, pathname);
          return (
            <StorefrontLink
              key={item.key}
              className={active ? "is-active" : undefined}
              to={item.to}
            >
              <span>
                {iconForNavigationKey(item.key)}
                {count ? <b>{count}</b> : null}
              </span>
              <span className="glow-beauty-nav-label" {...design.target(`navigation.${item.key}`, `${item.label} navigation label`)}>{item.label}</span>
            </StorefrontLink>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="glow-beauty-bottom-nav" aria-label="Store navigation" dir="ltr">
      {navigation.map((item) => {
        const key = item.key === "wishlist" ? "favorites" : item.key === "profile" ? "account" : item.key;
        const active = isStorefrontNavigationActive(key, pathname);
        return (
        <a
          key={item.key}
          className={active ? "is-active" : ""}
          href={item.href}
          aria-current={active ? "page" : undefined}
        >
          <span>
            {item.icon}
          </span>
          <span className="glow-beauty-nav-label" {...design.target(`navigation.${item.key === "wishlist" ? "favorites" : item.key === "profile" ? "account" : item.key}`, `${item.label} navigation label`)}>{design.value(`navigation.${item.key === "wishlist" ? "favorites" : item.key === "profile" ? "account" : item.key}`, item.label)}</span>
        </a>
      ); })}
    </nav>
  );
}
