import { useEffect, useMemo, useState } from "react";
import {
  IoAddOutline,
  IoArrowBackOutline,
  IoBagHandleOutline,
  IoChevronForwardOutline,
  IoHeartOutline,
  IoHeartSharp,
  IoRemoveOutline,
  IoShareSocialOutline,
  IoStar,
} from "react-icons/io5";

import { fetchStorefrontProductDetail, fetchStorefrontPurchaseOptions } from "../../api/storefront-api";
import { useOptionalCart } from "../../commerce/CartContext";
import { useOptionalFavorites } from "../../commerce/FavoritesContext";
import { formatStorefrontMoney } from "../../lib/money";
import { navigate } from "../../lib/navigation";
import type { StorefrontProductCardDto, StorefrontProductDetailDto, StorefrontProfileDto, StorefrontPurchaseOptionsDto } from "../../types";
import { standardRoute } from "./StandardMobileNavigation";
import "./standard-product-details.css";

const PRODUCT_PRICE = 129;
const PRODUCT_IMAGE = "/assets/standard/product-pastel-wrap-dress.webp";

const colors = [
  { id: "coral", label: "Coral", value: "#ee735f" },
  { id: "powder-blue", label: "Powder blue", value: "#a8c6ce" },
  { id: "gold", label: "Golden yellow", value: "#e9ad4a" },
  { id: "cream", label: "Cream", value: "#f1ddbf" },
] as const;

const sizes = ["S", "M", "L", "XL"] as const;

const formatTotal = (quantity: number) => `$${(PRODUCT_PRICE * quantity).toFixed(2)}`;

