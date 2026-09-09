import React from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import PullToRefresh from './components/PullToRefresh.jsx';
import NativeAppBridge from './components/NativeAppBridge.jsx';
import ScrollToTop from './components/ScrollToTop.jsx';
import StorefrontPromoEntry from './components/storefront/StorefrontPromoEntry.jsx';
import StorefrontStartupGate from './components/storefront/StorefrontStartupGate.jsx';
import { Toaster } from '@/components/ui/sonner';
import { CustomerAuthProvider } from './contexts/CustomerAuthContext.jsx';
import HomePage from './pages/storefront/HomePage.jsx';

const routeLoaders = {
  WatchesPage: () => import('./pages/storefront/WatchesPage.jsx'),
  SunglassesPage: () => import('./pages/storefront/SunglassesPage.jsx'),
  PensPage: () => import('./pages/storefront/PensPage.jsx'),
  DiscountedProductsPage: () => import('./pages/storefront/DiscountedProductsPage.jsx'),
  BestSellersPage: () => import('./pages/storefront/BestSellersPage.jsx'),
  AccountPage: () => import('./pages/storefront/AccountPage.jsx'),
  AccountSettingsPage: () => import('./pages/storefront/AccountSettingsPage.jsx'),
  AboutPage: () => import('./pages/storefront/AboutPage.jsx'),
  PrivacyPolicyPage: () => import('./pages/storefront/PrivacyPolicyPage.jsx'),
  TermsPage: () => import('./pages/storefront/TermsPage.jsx'),
  ReturnsPolicyPage: () => import('./pages/storefront/ReturnsPolicyPage.jsx'),
  AccountDeletionPolicyPage: () => import('./pages/storefront/AccountDeletionPolicyPage.jsx'),
  ProductDetailsPage: () => import('./pages/storefront/ProductDetailsPage.jsx'),
  CartPage: () => import('./pages/storefront/CartPage.jsx'),
  CheckoutPage: () => import('./pages/storefront/CheckoutPage.jsx'),
  CustomerOrdersPage: () => import('./pages/storefront/CustomerOrdersPage.jsx'),
  OrderDetailPage: () => import('./pages/storefront/OrderDetailPage.jsx'),
  FavoritesPage: () => import('./pages/storefront/FavoritesPage.jsx'),
  OrderConfirmationPage: () => import('./pages/storefront/OrderConfirmationPage.jsx'),
};

const WatchesPage = React.lazy(routeLoaders.WatchesPage);
const SunglassesPage = React.lazy(routeLoaders.SunglassesPage);
const PensPage = React.lazy(routeLoaders.PensPage);
const DiscountedProductsPage = React.lazy(routeLoaders.DiscountedProductsPage);
const BestSellersPage = React.lazy(routeLoaders.BestSellersPage);
const AccountPage = React.lazy(routeLoaders.AccountPage);
const AccountSettingsPage = React.lazy(routeLoaders.AccountSettingsPage);
const AboutPage = React.lazy(routeLoaders.AboutPage);
const PrivacyPolicyPage = React.lazy(routeLoaders.PrivacyPolicyPage);
const TermsPage = React.lazy(routeLoaders.TermsPage);
const ReturnsPolicyPage = React.lazy(routeLoaders.ReturnsPolicyPage);
const AccountDeletionPolicyPage = React.lazy(routeLoaders.AccountDeletionPolicyPage);
const ProductDetailsPage = React.lazy(routeLoaders.ProductDetailsPage);
const CartPage = React.lazy(routeLoaders.CartPage);
const CheckoutPage = React.lazy(routeLoaders.CheckoutPage);
const CustomerOrdersPage = React.lazy(routeLoaders.CustomerOrdersPage);
const OrderDetailPage = React.lazy(routeLoaders.OrderDetailPage);
const FavoritesPage = React.lazy(routeLoaders.FavoritesPage);
const OrderConfirmationPage = React.lazy(routeLoaders.OrderConfirmationPage);

