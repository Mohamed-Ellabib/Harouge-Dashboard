import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  Clock,
  CreditCard,
  Glasses,
  Headphones,
  Home,
  Loader2,
  MapPin,
  Package,
  PackageCheck,
  PenLine,
  Phone,
  ShoppingBag,
  Truck,
  User,
  XCircle,
} from 'lucide-react';
import apiServerClient from '@/lib/apiServerClient.js';
import { CART_CHANGE_EVENT, getCartItemCount } from '@/lib/storefrontCart.js';
import {
  CUSTOMER_ORDERS_REFRESH_INTERVAL_MS,
  cacheCustomerOrderSummary,
  readCachedCustomerOrderSummary,
  subscribeToCustomerOrderUpdates,
} from '@/lib/customerOrderUpdates.js';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext.jsx';
import './OrderDetailPage.css';
import './StorefrontSurface.css';

const fallbackImage = '/product-assets/04-blue-dial-steel.webp';

const bottomNavItems = [
  { label: 'الرئيسية', href: '/store', icon: Home },
  { label: 'النظارات', href: '/sunglasses', icon: Glasses },
  { label: 'الساعات', href: '/watches', icon: Clock },
  { label: 'الأقلام', href: '/pens', icon: PenLine },
  { label: 'الحساب', href: '/account', icon: User },
];

const timelineSteps = [
  { key: 'under_process', label: 'قيد المراجعة', icon: PackageCheck },
  { key: 'accepted', label: 'قبول الطلب', icon: CheckCircle2 },
  { key: 'preparing', label: 'تجهيز الطلب', icon: Package },
  { key: 'ready', label: 'جاهز للتوصيل', icon: PackageCheck },
  { key: 'out_for_delivery', label: 'خرج للتوصيل', icon: Truck },
  { key: 'delivered', label: 'تم التسليم', icon: CheckCircle2 },
];

const workflowStepIndex = {
  under_process: 0,
  accepted: 1,
  preparing: 2,
  ready: 3,
  for_delivery: 3,
  out_for_delivery: 4,
  delivered: 5,
};

function formatMoney(value, currency = 'LYD') {
  return `${currency} ${Number(value || 0).toLocaleString('en-US')}`;
}

function formatDate(value) {
  if (!value) return '';

  return new Intl.DateTimeFormat('ar-LY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Africa/Tripoli',
  }).format(new Date(value));
}

function formatDateTime(value) {
  if (!value) return '';

  return new Intl.DateTimeFormat('ar-LY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Tripoli',
  }).format(new Date(value));
}

async function readApiMessage(response) {
  try {
    const payload = await response.json();
    return payload?.error || payload?.message || 'تعذر تحميل تفاصيل الطلب. حاول مرة أخرى.';
  } catch {
    return 'تعذر تحميل تفاصيل الطلب. حاول مرة أخرى.';
  }
}

function getStepDate(order, stepKey) {
  if (!order) return '';
  if (stepKey === 'under_process') return formatDate(order.placedAt);
  if (stepKey === 'accepted') return formatDate(order.confirmedAt || order.placedAt);
  if (stepKey === 'ready') return formatDate(order.updatedAt);
  if (stepKey === 'out_for_delivery') return formatDate(order.shipping?.shippedAt || order.updatedAt);
  if (stepKey === 'delivered') return formatDate(order.shipping?.deliveredAt);
  return '';
}

