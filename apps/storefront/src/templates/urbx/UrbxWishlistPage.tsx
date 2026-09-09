import { useEffect, useRef, useState, type CSSProperties } from "react";
import { PiArrowRight, PiBag, PiCaretDown, PiCaretLeft, PiHeart, PiHeartFill } from "react-icons/pi";
import { fetchStorefrontProductDetail, fetchStorefrontPurchaseOptions, isStorefrontApiError } from "../../api/storefront-api";
import { useOptionalCart } from "../../commerce/CartContext";
import { useFavorites } from "../../commerce/FavoritesContext";
import { isStorefrontEditorPreviewEnabled, isVisualPreviewEnabled } from "../../config";
import { formatStorefrontMoney } from "../../lib/money";
import { StorefrontLink, useStorefrontLocation } from "../../lib/navigation";
import type { ConfiguredStorefrontProfileDto, StorefrontProductCardDto, StorefrontProductDetailDto, StorefrontPurchaseOptionsDto } from "../../types";
import { useGlowBeautyDesignEditor } from "../glow-beauty/GlowBeautyDesignEditor";
import UrbxNavigation from "./UrbxNavigation";
import { filterUrbxShopProducts } from "./urbx-shop-catalog";
import { initialUrbxWishlistVariant, moveUrbxWishlistItem, urbxWishlistVariantLabel } from "./urbx-wishlist";
import "./urbx-welcome.css";
import "./urbx-home.css";
import "./urbx-wishlist.css";

function WishlistCard({ saved, profile, currency, reference, busy, moving, canOrder, onRemove, onMove }: {
  saved: StorefrontProductCardDto; profile: ConfiguredStorefrontProfileDto; currency: string;
  reference: boolean; busy: boolean; moving: boolean; canOrder: boolean;
  onRemove: () => void; onMove: (variantId: string, title: string) => Promise<void>;
}) {
  const editor = useGlowBeautyDesignEditor();
  const [product, setProduct] = useState<StorefrontProductDetailDto | null>(null);
  const [purchase, setPurchase] = useState<StorefrontPurchaseOptionsDto | null>(null);
  const [variantId, setVariantId] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const [retry, setRetry] = useState(0);
  const [imageError, setImageError] = useState(false);
  const title = product?.title ?? saved.title;
  const image = product ? product.thumbnail_url ?? product.image_urls[0] : saved.thumbnail_url;
  const selected = purchase?.variants.find(variant => variant.id === variantId);
  const multipleColors = new Set(purchase?.variants.map(variant => variant.options.color).filter(Boolean)).size > 1;
  const target = editor.target(`product.${saved.handle}`, "product name, photography and prices");
  const money = (amount: number) => reference ? `$${amount.toFixed(2)}` : formatStorefrontMoney(amount, currency, "en-LY");

  useEffect(() => {
    const controller = new AbortController();
    setStatus("loading"); setProduct(null); setPurchase(null); setVariantId("");
    void Promise.all([
      fetchStorefrontProductDetail(saved.handle, { signal: controller.signal }),
      fetchStorefrontPurchaseOptions(saved.handle, currency, { signal: controller.signal }),
    ]).then(([detail, options]) => {
      if (controller.signal.aborted) return;
      setProduct(detail); setPurchase(options);
      setVariantId(initialUrbxWishlistVariant(options.variants, reference && saved.handle === "no-rules-hoodie" ? "L" : "M")?.id ?? "");
      setStatus("ready");
    }).catch(error => {
      if (!controller.signal.aborted) setStatus(isStorefrontApiError(error) && error.code === "not_found" ? "missing" : "error");
    });
    return () => controller.abort();
  }, [saved.handle, currency, reference, profile, retry]);
  useEffect(() => setImageError(false), [image]);

  return <article className="urbx-wishlist__card" aria-label={title} aria-busy={status === "loading" || moving}>
    <div className="urbx-wishlist__photo">
      <StorefrontLink to={`/products/${encodeURIComponent(saved.handle)}`} ariaLabel={`View ${title}`}>
        {image && !imageError ? <img src={image} alt={title} onError={() => setImageError(true)} {...target} /> : <span {...target}>Image unavailable</span>}
      </StorefrontLink>
      <button className="urbx-wishlist__heart" aria-label={`Remove ${title} from wishlist`} aria-pressed="true" disabled={busy} onClick={onRemove}><PiHeartFill aria-hidden="true" /></button>
    </div>
    <h2 {...target}><StorefrontLink to={`/products/${encodeURIComponent(saved.handle)}`}>{title}</StorefrontLink></h2>
    <div className="urbx-wishlist__meta"><span>{selected?.options.color ?? ""}</span><strong {...target}>{selected ? money(selected.unit_price) : status === "loading" ? "…" : "—"}</strong></div>
    <div className="urbx-wishlist__select">
      <select aria-label={`Choose size for ${title}`} value={variantId} disabled={busy || status !== "ready" || !purchase?.variants.length} onChange={event => setVariantId(event.target.value)}>
        {!purchase?.variants.length && <option value="">{status === "loading" ? "Loading sizes…" : "Unavailable"}</option>}
        {purchase?.variants.map(variant => <option key={variant.id} value={variant.id} disabled={!variant.available_for_sale}>{urbxWishlistVariantLabel(variant, multipleColors)}{!variant.available_for_sale ? " — sold out" : ""}</option>)}
      </select><PiCaretDown aria-hidden="true" />
    </div>
    <button className="urbx-wishlist__move" disabled={busy || !canOrder || status !== "ready" || !selected?.available_for_sale} onClick={() => selected && void onMove(selected.id, title)}><PiBag aria-hidden="true" />{moving ? "MOVING…" : status === "ready" && !selected?.available_for_sale ? "SOLD OUT" : "MOVE TO CART"}</button>
    {status === "error" && <p className="urbx-wishlist__card-message" role="alert">Sizes and pricing couldn’t load. <button onClick={() => setRetry(value => value + 1)}>Try again</button></p>}
    {status === "missing" && <p className="urbx-wishlist__card-message">This product is no longer available.</p>}
  </article>;
}

