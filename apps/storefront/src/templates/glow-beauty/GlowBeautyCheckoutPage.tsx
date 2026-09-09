import { useEffect, useMemo, useState } from "react";
import {
  IoCashOutline,
  IoCardOutline,
  IoArrowBack,
  IoCheckmark,
  IoLocationSharp,
  IoShieldCheckmarkOutline,
} from "react-icons/io5";
import {
  PiCreditCardLight,
  PiLockKeyLight,
  PiShoppingBagOpenLight,
  PiTicketLight,
  PiTruckLight,
} from "react-icons/pi";

import { useOptionalCart } from "../../commerce/CartContext";
import { formatStorefrontMoney } from "../../lib/money";
import { navigate, StorefrontLink } from "../../lib/navigation";
import type {
  StorefrontCheckoutAddress,
  StorefrontPaymentMethod,
  StorefrontProfileDto,
  StorefrontShippingOptionDto,
} from "../../types";
import { GlowBeautyStatusBar } from "./GlowBeautyChrome";
import "./glow-beauty-home.css";
import "./glow-beauty-checkout.css";

const previewQuery = "preview=1&template=glow-beauty";

const orderItems = [
  { name: "Radiance Serum", image: "/assets/glow-beauty/product-radiance-serum-detail.png" },
  { name: "Matte Lipstick", image: "/assets/glow-beauty/product-matte-lipstick.png" },
  { name: "Hydra Moisturizer", image: "/assets/glow-beauty/product-hydra-moisturizer.png" },
];

const addresses = [
  { name: "Sophia Carter", lines: ["24 Rosewood Avenue, Apt 6B", "Los Angeles, CA 90024", "+1 (310) 555–0182"] },
  { name: "Jani Ahmed", lines: ["24 Palm Street, Hay Al-Andalus", "Tripoli, Libya", "+218 91 000 0000"] },
] as const;

const payments = [
  { brand: "VISA", label: "Visa ending in 4242", expires: "Expires 08/29" },
  { brand: "MC", label: "Mastercard ending in 4821", expires: "Expires 09/29" },
] as const;

