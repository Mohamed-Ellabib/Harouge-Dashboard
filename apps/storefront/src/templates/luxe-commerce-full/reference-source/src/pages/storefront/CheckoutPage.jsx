import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  Clock,
  CreditCard,
  Glasses,
  Home,
  Loader2,
  MapPin,
  PenLine,
  Phone,
  ShieldCheck,
  ShoppingBag,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import apiServerClient from '@/lib/apiServerClient.js';
import { clearCartItems, readCartItems } from '@/lib/storefrontCart.js';
import { calculateAppliedCouponDiscount, clearAppliedCoupon, readAppliedCoupon } from '@/lib/storefrontCoupon.js';
import {
  DEFAULT_CHECKOUT_SETTINGS,
  calculateShippingFee,
  getFreeShippingRemaining,
  normalizeCheckoutSettings,
} from '@/lib/checkoutSettings.js';
import { normalizeCurrency } from '@/lib/productPricing.js';
import { getProductStockMeta } from '@/lib/productStock.js';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext.jsx';
import './CheckoutPage.css';

const bottomNavItems = [
  { label: 'الرئيسية', href: '/store', icon: Home },
  { label: 'النظارات', href: '/sunglasses', icon: Glasses },
  { label: 'الساعات', href: '/watches', icon: Clock },
  { label: 'الأقلام', href: '/pens', icon: PenLine },
  { label: 'الحساب', href: '/account', icon: User },
];

function formatMoney(value, currency = 'LYD') {
  return `${normalizeCurrency(currency)} ${Number(value || 0).toLocaleString('en-US')}`;
}

function sortImages(images = []) {
  return [...images].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1;
    if (!a.is_primary && b.is_primary) return 1;
    return (a.sort_order || 0) - (b.sort_order || 0);
  });
}

function getProductImage(product) {
  const primaryImage = sortImages(product?.product_images || []).find((image) => image.image_url);
  return primaryImage?.image_url || product?.primary_image_url || '';
}

function getProductName(product) {
  return product?.name_ar || product?.name_en || product?.sku || 'منتج';
}

function getPaymentMethodHint(method = {}) {
  if (['cash', 'cash_on_delivery'].includes(method.code)) {
    return 'يتم الدفع عند استلام الطلب';
  }

  if (method.code === 'bank_transfer') {
    return 'سنتواصل معك بتفاصيل التحويل بعد تأكيد الطلب';
  }

  return '';
}

async function readApiMessage(response) {
  try {
    const payload = await response.json();
    return payload?.error || payload?.message || 'تعذر إتمام الطلب. حاول مرة أخرى.';
  } catch {
    return 'تعذر إتمام الطلب. حاول مرة أخرى.';
  }
}

function validateForm(values) {
  const errors = {};

  if (!values.fullName.trim()) errors.fullName = 'اسم المستلم مطلوب.';
  if (!values.phone.trim()) errors.phone = 'رقم الهاتف مطلوب.';
  if (!values.city.trim()) errors.city = 'المدينة مطلوبة.';
  if (!values.addressLine1.trim()) errors.addressLine1 = 'العنوان مطلوب.';

  return errors;
}

