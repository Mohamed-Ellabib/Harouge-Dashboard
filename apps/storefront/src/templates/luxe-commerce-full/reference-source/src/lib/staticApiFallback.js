import { supabase } from '@/utils/supabase.js';
import { sanitizeProductImages } from '@/lib/productPayloadSanitizer.js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const collectionCategorySlugs = {
  watches: ['men-watches', 'women-watches', 'classic-watches', 'sport-smart-watches'],
  sunglasses: ['sunglasses', 'men-sunglasses', 'women-sunglasses'],
  pens: ['premium-pens', 'fountain-pens', 'rollerball-pens'],
};
const checkoutPaymentMethodCodes = ['cash_on_delivery', 'bank_transfer'];

const publicProductStatuses = new Set(['active', 'out_of_stock']);
const productListSelect = `
  id,
  sku,
  slug,
  name_ar,
  name_en,
  brand_id,
  category_id,
  price,
  sale_price,
  currency,
  stock_quantity,
  reserved_quantity,
  low_stock_alert,
  track_inventory,
  allow_backorder,
  status,
  gender,
  watch_type,
  movement_type,
  case_material,
  strap_material,
  featured,
  new_arrival,
  best_seller,
  created_at,
  brands(name, slug, name_ar, name_en),
  categories(name_ar, name_en, slug),
  product_images(image_url, alt_text_ar, alt_text_en, is_primary, sort_order)
`;

const productDetailSelect = `
  id,
  sku,
  slug,
  name_ar,
  name_en,
  description_ar,
  description_en,
  brand_id,
  category_id,
  price,
  sale_price,
  currency,
  stock_quantity,
  reserved_quantity,
  low_stock_alert,
  track_inventory,
  allow_backorder,
  status,
  gender,
  watch_type,
  movement_type,
  case_material,
  strap_material,
  case_size_mm,
  water_resistance,
  product_specs,
  warranty_months,
  weight_grams,
  featured,
  new_arrival,
  best_seller,
  seo_title,
  seo_description,
  created_at,
  updated_at,
  brands(name, slug, name_ar, name_en),
  categories(name_ar, name_en, slug),
  product_images(image_url, alt_text_ar, alt_text_en, is_primary, sort_order)
`;

function jsonResponse(payload, init = {}) {
  return new Response(JSON.stringify(payload), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...(init.headers || {}),
    },
  });
}

function errorResponse(message, status = 500) {
  return jsonResponse({ error: message }, { status });
}

function getRequestMethod(options = {}) {
  return String(options.method || 'GET').toUpperCase();
}

function getAuthorizationHeader(options = {}) {
  const headers = new Headers(options.headers || {});
  return headers.get('authorization');
}

function hasAuthorizationHeader(options = {}) {
  return Boolean(getAuthorizationHeader(options));
}

function readJsonBody(options = {}) {
  if (!options.body) return {};

  try {
    return JSON.parse(options.body);
  } catch {
    return {};
  }
}

function withActionBody(options = {}, action, extras = {}) {
  return JSON.stringify({
    ...readJsonBody(options),
    ...extras,
    action,
  });
}

async function invokeSupabaseFunction(functionName, options = {}, body = options.body) {
  if (!supabaseUrl || !supabasePublishableKey) {
    return errorResponse('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY for Supabase Edge Functions.', 500);
  }

  const authorizationHeader = getAuthorizationHeader(options);
  const headers = {
    'Content-Type': 'application/json',
    apikey: supabasePublishableKey,
  };

  if (authorizationHeader) {
    headers.Authorization = authorizationHeader;
  }

  const response = await window.fetch(`${String(supabaseUrl).replace(/\/+$/, '')}/functions/v1/${functionName}`, {
    method: 'POST',
    headers,
    body,
    signal: options.signal,
    keepalive: Boolean(options.keepalive),
  });
  const responseText = await response.text();
  let payload = {};

  try {
    payload = responseText ? JSON.parse(responseText) : {};
  } catch {
    payload = { error: responseText.slice(0, 200) };
  }

  return jsonResponse(payload, { status: response.status || 500 });
}

function getRequestedStatuses(value) {
  const requested = String(value || '')
    .split(',')
    .map((status) => status.trim())
    .filter(Boolean);

  if (!requested.length) return [...publicProductStatuses];

  const publicStatuses = requested.filter((status) => publicProductStatuses.has(status));
  return publicStatuses.length ? publicStatuses : ['__not_public__'];
}

function sortProductImages(images = []) {
  return [...images].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1;
    if (!a.is_primary && b.is_primary) return 1;
    return (a.sort_order || 0) - (b.sort_order || 0);
  });
}

