import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  getStorefrontRouteFeedUrl,
  getStorefrontRouteProductId,
  hasStorefrontRouteData,
  preloadStorefrontCatalog,
  preloadStorefrontCatalogInBackground,
  preloadStorefrontFeed,
  preloadStorefrontProduct,
} from '@/lib/storefrontCatalogCache.js';

export default function StorefrontStartupGate({ children }) {
  const location = useLocation();
  const shouldSkipGate = location.pathname.startsWith('/admin');

  useEffect(() => {
    if (shouldSkipGate) {
      return undefined;
    }

    if (hasStorefrontRouteData(location.pathname)) {
      preloadStorefrontCatalogInBackground();
      return undefined;
    }

    const routeFeedUrl = getStorefrontRouteFeedUrl(location.pathname);
    const routeProductId = getStorefrontRouteProductId(location.pathname);
    let preloadPromise;

    if (routeFeedUrl) {
      preloadPromise = preloadStorefrontFeed(routeFeedUrl);
    } else if (routeProductId) {
      preloadPromise = preloadStorefrontProduct(routeProductId);
    } else {
      preloadPromise = preloadStorefrontCatalog();
    }

    preloadPromise
      .then(preloadStorefrontCatalogInBackground)
      .catch(() => {
        // Pages own their error states; warmup must never block rendering.
      });

    return undefined;
  }, [location.pathname, shouldSkipGate]);

  return children;
}
