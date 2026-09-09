import apiServerClient from '@/lib/apiServerClient.js';

export const DEFAULT_CHECKOUT_SETTINGS = {
  defaultShippingFee: 25,
  freeShippingThreshold: 500,
};

function toMoneyNumber(value) {
  return Number(Number(value || 0).toFixed(2));
}

export function normalizeCheckoutSettings(value = {}) {
  return {
    defaultShippingFee: toMoneyNumber(value.default_shipping_fee ?? value.defaultShippingFee ?? DEFAULT_CHECKOUT_SETTINGS.defaultShippingFee),
    freeShippingThreshold: toMoneyNumber(value.free_shipping_threshold ?? value.freeShippingThreshold ?? DEFAULT_CHECKOUT_SETTINGS.freeShippingThreshold),
  };
}

export function calculateShippingFee(subtotal, checkoutSettings = DEFAULT_CHECKOUT_SETTINGS) {
  const settings = normalizeCheckoutSettings(checkoutSettings);
  const orderSubtotal = toMoneyNumber(subtotal);
  const defaultShippingFee = Math.max(0, settings.defaultShippingFee);
  const freeShippingThreshold = Math.max(0, settings.freeShippingThreshold);

  if (freeShippingThreshold > 0 && orderSubtotal >= freeShippingThreshold) {
    return 0;
  }

  return toMoneyNumber(defaultShippingFee);
}

export function getFreeShippingRemaining(subtotal, checkoutSettings = DEFAULT_CHECKOUT_SETTINGS) {
  const settings = normalizeCheckoutSettings(checkoutSettings);
  const freeShippingThreshold = Math.max(0, settings.freeShippingThreshold);

  if (freeShippingThreshold <= 0) return 0;
  return toMoneyNumber(Math.max(0, freeShippingThreshold - Number(subtotal || 0)));
}

export async function fetchCheckoutSettings({ signal } = {}) {
  const response = await apiServerClient.fetch('/customer/orders/checkout-options', { signal });

  if (!response.ok) {
    throw new Error('Failed to load checkout settings');
  }

  const payload = await response.json();
  return normalizeCheckoutSettings(payload.checkoutSettings);
}