function normalizeOrderDetail(rawOrder, orderId) {
  if (!rawOrder) return null;

  const items = (rawOrder.items || []).map((item, index) => {
    const quantity = Math.max(1, Number(item.quantity || 1));
    const rawLineTotal = Number(item.lineTotal);
    const rawUnitPrice = Number(item.unitPrice);
    const lineTotal = Number.isFinite(rawLineTotal)
      ? rawLineTotal
      : Number.isFinite(rawUnitPrice)
        ? rawUnitPrice * quantity
        : 0;

    return {
      id: item.id || `${orderId}-item-${index}`,
      productId: item.productId || null,
      sku: item.sku || '',
      name: item.name || item.productName || 'منتج',
      brand: item.brand || item.nameEn || item.sku || '',
      quantity,
      unitPrice: Number.isFinite(rawUnitPrice) ? rawUnitPrice : lineTotal / quantity,
      lineTotal,
      imageUrl: item.imageUrl || null,
      imageAlt: item.imageAlt || item.name || '',
    };
  });
  const itemSubtotal = items.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0);
  const subtotal = Number(rawOrder.subtotal ?? itemSubtotal);
  const shippingFee = Number(rawOrder.shippingFee || 0);
  const discountTotal = Number(rawOrder.discountTotal || 0);
  const grandTotal = Number(rawOrder.grandTotal ?? Math.max(0, subtotal + shippingFee - discountTotal));

  return {
    ...rawOrder,
    id: rawOrder.id || orderId,
    orderNumber: rawOrder.orderNumber || rawOrder.rawOrderNumber || `#${orderId}`,
    workflowStatus: rawOrder.workflowStatus || 'under_process',
    statusLabel: rawOrder.statusLabel || 'قيد التنفيذ',
    statusDetailLabel: rawOrder.statusDetailLabel || 'جاري التجهيز',
    statusTone: rawOrder.statusTone || 'processing',
    currency: rawOrder.currency || 'LYD',
    subtotal,
    discountTotal,
    taxTotal: Number(rawOrder.taxTotal || 0),
    shippingFee,
    grandTotal,
    placedAt: rawOrder.placedAt || rawOrder.createdAt || '',
    confirmedAt: rawOrder.confirmedAt || '',
    updatedAt: rawOrder.updatedAt || rawOrder.placedAt || rawOrder.createdAt || '',
    shippingAddress: rawOrder.shippingAddress || {},
    billingAddress: rawOrder.billingAddress || {},
    itemCount: Number(rawOrder.itemCount ?? items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)),
    payment: rawOrder.payment || {},
    shipping: rawOrder.shipping || {},
    items,
  };
}

