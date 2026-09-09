import apiServerClient from '@/lib/apiServerClient.js';
import { getCachedPublicProductJson } from '@/lib/publicProductCache.js';

export const STOREFRONT_PRODUCT_FEEDS = {
  home: '/products?status=active,out_of_stock&per_page=24',
  all: '/products?status=active,out_of_stock&per_page=100',
  watches: '/products?status=active,out_of_stock&collection=watches&per_page=100',
  sunglasses: '/products?status=active,out_of_stock&collection=sunglasses&per_page=100',
  pens: '/products?status=active,out_of_stock&collection=pens&per_page=100',
};

export const STOREFRONT_SOFT_REFRESH_EVENT = 'alsenussi:storefront-soft-refresh';

const ROUTE_FEEDS = {
  '/': STOREFRONT_PRODUCT_FEEDS.home,
  '/store': STOREFRONT_PRODUCT_FEEDS.home,
  '/watches': STOREFRONT_PRODUCT_FEEDS.watches,
  '/sunglasses': STOREFRONT_PRODUCT_FEEDS.sunglasses,
  '/pens': STOREFRONT_PRODUCT_FEEDS.pens,
  '/offers': STOREFRONT_PRODUCT_FEEDS.all,
  '/best-sellers': STOREFRONT_PRODUCT_FEEDS.all,
};

const CATALOG_CACHE_KEY = 'alsenussi:storefront-catalog:v5';
const CATALOG_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const STATIC_CATALOG_URL = '/customer-data/storefront-catalog.json';

let memorySnapshot = null;
let staticCatalogPromise = null;
const feedLoadPromises = new Map();
const backgroundFeedRefreshes = new Map();
const productLoadPromises = new Map();

function canUseStorage() {
  return typeof window !== 'undefined' && Boolean(window.localStorage);
}

function isSnapshotUsable(snapshot) {
  return Boolean(
    snapshot
    && snapshot.savedAt
    && Date.now() - snapshot.savedAt <= CATALOG_TTL_MS
    && snapshot.feeds
    && Object.values(STOREFRONT_PRODUCT_FEEDS).every((url) => Array.isArray(snapshot.feeds[url]?.items)),
  );
}

function buildProductIndex(feeds = {}) {
  const productsById = {};

  Object.values(feeds).forEach((feed) => {
    (feed?.items || []).forEach((product) => {
      if (product?.id) {
        productsById[product.id] = product;
      }
    });
  });

  return productsById;
}

export function getStorefrontRouteProductId(pathname) {
  const parts = String(pathname || '').split('/').filter(Boolean);
  if (parts.length !== 2) return null;
  if (parts[0] !== 'products' && parts[0] !== 'product') return null;

  try {
    return decodeURIComponent(parts[1]);
  } catch {
    return parts[1];
  }
}

function readStoredSnapshot() {
  if (memorySnapshot && isSnapshotUsable(memorySnapshot)) return memorySnapshot;
  if (!canUseStorage()) return null;

  try {
    const snapshot = JSON.parse(window.localStorage.getItem(CATALOG_CACHE_KEY) || 'null');
    if (!isSnapshotUsable(snapshot)) return null;
    memorySnapshot = snapshot;
    return snapshot;
  } catch {
    return null;
  }
}

function writeStoredSnapshot(snapshot) {
  memorySnapshot = snapshot;

  if (!canUseStorage()) return;

  try {
    window.localStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(snapshot));
  } catch {
    // The page-level product cache still exists if catalog storage is full.
  }
}

async function loadStaticCatalogSnapshot() {
  if (typeof window === 'undefined') return null;

  staticCatalogPromise ||= window.fetch(STATIC_CATALOG_URL, {
    cache: 'force-cache',
    headers: {
      accept: 'application/json',
    },
  })
    .then(async (response) => {
      if (!response.ok) return null;

      const snapshot = await response.json();
      const normalizedSnapshot = {
        ...snapshot,
        savedAt: Date.now(),
        source: 'static-catalog',
      };

      if (!isSnapshotUsable(normalizedSnapshot)) return null;

      writeStoredSnapshot(normalizedSnapshot);
      return normalizedSnapshot;
    })
    .catch(() => null);

  return staticCatalogPromise;
}

