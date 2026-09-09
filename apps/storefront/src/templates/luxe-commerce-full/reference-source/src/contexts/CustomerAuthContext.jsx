import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import apiServerClient from '@/lib/apiServerClient.js';
import {
  flushCustomerCommerceState,
  removeCustomerCommerceSyncData,
  startCustomerCommerceSync,
  stopCustomerCommerceSync,
} from '@/lib/customerCommerceSync.js';
import { removeCustomerCartData } from '@/lib/storefrontCart.js';
import { removeCustomerFavoriteData } from '@/lib/storefrontFavorites.js';
import { removeCustomerProfileImage } from '@/lib/customerProfileImage.js';
import {
  clearPersistedCustomerSession,
  persistCustomerSession,
  readCustomerSession,
} from '@/lib/customerSessionStorage.js';

const CustomerAuthContext = createContext(null);

function toWesternDigits(value) {
  return String(value || '')
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)));
}

export function normalizeCustomerPhone(value) {
  const compactPhone = toWesternDigits(value)
    .trim()
    .replace(/[\s\-().+]/g, '');

  if (!compactPhone) return '';
  if (compactPhone.startsWith('00')) return compactPhone.slice(2);
  if (compactPhone.startsWith('218')) return compactPhone;
  if (compactPhone.startsWith('0')) return `218${compactPhone.slice(1)}`;

  return `218${compactPhone}`;
}

async function readApiError(response) {
  try {
    const payload = await response.json();
    return payload?.error || payload?.message || 'تعذر إكمال العملية. حاول مرة أخرى.';
  } catch {
    return 'تعذر إكمال العملية. حاول مرة أخرى.';
  }
}

async function createApiError(response) {
  const error = new Error(await readApiError(response));
  error.status = response.status;
  return error;
}

function clearCustomerDeviceData(customerId) {
  if (!customerId) return;
  removeCustomerProfileImage(customerId);
  removeCustomerCartData(customerId);
  removeCustomerFavoriteData(customerId);
  removeCustomerCommerceSyncData(customerId);
}

