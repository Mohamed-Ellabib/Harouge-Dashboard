import { useEffect } from "react";

import { STOREFRONT_MAX_CART_QUANTITY } from "../api/storefront-api";
import { useCart } from "../commerce/CartContext";
import { CartIcon, PackageIcon, TrashIcon } from "../components/Icons";
import { StatePanel } from "../components/StatePanel";
import { StorefrontLink } from "../lib/navigation";
import { formatStorefrontMoney } from "../lib/money";
import type { StorefrontProfileDto } from "../types";

export const CartPage = ({ profile }: { profile: StorefrontProfileDto }) => {
  const {
    capability,
    cart,
    error,
    pending,
    restoring,
    removeItem,
    updateQuantity,
  } = useCart();

  useEffect(() => {
    document.title = `السلة | ${profile.name}`;
  }, [profile.name]);

  if (capability.online_checkout.status !== "available") {
    return (
      <div className="shell page-state-wrap">
        <StatePanel
          kind="unavailable"
          title="الشراء غير متاح الآن"
          message="يمكنك متابعة تصفح منتجات المتجر والعودة لاحقًا."
        />
      </div>
    );
  }

  if (restoring) {
    return (
      <div className="shell commerce-loading" aria-live="polite">
        <span className="loading-spinner" aria-hidden="true" />
        <h1>جارٍ استعادة السلة</h1>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="shell page-state-wrap">
        <StatePanel
          kind="empty"
          title="سلتك فارغة"
          message="اختر منتجًا من المتجر ثم أضفه إلى السلة لإكمال طلبك."
        />
        <StorefrontLink
          to="/products"
          className="button button--primary state-back-link"
        >
          تصفح المنتجات
        </StorefrontLink>
      </div>
    );
  }

  return (
    <section className="commerce-page shell" aria-labelledby="cart-title">
      <nav className="breadcrumbs" aria-label="مسار الصفحة">
        <StorefrontLink to="/">الرئيسية</StorefrontLink>
        <span aria-hidden="true">/</span>
        <span aria-current="page">السلة</span>
      </nav>
      <header className="commerce-heading">
        <div>
          <h1 id="cart-title">سلة المشتريات</h1>
          <p>{cart.items.length} منتج في طلبك</p>
        </div>
        <CartIcon />
      </header>

      <div className="cart-layout">
        <div className="cart-lines" aria-busy={pending}>
          {cart.items.map((item) => (
            <article className="cart-line" key={item.id}>
              <div className="cart-line__media">
                {item.thumbnail_url ? (
                  <img src={item.thumbnail_url} alt="" />
                ) : (
                  <span aria-hidden="true">
                    <PackageIcon />
                  </span>
                )}
              </div>
              <div className="cart-line__details">
                <h2>{item.title}</h2>
                <strong>
                  {formatStorefrontMoney(item.unit_price, cart.currency_code)}
                </strong>
              </div>
              <div
                className="quantity-control"
                aria-label={`كمية ${item.title}`}
              >
                <button
                  type="button"
                  disabled={pending || item.quantity <= 1}
                  aria-label="تقليل الكمية"
                  onClick={() =>
                    void updateQuantity(item.id, item.quantity - 1).catch(
                      () => undefined,
                    )
                  }
                >
                  −
                </button>
                <output aria-live="polite">{item.quantity}</output>
                <button
                  type="button"
                  disabled={
                    pending || item.quantity >= STOREFRONT_MAX_CART_QUANTITY
                  }
                  aria-label="زيادة الكمية"
                  onClick={() =>
                    void updateQuantity(item.id, item.quantity + 1).catch(
                      () => undefined,
                    )
                  }
                >
                  +
                </button>
              </div>
              <strong className="cart-line__total">
                {formatStorefrontMoney(item.total, cart.currency_code)}
              </strong>
              <button
                type="button"
                className="cart-line__remove"
                disabled={pending}
                onClick={() => void removeItem(item.id).catch(() => undefined)}
              >
                <TrashIcon />
                <span>إزالة</span>
              </button>
            </article>
          ))}
          {error ? (
            <p className="commerce-error" role="alert" tabIndex={-1}>
              {error}
            </p>
          ) : null}
        </div>

        <aside className="order-summary" aria-labelledby="cart-summary-title">
          <h2 id="cart-summary-title">ملخص السلة</h2>
          <dl>
            <div>
              <dt>المجموع الفرعي</dt>
              <dd>
                {formatStorefrontMoney(cart.item_subtotal, cart.currency_code)}
              </dd>
            </div>
            <div>
              <dt>التوصيل</dt>
              <dd>يُحدد في الخطوة التالية</dd>
            </div>
            <div className="order-summary__total">
              <dt>الإجمالي الحالي</dt>
              <dd>{formatStorefrontMoney(cart.total, cart.currency_code)}</dd>
            </div>
          </dl>
          <StorefrontLink to="/checkout" className="button button--primary">
            متابعة إلى إتمام الطلب
          </StorefrontLink>
          <p className="pilot-note">تجربة محلية — لا يتم تحصيل دفعة فعلية.</p>
        </aside>
      </div>
    </section>
  );
};
