import { useEffect } from "react";

import { useCart } from "../../commerce/CartContext";
import {
  CheckIcon,
  PackageIcon,
} from "../../components/Icons";
import { StorefrontLink } from "../../lib/navigation";
import type { StorefrontProfileDto } from "../../types";
import { LuxeFullBottomNavigation } from "./LuxeFullBottomNavigation";

import "./reference-source/src/pages/storefront/WatchesPage.css";
import "./reference-source/src/pages/storefront/OrderConfirmationPage.css";
import "./reference-source/src/pages/storefront/StorefrontSurface.css";

const money = (amount: number, currency: string): string => `${currency.toUpperCase()} ${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(amount)}`;

export function LuxeFullOrderConfirmationPage({ profile }: { profile: StorefrontProfileDto }) {
  const { confirmation } = useCart();

  useEffect(() => { document.title = `تأكيد الطلب | ${profile.name}`; }, [profile.name]);

  const count = confirmation?.items.reduce((total, item) => total + item.quantity, 0) ?? 0;

  return (
    <section className="order-confirmation-page">
      <section className="order-confirmation-page__hero" aria-labelledby="order-confirmation-title">
        <div className="order-confirmation-page__hero-content">
          <span className="order-confirmation-page__success-icon"><CheckIcon /></span>
          <div className="order-confirmation-page__eyebrow-row"><i aria-hidden="true" /><span>{confirmation ? "تم تأكيد الطلب" : "خصوصية الطلب"}</span><i aria-hidden="true" /></div>
          <h1 id="order-confirmation-title">{confirmation ? `شكراً لشرائك من ${profile.name}` : "انتهت جلسة تأكيد الطلب"}</h1>
          <p>{confirmation ? "وصل طلبك بنجاح، وسيتواصل معك فريق المتجر لتأكيد التفاصيل وتجهيز الطلب." : "لا نعرض تفاصيل الطلب بعد تحديث الصفحة حفاظاً على خصوصيتك. تواصل مع المتجر إذا احتجت إلى المساعدة."}</p>
        </div>
        <div className="order-confirmation-page__hero-footer"><i aria-hidden="true" /><span>{confirmation ? "ملخص الطلب" : "العودة إلى المتجر"}</span><i aria-hidden="true" /></div>
      </section>

      <section className="order-confirmation-page__details" aria-label="ملخص الطلب">
        {confirmation ? <div className="order-confirmation-page__summary"><div><span>رقم الطلب</span><b dir="ltr">#{confirmation.display_id}</b></div><div><span>عدد القطع</span><b>{count}</b></div><div><span>الإجمالي</span><b dir="ltr">{money(confirmation.total, confirmation.currency_code)}</b></div></div> : null}
        {confirmation?.payment.method === "bank_transfer" ? <div className="luxe-full-confirmation-bank"><strong>تعليمات التحويل المصرفي</strong><span>{confirmation.payment.bank_transfer.bank_name}</span><span>{confirmation.payment.bank_transfer.account_holder_name}</span><span dir="ltr">{confirmation.payment.bank_transfer.account_reference}</span><p>{confirmation.payment.bank_transfer.instructions}</p></div> : null}
        <div className="order-confirmation-page__actions"><StorefrontLink className="order-confirmation-page__primary" to="/store">متابعة التسوق</StorefrontLink><StorefrontLink className="order-confirmation-page__secondary" to="/account"><PackageIcon /><span>حسابي</span></StorefrontLink></div>
      </section>
      <LuxeFullBottomNavigation
        className="order-confirmation-page__bottom-nav"
        profile={profile}
      />
    </section>
  );
}
