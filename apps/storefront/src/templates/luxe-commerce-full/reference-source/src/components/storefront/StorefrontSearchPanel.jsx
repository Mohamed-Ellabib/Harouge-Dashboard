import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { PackageSearch, Search, X } from 'lucide-react';
import apiServerClient from '@/lib/apiServerClient.js';
import { preloadStorefrontCatalog } from '@/lib/storefrontCatalogCache.js';
import { getProductPricing } from '@/lib/productPricing.js';
import { getProductStockMeta } from '@/lib/productStock.js';
import './StorefrontSearchPanel.css';

function sortProductImages(images = []) {
  return [...images].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1;
    if (!a.is_primary && b.is_primary) return 1;
    return (a.sort_order || 0) - (b.sort_order || 0);
  });
}

function getProductImage(product) {
  const firstImage = sortProductImages(product?.product_images || [])[0];
  return firstImage?.image_url || product?.primary_image_url || null;
}

function getProductBrand(product) {
  return product?.brands?.name_ar || product?.brands?.name_en || product?.brands?.name || '';
}

function mapSearchProduct(product) {
  const pricing = getProductPricing(product);
  const stockMeta = getProductStockMeta(product);

  return {
    id: product.id,
    rawProduct: product,
    brand: getProductBrand(product),
    image: getProductImage(product),
    name: product.name_ar || product.name_en || 'منتج من المتجر',
    price: pricing.currentPriceLabel,
    stockLabel: stockMeta.stockLabel,
    isAvailable: stockMeta.isAvailable,
  };
}

const loadingCards = Array.from({ length: 6 });

function normalizeSearchText(value) {
  return String(value || '')
    .trim()
    .toLocaleLowerCase()
    .normalize('NFKD')
    .replace(/[\u064B-\u065F\u0670]/g, '');
}

function getStaticCatalogProducts(snapshot) {
  const indexedProducts = Object.values(snapshot?.productsById || {});
  if (indexedProducts.length) return indexedProducts;

  const products = new Map();
  Object.values(snapshot?.feeds || {}).forEach((feed) => {
    (feed?.items || []).forEach((product) => {
      if (product?.id) products.set(product.id, product);
    });
  });

  return [...products.values()];
}

function getProductSearchText(product) {
  return [
    product?.sku,
    product?.slug,
    product?.name_ar,
    product?.name_en,
    product?.brands?.name,
    product?.brands?.slug,
    product?.brands?.name_ar,
    product?.brands?.name_en,
    product?.categories?.slug,
    product?.categories?.name_ar,
    product?.categories?.name_en,
    product?.case_material,
    product?.strap_material,
  ].filter(Boolean).join(' ');
}

function searchStaticCatalogProducts(snapshot, query, limit) {
  const products = getStaticCatalogProducts(snapshot);
  const normalizedQuery = normalizeSearchText(query);
  const matches = normalizedQuery
    ? products.filter((product) => normalizeSearchText(getProductSearchText(product)).includes(normalizedQuery))
    : products;

  return matches.slice(0, limit);
}

const quickSearchTags = [
  { label: 'الكل', value: '' },
  { label: 'ساعات', value: 'ساعة' },
  { label: 'نظارات', value: 'نظارة' },
  { label: 'أقلام', value: 'قلم' },
  { label: 'HUGO', value: 'HUGO' },
  { label: 'جلد', value: 'جلد' },
  { label: 'ذهبي', value: 'ذهبي' },
  { label: 'أسود', value: 'أسود' },
];

