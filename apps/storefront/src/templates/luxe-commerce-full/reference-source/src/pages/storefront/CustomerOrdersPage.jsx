import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  ChevronLeft,
  Clock,
  Glasses,
  Headphones,
  Home,
  Hourglass,
  Loader2,
  Package,
  PenLine,
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
  subscribeToCustomerOrderUpdates,
} from '@/lib/customerOrderUpdates.js';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext.jsx';
import './CustomerOrdersPage.css';
import './StorefrontSurface.css';

const fallbackImages = [
  '/product-assets/04-blue-dial-steel.webp',
  '/product-assets/01-black-sport-chronograph.webp',
  '/product-assets/09-gold-classic-leather.webp',
  '/product-assets/08-black-tactical-fabric.webp',
];

const statusFilters = [
  { key: 'all', label: 'الكل' },
  { key: 'processing', label: 'قيد التنفيذ' },
  { key: 'shipped', label: 'تم الشحن' },
  { key: 'completed', label: 'مكتمل' },
  { key: 'cancelled', label: 'ملغى' },
];

const bottomNavItems = [
  { label: 'الرئيسية', href: '/store', icon: Home },
  { label: 'النظارات', href: '/sunglasses', icon: Glasses },
  { label: 'الساعات', href: '/watches', icon: Clock },
  { label: 'الأقلام', href: '/pens', icon: PenLine },
  { label: 'الحساب', href: '/account', icon: User },
];

const orderCardText = {
  orderNumber: '\u0631\u0642\u0645 \u0627\u0644\u0637\u0644\u0628',
  product: '\u0645\u0646\u062a\u062c',
  products: '\u0645\u0646\u062a\u062c\u0627\u062a',
  viewDetails: '\u0639\u0631\u0636 \u0627\u0644\u062a\u0641\u0627\u0635\u064a\u0644',
};

