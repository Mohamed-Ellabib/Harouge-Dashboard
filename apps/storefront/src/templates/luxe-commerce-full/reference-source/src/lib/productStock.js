const LOW_STOCK_LIMIT = 3;

function toQuantity(value) {
  const quantity = Number.parseInt(value, 10);
  return Number.isFinite(quantity) ? Math.max(0, quantity) : 0;
}

export function getAvailableQuantity(product) {
  if (product?.availableQuantity !== undefined) {
    return toQuantity(product.availableQuantity);
  }

  const stockQuantity = toQuantity(product?.stock_quantity);
  const reservedQuantity = toQuantity(product?.reserved_quantity);
  return Math.max(0, stockQuantity - reservedQuantity);
}

export function formatLowStockLabel(quantity) {
  if (quantity === 1) return 'آخر قطعة متاحة';
  if (quantity === 2) return 'آخر قطعتين متاحتين';
  return `آخر ${quantity} قطع متاحة`;
}

export function formatCompactLowStockLabel(quantity) {
  if (quantity === 1) return 'آخر قطعة';
  if (quantity === 2) return 'آخر قطعتين';
  return `آخر ${quantity} قطع`;
}

export function getProductStockMeta(product) {
  const status = String(product?.status || 'active');
  const tracksInventory = product?.track_inventory !== false;
  const allowBackorder = Boolean(product?.allow_backorder);
  const availableQuantity = getAvailableQuantity(product);
  const requiresStock = product?.requiresStock !== undefined
    ? Boolean(product.requiresStock)
    : tracksInventory && !allowBackorder;
  const isPubliclyVisible = status === 'active' || status === 'out_of_stock';
  const statusAllowsPurchase = status === 'active'
    || (status === 'out_of_stock' && requiresStock && availableQuantity > 0);
  const isAvailable = typeof product?.inStock === 'boolean'
    ? product.inStock
    : isPubliclyVisible && statusAllowsPurchase && (!requiresStock || availableQuantity > 0);
  const isLowStock = typeof product?.isLowStock === 'boolean'
    ? product.isLowStock
    : requiresStock && isAvailable && availableQuantity > 0 && availableQuantity <= LOW_STOCK_LIMIT;
  const stockLabel = product?.stockLabel || (!isAvailable
    ? 'نفدت الكمية'
    : isLowStock
      ? formatLowStockLabel(availableQuantity)
      : '');

  return {
    availableQuantity,
    isAvailable,
    isLowStock,
    requiresStock,
    stockLabel,
  };
}

export function canAddProductToCart(product, currentCartQuantity = 0, quantityToAdd = 1) {
  const stockMeta = getProductStockMeta(product);
  const requestedQuantity = Math.max(1, Number.parseInt(quantityToAdd, 10) || 1);
  const cartQuantity = Math.max(0, Number.parseInt(currentCartQuantity, 10) || 0);

  if (!stockMeta.isAvailable) {
    return {
      canAdd: false,
      message: 'نفدت الكمية حالياً.',
      stockMeta,
    };
  }

  if (
    stockMeta.requiresStock
    && stockMeta.availableQuantity > 0
    && cartQuantity + requestedQuantity > stockMeta.availableQuantity
  ) {
    return {
      canAdd: false,
      message: stockMeta.availableQuantity === 1
        ? 'آخر قطعة موجودة بالفعل في السلة.'
        : `المتوفر حالياً ${stockMeta.availableQuantity} قطع فقط.`,
      stockMeta,
    };
  }

  return {
    canAdd: true,
    message: '',
    stockMeta,
  };
}