export function CustomerAuthProvider({ children }) {
  const [customerToken, setCustomerToken] = useState(null);
  const [currentCustomer, setCurrentCustomer] = useState(null);
  const [isSessionHydrated, setIsSessionHydrated] = useState(false);
  const [isCustomerLoading, setIsCustomerLoading] = useState(true);

  const applyCustomerSession = useCallback((token, customer) => {
    setCustomerToken(token);
    setCurrentCustomer(customer);
    persistCustomerSession(token, customer).catch((error) => {
      console.warn('Unable to persist the customer session securely.', error);
    });
    if (customer?.id && token) {
      startCustomerCommerceSync({ customerId: customer.id, token }).catch((error) => {
        console.warn('Unable to synchronize customer cart and favorites.', error);
      });
    }
  }, []);

  const clearCustomerState = useCallback(() => {
    setCustomerToken(null);
    setCurrentCustomer(null);
    clearPersistedCustomerSession().catch((error) => {
      console.warn('Unable to clear the persisted customer session.', error);
    });
    stopCustomerCommerceSync();
  }, []);

  const fetchCurrentCustomer = useCallback(async (token) => {
    const response = await apiServerClient.fetch('/auth/customer/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw await createApiError(response);
    }

    const payload = await response.json();
    applyCustomerSession(token, payload.customer);
    return payload.customer;
  }, [applyCustomerSession]);

  useEffect(() => {
    let isMounted = true;

    readCustomerSession()
      .then((session) => {
        if (!isMounted || !session?.token) return;
        setCustomerToken(session.token);
        setCurrentCustomer(session.customer || null);
      })
      .catch((error) => {
        console.warn('Unable to restore the customer session.', error);
      })
      .finally(() => {
        if (isMounted) setIsSessionHydrated(true);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isSessionHydrated) return undefined;

    let isMounted = true;

    async function initCustomerAuth() {
      if (!customerToken) {
        clearCustomerState();
        if (isMounted) setIsCustomerLoading(false);
        return;
      }

      try {
        await fetchCurrentCustomer(customerToken);
      } catch (error) {
        if (isMounted) {
          clearCustomerState();
        }
      } finally {
        if (isMounted) setIsCustomerLoading(false);
      }
    }

    initCustomerAuth();

    return () => {
      isMounted = false;
    };
  }, [clearCustomerState, customerToken, fetchCurrentCustomer, isSessionHydrated]);

  const requestSignUpOtp = useCallback(async ({ fullName, phone, password }) => {
    const response = await apiServerClient.fetch('/auth/customer/signup/request-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fullName,
        phone: normalizeCustomerPhone(phone),
        password,
      }),
    });

    if (!response.ok) {
      throw await createApiError(response);
    }

    const payload = await response.json();
    return payload;
  }, []);

  const verifySignUpOtp = useCallback(async ({ fullName, phone, password, code }) => {
    const response = await apiServerClient.fetch('/auth/customer/signup/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fullName,
        phone: normalizeCustomerPhone(phone),
        password,
        code,
      }),
    });

    if (!response.ok) {
      throw await createApiError(response);
    }

    const payload = await response.json();
    return { customer: payload.customer, verified: payload.verified };
  }, []);

  const requestPasswordResetOtp = useCallback(async ({ phone }) => {
    const response = await apiServerClient.fetch('/auth/customer/password-reset/request-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: normalizeCustomerPhone(phone),
      }),
    });

    if (!response.ok) {
      throw await createApiError(response);
    }

    return response.json();
  }, []);

  const verifyPasswordResetOtp = useCallback(async ({ phone, code }) => {
    const response = await apiServerClient.fetch('/auth/customer/password-reset/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: normalizeCustomerPhone(phone),
        code,
      }),
    });

    if (!response.ok) {
      throw await createApiError(response);
    }

    return response.json();
  }, []);

  const confirmPasswordReset = useCallback(async ({ phone, resetToken, password }) => {
    const response = await apiServerClient.fetch('/auth/customer/password-reset/confirm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: normalizeCustomerPhone(phone),
        resetToken,
        password,
      }),
    });

    if (!response.ok) {
      throw await createApiError(response);
    }

    return response.json();
  }, []);

  const signInCustomer = useCallback(async ({ phone, password }) => {
    const response = await apiServerClient.fetch('/auth/customer/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: normalizeCustomerPhone(phone),
        password,
      }),
    });

    if (!response.ok) {
      throw await createApiError(response);
    }

    const payload = await response.json();
    applyCustomerSession(payload.token, payload.customer);
    return payload.customer;
  }, [applyCustomerSession]);

  const getCustomerSettings = useCallback(async () => {
    if (!customerToken) throw new Error('سجل الدخول للوصول إلى إعدادات الحساب.');

    const response = await apiServerClient.fetch('/auth/customer/settings', {
      headers: {
        Authorization: `Bearer ${customerToken}`,
      },
    });
    if (!response.ok) throw await createApiError(response);

    return response.json();
  }, [customerToken]);

  const updateCustomerProfile = useCallback(async ({ fullName }) => {
    if (!customerToken) throw new Error('سجل الدخول لتحديث بيانات الحساب.');

    const response = await apiServerClient.fetch('/auth/customer/profile', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${customerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fullName }),
    });
    if (!response.ok) throw await createApiError(response);

    const payload = await response.json();
    applyCustomerSession(customerToken, payload.customer);
    return payload.customer;
  }, [applyCustomerSession, customerToken]);

  const updateCustomerPassword = useCallback(async ({ currentPassword, newPassword }) => {
    if (!customerToken) throw new Error('سجل الدخول لتغيير كلمة المرور.');

    const response = await apiServerClient.fetch('/auth/customer/password', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${customerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    if (!response.ok) throw await createApiError(response);

    return response.json();
  }, [customerToken]);

  const updateCustomerAddress = useCallback(async (address) => {
    if (!customerToken) throw new Error('سجل الدخول لتحديث عنوانك.');

    const response = await apiServerClient.fetch('/auth/customer/address', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${customerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(address),
    });
    if (!response.ok) throw await createApiError(response);

    return response.json();
  }, [customerToken]);

  const deleteCustomerAccount = useCallback(async ({ currentPassword }) => {
    if (!customerToken) throw new Error('سجل الدخول لحذف حسابك.');

    const customerId = currentCustomer?.id;
    const response = await apiServerClient.fetch('/auth/customer/account', {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${customerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ currentPassword }),
    });
    if (!response.ok) throw await createApiError(response);

    const payload = await response.json();
    clearCustomerDeviceData(customerId);
    clearCustomerState();
    return payload;
  }, [clearCustomerState, currentCustomer?.id, customerToken]);

  const signOutCustomer = useCallback(async () => {
    try {
      await flushCustomerCommerceState();
    } catch {
      // Unsynced changes remain in local storage and are retried after the next sign-in.
    }
    clearCustomerState();
  }, [clearCustomerState]);

  const value = useMemo(() => ({
    currentCustomer,
    customerSession: customerToken ? { accessToken: customerToken } : null,
    isCustomerAuthenticated: Boolean(customerToken && currentCustomer),
    isCustomerLoading,
    requestSignUpOtp,
    requestPasswordResetOtp,
    verifySignUpOtp,
    verifyPasswordResetOtp,
    confirmPasswordReset,
    signInCustomer,
    signOutCustomer,
    getCustomerSettings,
    updateCustomerProfile,
    updateCustomerPassword,
    updateCustomerAddress,
    deleteCustomerAccount,
    normalizeCustomerPhone,
  }), [
    confirmPasswordReset,
    currentCustomer,
    customerToken,
    isCustomerLoading,
    requestPasswordResetOtp,
    requestSignUpOtp,
    signInCustomer,
    signOutCustomer,
    getCustomerSettings,
    updateCustomerAddress,
    deleteCustomerAccount,
    updateCustomerPassword,
    updateCustomerProfile,
    verifyPasswordResetOtp,
    verifySignUpOtp,
  ]);

  return (
    <CustomerAuthContext.Provider value={value}>
      {children}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth() {
  const context = useContext(CustomerAuthContext);
  if (!context) {
    throw new Error('useCustomerAuth must be used inside CustomerAuthProvider');
  }

  return context;
}
