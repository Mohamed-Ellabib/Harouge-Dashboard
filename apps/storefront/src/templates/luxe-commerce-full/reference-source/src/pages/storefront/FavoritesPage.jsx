import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Clock,
  Glasses,
  Heart,
  Home,
  Loader2,
  Package,
  PenLine,
  ShoppingBag,
  Trash2,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import apiServerClient from '@/lib/apiServerClient.js';
import { addProductToCart, CART_CHANGE_EVENT, getCartItemCount, readCartItems } from '@/lib/storefrontCart.js';
import { normalizeCurrency } from '@/lib/productPricing.js';
import { canAddProductToCart, getProductStockMeta } from '@/lib/productStock.js';
import {
  FAVORITES_CHANGE_EVENT,
  readFavoriteItems,
  toggleFavoriteItem,
} from '@/lib/storefrontFavorites.js';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext.jsx';
import './CustomerOrdersPage.css';
import './FavoritesPage.css';

const filterOptions = [
  { key: 'all', label: 'الكل' },
  { key: 'watches', label: 'الساعات' },
  { key: 'sunglasses', label: 'النظارات' },
  { key: 'pens', label: 'الأقلام' },
];

const bottomNavItems = [
  { label: 'الرئيسية', href: '/store', icon: Home },
  { label: 'النظارات', href: '/sunglasses', icon: Glasses },
  { label: 'الساعات', href: '/watches', icon: Clock },
  { label: 'الأقلام', href: '/pens', icon: PenLine },
  { label: 'الحساب', href: '/account', icon: User },
];

const favoriteCardText = {
  addToCart: '\u0623\u0636\u0641 \u0625\u0644\u0649 \u0627\u0644\u0633\u0644\u0629',
  available: '\u0645\u062a\u0648\u0641\u0631 \u0627\u0644\u0622\u0646',
  remove: '\u0625\u0632\u0627\u0644\u0629',
  unavailable: '\u063a\u064a\u0631 \u0645\u062a\u0648\u0641\u0631',
};

function sortImages(images = []) {
  return [...images].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1;
    if (!a.is_primary && b.is_primary) return 1;
    return (a.sort_order || 0) - (b.sort_order || 0);
  });
}

function getProductBrand(product) {
  return product?.brands?.name_en || product?.brands?.name_ar || product?.brands?.name || 'Al Senussi';
}

function getProductName(product) {
  return product?.name_ar || product?.name_en || product?.sku || 'Product';
}

function getProductImage(product) {
  const primaryImage = sortImages(product?.product_images || []).find((image) => image.image_url);
  return primaryImage?.image_url || product?.primary_image_url || '';
}

function getProductCollection(product) {
  const sku = String(product?.sku || '').toUpperCase();
  const categorySlug = String(product?.categories?.slug || '').toLowerCase();

  if (sku.startsWith('SNG-') || categorySlug.includes('sunglasses')) return 'sunglasses';
  if (sku.startsWith('SNP-') || categorySlug.includes('pen')) return 'pens';
  return 'watches';
}

function getCollectionLabel(collection) {
  return filterOptions.find((option) => option.key === collection)?.label || 'الساعات';
}

function formatMoney(product) {
  const value = Number(product?.sale_price || product?.price || 0);
  const currency = normalizeCurrency(product?.currency);
  return `${currency} ${value.toLocaleString('en-US')}`;
}

function mapProduct(product) {
  const collection = getProductCollection(product);
  const stockMeta = getProductStockMeta(product);

  return {
    id: product.id,
    rawProduct: product,
    brand: getProductBrand(product),
    collection,
    collectionLabel: getCollectionLabel(collection),
    image: getProductImage(product),
    inStock: stockMeta.isAvailable,
    stockLabel: stockMeta.stockLabel,
    availableQuantity: stockMeta.availableQuantity,
    requiresStock: stockMeta.requiresStock,
    name: getProductName(product),
    price: formatMoney(product),
  };
}

