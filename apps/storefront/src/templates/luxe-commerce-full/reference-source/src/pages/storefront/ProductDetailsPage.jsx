import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronUp,
  Clock,
  FileText,
  Glasses,
  Heart,
  Home,
  PackageCheck,
  PenLine,
  Share2,
  ShoppingBag,
  Star,
  User,
} from 'lucide-react';
import apiServerClient from '@/lib/apiServerClient.js';
import { getStorefrontFeed, getStorefrontProduct, preloadStorefrontFeed, preloadStorefrontProduct, STOREFRONT_PRODUCT_FEEDS } from '@/lib/storefrontCatalogCache.js';
import { getProductPricing } from '@/lib/productPricing.js';
import { addProductToCart, CART_CHANGE_EVENT, getCartItemCount, readCartItems } from '@/lib/storefrontCart.js';
import { animateProductToCart } from '@/lib/storefrontCartAnimation.js';
import { FAVORITES_CHANGE_EVENT, isProductFavorite, readFavoriteItems, toggleFavoriteItem } from '@/lib/storefrontFavorites.js';
import { canAddProductToCart, getProductStockMeta } from '@/lib/productStock.js';
import useCustomerActionGuard from '@/hooks/useCustomerActionGuard.js';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext.jsx';
import { toast } from 'sonner';
import { writeCachedPublicProductJson } from '@/lib/publicProductCache.js';
import './ProductDetailsPage.css';
import './StorefrontSurface.css';

const PRODUCT_DETAIL_CACHE_PREFIX = 'alsenussi:product-detail:v2:';
const PRODUCT_DETAIL_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function canUseProductDetailStorage() {
  return typeof window !== 'undefined' && Boolean(window.localStorage);
}

function readProductDetailCache(productId) {
  if (!productId || !canUseProductDetailStorage()) return null;

  try {
    const entry = JSON.parse(window.localStorage.getItem(`${PRODUCT_DETAIL_CACHE_PREFIX}${productId}`) || 'null');
    if (!entry?.product || !entry?.savedAt) return null;
    if (Date.now() - entry.savedAt > PRODUCT_DETAIL_CACHE_TTL_MS) return null;
    return entry.product;
  } catch {
    return null;
  }
}

function writeProductDetailCache(product) {
  if (!product?.id || !canUseProductDetailStorage()) return;

  try {
    window.localStorage.setItem(`${PRODUCT_DETAIL_CACHE_PREFIX}${product.id}`, JSON.stringify({
      product,
      savedAt: Date.now(),
    }));
  } catch {
    // The shared public product cache still exists if this small detail cache cannot be written.
  }
}

function getInitialProductDetail(productId, routeProduct) {
  if (routeProduct?.id === productId) return routeProduct;
  return getStorefrontProduct(productId) || readProductDetailCache(productId);
}

function hasFullProductDetailPayload(product) {
  if (!product) return false;
  return Boolean(
    product.description_ar
    || product.description_en
    || Array.isArray(product.product_specs)
    || product.warranty_months !== undefined
    || product.water_resistance !== undefined
    || product.weight_grams !== undefined,
  );
}

function getBrandName(product) {
  return product?.brands?.name_en || product?.brands?.name || product?.brands?.name_ar || 'HUGO';
}

function getProductName(product) {
  return product?.name_ar || product?.name_en || product?.sku || 'ساعة هوجو رجالية';
}

function getProductModel(product) {
  return product?.name_en || product?.sku || 'Tripoli Modern 1530302';
}

function getProductDescription(product) {
  return product?.description_ar || product?.description_en || 'ساعة عصرية تجمع بين البساطة والجرأة. تصميم أنيق بوجه أسود ولمسات ذهبية، مثالية لإطلالة يومية راقية.';
}

function sortImages(images = []) {
  return [...images].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1;
    if (!a.is_primary && b.is_primary) return 1;
    return (a.sort_order || 0) - (b.sort_order || 0);
  });
}

function normalizeProductSpecs(specs) {
  if (!Array.isArray(specs)) return [];

  return specs
    .map((spec) => ({
      label: String(spec?.label || '').trim(),
      value: String(spec?.value || '').trim(),
    }))
    .filter((spec) => spec.label && spec.value);
}

