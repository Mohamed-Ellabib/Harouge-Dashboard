import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  IoArrowBack,
  IoBagHandleOutline,
  IoChevronForward,
  IoFilterOutline,
  IoSearchOutline,
} from "react-icons/io5";
import { PiArrowsDownUp } from "react-icons/pi";

import { fetchStorefrontCatalog } from "../../api/storefront-api";
import { useOptionalCart } from "../../commerce/CartContext";
import { useOptionalFavorites } from "../../commerce/FavoritesContext";
import { localizedStorefrontText } from "../../lib/localization";
import { formatStorefrontMoney } from "../../lib/money";
import { navigate, StorefrontLink } from "../../lib/navigation";
import type {
  ConfiguredStorefrontProfileDto,
  StorefrontProductCardDto,
} from "../../types";
import { GlowBeautyStatusBar } from "./GlowBeautyChrome";
import { GlowBeautyProductCard } from "./GlowBeautyProductCard";
import "./glow-beauty-home.css";
import "./glow-beauty-catalog.css";

const asset = (name: string) => `/assets/glow-beauty/${name}`;

type Category = string;

type CatalogProduct = {
  id: string;
  name: string;
  detail: string;
  image: string | null;
  price: number;
  rating: number;
  category: Exclude<Category, "All">;
  badge?: string;
  compareAtPrice?: number | null;
  source?: StorefrontProductCardDto;
};

const catalogProducts: CatalogProduct[] = [
  {
    id: "radiance-serum",
    name: "Radiance Serum",
    detail: "Brightening & Glow",
    image: asset("product-radiance-serum.png"),
    price: 24.99,
    rating: 4.8,
    category: "Skincare",
    badge: "NEW",
  },
  {
    id: "hydra-moisturizer",
    name: "Hydra Moisturizer",
    detail: "24H Hydration",
    image: asset("product-hydra-moisturizer.png"),
    price: 19.99,
    rating: 4.7,
    category: "Skincare",
    badge: "NEW",
  },
  {
    id: "matte-lipstick",
    name: "Matte Lipstick",
    detail: "Long Lasting Color",
    image: asset("product-matte-lipstick.png"),
    price: 14.99,
    rating: 4.9,
    category: "Makeup",
    badge: "-20%",
  },
  {
    id: "rose-eau-de-parfum",
    name: "Rose Eau de Parfum",
    detail: "Elegant Floral Scent",
    image: asset("category-fragrance.png"),
    price: 29.99,
    rating: 4.8,
    category: "Fragrance",
  },
  {
    id: "glow-foundation",
    name: "Glow Foundation",
    detail: "Natural Finish",
    image: asset("product-glow-foundation.png"),
    price: 22.99,
    rating: 4.6,
    category: "Makeup",
  },
  {
    id: "luxe-face-cream",
    name: "Luxe Face Cream",
    detail: "Deep Nourishment",
    image: asset("product-luxe-face-cream.png"),
    price: 27.99,
    rating: 4.7,
    category: "Skincare",
  },
];

const categories: Category[] = ["All", "Skincare", "Makeup", "Fragrance", "Haircare"];

const productHref = (id: string) => id === "radiance-serum"
  ? "/products/radiance-serum?preview=1&template=glow-beauty"
  : undefined;

