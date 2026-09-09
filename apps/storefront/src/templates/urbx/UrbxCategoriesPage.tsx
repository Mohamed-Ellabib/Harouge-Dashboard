import { useDeferredValue, useEffect, useMemo, useState, type CSSProperties } from "react";
import { PiArrowRight, PiBag, PiCaretLeft, PiMagnifyingGlass } from "react-icons/pi";
import { useOptionalCart } from "../../commerce/CartContext";
import { navigate, StorefrontLink } from "../../lib/navigation";
import type { ConfiguredStorefrontProfileDto, StorefrontProductCardDto } from "../../types";
import { useGlowBeautyDesignEditor } from "../glow-beauty/GlowBeautyDesignEditor";
import { urbxCategoryBanner, urbxCategoryResults } from "./urbx-categories";
import { loadUrbxShopCatalog } from "./urbx-shop-catalog";
import UrbxNavigation from "./UrbxNavigation";
import "./urbx-welcome.css";
import "./urbx-home.css";
import "./urbx-categories.css";

export default function UrbxCategoriesPage({ profile }: { profile: ConfiguredStorefrontProfileDto }) {
  const editor = useGlowBeautyDesignEditor();
  const cart = useOptionalCart();
  const content = profile.storefront.content.brands;
  const [products, setProducts] = useState<StorefrontProductCardDto[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [reload, setReload] = useState(0);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const results = useMemo(() => urbxCategoryResults(content.items, products, deferredQuery), [content.items, products, deferredQuery]);
  const heading = editor.value("brands.heading", content.heading.en).trim().split(/\s+/);
  const statement = heading.pop();
  const explore = editor.value("brands.explore_label", content.explore_label?.en ?? "EXPLORE");
  const count = cart?.cart?.items.reduce((total, item) => total + item.quantity, 0) ?? 0;
  const palette = { "--urbx-accent": profile.branding.primary_color || "#d5ff00", "--urbx-canvas": profile.branding.secondary_color || "#070707" } as CSSProperties;

  useEffect(() => {
    document.title = `${profile.name} | Shop by category`;
    const controller = new AbortController();
    setStatus("loading"); setProducts([]);
    void loadUrbxShopCatalog(controller.signal).then(items => {
      if (!controller.signal.aborted) { setProducts(items); setStatus("ready"); }
    }).catch(() => { if (!controller.signal.aborted) setStatus("error"); });
    return () => controller.abort();
  }, [profile, reload]);

  return <div className="urbx-home urbx-categories" dir="ltr" lang="en" style={palette}>
    <header className="urbx-home__header">
      <StorefrontLink to="/" className="urbx-categories__back" ariaLabel="Back to home"><PiCaretLeft /></StorefrontLink>
      <StorefrontLink to="/" className="urbx-home__identity" ariaLabel={`${profile.name} home`}>
        {profile.branding.logo_url || profile.name === "URBX" ? <img src={profile.branding.logo_url || "/assets/urbx/urbx-wordmark-v1.png"} alt={profile.name} /> : <span>{profile.name}</span>}
      </StorefrontLink>
      <StorefrontLink to="/cart" className="urbx-home__bag" ariaLabel={`Shopping bag, ${count} items`}><PiBag />{count > 0 && <b>{count}</b>}</StorefrontLink>
    </header>
    <div className="urbx-categories__intro">
      <h1 {...editor.target("brands.heading", "categories heading")}>{heading.join(" ")}{" "}<span>{statement}<img src="/assets/urbx/brush-underline-v1.png" alt="" /></span></h1>
      <p {...editor.target("brands.subheading", "categories subtitle")}>{editor.value("brands.subheading", content.subheading.en)}</p>
    </div>
    <form className="urbx-categories__search" role="search" onSubmit={event => {
      event.preventDefault(); if (query.trim()) navigate(`/products?q=${encodeURIComponent(query.trim())}`);
    }} {...editor.target("brands.search_placeholder", "category search placeholder")}>
      <PiMagnifyingGlass aria-hidden="true" /><input type="search" aria-label="Search categories or products" value={query} onChange={event => setQuery(event.target.value)} placeholder={editor.value("brands.search_placeholder", content.search_placeholder?.en ?? "Search categories or products…")} />
    </form>

    <section className="urbx-categories__grid" aria-label="Shop by category" aria-busy={status === "loading"}>
      {results.map(({ category, count: itemCount, productQuery }) => {
        const index = content.items.findIndex(item => item.id === category.id);
        const banner = editor.value(`category.${category.slug}.banner`, urbxCategoryBanner(category) ?? "");
        const name = editor.value(`category.${category.slug}.name`, category.name.en);
        return <article className={`urbx-categories__card ${index < 2 ? "urbx-categories__card--wide" : "urbx-categories__card--small"} ${category.slug === "accessories" ? "urbx-categories__card--accessories" : ""} ${index === 1 ? "urbx-categories__card--second" : ""}`} key={category.id}>
          <StorefrontLink to={`/products?category=${encodeURIComponent(category.slug)}${productQuery ? `&q=${encodeURIComponent(productQuery)}` : ""}`} ariaLabel={`Explore ${name}`}>
            <div className="urbx-categories__art" {...editor.target(`category.${category.slug}.banner`, `${name} category photograph`)}>
              {banner && <img src={banner} alt="" width={index < 2 ? 1620 : 795} height={index < 2 ? 800 : 660} loading={index === 0 ? "eager" : "lazy"} />}
            </div>
            <div className="urbx-categories__copy">
              <h2 {...editor.target(`category.${category.slug}.name`, "category name")}>{name}</h2>
              <p>{status === "ready" ? `${itemCount} ${itemCount === 1 ? "item" : "items"}` : status === "error" ? "Items unavailable" : "Loading…"}</p>
              <div className="urbx-categories__explore">{index < 2 && <span {...editor.target("brands.explore_label", "explore label")}>{explore}</span>}<PiArrowRight aria-hidden="true" /></div>
            </div>
          </StorefrontLink>
        </article>;
      })}
      {status === "error" && <p className="urbx-categories__message" role="alert">Products couldn’t load. <button onClick={() => setReload(value => value + 1)}>Try again</button></p>}
      {status !== "loading" && !results.length && <div className="urbx-categories__message" role="status"><p>{content.items.length ? "No categories match your search." : "New collections are on their way."}</p>{query && <button onClick={() => setQuery("")}>Clear search</button>}</div>}
    </section>
    <div className="urbx-categories__view-all"><StorefrontLink to="/products"><span {...editor.target("brands.view_all_label", "view all products label")}>{editor.value("brands.view_all_label", content.view_all_label?.en ?? "View all products")}</span><PiArrowRight aria-hidden="true" /></StorefrontLink></div>
    <UrbxNavigation profile={profile} active="categories" />
  </div>;
}