function normalizeOtpCode(value) {
  return String(value || '')
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(/\D/g, '')
    .slice(0, 6);
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const {
    currentCustomer,
    customerSession,
    isCustomerAuthenticated,
    isCustomerLoading,
    getCustomerSettings,
  } = useCustomerAuth();
  const [cartEntries, setCartEntries] = useState(() => readCartItems());
  const [appliedCoupon] = useState(() => readAppliedCoupon());
  const [productsById, setProductsById] = useState(() => new Map());
  const [checkoutSettings, setCheckoutSettings] = useState(DEFAULT_CHECKOUT_SETTINGS);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedPaymentId, setSelectedPaymentId] = useState('');
  const [formValues, setFormValues] = useState({
    fullName: currentCustomer?.fullName || currentCustomer?.full_name || '',
    phone: currentCustomer?.phone || '',
    city: '',
    addressLine1: '',
    addressLine2: '',
    notes: '',
  });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [guestVerification, setGuestVerification] = useState({
    status: 'idle',
    phone: '',
    expiresInSeconds: 0,
    summary: null,
  });

  const isGuestCheckout = !isCustomerAuthenticated;

  function resetGuestVerification() {
    if (guestVerification.status === 'idle') return;
    setGuestVerification({
      status: 'idle',
      phone: '',
      expiresInSeconds: 0,
      summary: null,
    });
    setVerificationCode('');
  }

  useEffect(() => {
    if (!currentCustomer) return;

    setFormValues((current) => ({
      ...current,
      fullName: current.fullName || currentCustomer.fullName || currentCustomer.full_name || '',
      phone: current.phone || currentCustomer.phone || currentCustomer.phoneNumber || '',
    }));
  }, [currentCustomer]);

  useEffect(() => {
    if (isCustomerLoading) return undefined;

    const controller = new AbortController();

    async function loadCheckoutData() {
      const activeCart = readCartItems();
      setCartEntries(activeCart);

      if (activeCart.length === 0) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);

        const headers = customerSession?.accessToken
          ? { Authorization: `Bearer ${customerSession.accessToken}` }
          : {};

        const customerSettingsPromise = customerSession?.accessToken
          ? getCustomerSettings().catch(() => null)
          : Promise.resolve(null);

        const [optionsResponse, productResults, customerSettingsPayload] = await Promise.all([
          apiServerClient.fetch('/customer/orders/checkout-options', {
            headers,
            signal: controller.signal,
          }),
          Promise.all(activeCart.map(async (entry) => {
            const response = await apiServerClient.fetch(`/products/${encodeURIComponent(entry.productId)}`, {
              signal: controller.signal,
            });
            if (!response.ok) return null;
            return response.json();
          })),
          customerSettingsPromise,
        ]);

        if (!optionsResponse.ok) {
          throw new Error(await readApiMessage(optionsResponse));
        }

        const options = await optionsResponse.json();
        const nextPaymentMethods = options.paymentMethods || [];

        setPaymentMethods(nextPaymentMethods);
        setCheckoutSettings(normalizeCheckoutSettings(options.checkoutSettings));
        setSelectedPaymentId((current) => current || nextPaymentMethods[0]?.id || '');
        setProductsById(new Map(productResults.filter(Boolean).map((product) => [product.id, product])));
        if (customerSettingsPayload?.address) {
          setFormValues((current) => ({
            ...current,
            city: current.city || customerSettingsPayload.address.city || '',
            addressLine1: current.addressLine1 || customerSettingsPayload.address.addressLine1 || '',
            addressLine2: current.addressLine2 || customerSettingsPayload.address.addressLine2 || '',
          }));
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          setSubmitError(error.message || 'تعذر تحميل بيانات إتمام الطلب.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    loadCheckoutData();

    return () => controller.abort();
  }, [customerSession?.accessToken, getCustomerSettings, isCustomerLoading]);

  const items = useMemo(() => cartEntries.map((entry) => {
    const product = productsById.get(entry.productId);
    if (!product) return null;
    const price = Number(product.sale_price || product.price || 0);
    const stockMeta = getProductStockMeta(product);
    const quantity = stockMeta.isAvailable && stockMeta.requiresStock
      ? Math.min(entry.quantity, Math.max(1, stockMeta.availableQuantity))
      : entry.quantity;
    const purchaseQuantity = stockMeta.isAvailable ? quantity : 0;

    return {
      productId: product.id,
      title: getProductName(product),
      subtitle: product.name_en || product.sku || '',
      image: getProductImage(product),
      quantity,
      purchaseQuantity,
      price,
      currency: normalizeCurrency(product.currency),
      lineTotal: price * purchaseQuantity,
      isAvailable: stockMeta.isAvailable,
      stockLabel: stockMeta.stockLabel,
    };
  }).filter(Boolean), [cartEntries, productsById]);

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.lineTotal, 0), [items]);
  const discountTotal = useMemo(
    () => calculateAppliedCouponDiscount(appliedCoupon, subtotal),
    [appliedCoupon, subtotal],
  );
  const discountedSubtotal = Math.max(0, subtotal - discountTotal);
  const shippingFee = useMemo(
    () => calculateShippingFee(subtotal, checkoutSettings),
    [checkoutSettings, subtotal],
  );
  const freeShippingRemaining = useMemo(
    () => getFreeShippingRemaining(subtotal, checkoutSettings),
    [checkoutSettings, subtotal],
  );
  const grandTotal = Number((discountedSubtotal + shippingFee).toFixed(2));
  const itemCount = useMemo(() => items.reduce((sum, item) => sum + item.purchaseQuantity, 0), [items]);
  const hasUnavailableItems = useMemo(() => items.some((item) => !item.isAvailable), [items]);

  function updateField(event) {
    const { name, value } = event.target;
    setFormValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: '' }));
    setSubmitError('');
    resetGuestVerification();
  }

  function updatePaymentMethod(methodId) {
    setSelectedPaymentId(methodId);
    setSubmitError('');
    resetGuestVerification();
  }

  function buildOrderPayload() {
    return {
      items: items
        .filter((item) => item.isAvailable && item.purchaseQuantity > 0)
        .map((item) => ({ productId: item.productId, quantity: item.purchaseQuantity })),
      address: formValues,
      paymentMethodId: selectedPaymentId || null,
      shippingMethodId: null,
      couponCode: discountTotal > 0 ? appliedCoupon?.code : null,
      notes: formValues.notes,
    };
  }

  async function submitAuthenticatedOrder(orderPayload) {
    const response = await apiServerClient.fetch('/customer/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerSession.accessToken}`,
      },
      body: JSON.stringify(orderPayload),
    });

    if (!response.ok) {
      throw new Error(await readApiMessage(response));
    }

    const payload = await response.json();
    clearCartItems();
    clearAppliedCoupon();
    toast.success('تم تأكيد الطلب بنجاح.');
    navigate(`/order-confirmation/${payload.order.id}`, {
      replace: true,
      state: { order: payload.order },
    });
  }

  async function requestGuestOrderOtp(orderPayload) {
    const response = await apiServerClient.fetch('/customer/orders/guest/request-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderPayload),
    });

    if (!response.ok) {
      throw new Error(await readApiMessage(response));
    }

    const payload = await response.json();
    setGuestVerification({
      status: 'code_sent',
      phone: payload.phone,
      expiresInSeconds: payload.expiresInSeconds || 0,
      summary: payload.summary || null,
    });
    setVerificationCode('');
    toast.success('أرسلنا رمز التحقق عبر واتساب.');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const validationErrors = validateForm(formValues);
    setErrors(validationErrors);
    setSubmitError('');

    if (Object.keys(validationErrors).length > 0) return;
    if (cartEntries.length === 0) {
      navigate('/cart');
      return;
    }

    if (hasUnavailableItems || itemCount <= 0) {
      setSubmitError('احذف المنتجات غير المتوفرة من السلة قبل تأكيد الطلب.');
      return;
    }

    try {
      setIsSubmitting(true);
      const orderPayload = buildOrderPayload();

      if (isCustomerAuthenticated) {
        await submitAuthenticatedOrder(orderPayload);
      } else {
        await requestGuestOrderOtp(orderPayload);
      }
    } catch (error) {
      setSubmitError(error.message || 'تعذر إتمام الطلب. حاول مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerifyGuestOrder() {
    const normalizedCode = normalizeOtpCode(verificationCode);
    setSubmitError('');

    if (normalizedCode.length !== 6) {
      setSubmitError('أدخل رمز التحقق المكون من 6 أرقام.');
      return;
    }

    try {
      setIsVerifying(true);
      const response = await apiServerClient.fetch('/customer/orders/guest/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: guestVerification.phone || formValues.phone,
          code: normalizedCode,
        }),
      });

      if (!response.ok) {
        throw new Error(await readApiMessage(response));
      }

      const payload = await response.json();
      clearCartItems();
      clearAppliedCoupon();
      toast.success('تم تأكيد الطلب بنجاح.');
      navigate(`/order-confirmation/${payload.order.id}`, {
        replace: true,
        state: { order: payload.order },
      });
    } catch (error) {
      setSubmitError(error.message || 'تعذر تأكيد الرمز. حاول مرة أخرى.');
    } finally {
      setIsVerifying(false);
    }
  }

  if (isCustomerLoading || isLoading) {
    return (
      <main className="checkout-page" dir="rtl">
        <div className="checkout-page__loading">
          <Loader2 aria-hidden="true" />
          <span>جاري تجهيز صفحة إتمام الطلب</span>
        </div>
      </main>
    );
  }

  return (
    <main className="checkout-page" dir="rtl">
      <div className="checkout-page__shell">
        <header className="checkout-page__header">
          <button type="button" onClick={() => navigate(-1)} aria-label="الرجوع">
            <ChevronLeft aria-hidden="true" />
          </button>
          <div>
            <span>إتمام الطلب</span>
            <h1>تأكيد بيانات الشراء</h1>
          </div>
          <ShoppingBag aria-hidden="true" />
        </header>

        {cartEntries.length === 0 ? (
          <section className="checkout-page__empty">
            <ShoppingBag aria-hidden="true" />
            <h2>السلة فارغة</h2>
            <p>أضف منتجات إلى السلة قبل إتمام الطلب.</p>
            <Link to="/watches">العودة للتسوق</Link>
          </section>
        ) : (
          <form className="checkout-page__content" onSubmit={handleSubmit}>
            <section className="checkout-page__panel checkout-page__panel--address">
              <div className="checkout-page__panel-title">
                <MapPin aria-hidden="true" />
                <div>
                  <span>بيانات التوصيل</span>
                  <h2>العنوان ورقم الهاتف</h2>
                </div>
              </div>

              {isGuestCheckout ? (
                <p className="checkout-page__guest-note">
                  يمكنك إتمام الطلب بدون حساب. سنرسل رمز تحقق عبر واتساب قبل تثبيت الطلب.
                </p>
              ) : null}

              <label className="checkout-page__field">
                <span>اسم المستلم</span>
                <input name="fullName" value={formValues.fullName} onChange={updateField} autoComplete="name" />
                {errors.fullName ? <em>{errors.fullName}</em> : null}
              </label>

              <label className="checkout-page__field">
                <span>رقم الهاتف</span>
                <input name="phone" value={formValues.phone} onChange={updateField} dir="ltr" inputMode="tel" autoComplete="tel" />
                {errors.phone ? <em>{errors.phone}</em> : null}
              </label>

              <label className="checkout-page__field">
                <span>المدينة</span>
                <input name="city" value={formValues.city} onChange={updateField} placeholder="مثال: طرابلس" />
                {errors.city ? <em>{errors.city}</em> : null}
              </label>

              <label className="checkout-page__field">
                <span>العنوان</span>
                <input name="addressLine1" value={formValues.addressLine1} onChange={updateField} placeholder="المنطقة، الشارع، أقرب نقطة دالة" />
                {errors.addressLine1 ? <em>{errors.addressLine1}</em> : null}
              </label>

              <label className="checkout-page__field">
                <span>تفاصيل إضافية</span>
                <input name="addressLine2" value={formValues.addressLine2} onChange={updateField} placeholder="اختياري" />
              </label>

              <label className="checkout-page__field">
                <span>ملاحظات الطلب</span>
                <textarea name="notes" value={formValues.notes} onChange={updateField} placeholder="اختياري" />
              </label>
            </section>

            <section className="checkout-page__panel">
              <div className="checkout-page__panel-title">
                <CreditCard aria-hidden="true" />
                <div>
                  <span>طريقة الدفع</span>
                  <h2>اختر طريقة الدفع المناسبة</h2>
                </div>
              </div>

              <div className="checkout-page__options">
                {(paymentMethods.length ? paymentMethods : [{ id: '', name_ar: 'الدفع عند الاستلام', code: 'cash' }]).map((method) => (
                  <label className="checkout-page__option" key={method.id || method.code}>
                    <input
                      checked={selectedPaymentId === method.id}
                      name="paymentMethod"
                      onChange={() => updatePaymentMethod(method.id)}
                      type="radio"
                    />
                    <span>
                      <b>{method.name_ar || method.name_en}</b>
                      <small>{getPaymentMethodHint(method)}</small>
                    </span>
                    <CheckCircle2 aria-hidden="true" />
                  </label>
                ))}
              </div>
            </section>

            <section className="checkout-page__panel checkout-page__panel--summary">
              <div className="checkout-page__panel-title">
                <ShoppingBag aria-hidden="true" />
                <div>
                  <span>مراجعة الطلب</span>
                  <h2>{itemCount} قطعة في السلة</h2>
                </div>
              </div>

              <div className="checkout-page__items">
                {items.map((item) => (
                  <article className={item.isAvailable ? 'checkout-page__item' : 'checkout-page__item checkout-page__item--unavailable'} key={item.productId}>
                    <span>{item.quantity}</span>
                    <div>
                      <b>{item.title}</b>
                      <small>{item.isAvailable ? formatMoney(item.lineTotal, item.currency) : 'غير متوفر للشراء'}</small>
                      {item.stockLabel ? (
                        <em className={item.isAvailable ? 'checkout-page__stock-note' : 'checkout-page__stock-note checkout-page__stock-note--sold-out'}>
                          {item.stockLabel}
                        </em>
                      ) : null}
                    </div>
                    {item.image ? <img src={item.image} alt="" /> : <ShoppingBag aria-hidden="true" />}
                  </article>
                ))}
              </div>

              <div className="checkout-page__totals">
                <div>
                  <span>إجمالي المنتجات</span>
                  <b>{formatMoney(subtotal)}</b>
                </div>
                {discountTotal > 0 ? (
                  <div className="checkout-page__discount-row">
                    <span>خصم الكوبون</span>
                    <b>-{formatMoney(discountTotal)}</b>
                  </div>
                ) : null}
                <div>
                  <span>التوصيل</span>
                  <b>{shippingFee > 0 ? formatMoney(shippingFee) : 'مجاني'}</b>
                </div>
                {freeShippingRemaining > 0 ? (
                  <p className="checkout-page__shipping-note">
                    {`أضف منتجات بقيمة ${formatMoney(freeShippingRemaining)} للحصول على شحن مجاني.`}
                  </p>
                ) : null}
                <strong>
                  <span>الإجمالي</span>
                  <b>{formatMoney(grandTotal)}</b>
                </strong>
              </div>

              {guestVerification.status === 'code_sent' && isGuestCheckout ? (
                <div className="checkout-page__otp">
                  <div className="checkout-page__otp-header">
                    <Phone aria-hidden="true" />
                    <div>
                      <span>تحقق عبر واتساب</span>
                      <p>أدخل الرمز المرسل عبر واتساب إلى {guestVerification.phone} لتثبيت الطلب.</p>
                    </div>
                  </div>

                  <div className="checkout-page__otp-control">
                    <input
                      aria-label="رمز التحقق"
                      dir="ltr"
                      inputMode="numeric"
                      maxLength={6}
                      onChange={(event) => setVerificationCode(normalizeOtpCode(event.target.value))}
                      placeholder="000000"
                      value={verificationCode}
                    />
                    <button type="button" onClick={handleVerifyGuestOrder} disabled={isVerifying}>
                      {isVerifying ? <Loader2 aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}
                      <span>{isVerifying ? 'جاري التأكيد' : 'تأكيد الرمز'}</span>
                    </button>
                  </div>
                </div>
              ) : null}

              {hasUnavailableItems ? (
                <div className="checkout-page__error" role="alert">
                  <AlertCircle aria-hidden="true" />
                  <span>احذف المنتجات غير المتوفرة من السلة قبل تأكيد الطلب.</span>
                </div>
              ) : submitError ? (
                <div className="checkout-page__error" role="alert">
                  <AlertCircle aria-hidden="true" />
                  <span>{submitError}</span>
                </div>
              ) : null}

              <button className="checkout-page__submit" type="submit" disabled={isSubmitting || hasUnavailableItems || itemCount <= 0}>
                {isSubmitting ? <Loader2 aria-hidden="true" /> : (isGuestCheckout ? <Phone aria-hidden="true" /> : <ShieldCheck aria-hidden="true" />)}
                <span>
                  {isSubmitting
                    ? 'جاري تأكيد الطلب'
                    : isGuestCheckout && guestVerification.status === 'code_sent'
                      ? 'إرسال رمز جديد'
                      : isGuestCheckout
                        ? 'إرسال رمز التأكيد'
                        : 'تأكيد الطلب'}
                </span>
              </button>

              <p className="checkout-page__secure">
                <Phone aria-hidden="true" />
                <span>
                  {isGuestCheckout
                    ? 'لن يتم تثبيت الطلب إلا بعد تأكيد رمز واتساب.'
                    : 'سيتواصل فريق المتجر معك لتأكيد التفاصيل قبل التجهيز.'}
                </span>
              </p>
            </section>
          </form>
        )}
      </div>

      <nav className="customer-bottom-nav checkout-page__bottom-nav" aria-label="التنقل السفلي">
        {bottomNavItems.map((item) => {
          const Icon = item.icon;

          return (
            <Link to={item.href} key={`${item.href}-${item.label}`}>
              <Icon aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </main>
  );
}
