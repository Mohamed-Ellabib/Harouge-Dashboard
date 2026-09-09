import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import './StorefrontPromoEntry.css';

const PROMO_SESSION_KEY = 'storefront-promo-seen-v1';
const EXIT_DURATION_MS = 760;

function hasSeenPromo() {
  if (typeof window === 'undefined') return true;

  try {
    return window.sessionStorage.getItem(PROMO_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

export default function StorefrontPromoEntry() {
  const location = useLocation();
  const navigate = useNavigate();
  const isEntryRoute = location.pathname === '/' || location.pathname === '/store';
  const [isVisible, setIsVisible] = useState(() => isEntryRoute && !hasSeenPromo());
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    if (!isVisible || !isEntryRoute) return undefined;

    const scrollY = window.scrollY;
    const root = document.documentElement;
    const body = document.body;
    const previousRootOverflow = root.style.overflow;
    const previousRootOverscroll = root.style.overscrollBehavior;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyOverscroll = body.style.overscrollBehavior;
    const previousBodyPosition = body.style.position;
    const previousBodyTop = body.style.top;
    const previousBodyWidth = body.style.width;

    root.style.overflow = 'hidden';
    root.style.overscrollBehavior = 'none';
    body.style.overflow = 'hidden';
    body.style.overscrollBehavior = 'none';
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';

    return () => {
      root.style.overflow = previousRootOverflow;
      root.style.overscrollBehavior = previousRootOverscroll;
      body.style.overflow = previousBodyOverflow;
      body.style.overscrollBehavior = previousBodyOverscroll;
      body.style.position = previousBodyPosition;
      body.style.top = previousBodyTop;
      body.style.width = previousBodyWidth;
      window.scrollTo(0, scrollY);
    };
  }, [isEntryRoute, isVisible]);

  if (!isVisible || !isEntryRoute) return null;

  const leavePromo = (destination) => {
    if (isLeaving) return;

    setIsLeaving(true);
    try {
      window.sessionStorage.setItem(PROMO_SESSION_KEY, '1');
    } catch {
      // The promo still closes when browser storage is unavailable.
    }

    window.setTimeout(() => {
      setIsVisible(false);
      if (destination && location.pathname !== destination) {
        navigate(destination);
      }
    }, EXIT_DURATION_MS);
  };

  return (
    <section
      className={`storefront-promo${isLeaving ? ' storefront-promo--leaving' : ''}`}
      aria-label="مرحباً بكم في السنوسي وأبنائه"
      dir="rtl"
    >
      <div className="storefront-promo__ambient" aria-hidden="true" />

      <div className="storefront-promo__canvas">
        <picture className="storefront-promo__picture" aria-hidden="true">
          <source srcSet="/customer-assets/storefront-promo-bg.webp" type="image/webp" />
          <img src="/customer-assets/storefront-promo-bg.png" alt="" />
        </picture>

        <div className="storefront-promo__shade" aria-hidden="true" />

        <div className="storefront-promo__content">
          <header className="storefront-promo__brand">
            <img
              className="storefront-promo__logo"
              src="/customer-assets/store-header-logo.png"
              alt="السنوسي وأبنائه 1970"
            />
          </header>

          <div className="storefront-promo__message">
            <p>تراث من الدقة .. أناقة تدوم</p>
          </div>

          <div className="storefront-promo__actions">
            <button className="storefront-promo__primary" type="button" onClick={() => leavePromo('/store')}>
              <Sparkles aria-hidden="true" />
              <span>استكشف المنتجات</span>
            </button>
            <button className="storefront-promo__signin" type="button" onClick={() => leavePromo('/account')}>
              تسجيل الدخول
            </button>
          </div>
        </div>

      </div>
    </section>
  );
}
