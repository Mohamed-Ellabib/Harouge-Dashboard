import { useEffect, useState, type CSSProperties } from "react";
import { PiArrowRight, PiCheck, PiCopy, PiEnvelopeSimple, PiPackage, PiX } from "react-icons/pi";
import { useCart } from "../../commerce/CartContext";
import { isStorefrontEditorPreviewEnabled, isVisualPreviewEnabled } from "../../config";
import { formatStorefrontMoney } from "../../lib/money";
import { StorefrontLink, useStorefrontLocation } from "../../lib/navigation";
import type { StorefrontProfileDto, StorefrontOrderConfirmationDto } from "../../types";
import { urbxCartVariant } from "./urbx-cart";
import { urbxOrderDetailsPath } from "./urbx-order-details";
import "./urbx-welcome.css";
import "./urbx-home.css";
import "./urbx-cart.css";
import "./urbx-confirmation.css";

type DesignReceipt = { order: StorefrontOrderConfirmationDto; variants: string[] };

export default function UrbxOrderConfirmationPage({ profile }: { profile: StorefrontProfileDto }) {
  const { confirmation, restoring, indeterminateCompletion } = useCart();
  const location = useStorefrontLocation();
  const reference = import.meta.env.DEV && isVisualPreviewEnabled() && !isStorefrontEditorPreviewEnabled() && !new URLSearchParams(location.search).has("setup-preview");
  const [design, setDesign] = useState<DesignReceipt | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyNotice, setCopyNotice] = useState("");
  const order = confirmation ?? (reference ? design?.order : null);
  const isMock = !confirmation && reference && !!design;
  const palette = { "--urbx-accent": profile.branding.primary_color || "#d5ff00", "--urbx-canvas": profile.branding.secondary_color || "#070707" } as CSSProperties;
  const money = (amount: number) => reference ? `$${amount.toFixed(2)}` : formatStorefrontMoney(amount, order?.currency_code ?? "lyd", "en-LY");
  const orderNumber = order ? `#${order.display_id}` : "";

  useEffect(() => { document.title = `Order confirmation | ${profile.name}`; }, [profile.name]);
  useEffect(() => {
    if (!reference || confirmation) return;
    let active = true;
    // Presentation only: this import does not submit an order or mutate the cart.
    void import("../../dev/urbx-confirmation-preview").then(module => { if (active) setDesign(module.urbxConfirmationDesignFixture()); });
    return () => { active = false; };
  }, [reference, confirmation]);
  useEffect(() => { setCopied(false); setCopyNotice(""); }, [orderNumber]);

  const copyOrderNumber = async () => {
    try { await navigator.clipboard.writeText(orderNumber); setCopied(true); setCopyNotice("Order number copied."); }
    catch { setCopyNotice("Copy unavailable. Select the order number above to copy it."); }
  };
  const itemRows = order?.items.map((item, index) => <li className="urbx-confirmation__item" key={`${item.title}-${index}`}>
    <div className="urbx-confirmation__photo">{item.thumbnail_url ? <img src={item.thumbnail_url} alt={item.title} /> : <PiPackage aria-label="Product image unavailable" />}</div>
    <div><h3>{item.title}</h3><p>{isMock ? `${design?.variants[index]} · ` : item.variant_title && urbxCartVariant(item.variant_title) ? `${urbxCartVariant(item.variant_title)} · ` : ""}Qty {item.quantity}</p></div>
  </li>);

  return <section className="urbx-home urbx-cart urbx-confirmation" style={palette} dir="ltr" aria-labelledby="urbx-confirmation-title">
    <header className="urbx-home__header">
      <StorefrontLink to="/" className="urbx-home__identity" ariaLabel={`${profile.name} home`}>{profile.name === "URBX" ? <img src="/assets/urbx/urbx-wordmark-v1.png" alt="URBX" /> : <span>{profile.name}</span>}</StorefrontLink>
      <StorefrontLink to="/" className="urbx-confirmation__close" ariaLabel="Close confirmation"><PiX aria-hidden="true" /></StorefrontLink>
    </header>
    {!order || restoring || indeterminateCompletion ? <div className="urbx-confirmation__empty">
      <PiPackage aria-hidden="true" /><h1 id="urbx-confirmation-title">{restoring || (reference && !design) ? "Loading confirmation…" : indeterminateCompletion ? "Check your order result" : "Confirmation session ended"}</h1>
      <p>{indeterminateCompletion ? "Return to checkout to safely check your existing order result." : "For your privacy, confirmation details are kept only in this session. Your saved order status is available through Orders."}</p>
      <StorefrontLink to={indeterminateCompletion ? "/checkout" : "/orders"} className="urbx-cart__checkout">{indeterminateCompletion ? "RETURN TO CHECKOUT" : "VIEW ORDERS"}<PiArrowRight aria-hidden="true" /></StorefrontLink>
      <StorefrontLink to="/products" className="urbx-cart__continue">Continue shopping</StorefrontLink>
    </div> : <>
      <img className="urbx-confirmation__art" src="/assets/urbx/order-package-v1.png" alt="Black URBX package sealed with lime tape and a confirmation check" />
      <h1 id="urbx-confirmation-title" className="urbx-confirmation__title"><span>ORDER</span><span>CONFIRMED.</span></h1>
      <div className="urbx-confirmation__statement"><p>GOOD CHOICE.</p><img src="/assets/urbx/brush-underline-v1.png" alt="" /></div>
      <p className="urbx-confirmation__intro">{isMock ? <>Thanks, Alex. Your order is in.<br />We’ll email you when it ships.</> : <>Thanks. Your order is in.<br />Follow its progress in your order details.</>}</p>
      <div className="urbx-confirmation__content">
        <section className="urbx-confirmation__receipt" aria-label="Order confirmation details">
          <div className="urbx-confirmation__number"><div><p>Order number</p><strong>{orderNumber}</strong></div><button type="button" onClick={() => void copyOrderNumber()} aria-label="Copy order number">{copied ? <PiCheck aria-hidden="true" /> : <PiCopy aria-hidden="true" />}</button></div>
          {copyNotice ? <p className={copied ? "urbx-cart__sr" : "urbx-confirmation__notice"} role="status">{copyNotice}</p> : null}
          <dl className="urbx-confirmation__facts">
            <div><dt>Estimated delivery</dt><dd>{isMock ? "3–5 business days" : "Awaiting store update"}</dd></div>
            <div><dt>Payment method</dt><dd>{order.payment.method === "cod" ? "Cash on delivery" : "Bank transfer"}</dd></div>
            <div><dt>{order.payment.method === "cod" ? "Amount due on delivery" : "Awaiting verification"}</dt><dd className="urbx-confirmation__amount">{money(order.total)}</dd></div>
          </dl>
          <h2>Your items</h2><ul className="urbx-confirmation__items">{itemRows}</ul>
        </section>
        {order.payment.method === "bank_transfer" ? <section className="urbx-confirmation__bank" aria-labelledby="urbx-bank-title">
          <h2 id="urbx-bank-title">Bank transfer instructions</h2><p>Payment is awaiting verification by the store.</p>
          <dl><div><dt>Bank</dt><dd>{order.payment.bank_transfer.bank_name}</dd></div><div><dt>Account holder</dt><dd>{order.payment.bank_transfer.account_holder_name}</dd></div><div><dt>Account reference</dt><dd>{order.payment.bank_transfer.account_reference}</dd></div></dl>
          <p>{order.payment.bank_transfer.instructions}</p>
        </section> : null}
        <p className="urbx-confirmation__email"><PiEnvelopeSimple aria-hidden="true" /><span>{isMock ? "Confirmation sent to alex@example.com" : "Your order has been received by the store."}</span></p>
        <StorefrontLink to={urbxOrderDetailsPath(order.display_id)} className="urbx-cart__checkout urbx-confirmation__view">VIEW ORDER<PiArrowRight aria-hidden="true" /></StorefrontLink>
        <StorefrontLink to="/products" className="urbx-cart__continue">Continue shopping</StorefrontLink>
        <p className="urbx-confirmation__support">Need help? <StorefrontLink to="/contact">Contact us</StorefrontLink></p>
      </div>
    </>}
  </section>;
}