function getProductSpecs(product) {
  const customSpecs = normalizeProductSpecs(product?.product_specs);

  if (customSpecs.length > 0) {
    return customSpecs;
  }

  return [
    { label: 'الحركة', value: product?.movement_type === 'automatic' ? 'أوتوماتيك' : product?.movement_type === 'mechanical' ? 'ميكانيكي' : 'كوارتز ياباني' },
    { label: 'مقاومة الماء', value: product?.water_resistance || '5 ATM (50 متر)' },
    { label: 'خامة السوار', value: product?.strap_material || 'ستانلس ستيل شبكي' },
    { label: 'القطر', value: product?.case_size_mm ? `${Number(product.case_size_mm).toLocaleString('en-US')} مم` : '40 مم' },
    { label: 'الزجاج', value: product?.case_material ? `${product.case_material} مقاوم للخدش` : 'معدني مقوى مقاوم للخدش' },
  ];
}

function getProductImages(product) {
  const images = sortImages(product?.product_images || [])
    .map((image) => ({
      url: image.image_url,
      alt: image.alt_text_ar || image.alt_text_en || getProductName(product),
    }))
    .filter((image) => image.url);

  if (images.length > 0) return images;
  if (product?.primary_image_url) {
    return [{ url: product.primary_image_url, alt: getProductName(product) }];
  }

  return [];
}

function getCollection(product) {
  const sku = product?.sku || '';
  const categorySlug = product?.categories?.slug || '';

  if (sku.startsWith('SNG-') || categorySlug.includes('sunglasses')) return 'sunglasses';
  if (sku.startsWith('SNP-') || categorySlug.includes('pen')) return 'pens';
  return 'watches';
}

function getBackHref(collection) {
  if (collection === 'sunglasses') return '/sunglasses';
  if (collection === 'pens') return '/pens';
  return '/watches';
}

function emptyProductRatingSummary() {
  return {
    ratingAverage: null,
    ratingCount: 0,
  };
}

function normalizeProductRatingSummary(source = {}) {
  const ratingCount = Number(source.rating_count ?? source.ratingCount ?? 0);
  const ratingAverage = Number(source.rating_average ?? source.ratingAverage ?? 0);

  if (!Number.isFinite(ratingCount) || ratingCount <= 0 || !Number.isFinite(ratingAverage)) {
    return emptyProductRatingSummary();
  }

  return {
    ratingAverage,
    ratingCount,
  };
}

function formatRatingAverage(value) {
  return Number(value || 0).toLocaleString('ar-LY', {
    maximumFractionDigits: 1,
    minimumFractionDigits: Number.isInteger(Number(value || 0)) ? 0 : 1,
  });
}

async function readRatingApiError(response) {
  try {
    const payload = await response.json();
    return payload?.error || payload?.message || 'تعذر حفظ التقييم. حاول مرة أخرى.';
  } catch {
    return 'تعذر حفظ التقييم. حاول مرة أخرى.';
  }
}

