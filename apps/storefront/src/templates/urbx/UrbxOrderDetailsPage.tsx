import { useEffect, useRef, useState, type CSSProperties } from "react";
import { PiCaretLeft, PiChat, PiCheck, PiCopy, PiDotsThreeVertical, PiMapPin, PiMoney, PiPackage, PiPackageDuotone, PiTruck, PiX } from "react-icons/pi";
import { useCart } from "../../commerce/CartContext";
import { loadTrackedOrders } from "../../commerce/tracked-orders";
import { isStorefrontEditorPreviewEnabled, isVisualPreviewEnabled } from "../../config";
import { formatStorefrontMoney } from "../../lib/money";
import { StorefrontLink, useStorefrontLocation } from "../../lib/navigation";
import type { StorefrontProfileDto } from "../../types";
import { urbxCartVariant } from "./urbx-cart";
import { selectUrbxOrder, urbxOrderDate, urbxOrderProgress, type UrbxOrderReceipt } from "./urbx-order-details";
import { urbxSupportContacts } from "./urbx-support";
import "./urbx-welcome.css";
import "./urbx-home.css";
import "./urbx-cart.css";
import "./urbx-order-details.css";

type ReceiptState = { order: UrbxOrderReceipt | null; mockAddress: string[] | null; loading: boolean; failed: boolean };

