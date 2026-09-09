import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BadgePercent,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  Glasses,
  Home,
  Loader2,
  LockKeyhole,
  PenLine,
  ShoppingBag,
  Trash2,
  User,
  Watch,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import apiServerClient from '@/lib/apiServerClient.js';
import {
  CART_CHANGE_EVENT,
  readCartItems,
  removeCartItem,
  updateCartItemQuantity,
  writeCartItems,
} from '@/lib/storefrontCart.js';
import {
  COUPON_CHANGE_EVENT,
  calculateAppliedCouponDiscount,
  clearAppliedCoupon,
  normalizeCouponCode,
  readAppliedCoupon,
  writeAppliedCoupon,
} from '@/lib/storefrontCoupon.js';
import {
  DEFAULT_CHECKOUT_SETTINGS,
  calculateShippingFee,
  fetchCheckoutSettings,
  getFreeShippingRemaining,
} from '@/lib/checkoutSettings.js';
import { normalizeCurrency } from '@/lib/productPricing.js';
import { getProductStockMeta } from '@/lib/productStock.js';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext.jsx';
import './CartPage.css';
import './StorefrontSurface.css';

const bottomNavItems = [
  { label: 'الرئيسية', href: '/store', icon: Home },
  { label: 'النظارات', href: '/sunglasses', icon: Glasses },
  { label: 'الساعات', href: '/watches', icon: Clock, active: true },
  { label: 'الأقلام', href: '/pens', icon: PenLine },
  { label: 'الحساب', href: '/account', icon: User },
];

function formatMoney(value, currency = 'LYD') {
  return `${normalizeCurrency(currency)} ${Number(value || 0).toLocaleString('en-US')}`;
}

async function readApiMessage(response, fallback = 'تعذر تطبيق الكوبون. حاول مرة أخرى.') {
  try {
    const payload = await response.json();
    return payload?.error || payload?.message || fallback;
  } catch {
    return fallback;
  }
}

function getProductName(product) {
  return product?.name_ar || product?.name_en || product?.sku || 'منتج';
}

