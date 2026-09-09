import { useEffect, useRef, useState } from "react";
import { GiConverseShoe, GiRunningShoe } from "react-icons/gi";
import {
  IoArrowBack,
  IoArrowForward,
  IoBagHandleOutline,
  IoHappyOutline,
  IoHeartOutline,
  IoManOutline,
  IoPersonOutline,
  IoSearchOutline,
  IoWomanOutline,
} from "react-icons/io5";
import { SiAdidas, SiNewbalance, SiNike } from "react-icons/si";

import "./drops-categories.css";
import { useOptionalCart } from "../../commerce/CartContext";
import { navigate } from "../../lib/navigation";
import { localizedStorefrontText } from "../../lib/localization";
import type { ConfiguredStorefrontProfileDto } from "../../types";
import { DropsNavigation } from "./DropsNavigation";

const asset = (name: string) => `/assets/drops/${name}`;

const styles = [
  { id: "running", label: "Running", image: asset("category-running.png") },
  { id: "lifestyle", label: "Lifestyle", image: asset("category-lifestyle.png") },
  { id: "basketball", label: "Basketball", image: asset("category-basketball.png") },
  { id: "skateboarding", label: "Skateboarding", image: asset("category-skateboarding.png") },
] as const;

const audiences = [
  { id: "men", label: "Men", icon: <IoManOutline aria-hidden="true" /> },
  { id: "women", label: "Women", icon: <IoWomanOutline aria-hidden="true" /> },
  { id: "kids", label: "Kids", icon: <IoHappyOutline aria-hidden="true" /> },
] as const;

const brands = [
  { id: "adidas", label: "Adidas", icon: <SiAdidas aria-hidden="true" /> },
  { id: "nike", label: "Nike", icon: <SiNike aria-hidden="true" /> },
  { id: "new-balance", label: "New Balance", icon: <SiNewbalance aria-hidden="true" /> },
  { id: "converse", label: "Converse", icon: <GiConverseShoe aria-hidden="true" /> },
  { id: "vans", label: "Vans", icon: <span aria-hidden="true">VANS</span> },
] as const;

type DockItem = "home" | "search" | "favorites" | "profile";

