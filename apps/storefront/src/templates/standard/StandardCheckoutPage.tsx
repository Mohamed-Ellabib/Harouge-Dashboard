import { useEffect, useState } from "react";
import {
  IoArrowBackOutline,
  IoCardOutline,
  IoCashOutline,
  IoCheckmark,
  IoLocationOutline,
  IoLockClosedOutline,
  IoShieldCheckmarkOutline,
} from "react-icons/io5";

import { useOptionalCart } from "../../commerce/CartContext";
import { formatStorefrontMoney } from "../../lib/money";
import { navigate } from "../../lib/navigation";
import type { StorefrontCheckoutAddress, StorefrontPaymentMethod, StorefrontProfileDto, StorefrontShippingOptionDto } from "../../types";
import { standardRoute } from "./StandardMobileNavigation";
import "./standard-checkout.css";

const checkoutItems = [
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

const deliveryAddresses = [
  {
    name: "Jani Ahmed",
    lines: ["24 Palm Street, Hay Al-Andalus", "Tripoli, Libya", "+218 91 000 0000"],
  },
  {
    name: "Jani Ahmed",
    lines: ["18 Omar Al-Mukhtar Street", "Tripoli, Libya", "+218 91 000 0000"],
  },
] as const;

type DeliveryMethod = "standard" | "express";
type PaymentMethod = "mastercard" | "cash";

const formatMoney = (amount: number) => `$${amount.toFixed(2)}`;

export default function StandardCheckoutPage({ profile }: { profile?: StorefrontProfileDto } = {}) {
  const cartContext = useOptionalCart();
  const runtime = Boolean(profile && cartContext);
  const [addressIndex, setAddressIndex] = useState(0);
  const [deliveryMethod, setDeliveryMethod] =
    useState<DeliveryMethod>("standard");
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("mastercard");
  const [billingMatchesDelivery, setBillingMatchesDelivery] = useState(true);
  const [addingPayment, setAddingPayment] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [stage, setStage] = useState<"details" | "shipping" | "review">("details");
  const [shippingOptions, setShippingOptions] = useState<StorefrontShippingOptionDto[]>([]);
  const [selectedShippingId, setSelectedShippingId] = useState("");
  const [runtimePayment, setRuntimePayment] = useState<StorefrontPaymentMethod>(
    cartContext?.capability.online_checkout.payment_methods[0] ?? "cod",
  );
  const [address, setAddress] = useState<StorefrontCheckoutAddress>({
    email: "",
    first_name: "",
    last_name: "",
    address_1: "",
    city: "",
    country_code: cartContext?.capability.online_checkout.status === "available"
      ? cartContext.capability.online_checkout.country_codes[0] ?? "ly"
      : "ly",
    phone: "",
  });

  useEffect(() => {
    const previousTitle = document.title;
    document.title = profile ? `Checkout | ${profile.name}` : "Checkout | Standard Storefront Preview";
    document.documentElement.classList.add("standard-preview-document");
    document.body.classList.add("standard-preview-document");
    return () => {
      document.title = previousTitle;
      document.documentElement.classList.remove("standard-preview-document");
      document.body.classList.remove("standard-preview-document");
    };
  }, [profile]);

  const subtotal = runtime ? cartContext?.cart?.item_subtotal ?? 0 : 373;
  const discount = runtime ? 0 : 20;
  const shipping = runtime ? cartContext?.cart?.shipping_total ?? 0 : deliveryMethod === "express" ? 12 : 0;
  const total = runtime ? cartContext?.cart?.total ?? 0 : subtotal - discount + shipping;
  const selectedAddress = deliveryAddresses[addressIndex];
  const money = (amount: number) => profile
    ? formatStorefrontMoney(amount, cartContext?.cart?.currency_code ?? "lyd", profile.locale)
    : formatMoney(amount);
  const runtimeItems = cartContext?.cart?.items ?? [];
  const displayItems = runtime
    ? runtimeItems.map((item) => ({ id: item.id, name: item.title, image: item.thumbnail_url ?? "/assets/standard/arrival-cream-set.webp" }))
    : checkoutItems;
  const displayItemCount = runtime
    ? runtimeItems.reduce((sum, item) => sum + item.quantity, 0)
    : 3;

  const selectDelivery = (method: DeliveryMethod) => {
    setDeliveryMethod(method);
    setAnnouncement(
      method === "standard"
        ? "Standard delivery selected"
        : "Express delivery selected",
    );
  };

  const selectPayment = (method: PaymentMethod) => {
    setPaymentMethod(method);
    setAnnouncement(
      method === "mastercard"
        ? "Mastercard ending in 4821 selected"
        : "Cash on delivery selected",
    );
  };

  const placeOrder = async () => {
    if (!runtime || !cartContext) {
      navigate(standardRoute("/order-confirmation"));
      return;
    }
    try {
      if (stage === "details") {
        if (![address.email, address.first_name, address.last_name, address.address_1, address.city, address.phone].every((value) => (value ?? "").trim())) {
          setAnnouncement("Complete the delivery address before continuing.");
          return;
        }
        const options = await cartContext.submitAddress(address);
        setShippingOptions(options);
        setSelectedShippingId(options[0]?.id ?? "");
        setStage("shipping");
        setAnnouncement("Address saved. Choose a delivery method.");
        return;
      }
      if (stage === "shipping") {
        if (!selectedShippingId) return;
        await cartContext.selectShipping(selectedShippingId);
        setStage("review");
        setAnnouncement("Delivery selected. Review and place your order.");
        return;
      }
      await cartContext.completeOrder(runtimePayment);
      navigate(standardRoute("/order-confirmation"), { replace: true });
    } catch {
      setAnnouncement(cartContext.error ?? "Checkout could not continue.");
    }
  };

  return (
    <div className="standard-checkout" dir="ltr" lang="en">
      <header className="standard-checkout__header">
        <button
          className="standard-checkout__round-action"
          type="button"
          aria-label="Back to cart"
          onClick={() => navigate(standardRoute("/cart"))}
        >
          <IoArrowBackOutline aria-hidden="true" />
        </button>
        <div>
          <h1>Checkout</h1>
          <p>Secure checkout</p>
        </div>
        <span className="standard-checkout__round-action" aria-hidden="true">
          <IoShieldCheckmarkOutline />
        </span>
      </header>

      <section
        className="standard-checkout__section standard-checkout__address-section"
        aria-labelledby="standard-checkout-address-title"
      >
        <div className="standard-checkout__section-heading">
          <h2 id="standard-checkout-address-title">Delivery Address</h2>
          {!runtime ? <button
            type="button"
            onClick={() => {
              const nextIndex = addressIndex === 0 ? 1 : 0;
              setAddressIndex(nextIndex);
              setAnnouncement(`Delivery address changed to ${deliveryAddresses[nextIndex].lines[0]}`);
            }}
          >
            Change
          </button> : null}
        </div>
        <article className="standard-checkout-address">
          <span className="standard-checkout-address__icon" aria-hidden="true">
            <IoLocationOutline />
          </span>
          {runtime ? <div className="standard-checkout-address__fields">
            <label><span>First name</span><input value={address.first_name} autoComplete="given-name" onChange={(event) => setAddress((current) => ({ ...current, first_name: event.target.value }))} /></label>
            <label><span>Last name</span><input value={address.last_name} autoComplete="family-name" onChange={(event) => setAddress((current) => ({ ...current, last_name: event.target.value }))} /></label>
            <label><span>Email</span><input value={address.email} type="email" autoComplete="email" onChange={(event) => setAddress((current) => ({ ...current, email: event.target.value }))} /></label>
            <label><span>Phone</span><input value={address.phone} inputMode="tel" autoComplete="tel" onChange={(event) => setAddress((current) => ({ ...current, phone: event.target.value }))} /></label>
            <label><span>City</span><input value={address.city} onChange={(event) => setAddress((current) => ({ ...current, city: event.target.value }))} /></label>
            <label><span>Address</span><input value={address.address_1} autoComplete="street-address" onChange={(event) => setAddress((current) => ({ ...current, address_1: event.target.value }))} /></label>
          </div> : <div><h3>{selectedAddress.name}</h3>{selectedAddress.lines.map((line) => <p key={line}>{line}</p>)}</div>}
          <span className="standard-checkout__selected-check" aria-hidden="true">
            <IoCheckmark />
          </span>
        </article>
      </section>

      <section
        className="standard-checkout__section standard-checkout__delivery-section"
        aria-labelledby="standard-checkout-delivery-title"
      >
        <div className="standard-checkout__section-heading">
          <h2 id="standard-checkout-delivery-title">Delivery Method</h2>
        </div>
        <div className="standard-checkout-delivery" role="radiogroup" aria-label="Delivery method">
          {runtime && shippingOptions.length ? shippingOptions.map((option) => <button key={option.id} type="button" role="radio" aria-checked={selectedShippingId === option.id} data-selected={selectedShippingId === option.id ? "true" : "false"} onClick={() => setSelectedShippingId(option.id)}><span className="standard-checkout__radio" aria-hidden="true" /><span><strong>{option.name}</strong><small>Store delivery option</small><b>{option.amount ? money(option.amount) : "Free"}</b></span></button>) : null}
          {!runtime ? <>
          <button
            type="button"
            role="radio"
            aria-checked={deliveryMethod === "standard"}
            data-selected={deliveryMethod === "standard" ? "true" : "false"}
            onClick={() => selectDelivery("standard")}
          >
            <span className="standard-checkout__radio" aria-hidden="true" />
            <span>
              <strong>Standard Delivery</strong>
              <small>3–5 business days</small>
              <b>Free</b>
            </span>
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={deliveryMethod === "express"}
            data-selected={deliveryMethod === "express" ? "true" : "false"}
            onClick={() => selectDelivery("express")}
          >
            <span className="standard-checkout__radio" aria-hidden="true" />
            <span>
              <strong>Express Delivery</strong>
              <small>1–2 business days</small>
              <b>$12.00</b>
            </span>
          </button>
          </> : null}
        </div>
      </section>

      <section
        className="standard-checkout__section standard-checkout__payment-section"
        aria-labelledby="standard-checkout-payment-title"
      >
        <div className="standard-checkout__section-heading">
          <h2 id="standard-checkout-payment-title">Payment Method</h2>
          {!runtime ? <button
            type="button"
            aria-expanded={addingPayment}
            aria-controls="standard-checkout-new-payment"
            onClick={() => {
              setAddingPayment((current) => !current);
              setAnnouncement(addingPayment ? "New payment form closed" : "New payment form opened");
            }}
          >
            Add new
          </button> : null}
        </div>

        {!runtime && addingPayment ? (
          <form
            id="standard-checkout-new-payment"
            className="standard-checkout-new-payment"
            onSubmit={(event) => {
              event.preventDefault();
              setAddingPayment(false);
              selectPayment("mastercard");
              setAnnouncement("New preview card saved and selected");
            }}
          >
            <label>
              Card number
              <input inputMode="numeric" placeholder="0000 0000 0000 4821" required />
            </label>
            <label>
              Expiry
              <input inputMode="numeric" placeholder="09/29" required />
            </label>
            <button type="submit">Save card</button>
          </form>
        ) : null}

        <div className="standard-checkout-payment" role="radiogroup" aria-label="Payment method">
          {runtime ? cartContext?.capability.online_checkout.payment_methods.map((method) => <button className={method === "cod" ? "standard-checkout-payment__cash" : "standard-checkout-payment__card"} type="button" role="radio" key={method} aria-checked={runtimePayment === method} data-selected={runtimePayment === method ? "true" : "false"} onClick={() => setRuntimePayment(method)}><span className="standard-checkout__radio" aria-hidden="true" />{method === "cod" ? <IoCashOutline aria-hidden="true" /> : <IoCardOutline aria-hidden="true" />}<span>{method === "cod" ? "Cash on Delivery" : "Manual bank transfer"}</span></button>) : <>
          <button
            className="standard-checkout-payment__card"
            type="button"
            role="radio"
            aria-checked={paymentMethod === "mastercard"}
            data-selected={paymentMethod === "mastercard" ? "true" : "false"}
            onClick={() => selectPayment("mastercard")}
          >
            <span className="standard-checkout__radio" aria-hidden="true" />
            <IoCardOutline aria-hidden="true" />
            <span className="standard-checkout-payment__copy">
              <strong>Mastercard</strong>
              <small>•••• 4821</small>
            </span>
            <span className="standard-checkout-payment__expiry">Expires 09/29</span>
          </button>
          </>}
          {!runtime ? <button
            className="standard-checkout-payment__cash"
            type="button"
            role="radio"
            aria-checked={paymentMethod === "cash"}
            data-selected={paymentMethod === "cash" ? "true" : "false"}
            onClick={() => selectPayment("cash")}
          >
            <span className="standard-checkout__radio" aria-hidden="true" />
            <IoCashOutline aria-hidden="true" />
            <span>Cash on Delivery</span>
          </button> : null}
        </div>

        <label className="standard-checkout-billing">
          <input
            type="checkbox"
            checked={billingMatchesDelivery}
            onChange={(event) => {
              setBillingMatchesDelivery(event.currentTarget.checked);
              setAnnouncement(
                event.currentTarget.checked
                  ? "Billing address matches delivery"
                  : "A separate billing address is required",
              );
            }}
          />
          <span aria-hidden="true"><IoCheckmark /></span>
          Billing address is the same as delivery
        </label>
      </section>

      <section
        className="standard-checkout__section standard-checkout__review-section"
        aria-labelledby="standard-checkout-review-title"
      >
        <div className="standard-checkout__section-heading">
          <h2 id="standard-checkout-review-title">Order Review</h2>
          <span>{displayItemCount} {displayItemCount === 1 ? "item" : "items"}</span>
        </div>
        <button
          className="standard-checkout-review"
          type="button"
          onClick={() => navigate(standardRoute("/cart"))}
        >
          <span className="standard-checkout-review__images">
            {displayItems.map((item) => (
              <img src={item.image} alt="" key={item.id} />
            ))}
          </span>
          <span>
            <strong>{displayItemCount} products</strong>
            <small>View items</small>
          </span>
        </button>
      </section>

      <section
        className="standard-checkout-summary"
        aria-labelledby="standard-checkout-summary-title"
      >
        <h2 id="standard-checkout-summary-title">Order Summary</h2>
        <dl>
          <div><dt>Subtotal</dt><dd>{money(subtotal)}</dd></div>
          <div><dt>Shipping</dt><dd>{shipping === 0 ? "Free" : money(shipping)}</dd></div>
          <div><dt>Discount</dt><dd>−{money(discount)}</dd></div>
          <div className="standard-checkout-summary__total">
            <dt>Total</dt><dd>{money(total)}</dd>
          </div>
        </dl>
      </section>

      <p className="standard-checkout__protected">
        <IoLockClosedOutline aria-hidden="true" />
        Your payment is protected
      </p>

      <aside className="standard-checkout-order" aria-label="Place order">
        <button type="button" disabled={Boolean(runtime && (cartContext?.pending || !cartContext?.cart?.items.length))} onClick={() => void placeOrder()}>
          <IoLockClosedOutline aria-hidden="true" />
          <span>{runtime ? stage === "details" ? "Continue to delivery" : stage === "shipping" ? "Review order" : "Place Order" : "Place Order"}</span>
          <strong>{money(total)}</strong>
        </button>
      </aside>

      <span className="sr-only" aria-live="polite">{announcement}</span>
    </div>
  );
}
