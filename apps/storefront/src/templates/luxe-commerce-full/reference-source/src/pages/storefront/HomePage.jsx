import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Award,
  ChevronLeft,
  ChevronRight,
  Clock,
  Glasses,
  Headphones,
  Heart,
  Home,
  PenLine,
  Search,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Truck,
  User,
} from 'lucide-react';
import { getStorefrontFeed, preloadStorefrontFeed, refreshStorefrontFeed, STOREFRONT_PRODUCT_FEEDS, STOREFRONT_SOFT_REFRESH_EVENT } from '@/lib/storefrontCatalogCache.js';
import { getProductPricing } from '@/lib/productPricing.js';
import { addProductToCart, CART_CHANGE_EVENT, getCartItemCount, readCartItems } from '@/lib/storefrontCart.js';
import { animateProductToCart } from '@/lib/storefrontCartAnimation.js';
import { FAVORITES_CHANGE_EVENT, readFavoriteItems, toggleFavoriteItem } from '@/lib/storefrontFavorites.js';
import { canAddProductToCart, formatCompactLowStockLabel, getProductStockMeta } from '@/lib/productStock.js';
import useCustomerActionGuard from '@/hooks/useCustomerActionGuard.js';
import CartPlusIcon from '@/components/storefront/CartPlusIcon.jsx';
import ProductImageCarousel from '@/components/storefront/ProductImageCarousel.jsx';
import StorefrontSearchPanel from '@/components/storefront/StorefrontSearchPanel.jsx';
import StorefrontFooter from '@/components/storefront/StorefrontFooter.jsx';
import {
  fetchStorefrontHeroConfig,
  normalizeStorefrontHeroConfig,
  readCachedStorefrontHeroConfig,
  STOREFRONT_HERO_CONFIG_EVENT,
} from '@/lib/storefrontHeroConfig.js';
import './WatchesPage.css';
import './HomePageHero.css';

const brandCards = [
  { main: 'HUGO', sub: 'HUGO BOSS', slug: 'hugo', className: 'customer-home__brand-logo--hugo' },
  { main: 'MICHAEL KORS', sub: '', slug: 'michael-kors', className: 'customer-home__brand-logo--mk' },
  { main: 'Just Cavalli', sub: '', slug: 'just-cavalli', className: 'customer-home__brand-logo--just' },
  { main: 'cavalli', sub: 'TIME', slug: 'cavalli', className: 'customer-home__brand-logo--cavalli' },
  { main: 'FOSSIL', sub: '', slug: 'fossil', className: 'customer-home__brand-logo--fossil' },
  { main: 'EMPORIO ARMANI', sub: '', slug: 'emporio-armani', className: 'customer-home__brand-logo--armani' },
  { main: 'Timberland', sub: '', slug: 'timberland', className: 'customer-home__brand-logo--timberland' },
  { main: 'LACOSTE', sub: '', slug: 'lacoste', className: 'customer-home__brand-logo--lacoste' },
];

const homeProductTabs = [
  { value: 'all', label: 'عرض الكل' },
  { value: 'sunglasses', label: 'نظارات' },
  { value: 'watches', label: 'ساعات' },
  { value: 'pens', label: 'أقلام' },
];

const collectionCategorySlugs = {
  watches: ['men-watches', 'women-watches', 'classic-watches', 'sport-smart-watches'],
  sunglasses: ['sunglasses', 'men-sunglasses', 'women-sunglasses'],
  pens: ['premium-pens', 'fountain-pens', 'rollerball-pens'],
};
const HOME_PRODUCTS_URL = STOREFRONT_PRODUCT_FEEDS.home;
const HERO_SLIDE_INTERVAL_MS = 5200;

const heroTrustIconMap = {
  award: Award,
  headphones: Headphones,
  'shield-check': ShieldCheck,
  truck: Truck,
};

function getProductBrand(product) {
  return product?.brands?.name_en || product?.brands?.name || product?.brands?.name_ar || 'Al Senussi';
}

function sortProductImages(images = []) {
  return [...images].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1;
    if (!a.is_primary && b.is_primary) return 1;
    return (a.sort_order || 0) - (b.sort_order || 0);
  });
}

