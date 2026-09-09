import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  IoAddOutline,
  IoArrowBack,
  IoCheckmark,
  IoChevronForward,
  IoHeart,
  IoHeartOutline,
  IoRemoveOutline,
  IoShieldCheckmarkOutline,
  IoTrashOutline,
} from "react-icons/io5";
import { PiTruckLight } from "react-icons/pi";

import { useOptionalCart } from "../../commerce/CartContext";
import { formatStorefrontMoney } from "../../lib/money";
import { navigate, StorefrontLink } from "../../lib/navigation";
import type { StorefrontProfileDto } from "../../types";
import { GlowBeautyStatusBar } from "./GlowBeautyChrome";
import "./glow-beauty-home.css";
import "./glow-beauty-cart.css";

const catalogHref = "/products?preview=1&template=glow-beauty";
const PROMO_DISCOUNT = 5;

type CartItem = {
  id: string;
  name: string;
  variant: string;
  price: number;
  quantity: number;
  image: string | null;
  favorite: boolean;
};

const initialItems: CartItem[] = [
  {
    id: "radiance-serum",
    name: "Radiance Serum",
    variant: "30 ml",
    price: 24.99,
    quantity: 1,
    image: "/assets/glow-beauty/product-radiance-serum-detail.png",
    favorite: true,
  },
  {
    id: "matte-lipstick",
    name: "Matte Lipstick",
    variant: "Classic Red",
    price: 14.99,
    quantity: 1,
    image: "/assets/glow-beauty/product-matte-lipstick.png",
    favorite: true,
  },
  {
    id: "hydra-moisturizer",
    name: "Hydra Moisturizer",
    variant: "50 ml",
    price: 19.99,
    quantity: 1,
    image: "/assets/glow-beauty/product-hydra-moisturizer.png",
    favorite: true,
  },
];

