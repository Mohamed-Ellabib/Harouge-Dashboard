const supportedProductCurrencies = new Set(['LYD']);

export function normalizeCurrency(value) {
  const currency = String(value || 'LYD').trim().toUpperCase();
  return supportedProductCurrencies.has(currency) ? currency : 'LYD';
}

export function formatMoney(value, currency = 'LYD') {
  const amount = Number(value || 0);
  return `${normalizeCurrency(currency)} ${amount.toLocaleString('en-US')}`;
}

export function getProductPricing(product) {
  const currency = normalizeCurrency(product?.currency);
  const originalPrice = Number(product?.price || 0);
  const salePrice = product?.sale_price === null || product?.sale_price === undefined || product?.sale_price === ''
    ? null
    : Number(product.sale_price);
  const hasSale = Number.isFinite(salePrice) && salePrice > 0 && originalPrice > 0 && salePrice < originalPrice;
  const currentPrice = hasSale ? salePrice : originalPrice;

  return {
    currency,
    originalPrice,
    salePrice: hasSale ? salePrice : null,
    currentPrice,
    hasSale,
    originalPriceLabel: formatMoney(originalPrice, currency),
    salePriceLabel: hasSale ? formatMoney(salePrice, currency) : null,
    currentPriceLabel: formatMoney(currentPrice, currency),
  };
}
