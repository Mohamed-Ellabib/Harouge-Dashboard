import apiServerClient from '@/lib/apiServerClient.js';

export const STOREFRONT_HERO_SETTINGS_KEY = 'storefront_hero';
export const STOREFRONT_HERO_CONFIG_EVENT = 'alsenussi:storefront-hero-config-change';

const CACHE_KEY = 'alsenussi:storefront-hero:v1';
const ALLOWED_TRUST_ICONS = new Set(['award', 'headphones', 'shield-check', 'truck']);
const ALLOWED_BUTTON_STYLES = new Set(['primary', 'secondary']);

export const DEFAULT_STOREFRONT_HERO_CONFIG = Object.freeze({
  version: 1,
  content: {
    enabled: true,
    eyebrow: 'الوكيل الحصري',
    titlePrimary: 'لساعات BOSS',
    titleSecondary: 'في ليبيا',
    subtitle: 'تراث من الدقة .. أناقة تدوم',
  },
  buttons: [
    {
      id: 'watches',
      enabled: true,
      label: 'تسوق ساعات HUGO',
      href: '/watches',
      style: 'primary',
    },
    {
      id: 'sunglasses',
      enabled: true,
      label: 'تسوق النظارات',
      href: '/sunglasses',
      style: 'secondary',
    },
  ],
  slides: [
    {
      id: 'lifestyle',
      image: '/customer-assets/home-hero-light-lifestyle.webp',
      label: 'lifestyle watch hero',
    },
    {
      id: 'watch',
      image: '/customer-assets/home-hero-light-watch.webp',
      label: 'watch display hero',
    },
    {
      id: 'accessories',
      image: '/customer-assets/home-hero-light-accessories.webp',
      label: 'accessories hero',
    },
  ],
  trustItems: [
    { id: 'authentic', enabled: true, icon: 'award', title: 'أصلية 100%', subtitle: 'AUTHENTIC' },
    { id: 'official', enabled: true, icon: 'award', title: 'موزع رسمي', subtitle: 'OFFICIAL DISTRIBUTOR' },
    { id: 'warranty', enabled: true, icon: 'shield-check', title: 'ضمان دولي', subtitle: 'INTERNATIONAL WARRANTY' },
    { id: 'delivery', enabled: true, icon: 'truck', title: 'توصيل سريع', subtitle: 'FAST DELIVERY' },
  ],
});

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeText(value, fallback, maxLength) {
  if (value === undefined || value === null) return fallback;
  return String(value).trim().slice(0, maxLength);
}

function normalizeId(value, fallback) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 72);

  return normalized || fallback;
}

function normalizeInternalHref(value, fallback) {
  const href = String(value || '').trim();
  if (/^\/(?!\/)/.test(href)) return href.slice(0, 240);
  return fallback;
}

function normalizeImageUrl(value) {
  const image = String(value || '').trim();
  if (/^\/(?!\/)/.test(image) || /^https?:\/\//i.test(image)) return image.slice(0, 2048);
  return '';
}

export function createDefaultStorefrontHeroConfig() {
  return clone(DEFAULT_STOREFRONT_HERO_CONFIG);
}

export function normalizeStorefrontHeroConfig(value) {
  if (!value || Array.isArray(value) || typeof value !== 'object') {
    return createDefaultStorefrontHeroConfig();
  }

  const defaults = DEFAULT_STOREFRONT_HERO_CONFIG;
  const content = value.content && typeof value.content === 'object' && !Array.isArray(value.content)
    ? value.content
    : {};
  const sourceButtons = Array.isArray(value.buttons) && value.buttons.length ? value.buttons : defaults.buttons;
  const sourceSlides = Array.isArray(value.slides) ? value.slides : defaults.slides;
  const sourceTrustItems = Array.isArray(value.trustItems) && value.trustItems.length ? value.trustItems : defaults.trustItems;

  const buttons = sourceButtons
    .slice(0, 2)
    .map((button, index) => {
      const fallback = defaults.buttons[index] || defaults.buttons[0];
      const source = button && typeof button === 'object' && !Array.isArray(button) ? button : {};

      return {
        id: normalizeId(source.id, fallback.id),
        enabled: source.enabled !== false,
        label: normalizeText(source.label, fallback.label, 80),
        href: normalizeInternalHref(source.href, fallback.href),
        style: ALLOWED_BUTTON_STYLES.has(source.style) ? source.style : fallback.style,
      };
    });

  const slides = sourceSlides
    .slice(0, 8)
    .map((slide, index) => {
      const source = slide && typeof slide === 'object' && !Array.isArray(slide) ? slide : {};
      const image = normalizeImageUrl(source.image);
      if (!image) return null;

      return {
        id: normalizeId(source.id, `slide-${index + 1}`),
        image,
        label: normalizeText(source.label, `صورة الواجهة ${index + 1}`, 100),
        ...(normalizeText(source.storagePath, '', 500) ? { storagePath: normalizeText(source.storagePath, '', 500) } : {}),
      };
    })
    .filter(Boolean);

  const trustItems = sourceTrustItems
    .slice(0, 6)
    .map((item, index) => {
      const fallback = defaults.trustItems[index] || defaults.trustItems[0];
      const source = item && typeof item === 'object' && !Array.isArray(item) ? item : {};

      return {
        id: normalizeId(source.id, fallback.id || `trust-${index + 1}`),
        enabled: source.enabled !== false,
        icon: ALLOWED_TRUST_ICONS.has(source.icon) ? source.icon : fallback.icon,
        title: normalizeText(source.title, fallback.title, 70),
        subtitle: normalizeText(source.subtitle, fallback.subtitle, 90),
      };
    });

  return {
    version: 1,
    content: {
      enabled: content.enabled !== false,
      eyebrow: normalizeText(content.eyebrow, defaults.content.eyebrow, 90),
      titlePrimary: normalizeText(content.titlePrimary, defaults.content.titlePrimary, 100),
      titleSecondary: normalizeText(content.titleSecondary, defaults.content.titleSecondary, 100),
      subtitle: normalizeText(content.subtitle, defaults.content.subtitle, 160),
    },
    buttons,
    slides,
    trustItems,
  };
}

export function readCachedStorefrontHeroConfig() {
  if (typeof window === 'undefined') return createDefaultStorefrontHeroConfig();

  try {
    const cached = JSON.parse(window.localStorage.getItem(CACHE_KEY) || 'null');
    return normalizeStorefrontHeroConfig(cached?.value || cached);
  } catch {
    return createDefaultStorefrontHeroConfig();
  }
}

export function writeCachedStorefrontHeroConfig(value, { notify = true } = {}) {
  const config = normalizeStorefrontHeroConfig(value);

  if (typeof window === 'undefined') return config;

  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify({ value: config, savedAt: Date.now() }));
  } catch {
    // The in-memory state still updates when browser storage is unavailable.
  }

  if (notify) {
    window.dispatchEvent(new CustomEvent(STOREFRONT_HERO_CONFIG_EVENT, { detail: config }));
  }

  return config;
}

export async function fetchStorefrontHeroConfig({ signal } = {}) {
  const response = await apiServerClient.fetch('/storefront/hero', {
    cache: 'no-store',
    signal,
  });

  if (!response.ok) {
    throw new Error('Failed to load storefront hero settings');
  }

  const payload = await response.json();
  return writeCachedStorefrontHeroConfig(payload?.value || payload, { notify: false });
}
