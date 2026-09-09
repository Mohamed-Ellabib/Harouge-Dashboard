import { useEffect, useRef, useState, type CSSProperties } from "react";
import { PiCaretLeft, PiChat, PiCheckBold, PiDotsThreeVertical, PiFileArrowDown, PiHouse, PiMapPin, PiMoney, PiPackage, PiSealCheckFill, PiTruck, PiX } from "react-icons/pi";
import { TbCubeSend } from "react-icons/tb";
import { SiVisa } from "react-icons/si";
import { fetchStorefrontTrackedOrder } from "../../api/storefront-api";
import { useCart } from "../../commerce/CartContext";
import { loadTrackedOrders } from "../../commerce/tracked-orders";
import { isStorefrontEditorPreviewEnabled, isVisualPreviewEnabled } from "../../config";
import { formatStorefrontMoney } from "../../lib/money";
import { StorefrontLink, useStorefrontLocation } from "../../lib/navigation";
import type { ConfiguredStorefrontProfileDto } from "../../types";
import type { template6OrderDetailsDesignFixture } from "../../dev/template-6-order-details-preview";
import { selectUrbxOrder, urbxOrderProgress, type UrbxOrderReceipt } from "../urbx/urbx-order-details";
import { urbxSupportContacts } from "../urbx/urbx-support";
import { template6CartVariant } from "./template-6-cart";
import { template6ConfirmationReference } from "./template-6-confirmation";
import "./template-6-home.css";
import "./template-6-cart.css";
import "./template-6-checkout.css";
import "./template-6-order-details.css";

type Design = ReturnType<typeof template6OrderDetailsDesignFixture>;
type Receipt = { order: UrbxOrderReceipt | null; design: Design | null; loading: boolean; failed: boolean };
type Panel = "options" | "invoice" | "contact" | "cancel" | null;
const steps = [{ label: "Confirmed", Icon: PiCheckBold }, { label: "Preparing", Icon: PiPackage }, { label: "Shipped", Icon: PiTruck }, { label: "Delivered", Icon: PiHouse }];

