import { useEffect, useRef, useState, type CSSProperties } from "react";
import { PiArrowRight, PiBag, PiCaretLeft, PiChat, PiEnvelopeSimple, PiHeadset, PiMagnifyingGlass, PiPackage, PiPlus, PiX } from "react-icons/pi";
import { useCart } from "../../commerce/CartContext";
import { loadTrackedOrders } from "../../commerce/tracked-orders";
import { isStorefrontEditorPreviewEnabled, isVisualPreviewEnabled } from "../../config";
import { formatStorefrontMoney } from "../../lib/money";
import { StorefrontLink, useStorefrontLocation } from "../../lib/navigation";
import type { ConfiguredStorefrontProfileDto } from "../../types";
import { useGlowBeautyDesignEditor } from "../glow-beauty/GlowBeautyDesignEditor";
import UrbxNavigation from "./UrbxNavigation";
import { urbxSupportContacts, urbxSupportOrders, urbxSupportStatus, type SupportOrder } from "./urbx-support";
import { urbxOrderDetailsPath } from "./urbx-order-details";
import "./urbx-welcome.css";
import "./urbx-home.css";
import "./urbx-cart.css";
import "./urbx-support.css";

type Panel = "orders" | "order-help" | "chat" | "email" | null;

export default function UrbxSupportPage({ profile }: { profile: ConfiguredStorefrontProfileDto }) {
  const { confirmation } = useCart();
  const editor = useGlowBeautyDesignEditor();
  const location = useStorefrontLocation();
  const reference = import.meta.env.DEV && isVisualPreviewEnabled() && !isStorefrontEditorPreviewEnabled() && !new URLSearchParams(location.search).has("setup-preview");
  const [orders, setOrders] = useState<SupportOrder[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [retry, setRetry] = useState(0);
  const [query, setQuery] = useState("");
  const [panel, setPanel] = useState<Panel>(null);
  const [helpOrderId, setHelpOrderId] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const order = orders[0];
  const requestedOrder = new URLSearchParams(location.search).get("order");
  const helpOrder = orders.find(item => String(item.display_id) === helpOrderId) ?? order;
  const heading = editor.value("contact.heading", profile.storefront.content.contact.heading.en);
  const isMock = reference && !confirmation;
  const contacts = urbxSupportContacts(profile.contact, panel === "order-help" && helpOrder ? String(helpOrder.display_id) : undefined);
  const palette = { "--urbx-accent": profile.branding.primary_color || "#d5ff00", "--urbx-canvas": profile.branding.secondary_color || "#070707" } as CSSProperties;
  const money = (value: number, currency: string) => reference ? `$${value.toFixed(2)}` : formatStorefrontMoney(value, currency, "en-LY");
  const quantity = (item: SupportOrder) => item.items.reduce((total, row) => total + row.quantity, 0);
  const faqs = [
    { id: "tracking", question: "Where is my order?", answer: "Open your saved orders to see the latest status shared by the store. Tracking updates appear as the store prepares and ships your order." },
    { id: "returns", question: "How do I request a return?", answer: "Contact the store with your order number and the item you would like to return. Return eligibility and instructions depend on the store’s delivery and returns policy." },
    { id: "changes", question: "Can I change or cancel my order?", answer: "Contact the store as soon as possible with your order number. The store will confirm whether a change or cancellation is possible; sending a request does not cancel your order." },
    { id: "sizes", question: "How do I choose the right size?", answer: "Check the available sizes and size guide on the product page. If you need exact measurements or fit advice, contact the store before ordering." },
  ];
  const filtered = faqs.filter(faq => `${faq.question} ${faq.answer}`.toLowerCase().includes(query.trim().toLowerCase()));

  useEffect(() => { document.title = `Help & support | ${profile.name}`; }, [profile.name]);
  useEffect(() => {
    let active = true;
    setState("loading"); setOrders([]);
    const load = async () => {
      if (reference) {
        if (confirmation) return [confirmation];
        // Read-only visual fixture; never submits an order or mutates commerce.
        const { urbxConfirmationDesignFixture } = await import("../../dev/urbx-confirmation-preview");
        return [urbxConfirmationDesignFixture().order];
      }
      return urbxSupportOrders(await loadTrackedOrders(profile.handle), confirmation);
    };
    void load().then(result => { if (active) { setOrders(result); setState("ready"); } }).catch(() => {
      if (active) { setOrders(confirmation ? [confirmation] : []); setState("error"); }
    });
    return () => { active = false; };
  }, [profile.handle, reference, confirmation, retry]);
  useEffect(() => {
    if (panel) dialog.current?.showModal();
    else dialog.current?.close();
  }, [panel]);
  useEffect(() => {
    if (state === "ready" && requestedOrder && orders.some(item => String(item.display_id) === requestedOrder)) {
      setHelpOrderId(requestedOrder); setPanel("order-help");
    }
  }, [requestedOrder, state, orders]);

  const openContacts = (kind: Exclude<Panel, "orders" | null>) => { setHelpOrderId(order ? String(order.display_id) : null); setPanel(kind); };
  return <section className="urbx-home urbx-cart urbx-support" style={palette} dir="ltr" lang="en" aria-labelledby="urbx-support-title">
    <header className="urbx-home__header">
      <StorefrontLink to="/" className="urbx-cart__back" ariaLabel="Back to home"><PiCaretLeft aria-hidden="true" /></StorefrontLink>
      <StorefrontLink to="/" className="urbx-home__identity" ariaLabel={`${profile.name} home`}>
        {profile.branding.logo_url || profile.name === "URBX" ? <img src={profile.branding.logo_url || "/assets/urbx/urbx-wordmark-v1.png"} alt={profile.name} /> : <span>{profile.name}</span>}
      </StorefrontLink>
      <StorefrontLink to="/cart" className="urbx-home__bag" ariaLabel="Shopping bag"><PiBag aria-hidden="true" /></StorefrontLink>
    </header>
    <div className="urbx-support__content">
      <div className="urbx-support__intro">
        <div className="urbx-support__title-row" data-long-title={heading.length > 18 || undefined}><h1 id="urbx-support-title" {...editor.target("contact.heading", "support heading")}>{heading}</h1><PiHeadset aria-hidden="true" /></div>
        <img className="urbx-support__underline" src="/assets/urbx/brush-underline-v1.png" alt="" />
        <p {...editor.target("contact.body", "support subtitle")}>{editor.value("contact.body", profile.storefront.content.contact.body.en)}</p>
      </div>
      <form className="urbx-support__search" role="search" onSubmit={event => event.preventDefault()}>
        <PiMagnifyingGlass aria-hidden="true" /><input type="search" aria-label="Search for help" placeholder="Search for help..." value={query} onChange={event => setQuery(event.target.value)} />
      </form>
      <section className="urbx-support__latest" aria-labelledby="urbx-latest-order-title" aria-busy={state === "loading"}>
        <div className="urbx-support__section-heading"><h2 id="urbx-latest-order-title">Your latest order</h2><button type="button" onClick={() => setPanel("orders")}>View all</button></div>
        {order ? <article className="urbx-support__order">
          <header><h3><StorefrontLink to={urbxOrderDetailsPath(order.display_id)} ariaLabel={`View order ${order.display_id}`}>#{order.display_id}</StorefrontLink></h3><span className="urbx-support__badge">{urbxSupportStatus(order)}</span></header>
          <div className="urbx-support__order-items">
            {order.items.slice(0, 2).map((item, index) => <div className="urbx-support__photo" key={index}>{item.thumbnail_url ? <img src={item.thumbnail_url} alt={item.title} /> : <PiPackage aria-label="Product image unavailable" />}</div>)}
            <div className="urbx-support__order-total"><p>{quantity(order)} {quantity(order) === 1 ? "item" : "items"}</p><strong>{money(order.total, order.currency_code)}</strong></div>
          </div>
          <button type="button" className="urbx-support__order-help" onClick={() => openContacts("order-help")}>Get help with this order<PiArrowRight aria-hidden="true" /></button>
        </article> : <div className="urbx-support__empty" role="status"><PiBag aria-hidden="true" /><p>{state === "loading" ? "Loading your saved orders…" : state === "error" ? "Your orders could not be loaded." : "No saved orders on this browser yet."}</p>{state === "ready" && <StorefrontLink to="/products">Explore the drop<PiArrowRight aria-hidden="true" /></StorefrontLink>}</div>}
        {state === "error" && <p className="urbx-support__notice" role="alert">Latest order status is unavailable. <button type="button" onClick={() => setRetry(value => value + 1)}>Try again</button></p>}
      </section>
      <section className="urbx-support__faq" aria-labelledby="urbx-faq-title">
        <h2 id="urbx-faq-title">Quick answers</h2>
        <div className="urbx-support__answers">{filtered.map(faq => <details key={faq.id}>
          <summary>{faq.question}<PiPlus aria-hidden="true" /></summary>
          <div className="urbx-support__answer"><p>{faq.answer}</p>{faq.id === "tracking" ? <button type="button" onClick={() => setPanel("orders")}>View your orders<PiArrowRight aria-hidden="true" /></button> : faq.id === "returns" ? <StorefrontLink to="/delivery-returns">Read the store policy<PiArrowRight aria-hidden="true" /></StorefrontLink> : <button type="button" onClick={() => openContacts(order ? "order-help" : "chat")}>Contact the store<PiArrowRight aria-hidden="true" /></button>}</div>
        </details>)}</div>
        {!filtered.length && <div className="urbx-support__empty" role="status"><p>No answers match “{query}”.</p><button type="button" onClick={() => setQuery("")}>Clear search</button></div>}
        <span className="urbx-cart__sr" role="status">{query ? `${filtered.length} answers found` : ""}</span>
      </section>
      <section className="urbx-support__contact" aria-labelledby="urbx-contact-title">
        <h2 id="urbx-contact-title">Still need help?</h2><p>Choose how you’d like to reach us.</p>
        <div className="urbx-support__contact-grid">
          <button type="button" className="urbx-support__chat" onClick={() => openContacts("chat")}><PiChat aria-hidden="true" /><span><strong>Start a chat</strong><small>Talk to support</small></span><PiArrowRight aria-hidden="true" /></button>
          <button type="button" onClick={() => openContacts("email")}><PiEnvelopeSimple aria-hidden="true" /><span><strong>Email us</strong><small>Send a message</small></span><PiArrowRight aria-hidden="true" /></button>
        </div>
      </section>
    </div>
    <UrbxNavigation profile={profile} active="account" />
    <dialog ref={dialog} className="urbx-home__dialog urbx-support__dialog" onCancel={() => setPanel(null)} onClose={() => setPanel(null)} aria-labelledby="urbx-support-dialog-title">
      <button type="button" className="urbx-home__dialog-close" onClick={() => setPanel(null)} aria-label="Close support dialog"><PiX aria-hidden="true" /></button>
      <h2 id="urbx-support-dialog-title">{panel === "orders" ? "Your orders" : panel === "order-help" ? `Help with #${helpOrder?.display_id ?? "your order"}` : panel === "email" ? "Email the store" : "Chat with the store"}</h2>
      {panel === "orders" ? <>
        {isMock && <p>Design preview — this sample order has not been submitted.</p>}
        {state === "loading" ? <p role="status">Loading orders…</p> : orders.length ? <ul className="urbx-support__order-list">{orders.map(item => <li key={item.display_id}><header><strong>#{item.display_id}</strong><span>{urbxSupportStatus(item)}</span></header><p>{quantity(item)} items · {money(item.total, item.currency_code)}</p><ul>{item.items.map((product, index) => <li key={index}>{product.title} × {product.quantity}</li>)}</ul><StorefrontLink to={urbxOrderDetailsPath(item.display_id)} className="urbx-support__dialog-action">View order<PiArrowRight aria-hidden="true" /></StorefrontLink></li>)}</ul> : <p>No saved orders on this browser yet.</p>}
        {state === "error" && <p role="alert">Order status is unavailable.</p>}
        <button type="button" className="urbx-support__dialog-action" onClick={() => setRetry(value => value + 1)} disabled={state === "loading"}>Refresh orders</button>
      </> : <>
        {isMock && <p>Design preview. No message will be sent from this screen.</p>}
        <p>{panel === "email" ? "Open your email app to write to the store." : "Contact the store through its available channels."}{panel === "order-help" ? " Your order number is included in the message draft." : ""}</p>
        {panel !== "email" && contacts.whatsapp && <a className="urbx-support__dialog-action" href={contacts.whatsapp} target="_blank" rel="noopener noreferrer">Open WhatsApp<PiArrowRight aria-hidden="true" /></a>}
        {contacts.email && <a className="urbx-support__dialog-action" href={contacts.email}>Open email<PiEnvelopeSimple aria-hidden="true" /></a>}
        {contacts.phone && <a className="urbx-support__dialog-action" href={contacts.phone}>Call the store<PiArrowRight aria-hidden="true" /></a>}
        {!(contacts.email || contacts.phone || (panel !== "email" && contacts.whatsapp)) && <p className="urbx-support__unavailable">{reference ? "The template has no contact details yet. Add the store’s public email or WhatsApp number when setting up your store." : "The store has not added contact details for this channel yet. Please check back later."}</p>}
      </>}
    </dialog>
  </section>;
}