function getProductImages(product) {
  const images = sortProductImages(product?.product_images || [])
    .map((image) => ({
      url: image.image_url,
      alt: image.alt_text_ar || image.alt_text_en || product.name_ar || product.name_en || product.sku,
    }))
    .filter((image) => image.url);

  if (images.length > 0) return images;
  return product?.primary_image_url ? [{ url: product.primary_image_url, alt: product.name_ar || product.name_en || product.sku }] : [];
}

function getProductCollection(product) {
  const categorySlug = product?.categories?.slug;
  const match = Object.entries(collectionCategorySlugs).find(([, slugs]) => slugs.includes(categorySlug));
  return match?.[0] || 'other';
}

function mapHomeProduct(product) {
  const images = getProductImages(product);
  const pricing = getProductPricing(product);
  const stockMeta = getProductStockMeta(product);

  return {
    id: product.id,
    rawProduct: product,
    brand: getProductBrand(product),
    name: product.name_en || product.name_ar || product.sku,
    price: pricing.currentPriceLabel,
    originalPrice: pricing.originalPriceLabel,
    salePrice: pricing.salePriceLabel,
    isSale: pricing.hasSale,
    image: images[0]?.url || null,
    images,
    imageAlt: images[0]?.alt || product.name_ar || product.name_en || product.sku,
    collection: getProductCollection(product),
    isBestSeller: Boolean(product.best_seller),
    isNew: Boolean(product.new_arrival),
    inStock: stockMeta.isAvailable,
    isLowStock: stockMeta.isLowStock,
    stockLabel: stockMeta.stockLabel,
    availableQuantity: stockMeta.availableQuantity,
    requiresStock: stockMeta.requiresStock,
    createdAt: product.created_at,
  };
}

function sortHomeProducts(products) {
  return [...products].sort((a, b) => {
    if (a.isBestSeller !== b.isBestSeller) return a.isBestSeller ? -1 : 1;
    if (a.isNew !== b.isNew) return a.isNew ? -1 : 1;
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });
}

