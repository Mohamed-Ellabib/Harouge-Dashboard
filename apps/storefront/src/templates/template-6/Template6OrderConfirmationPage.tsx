import { useEffect, useState, type CSSProperties } from "react";
import { PiArrowRight, PiMapPin, PiMoney, PiPackage, PiSealCheckFill, PiTruck, PiX } from "react-icons/pi";
import { SiVisa } from "react-icons/si";
import { useCart } from "../../commerce/CartContext";
import { isStorefrontEditorPreviewEnabled, isVisualPreviewEnabled } from "../../config";
import { formatStorefrontMoney } from "../../lib/money";
import { navigate, StorefrontLink, useStorefrontLocation } from "../../lib/navigation";
import type { ConfiguredStorefrontProfileDto, StorefrontOrderConfirmationDto } from "../../types";
import type { template6ConfirmationDesignFixture } from "../../dev/template-6-confirmation-preview";
import { template6CartVariant } from "./template-6-cart";
import { template6ConfirmationReference } from "./template-6-confirmation";
import "./template-6-home.css";
import "./template-6-cart.css";
import "./template-6-checkout.css";
import "./template-6-confirmation.css";

type DesignReceipt = ReturnType<typeof template6ConfirmationDesignFixture>;
type Profile = ConfiguredStorefrontProfileDto;

export function Template6ConfirmationContent({ profile, order, design, onTrack }: {
  profile: Profile; order: StorefrontOrderConfirmationDto; design: DesignReceipt | null; onTrack: () => void;
}) {
  const count = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const money = (amount: number) => design ? `AED ${amount.toFixed(2)}` : formatStorefrontMoney(amount, order.currency_code, "en-LY");
  return <>
    <img className="six-confirmation-art" src={`/assets/template-6/order-confirmation-package${design ? "" : "-neutral"}-v1.webp`} alt="Shopping bag and parcel with a confirmation check" />
    <h1 id="six-confirmation-title" className="six-confirmation-title">ORDER PLACED!</h1>
    <p className="six-confirmation-intro">{design ? <>Thanks, {design.name}! Your next great finds<br />are on their way.</> : <>Thanks! Your order has been received<br />by {profile.name}.</>}</p>
    <p className="six-confirmation-subtitle">{design ? "We’ll let you know when your order ships." : "Follow your order’s progress below."}</p>
    <div className="six-confirmation-content">
      <section className="six-confirmation-receipt" aria-label="Order confirmation details">
        <div className="six-confirmation-number"><div><p>Order number</p><strong>#{order.display_id}</strong></div><span className="six-confirmation-status">Confirmed</span></div>
        <div className="six-confirmation-delivery"><PiTruck aria-hidden="true" /><div><p>Estimated delivery</p><strong>{design ? "2–3 business days" : "Awaiting store update"}</strong></div></div>
        <div className="six-confirmation-products">
          <div className="six-confirmation-thumbnails">{order.items.slice(0, 2).map((item, index) => <div key={index}>{item.thumbnail_url ? <img src={item.thumbnail_url} alt={`${item.title}${item.variant_title ? ` — ${template6CartVariant(item.variant_title, false)}` : ""}, quantity ${item.quantity}`} /> : <PiPackage aria-label="Product image unavailable" />}</div>)}</div>
          <div><p>{count} {count === 1 ? "item" : "items"} from</p><h2>{design?.seller ?? profile.name}{design ? <PiSealCheckFill aria-label="Sample verified seller" /> : null}</h2></div>
        </div>
        <div className="six-confirmation-payment"><div><h2>{design ? "Total paid" : order.payment.method === "cod" ? "Due on delivery" : "Awaiting verification"}</h2><p>{design ? <><SiVisa aria-label="Sample Visa" />Visa ending in 4242</> : <><PiMoney aria-hidden="true" />{order.payment.method === "cod" ? "Cash on Delivery" : "Manual bank transfer"}</>}</p></div><strong>{money(order.total)}</strong></div>
      </section>
      <section className="six-confirmation-address" aria-label="Delivery address"><PiMapPin aria-hidden="true" /><div><p>Delivering to</p>{design ? <><span className="six-checkout-home-tag">Home</span><h2>{design.name}</h2><address>{design.address.map(line => <span key={line}>{line}</span>)}</address></> : <><h2>Your checkout address</h2><p className="six-confirmation-privacy">For your privacy, your address isn’t retained in this receipt. Contact the store if you need to check your delivery details.</p></>}</div></section>
      {order.payment.method === "bank_transfer" && !design ? <section className="six-confirmation-bank" aria-labelledby="six-confirmation-bank-title"><h2 id="six-confirmation-bank-title">Bank transfer instructions</h2><p>Payment is awaiting verification by the store.</p><dl><div><dt>Bank</dt><dd>{order.payment.bank_transfer.bank_name}</dd></div><div><dt>Account holder</dt><dd>{order.payment.bank_transfer.account_holder_name}</dd></div><div><dt>Account reference</dt><dd>{order.payment.bank_transfer.account_reference}</dd></div></dl><p>{order.payment.bank_transfer.instructions}</p></section> : null}
      <button className="six-confirmation-track" type="button" onClick={onTrack}>TRACK ORDER<PiArrowRight aria-hidden="true" /></button>
      <StorefrontLink to="/" className="six-confirmation-continue">CONTINUE SHOPPING</StorefrontLink>
      <StorefrontLink to="/contact" className="six-confirmation-support">Need help? Contact support</StorefrontLink>
    </div>
  </>;
}

