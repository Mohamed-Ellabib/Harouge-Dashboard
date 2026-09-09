import { useEffect, useState, type FormEvent } from "react";

import {
  CartIcon,
  ChevronLeftIcon,
  HeartIcon,
  PackageIcon,
  ShieldCheckIcon,
  UserIcon,
} from "../../components/Icons";
import { StorefrontLink } from "../../lib/navigation";
import type { StorefrontProfileDto } from "../../types";
import { LuxeFullBottomNavigation } from "./LuxeFullBottomNavigation";

import "./reference-source/src/pages/storefront/AccountPage.css";
import "./reference-source/src/pages/storefront/CustomerOrdersPage.css";
import "./reference-source/src/pages/storefront/StorefrontSurface.css";

export function LuxeFullAccountPage({
  initialView = "auth",
  profile,
}: {
  initialView?: "auth" | "orders";
  profile: StorefrontProfileDto;
}) {
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    document.title = `${initialView === "orders" ? "طلباتي" : "الحساب"} | ${profile.name}`;
  }, [initialView, profile.name]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice("خدمة حسابات العملاء غير متصلة بهذا المتجر بعد. لم يتم إرسال أي بيانات.");
  };

  if (initialView === "orders") {
    return (
      <section className="customer-orders-page luxe-full-orders-page">
        <div className="customer-orders-page__shell">
          <section className="customer-orders-page__hero" aria-labelledby="customer-orders-title">
            <header className="customer-orders-page__topbar"><StorefrontLink to="/account" ariaLabel="الرجوع"><ChevronLeftIcon /></StorefrontLink><strong>طلباتي</strong><StorefrontLink to="/cart" ariaLabel="سلة التسوق"><CartIcon /><span>0</span></StorefrontLink></header>
            <div className="customer-orders-page__hero-content"><h1 id="customer-orders-title">طلباتي</h1></div>
          </section>
          <section className="customer-orders-page__body" aria-label="قائمة الطلبات">
            <div className="customer-orders-page__empty"><PackageIcon /><h2>سجل الطلبات غير متصل بعد</h2><p>ستظهر الطلبات الحقيقية هنا عند تفعيل حسابات العملاء لهذا المتجر.</p><StorefrontLink to="/watches">متابعة التسوق</StorefrontLink></div>
          </section>
        </div>
        <LuxeFullBottomNavigation
          className="customer-orders-page__bottom-nav luxe-full-account-bottom-nav"
          profile={profile}
        />
      </section>
    );
  }

  return (
    <section className="account-page account-page--guest">
      <div className="account-page__shell">
        <section className="account-page__intro account-page__intro--guest" aria-labelledby="account-page-title"><h1 id="account-page-title">ادخل إلى حسابك</h1><span className="account-page__ornament" aria-hidden="true" /><p>سجل الدخول أو أنشئ حساباً برقم الهاتف لحفظ مشترياتك ومفضلتك.</p></section>
        <section className="account-page__auth-card" aria-label="تسجيل الدخول وإنشاء الحساب">
          <div className="account-page__auth-toggle" role="tablist" aria-label="اختيار نوع الدخول"><button className={mode === "signin" ? "is-active" : undefined} type="button" onClick={() => { setMode("signin"); setNotice(""); }}><UserIcon /><span>تسجيل الدخول</span></button><button className={mode === "register" ? "is-active" : undefined} type="button" onClick={() => { setMode("register"); setNotice(""); }}><ShieldCheckIcon /><span>إنشاء حساب</span></button></div>
          {notice ? <div className="account-page__notice" role="status"><ShieldCheckIcon /><span>{notice}</span></div> : null}
          <form className="account-page__form" onSubmit={submit}>
            {mode === "register" ? <label className="account-page__field"><span>الاسم الكامل</span><div className="account-page__input-wrap"><span className="account-page__input-icon"><UserIcon /></span><input required autoComplete="name" placeholder="مثال: محمد السنوسي" /></div></label> : null}
            <label className="account-page__field"><span>رقم الهاتف</span><div className="account-page__input-wrap"><span className="account-page__input-icon"><UserIcon /></span><input required autoComplete="tel" dir="ltr" inputMode="tel" placeholder="218+ 09xxxxxxxx" type="tel" /></div></label>
            <label className="account-page__field"><span>كلمة المرور</span><div className="account-page__input-wrap"><span className="account-page__input-icon"><ShieldCheckIcon /></span><input required autoComplete={mode === "signin" ? "current-password" : "new-password"} placeholder="••••••••" type="password" /></div></label>
            <button className="account-page__submit" type="submit"><span>{mode === "signin" ? "تسجيل الدخول" : "إنشاء الحساب"}</span><ChevronLeftIcon /></button>
            <StorefrontLink className="account-page__forgot" to="/contact">تحتاج للمساعدة؟ تواصل مع المتجر</StorefrontLink>
          </form>
          <div className="luxe-full-account-links"><StorefrontLink to="/orders"><PackageIcon />طلباتي</StorefrontLink><StorefrontLink to="/favorites"><HeartIcon />المفضلة</StorefrontLink></div>
        </section>
      </div>
      <LuxeFullBottomNavigation
        className="customer-orders-page__bottom-nav luxe-full-account-bottom-nav"
        profile={profile}
      />
    </section>
  );
}
