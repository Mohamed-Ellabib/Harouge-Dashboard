import { useEffect, useState } from "react";

import { fetchStorefrontPurchaseOptions } from "../api/storefront-api";
import { useCart } from "../commerce/CartContext";
import { useFavorites } from "../commerce/FavoritesContext";
import { storefrontUiText } from "../lib/localization";
import { formatStorefrontMoney } from "../lib/money";
import type { StorefrontLocale, StorefrontProductCardDto } from "../types";
import { StorefrontLink } from "../lib/navigation";
import { CartIcon, HeartIcon, PackageIcon } from "./Icons";

type ProductCardProps = {
  product: StorefrontProductCardDto;
  headingLevel?: 2 | 3;
  locale: StorefrontLocale;
};

export const ProductCard = ({
  product,
  headingLevel = 3,
  locale,
}: ProductCardProps) => {
  const [imageFailed, setImageFailed] = useState(false);
  const [adding, setAdding] = useState(false);
  const { addItem, capability } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const Heading = `h${headingLevel}` as const;

  useEffect(() => setImageFailed(false), [product.thumbnail_url]);

  const destination = `/products/${encodeURIComponent(product.handle)}`;
  const favorite = isFavorite(product.handle);
  const addFromCard = async () => {
    if (capability.online_checkout.status !== "available" || adding) return;
    setAdding(true);
    try {
      const purchase = await fetchStorefrontPurchaseOptions(
        product.handle,
        capability.online_checkout.currency_code!,
      );
      const variant = purchase.variants.find((entry) => entry.available_for_sale);
      if (variant) await addItem(variant.id);
    } catch {
      // Product detail remains the fallback when an inline add is unavailable.
    } finally {
      setAdding(false);
    }
  };

  return (
    <article className="product-card">
      <button
        className={`product-card__favorite${favorite ? " is-active" : ""}`}
        type="button"
        aria-label={storefrontUiText(locale, {
          ar: favorite ? `إزالة ${product.title} من المفضلة` : `حفظ ${product.title} في المفضلة`,
          en: favorite ? `Remove ${product.title} from favorites` : `Save ${product.title} to favorites`,
        })}
        aria-pressed={favorite}
        onClick={() => toggleFavorite(product)}
      >
        <HeartIcon filled={favorite} />
      </button>
      {capability.online_checkout.status === "available" ? (
        <button
          className="product-card__quick-cart"
          type="button"
          disabled={adding}
          aria-label={storefrontUiText(locale, { ar: `أضف ${product.title} إلى السلة`, en: `Add ${product.title} to cart` })}
          onClick={() => void addFromCard()}
        >
          <CartIcon />
        </button>
      ) : null}
      {product.badge ? <span className="product-card__badge">{product.badge}</span> : null}
      <StorefrontLink
        to={destination}
        className="product-card__image-link"
        ariaLabel={storefrontUiText(locale, {
          ar: `عرض ${product.title}`,
          en: `View ${product.title}`,
        })}
      >
        {product.thumbnail_url && !imageFailed ? (
          <img
            src={product.thumbnail_url}
            alt={product.title}
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <span className="product-card__placeholder" aria-hidden="true">
            <PackageIcon />
          </span>
        )}
      </StorefrontLink>
      <div className="product-card__body">
        {product.brand ? <strong className="product-card__brand">{product.brand}</strong> : null}
        <Heading>
          <StorefrontLink to={destination}>{product.title}</StorefrontLink>
        </Heading>
        {product.subtitle ? (
          <p>{product.subtitle}</p>
        ) : (
          <p className="product-card__quiet">
            {storefrontUiText(locale, {
              ar: "تفاصيل مختارة بعناية",
              en: "Thoughtfully selected details",
            })}
          </p>
        )}
        {product.price_lyd ? (
          <p className="product-card__price" dir="ltr">
            {product.compare_at_price_lyd ? <del>{formatStorefrontMoney(product.compare_at_price_lyd, "LYD", locale)}</del> : null}
            <strong>{formatStorefrontMoney(product.price_lyd, "LYD", locale)}</strong>
          </p>
        ) : (
          <StorefrontLink to={destination} className="product-card__action">
            {storefrontUiText(locale, { ar: "عرض التفاصيل", en: "View details" })}
          </StorefrontLink>
        )}
      </div>
    </article>
  );
};
