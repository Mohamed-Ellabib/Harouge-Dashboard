import { useEffect, useState, type FormEvent } from "react";

import { isVisualPreviewEnabled } from "../config";
import { PackageIcon, UserIcon } from "../components/Icons";
import { StorefrontLink } from "../lib/navigation";
import { storefrontUiText } from "../lib/localization";
import type { StorefrontProfileDto } from "../types";

export const AccountPage = ({
  profile,
  initialView = "auth",
}: {
  profile: StorefrontProfileDto;
  initialView?: "auth" | "orders";
}) => {
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const preview = isVisualPreviewEnabled();
  const [showOrders, setShowOrders] = useState(
    () => initialView === "orders" && preview,
  );
  const fullSource = profile.storefront?.template_key === "luxe-commerce-full";
  const text = (ar: string, en: string) => storefrontUiText(profile.locale, { ar, en });

  useEffect(() => {
    document.title = `${text("الحساب", "Account")} | ${profile.name}`;
  }, [profile.locale, profile.name]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (preview) setShowOrders(true);
  };

  if (showOrders && preview) {
    return (
      <section className="luxe-account-page luxe-orders-preview" aria-labelledby="orders-title">
        <header>
          <span><UserIcon /></span>
          <div><p>{text("مرحباً، محمد", "Welcome, Mohamed")}</p><h1 id="orders-title">{text("طلباتي", "My orders")}</h1></div>
          <button type="button" onClick={() => setShowOrders(false)}>{text("خروج", "Sign out")}</button>
        </header>
        <div className="luxe-orders-list">
          <article>
            <div><span>PREVIEW-1048</span><strong>{text("قيد التجهيز", "Preparing")}</strong></div>
            <div className="luxe-order-product"><img src={fullSource ? "/assets/luxe-full/product-assets/09-gold-classic-leather.webp" : "/assets/luxe/09-gold-classic-leather.webp"} alt="Gold Leather" /><p><strong>Gold Leather</strong><span>{text("الكمية 1", "Quantity 1")}</span></p><b>2,020 LYD</b></div>
            <footer><span>{text("12 أغسطس 2026", "12 August 2026")}</span><button type="button">{text("تفاصيل الطلب", "Order details")}</button></footer>
          </article>
          <article>
            <div><span>PREVIEW-1032</span><strong className="is-delivered">{text("تم التوصيل", "Delivered")}</strong></div>
            <div className="luxe-order-product"><span className="luxe-order-product__icon"><PackageIcon /></span><p><strong>Black Square Sunglasses</strong><span>{text("الكمية 1", "Quantity 1")}</span></p><b>920 LYD</b></div>
            <footer><span>{text("02 أغسطس 2026", "02 August 2026")}</span><button type="button">{text("إعادة الطلب", "Order again")}</button></footer>
          </article>
        </div>
        <StorefrontLink to="/products" className="button button--primary">{text("متابعة التسوق", "Continue shopping")}</StorefrontLink>
      </section>
    );
  }

  return (
    <section className="luxe-account-page luxe-account-auth" aria-labelledby="account-title">
      <div className="luxe-account-auth__intro">
        <span><UserIcon /></span>
        <h1 id="account-title">{text("ادخل إلى حسابك", "Sign in to your account")}</h1>
        <p>{text("سجل الدخول أو أنشئ حساباً برقم الهاتف لحفظ مشترياتك ومفضلتك.", "Sign in or create an account to save purchases and favorites.")}</p>
      </div>
      <form onSubmit={submit}>
        <div className="luxe-account-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={mode === "signin"} onClick={() => setMode("signin")}>{text("تسجيل الدخول", "Sign in")}</button>
          <button type="button" role="tab" aria-selected={mode === "register"} onClick={() => setMode("register")}>{text("إنشاء حساب", "Create account")}</button>
        </div>
        <p className="luxe-account-note">{preview ? text("استخدم أي بيانات لفتح معاينة الطلبات.", "Use any details to preview the orders experience.") : text("حسابات العملاء ستتوفر عند تفعيل خدمة الحسابات لهذا المتجر.", "Customer accounts will be available when enabled for this Store.")}</p>
        {mode === "register" ? <label>{text("الاسم الكامل", "Full name")}<input required={preview} autoComplete="name" /></label> : null}
        <label>{text("رقم الهاتف", "Phone number")}<input required={preview} inputMode="tel" autoComplete="tel" placeholder="+218 09xxxxxxxx" /></label>
        <label>{text("كلمة المرور", "Password")}<input required={preview} type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} placeholder="••••••••" /></label>
        <button className="button button--primary" type="submit" disabled={!preview}>{mode === "signin" ? text("تسجيل الدخول", "Sign in") : text("إنشاء الحساب", "Create account")}</button>
      </form>
    </section>
  );
};
