import { useDeferredValue, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { PiArrowRight, PiBag, PiCaretDown, PiHeart, PiHeartFill, PiList, PiMagnifyingGlass, PiPlus, PiSlidersHorizontal, PiX } from "react-icons/pi";
import { fetchStorefrontPurchaseOptions } from "../../api/storefront-api";
import { useOptionalCart } from "../../commerce/CartContext";
import { useFavorites } from "../../commerce/FavoritesContext";
import { isStorefrontEditorPreviewEnabled, isVisualPreviewEnabled } from "../../config";
import { formatStorefrontMoney } from "../../lib/money";
import { navigate, StorefrontLink, useStorefrontLocation } from "../../lib/navigation";
import { resolvedStorefrontNavigation } from "../../lib/storefront-navigation";
import type { ConfiguredStorefrontProfileDto, StorefrontProductCardDto, StorefrontPurchaseOptionsDto, StorefrontShopContentDto } from "../../types";
import { useGlowBeautyDesignEditor } from "../glow-beauty/GlowBeautyDesignEditor";
import { filterUrbxShopProducts, loadUrbxShopCatalog, type UrbxShopSort } from "./urbx-shop-catalog";
import { urbxShopContent } from "./urbx-shop-content";
import { urbxProductInCategory } from "./urbx-categories";
import UrbxNavigation, { urbxReferenceNavigation } from "./UrbxNavigation";
import "./urbx-welcome.css";
import "./urbx-home.css";
import "./urbx-shop.css";

export default function UrbxShopPage({ profile }: { profile: ConfiguredStorefrontProfileDto }) {
  const editor = useGlowBeautyDesignEditor();
  const cart = useOptionalCart();
  const favorites = useFavorites();
  const location = useStorefrontLocation();
  const content = profile.storefront.content.shop ?? urbxShopContent;
  const text = (key: keyof StorefrontShopContentDto) => editor.value(`shop.${key}`, content[key].en);
  const categories = profile.storefront.content.brands.items;
  const [products, setProducts] = useState<StorefrontProductCardDto[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [reload, setReload] = useState(0);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState<UrbxShopSort>("featured");
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [draftCategory, setDraftCategory] = useState("");
  const [draftPrice, setDraftPrice] = useState("");
  const [panel, setPanel] = useState<"menu" | "filter" | "product" | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<StorefrontProductCardDto | null>(null);
  const [purchase, setPurchase] = useState<StorefrontPurchaseOptionsDto | null>(null);
  const [selectedVariant, setSelectedVariant] = useState("");
  const [purchaseError, setPurchaseError] = useState("");
  const [notice, setNotice] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const currency = cart?.capability.online_checkout.currency_code ?? "lyd";
  const visualPreview = import.meta.env.DEV && isVisualPreviewEnabled() && !isStorefrontEditorPreviewEnabled() && !new URLSearchParams(location.search).has("setup-preview");
  const money = (amount: number) => visualPreview ? `$${amount.toFixed(2)}` : formatStorefrontMoney(amount, currency, "en-LY");
  const count = cart?.cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  // A real store's published navigation is authoritative; the standalone design
  // mock shows the five links in the supplied reference.
  const navigation = visualPreview ? urbxReferenceNavigation : resolvedStorefrontNavigation(profile);
  const deferredQuery = useDeferredValue(query);
  const visible = useMemo(() => {
    const selected = categories.find(item => item.name.en === category);
    return filterUrbxShopProducts(selected ? products.filter(product => urbxProductInCategory(product, selected)) : products,
      { query: deferredQuery, category: selected ? "" : category, maxPrice, sort });
  }, [products, categories, deferredQuery, category, maxPrice, sort]);
  const categoryNames = [...new Set([...categories.map(item => item.name.en), ...products.map(item => item.category).filter((value): value is string => Boolean(value))])];

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const incoming = params.get("q") ?? "";
    const categorySlug = params.get("category");
    const match = categories.find(item => categorySlug ? item.slug === categorySlug : item.name.en.toLowerCase() === incoming.toLowerCase());
    setCategory(match?.name.en ?? ""); setQuery(match && !categorySlug ? "" : incoming);
  }, [location.search, categories]);

  useEffect(() => {
    document.title = `${profile.name} | Shop the drop`;
    const controller = new AbortController();
    setStatus("loading"); setProducts([]);
    void loadUrbxShopCatalog(controller.signal).then(result => {
      if (!controller.signal.aborted) { setProducts(result); setStatus("ready"); }
    }).catch(() => { if (!controller.signal.aborted) setStatus("error"); });
    return () => controller.abort();
  }, [profile, reload]);

  useEffect(() => {
    if (panel) { trigger.current = document.activeElement as HTMLElement; dialog.current?.showModal(); }
    else { dialog.current?.close(); trigger.current?.focus(); }
  }, [panel]);

  useEffect(() => {
    if (panel !== "product" || !selectedProduct) return;
    const controller = new AbortController();
    setPurchase(null); setSelectedVariant(""); setPurchaseError("");
    void fetchStorefrontPurchaseOptions(selectedProduct.handle, currency, { signal: controller.signal })
      .then(result => { if (!controller.signal.aborted) setPurchase(result); })
      .catch(() => { if (!controller.signal.aborted) setPurchaseError("Sizes couldn’t load. Please close this panel and try again."); });
    return () => controller.abort();
  }, [panel, selectedProduct, currency]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const close = () => { if (!cart?.pending) setPanel(null); };
  const clearFilters = () => { setQuery(""); setCategory(""); setMaxPrice(null); };
  const palette = { "--urbx-accent": profile.branding.primary_color || "#d5ff00", "--urbx-canvas": profile.branding.secondary_color || "#070707" } as CSSProperties;

  return <div className="urbx-home urbx-shop" style={palette} dir="ltr" lang="en" data-money={visualPreview ? "reference" : "store"}>
    <header className="urbx-home__header">
      <button aria-label="Open menu" aria-expanded={panel === "menu"} onClick={() => setPanel("menu")}><PiList /></button>
      <StorefrontLink to="/" className="urbx-home__identity" ariaLabel={`${profile.name} home`}>
        {profile.branding.logo_url || profile.name === "URBX" ? <img src={profile.branding.logo_url || "/assets/urbx/urbx-wordmark-v1.png"} alt={profile.name} /> : <span>{profile.name}</span>}
      </StorefrontLink>
      <StorefrontLink to="/cart" className="urbx-home__bag" ariaLabel={`Shopping bag, ${count} items`}><PiBag />{count > 0 && <b>{count}</b>}</StorefrontLink>
    </header>

    <div className="urbx-shop__intro">
      <h1><span {...editor.target("shop.heading", "shop heading")}>{text("heading")}</span>{" "}<span className="urbx-shop__statement" {...editor.target("shop.statement", "shop statement")}>{text("statement")}<img src="/assets/urbx/brush-underline-v1.png" alt="" /></span></h1>
    </div>
    <div className="urbx-shop__controls">
      <form className="urbx-shop__search" role="search" onSubmit={event => event.preventDefault()} {...editor.target("shop.search_placeholder", "search placeholder")}>
        <PiMagnifyingGlass aria-hidden="true" /><input type="search" aria-label="Search streetwear" value={query} onChange={event => setQuery(event.target.value)} placeholder={text("search_placeholder")} />
      </form>
      <div className="urbx-shop__tabs" aria-label="Product categories">
        <button aria-pressed={!category} onClick={() => setCategory("")}>ALL</button>
        {categories.slice(0, 3).map(item => <button key={item.id} aria-pressed={category === item.name.en} onClick={() => setCategory(item.name.en)}
          {...editor.target(`category.${item.slug}.name`, "category name")}>{editor.value(`category.${item.slug}.name`, item.name.en)}</button>)}
      </div>
      <div className="urbx-shop__toolbar">
        <p role="status" aria-live="polite">{status === "loading" ? "Loading…" : status === "error" ? "Unavailable" : `${visible.length} ${visible.length === 1 ? "product" : "products"}`}</p>
        <label className="urbx-shop__sort"><select aria-label="Sort products" value={sort} onChange={event => setSort(event.target.value as UrbxShopSort)}>
          <option value="featured">Featured</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option><option value="title">Name: A–Z</option>
        </select><PiCaretDown aria-hidden="true" /></label>
        <button className="urbx-shop__filter" onClick={() => { setDraftCategory(category); setDraftPrice(maxPrice?.toString() ?? ""); setPanel("filter"); }} aria-label="Filter products" aria-expanded={panel === "filter"}>
          Filter{maxPrice !== null && <i aria-label="Price filter applied" />}<PiSlidersHorizontal aria-hidden="true" />
        </button>
      </div>
    </div>

    <section className="urbx-shop__catalog" aria-label="Streetwear products" aria-busy={status === "loading"}>
      <div className="urbx-shop__grid">{visible.map((product, index) => <article className="urbx-shop__product" key={product.handle}>
        <div className="urbx-shop__photo">
          <div className="urbx-shop__image-target" {...editor.target(`product.${product.handle}`, product.title)}><StorefrontLink to={`/products/${encodeURIComponent(product.handle)}`} ariaLabel={product.title}>
            {product.thumbnail_url ? <img src={product.thumbnail_url} alt={product.title} width="450" height="490" loading={index < 2 ? "eager" : "lazy"} /> : <span className="urbx-shop__no-image">{product.title}</span>}
          </StorefrontLink></div>
          <button className="urbx-shop__heart" aria-label={`${favorites.isFavorite(product.handle) ? "Remove" : "Save"} ${product.title} ${favorites.isFavorite(product.handle) ? "from" : "to"} wishlist`} aria-pressed={favorites.isFavorite(product.handle)} onClick={() => favorites.toggleFavorite(product)}>
            {favorites.isFavorite(product.handle) ? <PiHeartFill /> : <PiHeart />}
          </button>
        </div>
        <h2 {...editor.target(`product.${product.handle}`, product.title)}><StorefrontLink to={`/products/${encodeURIComponent(product.handle)}`}>{product.title}</StorefrontLink></h2>
        <div className="urbx-shop__price"><strong>{product.price_lyd == null ? "View price" : money(product.price_lyd)}</strong>
          <button aria-label={`Choose size for ${product.title}`} onClick={() => { setSelectedProduct(product); setPanel("product"); cart?.clearError(); }}><PiPlus aria-hidden="true" /></button>
        </div>
      </article>)}</div>
      {status === "error" && <p className="urbx-home__catalog-message" role="alert">The drop couldn’t load. <button onClick={() => setReload(value => value + 1)}>Try again</button></p>}
      {status === "ready" && !visible.length && <div className="urbx-home__catalog-message"><p>{products.length ? "No pieces match these filters." : "New pieces are on their way."}</p>{products.length > 0 && <button onClick={clearFilters}>Clear filters</button>}</div>}
    </section>

    <UrbxNavigation profile={profile} active="categories" />
    {notice && <div className="urbx-home__toast" role="status">{notice}<button onClick={() => navigate("/cart")}>View bag<PiArrowRight /></button></div>}

    <dialog className="urbx-home__dialog" ref={dialog} aria-labelledby="urbx-shop-panel" onCancel={event => { event.preventDefault(); close(); }}>
      <button className="urbx-home__dialog-close" aria-label="Close" disabled={cart?.pending} onClick={close}><PiX /></button>
      <h2 id="urbx-shop-panel">{panel === "menu" ? profile.name : panel === "filter" ? "Filter the drop" : selectedProduct?.title}</h2>
      {panel === "menu" ? <nav aria-label="Menu">{navigation.map(item => <StorefrontLink key={item.key} to={item.to} onNavigate={close}>{item.label}<PiArrowRight /></StorefrontLink>)}
        <StorefrontLink to="/contact" onNavigate={close}>Help & support<PiArrowRight /></StorefrontLink></nav>
        : panel === "filter" ? <form className="urbx-shop__filter-form" onSubmit={event => { event.preventDefault(); setCategory(draftCategory); setMaxPrice(draftPrice === "" ? null : Number(draftPrice)); close(); }}>
          <label>Category<select value={draftCategory} onChange={event => setDraftCategory(event.target.value)}><option value="">All categories</option>{categoryNames.map(name => <option key={name}>{name}</option>)}</select></label>
          <label>Maximum price ({visualPreview ? "USD · design preview" : currency.toUpperCase()})<input type="number" min="0" step="0.01" value={draftPrice} onChange={event => setDraftPrice(event.target.value)} placeholder="No limit" /></label>
          <button className="urbx-home__add" type="submit">APPLY FILTERS<PiArrowRight /></button>
          <button className="urbx-shop__reset" type="button" onClick={() => { setDraftCategory(""); setDraftPrice(""); }}>Reset filters</button>
        </form> : panel === "product" ? <>
          {selectedProduct?.thumbnail_url && <img className="urbx-home__quick-photo" src={selectedProduct.thumbnail_url} alt={selectedProduct.title} />}
          {purchase ? <><p>Choose your size</p><div className="urbx-home__sizes">{purchase.variants.map(variant => <button key={variant.id} disabled={!variant.available_for_sale || cart?.pending} aria-pressed={selectedVariant === variant.id} onClick={() => setSelectedVariant(variant.id)}>{variant.options.size || variant.title}</button>)}</div>
            <button className="urbx-home__add" disabled={!selectedVariant || cart?.pending || cart?.capability.online_checkout.status !== "available"} onClick={async () => {
              if (!cart || !selectedVariant) return;
              try { await cart.addItem(selectedVariant); setPanel(null); setNotice(`${selectedProduct?.title} added to your bag`); } catch { /* Safe error comes from CartContext. */ }
            }}>{cart?.pending ? "ADDING…" : "ADD TO CART"}<PiBag /></button></> : !purchaseError && <p role="status">Loading available sizes…</p>}
          {(purchaseError || cart?.error) && <p role="alert">{purchaseError || cart?.error}</p>}
          {cart?.capability.online_checkout.status !== "available" && <p>This store isn’t accepting checkout yet. You can still browse the collection.</p>}
        </> : null}
    </dialog>
  </div>;
}
