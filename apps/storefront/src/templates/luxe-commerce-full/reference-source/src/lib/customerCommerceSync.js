import apiServerClient from '@/lib/apiServerClient.js';
import {
  CART_CHANGE_EVENT,
  clearGuestCartItems,
  readCustomerCartItems,
  readGuestCartItems,
  replaceCustomerCartItems,
  setActiveCartCustomer,
} from '@/lib/storefrontCart.js';
import {
  FAVORITES_CHANGE_EVENT,
  readCustomerFavoriteItems,
  replaceCustomerFavoriteItems,
  setActiveFavoriteCustomer,
} from '@/lib/storefrontFavorites.js';
import {
  createCommerceStatePatch,
  mergeCommerceCartItems,
  reconcileCustomerCommerceState,
} from '@/lib/storefrontCommerceStateCore.js';

const PENDING_STORAGE_PREFIX = 'alsanusi_customer_commerce_pending';
const META_STORAGE_PREFIX = 'alsanusi_customer_commerce_meta';
const SYNC_DELAY_MS = 250;
const INITIAL_RETRY_DELAY_MS = 1500;
const MAX_RETRY_DELAY_MS = 30000;

let activeSession = null;
let hydrationPromise = null;
let syncTimer = null;
let syncQueue = Promise.resolve();
let listenersAttached = false;
let retryDelayMs = INITIAL_RETRY_DELAY_MS;
let sessionGeneration = 0;

function storageKey(prefix, customerId) {
  return `${prefix}:${customerId}`;
}

function readStoredJson(key, fallback) {
  if (typeof window === 'undefined') return fallback;

  try {
    return JSON.parse(window.localStorage.getItem(key) || 'null') || fallback;
  } catch {
    return fallback;
  }
}

function readPendingState(customerId) {
  const pendingState = readStoredJson(storageKey(PENDING_STORAGE_PREFIX, customerId), {});
  return {
    revision: Math.max(0, Number(pendingState.revision) || 0),
    cart: Boolean(pendingState.cart),
    favorites: Boolean(pendingState.favorites),
  };
}

function writePendingState(customerId, pendingState) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(
    storageKey(PENDING_STORAGE_PREFIX, customerId),
    JSON.stringify(pendingState),
  );
}

function markPendingSection(customerId, section) {
  const currentState = readPendingState(customerId);
  const nextState = {
    ...currentState,
    revision: currentState.revision + 1,
    [section]: true,
  };
  writePendingState(customerId, nextState);
  return nextState;
}

function clearPendingState(customerId, expectedRevision) {
  if (typeof window === 'undefined') return false;
  const currentState = readPendingState(customerId);
  if (currentState.revision !== expectedRevision) return false;
  window.localStorage.removeItem(storageKey(PENDING_STORAGE_PREFIX, customerId));
  return true;
}

function isCustomerStateInitialized(customerId) {
  const metadata = readStoredJson(storageKey(META_STORAGE_PREFIX, customerId), {});
  return metadata.version === 1;
}

function markCustomerStateInitialized(customerId) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(
    storageKey(META_STORAGE_PREFIX, customerId),
    JSON.stringify({ version: 1, syncedAt: new Date().toISOString() }),
  );
}

function readLocalState(customerId) {
  return {
    cartItems: readCustomerCartItems(customerId),
    favoriteIds: readCustomerFavoriteItems(customerId),
  };
}

function applyLocalState(customerId, state) {
  replaceCustomerCartItems(customerId, state?.cartItems || []);
  replaceCustomerFavoriteItems(customerId, state?.favoriteIds || []);
}