export default function Template6OrderDetailsPage({ profile }: { profile: ConfiguredStorefrontProfileDto }) {
  const { confirmation, restoring, indeterminateCompletion } = useCart();
  const location = useStorefrontLocation();
  const reference = template6ConfirmationReference(import.meta.env.DEV, isVisualPreviewEnabled(), isStorefrontEditorPreviewEnabled(), location.search);
  const rawId = location.pathname.split("/")[2];
  let displayId: string | null = null;
  try { displayId = rawId ? decodeURIComponent(rawId) : null; } catch { displayId = ""; }
  const [receipt, setReceipt] = useState<Receipt>({ order: null, design: null, loading: true, failed: false });
  const [retry, setRetry] = useState(0);
  const [panel, setPanel] = useState<Panel>(null);
  const [notice, setNotice] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const { order, design, loading, failed } = receipt;
  const progress = urbxOrderProgress(order?.progress);
  const count = order?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  const money = (amount: number) => design ? `AED ${amount.toFixed(2)}` : formatStorefrontMoney(amount, order?.currency_code ?? "lyd", "en-LY");
  const createdAt = order?.created_at;
  const date = createdAt && Number.isFinite(Date.parse(createdAt)) ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Africa/Tripoli" }).format(new Date(createdAt)).replace("Sept", "Sep") : null;
  const contacts = urbxSupportContacts(profile.contact, order ? String(order.display_id) : undefined);
  const hasContact = !!(contacts.whatsapp || contacts.email || contacts.phone);
  const paymentLabel = design ? "Visa ending in 4242" : order?.payment.method === "cod" ? "Cash on Delivery" : "Manual bank transfer";
  const paymentState = design ? "Paid" : order?.payment.method === "cod" ? "Due on delivery" : "Awaiting verification";
  const colors = { "--six-accent": profile.branding.primary_color || "#eeff66", "--six-checkout-link": "#008cac" } as CSSProperties;

  useEffect(() => { document.title = `Order details | ${profile.name}`; }, [profile.name]);
  useEffect(() => {
    let active = true;
    setReceipt({ order: null, design: null, loading: true, failed: false });
    setPanel(null); setNotice("");
    if (restoring || indeterminateCompletion) return () => { active = false; };
    const load = async (): Promise<Receipt> => {
      if (reference && !confirmation) {
        const module = await import("../../dev/template-6-order-details-preview");
        const sample = module.template6OrderDetailsDesignFixture();
        const selected = selectUrbxOrder(sample.orders, null, displayId);
        return { order: selected, design: selected ? sample : null, loading: false, failed: false };
      }
      // Numbers select only already-authorized Store receipts. Private grants
      // remain inside the shared reader, never in URLs, downloads or messages.
      const orders = confirmation?.tracking && (displayId === null || displayId === String(confirmation.display_id))
        ? [await fetchStorefrontTrackedOrder(confirmation.tracking.token)]
        : await loadTrackedOrders(profile.handle);
      return { order: selectUrbxOrder(orders, confirmation, displayId), design: null, loading: false, failed: false };
    };
    void load().then(result => { if (active) setReceipt(result); }).catch(() => {
      if (active) setReceipt({ order: selectUrbxOrder([], confirmation, displayId), design: null, loading: false, failed: true });
    });
    return () => { active = false; };
  }, [profile.handle, reference, confirmation, displayId, retry, restoring, indeterminateCompletion]);
  useEffect(() => {
    if (panel && !dialog.current?.open) { trigger.current = document.activeElement as HTMLElement; dialog.current?.showModal(); }
    else if (!panel) { dialog.current?.close(); trigger.current?.focus(); }
  }, [panel]);

  const copyNumber = async () => {
    if (!order) return;
    try { await navigator.clipboard.writeText(`#${order.display_id}`); setNotice("Order number copied."); }
    catch { setNotice("Copy unavailable. Select the order number to copy it."); }
  };
  const downloadSummary = () => {
    if (!order) return;
    const lines = [design ? "SAMPLE ORDER SUMMARY — NOT AN INVOICE" : "ORDER SUMMARY — NOT A TAX INVOICE", design?.seller ?? profile.name, `Order #${order.display_id}`, ...(date ? [`Placed on ${date}`] : []), `Status: ${failed ? "Update unavailable" : progress.label}`, "", ...order.items.map(item => `${item.title}${item.variant_title ? ` · ${template6CartVariant(item.variant_title) ?? item.variant_title}` : ""} · Qty ${item.quantity} · ${money(item.total)}`), "", `Subtotal: ${money(order.item_subtotal)}`, `Delivery: ${money(order.shipping_total)}`, `Total: ${money(order.total)}`, `${paymentLabel} · ${paymentState}`, "", "Request an official invoice from the store."];
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url; link.download = `order-summary-${String(order.display_id).replace(/[^a-z0-9-]/gi, "-")}.txt`;
    document.body.append(link); link.click(); link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice("Order summary download prepared. This is not a tax invoice.");
  };
  const contactLinks = <>{contacts.whatsapp && <a href={contacts.whatsapp} target="_blank" rel="noopener noreferrer">Open WhatsApp</a>}{contacts.email && <a href={contacts.email}>Email the store</a>}{contacts.phone && <a href={contacts.phone}>Call the store</a>}{!hasContact && <p>The store hasn’t added public contact details yet.</p>}</>;

  return <section className="template-six-home template-six-order-details" style={colors} dir="ltr" lang="en" aria-labelledby="six-order-title">
    <img className="six-home-background" src="/assets/template-6/home-background-v1.webp" alt="" />
    <header className="six-order-header"><StorefrontLink to="/account" ariaLabel="Back to profile"><PiCaretLeft /></StorefrontLink><h1 id="six-order-title">ORDER DETAILS</h1><button type="button" aria-label="Order options" onClick={() => setPanel("options")}><PiDotsThreeVertical /></button></header>
    <div className="six-order-content">
      {indeterminateCompletion || loading || !order ? <div className="six-order-empty" role="status"><PiPackage /><h2>{indeterminateCompletion ? "Check your order result" : loading ? "Loading your order…" : failed ? "Order unavailable" : "Order not found"}</h2><p>{indeterminateCompletion ? "Return to checkout to safely check the existing result before ordering again." : "Order details are available only on a browser with access to this store’s receipt."}</p>{failed && <button type="button" onClick={() => setRetry(value => value + 1)}>Try again</button>}<StorefrontLink to={indeterminateCompletion ? "/checkout" : "/account"}>{indeterminateCompletion ? "Return to checkout" : "Back to profile"}</StorefrontLink></div> : <>
        <div className="six-order-number"><div><h2>#{order.display_id}</h2><p>{date ? `Placed on ${date}` : "Order placed"}</p></div><span className="six-order-badge">{failed ? "Update unavailable" : progress.label}</span></div>
        {failed && <p className="six-order-notice" role="status">Latest status unavailable. Showing your confirmation. <button type="button" onClick={() => setRetry(value => value + 1)}>Retry</button></p>}
        <section className="six-order-progress six-order-box" aria-label="Delivery progress"><div className="six-order-estimate"><div><p>Estimated delivery</p><strong>{design ? order.progress === "delivered" ? "Delivered" : "2–3 business days" : order.progress === "delivered" ? "Delivered" : "Awaiting store update"}</strong></div><TbCubeSend aria-hidden="true" /></div>
          <ol className="six-order-timeline" aria-label="Order progress">{steps.map(({ label, Icon }, index) => <li key={label} className={!failed && index <= progress.step ? "is-complete" : undefined} aria-current={!failed && index === progress.step ? "step" : undefined}><span>{!failed && index <= progress.step ? <PiCheckBold aria-hidden="true" /> : <Icon aria-hidden="true" />}</span><p>{label}</p></li>)}</ol>
          <p className="six-order-progress-note">{design ? order.progress === "confirmed" ? "We’ll notify you when your order ships." : progress.description : failed ? "Contact the store for the latest update." : "The store’s fulfillment updates appear here."}</p>
        </section>
        <section className="six-order-section" aria-labelledby="six-order-items"><header><h2 id="six-order-items">Ordered Items</h2><span>{count} {count === 1 ? "item" : "items"}</span></header><div className="six-order-box six-order-items-box">
          <div className="six-order-seller">{design || profile.branding.logo_url ? <img src={design ? "/assets/template-6/zara-logo-v1.webp" : profile.branding.logo_url!} alt={design ? "ZARA" : profile.name} /> : <PiPackage aria-hidden="true" />}<h3>{design?.seller ?? profile.name}</h3>{design && <PiSealCheckFill className="six-order-verified" aria-label="Sample verified seller" />}<button type="button" aria-label="Message store" onClick={() => setPanel("contact")}><PiChat /></button></div>
          <ul className="six-order-items">{order.items.map((item, index) => <li key={index}><div className="six-order-item-photo">{item.thumbnail_url ? <img src={item.thumbnail_url} alt={item.title} /> : <PiPackage aria-label="Product image unavailable" />}</div><div className="six-order-item-info"><div><h3>{item.title}</h3><p>{item.variant_title && template6CartVariant(item.variant_title) ? `${template6CartVariant(item.variant_title)} · ` : ""}Qty {item.quantity}</p></div><span>{money(item.total)}</span></div></li>)}</ul>
        </div></section>
        <section className="six-order-section" aria-labelledby="six-order-address"><header><h2 id="six-order-address">Delivery Address</h2></header><div className="six-order-box six-order-address"><PiMapPin aria-hidden="true" /><div>{design ? <><span className="six-checkout-home-tag">Home</span><h3>{design.name}</h3><address>{design.address.map(line => <span key={line}>{line}</span>)}<span>{design.phone}</span></address></> : <><h3>Your checkout address</h3><p>Your address and contact details aren’t retained in this receipt. Contact the store to check delivery details.</p></>}</div></div></section>
        <section className="six-order-section" aria-labelledby="six-order-payment"><header><h2 id="six-order-payment">Payment Summary</h2></header><div className="six-order-box six-order-payment"><dl><div><dt>Subtotal</dt><dd>{money(order.item_subtotal)}</dd></div><div><dt>Delivery</dt><dd>{money(order.shipping_total)}</dd></div><div className="six-order-total"><dt>{design ? "Total paid" : order.payment.method === "cod" ? "Due on delivery" : "Order total"}</dt><dd>{money(order.total)}</dd></div></dl><div className="six-order-payment-method">{design ? <SiVisa viewBox="0 7 24 10" aria-label="Sample Visa" /> : <PiMoney aria-hidden="true" />}<span>{paymentLabel}</span><span className="six-order-badge">{paymentState}</span></div></div></section>
        <button className="six-order-action six-order-action--primary" type="button" onClick={() => { setNotice(""); setPanel("invoice"); }}><PiFileArrowDown aria-hidden="true" />DOWNLOAD INVOICE</button>
        <button className="six-order-action" type="button" onClick={() => setPanel("contact")}><PiChat aria-hidden="true" />CONTACT STORE</button>
        {!failed && progress.step < 2 && <button className="six-order-cancel" type="button" onClick={() => setPanel("cancel")}>Cancel order</button>}
      </>}
    </div>
    <dialog ref={dialog} className="six-dialog six-order-dialog" aria-labelledby="six-order-panel-title" onCancel={event => { event.preventDefault(); setPanel(null); }}><button className="six-dialog__close" type="button" aria-label="Close order panel" onClick={() => setPanel(null)}><PiX /></button><h2 id="six-order-panel-title">{panel === "invoice" ? "Invoice & receipt" : panel === "cancel" ? "Request cancellation" : panel === "contact" ? "Contact store" : "Order options"}</h2>
      {panel === "options" ? <>{order && <button type="button" onClick={() => void copyNumber()}>Copy order number</button>}<button type="button" onClick={() => { setPanel(null); setRetry(value => value + 1); }}>Refresh order status</button>{order && <button type="button" onClick={() => { setNotice(""); setPanel("invoice"); }}>Invoice & receipt</button>}<StorefrontLink to="/account">My profile</StorefrontLink></>
        : panel === "invoice" ? <><p>{design ? "This is a sample order. No purchase or payment was made." : "Official invoices are issued by the store. You can download a summary of this receipt for your records."}</p><p>The download is an order summary, not a tax invoice or proof of payment.</p><button type="button" onClick={downloadSummary}>Download order summary</button><button type="button" onClick={() => { setNotice(""); setPanel("contact"); }}>Request invoice from store</button></>
          : panel === "cancel" ? <><p>{design ? "This is a read-only design preview; no order was placed." : `Ask the store to cancel order #${order?.display_id}. Your order is not cancelled until the store confirms it.`}</p><p>Contact the store with your order number and request cancellation.</p>{contactLinks}<button type="button" onClick={() => setPanel(null)}>Keep order</button></>
            : panel === "contact" ? <><p>{order ? `Contact the store about order #${order.display_id}.` : "Choose a contact method."}</p>{design && <p>This is a design preview; no live chat is connected.</p>}{contactLinks}</> : null}
      {notice && <p role="status">{notice}</p>}
    </dialog>
  </section>;
}
