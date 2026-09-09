import { CART_CUSTOMER_KEY } from './storefrontCart.js';

const COUPON_STORAGE_KEY = 'alsanusi_storefront_coupon';
const COUPON_CHANGE_EVENT = 'storefront-coupon:change';

export function normalizeCouponCode(value = '') {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '-');
}

function roundMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}

function getCouponStorageKey() {
  if (typeof window === 'undefined') return COUPON_STORAGE_KEY;

  const customerId = window.localStorage.getItem(CART_CUSTOMER_KEY);
  return customerId ? `${COUPON_STORAGE_KEY}:${customerId}` : null;
}

function normalizeAppliedCoupon(coupon) {
  const code = normalizeCouponCode(coupon?.code);
  const discountType = coupon?.discountType === 'fixed' ? 'fixed' : 'percent';
  const discountValue = Number(coupon?.discountValue || 0);

  if (!code || !Number.isFinite(discountValue) || discountValue <= 0) return null;

  const rawMaxDiscount = coupon?.maxDiscountAmount;
  const maxDiscountAmount = rawMaxDiscount === null || rawMaxDiscount === undefined || rawMaxDiscount === ''
    ? null
    : Math.max(0, Number(rawMaxDiscount) || 0);

  return {
    code,
    name: String(coupon?.name || '').trim() || null,
    discountType,
    discountValue: roundMoney(discountValue),
    maxDiscountAmount,
    minOrderAmount: Math.max(0, Number(coupon?.minOrderAmount || 0)),
    discountAmount: Math.max(0, Number(coupon?.discountAmount || 0)),
    subtotal: Math.max(0, Number(coupon?.subtotal || 0)),
    appliedAt: coupon?.appliedAt || new Date().toISOString(),
  };
}

function emitCouponChange(coupon) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(COUPON_CHANGE_EVENT, { detail: { coupon } }));
}

export function calculateAppliedCouponDiscount(coupon, subtotal) {
  const normalizedCoupon = normalizeAppliedCoupon(coupon);
  const cartSubtotal = Math.max(0, Number(subtotal || 0));

  if (!normalizedCoupon || cartSubtotal <= 0 || cartSubtotal < normalizedCoupon.minOrderAmount) {
    return 0;
  }

  const rawDiscount = normalizedCoupon.discountType === 'percent'
    ? (cartSubtotal * normalizedCoupon.discountValue) / 100
    : normalizedCoupon.discountValue;
  const cappedDiscount = normalizedCoupon.maxDiscountAmount === null
    ? rawDiscount
    : Math.min(rawDiscount, normalizedCoupon.maxDiscountAmount);

  return roundMoney(Math.min(cartSubtotal, Math.max(0, cappedDiscount)));
}

export function readAppliedCoupon() {
  if (typeof window === 'undefined') return null;

  try {
    const storageKey = getCouponStorageKey();
    if (!storageKey) return null;

    return normalizeAppliedCoupon(JSON.parse(window.localStorage.getItem(storageKey) || 'null'));
  } catch {
    return null;
  }
}

export function writeAppliedCoupon(coupon) {
  const storageKey = getCouponStorageKey();
  const normalizedCoupon = normalizeAppliedCoupon(coupon);

  if (typeof window !== 'undefined' && storageKey && normalizedCoupon) {
    window.localStorage.setItem(storageKey, JSON.stringify(normalizedCoupon));
  }

  emitCouponChange(storageKey ? normalizedCoupon : null);
  return storageKey ? normalizedCoupon : null;
}

export function clearAppliedCoupon() {
  const storageKey = getCouponStorageKey();

  if (typeof window !== 'undefined' && storageKey) {
    window.localStorage.removeItem(storageKey);
  }

  emitCouponChange(null);
}

export { COUPON_CHANGE_EVENT };
