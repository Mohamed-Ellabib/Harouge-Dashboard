import { useEffect, useRef, useState, type CSSProperties } from "react";
import { PiCompass, PiGear, PiHeart, PiHouse, PiHouseFill, PiMapTrifold, PiPackage, PiShoppingCart, PiUser, PiX } from "react-icons/pi";
import { useOptionalCart } from "../../commerce/CartContext";
import { isStorefrontEditorPreviewEnabled, isVisualPreviewEnabled } from "../../config";
import { navigate, useStorefrontLocation } from "../../lib/navigation";
import { isStorefrontNavigationActive, resolvedStorefrontNavigation } from "../../lib/storefront-navigation";
import type { ConfiguredStorefrontProfileDto, StorefrontNavigationKey } from "../../types";
import { useGlowBeautyDesignEditor } from "../glow-beauty/GlowBeautyDesignEditor";
import "./template-6-navigation.css";

const icons = { home: PiHouse, categories: PiCompass, cart: PiShoppingCart, favorites: PiHeart, account: PiUser, orders: PiPackage, settings: PiGear };

export function template6NavigationActive(key: StorefrontNavigationKey, pathname: string, search: string) {
  if (["/", "/store"].includes(pathname) && new URLSearchParams(search).get("category")) return key === "categories";
  if (pathname === "/welcome") return key === "home";
  if (pathname === "/order-confirmation") return key === "cart";
  return isStorefrontNavigationActive(key, pathname);
}

/** Mounted once in the Template 6 app shell, including shared commerce pages. */
export default function Template6Navigation({ profile }: { profile: ConfiguredStorefrontProfileDto }) {
  const english = profile.locale === "en-LY";
  const location = useStorefrontLocation();
  const cart = useOptionalCart();
  const editor = useGlowBeautyDesignEditor();
  const reference = import.meta.env.DEV && isVisualPreviewEnabled() && !isStorefrontEditorPreviewEnabled() && !new URLSearchParams(location.search).has("setup-preview");
  const count = cart?.cart?.items.reduce((total, item) => total + item.quantity, 0) ?? 0;
  const [nearby, setNearby] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (nearby) { trigger.current = document.activeElement as HTMLElement; dialog.current?.showModal(); }
    else { dialog.current?.close(); trigger.current?.focus(); }
  }, [nearby]);
  const items = resolvedStorefrontNavigation(profile);
  if (!items.length) return null;
  return <>
    <div className="six-bottom-dock" dir={english ? "ltr" : "rtl"} lang={english ? "en" : "ar"} style={{ "--six-nav-accent": profile.branding.primary_color || "#eeff66" } as CSSProperties}>
      <nav className="six-bottom-dock__nav" aria-label={english ? "Store navigation" : "التنقل في المتجر"}>
        {items.map(item => {
          // In the standalone design, Nearby is a separate utility and favorites
          // belong to Profile. Published live navigation keeps its own active key.
          const active = reference && (location.pathname === "/favorites" || location.pathname === "/order-details" || location.pathname.startsWith("/order-details/"))
            ? item.key === "account"
            : template6NavigationActive(item.key, location.pathname, location.search);
          const Icon = reference && item.key === "favorites" ? PiMapTrifold : item.key === "home" && active ? PiHouseFill : icons[item.key];
          return <button key={item.key} type="button" aria-label={reference && item.key === "favorites" ? (english ? "Nearby" : "بالقرب منك") : item.label} aria-current={active ? "page" : undefined} className={active ? "is-active" : undefined}
            onClick={() => reference && item.key === "favorites" ? setNearby(true) : navigate(item.to)} {...editor.target(`navigation.${item.key}`, "navigation label")}>
            <Icon aria-hidden="true" />{item.key === "cart" && count > 0 && <span className="six-bottom-dock__badge" aria-label={english ? `${count} items in cart` : `عدد المنتجات في السلة: ${count}`}>{count > 99 ? "99+" : count}</span>}
          </button>;
        })}
      </nav>
    </div>
    <dialog ref={dialog} className="six-nav-dialog" dir={english ? "ltr" : "rtl"} lang={english ? "en" : "ar"} aria-labelledby="six-nav-dialog-title" onCancel={() => setNearby(false)} onClose={() => setNearby(false)}>
      <button type="button" aria-label={english ? "Close nearby" : "إغلاق البحث القريب"} className="six-nav-dialog__close" onClick={() => setNearby(false)}><PiX /></button>
      <h2 id="six-nav-dialog-title">{english ? "Discover nearby" : "اكتشف ما حولك"}</h2><p>{english ? "Location search isn’t connected. Browse this store’s collection without sharing your location." : "البحث بالموقع غير متاح حالياً. تصفّح مجموعة المتجر دون مشاركة موقعك."}</p>
      <button type="button" onClick={() => { setNearby(false); navigate("/categories"); }}>{english ? "Explore categories" : "استكشف الفئات"}</button>
    </dialog>
  </>;
}
