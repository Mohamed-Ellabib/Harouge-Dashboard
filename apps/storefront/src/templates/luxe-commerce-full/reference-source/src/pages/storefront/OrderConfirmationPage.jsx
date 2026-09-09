import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, Clock, Glasses, Heart, Home, PackageCheck, PenLine, Search, ShoppingBag, User } from 'lucide-react';
import { CART_CHANGE_EVENT, getCartItemCount } from '@/lib/storefrontCart.js';
import StorefrontSearchPanel from '@/components/storefront/StorefrontSearchPanel.jsx';
import './OrderConfirmationPage.css';

const bottomNavItems = [
  { label: 'الرئيسية', href: '/store', icon: Home },
  { label: 'النظارات', href: '/sunglasses', icon: Glasses },
  { label: 'الساعات', href: '/watches', icon: Clock },
  { label: 'الأقلام', href: '/pens', icon: PenLine },
  { label: 'الحساب', href: '/account', icon: User },
];

function formatMoney(value, currency = 'LYD') {
  return `${currency} ${Number(value || 0).toLocaleString('en-US')}`;
}

export default function OrderConfirmationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { orderId } = useParams();
  const [cartCount, setCartCount] = useState(() => getCartItemCount());
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const order = location.state?.order || null;
  const orderNumber = order?.orderNumber ? `#${order.orderNumber}` : orderId ? `#${orderId.slice(0, 8)}` : '';

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

  function handleOpenFavorites() {
    navigate('/favorites');
  }

  return (
    <main className="order-confirmation-page" dir="rtl">
      <header className="customer-header" aria-label="التنقل الرئيسي">
        <div className="customer-home__lane customer-header__inner">
          <button className="customer-header__hamburger" type="button" onClick={handleOpenFavorites} aria-label="المفضلة">
            <Heart aria-hidden="true" />
          </button>

          <Link className="customer-header__brand" to="/store" aria-label="السنوسي وأبنائه">
            <img
              className="customer-header__brand-logo"
              src="/customer-assets/store-header-logo.png"
              alt="السنوسي وأبنائه 1970"
            />
          </Link>

          <nav className="customer-header__nav" aria-label="روابط المتجر">
            <Link className="is-active" to="/store">الرئيسية</Link>
            <Link to="/watches">الساعات</Link>
            <Link to="/sunglasses">النظارات</Link>
            <Link to="/pens">الأقلام</Link>
            <Link to="/store#about">عن نحن</Link>
            <Link to="/store#contact">تواصل معنا</Link>
          </nav>

          <div className="customer-header__actions" aria-label="أدوات المتجر">
            <button type="button" aria-label="بحث" onClick={() => setIsSearchOpen(true)}><Search aria-hidden="true" /></button>
            <button className="customer-header__wishlist" type="button" onClick={handleOpenFavorites} aria-label="المفضلة"><Heart aria-hidden="true" /></button>
            <Link className="customer-header__cart" to="/cart" aria-label="السلة">
              <ShoppingBag aria-hidden="true" />
              <span>{cartCount}</span>
            </Link>
          </div>
        </div>
      </header>

      <section className="order-confirmation-page__hero" aria-labelledby="order-confirmation-title">
        <div className="order-confirmation-page__hero-content">
          <span className="order-confirmation-page__success-icon">
            <CheckCircle2 aria-hidden="true" />
          </span>

          <div className="order-confirmation-page__eyebrow-row">
            <i aria-hidden="true" />
            <span>تم تأكيد الطلب</span>
            <i aria-hidden="true" />
          </div>

          <h1 id="order-confirmation-title">شكراً لشرائك من السنوسي وأبنائه</h1>
          <p>وصل طلبك بنجاح، وسيتواصل معك فريق المتجر لتأكيد التفاصيل وتجهيز الطلب.</p>
        </div>

        <div className="order-confirmation-page__hero-footer">
          <i aria-hidden="true" />
          <span>ملخص الطلب</span>
          <i aria-hidden="true" />
        </div>
      </section>

      <section className="order-confirmation-page__details" aria-label="ملخص الطلب">
        <div className="order-confirmation-page__summary">
          <div>
            <span>رقم الطلب</span>
            <b dir="ltr">{orderNumber || 'تم إنشاء الطلب'}</b>
          </div>
          {order ? (
            <>
              <div>
                <span>عدد القطع</span>
                <b>{order.itemCount}</b>
              </div>
              <div>
                <span>الإجمالي</span>
                <b dir="ltr">{formatMoney(order.grandTotal, order.currency)}</b>
              </div>
            </>
          ) : null}
        </div>

        <div className="order-confirmation-page__actions">
          <Link className="order-confirmation-page__primary" to="/store">متابعة التسوق</Link>
          <Link className="order-confirmation-page__secondary" to="/account">
            <PackageCheck aria-hidden="true" />
            <span>حسابي</span>
          </Link>
        </div>
      </section>

      <nav className="customer-bottom-nav order-confirmation-page__bottom-nav" aria-label="التنقل السفلي">
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

      <StorefrontSearchPanel isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </main>
  );
}
