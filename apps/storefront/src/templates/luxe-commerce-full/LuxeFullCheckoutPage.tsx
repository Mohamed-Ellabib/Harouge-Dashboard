import { useEffect, useRef, useState, type FormEvent } from "react";

import { useCart } from "../../commerce/CartContext";
import {
  CartIcon,
  CheckIcon,
  ChevronLeftIcon,
  PackageIcon,
  ShieldCheckIcon,
} from "../../components/Icons";
import { navigate, StorefrontLink } from "../../lib/navigation";
import type {
  StorefrontCheckoutAddress,
  StorefrontPaymentMethod,
  StorefrontProfileDto,
  StorefrontShippingOptionDto,
} from "../../types";
import { LuxeFullBottomNavigation } from "./LuxeFullBottomNavigation";

import "./reference-source/src/pages/storefront/CheckoutPage.css";
import "./reference-source/src/pages/storefront/StorefrontSurface.css";

type Stage = "details" | "shipping" | "review";

const money = (amount: number, currency: string): string => `${currency.toUpperCase()} ${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(amount)}`;

export function LuxeFullCheckoutPage({ profile }: { profile: StorefrontProfileDto }) {
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
  const [stage, setStage] = useState<Stage>("details");
  const [shippingOptions, setShippingOptions] = useState<StorefrontShippingOptionDto[]>([]);
  const [selectedShippingId, setSelectedShippingId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<StorefrontPaymentMethod>(capability.online_checkout.payment_methods[0] ?? "cod");
  const [address, setAddress] = useState<StorefrontCheckoutAddress>({
    email: "",
    first_name: "",
    last_name: "",
    address_1: "",
    city: "",
    country_code: capability.online_checkout.status === "available" ? capability.online_checkout.country_codes[0] ?? "ly" : "ly",
    phone: "",
  });
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => { document.title = `إتمام الطلب | ${profile.name}`; }, [profile.name]);
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);

  const updateAddress = (field: keyof StorefrontCheckoutAddress, value: string) => setAddress((current) => ({ ...current, [field]: value }));

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      if (stage === "details") {
        const options = await submitAddress(address);
        setShippingOptions(options);
        setSelectedShippingId(options[0]?.id ?? "");
        setStage("shipping");
        return;
      }
      if (stage === "shipping") {
        if (!selectedShippingId) return;
        await selectShipping(selectedShippingId);
        setStage("review");
        return;
      }
      await completeOrder(paymentMethod);
      navigate("/order-confirmation", { replace: true });
    } catch {
      // CartContext exposes the safe customer-facing error and recovery state.
    }
  };

  if (restoring) return <section className="checkout-page"><div className="checkout-page__loading"><span className="loading-spinner" /><span>جاري تجهيز صفحة إتمام الطلب</span></div><LuxeFullBottomNavigation className="checkout-page__bottom-nav" profile={profile} /></section>;

  if (capability.online_checkout.status !== "available") return <section className="checkout-page"><div className="checkout-page__shell"><div className="checkout-page__empty"><CartIcon /><h2>إتمام الطلب غير متاح الآن</h2><p>يمكنك متابعة التصفح والعودة لاحقاً.</p><StorefrontLink to="/watches">العودة للتسوق</StorefrontLink></div></div><LuxeFullBottomNavigation className="checkout-page__bottom-nav" profile={profile} /></section>;

  if (indeterminateCompletion) return <section className="checkout-page"><div className="checkout-page__shell"><div className="checkout-page__empty"><ShieldCheckIcon /><h2>نتيجة الطلب تحتاج إلى تحقق</h2><p>لا تنشئ طلباً جديداً. تحقق بأمان من نتيجة نفس الطلب.</p><button className="checkout-page__submit" type="button" disabled={pending} onClick={() => void retryCompletion()}>{pending ? "جاري التحقق" : "تحقق من نتيجة الطلب"}</button></div></div><LuxeFullBottomNavigation className="checkout-page__bottom-nav" profile={profile} /></section>;

  if (!cart || cart.items.length === 0) return <section className="checkout-page"><div className="checkout-page__shell"><div className="checkout-page__empty"><CartIcon /><h2>السلة فارغة</h2><p>أضف منتجات إلى السلة قبل إتمام الطلب.</p><StorefrontLink to="/watches">العودة للتسوق</StorefrontLink></div></div><LuxeFullBottomNavigation className="checkout-page__bottom-nav" profile={profile} /></section>;

  const itemCount = cart.items.reduce((total, item) => total + item.quantity, 0);
  const countries = capability.online_checkout.country_codes;

  return (
    <section className="checkout-page">
      <div className="checkout-page__shell">
        <header className="checkout-page__header">
          <StorefrontLink to="/cart" ariaLabel="الرجوع"><ChevronLeftIcon /></StorefrontLink>
          <div><span>إتمام الطلب</span><h1>تأكيد بيانات الشراء</h1></div>
          <CartIcon />
        </header>

        <form className="checkout-page__content" onSubmit={(event) => void handleSubmit(event)}>
          <section className="checkout-page__panel checkout-page__panel--address">
            <div className="checkout-page__panel-title"><PackageIcon /><div><span>بيانات التوصيل</span><h2>العنوان ورقم الهاتف</h2></div></div>
            <p className="checkout-page__guest-note">أدخل بيانات صحيحة ليتمكن فريق المتجر من تأكيد طلبك وتوصيله.</p>
            <label className="checkout-page__field"><span>البريد الإلكتروني</span><input required type="email" autoComplete="email" dir="ltr" value={address.email} onChange={(event) => updateAddress("email", event.target.value)} /></label>
            <label className="checkout-page__field"><span>الاسم الأول</span><input required autoComplete="given-name" value={address.first_name} onChange={(event) => updateAddress("first_name", event.target.value)} /></label>
            <label className="checkout-page__field"><span>اسم العائلة</span><input required autoComplete="family-name" value={address.last_name} onChange={(event) => updateAddress("last_name", event.target.value)} /></label>
            <label className="checkout-page__field"><span>رقم الهاتف</span><input required autoComplete="tel" inputMode="tel" dir="ltr" value={address.phone} onChange={(event) => updateAddress("phone", event.target.value)} /></label>
            <label className="checkout-page__field"><span>المدينة</span><input required value={address.city} onChange={(event) => updateAddress("city", event.target.value)} placeholder="مثال: طرابلس" /></label>
            <label className="checkout-page__field"><span>العنوان</span><input required autoComplete="street-address" value={address.address_1} onChange={(event) => updateAddress("address_1", event.target.value)} placeholder="المنطقة، الشارع، أقرب نقطة دالة" /></label>
            <label className="checkout-page__field"><span>الدولة</span><select required value={address.country_code} onChange={(event) => updateAddress("country_code", event.target.value)}>{countries.map((country) => <option key={country} value={country}>{country.toUpperCase()}</option>)}</select></label>
          </section>

          <section className="checkout-page__panel">
            <div className="checkout-page__panel-title"><ShieldCheckIcon /><div><span>{stage === "shipping" ? "طريقة التوصيل" : "طريقة الدفع"}</span><h2>{stage === "shipping" ? "اختر طريقة التوصيل المناسبة" : "اختر طريقة الدفع المناسبة"}</h2></div></div>
            {stage === "shipping" ? <div className="checkout-page__options">{shippingOptions.map((option) => <label className="checkout-page__option" key={option.id}><input checked={selectedShippingId === option.id} name="shipping" onChange={() => setSelectedShippingId(option.id)} type="radio" /><span><b>{option.name}</b><small>{money(option.amount, cart.currency_code)}</small></span><CheckIcon /></label>)}</div> : <div className="checkout-page__options">{capability.online_checkout.payment_methods.map((method) => <label className="checkout-page__option" key={method}><input checked={paymentMethod === method} name="payment" onChange={() => setPaymentMethod(method)} type="radio" /><span><b>{method === "cod" ? "الدفع عند الاستلام" : "تحويل مصرفي يدوي"}</b><small>{method === "cod" ? "ادفع عند استلام طلبك" : "تظهر تعليمات التحويل بعد التأكيد"}</small></span><CheckIcon /></label>)}</div>}
          </section>

          <section className="checkout-page__panel checkout-page__panel--summary">
            <div className="checkout-page__panel-title"><CartIcon /><div><span>مراجعة الطلب</span><h2>{itemCount} قطعة في السلة</h2></div></div>
            <div className="checkout-page__items">{cart.items.map((item) => <article className="checkout-page__item" key={item.id}><span>{item.quantity}</span><div><b>{item.title}</b><small>{money(item.total, cart.currency_code)}</small></div>{item.thumbnail_url ? <img src={item.thumbnail_url} alt="" /> : <CartIcon />}</article>)}</div>
            <div className="checkout-page__totals"><div><span>إجمالي المنتجات</span><b>{money(cart.item_subtotal, cart.currency_code)}</b></div><div><span>التوصيل</span><b>{cart.shipping_method_selected ? money(cart.shipping_total, cart.currency_code) : "يحدد بعد العنوان"}</b></div><strong><span>الإجمالي</span><b>{money(cart.total, cart.currency_code)}</b></strong></div>
            {error ? <div className="checkout-page__error" ref={errorRef} role="alert" tabIndex={-1}><ShieldCheckIcon /><span>{error}</span></div> : null}
            <button className="checkout-page__submit" type="submit" disabled={pending || (stage === "shipping" && !selectedShippingId)}><ShieldCheckIcon /><span>{pending ? "جاري الحفظ..." : stage === "details" ? "حفظ ومتابعة إلى التوصيل" : stage === "shipping" ? "مراجعة الطلب" : "تأكيد الطلب"}</span></button>
            <p className="checkout-page__secure"><ShieldCheckIcon /><span>{stage === "review" ? "راجع الإجمالي ثم أكد الطلب." : "بيانات الطلب محمية وتستخدم لإتمام الشراء فقط."}</span></p>
          </section>
        </form>
      </div>
      <LuxeFullBottomNavigation
        className="checkout-page__bottom-nav"
        profile={profile}
      />
    </section>
  );
}
