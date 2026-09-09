import { useEffect, useState } from "react";
import {
  IoCheckmark,
  IoChevronForward,
  IoClose,
  IoLocationSharp,
} from "react-icons/io5";
import {
  PiCopyLight,
  PiCreditCardLight,
  PiHeadsetLight,
  PiMapPinAreaLight,
  PiTruckLight,
} from "react-icons/pi";

import { useOptionalCart } from "../../commerce/CartContext";
import { formatStorefrontMoney } from "../../lib/money";
import { navigate, StorefrontLink } from "../../lib/navigation";
import type { StorefrontProfileDto } from "../../types";
import { GlowBeautyStatusBar } from "./GlowBeautyChrome";
import { loadTrackedOrders } from "../../commerce/tracked-orders";
import "./glow-beauty-home.css";
import "./glow-beauty-order-placed.css";

const previewQuery = "preview=1&template=glow-beauty";
const orderNumber = "GLW-28462";

const orderItems = [
  { name: "Radiance Serum", image: "/assets/glow-beauty/product-radiance-serum-detail.png" },
  { name: "Matte Lipstick", image: "/assets/glow-beauty/product-matte-lipstick.png" },
  { name: "Hydra Moisturizer", image: "/assets/glow-beauty/product-hydra-moisturizer.png" },
] as const;

const deliverySteps = ["Confirmed", "Processing", "Shipped", "Delivered"] as const;

