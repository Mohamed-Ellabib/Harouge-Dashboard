import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { PiArrowRight, PiBag, PiBank, PiCaretLeft, PiCircle, PiCreditCard, PiMapPin, PiMoney, PiRadioButton, PiTruck, PiX } from "react-icons/pi";
import { useCart } from "../../commerce/CartContext";
import { isStorefrontEditorPreviewEnabled, isVisualPreviewEnabled } from "../../config";
import { formatStorefrontMoney } from "../../lib/money";
import { navigate, StorefrontLink, useStorefrontLocation } from "../../lib/navigation";
import type { ConfiguredStorefrontProfileDto, StorefrontCheckoutAddress, StorefrontPaymentMethod, StorefrontShippingOptionDto } from "../../types";
import { urbxCartVariant } from "./urbx-cart";
import { canPlaceUrbxOrder, emptyUrbxAddress } from "./urbx-checkout";
import "./urbx-welcome.css";
import "./urbx-home.css";
import "./urbx-cart.css";
import "./urbx-checkout.css";

export default function UrbxCheckoutPage({ profile }: { profile: ConfiguredStorefrontProfileDto }) {
  const context = useCart();
  const { cart, capability, pending, restoring, error, indeterminateCompletion } = context;
  const location = useStorefrontLocation();
  const reference = import.meta.env.DEV && isVisualPreviewEnabled() && !isStorefrontEditorPreviewEnabled() && !new URLSearchParams(location.search).has("setup-preview");
  const available = capability.online_checkout.status === "available";
  const countries = capability.online_checkout.country_codes;
  const methods = capability.online_checkout.payment_methods.filter(method => !reference || method === "cod");
  const [address, setAddress] = useState<StorefrontCheckoutAddress | null>(null);
  const [draft, setDraft] = useState(() => emptyUrbxAddress(countries[0] ?? ""));
  const [shipping, setShipping] = useState<StorefrontShippingOptionDto[]>([]);
  const [selectedShipping, setSelectedShipping] = useState("");
  const [preparedCart, setPreparedCart] = useState<string | null>(null);
  const [payment, setPayment] = useState<StorefrontPaymentMethod>(methods[0] ?? "cod");
  const [editing, setEditing] = useState(false);
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState("");
  const lock = useRef(false);
  const previewInitialized = useRef<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const editTrigger = useRef<HTMLElement | null>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const busy = pending || working;
  const selected = shipping.find(option => option.id === selectedShipping);
  const ready = canPlaceUrbxOrder(cart, preparedCart, payment, methods, busy || restoring || indeterminateCompletion || !available);
  const palette = { "--urbx-accent": profile.branding.primary_color || "#d5ff00", "--urbx-canvas": profile.branding.secondary_color || "#070707" } as CSSProperties;
  const money = (amount: number) => reference ? `$${amount.toFixed(2)}` : formatStorefrontMoney(amount, cart?.currency_code ?? "lyd", "en-LY");
  const countryName = (code: string) => new Intl.DisplayNames(["en"], { type: "region" }).of(code.toUpperCase()) ?? code;

  useEffect(() => { document.title = `Checkout | ${profile.name}`; }, [profile.name]);
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);
  useEffect(() => {
    if (editing) { editTrigger.current = document.activeElement as HTMLElement; dialog.current?.showModal(); }
    else if (dialog.current?.open) { dialog.current.close(); editTrigger.current?.focus(); }
  }, [editing]);

  const saveAddress = async (next: StorefrontCheckoutAddress) => {
    if (!cart || busy || lock.current || indeterminateCompletion) return;
    lock.current = true; setWorking(true); setPreparedCart(null); setNotice(""); context.clearError();
    try {
      const options = await context.submitAddress(next);
      setAddress(next); setDraft(next); setShipping(options); setSelectedShipping("");
      if (options.length === 1) {
        await context.selectShipping(options[0].id);
        setSelectedShipping(options[0].id); setPreparedCart(cart.id);
      }
      setEditing(false);
      if (!options.length) setNotice("No delivery option is available for this address. Edit your details or try again.");
    } catch { /* Shared errors remain actionable; no stale shipping approval survives an address edit. */ }
    finally { lock.current = false; setWorking(false); }
  };

  // Only the standalone, local design preview starts with the reference's fictional address.
  // Live stores and DB-backed creation trials always require customer-entered delivery details.
  useEffect(() => {
    if (!reference || restoring || !cart?.items.length || !available || previewInitialized.current === cart.id) return;
    previewInitialized.current = cart.id;
    void import("../../dev/visual-preview").then(module => saveAddress(module.urbxCheckoutReferenceAddress()));
  }, [reference, restoring, cart?.id, available]);

  const chooseShipping = async (id: string) => {
    if (!cart || busy || lock.current || !shipping.some(option => option.id === id)) return;
    lock.current = true; setWorking(true); setPreparedCart(null); setNotice("");
    try { await context.selectShipping(id); setSelectedShipping(id); setPreparedCart(cart.id); }
    catch { /* The shared cart retains the generic error. */ }
    finally { lock.current = false; setWorking(false); }
  };

  const placeOrder = async () => {
    if (!ready || lock.current) return;
    lock.current = true; setWorking(true);
    try { await context.completeOrder(payment); navigate("/order-confirmation", { replace: true }); }
    catch { /* Never make a second order after an ambiguous completion; use shared recovery. */ }
    finally { lock.current = false; setWorking(false); }
  };

  const openDetails = () => { setDraft(address ?? emptyUrbxAddress(countries[0] ?? "")); setEditing(true); };
  const submitDetails = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void saveAddress(draft); };
  const updateDraft = (field: keyof StorefrontCheckoutAddress, value: string) => setDraft(current => ({ ...current, [field]: value }));

  return <div className="urbx-home urbx-cart urbx-checkout" style={palette} dir="ltr" lang="en" data-money={reference ? "reference" : "store"}>
    <header className="urbx-home__header">
      <StorefrontLink to="/cart" ariaLabel="Back to cart" className="urbx-cart__back"><PiCaretLeft /></StorefrontLink>
      <StorefrontLink to="/" ariaLabel={`${profile.name} home`} className="urbx-home__identity">{profile.branding.logo_url || profile.name === "URBX" ? <img src={profile.branding.logo_url || "/assets/urbx/urbx-wordmark-v1.png"} alt={profile.name} /> : <span>{profile.name}</span>}</StorefrontLink>
      <StorefrontLink to="/cart" ariaLabel="Your cart" className="urbx-home__bag"><PiBag /></StorefrontLink>
    </header>
    <section className="urbx-checkout__content" aria-label="Checkout">
      <h1>CHECKOUT</h1>
      {error && !editing && <p className="urbx-checkout__notice" ref={errorRef} role="alert" tabIndex={-1}>{error}</p>}
      {!available ? <div className="urbx-cart__empty"><h2>Checkout is unavailable.</h2><StorefrontLink to="/products">Continue shopping</StorefrontLink></div>
        : restoring ? <p className="urbx-cart__empty" role="status">Preparing checkout…</p>
        : indeterminateCompletion ? <div className="urbx-cart__empty"><h2>Your order needs verification.</h2><p>Don’t place another order. Check the result of this order safely.</p><button className="urbx-cart__checkout" disabled={busy} onClick={() => void context.retryCompletion()}>CHECK ORDER RESULT</button></div>
        : !cart?.items.length ? <div className="urbx-cart__empty"><h2>Your cart is empty.</h2><StorefrontLink to="/products" className="urbx-cart__checkout">SHOP THE DROP <PiArrowRight /></StorefrontLink></div>
        : <>
          <section className="urbx-checkout__delivery" aria-labelledby="urbx-delivery-heading">
            <div className="urbx-checkout__section-heading"><h2 id="urbx-delivery-heading">Delivery details</h2><button disabled={busy} onClick={openDetails}>{address ? "Edit" : "Add"}</button></div>
            <div className="urbx-checkout__address urbx-checkout__box"><PiMapPin />{address ? <div><strong>{address.first_name} {address.last_name}</strong><p>{address.address_1}<br />{address.city}, {countryName(address.country_code)}</p><p>{address.email}</p></div> : <div><strong>Add your delivery details</strong><p>Enter your name, address and email to see delivery options.</p><button onClick={openDetails} disabled={busy}>Add delivery details <PiArrowRight /></button></div>}</div>
            {shipping.length > 1 ? <fieldset className="urbx-checkout__shipping-options" disabled={busy}><legend>Choose delivery</legend>{shipping.map(option => <label className="urbx-checkout__box" key={option.id}><input type="radio" name="urbx-shipping" checked={selectedShipping === option.id} onChange={() => void chooseShipping(option.id)} /><span>{option.name}</span><strong>{money(option.amount)}</strong></label>)}</fieldset> : <div className="urbx-checkout__shipping urbx-checkout__box"><PiTruck /><div><strong>{selected?.name ?? (busy ? "Checking delivery…" : "Choose delivery")}</strong><p>{reference && selected ? "3–5 business days" : selected ? "Delivery arranged by the store" : "Available after your address is saved"}</p></div>{selected && <b>{selected.amount === 0 ? "FREE" : money(selected.amount)}</b>}</div>}
            {notice && <p className="urbx-checkout__notice" role="status">{notice}</p>}
          </section>
          <section className="urbx-checkout__payments" aria-labelledby="urbx-payment-heading">
            <h2 id="urbx-payment-heading">Payment method</h2>
            <fieldset disabled={busy}><legend className="urbx-cart__sr">Select payment method</legend>
              {methods.map(method => <label className="urbx-checkout__payment urbx-checkout__box" key={method} data-selected={payment === method}>
                {method === "cod" ? <PiMoney /> : <PiBank />}<span><strong>{method === "cod" ? "Cash on delivery" : "Manual bank transfer"}</strong><small>{method === "cod" ? "Pay when your order arrives" : "Instructions appear after confirming"}</small></span><input className="urbx-cart__sr" type="radio" name="urbx-payment" value={method} checked={payment === method} onChange={() => setPayment(method)} />{payment === method ? <PiRadioButton className="urbx-checkout__radio" aria-hidden="true" /> : <PiCircle className="urbx-checkout__radio" aria-hidden="true" />}
              </label>)}
              <label className="urbx-checkout__payment urbx-checkout__box" aria-disabled="true"><PiCreditCard /><span><strong>Credit / debit card</strong><small>Not available yet</small></span><input className="urbx-cart__sr" type="radio" name="urbx-payment" disabled aria-label="Credit or debit card — unavailable" /><PiCircle className="urbx-checkout__radio" aria-hidden="true" /></label>
            </fieldset>
          </section>
          <section className="urbx-checkout__summary" aria-labelledby="urbx-summary-heading">
            <div className="urbx-checkout__section-heading"><h2 id="urbx-summary-heading">Order summary</h2><span>{cart.items.reduce((count, item) => count + item.quantity, 0)} items</span></div>
            <div className="urbx-checkout__items">{cart.items.map(item => <article className="urbx-checkout__item" key={item.id}>
              <div className="urbx-checkout__photo">{item.thumbnail_url ? <img src={item.thumbnail_url} alt={item.title} /> : <span>Image unavailable</span>}</div>
              <div><h3>{item.title}</h3><p>{urbxCartVariant(item.variant_title)}{urbxCartVariant(item.variant_title) ? " · " : ""}Qty {item.quantity}</p></div><strong>{money(item.total)}</strong>
            </article>)}</div>
            <dl className="urbx-checkout__totals"><div><dt>Subtotal</dt><dd>{money(cart.item_subtotal)}</dd></div><div><dt>Shipping</dt><dd>{cart.shipping_method_selected && preparedCart === cart.id ? money(cart.shipping_total) : "Not selected"}</dd></div><div className="urbx-checkout__total"><dt>{preparedCart === cart.id ? "Total" : "Current total"}</dt><dd>{money(cart.total)}</dd></div></dl>
          </section>
          <button className="urbx-checkout__place" disabled={!ready} onClick={() => void placeOrder()}>{busy ? "PLEASE WAIT…" : "PLACE ORDER"}<PiArrowRight /></button>
          {!preparedCart && !busy && <p className="urbx-checkout__notice" role="status">Save your delivery details and select delivery before placing your order.</p>}
          <p className="urbx-checkout__terms">By placing your order, you agree to our <StorefrontLink to="/terms">Terms.</StorefrontLink></p>
        </>}
    </section>
    <dialog className="urbx-home__dialog urbx-checkout__dialog" ref={dialog} aria-labelledby="urbx-address-title" onCancel={event => { if (busy) event.preventDefault(); else setEditing(false); }}>
      <h2 id="urbx-address-title">Delivery details</h2><button className="urbx-home__dialog-close" aria-label="Close delivery details" disabled={busy} onClick={() => setEditing(false)}><PiX /></button>
      <form onSubmit={submitDetails}><fieldset disabled={busy}><legend className="urbx-cart__sr">Delivery address</legend>
        <div className="urbx-checkout__field-row"><label>First name<input required maxLength={120} autoComplete="given-name" value={draft.first_name} onChange={event => updateDraft("first_name", event.target.value)} /></label><label>Last name<input required maxLength={120} autoComplete="family-name" value={draft.last_name} onChange={event => updateDraft("last_name", event.target.value)} /></label></div>
        <label>Email address<input required type="email" inputMode="email" maxLength={320} autoComplete="email" value={draft.email} onChange={event => updateDraft("email", event.target.value)} /></label>
        <label>Address<input required maxLength={240} autoComplete="street-address" value={draft.address_1} onChange={event => updateDraft("address_1", event.target.value)} /></label>
        <div className="urbx-checkout__field-row"><label>City<input required maxLength={120} autoComplete="address-level2" value={draft.city} onChange={event => updateDraft("city", event.target.value)} /></label><label>Country<select required autoComplete="country" value={draft.country_code} onChange={event => updateDraft("country_code", event.target.value)}>{countries.map(country => <option key={country} value={country}>{countryName(country)}</option>)}</select></label></div>
        <label>Phone number (optional)<input type="tel" maxLength={40} autoComplete="tel" value={draft.phone ?? ""} onChange={event => updateDraft("phone", event.target.value)} /></label>
        {error && editing && <p className="urbx-checkout__notice" role="alert">{error}</p>}
        <button className="urbx-home__add" type="submit">{busy ? "Saving…" : "Save delivery details"}</button>
      </fieldset></form>
    </dialog>
  </div>;
}
