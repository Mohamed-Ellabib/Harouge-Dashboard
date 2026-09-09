import { useEffect } from "react";

import { useCart } from "../commerce/CartContext";
import { CheckIcon, ShieldCheckIcon } from "../components/Icons";
import { StorefrontLink } from "../lib/navigation";
import { formatStorefrontMoney } from "../lib/money";
import { storefrontUiText } from "../lib/localization";
import type { StorefrontProfileDto } from "../types";

export const OrderConfirmationPage = ({
  profile,
}: {
  profile: StorefrontProfileDto;
}) => {
  const { confirmation } = useCart();
  const text = (ar: string, en: string) =>
    storefrontUiText(profile.locale, { ar, en });

  useEffect(() => {
    document.title = `${text("تأكيد الطلب", "Order confirmation")} | ${profile.name}`;
  }, [profile.locale, profile.name]);

  if (!confirmation) {
    return (
      <section className="confirmation-page shell">
        <span className="confirmation-icon" aria-hidden="true">
          <ShieldCheckIcon />
        </span>
        <h1>{text("انتهت جلسة تأكيد الطلب", "The confirmation session has ended")}</h1>
        <p>{text(
          "لا نعرض تفاصيل الطلب بعد تحديث الصفحة حفاظًا على خصوصيتك. تواصل مع المتجر إذا احتجت إلى المساعدة.",
          "For your privacy, order details are not shown after a refresh. Contact the store if you need help.",
        )}</p>
        <StorefrontLink to="/products" className="button button--primary">
          {text("العودة إلى المنتجات", "Back to products")}
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
      <p className="confirmation-kicker">
        {text(`رقم الطلب ${confirmation.display_id}`, `Order ${confirmation.display_id}`)}
      </p>
      <h1 id="confirmation-title">{text("تم تأكيد طلبك", "Your order is confirmed")}</h1>
      <p>{text(
        "استلم المتجر طلبك. تواصل مع المتجر إذا احتجت إلى أي مساعدة.",
        "The store has received your order. Contact the store if you need any help.",
      )}</p>

      {confirmation.payment.method === "bank_transfer" ? (
        <section
          className="bank-transfer-confirmation"
          aria-labelledby="bank-transfer-title"
        >
          <h2 id="bank-transfer-title">
            {text("تعليمات التحويل المصرفي", "Bank transfer instructions")}
          </h2>
          <p>
            {text(
              "حالة الدفع: بانتظار تحقق المتجر.",
              "Payment status: awaiting verification by the store.",
            )}
          </p>
          <dl>
            <div>
              <dt>{text("المصرف", "Bank")}</dt>
              <dd>{confirmation.payment.bank_transfer.bank_name}</dd>
            </div>
            <div>
              <dt>{text("اسم صاحب الحساب", "Account holder")}</dt>
              <dd>{confirmation.payment.bank_transfer.account_holder_name}</dd>
            </div>
            <div>
              <dt>{text("رقم أو مرجع الحساب", "Account reference")}</dt>
              <dd>{confirmation.payment.bank_transfer.account_reference}</dd>
            </div>
          </dl>
          <p className="bank-transfer-confirmation__instructions">
            {confirmation.payment.bank_transfer.instructions}
          </p>
        </section>
      ) : (
        <p className="cod-confirmation">
          {text(
            "طريقة الدفع: الدفع عند الاستلام.",
            "Payment method: cash on delivery.",
          )}
        </p>
      )}

      <div className="confirmation-summary">
        <h2>{text("ملخص الطلب", "Order summary")}</h2>
        <ul>
          {confirmation.items.map((item, index) => (
            <li key={`${item.title}-${index}`}>
              <span>
                {item.title} × {item.quantity}
              </span>
              <strong>
                {formatStorefrontMoney(item.total, confirmation.currency_code, profile.locale)}
              </strong>
            </li>
          ))}
        </ul>
        <dl>
          <div>
            <dt>{text("المجموع الفرعي", "Subtotal")}</dt>
            <dd>
              {formatStorefrontMoney(
                confirmation.item_subtotal,
                confirmation.currency_code,
                profile.locale,
              )}
            </dd>
          </div>
          <div>
            <dt>{text("التوصيل", "Delivery")}</dt>
            <dd>
              {formatStorefrontMoney(
                confirmation.shipping_total,
                confirmation.currency_code,
                profile.locale,
              )}
            </dd>
          </div>
          <div className="confirmation-summary__total">
            <dt>{text("الإجمالي", "Total")}</dt>
            <dd>
              {formatStorefrontMoney(
                confirmation.total,
                confirmation.currency_code,
                profile.locale,
              )}
            </dd>
          </div>
        </dl>
      </div>

      <StorefrontLink to="/products" className="button button--primary">
        {text("متابعة التسوق", "Continue shopping")}
      </StorefrontLink>
    </section>
  );
};