async function readResponsePayload(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

async function requestCommerceState(session, method, body) {
  const response = await apiServerClient.fetch('/auth/customer/commerce', {
    method,
    headers: {
      Authorization: `Bearer ${session.token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
    keepalive: method === 'PUT',
  });
  const payload = await readResponsePayload(response);

  if (!response.ok) {
    const error = new Error(payload?.error || 'تعذر حفظ السلة والمفضلة الآن.');
    error.status = response.status;
    throw error;
  }

  return payload;
}

function isCurrentSession(session) {
  return Boolean(
    activeSession
    && activeSession.customerId === session.customerId
    && activeSession.generation === session.generation,
  );
}

function scheduleCommerceSync(delay = SYNC_DELAY_MS) {
  if (!activeSession || typeof window === 'undefined') return;
  if (syncTimer) window.clearTimeout(syncTimer);
  syncTimer = window.setTimeout(() => {
    syncTimer = null;
    flushCustomerCommerceState().catch(() => {});
  }, delay);
}

function handleCommerceChange(section, event) {
  const source = event?.detail?.source;
  const customerId = String(event?.detail?.customerId || '');
  if (source !== 'local' || !activeSession || customerId !== activeSession.customerId) return;

  markPendingSection(customerId, section);
  retryDelayMs = INITIAL_RETRY_DELAY_MS;
  scheduleCommerceSync();
}

function ensureListeners() {
  if (listenersAttached || typeof window === 'undefined') return;
  listenersAttached = true;
  window.addEventListener(CART_CHANGE_EVENT, (event) => handleCommerceChange('cart', event));
  window.addEventListener(FAVORITES_CHANGE_EVENT, (event) => handleCommerceChange('favorites', event));
  window.addEventListener('pagehide', () => {
    flushCustomerCommerceState({ maxPasses: 1 }).catch(() => {});
  });
}

async function syncOneSnapshot(session) {
  if (!isCurrentSession(session)) return;
  const pendingState = readPendingState(session.customerId);
  if (!pendingState.cart && !pendingState.favorites) return;

  const localState = readLocalState(session.customerId);
  const changedState = createCommerceStatePatch(localState, pendingState);
  const serverState = await requestCommerceState(session, 'PUT', changedState);
  if (!isCurrentSession(session)) return;

  if (clearPendingState(session.customerId, pendingState.revision)) {
    applyLocalState(session.customerId, serverState);
    markCustomerStateInitialized(session.customerId);
    retryDelayMs = INITIAL_RETRY_DELAY_MS;
    return;
  }

  scheduleCommerceSync(0);
}

export async function flushCustomerCommerceState({ maxPasses = 3 } = {}) {
  if (syncTimer && typeof window !== 'undefined') {
    window.clearTimeout(syncTimer);
    syncTimer = null;
  }

  for (let pass = 0; pass < maxPasses; pass += 1) {
    const session = activeSession;
    if (!session) return;
    const pendingState = readPendingState(session.customerId);
    if (!pendingState.cart && !pendingState.favorites) return;

    syncQueue = syncQueue.catch(() => {}).then(() => syncOneSnapshot(session));

    try {
      await syncQueue;
    } catch (error) {
      if (isCurrentSession(session) && error?.status !== 401 && error?.status !== 403) {
        scheduleCommerceSync(retryDelayMs);
        retryDelayMs = Math.min(MAX_RETRY_DELAY_MS, retryDelayMs * 2);
      }
      throw error;
    }
  }
}

async function hydrateCustomerCommerceState(session, guestCartItems) {
  let serverState;

  try {
    serverState = await requestCommerceState(session, 'GET');
  } catch (error) {
    if (!isCurrentSession(session)) return;

    if (guestCartItems.length > 0) {
      const localState = readLocalState(session.customerId);
      replaceCustomerCartItems(
        session.customerId,
        mergeCommerceCartItems(localState.cartItems, guestCartItems),
      );
      clearGuestCartItems();
      markPendingSection(session.customerId, 'cart');
    }

    const pendingState = readPendingState(session.customerId);
    if (pendingState.cart || pendingState.favorites) scheduleCommerceSync(retryDelayMs);
    if (error?.status !== 401 && error?.status !== 403) {
      retryDelayMs = Math.min(MAX_RETRY_DELAY_MS, retryDelayMs * 2);
    }
    return;
  }

  if (!isCurrentSession(session)) return;

  const pendingState = readPendingState(session.customerId);
  const reconciledState = reconcileCustomerCommerceState({
    serverState,
    localState: readLocalState(session.customerId),
    pendingState,
    guestCartItems,
    isInitialized: isCustomerStateInitialized(session.customerId),
  });

  applyLocalState(session.customerId, reconciledState);
  if (guestCartItems.length > 0) clearGuestCartItems();
  if (reconciledState.shouldSyncCart && !pendingState.cart) {
    markPendingSection(session.customerId, 'cart');
  }
  if (reconciledState.shouldSyncFavorites && !pendingState.favorites) {
    markPendingSection(session.customerId, 'favorites');
  }

  if (reconciledState.shouldSync) {
    scheduleCommerceSync(0);
  } else {
    markCustomerStateInitialized(session.customerId);
  }
}

export async function startCustomerCommerceSync({ customerId, token }) {
  const normalizedCustomerId = String(customerId || '').trim();
  const normalizedToken = String(token || '').trim();
  if (!normalizedCustomerId || !normalizedToken || typeof window === 'undefined') return;

  ensureListeners();
  if (
    activeSession?.customerId === normalizedCustomerId
    && activeSession?.token === normalizedToken
  ) {
    return hydrationPromise;
  }

  if (activeSession) {
    try {
      await flushCustomerCommerceState();
    } catch {
      // Pending state remains in local storage for the next authenticated session.
    }
  }

  if (syncTimer) {
    window.clearTimeout(syncTimer);
    syncTimer = null;
  }

  const guestCartItems = readGuestCartItems();
  sessionGeneration += 1;
  activeSession = {
    customerId: normalizedCustomerId,
    token: normalizedToken,
    generation: sessionGeneration,
  };
  setActiveCartCustomer(normalizedCustomerId, { mergeGuest: false });
  setActiveFavoriteCustomer(normalizedCustomerId);

  const session = activeSession;
  hydrationPromise = hydrateCustomerCommerceState(session, guestCartItems);
  await hydrationPromise;
}

export function stopCustomerCommerceSync() {
  if (typeof window !== 'undefined' && syncTimer) window.clearTimeout(syncTimer);
  syncTimer = null;
  hydrationPromise = null;
  activeSession = null;
  setActiveCartCustomer(null);
  setActiveFavoriteCustomer(null);
}

export function removeCustomerCommerceSyncData(customerId) {
  const normalizedCustomerId = String(customerId || '').trim();
  if (!normalizedCustomerId || typeof window === 'undefined') return;
  window.localStorage.removeItem(storageKey(PENDING_STORAGE_PREFIX, normalizedCustomerId));
  window.localStorage.removeItem(storageKey(META_STORAGE_PREFIX, normalizedCustomerId));
}
