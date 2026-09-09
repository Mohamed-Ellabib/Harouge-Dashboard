import { useEffect, useRef, useState, type CSSProperties } from "react";
import { PiBag, PiCaretLeft, PiDotsThreeBold, PiHeart, PiHeartFill, PiPlus, PiX } from "react-icons/pi";
import { fetchStorefrontProductDetail, fetchStorefrontPurchaseOptions, isStorefrontApiError } from "../../api/storefront-api";
import { useOptionalCart } from "../../commerce/CartContext";
import { useFavorites } from "../../commerce/FavoritesContext";
import { isStorefrontEditorPreviewEnabled, isVisualPreviewEnabled } from "../../config";
import { formatStorefrontMoney } from "../../lib/money";
import { StorefrontLink, useStorefrontLocation } from "../../lib/navigation";
import type { ConfiguredStorefrontProfileDto, StorefrontProductDetailDto, StorefrontPurchaseOptionsDto } from "../../types";
import { useGlowBeautyDesignEditor } from "../glow-beauty/GlowBeautyDesignEditor";
import { initialUrbxVariant, selectUrbxOption, urbxProductImages } from "./urbx-product";
import "./urbx-welcome.css";
import "./urbx-home.css";
import "./urbx-product.css";

export default function UrbxProductDetailsPage({ profile, handle }: { profile: ConfiguredStorefrontProfileDto; handle: string }) {
  const editor = useGlowBeautyDesignEditor();
  const cart = useOptionalCart();
  const favorites = useFavorites();
  const location = useStorefrontLocation();
  const [product, setProduct] = useState<StorefrontProductDetailDto | null>(null);
  const [purchase, setPurchase] = useState<StorefrontPurchaseOptionsDto | null>(null);
  const [variantId, setVariantId] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const [purchaseError, setPurchaseError] = useState("");
  const [reload, setReload] = useState(0);
  const [activeImage, setActiveImage] = useState(0);
  const [imageError, setImageError] = useState(false);
  const [notice, setNotice] = useState("");
  const [adding, setAdding] = useState(false);
  const addLock = useRef(false);
  const [panel, setPanel] = useState<"size" | "menu" | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const currency = cart?.capability.online_checkout.currency_code ?? "lyd";
  const available = cart?.capability.online_checkout.status === "available";
  const visualPreview = import.meta.env.DEV && isVisualPreviewEnabled() && !isStorefrontEditorPreviewEnabled() && !new URLSearchParams(location.search).has("setup-preview");
  const selected = purchase?.variants.find(item => item.id === variantId);
  const images = product ? urbxProductImages(product) : [];
  const imageIndex = Math.min(activeImage, Math.max(0, images.length - 1));
  const sizes = purchase?.options.find(option => option.name === "size")?.values ?? [];
  const colors = purchase?.options.find(option => option.name === "color")?.values ?? [];
  const money = (amount: number) => visualPreview ? `$${amount.toFixed(2)}` : formatStorefrontMoney(amount, currency, "en-LY");
  const palette = { "--urbx-accent": profile.branding.primary_color || "#d5ff00", "--urbx-canvas": profile.branding.secondary_color || "#070707" } as CSSProperties;
  const productTarget = editor.target(`product.${handle}`, "product name, description, photography and prices");
  const descriptionParts = product?.description?.match(/^([\s\S]*[.!?])\s+([^.!?]+[.!?])$/);

  useEffect(() => {
    const controller = new AbortController();
    setStatus("loading"); setProduct(null); setPurchase(null); setVariantId(""); setPurchaseError("");
    setActiveImage(0); setNotice("");
    const detail = fetchStorefrontProductDetail(handle, { signal: controller.signal });
    const options = fetchStorefrontPurchaseOptions(handle, currency, { signal: controller.signal }).catch(() => {
      if (!controller.signal.aborted) setPurchaseError("Sizes and pricing couldn’t load. Please try again.");
      return null;
    });
    void Promise.all([detail, options]).then(([item, choices]) => {
      if (controller.signal.aborted) return;
      setProduct(item); setPurchase(choices); setVariantId(initialUrbxVariant(choices?.variants ?? [])?.id ?? ""); setStatus("ready");
    }).catch(error => {
      if (!controller.signal.aborted) setStatus(isStorefrontApiError(error) && error.code === "not_found" ? "missing" : "error");
    });
    return () => controller.abort();
  }, [handle, currency, profile, reload]);

  useEffect(() => { document.title = `${product?.title ?? "Product"} | ${profile.name}`; }, [product?.title, profile.name]);
  useEffect(() => { setImageError(false); }, [images[imageIndex]]);
  useEffect(() => {
    if (panel) { trigger.current = document.activeElement as HTMLElement; dialog.current?.showModal(); }
    else { dialog.current?.close(); trigger.current?.focus(); }
  }, [panel]);

  const addToCart = async () => {
    if (!cart || !available || !selected?.available_for_sale || cart.pending || addLock.current) return;
    addLock.current = true; setAdding(true); setNotice(""); cart.clearError();
    try { await cart.addItem(selected.id); setNotice("Added to your bag."); }
    catch { /* The shared cart supplies the actionable error; never show a success on failure. */ }
    finally { addLock.current = false; setAdding(false); }
  };

  const share = async () => {
    const url = new URL(window.location.pathname, window.location.origin);
    // Do not share the editor channel or private creation-draft query parameters.
    if (visualPreview) { url.searchParams.set("preview", "1"); url.searchParams.set("template", "urbx"); }
    try {
      if (navigator.share) await navigator.share({ title: product?.title ?? profile.name, url: url.href });
      else { await navigator.clipboard.writeText(url.href); setNotice("Product link copied."); }
      setPanel(null);
    } catch (error) { if (!(error instanceof DOMException && error.name === "AbortError")) setNotice("Sharing is unavailable in this browser."); }
  };

  return <div className="urbx-home urbx-product" style={palette} dir="ltr" lang="en" data-state={status} data-money={visualPreview ? "reference" : "store"}>
    <div className="urbx-product__gallery" aria-label="Product gallery">
      <div className="urbx-product__photograph" {...productTarget}>
        {images.length && !imageError ? <img key={images[imageIndex]} src={images[imageIndex]} alt={`${product?.title}, view ${imageIndex + 1}`} loading="eager" onError={() => setImageError(true)} /> : <span className="urbx-product__image-message">{status === "loading" ? "Loading product…" : "Image unavailable"}</span>}
      </div>
      <header className="urbx-home__header urbx-product__header">
        <StorefrontLink to="/products" ariaLabel="Back to shop" className="urbx-product__back"><PiCaretLeft /></StorefrontLink>
        <StorefrontLink to="/" ariaLabel={`${profile.name} home`} className="urbx-home__identity">
          {profile.branding.logo_url || profile.name === "URBX" ? <img src={profile.branding.logo_url || "/assets/urbx/urbx-wordmark-v1.png"} alt={profile.name} /> : <span>{profile.name}</span>}
        </StorefrontLink>
        <div className="urbx-product__header-actions">
          <button aria-label={favorites.isFavorite(handle) ? "Remove from wishlist" : "Save to wishlist"} aria-pressed={favorites.isFavorite(handle)} disabled={!product} onClick={() => product && favorites.toggleFavorite({ ...product, price_lyd: selected?.unit_price })}>{favorites.isFavorite(handle) ? <PiHeartFill /> : <PiHeart />}</button>
          <button aria-label="More product options" onClick={() => setPanel("menu")}><PiDotsThreeBold /></button>
        </div>
      </header>
      {images.length > 1 && <div className="urbx-product__thumbnails" aria-label="Choose a product view">
        {images.map((src, index) => <button key={src} aria-label={`Show product view ${index + 1}`} aria-pressed={index === imageIndex} onClick={() => setActiveImage(index)}><img src={src} alt="" loading={index < 4 ? "eager" : "lazy"} /></button>)}
      </div>}
      {images.length > 0 && <span className="urbx-product__counter" aria-live="polite">{imageIndex + 1} / {images.length}</span>}
    </div>

    {status !== "ready" ? <div className="urbx-product__state" role="status">
      <h1>{status === "loading" ? "Loading product…" : status === "missing" ? "Product not found" : "This product couldn’t load"}</h1>
      {status === "error" && <button onClick={() => setReload(value => value + 1)}>Try again</button>}
      {status !== "loading" && <StorefrontLink to="/products">Return to shop</StorefrontLink>}
    </div> : product && <section className="urbx-product__information" aria-label="Product information">
      <div className="urbx-product__title"><h1 {...productTarget}>{product.title}</h1><strong {...productTarget}>{selected ? money(selected.unit_price) : "Price unavailable"}</strong></div>
      {product.description && <p className="urbx-product__description" {...productTarget}>{descriptionParts ? <>{descriptionParts[1]} <span>{descriptionParts[2]}</span></> : product.description}</p>}
      {purchaseError && <p className="urbx-product__error" role="alert">{purchaseError} <button onClick={() => setReload(value => value + 1)}>Try again</button></p>}
      {colors.length > 0 && <div className="urbx-product__colors"><p><b>Color:</b> {selected?.options.color}</p><div role="group" aria-label="Select color">{colors.map(color => {
        const next = selectUrbxOption(purchase!.variants, selected, "color", color);
        const swatch = ({ black: "#080909", white: "#fff", grey: "#808080", gray: "#808080", navy: "#16243e", red: "#b32929", green: "#245442" } as Record<string, string>)[color.toLowerCase()];
        return <button className={swatch ? "urbx-product__swatch" : "urbx-product__color-label"} style={swatch ? { backgroundColor: swatch } : undefined} key={color} aria-label={color} aria-pressed={selected?.options.color === color} disabled={!next || adding} onClick={() => next && setVariantId(next.id)}>{!swatch && color}</button>;
      })}</div></div>}
      {sizes.length > 0 && <div className="urbx-product__size-section"><div className="urbx-product__size-heading"><h2>Size</h2><button onClick={() => setPanel("size")}>Size guide</button></div>
        <div className="urbx-product__sizes" role="group" aria-label="Select size">{sizes.map(size => {
          const next = selectUrbxOption(purchase!.variants, selected, "size", size);
          return <button key={size} aria-pressed={selected?.options.size === size} disabled={!next || adding} onClick={() => next && setVariantId(next.id)}>{size}</button>;
        })}</div>
      </div>}
      <div className="urbx-product__accordions">
        <details><summary>Product details<PiPlus aria-hidden="true" /></summary><div {...productTarget}>{product.description || product.subtitle || "Contact the store for more information."}{product.category && <p>Category: {product.category}</p>}</div></details>
        <details><summary>Delivery &amp; returns<PiPlus aria-hidden="true" /></summary><div>
          <h3>{profile.storefront.content.policies.delivery.title.en}</h3><p>{profile.storefront.content.policies.delivery.body.en}</p>
          <h3>{profile.storefront.content.policies.returns.title.en}</h3><p>{profile.storefront.content.policies.returns.body.en}</p>
        </div></details>
      </div>
      {cart?.error && <p className="urbx-product__error" role="alert">{cart.error}</p>}
      {!available && <p className="urbx-product__error">Online ordering is currently unavailable. <StorefrontLink to="/contact">Contact the store</StorefrontLink></p>}
      <button className="urbx-product__add" disabled={!available || !selected?.available_for_sale || adding || cart?.pending} onClick={() => void addToCart()}><PiBag aria-hidden="true" />{adding ? "ADDING…" : selected && !selected.available_for_sale ? "SOLD OUT" : "ADD TO CART"}</button>
      {notice && <p className="urbx-product__notice" role="status">{notice}{notice === "Added to your bag." && <StorefrontLink to="/cart">View bag</StorefrontLink>}</p>}
    </section>}

    <dialog ref={dialog} className="urbx-home__dialog urbx-product__dialog" aria-label={panel === "size" ? "Size guide" : "Product options"} onCancel={event => { event.preventDefault(); setPanel(null); }}>
      <button className="urbx-home__dialog-close" aria-label="Close dialog" onClick={() => setPanel(null)}><PiX /></button>
      <h2>{panel === "size" ? "Size guide" : "Product options"}</h2>
      {panel === "size" ? <><p>Sizes offered: {sizes.join(" · ")}</p><p>For exact measurements and fit advice, contact the store before choosing your size.</p><StorefrontLink to="/contact">Ask about sizing</StorefrontLink></> : <nav><button onClick={() => void share()}>Share product</button><StorefrontLink to="/cart">View shopping bag</StorefrontLink><StorefrontLink to="/contact">Contact the store</StorefrontLink></nav>}
    </dialog>
  </div>;
}
