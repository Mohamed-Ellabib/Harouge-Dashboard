import { useEffect, useState } from "react";
import {
  IoCheckmark,
  IoCloseOutline,
  IoLocationOutline,
} from "react-icons/io5";
import {
  PiHouseLine,
  PiPackage,
  PiSparkleFill,
  PiTruck,
} from "react-icons/pi";
import { SiMastercard } from "react-icons/si";

import { useOptionalCart } from "../../commerce/CartContext";
import { formatStorefrontMoney } from "../../lib/money";
import { navigate } from "../../lib/navigation";
import type { StorefrontProfileDto } from "../../types";
import { standardRoute } from "./StandardMobileNavigation";
import "./standard-order-confirmation.css";

const orderItems = [
  {
    id: "pastel-wrap-dress",
    name: "Pastel Wrap Dress",
    image: "/assets/standard/product-pastel-wrap-dress.webp",
  },
  {
    id: "heritage-leather-bag",
    name: "Heritage Leather Bag",
    image: "/assets/standard/cart-heritage-leather-bag.webp",
  },
  {
    id: "classic-beige-heels",
    name: "Classic Beige Heels",
    image: "/assets/standard/cart-classic-beige-heels.webp",
  },
] as const;

const progressSteps = [
  { label: "Confirmed", icon: IoCheckmark },
  { label: "Preparing", icon: PiPackage },
  { label: "Shipped", icon: PiTruck },
  { label: "Delivered", icon: PiHouseLine },
] as const;

const progressMessages = [
  "We’re preparing your order",
  "Your order is being prepared",
  "Your order is on the way",
  "Your order has been delivered",
] as const;