export default function StandardProductDetailsPage({
  handle = "pastel-wrap-dress",
  profile,
}: {
  handle?: string;
  profile?: StorefrontProfileDto;
} = {}) {
  const cartContext = useOptionalCart();
  const onlineCheckout = cartContext?.capability.online_checkout;
  const favoritesContext = useOptionalFavorites();
  const [runtimeProduct, setRuntimeProduct] = useState<StorefrontProductDetailDto | null>(null);
  const [purchase, setPurchase] = useState<StorefrontPurchaseOptionsDto | null>(null);
  const [loading, setLoading] = useState(Boolean(profile));
  const [activeImage, setActiveImage] = useState(0);
  const [previewFavorite, setPreviewFavorite] = useState(false);
  const [selectedColor, setSelectedColor] = useState("coral");
  const [selectedSize, setSelectedSize] = useState("M");
  const [quantity, setQuantity] = useState(1);
  const [expandedDescription, setExpandedDescription] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [added, setAdded] = useState(false);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = runtimeProduct && profile
      ? `${runtimeProduct.title} | ${profile.name}`
      : "Pastel Wrap Dress | Standard Storefront Preview";
    document.documentElement.classList.add("standard-preview-document");
    document.body.classList.add("standard-preview-document");
    return () => {
      document.title = previousTitle;
      document.documentElement.classList.remove("standard-preview-document");
      document.body.classList.remove("standard-preview-document");
    };
  }, [profile, runtimeProduct]);

  useEffect(() => {
    if (!profile || !cartContext) return;
    const controller = new AbortController();
    const currency = onlineCheckout?.status === "available"
      ? onlineCheckout.currency_code
      : null;
    setLoading(true);
    void Promise.all([
      fetchStorefrontProductDetail(handle, { signal: controller.signal }),
      currency
        ? fetchStorefrontPurchaseOptions(handle, currency, { signal: controller.signal })
        : Promise.resolve(null),
    ]).then(([product, options]) => {
      setRuntimeProduct(product);
      setPurchase(options);
      const first = options?.variants.find((variant) => variant.available_for_sale) ?? options?.variants[0];
      if (first?.options.color) setSelectedColor(first.options.color);
      if (first?.options.size) setSelectedSize(first.options.size);
    }).finally(() => setLoading(false));
    return () => controller.abort();
  }, [handle, onlineCheckout?.currency_code, onlineCheckout?.status, profile]);

  const selectedVariant = useMemo(() => purchase?.variants.find((variant) =>
    (variant.options.size ?? "M") === selectedSize &&
    (variant.options.color ?? "coral").toLocaleLowerCase() === selectedColor.toLocaleLowerCase(),
  ) ?? purchase?.variants.find((variant) => variant.available_for_sale) ?? null, [purchase, selectedColor, selectedSize]);
  const displayName = runtimeProduct?.title ?? "Pastel Wrap Dress";
  const displayDescription = runtimeProduct?.description ?? "A graceful wrap dress crafted from lightweight satin with a flattering waist and softly flowing sleeves.";
  const displayImages = runtimeProduct
    ? [...new Set([runtimeProduct.thumbnail_url, ...runtimeProduct.image_urls].filter((value): value is string => Boolean(value)))]
    : [PRODUCT_IMAGE, PRODUCT_IMAGE, PRODUCT_IMAGE, PRODUCT_IMAGE];
  const displayPrice = selectedVariant?.unit_price ?? (profile ? null : PRODUCT_PRICE);
  const currency = purchase?.currency_code ?? (onlineCheckout?.status === "available" ? onlineCheckout.currency_code : null) ?? "usd";
  const displayMoney = (amount: number) => formatStorefrontMoney(amount, currency, profile?.locale ?? "en-LY");
  const favoriteProduct: StorefrontProductCardDto | null = runtimeProduct ? {
    handle: runtimeProduct.handle,
    title: runtimeProduct.title,
    subtitle: runtimeProduct.subtitle,
    thumbnail_url: runtimeProduct.thumbnail_url,
    price_lyd: selectedVariant?.unit_price ?? null,
  } : null;
  const isSaved = favoriteProduct && favoritesContext
    ? favoritesContext.isFavorite(favoriteProduct.handle)
    : previewFavorite;
  const colorChoices = purchase?.options.find((option) => option.name === "color")?.values.map((value, index) => ({
    id: value,
    label: value,
    value: colors[index % colors.length].value,
  })) ?? (profile ? [] : colors);
  const sizeChoices = purchase?.options.find((option) => option.name === "size")?.values ?? (profile ? [] : sizes);

  const updateQuantity = (nextQuantity: number) => {
    const boundedQuantity = Math.min(9, Math.max(1, nextQuantity));
    setQuantity(boundedQuantity);
    setAdded(false);
  };

  const addToBag = async () => {
    if (profile && cartContext && selectedVariant) {
      try {
        for (let index = 0; index < quantity; index += 1) await cartContext.addItem(selectedVariant.id);
      } catch {
        setAnnouncement(cartContext.error ?? "The item could not be added.");
        return;
      }
    }
    setAdded(true);
    setAnnouncement(`${quantity} ${displayName}, size ${selectedSize}, added to bag`);
  };

  const shareProduct = () => {
    setAnnouncement("Product link ready to share");
  };

  return (
    <div className="standard-product-detail" dir={profile?.locale === "ar-LY" ? "rtl" : "ltr"} lang={profile?.locale === "ar-LY" ? "ar" : "en"}>
      <header className="standard-product-detail__header">
        <button
          className="standard-product-detail__round-button"
          type="button"
          aria-label="Back to the Standard storefront"
          onClick={() => navigate(standardRoute("/"))}
        >
          <IoArrowBackOutline aria-hidden="true" />
        </button>
        <h1>Product Details</h1>
        <button
          className="standard-product-detail__round-button"
          type="button"
          aria-label={`Share ${displayName}`}
          onClick={shareProduct}
        >
          <IoShareSocialOutline aria-hidden="true" />
        </button>
      </header>

      <section className="standard-product-gallery" aria-label={`${displayName} gallery`} aria-busy={loading}>
        <img
          src={displayImages[activeImage % displayImages.length]}
          alt={`${displayName}, view ${activeImage + 1}`}
        />
        <button
          className="standard-product-gallery__favorite"
          type="button"
          aria-label={isSaved ? `Remove ${displayName} from saved items` : `Save ${displayName}`}
          aria-pressed={isSaved}
          onClick={() => favoriteProduct && favoritesContext ? favoritesContext.toggleFavorite(favoriteProduct) : setPreviewFavorite((current) => !current)}
        >
          {isSaved ? <IoHeartSharp aria-hidden="true" /> : <IoHeartOutline aria-hidden="true" />}
        </button>
        <div className="standard-product-gallery__dots" aria-label="Choose a product image">
          {displayImages.map((_, imageIndex) => (
            <button
              key={imageIndex}
              type="button"
              aria-label={`Show product image ${imageIndex + 1}`}
              aria-pressed={activeImage === imageIndex}
              onClick={() => setActiveImage(imageIndex)}
            />
          ))}
        </div>
      </section>

      <section className="standard-product-summary" aria-labelledby="standard-product-name">
        <p className="standard-product-summary__eyebrow">{runtimeProduct?.subtitle ?? "NEW COLLECTION"}</p>
        <h2 id="standard-product-name">{displayName}</h2>
        <div className="standard-product-summary__price-row">
          {profile ? <p className="standard-product-summary__rating"><span>Reviews unavailable</span></p> : <p className="standard-product-summary__rating">
            <IoStar aria-hidden="true" />
            <strong>4.8</strong>
            <span>(126 Reviews)</span>
          </p>}
          <p className="standard-product-summary__price">{displayPrice == null ? "Price unavailable" : displayMoney(displayPrice)}</p>
        </div>

        {colorChoices.length > 0 && <fieldset className="standard-product-option standard-product-option--colors">
          <legend>Color</legend>
          <div className="standard-product-colors">
            {colorChoices.map((color) => (
              <button
                key={color.id}
                type="button"
                aria-label={color.label}
                aria-pressed={selectedColor === color.id}
                title={color.label}
                style={{ "--standard-swatch": color.value } as React.CSSProperties}
                onClick={() => {
                  setSelectedColor(color.id);
                  setAdded(false);
                }}
              >
                <span aria-hidden="true" />
              </button>
            ))}
          </div>
        </fieldset>}

        {sizeChoices.length > 0 && <fieldset className="standard-product-option standard-product-option--sizes">
          <legend>Select Size</legend>
          <button
            className="standard-product-option__size-guide"
            type="button"
            onClick={() => setAnnouncement("Size guide opened")}
          >
            Size guide
          </button>
          <div className="standard-product-sizes">
            {sizeChoices.map((size) => (
              <button
                key={size}
                type="button"
                aria-label={`Size ${size}`}
                aria-pressed={selectedSize === size}
                onClick={() => {
                  setSelectedSize(size);
                  setAdded(false);
                }}
              >
                {size}
              </button>
            ))}
          </div>
        </fieldset>}

        <section className="standard-product-description" aria-labelledby="standard-product-description-title">
          <h3 id="standard-product-description-title">Description</h3>
          <div>
            <p>
              {displayDescription}
              {!profile && expandedDescription ? " Finished with a sculpted collar and a fluid ankle-length skirt." : ""}
            </p>
            <button
              type="button"
              aria-expanded={expandedDescription}
              onClick={() => setExpandedDescription((current) => !current)}
            >
              {expandedDescription ? "Show less" : "Read more"}
              <IoChevronForwardOutline aria-hidden="true" />
            </button>
          </div>
        </section>

        <section className="standard-product-quantity" aria-labelledby="standard-product-quantity-title">
          <h3 id="standard-product-quantity-title">Quantity</h3>
          <div className="standard-product-stepper">
            <button
              type="button"
              aria-label="Decrease quantity"
              disabled={quantity === 1}
              onClick={() => updateQuantity(quantity - 1)}
            >
              <IoRemoveOutline aria-hidden="true" />
            </button>
            <output aria-label="Quantity">{quantity}</output>
            <button
              type="button"
              aria-label="Increase quantity"
              disabled={quantity === 9}
              onClick={() => updateQuantity(quantity + 1)}
            >
              <IoAddOutline aria-hidden="true" />
            </button>
          </div>
        </section>
      </section>

      <aside className="standard-product-purchase" aria-label="Purchase summary">
        <div>
          <span>Total</span>
          <output>{profile ? (displayPrice == null ? "Price unavailable" : displayMoney(displayPrice * quantity)) : formatTotal(quantity)}</output>
        </div>
        <button type="button" data-added={added ? "true" : "false"} disabled={Boolean(profile && (displayPrice == null || !selectedVariant?.available_for_sale || cartContext?.pending))} onClick={() => void addToBag()}>
          <IoBagHandleOutline aria-hidden="true" />
          <span>{added ? "Added to bag" : "Add to bag"}</span>
        </button>
      </aside>

      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>
    </div>
  );
}