function normalizeProduct(product) {
  const productImages = sanitizeProductImages(sortProductImages(product?.product_images || []), product);

  return {
    ...product,
    currency: product?.currency || 'LYD',
    product_images: productImages,
    primary_image_url: productImages[0]?.image_url || null,
    rating_average: null,
    rating_count: 0,
  };
}

function escapeSearch(value) {
  return String(value || '').replace(/[%_,]/g, '\\$&');
}

async function resolveCategoryIds(collection, categorySlug) {
  const slugs = [
    ...(collectionCategorySlugs[collection] || []),
    ...String(categorySlug || '')
      .split(',')
      .map((slug) => slug.trim())
      .filter(Boolean),
  ];

  if (!slugs.length) return [];

  const { data, error } = await supabase
    .from('categories')
    .select('id')
    .in('slug', [...new Set(slugs)]);

  if (error) throw error;
  return (data || []).map((category) => category.id);
}

async function resolveBrandIds(brandSlug) {
  const slugs = String(brandSlug || '')
    .split(',')
    .map((slug) => slug.trim())
    .filter(Boolean);

  if (!slugs.length) return [];

  const { data, error } = await supabase
    .from('brands')
    .select('id')
    .in('slug', [...new Set(slugs)]);

  if (error) throw error;
  return (data || []).map((brand) => brand.id);
}

async function handleProductList(searchParams) {
  const currentPage = Math.max(parseInt(searchParams.get('page') || '1', 10) || 1, 1);
  const perPage = Math.min(Math.max(parseInt(searchParams.get('per_page') || '50', 10) || 50, 1), 100);
  const from = (currentPage - 1) * perPage;
  const to = from + perPage - 1;
  const statuses = getRequestedStatuses(searchParams.get('status'));
  const categoryIds = await resolveCategoryIds(searchParams.get('collection'), searchParams.get('category_slug'));
  const brandIds = await resolveBrandIds(searchParams.get('brand_slug'));
  const directCategoryId = searchParams.get('category_id');
  const directBrandId = searchParams.get('brand_id');

  if (directCategoryId) categoryIds.push(directCategoryId);
  if (directBrandId) brandIds.push(directBrandId);

  let query = supabase
    .from('products')
    .select(productListSelect)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (statuses.length === 1) {
    query = query.eq('status', statuses[0]);
  } else {
    query = query.in('status', statuses);
  }

  if (categoryIds.length > 0) {
    query = query.in('category_id', [...new Set(categoryIds)]);
  }

  if (brandIds.length > 0) {
    query = query.in('brand_id', [...new Set(brandIds)]);
  }

  const search = searchParams.get('search');
  if (search) {
    const escaped = escapeSearch(search);
    query = query.or(`sku.ilike.%${escaped}%,name_en.ilike.%${escaped}%,name_ar.ilike.%${escaped}%`);
  }

  const { data, error } = await query;
  if (error) return errorResponse(error.message);

  const items = (data || []).map(normalizeProduct);

  return jsonResponse({
    items,
    page: currentPage,
    perPage,
    totalItems: items.length,
    totalPages: items.length < perPage ? currentPage : currentPage + 1,
  });
}

async function handleProductDetail(productId) {
  const { data, error } = await supabase
    .from('products')
    .select(productDetailSelect)
    .eq('id', productId)
    .in('status', [...publicProductStatuses])
    .maybeSingle();

  if (error) return errorResponse(error.message);
  if (!data) return errorResponse('Product not found', 404);

  return jsonResponse(normalizeProduct(data));
}

async function handleCheckoutOptions() {
  const [paymentMethodsResult, shippingMethodsResult] = await Promise.all([
    supabase
      .from('payment_methods')
      .select('*')
      .in('code', checkoutPaymentMethodCodes)
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
    supabase
      .from('shipping_methods')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
  ]);

  if (paymentMethodsResult.error) return errorResponse(paymentMethodsResult.error.message);
  if (shippingMethodsResult.error) return errorResponse(shippingMethodsResult.error.message);

  return jsonResponse({
    paymentMethods: paymentMethodsResult.data || [],
    shippingMethods: shippingMethodsResult.data || [],
    checkoutSettings: {
      freeShippingThreshold: 500,
      defaultShippingFee: 25,
      currency: 'LYD',
    },
  });
}

async function handleStorefrontHero() {
  const { data, error } = await supabase
    .from('settings')
    .select('value, updated_at')
    .eq('key', 'storefront_hero')
    .eq('is_public', true)
    .maybeSingle();

  if (error) return errorResponse(error.message);

  return jsonResponse({
    value: data?.value || null,
    updated_at: data?.updated_at || null,
  });
}

