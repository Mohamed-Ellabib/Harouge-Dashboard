import { useEffect, useMemo, useState } from "react";

import {
  fetchStorefrontCatalog,
  fetchStorefrontProductDetail,
  fetchStorefrontPurchaseOptions,
  isStorefrontApiError,
} from "../api/storefront-api";
import { useCart } from "../commerce/CartContext";
import { useFavorites } from "../commerce/FavoritesContext";
import { ArrowRightIcon, CartIcon, HeartIcon, PackageIcon, ShareIcon } from "../components/Icons";
import { ProductCard } from "../components/ProductCard";
import { StatePanel } from "../components/StatePanel";
import { StorefrontLink } from "../lib/navigation";
import { storefrontUiText } from "../lib/localization";
import { formatStorefrontMoney } from "../lib/money";
import type {
  StorefrontProductCardDto,
  StorefrontProductDetailDto,
  StorefrontProfileDto,
  StorefrontPurchaseOptionsDto,
} from "../types";
import { isLuxeCommerceTemplate } from "../types";

type ProductDetailPageProps = {
  profile: StorefrontProfileDto;
  handle: string;
};

export const ProductDetailPage = ({
  profile,
  handle,
}: ProductDetailPageProps) => {
  const text = (ar: string, en: string) =>
    storefrontUiText(profile.locale, { ar, en });
  const { addItem, capability, cart, error: cartError, pending } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const isLuxe = isLuxeCommerceTemplate(profile.storefront?.template_key);
  const [product, setProduct] = useState<StorefrontProductDetailDto | null>(
    null,
  );
  const [related, setRelated] = useState<StorefrontProductCardDto[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [purchaseOptions, setPurchaseOptions] =
    useState<StorefrontPurchaseOptionsDto | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<{
    size: string | null;
    color: string | null;
  }>({ size: null, color: null });
  const [addStatus, setAddStatus] = useState<"idle" | "added">("idle");
  const [imageFailed, setImageFailed] = useState(false);
  const [status, setStatus] = useState<
    "loading" | "ready" | "not-found" | "unavailable"
  >("loading");
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setProduct(null);
    setRelated([]);
    setSelectedImage(null);
    setPurchaseOptions(null);
    setSelectedOptions({ size: null, color: null });
    setAddStatus("idle");
    setStatus("loading");
    document.title = `${text("المنتج", "Product")} | ${profile.name}`;

    const currency =
      capability.online_checkout.status === "available"
        ? capability.online_checkout.currency_code
        : null;
    void Promise.all([
      fetchStorefrontProductDetail(handle, { signal: controller.signal }),
      fetchStorefrontCatalog({
        limit: 4,
        offset: 0,
        order: "-created_at",
        signal: controller.signal,
      }).catch(() => null),
      currency
        ? fetchStorefrontPurchaseOptions(handle, currency, {
            signal: controller.signal,
          }).catch(() => null)
        : Promise.resolve(null),
    ])
      .then(([detail, catalog, purchase]) => {
        setProduct(detail);
        setPurchaseOptions(purchase);
        setSelectedOptions(
          purchase?.variants.find((variant) => variant.available_for_sale)
            ?.options ??
            purchase?.variants[0]?.options ?? { size: null, color: null },
        );
        setSelectedImage(detail.image_urls[0] ?? detail.thumbnail_url);
        setRelated(
          catalog?.products
            .filter((entry) => entry.handle !== detail.handle)
            .slice(0, 3) ?? [],
        );
        setStatus("ready");
        document.title = `${detail.title} | ${profile.name}`;
      })
      .catch((error: unknown) => {
        if (isStorefrontApiError(error) && error.code === "aborted") return;
        setStatus(
          isStorefrontApiError(error) &&
            ["not_found", "invalid_request"].includes(error.code)
            ? "not-found"
            : "unavailable",
        );
      });

    return () => controller.abort();
  }, [capability, handle, profile.locale, profile.name, retryToken]);

  useEffect(() => setImageFailed(false), [selectedImage]);

  const images = useMemo(() => {
    if (!product) return [];
    const candidates = [product.thumbnail_url, ...product.image_urls].filter(
      (url): url is string => Boolean(url),
    );
    return [...new Set(candidates)];
  }, [product]);

  const selectedVariant = useMemo(() => {
    if (!purchaseOptions) return null;

    return (
      purchaseOptions.variants.find(
        (variant) =>
          variant.options.size === selectedOptions.size &&
          variant.options.color === selectedOptions.color,
      ) ?? purchaseOptions.variants[0]
    );
  }, [purchaseOptions, selectedOptions]);

  const favoriteProduct = useMemo<StorefrontProductCardDto | null>(() => {
    if (!product) return null;
    return {
      handle: product.handle,
      title: product.title,
      subtitle: product.subtitle,
      thumbnail_url: product.thumbnail_url ?? product.image_urls[0] ?? null,
    };
  }, [product]);

  const shareProduct = async () => {
    const shareData = { title: product?.title ?? profile.name, url: window.location.href };
    if (navigator.share) {
      await navigator.share(shareData).catch(() => undefined);
      return;
    }
    await navigator.clipboard?.writeText(shareData.url).catch(() => undefined);
  };

  const selectOption = (name: "size" | "color", value: string) => {
    if (!purchaseOptions) return;
    const nextOptions = { ...selectedOptions, [name]: value };
    const matchingVariant =
      purchaseOptions.variants.find(
        (variant) =>
          variant.options.size === nextOptions.size &&
          variant.options.color === nextOptions.color,
      ) ??
      purchaseOptions.variants.find(
        (variant) => variant.options[name] === value,
      );

    if (matchingVariant) {
      setSelectedOptions(matchingVariant.options);
      setAddStatus("idle");
    }
  };

  const addToCart = async () => {
    if (!selectedVariant?.available_for_sale) return;
    try {
      await addItem(selectedVariant.id);
      setAddStatus("added");
    } catch {
      setAddStatus("idle");
    }
  };

  if (status === "loading") {
    return (
      <section
        className="product-detail shell"
        aria-live="polite"
        aria-label={text("جارٍ تحميل المنتج", "Loading product")}
      >
        <div className="product-detail-skeleton" aria-hidden="true">
          <span className="skeleton product-detail-skeleton__image" />
          <div>
            <span className="skeleton product-detail-skeleton__eyebrow" />
            <span className="skeleton product-detail-skeleton__title" />
            <span className="skeleton product-detail-skeleton__line" />
            <span className="skeleton product-detail-skeleton__line" />
          </div>
        </div>
      </section>
    );
  }

  if (status === "not-found") {
    return (
      <div className="shell page-state-wrap">
        <StatePanel
          kind="not-found"
          title={text("لم نجد هذا المنتج", "Product not found")}
          message={text(
            "قد يكون الرابط غير صحيح، أو لم يعد المنتج متاحاً في هذا المتجر.",
            "The link may be incorrect, or this product may no longer be available.",
          )}
          locale={profile.locale}
        />
        <StorefrontLink
          to="/products"
          className="button button--secondary state-back-link"
        >
          <ArrowRightIcon />
          {text("العودة إلى المنتجات", "Back to products")}
        </StorefrontLink>
      </div>
    );
  }

  if (status === "unavailable" || !product) {
    return (
      <div className="shell page-state-wrap">
        <StatePanel
          kind="unavailable"
          title={text("تعذّر تحميل المنتج الآن", "Product unavailable")}
          message={text(
            "يمكنك المحاولة مرة أخرى بعد قليل.",
            "Please try again in a moment.",
          )}
          onRetry={() => setRetryToken((value) => value + 1)}
          locale={profile.locale}
        />
      </div>
    );
  }

  return (
    <>
      <article className="product-detail shell">
        {isLuxe ? (
          <nav className="luxe-product-topbar" aria-label={text("إجراءات المنتج", "Product actions")}>
            <StorefrontLink to="/products" aria-label={text("العودة إلى المنتجات", "Back to products")}>
              <ArrowRightIcon />
            </StorefrontLink>
            <div>
              <button type="button" onClick={() => void shareProduct()} aria-label={text("مشاركة المنتج", "Share product")}>
                <ShareIcon />
              </button>
              <button
                type="button"
                className={favoriteProduct && isFavorite(favoriteProduct.handle) ? "is-active" : undefined}
                onClick={() => favoriteProduct && toggleFavorite(favoriteProduct)}
                aria-pressed={favoriteProduct ? isFavorite(favoriteProduct.handle) : false}
                aria-label={text("حفظ في المفضلة", "Save to favorites")}
              >
                <HeartIcon />
              </button>
              <StorefrontLink className="luxe-product-topbar__cart" to="/cart" aria-label={text("سلة التسوق", "Shopping cart")}>
                <CartIcon />
                <span>{cart?.items.reduce((total, item) => total + item.quantity, 0) ?? 0}</span>
              </StorefrontLink>
            </div>
          </nav>
        ) : null}
        <nav className="breadcrumbs" aria-label={text("مسار الصفحة", "Breadcrumb")}>
          <StorefrontLink to="/">{text("الرئيسية", "Home")}</StorefrontLink>
          <span aria-hidden="true">/</span>
          <StorefrontLink to="/products">{text("المنتجات", "Products")}</StorefrontLink>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{product.title}</span>
        </nav>

        <div className="product-detail__grid">
          <div className="product-gallery">
            <div className="product-gallery__stage">
              {selectedImage && !imageFailed ? (
                <img
                  src={selectedImage}
                  alt={product.title}
                  onError={() => setImageFailed(true)}
                />
              ) : (
                <span
                  className="product-gallery__placeholder"
                  aria-hidden="true"
                >
                  <PackageIcon />
                </span>
              )}
            </div>
            {images.length > 1 ? (
              <div className="product-gallery__thumbs" aria-label={text("صور المنتج", "Product images")}>
                {images.map((image, index) => (
                  <button
                    key={image}
                    type="button"
                    className={
                      selectedImage === image ? "is-selected" : undefined
                    }
                    aria-label={text(
                      `عرض صورة ${index + 1} من ${images.length}`,
                      `View image ${index + 1} of ${images.length}`,
                    )}
                    aria-pressed={selectedImage === image}
                    onClick={() => setSelectedImage(image)}
                  >
                    <img src={image} alt="" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="product-detail__content">
            {!isLuxe ? <div className="product-detail__actions" aria-label={text("إجراءات المنتج", "Product actions")}>
              <button type="button" onClick={() => void shareProduct()} aria-label={text("مشاركة المنتج", "Share product")}>
                <ShareIcon />
              </button>
              <button
                type="button"
                className={favoriteProduct && isFavorite(favoriteProduct.handle) ? "is-active" : undefined}
                onClick={() => favoriteProduct && toggleFavorite(favoriteProduct)}
                aria-pressed={favoriteProduct ? isFavorite(favoriteProduct.handle) : false}
                aria-label={text("حفظ في المفضلة", "Save to favorites")}
              >
                <HeartIcon />
              </button>
            </div> : null}
            <span className="eyebrow">
              {text(`من تشكيلة ${profile.name}`, `From ${profile.name}`)}
            </span>
            <h1>{product.title}</h1>
            {product.subtitle ? (
              <p className="product-detail__subtitle">{product.subtitle}</p>
            ) : null}
            {purchaseOptions && selectedVariant ? (
              <section
                className="purchase-panel"
                aria-labelledby="purchase-title"
              >
                <div>
                  <h2 id="purchase-title">{text("السعر", "Price")}</h2>
                  <strong className="purchase-panel__price">
                    {formatStorefrontMoney(
                      selectedVariant.unit_price,
                      purchaseOptions.currency_code,
                      profile.locale,
                    )}
                  </strong>
                  <span>{selectedVariant.title}</span>
                </div>
                {purchaseOptions.options.length > 0 ? (
                  <div className="purchase-options">
                    {purchaseOptions.options.map((option) => (
                      <label key={option.name}>
                        {option.name === "size"
                          ? text("المقاس", "Size")
                          : text("اللون", "Color")}
                        <select
                          value={selectedOptions[option.name] ?? ""}
                          onChange={(event) =>
                            selectOption(option.name, event.target.value)
                          }
                        >
                          {option.values.map((value) => (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </div>
                ) : null}
                <button
                  className="button button--primary"
                  disabled={pending || !selectedVariant.available_for_sale}
                  type="button"
                  onClick={() => void addToCart()}
                >
                  {pending
                    ? text("جارٍ الإضافة...", "Adding…")
                    : selectedVariant.available_for_sale
                      ? text("أضف إلى السلة", "Add to cart")
                      : text("غير متوفر حالياً", "Currently unavailable")}
                </button>
                {addStatus === "added" ? (
                  <p className="purchase-panel__success" role="status">
                    {text("تمت الإضافة إلى السلة.", "Added to cart.")}
                  </p>
                ) : cartError ? (
                  <p className="commerce-error" role="alert">
                    {cartError}
                  </p>
                ) : null}
              </section>
            ) : null}
            <div className="product-detail__divider" />
            <section aria-labelledby="product-description-title">
              <h2 id="product-description-title">
                {text("عن المنتج", "About this product")}
              </h2>
              <p className="product-detail__description">
                {product.description ??
                  text(
                    "قطعة مختارة بعناية لتضيف لمسة بسيطة وواضحة إلى يومك.",
                    "A thoughtfully selected piece designed for simple everyday use.",
                  )}
              </p>
            </section>
            <StorefrontLink to="/products" className="product-detail__back">
              <ArrowRightIcon />
              {text("العودة إلى كل المنتجات", "Back to all products")}
            </StorefrontLink>
          </div>
        </div>
      </article>

      {related.length > 0 ? (
        <section
          className="related-products shell"
          aria-labelledby="related-products-title"
        >
          <div className="section-heading">
            <div>
              <span className="eyebrow">{text("قد يعجبك أيضاً", "You may also like")}</span>
              <h2 id="related-products-title">{text("منتجات أخرى", "More products")}</h2>
            </div>
            <StorefrontLink to="/products" className="text-link">
              {text("عرض الكل", "View all")}
            </StorefrontLink>
          </div>
          <div className="product-grid product-grid--related">
            {related.map((entry) => (
              <ProductCard key={entry.handle} product={entry} locale={profile.locale} />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
};
