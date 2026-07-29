import { useEffect, useMemo, useState } from "react";

import {
  fetchStorefrontCatalog,
  fetchStorefrontProductDetail,
  fetchStorefrontPurchaseOptions,
  isStorefrontApiError,
} from "../api/storefront-api";
import { useCart } from "../commerce/CartContext";
import { ArrowRightIcon, PackageIcon } from "../components/Icons";
import { ProductCard } from "../components/ProductCard";
import { StatePanel } from "../components/StatePanel";
import { StorefrontLink } from "../lib/navigation";
import { formatStorefrontMoney } from "../lib/money";
import type {
  StorefrontProductCardDto,
  StorefrontProductDetailDto,
  StorefrontProfileDto,
  StorefrontPurchaseOptionsDto,
} from "../types";

type ProductDetailPageProps = {
  profile: StorefrontProfileDto;
  handle: string;
};

export const ProductDetailPage = ({
  profile,
  handle,
}: ProductDetailPageProps) => {
  const { addItem, capability, error: cartError, pending } = useCart();
  const [product, setProduct] = useState<StorefrontProductDetailDto | null>(
    null,
  );
  const [related, setRelated] = useState<StorefrontProductCardDto[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [purchaseOptions, setPurchaseOptions] =
    useState<StorefrontPurchaseOptionsDto | null>(null);
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
    setAddStatus("idle");
    setStatus("loading");
    document.title = `المنتج | ${profile.name}`;

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
  }, [capability, handle, profile.name, retryToken]);

  useEffect(() => setImageFailed(false), [selectedImage]);

  const images = useMemo(() => {
    if (!product) return [];
    const candidates = [product.thumbnail_url, ...product.image_urls].filter(
      (url): url is string => Boolean(url),
    );
    return [...new Set(candidates)];
  }, [product]);

  const addToCart = async () => {
    if (!purchaseOptions) return;
    try {
      await addItem(purchaseOptions.variant.id);
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
        aria-label="جارٍ تحميل المنتج"
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
          title="لم نجد هذا المنتج"
          message="قد يكون الرابط غير صحيح، أو لم يعد المنتج متاحاً في هذا المتجر."
        />
        <StorefrontLink
          to="/products"
          className="button button--secondary state-back-link"
        >
          <ArrowRightIcon />
          العودة إلى المنتجات
        </StorefrontLink>
      </div>
    );
  }

  if (status === "unavailable" || !product) {
    return (
      <div className="shell page-state-wrap">
        <StatePanel
          kind="unavailable"
          title="تعذّر تحميل المنتج الآن"
          message="يمكنك المحاولة مرة أخرى بعد قليل."
          onRetry={() => setRetryToken((value) => value + 1)}
        />
      </div>
    );
  }

  return (
    <>
      <article className="product-detail shell">
        <nav className="breadcrumbs" aria-label="مسار الصفحة">
          <StorefrontLink to="/">الرئيسية</StorefrontLink>
          <span aria-hidden="true">/</span>
          <StorefrontLink to="/products">المنتجات</StorefrontLink>
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
              <div className="product-gallery__thumbs" aria-label="صور المنتج">
                {images.map((image, index) => (
                  <button
                    key={image}
                    type="button"
                    className={
                      selectedImage === image ? "is-selected" : undefined
                    }
                    aria-label={`عرض صورة ${index + 1} من ${images.length}`}
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
            <span className="eyebrow">من تشكيلة {profile.name}</span>
            <h1>{product.title}</h1>
            {product.subtitle ? (
              <p className="product-detail__subtitle">{product.subtitle}</p>
            ) : null}
            {purchaseOptions ? (
              <section
                className="purchase-panel"
                aria-labelledby="purchase-title"
              >
                <div>
                  <h2 id="purchase-title">السعر</h2>
                  <strong className="purchase-panel__price">
                    {formatStorefrontMoney(
                      purchaseOptions.variant.unit_price,
                      purchaseOptions.currency_code,
                    )}
                  </strong>
                  <span>{purchaseOptions.variant.title}</span>
                </div>
                <button
                  className="button button--primary"
                  disabled={pending}
                  type="button"
                  onClick={() => void addToCart()}
                >
                  {pending ? "جارٍ الإضافة..." : "أضف إلى السلة"}
                </button>
                {addStatus === "added" ? (
                  <p className="purchase-panel__success" role="status">
                    تمت الإضافة إلى السلة.
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
              <h2 id="product-description-title">عن المنتج</h2>
              <p className="product-detail__description">
                {product.description ??
                  "قطعة مختارة بعناية لتضيف لمسة بسيطة وواضحة إلى يومك."}
              </p>
            </section>
            <StorefrontLink to="/products" className="product-detail__back">
              <ArrowRightIcon />
              العودة إلى كل المنتجات
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
              <span className="eyebrow">قد يعجبك أيضاً</span>
              <h2 id="related-products-title">منتجات أخرى</h2>
            </div>
            <StorefrontLink to="/products" className="text-link">
              عرض الكل
            </StorefrontLink>
          </div>
          <div className="product-grid product-grid--related">
            {related.map((entry) => (
              <ProductCard key={entry.handle} product={entry} />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
};
