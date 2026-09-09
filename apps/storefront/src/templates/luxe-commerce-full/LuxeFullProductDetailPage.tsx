import { useEffect, useMemo, useState } from "react";

import {
  fetchStorefrontCatalog,
  fetchStorefrontProductDetail,
  fetchStorefrontPurchaseOptions,
  isStorefrontApiError,
} from "../../api/storefront-api";
import { useCart } from "../../commerce/CartContext";
import { useFavorites } from "../../commerce/FavoritesContext";
import {
  CartIcon,
  ChevronLeftIcon,
  HeartIcon,
  PackageIcon,
  ShareIcon,
} from "../../components/Icons";
import { StatePanel } from "../../components/StatePanel";
import { StorefrontLink } from "../../lib/navigation";
import type {
  StorefrontProductCardDto,
  StorefrontProductDetailDto,
  StorefrontProfileDto,
  StorefrontPurchaseOptionsDto,
} from "../../types";
import { LuxeFullBottomNavigation } from "./LuxeFullBottomNavigation";

import "./reference-source/src/pages/storefront/ProductDetailsPage.css";
import "./reference-source/src/pages/storefront/StorefrontSurface.css";

const money = (amount: number, currency: string): string =>
  `${currency.toUpperCase()} ${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(amount)}`;

const Stars = () => (
  <span className="product-details-page__stars" aria-label="لا توجد تقييمات متصلة بعد">
    {Array.from({ length: 5 }, (_, index) => (
      <span aria-hidden="true" key={index}>★</span>
    ))}
  </span>
);

