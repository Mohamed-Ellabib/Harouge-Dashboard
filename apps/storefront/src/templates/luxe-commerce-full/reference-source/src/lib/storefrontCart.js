import {
  mergeCommerceCartItems,
  normalizeCommerceCartItems,
} from '@/lib/storefrontCommerceStateCore.js';

const CART_STORAGE_KEY = 'alsanusi_storefront_cart';
const CART_CUSTOMER_KEY = 'alsanusi_storefront_cart_customer';
const CART_CHANGE_EVENT = 'storefront-cart:change';
const GUEST_CART_KEY = `${CART_STORAGE_KEY}:guest`;

function normalizeCartItem(item) {
  const productId = String(item?.productId || item?.id || '').trim();
  const quantity = Math.max(1, Math.min(99, Number.parseInt(item?.quantity, 10) || 1));

  if (!productId) return null;

  return { productId, quantity };
}

function getActiveCartCustomerId() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(CART_CUSTOMER_KEY);
}

function emitCartChange(items, source = 'local') {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(CART_CHANGE_EVENT, {
    detail: {
      items,
      source,
      customerId: getActiveCartCustomerId(),
    },
  }));
}

function getCartStorageKey() {
  if (typeof window === 'undefined') return CART_STORAGE_KEY;

  const customerId = getActiveCartCustomerId();
  return customerId ? `${CART_STORAGE_KEY}:${customerId}` : GUEST_CART_KEY;
}

function readItemsFromStorage(storageKey) {
  if (typeof window === 'undefined' || !storageKey) return [];

  try {
    const rawItems = JSON.parse(window.localStorage.getItem(storageKey) || '[]');
    if (!Array.isArray(rawItems)) return [];

    return normalizeCommerceCartItems(rawItems);
  } catch {
    return [];
  }
}

function mergeCartItems(primaryItems, secondaryItems) {
  return mergeCommerceCartItems(primaryItems, secondaryItems);
}

export function setActiveCartCustomer(customerId, { mergeGuest = true } = {}) {
  if (typeof window === 'undefined') return { items: [], guestItems: [] };

  if (customerId) {
    const customerCartKey = `${CART_STORAGE_KEY}:${customerId}`;
    const guestItems = readItemsFromStorage(GUEST_CART_KEY);
    const customerItems = readItemsFromStorage(customerCartKey);
    const mergedItems = mergeGuest ? mergeCartItems(customerItems, guestItems) : customerItems;

    window.localStorage.setItem(CART_CUSTOMER_KEY, String(customerId));

    if (mergeGuest && guestItems.length > 0) {
      window.localStorage.setItem(customerCartKey, JSON.stringify(mergedItems));
      window.localStorage.removeItem(GUEST_CART_KEY);
    }

    emitCartChange(mergedItems, 'customer-change');
    return { items: mergedItems, guestItems };
  } else {
    window.localStorage.removeItem(CART_CUSTOMER_KEY);
  }

  const items = readCartItems();
  emitCartChange(items, 'customer-change');
  return { items, guestItems: [] };
}

export function hasActiveCartCustomer() {
  if (typeof window === 'undefined') return false;
  return Boolean(window.localStorage.getItem(CART_CUSTOMER_KEY));
}

export function readCartItems() {
  if (typeof window === 'undefined') return [];
  return readItemsFromStorage(getCartStorageKey());
}

export function readGuestCartItems() {
  return readItemsFromStorage(GUEST_CART_KEY);
}

export function clearGuestCartItems() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(GUEST_CART_KEY);
  if (!hasActiveCartCustomer()) emitCartChange([], 'server');
}

export function readCustomerCartItems(customerId) {
  if (!customerId) return [];
  return readItemsFromStorage(`${CART_STORAGE_KEY}:${customerId}`);
}

export function replaceCustomerCartItems(customerId, items) {
  const normalizedCustomerId = String(customerId || '').trim();
  const normalizedItems = normalizeCommerceCartItems(items);
  if (typeof window === 'undefined' || !normalizedCustomerId) return normalizedItems;

  window.localStorage.setItem(
    `${CART_STORAGE_KEY}:${normalizedCustomerId}`,
    JSON.stringify(normalizedItems),
  );

  if (getActiveCartCustomerId() === normalizedCustomerId) {
    emitCartChange(normalizedItems, 'server');
  }

  return normalizedItems;
}

export function writeCartItems(items) {
  const storageKey = getCartStorageKey();
  const normalizedItems = normalizeCommerceCartItems(items);

  if (typeof window !== 'undefined' && storageKey) {
    window.localStorage.setItem(storageKey, JSON.stringify(normalizedItems));
  }

  emitCartChange(normalizedItems, 'local');
  return normalizedItems;
}

export function addProductToCart(productId, quantity = 1) {
  const normalizedItem = normalizeCartItem({ productId, quantity });
  if (!normalizedItem) return readCartItems();

  const cartItems = readCartItems();
  const currentItem = cartItems.find((item) => item.productId === normalizedItem.productId);

  if (currentItem) {
    return writeCartItems(cartItems.map((item) => (
      item.productId === normalizedItem.productId
        ? { ...item, quantity: item.quantity + normalizedItem.quantity }
        : item
    )));
  }

  return writeCartItems([...cartItems, normalizedItem]);
}

export function updateCartItemQuantity(productId, quantity) {
  const nextQuantity = Math.max(1, Number.parseInt(quantity, 10) || 1);
  return writeCartItems(readCartItems().map((item) => (
    item.productId === productId ? { ...item, quantity: nextQuantity } : item
  )));
}

export function removeCartItem(productId) {
  return writeCartItems(readCartItems().filter((item) => item.productId !== productId));
}

export function clearCartItems() {
  return writeCartItems([]);
}

export function removeCustomerCartData(customerId) {
  if (typeof window === 'undefined' || !customerId) return;

  const normalizedCustomerId = String(customerId);
  window.localStorage.removeItem(`${CART_STORAGE_KEY}:${normalizedCustomerId}`);

  if (window.localStorage.getItem(CART_CUSTOMER_KEY) === normalizedCustomerId) {
    window.localStorage.removeItem(CART_CUSTOMER_KEY);
  }

  emitCartChange(readCartItems(), 'account-delete');
}

export function getCartItemCount() {
  return readCartItems().reduce((total, item) => total + item.quantity, 0);
}

export { CART_CHANGE_EVENT, CART_STORAGE_KEY, CART_CUSTOMER_KEY };
