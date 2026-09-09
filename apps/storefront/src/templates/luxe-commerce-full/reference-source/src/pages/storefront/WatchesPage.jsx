import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Clock,
  Glasses,
  Heart,
  Home,
  PenLine,
  Search,
  ShoppingBag,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import { getStorefrontFeed, preloadStorefrontFeed, refreshStorefrontFeed, STOREFRONT_PRODUCT_FEEDS, STOREFRONT_SOFT_REFRESH_EVENT } from '@/lib/storefrontCatalogCache.js';
import { getProductPricing } from '@/lib/productPricing.js';
import { addProductToCart, CART_CHANGE_EVENT, getCartItemCount, readCartItems } from '@/lib/storefrontCart.js';
import { animateProductToCart } from '@/lib/storefrontCartAnimation.js';
import { FAVORITES_CHANGE_EVENT, isProductFavorite, readFavoriteItems, toggleFavoriteItem } from '@/lib/storefrontFavorites.js';
import { isStorefrontSkeletonPreviewEnabled } from '@/lib/loadingPreview.js';
import { canAddProductToCart, formatCompactLowStockLabel, getProductStockMeta } from '@/lib/productStock.js';
import useCustomerActionGuard from '@/hooks/useCustomerActionGuard.js';
import CartPlusIcon from '@/components/storefront/CartPlusIcon.jsx';
import ProductImageCarousel from '@/components/storefront/ProductImageCarousel.jsx';
import StorefrontSearchPanel from '@/components/storefront/StorefrontSearchPanel.jsx';
import ProductTools, { defaultProductFilters, filterAndSortProducts } from '@/components/storefront/ProductTools.jsx';
import './WatchesPage.css';
import './CuratedProductsPage.css';
import './StorefrontSurface.css';

const bottomNavItems = [
  { label: 'الرئيسية', href: '/store', icon: Home },
  { label: 'النظارات', href: '/sunglasses', icon: Glasses },
  { label: 'الساعات', href: '/watches', icon: Clock, active: true },
  { label: 'الأقلام', href: '/pens', icon: PenLine },
  { label: 'الحساب', href: '/account', icon: User },
];
const WATCHES_PRODUCTS_URL = STOREFRONT_PRODUCT_FEEDS.watches;
const brandDisplayNames = {
  hugo: 'HUGO',
  'michael-kors': 'MICHAEL KORS',
  'just-cavalli': 'Just Cavalli',
  cavalli: 'cavalli TIME',
  fossil: 'FOSSIL',
  'emporio-armani': 'EMPORIO ARMANI',
  timberland: 'Timberland',
  lacoste: 'LACOSTE',
};
const listingConfigs = {
  watches: {
    feedUrl: WATCHES_PRODUCTS_URL,
    pageClassName: '',
    pageTitle: 'الساعات',
    heroAriaLabel: 'تشكيلة الساعات من علاماتنا التجارية',
    heroImage: null,
    heroPrimary: 'WATCHES',
    heroSecondary: 'CURATED COLLECTION',
    heroLead: 'استكشف تشكيلتنا',
    heroMark: 'أرقى',
    heroTitle: 'الساعات',
    productsAriaLabel: 'منتجات الساعات',
    emptyDescription: 'سيتم عرض الساعات هنا عند إضافتها من لوحة التحكم.',
  },
  offers: {
    feedUrl: STOREFRONT_PRODUCT_FEEDS.all,
    pageClassName: 'watches-page--curated watches-page--offers',
    pageTitle: 'العروض المخفضة',
    heroAriaLabel: 'جميع المنتجات ذات الأسعار المخفضة',
    heroImage: '/customer-assets/home-hero-light-accessories.webp',
    heroPrimary: 'OFFERS',
    heroSecondary: 'SELECTED DEALS',
    heroLead: 'اكتشف عروضنا',
    heroMark: 'أسعار',
    heroTitle: 'مميزة',
    productsAriaLabel: 'المنتجات المخفضة',
    emptyDescription: 'لا توجد عروض مخفضة متاحة حالياً.',
  },
  bestSellers: {
    feedUrl: STOREFRONT_PRODUCT_FEEDS.all,
    pageClassName: 'watches-page--curated watches-page--best-sellers',
    pageTitle: 'الأكثر طلباً',
    heroAriaLabel: 'المنتجات الأكثر طلباً',
    heroImage: '/customer-assets/home-hero-light-watch.webp',
    heroPrimary: 'BEST',
    heroSecondary: 'CUSTOMER FAVORITES',
    heroLead: 'اختيارات عملائنا',
    heroMark: 'الأكثر',
    heroTitle: 'طلباً',
    productsAriaLabel: 'المنتجات الأكثر طلباً',
    emptyDescription: 'لا توجد منتجات مصنفة ضمن الأكثر طلباً حالياً.',
  },
};