export function LuxeFullProductDetailPage({
  handle,
  profile,
}: {
  handle: string;
  profile: StorefrontProfileDto;
}) {
  const { addItem, capability, cart, error: cartError, pending } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [product, setProduct] = useState<StorefrontProductDetailDto | null>(null);
  const [purchase, setPurchase] = useState<StorefrontPurchaseOptionsDto | null>(null);
  const [related, setRelated] = useState<StorefrontProductCardDto[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<{ size: string | null; color: string | null }>({ size: null, color: null });
  const [activeTab, setActiveTab] = useState<"details" | "ratings">("details");
  const [status, setStatus] = useState<"loading" | "ready" | "not-found" | "unavailable">("loading");
  const [added, setAdded] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const currency = capability.online_checkout.status === "available"
      ? capability.online_checkout.currency_code
      : null;
    setStatus("loading");
    setAdded(false);

    void Promise.all([
      fetchStorefrontProductDetail(handle, { signal: controller.signal }),
      fetchStorefrontCatalog({ limit: 4, offset: 0, order: "-created_at", signal: controller.signal }).catch(() => null),
      currency
        ? fetchStorefrontPurchaseOptions(handle, currency, { signal: controller.signal }).catch(() => null)
        : Promise.resolve(null),
    ]).then(([detail, catalog, options]) => {
      setProduct(detail);
      setPurchase(options);
      setRelated(catalog?.products.filter((entry) => entry.handle !== detail.handle).slice(0, 3) ?? []);
      const firstVariant = options?.variants.find((variant) => variant.available_for_sale) ?? options?.variants[0];
      setSelectedOptions(firstVariant?.options ?? { size: null, color: null });
      setSelectedImageIndex(0);
      setStatus("ready");
      document.title = `${detail.title} | ${profile.name}`;
    }).catch((error: unknown) => {
      if (isStorefrontApiError(error) && error.code === "aborted") return;
      setStatus(isStorefrontApiError(error) && ["not_found", "invalid_request"].includes(error.code) ? "not-found" : "unavailable");
    });

    return () => controller.abort();
  }, [capability.online_checkout, handle, profile.name]);

  const images = useMemo(() => {
    if (!product) return [];
    return [...new Set([product.thumbnail_url, ...product.image_urls].filter((entry): entry is string => Boolean(entry)))];
  }, [product]);

  const selectedVariant = useMemo(() => purchase?.variants.find(
    (variant) => variant.options.size === selectedOptions.size && variant.options.color === selectedOptions.color,
  ) ?? purchase?.variants[0] ?? null, [purchase, selectedOptions]);

  const favoriteProduct = useMemo<StorefrontProductCardDto | null>(() => product ? {
    handle: product.handle,
    title: product.title,
    subtitle: product.subtitle,
    thumbnail_url: product.thumbnail_url ?? product.image_urls[0] ?? null,
    price_lyd: selectedVariant?.unit_price ?? null,
  } : null, [product, selectedVariant?.unit_price]);

  const itemCount = cart?.items.reduce((total, item) => total + item.quantity, 0) ?? 0;

  const chooseOption = (name: "size" | "color", value: string) => {
    if (!purchase) return;
    const next = { ...selectedOptions, [name]: value };
    const match = purchase.variants.find((variant) => variant.options.size === next.size && variant.options.color === next.color)
      ?? purchase.variants.find((variant) => variant.options[name] === value);
    if (match) setSelectedOptions(match.options);
  };

  const addToCart = async (goToCart = false) => {
    if (!selectedVariant?.available_for_sale) return;
    try {
      await addItem(selectedVariant.id);
      setAdded(true);
      if (goToCart) window.history.pushState({}, "", "/cart");
      if (goToCart) window.dispatchEvent(new PopStateEvent("popstate"));
    } catch {
      setAdded(false);
    }
  };

  const share = async () => {
    const payload = { title: product?.title ?? profile.name, url: window.location.href };
    if (navigator.share) await navigator.share(payload).catch(() => undefined);
    else await navigator.clipboard?.writeText(payload.url).catch(() => undefined);
  };

  if (status === "loading") {
    return <section className="product-details-page"><div className="product-details-page__shell"><div className="product-details-page__empty"><strong>جارٍ تحميل تفاصيل المنتج</strong></div></div><LuxeFullBottomNavigation className="product-details-page__bottom-nav" profile={profile} /></section>;
  }

  if (status !== "ready" || !product) {
    return (
      <section className="product-details-page">
        <div className="product-details-page__shell">
          <StatePanel
            kind={status === "not-found" ? "not-found" : "unavailable"}
            title={status === "not-found" ? "لم نجد هذا المنتج" : "تعذر تحميل تفاصيل المنتج"}
            message="تحقق من الرابط أو حاول مرة أخرى بعد قليل."
            locale={profile.locale}
          />
        </div>
        <LuxeFullBottomNavigation
          className="product-details-page__bottom-nav"
          profile={profile}
        />
      </section>
    );
  }

  const isSaved = favoriteProduct ? isFavorite(favoriteProduct.handle) : false;
  const price = selectedVariant && purchase ? money(selectedVariant.unit_price, purchase.currency_code) : "السعر غير متاح";

  return (
    <section className="product-details-page">
      <div className="product-details-page__shell">
        <header className="product-details-page__topbar" aria-label="شريط تفاصيل المنتج">
          <StorefrontLink className="product-details-page__icon-button product-details-page__back" to="/watches" ariaLabel="الرجوع">
            <ChevronLeftIcon />
          </StorefrontLink>
          <h1>تفاصيل المنتج</h1>
          <div className="product-details-page__header-actions">
            <button className="product-details-page__icon-button" type="button" onClick={() => void share()} aria-label="مشاركة المنتج"><ShareIcon /></button>
            <button className={isSaved ? "product-details-page__icon-button is-active" : "product-details-page__icon-button"} type="button" onClick={() => favoriteProduct && toggleFavorite(favoriteProduct)} aria-pressed={isSaved} aria-label="إضافة إلى المفضلة"><HeartIcon filled={isSaved} /></button>
            <StorefrontLink className="product-details-page__icon-button product-details-page__cart" to="/cart" ariaLabel="السلة"><CartIcon /><span>{itemCount}</span></StorefrontLink>
          </div>
        </header>

        <section className={images.length > 1 ? "product-details-page__gallery" : "product-details-page__gallery product-details-page__gallery--single-image"} aria-label="صور المنتج">
          <div className="product-details-page__gallery-bg" />
          {!selectedVariant?.available_for_sale ? <span className="product-details-page__gallery-stock-badge">غير متاح حالياً</span> : null}
          <div className="product-details-page__hero-image">
            {images.length ? (
              <div className="product-details-page__gallery-track" style={{ transform: `translate3d(-${selectedImageIndex * 100}%, 0, 0)` }}>
                {images.map((image, index) => <div className={index === selectedImageIndex ? "product-details-page__gallery-slide is-active" : "product-details-page__gallery-slide"} aria-hidden={index !== selectedImageIndex} key={image}><img src={image} alt={index === selectedImageIndex ? product.title : ""} /></div>)}
              </div>
            ) : <PackageIcon />}
          </div>
          {images.length > 1 ? <div className="luxe-full-gallery-dots">{images.map((image, index) => <button key={image} type="button" className={index === selectedImageIndex ? "is-active" : undefined} onClick={() => setSelectedImageIndex(index)} aria-label={`عرض الصورة ${index + 1}`} />)}</div> : null}
          <span className="product-details-page__gallery-counter" dir="ltr">{images.length ? `${selectedImageIndex + 1}/${images.length}` : "0/0"}</span>
        </section>

        <section className="product-details-page__summary" aria-label="ملخص المنتج">
          <div className="product-details-page__identity">
            <b className="product-details-page__brand">{product.subtitle ?? profile.name}</b>
            <h2>{product.title}</h2>
            <div className="product-details-page__price-rating-row">
              <div className="product-details-page__summary-price"><strong dir="ltr">{price}</strong></div>
              <div className="product-details-page__summary-rating"><Stars /><span dir="ltr">(0)</span></div>
            </div>
            <span className="product-details-page__model">{product.handle}</span>
            <p>{product.description ?? "قطعة مختارة بعناية من مجموعتنا."}</p>
            {purchase?.options.map((option) => (
              <div className="product-details-page__swatches" key={option.name}>
                <strong>{option.name === "size" ? "المقاس" : "اللون"}</strong>
                <div>{option.values.map((value) => <button type="button" key={value} className={selectedOptions[option.name] === value ? "product-details-page__swatch is-selected" : "product-details-page__swatch"} onClick={() => chooseOption(option.name, value)} aria-pressed={selectedOptions[option.name] === value}>{value}</button>)}</div>
              </div>
            ))}
            <div className="product-details-page__inline-actions">
              <button className="product-details-page__inline-cart" type="button" onClick={() => void addToCart()} disabled={pending || !selectedVariant?.available_for_sale}>{pending ? "جارٍ الإضافة..." : added ? "تمت الإضافة" : selectedVariant?.available_for_sale ? "أضف إلى السلة" : "غير متاح للشراء"}</button>
              <button className={isSaved ? "product-details-page__inline-wishlist is-active" : "product-details-page__inline-wishlist"} type="button" onClick={() => favoriteProduct && toggleFavorite(favoriteProduct)} aria-pressed={isSaved}><HeartIcon filled={isSaved} /><span>{isSaved ? "في المفضلة" : "أضف إلى المفضلة"}</span></button>
            </div>
            {cartError ? <p className="commerce-error" role="alert">{cartError}</p> : null}
          </div>
        </section>

        <nav className="product-details-page__tabs" aria-label="أقسام المنتج">
          <button type="button" className={activeTab === "details" ? "is-active" : undefined} onClick={() => setActiveTab("details")}>التفاصيل</button>
          <button type="button" className={activeTab === "ratings" ? "is-active" : undefined} onClick={() => setActiveTab("ratings")}>التقييمات (0)</button>
        </nav>

        <section className="product-details-page__rating-strip" hidden={activeTab !== "ratings"}>
          <div className="product-details-page__rating-product"><div className="product-details-page__rating-heading"><span>تقييم المنتج</span><strong dir="ltr">0/5</strong></div><Stars /></div>
          <div className="product-details-page__rating-meta"><span>التقييمات غير متصلة بعد</span></div>
        </section>

        <section className="product-details-page__specs" hidden={activeTab !== "details"}>
          <header><span aria-hidden="true">⌃</span><h2>مواصفات المنتج</h2><PackageIcon /></header>
          <dl>
            <div><dt>الاسم</dt><dd>{product.title}</dd></div>
            <div><dt>الموديل</dt><dd>{product.handle}</dd></div>
            <div><dt>التوفر</dt><dd>{selectedVariant?.available_for_sale ? "متوفر" : "غير متوفر"}</dd></div>
            <div><dt>المتجر</dt><dd>{profile.name}</dd></div>
          </dl>
        </section>

        {related.length ? <section className="product-details-page__related" aria-labelledby="product-details-related-title"><h2 id="product-details-related-title">قد يعجبك أيضاً</h2><div className="product-details-page__related-grid">{related.map((entry) => <article className="product-details-page__related-card" key={entry.handle}><button className={isFavorite(entry.handle) ? "product-details-page__related-favorite is-active" : "product-details-page__related-favorite"} type="button" onClick={() => toggleFavorite(entry)} aria-label="إضافة إلى المفضلة"><HeartIcon filled={isFavorite(entry.handle)} /></button><StorefrontLink className="product-details-page__related-link" to={`/products/${encodeURIComponent(entry.handle)}`}><div className="product-details-page__related-image">{entry.thumbnail_url ? <img src={entry.thumbnail_url} alt={entry.title} /> : <PackageIcon />}</div><div className="product-details-page__related-content"><strong>{entry.brand ?? profile.name}</strong><span className="product-details-page__related-name">{entry.title}</span>{entry.price_lyd ? <span className="product-details-page__related-price" dir="ltr"><b>{money(entry.price_lyd, "lyd")}</b></span> : null}</div></StorefrontLink></article>)}</div></section> : null}
      </div>

      <div className="product-details-page__bottom-actions" aria-label="إجراءات الشراء"><div className="product-details-page__bottom-price"><strong dir="ltr">{price}</strong></div><button className="product-details-page__buy-now" type="button" onClick={() => void addToCart(true)} disabled={pending || !selectedVariant?.available_for_sale}>اشتري الآن</button><button className="product-details-page__add-cart" type="button" onClick={() => void addToCart()} disabled={pending || !selectedVariant?.available_for_sale}><span>أضف إلى السلة</span><CartIcon /></button></div>
      <LuxeFullBottomNavigation
        className="product-details-page__bottom-nav"
        profile={profile}
      />
    </section>
  );
}
