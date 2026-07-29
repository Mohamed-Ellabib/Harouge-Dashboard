import { useEffect } from "react";

import { useCart } from "../commerce/CartContext";
import { CheckIcon, ShieldCheckIcon } from "../components/Icons";
import { StorefrontLink } from "../lib/navigation";
import { formatStorefrontMoney } from "../lib/money";
import type { StorefrontProfileDto } from "../types";

export const OrderConfirmationPage = ({
  profile,
}: {
  profile: StorefrontProfileDto;
}) => {
  const { confirmation } = useCart();

  useEffect(() => {
    document.title = `تأكيد الطلب | ${profile.name}`;
  }, [profile.name]);

  if (!confirmation) {
    return (
      <section className="confirmation-page shell">
        <span className="confirmation-icon" aria-hidden="true">
          <ShieldCheckIcon />
        </span>
        <h1>انتهت جلسة تأكيد الطلب</h1>
        <p>
          لا نعرض تفاصيل الطلب بعد تحديث الصفحة حفاظًا على خصوصيتك. تواصل مع
          المتجر إذا احتجت إلى المساعدة.
        </p>
        <StorefrontLink to="/products" className="button button--primary">
          العودة إلى المنتجات
        </StorefrontLink>
      </section>
    );
  }

  return (
    <section
      className="confirmation-page shell"
      aria-labelledby="confirmation-title"
    >
      <span className="confirmation-icon" aria-hidden="true">
        <CheckIcon />
      </span>
      <p className="confirmation-kicker">رقم العرض {confirmation.display_id}</p>
      <h1 id="confirmation-title">تم تأكيد طلبك التجريبي</h1>
      <p>
        استلم المتجر الطلب داخل النظام. لم يتم تحصيل دفعة فعلية أو حجز شركة
        توصيل في هذا الاختبار المحلي.
      </p>

      <div className="confirmation-summary">
        <h2>ملخص الطلب</h2>
        <ul>
          {confirmation.items.map((item, index) => (
            <li key={`${item.title}-${index}`}>
              <span>
                {item.title} × {item.quantity}
              </span>
              <strong>
                {formatStorefrontMoney(item.total, confirmation.currency_code)}
              </strong>
            </li>
          ))}
        </ul>
        <dl>
          <div>
            <dt>المجموع الفرعي</dt>
            <dd>
              {formatStorefrontMoney(
                confirmation.item_subtotal,
                confirmation.currency_code,
              )}
            </dd>
          </div>
          <div>
            <dt>التوصيل</dt>
            <dd>
              {formatStorefrontMoney(
                confirmation.shipping_total,
                confirmation.currency_code,
              )}
            </dd>
          </div>
          <div className="confirmation-summary__total">
            <dt>الإجمالي</dt>
            <dd>
              {formatStorefrontMoney(
                confirmation.total,
                confirmation.currency_code,
              )}
            </dd>
          </div>
        </dl>
      </div>

      <StorefrontLink to="/products" className="button button--primary">
        متابعة التسوق
      </StorefrontLink>
    </section>
  );
};