function getProductBrand(product) {
  return product?.brands?.name_en || product?.brands?.name || product?.brands?.name_ar || 'Al Senussi';
}

function normalizeBrandSlug(value) {
  return String(value || '').trim().toLowerCase();
}

function formatBrandSlug(value) {
  const slug = normalizeBrandSlug(value);
  if (brandDisplayNames[slug]) return brandDisplayNames[slug];

  return slug
    .split('-')
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function getProductImage(product) {
  if (product?.primary_image_url) {
    return product.primary_image_url;
  }

  const images = product?.product_images || [];
  const primary = images.find((image) => image.is_primary) || [...images].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))[0];
  return primary?.image_url || null;
}

function getProductImages(product) {
  const images = (product?.product_images || [])
    .map((image) => ({
      url: image.image_url,
      alt: image.alt_text_ar || image.alt_text_en || product.name_ar || product.name_en || product.sku,
      isPrimary: Boolean(image.is_primary),
      sortOrder: image.sort_order || 0,
    }))
    .filter((image) => image.url)
    .sort((a, b) => {
      if (a.isPrimary && !b.isPrimary) return -1;
      if (!a.isPrimary && b.isPrimary) return 1;
      return a.sortOrder - b.sortOrder;
    });

  if (images.length > 0) return images;

  const fallback = getProductImage(product);
  return fallback ? [{ url: fallback, alt: product.name_ar || product.name_en || product.sku }] : [];
}

function getColorTone(product) {
  const text = [product.name_en, product.name_ar, product.description_en, product.description_ar, product.case_material, product.strap_material]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (/black|أسود|سوداء/.test(text)) return 'black';
  if (/silver|steel|فضي|فولاذ/.test(text)) return 'silver';
  if (/gold|rose|ذهبي|ذهب|روز/.test(text)) return 'gold';
  if (/brown|leather|بني|جلد/.test(text)) return 'brown';
  return 'all';
}

function getMaterialType(product) {
  const text = [product.strap_material, product.case_material, product.description_en, product.description_ar]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (/leather|جلد/.test(text)) return 'leather';
  if (/steel|metal|mesh|stainless|معدن|فولاذ/.test(text)) return 'metal';
  if (/rubber|silicone|nylon|fabric|مطاط|سيليكون|قماش/.test(text)) return 'silicone';
  return 'all';
}

function mapProduct(product) {
  const pricing = getProductPricing(product);
  const stockMeta = getProductStockMeta(product);

  return {
    id: product.id,
    rawProduct: product,
    brand: getProductBrand(product),
    brandSlug: normalizeBrandSlug(product?.brands?.slug),
    name: product.name_en || product.name_ar || product.sku,
    price: pricing.currentPriceLabel,
    originalPrice: pricing.originalPriceLabel,
    salePrice: pricing.salePriceLabel,
    rawPrice: pricing.currentPrice,
    image: getProductImage(product),
    images: getProductImages(product),
    badge: product.new_arrival ? 'جديد' : null,
    isNew: Boolean(product.new_arrival),
    isBestSeller: Boolean(product.best_seller),
    isSale: pricing.hasSale,
    inStock: stockMeta.isAvailable,
    isLowStock: stockMeta.isLowStock,
    stockLabel: stockMeta.stockLabel,
    availableQuantity: stockMeta.availableQuantity,
    requiresStock: stockMeta.requiresStock,
    colorTone: getColorTone(product),
    materialType: getMaterialType(product),
    createdAt: product.created_at,
  };
}

function prepareListingProducts(items, listingType, brandSlug = '') {
  const products = (items || []).map(mapProduct);

  if (listingType === 'offers') {
    return products.filter((product) => product.isSale);
  }

  if (listingType === 'bestSellers') {
    return products.filter((product) => product.isBestSeller);
  }

  if (listingType === 'brand') {
    const normalizedBrandSlug = normalizeBrandSlug(brandSlug);
    return products.filter((product) => product.brandSlug === normalizedBrandSlug);
  }

  return products;
}

