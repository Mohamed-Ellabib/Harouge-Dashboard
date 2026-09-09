const productAssetFallbacksById = {
  '00000000-0000-4100-8000-000000000001': '/product-assets/01-black-sport-chronograph.webp',
  '00000000-0000-4100-8000-000000000002': '/product-assets/02-silver-dress-steel.webp',
  '00000000-0000-4100-8000-000000000003': '/product-assets/03-rose-gold-mesh.webp',
  '00000000-0000-4100-8000-000000000004': '/product-assets/04-blue-dial-steel.webp',
  '00000000-0000-4100-8000-000000000005': '/product-assets/05-green-dial-leather.webp',
  '00000000-0000-4100-8000-000000000006': '/product-assets/06-skeleton-automatic.webp',
  '00000000-0000-4100-8000-000000000007': '/product-assets/07-minimal-white-leather.webp',
  '00000000-0000-4100-8000-000000000008': '/product-assets/08-black-tactical-fabric.webp',
  '00000000-0000-4100-8000-000000000009': '/product-assets/09-gold-classic-leather.webp',
  '00000000-0000-4100-8000-000000000010': '/product-assets/10-hybrid-smart-black.webp',
  '00000000-0000-4101-8000-000000000001': '/product-assets/glasses-01-black-square.webp',
  '00000000-0000-4101-8000-000000000002': '/product-assets/glasses-02-blue-aviator.webp',
  '00000000-0000-4101-8000-000000000003': '/product-assets/glasses-03-tortoise-round.webp',
  '00000000-0000-4101-8000-000000000004': '/product-assets/glasses-04-gold-rectangular.webp',
  '00000000-0000-4102-8000-000000000001': '/product-assets/pens-01-black-fountain.webp',
  '00000000-0000-4102-8000-000000000002': '/product-assets/pens-02-silver-rollerball.webp',
  '00000000-0000-4102-8000-000000000003': '/product-assets/pens-03-burgundy-fountain.webp',
  '00000000-0000-4102-8000-000000000004': '/product-assets/pens-04-matte-black-ballpoint.webp',
};

const productAssetFallbacksBySku = {
  'SNW-BSC-001': productAssetFallbacksById['00000000-0000-4100-8000-000000000001'],
  'SNW-SDS-002': productAssetFallbacksById['00000000-0000-4100-8000-000000000002'],
  'SNW-RGM-003': productAssetFallbacksById['00000000-0000-4100-8000-000000000003'],
  'SNW-BDS-004': productAssetFallbacksById['00000000-0000-4100-8000-000000000004'],
  'SNW-GDL-005': productAssetFallbacksById['00000000-0000-4100-8000-000000000005'],
  'SNW-SKA-006': productAssetFallbacksById['00000000-0000-4100-8000-000000000006'],
  'SNW-MWL-007': productAssetFallbacksById['00000000-0000-4100-8000-000000000007'],
  'SNW-BTF-008': productAssetFallbacksById['00000000-0000-4100-8000-000000000008'],
  'SNW-GCL-009': productAssetFallbacksById['00000000-0000-4100-8000-000000000009'],
  'SNW-HSB-010': productAssetFallbacksById['00000000-0000-4100-8000-000000000010'],
  'SNG-BSQ-001': productAssetFallbacksById['00000000-0000-4101-8000-000000000001'],
  'SNG-BAV-002': productAssetFallbacksById['00000000-0000-4101-8000-000000000002'],
  'SNG-TRO-003': productAssetFallbacksById['00000000-0000-4101-8000-000000000003'],
  'SNG-GRC-004': productAssetFallbacksById['00000000-0000-4101-8000-000000000004'],
  'SNP-BFP-001': productAssetFallbacksById['00000000-0000-4102-8000-000000000001'],
  'SNP-SRB-002': productAssetFallbacksById['00000000-0000-4102-8000-000000000002'],
  'SNP-BGF-003': productAssetFallbacksById['00000000-0000-4102-8000-000000000003'],
  'SNP-MBB-004': productAssetFallbacksById['00000000-0000-4102-8000-000000000004'],
};

