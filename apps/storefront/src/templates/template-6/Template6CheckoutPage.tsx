import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { PiArrowRight, PiBag, PiBank, PiCaretLeft, PiCircle, PiLockKey, PiMapPin, PiMoney, PiPlusCircle, PiRadioButtonFill as PiRadioButton, PiSealCheckFill, PiTruck, PiX } from "react-icons/pi";
import { SiVisa } from "react-icons/si";
import { useCart } from "../../commerce/CartContext";
import { isStorefrontEditorPreviewEnabled, isVisualPreviewEnabled } from "../../config";
import { formatStorefrontMoney } from "../../lib/money";
import { navigate, StorefrontLink, useStorefrontLocation } from "../../lib/navigation";
import type { ConfiguredStorefrontProfileDto, StorefrontCheckoutAddress, StorefrontPaymentMethod, StorefrontShippingOptionDto } from "../../types";
import { canPlaceUrbxOrder as canPlaceStorefrontOrder, emptyUrbxAddress as emptyAddress } from "../urbx/urbx-checkout";
import { template6CartPhoto, template6CartVariant } from "./template-6-cart";
import "./template-6-home.css";
import "./template-6-cart.css";
import "./template-6-checkout.css";

export default function Template6CheckoutPage({ profile }: { profile: ConfiguredStorefrontProfileDto }) {
  const context = useCart();
  const { cart, capability, pending, restoring, error, indeterminateCompletion } = context;
  const location = useStorefrontLocation();
  const reference = import.meta.env.DEV && isVisualPreviewEnabled() && !isStorefrontEditorPreviewEnabled() && !new URLSearchParams(location.search).has("setup-preview");
  const available = capability.online_checkout.status === "available";
  // UAE and AED are screenshot presentation only. Saved stores use their unchanged capability.
  const countries = reference ? ["ae"] : capability.online_checkout.country_codes;
  const methods = capability.online_checkout.payment_methods.filter(method => !reference || method === "cod");
  const [address, setAddress] = useState<StorefrontCheckoutAddress | null>(null);
  const [draft, setDraft] = useState(() => emptyAddress(countries[0] ?? ""));
  const [shipping, setShipping] = useState<StorefrontShippingOptionDto[]>([]);
  const [selectedShipping, setSelectedShipping] = useState("");
  const [preparedCart, setPreparedCart] = useState<string | null>(null);
  const [payment, setPayment] = useState<StorefrontPaymentMethod>(methods[0] ?? "cod");
  const [sampleCard, setSampleCard] = useState(reference);
  const [panel, setPanel] = useState<"address" | "card" | null>(null);
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState("");
  const lock = useRef(false);
  const initialized = useRef<string | null>(null);
  const recoveryRequested = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const busy = pending || working;
  const selected = shipping.find(option => option.id === selectedShipping);
  const ready = canPlaceStorefrontOrder(cart, preparedCart, payment, methods, busy || restoring || indeterminateCompletion || !available);
  const count = cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  const palette = { "--six-accent": profile.branding.primary_color || "#eeff66", "--six-checkout-link": reference ? "#0085aa" : profile.branding.secondary_color || "#0085aa" } as CSSProperties;
  const money = (value: number) => reference ? `AED ${value.toFixed(2)}` : formatStorefrontMoney(value, cart?.currency_code ?? "lyd", "en-LY");
  const countryName = (code: string) => reference && code === "ae" ? "UAE" : new Intl.DisplayNames(["en"], { type: "region" }).of(code.toUpperCase()) ?? code;

  useEffect(() => { document.title = `Checkout | ${profile.name}`; }, [profile.name]);
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);
  useEffect(() => {
    if (panel && !dialog.current?.open) { trigger.current = document.activeElement as HTMLElement; dialog.current?.showModal(); }
    else if (!panel && dialog.current?.open) { dialog.current.close(); trigger.current?.focus(); }
  }, [panel]);
  useEffect(() => {
    if (recoveryRequested.current && context.confirmation) navigate("/order-confirmation", { replace: true });
  }, [context.confirmation]);

  async function saveAddress(next: StorefrontCheckoutAddress) {
    if (!cart || busy || lock.current || indeterminateCompletion) return;
    lock.current = true; setWorking(true); setPreparedCart(null); setSelectedShipping(""); setNotice(""); context.clearError();
    try {
      const options = await context.submitAddress(next);
      setAddress(next); setDraft(next); setShipping(options);
      if (options.length === 1) {
        await context.selectShipping(options[0].id);
        setSelectedShipping(options[0].id); setPreparedCart(cart.id);
      }
      setPanel(null);
      if (!options.length) setNotice("No delivery option is available for this address. Edit your details and try again.");
    } catch { /* Shared checkout errors remain visible. Previous delivery approval is invalidated. */ }
    finally { lock.current = false; setWorking(false); }
  }
  useEffect(() => {
    if (!reference || restoring || !cart?.items.length || !available || initialized.current === cart.id) return;
    initialized.current = cart.id;
    void import("../../dev/visual-preview").then(module => saveAddress(module.template6CheckoutReferenceAddress()));
  }, [reference, restoring, cart?.id, available]);

  async function chooseShipping(id: string) {
    if (!cart || busy || lock.current || !shipping.some(option => option.id === id)) return;
    lock.current = true; setWorking(true); setPreparedCart(null); context.clearError();
    try { await context.selectShipping(id); setSelectedShipping(id); setPreparedCart(cart.id); }
    catch { /* No optimistic delivery total or approval on failure. */ }
    finally { lock.current = false; setWorking(false); }
  }
  async function placeOrder() {
    if (!ready || lock.current) return;
    // The screenshot's Visa is never a payment method or permission to place a COD order.
    if (sampleCard) { setPanel("card"); return; }
    lock.current = true; setWorking(true);
    try { await context.completeOrder(payment); navigate("/order-confirmation", { replace: true }); }
    catch { /* Ambiguous completion must use the existing recovery flow, never a second order. */ }
    finally { lock.current = false; setWorking(false); }
  }
  const openAddress = () => { setDraft(address ?? emptyAddress(countries[0] ?? "")); setPanel("address"); };
  const updateDraft = (field: keyof StorefrontCheckoutAddress, value: string) => setDraft(current => ({ ...current, [field]: value }));
  const submitAddress = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void saveAddress(draft); };

  return <div className="template-six-home template-six-checkout" style={palette} dir="ltr" lang="en" data-money={reference ? "reference" : "store"}>
    <img className="six-home-background" src="/assets/template-6/home-background-v1.webp" alt="" />
    <header className="six-cart-header">
      <StorefrontLink to="/cart" className="six-cart-header__back" ariaLabel="Back to cart"><PiCaretLeft /></StorefrontLink>
      <h1>CHECKOUT</h1><StorefrontLink to="/cart" className="six-cart-header__bag" ariaLabel="Your cart"><PiBag /></StorefrontLink>
    </header>
    <p className="six-cart-tagline">One last step to your next great find.</p>
    <div className="six-checkout-content">
      {error && !panel && <p className="six-cart-notice" role="alert" tabIndex={-1} ref={errorRef}>{error}</p>}
      {!available ? <section className="six-cart-empty"><h2>Checkout is currently unavailable.</h2><StorefrontLink to="/">Continue shopping</StorefrontLink></section>
        : restoring ? <p className="six-cart-empty" role="status">Preparing checkout…</p>
        : indeterminateCompletion ? <section className="six-cart-empty"><h2>Your order needs verification.</h2><p>Check this order’s result before placing another order.</p><button className="six-cart-checkout" disabled={busy} onClick={() => { recoveryRequested.current = true; void context.retryCompletion().catch(() => undefined); }}>CHECK ORDER RESULT</button></section>
        : !cart?.items.length ? <section className="six-cart-empty"><PiBag /><h2>Your cart is empty.</h2><StorefrontLink to="/">Continue shopping <PiArrowRight /></StorefrontLink></section>
        : <>
          <section className="six-checkout-section" aria-labelledby="six-delivery-address">
            <div className="six-checkout-heading"><h2 id="six-delivery-address">Delivery Address</h2><button onClick={openAddress} disabled={busy}>{address ? "Edit" : "Add"}</button></div>
            <div className="six-checkout-address six-checkout-box">
              <div className="six-checkout-address__body"><PiMapPin />{address ? <address><span className="six-checkout-home-tag">Home</span><strong>{address.first_name} {address.last_name}</strong><p>{address.address_1}<br />{address.city}, {countryName(address.country_code)}</p>{address.phone && <p>{address.phone}</p>}</address> : <div><strong>Add your delivery address</strong><p>Enter your details to see delivery options.</p><button onClick={openAddress} disabled={busy}>Add address <PiArrowRight /></button></div>}</div>
              <button className="six-checkout-instructions" onClick={openAddress} disabled={busy}><PiPlusCircle /> Add delivery instructions</button>
            </div>
          </section>
          <section className="six-checkout-section" aria-labelledby="six-delivery-method">
            <div className="six-checkout-heading"><h2 id="six-delivery-method">Delivery Method</h2></div>
            {shipping.length ? <fieldset className="six-checkout-options" disabled={busy}><legend className="six-cart-sr">Choose delivery</legend>{shipping.map(option => <label key={option.id} className="six-checkout-shipping six-checkout-box" data-selected={selectedShipping === option.id}>
              <input className="six-cart-sr" type="radio" name="six-shipping" checked={selectedShipping === option.id} onChange={() => void chooseShipping(option.id)} />{selectedShipping === option.id ? <PiRadioButton className="six-checkout-radio" /> : <PiCircle className="six-checkout-radio" />}<PiTruck /><span><strong>{option.name}</strong><small>{reference ? "2–3 business days" : "Delivery arranged by the store"}</small></span><b>{money(option.amount)}</b>
            </label>)}</fieldset> : <div className="six-checkout-shipping six-checkout-box"><PiTruck /><span><strong>{busy ? "Checking delivery…" : "Choose delivery"}</strong><small>Available after saving your address</small></span></div>}
            {notice && <p className="six-cart-notice" role="status">{notice}</p>}
          </section>
          <section className="six-checkout-section" aria-labelledby="six-payment-method">
            <div className="six-checkout-heading"><h2 id="six-payment-method">Payment Method</h2></div>
            <fieldset className="six-checkout-options" disabled={busy}><legend className="six-cart-sr">Select payment method</legend>
              {reference && <div className="six-checkout-payment six-checkout-box six-checkout-card" data-selected={sampleCard}>
                <button className="six-checkout-card-choice" onClick={() => setPanel("card")} aria-label="Sample Visa ending in 4242 — card payments are not connected">{sampleCard ? <PiRadioButton className="six-checkout-radio" /> : <PiCircle className="six-checkout-radio" />}<SiVisa className="six-checkout-visa" /><span><strong>Visa ending in 4242</strong><small>Expires 08/28</small></span></button><button className="six-checkout-link" onClick={() => setPanel("card")}>Change</button>
              </div>}
              {methods.map(method => <label className="six-checkout-payment six-checkout-box" key={method} data-selected={!sampleCard && payment === method}>
                <input className="six-cart-sr" type="radio" name="six-payment" checked={!sampleCard && payment === method} onChange={() => { setPayment(method); setSampleCard(false); }} />{!sampleCard && payment === method ? <PiRadioButton className="six-checkout-radio" /> : <PiCircle className="six-checkout-radio" />}{method === "cod" ? <PiMoney /> : <PiBank />}<span><strong>{method === "cod" ? "Cash on Delivery" : "Manual bank transfer"}</strong>{method === "bank_transfer" && <small>Instructions appear after confirming</small>}</span>
              </label>)}
            </fieldset>
            {reference && <button className="six-checkout-add-card" onClick={() => setPanel("card")} disabled={busy}><PiPlusCircle /> Add a new card</button>}
          </section>
          <section className="six-checkout-section six-checkout-order" aria-labelledby="six-your-order">
            <div className="six-checkout-heading"><h2 id="six-your-order">Your Order</h2><span>{count} {count === 1 ? "item" : "items"}</span></div>
            <div className="six-checkout-order__box six-checkout-box">
              <div className="six-checkout-store">{reference || profile.branding.logo_url ? <img src={reference ? "/assets/template-6/zara-logo-v1.webp" : profile.branding.logo_url!} alt={reference ? "ZARA" : profile.name} /> : <PiBag />}<h3>{reference ? "ZARA Brand Store" : profile.name}</h3>{reference && <PiSealCheckFill aria-label="Sample verified badge" />}</div>
              <div className="six-checkout-items">{cart.items.map(item => {
                const photo = template6CartPhoto(item, reference);
                return <article className="six-checkout-item" key={item.id}>
                  <div className="six-checkout-item__photo">{photo ? <img src={photo} alt={item.title} /> : <PiBag />}</div>
                  <div><h3>{item.title}</h3><p>{template6CartVariant(item.variant_title, reference)?.replace("Size ", "")}{item.variant_title ? " · " : ""}Qty {item.quantity}</p></div><span>{money(item.total)}</span>
                </article>;
              })}</div>
              <dl className="six-checkout-totals"><div><dt>Subtotal</dt><dd>{money(cart.item_subtotal)}</dd></div><div><dt>Delivery</dt><dd>{selected && preparedCart === cart.id ? money(cart.shipping_total) : "Not selected"}</dd></div><div className="six-checkout-total"><dt>{preparedCart === cart.id ? "Total" : "Current total"}</dt><dd>{money(cart.total)}</dd></div></dl>
            </div>
          </section>
          <button className="six-checkout-place" disabled={!ready} onClick={() => void placeOrder()}>{busy ? "PLEASE WAIT…" : `PLACE ORDER · ${money(cart.total)}`}<PiArrowRight /></button>
          {!preparedCart && !busy && <p className="six-cart-notice" role="status">Save your address and select delivery before placing your order.</p>}
          <p className="six-checkout-terms">By placing your order, you agree to the <StorefrontLink to="/terms">Terms &amp; Conditions.</StorefrontLink></p>
          <p className="six-cart-secure"><PiLockKey /> Secure checkout</p>
        </>}
    </div>
    <dialog className="six-dialog six-checkout-dialog" ref={dialog} aria-labelledby="six-checkout-dialog-title" onCancel={event => { if (busy) event.preventDefault(); else setPanel(null); }}>
      <button className="six-dialog__close" aria-label="Close checkout dialog" disabled={busy} onClick={() => setPanel(null)}><PiX /></button>
      <h2 id="six-checkout-dialog-title">{panel === "card" ? "Card payments aren’t connected" : "Delivery address"}</h2>
      {panel === "card" ? <><p>The Visa card is sample artwork from this template, not a saved payment card. No card details are collected or charged.</p><p>Select Cash on Delivery to continue with the local preview.</p><button onClick={() => { setSampleCard(false); setPayment("cod"); setPanel(null); }}>Use Cash on Delivery</button></> : <form onSubmit={submitAddress}><fieldset disabled={busy}>
        <legend className="six-cart-sr">Delivery details</legend>
        <div className="six-checkout-field-row"><label>First name<input required maxLength={120} autoComplete="given-name" value={draft.first_name} onChange={event => updateDraft("first_name", event.target.value)} /></label><label>Last name<input required={!reference} maxLength={120} autoComplete="family-name" value={draft.last_name} onChange={event => updateDraft("last_name", event.target.value)} /></label></div>
        <label>Email address<input type="email" required maxLength={320} autoComplete="email" value={draft.email} onChange={event => updateDraft("email", event.target.value)} /></label>
        <label>Address / delivery instructions<textarea required maxLength={240} autoComplete="street-address" rows={3} value={draft.address_1} onChange={event => updateDraft("address_1", event.target.value)} /><small>Include any delivery instructions in your address. They are saved together with your order.</small></label>
        <div className="six-checkout-field-row"><label>City<input required maxLength={120} autoComplete="address-level2" value={draft.city} onChange={event => updateDraft("city", event.target.value)} /></label><label>Country<select required autoComplete="country" value={draft.country_code} onChange={event => updateDraft("country_code", event.target.value)}>{countries.map(country => <option key={country} value={country}>{countryName(country)}</option>)}</select></label></div>
        <label>Phone number (optional)<input type="tel" maxLength={40} autoComplete="tel" value={draft.phone ?? ""} onChange={event => updateDraft("phone", event.target.value)} /></label>
        {error && panel === "address" && <p role="alert" className="six-cart-notice">{error}</p>}
        <button type="submit">{busy ? "Saving…" : "Save delivery details"}</button>
      </fieldset></form>}
    </dialog>
  </div>;
}