export function GlowBeautyCartPage({
  profile,
}: {
  profile?: StorefrontProfileDto;
} = {}) {
  const locale = profile?.locale ?? "en-LY";
  const english = locale === "en-LY";
  const cartContext = useOptionalCart();
  const runtime = Boolean(profile && cartContext);
  const [items, setItems] = useState<CartItem[]>(initialItems);
  const [promoCode, setPromoCode] = useState("");
  const [discount, setDiscount] = useState(PROMO_DISCOUNT);
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    const previousTitle = document.title;
    const previousLang = document.documentElement.lang;
    const previousDirection = document.documentElement.dir;
    document.title = profile ? `${english ? "Cart" : "سلة التسوق"} | ${profile.name}` : "My Bag — Glow Beauty Preview";
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
  }, [profile, english]);

  const visibleItems = runtime
    ? (cartContext?.cart?.items ?? []).map((item) => ({
        id: item.id,
        name: item.title,
        variant: english ? "Selected options" : "الخيارات المحددة",
        price: item.unit_price,
        quantity: item.quantity,
        image: item.thumbnail_url,
        favorite: false,
      }))
    : items;
  const itemCount = useMemo(() => visibleItems.reduce((total, item) => total + item.quantity, 0), [visibleItems]);
  const subtotal = useMemo(() => visibleItems.reduce((total, item) => total + item.price * item.quantity, 0), [visibleItems]);
  const appliedDiscount = runtime ? 0 : discount;
  const total = runtime ? cartContext?.cart?.total ?? subtotal : Math.max(0, subtotal - appliedDiscount);
  const currency = cartContext?.cart?.currency_code ?? "lyd";


  const money = (amount: number) => profile
    ? formatStorefrontMoney(amount, currency, locale)
    : `$${amount.toFixed(2)}`;
  const Content = profile ? "div" : "main";

  const updateQuantity = (id: string, nextQuantity: number) => {
    if (runtime && cartContext) {
      void cartContext.updateQuantity(id, Math.min(9, Math.max(1, nextQuantity)));
      return;
    }
    setItems((current) => current.map((item) => item.id === id
      ? { ...item, quantity: Math.min(9, Math.max(1, nextQuantity)) }
      : item));
  };

  const removeItem = (id: string) => {
    if (runtime && cartContext) {
      void cartContext.removeItem(id);
      return;
    }
    setItems((current) => current.filter((item) => item.id !== id));
    setAnnouncement(english ? "Item removed from your bag" : "تمت إزالة المنتج من السلة");
  };

  const toggleFavorite = (id: string) => {
    setItems((current) => current.map((item) => item.id === id ? { ...item, favorite: !item.favorite } : item));
  };

  const applyPromo = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedCode = promoCode.trim().toUpperCase();
    if (!normalizedCode || normalizedCode === "GLOW5") {
      setDiscount(PROMO_DISCOUNT);
      setAnnouncement("Promo code applied. You saved five dollars.");
      return;
    }
    setAnnouncement("That promo code is not available in this preview.");
  };

  return (
    <div className="glow-beauty-page glow-beauty-cart-page" dir={locale === "ar-LY" ? "rtl" : "ltr"} lang={locale === "ar-LY" ? "ar" : "en"}>
      <GlowBeautyStatusBar preview={!profile} />

      <header className="glow-beauty-cart-header">
        <StorefrontLink to={profile ? "/products" : catalogHref} ariaLabel={english ? "Back to all products" : "العودة إلى جميع المنتجات"}><IoArrowBack aria-hidden="true" /></StorefrontLink>
        <div>
          <h1>{english ? "My Bag" : "سلة التسوق"}</h1>
          <p>{english ? `${itemCount} ${itemCount === 1 ? "item" : "items"}` : `عدد المنتجات: ${itemCount}`}</p>
        </div>
        <button type="button" aria-label={english ? "Remove all items" : "إزالة جميع المنتجات"} disabled={!visibleItems.length || Boolean(cartContext?.pending)} onClick={() => {
          if (runtime && cartContext) {
            void (async () => {
              for (const item of cartContext.cart?.items ?? []) await cartContext.removeItem(item.id);
            })();
          } else {
            setItems([]);
            setAnnouncement(english ? "All items removed from your bag" : "تمت إزالة جميع المنتجات من السلة");
          }
        }}><IoTrashOutline aria-hidden="true" /></button>
      </header>

      <Content>
        {!runtime ? <section className="glow-beauty-delivery-progress" aria-label="Free delivery unlocked">
          <span><PiTruckLight aria-hidden="true" /></span>
          <div><p>You’ve unlocked free delivery</p><i /></div>
        </section> : null}

        <section className="glow-beauty-cart-items" aria-labelledby="glow-beauty-cart-items-title">
          <h2 id="glow-beauty-cart-items-title">{english ? "Your Items" : "منتجاتك"}</h2>
          {visibleItems.map((item) => (
            <article key={item.id} className="glow-beauty-cart-item">
              <StorefrontLink className="glow-beauty-cart-item__image" to={runtime ? "/products" : item.id === "radiance-serum" ? "/products/radiance-serum?preview=1&template=glow-beauty" : catalogHref} ariaLabel={english ? `View ${item.name}` : `عرض ${item.name}`}>
                {item.image ? <img src={item.image} alt={item.name} /> : <div className="glow-beauty-image-placeholder" role="img" aria-label={item.name}>{item.name.slice(0, 1)}</div>}
              </StorefrontLink>
              <div className="glow-beauty-cart-item__copy">
                <h3>{item.name}</h3>
                <p>{item.variant}</p>
                <strong>{money(item.price)}</strong>
                <div className="glow-beauty-cart-stepper" aria-label={english ? `${item.name} quantity` : `كمية ${item.name}`}>
                  <button type="button" aria-label={english ? `Decrease ${item.name} quantity` : `تقليل كمية ${item.name}`} disabled={item.quantity === 1} onClick={() => updateQuantity(item.id, item.quantity - 1)}><IoRemoveOutline aria-hidden="true" /></button>
                  <output aria-label={english ? `${item.name} quantity` : `كمية ${item.name}`}>{item.quantity}</output>
                  <button type="button" aria-label={english ? `Increase ${item.name} quantity` : `زيادة كمية ${item.name}`} disabled={item.quantity === 9} onClick={() => updateQuantity(item.id, item.quantity + 1)}><IoAddOutline aria-hidden="true" /></button>
                </div>
              </div>
              <div className="glow-beauty-cart-item__actions">
                {!runtime ? <button type="button" aria-label={item.favorite ? `Remove ${item.name} from wishlist` : `Add ${item.name} to wishlist`} aria-pressed={item.favorite} onClick={() => toggleFavorite(item.id)}>{item.favorite ? <IoHeart aria-hidden="true" /> : <IoHeartOutline aria-hidden="true" />}</button> : null}
                <button type="button" aria-label={english ? `Remove ${item.name} from bag` : `إزالة ${item.name} من السلة`} onClick={() => removeItem(item.id)}><IoTrashOutline aria-hidden="true" /></button>
              </div>
            </article>
          ))}
          {!visibleItems.length ? (
            <div className="glow-beauty-cart-empty">
              <span><IoHeartOutline aria-hidden="true" /></span>
              <h3>{english ? "Your bag is empty" : "سلة التسوق فارغة"}</h3>
              <p>{english ? "Discover something beautiful to add." : "اكتشفي منتجات جميلة وأضيفيها إلى سلتك."}</p>
              <StorefrontLink to={profile ? "/products" : catalogHref}>{english ? "Browse products" : "تصفّحي المنتجات"}</StorefrontLink>
            </div>
          ) : null}
        </section>

        <section className="glow-beauty-cart-delivery" aria-labelledby="glow-beauty-cart-delivery-title">
          <h2 id="glow-beauty-cart-delivery-title">{english ? "Delivery" : "التوصيل"}</h2>
          <button type="button" onClick={() => runtime ? navigate("/checkout") : setAnnouncement("Standard Delivery selected")}> 
            <span className="glow-beauty-cart-delivery__check"><IoCheckmark aria-hidden="true" /></span>
            <span className="glow-beauty-cart-delivery__truck"><PiTruckLight aria-hidden="true" /></span>
            <span><strong>{runtime ? (english ? "Choose delivery at checkout" : "اختر التوصيل عند الدفع") : "Standard Delivery"}</strong><small>{runtime ? (english ? "Your Store option will be shown next" : "سيظهر خيار المتجر في الخطوة التالية") : "2–4 business days"}</small></span>
            <b>{runtime && cartContext?.cart?.shipping_total ? money(cartContext.cart.shipping_total) : runtime ? "—" : "FREE"}</b>
            <IoChevronForward aria-hidden="true" />
          </button>
        </section>

        {!runtime ? <form className="glow-beauty-promo" onSubmit={applyPromo}>
          <label htmlFor="glow-beauty-promo-code">Promo Code</label>
          <div>
            <input id="glow-beauty-promo-code" type="text" value={promoCode} placeholder="Enter promo code" onChange={(event) => setPromoCode(event.target.value)} />
            <button type="submit">Apply</button>
          </div>
        </form> : null}

        <section className="glow-beauty-cart-summary" aria-labelledby="glow-beauty-cart-summary-title">
          <h2 id="glow-beauty-cart-summary-title">{english ? "Order Summary" : "ملخص الطلب"}</h2>
          <dl>
            <div><dt>{english ? "Subtotal" : "المجموع الفرعي"}</dt><dd>{money(subtotal)}</dd></div>
            {!runtime ? <div><dt>Discount</dt><dd className="is-discount">−{money(appliedDiscount)}</dd></div> : null}
            <div><dt>{english ? "Delivery" : "التوصيل"}</dt><dd>{cartContext?.cart?.shipping_total ? money(cartContext.cart.shipping_total) : "—"}</dd></div>
            <div className="is-total"><dt>{english ? "Total" : "الإجمالي"}</dt><dd>{money(total)}</dd></div>
          </dl>
        </section>

        <p className="glow-beauty-cart-secure"><IoShieldCheckmarkOutline aria-hidden="true" /> {english ? "Secure checkout" : "إتمام الطلب بأمان"} <span>•</span> {english ? "Taxes calculated at checkout" : "تُحسب الضرائب عند إتمام الطلب"}</p>
      </Content>

      <aside className="glow-beauty-cart-purchase" aria-label={english ? "Checkout summary" : "ملخص إتمام الطلب"}>
        <div><span>{english ? "Total" : "الإجمالي"}</span><output>{money(total)}</output></div>
        {visibleItems.length ? <StorefrontLink to={profile ? "/checkout" : "/checkout?preview=1&template=glow-beauty"} ariaLabel={english ? "Proceed to checkout" : "المتابعة لإتمام الطلب"}>{english ? "Proceed to Checkout" : "إتمام الطلب"}<IoChevronForward aria-hidden="true" /></StorefrontLink> : <a href={profile ? "/checkout" : "/checkout?preview=1&template=glow-beauty"} aria-disabled="true" onClick={(event) => { event.preventDefault(); setAnnouncement(english ? "Your bag is empty" : "سلة التسوق فارغة"); }}>{english ? "Proceed to Checkout" : "إتمام الطلب"}<IoChevronForward aria-hidden="true" /></a>}
      </aside>

      <span className="glow-beauty-visually-hidden" aria-live="polite">{announcement}</span>
    </div>
  );
}

export default GlowBeautyCartPage;
