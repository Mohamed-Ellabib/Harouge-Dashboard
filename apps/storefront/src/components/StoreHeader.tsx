import { useEffect, useState, type FormEvent } from "react";

import { useCart } from "../commerce/CartContext";
import { useFavorites } from "../commerce/FavoritesContext";
import {
  isLuxeCommerceTemplate,
  type StorefrontProfileDto,
} from "../types";
import {
  navigate,
  StorefrontLink,
  type StorefrontLocation,
} from "../lib/navigation";
import {
  isStorefrontNavigationActive,
  resolvedStorefrontNavigation,
} from "../lib/storefront-navigation";
import { BrandMark } from "./BrandMark";
import { CartIcon, CloseIcon, GlassesIcon, HeartIcon, HomeIcon, MenuIcon, PenIcon, SearchIcon, UserIcon, WatchIcon } from "./Icons";

type StoreHeaderProps = {
  profile: StorefrontProfileDto;
  location: StorefrontLocation;
};

const currentSearch = (search: string): string =>
  new URLSearchParams(search).get("q")?.slice(0, 120) ?? "";

export const StoreHeader = ({ profile, location }: StoreHeaderProps) => {
  const { capability, cart } = useCart();
  const { favorites } = useFavorites();
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState(() => currentSearch(location.search));
  const [logoFailed, setLogoFailed] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
    setQuery(currentSearch(location.search));
  }, [location.pathname, location.search]);

  useEffect(() => setLogoFailed(false), [profile.branding.logo_url]);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = query.trim().slice(0, 120);
    const search = new URLSearchParams();
    if (trimmed) search.set("q", trimmed);
    setMenuOpen(false);
    navigate(`/products${search.size ? `?${search.toString()}` : ""}`);
  };

  const fullSource =
    profile.storefront?.template_key === "luxe-commerce-full";
  const onHome = location.pathname === "/" || (fullSource && location.pathname === "/store");
  const english = profile.locale === "en-LY";
  const cartCount =
    cart?.items.reduce((total, item) => total + item.quantity, 0) ?? 0;
  const luxe = isLuxeCommerceTemplate(profile.storefront?.template_key);
  const navigationItems = resolvedStorefrontNavigation(profile);

  return (
    <>
      <header className="store-header">
      <div className="shell store-header__inner">
        <StorefrontLink
          to="/"
          className="store-identity"
          ariaLabel={`${english ? "Home" : "الرئيسية"} — ${profile.name}`}
        >
          {(profile.branding.logo_url || luxe) && !logoFailed ? (
            <img
              className="store-identity__logo"
              src={
                profile.branding.logo_url ||
                (fullSource
                  ? "/assets/luxe-full/customer-assets/store-header-logo.png"
                  : "/assets/luxe/store-header-logo.png")
              }
              alt=""
              onError={() => setLogoFailed(true)}
            />
          ) : (
            <BrandMark />
          )}
          <span className="store-identity__name">{profile.name}</span>
        </StorefrontLink>

        <nav className="desktop-nav" aria-label={english ? "Main navigation" : "التنقل الرئيسي"}>
          {navigationItems.map((item) => (
            <StorefrontLink
              key={item.key}
              to={item.to}
              className={isStorefrontNavigationActive(item.key, location.pathname) ? "is-active" : undefined}
            >
              {item.label}
            </StorefrontLink>
          ))}
        </nav>

        <form className="header-search" role="search" onSubmit={submitSearch}>
          <label className="sr-only" htmlFor="header-product-search">
            {english ? "Search products" : "ابحث في المنتجات"}
          </label>
          <SearchIcon />
          <input
            id="header-product-search"
            type="search"
            value={query}
            maxLength={120}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={english ? "Search products" : "ابحث في المنتجات"}
            autoComplete="off"
          />
          <button type="submit">{english ? "Search" : "بحث"}</button>
        </form>

        {luxe ? (
          <StorefrontLink
            to="/favorites"
            className={`header-favorites ${location.pathname === "/favorites" ? "is-active" : ""}`}
            ariaLabel={`${english ? "Favorites" : "المفضلة"} — ${favorites.length}`}
          >
            <HeartIcon />
            {favorites.length ? <span>{favorites.length}</span> : null}
          </StorefrontLink>
        ) : null}

        {capability.online_checkout.status === "available" ? (
          <StorefrontLink
            to="/cart"
            className={`header-cart ${location.pathname === "/cart" ? "is-active" : ""}`}
            ariaLabel={`${english ? "Cart" : "السلة"} — ${cartCount}`}
          >
            <CartIcon />
            <span className="header-cart__label">{english ? "Cart" : "السلة"}</span>
            <span className="header-cart__count" aria-hidden="true">
              {cartCount}
            </span>
          </StorefrontLink>
        ) : null}

        <button
          className="mobile-menu-button"
          type="button"
          aria-expanded={luxe ? undefined : menuOpen}
          aria-controls={luxe ? undefined : "mobile-navigation"}
          aria-label={luxe ? (english ? "Favorites" : "المفضلة") : menuOpen ? (english ? "Close menu" : "إغلاق القائمة") : (english ? "Open menu" : "فتح القائمة")}
          onClick={() => luxe ? navigate("/favorites") : setMenuOpen((value) => !value)}
        >
          {luxe ? <HeartIcon /> : menuOpen ? <CloseIcon /> : <MenuIcon />}
        </button>
      </div>

      <div
        id="mobile-navigation"
        className={`mobile-panel ${!luxe && menuOpen ? "is-open" : ""}`}
        hidden={luxe || !menuOpen}
      >
        <div className="shell mobile-panel__inner">
          <form className="mobile-search" role="search" onSubmit={submitSearch}>
            <label htmlFor="mobile-product-search">{english ? "Search products" : "ابحث في المنتجات"}</label>
            <div>
              <SearchIcon />
              <input
                id="mobile-product-search"
                type="search"
                value={query}
                maxLength={120}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={english ? "Product name" : "اسم المنتج"}
                autoComplete="off"
              />
              <button type="submit">{english ? "Search" : "بحث"}</button>
            </div>
          </form>
          <nav aria-label={english ? "Mobile navigation" : "التنقل الرئيسي للجوال"}>
            {navigationItems.map((item) => (
              <StorefrontLink key={item.key} to={item.to} onNavigate={() => setMenuOpen(false)}>
                {item.label}
              </StorefrontLink>
            ))}
          </nav>
        </div>
      </div>

      </header>

      {luxe ? (
        <nav
          className="luxe-bottom-nav"
          aria-label={english ? "Quick navigation" : "التنقل السريع"}
        >
          <StorefrontLink to="/" className={onHome ? "is-active" : undefined}>
            <HomeIcon />
            <small>{english ? "Home" : "الرئيسية"}</small>
          </StorefrontLink>
          <StorefrontLink
            to={fullSource ? "/sunglasses" : "/products?q=sunglasses"}
            className={location.search.includes("sunglasses") ? "is-active" : undefined}
          >
            <GlassesIcon />
            <small>{english ? "Glasses" : "النظارات"}</small>
          </StorefrontLink>
          <StorefrontLink
            to={fullSource ? "/watches" : "/products?q=watch"}
            className={location.search.includes("watch") ? "is-active" : undefined}
          >
            <WatchIcon />
            <small>{english ? "Watches" : "الساعات"}</small>
          </StorefrontLink>
          <StorefrontLink
            to={fullSource ? "/pens" : "/products?q=pen"}
            className={location.search.includes("pen") ? "is-active" : undefined}
          >
            <PenIcon />
            <small>{english ? "Pens" : "الأقلام"}</small>
          </StorefrontLink>
          <StorefrontLink
            to="/account"
            className={location.pathname === "/account" ? "is-active" : undefined}
          >
            <UserIcon />
            <small>{english ? "Account" : "الحساب"}</small>
          </StorefrontLink>
        </nav>
      ) : null}
    </>
  );
};
