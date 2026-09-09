import { SecureStorage } from '@aparajita/capacitor-secure-storage';
import { Capacitor } from '@capacitor/core';

const CUSTOMER_TOKEN_KEY = 'alsanusi_customer_token';
const CUSTOMER_PROFILE_KEY = 'alsanusi_customer_profile';
const NATIVE_SESSION_KEY = 'customer_session';
const NATIVE_KEY_PREFIX = 'alsanusi_auth_';

function readLegacyWebSession() {
  if (typeof window === 'undefined') return null;

  const token = window.localStorage.getItem(CUSTOMER_TOKEN_KEY);
  if (!token) return null;

  try {
    const customer = JSON.parse(window.localStorage.getItem(CUSTOMER_PROFILE_KEY) || 'null');
    return { token, customer };
  } catch {
    return { token, customer: null };
  }
}

function clearLegacyWebSession() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(CUSTOMER_TOKEN_KEY);
  window.localStorage.removeItem(CUSTOMER_PROFILE_KEY);
}

async function prepareNativeStorage() {
  await SecureStorage.setKeyPrefix(NATIVE_KEY_PREFIX);
}

export async function readCustomerSession() {
  if (!Capacitor.isNativePlatform()) {
    return readLegacyWebSession();
  }

  await prepareNativeStorage();
  const nativeSession = await SecureStorage.get(NATIVE_SESSION_KEY);
  if (nativeSession && typeof nativeSession === 'object' && typeof nativeSession.token === 'string') {
    clearLegacyWebSession();
    return nativeSession;
  }

  const legacySession = readLegacyWebSession();
  if (legacySession?.token) {
    await SecureStorage.set(NATIVE_SESSION_KEY, legacySession);
    clearLegacyWebSession();
    return legacySession;
  }

  return null;
}

export async function persistCustomerSession(token, customer) {
  if (typeof window === 'undefined') return;

  if (!Capacitor.isNativePlatform()) {
    window.localStorage.setItem(CUSTOMER_TOKEN_KEY, token);
    window.localStorage.setItem(CUSTOMER_PROFILE_KEY, JSON.stringify(customer));
    return;
  }

  await prepareNativeStorage();
  await SecureStorage.set(NATIVE_SESSION_KEY, { token, customer });
  clearLegacyWebSession();
}

export async function clearPersistedCustomerSession() {
  if (typeof window === 'undefined') return;

  clearLegacyWebSession();
  if (!Capacitor.isNativePlatform()) return;

  await prepareNativeStorage();
  await SecureStorage.remove(NATIVE_SESSION_KEY);
}
