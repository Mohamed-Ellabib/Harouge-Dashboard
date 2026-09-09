import { FormEvent, useEffect, useRef, useState } from "react";
import {
  IoBagHandleOutline,
  IoHeartOutline,
  IoHeartSharp,
  IoMicOutline,
  IoNotificationsOutline,
  IoPersonOutline,
  IoSearchOutline,
} from "react-icons/io5";
import {
  PiArrowsClockwiseLight,
  PiShieldCheckLight,
  PiSparkleFill,
  PiStarFill,
  PiStarHalfFill,
  PiTruckLight,
} from "react-icons/pi";

import { fetchStorefrontCatalog } from "../../api/storefront-api";
import { useOptionalCart } from "../../commerce/CartContext";
import { useOptionalFavorites } from "../../commerce/FavoritesContext";
import { localizedStorefrontText } from "../../lib/localization";
import { formatStorefrontMoney } from "../../lib/money";
import { navigate, StorefrontLink } from "../../lib/navigation";
import type { ConfiguredStorefrontProfileDto, StorefrontProductCardDto } from "../../types";
import { standardRoute } from "./StandardMobileNavigation";
import "./standard-mobile-home.css";

const categories = [
  { label: "Handbags", image: "/assets/standard/category-handbags.webp" },
  { label: "Watches", image: "/assets/standard/category-watches.webp" },
  { label: "Sunglasses", image: "/assets/standard/category-sunglasses.webp" },
  { label: "Shoes", image: "/assets/standard/category-shoes.webp" },
  { label: "Dresses", image: "/assets/standard/category-dresses.webp", desktopOnly: true },
  { label: "Casual", image: "/assets/standard/category-casual.webp" },
] as const;

type StandardProduct = {
  id: string;
  name: string;
  image: string;
  price: string;
  reviews: number;
  href?: string;
  imagePosition?: string;
  source?: StorefrontProductCardDto;
};

const arrivals: readonly StandardProduct[] = [
  {
    id: "ivory-lounge-set",
    name: "Ivory Lounge Set",
    image: "/assets/standard/arrival-cream-set.webp",
    price: "$89.00",
    reviews: 128,
    imagePosition: "center 24%",
  },
  {
    id: "pastel-wrap-dress",
    name: "Pastel Wrap Dress",
    image: "/assets/standard/arrival-striped-dress.webp",
    price: "$129.00",
    reviews: 96,
    href: "/products/pastel-wrap-dress?preview=1&template=standard",
    imagePosition: "center 23%",
  },
  {
    id: "heritage-leather-bag",
    name: "Heritage Leather Bag",
    image: "/assets/standard/favorite-heritage-leather-bag.webp",
    price: "$148.00",
    reviews: 84,
    imagePosition: "center 57%",
  },
  {
    id: "classic-beige-heels",
    name: "Classic Beige Heels",
    image: "/assets/standard/cart-classic-beige-heels.webp",
    price: "$96.00",
    reviews: 67,
    imagePosition: "center 58%",
  },
] as const;

const trendingProducts: readonly StandardProduct[] = [
  {
    id: "heritage-leather-bag",
    name: "Heritage Leather Bag",
    image: "/assets/standard/favorite-heritage-leather-bag.webp",
    price: "$148.00",
    reviews: 84,
    imagePosition: "center 57%",
  },
  {
    id: "classic-slingback-heels",
    name: "Classic Slingback Heels",
    image: "/assets/standard/cart-classic-beige-heels.webp",
    price: "$96.00",
    reviews: 67,
    imagePosition: "center 58%",
  },
  {
    id: "cat-eye-sunglasses",
    name: "Cat-Eye Sunglasses",
    image: "/assets/standard/trending-cat-eye-sunglasses.webp",
    price: "$74.00",
    reviews: 112,
    imagePosition: "center 55%",
  },
] as const;