async function loadLiveStorefrontCatalogSnapshot() {
  const entries = await Promise.all(
    Object.entries(STOREFRONT_PRODUCT_FEEDS).map(async ([feedName, feedUrl]) => {
      const response = await apiServerClient.fetch(feedUrl);
      if (!response.ok) {
        throw new Error(`Failed to preload ${feedName}`);
      }

      const data = await response.json();
      return [feedUrl, {
        ...data,
        items: Array.isArray(data.items) ? data.items : [],
      }];
    }),
  );

  const feeds = Object.fromEntries(entries);
  const snapshot = {
    feeds,
    productsById: buildProductIndex(feeds),
    savedAt: Date.now(),
    source: 'live',
    version: 2,
  };

  writeStoredSnapshot(snapshot);
  return snapshot;
}

export function getStorefrontCatalogSnapshot() {
  return readStoredSnapshot();
}

export function getStorefrontFeed(feedUrl) {
  const snapshot = readStoredSnapshot();
  if (Array.isArray(snapshot?.feeds?.[feedUrl]?.items)) {
    return snapshot.feeds[feedUrl];
  }

  const cachedFeed = getCachedPublicProductJson(feedUrl);
  return Array.isArray(cachedFeed?.items) ? cachedFeed : null;
}

export function getStorefrontProduct(productId) {
  const snapshot = readStoredSnapshot();
  return snapshot?.productsById?.[productId] || getCachedPublicProductJson(`/products/${productId}`);
}

export function hasStorefrontCatalogSnapshot() {
  return Boolean(readStoredSnapshot());
}

export function getStorefrontRouteFeedUrl(pathname) {
  if (/^\/brands\/[^/]+\/?$/.test(String(pathname || ''))) {
    return STOREFRONT_PRODUCT_FEEDS.all;
  }

  return ROUTE_FEEDS[pathname] || null;
}

export function hasStorefrontRouteData(pathname) {
  const routeFeedUrl = getStorefrontRouteFeedUrl(pathname);
  const productId = getStorefrontRouteProductId(pathname);

  if (productId) {
    return hasStorefrontCatalogSnapshot() || Boolean(getStorefrontProduct(productId));
  }

  return hasStorefrontCatalogSnapshot() || !routeFeedUrl || Boolean(getStorefrontFeed(routeFeedUrl));
}

export async function preloadStorefrontCatalog() {
  const existingSnapshot = readStoredSnapshot();
  if (existingSnapshot) return existingSnapshot;

  const staticSnapshot = await loadStaticCatalogSnapshot();
  if (staticSnapshot) return staticSnapshot;

  return loadLiveStorefrontCatalogSnapshot();
}

export async function preloadStorefrontFeed(feedUrl) {
  const cachedFeed = getStorefrontFeed(feedUrl);
  if (cachedFeed) return cachedFeed;

  let request = feedLoadPromises.get(feedUrl);
  if (!request) {
    request = (async () => {
      const staticSnapshot = await loadStaticCatalogSnapshot();
      const staticFeed = staticSnapshot?.feeds?.[feedUrl];

      if (Array.isArray(staticFeed?.items)) {
        revalidateFeedInBackground(feedUrl);
        return staticFeed;
      }

      const response = await apiServerClient.fetch(feedUrl);
      if (!response.ok) {
        throw new Error(`Failed to preload ${feedUrl}`);
      }

      return normalizeFeedPayload(await response.json());
    })().finally(() => {
      feedLoadPromises.delete(feedUrl);
    });

    feedLoadPromises.set(feedUrl, request);
  }

  try {
    return await request;
  } catch (error) {
    const staticSnapshot = await loadStaticCatalogSnapshot();
    if (Array.isArray(staticSnapshot?.feeds?.[feedUrl]?.items)) {
      return staticSnapshot.feeds[feedUrl];
    }
    throw error;
  }
}

