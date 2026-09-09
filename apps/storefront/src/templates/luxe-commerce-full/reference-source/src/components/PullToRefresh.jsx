import { useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { refreshStorefrontRoute } from '@/lib/storefrontCatalogCache.js';

const TRIGGER_DISTANCE = 78;
const REFRESH_HOLD_DISTANCE = 62;
const MAX_PULL_DISTANCE = 126;
const SCROLL_TOP_TOLERANCE = 6;
const MIN_REFRESH_VISIBLE_MS = 420;
const RESET_DURATION_MS = 400;
const INTERACTIVE_SELECTOR = [
  'a',
  'button',
  'input',
  'select',
  'textarea',
  '[contenteditable="true"]',
  '[role="dialog"]',
  '[data-pull-refresh-ignore]',
].join(',');
const HEADER_SELECTOR = [
  '.customer-header',
  '.watches-page__top',
  '.cart-page__header',
  '.checkout-page__header',
  '.customer-orders-page__topbar',
  '.order-detail-page__topbar',
  '.product-details-page__topbar',
].join(',');
const CONTENT_SELECTOR = [
  '.app-route-transition--storefront .customer-home > :not(.customer-header):not(.customer-bottom-nav)',
  '.app-route-transition--storefront .watches-page__phone-shell > :not(.watches-page__top)',
  '.app-route-transition--storefront .cart-page__shell > :not(.cart-page__header)',
  '.app-route-transition--storefront .checkout-page__shell > :not(.checkout-page__header)',
  '.app-route-transition--storefront .customer-orders-page__hero > :not(.customer-orders-page__topbar)',
  '.app-route-transition--storefront .customer-orders-page__shell > :not(.customer-orders-page__hero)',
  '.app-route-transition--storefront .order-detail-page > :not(.order-detail-page__topbar):not(.customer-bottom-nav)',
  '.app-route-transition--storefront .product-details-page__shell > :not(.product-details-page__topbar)',
  '.app-route-transition--storefront .order-confirmation-page > :not(.customer-header):not(.customer-bottom-nav)',
  '.app-route-transition--storefront .account-page > :not(.customer-bottom-nav)',
].join(',');

function getPageScrollTop() {
  return Math.max(
    window.scrollY || 0,
    document.documentElement.scrollTop || 0,
    document.body.scrollTop || 0,
  );
}

function isTouchRefreshTarget(target) {
  return target instanceof Element && !target.closest(INTERACTIVE_SELECTOR);
}

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function getVisibleHeaderBottom() {
  const headers = document.querySelectorAll(HEADER_SELECTOR);

  for (const header of headers) {
    const rect = header.getBoundingClientRect();
    const style = window.getComputedStyle(header);
    if (style.display !== 'none' && style.visibility !== 'hidden' && rect.height > 0 && rect.bottom > 0) {
      return Math.min(140, Math.max(0, rect.bottom));
    }
  }

  return 0;
}

export default function PullToRefresh() {
  const location = useLocation();
  const [mode, setModeState] = useState('idle');
  const indicatorRef = useRef(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const pullDistanceRef = useRef(0);
  const modeRef = useRef('idle');
  const isTrackingRef = useRef(false);
  const isCapturedRef = useRef(false);
  const contentTargetsRef = useRef([]);
  const resetTimerRef = useRef(null);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    if (location.pathname.startsWith('/admin') || location.pathname === '/login') {
      return undefined;
    }

    const root = document.documentElement;

    function setMode(nextMode) {
      if (modeRef.current === nextMode) return;
      modeRef.current = nextMode;
      setModeState(nextMode);
    }

    function updatePullVisual(distance, progressOverride = null) {
      const roundedDistance = Math.round(distance);
      const progress = progressOverride ?? Math.min(distance / TRIGGER_DISTANCE, 1);
      pullDistanceRef.current = distance;
      root.style.setProperty('--app-pull-distance', `${roundedDistance}px`);

      if (indicatorRef.current) {
        indicatorRef.current.style.setProperty('--pull-refresh-y', `${roundedDistance}px`);
        indicatorRef.current.style.setProperty('--pull-refresh-progress', progress.toFixed(3));
        indicatorRef.current.style.setProperty('--pull-refresh-icon-rotation', `${Math.round(progress * 250)}deg`);
        indicatorRef.current.style.setProperty('--pull-refresh-ring', `${Math.round(progress * 360)}deg`);
      }
    }

    function clearContentTargets() {
      contentTargetsRef.current.forEach((element) => {
        element.removeAttribute('data-pull-refresh-content');
      });
      contentTargetsRef.current = [];
    }

    function finishReset() {
      clearContentTargets();
      root.removeAttribute('data-pull-refresh-state');
      root.style.removeProperty('--app-pull-distance');
      root.style.removeProperty('--app-pull-header-bottom');
      setMode('idle');
    }

    function resetPull() {
      window.clearTimeout(resetTimerRef.current);
      window.cancelAnimationFrame(animationFrameRef.current);
      root.setAttribute('data-pull-refresh-state', 'settling');
      setMode('settling');
      animationFrameRef.current = window.requestAnimationFrame(() => {
        updatePullVisual(0);
        resetTimerRef.current = window.setTimeout(finishReset, RESET_DURATION_MS);
      });
    }

    async function runSoftRefresh() {
      try {
        await Promise.all([
          refreshStorefrontRoute(location.pathname),
          wait(MIN_REFRESH_VISIBLE_MS),
        ]);
      } catch (error) {
        console.error('Soft refresh failed', error);
      } finally {
        resetPull();
      }
    }

    function prepareContentTargets() {
      clearContentTargets();
      contentTargetsRef.current = Array.from(document.querySelectorAll(CONTENT_SELECTOR));
      contentTargetsRef.current.forEach((element) => {
        element.setAttribute('data-pull-refresh-content', '');
      });
      root.style.setProperty('--app-pull-header-bottom', `${Math.round(getVisibleHeaderBottom())}px`);
    }

    function handleTouchStart(event) {
      if (
        event.touches.length !== 1
        || getPageScrollTop() > SCROLL_TOP_TOLERANCE
        || !isTouchRefreshTarget(event.target)
        || modeRef.current === 'refreshing'
      ) {
        return;
      }

      window.clearTimeout(resetTimerRef.current);
      startXRef.current = event.touches[0].clientX;
      startYRef.current = event.touches[0].clientY;
      pullDistanceRef.current = 0;
      isTrackingRef.current = true;
      isCapturedRef.current = false;
    }

    function handleTouchMove(event) {
      if (!isTrackingRef.current || modeRef.current === 'refreshing' || event.touches.length !== 1) {
        return;
      }

      const deltaX = event.touches[0].clientX - startXRef.current;
      const deltaY = event.touches[0].clientY - startYRef.current;

      if (!isCapturedRef.current) {
        if (Math.abs(deltaX) > 8 && Math.abs(deltaX) > Math.abs(deltaY)) {
          isTrackingRef.current = false;
          return;
        }

        if (deltaY < 5 || deltaY < Math.abs(deltaX) * 1.15) {
          return;
        }

        if (getPageScrollTop() > SCROLL_TOP_TOLERANCE) {
          isTrackingRef.current = false;
          return;
        }

        isCapturedRef.current = true;
        prepareContentTargets();
        root.setAttribute('data-pull-refresh-state', 'pulling');
        setMode('pulling');
      }

      if (deltaY <= 0) {
        isTrackingRef.current = false;
        resetPull();
        return;
      }

      event.preventDefault();
      const dampedDistance = Math.min(MAX_PULL_DISTANCE, deltaY * 0.56);
      updatePullVisual(dampedDistance);
      setMode(dampedDistance >= TRIGGER_DISTANCE ? 'ready' : 'pulling');
    }

    function handleTouchEnd() {
      if (!isTrackingRef.current) return;

      isTrackingRef.current = false;
      if (!isCapturedRef.current) return;
      isCapturedRef.current = false;

      if (pullDistanceRef.current >= TRIGGER_DISTANCE) {
        window.cancelAnimationFrame(animationFrameRef.current);
        root.setAttribute('data-pull-refresh-state', 'refreshing');
        setMode('refreshing');
        animationFrameRef.current = window.requestAnimationFrame(() => {
          updatePullVisual(REFRESH_HOLD_DISTANCE, 1);
          runSoftRefresh();
        });
        return;
      }

      resetPull();
    }

    function handleTouchCancel() {
      if (!isTrackingRef.current) return;
      isTrackingRef.current = false;
      isCapturedRef.current = false;
      resetPull();
    }

    const touchMoveOptions = { passive: false };
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, touchMoveOptions);
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('touchcancel', handleTouchCancel, { passive: true });

    return () => {
      window.clearTimeout(resetTimerRef.current);
      window.cancelAnimationFrame(animationFrameRef.current);
      clearContentTargets();
      root.removeAttribute('data-pull-refresh-state');
      root.style.removeProperty('--app-pull-distance');
      root.style.removeProperty('--app-pull-header-bottom');
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove, touchMoveOptions);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [location.pathname]);

  const isVisible = mode !== 'idle';
  const statusLabel = mode === 'refreshing'
    ? 'جار تحديث المحتوى'
    : mode === 'ready'
      ? 'اترك الشاشة للتحديث'
      : 'اسحب للأسفل للتحديث';

  return (
    <div
      ref={indicatorRef}
      className={[
        'app-pull-refresh',
        isVisible ? 'is-visible' : '',
        mode === 'ready' ? 'is-ready' : '',
        mode === 'refreshing' ? 'is-refreshing' : '',
      ].filter(Boolean).join(' ')}
      role="status"
      aria-label={statusLabel}
      aria-live="polite"
      aria-hidden={!isVisible}
    >
      <span className="app-pull-refresh__progress" aria-hidden="true">
        <RefreshCw className="app-pull-refresh__icon" />
      </span>
    </div>
  );
}