const recommendedProducts: readonly StandardProduct[] = [
  {
    id: "tailored-camel-coat",
    name: "Tailored Camel Coat",
    image: "/assets/standard/recommended-tailored-camel-coat.webp",
    price: "$165.00",
    reviews: 75,
    imagePosition: "center 48%",
  },
  {
    id: "ivory-knit-set",
    name: "Ivory Knit Set",
    image: "/assets/standard/recommended-ivory-knit-set.webp",
    price: "$112.00",
    reviews: 93,
    imagePosition: "center 48%",
  },
  {
    id: "espresso-tote",
    name: "Espresso Tote",
    image: "/assets/standard/recommended-espresso-tote.webp",
    price: "$138.00",
    reviews: 64,
    imagePosition: "center 59%",
  },
  {
    id: "satin-midi-dress",
    name: "Satin Midi Dress",
    image: "/assets/standard/recommended-satin-midi-dress.webp",
    price: "$124.00",
    reviews: 58,
    imagePosition: "center 43%",
  },
] as const;

type ProductCardSize = "arrival" | "trending" | "recommended";

type StandardProductCardProps = {
  favorite: boolean;
  product: StandardProduct;
  size: ProductCardSize;
  onToggleFavorite: (id: string) => void;
};

function StandardRating({ reviews }: { reviews: number }) {
  if (reviews <= 0) {
    return <div className="standard-catalog-card__rating"><small>Reviews unavailable</small></div>;
  }
  return (
    <div className="standard-catalog-card__rating" aria-label={`4.8 out of 5 stars from ${reviews} reviews`}>
      <span className="standard-catalog-card__rating-score" aria-hidden="true">
        <PiStarFill />
        <b>4.8</b>
      </span>
      <span className="standard-catalog-card__rating-stars" aria-hidden="true">
        <PiStarFill />
        <PiStarFill />
        <PiStarFill />
        <PiStarFill />
        <PiStarHalfFill />
      </span>
      <small>({reviews})</small>
    </div>
  );
}

export function StandardProductCard({ favorite, product, size, onToggleFavorite }: StandardProductCardProps) {
  const image = (
    <img
      src={product.image}
      alt={product.name}
      style={{ objectPosition: product.imagePosition }}
    />
  );

  return (
    <article className={`standard-catalog-card standard-catalog-card--${size}`} data-glow-edit={`product.${product.id}`}>
      <div className="standard-catalog-card__image">
        {product.href ? (
          <StorefrontLink to={product.href} ariaLabel={`Open ${product.name}`}>
            {image}
          </StorefrontLink>
        ) : image}
        <button
          type="button"
          aria-label={favorite ? `Remove ${product.name} from saved items` : `Save ${product.name}`}
          aria-pressed={favorite}
          onClick={() => onToggleFavorite(product.id)}
        >
          {favorite ? <IoHeartSharp aria-hidden="true" /> : <IoHeartOutline aria-hidden="true" />}
        </button>
      </div>
      <div className="standard-catalog-card__copy">
        <h3>{product.name}</h3>
        <p>{product.price}</p>
        <StandardRating reviews={product.reviews} />
      </div>
    </article>
  );
}