export default function UrbxWishlistPage({ profile }: { profile: ConfiguredStorefrontProfileDto }) {
  const favorites = useFavorites();
  const cart = useOptionalCart();
  const location = useStorefrontLocation();
  const [movingHandle, setMovingHandle] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const moveLock = useRef(false);
  const reference = import.meta.env.DEV && isVisualPreviewEnabled() && !isStorefrontEditorPreviewEnabled() && !new URLSearchParams(location.search).has("setup-preview");
  const products = reference ? filterUrbxShopProducts(favorites.favorites, { query: "", category: "", maxPrice: null, sort: "featured" }) : favorites.favorites;
  const currency = cart?.capability.online_checkout.currency_code ?? "lyd";
  const canOrder = cart?.capability.online_checkout.status === "available";
  const busy = Boolean(movingHandle || cart?.pending || cart?.restoring);
  const bagCount = cart?.cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  const palette = { "--urbx-accent": profile.branding.primary_color || "#d5ff00", "--urbx-canvas": profile.branding.secondary_color || "#070707" } as CSSProperties;
  useEffect(() => { document.title = `Wishlist | ${profile.name}`; }, [profile.name]);

  const move = async (saved: StorefrontProductCardDto, variantId: string, title: string) => {
    if (!cart || !canOrder || busy || moveLock.current) return;
    moveLock.current = true; setMovingHandle(saved.handle); setNotice(""); setError(""); cart.clearError();
    try {
      await moveUrbxWishlistItem(variantId, cart.addItem, () => favorites.toggleFavorite(saved));
      setNotice(`${title} moved to your cart.`);
    } catch { setError("Couldn’t move this item to your cart. It’s still saved here. Please try again."); }
    finally { moveLock.current = false; setMovingHandle(null); }
  };

  return <div className="urbx-home urbx-wishlist" style={palette} dir="ltr" lang="en">
    <header className="urbx-home__header urbx-wishlist__header">
      <StorefrontLink to="/products" ariaLabel="Back to shop" className="urbx-wishlist__back"><PiCaretLeft /></StorefrontLink>
      <StorefrontLink to="/" ariaLabel={`${profile.name} home`} className="urbx-home__identity">{profile.branding.logo_url || profile.name === "URBX" ? <img src={profile.branding.logo_url || "/assets/urbx/urbx-wordmark-v1.png"} alt={profile.name} /> : <span>{profile.name}</span>}</StorefrontLink>
      <StorefrontLink to="/cart" className="urbx-home__bag" ariaLabel={`Shopping bag, ${bagCount} ${bagCount === 1 ? "item" : "items"}`}><PiBag />{bagCount > 0 && <b>{bagCount}</b>}</StorefrontLink>
    </header>
    <section className="urbx-wishlist__intro" aria-labelledby="urbx-wishlist-title">
      <h1 id="urbx-wishlist-title">YOUR <span>WISHLIST<img src="/assets/urbx/brush-underline-v1.png" alt="" /></span><PiHeart aria-hidden="true" /></h1>
      <p aria-live="polite">{products.length} saved {products.length === 1 ? "item" : "items"}</p>
    </section>
    {notice && <p className="urbx-wishlist__message" role="status">{notice} <StorefrontLink to="/cart">View cart <PiArrowRight /></StorefrontLink></p>}
    {error && <p className="urbx-wishlist__message" role="alert">{error}</p>}
    {!canOrder && products.length > 0 && <p className="urbx-wishlist__message">Online ordering is currently unavailable. Your wishlist is still saved. <StorefrontLink to="/contact">Contact the store</StorefrontLink></p>}
    {products.length ? <div className="urbx-wishlist__grid">{products.map(saved => <WishlistCard key={saved.handle} saved={saved} profile={profile} currency={currency} reference={reference} busy={busy} moving={movingHandle === saved.handle} canOrder={canOrder} onRemove={() => { favorites.toggleFavorite(saved); setNotice(`${saved.title} removed from your wishlist.`); setError(""); }} onMove={(variantId, title) => move(saved, variantId, title)} />)}</div> : <section className="urbx-wishlist__empty"><PiHeart /><h2>Make it yours.</h2><p>Save your favorites with the heart icon. They’ll be waiting here.</p><StorefrontLink to="/products">EXPLORE THE DROP <PiArrowRight /></StorefrontLink></section>}
    <StorefrontLink to="/products" className="urbx-wishlist__continue">Continue shopping <PiArrowRight aria-hidden="true" /></StorefrontLink>
    <UrbxNavigation profile={profile} active="favorites" />
  </div>;
}
