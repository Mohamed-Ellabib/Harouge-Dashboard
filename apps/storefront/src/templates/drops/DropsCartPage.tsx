import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  IoAdd,
  IoArrowBack,
  IoCheckmarkCircle,
  IoChevronDown,
  IoEllipsisVertical,
  IoRemove,
  IoTrashOutline,
} from "react-icons/io5";

import "./drops-cart.css";
import { useOptionalCart } from "../../commerce/CartContext";
import { navigate } from "../../lib/navigation";
import { formatStorefrontMoney } from "../../lib/money";
import type { StorefrontProfileDto } from "../../types";

const asset = (name: string) => `/assets/drops/${name}`;

type DropsCartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
};

const initialItems: DropsCartItem[] = [
  {
    id: "jordan-lost-found",
    name: "Jordan 1 Retro High OG Lost and Found",
    price: 1050,
    quantity: 1,
    image: asset("order-thumb-red-high.png"),
  },
  {
    id: "adidas-humanrace-trail",
    name: "Adidas Pharrell N.E.R.D. NMD HumanRace Trail",
    price: 425,
    quantity: 1,
    image: asset("order-thumb-color-runner.png"),
  },
  {
    id: "new-balance-kith",
    name: "New Balance 997S Kith United Arrows & Sons",
    price: 495,
    quantity: 1,
    image: asset("order-thumb-grey-runner.png"),
  },
];

const money = (value: number) => `$${value.toLocaleString("en-US", { minimumFractionDigits: value % 1 ? 2 : 0 })}`;

