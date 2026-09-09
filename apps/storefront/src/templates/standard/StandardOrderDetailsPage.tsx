import { useEffect, useState } from "react";
import {
  IoCheckmark,
  IoChevronBackOutline,
  IoChevronForwardOutline,
  IoLocationOutline,
} from "react-icons/io5";
import {
  PiCreditCard,
  PiDownloadSimple,
  PiHeadphones,
  PiHouseLine,
  PiPackage,
  PiTruck,
} from "react-icons/pi";

import { navigate } from "../../lib/navigation";
import "./standard-order-details.css";

const orderItems = [
  {
    id: "pastel-wrap-dress",
    name: "Pastel Wrap Dress",
    variant: "Size: M  •  Coral",
    price: "$129.00",
    image: "/assets/standard/product-pastel-wrap-dress.webp",
  },
  {
    id: "heritage-leather-bag",
    name: "Heritage Leather Bag",
    variant: "Color: Espresso",
    price: "$148.00",
    image: "/assets/standard/cart-heritage-leather-bag.webp",
  },
  {
    id: "classic-beige-heels",
    name: "Classic Beige Heels",
    variant: "Size: 38  •  Beige",
    price: "$96.00",
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

const invoiceText = [
  "STANDARD STOREFRONT PREVIEW",
  "Invoice #ST-20481",
  "Placed on Aug 28, 2026",
  "",
  "Pastel Wrap Dress — $129.00",
  "Heritage Leather Bag — $148.00",
  "Classic Beige Heels — $96.00",
  "",
  "Subtotal: $373.00",
  "Shipping: Free",
  "Discount: -$20.00",
  "Total paid: $353.00",
] as const;

export default function StandardOrderDetailsPage() {
  const [progress, setProgress] = useState(0);
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Order Details | Standard Storefront Preview";
    document.documentElement.classList.add("standard-preview-document");
    document.body.classList.add("standard-preview-document");
    return () => {
      document.title = previousTitle;
      document.documentElement.classList.remove("standard-preview-document");
      document.body.classList.remove("standard-preview-document");
    };
  }, []);

  const advanceTracking = () => {
    setProgress((current) => {
      const next = Math.min(progressSteps.length - 1, current + 1);
      setAnnouncement(`${progressSteps[next].label}: ${progressMessages[next]}`);
      return next;
    });
  };

  const downloadInvoice = () => {
    const invoice = new Blob([invoiceText.join("\n")], { type: "text/plain;charset=utf-8" });
    const invoiceUrl = URL.createObjectURL(invoice);
    const anchor = document.createElement("a");
    anchor.href = invoiceUrl;
    anchor.download = "ST-20481-invoice.txt";
    anchor.click();
    URL.revokeObjectURL(invoiceUrl);
    setAnnouncement("Invoice download started");
  };

  return (
    <div className="standard-order-details" dir="ltr" lang="en">
      <header className="standard-order-details__header">
        <button
          type="button"
          aria-label="Back to order confirmation"
          onClick={() => navigate("/order-confirmation?preview=1&template=standard")}
        >
          <IoChevronBackOutline aria-hidden="true" />
        </button>
        <h1>Order Details</h1>
        <button type="button" aria-label="Download invoice" onClick={downloadInvoice}>
          <PiDownloadSimple aria-hidden="true" />
        </button>
      </header>

      <section className="standard-order-details-summary" aria-labelledby="standard-order-number">
        <div className="standard-order-details-summary__topline">
          <h2 id="standard-order-number">#ST-20481</h2>
          <strong>Confirmed</strong>
        </div>
        <p>Placed on Aug 28, 2026</p>
        <dl>
          <div>
            <dt>Estimated Delivery</dt>
            <dd>Sep 2–4</dd>
          </div>
          <div>
            <dt>Payment Status</dt>
            <dd>Paid</dd>
          </div>
        </dl>
      </section>

      <section className="standard-order-details-progress" aria-labelledby="standard-order-progress-title">
        <h2 id="standard-order-progress-title">Order Progress</h2>
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

      <section className="standard-order-details-items" aria-labelledby="standard-order-items-title">
        <div className="standard-order-details__section-heading">
          <h2 id="standard-order-items-title">Items in Your Order</h2>
          <span>3 items</span>
        </div>
        <div className="standard-order-details-items__list">
          {orderItems.map((item) => (
            <article key={item.id}>
              <button
                className="standard-order-details-item__image"
                type="button"
                aria-label={`View ${item.name}`}
                onClick={() =>
                  navigate(
                    item.id === "pastel-wrap-dress"
                      ? "/products/pastel-wrap-dress?preview=1&template=standard"
                      : "/cart?preview=1&template=standard",
                  )
                }
              >
                <img src={item.image} alt={item.name} />
              </button>
              <div className="standard-order-details-item__copy">
                <h3>{item.name}</h3>
                <p>{item.variant}</p>
                <span>Qty: 1</span>
              </div>
              <strong className="standard-order-details-item__price">{item.price}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="standard-order-details-delivery" aria-labelledby="standard-order-delivery-title">
        <h2 id="standard-order-delivery-title">Delivery Details</h2>
        <article>
          <span className="standard-order-details__icon" aria-hidden="true"><IoLocationOutline /></span>
          <address>
            <strong>Jani Ahmed</strong>
            <span>+218 91 000 0000</span>
            <span>24 Palm Street, Hay Al-Andalus</span>
            <span>Tripoli, Libya</span>
          </address>
          <p>Standard Delivery&nbsp; • &nbsp;Free</p>
        </article>
      </section>

      <section className="standard-order-details-payment" aria-labelledby="standard-order-payment-title">
        <h2 id="standard-order-payment-title">Payment Method</h2>
        <article>
          <span className="standard-order-details__icon" aria-hidden="true"><PiCreditCard /></span>
          <div>
            <strong>Mastercard •••• 4821</strong>
            <span>Paid on Aug 28, 2026</span>
          </div>
          <mark>Paid</mark>
        </article>
      </section>

      <section className="standard-order-details-totals" aria-labelledby="standard-order-summary-title">
        <h2 id="standard-order-summary-title">Payment Summary</h2>
        <dl>
          <div><dt>Subtotal</dt><dd>$373.00</dd></div>
          <div><dt>Shipping</dt><dd>Free</dd></div>
          <div className="standard-order-details-totals__discount"><dt>Discount</dt><dd>−$20.00</dd></div>
          <div className="standard-order-details-totals__total"><dt>Total Paid</dt><dd>$353.00</dd></div>
        </dl>
      </section>

      <a
        className="standard-order-details-support"
        href="mailto:support@standard-store.test?subject=Order%20ST-20481"
      >
        <span className="standard-order-details__icon" aria-hidden="true"><PiHeadphones /></span>
        <span>Need help with this order?</span>
        <strong>Contact Support <IoChevronForwardOutline aria-hidden="true" /></strong>
      </a>

      <div className="standard-order-details-actions">
        <button type="button" className="standard-order-details-actions__track" onClick={advanceTracking}>
          <PiTruck aria-hidden="true" />
          <span>{progress === 0 ? "Track Order" : "Update Tracking"}</span>
        </button>
        <button type="button" className="standard-order-details-actions__invoice" onClick={downloadInvoice}>
          <PiDownloadSimple aria-hidden="true" />
          <span>Download Invoice</span>
        </button>
      </div>

      <span className="sr-only" aria-live="polite">{announcement}</span>
    </div>
  );
}
