import apiServerClient from '@/lib/apiServerClient.js';

export const STOREFRONT_CONTACT_EVENT = 'alsenussi:storefront-contact-change';

export const DEFAULT_STOREFRONT_CONTACT = Object.freeze({
  phone: '+218 21 333 3622',
  email: 'info@sanusi.ly',
});

const CACHE_KEY = 'alsenussi:storefront-contact:v1';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[+\d\s().-]+$/;

function normalizePhone(value) {
  const phone = String(value || '').trim().replace(/\s+/g, ' ').slice(0, 40);
  const digitCount = phone.replace(/\D/g, '').length;

  if (!PHONE_PATTERN.test(phone) || digitCount < 7 || digitCount > 15) {
    return DEFAULT_STOREFRONT_CONTACT.phone;
  }

  return phone;
}

function normalizeEmail(value) {
  const email = String(value || '').trim().toLowerCase().slice(0, 254);
  return EMAIL_PATTERN.test(email) ? email : DEFAULT_STOREFRONT_CONTACT.email;
}

export function normalizeStorefrontContact(value) {
  const source = value?.value && typeof value.value === 'object' ? value.value : value;

  if (!source || Array.isArray(source) || typeof source !== 'object') {
    return { ...DEFAULT_STOREFRONT_CONTACT };
  }

  return {
    phone: normalizePhone(source.contact_phone ?? source.phone),
    email: normalizeEmail(source.contact_email ?? source.email),
  };
}

export function createTelephoneHref(phone) {
  const displayPhone = normalizePhone(phone);
  const digits = displayPhone.replace(/\D/g, '');
  return `tel:${displayPhone.startsWith('+') ? '+' : ''}${digits}`;
}

export function readCachedStorefrontContact() {
  if (typeof window === 'undefined') return { ...DEFAULT_STOREFRONT_CONTACT };

  try {
    const cached = JSON.parse(window.localStorage.getItem(CACHE_KEY) || 'null');
    return normalizeStorefrontContact(cached?.value || cached);
  } catch {
    return { ...DEFAULT_STOREFRONT_CONTACT };
  }
}

export function writeCachedStorefrontContact(value, { notify = true } = {}) {
  const contact = normalizeStorefrontContact(value);

  if (typeof window === 'undefined') return contact;

  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify({ value: contact, savedAt: Date.now() }));
  } catch {
    // Rendering still uses the freshly loaded in-memory value when storage is unavailable.
  }

  if (notify) {
    window.dispatchEvent(new CustomEvent(STOREFRONT_CONTACT_EVENT, { detail: contact }));
  }

  return contact;
}

export async function fetchStorefrontContact({ signal } = {}) {
  const response = await apiServerClient.fetch('/storefront/contact', {
    cache: 'no-store',
    signal,
  });

  if (!response.ok) {
    throw new Error('Failed to load storefront contact settings');
  }

  const payload = await response.json();
  return writeCachedStorefrontContact(payload?.value || payload, { notify: false });
}
