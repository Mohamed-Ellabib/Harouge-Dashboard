import { type CSSProperties, useEffect, useState } from "react";
import {
  IoArrowBack,
  IoCheckmark,
  IoCopyOutline,
  IoNotificationsOutline,
  IoShareOutline,
} from "react-icons/io5";

import "./drops-order-confirmed.css";
import { useOptionalCart } from "../../commerce/CartContext";
import { loadTrackedOrders } from "../../commerce/tracked-orders";
import { navigate } from "../../lib/navigation";
import { formatStorefrontMoney } from "../../lib/money";
import type { StorefrontProfileDto, StorefrontOrderConfirmationDto } from "../../types";

const asset = (name: string) => `/assets/drops/${name}`;

const orderItems = [
  { name: "Red high-top sneaker", image: asset("order-thumb-red-high.png") },
  { name: "Color runner sneaker", image: asset("order-thumb-color-runner.png") },
  { name: "Grey technical sneaker", image: asset("order-thumb-grey-runner.png") },
] as const;

const orderSteps = ["Order placed", "Preparing", "Shipped", "Delivered"] as const;

export function DropsOrderConfirmedPage({ profile }: { profile?: StorefrontProfileDto } = {}) {
  const cart = useOptionalCart();
  const [savedOrder, setSavedOrder] = useState<StorefrontOrderConfirmationDto | null>(null);
  const confirmation = cart?.confirmation ?? savedOrder;
  const [activeStep, setActiveStep] = useState(profile ? 0 : 1);
  useEffect(() => {
    if (!profile) return;
    let active = true;
    void loadTrackedOrders(profile.handle).then(orders => {
      const order = cart?.confirmation ? orders.find(o => o.display_id === cart.confirmation?.display_id) : orders[0];
      if (active && order) { setSavedOrder(order); setActiveStep(["confirmed", "processing", "shipped", "delivered"].indexOf(order.progress)); }
    }).catch(() => { if (active) setLiveMessage("Unable to refresh order status."); });
    return () => { active = false; };
  }, [profile?.handle, cart?.confirmation]);
  const number = profile ? String(confirmation?.display_id ?? "—") : "DRP-28491";
  const items = profile ? (confirmation?.items ?? []).map(item => ({ name: item.title, image: item.thumbnail_url ?? "" })) : orderItems;
  const count = profile ? confirmation?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0 : 3;
  const [liveMessage, setLiveMessage] = useState("");

  useEffect(() => {
    const previousTitle = document.title;
    const previousLang = document.documentElement.lang;
    const previousDirection = document.documentElement.dir;
    document.title = "Order Confirmed — DROPS Preview";
    document.documentElement.lang = "en";
    document.documentElement.dir = "ltr";
    document.documentElement.classList.add("drops-preview-document");
    document.body.classList.add("drops-preview-document");

    return () => {
      document.title = previousTitle;
      document.documentElement.lang = previousLang;
      document.documentElement.dir = previousDirection;
      document.documentElement.classList.remove("drops-preview-document");
      document.body.classList.remove("drops-preview-document");
    };
  }, []);

  const copyText = async (value: string, message: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setLiveMessage(message);
    } catch {
      setLiveMessage(`Unable to copy. Order number: ${value}`);
    }
  };

  const shareOrder = async () => {
    const shareData = {
      title: `Order #${number}`,
      text: "My DROPS order is confirmed.",
      url: window.location.href,
    };

    try {
      if (navigator.share) await navigator.share(shareData);
      else await navigator.clipboard.writeText(window.location.href);
      setLiveMessage("Order link ready to share.");
    } catch {
      setLiveMessage("Order link ready to share.");
    }
  };

  const goToStore = () => {
    navigate(profile ? "/" : "/?preview=1&template=drops");
  };

  const trackOrder = () => {
    if (profile) { navigate("/orders"); return; }
    setActiveStep((current) => Math.min(current + 1, orderSteps.length - 1));
    setLiveMessage(activeStep >= 2 ? "Your delivery is on its way." : "Tracking updated: your order has shipped.");
  };

  return (
    <div className="drops-confirmed-page" dir="ltr" lang="en">
      <header className="drops-confirmed-header">
        <button type="button" aria-label="Back to the DROPS store" onClick={goToStore}>
          <IoArrowBack aria-hidden="true" />
        </button>
        <h1>Order Confirmed</h1>
        <button type="button" aria-label="Share this order" onClick={shareOrder}>
          <IoShareOutline aria-hidden="true" />
        </button>
      </header>

      <main>
        <section className="drops-confirmed-celebration" aria-labelledby="drops-confirmed-title">
          <div className="drops-confirmed-celebration__art">
            <img
              src={asset("order-confirmation-hero.png")}
              alt="A green and white sneaker presented in an open DROPS shoebox with a confirmation check and confetti"
            />
          </div>
          <h2 id="drops-confirmed-title">{profile && !confirmation ? "Order confirmation" : "Your order is confirmed!"}</h2>
          <p>{profile ? confirmation ? "Thank you! Your order has been received." : "Your saved order details will appear here." : "Thanks, Rex! We’re getting your sneakers ready."}</p>
        </section>

        <section className="drops-confirmed-meta" aria-label="Order information">
          <div>
            <span>Order number</span>
            <strong>
              #{number}
              <button
                type="button"
                aria-label="Copy order number"
                onClick={() => copyText(number, "Order number copied.")}
              >
                <IoCopyOutline aria-hidden="true" />
              </button>
            </strong>
          </div>
          <i aria-hidden="true" />
          <div>
            <span>Estimated delivery</span>
            <strong>{profile ? "Confirmed by the store" : "Sep 4–6"}</strong>
          </div>
        </section>

        <section className="drops-confirmed-status" aria-labelledby="drops-status-title">
          <h2 id="drops-status-title">Order status</h2>
          <ol style={{ "--active-step": activeStep } as CSSProperties}>
            {orderSteps.map((step, index) => (
              <li className={index <= activeStep ? "is-complete" : ""} key={step}>
                <span>{index < activeStep ? <IoCheckmark aria-hidden="true" /> : null}</span>
                <b>{step}</b>
              </li>
            ))}
          </ol>
        </section>

        <section className="drops-confirmed-summary" aria-labelledby="drops-summary-title">
          <header>
            <h2 id="drops-summary-title">Order summary</h2>
            <span>{count} items</span>
          </header>
          <div className="drops-confirmed-summary__card">
            <div className="drops-confirmed-summary__products">
              {items.map((item) => (
                <div key={item.name}>
                  <img src={item.image} alt={item.name} />
                </div>
              ))}
            </div>
            <div className="drops-confirmed-summary__details">
              <strong>{count} pairs of sneakers</strong>
              <span>{profile ? confirmation?.payment.method === "bank_transfer" ? "Bank transfer · awaiting verification" : "Cash on delivery · payment due" : "Visa ending in 4582"}</span>
              <span>{profile ? profile.name : "Tegalsari, Surabaya"}</span>
            </div>
            <div className="drops-confirmed-summary__total">
              <span>{profile ? "Order total" : "Total paid"}</span>
              <strong>{profile ? formatStorefrontMoney(confirmation?.total ?? 0, confirmation?.currency_code ?? "lyd", profile.locale) : "$1,785.00"}</strong>
            </div>
          </div>
        </section>

        <p className="drops-confirmed-notice">
          <IoNotificationsOutline aria-hidden="true" />
          <span>{profile ? "Check your saved order status for delivery updates." : "We’ll notify you when your order ships."}</span>
        </p>

        <p className="drops-confirmed-live" role="status" aria-live="polite">{liveMessage}</p>

        <div className="drops-confirmed-actions">
          <button type="button" onClick={trackOrder}>Track Order</button>
          <button type="button" onClick={goToStore}>Continue Shopping</button>
        </div>
      </main>
    </div>
  );
}

export default DropsOrderConfirmedPage;
