import { useCart } from "../../commerce/CartContext";
import { HeartIcon, SearchIcon } from "../../components/Icons";
import { storefrontUiText } from "../../lib/localization";
import { navigate, StorefrontLink } from "../../lib/navigation";
import {
  isStorefrontNavigationActive,
  resolvedStorefrontNavigation,
} from "../../lib/storefront-navigation";
import type { ConfiguredStorefrontProfileDto } from "../../types";

import "./reference-source/src/index.css";

const ShoppingBagIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <path d="M5 8h14l-1 12H6L5 8Z" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9 9V6a3 3 0 0 1 6 0v3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const LuxeFullStoreHeader = ({
  onSearch,
  pathname,
  profile,
}: {
  onSearch?: () => void;
  pathname: string;
  profile: ConfiguredStorefrontProfileDto;
}) => {
  const { cart, restoring } = useCart();
  const ui = (ar: string, en: string) => storefrontUiText(profile.locale, { ar, en });
  const cartCount = cart?.items.reduce((sum, line) => sum + line.quantity, 0) ?? 0;
  const logo = profile.branding.logo_url ?? "/customer-assets/store-header-logo.png";
  const navigationItems = resolvedStorefrontNavigation(profile);

  return (
    <header className="customer-header" aria-label={ui("التنقل الرئيسي", "Primary navigation")}>
      <div className="customer-home__lane customer-header__inner">
        <StorefrontLink className="customer-header__hamburger" to="/favorites" ariaLabel={ui("المفضلة", "Favorites")}>
          <HeartIcon />
        </StorefrontLink>
        <StorefrontLink className="customer-header__brand" to="/store" ariaLabel={profile.name}>
          <img className="customer-header__brand-logo" src={logo} alt={profile.name} />
        </StorefrontLink>

        <nav className="customer-header__nav" aria-label={ui("روابط المتجر", "Store links")}>
          {navigationItems.map((item) => (
            <StorefrontLink
              className={isStorefrontNavigationActive(item.key, pathname) ? "is-active" : undefined}
              key={item.key}
              to={item.to}
            >
              {item.label}
            </StorefrontLink>
          ))}
        </nav>

        <div className="customer-header__actions" aria-label={ui("أدوات المتجر", "Store tools")}>
          <button type="button" aria-label={ui("بحث", "Search")} onClick={onSearch ?? (() => navigate("/products"))}><SearchIcon /></button>
          <StorefrontLink className="customer-header__wishlist" to="/favorites" ariaLabel={ui("المفضلة", "Favorites")}><HeartIcon /></StorefrontLink>
          <StorefrontLink className="customer-header__cart" to="/cart" ariaLabel={ui("السلة", "Cart")}>
            <ShoppingBagIcon />
            <span>{restoring ? "…" : cartCount}</span>
          </StorefrontLink>
        </div>
      </div>
    </header>
  );
};
