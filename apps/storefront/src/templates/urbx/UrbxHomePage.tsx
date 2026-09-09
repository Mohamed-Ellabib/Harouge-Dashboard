import { useEffect, useRef, useState, type CSSProperties } from "react";
import { PiArrowRight, PiBag, PiCompass, PiHeart, PiHouseFill, PiList, PiPlus, PiUser, PiX } from "react-icons/pi";
import { fetchStorefrontCatalog, fetchStorefrontPurchaseOptions } from "../../api/storefront-api";
import { useOptionalCart } from "../../commerce/CartContext";
import { isStorefrontEditorPreviewEnabled, isVisualPreviewEnabled } from "../../config";
import { formatStorefrontMoney } from "../../lib/money";
import { navigate, StorefrontLink } from "../../lib/navigation";
import type { ConfiguredStorefrontProfileDto, StorefrontHomeContentDto, StorefrontProductCardDto, StorefrontPurchaseOptionsDto } from "../../types";
import { useGlowBeautyDesignEditor } from "../glow-beauty/GlowBeautyDesignEditor";
import { urbxHomeContent } from "./urbx-home-content";
import "./urbx-welcome.css";
import "./urbx-home.css";

const asset = (name: string) => `/assets/urbx/${name}`;
type HomeTextKey = Exclude<keyof StorefrontHomeContentDto, "image_url" | "promotion_image_url">;
const featuredHandles = ["urbx-oversized-tee", "no-rules-hoodie", "x-cargo-pants"];