export default function StandardOrderConfirmationPage({ profile }: { profile?: StorefrontProfileDto } = {}) {
  const cartContext = useOptionalCart();
  const confirmation = cartContext?.confirmation;
  const [progress, setProgress] = useState(0);
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    const previousTitle = document.title;
    document.title = profile ? `Order confirmation | ${profile.name}` : "Order Confirmation | Standard Storefront Preview";
    document.documentElement.classList.add("standard-preview-document");
    document.body.classList.add("standard-preview-document");
    return () => {
      document.title = previousTitle;
      document.documentElement.classList.remove("standard-preview-document");
      document.body.classList.remove("standard-preview-document");
    };
  }, [profile]);
  const displayItems = confirmation?.items.map((item, index) => ({
    id: `${index}-${item.title}`,
    name: item.title,
    image: null,
  })) ?? orderItems;
  const total = confirmation
    ? formatStorefrontMoney(confirmation.total, confirmation.currency_code, profile?.locale ?? "en-LY")
    : "$353.00";

  const advanceTracking = () => {
    setProgress((current) => {
      const next = Math.min(progressSteps.length - 1, current + 1);
      setAnnouncement(`${progressSteps[next].label}: ${progressMessages[next]}`);
      return next;
    });
  };

  return (
    <div className="standard-confirmation" dir="ltr" lang="en">
      <header className="standard-confirmation__header">
        <p>Order Confirmation</p>
        <button
          type="button"
          aria-label="Close order confirmation"
          onClick={() => navigate(standardRoute("/"))}
        >
          <IoCloseOutline aria-hidden="true" />
        </button>
      </header>

      <section className="standard-confirmation-hero" aria-labelledby="standard-confirmation-title">
        <div className="standard-confirmation-emblem" aria-hidden="true">
          <PiSparkleFill className="standard-confirmation-emblem__sparkle standard-confirmation-emblem__sparkle--left" />
          <PiSparkleFill className="standard-confirmation-emblem__sparkle standard-confirmation-emblem__sparkle--right" />
          <PiSparkleFill className="standard-confirmation-emblem__sparkle standard-confirmation-emblem__sparkle--top" />
          <PiSparkleFill className="standard-confirmation-emblem__sparkle standard-confirmation-emblem__sparkle--bottom" />
          <span className="standard-confirmation-emblem__outer">
            <span className="standard-confirmation-emblem__middle">
              <span className="standard-confirmation-emblem__core">
                <IoCheckmark />
              </span>
            </span>
          </span>
        </div>
        <h1 id="standard-confirmation-title">Order Placed!</h1>
        <p><strong>Thank you.</strong> Your order has been confirmed.</p>
        <small>A confirmation has been sent to your email.</small>
      </section>

      <dl className="standard-confirmation-meta" aria-label="Order information">
        <div>
          <dt>Order Number</dt>
          <dd>#{confirmation?.display_id ?? "ST-20481"}</dd>
        </div>
        <div>
          <dt>Estimated Delivery</dt>
          <dd>{confirmation ? "To be confirmed" : "Sep 2–4"}</dd>
        </div>
        <div>
          <dt>Total</dt>
          <dd>{total}</dd>
        </div>
      </dl>

      <section className="standard-confirmation-order" aria-labelledby="standard-confirmation-order-title">
        <div className="standard-confirmation__section-heading">
          <h2 id="standard-confirmation-order-title">Your Order</h2>
          <span>{displayItems.length} items</span>
        </div>
        <div className="standard-confirmation-order__card">
          <div className="standard-confirmation-order__images">
            {displayItems.map((item) => (
              <button
                type="button"
                key={item.id}
                aria-label={`View ${item.name}`}
                onClick={() =>
                  navigate(
                    standardRoute("/"),
                  )
                }
              >
                {item.image ? <img src={item.image} alt={item.name} /> : <span className="standard-confirmation-order__placeholder" aria-hidden="true">{item.name.charAt(0)}</span>}
              </button>
            ))}
          </div>
          <div className="standard-confirmation-payment">
            <span className="standard-confirmation-payment__method">
              {!confirmation ? <SiMastercard aria-hidden="true" /> : null}
              <span>{confirmation?.payment.method === "bank_transfer" ? "Manual bank transfer" : confirmation ? "Cash on delivery" : "Paid with Mastercard •••• 4821"}</span>
            </span>
            <strong>{confirmation?.payment.status === "pending_verification" ? "Awaiting verification" : confirmation ? "Confirmed for fulfillment" : "Payment successful"}</strong>
          </div>
        </div>
      </section>

      <section className="standard-confirmation-progress" aria-labelledby="standard-confirmation-progress-title">
        <div className="standard-confirmation__section-heading">
          <h2 id="standard-confirmation-progress-title">Order Progress</h2>
        </div>
        <ol aria-label="Order progress">
          {progressSteps.map((step, index) => {
            const StepIcon = step.icon;
            const active = index <= progress;
            return (
              <li data-active={active ? "true" : "false"} key={step.label}>
                <span><StepIcon aria-hidden="true" /></span>
                <strong>{step.label}</strong>
              </li>
            );
          })}
        </ol>
        <p aria-live="polite">{progressMessages[progress]}</p>
      </section>

      {!confirmation ? <article className="standard-confirmation-address">
        <span aria-hidden="true"><IoLocationOutline /></span>
        <div>
          <p>Delivering to</p>
          <h2>Jani Ahmed</h2>
          <address>Hay Al-Andalus, Tripoli, Libya</address>
        </div>
      </article> : null}

      <div className="standard-confirmation-actions">
        {!confirmation ? <button
          className="standard-confirmation-actions__track"
          type="button"
          onClick={advanceTracking}
        >
          <PiTruck aria-hidden="true" />
          <span>{progress === 0 ? "Track Order" : "Update Tracking"}</span>
        </button> : null}
        {!confirmation ? <button
          className="standard-confirmation-actions__shop"
          type="button"
          onClick={() => navigate(standardRoute("/"))}
        >
          Continue Shopping
        </button> : null}
        <button
          className="standard-confirmation-actions__details"
          type="button"
          onClick={() => navigate(standardRoute(`/order-details/${confirmation?.display_id ?? "ST-20481"}`))}
        >
          View order details
        </button>
      </div>

      <span className="sr-only" aria-live="polite">{announcement}</span>
    </div>
  );
}