export default function UrbxOrderDetailsPage({ profile }: { profile: StorefrontProfileDto }) {
  const { confirmation } = useCart();
  const location = useStorefrontLocation();
  const reference = import.meta.env.DEV && isVisualPreviewEnabled() && !isStorefrontEditorPreviewEnabled() && !new URLSearchParams(location.search).has("setup-preview");
  const rawId = location.pathname.split("/")[2];
  let displayId: string | null = null;
  try { displayId = rawId ? decodeURIComponent(rawId) : null; } catch { displayId = ""; }
  const [receipt, setReceipt] = useState<ReceiptState>({ order: null, mockAddress: null, loading: true, failed: false });
  const [retry, setRetry] = useState(0);
  const [copied, setCopied] = useState(false);
  const [copyNotice, setCopyNotice] = useState("");
  const [panel, setPanel] = useState<"options" | "cancel" | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const { order, mockAddress, loading, failed } = receipt;
  const isMock = !!mockAddress;
  const status = urbxOrderProgress(order?.progress);
  const date = urbxOrderDate(order?.created_at);
  const contacts = urbxSupportContacts(profile.contact, order ? String(order.display_id) : undefined);
  const palette = { "--urbx-accent": profile.branding.primary_color || "#d5ff00", "--urbx-canvas": profile.branding.secondary_color || "#070707" } as CSSProperties;
  const money = (amount: number) => isMock ? `$${amount.toFixed(2)}` : formatStorefrontMoney(amount, order?.currency_code ?? "lyd", "en-LY");
  const count = order?.items.reduce((total, item) => total + item.quantity, 0) ?? 0;

  useEffect(() => { document.title = `Order details | ${profile.name}`; }, [profile.name]);
  useEffect(() => {
    let active = true;
    setReceipt({ order: null, mockAddress: null, loading: true, failed: false });
    setCopied(false); setCopyNotice(""); setPanel(null);
    const load = async (): Promise<ReceiptState> => {
      if (reference && !confirmation) {
        const design = await import("../../dev/urbx-order-details-preview");
        const sample = design.urbxOrderDetailsDesignFixture();
        const selected = selectUrbxOrder([sample], null, displayId);
        return { order: selected, mockAddress: selected ? design.urbxOrderDesignAddress : null, loading: false, failed: false };
      }
      const orders = await loadTrackedOrders(profile.handle);
      return { order: selectUrbxOrder(orders, confirmation, displayId), mockAddress: null, loading: false, failed: false };
    };
    void load().then(result => { if (active) setReceipt(result); }).catch(() => {
      if (active) setReceipt({ order: selectUrbxOrder([], confirmation, displayId), mockAddress: null, loading: false, failed: true });
    });
    return () => { active = false; };
  }, [profile.handle, reference, confirmation, displayId, retry]);
  useEffect(() => { if (panel) dialog.current?.showModal(); else dialog.current?.close(); }, [panel]);

  const copyNumber = async () => {
    if (!order) return;
    try { await navigator.clipboard.writeText(`#${order.display_id}`); setCopied(true); setCopyNotice("Order number copied."); }
    catch { setCopyNotice("Copy unavailable. Select the order number to copy it."); }
  };

  return <section className="urbx-home urbx-cart urbx-order-details" style={palette} dir="ltr" lang="en" aria-labelledby="urbx-order-details-title">
    <header className="urbx-home__header">
      <StorefrontLink to="/contact" className="urbx-cart__back" ariaLabel="Back to your orders"><PiCaretLeft aria-hidden="true" /></StorefrontLink>
      <StorefrontLink to="/" className="urbx-home__identity" ariaLabel={`${profile.name} home`}>{profile.branding.logo_url || profile.name === "URBX" ? <img src={profile.branding.logo_url || "/assets/urbx/urbx-wordmark-v1.png"} alt={profile.name} /> : <span>{profile.name}</span>}</StorefrontLink>
      <button type="button" onClick={() => setPanel("options")} aria-label="Order options"><PiDotsThreeVertical aria-hidden="true" /></button>
    </header>
    <div className="urbx-order-details__content">
      <h1 id="urbx-order-details-title">ORDER DETAILS</h1>
      {!order || loading ? <div className="urbx-order-details__empty" role="status"><PiPackage aria-hidden="true" /><h2>{loading ? "Loading your order…" : failed ? "Order unavailable" : "Order not found"}</h2><p>{loading ? "Getting your saved order details." : "Open this page in the browser you used to order, or contact the store with your order number."}</p>{failed && <button type="button" onClick={() => setRetry(value => value + 1)}>Try again</button>}<StorefrontLink to="/contact">Help & support</StorefrontLink></div> : <>
        <div className="urbx-order-details__number"><strong>#{order.display_id}</strong><button type="button" onClick={() => void copyNumber()} aria-label="Copy order number">{copied ? <PiCheck aria-hidden="true" /> : <PiCopy aria-hidden="true" />}</button></div>
        <p className="urbx-order-details__date">{date ? `Placed on ${date}` : "Order placed"}</p>
        {copyNotice && <p className={copied ? "urbx-cart__sr" : "urbx-order-details__notice"} role="status">{copyNotice}</p>}
        {failed && <p className="urbx-order-details__notice" role="alert">Latest status is unavailable. Showing your confirmation receipt. <button type="button" onClick={() => setRetry(value => value + 1)}>Try again</button></p>}
        <section className="urbx-order-details__status-card" aria-labelledby="urbx-status-title">
          <div className="urbx-order-details__status-intro"><span className="urbx-order-details__package"><PiPackage aria-hidden="true" /><PiCheck aria-hidden="true" /></span><div><h2 id="urbx-status-title">Order status</h2><span className="urbx-order-details__badge">{failed ? "Update unavailable" : status.label}</span><p>{failed ? "Contact the store for the latest update." : status.description}</p></div></div>
          <ol className="urbx-order-details__timeline" aria-label="Order progress">{["Placed", "Preparing", "Shipped", "Delivered"].map((step, index) => <li key={step} data-complete={!failed && index <= status.step || undefined} aria-current={!failed && index === status.step ? "step" : undefined}><span>{!failed && index <= status.step && <PiCheck aria-hidden="true" />}</span><p>{step}</p></li>)}</ol>
          <div className="urbx-order-details__delivery"><PiTruck aria-hidden="true" /><div><p>Estimated delivery</p><strong>{isMock ? "3–5 business days" : order.progress === "delivered" ? "Delivered" : "Awaiting store update"}</strong><p>{isMock ? "Tracking will appear once your order ships." : order.progress === "shipped" ? "Contact the store for delivery or tracking details." : order.progress === "delivered" ? "The store has marked your order as delivered." : "The store’s fulfillment updates appear here."}</p></div></div>
        </section>
        <section className="urbx-order-details__items" aria-labelledby="urbx-items-title"><header><h2 id="urbx-items-title">Your items</h2><span>{count} {count === 1 ? "item" : "items"}</span></header><ul>{order.items.map((item, index) => <li key={`${item.title}-${index}`}>
          <div className="urbx-order-details__photo">{item.thumbnail_url ? <img src={item.thumbnail_url} alt={item.title} /> : <PiPackageDuotone aria-label="Product image unavailable" />}</div>
          <div className="urbx-order-details__item-info"><div><h3>{item.title}</h3><p>{item.variant_title && urbxCartVariant(item.variant_title) ? `${urbxCartVariant(item.variant_title)} · ` : ""}Qty {item.quantity}</p></div><strong>{money(item.total)}</strong></div>
        </li>)}</ul></section>
        <section className="urbx-order-details__address" aria-labelledby="urbx-address-title"><h2 id="urbx-address-title">Delivery address</h2><div className="urbx-order-details__info-card"><PiMapPin aria-hidden="true" /><div>{mockAddress ? <><h3>{mockAddress[0]}</h3>{mockAddress.slice(1).map(line => <p key={line}>{line}</p>)}</> : <><h3>Delivery details saved with the store</h3><p>Your address and contact details are kept private in this order view.</p><StorefrontLink to={`/contact?order=${encodeURIComponent(String(order.display_id))}`}>Contact the store about your delivery</StorefrontLink></>}</div></div></section>
        <section className="urbx-order-details__payment" aria-labelledby="urbx-payment-title"><h2 id="urbx-payment-title">Payment method</h2><div className="urbx-order-details__info-card"><PiMoney aria-hidden="true" /><div><h3>{order.payment.method === "cod" ? "Cash on delivery" : "Bank transfer"}</h3><p>{order.payment.method === "cod" ? "Payment due on delivery" : "Payment awaiting verification"}</p></div></div></section>
        <section className="urbx-order-details__summary" aria-labelledby="urbx-summary-title"><h2 id="urbx-summary-title">Order summary</h2><dl><div><dt>Subtotal</dt><dd>{money(order.item_subtotal)}</dd></div><div><dt>Shipping</dt><dd>{money(order.shipping_total)}</dd></div><div className="urbx-order-details__total"><dt>{order.payment.method === "cod" ? "Total due on delivery" : "Order total"}</dt><dd>{money(order.total)}</dd></div></dl></section>
        <StorefrontLink to={`/contact?order=${encodeURIComponent(String(order.display_id))}`} className="urbx-cart__checkout urbx-order-details__support"><PiChat aria-hidden="true" />CONTACT SUPPORT</StorefrontLink>
        {(!order.progress || ["confirmed", "processing"].includes(order.progress)) && <button type="button" className="urbx-order-details__cancel" onClick={() => setPanel("cancel")}>Cancel order</button>}
      </>}
    </div>
    <dialog ref={dialog} className="urbx-home__dialog urbx-order-details__dialog" onCancel={() => setPanel(null)} onClose={() => setPanel(null)} aria-labelledby="urbx-order-options-title">
      <button type="button" className="urbx-home__dialog-close" onClick={() => setPanel(null)} aria-label="Close order options"><PiX aria-hidden="true" /></button><h2 id="urbx-order-options-title">{panel === "cancel" ? "Request cancellation" : "Order options"}</h2>
      {panel === "cancel" ? <><p>{isMock ? "This is a design preview; no order was placed." : `Ask the store to cancel order #${order?.display_id}. Your order is not cancelled until the store confirms it.`}</p><p>Contact the store with your order number and explain that you’d like to cancel.</p>{contacts.whatsapp && <a href={contacts.whatsapp} target="_blank" rel="noopener noreferrer">Open WhatsApp</a>}{contacts.email && <a href={contacts.email}>Email the store</a>}{contacts.phone && <a href={contacts.phone}>Call the store</a>}{!(contacts.whatsapp || contacts.email || contacts.phone) && <p>The store has not added its public contact details yet.</p>}<button type="button" onClick={() => setPanel(null)}>Keep order</button></> : <>{order && <button type="button" onClick={() => void copyNumber()}>Copy order number</button>}{copyNotice && <p role="status">{copyNotice}</p>}<button type="button" onClick={() => { setPanel(null); setRetry(value => value + 1); }}>Refresh order status</button><StorefrontLink to="/contact">Help & support</StorefrontLink><StorefrontLink to="/products">Continue shopping</StorefrontLink></>}
    </dialog>
  </section>;
}