export default function UrbxHomePage({ profile }: { profile: ConfiguredStorefrontProfileDto }) {
  const editor = useGlowBeautyDesignEditor();
  const cart = useOptionalCart();
  const home = profile.storefront.content.home ?? urbxHomeContent;
  const text = (key: HomeTextKey) => editor.value(`home.${key}`, home[key].en);
  const [products, setProducts] = useState<StorefrontProductCardDto[]>([]);
  const [catalogStatus, setCatalogStatus] = useState<"loading" | "ready" | "error">("loading");
  const [reload, setReload] = useState(0);
  const [panel, setPanel] = useState<"menu" | "product" | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<StorefrontProductCardDto | null>(null);
  const [purchase, setPurchase] = useState<StorefrontPurchaseOptionsDto | null>(null);
  const [selectedVariant, setSelectedVariant] = useState("");
  const [purchaseError, setPurchaseError] = useState("");
  const [notice, setNotice] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const currency = cart?.capability.online_checkout.currency_code ?? "lyd";
  const visualPreview = import.meta.env.DEV && isVisualPreviewEnabled() && !isStorefrontEditorPreviewEnabled() && !new URLSearchParams(window.location.search).has("setup-preview");
  const money = (amount: number) => visualPreview ? `$${amount.toFixed(2)}` : formatStorefrontMoney(amount, currency, "en-LY");
  const count = cart?.cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  useEffect(() => {
    document.title = `${profile.name} | Home`;
    const controller = new AbortController();
    setCatalogStatus("loading");
    void fetchStorefrontCatalog({ limit: 24, offset: 0, order: "created_at", signal: controller.signal })
      .then(result => {
        if (controller.signal.aborted) return;
        // Merchants' real records remain authoritative, including names, images and prices.
        const ranked = [...result.products].sort((a, b) => {
          const rank = (handle: string) => featuredHandles.includes(handle) ? featuredHandles.indexOf(handle) : 99;
          return rank(a.handle) - rank(b.handle);
        });
        setProducts(ranked.slice(0, 3)); setCatalogStatus("ready");
      }).catch(() => { if (!controller.signal.aborted) setCatalogStatus("error"); });
    return () => controller.abort();
  }, [profile, reload]);

  useEffect(() => {
    if (panel) { trigger.current = document.activeElement as HTMLElement; dialog.current?.showModal(); }
    else { dialog.current?.close(); trigger.current?.focus(); }
  }, [panel]);

  useEffect(() => {
    if (!selectedProduct || panel !== "product") return;
    const controller = new AbortController();
    setPurchase(null); setSelectedVariant(""); setPurchaseError("");
    void fetchStorefrontPurchaseOptions(selectedProduct.handle, currency, { signal: controller.signal })
      .then(value => { if (!controller.signal.aborted) setPurchase(value); })
      .catch(() => { if (!controller.signal.aborted) setPurchaseError("We couldn’t load the sizes. Please close this panel and try again."); });
    return () => controller.abort();
  }, [selectedProduct, panel, currency]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 4200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const colors = { "--urbx-accent": profile.branding.primary_color || "#d5ff00", "--urbx-canvas": profile.branding.secondary_color || "#070707" } as CSSProperties;
  const close = () => { if (!cart?.pending) setPanel(null); };
  const heading = text("heading");
  const categories = profile.storefront.content.brands.items;

  return <div className="urbx-home" dir="ltr" lang="en" style={colors} data-money={visualPreview ? "reference" : "store"}>
    <section className="urbx-home__hero" aria-label="New streetwear drop">
      <img className="urbx-home__hero-art" src={editor.value("home.image_url", home.image_url)}
        alt="Black graffiti hoodie with white CHAOS lettering and lime details" width="1212" height="1298" {...{ fetchpriority: "high" }}
        {...editor.target("home.image_url", "home hero photograph")} />
      <header className="urbx-home__header">
        <button type="button" aria-label="Open menu" aria-expanded={panel === "menu"} onClick={() => setPanel("menu")}><PiList /></button>
        <StorefrontLink className="urbx-home__identity" to="/" ariaLabel={`${profile.name} home`}>
          {profile.branding.logo_url || profile.name === "URBX"
            ? <img src={profile.branding.logo_url || asset("urbx-wordmark-v1.png")} alt={profile.name} />
            : <span>{profile.name}</span>}
        </StorefrontLink>
        <StorefrontLink className="urbx-home__bag" to="/cart" ariaLabel={`Shopping bag, ${count} items`}><PiBag />{count > 0 && <b>{count}</b>}</StorefrontLink>
      </header>
      <p className="urbx-home__eyebrow" {...editor.target("home.eyebrow", "new drop caption")}>{text("eyebrow")}</p>
      <h1 className="urbx-home__headline" {...editor.target("home.heading", "home headline")}>
        {heading === "URBAN VIBES." ? <>URBAN<br />VIBES.</> : heading}
      </h1>
      <div className="urbx-home__statement"><p {...editor.target("home.statement", "hero statement")}>{text("statement")}</p><img src={asset("brush-underline-v1.png")} alt="" /></div>
      <button className="urbx-home__shop" type="button" onClick={() => navigate("/products")} {...editor.target("home.cta_label", "shop button text")}>
        {text("cta_label")}<PiArrowRight aria-hidden="true" />
      </button>
    </section>

    <section className="urbx-home__categories" aria-labelledby="urbx-categories">
      <div className="urbx-home__section-heading"><h2 id="urbx-categories" {...editor.target("home.categories_heading", "categories heading")}>{text("categories_heading")}</h2>
        <button onClick={() => navigate("/categories")} {...editor.target("home.view_all_label", "view all label")}>{text("view_all_label")}</button></div>
      <div className="urbx-home__category-grid">
        {categories.map(category => <button className="urbx-home__category" type="button" key={category.id}
          onClick={() => navigate(`/products?category=${encodeURIComponent(category.slug)}`)}>
          {category.image_url && <img src={editor.value(`category.${category.slug}.image`, category.image_url)} alt="" width="200" height="200" loading="lazy"
            {...editor.target(`category.${category.slug}.image`, `${category.name.en} image`)} />}
          <span {...editor.target(`category.${category.slug}.name`, "category name")}>{editor.value(`category.${category.slug}.name`, category.name.en)}</span>
        </button>)}
      </div>
    </section>

    <section className="urbx-home__promotion" aria-label="Limited drop">
      <img src={editor.value("home.promotion_image_url", home.promotion_image_url)} alt="Black Shadow hoodie with distressed white X artwork" width="1994" height="789" loading="lazy"
        {...editor.target("home.promotion_image_url", "limited drop photograph")} />
      <div className="urbx-home__promotion-copy">
        <p className="urbx-home__promotion-eyebrow" {...editor.target("home.promotion_eyebrow", "promotion caption")}>{text("promotion_eyebrow")}</p>
        <h2 {...editor.target("home.promotion_heading", "promotion heading")}>{text("promotion_heading")}</h2>
        <button type="button" onClick={() => navigate("/products?q=Hoodies")} {...editor.target("home.promotion_detail", "promotion detail")}>{text("promotion_detail")}</button>
      </div>
      <div className="urbx-home__promotion-dots" aria-hidden="true"><i /><i /><i /></div>
    </section>

    <section className="urbx-home__products" aria-labelledby="urbx-best-sellers">
      <div className="urbx-home__section-heading"><h2 id="urbx-best-sellers" {...editor.target("home.products_heading", "products heading")}>{text("products_heading")}</h2>
        <button onClick={() => navigate("/products")} {...editor.target("home.view_all_label", "view all label")}>{text("view_all_label")}</button></div>
      <div className="urbx-home__product-grid" aria-busy={catalogStatus === "loading"}>
        {products.map(product => <article className="urbx-home__product" key={product.handle}>
          <div {...editor.target(`product.${product.handle}`, product.title)}>
            <StorefrontLink className="urbx-home__product-photo" to={`/products/${encodeURIComponent(product.handle)}`} ariaLabel={product.title}>
              {product.thumbnail_url && <img src={product.thumbnail_url} alt={product.title} width="300" height="300" loading="lazy" />}
            </StorefrontLink>
            <h3><StorefrontLink to={`/products/${encodeURIComponent(product.handle)}`}>{product.title}</StorefrontLink></h3>
          </div>
          <div className="urbx-home__product-price"><strong>{product.price_lyd != null ? money(product.price_lyd) : "View price"}</strong>
            <button type="button" aria-label={`Choose size for ${product.title}`} onClick={() => { setSelectedProduct(product); setPanel("product"); cart?.clearError(); }}><PiPlus aria-hidden="true" /></button>
          </div>
        </article>)}
      </div>
      {catalogStatus === "loading" && <p className="urbx-home__catalog-message" role="status">Loading the drop…</p>}
      {catalogStatus === "error" && <p className="urbx-home__catalog-message" role="alert">Products couldn’t load. <button onClick={() => setReload(value => value + 1)}>Try again</button></p>}
      {catalogStatus === "ready" && !products.length && <p className="urbx-home__catalog-message">New pieces are on their way.</p>}
    </section>

    <nav className="urbx-home__bottom-nav" aria-label="Store navigation">
      <StorefrontLink to="/" className="is-active" ariaLabel="Home, current page"><PiHouseFill /><span>HOME</span></StorefrontLink>
      <StorefrontLink to="/categories"><PiBag /><span>SHOP</span></StorefrontLink>
      <StorefrontLink to="/about"><PiCompass /><span>DISCOVER</span></StorefrontLink>
      <StorefrontLink to="/favorites"><PiHeart /><span>WISHLIST</span></StorefrontLink>
      <StorefrontLink to="/account"><PiUser /><span>PROFILE</span></StorefrontLink>
    </nav>
    {notice && <div className="urbx-home__toast" role="status">{notice}<button onClick={() => navigate("/cart")}>View bag<PiArrowRight /></button></div>}

    <dialog className="urbx-home__dialog" ref={dialog} aria-labelledby="urbx-panel-title" onCancel={event => { event.preventDefault(); close(); }}>
      <button className="urbx-home__dialog-close" aria-label="Close" onClick={close} disabled={cart?.pending}><PiX /></button>
      <h2 id="urbx-panel-title">{panel === "menu" ? profile.name : selectedProduct?.title}</h2>
      {panel === "menu" ? <nav aria-label="Menu">{[["Home", "/"], ["Shop the drop", "/products"], ["Your wishlist", "/favorites"], ["Your orders", "/orders"], ["About the brand", "/about"], ["Help & support", "/contact"]].map(([label, url]) =>
        <StorefrontLink key={url} to={url} onNavigate={() => setPanel(null)}>{label}<PiArrowRight /></StorefrontLink>)}</nav> : <>
        {selectedProduct?.thumbnail_url && <img className="urbx-home__quick-photo" src={selectedProduct.thumbnail_url} alt={selectedProduct.title} />}
        {purchase ? <><p>Choose your size</p><div className="urbx-home__sizes">{purchase.variants.map(variant =>
          <button key={variant.id} disabled={!variant.available_for_sale || cart?.pending} aria-pressed={selectedVariant === variant.id} onClick={() => setSelectedVariant(variant.id)}>
            {variant.options.size || variant.title}
          </button>)}</div>
          <button className="urbx-home__add" disabled={!selectedVariant || cart?.pending || cart?.capability.online_checkout.status !== "available"} onClick={async () => {
            if (!cart || !selectedVariant) return;
            try { await cart.addItem(selectedVariant); setPanel(null); setNotice(`${selectedProduct?.title} added to your bag`); }
            catch { /* CartContext supplies a safe retryable message. */ }
          }}>{cart?.pending ? "ADDING…" : "ADD TO CART"}<PiBag /></button></> : !purchaseError && <p role="status">Loading available sizes…</p>}
        {(purchaseError || cart?.error) && <p role="alert">{purchaseError || cart?.error}</p>}
        {cart?.capability.online_checkout.status !== "available" && <p>This store isn’t accepting checkout yet. You can still browse the collection.</p>}
      </>}
    </dialog>
  </div>;
}