export function GlowBeautyCatalogPage({
  profile,
}: {
  profile?: ConfiguredStorefrontProfileDto;
} = {}) {
  const locale = profile?.locale ?? "en-LY";
  const english = locale === "en-LY";
  const categoryLabels: Record<string, string> = {
    All: "الكل", Skincare: "العناية بالبشرة", Makeup: "المكياج",
    Fragrance: "العطور", Haircare: "العناية بالشعر",
  };
  const categoryLabel = (value: string) => english ? value : categoryLabels[value] ?? value;
  const cartContext = useOptionalCart();
  const favoritesContext = useOptionalFavorites();
  const categories = profile ? ["All", ...profile.storefront.content.brands.items.map(item => localizedStorefrontText(item.name, profile.locale))] : ["All", "Skincare", "Makeup", "Fragrance", "Haircare"];
  const requestedCategory = typeof window === "undefined"
    ? null
    : new URLSearchParams(window.location.search).get("category") as Category | null;
  const [category, setCategory] = useState<Category>(requestedCategory && categories.includes(requestedCategory) ? requestedCategory : "All");
  const [query, setQuery] = useState(() => typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("q") ?? "");
  const [sortDescending, setSortDescending] = useState(false);
  const [offersOnly, setOffersOnly] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() => new Set());
  const [runtimeCatalog, setRuntimeCatalog] = useState<StorefrontProductCardDto[]>([]);
  const [runtimeCount, setRuntimeCount] = useState(0);
  const [loading, setLoading] = useState(Boolean(profile));

  useEffect(() => {
    const previousTitle = document.title;
    const previousLang = document.documentElement.lang;
    const previousDirection = document.documentElement.dir;
    document.title = profile ? `${english ? "Products" : "المنتجات"} | ${profile.name}` : "All Products — Glow Beauty Preview";
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
  }, [profile, english]);

  useEffect(() => {
    if (!profile) return;
    const controller = new AbortController();
    setLoading(true);
    void fetchStorefrontCatalog({
      limit: 24,
      offset: 0,
      order: "title",
      q: query.trim() || undefined,
      signal: controller.signal,
    })
      .then((result) => {
        setRuntimeCatalog(result.products);
        setRuntimeCount(result.count);
      })
      .catch(() => {
        setRuntimeCatalog([]);
        setRuntimeCount(0);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [profile, query]);

  const previewVisibleProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = catalogProducts.filter((product) => {
      const categoryMatches = category === "All" || product.category === category;
      const queryMatches = !normalizedQuery || `${product.name} ${product.detail}`.toLowerCase().includes(normalizedQuery);
      const offerMatches = !offersOnly || product.badge?.startsWith("-");
      return categoryMatches && queryMatches && offerMatches;
    });
    return sortDescending ? [...filtered].sort((left, right) => right.price - left.price) : filtered;
  }, [category, offersOnly, query, sortDescending]);



  const runtimeProducts: CatalogProduct[] = runtimeCatalog.map((product) => ({
        id: product.handle,
        name: product.title,
        detail: product.subtitle ?? (english ? "Beauty essential" : "منتج عناية مختار"),
        image: product.thumbnail_url,
        price: product.price_lyd ?? 0,
        rating: 0,
        category: product.category ?? "",
        badge: product.badge ?? undefined,
        compareAtPrice: product.compare_at_price_lyd,
        source: product,
      }));
  const visibleProducts: CatalogProduct[] = profile
    ? runtimeProducts
        .filter((product) =>
          (category === "All" || product.category === category) &&
          (!offersOnly || Boolean(product.compareAtPrice && product.compareAtPrice > product.price)),
        )
        .sort((left, right) => sortDescending ? right.price - left.price : left.name.localeCompare(right.name))
    : previewVisibleProducts;
  const offerPercent = profile
    ? Math.max(0, ...runtimeProducts.map((product) =>
        product.compareAtPrice && product.compareAtPrice > product.price
          ? Math.round((1 - product.price / product.compareAtPrice) * 100)
          : 0,
      ))
    : 25;
  const offerImage = profile?.storefront.content.hero.slides.find((slide, index) => slide.enabled && index > 0)?.image_url
    ?? asset("special-offer.png");
  const cartCount = cartContext?.cart?.items.reduce(
    (total, item) => total + item.quantity,
    0,
  ) ?? (profile ? 0 : 2);
  const favorite = (product: CatalogProduct) => product.source && favoritesContext
    ? favoritesContext.isFavorite(product.source.handle)
    : favoriteIds.has(product.id);
  const toggleRuntimeFavorite = (product: CatalogProduct) => {
    if (product.source && favoritesContext) {
      favoritesContext.toggleFavorite(product.source);
      return;
    }
    toggleFavorite(product.id);
  };
  const productUrl = (id: string) => profile
    ? `/products/${encodeURIComponent(id)}`
    : productHref(id);
  const Content = profile ? "div" : "main";
  const direction = locale === "ar-LY" ? "rtl" : "ltr";
  const language = locale === "ar-LY" ? "ar" : "en";

  const toggleFavorite = (id: string) => {
    setFavoriteIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => event.preventDefault();

  return (
    <div className="glow-beauty-page glow-beauty-catalog-page" dir={direction} lang={language}>
      <GlowBeautyStatusBar preview={!profile} />

      <header className="glow-beauty-catalog-header">
        <StorefrontLink to={profile ? "/" : "/categories?preview=1&template=glow-beauty"} ariaLabel={english ? "Back to Glow Beauty" : "العودة إلى الرئيسية"}><IoArrowBack aria-hidden="true" /></StorefrontLink>
        <h1>{english ? "All Products" : "كل المنتجات"}</h1>
        <StorefrontLink to={profile ? "/cart" : "/cart?preview=1&template=glow-beauty"} ariaLabel={english ? `${cartCount} items in bag` : `عدد المنتجات في السلة: ${cartCount}`}>
          <IoBagHandleOutline aria-hidden="true" />
          <b>{cartCount}</b>
        </StorefrontLink>
      </header>

      <Content>
        <form className="glow-beauty-catalog-search" role="search" onSubmit={submitSearch}>
          <IoSearchOutline aria-hidden="true" />
          <label className="glow-beauty-visually-hidden" htmlFor="glow-beauty-catalog-search">{english ? "Search beauty products" : "البحث عن منتجات الجمال"}</label>
          <input
            id="glow-beauty-catalog-search"
            type="search"
            value={query}
            placeholder={english ? "Search beauty products..." : "ابحثي عن منتجات الجمال..."}
            onChange={(event) => setQuery(event.target.value)}
          />
        </form>

        <nav className="glow-beauty-category-tabs" aria-label={english ? "Product categories" : "فئات المنتجات"}>
          {categories.map((item) => (
            <button key={item} className={category === item ? "is-active" : ""} type="button" aria-pressed={category === item} onClick={() => setCategory(item)}>{categoryLabel(item)}</button>
          ))}
        </nav>

        <section className="glow-beauty-catalog-controls" aria-label={english ? "Catalog controls" : "خيارات عرض المنتجات"}>
          <p>{english ? `${profile ? visibleProducts.length : 128} Products` : `عدد المنتجات: ${visibleProducts.length}`}</p>
          <div>
            <button className={sortDescending ? "is-active" : ""} type="button" aria-pressed={sortDescending} onClick={() => setSortDescending((value) => !value)}><PiArrowsDownUp aria-hidden="true" /> {english ? "Sort" : "ترتيب"}</button>
            <button className={offersOnly ? "is-active" : ""} type="button" aria-pressed={offersOnly} onClick={() => setOffersOnly((value) => !value)}><IoFilterOutline aria-hidden="true" /> {english ? "Filter" : "تصفية"}</button>
          </div>
        </section>

        {profile ? <StorefrontLink className="glow-beauty-catalog-promo" to="/products">
          <img src={offerImage} alt="" />
          <span><small>{offerPercent > 0 ? (english ? "Special Offer" : "عرض خاص") : localizedStorefrontText(profile.storefront.content.hero.eyebrow, locale)}</small><strong>{offerPercent > 0 ? `${english ? "Up to" : "حتى"} ${offerPercent}% ${english ? "Off" : "خصم"}` : localizedStorefrontText(profile.storefront.content.hero.heading, locale)}</strong></span>
          <i><IoChevronForward aria-hidden="true" /></i>
        </StorefrontLink> : <button className="glow-beauty-catalog-promo" type="button" onClick={() => setOffersOnly(false)}>
          <img src={asset("special-offer.png")} alt="Warm neutral makeup palette, brushes, and beauty products" />
          <span><small>Summer Glow</small><strong>Up to 25% Off</strong></span>
          <i><IoChevronForward aria-hidden="true" /></i>
        </button>}

        <section className="glow-beauty-product-grid glow-beauty-catalog-grid" aria-label={english ? "Beauty products" : "منتجات الجمال"} aria-live="polite">
          {visibleProducts.map((product) => {
            const saved = favorite(product);
            const href = productUrl(product.id);
            return <GlowBeautyProductCard
              key={product.id}
              id={product.id}
              name={product.name}
              detail={product.detail}
              image={product.image}
              price={profile
                ? (product.price ? formatStorefrontMoney(product.price, "lyd", locale) : (english ? "Price unavailable" : "السعر غير متاح"))
                : `$${product.price.toFixed(2)}`}
              href={href}
              badge={product.badge}
              locale={locale}
              favorite={saved}
              rating={product.rating}
              meta={categoryLabel(product.category)}
              primaryActionLabel={profile ? (english ? `Choose options for ${product.name}` : `اختيار خيارات ${product.name}`) : `Add ${product.name} to bag`}
              onToggleFavorite={() => toggleRuntimeFavorite(product)}
              onPrimaryAction={() => profile && href ? navigate(href) : undefined}
            />;
          })}
          {!visibleProducts.length && !loading ? <p className="glow-beauty-catalog-empty">{english ? "No beauty products match this search." : "لا توجد منتجات تطابق هذا البحث."}</p> : null}
        </section>
      </Content>

    </div>
  );
}

export default GlowBeautyCatalogPage;