export default function StorefrontSearchPanel({ isOpen, onClose }) {
  const inputRef = useRef(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  const normalizedQuery = useMemo(() => query.trim(), [query]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const timer = window.setTimeout(() => inputRef.current?.focus(), 80);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        setIsLoading(true);
        setHasError(false);

        const params = new URLSearchParams({
          status: 'active,out_of_stock',
          per_page: normalizedQuery ? '12' : '8',
        });
        const perPage = Number(params.get('per_page'));

        if (normalizedQuery) {
          params.set('search', normalizedQuery);
        }

        const catalogSnapshot = await preloadStorefrontCatalog();
        if (catalogSnapshot) {
          if (!controller.signal.aborted) {
            setResults(searchStaticCatalogProducts(catalogSnapshot, normalizedQuery, perPage).map(mapSearchProduct));
          }
          return;
        }

        const response = await apiServerClient.fetch(`/products?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error('Failed to search products');
        }

        const data = await response.json();

        if (!controller.signal.aborted) {
          setResults((data.items || []).map(mapSearchProduct));
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Failed to search storefront products', error);
          setResults([]);
          setHasError(true);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, normalizedQuery ? 240 : 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [isOpen, normalizedQuery]);

  if (!isOpen) return null;

  const hasQuery = normalizedQuery.length > 0;
  const resultLabel = isLoading ? 'جارٍ البحث' : hasQuery ? `${results.length.toLocaleString('en-US')} نتيجة` : 'منتجات مقترحة';

  function handleClearSearch() {
    setQuery('');
    inputRef.current?.focus();
  }

  function handleSelectTag(value) {
    setQuery(value);
    inputRef.current?.focus();
  }

  return (
    <section className="storefront-search" aria-label="بحث المنتجات" role="dialog" aria-modal="true">
      <button className="storefront-search__backdrop" type="button" aria-label="إغلاق البحث" onClick={onClose} />

      <div className="storefront-search__shell">
        <header className="storefront-search__top">
          <div className="storefront-search__title">
            <strong>البحث في المتجر</strong>
          </div>
          <button className="storefront-search__close" type="button" aria-label="إغلاق" onClick={onClose}>
            <X aria-hidden="true" />
          </button>
        </header>

        <div className="storefront-search__command">
          <Search aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            placeholder="ابحث عن منتج"
            aria-label="بحث باسم المنتج"
            onChange={(event) => setQuery(event.target.value)}
          />
          {query ? (
            <button className="storefront-search__clear" type="button" aria-label="مسح البحث" onClick={handleClearSearch}>
              <X aria-hidden="true" />
            </button>
          ) : (
            <span className="storefront-search__command-status">{resultLabel}</span>
          )}
        </div>

        <div className="storefront-search__tags" aria-label="اقتراحات بحث سريعة">
          {quickSearchTags.map((tag) => {
            const isActive = normalizedQuery === tag.value;

            return (
              <button
                className={isActive ? 'is-active' : undefined}
                type="button"
                key={tag.label}
                aria-pressed={isActive}
                onClick={() => handleSelectTag(tag.value)}
              >
                {tag.label}
              </button>
            );
          })}
        </div>

        <main className="storefront-search__main">
          <div className="storefront-search__status" aria-live="polite">
            <span>{resultLabel}</span>
            <small>{hasQuery ? 'نتائج مطابقة للبحث' : 'منتجات من المتجر'}</small>
          </div>

          {hasError ? (
            <div className="storefront-search__empty">
              <PackageSearch aria-hidden="true" />
              <strong>تعذر البحث الآن</strong>
              <span>حاول مرة أخرى بعد قليل.</span>
            </div>
          ) : null}

          {!hasError && isLoading && results.length === 0 ? (
            <div className="storefront-search__grid storefront-search__grid--loading" aria-hidden="true">
              {loadingCards.map((_, index) => (
                <div className="storefront-search__loading-card" key={index}>
                  <span className="storefront-search__loading-media" />
                  <span className="storefront-search__loading-content">
                    <i />
                    <i />
                    <i />
                  </span>
                </div>
              ))}
            </div>
          ) : null}

          {!hasError && !isLoading && results.length === 0 ? (
            <div className="storefront-search__empty">
              <PackageSearch aria-hidden="true" />
              <strong>{hasQuery ? 'لا توجد نتائج' : 'لا توجد منتجات حالياً'}</strong>
              <span>{hasQuery ? 'جرّب كتابة اسم منتج مختلف.' : 'ستظهر المنتجات هنا بعد إضافتها.'}</span>
            </div>
          ) : null}

          {!hasError && results.length > 0 ? (
            <div className="storefront-search__grid">
              {results.map((product, index) => (
                <Link
                  className={!product.isAvailable ? 'storefront-search__product storefront-search__product--sold-out' : 'storefront-search__product'}
                  to={`/products/${product.id}`}
                  state={{ product: product.rawProduct }}
                  key={product.id}
                  onClick={onClose}
                  style={{ '--item-index': index }}
                >
                  <span className="storefront-search__media">
                    {product.image ? <img src={product.image} alt="" /> : <PackageSearch aria-hidden="true" />}
                  </span>

                  <span className="storefront-search__product-body">
                    <small>{product.brand || 'منتج من المتجر'}</small>
                    <strong>{product.name}</strong>
                    <span className="storefront-search__product-footer">
                      <b dir="ltr">{product.price}</b>
                      {product.stockLabel ? <em>{product.stockLabel}</em> : null}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          ) : null}
        </main>
      </div>
    </section>
  );
}
