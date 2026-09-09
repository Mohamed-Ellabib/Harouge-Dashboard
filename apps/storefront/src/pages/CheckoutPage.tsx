import { useEffect, useRef, useState, type FormEvent } from "react";

import { useCart } from "../commerce/CartContext";
import { CheckIcon, PackageIcon, ShieldCheckIcon } from "../components/Icons";
import { StatePanel } from "../components/StatePanel";
import { navigate, StorefrontLink } from "../lib/navigation";
import { formatStorefrontMoney } from "../lib/money";
import { storefrontUiText } from "../lib/localization";
import type {
  StorefrontCheckoutAddress,
  StorefrontProfileDto,
  StorefrontPaymentMethod,
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
  const text = (ar: string, en: string) =>
    storefrontUiText(profile.locale, { ar, en });
  const {
    capability,
    cart,
    completeOrder,
    error,
    indeterminateCompletion,
    pending,
    restoring,
    retryCompletion,
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
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<StorefrontPaymentMethod>(
      capability.online_checkout.payment_methods[0] ?? "cod",
    );
  const errorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    document.title = `${text("إتمام الطلب", "Checkout")} | ${profile.name}`;
  }, [profile.locale, profile.name]);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  if (capability.online_checkout.status !== "available") {
    return (
      <div className="shell page-state-wrap">
        <StatePanel
          kind="unavailable"
          title={text("إتمام الطلب غير متاح الآن", "Checkout is unavailable")}
          message={text(
            "لم تتغير منتجات المتجر، ويمكنك متابعة التصفح والعودة لاحقًا.",
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
        <h1>{text("جارٍ تجهيز إتمام الطلب", "Preparing checkout")}</h1>
      </div>
    );
  }

  if (indeterminateCompletion) {
    return (
      <div className="shell page-state-wrap completion-recovery-state">
        <StatePanel
          kind="unavailable"
          title={text(
            "نتيجة الطلب تحتاج إلى تحقق",
            "Your order result needs verification",
          )}
          message={text(
            "لا تنشئ طلباً جديداً. استخدم الزر أدناه للتحقق بأمان من نتيجة نفس الطلب وطريقة الدفع.",
            "Do not create a new order. Use the button below to safely check the same order and payment method.",
          )}
          onRetry={() => void retryCompletion()}
          retryDisabled={pending}
          retryLabel={text(
            pending ? "جارٍ التحقق..." : "تحقق من نتيجة الطلب",
            pending ? "Checking..." : "Check order result",
          )}
          locale={profile.locale}
        />
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="shell page-state-wrap">
        <StatePanel
          kind="empty"
          title={text("لا يوجد طلب لإكماله", "There is no order to complete")}
          message={text(
            "أضف منتجًا إلى السلة قبل الانتقال إلى إتمام الطلب.",
            "Add a product to your cart before continuing to checkout.",
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

  const countries = capability.online_checkout.country_codes;
  const regionNames = new Intl.DisplayNames(
    [profile.locale === "en-LY" ? "en" : "ar"],
    { type: "region" },
  );

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
      await completeOrder(selectedPaymentMethod);
      navigate("/order-confirmation", { replace: true });
    } catch {
      // The Cart context distinguishes an indeterminate completion result.
    }
  };

  return (
    <section className="commerce-page shell" aria-labelledby="checkout-title">
      <nav className="breadcrumbs" aria-label={text("مسار الصفحة", "Breadcrumb")}>
        <StorefrontLink to="/">{text("الرئيسية", "Home")}</StorefrontLink>
        <span aria-hidden="true">/</span>
        <StorefrontLink to="/cart">{text("السلة", "Cart")}</StorefrontLink>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{text("إتمام الطلب", "Checkout")}</span>
      </nav>
      <header className="commerce-heading commerce-heading--checkout">
        <div>
          <h1 id="checkout-title">{text("إتمام الطلب", "Checkout")}</h1>
          <p>{text(
            "أدخل بيانات التوصيل ثم راجع الإجمالي قبل التأكيد.",
            "Enter your delivery details, then review the total before confirming.",
          )}</p>
        </div>
        <ol className="checkout-progress" aria-label={text("خطوات إتمام الطلب", "Checkout steps")}>
          <li className={stage === "details" ? "is-current" : "is-complete"}>
            {text("البيانات", "Details")}
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
            {text("التوصيل", "Delivery")}
          </li>
          <li className={stage === "review" ? "is-current" : undefined}>
            {text("المراجعة", "Review")}
          </li>
        </ol>
      </header>

      <div className="checkout-layout">
        <div className="checkout-panel">
          <form onSubmit={submitDetails}>
            <fieldset disabled={pending || stage !== "details"}>
              <legend>{text("بيانات التواصل", "Contact details")}</legend>
              <label className="field field--wide">
                <span>{text("البريد الإلكتروني", "Email address")}</span>
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
                  <span>{text("الاسم الأول", "First name")}</span>
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
                  <span>{text("اسم العائلة", "Last name")}</span>
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
              <legend>{text("عنوان التوصيل", "Delivery address")}</legend>
              <label className="field field--wide">
                <span>{text("العنوان", "Address")}</span>
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
                  <span>{text("المدينة", "City")}</span>
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
                  <span>{text("الدولة", "Country")}</span>
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
                <span>{text("رقم الهاتف (اختياري)", "Phone number (optional)")}</span>
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
                  {pending
                    ? text("جارٍ الحفظ...", "Saving…")
                    : text("متابعة إلى التوصيل", "Continue to delivery")}
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
                  <h2 id="shipping-title">{text("طريقة التوصيل", "Delivery method")}</h2>
                  <p>{text(
                    "اختر طريقة التوصيل المتاحة لهذا المتجر.",
                    "Choose the delivery method available for this store.",
                  )}</p>
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
                    {formatStorefrontMoney(option.amount, cart.currency_code, profile.locale)}
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
                  {pending
                    ? text("جارٍ الحفظ...", "Saving…")
                    : text("مراجعة الطلب", "Review order")}
                </button>
              ) : null}
            </section>
          ) : null}

          {stage === "review" ? (
            <section className="review-section" aria-labelledby="review-title">
              <div className="checkout-section-heading">
                <div>
                  <h2 id="review-title">{text("المراجعة والتأكيد", "Review and confirm")}</h2>
                  <p>{text(
                    "راجع تفاصيل الطلب والإجمالي قبل التأكيد.",
                    "Review the order details and total before confirming.",
                  )}</p>
                </div>
                <ShieldCheckIcon />
              </div>
              <fieldset className="payment-methods" disabled={pending}>
                <legend>{text("طريقة الدفع", "Payment method")}</legend>
                {capability.online_checkout.payment_methods.map((method) => (
                  <label className="payment-method" key={method}>
                    <input
                      checked={selectedPaymentMethod === method}
                      name="payment-method"
                      type="radio"
                      value={method}
                      onChange={() => setSelectedPaymentMethod(method)}
                    />
                    <span>
                      <strong>
                        {method === "cod"
                          ? text("الدفع عند الاستلام", "Cash on delivery")
                          : text("تحويل مصرفي يدوي", "Manual bank transfer")}
                      </strong>
                      <small>
                        {method === "cod"
                          ? text(
                              "ادفع للمتجر عند استلام طلبك.",
                              "Pay the store when your order is delivered.",
                            )
                          : text(
                              "ستظهر تعليمات التحويل بعد تأكيد الطلب.",
                              "Transfer instructions appear only after the order is confirmed.",
                            )}
                      </small>
                    </span>
                  </label>
                ))}
              </fieldset>
              <button
                className="button button--primary checkout-complete"
                disabled={
                  pending ||
                  indeterminateCompletion ||
                  !capability.online_checkout.payment_methods.includes(
                    selectedPaymentMethod,
                  )
                }
                type="button"
                onClick={() => void submitCompletion()}
              >
                {pending
                  ? text("جارٍ التأكيد...", "Confirming…")
                  : text("تأكيد الطلب", "Confirm order")}
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
          <h2 id="checkout-summary-title">{text("ملخص الطلب", "Order summary")}</h2>
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
                  <span>{text(`الكمية: ${item.quantity}`, `Quantity: ${item.quantity}`)}</span>
                </p>
                <strong>
                  {formatStorefrontMoney(item.total, cart.currency_code, profile.locale)}
                </strong>
              </div>
            ))}
          </div>
          <dl>
            <div>
              <dt>{text("المجموع الفرعي", "Subtotal")}</dt>
              <dd>
                {formatStorefrontMoney(cart.item_subtotal, cart.currency_code, profile.locale)}
              </dd>
            </div>
            <div>
              <dt>{text("التوصيل", "Delivery")}</dt>
              <dd>
                {cart.shipping_method_selected
                  ? formatStorefrontMoney(
                      cart.shipping_total,
                      cart.currency_code,
                      profile.locale,
                    )
                    : text("يُحدد بعد العنوان", "Calculated after the address")}
              </dd>
            </div>
            <div className="order-summary__total">
              <dt>{text("الإجمالي", "Total")}</dt>
              <dd>{formatStorefrontMoney(cart.total, cart.currency_code, profile.locale)}</dd>
            </div>
          </dl>
          <p className="pilot-note">
            <ShieldCheckIcon />
            {text(
              "راجع الطلب بعناية قبل التأكيد.",
              "Review your order carefully before confirming.",
            )}
          </p>
        </aside>
      </div>
    </section>
  );
};