function ProductRatingStars({
  value = 0,
  interactiveValue = 0,
  isInteractive = false,
  disabled = false,
  onRate,
  onHover,
  onLeave,
}) {
  const activeValue = Number(interactiveValue || value || 0);
  const roundedValue = Math.round(activeValue);
  const scores = [1, 2, 3, 4, 5];

  if (!isInteractive) {
    return (
      <div className="product-details-page__stars" aria-label={`تقييم ${formatRatingAverage(activeValue)} من 5`}>
        {scores.map((score) => (
          <span className={score <= roundedValue ? 'is-active' : undefined} key={score}>
            <Star aria-hidden="true" />
          </span>
        ))}
      </div>
    );
  }

  return (
    <div
      className="product-details-page__stars product-details-page__stars--interactive"
      role="radiogroup"
      aria-label="اختر تقييم المنتج"
      onMouseLeave={onLeave}
    >
      {scores.map((score) => (
        <button
          className={score <= roundedValue ? 'is-active' : undefined}
          type="button"
          role="radio"
          aria-checked={Number(value || 0) === score}
          aria-label={`${score} من 5`}
          disabled={disabled}
          key={score}
          onClick={() => onRate?.(score)}
          onFocus={() => onHover?.(score)}
          onMouseEnter={() => onHover?.(score)}
        >
          <Star aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}

function ProductDetailsSkeleton() {
  return (
    <main className="product-details-page" dir="rtl" aria-busy="true">
      <div className="product-details-page__shell">
        <div className="product-details-page__topbar">
          <span className="product-details-page__sk product-details-page__sk--icon" />
          <span className="product-details-page__sk product-details-page__sk--title" />
          <span className="product-details-page__sk product-details-page__sk--actions" />
        </div>
        <section className="product-details-page__gallery product-details-page__gallery--skeleton">
          <span className="product-details-page__sk product-details-page__sk--watch" />
          <span className="product-details-page__sk product-details-page__sk--gallery-counter" />
        </section>
        <section className="product-details-page__summary">
          <div className="product-details-page__identity">
            <span className="product-details-page__sk product-details-page__sk--brand" />
            <span className="product-details-page__sk product-details-page__sk--name" />
            <span className="product-details-page__sk product-details-page__sk--model" />
          </div>
        </section>
        <section className="product-details-page__rating-strip product-details-page__rating-strip--skeleton">
          <span className="product-details-page__sk product-details-page__sk--rating" />
        </section>
        <section className="product-details-page__specs">
          <span className="product-details-page__sk product-details-page__sk--spec-title" />
          {Array.from({ length: 5 }).map((_, index) => <span className="product-details-page__sk product-details-page__sk--spec" key={index} />)}
        </section>
      </div>
      <span className="sr-only" role="status">جاري تحميل تفاصيل المنتج</span>
    </main>
  );
}

export default function ProductDetailsPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const requireCustomer = useCustomerActionGuard();
  const { customerSession, isCustomerLoading } = useCustomerAuth();
  const cartIconRef = useRef(null);
  const gallerySwipeRef = useRef(null);
  const routeProduct = location.state?.product || null;
  const cachedProductForRoute = useMemo(() => (id ? getInitialProductDetail(id, routeProduct) : null), [id, routeProduct]);
  const [product, setProduct] = useState(() => cachedProductForRoute);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(() => !cachedProductForRoute);
  const [loadError, setLoadError] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [cartCount, setCartCount] = useState(() => getCartItemCount());
  const [favoriteIds, setFavoriteIds] = useState(() => new Set(readFavoriteItems()));
  const [ratingSummary, setRatingSummary] = useState(() => (
    cachedProductForRoute ? normalizeProductRatingSummary(cachedProductForRoute) : emptyProductRatingSummary()
  ));
  const [userRating, setUserRating] = useState(null);
  const [hoverRating, setHoverRating] = useState(0);
  const [isRatingDialogOpen, setIsRatingDialogOpen] = useState(false);
  const [draftRating, setDraftRating] = useState(0);
  const [isRatingLoading, setIsRatingLoading] = useState(false);
  const [isRatingSaving, setIsRatingSaving] = useState(false);
  const [activeDetailsTab, setActiveDetailsTab] = useState('details');

  useEffect(() => {
    const controller = new AbortController();

    async function loadRelatedProducts(productForRelated) {
      const collection = getCollection(productForRelated);
      const relatedFeedUrl = STOREFRONT_PRODUCT_FEEDS[collection];
      const cachedRelatedData = relatedFeedUrl ? getStorefrontFeed(relatedFeedUrl) : null;

      if (Array.isArray(cachedRelatedData?.items)) {
        setRelatedProducts(cachedRelatedData.items.filter((item) => item.id !== productForRelated.id).slice(0, 2));
        return;
      }

      try {
        const relatedData = await preloadStorefrontFeed(relatedFeedUrl);
        if (!controller.signal.aborted) {
          setRelatedProducts((relatedData.items || []).filter((item) => item.id !== productForRelated.id).slice(0, 2));
        }
      } catch {
        if (!controller.signal.aborted) {
          setRelatedProducts([]);
        }
      }
    }

    async function loadProduct() {
      let hasDisplayedProduct = false;

      try {
        const cachedProduct = getStorefrontProduct(id);
        const storedProduct = (routeProduct?.id === id ? routeProduct : null) || cachedProduct || readProductDetailCache(id);
        if (storedProduct) {
          hasDisplayedProduct = true;
          setProduct(storedProduct);
          writeProductDetailCache(storedProduct);
          writeCachedPublicProductJson(`/products/${id}`, storedProduct);
          setRatingSummary(normalizeProductRatingSummary(storedProduct));
          setIsLoading(false);
          setLoadError(false);
          setActiveImageIndex(0);
          loadRelatedProducts(storedProduct);
        } else {
          setIsLoading(true);
          setLoadError(false);
          setActiveImageIndex(0);
        }

        if (!hasDisplayedProduct) {
          try {
            const preloadedProduct = await preloadStorefrontProduct(id);
            if (preloadedProduct && !controller.signal.aborted) {
              hasDisplayedProduct = true;
              setProduct(preloadedProduct);
              writeProductDetailCache(preloadedProduct);
              writeCachedPublicProductJson(`/products/${id}`, preloadedProduct);
              setRatingSummary(normalizeProductRatingSummary(preloadedProduct));
              setIsLoading(false);
              setLoadError(false);
              loadRelatedProducts(preloadedProduct);

              if (hasFullProductDetailPayload(preloadedProduct)) {
                return;
              }
            }
          } catch {
            // Continue to the full detail request below.
          }
        }

        const response = await apiServerClient.fetch(`/products/${id}`, {
          cache: hasDisplayedProduct ? 'reload' : undefined,
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error('Failed to load product details');
        }

        const productData = await response.json();
        setProduct(productData);
        writeProductDetailCache(productData);
        writeCachedPublicProductJson(`/products/${id}`, productData);
        setRatingSummary(normalizeProductRatingSummary(productData));
        setUserRating(null);
        setHoverRating(0);
        setDraftRating(0);
        setIsRatingDialogOpen(false);
        setLoadError(false);

        if (!controller.signal.aborted) {
          setIsLoading(false);
        }

        loadRelatedProducts(productData);
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Failed to load product details', error);
          if (!hasDisplayedProduct) {
            setProduct(null);
            setRelatedProducts([]);
          }
          setLoadError(true);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    if (id) {
      loadProduct();
    }

    return () => controller.abort();
  }, [id, routeProduct]);

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

  useEffect(() => {
    const token = customerSession?.accessToken;

    if (!id || isCustomerLoading) return undefined;

    if (!token) {
      setUserRating(null);
      setIsRatingLoading(false);
      return undefined;
    }

    const controller = new AbortController();

    async function loadCustomerRating() {
      try {
        setIsRatingLoading(true);

        const response = await apiServerClient.fetch(`/customer/product-ratings/${encodeURIComponent(id)}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(await readRatingApiError(response));
        }

        const payload = await response.json();

        if (!controller.signal.aborted) {
          setUserRating(payload.rating || null);
          if (payload.summary) {
            setRatingSummary(normalizeProductRatingSummary(payload.summary));
          }
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          setUserRating(null);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsRatingLoading(false);
        }
      }
    }

    loadCustomerRating();

    return () => controller.abort();
  }, [customerSession?.accessToken, id, isCustomerLoading]);

  const currentProduct = product?.id === id ? product : cachedProductForRoute;
  const images = useMemo(() => getProductImages(currentProduct), [currentProduct]);
  const activeImage = images[activeImageIndex] || images[0] || null;
  const hasMultipleImages = images.length > 1;
  const collection = getCollection(currentProduct);
  const backHref = getBackHref(collection);
  const specs = getProductSpecs(currentProduct);
  const pricing = getProductPricing(currentProduct);
  const stockMeta = getProductStockMeta(currentProduct);
  const ratingAverage = Number(ratingSummary.ratingAverage || 0);
  const ratingCount = Number(ratingSummary.ratingCount || 0);
  const ratingCountLabel = ratingCount > 0 ? ratingCount.toLocaleString('ar-LY') : '0';
  const galleryPositionLabel = images.length > 0 ? `${activeImageIndex + 1}/${images.length}` : '0/0';

  useEffect(() => {
    if (!currentProduct?.id) return;
    writeProductDetailCache(currentProduct);
    writeCachedPublicProductJson(`/products/${currentProduct.id}`, currentProduct);
  }, [currentProduct]);

  useEffect(() => {
    setActiveDetailsTab('details');
  }, [id]);

  if (isLoading && !currentProduct) {
    return <ProductDetailsSkeleton />;
  }

  if (loadError || !currentProduct) {
    return (
      <main className="product-details-page" dir="rtl">
        <div className="product-details-page__shell">
          <header className="product-details-page__topbar" aria-label="شريط تفاصيل المنتج">
            <button className="product-details-page__icon-button" type="button" onClick={() => navigate(-1)} aria-label="الرجوع">
              <ChevronLeft aria-hidden="true" />
            </button>
            <h1>تفاصيل المنتج</h1>
            <Link className="product-details-page__icon-button" to="/watches" aria-label="العودة للمنتجات">
              <Home aria-hidden="true" />
            </Link>
          </header>
          <section className="product-details-page__empty">
            <strong>تعذر تحميل تفاصيل المنتج</strong>
            <span>تحقق من اتصال الخادم ثم أعد المحاولة من صفحة المنتجات.</span>
            <Link to={backHref}>العودة للمنتجات</Link>
          </section>
        </div>
      </main>
    );
  }

  function handleAddToCart({ navigateToCart = false, event } = {}) {
    if (!currentProduct?.id) return;
    const currentCartQuantity = readCartItems().find((item) => item.productId === String(currentProduct.id))?.quantity || 0;
    const cartCheck = canAddProductToCart(currentProduct, currentCartQuantity, 1);

    if (!cartCheck.canAdd) {
      toast.error(cartCheck.message);
      return;
    }

    addProductToCart(currentProduct.id, 1);
    setCartCount(getCartItemCount());

    if (!navigateToCart) {
      animateProductToCart({
        cartElement: cartIconRef.current,
        event,
        sourceSelector: '.product-details-page__gallery-slide.is-active img',
      });
    }

    if (navigateToCart) {
      navigate('/cart');
    }
  }

  function handleRelatedAddToCart(event, relatedProduct) {
    event.preventDefault();
    event.stopPropagation();

    if (!relatedProduct?.id) return;

    const currentCartQuantity = readCartItems().find((item) => item.productId === String(relatedProduct.id))?.quantity || 0;
    const cartCheck = canAddProductToCart(relatedProduct, currentCartQuantity, 1);

    if (!cartCheck.canAdd) {
      toast.error(cartCheck.message);
      return;
    }

    addProductToCart(relatedProduct.id, 1);
    setCartCount(getCartItemCount());
    animateProductToCart({
      cartElement: cartIconRef.current,
      event,
      sourceElement: event.currentTarget.closest('.product-details-page__related-card')?.querySelector('.product-details-page__related-image img'),
    });
    toast.success('تمت إضافة المنتج إلى السلة.');
  }

  function handleToggleFavorite(productId = currentProduct?.id) {
    if (!productId) return;
    if (!requireCustomer('سجل الدخول أولاً لحفظ المنتجات في المفضلة.')) return;

    const wasFavorite = isProductFavorite(productId);
    const nextFavorites = toggleFavoriteItem(productId);
    setFavoriteIds(new Set(nextFavorites));
    toast.success(wasFavorite ? 'تمت إزالة المنتج من المفضلة.' : 'تم حفظ المنتج في المفضلة.');
  }

  async function handleShareProduct() {
    const shareUrl = window.location.href;
    const shareTitle = getProductName(currentProduct);

    try {
      if (navigator.share) {
        await navigator.share({
          title: shareTitle,
          text: shareTitle,
          url: shareUrl,
        });
        return;
      }

      await navigator.clipboard?.writeText(shareUrl);
      toast.success('تم نسخ رابط المنتج.');
    } catch (error) {
      if (error?.name !== 'AbortError') {
        toast.error('تعذرت مشاركة المنتج.');
      }
    }
  }

  function handleOpenRatingDialog() {
    if (!requireCustomer('سجل الدخول أولاً لتقييم المنتج.')) return;
    setDraftRating(userRating || 0);
    setHoverRating(0);
    setIsRatingDialogOpen(true);
  }

  async function handleRateProduct(nextRating) {
    if (!currentProduct?.id || isRatingSaving) return false;
    if (!requireCustomer('سجل الدخول أولاً لتقييم المنتج.')) return false;

    const token = customerSession?.accessToken;
    if (!token) return false;

    try {
      setIsRatingSaving(true);

      const response = await apiServerClient.fetch(`/customer/product-ratings/${encodeURIComponent(currentProduct.id)}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rating: nextRating }),
      });

      if (!response.ok) {
        throw new Error(await readRatingApiError(response));
      }

      const payload = await response.json();
      setUserRating(payload.rating || nextRating);
      setHoverRating(0);

      if (payload.summary) {
        setRatingSummary(normalizeProductRatingSummary(payload.summary));
      }

      toast.success('تم حفظ تقييمك.');
      return true;
    } catch (error) {
      toast.error(error.message || 'تعذر حفظ التقييم. حاول مرة أخرى.');
      return false;
    } finally {
      setIsRatingSaving(false);
    }
  }

  async function handleSaveRating() {
    const nextRating = Number(draftRating || 0);

    if (!nextRating) {
      toast.error('اختر عدد النجوم أولاً.');
      return;
    }

    const didSave = await handleRateProduct(nextRating);
    if (didSave) {
      setIsRatingDialogOpen(false);
    }
  }

  function showAdjacentImage(direction) {
    if (images.length < 2) return;
    setActiveImageIndex((currentIndex) => (currentIndex + direction + images.length) % images.length);
  }

  function handleGalleryPointerDown(event) {
    if (images.length < 2) return;

    gallerySwipeRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function handleGalleryPointerUp(event) {
    const start = gallerySwipeRef.current;
    gallerySwipeRef.current = null;

    if (!start || images.length < 2) return;

    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    const isHorizontalSwipe = Math.abs(deltaX) > 38 && Math.abs(deltaX) > Math.abs(deltaY) * 1.15;

    if (!isHorizontalSwipe) return;

    event.preventDefault();
    event.stopPropagation();
    showAdjacentImage(deltaX < 0 ? 1 : -1);
  }

  return (
    <main
      className={[
        'product-details-page',
        collection === 'pens' ? 'product-details-page--pens' : '',
        collection === 'sunglasses' ? 'product-details-page--sunglasses' : '',
      ].filter(Boolean).join(' ')}
      dir="rtl"
    >
      <div className="product-details-page__shell">
        <header className="product-details-page__topbar" aria-label="شريط تفاصيل المنتج">
          <button className="product-details-page__icon-button product-details-page__back" type="button" onClick={() => navigate(-1)} aria-label="الرجوع">
            <ChevronLeft aria-hidden="true" />
          </button>

          <h1>تفاصيل المنتج</h1>

          <div className="product-details-page__header-actions">
            <button
              className="product-details-page__icon-button"
              type="button"
              onClick={handleShareProduct}
              aria-label="مشاركة المنتج"
            >
              <Share2 aria-hidden="true" />
            </button>
            <button
              className={favoriteIds.has(String(currentProduct.id)) ? 'product-details-page__icon-button is-active' : 'product-details-page__icon-button'}
              type="button"
              onClick={() => handleToggleFavorite(currentProduct.id)}
              aria-pressed={favoriteIds.has(String(currentProduct.id))}
              aria-label="إضافة إلى المفضلة"
            >
              <Heart aria-hidden="true" />
            </button>
            <Link className="product-details-page__icon-button product-details-page__cart" to="/cart" aria-label="السلة" ref={cartIconRef}>
              <ShoppingBag aria-hidden="true" />
              <span>{cartCount}</span>
            </Link>
          </div>
        </header>

        <section className={hasMultipleImages ? 'product-details-page__gallery' : 'product-details-page__gallery product-details-page__gallery--single-image'} aria-label="صور المنتج">
          <div className="product-details-page__gallery-bg" />
          {!stockMeta.isAvailable && stockMeta.stockLabel ? (
            <span className="product-details-page__gallery-stock-badge">
              {stockMeta.stockLabel}
            </span>
          ) : null}

          <div
            className={hasMultipleImages ? 'product-details-page__hero-image product-details-page__hero-image--swipeable' : 'product-details-page__hero-image'}
            onPointerCancel={() => {
              gallerySwipeRef.current = null;
            }}
            onPointerDown={handleGalleryPointerDown}
            onPointerUp={handleGalleryPointerUp}
          >
            {images.length > 0 ? (
              <div
                className="product-details-page__gallery-track"
                style={{ transform: `translate3d(-${activeImageIndex * 100}%, 0, 0)` }}
              >
                {images.map((image, index) => (
                  <div
                    className={index === activeImageIndex ? 'product-details-page__gallery-slide is-active' : 'product-details-page__gallery-slide'}
                    aria-hidden={index !== activeImageIndex}
                    key={`${image.url}-${index}`}
                  >
                    <img
                      src={image.url}
                      alt={image.alt}
                      decoding="async"
                      loading={index === activeImageIndex ? 'eager' : 'lazy'}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <PackageCheck aria-hidden="true" />
            )}
          </div>

          <span className="product-details-page__gallery-counter" dir="ltr">{galleryPositionLabel}</span>
        </section>

        <section className="product-details-page__summary" aria-label="ملخص المنتج">
          <div className="product-details-page__identity">
            <b className="product-details-page__brand">{getBrandName(currentProduct)}</b>
            <h2>{getProductName(currentProduct)}</h2>
            <div className="product-details-page__price-rating-row">
              <div className="product-details-page__summary-price">
                {pricing.hasSale ? <small dir="ltr">{pricing.originalPriceLabel}</small> : null}
                <strong dir="ltr">{pricing.currentPriceLabel}</strong>
              </div>
              <div className="product-details-page__summary-rating">
                <ProductRatingStars value={ratingAverage} />
                <span dir="ltr">({ratingCountLabel})</span>
              </div>
            </div>
            <span className="product-details-page__model">{getProductModel(currentProduct)}</span>
            <p>{getProductDescription(currentProduct)}</p>
            {stockMeta.isAvailable && stockMeta.stockLabel ? (
              <span className="product-details-page__stock-note">
                {stockMeta.stockLabel}
              </span>
            ) : null}
            <div className="product-details-page__inline-actions">
              <button className="product-details-page__inline-cart" type="button" onClick={(event) => handleAddToCart({ event })} disabled={!stockMeta.isAvailable}>
                {stockMeta.isAvailable ? 'أضف إلى السلة' : 'غير متاح للشراء'}
              </button>
              <button
                className={favoriteIds.has(String(currentProduct.id)) ? 'product-details-page__inline-wishlist is-active' : 'product-details-page__inline-wishlist'}
                type="button"
                onClick={() => handleToggleFavorite(currentProduct.id)}
                aria-pressed={favoriteIds.has(String(currentProduct.id))}
              >
                <Heart aria-hidden="true" />
                <span>{favoriteIds.has(String(currentProduct.id)) ? 'في المفضلة' : 'أضف إلى المفضلة'}</span>
              </button>
            </div>
          </div>
        </section>

        <nav className="product-details-page__tabs" aria-label="أقسام المنتج">
          <button
            type="button"
            className={activeDetailsTab === 'details' ? 'is-active' : undefined}
            aria-selected={activeDetailsTab === 'details'}
            onClick={() => setActiveDetailsTab('details')}
          >
            التفاصيل
          </button>
          <button
            type="button"
            className={activeDetailsTab === 'ratings' ? 'is-active' : undefined}
            aria-selected={activeDetailsTab === 'ratings'}
            onClick={() => setActiveDetailsTab('ratings')}
          >
            التقييمات ({ratingCountLabel})
          </button>
        </nav>

        <section className="product-details-page__rating-strip" aria-labelledby="product-details-rating-title" hidden={activeDetailsTab !== 'ratings'}>
          <div className="product-details-page__rating-product">
            <div className="product-details-page__rating-heading">
              <span id="product-details-rating-title">تقييم المنتج</span>
              <strong dir="ltr">{ratingCount > 0 ? `${formatRatingAverage(ratingAverage)}/5` : '0/5'}</strong>
            </div>
            <ProductRatingStars value={ratingAverage} />
          </div>

          <div className="product-details-page__rating-meta">
            <span>{ratingCountLabel} قيّموا المنتج</span>
            {userRating ? <em dir="ltr">{userRating}/5</em> : null}
            <button type="button" onClick={handleOpenRatingDialog} disabled={isRatingSaving || isRatingLoading}>
              {userRating ? 'تعديل تقييمك' : 'قيّم المنتج'}
            </button>
          </div>
        </section>

        {isRatingDialogOpen ? (
          <div className="product-details-page__rating-dialog-backdrop" role="presentation" onClick={() => setIsRatingDialogOpen(false)}>
            <section
              className="product-details-page__rating-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="product-details-rating-dialog-title"
              onClick={(event) => event.stopPropagation()}
            >
              <header>
                <h2 id="product-details-rating-dialog-title">قيّم المنتج</h2>
                <span>{draftRating ? `${draftRating.toLocaleString('ar-LY')} من 5` : 'اختر عدد النجوم'}</span>
              </header>

              <ProductRatingStars
                value={draftRating}
                interactiveValue={hoverRating}
                isInteractive
                disabled={isRatingSaving}
                onHover={setHoverRating}
                onLeave={() => setHoverRating(0)}
                onRate={setDraftRating}
              />

              <footer>
                <button type="button" className="product-details-page__rating-dialog-cancel" onClick={() => setIsRatingDialogOpen(false)} disabled={isRatingSaving}>
                  إلغاء
                </button>
                <button type="button" className="product-details-page__rating-dialog-save" onClick={handleSaveRating} disabled={isRatingSaving || !draftRating}>
                  {isRatingSaving ? 'جاري الحفظ...' : 'حفظ'}
                </button>
              </footer>
            </section>
          </div>
        ) : null}

        <section className="product-details-page__specs" aria-labelledby="product-details-specs-title" hidden={activeDetailsTab !== 'details'}>
          <header>
            <button type="button" aria-label="طي مواصفات المنتج">
              <ChevronUp aria-hidden="true" />
            </button>
            <h2 id="product-details-specs-title">مواصفات المنتج</h2>
            <FileText aria-hidden="true" />
          </header>

          <dl>
            {specs.map((spec) => (
              <div key={spec.label}>
                <dt>{spec.label}</dt>
                <dd>{spec.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="product-details-page__related" aria-labelledby="product-details-related-title">
          <h2 id="product-details-related-title">قد يعجبك أيضاً</h2>

          <div className="product-details-page__related-grid">
            {relatedProducts.map((related) => {
              const relatedImages = getProductImages(related);
              const relatedImage = relatedImages[0];
              const relatedPricing = getProductPricing(related);
              const relatedStockMeta = getProductStockMeta(related);
              const isRelatedFavorite = favoriteIds.has(String(related.id));

              return (
                <article className="product-details-page__related-card" key={related.id}>
                  <button
                    className={isRelatedFavorite ? 'product-details-page__related-favorite is-active' : 'product-details-page__related-favorite'}
                    type="button"
                    onClick={() => handleToggleFavorite(related.id)}
                    aria-label={isRelatedFavorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
                    aria-pressed={isRelatedFavorite}
                  >
                    <Heart aria-hidden="true" />
                  </button>

                  <Link className="product-details-page__related-link" to={`/products/${related.id}`} state={{ product: related }}>
                    <div className="product-details-page__related-image">
                      {relatedImage ? <img src={relatedImage.url} alt={relatedImage.alt} decoding="async" loading="lazy" /> : <PackageCheck aria-hidden="true" />}
                      {!relatedStockMeta.isAvailable ? <span className="product-details-page__related-stock">نفدت الكمية</span> : null}
                    </div>

                    <div className="product-details-page__related-content">
                      <strong>{getBrandName(related)}</strong>
                      <span className="product-details-page__related-name">{related.name_ar || related.name_en || related.sku}</span>
                      <span className={relatedPricing.hasSale ? 'product-details-page__related-price product-details-page__related-price--sale' : 'product-details-page__related-price'} dir="ltr">
                        {relatedPricing.hasSale ? <small>{relatedPricing.originalPriceLabel}</small> : null}
                        <b>{relatedPricing.currentPriceLabel}</b>
                      </span>
                    </div>
                  </Link>

                  <button
                    className="product-details-page__related-cart"
                    type="button"
                    onClick={(event) => handleRelatedAddToCart(event, related)}
                    disabled={!relatedStockMeta.isAvailable}
                  >
                    <ShoppingBag aria-hidden="true" />
                    <span>{relatedStockMeta.isAvailable ? 'أضف للسلة' : 'غير متاح'}</span>
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      </div>

      <div className="product-details-page__bottom-actions" aria-label="إجراءات الشراء">
        <div className="product-details-page__bottom-price">
          {pricing.hasSale ? <span dir="ltr">{pricing.originalPriceLabel}</span> : null}
          <strong dir="ltr">{pricing.currentPriceLabel}</strong>
        </div>
        <button className="product-details-page__buy-now" type="button" onClick={() => handleAddToCart({ navigateToCart: true })} disabled={!stockMeta.isAvailable}>{stockMeta.isAvailable ? 'اشتري الآن' : 'نفدت الكمية'}</button>
        <button className="product-details-page__add-cart" type="button" onClick={(event) => handleAddToCart({ event })} disabled={!stockMeta.isAvailable}>
          <span>{stockMeta.isAvailable ? 'أضف إلى السلة' : 'غير متاح للشراء'}</span>
          <ShoppingBag aria-hidden="true" />
        </button>
      </div>

      <nav className="customer-bottom-nav product-details-page__bottom-nav" aria-label="التنقل السفلي">
        {bottomNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.collection ? item.collection === collection : false;

          return (
            <Link
              to={item.href}
              key={`${item.href}-${item.label}`}
              className={isActive ? 'is-active' : undefined}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </main>
  );
}
const bottomNavItems = [
  { label: 'الرئيسية', href: '/store', icon: Home },
  { label: 'النظارات', href: '/sunglasses', icon: Glasses, collection: 'sunglasses' },
  { label: 'الساعات', href: '/watches', icon: Clock, collection: 'watches' },
  { label: 'الأقلام', href: '/pens', icon: PenLine, collection: 'pens' },
  { label: 'الحساب', href: '/account', icon: User },
];