export default function StandardMobileHomePage({
  profile,
}: {
  profile?: ConfiguredStorefrontProfileDto;
} = {}) {
  const mobileSearchRef = useRef<HTMLInputElement>(null);
  const desktopSearchRef = useRef<HTMLInputElement>(null);
  const cartContext = useOptionalCart();
  const favoritesContext = useOptionalFavorites();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() => new Set());
  const [catalog, setCatalog] = useState<StorefrontProductCardDto[]>([]);
  const [listening, setListening] = useState(false);
  const [searchMessage, setSearchMessage] = useState("");

  useEffect(() => {
    const previousTitle = document.title;
    document.title = profile ? `${profile.name} | Store` : "Standard Storefront Preview";
    document.documentElement.classList.add("standard-preview-document");
    document.body.classList.add("standard-preview-document");
    return () => {
      document.title = previousTitle;
      document.documentElement.classList.remove("standard-preview-document");
      document.body.classList.remove("standard-preview-document");
    };
  }, [profile]);

  useEffect(() => {
    if (!profile) return;
    const controller = new AbortController();
    void fetchStorefrontCatalog({ limit: 24, offset: 0, order: "created_at", signal: controller.signal })
      .then((result) => setCatalog(result.products))
      .catch(() => setCatalog([]));
    return () => controller.abort();
  }, [profile]);

  const submitSearch = (event: FormEvent<HTMLFormElement>, input: HTMLInputElement | null) => {
    event.preventDefault();
    const query = input?.value.trim() ?? "";
    if (profile && query) {
      navigate(standardRoute(`/products?q=${encodeURIComponent(query)}`));
      return;
    }
    setSearchMessage(query ? `Searching for ${query}` : "Type something to search");
  };

  const focusCollectionSearch = (collection: string) => {
    if (profile) {
      const category = profile.storefront.content.brands.items.find(item => localizedStorefrontText(item.name, profile.locale).toLowerCase() === collection.toLowerCase());
      navigate(standardRoute(category ? `/products?category=${encodeURIComponent(category.slug)}` : "/products"));
      return;
    }
    const desktop = typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches;
    const input = desktop ? desktopSearchRef.current : mobileSearchRef.current;
    if (input) {
      input.value = collection;
      input.focus();
    }
    setSearchMessage(`Showing ${collection}`);
  };

  const toggleFavorite = (id: string) => {
    const runtimeProduct = catalog.find((product) => product.handle === id);
    if (runtimeProduct && favoritesContext) {
      favoritesContext.toggleFavorite(runtimeProduct);
      return;
    }
    setFavoriteIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const initialOrder = [...arrivals, ...trendingProducts, ...recommendedProducts].map(item => item.id);
  const rank = (handle: string) => { const index = initialOrder.findIndex(id => handle === id || handle.endsWith(`-${id}`)); return index < 0 ? 999 : index; };
  const runtimeProducts: StandardProduct[] = [...catalog].sort((a, b) => rank(a.handle) - rank(b.handle)).map((product) => ({
    id: product.handle,
    name: product.title,
    image: product.thumbnail_url ?? "/assets/standard/arrival-cream-set.webp",
    price: product.price_lyd == null
      ? "Price unavailable"
      : formatStorefrontMoney(product.price_lyd, "lyd", profile?.locale ?? "en-LY"),
    reviews: 0,
    href: standardRoute(`/products/${encodeURIComponent(product.handle)}`),
    source: product,
  }));
  const productLane = (start: number, length: number, fallback: readonly StandardProduct[]) => {
    if (!runtimeProducts.length) return profile ? [] : fallback;
    return Array.from({ length: Math.min(length, runtimeProducts.length) }, (_, index) =>
      runtimeProducts[(start + index) % runtimeProducts.length]);
  };
  const arrivalLane = productLane(0, 4, arrivals);
  const trendingLane = productLane(2, 3, trendingProducts);
  const recommendedLane = productLane(4, 4, recommendedProducts);
  const featuredProduct = runtimeProducts[1] ?? runtimeProducts[0] ?? (profile ? { id: "", name: "", image: "", price: "", reviews: 0, href: "/products" } : arrivals[1]);
  const isFavorite = (id: string) => favoritesContext?.isFavorite(id) ?? favoriteIds.has(id);
  const cartCount = cartContext?.cart?.items.reduce((total, item) => total + item.quantity, 0) ?? 0;
  const locale = profile?.locale ?? "en-LY";
  const hero = profile?.storefront.content.hero;
  const heroImage = hero?.slides.find((slide) => slide.enabled)?.image_url ?? hero?.image_url;
  const heroHeading = hero ? localizedStorefrontText(hero.heading, locale) : "WEAR YOUR CONFIDENCE";
  const heroEyebrow = hero ? localizedStorefrontText(hero.eyebrow, locale) : "New Season 2026";
  const heroDescription = hero ? localizedStorefrontText(hero.subheading, locale) : "Thoughtfully selected pieces for effortless everyday style.";
  const heroButtons = hero?.buttons.filter((button) => button.enabled) ?? [];
  const benefits = hero?.benefits ?? [];
  const benefitCopy = (index: number, fallback: string) => {
    const benefit = benefits[index];
    if (!benefit) return fallback;
    return `${localizedStorefrontText(benefit.title, locale)} — ${localizedStorefrontText(benefit.subtitle, locale)}`;
  };
  const categoryItems = profile
    ? profile.storefront.content.brands.items.slice(0, 6).map((brand, index) => ({
        label: localizedStorefrontText(brand.name, locale),
        slug: brand.slug,
        image: brand.image_url ?? categories[index % categories.length].image,
        desktopOnly: index === 4,
      }))
    : categories;

  return (
    <div className="standard-mobile-home" dir="ltr" lang="en">
      <div className="standard-desktop-topbar">
        {profile ? benefitCopy(0, "Delivery options at checkout") : "Free delivery on orders over $100"} <span aria-hidden="true">•</span> {profile ? benefitCopy(1, "See the Store returns policy") : "Easy returns within 14 days"}
      </div>

      <header className="standard-desktop-nav" aria-label="Desktop storefront navigation">
        <button className="standard-desktop-nav__brand" type="button" onClick={() => navigate(standardRoute("/"))}>
          {profile?.name ?? "STYLE."}
        </button>
        <nav className="standard-desktop-nav__links" aria-label="Shop categories">
          <button type="button" onClick={() => focusCollectionSearch("latest arrivals")}>New Arrivals</button>
          <button type="button" onClick={() => focusCollectionSearch("women")}>Women</button>
          <button type="button" onClick={() => focusCollectionSearch("accessories")}>Accessories</button>
          <button type="button" onClick={() => focusCollectionSearch("shoes")}>Shoes</button>
          <button type="button" onClick={() => focusCollectionSearch("collections")}>Collections</button>
        </nav>
        <form className="standard-desktop-search" role="search" onSubmit={(event) => submitSearch(event, desktopSearchRef.current)}>
          <button type="submit" aria-label="Submit desktop search"><IoSearchOutline aria-hidden="true" /></button>
          <label className="sr-only" htmlFor="standard-desktop-store-search">Search products</label>
          <input id="standard-desktop-store-search" ref={desktopSearchRef} type="search" placeholder="Search products" autoComplete="off" />
        </form>
        <div className="standard-desktop-nav__actions">
          <button type="button" aria-label="Account" onClick={() => navigate(standardRoute("/account"))}><IoPersonOutline aria-hidden="true" /></button>
          <button type="button" aria-label="Saved items" onClick={() => navigate(standardRoute("/favorites"))}><IoHeartOutline aria-hidden="true" /></button>
          <button className="standard-desktop-nav__bag" type="button" aria-label={`Cart with ${cartCount} items`} onClick={() => navigate(standardRoute("/cart"))}>
            <IoBagHandleOutline aria-hidden="true" /><span>{cartCount}</span>
          </button>
        </div>
      </header>

      <header className="standard-profile-header" aria-label="Customer greeting">
        <img className="standard-profile-header__avatar" src={profile?.branding.logo_url ?? "/assets/standard/profile-jani.webp"} alt={profile?.name ?? "Jani"} />
        <div className="standard-profile-header__copy">
          <p className="standard-profile-header__title">{profile?.name ?? "Hi, Jani"}</p>
          <p>{profile ? localizedStorefrontText(profile.storefront.content.about.title, locale) : "Always be stylish"}</p>
        </div>
        <button
          className="standard-icon-button"
          type="button"
          aria-label="Notifications"
          onClick={() => setSearchMessage("You have no new notifications")}
        >
          <IoNotificationsOutline aria-hidden="true" />
        </button>
      </header>

      <form className="standard-search" role="search" onSubmit={(event) => submitSearch(event, mobileSearchRef.current)}>
        <button className="standard-search__submit" type="submit" aria-label="Submit search">
          <IoSearchOutline aria-hidden="true" />
        </button>
        <label className="sr-only" htmlFor="standard-store-search">Search products</label>
        <input id="standard-store-search" ref={mobileSearchRef} type="search" placeholder="Search..." autoComplete="off" />
        <button
          type="button"
          className="standard-search__voice"
          aria-label={listening ? "Stop voice search" : "Start voice search"}
          aria-pressed={listening}
          onClick={() => setListening((value) => !value)}
        >
          <IoMicOutline aria-hidden="true" />
        </button>
        <span className="sr-only" aria-live="polite">
          {searchMessage || (listening ? "Voice search is listening" : "")}
        </span>
      </form>

      <section className="standard-categories" aria-labelledby="standard-categories-title">
        <div className="standard-section-heading">
          <h2 id="standard-categories-title">
            <span className="standard-heading-mobile">Shop by Categories</span>
            <span className="standard-heading-desktop">Shop by Category</span>
          </h2>
          <button type="button" onClick={() => focusCollectionSearch("all categories")}>See all</button>
        </div>
        <div className="standard-categories__grid">
          {categoryItems.map((category) => (
            <button
              className={`standard-category ${"desktopOnly" in category && category.desktopOnly ? "standard-category--desktop-only" : ""}`}
              data-active={activeCategory === category.label ? "true" : "false"}
              key={category.label}
              type="button"
              onClick={() => {
                setActiveCategory(category.label);
                focusCollectionSearch(category.label);
              }}
            >
              <span className="standard-category__image" data-glow-edit={`category.${"slug" in category ? category.slug : category.label.toLowerCase()}.image`}><img src={category.image} alt="" /></span>
              <span data-glow-edit={`category.${"slug" in category ? category.slug : category.label.toLowerCase()}.name`}>{category.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="standard-hero" aria-labelledby="standard-hero-title">
        <picture data-glow-edit="hero.image">
          <source media="(min-width: 1024px)" srcSet={heroImage ?? "/assets/standard/desktop-hero-editorial.webp?v=2"} />
          <img className="standard-hero__image" src={heroImage ?? "/assets/standard/hero-editorial.webp"} alt={heroHeading} />
        </picture>
        <img className="standard-hero__waves" src="/assets/standard/desktop-hero-waves.webp" alt="" />
        <div className="standard-hero__copy">
          <p className="standard-hero__eyebrow" data-glow-edit="hero.eyebrow">{heroEyebrow}</p>
          <h1 id="standard-hero-title" data-glow-edit="hero.heading">
            <span className="standard-hero__mobile-title">{profile ? heroHeading : "Swift Dress"}</span>
            <span className="standard-hero__desktop-title">{heroHeading}</span>
          </h1>
          <p className="standard-hero__description" data-glow-edit="hero.subheading">{heroDescription}</p>
          <div className="standard-hero__actions">
            <button type="button" onClick={() => navigate(standardRoute(heroButtons[0]?.href ?? featuredProduct.href ?? "/products"))} style={heroButtons[0] ? { background: heroButtons[0].background_color, color: heroButtons[0].text_color } : undefined}>
              <span className="standard-hero__mobile-action" data-glow-edit="hero.cta_label">{heroButtons[0] ? localizedStorefrontText(heroButtons[0].label, locale) : "Shop now"}</span>
              <span className="standard-hero__desktop-action">{heroButtons[0] ? localizedStorefrontText(heroButtons[0].label, locale) : "Shop New Collection"}</span>
            </button>
            {heroButtons[1] ? <button className="standard-hero__secondary-action" type="button" onClick={() => navigate(standardRoute(heroButtons[1].href))} style={{ background: heroButtons[1].background_color, color: heroButtons[1].text_color }}>{localizedStorefrontText(heroButtons[1].label, locale)}</button> : <button className="standard-hero__secondary-action" type="button" onClick={() => focusCollectionSearch("styles")}>Explore Styles</button>}
          </div>
        </div>
        <PiSparkleFill className="standard-hero__sparkle" aria-hidden="true" />
        <p className="standard-hero__style-word" aria-hidden="true">STYLE</p>
        <article className="standard-hero-product">
          <div className="standard-hero-product__image">
            <img src={featuredProduct.image} alt={featuredProduct.name} />
            <button type="button" aria-label={`Save ${featuredProduct.name}`} aria-pressed={isFavorite(featuredProduct.id)} onClick={() => toggleFavorite(featuredProduct.id)}>
              {isFavorite(featuredProduct.id) ? <IoHeartSharp aria-hidden="true" /> : <IoHeartOutline aria-hidden="true" />}
            </button>
          </div>
          <h2>{featuredProduct.name}</h2>
          <p>{featuredProduct.price}</p>
        </article>
      </section>

      <section className="standard-arrivals" aria-labelledby="standard-arrivals-title">
        <div className="standard-section-heading">
          <h2 id="standard-arrivals-title">Latest Arrivals</h2>
          <button type="button" onClick={() => focusCollectionSearch("latest arrivals")}>See all</button>
        </div>
        <div className="standard-arrivals__grid">
          {arrivalLane.map((product) => (
            <StandardProductCard favorite={isFavorite(product.id)} key={product.id} product={product} size="arrival" onToggleFavorite={toggleFavorite} />
          ))}
        </div>
      </section>

      <section className="standard-trending" aria-labelledby="standard-trending-title">
        <div className="standard-section-heading">
          <h2 id="standard-trending-title">Trending Now</h2>
          <button type="button" onClick={() => focusCollectionSearch("trending products")}>See all</button>
        </div>
        <div className="standard-trending__grid">
          {trendingLane.map((product) => (
            <StandardProductCard favorite={isFavorite(product.id)} key={product.id} product={product} size="trending" onToggleFavorite={toggleFavorite} />
          ))}
        </div>
      </section>

      <section className="standard-neutral-edit" aria-labelledby="standard-neutral-edit-title">
        <img data-glow-edit="offer.image" src={hero?.slides.filter(item => item.enabled)[1]?.image_url ?? "/assets/standard/neutral-edit-banner.webp"} alt="Woman wearing the Neutral Edit collection" />
        <div>
          <h2 id="standard-neutral-edit-title">The Neutral Edit</h2>
          <p>Quiet tones. Strong style.</p>
          <button type="button" onClick={() => focusCollectionSearch("the neutral edit")}>Shop collection</button>
        </div>
      </section>

      <section className="standard-recommended" aria-labelledby="standard-recommended-title">
        <div className="standard-section-heading">
          <h2 id="standard-recommended-title">Recommended for You</h2>
          <button type="button" onClick={() => focusCollectionSearch("recommended products")}>See all</button>
        </div>
        <div className="standard-recommended__grid">
          {recommendedLane.map((product) => (
            <StandardProductCard favorite={isFavorite(product.id)} key={product.id} product={product} size="recommended" onToggleFavorite={toggleFavorite} />
          ))}
        </div>
      </section>

      {profile && benefits.length === 0 ? null : <aside className="standard-store-promises" aria-label="Shopping benefits">
        {(profile ? benefits.slice(0, 3) : [null, null, null]).map((benefit, index) => {
          const Icon = index === 0 ? PiTruckLight : index === 1 ? PiArrowsClockwiseLight : PiShieldCheckLight;
          const fallback = [
            ["Free Delivery", "Orders over $100"],
            ["Easy Returns", "Within 14 days"],
            ["Secure Payment", "Protected checkout"],
          ][index];
          return <div key={benefit?.id ?? index}><Icon aria-hidden="true" /><span><strong>{benefit ? localizedStorefrontText(benefit.title, locale) : fallback[0]}</strong><small>{benefit ? localizedStorefrontText(benefit.subtitle, locale) : fallback[1]}</small></span></div>;
        })}
      </aside>}

    </div>
  );
}