export function GlowBeautyOrderPlacedPage({
  profile,
}: {
  profile?: StorefrontProfileDto;
} = {}) {
  const cartContext = useOptionalCart();
  const confirmation = profile ? cartContext?.confirmation ?? null : null;
  const [deliveryStep, setDeliveryStep] = useState(profile ? 0 : 1);
  const [updatesEnabled, setUpdatesEnabled] = useState(false);
  const [copied, setCopied] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  useEffect(() => {
    if (!profile || !confirmation) return;
    let active = true;
    void loadTrackedOrders(profile.handle).then(orders => { const order = orders.find(item => item.display_id === confirmation.display_id); if (active && order) setDeliveryStep(["confirmed", "processing", "shipped", "delivered"].indexOf(order.progress)); }).catch(() => undefined);
    return () => { active = false; };
  }, [profile?.handle, confirmation]);

  useEffect(() => {
    const previousTitle = document.title;
    const previousLang = document.documentElement.lang;
    const previousDirection = document.documentElement.dir;
    document.title = profile ? `Order confirmation | ${profile.name}` : "Order Placed — Glow Beauty Preview";
    if (!profile) {
      document.documentElement.lang = "en";
      document.documentElement.dir = "ltr";
    }
    document.documentElement.classList.add("glow-beauty-preview-document");
    document.body.classList.add("glow-beauty-preview-document");
    return () => {
      document.title = previousTitle;
      if (!profile) {
        document.documentElement.lang = previousLang;
        document.documentElement.dir = previousDirection;
      }
      document.documentElement.classList.remove("glow-beauty-preview-document");
      document.body.classList.remove("glow-beauty-preview-document");
    };
  }, [profile]);

  const locale = profile?.locale ?? "en-LY";
  const english = locale === "en-LY";
  const displayOrderNumber = confirmation
    ? String(confirmation.display_id)
    : profile
      ? "—"
      : orderNumber;
  const displayItems = confirmation
    ? confirmation.items.map((item) => ({ name: item.title, image: item.thumbnail_url ?? null, quantity: item.quantity }))
    : profile
      ? []
      : orderItems.map((item) => ({ ...item, quantity: 1 }));
  const displayTotal = confirmation?.total ?? (profile ? 0 : 59.37);
  const money = (amount: number) => confirmation
    ? formatStorefrontMoney(amount, confirmation.currency_code, locale)
    : `$${amount.toFixed(2)}`;
  const Content = profile ? "div" : "main";

  const copyOrderNumber = async () => {
    try {
      await navigator.clipboard?.writeText(`#${displayOrderNumber}`);
    } catch {
      // Clipboard access is optional in the isolated design preview.
    }
    setCopied(true);
    setAnnouncement(`Order number ${displayOrderNumber} copied`);
  };

  const enableUpdates = () => {
    setUpdatesEnabled(true);
    setAnnouncement("Delivery updates enabled for this order");
  };

  const trackOrder = () => {
    setDeliveryStep((current) => {
      const next = Math.min(deliverySteps.length - 1, current + 1);
      setAnnouncement(`Order status: ${deliverySteps[next]}`);
      return next;
    });
  };

  return (
    <div className="glow-beauty-page glow-beauty-order-placed" dir={locale === "ar-LY" ? "rtl" : "ltr"} lang={locale === "ar-LY" ? "ar" : "en"}>
      <GlowBeautyStatusBar preview={!profile} />

      <header className="glow-beauty-order-placed__header">
        <span aria-hidden="true" />
        <h1>Order Placed</h1>
        <StorefrontLink to={profile ? "/" : `/?${previewQuery}`} ariaLabel="Close order confirmation"><IoClose aria-hidden="true" /></StorefrontLink>
      </header>

      <Content>
        <section className="glow-beauty-order-success" aria-labelledby="glow-beauty-order-success-title">
          <img src="/assets/glow-beauty/order-success-celebration.png" alt="" aria-hidden="true" />
          <div className="glow-beauty-order-success__check" aria-hidden="true"><IoCheckmark /></div>
          <h2 id="glow-beauty-order-success-title">{confirmation ? (english ? "Thank you for your order!" : "شكراً لطلبك!") : profile ? (english ? "Confirmation unavailable" : "تعذّر عرض التأكيد") : "Thank You, Sophia!"}</h2>
          <p>{confirmation ? (english ? "Your order has been placed successfully." : "تم إرسال طلبك بنجاح.") : profile ? (english ? "Return to the Store and try again if you have not submitted an order." : "عد إلى المتجر وحاول مجدداً إذا لم ترسل طلباً.") : "Your order has been placed successfully."}</p>
          {!profile ? <small>A confirmation has been sent to your email.</small> : null}
        </section>

        <section className="glow-beauty-order-number" aria-label="Order number">
          <div>
            <span>Order Number</span>
            <strong>#{displayOrderNumber}</strong>
          </div>
          <button type="button" aria-label={`Copy order number ${displayOrderNumber}`} onClick={copyOrderNumber}>
            <PiCopyLight aria-hidden="true" />
            <span className="glow-beauty-visually-hidden">{copied ? "Copied" : "Copy"}</span>
          </button>
          {confirmation || !profile ? <b>CONFIRMED</b> : null}
        </section>

        {confirmation || !profile ? <section className="glow-beauty-delivery-update" aria-labelledby="glow-beauty-delivery-update-title">
          <h2 id="glow-beauty-delivery-update-title">Delivery Update</h2>
          <div className="glow-beauty-delivery-update__summary">
            <span aria-hidden="true"><PiTruckLight /></span>
            <div><strong>{profile ? deliverySteps[deliveryStep] : "Arriving Sep 3–5"}</strong><p>Standard Delivery</p></div>
          </div>
          <ol aria-label="Delivery progress">
            {deliverySteps.map((step, index) => (
              <li key={step} className={index < deliveryStep ? "is-complete" : index === deliveryStep ? "is-active" : ""}>
                <span>{index < deliveryStep ? <IoCheckmark aria-hidden="true" /> : null}</span>
                <b>{step}</b>
              </li>
            ))}
          </ol>
          <button type="button" onClick={() => profile ? navigate("/orders") : enableUpdates()}>{profile ? "View saved order status" : updatesEnabled ? "Delivery updates enabled" : "Get delivery updates"}<IoChevronForward aria-hidden="true" /></button>
        </section> : null}

        {displayItems.length ? <section className="glow-beauty-order-summary" aria-labelledby="glow-beauty-order-summary-title">
          <header>
            <h2 id="glow-beauty-order-summary-title">Order Summary</h2>
            <button type="button" onClick={() => profile ? navigate("/orders") : setAnnouncement("Order details are shown in this preview")}>View Details <IoChevronForward aria-hidden="true" /></button>
          </header>
          <article>
            <div>
              {displayItems.map((item) => item.image ? <img key={item.name} src={item.image} alt={item.name} /> : <span className="glow-beauty-order-item-placeholder" key={item.name} aria-label={`${item.name}, quantity ${item.quantity}`}>{item.name.charAt(0)}</span>)}
            </div>
            <aside><strong>{displayItems.reduce((total, item) => total + item.quantity, 0)} items</strong><p>{confirmation?.payment.method === "bank_transfer" ? (english ? "Manual bank transfer · awaiting verification" : "تحويل مصرفي يدوي · بانتظار التحقق") : confirmation ? (english ? "Cash on delivery" : "الدفع عند الاستلام") : "Paid with Visa •••• 4242"}</p><b>{money(displayTotal)}</b></aside>
          </article>
        </section> : null}

        {!profile ? <section className="glow-beauty-order-info" aria-label="Shipping and payment information">
          <article>
            <span aria-hidden="true"><IoLocationSharp /></span>
            <div><strong>Shipping To</strong><b>Sophia Carter</b><p>24 Rosewood Avenue, Apt 6B<br />Los Angeles, CA 90024</p></div>
          </article>
          <article>
            <span aria-hidden="true"><PiCreditCardLight /></span>
            <div><strong>Payment</strong><p>Visa ending in 4242</p><b>Paid · $59.37</b></div>
          </article>
        </section> : null}

        {confirmation?.payment.method === "bank_transfer" ? <section className="glow-beauty-order-info" aria-label="Bank transfer instructions">
          <article><span aria-hidden="true"><PiCreditCardLight /></span><div><strong>{confirmation.payment.bank_transfer.bank_name}</strong><b>{confirmation.payment.bank_transfer.account_holder_name}</b><p>{confirmation.payment.bank_transfer.account_reference}<br />{confirmation.payment.bank_transfer.instructions}</p></div></article>
        </section> : null}

        {(profile?.contact.public_email || !profile) ? <a className="glow-beauty-order-support" href={`mailto:${profile?.contact.public_email ?? "support@glowbeauty.test"}`}>
          <span aria-hidden="true"><PiHeadsetLight /></span>
          <div><strong>Need help with your order?</strong><p>Our beauty support team is here for you.</p><b>Contact Support <IoChevronForward aria-hidden="true" /></b></div>
          <img src="/assets/glow-beauty/order-success-celebration.png" alt="" aria-hidden="true" />
        </a> : null}

        <div className="glow-beauty-order-actions">
          {confirmation || !profile ? <button type="button" onClick={() => profile ? navigate("/orders") : trackOrder()}><PiMapPinAreaLight aria-hidden="true" />Track Order</button> : null}
          <button type="button" onClick={() => navigate(profile ? "/" : `/?${previewQuery}`)}>Continue Shopping <IoChevronForward aria-hidden="true" /></button>
        </div>
      </Content>

      <span className="glow-beauty-visually-hidden" aria-live="polite">{announcement}</span>
    </div>
  );
}

export default GlowBeautyOrderPlacedPage;