export default function Template6OrderConfirmationPage({ profile }: { profile: Profile }) {
  const { confirmation, restoring, indeterminateCompletion } = useCart();
  const location = useStorefrontLocation();
  const reference = template6ConfirmationReference(import.meta.env.DEV, isVisualPreviewEnabled(), isStorefrontEditorPreviewEnabled(), location.search);
  const [design, setDesign] = useState<DesignReceipt | null>(null);
  const [designFailed, setDesignFailed] = useState(false);
  // Real/trial receipts always win, including after a DEV COD checkout.
  const mock = !confirmation && reference && !restoring && !indeterminateCompletion ? design : null;
  const order: StorefrontOrderConfirmationDto | null = confirmation ?? mock?.order ?? null;
  const ready = !!order && !restoring && !indeterminateCompletion;
  const palette = { "--six-accent": profile.branding.primary_color || "#eeff66", "--six-confirmation-link": reference ? "#0085aa" : profile.branding.secondary_color || "#0085aa" } as CSSProperties;
  useEffect(() => { document.title = `Order confirmation | ${profile.name}`; }, [profile.name]);
  useEffect(() => {
    if (!reference || confirmation || restoring || indeterminateCompletion) return;
    let active = true;
    void import("../../dev/template-6-confirmation-preview").then(module => { if (active) setDesign(module.template6ConfirmationDesignFixture()); }).catch(() => { if (active) setDesignFailed(true); });
    return () => { active = false; };
  }, [reference, confirmation, restoring, indeterminateCompletion]);

  return <section className="template-six-home template-six-confirmation" style={palette} dir="ltr" lang="en" aria-labelledby="six-confirmation-title">
    <img className="six-home-background" src="/assets/template-6/home-background-v1.webp" alt="" />
    <header className="six-confirmation-header"><p>ORDER CONFIRMATION</p><StorefrontLink to="/" ariaLabel="Close confirmation"><PiX aria-hidden="true" /></StorefrontLink></header>
    {ready && order ? <Template6ConfirmationContent profile={profile} order={order} design={mock} onTrack={() => navigate(`/order-details/${encodeURIComponent(String(order.display_id))}`)} /> : <div className="six-confirmation-empty"><PiPackage aria-hidden="true" /><h1 id="six-confirmation-title">{restoring || (reference && !design && !designFailed && !indeterminateCompletion) ? "Loading confirmation…" : indeterminateCompletion ? "Check your order result" : "Confirmation session ended"}</h1><p>{indeterminateCompletion ? "Return to checkout to safely check the existing result before ordering again." : "Receipt details are kept only in this session. You can check saved order updates through Orders."}</p><StorefrontLink to={indeterminateCompletion ? "/checkout" : "/orders"}>{indeterminateCompletion ? "RETURN TO CHECKOUT" : "VIEW ORDERS"}<PiArrowRight aria-hidden="true" /></StorefrontLink><StorefrontLink to="/">Continue shopping</StorefrontLink></div>}
  </section>;
}
