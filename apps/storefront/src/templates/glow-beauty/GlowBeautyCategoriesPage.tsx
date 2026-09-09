import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import {
  IoArrowForward,
  IoBagHandleOutline,
  IoSearchOutline,
} from "react-icons/io5";
import {
  PiDropLight,
  PiFaceMaskLight,
  PiLeafLight,
  PiSparkleLight,
} from "react-icons/pi";

import { GlowBeautyStatusBar } from "./GlowBeautyChrome";
import { fetchStorefrontCatalog } from "../../api/storefront-api";
import { useOptionalCart } from "../../commerce/CartContext";
import { navigate } from "../../lib/navigation";
import type { ConfiguredStorefrontProfileDto, StorefrontProductCardDto } from "../../types";
import { useGlowBeautyDesignEditor } from "./GlowBeautyDesignEditor";
import "./glow-beauty-home.css";
import "./glow-beauty-categories.css";

const previewQuery = "preview=1&template=glow-beauty";

type CategoryCard = {
  name: string;
  count: string;
  image: string;
  imageClass?: string;
  category?: string;
  slug?: string;
};

const categoryCards: CategoryCard[] = [
  { name: "Skincare", count: "48 Products", image: "/assets/glow-beauty/hero-beauty-collection.png", imageClass: "is-skincare", category: "Skincare" },
  { name: "Makeup", count: "36 Products", image: "/assets/glow-beauty/special-offer.png", imageClass: "is-makeup", category: "Makeup" },
  { name: "Fragrance", count: "24 Products", image: "/assets/glow-beauty/category-fragrance.png", imageClass: "is-fragrance", category: "Fragrance" },
  { name: "Haircare", count: "18 Products", image: "/assets/glow-beauty/category-haircare.png", imageClass: "is-haircare", category: "Haircare" },
  { name: "Beauty Tools", count: "12 Products", image: "/assets/glow-beauty/category-tools.png", imageClass: "is-tools" },
  { name: "Special Offers", count: "20 Deals", image: "/assets/glow-beauty/hero-beauty-collection.png", imageClass: "is-offers" },
];

const concerns: { name: string; icon: ReactNode }[] = [
  { name: "Dryness", icon: <PiDropLight aria-hidden="true" /> },
  { name: "Dullness", icon: <PiSparkleLight aria-hidden="true" /> },
  { name: "Sensitive Skin", icon: <PiLeafLight aria-hidden="true" /> },
  { name: "Anti-Aging", icon: <PiFaceMaskLight aria-hidden="true" /> },
];

