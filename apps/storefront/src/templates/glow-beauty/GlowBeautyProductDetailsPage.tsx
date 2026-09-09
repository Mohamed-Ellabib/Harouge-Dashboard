import { useEffect, useMemo, useState } from "react";
import {
  IoAddOutline,
  IoArrowBack,
  IoBagHandleOutline,
  IoChevronDown,
  IoHeart,
  IoHeartOutline,
  IoRemoveOutline,
  IoShareOutline,
} from "react-icons/io5";
import { PiOrangeSlice, PiRabbit, PiStarFill } from "react-icons/pi";
import { TbWoman } from "react-icons/tb";

import {
  fetchStorefrontProductDetail,
  fetchStorefrontPurchaseOptions,
} from "../../api/storefront-api";
import { useOptionalCart } from "../../commerce/CartContext";
import { useOptionalFavorites } from "../../commerce/FavoritesContext";
import { localizedStorefrontText } from "../../lib/localization";
import { formatStorefrontMoney } from "../../lib/money";
import { navigate, StorefrontLink } from "../../lib/navigation";
import { useGlowBeautyDesignEditor } from "./GlowBeautyDesignEditor";
import type {
  StorefrontProductCardDto,
  StorefrontProductDetailDto,
  StorefrontProfileDto,
  StorefrontPurchaseOptionsDto,
} from "../../types";
import { GlowBeautyStatusBar } from "./GlowBeautyChrome";
import "./glow-beauty-home.css";
import "./glow-beauty-product-details.css";

const PRODUCT_PRICE = 24.99;
const productImage = "/assets/glow-beauty/product-radiance-serum-detail.png";
const catalogHref = "/products?preview=1&template=glow-beauty";
const sizes = ["30 ml", "50 ml", "100 ml"] as const;

const benefits = [
  { label: "Vitamin C", icon: <PiOrangeSlice aria-hidden="true" /> },
  { label: "Cruelty Free", icon: <PiRabbit aria-hidden="true" /> },
  { label: "All Skin Types", icon: <TbWoman aria-hidden="true" /> },
] as const;

const details = [
  {
    title: "Description",
    body: "A lightweight illuminating serum that hydrates, brightens and restores a healthy natural glow.",
  },
  {
    title: "Ingredients",
    body: "Vitamin C, hyaluronic acid, niacinamide and a gentle botanical radiance complex.",
  },
  {
    title: "How to Use",
    body: "Apply two to three drops to clean skin morning and evening, then follow with moisturizer.",
  },
] as const;