export default function FavoritesPage() {
  const navigate = useNavigate();
  const {
    isCustomerAuthenticated,
    isCustomerLoading,
  } = useCustomerAuth();
  const [favoriteIds, setFavoriteIds] = useState(() => readFavoriteItems());
  const [products, setProducts] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [cartCount, setCartCount] = useState(() => getCartItemCount());
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!isCustomerLoading && !isCustomerAuthenticated) {
      navigate('/account', {
        replace: true,
        state: {
          authMessage: 'سجل الدخول أولاً لعرض المفضلة.',
          redirectTo: '/favorites',
        },
      });
    }
  }, [isCustomerAuthenticated, isCustomerLoading, navigate]);

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
    function refreshFavoriteIds() {
      setFavoriteIds(readFavoriteItems());
    }

    window.addEventListener(FAVORITES_CHANGE_EVENT, refreshFavoriteIds);
    window.addEventListener('storage', refreshFavoriteIds);

    return () => {
      window.removeEventListener(FAVORITES_CHANGE_EVENT, refreshFavoriteIds);
      window.removeEventListener('storage', refreshFavoriteIds);
    };
  }, []);

  useEffect(() => {
    if (isCustomerAuthenticated) {
      setFavoriteIds(readFavoriteItems());
    }
  }, [isCustomerAuthenticated]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadFavorites() {
      if (!isCustomerAuthenticated) return;

      if (favoriteIds.length === 0) {
        setProducts([]);
        setErrorMessage('');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setErrorMessage('');

        const productResults = await Promise.all(favoriteIds.map(async (productId) => {
          const response = await apiServerClient.fetch(`/products/${encodeURIComponent(productId)}`, {
            signal: controller.signal,
          });

          if (!response.ok) return null;
          return response.json();
        }));

        const nextProducts = productResults.filter(Boolean).map(mapProduct);
        if (!controller.signal.aborted) {
          setProducts(nextProducts);
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          setProducts([]);
          setErrorMessage('تعذر تحميل المنتجات المفضلة. حاول مرة أخرى.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    loadFavorites();

    return () => controller.abort();
  }, [favoriteIds, isCustomerAuthenticated]);

  const filteredProducts = useMemo(() => (
    activeFilter === 'all'
      ? products
      : products.filter((product) => product.collection === activeFilter)
  ), [activeFilter, products]);

  function handleAddToCart(product) {
    const currentCartQuantity = readCartItems().find((item) => item.productId === String(product?.id))?.quantity || 0;
    const cartCheck = canAddProductToCart(product, currentCartQuantity, 1);

    if (!cartCheck.canAdd) {
      toast.error(cartCheck.message);
      return;
    }

    addProductToCart(product.id, 1);
    setCartCount(getCartItemCount());
    toast.success('تمت إضافة المنتج إلى السلة.');
  }

  function handleRemoveFavorite(product) {
    const nextFavoriteIds = toggleFavoriteItem(product.id);
    setFavoriteIds(nextFavoriteIds);
    toast.success('تمت إزالة المنتج من المفضلة.');
  }

  if (isCustomerLoading || !isCustomerAuthenticated) {
    return (
      <main className="customer-orders-page customer-favorites-page" dir="rtl">
        <div className="customer-orders-page__loading">
          <Loader2 aria-hidden="true" />
          <span>جاري تحميل المفضلة</span>
        </div>
      </main>
    );
  }

  return (
    <main className="customer-orders-page customer-favorites-page" dir="rtl">
      <div className="customer-orders-page__shell">
        <section className="customer-orders-page__hero" aria-labelledby="customer-favorites-title">
          <header className="customer-orders-page__topbar" aria-label="شريط المفضلة">
            <button type="button" onClick={() => navigate(-1)} aria-label="الرجوع">
              <ChevronLeft aria-hidden="true" />
            </button>

            <strong>المفضلة</strong>

            <Link to="/cart" aria-label="سلة التسوق">
              <ShoppingBag aria-hidden="true" />
              <span>{cartCount}</span>
            </Link>
          </header>

          <div className="customer-orders-page__hero-content">
            <h1 id="customer-favorites-title">المفضلة</h1>
          </div>
        </section>

        <section className="customer-orders-page__body" aria-label="قائمة المفضلة">
          <div className="customer-orders-page__filters customer-favorites-page__filters" role="tablist" aria-label="تصفية المفضلة">
            {filterOptions.map((filter) => (
              <button
                className={activeFilter === filter.key ? 'is-active' : undefined}
                type="button"
                role="tab"
                aria-selected={activeFilter === filter.key}
                key={filter.key}
                onClick={() => setActiveFilter(filter.key)}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="customer-orders-page__loading-card">
              <Loader2 aria-hidden="true" />
              <span>جاري تحميل المنتجات المفضلة</span>
            </div>
          ) : errorMessage ? (
            <div className="customer-orders-page__empty">
              <Heart aria-hidden="true" />
              <h2>تعذر تحميل المفضلة</h2>
              <p>{errorMessage}</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="customer-orders-page__empty">
              <Heart aria-hidden="true" />
              <h2>{products.length === 0 ? 'لا توجد منتجات مفضلة بعد' : 'لا توجد منتجات في هذا التصنيف'}</h2>
              <p>{products.length === 0 ? 'اضغط على أيقونة القلب في المنتجات لحفظها هنا.' : 'اختر تصنيفاً آخر من الأعلى لعرض مفضلتك.'}</p>
              <Link to="/watches">تسوق الآن</Link>
            </div>
          ) : (
            <div className="customer-favorites-page__list">
              {filteredProducts.map((product, index) => (
                <article className="customer-favorites-page__card" key={product.id} style={{ '--favorite-card-delay': `${index * 70}ms` }}>
                  <Link className="customer-favorites-page__image-link" to={`/products/${product.id}`} state={{ product: product.rawProduct }} aria-label={product.name}>
                    <span className="customer-favorites-page__image-box">
                      {product.image ? <img src={product.image} alt={product.name} /> : <Package aria-hidden="true" />}
                    </span>
                  </Link>

                  <button className="customer-favorites-page__heart" type="button" onClick={() => handleRemoveFavorite(product)} aria-label={product.name}>
                    <Heart aria-hidden="true" />
                  </button>

                  <Link className="customer-favorites-page__copy" to={`/products/${product.id}`} state={{ product: product.rawProduct }} aria-label={product.name}>
                    <span dir="ltr">{product.brand}</span>
                    <strong dir="rtl">{product.name}</strong>
                    <em className={product.inStock ? 'is-available' : undefined}>
                      {product.stockLabel || (product.inStock ? favoriteCardText.available : favoriteCardText.unavailable)}
                      <Heart aria-hidden="true" />
                    </em>
                    <small>
                      {product.collectionLabel}
                      <Clock aria-hidden="true" />
                    </small>
                  </Link>

                  <div className="customer-favorites-page__actions">
                    <strong dir="ltr">{product.price}</strong>
                    <button type="button" onClick={() => handleAddToCart(product)} disabled={!product.inStock}>
                      <span>{product.inStock ? favoriteCardText.addToCart : favoriteCardText.unavailable}</span>
                      <ShoppingBag aria-hidden="true" />
                    </button>
                    <button type="button" onClick={() => handleRemoveFavorite(product)}>
                      <span>{favoriteCardText.remove}</span>
                      <Trash2 aria-hidden="true" />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <nav className="customer-bottom-nav customer-orders-page__bottom-nav" aria-label="التنقل السفلي">
        {bottomNavItems.map((item) => {
          const Icon = item.icon;

          return (
            <Link to={item.href} key={`${item.href}-${item.label}`}>
              <Icon aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </main>
  );
}
