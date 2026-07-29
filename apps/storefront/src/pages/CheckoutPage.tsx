import { useEffect, useRef, useState, type FormEvent } from "react";

import { useCart } from "../commerce/CartContext";
import { CheckIcon, PackageIcon, ShieldCheckIcon } from "../components/Icons";
import { StatePanel } from "../components/StatePanel";
import { navigate, StorefrontLink } from "../lib/navigation";
import { formatStorefrontMoney } from "../lib/money";
import type {
  StorefrontCheckoutAddress,
  StorefrontProfileDto,
  StorefrontShippingOptionDto,
} from "../types";

type CheckoutStage = "details" | "shipping" | "review";

const emptyAddress: StorefrontCheckoutAddress = {
  email: "",
  first_name: "",
  last_name: "",
  address_1: "",
  city: "",
  country_code: "",
  phone: "",
};

export const CheckoutPage = ({
  profile,
}: {
  profile: StorefrontProfileDto;
}) => {
  const {
    capability,
    cart,
    completeOrder,
    error,
    indeterminateCompletion,
    pending,
    restoring,
    selectShipping,
    submitAddress,
  } = useCart();
  const [address, setAddress] = useState<StorefrontCheckoutAddress>(() => ({
    ...emptyAddress,
    country_code:
      capability.online_checkout.status === "available"
        ? (capability.online_checkout.country_codes[0] ?? "")
        : "",
  }));
  const [stage, setStage] = useState<CheckoutStage>("details");
  const [shippingOptions, setShippingOptions] = useState<
    StorefrontShippingOptionDto[]
  >([]);
  const [selectedShippingId, setSelectedShippingId] = useState("");
  const errorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    document.title = `إتمام الطلب | ${profile.name}`;
  }, [profile.name]);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  if (capability.online_checkout.status !== "available") {
    return (
      <div className="shell page-state-wrap">
        <StatePanel
          kind="unavailable"
          title="إتمام الطلب غير متاح الآن"
          message="لم تتغير منتجات المتجر، ويمكنك متابعة التصفح والعودة لاحقًا."
        />
      </div>
    );
  }

  if (restoring) {
    return (
      <div className="shell commerce-loading" aria-live="polite">
        <span className="loading-spinner" aria-hidden="true" />
        <h1>جارٍ تجهيز إتمام الطلب</h1>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="shell page-state-wrap">
        <StatePanel
          kind="empty"
          title="لا يوجد طلب لإكماله"
          message="أضف منتجًا إلى السلة قبل الانتقال إلى إتمام الطلب."
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

  const countries = capability.online_checkout.country_codes;
  const regionNames = new Intl.DisplayNames(["ar"], { type: "region" });

  const updateAddress = (
    field: keyof StorefrontCheckoutAddress,
    value: string,
  ) => setAddress((current) => ({ ...current, [field]: value }));

  const submitDetails = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const options = await submitAddress(address);
      setShippingOptions(options);
      setSelectedShippingId(options[0]?.id ?? "");
      setStage("shipping");
    } catch {
      // The Cart context exposes a generic, focus-managed error.
    }
  };

  const submitShipping = async () => {
    if (!selectedShippingId) return;
    try {
      await selectShipping(selectedShippingId);
      setStage("review");
    } catch {
      // The Cart context exposes a generic, focus-managed error.
    }
  };

  const submitCompletion = async () => {
    if (indeterminateCompletion) return;
    try {
      await completeOrder();
      navigate("/order-confirmation", { replace: true });
    } catch {
      // The Cart context distinguishes an indeterminate completion result.
    }
  };

  return (
    <section className="commerce-page shell" aria-labelledby="checkout-title">
      <nav className="breadcrumbs" aria-label="مسار الصفحة">
        <StorefrontLink to="/">الرئيسية</StorefrontLink>
        <span aria-hidden="true">/</span>
        <StorefrontLink to="/cart">السلة</StorefrontLink>
        <span aria-hidden="true">/</span>
        <span aria-current="page">إتمام الطلب</span>
      </nav>
      <header className="commerce-heading commerce-heading--checkout">
        <div>
          <h1 id="checkout-title">إتمام الطلب</h1>
          <p>أدخل بيانات التوصيل ثم راجع الإجمالي قبل التأكيد.</p>
        </div>
        <ol className="checkout-progress" aria-label="خطوات إتمام الطلب">
          <li className={stage === "details" ? "is-current" : "is-complete"}>
            البيانات
          </li>
          <li
            className={
              stage === "shipping"
                ? "is-current"
                : stage === "review"
                  ? "is-complete"
                  : undefined
            }
          >
            التوصيل
          </li>
          <li className={stage === "review" ? "is-current" : undefined}>
            المراجعة
          </li>
        </ol>
      </header>

      <div className="checkout-layout">
        <div className="checkout-panel">
          <form onSubmit={submitDetails}>
            <fieldset disabled={pending || stage !== "details"}>
              <legend>بيانات التواصل</legend>
              <label className="field field--wide">
                <span>البريد الإلكتروني</span>
                <input
                  autoComplete="email"
                  autoFocus
                  inputMode="email"
                  maxLength={320}
                  required
                  type="email"
                  value={address.email}
                  onChange={(event) =>
                    updateAddress("email", event.target.value)
                  }
                />
              </label>
              <div className="field-row">
                <label className="field">
                  <span>الاسم الأول</span>
                  <input
                    autoComplete="given-name"
                    maxLength={120}
                    required
                    value={address.first_name}
                    onChange={(event) =>
                      updateAddress("first_name", event.target.value)
                    }
                  />
                </label>
                <label className="field">
                  <span>اسم العائلة</span>
                  <input
                    autoComplete="family-name"
                    maxLength={120}
                    required
                    value={address.last_name}
                    onChange={(event) =>
                      updateAddress("last_name", event.target.value)
                    }
                  />
                </label>
              </div>
            </fieldset>

            <fieldset disabled={pending || stage !== "details"}>
              <legend>عنوان التوصيل</legend>
              <label className="field field--wide">
                <span>العنوان</span>
                <input
                  autoComplete="street-address"
                  maxLength={240}
                  required
                  value={address.address_1}
                  onChange={(event) =>
                    updateAddress("address_1", event.target.value)
                  }
                />
              </label>
              <div className="field-row">
                <label className="field">
                  <span>المدينة</span>
                  <input
                    autoComplete="address-level2"
                    maxLength={120}
                    required
                    value={address.city}
                    onChange={(event) =>
                      updateAddress("city", event.target.value)
                    }
                  />
                </label>
                <label className="field">
                  <span>الدولة</span>
                  <select
                    autoComplete="country"
                    required
                    value={address.country_code}
                    onChange={(event) =>
                      updateAddress("country_code", event.target.value)
                    }
                  >
                    {countries.map((country) => (
                      <option key={country} value={country}>
                        {regionNames.of(country.toUpperCase()) ?? country}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="field field--wide">
                <span>رقم الهاتف (اختياري)</span>
                <input
                  autoComplete="tel"
                  inputMode="tel"
                  maxLength={40}
                  value={address.phone}
                  onChange={(event) =>
                    updateAddress("phone", event.target.value)
                  }
                />
              </label>
              {stage === "details" ? (
                <button
                  className="button button--primary checkout-next"
                  type="submit"
                >
                  {pending ? "جارٍ الحفظ..." : "متابعة إلى التوصيل"}
                </button>
              ) : null}
            </fieldset>
          </form>

          {stage !== "details" ? (
            <section
              className="shipping-section"
              aria-labelledby="shipping-title"
            >
              <div className="checkout-section-heading">
                <div>
                  <h2 id="shipping-title">طريقة التوصيل</h2>
                  <p>اختر طريقة التوصيل المتاحة لهذا المتجر.</p>
                </div>
                {stage === "review" ? <CheckIcon /> : null}
              </div>
              {shippingOptions.map((option) => (
                <label className="shipping-option" key={option.id}>
                  <input
                    checked={selectedShippingId === option.id}
                    disabled={pending || stage === "review"}
                    name="shipping-option"
                    type="radio"
                    value={option.id}
                    onChange={() => setSelectedShippingId(option.id)}
                  />
                  <span>{option.name}</span>
                  <strong>
                    {formatStorefrontMoney(option.amount, cart.currency_code)}
                  </strong>
                </label>
              ))}
              {stage === "shipping" ? (
                <button
                  className="button button--primary checkout-next"
                  disabled={pending || !selectedShippingId}
                  type="button"
                  onClick={() => void submitShipping()}
                >
                  {pending ? "جارٍ الحفظ..." : "مراجعة الطلب"}
                </button>
              ) : null}
            </section>
          ) : null}

          {stage === "review" ? (
            <section className="review-section" aria-labelledby="review-title">
              <div className="checkout-section-heading">
                <div>
                  <h2 id="review-title">المراجعة والتأكيد</h2>
                  <p>
                    راجع الإجمالي. لن يتم تحصيل دفعة فعلية في هذا الاختبار
                    المحلي.
                  </p>
                </div>
                <ShieldCheckIcon />
              </div>
              <button
                className="button button--primary checkout-complete"
                disabled={pending || indeterminateCompletion}
                type="button"
                onClick={() => void submitCompletion()}
              >
                {pending ? "جارٍ التأكيد..." : "تأكيد الطلب التجريبي"}
              </button>
            </section>
          ) : null}

          {error ? (
            <p
              className="commerce-error"
              ref={errorRef}
              role="alert"
              tabIndex={-1}
            >
              {error}
            </p>
          ) : null}
        </div>

        <aside
          className="order-summary order-summary--checkout"
          aria-labelledby="checkout-summary-title"
        >
          <h2 id="checkout-summary-title">ملخص الطلب</h2>
          <div className="summary-items">
            {cart.items.map((item) => (
              <div className="summary-item" key={item.id}>
                <div>
                  {item.thumbnail_url ? (
                    <img src={item.thumbnail_url} alt="" />
                  ) : (
                    <span aria-hidden="true">
                      <PackageIcon />
                    </span>
                  )}
                </div>
                <p>
                  <strong>{item.title}</strong>
                  <span>الكمية: {item.quantity}</span>
                </p>
                <strong>
                  {formatStorefrontMoney(item.total, cart.currency_code)}
                </strong>
              </div>
            ))}
          </div>
          <dl>
            <div>
              <dt>المجموع الفرعي</dt>
              <dd>
                {formatStorefrontMoney(cart.item_subtotal, cart.currency_code)}
              </dd>
            </div>
            <div>
              <dt>التوصيل</dt>
              <dd>
                {cart.shipping_method_selected
                  ? formatStorefrontMoney(
                      cart.shipping_total,
                      cart.currency_code,
                    )
                  : "يُحدد بعد العنوان"}
              </dd>
            </div>
            <div className="order-summary__total">
              <dt>الإجمالي</dt>
              <dd>{formatStorefrontMoney(cart.total, cart.currency_code)}</dd>
            </div>
          </dl>
          <p className="pilot-note">
            <ShieldCheckIcon />
            تأكيد تجريبي محلي — لا يتم تحصيل دفعة فعلية.
          </p>
        </aside>
      </div>
    </section>
  );
};
