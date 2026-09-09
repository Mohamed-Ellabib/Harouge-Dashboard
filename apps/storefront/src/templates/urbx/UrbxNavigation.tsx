import { PiBag, PiCompass, PiHeart, PiHeartFill, PiHouse, PiHouseFill, PiUser } from "react-icons/pi";
import { isStorefrontEditorPreviewEnabled, isVisualPreviewEnabled } from "../../config";
import { StorefrontLink, useStorefrontLocation } from "../../lib/navigation";
import { resolvedStorefrontNavigation } from "../../lib/storefront-navigation";
import type { ConfiguredStorefrontProfileDto } from "../../types";
import { useGlowBeautyDesignEditor } from "../glow-beauty/GlowBeautyDesignEditor";

export const urbxReferenceNavigation = [
  { key: "home", label: "Home", to: "/" }, { key: "categories", label: "Shop", to: "/categories" },
  { key: "discover", label: "Discover", to: "/about" }, { key: "favorites", label: "Wishlist", to: "/favorites" },
  { key: "account", label: "Profile", to: "/account" },
];

export default function UrbxNavigation({ profile, active }: { profile: ConfiguredStorefrontProfileDto; active: "home" | "categories" | "account" | "favorites" }) {
  const location = useStorefrontLocation();
  const editor = useGlowBeautyDesignEditor();
  const reference = import.meta.env.DEV && isVisualPreviewEnabled() && !isStorefrontEditorPreviewEnabled() && !new URLSearchParams(location.search).has("setup-preview");
  // Published store links remain authoritative. Discover is a design-preview
  // link until a separate navigation-contract change is approved.
  const navigation = reference ? urbxReferenceNavigation : resolvedStorefrontNavigation(profile);
  const icon = (key: string) => key === "home" ? active === "home" ? <PiHouseFill /> : <PiHouse /> : key === "favorites" ? active === "favorites" ? <PiHeartFill /> : <PiHeart /> : key === "account" || key === "settings" ? <PiUser /> : key === "discover" ? <PiCompass /> : <PiBag />;
  return <nav className="urbx-home__bottom-nav" aria-label="Store navigation" style={{ gridTemplateColumns: `repeat(${navigation.length || 1}, minmax(0, 1fr))` }}>
    {navigation.map(item => <StorefrontLink key={item.key} to={item.to} className={item.key === active ? "is-active" : undefined} ariaLabel={item.key === active ? `${item.label}, current page` : item.label}>
      {icon(item.key)}<span {...editor.target(`navigation.${item.key}`, "navigation label")}>{item.label.toUpperCase()}</span>
    </StorefrontLink>)}
  </nav>;
}
