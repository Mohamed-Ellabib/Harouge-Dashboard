export const CUSTOMER_ORDERS_UPDATED_EVENT = 'customer-orders:updated';
export const CUSTOMER_ORDERS_REFRESH_INTERVAL_MS = 3000;
export const ORDER_SUMMARY_CACHE_PREFIX = 'customer-order-summary:';

const CUSTOMER_ORDERS_BROADCAST_CHANNEL = 'customer-orders-updates';
const CUSTOMER_ORDERS_STORAGE_KEY = 'customer-orders-updated-at';

export function cacheCustomerOrderSummary(order) {
  if (typeof window === 'undefined' || !order?.id) return;

  try {
    window.sessionStorage.setItem(`${ORDER_SUMMARY_CACHE_PREFIX}${order.id}`, JSON.stringify(order));
  } catch {
    // Cache failure should not block the detail route.
  }
}

export function readCachedCustomerOrderSummary(orderId) {
  if (typeof window === 'undefined' || !orderId) return null;

  try {
    const cachedValue = window.sessionStorage.getItem(`${ORDER_SUMMARY_CACHE_PREFIX}${orderId}`);
    return cachedValue ? JSON.parse(cachedValue) : null;
  } catch {
    return null;
  }
}

export function notifyCustomerOrdersUpdated(detail = {}) {
  if (typeof window === 'undefined') return;

  const payload = {
    ...detail,
    updatedAt: Date.now(),
  };

  window.dispatchEvent(new CustomEvent(CUSTOMER_ORDERS_UPDATED_EVENT, { detail: payload }));

  try {
    if ('BroadcastChannel' in window) {
      const channel = new BroadcastChannel(CUSTOMER_ORDERS_BROADCAST_CHANNEL);
      channel.postMessage(payload);
      channel.close();
    }
  } catch {
    // Cross-tab notification is best-effort; polling still covers updates.
  }

  try {
    window.localStorage.setItem(CUSTOMER_ORDERS_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Storage may be blocked; the in-page event and polling still work.
  }
}

export function subscribeToCustomerOrderUpdates(handler) {
  if (typeof window === 'undefined') return () => {};

  function handleWindowEvent(event) {
    handler(event.detail || {});
  }

  function handleStorageEvent(event) {
    if (event.key !== CUSTOMER_ORDERS_STORAGE_KEY || !event.newValue) return;

    try {
      handler(JSON.parse(event.newValue));
    } catch {
      handler({});
    }
  }

  window.addEventListener(CUSTOMER_ORDERS_UPDATED_EVENT, handleWindowEvent);
  window.addEventListener('storage', handleStorageEvent);

  let channel = null;
  try {
    if ('BroadcastChannel' in window) {
      channel = new BroadcastChannel(CUSTOMER_ORDERS_BROADCAST_CHANNEL);
      channel.addEventListener('message', (event) => handler(event.data || {}));
    }
  } catch {
    channel = null;
  }

  return () => {
    window.removeEventListener(CUSTOMER_ORDERS_UPDATED_EVENT, handleWindowEvent);
    window.removeEventListener('storage', handleStorageEvent);
    channel?.close();
  };
}
