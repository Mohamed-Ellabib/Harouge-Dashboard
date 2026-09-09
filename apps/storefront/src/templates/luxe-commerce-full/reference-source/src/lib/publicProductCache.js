import { sanitizeProductListPayload, sanitizeProductPayload } from '@/lib/productPayloadSanitizer.js';

const CACHE_PREFIX = 'alsenussi:public-products:v4:';
const CATALOG_CACHE_KEY = 'alsenussi:storefront-catalog:v4';
const FRESH_TTL_MS = 5 * 60 * 1000;
const STALE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const memoryCache = new Map();
const inFlightRequests = new Map();

function canUseStorage() {
  return typeof window !== 'undefined' && Boolean(window.localStorage);
}

function getMethod(options = {}) {
  return String(options.method || 'GET').toUpperCase();
}

function hasAuthorizationHeader(options = {}) {
  const headers = new Headers(options.headers || {});
  return Boolean(headers.get('authorization'));
}

function normalizeProductCacheUrl(url) {
  const parsedUrl = new URL(url, window.location.origin);
  const parts = parsedUrl.pathname.split('/').filter(Boolean);

  if (parts[0] !== 'products') return null;
  if (parts.length !== 1 && parts.length !== 2) return null;

  parsedUrl.searchParams.sort();
  return `${parsedUrl.pathname}${parsedUrl.search}`;
}

function isCacheableProductRequest(url, options = {}) {
  if (typeof window === 'undefined') return false;
  if (getMethod(options) !== 'GET') return false;
  if (hasAuthorizationHeader(options)) return false;
  return Boolean(normalizeProductCacheUrl(url));
}

function getCacheKey(url) {
  return `${CACHE_PREFIX}${normalizeProductCacheUrl(url)}`;
}

function readCacheEntry(key) {
  const memoryEntry = memoryCache.get(key);
  if (memoryEntry) return memoryEntry;

  if (!canUseStorage()) return null;

  try {
    const rawEntry = window.localStorage.getItem(key);
    if (!rawEntry) return null;

    const entry = JSON.parse(rawEntry);
    if (!entry?.body || !entry?.savedAt) return null;

    memoryCache.set(key, entry);
    return entry;
  } catch {
    return null;
  }
}

function writeCacheEntry(key, entry) {
  memoryCache.set(key, entry);

  if (!canUseStorage()) return;

  try {
    window.localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // Storage can be unavailable or full; memory cache still improves this tab.
  }
}

export function writeCachedPublicProductJson(url, payload) {
  if (!isCacheableProductRequest(url) || !payload) return;

  const sanitizedPayload = sanitizeProductListPayload(payload);

  writeCacheEntry(getCacheKey(url), {
    body: JSON.stringify(sanitizedPayload),
    contentType: 'application/json; charset=utf-8',
    savedAt: Date.now(),
    status: 200,
    statusText: 'OK',
  });
}

function isEntryFresh(entry, now = Date.now()) {
  return now - entry.savedAt <= FRESH_TTL_MS;
}

function isEntryUsable(entry, now = Date.now()) {
  return now - entry.savedAt <= STALE_TTL_MS;
}

function parseCacheEntryBody(entry) {
  try {
    return JSON.parse(entry.body);
  } catch {
    return null;
  }
}

function createCachedResponse(entry) {
  return new Response(entry.body, {
    status: entry.status || 200,
    statusText: entry.statusText || 'OK',
    headers: {
      'content-type': entry.contentType || 'application/json; charset=utf-8',
      'x-alsenussi-cache': 'hit',
    },
  });
}

async function storeResponse(key, response) {
  if (!response?.ok) return;

  const contentType = response.headers.get('content-type') || '';
  const body = await response.clone().text();
  const looksLikeJson = contentType.toLowerCase().includes('application/json') || /^[\s]*[\[{]/.test(body);
  if (!looksLikeJson) return;

  let payload;
  let cacheBody = body;

  try {
    payload = sanitizeProductListPayload(JSON.parse(body));
    cacheBody = JSON.stringify(payload);
  } catch {
    payload = null;
  }

  writeCacheEntry(key, {
    body: cacheBody,
    contentType: contentType || 'application/json; charset=utf-8',
    savedAt: Date.now(),
    status: response.status,
    statusText: response.statusText,
  });
}

async function fetchAndStoreOnce(key, fetcher) {
  let request = inFlightRequests.get(key);

  if (!request) {
    request = (async () => {
      const response = await fetcher();
      await storeResponse(key, response);
      return response;
    })().finally(() => {
      inFlightRequests.delete(key);
    });

    inFlightRequests.set(key, request);
  }

  return (await request).clone();
}

function revalidateInBackground(key, fetcher) {
  window.setTimeout(async () => {
    try {
      await fetchAndStoreOnce(key, fetcher);
    } catch {
      // The stale response is already displayed; background refresh is best effort.
    }
  }, 0);
}

export async function fetchWithPublicProductCache(url, options = {}, fetcher) {
  if (!isCacheableProductRequest(url, options)) {
    return fetcher();
  }

  const key = getCacheKey(url);

  if (options.cache === 'reload' || options.cache === 'no-store') {
    return fetchAndStoreOnce(key, fetcher);
  }

  const entry = readCacheEntry(key);
  const now = Date.now();

  if (entry && isEntryFresh(entry, now)) {
    return createCachedResponse(entry);
  }

  if (entry && isEntryUsable(entry, now)) {
    revalidateInBackground(key, fetcher);
    return createCachedResponse(entry);
  }

  try {
    return await fetchAndStoreOnce(key, fetcher);
  } catch (error) {
    if (entry) return createCachedResponse(entry);
    throw error;
  }
}

export function getCachedPublicProductJson(url, options = {}) {
  if (!isCacheableProductRequest(url, options)) return null;

  const entry = readCacheEntry(getCacheKey(url));
  if (!entry || !isEntryUsable(entry)) return null;

  return sanitizeProductListPayload(parseCacheEntryBody(entry));
}

export function clearPublicProductCache() {
  memoryCache.clear();
  inFlightRequests.clear();

  if (!canUseStorage()) return;

  for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
    const key = window.localStorage.key(index);
    if (key?.startsWith(CACHE_PREFIX)) {
      window.localStorage.removeItem(key);
    }
  }

  window.localStorage.removeItem(CATALOG_CACHE_KEY);
}
