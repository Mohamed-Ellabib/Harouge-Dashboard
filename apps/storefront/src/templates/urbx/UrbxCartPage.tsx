import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { PiArrowRight, PiBag, PiCaretLeft, PiLockSimple, PiMinus, PiPlus, PiTrash } from "react-icons/pi";
import { STOREFRONT_MAX_CART_QUANTITY } from "../../api/storefront-api";
import { useOptionalCart } from "../../commerce/CartContext";
import { isStorefrontEditorPreviewEnabled, isVisualPreviewEnabled } from "../../config";
import { formatStorefrontMoney } from "../../lib/money";
import { navigate, StorefrontLink, useStorefrontLocation } from "../../lib/navigation";
import type { ConfiguredStorefrontProfileDto } from "../../types";
import { urbxCartVariant } from "./urbx-cart";
import "./urbx-welcome.css";
import "./urbx-home.css";
import "./urbx-cart.css";

export default function UrbxCartPage({ profile }: { profile: ConfiguredStorefrontProfileDto }) {
  const context = useOptionalCart();
  const location = useStorefrontLocation();
  const [promo, setPromo] = useState("");
  const [promoNotice, setPromoNotice] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [busy, setBusy] = useState(false);
  const mutationLock = useRef(false);
  const cart = context?.cart;
  const available = context?.capability.online_checkout.status === "available";
  const pending = busy || Boolean(context?.pending);
  const reference = import.meta.env.DEV && isVisualPreviewEnabled() && !isStorefrontEditorPreviewEnabled() && !new URLSearchParams(location.search).has("setup-preview");
  const money = (amount: number) => reference ? `$${amount.toFixed(2)}` : formatStorefrontMoney(amount, cart?.currency_code ?? "lyd", "en-LY");
  const items = cart?.items ?? [];
  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  const palette = { "--urbx-accent": profile.branding.primary_color || "#d5ff00", "--urbx-canvas": profile.branding.secondary_color || "#070707" } as CSSProperties;

  useEffect(() => { document.title = `Your cart | ${profile.name}`; }, [profile.name]);

  const change = async (id: string, title: string, quantity: number | null) => {
    if (!context || !available || pending || mutationLock.current) return;
    mutationLock.current = true; setBusy(true); setAnnouncement(""); context.clearError();
    try {
      if (quantity === null) await context.removeItem(id);
      else await context.updateQuantity(id, quantity);
      setAnnouncement(quantity === null ? `${title} removed from your cart.` : `${title}: quantity ${quantity}.`);
    } catch { /* Shared cart errors remain visible, with no optimistic totals or success on failure. */ }
    finally { mutationLock.current = false; setBusy(false); }
  };

  const applyPromo = (event: FormEvent) => {
    event.preventDefault();
    setPromoNotice(promo.trim() ? "Promo codes aren’t available at this store yet. Your total hasn’t changed." : "Enter a promo code first.");
  };

  return <div className="urbx-home urbx-cart" style={palette} dir="ltr" lang="en" data-money={reference ? "reference" : "store"}>
    <header className="urbx-home__header">
      <StorefrontLink to="/products" ariaLabel="Back to shop" className="urbx-cart__back"><PiCaretLeft /></StorefrontLink>
      <StorefrontLink to="/" ariaLabel={`${profile.name} home`} className="urbx-home__identity">
        {profile.branding.logo_url || profile.name === "URBX" ? <img src={profile.branding.logo_url || "/assets/urbx/urbx-wordmark-v1.png"} alt={profile.name} /> : <span>{profile.name}</span>}
      </StorefrontLink>
      <a href="#cart-items" className="urbx-home__bag" aria-label="Your cart items"><PiBag /></a>
    </header>
    <section className="urbx-cart__content" aria-label="Shopping cart">
      <div className="urbx-cart__heading"><h1>YOUR CART</h1><span aria-live="polite">{count} {count === 1 ? "item" : "items"}</span></div>
      <p className="urbx-cart__sr" role="status">{announcement}</p>
      {context?.error && <div className="urbx-cart__error" role="alert">{context.error}<button onClick={context.clearError}>Dismiss</button></div>}
      {!available ? <section className="urbx-cart__empty"><h2>Checkout is currently unavailable.</h2><p>You can still explore the collection.</p><StorefrontLink to="/products" className="urbx-cart__checkout">CONTINUE SHOPPING <PiArrowRight /></StorefrontLink></section>
        : context?.restoring ? <p className="urbx-cart__empty" role="status">Loading your cart…</p>
        : !items.length ? <section className="urbx-cart__empty"><PiBag /><h2>Your cart is empty.</h2><p>Find your next statement piece.</p><StorefrontLink to="/products" className="urbx-cart__checkout">SHOP THE DROP <PiArrowRight /></StorefrontLink></section>
        : <>
          <section className="urbx-cart__items" id="cart-items" aria-label="Your cart items" aria-busy={pending}>
            {items.map(item => {
              const variant = urbxCartVariant(item.variant_title);
              const photo = item.thumbnail_url ? <img src={item.thumbnail_url} alt={item.title} /> : <span>Image unavailable</span>;
              return <article className="urbx-cart__item" key={item.id}>
                {item.product_handle ? <StorefrontLink to={`/products/${encodeURIComponent(item.product_handle)}`} ariaLabel={`View ${item.title}`} className="urbx-cart__photo">{photo}</StorefrontLink> : <div className="urbx-cart__photo">{photo}</div>}
                <div className="urbx-cart__item-details">
                  <h2>{item.product_handle ? <StorefrontLink to={`/products/${encodeURIComponent(item.product_handle)}`}>{item.title}</StorefrontLink> : item.title}</h2>
                  {variant && <p className="urbx-cart__variant">{variant}</p>}
                  <strong className="urbx-cart__price">{money(item.unit_price)}</strong>
                  <div className="urbx-cart__quantity" role="group" aria-label={`Quantity for ${item.title}`}>
                    <button aria-label={`Decrease ${item.title} quantity`} disabled={pending || item.quantity <= 1} onClick={() => void change(item.id, item.title, item.quantity - 1)}><PiMinus /></button>
                    <output aria-label={`${item.title} quantity`}>{item.quantity}</output>
                    <button aria-label={`Increase ${item.title} quantity`} disabled={pending || item.quantity >= STOREFRONT_MAX_CART_QUANTITY} onClick={() => void change(item.id, item.title, item.quantity + 1)}><PiPlus /></button>
                  </div>
                </div>
                <button className="urbx-cart__remove" aria-label={`Remove ${item.title} from cart`} disabled={pending} onClick={() => void change(item.id, item.title, null)}><PiTrash /></button>
              </article>;
            })}
          </section>
          <form className="urbx-cart__promo" onSubmit={applyPromo}>
            <label className="urbx-cart__sr" htmlFor="urbx-promo-code">Promo code</label>
            <input id="urbx-promo-code" value={promo} maxLength={64} placeholder="Promo code" autoComplete="off" onChange={event => { setPromo(event.target.value); setPromoNotice(""); }} aria-describedby={promoNotice ? "urbx-promo-notice" : undefined} />
            <button type="submit">APPLY</button>
          </form>
          {promoNotice && <p id="urbx-promo-notice" className="urbx-cart__notice" role="status">{promoNotice}</p>}
          <dl className="urbx-cart__totals">
            <div><dt>Subtotal</dt><dd>{money(cart!.item_subtotal)}</dd></div>
            <div><dt>Shipping</dt><dd>{reference || cart!.shipping_method_selected ? money(cart!.shipping_total) : "At checkout"}</dd></div>
            <div className="urbx-cart__total"><dt>{reference || cart!.shipping_method_selected ? "Total" : "Current total"}</dt><dd>{money(cart!.total)}</dd></div>
          </dl>
          <button className="urbx-cart__checkout" disabled={pending} onClick={() => navigate("/checkout")}>CHECKOUT <PiArrowRight /></button>
          <StorefrontLink to="/products" className="urbx-cart__continue">Continue shopping</StorefrontLink>
          <p className="urbx-cart__secure"><PiLockSimple /> Secure checkout</p>
        </>}
    </section>
  </div>;
}