export default function OrderDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { orderId } = useParams();
  const stateOrderSummary = location.state?.orderSummary;
  const summaryOrder = useMemo(
    () => normalizeOrderDetail(stateOrderSummary || readCachedCustomerOrderSummary(orderId), orderId),
    [orderId, stateOrderSummary],
  );
  const {
    customerSession,
    isCustomerAuthenticated,
    isCustomerLoading,
  } = useCustomerAuth();
  const [order, setOrder] = useState(() => summaryOrder);
  const [cartCount, setCartCount] = useState(() => getCartItemCount());
  const [isLoading, setIsLoading] = useState(() => !summaryOrder);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!isCustomerLoading && !isCustomerAuthenticated) {
      navigate('/account', {
        replace: true,
        state: {
          authMessage: 'سجل الدخول أولاً لعرض تفاصيل الطلب.',
          redirectTo: `/order-details/${orderId}`,
        },
      });
    }
  }, [isCustomerAuthenticated, isCustomerLoading, navigate, orderId]);

  useEffect(() => {
    if (!summaryOrder) return;

    setOrder(summaryOrder);
    setErrorMessage('');
    setIsLoading(false);
  }, [summaryOrder]);

  useEffect(() => {
    function refreshCartCount() {
      setCartCount(getCartItemCount());
    }

    window.addEventListener(CART_CHANGE_EVENT, refreshCartCount);
    window.addEventListener('storage', refreshCartCount);

    return () => {
      window.removeEventListener(CART_CHANGE_EVENT, refreshCartCount);
      window.removeEventListener('storage', refreshCartCount);
    };
  }, []);

  const loadOrder = useCallback(async ({ signal, silent = false } = {}) => {
    if (!isCustomerAuthenticated || !customerSession?.accessToken || !orderId) return;

    try {
      if (!silent && !summaryOrder) {
        setIsLoading(true);
      }
      setErrorMessage('');

      const response = await apiServerClient.fetch(`/customer/orders/${orderId}`, {
        headers: {
          Authorization: `Bearer ${customerSession.accessToken}`,
        },
        signal,
      });

      if (!response.ok) {
        throw new Error(await readApiMessage(response));
      }

      const payload = await response.json();
      const fullOrder = normalizeOrderDetail(payload.order, orderId);
      setOrder(fullOrder);
      cacheCustomerOrderSummary(fullOrder);
    } catch (error) {
      if (error.name !== 'AbortError' && !silent && !summaryOrder) {
        setErrorMessage(error.message || 'تعذر تحميل تفاصيل الطلب. حاول مرة أخرى.');
        setOrder(null);
      }
    } finally {
      if (!signal?.aborted && !silent) {
        setIsLoading(false);
      }
    }
  }, [customerSession?.accessToken, isCustomerAuthenticated, orderId, summaryOrder]);

  useEffect(() => {
    if (!isCustomerAuthenticated || !customerSession?.accessToken || !orderId) return undefined;

    const controller = new AbortController();

    function refreshSilently(update = {}) {
      if (document.visibilityState === 'hidden') return;
      if (update.orderId && update.orderId !== orderId) return;
      loadOrder({ signal: controller.signal, silent: true });
    }

    function refreshWhenVisible() {
      if (document.visibilityState === 'visible') {
        loadOrder({ signal: controller.signal, silent: true });
      }
    }

    loadOrder({ signal: controller.signal, silent: Boolean(summaryOrder) });

    const intervalId = window.setInterval(refreshSilently, CUSTOMER_ORDERS_REFRESH_INTERVAL_MS);
    const unsubscribeOrderUpdates = subscribeToCustomerOrderUpdates(refreshSilently);

    window.addEventListener('focus', refreshSilently);
    document.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      controller.abort();
      window.clearInterval(intervalId);
      unsubscribeOrderUpdates();
      window.removeEventListener('focus', refreshSilently);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [customerSession?.accessToken, isCustomerAuthenticated, loadOrder, orderId, summaryOrder]);

  const activeStepIndex = useMemo(() => {
    if (!order || order.workflowStatus === 'cancelled' || order.workflowStatus === 'delivery_failed') return 0;
    return workflowStepIndex[order.workflowStatus] ?? 0;
  }, [order]);

  const isStoppedOrder = order && ['cancelled', 'delivery_failed'].includes(order.workflowStatus);
  const stoppedOrderLabel = order?.workflowStatus === 'delivery_failed' ? 'تعذر تسليم الطلب' : 'تم إلغاء الطلب';
  const stoppedOrderDetail = order?.statusDetailLabel || stoppedOrderLabel;

  const timelineProgress = isStoppedOrder
    ? 100
    : timelineSteps.length > 1
      ? (activeStepIndex / (timelineSteps.length - 1)) * 100
    : 0;

  if (isCustomerLoading || !isCustomerAuthenticated || (isLoading && !order)) {
    return (
      <main className="order-detail-page" dir="rtl">
        <div className="order-detail-page__loading">
          <Loader2 aria-hidden="true" />
          <span>جاري تحميل تفاصيل الطلب</span>
        </div>
      </main>
    );
  }

  if (errorMessage || !order) {
    return (
      <main className="order-detail-page" dir="rtl">
        <div className="order-detail-page__state-card">
          <XCircle aria-hidden="true" />
          <h1>تعذر عرض الطلب</h1>
          <p>{errorMessage || 'لم يتم العثور على الطلب المطلوب.'}</p>
          <Link to="/orders">العودة إلى طلباتي</Link>
        </div>
      </main>
    );
  }

  const shippingAddress = order.shippingAddress || {};
  const payment = order.payment || {};
  const shipping = order.shipping || {};

  return (
    <main className="order-detail-page" dir="rtl">
      <header className="order-detail-page__topbar" aria-label="تفاصيل الطلب">
        <button type="button" onClick={() => navigate(-1)} aria-label="الرجوع">
          <ChevronLeft aria-hidden="true" />
        </button>

        <strong>تفاصيل الطلب</strong>

        <Link to="/cart" aria-label="سلة التسوق">
          <ShoppingBag aria-hidden="true" />
          <span>{cartCount}</span>
        </Link>
      </header>

      <section className="order-detail-page__hero" aria-label="ملخص الطلب">
        <div className="order-detail-page__hero-art" aria-hidden="true" />
        <div className="order-detail-page__hero-copy">
          <span>طلبك الحالي</span>
          <h1 dir="ltr">{order.orderNumber}</h1>
          <time dateTime={order.placedAt}>
            <CalendarClock aria-hidden="true" />
            {formatDate(order.placedAt)}
          </time>
          <span className={`order-detail-page__status-pill order-detail-page__status-pill--${order.statusTone}`}>
            <PackageCheck aria-hidden="true" />
            {order.statusLabel}
          </span>
        </div>
      </section>

      <div className="order-detail-page__content">
        <section
          className={[
            'order-detail-page__timeline-panel',
            isStoppedOrder ? 'order-detail-page__timeline-panel--stopped' : '',
          ].filter(Boolean).join(' ')}
          style={{ '--timeline-progress': `${timelineProgress}%` }}
          aria-label="حالة الطلب"
        >
          {isStoppedOrder ? (
            <div className="order-detail-page__timeline-stop-badge">
              <XCircle aria-hidden="true" />
              <strong>{stoppedOrderLabel}</strong>
              <span>{stoppedOrderDetail}</span>
            </div>
          ) : null}
          <span className="order-detail-page__timeline-line" aria-hidden="true" />
          {timelineSteps.map((step, index) => {
            const isStoppedMarker = isStoppedOrder && index === 0;
            const Icon = isStoppedMarker ? XCircle : step.icon;
            const isDone = index < activeStepIndex;
            const isCurrent = !isStoppedOrder && index === activeStepIndex;
            const stepDate = getStepDate(order, step.key);

            return (
              <div
                className={[
                  'order-detail-page__timeline-step',
                  isStoppedMarker ? 'is-stopped' : '',
                  isDone ? 'is-done' : '',
                  isCurrent ? 'is-current' : '',
                  index > activeStepIndex && !isStoppedOrder ? 'is-pending' : '',
                ].filter(Boolean).join(' ')}
                key={step.key}
              >
                <strong>{step.label}</strong>
                <span>
                  <Icon aria-hidden="true" />
                </span>
                {stepDate ? <time dateTime={order.placedAt}>{stepDate}</time> : <small>قيد الانتظار</small>}
              </div>
            );
          })}
        </section>

        <section className="order-detail-page__info-panel" aria-labelledby="order-detail-info-title">
          <h2 id="order-detail-info-title">معلومات الطلب</h2>
          <div className="order-detail-page__info-grid">
            <div className="order-detail-page__info-column">
              <div className="order-detail-page__info-row">
                <span>رقم الطلب</span>
                <PackageCheck aria-hidden="true" />
                <b dir="ltr">{order.orderNumber}</b>
              </div>
              <div className="order-detail-page__info-row">
                <span>تاريخ الطلب</span>
                <CalendarClock aria-hidden="true" />
                <b>{formatDateTime(order.placedAt)}</b>
              </div>
              <div className="order-detail-page__info-row">
                <span>عدد المنتجات</span>
                <Package aria-hidden="true" />
                <b>{order.itemCount}</b>
              </div>
            </div>

            <div className="order-detail-page__info-column">
              <div className="order-detail-page__info-row">
                <span>حالة الطلب</span>
                <PackageCheck aria-hidden="true" />
                <b>{order.statusDetailLabel}</b>
              </div>
              <div className="order-detail-page__info-row">
                <span>طريقة الدفع</span>
                <CreditCard aria-hidden="true" />
                <b>{payment.methodName || 'الدفع عند التسليم'}</b>
              </div>
              <div className="order-detail-page__info-row">
                <span>طريقة التوصيل</span>
                <Truck aria-hidden="true" />
                <b>{shipping.methodName || 'غير محددة'}</b>
              </div>
            </div>
          </div>
        </section>

        <section className="order-detail-page__products-panel" aria-labelledby="order-detail-products-title">
          <h2 id="order-detail-products-title">المنتجات</h2>
          {order.items?.length ? (
            <div className="order-detail-page__products-list">
              {order.items.map((item) => (
                <article className="order-detail-page__product-row" key={item.id}>
                  <div className="order-detail-page__product-image">
                    <img src={item.imageUrl || fallbackImage} alt={item.imageAlt || item.name} />
                  </div>
                  <div className="order-detail-page__product-copy">
                    <strong>{item.name}</strong>
                    {item.brand ? <span>{item.brand}</span> : null}
                    <small>الكمية: {item.quantity}</small>
                  </div>
                  <div className="order-detail-page__product-price">
                    <strong dir="ltr">{formatMoney(item.lineTotal, order.currency)}</strong>
                    <span>سعر القطعة {formatMoney(item.unitPrice, order.currency)}</span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="order-detail-page__empty-products">
              <Package aria-hidden="true" />
              <span>لا توجد منتجات مرتبطة بهذا الطلب.</span>
            </div>
          )}
        </section>

        <div className="order-detail-page__lower-grid">
          <section className="order-detail-page__address-card" aria-labelledby="order-detail-address-title">
            <h2 id="order-detail-address-title">
              <MapPin aria-hidden="true" />
              عنوان التوصيل
            </h2>
            <strong>{shippingAddress.recipient_name || order.customerName || 'العميل'}</strong>
            <p>
              <Phone aria-hidden="true" />
              <span dir="ltr">{shippingAddress.phone || order.customerPhone || 'غير متوفر'}</span>
            </p>
            <p>
              <MapPin aria-hidden="true" />
              <span>{[shippingAddress.city, shippingAddress.address_line1, shippingAddress.address_line2].filter(Boolean).join('، ') || 'لم يتم تحديد العنوان.'}</span>
            </p>
          </section>

          <section className="order-detail-page__payment-card" aria-labelledby="order-detail-payment-title">
            <h2 id="order-detail-payment-title">
              <CreditCard aria-hidden="true" />
              الدفع
            </h2>
            <div>
              <span>قيمة المنتجات</span>
              <b dir="ltr">{formatMoney(order.subtotal, order.currency)}</b>
            </div>
            <div>
              <span>التوصيل</span>
              <b dir="ltr">{formatMoney(order.shippingFee, order.currency)}</b>
            </div>
            {Number(order.discountTotal || 0) > 0 ? (
              <div>
                <span>الخصم</span>
                <b className="is-discount" dir="ltr">-{formatMoney(order.discountTotal, order.currency)}</b>
              </div>
            ) : null}
            <div className="order-detail-page__payment-total">
              <span>الإجمالي</span>
              <b dir="ltr">{formatMoney(order.grandTotal, order.currency)}</b>
            </div>
          </section>
        </div>

        <section className="order-detail-page__update-strip" aria-label="آخر تحديث">
          <strong>
            <Headphones aria-hidden="true" />
            آخر تحديث
          </strong>
          <p>{order.statusDetailLabel}</p>
          <time dateTime={order.updatedAt}>{formatDateTime(order.updatedAt)}</time>
        </section>

        <div className="order-detail-page__actions">
          <Link to="/store#contact">
            <Headphones aria-hidden="true" />
            تواصل معنا
          </Link>
          <Link to="/orders">
            <Package aria-hidden="true" />
            طلباتي
          </Link>
          {shipping.trackingUrl ? (
            <a className="order-detail-page__track" href={shipping.trackingUrl} target="_blank" rel="noreferrer">
              <Truck aria-hidden="true" />
              تتبع الشحنة
            </a>
          ) : (
            <Link className="order-detail-page__track" to="/orders">
              <Truck aria-hidden="true" />
              حالة الطلب
            </Link>
          )}
        </div>
      </div>

      <nav className="customer-bottom-nav order-detail-page__bottom-nav" aria-label="التنقل السفلي">
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