async function handleStorefrontContact() {
  const { data, error } = await supabase
    .from('settings')
    .select('value, updated_at')
    .eq('key', 'store')
    .eq('is_public', true)
    .maybeSingle();

  if (error) return errorResponse(error.message);

  return jsonResponse({
    value: data?.value || null,
    updated_at: data?.updated_at || null,
  });
}

export async function handleStaticApiFallback(url, options = {}) {
  const parsedUrl = new URL(url, window.location.origin);
  const parts = parsedUrl.pathname.split('/').filter(Boolean);
  const path = parts.join('/');
  const method = getRequestMethod(options);

  if (method === 'POST' && path === 'customer/orders/guest/request-otp') {
    return invokeSupabaseFunction('guest-order-request-otp', options);
  }

  if (method === 'POST' && path === 'customer/orders/guest/verify') {
    return invokeSupabaseFunction('guest-order-verify', options);
  }

  const customerAuthActions = {
    'auth/customer/signup/request-otp': 'signup-request-otp',
    'auth/customer/signup/verify': 'signup-verify',
    'auth/customer/password-reset/request-otp': 'password-reset-request-otp',
    'auth/customer/password-reset/verify': 'password-reset-verify',
    'auth/customer/password-reset/confirm': 'password-reset-confirm',
    'auth/customer/login': 'login',
  };

  if (method === 'POST' && customerAuthActions[path]) {
    return invokeSupabaseFunction('customer-auth', options, withActionBody(options, customerAuthActions[path]));
  }

  if (method === 'GET' && path === 'auth/customer/me') {
    return invokeSupabaseFunction('customer-auth', options, withActionBody(options, 'me'));
  }

  if (method === 'GET' && path === 'auth/customer/settings') {
    return invokeSupabaseFunction('customer-auth', options, withActionBody(options, 'settings-get'));
  }

  if (method === 'GET' && path === 'auth/customer/commerce') {
    return invokeSupabaseFunction('customer-auth', options, withActionBody(options, 'commerce-get'));
  }

  if (method === 'PUT' && path === 'auth/customer/commerce') {
    return invokeSupabaseFunction('customer-auth', options, withActionBody(options, 'commerce-sync'));
  }

  const customerSettingsActions = {
    'auth/customer/profile': 'profile-update',
    'auth/customer/password': 'password-update',
    'auth/customer/address': 'address-update',
  };

  if (method === 'PUT' && customerSettingsActions[path]) {
    return invokeSupabaseFunction('customer-auth', options, withActionBody(options, customerSettingsActions[path]));
  }

  if (method === 'DELETE' && path === 'auth/customer/account') {
    return invokeSupabaseFunction('customer-auth', options, withActionBody(options, 'account-delete'));
  }

  if (parts[0] === 'customer' && parts[1] === 'product-ratings' && parts[2]) {
    const productId = decodeURIComponent(parts[2]);

    if (method === 'GET') {
      return invokeSupabaseFunction('customer-product-ratings', options, withActionBody(options, 'get', { productId }));
    }

    if (method === 'POST') {
      return invokeSupabaseFunction('customer-product-ratings', options, withActionBody(options, 'set', { productId }));
    }
  }

  if (method === 'POST' && path === 'customer/orders/apply-coupon') {
    return invokeSupabaseFunction('customer-orders', options, withActionBody(options, 'apply-coupon'));
  }

  if (method === 'GET' && path === 'customer/orders/checkout-options') {
    return handleCheckoutOptions();
  }

  if (method === 'GET' && path === 'storefront/hero') {
    return handleStorefrontHero();
  }

  if (method === 'GET' && path === 'storefront/contact') {
    return handleStorefrontContact();
  }

  if (method === 'GET' && path === 'customer/orders') {
    return invokeSupabaseFunction('customer-orders', options, withActionBody(options, 'list'));
  }

  if (method === 'POST' && path === 'customer/orders') {
    return invokeSupabaseFunction('customer-orders', options, withActionBody(options, 'create'));
  }

  if (method === 'GET' && parts[0] === 'customer' && parts[1] === 'orders' && parts[2]) {
    return invokeSupabaseFunction('customer-orders', options, withActionBody(options, 'detail', {
      orderId: decodeURIComponent(parts[2]),
    }));
  }

  if (hasAuthorizationHeader(options)) return null;

  if (method !== 'GET') return null;

  if (parts[0] === 'products' && parts.length === 1) {
    return handleProductList(parsedUrl.searchParams);
  }

  if (parts[0] === 'products' && parts.length === 2) {
    return handleProductDetail(decodeURIComponent(parts[1]));
  }

  return null;
}