export function DropsCategoriesPage({ profile }: { profile?: ConfiguredStorefrontProfileDto } = {}) {
  const cart = useOptionalCart();
  const route = (path: string) => navigate(profile ? path : `${path}?preview=1&template=drops`);
  const categoryStyles = profile ? profile.storefront.content.brands.items.map(item => ({ id: item.slug, label: localizedStorefrontText(item.name, profile.locale), image: item.image_url ?? "" })) : styles;
  const searchInputRef = useRef<HTMLInputElement>(null);
  const styleGridRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [audience, setAudience] = useState("men");
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [activeDockItem, setActiveDockItem] = useState<DockItem>("search");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const previousTitle = document.title;
    const previousLang = document.documentElement.lang;
    const previousDirection = document.documentElement.dir;
    document.title = "Categories — DROPS Preview";
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

  const normalizedQuery = query.trim().toLowerCase();
  const filteredStyles = categoryStyles.filter((style) => style.label.toLowerCase().includes(normalizedQuery));
  const filteredBrands = brands.filter((brand) => brand.label.toLowerCase().includes(normalizedQuery));

  const goHome = () => {
    route("/");
  };

  const goBack = () => {
    if (profile) route("/");
    else if (window.history.length > 1) window.history.back();
    else goHome();
  };

  const showAllStyles = () => {
    if (profile) { route("/products"); return; }
    setQuery("");
    setMessage("Showing every sneaker style");
    styleGridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const activateDock = (item: DockItem) => {
    setActiveDockItem(item);
    if (item === "home") goHome();
    if (item === "search") {
      searchInputRef.current?.focus();
      searchInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    if (item === "favorites") setMessage("Your saved sneakers are ready to view");
    if (item === "profile") setMessage("Your DROPS profile is ready");
  };

  return (
    <div className="drops-page drops-categories-page" dir="ltr" lang="en">
      <header className="drops-categories-header">
        <button className="drops-round-button" type="button" aria-label="Go back" onClick={goBack}>
          <IoArrowBack aria-hidden="true" />
        </button>
        <h1>Categories</h1>
        <button
          className="drops-round-button drops-bag-button"
          type="button"
          aria-label="Open bag"
          onClick={() => route("/cart")}
        >
          <IoBagHandleOutline aria-hidden="true" />
          <b>{profile ? cart?.cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0 : 12}</b>
        </button>
      </header>

      <main className="drops-categories-main">
        <form className="drops-categories-search" role="search" onSubmit={(event) => event.preventDefault()}>
          <IoSearchOutline aria-hidden="true" />
          <label className="drops-visually-hidden" htmlFor="drops-categories-search">Search categories or brands</label>
          <input
            id="drops-categories-search"
            ref={searchInputRef}
            type="search"
            value={query}
            placeholder="Search categories or brands"
            onChange={(event) => {
              setQuery(event.target.value);
              setMessage("");
            }}
          />
        </form>
        <p className="drops-categories-live" aria-live="polite">{message}</p>

        <section className="drops-categories-hero" aria-label="Find your perfect pair">
          <img src={asset("categories-hero.png")} alt="Black, white, and green high-top sneaker" />
          <div>
            <h2>Find Your Perfect Pair</h2>
            <button type="button" onClick={showAllStyles}>Explore All</button>
          </div>
        </section>

        <section className="drops-style-section" aria-labelledby="drops-style-title">
          <header>
            <h2 id="drops-style-title">Shop by style</h2>
            <button type="button" onClick={showAllStyles}>See all</button>
          </header>
          {filteredStyles.length ? (
            <div className="drops-style-grid" ref={styleGridRef}>
              {filteredStyles.map((style) => (
                <button
                  className="drops-style-card"
                  key={style.id}
                  type="button"
                  onClick={() => profile ? route(`/products?category=${encodeURIComponent(style.id)}`) : setMessage(`${style.label} sneakers selected`)}
                >
                  <img data-glow-edit={`category.${style.id}.image`} src={style.image} alt={`${style.label} sneaker`} />
                  <span data-glow-edit={`category.${style.id}.name`}>{style.label}</span>
                  <b aria-hidden="true"><IoArrowForward /></b>
                </button>
              ))}
            </div>
          ) : (
            <div className="drops-categories-empty" role="status">
              <GiRunningShoe aria-hidden="true" />
              <p>No sneaker styles match “{query}”.</p>
              <button type="button" onClick={() => setQuery("")}>Show all styles</button>
            </div>
          )}
        </section>

        <section className="drops-audience-section" aria-labelledby="drops-audience-title">
          <h2 id="drops-audience-title">Shop for everyone</h2>
          <div>
            {audiences.map((item) => (
              <button
                className={audience === item.id ? "is-selected" : ""}
                key={item.id}
                type="button"
                aria-pressed={audience === item.id}
                onClick={() => {
                  setAudience(item.id);
                  if (profile) route("/products"); else setMessage(`${item.label}'s collection selected`);
                }}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="drops-popular-brands" aria-labelledby="drops-brands-title">
          <h2 id="drops-brands-title">Popular brands</h2>
          <div>
            {(normalizedQuery ? filteredBrands : brands).map((brand) => (
              <button
                className={selectedBrand === brand.id ? "is-selected" : ""}
                key={brand.id}
                type="button"
                aria-label={`Shop ${brand.label}`}
                aria-pressed={selectedBrand === brand.id}
                onClick={() => {
                  setSelectedBrand((current) => current === brand.id ? null : brand.id);
                  if (profile) route(`/products?q=${encodeURIComponent(brand.label)}`); else setMessage(`${brand.label} selected`);
                }}
              >
                {brand.icon}
              </button>
            ))}
          </div>
        </section>
      </main>

      {profile ? <DropsNavigation profile={profile} /> : <nav className="drops-bottom-nav" aria-label="Store navigation">
        <button type="button" aria-label="Home" onClick={() => activateDock("home")}><GiRunningShoe aria-hidden="true" /></button>
        <button className={activeDockItem === "search" ? "is-active" : ""} type="button" aria-label="Search" aria-current={activeDockItem === "search" ? "page" : undefined} onClick={() => activateDock("search")}><IoSearchOutline aria-hidden="true" /></button>
        <button className={activeDockItem === "favorites" ? "is-active" : ""} type="button" aria-label="Favorites" onClick={() => activateDock("favorites")}><IoHeartOutline aria-hidden="true" /></button>
        <button className={activeDockItem === "profile" ? "is-active" : ""} type="button" aria-label="Profile" onClick={() => activateDock("profile")}><IoPersonOutline aria-hidden="true" /></button>
      </nav>}
    </div>
  );
}

export default DropsCategoriesPage;