export default function WatchesPage({ listingType = 'watches' }) {
  const { brandSlug: routeBrandSlug = '' } = useParams();
  const brandSlug = listingType === 'brand' ? normalizeBrandSlug(routeBrandSlug) : '';
  const baseListingConfig = listingConfigs[listingType] || listingConfigs.watches;
  const productsUrl = listingType === 'brand' ? STOREFRONT_PRODUCT_FEEDS.all : baseListingConfig.feedUrl;
  const navigate = useNavigate();
  const requireCustomer = useCustomerActionGuard();
  const cartIconRef = useRef(null);
  const initialProductsRef = useRef(null);
  if (initialProductsRef.current === null) {
    const cachedData = getStorefrontFeed(productsUrl);
    initialProductsRef.current = {
      hasCache: Boolean(cachedData),
      products: prepareListingProducts(cachedData?.items, listingType, brandSlug),
    };
  }
  const [products, setProducts] = useState(() => initialProductsRef.current.products);
  const [isLoading, setIsLoading] = useState(() => !initialProductsRef.current.hasCache);
  const [loadError, setLoadError] = useState(false);
  const [filters, setFilters] = useState(defaultProductFilters);
  const [sortMode, setSortMode] = useState('featured');
  const [activePanel, setActivePanel] = useState(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [cartCount, setCartCount] = useState(() => getCartItemCount());
  const [favoriteIds, setFavoriteIds] = useState(() => new Set(readFavoriteItems()));

  useEffect(() => {
    if (isStorefrontSkeletonPreviewEnabled()) {
      setProducts([]);
      setLoadError(false);
      setIsLoading(true);
      return undefined;
    }

    const controller = new AbortController();

    async function loadProducts() {
      const hasInitialCache = initialProductsRef.current.hasCache;

      try {
        if (!hasInitialCache) {
          setIsLoading(true);
        }
        setLoadError(false);

        const data = hasInitialCache
          ? await refreshStorefrontFeed(productsUrl)
          : await preloadStorefrontFeed(productsUrl);
        const nextProducts = prepareListingProducts(data.items, listingType, brandSlug);
        if (!controller.signal.aborted) {
          setProducts(nextProducts);
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error(`Failed to load ${listingType} products`, error);
          if (!hasInitialCache) {
            setProducts([]);
            setLoadError(true);
          }
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    loadProducts();

    return () => controller.abort();
  }, [brandSlug, listingType, productsUrl]);

  useEffect(() => {
    function handleSoftRefresh(event) {
      if (event.detail?.feedUrl !== productsUrl) return;

      setProducts(prepareListingProducts(event.detail?.feed?.items, listingType, brandSlug));
      setLoadError(false);
      setIsLoading(false);
    }

    window.addEventListener(STOREFRONT_SOFT_REFRESH_EVENT, handleSoftRefresh);
    return () => window.removeEventListener(STOREFRONT_SOFT_REFRESH_EVENT, handleSoftRefresh);
  }, [brandSlug, listingType, productsUrl]);

  useEffect(() => {
    function refreshCartCount() {
      setCartCount(getCartItemCount());
    }

    window.addEventListener(CART_CHANGE_EVENT, refreshCartCount);
    window.addEventListener('storage', refreshCartCount);

    return () => {
      window.removeEventListener(CART_CHANGE_EVENT, refreshCartCount);
      window.removeEventListener('storage', refreshCartCount);
    };
  }, []);

  useEffect(() => {
    function refreshFavorites() {
      setFavoriteIds(new Set(readFavoriteItems()));
    }

    window.addEventListener(FAVORITES_CHANGE_EVENT, refreshFavorites);
    window.addEventListener('storage', refreshFavorites);

    return () => {
      window.removeEventListener(FAVORITES_CHANGE_EVENT, refreshFavorites);
      window.removeEventListener('storage', refreshFavorites);
    };
  }, []);

  function handleAddProductToCart(product, event) {
    const currentCartQuantity = readCartItems().find((item) => item.productId === String(product?.id))?.quantity || 0;
    const cartCheck = canAddProductToCart(product, currentCartQuantity, 1);

    if (!cartCheck.canAdd) {
      toast.error(cartCheck.message);
      return;
    }

    addProductToCart(product.id, 1);
    setCartCount(getCartItemCount());
    animateProductToCart({
      cartElement: cartIconRef.current,
      event,
      sourceSelector: '.watches-page__product-image img',
    });
  }

  function handleToggleFavorite(productId) {
    if (!requireCustomer('سجل الدخول أولاً لحفظ المنتجات في المفضلة.')) return;

    const wasFavorite = isProductFavorite(productId);
    const nextFavorites = toggleFavoriteItem(productId);
    setFavoriteIds(new Set(nextFavorites));
    toast.success(wasFavorite ? 'تمت إزالة المنتج من المفضلة.' : 'تم حفظ المنتج في المفضلة.');
  }

  function handleOpenFavorites() {
    if (requireCustomer('سجل الدخول أولاً لعرض المفضلة.')) {
      navigate('/favorites');
    }
  }

  const visibleProducts = useMemo(() => filterAndSortProducts(products, filters, sortMode), [filters, products, sortMode]);
  const brandName = listingType === 'brand'
    ? products[0]?.brand || formatBrandSlug(brandSlug) || 'العلامة التجارية'
    : '';
  const listingConfig = listingType === 'brand'
    ? {
        feedUrl: STOREFRONT_PRODUCT_FEEDS.all,
        pageClassName: 'watches-page--curated watches-page--brand',
        pageTitle: brandName,
        heroAriaLabel: `منتجات ${brandName}`,
        heroImage: '/customer-assets/home-hero-light-accessories.webp',
        heroPrimary: brandName,
        heroSecondary: 'BRAND COLLECTION',
        heroLead: 'اكتشف منتجات',
        heroMark: 'مجموعة',
        heroTitle: brandName,
        productsAriaLabel: `منتجات ${brandName}`,
        emptyDescription: `لا توجد منتجات متاحة من ${brandName} حالياً.`,
      }
    : baseListingConfig;
  const hasNoFilterResults = products.length > 0 && visibleProducts.length === 0;
  const productGridSlots = useMemo(() => {
    if (isLoading) {
      return Array.from({ length: 4 }, (_, index) => ({
        isSkeleton: true,
        slotKey: `product-slot-${index}`,
      }));
    }

    return visibleProducts.map((product, index) => ({
      isSkeleton: false,
      product,
      slotKey: `product-slot-${index}`,
    }));
  }, [isLoading, visibleProducts]);

  function renderProductSlot({ isSkeleton, product, slotKey }, index) {
    const isFavorite = !isSkeleton && favoriteIds.has(String(product.id));
    const productClassName = [
      'watches-page__product',
      isSkeleton ? 'watches-page__product--skeleton' : 'watches-page__product--loaded',
      !isSkeleton && !product.inStock ? 'watches-page__product--sold-out' : '',
      !isSkeleton && product.isLowStock ? 'watches-page__product--low-stock' : '',
    ].filter(Boolean).join(' ');

    return (
      <article className={productClassName} key={slotKey} aria-hidden={isSkeleton ? 'true' : undefined} style={{ '--watch-card-delay': `${Math.min(index, 6) * 20}ms` }}>
        <button className={['watches-page__favorite', isSkeleton ? 'watches-page__favorite--skeleton' : '', isFavorite ? 'is-active' : ''].filter(Boolean).join(' ')} type="button" tabIndex={isSkeleton ? -1 : undefined} aria-hidden={isSkeleton ? 'true' : undefined} aria-pressed={isSkeleton ? undefined : isFavorite} aria-label={isSkeleton ? undefined : product.name} onClick={isSkeleton ? undefined : () => handleToggleFavorite(product.id)}>
          <Heart aria-hidden="true" />
        </button>
        <button className={isSkeleton ? 'watches-page__card-cart watches-page__card-cart--skeleton' : 'watches-page__card-cart'} type="button" tabIndex={isSkeleton ? -1 : undefined} aria-hidden={isSkeleton ? 'true' : undefined} disabled={isSkeleton || !product.inStock} aria-label={isSkeleton ? undefined : product.name} onClick={isSkeleton ? undefined : (event) => handleAddProductToCart(product, event)}>
          <CartPlusIcon />
        </button>

        {!isSkeleton && product.badge ? <span className="watches-page__badge">{product.badge}</span> : null}
        {!isSkeleton && !product.inStock && product.stockLabel ? (
          <span className="watches-page__stock-note watches-page__stock-note--sold-out">
            {product.stockLabel}
          </span>
        ) : null}

        <Link className={isSkeleton ? 'watches-page__product-link watches-page__product-link--skeleton' : 'watches-page__product-link'} to={isSkeleton ? '#' : `/products/${product.id}`} state={isSkeleton ? undefined : { product: product.rawProduct }} onClick={isSkeleton ? (event) => event.preventDefault() : undefined} aria-label={isSkeleton ? undefined : product.name} tabIndex={isSkeleton ? -1 : undefined}>
          {isSkeleton ? (
            <div className="watches-page__product-image watches-page__product-image--skeleton" />
          ) : (
            <ProductImageCarousel
              alt={product.name}
              className="watches-page__product-image watches-page__product-image--carousel"
              fallbackImage={product.image}
              images={product.images}
              placeholderClassName="watches-page__image-placeholder"
            />
          )}

          <div className={isSkeleton ? 'watches-page__product-copy watches-page__product-copy--skeleton' : 'watches-page__product-copy'}>
            {isSkeleton ? (
              <>
                <span className="watches-page__copy-skeleton watches-page__copy-skeleton--brand" />
                <span className="watches-page__copy-skeleton watches-page__copy-skeleton--name" />
                <span className="watches-page__copy-skeleton watches-page__copy-skeleton--price" />
              </>
            ) : (
              <>
                <strong>{product.brand}</strong>
                {product.isLowStock ? (
                  <small className="watches-page__stock-note-inline">
                    {formatCompactLowStockLabel(product.availableQuantity)}
                  </small>
                ) : null}
                <span dir="ltr">{product.name}</span>
                <span className={product.isSale ? 'watches-page__price watches-page__price--sale' : 'watches-page__price'} dir="ltr">
                  {product.isSale ? <small>{product.originalPrice}</small> : null}
                  <b>{product.price}</b>
                </span>
              </>
            )}
          </div>
        </Link>
      </article>
    );
  }

  return (
    <main className={['watches-page', listingConfig.pageClassName].filter(Boolean).join(' ')} dir="rtl">
      <div className="watches-page__phone-shell">
        <header className="watches-page__top" aria-label="شريط الصفحة">
          <div className="watches-page__header">
            <button className="watches-page__icon-button watches-page__back" type="button" onClick={handleOpenFavorites} aria-label="المفضلة">
              <Heart aria-hidden="true" />
            </button>

            <h1>{listingConfig.pageTitle}</h1>

            <div className="watches-page__header-actions">
              <button className="watches-page__icon-button" type="button" aria-label="بحث" onClick={() => setIsSearchOpen(true)}>
                <Search aria-hidden="true" />
              </button>
              <Link className="watches-page__icon-button watches-page__cart-button" to="/cart" aria-label="السلة" ref={cartIconRef}>
                <ShoppingBag aria-hidden="true" />
                <span>{cartCount}</span>
              </Link>
            </div>
          </div>

        </header>

        <section className="watches-page__hero" aria-label={listingConfig.heroAriaLabel}>
          {listingConfig.heroImage ? (
            <img className="watches-page__hero-image" src={listingConfig.heroImage} alt="" aria-hidden="true" />
          ) : (
            <video className="watches-page__hero-video" autoPlay muted loop playsInline preload="metadata" aria-hidden="true">
              <source src="/product-assets/vid.mp4" type="video/mp4" />
            </video>
          )}

          <div className="watches-page__hero-copy">
            <strong>{listingConfig.heroPrimary}</strong>
            <span>{listingConfig.heroSecondary}</span>
            <p>{listingConfig.heroLead}</p>
            {listingType !== 'watches' ? (
              <h2>
                <mark>{listingConfig.heroMark}</mark>
                <span>{listingConfig.heroTitle}</span>
              </h2>
            ) : null}
          </div>
        </section>

        <ProductTools
          activePanel={activePanel}
          filters={filters}
          isLoading={isLoading}
          onFiltersChange={setFilters}
          onPanelChange={setActivePanel}
          onSortModeChange={setSortMode}
          products={products}
          resultCount={visibleProducts.length}
          sortMode={sortMode}
        />

        <section className="watches-page__grid" aria-label={listingConfig.productsAriaLabel} aria-busy={isLoading}>
          {isLoading ? <span className="sr-only" role="status">جاري تحميل المنتجات</span> : null}
          {!isLoading && visibleProducts.length === 0 ? (
            <article className="watches-page__empty">
              <strong>{loadError ? 'تعذر تحميل المنتجات' : hasNoFilterResults ? 'لا توجد نتائج مطابقة' : 'لا توجد منتجات متاحة'}</strong>
              <span>{loadError ? 'تحقق من اتصال الخادم ثم أعد المحاولة.' : hasNoFilterResults ? 'جرّب تغيير خيارات التصفية أو الترتيب.' : listingConfig.emptyDescription}</span>
            </article>
          ) : productGridSlots.map(renderProductSlot)}
        </section>
      </div>

      <nav className="customer-bottom-nav" aria-label="التنقل السفلي">
        {bottomNavItems.map((item) => {
          const Icon = item.icon;

          return (
            <Link className={item.active && listingType === 'watches' ? 'is-active' : undefined} to={item.href} key={`${item.href}-${item.label}`}>
              <Icon aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <StorefrontSearchPanel isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </main>
  );
}