export default function HomePage() {
  const navigate = useNavigate();
  const requireCustomer = useCustomerActionGuard();
  const cartIconRef = useRef(null);
  const initialProductsRef = useRef(null);
  if (initialProductsRef.current === null) {
    const cachedData = getStorefrontFeed(HOME_PRODUCTS_URL);
    initialProductsRef.current = {
      hasCache: Boolean(cachedData),
      products: (cachedData?.items || [])
        .map(mapHomeProduct)
        .filter((product) => product.id),
    };
  }
  const [cartCount, setCartCount] = useState(() => getCartItemCount());
  const [homeProducts, setHomeProducts] = useState(() => initialProductsRef.current.products);
  const [isProductsLoading, setIsProductsLoading] = useState(() => !initialProductsRef.current.hasCache);
  const [productLoadError, setProductLoadError] = useState(false);
  const [activeProductCollection, setActiveProductCollection] = useState('all');
  const [activeHeroSlide, setActiveHeroSlide] = useState(0);
  const [heroConfig, setHeroConfig] = useState(() => readCachedStorefrontHeroConfig());
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState(() => new Set(readFavoriteItems()));
  const heroSlides = heroConfig.slides;
  const visibleHeroButtons = heroConfig.buttons.filter((button) => button.enabled && button.label);
  const visibleHeroTrustItems = heroConfig.trustItems.filter((item) => item.enabled && item.title);

  const visibleHomeProducts = useMemo(() => {
    const sortedProducts = sortHomeProducts(homeProducts.filter((product) => product.isBestSeller));
    const filteredProducts = activeProductCollection === 'all'
      ? sortedProducts
      : sortedProducts.filter((product) => product.collection === activeProductCollection);

    return filteredProducts.slice(0, 6);
  }, [activeProductCollection, homeProducts]);

  const discountedHomeProducts = useMemo(() => {
    return sortHomeProducts(homeProducts.filter((product) => product.isSale)).slice(0, 6);
  }, [homeProducts]);

  const discountProductGridSlots = useMemo(() => {
    if (isProductsLoading) {
      return [];
    }

    return discountedHomeProducts.map((product) => ({
      isSkeleton: false,
      product,
      slotKey: `discount-${product.id}`,
    }));
  }, [discountedHomeProducts, isProductsLoading]);

  const productGridSlots = useMemo(() => {
    if (isProductsLoading) {
      return [];
    }

    return visibleHomeProducts.map((product) => ({
      isSkeleton: false,
      product,
      slotKey: product.id,
    }));
  }, [isProductsLoading, visibleHomeProducts]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadHeroConfig() {
      try {
        const nextConfig = await fetchStorefrontHeroConfig({ signal: controller.signal });
        if (!controller.signal.aborted) setHeroConfig(nextConfig);
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.warn('Failed to refresh storefront hero settings; using cached defaults', error);
        }
      }
    }

    function handleConfigChange(event) {
      setHeroConfig(normalizeStorefrontHeroConfig(event.detail));
    }

    function handleStorageChange() {
      setHeroConfig(readCachedStorefrontHeroConfig());
    }

    loadHeroConfig();
    window.addEventListener(STOREFRONT_HERO_CONFIG_EVENT, handleConfigChange);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      controller.abort();
      window.removeEventListener(STOREFRONT_HERO_CONFIG_EVENT, handleConfigChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  useEffect(() => {
    setActiveHeroSlide((currentSlide) => (
      heroSlides.length ? Math.min(currentSlide, heroSlides.length - 1) : 0
    ));

    if (!heroSlides.length) return undefined;

    const preloadRestHeroImages = () => {
      heroSlides.slice(1).forEach((slide) => {
        const image = new Image();
        image.src = slide.image;
      });
    };

    const shouldUseIdlePreload = 'requestIdleCallback' in window;
    const preloadId = shouldUseIdlePreload
      ? window.requestIdleCallback(preloadRestHeroImages, { timeout: 1800 })
      : window.setTimeout(preloadRestHeroImages, 900);

    const slideTimer = heroSlides.length > 1
      ? window.setInterval(() => {
        setActiveHeroSlide((currentSlide) => (currentSlide + 1) % heroSlides.length);
      }, HERO_SLIDE_INTERVAL_MS)
      : null;

    return () => {
      if (shouldUseIdlePreload) {
        window.cancelIdleCallback(preloadId);
      } else {
        window.clearTimeout(preloadId);
      }
      if (slideTimer) window.clearInterval(slideTimer);
    };
  }, [heroSlides]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadHomeProducts() {
      const hasInitialCache = initialProductsRef.current.hasCache;

      try {
        if (!hasInitialCache) {
          setIsProductsLoading(true);
        }
        setProductLoadError(false);

        const data = hasInitialCache
          ? await refreshStorefrontFeed(HOME_PRODUCTS_URL)
          : await preloadStorefrontFeed(HOME_PRODUCTS_URL);
        const nextProducts = (data.items || [])
          .map(mapHomeProduct)
          .filter((product) => product.id);

        if (!controller.signal.aborted) {
          setHomeProducts(nextProducts);
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Failed to load home products', error);
          if (!hasInitialCache) {
            setHomeProducts([]);
            setProductLoadError(true);
          }
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsProductsLoading(false);
        }
      }
    }

    loadHomeProducts();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    function handleSoftRefresh(event) {
      if (event.detail?.feedUrl !== HOME_PRODUCTS_URL) return;

      const nextProducts = (event.detail?.feed?.items || [])
        .map(mapHomeProduct)
        .filter((product) => product.id);

      setHomeProducts(nextProducts);
      setProductLoadError(false);
      setIsProductsLoading(false);
    }

    window.addEventListener(STOREFRONT_SOFT_REFRESH_EVENT, handleSoftRefresh);
    return () => window.removeEventListener(STOREFRONT_SOFT_REFRESH_EVENT, handleSoftRefresh);
  }, []);

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

  function handleOpenFavorites() {
    if (requireCustomer('سجل الدخول أولاً لعرض المفضلة.')) {
      navigate('/favorites');
    }
  }

  function handleFeaturedProductCart(product, event) {
    if (!product?.id) return;
    const currentCartQuantity = readCartItems().find((item) => item.productId === String(product.id))?.quantity || 0;
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

    const nextFavorites = toggleFavoriteItem(productId);
    setFavoriteIds(new Set(nextFavorites));
  }

  function renderHomeProductSlot(slot, index) {
    if (slot.isSkeleton) {
      return (
        <article className="watches-page__product watches-page__product--skeleton" key={slot.slotKey} aria-hidden="true" style={{ '--watch-card-delay': `${Math.min(index, 6) * 20}ms`, '--watch-card-settle-delay': `${Math.min(index, 6) * 16}ms` }}>
          <button className="watches-page__favorite watches-page__favorite--skeleton" type="button" tabIndex={-1} aria-hidden="true">
            <Heart aria-hidden="true" />
          </button>
          <button className="watches-page__card-cart watches-page__card-cart--skeleton" type="button" tabIndex={-1} aria-hidden="true">
            <CartPlusIcon />
          </button>

          <div className="watches-page__product-link watches-page__product-link--skeleton">
            <div className="watches-page__product-image watches-page__product-image--skeleton" />
            <div className="watches-page__product-copy watches-page__product-copy--skeleton">
              <span className="watches-page__copy-skeleton watches-page__copy-skeleton--brand" />
              <span className="watches-page__copy-skeleton watches-page__copy-skeleton--name" />
              <span className="watches-page__copy-skeleton watches-page__copy-skeleton--price" />
            </div>
          </div>
        </article>
      );
    }

    const { product } = slot;
    const isFavorite = favoriteIds.has(String(product.id));

    return (
      <article className={['watches-page__product', 'watches-page__product--loaded', !product.inStock ? 'watches-page__product--sold-out' : '', product.isLowStock ? 'watches-page__product--low-stock' : ''].filter(Boolean).join(' ')} key={slot.slotKey} style={{ '--watch-card-delay': `${Math.min(index, 6) * 20}ms`, '--watch-card-settle-delay': `${Math.min(index, 6) * 16}ms` }}>
        <button className={['watches-page__favorite', isFavorite ? 'is-active' : ''].filter(Boolean).join(' ')} type="button" aria-pressed={isFavorite} aria-label={`احفظ ${product.name} في المفضلة`} onClick={() => handleToggleFavorite(product.id)}>
          <Heart aria-hidden="true" />
        </button>
        <button className="watches-page__card-cart" type="button" onClick={(event) => handleFeaturedProductCart(product, event)} disabled={!product.inStock} aria-label={`أضف ${product.name} إلى السلة`}>
          <CartPlusIcon />
        </button>

        {!product.inStock && product.stockLabel ? (
          <span className="watches-page__stock-note watches-page__stock-note--sold-out">
            {product.stockLabel}
          </span>
        ) : null}

        <Link className="watches-page__product-link" to={`/products/${product.id}`} state={{ product: product.rawProduct }} aria-label={product.name}>
          <ProductImageCarousel
            alt={product.imageAlt || product.name}
            className="watches-page__product-image watches-page__product-image--carousel"
            fallbackImage={product.image}
            images={product.images}
            placeholderClassName="watches-page__image-placeholder"
          />

          <div className="watches-page__product-copy">
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
          </div>
        </Link>
      </article>
    );
  }

  return (
    <main className="customer-home" dir="rtl">
      <header className="customer-header" aria-label="التنقل الرئيسي">
        <div className="customer-home__lane customer-header__inner">
          <button className="customer-header__hamburger" type="button" onClick={handleOpenFavorites} aria-label="المفضلة">
            <Heart aria-hidden="true" />
          </button>

          <Link className="customer-header__brand" to="/store" aria-label="السنوسي وأبنائه">
            <img
              className="customer-header__brand-logo"
              src="/customer-assets/store-header-logo.png"
              alt="السنوسي وأبنائه 1970"
            />
          </Link>

          <nav className="customer-header__nav" aria-label="روابط المتجر">
            <Link className="is-active" to="/store">الرئيسية</Link>
            <Link to="/watches">الساعات</Link>
            <Link to="/sunglasses">النظارات</Link>
            <Link to="/pens">الأقلام</Link>
            <Link to="/about">من نحن</Link>
            <a href="#contact">تواصل معنا</a>
          </nav>

          <div className="customer-header__actions" aria-label="أدوات المتجر">
            <button type="button" aria-label="بحث" onClick={() => setIsSearchOpen(true)}><Search aria-hidden="true" /></button>
            <button className="customer-header__wishlist" type="button" onClick={handleOpenFavorites} aria-label="المفضلة"><Heart aria-hidden="true" /></button>
            <Link className="customer-header__cart" to="/cart" aria-label="السلة" ref={cartIconRef}>
              <ShoppingBag aria-hidden="true" />
              <span>{cartCount}</span>
            </Link>
          </div>
        </div>
      </header>

      <section className="customer-hero" aria-label="واجهة المتجر">
        <div className="customer-hero__slides" aria-hidden="true">
          {heroSlides.map((slide, index) => (
            <div
              className={index === activeHeroSlide ? 'customer-hero__slide is-active' : 'customer-hero__slide'}
              key={slide.id || slide.image}
              style={{ backgroundImage: `url("${slide.image}")` }}
            />
          ))}
        </div>

        <div className="customer-home__lane customer-hero__inner">
          {(heroConfig.content.enabled || visibleHeroButtons.length) ? (
            <div className="customer-hero__copy">
              {heroConfig.content.enabled ? (
                <>
                  {(heroConfig.content.eyebrow || heroConfig.content.titlePrimary || heroConfig.content.titleSecondary) ? (
                    <h1 id="customer-hero-title">
                      {heroConfig.content.eyebrow ? <span>{heroConfig.content.eyebrow}</span> : null}
                      {heroConfig.content.titlePrimary ? <strong>{heroConfig.content.titlePrimary}</strong> : null}
                      {heroConfig.content.titleSecondary ? <strong>{heroConfig.content.titleSecondary}</strong> : null}
                    </h1>
                  ) : null}
                  {heroConfig.content.subtitle ? <p>{heroConfig.content.subtitle}</p> : null}
                </>
              ) : null}

              {visibleHeroButtons.length ? (
                <div className="customer-hero__actions" style={{ '--hero-action-count': visibleHeroButtons.length }}>
                  {visibleHeroButtons.map((button) => (
                    <Link
                      className={`customer-button customer-button--${button.style}`}
                      key={button.id}
                      to={button.href}
                    >
                      {button.label}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {heroSlides.length > 1 ? <div className="customer-hero__dots" aria-label="صور الواجهة">
            {heroSlides.map((slide, index) => (
              <button
                aria-label={`Show ${slide.label}`}
                className={index === activeHeroSlide ? 'is-active' : undefined}
                key={slide.id || slide.image}
                onClick={() => setActiveHeroSlide(index)}
                type="button"
              />
            ))}
          </div> : null}
        </div>

      </section>

      <section className="customer-hero-trust" aria-label="مميزات المتجر">
        <div
          className="customer-home__lane customer-hero-trust__grid"
          style={{ '--hero-trust-count': Math.max(1, visibleHeroTrustItems.length) }}
        >
          {visibleHeroTrustItems.map((item) => {
            const TrustIcon = heroTrustIconMap[item.icon] || Award;

            return (
              <div className="customer-hero-trust__item" key={item.id}>
                <TrustIcon aria-hidden="true" />
                <b>{item.title}</b>
                {item.subtitle ? <small>{item.subtitle}</small> : null}
              </div>
            );
          })}
        </div>
      </section>

      <section className="customer-brands" id="brands" aria-labelledby="customer-brands-title">
        {/* Desktop title row */}
        <div className="customer-home__lane customer-brands__inner">
          <h2 id="customer-brands-title">علاماتنا التجارية</h2>
          <p>نقدم لكم نخبة من أشهر الماركات العالمية</p>
        </div>
        {/* Mobile title row */}
        <div className="customer-brands__mob-header customer-home__lane">
          <h2>العلامات التجارية</h2>
        </div>
        {/* Desktop and Mobile: auto-scroll marquee */}
        <div className="customer-brands__marquee">
          <div className="customer-brands__track">
            {[...brandCards, ...brandCards, ...brandCards].map((brand, i) => (
              <Link
                className="customer-brands__card"
                to={`/brands/${brand.slug}`}
                aria-label={`عرض منتجات ${brand.main}`}
                key={`${brand.slug}-${i}`}
              >
                <strong className={brand.className}>{brand.main}</strong>
                {brand.sub ? <span>{brand.sub}</span> : null}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="customer-shop" aria-label="منتجات المتجر">
        <div className="customer-home__lane">
          <section className="customer-categories" aria-labelledby="customer-categories-title">
            <h2 id="customer-categories-title">تسوق حسب الفئة</h2>
            <div className="customer-categories__grid">
              <a className="customer-category customer-category--sunglasses" id="sunglasses" href="#products">
                <img src="/customer-assets/category-sunglasses.webp" alt="" />
                <span>
                  <strong>نظارات</strong>
                  <small>تصاميم عصرية</small>
                  <small>تناسب أسلوبك</small>
                  <em>تسوق الآن</em>
                </span>
              </a>
              <Link className="customer-category customer-category--watches" id="watches" to="/watches">
                <img src="/customer-assets/category-watch.webp" alt="" />
                <span>
                  <strong>ساعات</strong>
                  <small>دقة في الوقت</small>
                  <small>وتميز في الأسلوب</small>
                  <em>تسوق الآن</em>
                </span>
              </Link>
            </div>
          </section>

          {discountProductGridSlots.length > 0 ? (
            <section className="customer-products customer-products--offers" id="discount-offers" aria-labelledby="customer-discount-products-title">
              <div className="customer-products__section-heading">
                <Link className="customer-products__view-all" to="/offers">عرض الكل</Link>
                <h2 id="customer-discount-products-title">العروض المخفضة</h2>
              </div>
              <div className="customer-products__grid">
                {discountProductGridSlots.map(renderHomeProductSlot)}
              </div>
            </section>
          ) : null}

          <section className="customer-products" id="products" aria-labelledby="customer-products-title">
            {/* Desktop tab bar */}
            <div className="customer-products__tabs" aria-label="تصنيفات المنتجات">
              {homeProductTabs.map((tab) => (
                <button
                  className={activeProductCollection === tab.value ? 'is-active' : undefined}
                  type="button"
                  onClick={() => setActiveProductCollection(tab.value)}
                  key={tab.value}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {/* Mobile section header */}
            <div className="customer-products__mob-header">
              <Link className="customer-products__view-all" to="/best-sellers">عرض الكل</Link>
              <h2 id="customer-products-title">الأكثر طلباً</h2>
            </div>
            <div className="customer-products__grid" aria-busy={isProductsLoading}>
              {isProductsLoading ? (
                <article className="customer-products__loading" role="status">
                  <span>جاري تحميل المنتجات</span>
                </article>
              ) : null}
              {!isProductsLoading && productGridSlots.length === 0 ? (
                <article className="customer-products__empty">
                  <strong>{productLoadError ? 'تعذر تحميل المنتجات' : 'لا توجد منتجات متاحة'}</strong>
                  <span>{productLoadError ? 'تحقق من اتصال الخادم ثم أعد المحاولة.' : 'ستظهر المنتجات هنا عند إضافتها من لوحة التحكم.'}</span>
                </article>
              ) : productGridSlots.map(renderHomeProductSlot)}
            </div>
          </section>

          <section className="customer-auth" id="about" aria-labelledby="customer-auth-title">
            <img src="/customer-assets/auth-watch-back.webp" alt="" />
            <div>
              <h2 id="customer-auth-title">الأصالة تهمنا</h2>
              <h3>تسوق بثقة وطمأنينة</h3>
              <p>جميع منتجاتنا أصلية 100% ومستوردة<br />من الوكلاء المعتمدين في ضمان دولي</p>
            </div>
          </section>
        </div>
      </section>

      <StorefrontFooter />

      {/* Mobile-only: fixed bottom navigation bar */}
      <nav className="customer-bottom-nav" aria-label="التنقل السفلي">
        <Link className="is-active" to="/store"><Home aria-hidden="true" /><span>الرئيسية</span></Link>
        <Link to="/sunglasses"><Glasses aria-hidden="true" /><span>النظارات</span></Link>
        <Link to="/watches"><Clock aria-hidden="true" /><span>الساعات</span></Link>
        <Link to="/pens"><PenLine aria-hidden="true" /><span>الأقلام</span></Link>
        <Link to="/account"><User aria-hidden="true" /><span>الحساب</span></Link>
      </nav>

      <StorefrontSearchPanel isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </main>
  );
}