export function GlowBeautyCategoriesPage({ profile }: { profile?: ConfiguredStorefrontProfileDto } = {}) {
  const design = useGlowBeautyDesignEditor();
  const cart = useOptionalCart();
  const [products, setProducts] = useState<StorefrontProductCardDto[]>([]);
  const catalogHref = profile ? "/products" : `/products?${previewQuery}`;
  const categoryHref = (category?: string) => category ? `${catalogHref}${profile ? "?" : "&"}category=${encodeURIComponent(category)}` : catalogHref;
  const [query, setQuery] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const cartCount = profile ? cart?.cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0 : 2;
  useEffect(() => {
    if (!profile) return;
    const controller = new AbortController();
    void fetchStorefrontCatalog({ limit: 24, offset: 0, signal: controller.signal }).then(result => setProducts(result.products)).catch(() => setProducts([]));
    return () => controller.abort();
  }, [profile]);

  useEffect(() => {
    const previousTitle = document.title;
    const previousLang = document.documentElement.lang;
    const previousDirection = document.documentElement.dir;
    document.title = "Explore Categories — Glow Beauty Preview";
    document.documentElement.lang = "en";
    document.documentElement.dir = "ltr";
    document.documentElement.classList.add("glow-beauty-preview-document");
    document.body.classList.add("glow-beauty-preview-document");
    return () => {
      document.title = previousTitle;
      document.documentElement.lang = previousLang;
      document.documentElement.dir = previousDirection;
      document.documentElement.classList.remove("glow-beauty-preview-document");
      document.body.classList.remove("glow-beauty-preview-document");
    };
  }, []);

  const visibleCategories = useMemo(() => {
    const cards: CategoryCard[] = profile ? profile.storefront.content.brands.items.map(item => ({
      name: item.name.en, slug: item.slug, category: item.name.en,
      count: `${products.filter(p => p.category === item.name.en).length} Products`,
      image: item.image_url ?? "", imageClass: `is-${item.slug}`,
    })) : categoryCards;
    const normalized = query.trim().toLowerCase();
    if (!normalized) return cards;
    return cards.filter((category) => `${category.name} ${category.count}`.toLowerCase().includes(normalized));
  }, [profile, products, query]);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAnnouncement(query.trim() ? `${visibleCategories.length} matching categories` : "Showing every beauty category");
  };

  return (
    <div className="glow-beauty-page glow-beauty-categories-page" dir="ltr" lang="en" onClick={event => {
      const anchor = event.target instanceof Element ? event.target.closest("a") : null;
      if (profile && anchor && !event.defaultPrevented && !event.ctrlKey && !event.metaKey) { const target = new URL(anchor.href); if (target.origin === window.location.origin) { event.preventDefault(); target.searchParams.delete("preview"); navigate(`${target.pathname}${target.search}`); } }
    }}>
      <GlowBeautyStatusBar />

      <header className="glow-beauty-categories-header">
        <div>
          <p>Find your perfect match</p>
          <h1>Explore Categories</h1>
        </div>
        <a href={`/cart?${previewQuery}`} aria-label={`${cartCount} items in bag`}>
          <IoBagHandleOutline aria-hidden="true" />
          <b>{cartCount}</b>
        </a>
      </header>

      <main>
        <form className="glow-beauty-categories-search" role="search" onSubmit={submitSearch}>
          <IoSearchOutline aria-hidden="true" />
          <label className="glow-beauty-visually-hidden" htmlFor="glow-beauty-category-search">Search categories</label>
          <input id="glow-beauty-category-search" type="search" value={query} placeholder="Search categories..." onChange={(event) => setQuery(event.target.value)} />
        </form>

        <section className="glow-beauty-category-browser" aria-labelledby="glow-beauty-category-browser-title">
          <header>
            <h2 id="glow-beauty-category-browser-title">Shop by Category</h2>
            <a href={catalogHref}>View All</a>
          </header>
          <div className="glow-beauty-category-card-grid" aria-live="polite">
            {visibleCategories.map((category) => (
              <article className="glow-beauty-category-card" key={category.name}>
                <a className="glow-beauty-category-card__image" href={categoryHref(category.category)} aria-label={`Shop ${category.name}`}>
                  <img className={category.imageClass} src={category.image} alt={`${category.name} beauty collection`} {...design.target(`category.${category.slug ?? category.name.toLowerCase()}.image`, category.name)} />
                  {category.name === "Special Offers" ? <span><b>30%</b>OFF</span> : null}
                </a>
                <div>
                  <span><strong {...design.target(`category.${category.slug ?? category.name.toLowerCase()}.name`, category.name)}>{category.name}</strong><small>{category.count}</small></span>
                  <a href={categoryHref(category.category)} aria-label={`Browse ${category.name}`}><IoArrowForward aria-hidden="true" /></a>
                </div>
              </article>
            ))}
          </div>
          {!visibleCategories.length ? <p className="glow-beauty-categories-empty">No categories match “{query}”.</p> : null}
        </section>

        <section className="glow-beauty-concerns" aria-labelledby="glow-beauty-concerns-title">
          <h2 id="glow-beauty-concerns-title">Shop by Concern</h2>
          <div>
            {concerns.map((concern) => (
              <button key={concern.name} type="button" onClick={() => setAnnouncement(`${concern.name} products selected`)}>
                {concern.icon}<span>{concern.name}</span><IoArrowForward aria-hidden="true" />
              </button>
            ))}
          </div>
        </section>

        <a className="glow-beauty-edit-banner" href={categoryHref("Skincare")}>
          <img src="/assets/glow-beauty/hero-beauty-collection.png" alt="Curated rose-gold skincare and fragrance collection" />
          <span><small>CURATED FOR YOU</small><strong>The Glow Edit</strong><p>Everything you need for radiant skin</p><i><IoArrowForward aria-hidden="true" /></i></span>
        </a>
      </main>

      <span className="glow-beauty-visually-hidden" aria-live="polite">{announcement}</span>
    </div>
  );
}

export default GlowBeautyCategoriesPage;