export function GlowBeautyProductDetailsPage({
  handle = "radiance-serum",
  profile,
}: {
  handle?: string;
  profile?: StorefrontProfileDto;
} = {}) {
  const design = useGlowBeautyDesignEditor();
  const cartContext = useOptionalCart();
  const favoritesContext = useOptionalFavorites();
  const onlineCheckout = cartContext?.capability.online_checkout;
  const [runtimeProduct, setRuntimeProduct] = useState<StorefrontProductDetailDto | null>(null);
  const [purchase, setPurchase] = useState<StorefrontPurchaseOptionsDto | null>(null);
  const [loading, setLoading] = useState(Boolean(profile));
  const [selectedSize, setSelectedSize] = useState<string>("30 ml");
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [favorite, setFavorite] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [added, setAdded] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    const previousTitle = document.title;
    const previousLang = document.documentElement.lang;
    const previousDirection = document.documentElement.dir;
    document.title = runtimeProduct && profile
      ? `${runtimeProduct.title} | ${profile.name}`
      : "Radiance Serum — Glow Beauty Preview";
    if (!profile) {
      document.documentElement.lang = "en";
      document.documentElement.dir = "ltr";
    }
    document.documentElement.classList.add("glow-beauty-preview-document");
    document.body.classList.add("glow-beauty-preview-document");
    return () => {
      document.title = previousTitle;
      if (!profile) {
        document.documentElement.lang = previousLang;
        document.documentElement.dir = previousDirection;
      }
      document.documentElement.classList.remove("glow-beauty-preview-document");
      document.body.classList.remove("glow-beauty-preview-document");
    };
  }, [profile, runtimeProduct]);

  useEffect(() => {
    if (!profile) return;
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
    ])
      .then(([product, options]) => {
        setRuntimeProduct(product);
        setPurchase(options);
        const first = options?.variants.find((variant) => variant.available_for_sale)
          ?? options?.variants[0];
        if (first?.options.size) setSelectedSize(first.options.size);
        if (first?.options.color) setSelectedColor(first.options.color);
      })
      .catch(() => {
        setRuntimeProduct(null);
        setPurchase(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [handle, onlineCheckout?.currency_code, onlineCheckout?.status, profile]);

  const selectedVariant = useMemo(() => purchase?.variants.find((variant) =>
    (variant.options.size ?? "") === (purchase.options.some((option) => option.name === "size") ? selectedSize : "") &&
    (variant.options.color ?? "") === (purchase.options.some((option) => option.name === "color") ? selectedColor : ""),
  ) ?? purchase?.variants.find((variant) => variant.available_for_sale) ?? null, [purchase, selectedColor, selectedSize]);
  const displayName = runtimeProduct?.title
    ?? (profile ? (loading ? (profile.locale === "ar-LY" ? "جارٍ تحميل المنتج" : "Loading product") : (profile.locale === "ar-LY" ? "المنتج غير متاح" : "Product unavailable")) : "Radiance Serum");
  const displaySubtitle = runtimeProduct?.subtitle
    ?? (profile ? "" : "Brightening & Glow");
  const displayDescription = runtimeProduct?.description
    ?? (profile ? "" : "A lightweight illuminating serum that hydrates, brightens and restores a healthy natural glow.");
  const displayImages = runtimeProduct
    ? [...new Set([...runtimeProduct.image_urls, runtimeProduct.thumbnail_url].filter((value): value is string => Boolean(value)))]
    : profile
      ? []
      : [productImage, productImage, productImage];
  const displayPrice = selectedVariant?.unit_price ?? (profile ? null : PRODUCT_PRICE);
  const currency = purchase?.currency_code
    ?? (onlineCheckout?.status === "available" ? onlineCheckout.currency_code : null)
    ?? "usd";
  const money = (amount: number) => formatStorefrontMoney(amount, currency, profile?.locale ?? "en-LY");
  const favoriteProduct: StorefrontProductCardDto | null = runtimeProduct ? {
    handle: runtimeProduct.handle,
    title: runtimeProduct.title,
    subtitle: runtimeProduct.subtitle,
    thumbnail_url: runtimeProduct.thumbnail_url,
    price_lyd: selectedVariant?.unit_price ?? null,
  } : null;
  const isFavorite = favoriteProduct && favoritesContext
    ? favoritesContext.isFavorite(favoriteProduct.handle)
    : favorite;
  const sizeChoices = purchase?.options.find((option) => option.name === "size")?.values ?? (profile ? [] : sizes);
  const colorChoices = purchase?.options.find((option) => option.name === "color")?.values ?? [];
  const cartCount = cartContext?.cart?.items.reduce((total, item) => total + item.quantity, 0) ?? (profile ? 0 : 2);
  const locale = profile?.locale ?? "en-LY";
  const english = locale === "en-LY";
  const arabicLabels: Record<string, string> = {
    NEW: "جديد", "BEST SELLER": "الأكثر مبيعاً", "BEST SELLERS": "الأكثر مبيعاً",
    SALE: "تخفيض", OFFER: "عرض", HOT: "رائج",
    SKINCARE: "العناية بالبشرة", MAKEUP: "المكياج", FRAGRANCE: "العطور", HAIRCARE: "العناية بالشعر",
  };
  const localizeLabel = (value: string) => english ? value : arabicLabels[value.trim().toUpperCase()] ?? value;
  const direction = locale === "ar-LY" ? "rtl" : "ltr";
  const language = locale === "ar-LY" ? "ar" : "en";
  const Content = profile ? "div" : "main";
  const storefrontContent = profile?.storefront?.content;
  const detailItems = profile
    ? [
        { title: english ? "Description" : "الوصف", body: displayDescription },
        {
          title: storefrontContent ? localizedStorefrontText(storefrontContent.policies.delivery.title, locale) : (english ? "Delivery" : "التوصيل"),
          body: storefrontContent ? localizedStorefrontText(storefrontContent.policies.delivery.body, locale) : "",
        },
        {
          title: storefrontContent ? localizedStorefrontText(storefrontContent.policies.returns.title, locale) : (english ? "Returns" : "الاسترجاع"),
          body: storefrontContent ? localizedStorefrontText(storefrontContent.policies.returns.body, locale) : "",
        },
      ]
    : details;
  const displayBenefits = profile && storefrontContent
    ? storefrontContent.hero.benefits.slice(0, 3).map((benefit, index) => ({
        label: localizedStorefrontText(benefit.title, locale),
        icon: [<PiOrangeSlice aria-hidden="true" />, <PiRabbit aria-hidden="true" />, <TbWoman aria-hidden="true" />][index],
      }))
    : benefits;
  const compareAtPrice = runtimeProduct?.compare_at_price_lyd ?? (profile ? null : 31.99);
  const discountPercent = compareAtPrice && displayPrice && compareAtPrice > displayPrice
    ? Math.round((1 - displayPrice / compareAtPrice) * 100)
    : 0;

  const updateQuantity = (nextQuantity: number) => {
    setQuantity(Math.min(9, Math.max(1, nextQuantity)));
    setAdded(false);
  };

  const shareProduct = async () => {
    const shareData = { title: `${displayName} | ${profile?.name ?? design.storeName ?? "Glow Beauty"}`, url: window.location.href };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        setAnnouncement(english ? "Product shared" : "تمت مشاركة المنتج");
        return;
      } catch {
        return;
      }
    }
    setAnnouncement(english ? "Product link ready to share" : "رابط المنتج جاهز للمشاركة");
  };

  const addToBag = async () => {
    if (profile && cartContext && selectedVariant) {
      try {
        for (let index = 0; index < quantity; index += 1) {
          await cartContext.addItem(selectedVariant.id);
        }
      } catch {
        setAnnouncement(cartContext.error ?? (english ? "The item could not be added." : "تعذّرت إضافة المنتج."));
        return;
      }
    }
    setAdded(true);
    setAnnouncement(english ? `${quantity} ${displayName}, ${selectedSize}, added to bag` : `تمت إضافة ${quantity} من ${displayName} إلى السلة`);
  };

  return (
    <div className="glow-beauty-page glow-beauty-product-page" dir={direction} lang={language}>
      <GlowBeautyStatusBar preview={!profile} />

      <header className="glow-beauty-product-header">
        <StorefrontLink to={profile ? "/products" : catalogHref} ariaLabel={english ? "Back to all products" : "العودة إلى جميع المنتجات"}><IoArrowBack aria-hidden="true" /></StorefrontLink>
        <h1>{english ? "Product Details" : "تفاصيل المنتج"}</h1>
        <button type="button" aria-label={english ? `Share ${displayName}` : `مشاركة ${displayName}`} onClick={() => void shareProduct()}><IoShareOutline aria-hidden="true" /></button>
        <StorefrontLink to={profile ? "/cart" : "/cart?preview=1&template=glow-beauty"} ariaLabel={english ? `${cartCount} items in bag` : `عدد المنتجات في السلة: ${cartCount}`}>
          <IoBagHandleOutline aria-hidden="true" />
          <b>{cartCount}</b>
        </StorefrontLink>
      </header>

      <Content>
        <section className="glow-beauty-product-gallery" aria-label={english ? `${displayName} gallery` : `صور ${displayName}`} aria-busy={loading}>
          {displayImages.length
            ? <img src={displayImages[activeImage % displayImages.length]} alt={english ? `${displayName}, view ${activeImage + 1}` : `${displayName}، الصورة ${activeImage + 1}`} />
            : <div className="glow-beauty-image-placeholder" role="img" aria-label={displayName}>{displayName.slice(0, 1)}</div>}
          {runtimeProduct?.badge || !profile ? <span>{localizeLabel(runtimeProduct?.badge ?? "BEST SELLER")}</span> : null}
          <button
            type="button"
            aria-label={isFavorite ? (english ? `Remove ${displayName} from wishlist` : `إزالة ${displayName} من المفضلة`) : (english ? `Add ${displayName} to wishlist` : `إضافة ${displayName} إلى المفضلة`)}
            aria-pressed={Boolean(isFavorite)}
            onClick={() => favoriteProduct && favoritesContext ? favoritesContext.toggleFavorite(favoriteProduct) : setFavorite((value) => !value)}
          >
            {isFavorite ? <IoHeart aria-hidden="true" /> : <IoHeartOutline aria-hidden="true" />}
          </button>
        </section>

        <div className="glow-beauty-product-dots" aria-label={english ? "Choose a product image" : "اختيار صورة المنتج"}>
          {displayImages.map((_, index) => (
            <button key={index} type="button" aria-label={english ? `Show product image ${index + 1}` : `عرض صورة المنتج ${index + 1}`} aria-pressed={activeImage === index} onClick={() => setActiveImage(index)} />
          ))}
        </div>

        <section className="glow-beauty-product-summary" aria-labelledby="glow-beauty-product-name">
          <p className="glow-beauty-product-summary__eyebrow">{profile?.name ?? design.storeName ?? "GLOW BEAUTY"}</p>
          <h2 id="glow-beauty-product-name">{displayName}</h2>
          <p className="glow-beauty-product-summary__subtitle">{displaySubtitle}</p>
          <div className="glow-beauty-product-summary__rating">
            {!profile ? <><PiStarFill aria-hidden="true" /><strong>4.8</strong><span>(126 reviews)</span></> : <span>{localizeLabel(runtimeProduct?.badge ?? runtimeProduct?.category ?? (english ? "Store selection" : "مختارات المتجر"))}</span>}
            <b>{selectedVariant?.available_for_sale || !profile ? (english ? "In Stock" : "متوفر") : (english ? "Unavailable" : "غير متوفر")}</b>
          </div>
          <div className="glow-beauty-product-summary__price">
            <strong>{displayPrice == null ? (english ? "Price unavailable" : "السعر غير متاح") : profile ? money(displayPrice) : `$${displayPrice.toFixed(2)}`}</strong>
            {discountPercent > 0 && compareAtPrice ? <><del>{profile ? money(compareAtPrice) : `$${compareAtPrice.toFixed(2)}`}</del><span>{english ? "Save" : "وفر"} {discountPercent}%</span></> : null}
          </div>
          <p className="glow-beauty-product-summary__description">{displayDescription}</p>
        </section>

        {sizeChoices.length ? <fieldset className="glow-beauty-product-sizes">
          <legend>{english ? "Choose Size" : "اختر المقاس"}</legend>
          <div>
            {sizeChoices.map((size) => (
              <button key={size} type="button" aria-pressed={selectedSize === size} onClick={() => { setSelectedSize(size); setAdded(false); }}>{size}</button>
            ))}
          </div>
        </fieldset> : null}

        {colorChoices.length ? <fieldset className="glow-beauty-product-sizes">
          <legend>{english ? "Choose Color" : "اختر اللون"}</legend>
          <div>{colorChoices.map((color) => <button key={color} type="button" aria-pressed={selectedColor === color} onClick={() => { setSelectedColor(color); setAdded(false); }}>{color}</button>)}</div>
        </fieldset> : null}

        <section className="glow-beauty-product-quantity" aria-labelledby="glow-beauty-product-quantity-label">
          <h3 id="glow-beauty-product-quantity-label">{english ? "Quantity" : "الكمية"}</h3>
          <div>
            <button type="button" aria-label={english ? "Decrease quantity" : "تقليل الكمية"} disabled={quantity === 1} onClick={() => updateQuantity(quantity - 1)}><IoRemoveOutline aria-hidden="true" /></button>
            <output aria-label={english ? "Quantity" : "الكمية"}>{quantity}</output>
            <button type="button" aria-label={english ? "Increase quantity" : "زيادة الكمية"} disabled={quantity === 9} onClick={() => updateQuantity(quantity + 1)}><IoAddOutline aria-hidden="true" /></button>
          </div>
        </section>

        {displayBenefits.length ? <section className="glow-beauty-product-benefits" aria-label={english ? "Product benefits" : "مميزات المنتج"}>
          {displayBenefits.map((benefit) => <div key={benefit.label}>{benefit.icon}<span>{benefit.label}</span></div>)}
        </section> : null}

        <section className="glow-beauty-product-accordions" aria-label={english ? "Product information" : "معلومات المنتج"}>
          {detailItems.map((detail) => {
            const isExpanded = expanded === detail.title;
            return (
              <div key={detail.title}>
                <button type="button" aria-expanded={isExpanded} onClick={() => setExpanded(isExpanded ? null : detail.title)}>
                  <span>{detail.title}</span>
                  <IoChevronDown aria-hidden="true" />
                </button>
                {isExpanded ? <p>{detail.body}</p> : null}
              </div>
            );
          })}
        </section>

        {!profile ? <section className="glow-beauty-product-reviews" aria-labelledby="glow-beauty-review-title">
          <header>
            <h3 id="glow-beauty-review-title">Customer Reviews</h3>
            <button type="button">View All <span aria-hidden="true">›</span></button>
          </header>
          <div>
            <strong>4.8</strong><span>out of 5</span>
            <p aria-label="Five star rating"><PiStarFill /><PiStarFill /><PiStarFill /><PiStarFill /><PiStarFill /><small>(126)</small></p>
          </div>
        </section> : null}
      </Content>

      <aside className="glow-beauty-product-purchase" aria-label={english ? "Purchase summary" : "ملخص الشراء"}>
        <div><span>{english ? "Total" : "الإجمالي"}</span><output>{displayPrice == null ? (english ? "Unavailable" : "غير متاح") : profile ? money(displayPrice * quantity) : `$${(displayPrice * quantity).toFixed(2)}`}</output></div>
        <button type="button" data-added={added ? "true" : "false"} disabled={Boolean(profile && (!selectedVariant?.available_for_sale || cartContext?.pending))} onClick={() => void addToBag()}><IoBagHandleOutline aria-hidden="true" />{added ? (english ? "Added to Bag" : "أضيف إلى السلة") : (english ? "Add to Bag" : "أضف إلى السلة")}</button>
      </aside>

      <span className="glow-beauty-visually-hidden" aria-live="polite">{announcement}</span>
    </div>
  );
}

export default GlowBeautyProductDetailsPage;