export function GlowBeautyCheckoutPage({
  profile,
}: {
  profile?: StorefrontProfileDto;
} = {}) {
  const cartContext = useOptionalCart();
  const runtime = Boolean(profile && cartContext);
  const [addressIndex, setAddressIndex] = useState(0);
  const [expressDelivery, setExpressDelivery] = useState(false);
  const [paymentIndex, setPaymentIndex] = useState(0);
  const [billingMatches, setBillingMatches] = useState(true);
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [placed, setPlaced] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [stage, setStage] = useState<"details" | "shipping" | "review">("details");
  const [shippingOptions, setShippingOptions] = useState<StorefrontShippingOptionDto[]>([]);
  const [selectedShippingId, setSelectedShippingId] = useState("");
  const [runtimePayment, setRuntimePayment] = useState<StorefrontPaymentMethod>(
    cartContext?.capability.online_checkout.payment_methods[0] ?? "cod",
  );
  const [runtimeAddress, setRuntimeAddress] = useState<StorefrontCheckoutAddress>({
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
    const previousLang = document.documentElement.lang;
    const previousDirection = document.documentElement.dir;
    document.title = profile ? `Checkout | ${profile.name}` : "Checkout — Glow Beauty Preview";
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

  const deliveryFee = runtime ? cartContext?.cart?.shipping_total ?? 0 : expressDelivery ? 12 : 0;
  const subtotal = runtime ? cartContext?.cart?.item_subtotal ?? 0 : 59.97;
  const discount = runtime ? 0 : 5;
  const tax = runtime ? 0 : 4.4;
  const total = useMemo(() => runtime ? cartContext?.cart?.total ?? 0 : subtotal - discount + deliveryFee + tax, [cartContext?.cart?.total, deliveryFee, discount, runtime, subtotal, tax]);
  const address = addresses[addressIndex];
  const payment = payments[paymentIndex];
  const locale = profile?.locale ?? "en-LY";
  const english = locale === "en-LY";
  const money = (amount: number) => profile
    ? formatStorefrontMoney(amount, cartContext?.cart?.currency_code ?? "lyd", locale)
    : `$${amount.toFixed(2)}`;
  const displayItems = runtime
    ? (cartContext?.cart?.items ?? []).map((item) => ({
        name: item.title,
        image: item.thumbnail_url,
      }))
    : orderItems;
  const displayItemCount = runtime
    ? cartContext?.cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0
    : 3;
  const Content = profile ? "div" : "main";

  const placeOrder = async () => {
    if (!termsAccepted) {
      setAnnouncement("Accept the Terms and Conditions before placing your order");
      return;
    }
    if (runtime && cartContext) {
      try {
        if (stage === "details") {
          if (![runtimeAddress.email, runtimeAddress.first_name, runtimeAddress.last_name, runtimeAddress.address_1, runtimeAddress.city, runtimeAddress.phone].every((value) => (value ?? "").trim())) {
            setAnnouncement(english ? "Complete the delivery address before continuing." : "أكمل عنوان التوصيل قبل المتابعة.");
            return;
          }
          const options = await cartContext.submitAddress(runtimeAddress);
          setShippingOptions(options);
          setSelectedShippingId(options[0]?.id ?? "");
          setStage("shipping");
          setAnnouncement(english ? "Address saved. Choose a delivery method." : "تم حفظ العنوان. اختر طريقة التوصيل.");
          return;
        }
        if (stage === "shipping") {
          if (!selectedShippingId) return;
          await cartContext.selectShipping(selectedShippingId);
          setStage("review");
          setAnnouncement(english ? "Delivery selected. Review and place your order." : "تم اختيار التوصيل. راجع الطلب وأكده.");
          return;
        }
        await cartContext.completeOrder(runtimePayment);
        navigate("/order-confirmation", { replace: true });
      } catch {
        setAnnouncement(cartContext.error ?? (english ? "Checkout could not continue." : "تعذّر متابعة إتمام الطلب."));
      }
      return;
    }
    setPlaced(true);
    setAnnouncement("Order placed successfully in this design preview");
    window.location.assign(`/order-confirmation?${previewQuery}`);
  };

  return (
    <div className="glow-beauty-page glow-beauty-checkout-page" dir={locale === "ar-LY" ? "rtl" : "ltr"} lang={locale === "ar-LY" ? "ar" : "en"}>
      <GlowBeautyStatusBar preview={!profile} />

      <header className="glow-beauty-checkout-header">
        <StorefrontLink to={profile ? "/cart" : `/cart?${previewQuery}`} ariaLabel="Back to My Bag"><IoArrowBack aria-hidden="true" /></StorefrontLink>
        <h1>Checkout</h1>
        <button type="button" aria-label="Secure checkout information" onClick={() => setAnnouncement("Your checkout information is protected")}><IoShieldCheckmarkOutline aria-hidden="true" /></button>
      </header>

      <ol className="glow-beauty-checkout-progress" aria-label="Checkout progress">
        <li className="is-complete"><span><IoCheckmark aria-hidden="true" /></span><b>Bag</b></li>
        <li className={placed ? "is-complete" : "is-active"}><span>{placed ? <IoCheckmark aria-hidden="true" /> : null}</span><b>Checkout</b></li>
        <li className={placed ? "is-complete" : ""}><span>{placed ? <IoCheckmark aria-hidden="true" /> : null}</span><b>Done</b></li>
      </ol>

      <Content>
        <section className="glow-beauty-checkout-section glow-beauty-shipping" aria-labelledby="glow-beauty-shipping-title">
          <header><h2 id="glow-beauty-shipping-title">Shipping Address</h2>{!runtime ? <button type="button" onClick={() => { setAddressIndex((index) => index ? 0 : 1); setPlaced(false); }}>Change</button> : null}</header>
          <article className={runtime ? "is-runtime" : undefined}>
            <span><IoLocationSharp aria-hidden="true" /></span>
            {runtime ? <div className="glow-beauty-checkout-fields">
              <label><span>First name</span><input value={runtimeAddress.first_name} autoComplete="given-name" onChange={(event) => setRuntimeAddress((current) => ({ ...current, first_name: event.target.value }))} /></label>
              <label><span>Last name</span><input value={runtimeAddress.last_name} autoComplete="family-name" onChange={(event) => setRuntimeAddress((current) => ({ ...current, last_name: event.target.value }))} /></label>
              <label><span>Email</span><input type="email" value={runtimeAddress.email} autoComplete="email" onChange={(event) => setRuntimeAddress((current) => ({ ...current, email: event.target.value }))} /></label>
              <label><span>Phone</span><input value={runtimeAddress.phone} inputMode="tel" autoComplete="tel" onChange={(event) => setRuntimeAddress((current) => ({ ...current, phone: event.target.value }))} /></label>
              <label><span>City</span><input value={runtimeAddress.city} onChange={(event) => setRuntimeAddress((current) => ({ ...current, city: event.target.value }))} /></label>
              <label><span>Address</span><input value={runtimeAddress.address_1} autoComplete="street-address" onChange={(event) => setRuntimeAddress((current) => ({ ...current, address_1: event.target.value }))} /></label>
            </div> : <div><strong>{address.name}</strong>{address.lines.map((line) => <p key={line}>{line}</p>)}</div>}
            <i><IoCheckmark aria-hidden="true" /></i>
          </article>
        </section>

        <section className="glow-beauty-checkout-section glow-beauty-delivery" aria-labelledby="glow-beauty-delivery-title">
          <header><h2 id="glow-beauty-delivery-title">Delivery Method</h2>{!runtime ? <button type="button" onClick={() => { setExpressDelivery((value) => !value); setPlaced(false); }}>Change</button> : null}</header>
          {runtime && shippingOptions.length ? <div className="glow-beauty-delivery-options" role="radiogroup" aria-label="Delivery method">{shippingOptions.map((option) => <button key={option.id} type="button" role="radio" aria-checked={selectedShippingId === option.id} className={selectedShippingId === option.id ? "is-selected" : ""} onClick={() => setSelectedShippingId(option.id)}><PiTruckLight aria-hidden="true" /><span><strong>{option.name}</strong><small>Store delivery option</small></span><b>{option.amount ? money(option.amount) : "FREE"}</b></button>)}</div> : runtime ? <p>{english ? "Save the delivery address to load the Store shipping option." : "احفظ عنوان التوصيل لإظهار خيار توصيل المتجر."}</p> : <article>
            <span><PiTruckLight aria-hidden="true" /></span>
            <div><strong>{expressDelivery ? "Express Delivery" : "Standard Delivery"}</strong><p>{expressDelivery ? "Arrives Sep 1–2" : "Arrives Sep 3–5"}</p></div>
            <b>{expressDelivery ? "$12.00" : "FREE"}</b>
            <i><IoCheckmark aria-hidden="true" /></i>
          </article>}
        </section>

        <section className="glow-beauty-checkout-section glow-beauty-payment" aria-labelledby="glow-beauty-payment-title">
          <header><h2 id="glow-beauty-payment-title">Payment Method</h2>{!runtime ? <button type="button" onClick={() => { setPaymentIndex((index) => index ? 0 : 1); setPlaced(false); }}>Add New</button> : null}</header>
          {runtime ? <div className="glow-beauty-payment-options" role="radiogroup" aria-label="Payment method">{cartContext?.capability.online_checkout.payment_methods.map((method) => <button type="button" role="radio" key={method} aria-checked={runtimePayment === method} className={runtimePayment === method ? "is-selected" : ""} onClick={() => setRuntimePayment(method)}>{method === "cod" ? <IoCashOutline aria-hidden="true" /> : <IoCardOutline aria-hidden="true" />}<span>{method === "cod" ? (english ? "Cash on delivery" : "الدفع عند الاستلام") : (english ? "Manual bank transfer" : "تحويل مصرفي يدوي")}</span><i>{runtimePayment === method ? <IoCheckmark aria-hidden="true" /> : null}</i></button>)}</div> : <article>
            <span>{payment.brand}</span>
            <div><strong>{payment.label}</strong><p>{payment.expires}</p></div>
            <i><IoCheckmark aria-hidden="true" /></i>
          </article>}
          {!runtime ? <label><input type="checkbox" checked={billingMatches} onChange={(event) => setBillingMatches(event.target.checked)} /><span><IoCheckmark aria-hidden="true" /></span>Billing address same as shipping</label> : null}
        </section>

        <section className="glow-beauty-checkout-section glow-beauty-review-order" aria-labelledby="glow-beauty-review-order-title">
          <header><h2 id="glow-beauty-review-order-title">Review Your Order</h2><button type="button" onClick={() => setAnnouncement("Three order items are shown")}>View Items</button></header>
          <article>
            <div className="glow-beauty-review-products">
              {displayItems.map((item) => item.image ? <img key={item.name} src={item.image} alt={item.name} /> : <div key={item.name} className="glow-beauty-image-placeholder" role="img" aria-label={item.name}>{item.name.slice(0, 1)}</div>)}
            </div>
            <div className="glow-beauty-review-meta"><strong>{displayItemCount} items</strong><p>{runtime ? (english ? "Delivery confirmed at checkout" : "يُؤكد التوصيل عند الدفع") : <>Estimated arrival<br />Sep 3–5</>}</p></div>
            {!runtime ? <div className="glow-beauty-review-promo"><PiTicketLight aria-hidden="true" /><strong>GLOW5 applied</strong><span>You saved $5.00</span></div> : null}
          </article>
        </section>

        <section className="glow-beauty-checkout-summary" aria-labelledby="glow-beauty-checkout-summary-title">
          <h2 id="glow-beauty-checkout-summary-title">Payment Summary</h2>
          <dl>
            <div><dt>Subtotal</dt><dd>{money(subtotal)}</dd></div>
            {!runtime ? <div><dt>Discount</dt><dd className="is-discount">−{money(discount)}</dd></div> : null}
            <div><dt>Delivery</dt><dd>{deliveryFee ? money(deliveryFee) : runtime && stage === "details" ? "—" : "FREE"}</dd></div>
            {!runtime ? <div><dt>Tax</dt><dd>{money(tax)}</dd></div> : null}
            <div className="is-total"><dt>Total</dt><dd>{money(total)}</dd></div>
          </dl>
        </section>

        <label className="glow-beauty-terms"><input type="checkbox" checked={termsAccepted} onChange={(event) => { setTermsAccepted(event.target.checked); setPlaced(false); }} /><span><IoCheckmark aria-hidden="true" /></span>I agree to the {profile ? <StorefrontLink to="/terms">Terms &amp; Conditions</StorefrontLink> : <a href="#terms" onClick={(event) => { event.preventDefault(); setAnnouncement("Terms and Conditions opened for review"); }}>Terms &amp; Conditions</a>}</label>
        <p className="glow-beauty-payment-secure"><PiLockKeyLight aria-hidden="true" /> Your payment information is secure</p>
      </Content>

      <aside className="glow-beauty-checkout-purchase" aria-label="Place order summary">
        <div><span>Total</span><output>{money(total)}</output></div>
        <button type="button" disabled={!termsAccepted || Boolean(runtime && (cartContext?.pending || !cartContext?.cart?.items.length))} data-placed={placed ? "true" : "false"} onClick={() => void placeOrder()}><PiShoppingBagOpenLight aria-hidden="true" />{runtime ? stage === "details" ? "Continue to delivery" : stage === "shipping" ? "Review order" : "Place Order" : placed ? "Order Placed" : "Place Order"}</button>
      </aside>

      <span className="glow-beauty-visually-hidden" aria-live="polite">{announcement}</span>
    </div>
  );
}

export default GlowBeautyCheckoutPage;
