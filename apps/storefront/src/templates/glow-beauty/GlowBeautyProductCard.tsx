import { IoAdd, IoCartOutline, IoHeart, IoHeartOutline, IoPricetagOutline } from "react-icons/io5";
import { PiStarFill } from "react-icons/pi";

import { StorefrontLink } from "../../lib/navigation";
import { useGlowBeautyDesignEditor } from "./GlowBeautyDesignEditor";
import "./glow-beauty-home-product-card.css";

export type GlowBeautyProductCardProps = {
  id: string;
  name: string;
  detail: string;
  image: string | null;
  price: string;
  priceAmount?: number;
  currency?: string;
  layout?: "default" | "home";
  href?: string;
  badge?: string | null;
  locale?: "en-LY" | "ar-LY";
  favorite: boolean;
  rating?: number;
  reviews?: number;
  meta?: string | null;
  primaryActionLabel: string;
  onToggleFavorite: () => void;
  onPrimaryAction: () => void;
};

export function GlowBeautyProductCard({
  id,
  name,
  detail,
  image,
  price,
  priceAmount,
  currency = "lyd",
  layout = "default",
  href,
  badge,
  locale = "en-LY",
  favorite,
  rating = 0,
  reviews = 0,
  meta,
  primaryActionLabel,
  onToggleFavorite,
  onPrimaryAction,
}: GlowBeautyProductCardProps) {
  const design = useGlowBeautyDesignEditor();
  const english = locale === "en-LY";
  const priceParts = priceAmount == null ? null : new Intl.NumberFormat(locale, {
    style: "currency", currency, currencyDisplay: "symbol",
  }).formatToParts(priceAmount);
  const arabicBadges: Record<string, string> = { NEW: "جديد", "BEST SELLER": "الأكثر مبيعاً", "BEST SELLERS": "الأكثر مبيعاً", SALE: "تخفيض", OFFER: "عرض", HOT: "رائج" };
  const badgeLabel = badge && locale === "ar-LY" ? arabicBadges[badge.trim().toUpperCase()] ?? badge : badge;
  const media = image
    ? <img src={image} alt={name} />
    : <div className="glow-beauty-image-placeholder" role="img" aria-label={name}>{name.slice(0, 1)}</div>;

  return (
    <article className={`glow-beauty-product-card${layout === "home" ? " glow-beauty-product-card--home" : ""}`} data-product-id={id} {...design.target(`product.${id}`, name)}>
      <div className="glow-beauty-product-card__image">
        {href
          ? <StorefrontLink to={href} ariaLabel={english ? `View ${name}` : `عرض ${name}`}>{media}</StorefrontLink>
          : media}
        {badge && layout !== "home" ? <span className={badge.startsWith("-") ? "is-sale" : undefined}>{badgeLabel}</span> : null}
        <button
          type="button"
          aria-label={english ? (favorite ? `Remove ${name} from wishlist` : `Add ${name} to wishlist`) : (favorite ? `إزالة ${name} من المفضلة` : `إضافة ${name} إلى المفضلة`)}
          aria-pressed={favorite}
          onClick={onToggleFavorite}
        >
          {favorite ? <IoHeart aria-hidden="true" /> : <IoHeartOutline aria-hidden="true" />}
        </button>
      </div>
      {layout === "home" ? <div className="glow-beauty-home-card__body">
        <p className="glow-beauty-home-card__meta">{meta ? <IoPricetagOutline aria-hidden="true" /> : null}<span>{meta || detail}</span></p>
        <div className="glow-beauty-home-card__title">
          <h3>{href ? <StorefrontLink to={href}>{name}</StorefrontLink> : name}</h3>
          {rating > 0 ? <span className="glow-beauty-home-card__rating" aria-label={english ? `${rating.toFixed(1)} out of 5` : `${rating.toFixed(1)} من 5`}><PiStarFill aria-hidden="true" />{rating.toFixed(1)}</span> : null}
        </div>
        <div className="glow-beauty-home-card__price" aria-label={price}>
          {priceParts ? <bdi aria-hidden="true">{priceParts.map((part, index) => <span key={index} className={`price-${part.type}`}>{part.value}</span>)}</bdi> : <strong>{price}</strong>}
        </div>
        <button className="glow-beauty-home-card__action" type="button" aria-label={primaryActionLabel} onClick={onPrimaryAction}><IoCartOutline aria-hidden="true" /><span>{english ? "Add to Cart" : "أضف إلى السلة"}</span></button>
      </div> : <>
      <h3>{href ? <StorefrontLink to={href}>{name}</StorefrontLink> : name}</h3>
      <p>{detail}</p>
      <div
        className="glow-beauty-product-card__rating"
        aria-label={rating
          ? `${rating.toFixed(1)} out of 5${reviews ? ` from ${reviews} reviews` : ""}`
          : meta ?? "Store selection"}
      >
        {rating ? <span><PiStarFill aria-hidden="true" /> {rating.toFixed(1)}</span> : null}
        {reviews ? <small>({reviews})</small> : null}
        {!rating && meta ? <small>{meta}</small> : null}
      </div>
      <footer>
        <strong>{price}</strong>
        <button type="button" aria-label={primaryActionLabel} onClick={onPrimaryAction}><IoAdd aria-hidden="true" /></button>
      </footer>
      </>}
    </article>
  );
}

export default GlowBeautyProductCard;
