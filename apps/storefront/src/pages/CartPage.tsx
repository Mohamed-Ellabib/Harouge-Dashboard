import { useEffect } from "react";

import { STOREFRONT_MAX_CART_QUANTITY } from "../api/storefront-api";
import { useCart } from "../commerce/CartContext";
import { CartIcon, PackageIcon, TrashIcon } from "../components/Icons";
import { StatePanel } from "../components/StatePanel";
import { StorefrontLink } from "../lib/navigation";
import { formatStorefrontMoney } from "../lib/money";
import { storefrontUiText } from "../lib/localization";
import {
  isLuxeCommerceTemplate,
  type StorefrontProfileDto,
} from "../types";

export const CartPage = ({ profile }: { profile: StorefrontProfileDto }) => {
  const text = (ar: string, en: string) =>
    storefrontUiText(profile.locale, { ar, en });
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
    document.title = `${text("السلة", "Cart")} | ${profile.name}`;
  }, [profile.locale, profile.name]);

  if (capability.online_checkout.status !== "available") {
    return (
      <div className="shell page-state-wrap">
        <StatePanel
          kind="unavailable"
          title={text("الشراء غير متاح الآن", "Purchasing is unavailable")}
          message={text(
            "يمكنك متابعة تصفح منتجات المتجر والعودة لاحقًا.",
            "You can continue browsing and return later.",
          )}
          locale={profile.locale}
        />
      </div>
    );
  }

  if (restoring) {
    return (
      <div className="shell commerce-loading" aria-live="polite">
        <span className="loading-spinner" aria-hidden="true" />
        <h1>{text("جارٍ استعادة السلة", "Restoring your cart")}</h1>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    if (isLuxeCommerceTemplate(profile.storefront?.template_key)) {
      return (
        <section className="commerce-page shell luxe-empty-cart" aria-labelledby="empty-cart-title">
          <div className="luxe-empty-cart__art" aria-hidden="true">
            <img
              src={
                profile.storefront?.template_key === "luxe-commerce-full"
                  ? "/assets/luxe-full/customer-assets/empty-cart-bag-watch-111-transparent.webp"
                  : "/assets/luxe/empty-cart.webp"
              }
              alt=""
            />
          </div>
          <p className="eyebrow">{text("حقيبتك بانتظار اختياراتك", "Your bag awaits your selections")}</p>
          <h1 id="empty-cart-title">{text("سلة التسوق فارغة", "Your shopping bag is empty")}</h1>
          <p>{text(
            "اكتشف تشكيلتنا المختارة وأضف القطع التي تناسب أسلوبك.",
            "Explore our curated collection and add pieces that suit your style.",
          )}</p>
          <StorefrontLink to="/products" className="button button--primary">
            {text("ابدأ التسوق", "Start shopping")}
          </StorefrontLink>
        </section>
      );
    }

    return (
      <div className="shell page-state-wrap">
        <StatePanel
          kind="empty"
          title={text("سلتك فارغة", "Your cart is empty")}
          message={text(
            "اختر منتجًا من المتجر ثم أضفه إلى السلة لإكمال طلبك.",
            "Choose a product and add it to your cart to begin an order.",
          )}
          locale={profile.locale}
        />
        <StorefrontLink
          to="/products"
          className="button button--primary state-back-link"
        >
          {text("تصفح المنتجات", "Browse products")}
        </StorefrontLink>
      </div>
    );
  }

  return (
    <section className="commerce-page shell" aria-labelledby="cart-title">
      <nav className="breadcrumbs" aria-label={text("مسار الصفحة", "Breadcrumb")}>
        <StorefrontLink to="/">{text("الرئيسية", "Home")}</StorefrontLink>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{text("السلة", "Cart")}</span>
      </nav>
      <header className="commerce-heading">
        <div>
          <h1 id="cart-title">{text("سلة المشتريات", "Shopping cart")}</h1>
          <p>{text(
            `${cart.items.length} منتج في طلبك`,
            `${cart.items.length} ${cart.items.length === 1 ? "product" : "products"} in your order`,
          )}</p>
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
                  {formatStorefrontMoney(item.unit_price, cart.currency_code, profile.locale)}
                </strong>
              </div>
              <div
                className="quantity-control"
                aria-label={text(`كمية ${item.title}`, `Quantity for ${item.title}`)}
              >
                <button
                  type="button"
                  disabled={pending || item.quantity <= 1}
                  aria-label={text("تقليل الكمية", "Decrease quantity")}
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
                  aria-label={text("زيادة الكمية", "Increase quantity")}
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
                {formatStorefrontMoney(item.total, cart.currency_code, profile.locale)}
              </strong>
              <button
                type="button"
                className="cart-line__remove"
                disabled={pending}
                onClick={() => void removeItem(item.id).catch(() => undefined)}
              >
                <TrashIcon />
                <span>{text("إزالة", "Remove")}</span>
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
          <h2 id="cart-summary-title">{text("ملخص السلة", "Cart summary")}</h2>
          <dl>
            <div>
              <dt>{text("المجموع الفرعي", "Subtotal")}</dt>
              <dd>
                {formatStorefrontMoney(cart.item_subtotal, cart.currency_code, profile.locale)}
              </dd>
            </div>
            <div>
              <dt>{text("التوصيل", "Delivery")}</dt>
              <dd>{text("يُحدد في الخطوة التالية", "Calculated at the next step")}</dd>
            </div>
            <div className="order-summary__total">
              <dt>{text("الإجمالي الحالي", "Current total")}</dt>
              <dd>{formatStorefrontMoney(cart.total, cart.currency_code, profile.locale)}</dd>
            </div>
          </dl>
          <StorefrontLink to="/checkout" className="button button--primary">
            {text("متابعة إلى إتمام الطلب", "Continue to checkout")}
          </StorefrontLink>
          <p className="pilot-note">
            {text(
              "ستراجع تفاصيل التوصيل والدفع قبل تأكيد الطلب.",
              "You will review delivery and payment details before confirming.",
            )}
          </p>
        </aside>
      </div>
    </section>
  );
};