function normalizeFeedPayload(data) {
  return {
    ...data,
    items: Array.isArray(data?.items) ? data.items : [],
  };
}

function updateSnapshotFeed(feedUrl, feed) {
  const currentSnapshot = readStoredSnapshot();
  if (!currentSnapshot?.feeds) return feed;

  const feeds = {
    ...currentSnapshot.feeds,
    [feedUrl]: feed,
  };

  writeStoredSnapshot({
    ...currentSnapshot,
    feeds,
    productsById: buildProductIndex(feeds),
    savedAt: Date.now(),
    source: 'live-refresh',
  });

  return feed;
}

function dispatchStorefrontFeedRefresh(feedUrl, feed) {
  window.dispatchEvent(new CustomEvent(STOREFRONT_SOFT_REFRESH_EVENT, {
    detail: {
      feed,
      feedUrl,
      refreshedAt: Date.now(),
    },
  }));
}

function revalidateFeedInBackground(feedUrl) {
  if (backgroundFeedRefreshes.has(feedUrl)) return;

  const refresh = refreshStorefrontFeed(feedUrl)
    .then((feed) => {
      dispatchStorefrontFeedRefresh(feedUrl, feed);
      return feed;
    })
    .catch(() => null)
    .finally(() => {
      backgroundFeedRefreshes.delete(feedUrl);
    });

  backgroundFeedRefreshes.set(feedUrl, refresh);
}

export async function refreshStorefrontFeed(feedUrl) {
  const response = await apiServerClient.fetch(feedUrl, { cache: 'reload' });
  if (!response.ok) {
    throw new Error(`Failed to refresh ${feedUrl}`);
  }

  return updateSnapshotFeed(feedUrl, normalizeFeedPayload(await response.json()));
}

export async function preloadStorefrontProduct(productId) {
  const cachedProduct = getStorefrontProduct(productId);
  if (cachedProduct) return cachedProduct;

  let request = productLoadPromises.get(productId);
  if (!request) {
    request = (async () => {
      const staticSnapshot = await loadStaticCatalogSnapshot();
      if (staticSnapshot?.productsById?.[productId]) {
        return staticSnapshot.productsById[productId];
      }

      const response = await apiServerClient.fetch(`/products/${encodeURIComponent(productId)}`);
      if (!response.ok) {
        throw new Error(`Failed to preload product ${productId}`);
      }

      return response.json();
    })().finally(() => {
      productLoadPromises.delete(productId);
    });

    productLoadPromises.set(productId, request);
  }

  try {
    return await request;
  } catch (error) {
    const staticSnapshot = await loadStaticCatalogSnapshot();
    if (staticSnapshot?.productsById?.[productId]) {
      return staticSnapshot.productsById[productId];
    }
    throw error;
  }
}

export function preloadStorefrontCatalogInBackground() {
  window.setTimeout(() => {
    if (hasStorefrontCatalogSnapshot()) return;

    loadStaticCatalogSnapshot().catch(() => {
      // Background catalog warmup is best effort; current route data is loaded first.
    });
  }, 0);
}

export async function refreshStorefrontRoute(pathname) {
  const feedUrl = getStorefrontRouteFeedUrl(pathname);
  const feed = feedUrl ? await refreshStorefrontFeed(feedUrl) : null;

  window.dispatchEvent(new CustomEvent(STOREFRONT_SOFT_REFRESH_EVENT, {
    detail: {
      feed,
      feedUrl,
      pathname,
      refreshedAt: Date.now(),
    },
  }));

  return feed;
}

export function clearStorefrontCatalogSnapshot() {
  memorySnapshot = null;
  feedLoadPromises.clear();
  backgroundFeedRefreshes.clear();
  productLoadPromises.clear();

  if (!canUseStorage()) return;

  try {
    window.localStorage.removeItem(CATALOG_CACHE_KEY);
  } catch {
    // Ignore storage cleanup failures.
  }
}
