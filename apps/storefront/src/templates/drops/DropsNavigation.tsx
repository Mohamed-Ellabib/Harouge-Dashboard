import { GiRunningShoe } from "react-icons/gi";
import { IoSearchOutline, IoHeartOutline, IoPersonOutline, IoBagHandleOutline } from "react-icons/io5";
import { navigate } from "../../lib/navigation";
import { resolvedStorefrontNavigation, isStorefrontNavigationActive } from "../../lib/storefront-navigation";
import type { StorefrontProfileDto } from "../../types";

export function DropsNavigation({ profile }: { profile: StorefrontProfileDto }) {
  return <nav className="drops-bottom-nav" aria-label="Store navigation">
    {resolvedStorefrontNavigation(profile).map(item => {
      const active = isStorefrontNavigationActive(item.key, window.location.pathname);
      const Icon = item.key === "home" ? GiRunningShoe : item.key === "categories" ? IoSearchOutline : item.key === "favorites" ? IoHeartOutline : item.key === "cart" || item.key === "orders" ? IoBagHandleOutline : IoPersonOutline;
      return <button key={item.key} type="button" className={active ? "is-active" : ""} aria-label={item.label} title={item.label} data-glow-edit={`navigation.${item.key}`} aria-current={active ? "page" : undefined} onClick={() => navigate(item.to)}><Icon aria-hidden="true" /></button>;
    })}
  </nav>;
}
