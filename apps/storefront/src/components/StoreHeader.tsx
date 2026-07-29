import { useEffect, useState, type FormEvent } from "react";

import { useCart } from "../commerce/CartContext";
import type { StorefrontProfileDto } from "../types";
import {
  navigate,
  StorefrontLink,
  type StorefrontLocation,
} from "../lib/navigation";
import { BrandMark } from "./BrandMark";
import { CartIcon, CloseIcon, MenuIcon, SearchIcon } from "./Icons";

type StoreHeaderProps = {
  profile: StorefrontProfileDto;
  location: StorefrontLocation;
};

const currentSearch = (search: string): string =>
  new URLSearchParams(search).get("q")?.slice(0, 120) ?? "";

export const StoreHeader = ({ profile, location }: StoreHeaderProps) => {
  const { capability, cart } = useCart();
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

  const onHome = location.pathname === "/";
  const onProducts = location.pathname.startsWith("/products");
  const cartCount =
    cart?.items.reduce((total, item) => total + item.quantity, 0) ?? 0;

  return (
    <header className="store-header">
      <div className="shell store-header__inner">
        <StorefrontLink
          to="/"
          className="store-identity"
          ariaLabel={`الرئيسية — ${profile.name}`}
        >
          {profile.branding.logo_url && !logoFailed ? (
            <img
              className="store-identity__logo"
              src={profile.branding.logo_url}
              alt=""
              onError={() => setLogoFailed(true)}
            />
          ) : (
            <BrandMark />
          )}
          <span className="store-identity__name">{profile.name}</span>
        </StorefrontLink>

        <nav className="desktop-nav" aria-label="التنقل الرئيسي">
          <StorefrontLink to="/" className={onHome ? "is-active" : undefined}>
            الرئيسية
          </StorefrontLink>
          <StorefrontLink
            to="/products"
            className={onProducts ? "is-active" : undefined}
          >
            المنتجات
          </StorefrontLink>
        </nav>

        <form className="header-search" role="search" onSubmit={submitSearch}>
          <label className="sr-only" htmlFor="header-product-search">
            ابحث في المنتجات
          </label>
          <SearchIcon />
          <input
            id="header-product-search"
            type="search"
            value={query}
            maxLength={120}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ابحث في المنتجات"
            autoComplete="off"
          />
          <button type="submit">بحث</button>
        </form>

        {capability.online_checkout.status === "available" ? (
          <StorefrontLink
            to="/cart"
            className={`header-cart ${location.pathname === "/cart" ? "is-active" : ""}`}
            ariaLabel={`السلة — ${cartCount} عناصر`}
          >
            <CartIcon />
            <span className="header-cart__label">السلة</span>
            <span className="header-cart__count" aria-hidden="true">
              {cartCount}
            </span>
          </StorefrontLink>
        ) : null}

        <button
          className="mobile-menu-button"
          type="button"
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          aria-label={menuOpen ? "إغلاق القائمة" : "فتح القائمة"}
          onClick={() => setMenuOpen((value) => !value)}
        >
          {menuOpen ? <CloseIcon /> : <MenuIcon />}
        </button>
      </div>

      <div
        id="mobile-navigation"
        className={`mobile-panel ${menuOpen ? "is-open" : ""}`}
        hidden={!menuOpen}
      >
        <div className="shell mobile-panel__inner">
          <form className="mobile-search" role="search" onSubmit={submitSearch}>
            <label htmlFor="mobile-product-search">ابحث في المنتجات</label>
            <div>
              <SearchIcon />
              <input
                id="mobile-product-search"
                type="search"
                value={query}
                maxLength={120}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="اسم المنتج"
                autoComplete="off"
              />
              <button type="submit">بحث</button>
            </div>
          </form>
          <nav aria-label="التنقل الرئيسي للجوال">
            <StorefrontLink to="/" onNavigate={() => setMenuOpen(false)}>
              الرئيسية
            </StorefrontLink>
            <StorefrontLink
              to="/products"
              onNavigate={() => setMenuOpen(false)}
            >
              المنتجات
            </StorefrontLink>
          </nav>
        </div>
      </div>
    </header>
  );
};
