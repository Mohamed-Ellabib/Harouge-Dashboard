import { FormEvent, useEffect, useState } from "react";
import {
  IoAddOutline,
  IoArrowBackOutline,
  IoBagHandleOutline,
  IoLockClosedOutline,
  IoRemoveOutline,
  IoTicketOutline,
  IoTrashOutline,
} from "react-icons/io5";

import { useOptionalCart } from "../../commerce/CartContext";
import { formatStorefrontMoney } from "../../lib/money";
import { navigate } from "../../lib/navigation";
import type { StorefrontProfileDto } from "../../types";
import { standardRoute } from "./StandardMobileNavigation";
import "./standard-cart.css";

const cartItems = [
  {
    id: "pastel-wrap-dress",
    name: "Pastel Wrap Dress",
    details: "Size: M  •  Coral",
    price: 129,
    image: "/assets/standard/product-pastel-wrap-dress.webp",
  },
  {
    id: "heritage-leather-bag",
    name: "Heritage Leather Bag",
    details: "Color: Espresso",
    price: 148,
    image: "/assets/standard/cart-heritage-leather-bag.webp",
  },
  {
    id: "classic-beige-heels",
    name: "Classic Beige Heels",
    details: "Size: 38  •  Beige",
    price: 96,
    image: "/assets/standard/cart-classic-beige-heels.webp",
  },
] as const;

type CartItemId = (typeof cartItems)[number]["id"];
type CartQuantities = Record<CartItemId, number>;

const initialQuantities: CartQuantities = {
  "pastel-wrap-dress": 1,
  "heritage-leather-bag": 1,
  "classic-beige-heels": 1,
};

const formatMoney = (amount: number) => `$${amount.toFixed(2)}`;

