import { useEffect, useState, type CSSProperties } from "react";

import { STOREFRONT_MAX_CART_QUANTITY } from "../../api/storefront-api";
import { useCart } from "../../commerce/CartContext";
import {
  CartIcon,
  ChevronLeftIcon,
  ShieldCheckIcon,
  TrashIcon,
  WatchIcon,
} from "../../components/Icons";
import { StorefrontLink } from "../../lib/navigation";
import type { StorefrontProfileDto } from "../../types";
import { LuxeFullBottomNavigation } from "./LuxeFullBottomNavigation";

import "./reference-source/src/pages/storefront/CartPage.css";

const money = (amount: number, currency: string): string =>
  `${currency.toUpperCase()} ${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(amount)}`;

export function LuxeFullCartPage({ profile }: { profile: StorefrontProfileDto }) {
  const {
    capability,
    cart,
    error,
    pending,
    removeItem,
    restoring,
    updateQuantity,
  } = useCart();
  const [couponOpen, setCouponOpen] = useState(false);
  const itemCount = cart?.items.reduce((total, item) => total + item.quantity, 0) ?? 0;
  const hasItems = Boolean(cart?.items.length);

  useEffect(() => {
    document.title = `سلة التسوق | ${profile.name}`;
  }, [profile.name]);

  const pageClassName = [
    "cart-page",
    hasItems ? "cart-page--has-items" : "",
    couponOpen ? "cart-page--coupon-open" : "",
  ].filter(Boolean).join(" ");

  return (
    <section className={pageClassName}>
      <div className="cart-page__shell">
        <header className="cart-page__header" aria-label="شريط سلة التسوق">
          <StorefrontLink
            className="cart-page__icon-button cart-page__back"
            to="/watches"
            ariaLabel="الرجوع"
          >
            <ChevronLeftIcon />
          </StorefrontLink>
          <h1>{restoring ? "سلة التسوق" : `سلة التسوق (${itemCount})`}</h1>
          <StorefrontLink
            className="cart-page__icon-button cart-page__bag"
            to="/cart"
            ariaLabel="سلة التسوق"
          >
            <CartIcon />
            <span>{itemCount}</span>
          </StorefrontLink>
        </header>

        <section className="cart-page__items" aria-label="منتجات سلة التسوق" aria-busy={restoring || pending}>
          {restoring ? (
            Array.from({ length: 2 }, (_, index) => (
              <article className="cart-page__item cart-page__item--skeleton" key={index} aria-hidden="true">
                <span className="cart-page__sk cart-page__sk--actions" />
                <span className="cart-page__sk cart-page__sk--copy" />
                <span className="cart-page__sk cart-page__sk--image" />
              </article>
            ))
          ) : capability.online_checkout.status !== "available" ? (
            <div className="cart-page__empty-state">
              <section className="cart-page__empty-hero">
                <h2>الشراء غير متاح الآن</h2>
                <p>يمكنك متابعة تصفح المنتجات والعودة لاحقاً.</p>
                <div className="cart-page__empty-actions">
                  <StorefrontLink className="cart-page__empty-primary" to="/watches">متابعة التصفح</StorefrontLink>
                </div>
              </section>
            </div>
          ) : !hasItems ? (
            <div className="cart-page__empty-state">
              <section className="cart-page__empty-hero" aria-labelledby="cart-empty-title">
                <img
                  className="cart-page__empty-illustration"
                  src="/customer-assets/empty-cart-bag-watch-111-transparent.webp"
                  alt=""
                  aria-hidden="true"
                />
                <h2 id="cart-empty-title">سلة التسوق فارغة</h2>
                <p>لم تقم بإضافة أي منتجات إلى السلة بعد. اكتشف مجموعتنا الفاخرة وابدأ التسوق الآن.</p>
                <div className="cart-page__empty-actions">
                  <StorefrontLink className="cart-page__empty-primary" to="/watches">ابدأ التسوق</StorefrontLink>
                  <StorefrontLink className="cart-page__empty-secondary" to="/watches">
                    <span>تصفح الساعات</span>
                    <WatchIcon />
                  </StorefrontLink>
                </div>
              </section>
            </div>
          ) : (
            cart!.items.map((item, index) => (
              <article className="cart-page__item" key={item.id} style={{ "--cart-item-delay": `${index * 70}ms` } as CSSProperties}>
                <div className="cart-page__item-actions">
                  <button
                    type="button"
                    disabled={pending}
                    aria-label={`حذف ${item.title}`}
                    onClick={() => void removeItem(item.id).catch(() => undefined)}
                  >
                    <TrashIcon />
                  </button>
                </div>
                <div className="cart-page__item-copy">
                  <h2>{item.title}</h2>
                  <p>{item.title}</p>
                  <div className="cart-page__purchase-stack">
                    <strong>{money(item.unit_price, cart!.currency_code)}</strong>
                    <div className="cart-page__quantity" aria-label={`كمية ${item.title}`}>
                      <button
                        type="button"
                        disabled={pending || item.quantity <= 1}
                        aria-label="تقليل الكمية"
                        onClick={() => void updateQuantity(item.id, item.quantity - 1).catch(() => undefined)}
                      >
                        −
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        type="button"
                        disabled={pending || item.quantity >= STOREFRONT_MAX_CART_QUANTITY}
                        aria-label="زيادة الكمية"
                        onClick={() => void updateQuantity(item.id, item.quantity + 1).catch(() => undefined)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
                <div className="cart-page__item-image">
                  {item.thumbnail_url ? <img src={item.thumbnail_url} alt={item.title} /> : <CartIcon />}
                </div>
              </article>
            ))
          )}
        </section>

        {hasItems ? (
          <div className="cart-page__checkout-dock" aria-label="ملخص وإتمام الطلب">
            <section className={couponOpen ? "cart-page__promo cart-page__promo--open" : "cart-page__promo"} aria-label="كوبون الخصم">
              <button
                className="cart-page__promo-toggle"
                type="button"
                aria-expanded={couponOpen}
                onClick={() => setCouponOpen((current) => !current)}
              >
                <span>هل لديك كوبون خصم؟</span>
                <ChevronLeftIcon />
              </button>
              {couponOpen ? (
                <div className="cart-page__coupon">
                  <p className="cart-page__coupon-note">خدمة الكوبونات غير متصلة بنظام التسعير حالياً.</p>
                </div>
              ) : null}
            </section>
            <section className="cart-page__summary" aria-labelledby="cart-summary-title">
              <div className="cart-page__summary-copy">
                <h2 id="cart-summary-title">ملخص الطلب</h2>
                <div className="cart-page__summary-row">
                  <span>إجمالي المنتجات ({itemCount})</span>
                  <b>{money(cart!.item_subtotal, cart!.currency_code)}</b>
                </div>
                <div className="cart-page__summary-row">
                  <span>الشحن</span>
                  <b>{cart!.shipping_total > 0 ? money(cart!.shipping_total, cart!.currency_code) : "يحدد لاحقاً"}</b>
                </div>
              </div>
              <div className="cart-page__summary-total">
                <span>الإجمالي الكلي</span>
                <strong>{money(cart!.total, cart!.currency_code)}</strong>
              </div>
            </section>
            <StorefrontLink className="cart-page__checkout" to="/checkout">
              <span>إتمام الطلب</span>
              <ShieldCheckIcon />
            </StorefrontLink>
            <StorefrontLink className="cart-page__continue" to="/store">متابعة التسوق</StorefrontLink>
            {error ? <p className="cart-page__coupon-note" role="alert">{error}</p> : null}
          </div>
        ) : null}
      </div>
      <LuxeFullBottomNavigation
        className="cart-page__bottom-nav"
        profile={profile}
      />
    </section>
  );
}