const statusIconMap = {
  completed: CheckCircle2,
  processing: Hourglass,
  shipped: Truck,
  cancelled: XCircle,
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

function getItemCountLabel(count) {
  const normalizedCount = Number(count || 0);
  return `${normalizedCount} ${normalizedCount > 1 ? orderCardText.products : orderCardText.product}`;
}

async function readApiMessage(response) {
  try {
    const payload = await response.json();
    return payload?.error || payload?.message || 'تعذر تحميل الطلبات. حاول مرة أخرى.';
  } catch {
    return 'تعذر تحميل الطلبات. حاول مرة أخرى.';
  }
}

function getDisplayOrder(order, index) {
  const tone = order.statusTone || 'processing';

  return {
    ...order,
    statusTone: tone,
    statusLabel: order.statusLabel || statusFilters.find((filter) => filter.key === tone)?.label || 'قيد التنفيذ',
    statusDetailLabel: order.statusDetailLabel || (tone === 'completed' ? 'تم التسليم' : 'جاري التجهيز'),
    placedAtLabel: formatDate(order.placedAt),
    amountLabel: formatMoney(order.grandTotal, order.currency),
    thumbnails: (order.items || []).slice(0, 2).map((item, itemIndex) => ({
      id: item.id || `${order.id}-${itemIndex}`,
      imageUrl: item.imageUrl || fallbackImages[(index + itemIndex) % fallbackImages.length],
      imageAlt: item.imageAlt || item.name || '',
    })),
  };
}

export default function CustomerOrdersPage() {
  const navigate = useNavigate();
  const {
    customerSession,
    isCustomerAuthenticated,
    isCustomerLoading,
  } = useCustomerAuth();
  const [orders, setOrders] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [cartCount, setCartCount] = useState(() => getCartItemCount());
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!isCustomerLoading && !isCustomerAuthenticated) {
      navigate('/account', {
        replace: true,
        state: {
          authMessage: 'سجل الدخول أولاً لعرض طلباتك.',
          redirectTo: '/orders',
        },
      });
    }
  }, [isCustomerAuthenticated, isCustomerLoading, navigate]);

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

  const loadOrders = useCallback(async ({ signal, silent = false } = {}) => {
    if (!isCustomerAuthenticated || !customerSession?.accessToken) return;

    try {
      if (!silent) {
        setIsLoading(true);
      }
      setErrorMessage('');

      const response = await apiServerClient.fetch('/customer/orders', {
        headers: {
          Authorization: `Bearer ${customerSession.accessToken}`,
        },
        signal,
      });

      if (!response.ok) {
        throw new Error(await readApiMessage(response));
      }

      const payload = await response.json();
      const nextOrders = payload.items || [];
      nextOrders.forEach(cacheCustomerOrderSummary);
      setOrders(nextOrders);
    } catch (error) {
      if (error.name !== 'AbortError' && !silent) {
        setErrorMessage(error.message || 'تعذر تحميل الطلبات. حاول مرة أخرى.');
        setOrders([]);
      }
    } finally {
      if (!signal?.aborted && !silent) {
        setIsLoading(false);
      }
    }
  }, [customerSession?.accessToken, isCustomerAuthenticated]);

  useEffect(() => {
    if (!isCustomerAuthenticated || !customerSession?.accessToken) return undefined;

    const controller = new AbortController();

    function refreshSilently() {
      if (document.visibilityState === 'hidden') return;
      loadOrders({ signal: controller.signal, silent: true });
    }

    function refreshWhenVisible() {
      if (document.visibilityState === 'visible') {
        loadOrders({ signal: controller.signal, silent: true });
      }
    }

    loadOrders({ signal: controller.signal });

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
  }, [customerSession?.accessToken, isCustomerAuthenticated, loadOrders]);

  const displayOrders = useMemo(
    () => orders.map((order, index) => getDisplayOrder(order, index)),
    [orders],
  );

  const filteredOrders = useMemo(() => (
    activeFilter === 'all'
      ? displayOrders
      : displayOrders.filter((order) => order.statusTone === activeFilter)
  ), [activeFilter, displayOrders]);

  function stopOrderCardNavigation(event) {
    event.stopPropagation();
  }

  function prepareOrderDetailsLink(event, order) {
    cacheCustomerOrderSummary(order);
    stopOrderCardNavigation(event);
  }

  function openOrderDetails(event, orderDetailPath, order) {
    event.preventDefault();
    event.stopPropagation();
    event.nativeEvent?.stopImmediatePropagation?.();
    cacheCustomerOrderSummary(order);
    navigate(orderDetailPath, {
      state: {
        orderSummary: order,
      },
    });
  }

  if (isCustomerLoading || !isCustomerAuthenticated) {
    return (
      <main className="customer-orders-page" dir="rtl">
        <div className="customer-orders-page__loading">
          <Loader2 aria-hidden="true" />
          <span>جاري تحميل طلباتك</span>
        </div>
      </main>
    );
  }

  return (
    <main className="customer-orders-page" dir="rtl">
      <div className="customer-orders-page__shell">
        <section className="customer-orders-page__hero" aria-labelledby="customer-orders-title">
          <header className="customer-orders-page__topbar" aria-label="شريط طلباتي">
            <button type="button" onClick={() => navigate(-1)} aria-label="الرجوع">
              <ChevronLeft aria-hidden="true" />
            </button>

            <strong>طلباتي</strong>

            <Link to="/cart" aria-label="سلة التسوق">
              <ShoppingBag aria-hidden="true" />
              <span>{cartCount}</span>
            </Link>
          </header>

          <div className="customer-orders-page__hero-content">
            <div className="customer-orders-page__package-ring" aria-hidden="true">
              <Package />
            </div>
            <h1 id="customer-orders-title">طلباتي</h1>
            <p>تابع جميع طلباتك وحالتها بسهولة</p>
          </div>
        </section>

        <section className="customer-orders-page__body" aria-label="قائمة الطلبات">
          <div className="customer-orders-page__filters" role="tablist" aria-label="تصفية الطلبات">
            {statusFilters.map((filter) => (
              <button
                className={activeFilter === filter.key ? 'is-active' : undefined}
                type="button"
                role="tab"
                aria-selected={activeFilter === filter.key}
                key={filter.key}
                onClick={() => setActiveFilter(filter.key)}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="customer-orders-page__loading-card">
              <Loader2 aria-hidden="true" />
              <span>جاري تحميل الطلبات</span>
            </div>
          ) : errorMessage ? (
            <div className="customer-orders-page__empty">
              <XCircle aria-hidden="true" />
              <h2>تعذر تحميل الطلبات</h2>
              <p>{errorMessage}</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="customer-orders-page__empty">
              <Package aria-hidden="true" />
              <h2>{orders.length === 0 ? 'لا توجد طلبات بعد' : 'لا توجد طلبات بهذه الحالة'}</h2>
              <p>{orders.length === 0 ? 'عند إتمام أول عملية شراء ستظهر طلباتك هنا.' : 'اختر حالة أخرى من الأعلى لعرض طلباتك.'}</p>
              <Link to="/watches">تسوق الآن</Link>
            </div>
          ) : (
            <div className="customer-orders-page__list">
              {filteredOrders.map((order, index) => {
                const StatusIcon = statusIconMap[order.statusTone] || Hourglass;
                const orderDetailPath = `/order-details/${order.id}`;
                const orderThumbs = order.thumbnails.length
                  ? order.thumbnails
                  : [{ id: `${order.id}-fallback`, imageUrl: fallbackImages[index % fallbackImages.length], imageAlt: '' }];

                return (
                  <article className="customer-orders-page__card" key={order.id} style={{ '--order-delay': `${index * 70}ms` }}>
                    <Link
                      className="customer-orders-page__image-link"
                      to={orderDetailPath}
                      state={{ orderSummary: order }}
                      onClick={(event) => prepareOrderDetailsLink(event, order)}
                      aria-label={`${orderCardText.viewDetails} ${order.orderNumber}`}
                    >
                      <span className="customer-orders-page__image-box" data-thumb-count={Math.min(orderThumbs.length, 2)}>
                        {orderThumbs.slice(0, 2).map((item) => (
                          <span className="customer-orders-page__order-thumb" key={item.id}>
                            <img src={item.imageUrl} alt={item.imageAlt} />
                          </span>
                        ))}
                      </span>
                    </Link>

                    <Link
                      className="customer-orders-page__copy"
                      to={orderDetailPath}
                      state={{ orderSummary: order }}
                      onClick={(event) => prepareOrderDetailsLink(event, order)}
                      aria-label={`${orderCardText.viewDetails} ${order.orderNumber}`}
                    >
                      <span>{orderCardText.orderNumber}</span>
                      <strong dir="ltr">{order.orderNumber}</strong>
                      <em className={`customer-orders-page__status-line customer-orders-page__status-line--${order.statusTone}`}>
                        <StatusIcon aria-hidden="true" />
                        <span>{order.statusDetailLabel}</span>
                      </em>
                      <small>
                        <span>{order.placedAtLabel}</span>
                        <Clock aria-hidden="true" />
                      </small>
                      <small>
                        <span>{getItemCountLabel(order.itemCount)}</span>
                        <Package aria-hidden="true" />
                      </small>
                    </Link>

                    <div
                      className="customer-orders-page__actions"
                      onClick={stopOrderCardNavigation}
                      onPointerDown={stopOrderCardNavigation}
                    >
                      <strong dir="ltr">{order.amountLabel}</strong>
                      <span className={`customer-orders-page__status-badge customer-orders-page__status-badge--${order.statusTone}`}>
                        {order.statusLabel}
                      </span>
                      <button
                        type="button"
                        onPointerDown={stopOrderCardNavigation}
                        onClick={(event) => openOrderDetails(event, orderDetailPath, order)}
                        aria-label={`${orderCardText.viewDetails} ${order.orderNumber}`}
                      >
                        <span>{orderCardText.viewDetails}</span>
                        <ChevronLeft aria-hidden="true" />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <section className="customer-orders-page__help" aria-label="المساعدة">
            <Headphones aria-hidden="true" />
            <div>
              <h2>تحتاج مساعدة؟</h2>
              <p>فريق خدمة العملاء لدينا جاهز لمساعدتك</p>
            </div>
            <Link to="/store#contact">تواصل معنا</Link>
          </section>
        </section>
      </div>

      <nav className="customer-bottom-nav customer-orders-page__bottom-nav" aria-label="التنقل السفلي">
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