const routePreloadRules = [
  { id: 'watches', pattern: /^\/watches\/?$/, load: routeLoaders.WatchesPage },
  { id: 'sunglasses', pattern: /^\/sunglasses\/?$/, load: routeLoaders.SunglassesPage },
  { id: 'pens', pattern: /^\/pens\/?$/, load: routeLoaders.PensPage },
  { id: 'offers', pattern: /^\/offers\/?$/, load: routeLoaders.DiscountedProductsPage },
  { id: 'best-sellers', pattern: /^\/best-sellers\/?$/, load: routeLoaders.BestSellersPage },
  { id: 'brand-products', pattern: /^\/brands\/[^/]+\/?$/, load: routeLoaders.WatchesPage },
  { id: 'product-details', pattern: /^\/products?\//, load: routeLoaders.ProductDetailsPage },
  { id: 'cart', pattern: /^\/cart\/?$/, load: routeLoaders.CartPage },
  { id: 'checkout', pattern: /^\/checkout\/?$/, load: routeLoaders.CheckoutPage },
  { id: 'customer-orders', pattern: /^\/orders\/?$/, load: routeLoaders.CustomerOrdersPage },
  { id: 'order-details', pattern: /^\/(?:orders|order-details)\//, load: routeLoaders.OrderDetailPage },
  { id: 'favorites', pattern: /^\/favorites\/?$/, load: routeLoaders.FavoritesPage },
  { id: 'account', pattern: /^\/account\/?$/, load: routeLoaders.AccountPage },
  { id: 'account-settings', pattern: /^\/account\/settings\/?$/, load: routeLoaders.AccountSettingsPage },
  { id: 'about', pattern: /^\/about\/?$/, load: routeLoaders.AboutPage },
  { id: 'privacy', pattern: /^\/privacy\/?$/, load: routeLoaders.PrivacyPolicyPage },
  { id: 'terms', pattern: /^\/terms\/?$/, load: routeLoaders.TermsPage },
  { id: 'returns', pattern: /^\/returns\/?$/, load: routeLoaders.ReturnsPolicyPage },
  { id: 'account-deletion-policy', pattern: /^\/account-deletion\/?$/, load: routeLoaders.AccountDeletionPolicyPage },
];

const idlePreloadPaths = [
  '/store',
  '/watches',
  '/sunglasses',
  '/pens',
  '/offers',
  '/best-sellers',
  '/cart',
  '/favorites',
  '/account',
  '/about',
  '/privacy',
  '/terms',
];
const preloadedRoutes = new Set();

function preloadRoute(rule) {
  if (!rule || preloadedRoutes.has(rule.id)) return;

  preloadedRoutes.add(rule.id);
  rule.load().catch(() => {
    preloadedRoutes.delete(rule.id);
  });
}

function preloadRouteForPath(pathname) {
  preloadRoute(routePreloadRules.find((item) => item.pattern.test(pathname)));
}

function RouteLoadingFallback() {
  return <div className="app-route-loading" aria-label="جاري تحميل الصفحة" />;
}

function RoutePreloader() {
  React.useEffect(() => {
    const getAnchorPath = (target) => {
      if (!(target instanceof Element)) return null;

      const anchor = target.closest('a[href]');
      if (!anchor) return null;

      const url = new URL(anchor.href, window.location.href);
      return url.origin === window.location.origin ? url.pathname : null;
    };

    const handleIntent = (event) => {
      const pathname = getAnchorPath(event.target);
      if (pathname) preloadRouteForPath(pathname);
    };

    const preloadCommonRoutes = () => {
      idlePreloadPaths.forEach(preloadRouteForPath);
    };

    document.addEventListener('pointerover', handleIntent, { passive: true });
    document.addEventListener('touchstart', handleIntent, { passive: true });
    document.addEventListener('focusin', handleIntent);

    const idleId = window.requestIdleCallback
      ? window.requestIdleCallback(preloadCommonRoutes, { timeout: 2500 })
      : window.setTimeout(preloadCommonRoutes, 1400);

    return () => {
      document.removeEventListener('pointerover', handleIntent);
      document.removeEventListener('touchstart', handleIntent);
      document.removeEventListener('focusin', handleIntent);

      if (window.cancelIdleCallback) {
        window.cancelIdleCallback(idleId);
      } else {
        window.clearTimeout(idleId);
      }
    };
  }, []);

  return null;
}

function AnimatedRoutes({ children }) {
  const location = useLocation();

  return (
    <div className="app-route-stage app-route-stage--storefront">
      <div className="app-route-transition app-route-transition--storefront" key={location.pathname}>
        <React.Suspense fallback={<RouteLoadingFallback />}>
          <Routes location={location}>{children}</Routes>
        </React.Suspense>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <CustomerAuthProvider>
      <Router>
        <NativeAppBridge />
        <ScrollToTop />
        <PullToRefresh />
        <RoutePreloader />
        <StorefrontPromoEntry />
        <StorefrontStartupGate>
          <AnimatedRoutes>
            <Route path="/" element={<Navigate to="/store" replace />} />
            <Route path="/store" element={<HomePage />} />
            <Route path="/watches" element={<WatchesPage />} />
            <Route path="/sunglasses" element={<SunglassesPage />} />
            <Route path="/pens" element={<PensPage />} />
            <Route path="/offers" element={<DiscountedProductsPage />} />
            <Route path="/best-sellers" element={<BestSellersPage />} />
            <Route path="/brands/:brandSlug" element={<WatchesPage listingType="brand" />} />
            <Route path="/products/:id" element={<ProductDetailsPage />} />
            <Route path="/product/:id" element={<ProductDetailsPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/orders" element={<CustomerOrdersPage />} />
            <Route path="/order-details/:orderId" element={<OrderDetailPage />} />
            <Route path="/orders/:orderId" element={<OrderDetailPage />} />
            <Route path="/favorites" element={<FavoritesPage />} />
            <Route path="/order-confirmation/:orderId" element={<OrderConfirmationPage />} />
            <Route path="/brands" element={<Navigate to="/pens" replace />} />
            <Route path="/account" element={<AccountPage />} />
            <Route path="/account/settings" element={<AccountSettingsPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/privacy" element={<PrivacyPolicyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/returns" element={<ReturnsPolicyPage />} />
            <Route path="/account-deletion" element={<AccountDeletionPolicyPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </AnimatedRoutes>
        </StorefrontStartupGate>
        <Toaster position="top-center" richColors rtl />
      </Router>
    </CustomerAuthProvider>
  );
}