function getProductModel(product) {
  return product?.name_en || product?.sku || product?.brands?.name_en || product?.brands?.name_ar || '';
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

export default function CartPage() {
  const navigate = useNavigate();
  const { customerSession } = useCustomerAuth();
  const [cartEntries, setCartEntries] = useState(() => readCartItems());
  const [productsById, setProductsById] = useState(() => new Map());
  const [isLoading, setIsLoading] = useState(() => readCartItems().length > 0);
  const [loadError, setLoadError] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(() => readAppliedCoupon());
  const [couponCode, setCouponCode] = useState(() => readAppliedCoupon()?.code || '');
  const [couponMessage, setCouponMessage] = useState('');
  const [couponMessageTone, setCouponMessageTone] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [isCouponOpen, setIsCouponOpen] = useState(() => Boolean(readAppliedCoupon()));
  const [checkoutSettings, setCheckoutSettings] = useState(DEFAULT_CHECKOUT_SETTINGS);

  useEffect(() => {
    function refreshCartEntries() {
      setCartEntries(readCartItems());
    }

    window.addEventListener(CART_CHANGE_EVENT, refreshCartEntries);
    window.addEventListener('storage', refreshCartEntries);

    return () => {
      window.removeEventListener(CART_CHANGE_EVENT, refreshCartEntries);
      window.removeEventListener('storage', refreshCartEntries);
    };
  }, []);

  useEffect(() => {
    function refreshCoupon() {
      const coupon = readAppliedCoupon();
      setAppliedCoupon(coupon);
      if (coupon) setCouponCode(coupon.code);
    }

    window.addEventListener(COUPON_CHANGE_EVENT, refreshCoupon);
    window.addEventListener('storage', refreshCoupon);

    return () => {
      window.removeEventListener(COUPON_CHANGE_EVENT, refreshCoupon);
      window.removeEventListener('storage', refreshCoupon);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    fetchCheckoutSettings({ signal: controller.signal })
      .then(setCheckoutSettings)
      .catch((error) => {
        if (error.name !== 'AbortError') {
          console.error('Failed to load checkout settings', error);
        }
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCartProducts() {
      if (cartEntries.length === 0) {
        setProductsById(new Map());
        setIsLoading(false);
        setLoadError(false);
        return;
      }

      try {
        setIsLoading(true);
        setLoadError(false);

        const productResults = await Promise.all(cartEntries.map(async (entry) => {
          const response = await apiServerClient.fetch(`/products/${encodeURIComponent(entry.productId)}`, {
            signal: controller.signal,
          });

          if (!response.ok) return null;

          return response.json();
        }));

        const nextProductsById = new Map(
          productResults
            .filter(Boolean)
            .map((product) => [product.id, product]),
        );

        if (!controller.signal.aborted) {
          setProductsById(nextProductsById);
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Failed to load cart products', error);
          setProductsById(new Map());
          setLoadError(true);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    loadCartProducts();

    return () => controller.abort();
  }, [cartEntries]);

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
      id: product.id,
      title: getProductName(product),
      subtitle: getProductModel(product),
      price,
      currency: normalizeCurrency(product.currency),
      quantity,
      requestedQuantity: entry.quantity,
      purchaseQuantity,
      image: getProductImage(product),
      availableQuantity: stockMeta.availableQuantity,
      isAvailable: stockMeta.isAvailable,
      stockLabel: stockMeta.stockLabel,
      requiresStock: stockMeta.requiresStock,
    };
  }).filter(Boolean), [cartEntries, productsById]);

  const productTotal = useMemo(
    () => items.reduce((total, item) => total + item.price * item.purchaseQuantity, 0),
    [items],
  );
  const couponDiscount = useMemo(
    () => calculateAppliedCouponDiscount(appliedCoupon, productTotal),
    [appliedCoupon, productTotal],
  );
  const shippingFee = useMemo(
    () => calculateShippingFee(productTotal, checkoutSettings),
    [checkoutSettings, productTotal],
  );
  const freeShippingRemaining = useMemo(
    () => getFreeShippingRemaining(productTotal, checkoutSettings),
    [checkoutSettings, productTotal],
  );
  const grandTotal = Number(Math.max(0, productTotal - couponDiscount + shippingFee).toFixed(2));
  const itemCount = useMemo(() => items.reduce((total, item) => total + item.purchaseQuantity, 0), [items]);
  const hasUnavailableItems = useMemo(() => items.some((item) => !item.isAvailable), [items]);
  const cartBadgeCount = useMemo(() => cartEntries.reduce((total, item) => total + item.quantity, 0), [cartEntries]);
  const cartTitle = `سلة التسوق (${cartBadgeCount})`;
  const shouldReserveCartLayout = (isLoading && cartEntries.length > 0) || items.length > 0;
  const cartPageClassName = [
    'cart-page',
    shouldReserveCartLayout ? 'cart-page--has-items' : '',
    shouldReserveCartLayout && isCouponOpen ? 'cart-page--coupon-open' : '',
  ].filter(Boolean).join(' ');
  const cartItemSlots = useMemo(() => {
    if (isLoading) {
      return Array.from({ length: Math.max(cartEntries.length, 2) }, (_, index) => ({
        isSkeleton: true,
        slotKey: `cart-slot-${index}`,
      }));
    }

    return items.map((item, index) => ({
      isSkeleton: false,
      item,
      slotKey: `cart-slot-${index}`,
    }));
  }, [cartEntries.length, isLoading, items]);

  useEffect(() => {
    if (isLoading || items.length === 0) return;

    const nextEntries = cartEntries.map((entry) => {
      const cartItem = items.find((item) => item.id === entry.productId);
      if (!cartItem?.isAvailable || cartItem.quantity >= entry.quantity) return entry;
      return { ...entry, quantity: cartItem.quantity };
    });
    const changed = nextEntries.some((entry, index) => entry.quantity !== cartEntries[index]?.quantity);

    if (changed) {
      setCartEntries(writeCartItems(nextEntries));
      toast.info('تم تحديث كمية بعض المنتجات حسب المخزون المتاح.');
    }
  }, [cartEntries, isLoading, items]);

  useEffect(() => {
    if (!appliedCoupon) return;

    if (productTotal <= 0) {
      clearAppliedCoupon();
      setAppliedCoupon(null);
      setCouponCode('');
      setCouponMessage('');
      setCouponMessageTone('');
      return;
    }

    if (productTotal < Number(appliedCoupon.minOrderAmount || 0)) {
      clearAppliedCoupon();
      setAppliedCoupon(null);
      setCouponMessage(`هذا الكوبون يحتاج طلب بقيمة ${formatMoney(appliedCoupon.minOrderAmount)} على الأقل.`);
      setCouponMessageTone('error');
    }
  }, [appliedCoupon, productTotal]);

  function updateQuantity(itemId, delta) {
    const item = items.find((cartItem) => cartItem.id === itemId);
    if (!item?.isAvailable) return;

    const maxQuantity = item.requiresStock && item.availableQuantity > 0 ? item.availableQuantity : item.quantity + delta;
    const nextQuantity = Math.min(maxQuantity, Math.max(1, item.quantity + delta));
    setCartEntries(updateCartItemQuantity(itemId, nextQuantity));
  }

  function removeItem(itemId) {
    setCartEntries(removeCartItem(itemId));
  }

  async function handleApplyCoupon(event) {
    event.preventDefault();

    const nextCode = normalizeCouponCode(couponCode);
    if (!nextCode) {
      setCouponMessage('اكتب كوبون الخصم أولاً.');
      setCouponMessageTone('error');
      return;
    }

    try {
      setIsApplyingCoupon(true);
      setCouponMessage('');
      setCouponMessageTone('');

      const headers = {
        'Content-Type': 'application/json',
      };

      if (customerSession?.accessToken) {
        headers.Authorization = `Bearer ${customerSession.accessToken}`;
      }

      const response = await apiServerClient.fetch('/customer/orders/apply-coupon', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          code: nextCode,
          subtotal: productTotal,
        }),
      });

      if (!response.ok) {
        throw new Error(await readApiMessage(response, 'الكوبون غير صالح.'));
      }

      const payload = await response.json();
      const coupon = writeAppliedCoupon(payload.coupon);
      const discount = calculateAppliedCouponDiscount(coupon, productTotal);

      setAppliedCoupon(coupon);
      setCouponCode(coupon?.code || nextCode);
      setCouponMessage(`تم تطبيق خصم ${formatMoney(discount)}.`);
      setCouponMessageTone('success');
      toast.success('تم تطبيق الكوبون.');
    } catch (error) {
      setCouponMessage(error.message || 'تعذر تطبيق الكوبون.');
      setCouponMessageTone('error');
      toast.error(error.message || 'تعذر تطبيق الكوبون.');
    } finally {
      setIsApplyingCoupon(false);
    }
  }

  function handleRemoveCoupon() {
    clearAppliedCoupon();
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponMessage('تم حذف الكوبون من السلة.');
    setCouponMessageTone('info');
    toast.info('تم حذف الكوبون.');
  }

  function renderCartItemSlot({ isSkeleton, item, slotKey }, index) {
    if (isSkeleton) {
      return (
        <article className="cart-page__item cart-page__item--skeleton" key={slotKey} aria-hidden="true" style={{ '--cart-item-delay': `${index * 70}ms` }}>
          <span className="cart-page__sk cart-page__sk--actions" />
          <span className="cart-page__sk cart-page__sk--copy" />
          <span className="cart-page__sk cart-page__sk--image" />
        </article>
      );
    }

    const itemClassName = [
      'cart-page__item',
      !item.isAvailable ? 'cart-page__item--unavailable' : '',
      item.isAvailable && item.stockLabel ? 'cart-page__item--with-stock-note' : '',
    ].filter(Boolean).join(' ');

    return (
      <article className={itemClassName} key={slotKey} style={{ '--cart-item-delay': `${index * 70}ms` }}>
        <div className="cart-page__item-actions">
          <button type="button" onClick={() => removeItem(item.id)} aria-label={`حذف ${item.title}`}>
            <Trash2 aria-hidden="true" />
          </button>
        </div>

        <div className="cart-page__item-copy">
          <h2>{item.title}</h2>
          <p>{item.subtitle}</p>
          <div className="cart-page__purchase-stack">
            <strong>{formatMoney(item.price, item.currency)}</strong>
            <div className="cart-page__quantity" aria-label={`كمية ${item.title}`}>
              <button type="button" onClick={() => updateQuantity(item.id, -1)} disabled={!item.isAvailable || item.quantity <= 1} aria-label="تقليل الكمية">-</button>
              <span>{item.quantity}</span>
              <button type="button" onClick={() => updateQuantity(item.id, 1)} disabled={!item.isAvailable || (item.requiresStock && item.quantity >= item.availableQuantity)} aria-label="زيادة الكمية">+</button>
            </div>
          </div>
          {item.isAvailable && item.stockLabel ? (
            <em className="cart-page__stock-note">
              {item.stockLabel}
            </em>
          ) : null}
        </div>

        <div className="cart-page__item-image">
          {!item.isAvailable && item.stockLabel ? (
            <em className="cart-page__image-stock-badge">
              {item.stockLabel}
            </em>
          ) : null}
          {item.image ? <img src={item.image} alt={item.title} /> : <ShoppingBag aria-hidden="true" />}
        </div>
      </article>
    );
  }

  return (
    <main className={cartPageClassName} dir="rtl">
      <div className="cart-page__shell">
        <header className="cart-page__header" aria-label="شريط سلة التسوق">
          <button className="cart-page__icon-button cart-page__back" type="button" onClick={() => navigate(-1)} aria-label="الرجوع">
            <ChevronLeft aria-hidden="true" />
          </button>

          <h1>{cartTitle}</h1>

          <Link className="cart-page__icon-button cart-page__bag" to="/cart" aria-label="سلة التسوق">
            <ShoppingBag aria-hidden="true" />
            <span>{cartBadgeCount}</span>
          </Link>
        </header>

        <section className="cart-page__items" aria-label="منتجات سلة التسوق" aria-busy={isLoading}>
          {isLoading ? <span className="sr-only" role="status">جاري تحميل منتجات السلة</span> : null}
          {!isLoading && items.length === 0 ? (
            <div className="cart-page__empty-state">
              <section className="cart-page__empty-hero" aria-labelledby="cart-empty-title">
                <img
                  className="cart-page__empty-illustration"
                  src="/customer-assets/empty-cart-bag-watch-111-transparent.webp"
                  alt=""
                  aria-hidden="true"
                />

                <h2 id="cart-empty-title">{loadError ? 'تعذر تحميل منتجات السلة' : 'سلة التسوق فارغة'}</h2>
                <p>
                  {loadError
                    ? 'تحقق من اتصال الخادم ثم أعد المحاولة.'
                    : 'لم تقم بإضافة أي منتجات إلى السلة بعد. اكتشف مجموعتنا الفاخرة من الساعات والنظارات وابدأ التسوق الآن.'}
                </p>

                <div className="cart-page__empty-actions">
                  <Link className="cart-page__empty-primary" to="/watches">ابدأ التسوق</Link>
                  <Link className="cart-page__empty-secondary" to="/watches">
                    <span>تصفح الساعات</span>
                    <Watch aria-hidden="true" />
                  </Link>
                </div>
              </section>
            </div>
          ) : cartItemSlots.map(renderCartItemSlot)}
        </section>

        {items.length > 0 ? (
          <div className="cart-page__checkout-dock" aria-label="ملخص وإتمام الطلب">
            <section className={isCouponOpen ? 'cart-page__promo cart-page__promo--open' : 'cart-page__promo'} aria-label="كوبون الخصم">
              <button className="cart-page__promo-toggle" type="button" onClick={() => setIsCouponOpen((value) => !value)} aria-expanded={isCouponOpen}>
                <span>هل لديك كوبون خصم؟</span>
                <ChevronRight aria-hidden="true" />
              </button>

              {isCouponOpen ? (
                <form className="cart-page__coupon" onSubmit={handleApplyCoupon}>
                  <div className="cart-page__coupon-control">
                    <input
                      autoComplete="off"
                      dir="ltr"
                      id="cart-coupon-code"
                      inputMode="text"
                      onChange={(event) => {
                        setCouponCode(event.target.value);
                        setCouponMessage('');
                        setCouponMessageTone('');
                      }}
                      placeholder="COUPON"
                      value={couponCode}
                    />
                    <button type="submit" disabled={isApplyingCoupon || productTotal <= 0}>
                      {isApplyingCoupon ? <Loader2 aria-hidden="true" /> : <BadgePercent aria-hidden="true" />}
                      <span>تطبيق</span>
                    </button>
                  </div>
                  {couponMessage ? (
                    <p className={couponMessageTone === 'success' ? 'cart-page__coupon-note is-success' : 'cart-page__coupon-note'}>
                      {couponMessageTone === 'success' ? <CheckCircle2 aria-hidden="true" /> : null}
                      <span>{couponMessage}</span>
                    </p>
                  ) : null}
                  {appliedCoupon && couponDiscount > 0 ? (
                    <div className="cart-page__coupon-applied">
                      <span>{appliedCoupon.code}</span>
                      <button type="button" onClick={handleRemoveCoupon} aria-label="حذف الكوبون">
                        <X aria-hidden="true" />
                      </button>
                    </div>
                  ) : null}
                </form>
              ) : null}
            </section>

            <section className="cart-page__summary" aria-labelledby="cart-summary-title">
              <div className="cart-page__summary-copy">
                <h2 id="cart-summary-title">ملخص الطلب</h2>
                <div className="cart-page__summary-row">
                  <span>إجمالي المنتجات ({itemCount})</span>
                  <b>{formatMoney(productTotal)}</b>
                </div>
                <div className="cart-page__summary-row">
                  <span>الشحن</span>
                  <b>{shippingFee > 0 ? formatMoney(shippingFee) : 'مجاني'}</b>
                </div>
                {freeShippingRemaining > 0 ? (
                  <p className="cart-page__shipping-note">
                    {`أضف منتجات بقيمة ${formatMoney(freeShippingRemaining)} للحصول على شحن مجاني.`}
                  </p>
                ) : null}

                {couponDiscount > 0 ? (
                  <div className="cart-page__summary-row cart-page__summary-row--discount">
                    <span>خصم الكوبون</span>
                    <b>-{formatMoney(couponDiscount)}</b>
                  </div>
                ) : null}
              </div>

              <div className="cart-page__summary-total">
                <span>الإجمالي الكلي</span>
                <strong>{formatMoney(grandTotal)}</strong>
              </div>
            </section>

            <button className="cart-page__checkout" type="button" onClick={() => navigate('/checkout')} disabled={hasUnavailableItems || itemCount <= 0}>
              <span>{hasUnavailableItems ? 'احذف المنتجات غير المتوفرة' : 'إتمام الطلب'}</span>
              <LockKeyhole aria-hidden="true" />
            </button>
            <Link className="cart-page__continue" to="/store">متابعة التسوق</Link>
          </div>
        ) : null}
      </div>

      <nav className="customer-bottom-nav cart-page__bottom-nav" aria-label="التنقل السفلي">
        {bottomNavItems.map((item) => {
          const Icon = item.icon;

          return (
            <Link className={item.active ? 'is-active' : undefined} to={item.href} key={`${item.href}-${item.label}`}>
              <Icon aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </main>
  );
}