export function DropsCartPage({ profile }: { profile?: StorefrontProfileDto } = {}) {
  const context = useOptionalCart();
  const [mockItems, setItems] = useState(initialItems);
  const items = profile ? (context?.cart?.items ?? []).map(item => ({ id: item.id, name: item.title, price: item.unit_price, quantity: item.quantity, image: item.thumbnail_url ?? "" })) : mockItems;
  const money = (value: number) => profile ? formatStorefrontMoney(value, context?.cart?.currency_code ?? "lyd", profile.locale) : `${value.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
  const route = (path: string) => navigate(profile ? path : `${path}?preview=1&template=drops`);
  const clearCart = async () => { if (profile && context) { for (const item of items) await context.removeItem(item.id); } else setItems([]); };
  const [coupon, setCoupon] = useState(profile ? "" : "DROPSYEAREND");
  const [couponApplied, setCouponApplied] = useState(!profile);
  const [menuOpen, setMenuOpen] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const previousTitle = document.title;
    const previousLang = document.documentElement.lang;
    const previousDirection = document.documentElement.dir;
    document.title = "Cart — DROPS Preview";
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

  const itemCount = useMemo(() => items.reduce((total, item) => total + item.quantity, 0), [items]);
  const subtotal = useMemo(() => items.reduce((total, item) => total + item.price * item.quantity, 0), [items]);
  const delivery = profile ? context?.cart?.shipping_total ?? 0 : items.length ? 15 : 0;
  const discount = !profile && couponApplied && items.length ? 200 : 0;
  const total = profile ? context?.cart?.total ?? 0 : Math.max(0, subtotal + delivery - discount);

  const updateQuantity = (id: string, amount: number) => {
    if (profile) { const item = items.find(i => i.id === id); if (item && context && !context.pending) void context.updateQuantity(id, item.quantity + amount).catch(() => setMessage("Unable to update quantity.")); return; }
    setItems((current) => current.map((item) => item.id === id
      ? { ...item, quantity: Math.max(1, Math.min(9, item.quantity + amount)) }
      : item));
  };

  const removeItem = (id: string) => {
    if (profile) { if (context && !context.pending) void context.removeItem(id).catch(() => setMessage("Unable to remove item.")); return; }
    setItems((current) => current.filter((item) => item.id !== id));
    setMessage("Item removed from your cart.");
  };

  const applyCoupon = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (profile) { setMessage("Coupon codes are not enabled for this store."); return; }
    const available = coupon.trim().toUpperCase() === "DROPSYEAREND";
    setCouponApplied(available);
    setMessage(available ? "Coupon applied. You saved $200." : "That coupon is not available.");
  };

  return (
    <div className="drops-cart-page" dir="ltr" lang="en">
      <header className="drops-cart-header">
        <button type="button" aria-label="Back to DROPS" onClick={() => route("/")}>
          <IoArrowBack aria-hidden="true" />
        </button>
        <h1>Cart</h1>
        <button type="button" aria-label={menuOpen ? "Close cart menu" : "Open cart menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
          <IoEllipsisVertical aria-hidden="true" />
        </button>
        {menuOpen ? (
          <div className="drops-cart-menu" role="menu">
            <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); void clearCart().catch(() => setMessage("Unable to clear cart.")); }}>Clear cart</button>
            <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); setMessage("Your cart is saved for later."); }}>Save for later</button>
          </div>
        ) : null}
      </header>

      <main>
        <button className="drops-cart-address" type="button" onClick={() => profile ? route("/checkout") : setMessage("Delivery address selected.")}>
          <img src={asset("rex-avatar.png")} alt="Rex Hypebeast" />
          <span>Ship to <strong>{profile ? "Your delivery address" : "Rex Hypebeast"}</strong></span>
          <b>{profile ? "Choose at checkout" : "Tegalsari, Surabaya"}</b>
          <IoChevronDown aria-hidden="true" />
        </button>

        <section className="drops-cart-items" aria-labelledby="drops-cart-items-title">
          <header>
            <h2 id="drops-cart-items-title">Your items</h2>
            <span>{itemCount} {itemCount === 1 ? "item" : "items"}</span>
          </header>

          <div className="drops-cart-list">
            {items.map((item) => (
              <article className="drops-cart-item" key={item.id}>
                <div className="drops-cart-item__image">
                  <img src={item.image} alt={item.name} />
                </div>
                <div className="drops-cart-item__body">
                  <h3>{item.name}</h3>
                  <strong>{money(item.price)}</strong>
                  <div className="drops-cart-stepper" aria-label={`${item.name} quantity`}>
                    <button type="button" aria-label={`Decrease ${item.name} quantity`} disabled={item.quantity === 1 || Boolean(context?.pending)} onClick={() => updateQuantity(item.id, -1)}><IoRemove aria-hidden="true" /></button>
                    <output aria-label={`${item.name} quantity`}>{item.quantity}</output>
                    <button type="button" aria-label={`Increase ${item.name} quantity`} disabled={item.quantity >= 9 || Boolean(context?.pending)} onClick={() => updateQuantity(item.id, 1)}><IoAdd aria-hidden="true" /></button>
                  </div>
                </div>
                <button className="drops-cart-item__remove" type="button" aria-label={`Remove ${item.name}`} onClick={() => removeItem(item.id)}><IoTrashOutline aria-hidden="true" /></button>
              </article>
            ))}
          </div>

          {!items.length ? (
            <div className="drops-cart-empty" role="status">
              <h3>Your cart is empty</h3>
              <p>Add a pair from the DROPS collection.</p>
              <button type="button" onClick={() => route("/")}>Continue shopping</button>
            </div>
          ) : null}
        </section>

        <form className="drops-cart-coupon" onSubmit={applyCoupon}>
          <label htmlFor="drops-cart-coupon">Have a coupon code?</label>
          <div className={couponApplied ? "is-available" : ""}>
            <input id="drops-cart-coupon" value={coupon} onChange={(event) => { setCoupon(event.target.value); setCouponApplied(false); }} />
            <button type="submit">{couponApplied ? "Available" : "Apply"}</button>
            {couponApplied ? <IoCheckmarkCircle aria-hidden="true" /> : null}
          </div>
        </form>

        <section className="drops-cart-summary" aria-labelledby="drops-cart-summary-title">
          <h2 className="drops-visually-hidden" id="drops-cart-summary-title">Cart summary</h2>
          <dl>
            <div><dt>Sub Total</dt><dd>{money(subtotal)}</dd></div>
            <div><dt>Delivery Fee</dt><dd>{money(delivery)}</dd></div>
            <div><dt>Discount</dt><dd className="is-discount">- {money(discount)}</dd></div>
            <div className="is-total"><dt>Total</dt><dd>{money(total)}</dd></div>
          </dl>
          <p>{profile && !context?.cart?.shipping_method_selected ? "Delivery is calculated at checkout" : "Taxes calculated at checkout"}</p>
        </section>

        <p className="drops-cart-live" aria-live="polite">{context?.error || message}</p>
        <button
          className="drops-cart-checkout"
          type="button"
          disabled={!items.length}
          onClick={() => route(profile ? "/checkout" : "/order-confirmation")}
        >
          Checkout
        </button>
      </main>
    </div>
  );
}

export default DropsCartPage;
