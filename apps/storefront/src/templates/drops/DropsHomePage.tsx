import { FormEvent, useEffect, useRef, useState } from "react";
import { GiConverseShoe, GiRunningShoe } from "react-icons/gi";
import {
  IoBagHandleOutline,
  IoChevronForward,
  IoClose,
  IoHeart,
  IoHeartOutline,
  IoLocationSharp,
  IoMenuOutline,
  IoPersonOutline,
  IoSearchOutline,
} from "react-icons/io5";
import { SiAdidas, SiNewbalance, SiNike } from "react-icons/si";

import "./drops-home.css";
import { fetchStorefrontCatalog } from "../../api/storefront-api";
import { useOptionalCart } from "../../commerce/CartContext";
import { useOptionalFavorites } from "../../commerce/FavoritesContext";
import { localizedStorefrontText } from "../../lib/localization";
import { formatStorefrontMoney } from "../../lib/money";
import { navigate, StorefrontLink } from "../../lib/navigation";
import type { ConfiguredStorefrontProfileDto, StorefrontProductCardDto } from "../../types";
import { DropsNavigation } from "./DropsNavigation";

const asset = (name: string) => `/assets/drops/${name}`;

const brands = [
  { id: "adidas", label: "Adidas", icon: <SiAdidas aria-hidden="true" /> },
  { id: "nike", label: "Nike", icon: <SiNike aria-hidden="true" /> },
  { id: "new-balance", label: "New Balance", icon: <SiNewbalance aria-hidden="true" /> },
  { id: "converse", label: "Converse", icon: <GiConverseShoe aria-hidden="true" /> },
  { id: "vans", label: "Vans", icon: <span aria-hidden="true">VANS</span> },
] as const;

const products = [
  {
    id: "jordan-retro-high-dior",
    name: "Jordan 1 Retro High Dior",
    price: "$9,000",
    image: asset("jordan-retro-high.png"),
    brand: "nike",
  },
  {
    id: "adidas-iniki-runner-70s",
    name: "Adidas Iniki Runner 70S",
    price: "$14,200",
    image: asset("retro-runner-blue.png"),
    brand: "adidas",
  },
  {
    id: "jordan-retro-high-silver",
    name: "Jordan 1 Retro High Silver",
    price: "$8,750",
    image: asset("jordan-retro-high.png"),
    brand: "nike",
  },
  {
    id: "adidas-retro-runner-blue",
    name: "Adidas Retro Runner Blue",
    price: "$12,900",
    image: asset("retro-runner-blue.png"),
    brand: "adidas",
  },
] as const;

type ActiveDockItem = "home" | "search" | "favorites" | "profile";

