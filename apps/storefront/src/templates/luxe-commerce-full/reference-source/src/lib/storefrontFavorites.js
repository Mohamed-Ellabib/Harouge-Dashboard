import { normalizeCommerceFavoriteIds } from '@/lib/storefrontCommerceStateCore.js';

const FAVORITES_STORAGE_KEY = 'alsanusi_storefront_favorites';
const FAVORITES_CUSTOMER_KEY = 'alsanusi_storefront_favorites_customer';
const FAVORITES_CHANGE_EVENT = 'storefront-favorites:change';

function getActiveFavoriteCustomerId() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(FAVORITES_CUSTOMER_KEY);
}

function emitFavoritesChange(items, source = 'local') {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(FAVORITES_CHANGE_EVENT, {
    detail: {
      items,
      source,
      customerId: getActiveFavoriteCustomerId(),
    },
  }));
}

function getFavoritesStorageKey() {
  if (typeof window === 'undefined') return FAVORITES_STORAGE_KEY;

  const customerId = getActiveFavoriteCustomerId();
  return customerId ? `${FAVORITES_STORAGE_KEY}:${customerId}` : null;
}

function normalizeFavoriteId(productId) {
  return String(productId || '').trim();
}

export function setActiveFavoriteCustomer(customerId) {
  if (typeof window === 'undefined') return [];

  if (customerId) {
    window.localStorage.setItem(FAVORITES_CUSTOMER_KEY, String(customerId));
  } else {
    window.localStorage.removeItem(FAVORITES_CUSTOMER_KEY);
  }

  const items = readFavoriteItems();
  emitFavoritesChange(items, 'customer-change');
  return items;
}

export function readFavoriteItems() {
  if (typeof window === 'undefined') return [];

  try {
    const storageKey = getFavoritesStorageKey();
    if (!storageKey) return [];

    const rawItems = JSON.parse(window.localStorage.getItem(storageKey) || '[]');
    if (!Array.isArray(rawItems)) return [];

    return normalizeCommerceFavoriteIds(rawItems);
  } catch {
    return [];
  }
}

export function writeFavoriteItems(items) {
  const storageKey = getFavoritesStorageKey();
  const normalizedItems = normalizeCommerceFavoriteIds(items);

  if (typeof window !== 'undefined' && storageKey) {
    window.localStorage.setItem(storageKey, JSON.stringify(normalizedItems));
  }

  emitFavoritesChange(storageKey ? normalizedItems : [], 'local');
  return storageKey ? normalizedItems : [];
}

export function readCustomerFavoriteItems(customerId) {
  const normalizedCustomerId = String(customerId || '').trim();
  if (typeof window === 'undefined' || !normalizedCustomerId) return [];

  try {
    const rawItems = JSON.parse(window.localStorage.getItem(
      `${FAVORITES_STORAGE_KEY}:${normalizedCustomerId}`,
    ) || '[]');
    return normalizeCommerceFavoriteIds(rawItems);
  } catch {
    return [];
  }
}

export function replaceCustomerFavoriteItems(customerId, items) {
  const normalizedCustomerId = String(customerId || '').trim();
  const normalizedItems = normalizeCommerceFavoriteIds(items);
  if (typeof window === 'undefined' || !normalizedCustomerId) return normalizedItems;

  window.localStorage.setItem(
    `${FAVORITES_STORAGE_KEY}:${normalizedCustomerId}`,
    JSON.stringify(normalizedItems),
  );

  if (getActiveFavoriteCustomerId() === normalizedCustomerId) {
    emitFavoritesChange(normalizedItems, 'server');
  }

  return normalizedItems;
}

export function isProductFavorite(productId) {
  const normalizedId = normalizeFavoriteId(productId);
  if (!normalizedId) return false;
  return readFavoriteItems().includes(normalizedId);
}

export function toggleFavoriteItem(productId) {
  const normalizedId = normalizeFavoriteId(productId);
  if (!normalizedId) return readFavoriteItems();

  const currentItems = readFavoriteItems();
  if (currentItems.includes(normalizedId)) {
    return writeFavoriteItems(currentItems.filter((item) => item !== normalizedId));
  }

  return writeFavoriteItems([...currentItems, normalizedId]);
}

export function getFavoriteCount() {
  return readFavoriteItems().length;
}

export function removeCustomerFavoriteData(customerId) {
  if (typeof window === 'undefined' || !customerId) return;

  const normalizedCustomerId = String(customerId);
  window.localStorage.removeItem(`${FAVORITES_STORAGE_KEY}:${normalizedCustomerId}`);

  if (window.localStorage.getItem(FAVORITES_CUSTOMER_KEY) === normalizedCustomerId) {
    window.localStorage.removeItem(FAVORITES_CUSTOMER_KEY);
  }

  emitFavoritesChange([], 'account-delete');
}

export { FAVORITES_CHANGE_EVENT, FAVORITES_STORAGE_KEY, FAVORITES_CUSTOMER_KEY };