const productAssetFallbacksBySlug = {
  'black-sport-chronograph': productAssetFallbacksById['00000000-0000-4100-8000-000000000001'],
  'silver-dress-steel': productAssetFallbacksById['00000000-0000-4100-8000-000000000002'],
  'rose-gold-mesh': productAssetFallbacksById['00000000-0000-4100-8000-000000000003'],
  'blue-dial-steel': productAssetFallbacksById['00000000-0000-4100-8000-000000000004'],
  'green-dial-leather': productAssetFallbacksById['00000000-0000-4100-8000-000000000005'],
  'skeleton-automatic': productAssetFallbacksById['00000000-0000-4100-8000-000000000006'],
  'minimal-white-leather': productAssetFallbacksById['00000000-0000-4100-8000-000000000007'],
  'black-tactical-fabric': productAssetFallbacksById['00000000-0000-4100-8000-000000000008'],
  'gold-classic-leather': productAssetFallbacksById['00000000-0000-4100-8000-000000000009'],
  'hybrid-smart-black': productAssetFallbacksById['00000000-0000-4100-8000-000000000010'],
  'black-square-sunglasses': productAssetFallbacksById['00000000-0000-4101-8000-000000000001'],
  'blue-aviator-sunglasses': productAssetFallbacksById['00000000-0000-4101-8000-000000000002'],
  'tortoise-round-sunglasses': productAssetFallbacksById['00000000-0000-4101-8000-000000000003'],
  'gold-rectangular-sunglasses': productAssetFallbacksById['00000000-0000-4101-8000-000000000004'],
  'black-fountain-pen': productAssetFallbacksById['00000000-0000-4102-8000-000000000001'],
  'silver-rollerball-pen': productAssetFallbacksById['00000000-0000-4102-8000-000000000002'],
  'burgundy-fountain-pen': productAssetFallbacksById['00000000-0000-4102-8000-000000000003'],
  'matte-black-ballpoint': productAssetFallbacksById['00000000-0000-4102-8000-000000000004'],
};

export function getProductAssetFallbackUrl(product = {}) {
  return productAssetFallbacksById[product.id]
    || productAssetFallbacksBySku[String(product.sku || '').trim()]
    || productAssetFallbacksBySlug[String(product.slug || '').trim()]
    || null;
}

export function getProductAssetFallbackImage(product = {}) {
  const imageUrl = getProductAssetFallbackUrl(product);
  if (!imageUrl) return null;

  const altText = product.name_ar || product.name_en || product.sku || '';
  return {
    image_url: imageUrl,
    alt_text_ar: altText,
    alt_text_en: product.name_en || altText,
    sort_order: 9999,
    is_primary: true,
    is_fallback: true,
  };
}

export function isInlineImageUrl(value) {
  return typeof value === 'string' && value.startsWith('data:image/');
}

export function sanitizeProductImageUrl(value) {
  if (!value || isInlineImageUrl(value)) return null;
  return String(value).replace(/^\/((?:product-assets|customer-assets)\/.+?)\.(?:png|jpe?g)$/i, '/$1.webp');
}

export function sanitizeProductImage(image) {
  const imageUrl = sanitizeProductImageUrl(image?.image_url);
  if (!imageUrl) return null;

  return {
    ...image,
    image_url: imageUrl,
  };
}

export function sanitizeProductImages(images = [], product = {}) {
  const sanitizedImages = (Array.isArray(images) ? images : [])
    .map(sanitizeProductImage)
    .filter(Boolean);

  if (sanitizedImages.length > 0) return sanitizedImages;

  const fallbackImage = getProductAssetFallbackImage(product);
  return fallbackImage ? [fallbackImage] : [];
}

export function sanitizeProductPayload(product) {
  if (!product || typeof product !== 'object') return product;

  const productImages = sanitizeProductImages(product.product_images, product);
  const primaryImageUrl = sanitizeProductImageUrl(product.primary_image_url) || productImages[0]?.image_url || null;

  return {
    ...product,
    product_images: productImages,
    primary_image_url: primaryImageUrl,
  };
}

export function sanitizeProductListPayload(payload) {
  if (!payload || typeof payload !== 'object') return payload;

  if (Array.isArray(payload.items)) {
    return {
      ...payload,
      items: payload.items.map(sanitizeProductPayload),
    };
  }

  return sanitizeProductPayload(payload);
}