export function DropsHomePage({ profile, catalogOnly = false, savedOnly = false }: { profile?: ConfiguredStorefrontProfileDto; catalogOnly?: boolean; savedOnly?: boolean } = {}) {
  const cart = useOptionalCart();
  const favorites = useOptionalFavorites();
  const [catalog, setCatalog] = useState<StorefrontProductCardDto[]>([]);
  const [catalogError, setCatalogError] = useState("");
  useEffect(() => {
    if (!profile) return;
    const controller = new AbortController();
    setCatalogError("");
    void fetchStorefrontCatalog({ limit: 24, signal: controller.signal }).then(result => setCatalog(result.products)).catch(() => { if (!controller.signal.aborted) setCatalogError("Unable to load sneakers. Please try again."); });
    return () => controller.abort();
  }, [profile]);
  const route = (path: string) => navigate(profile ? path : `${path}${path.includes("?") ? "&" : "?"}preview=1&template=drops`);
  const hero = profile?.storefront.content.hero;
  const text = (value: { en: string; ar: string } | undefined, fallback: string) => value && profile ? localizedStorefrontText(value, profile.locale) : fallback;
  const runtimeProducts = (savedOnly ? (favorites?.favorites ?? []) : catalog).map(product => ({ id: product.handle, name: product.title, image: product.thumbnail_url ?? "", price: product.price_lyd == null ? "Price unavailable" : formatStorefrontMoney(product.price_lyd, "lyd", profile?.locale ?? "en-LY"), brand: /adidas/i.test(product.title) ? "adidas" : /new balance/i.test(product.title) ? "new-balance" : "nike", category: product.category ?? product.brand }));
  const searchInputRef = useRef<HTMLInputElement>(null);
  const arrivalsRef = useRef<HTMLElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeBrand, setActiveBrand] = useState<string | null>(null);
  const [activeDockItem, setActiveDockItem] = useState<ActiveDockItem>("home");
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() => new Set());
  const [query, setQuery] = useState(() => profile ? new URLSearchParams(window.location.search).get("q") ?? "" : "");
  const [searchMessage, setSearchMessage] = useState("");

  useEffect(() => {
    const previousTitle = document.title;
    const previousLang = document.documentElement.lang;
    const previousDirection = document.documentElement.dir;
    document.title = "DROPS — Sneaker Store Preview";
    document.documentElement.lang = "en";
    document.documentElement.dir = "ltr";
    document.documentElement.classList.add("drops-preview-document");
    document.body.classList.add("drops-preview-document");

    return () => {
      document.title = previousTitle;
      document.documentElement.lang = previousLang;
      document.documentElement.dir = previousDirection;
      document.documentElement.classList.remove("drops-preview-document");
      document.body.classList.remove("drops-preview-document");
    };
  }, []);

  const category = profile?.storefront.content.brands.items.find(item => item.slug === new URLSearchParams(window.location.search).get("category"));
  const filteredProducts = (profile ? runtimeProducts : products).filter((product) => {
    const matchesBrand = !activeBrand || product.brand === activeBrand;
    const matchesQuery = !query.trim() || product.name.toLowerCase().includes(query.trim().toLowerCase());
    return matchesBrand && matchesQuery && (!category || ("category" in product && product.category === category.name.en));
  });

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearchMessage(query.trim() ? `Showing sneakers matching “${query.trim()}”` : "Type a sneaker name to search");
  };

  const toggleFavorite = (id: string) => {
    if (profile) { const product = catalog.find(item => item.handle === id) ?? favorites?.favorites.find(item => item.handle === id); if (product) favorites?.toggleFavorite(product); return; }
    setFavoriteIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const activateDock = (item: ActiveDockItem) => {
    setActiveDockItem(item);
    if (item === "search") {
      window.location.assign("/categories?preview=1&template=drops");
    }
    if (item === "favorites") {
      setSearchMessage(favoriteIds.size ? `${favoriteIds.size} saved sneaker${favoriteIds.size === 1 ? "" : "s"}` : "No saved sneakers yet");
      arrivalsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    if (item === "profile") setMenuOpen(true);
  };

  return (
    <div className="drops-page" dir="ltr" lang="en">
      <header className="drops-header">
        <button
          className="drops-round-button drops-menu-button"
          type="button"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((current) => !current)}
        >
          {menuOpen ? <IoClose aria-hidden="true" /> : <IoMenuOutline aria-hidden="true" />}
        </button>
        {profile && profile.name !== "DROPS" ? <strong className="drops-wordmark">{profile.name}</strong> : <img className="drops-wordmark" src={profile?.branding.logo_url ?? asset("drops-wordmark.png")} alt={profile?.name ?? "DROPS"} />}
        <button
          className="drops-round-button drops-bag-button"
          type="button"
          aria-label="Open bag"
          onClick={() => route("/cart")}
        >
          <IoBagHandleOutline aria-hidden="true" />
          <b>{profile ? cart?.cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0 : 12}</b>
        </button>
        {menuOpen ? (
          <nav className="drops-menu" aria-label="Quick menu">
            {(["Home", "New arrivals", "Delivery address", "My account"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  if (item === "New arrivals") arrivalsRef.current?.scrollIntoView({ behavior: "smooth" });
                  if (profile && item !== "New arrivals") route(item === "Home" ? "/" : item === "My account" ? "/account" : "/checkout");
                }}
              >
                {item}
              </button>
            ))}
          </nav>
        ) : null}
      </header>

      <main>
        <form className="drops-search" role="search" onSubmit={submitSearch}>
          <IoSearchOutline aria-hidden="true" />
          <label className="drops-visually-hidden" htmlFor="drops-search-input">Search sneakers</label>
          <input
            id="drops-search-input"
            ref={searchInputRef}
            type="search"
            value={query}
            placeholder="What are you looking for?"
            onChange={(event) => setQuery(event.target.value)}
          />
        </form>
        <p className="drops-live-message" aria-live="polite">{searchMessage}</p>

        {!catalogOnly && !savedOnly && <><button className="drops-address" type="button" onClick={() => profile ? route("/checkout") : setSearchMessage("Delivery address selected") }>
          <IoLocationSharp aria-hidden="true" />
          <span>Ship to <strong>{profile ? "Choose your delivery address" : "Jl. Malioboro, Blok Z, no 18"}</strong></span>
          <IoChevronForward aria-hidden="true" />
        </button>

        <section className="drops-brands" aria-label="Shop sneaker brands">
          {brands.map((brand) => (
            <button
              key={brand.id}
              type="button"
              aria-label={`Filter by ${brand.label}`}
              aria-pressed={activeBrand === brand.id}
              onClick={() => setActiveBrand((current) => current === brand.id ? null : brand.id)}
            >
              {brand.icon}
            </button>
          ))}
        </section>

        <section className="drops-sale" aria-label="Year-end sale">
          <img data-glow-edit="hero.image" src={hero?.slides[0]?.image_url ?? asset("year-end-sale-hero.png")} alt="Three sneakers presented for the year-end sale" />
          <div>
            <h1 data-glow-edit="hero.heading">{text(hero?.heading, "Year-End Sale")}</h1>
            <p data-glow-edit="hero.subheading">{text(hero?.subheading, "Up To 90%")}</p>
            <button data-glow-edit="hero.cta_label" type="button" onClick={() => profile ? route(hero?.buttons.find(button => button.enabled)?.href ?? "/products") : arrivalsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}>{text(hero?.cta_label, "Shop Now")}</button>
          </div>
        </section>

        </>}
        <section className="drops-arrivals" ref={arrivalsRef} aria-labelledby="drops-arrivals-title">
          <header>
            <h2 id="drops-arrivals-title">{savedOnly ? "My Favorites" : catalogOnly ? "All Sneakers" : "New Arrival"}</h2>
            <button type="button" onClick={() => { if (profile) route("/products"); else { setActiveBrand(null); setQuery(""); } }}>See all</button>
          </header>

          {filteredProducts.length ? (
            <div className="drops-product-grid">
              {filteredProducts.map((product) => {
                const favorite = profile ? favorites?.isFavorite(product.id) : favoriteIds.has(product.id);
                return (
                  <article className="drops-product-card" key={product.id} data-glow-edit={`product.${product.id}`}>
                    <div className="drops-product-card__image">
                      <StorefrontLink to={profile ? `/products/${encodeURIComponent(product.id)}` : "/products/jordan-1-low-grey-toe?preview=1&template=drops"}><img src={product.image} alt={product.name} /></StorefrontLink>
                      <button
                        type="button"
                        aria-label={favorite ? `Remove ${product.name} from favorites` : `Save ${product.name}`}
                        aria-pressed={favorite}
                        onClick={() => toggleFavorite(product.id)}
                      >
                        {favorite ? <IoHeart aria-hidden="true" /> : <IoHeartOutline aria-hidden="true" />}
                      </button>
                    </div>
                    <h3>{product.name}</h3>
                    <strong>{product.price}</strong>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="drops-empty" role="status">
              <GiRunningShoe aria-hidden="true" />
              <p>{catalogError || "No sneakers match this search yet."}</p>
              <button type="button" onClick={() => { setQuery(""); setActiveBrand(null); }}>Show all sneakers</button>
            </div>
          )}
        </section>
      </main>

      {profile ? <DropsNavigation profile={profile} /> : <nav className="drops-bottom-nav" aria-label="Store navigation">
        <button className={activeDockItem === "home" ? "is-active" : ""} type="button" aria-label="Home" aria-current={activeDockItem === "home" ? "page" : undefined} onClick={() => activateDock("home")}><GiRunningShoe aria-hidden="true" /></button>
        <button className={activeDockItem === "search" ? "is-active" : ""} type="button" aria-label="Search" onClick={() => activateDock("search")}><IoSearchOutline aria-hidden="true" /></button>
        <button className={activeDockItem === "favorites" ? "is-active" : ""} type="button" aria-label="Favorites" onClick={() => activateDock("favorites")}><IoHeartOutline aria-hidden="true" /></button>
        <button className={activeDockItem === "profile" ? "is-active" : ""} type="button" aria-label="Profile" onClick={() => activateDock("profile")}><IoPersonOutline aria-hidden="true" /></button>
      </nav>}
    </div>
  );
}

export default DropsHomePage;