export default function StandardCartPage({ profile }: { profile?: StorefrontProfileDto } = {}) {
  const cartContext = useOptionalCart();
  const [quantities, setQuantities] = useState<CartQuantities>(initialQuantities);
  const [promoCode, setPromoCode] = useState("");
  const [discountApplied, setDiscountApplied] = useState(true);
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    const previousTitle = document.title;
    document.title = profile ? `Cart | ${profile.name}` : "My Cart | Standard Storefront Preview";
    document.documentElement.classList.add("standard-preview-document");
    document.body.classList.add("standard-preview-document");
    return () => {
      document.title = previousTitle;
      document.documentElement.classList.remove("standard-preview-document");
      document.body.classList.remove("standard-preview-document");
    };
  }, [profile]);

  const runtime = Boolean(profile && cartContext);
  const visibleItems = runtime
    ? (cartContext?.cart?.items ?? []).map((item) => ({
        id: item.id,
        name: item.title,
        details: "Selected options",
        price: item.unit_price,
        image: item.thumbnail_url ?? "/assets/standard/arrival-cream-set.webp",
        quantity: item.quantity,
      }))
    : cartItems.filter((item) => quantities[item.id] > 0).map((item) => ({ ...item, quantity: quantities[item.id] }));
  const itemCount = visibleItems.reduce((total, item) => total + item.quantity, 0);
  const subtotal = visibleItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0,
  );
  const discount = runtime ? 0 : discountApplied && subtotal > 0 ? Math.min(20, subtotal) : 0;
  const total = runtime ? cartContext?.cart?.total ?? subtotal : subtotal - discount;
  const currency = cartContext?.cart?.currency_code ?? "usd";
  const money = (amount: number) => profile
    ? formatStorefrontMoney(amount, currency, profile.locale)
    : formatMoney(amount);

  const updateQuantity = (id: string, nextQuantity: number) => {
    const quantity = Math.min(9, Math.max(1, nextQuantity));
    if (runtime && cartContext) {
      void cartContext.updateQuantity(id, quantity);
      return;
    }
    setQuantities((current) => ({ ...current, [id]: quantity }));
    setAnnouncement(`${cartItems.find((item) => item.id === id)?.name} quantity updated to ${quantity}`);
  };

  const removeItem = (id: string) => {
    if (runtime && cartContext) {
      void cartContext.removeItem(id);
      return;
    }
    const item = cartItems.find((candidate) => candidate.id === id);
    setQuantities((current) => ({ ...current, [id]: 0 }));
    setAnnouncement(`${item?.name ?? "Item"} removed from cart`);
  };

  const clearCart = () => {
    if (runtime && cartContext?.cart) {
      void Promise.all(cartContext.cart.items.map((item) => cartContext.removeItem(item.id)));
      return;
    }
    setQuantities({
      "pastel-wrap-dress": 0,
      "heritage-leather-bag": 0,
      "classic-beige-heels": 0,
    });
    setAnnouncement("Cart cleared");
  };

  const applyPromoCode = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const valid = promoCode.trim().toUpperCase() === "STYLE20";
    setDiscountApplied(valid);
    setAnnouncement(valid ? "STYLE20 promo code applied" : "Promo code is not valid");
  };

  const proceedToCheckout = () => {
    navigate(standardRoute("/checkout"));
  };

  return (
    <div className="standard-cart" dir="ltr" lang="en">
      <header className="standard-cart__header">
        <button
          className="standard-cart__back"
          type="button"
          aria-label="Back to the Standard storefront"
          onClick={() => navigate(standardRoute("/"))}
        >
          <IoArrowBackOutline aria-hidden="true" />
        </button>
        <div>
          <h1>My Cart</h1>
          <p>{itemCount} {itemCount === 1 ? "item" : "items"}</p>
        </div>
        <button
          className="standard-cart__clear"
          type="button"
          disabled={itemCount === 0}
          onClick={clearCart}
        >
          Clear
        </button>
      </header>

      {visibleItems.length > 0 ? (
        <section className="standard-cart__items" aria-label="Cart items">
          {visibleItems.map((item) => {
            const quantity = item.quantity;
            return (
              <article className="standard-cart-item" key={item.id}>
                <img src={item.image} alt={item.name} />
                <div className="standard-cart-item__details">
                  <h2>{item.name}</h2>
                  <p>{item.details}</p>
                  <strong>{money(item.price)}</strong>
                  <div className="standard-cart-stepper" aria-label={`${item.name} quantity`}>
                    <button
                      type="button"
                      aria-label={`Decrease ${item.name} quantity`}
                      disabled={quantity === 1}
                      onClick={() => updateQuantity(item.id, quantity - 1)}
                    >
                      <IoRemoveOutline aria-hidden="true" />
                    </button>
                    <output aria-label={`${item.name} quantity`}>{quantity}</output>
                    <button
                      type="button"
                      aria-label={`Increase ${item.name} quantity`}
                      disabled={quantity === 9}
                      onClick={() => updateQuantity(item.id, quantity + 1)}
                    >
                      <IoAddOutline aria-hidden="true" />
                    </button>
                  </div>
                </div>
                <button
                  className="standard-cart-item__remove"
                  type="button"
                  aria-label={`Remove ${item.name}`}
                  onClick={() => removeItem(item.id)}
                >
                  <IoTrashOutline aria-hidden="true" />
                </button>
              </article>
            );
          })}
        </section>
      ) : (
        <section className="standard-cart-empty" aria-labelledby="standard-cart-empty-title">
          <IoBagHandleOutline aria-hidden="true" />
          <h2 id="standard-cart-empty-title">Your cart is empty</h2>
          <p>Return to the Standard storefront to add something beautiful.</p>
          <button type="button" onClick={() => navigate(standardRoute("/"))}>Continue shopping</button>
        </section>
      )}

      {!runtime ? <form className="standard-cart-promo" onSubmit={applyPromoCode}>
        <label htmlFor="standard-cart-promo-code">Promo code</label>
        <div>
          <IoTicketOutline aria-hidden="true" />
          <input
            id="standard-cart-promo-code"
            type="text"
            value={promoCode}
            placeholder="Enter promo code"
            autoComplete="off"
            onChange={(event) => setPromoCode(event.currentTarget.value)}
          />
          <button type="submit">Apply</button>
        </div>
      </form> : null}

      <section className="standard-cart-summary" aria-labelledby="standard-cart-summary-title">
        <h2 id="standard-cart-summary-title">Order Summary</h2>
        <dl>
          <div><dt>Subtotal</dt><dd>{money(subtotal)}</dd></div>
          <div><dt>Shipping</dt><dd>{cartContext?.cart?.shipping_total ? money(cartContext.cart.shipping_total) : "Free"}</dd></div>
          <div><dt>Discount</dt><dd className="standard-cart-summary__discount">−{money(discount)}</dd></div>
          <div className="standard-cart-summary__total"><dt>Total</dt><dd>{money(total)}</dd></div>
        </dl>
      </section>

      <p className="standard-cart__secure"><IoLockClosedOutline aria-hidden="true" /> Secure checkout</p>

      <aside className="standard-cart-checkout" aria-label="Checkout summary">
        <button
          type="button"
          disabled={itemCount === 0}
          onClick={proceedToCheckout}
        >
          <IoBagHandleOutline aria-hidden="true" />
          <span>Proceed to Checkout</span>
          <strong>{money(total)}</strong>
        </button>
      </aside>

      <span className="sr-only" aria-live="polite">{announcement}</span>
    </div>
  );
}
