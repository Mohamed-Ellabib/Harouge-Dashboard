import { FormEvent, useEffect, useRef, useState } from "react";
import {
  IoArrowForward,
  IoBagHandleOutline,
  IoFilterOutline,
  IoMenuOutline,
  IoNotificationsOutline,
  IoSearchOutline,
} from "react-icons/io5";
import { PiSparkleFill, PiTag } from "react-icons/pi";

import { fetchStorefrontCatalog } from "../../api/storefront-api";
import { useOptionalCart } from "../../commerce/CartContext";
import { useOptionalFavorites } from "../../commerce/FavoritesContext";
import { localizedStorefrontText } from "../../lib/localization";
import { formatStorefrontMoney } from "../../lib/money";
import { navigate, StorefrontLink } from "../../lib/navigation";
import { resolvedStorefrontNavigation } from "../../lib/storefront-navigation";
import type {
  ConfiguredStorefrontProfileDto,
  StorefrontProductCardDto,
} from "../../types";
import { GlowBeautyStatusBar } from "./GlowBeautyChrome";
import { GlowBeautyProductCard } from "./GlowBeautyProductCard";
import { useGlowBeautyDesignEditor } from "./GlowBeautyDesignEditor";

import "./glow-beauty-home.css";

const asset = (name: string) => `/assets/glow-beauty/${name}`;
const arabicProductCategories: Record<string, string> = {
  Skincare: "العناية بالبشرة", Makeup: "المكياج", Fragrance: "العطور", Haircare: "العناية بالشعر",
};

const categories: Array<{ label: string; image: string | null; slug?: string }> = [
  { label: "Skincare", image: asset("product-radiance-serum.png") },
  { label: "Makeup", image: asset("product-matte-lipstick.png") },
  { label: "Fragrance", image: asset("category-fragrance.png") },
  { label: "Haircare", image: asset("category-haircare.png") },
  { label: "Tools", image: asset("category-tools.png") },
] as const;

type BeautyProduct = {
  id: string;
  name: string;
  detail: string;
  image: string | null;
  price: string;
  priceAmount?: number;
  reviews: number;
  badge?: string | null;
  category?: string | null;
  compareAtPrice?: number | null;
  source?: StorefrontProductCardDto;
};

const products: BeautyProduct[] = [
  {
    id: "radiance-serum",
    name: "Radiance Serum",
    detail: "Brightening & Glow",
    image: asset("product-radiance-serum.png"),
    price: "$24.99",
    priceAmount: 24.99,
    reviews: 126,
  },
  {
    id: "hydra-moisturizer",
    name: "Hydra Moisturizer",
    detail: "24H Hydration",
    image: asset("product-hydra-moisturizer.png"),
    price: "$19.99",
    priceAmount: 19.99,
    reviews: 98,
  },
  {
    id: "matte-lipstick",
    name: "Matte Lipstick",
    detail: "Long Lasting Color",
    image: asset("product-matte-lipstick.png"),
    price: "$14.99",
    priceAmount: 14.99,
    reviews: 156,
  },
  {
    id: "glow-foundation",
    name: "Glow Foundation",
    detail: "Natural Finish",
    image: asset("product-glow-foundation.png"),
    price: "$22.99",
    priceAmount: 22.99,
    reviews: 112,
  },
] as const;

export function GlowBeautyHomePage({
  profile,
}: {
  profile?: ConfiguredStorefrontProfileDto;
} = {}) {
  const design = useGlowBeautyDesignEditor();
  const productsRef = useRef<HTMLElement>(null);
  const cartContext = useOptionalCart();
  const favoritesContext = useOptionalFavorites();
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() => new Set());
  const [catalog, setCatalog] = useState<StorefrontProductCardDto[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(Boolean(profile));
  const [activeCategory, setActiveCategory] = useState("Skincare");
  const [filterActive, setFilterActive] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState(profile ? 0 : 3);
  const [searchMessage, setSearchMessage] = useState("");
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const previousTitle = document.title;
    const previousLang = document.documentElement.lang;
    const previousDirection = document.documentElement.dir;
    document.title = profile ? `${profile.name} | Store` : "Glow Beauty — Design Preview";
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
  }, [profile]);

  useEffect(() => {
    if (!profile) return;
    const controller = new AbortController();
    setCatalogLoading(true);
    void fetchStorefrontCatalog({
      limit: 12,
      offset: 0,
      order: "created_at",
      signal: controller.signal,
    })
      .then((result) => setCatalog(result.products))
      .catch(() => setCatalog([]))
      .finally(() => {
        if (!controller.signal.aborted) setCatalogLoading(false);
      });
    return () => controller.abort();
  }, [profile]);

  const toggleFavorite = (product: BeautyProduct) => {
    if (profile && product.source && favoritesContext) {
      favoritesContext.toggleFavorite(product.source);
      return;
    }
    setFavoriteIds((current) => {
      const next = new Set(current);
      if (next.has(product.id)) next.delete(product.id);
      else next.add(product.id);
      return next;
    });
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const query = String(form.get("beauty-search") ?? "").trim();
    if (profile && query) {
      navigate(`/products?q=${encodeURIComponent(query)}`);
      return;
    }
    setSearchMessage(query ? `Showing results for “${query}”` : "Enter a product to search");
  };

  const scrollToProducts = () => {
    productsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const locale = profile?.locale ?? "en-LY";
  const english = locale === "en-LY";
  const hero = profile?.storefront.content.hero;
  const heroHeading = hero
    ? localizedStorefrontText(hero.heading, locale)
    : design.value("hero.heading", "Glow Naturally, Shine Beautifully");
  const heroEyebrow = hero
    ? localizedStorefrontText(hero.eyebrow, locale)
    : design.value("hero.eyebrow", "New arrivals");
  const heroBody = hero
    ? localizedStorefrontText(hero.subheading, locale)
    : design.value("hero.subheading", "Explore our premium beauty collection for radiant you.");
  const heroAction = hero
    ? localizedStorefrontText(hero.cta_label, locale)
    : design.value("hero.cta_label", "Shop Now");
  const heroImage = hero?.slides.filter((slide) => slide.enabled)[activeSlide]?.image_url
    ?? hero?.slides.find((slide) => slide.enabled)?.image_url
    ?? hero?.image_url
    ?? (profile ? null : design.value("hero.image", asset("hero-beauty-collection.png")));
  const categoryItems = profile
    ? profile.storefront.content.brands.items.slice(0, 5).map((brand) => ({
        label: localizedStorefrontText(brand.name, locale),
        slug: brand.slug,
        image: brand.image_url,
      }))
    : categories;
  const visibleProducts: BeautyProduct[] = profile
    ? catalog.map((product) => ({
        id: product.handle,
        name: product.title,
        detail: product.subtitle ?? (english ? "Beauty essential" : "منتج عناية مختار"),
        image: product.thumbnail_url,
        price: product.price_lyd == null
          ? (english ? "Price unavailable" : "السعر غير متاح")
          : formatStorefrontMoney(product.price_lyd, "lyd", locale),
        reviews: 0,
        priceAmount: product.price_lyd ?? undefined,
        badge: product.badge,
        category: product.category,
        compareAtPrice: product.compare_at_price_lyd,
        source: product,
      }))
    : products;
  const cartCount = cartContext?.cart?.items.reduce(
    (total, item) => total + item.quantity,
    0,
  ) ?? 0;
  const isFavorite = (product: BeautyProduct) => product.source && favoritesContext
    ? favoritesContext.isFavorite(product.source.handle)
    : favoriteIds.has(product.id);
  const direction = locale === "ar-LY" ? "rtl" : "ltr";
  const language = locale === "ar-LY" ? "ar" : "en";
  const Content = profile ? "div" : "main";
  const quickNavigation = profile ? resolvedStorefrontNavigation(profile) : [];
  const offerPercent = profile
    ? Math.max(0, ...visibleProducts.map((product) =>
        product.compareAtPrice && product.source?.price_lyd
          ? Math.round((1 - product.source.price_lyd / product.compareAtPrice) * 100)
          : 0,
      ))
    : 30;
  const enabledHeroSlides = hero?.slides.filter((slide) => slide.enabled) ?? [];
  const slideCount = profile
    ? Math.max(enabledHeroSlides.length, heroImage ? 1 : 0)
    : 5;
  const offerSlide = enabledHeroSlides[1];
  const offerImage = offerSlide?.image_url ?? design.value("offer.image", asset("special-offer.png"));
  const offerImageAlt = offerSlide
    ? localizedStorefrontText(offerSlide.alt, locale)
    : (english ? "Selected beauty essentials" : "منتجات تجميل مختارة");

  return (
    <div className="glow-beauty-page" dir={direction} lang={language}>
      <GlowBeautyStatusBar preview={!profile} />

      <section className="glow-beauty-greeting" aria-label="Welcome">
        <button
          className="glow-beauty-icon-button glow-beauty-menu-button"
          type="button"
          aria-label="Open menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((value) => !value)}
        >
          <IoMenuOutline aria-hidden="true" />
        </button>
        <div>
          <p>{profile?.name ?? design.storeName ?? "Hello, Glow Girl!"} <PiSparkleFill aria-hidden="true" /></p>
          <h1>{english ? "Discover Beauty" : "اكتشفي الجمال"}</h1>
          <span>Premium beauty, just for you</span>
        </div>
        <button
          className="glow-beauty-icon-button glow-beauty-notification-button"
          type="button"
          aria-label={notifications ? `${notifications} notifications` : "No new notifications"}
          onClick={() => setNotifications(0)}
        >
          <IoNotificationsOutline aria-hidden="true" />
          {notifications ? <b>{notifications}</b> : null}
        </button>
        <StorefrontLink className="glow-beauty-icon-button" to={profile ? "/cart" : "/cart?preview=1&template=glow-beauty"} ariaLabel={`${cartCount} items in bag`}>
          <IoBagHandleOutline aria-hidden="true" />
        </StorefrontLink>
        {menuOpen ? (
          <nav className="glow-beauty-quick-menu" aria-label="Quick menu">
            {profile ? quickNavigation.map((item) => <StorefrontLink key={item.key} to={item.to} onNavigate={() => setMenuOpen(false)}>{item.label}</StorefrontLink>) : (["Home", "New arrivals", "Best sellers", "Special offers"] as const).map((item) => (
              <button key={item} type="button" onClick={() => { setMenuOpen(false); if (item !== "Home") scrollToProducts(); }}>{item}</button>
            ))}
          </nav>
        ) : null}
      </section>

      <Content>
        <section className="glow-beauty-hero" aria-label="New beauty arrivals">
          {heroImage
            ? <img src={heroImage} alt={heroHeading} {...design.target("hero.image", "hero image")} />
            : <div className="glow-beauty-image-placeholder" role="img" aria-label={heroHeading}>{profile?.name.slice(0, 1)}</div>}
          <div className="glow-beauty-hero__copy">
            <span {...design.target("hero.eyebrow", "hero caption")}>{heroEyebrow}</span>
            <h2 {...design.target("hero.heading", "hero heading")}>{heroHeading}</h2>
            <p {...design.target("hero.subheading", "hero description")}>{heroBody}</p>
            <button {...design.target("hero.cta_label", "shop button text")} type="button" onClick={() => profile ? navigate(hero?.cta_target === "contact" ? "/contact" : "/products") : scrollToProducts()}>{heroAction} <IoArrowForward aria-hidden="true" /></button>
          </div>
          <PiSparkleFill className="glow-beauty-hero__sparkle" aria-hidden="true" />
        </section>

        <div className="glow-beauty-slider-dots" aria-label={`Slide ${activeSlide + 1} of ${slideCount}`}>
          {Array.from({ length: slideCount }, (_, index) => <button key={index} className={activeSlide === index ? "is-active" : ""} type="button" aria-label={`Show slide ${index + 1}`} onClick={() => setActiveSlide(index)} />)}
        </div>

        <form className="glow-beauty-search" role="search" onSubmit={submitSearch}>
          <label>
            <IoSearchOutline aria-hidden="true" />
            <span className="glow-beauty-visually-hidden">{english ? "Search for products" : "البحث عن المنتجات"}</span>
            <input name="beauty-search" type="search" placeholder={english ? "Search for products..." : "ابحثي عن المنتجات..."} />
          </label>
          <button
            className={filterActive ? "is-active" : ""}
            type="button"
            aria-label="Toggle filters"
            aria-pressed={filterActive}
            onClick={() => setFilterActive((value) => !value)}
          >
            <IoFilterOutline aria-hidden="true" />
          </button>
        </form>
        <p className="glow-beauty-search-message" aria-live="polite">{searchMessage || (filterActive ? "Beauty filters are ready" : "")}</p>

        {categoryItems.length ? <section className="glow-beauty-categories" aria-label="Beauty categories">
          {categoryItems.map((category) => (
            <button
              key={category.label}
              className={activeCategory === category.label ? "is-active" : ""}
              type="button"
              aria-pressed={activeCategory === category.label}
              onClick={() => { setActiveCategory(category.label); if (profile) navigate(`/products?category=${encodeURIComponent(category.label)}`); }}
            >
              <span>{category.image ? <img src={profile ? category.image : design.value(`category.${category.label.toLowerCase()}.image`, category.image)} alt="" {...design.target(`category.${category.slug ?? category.label.toLowerCase()}.image`, `${category.label} image`)} /> : <i className="glow-beauty-image-placeholder" aria-hidden="true">{category.label.slice(0, 1)}</i>}</span>
              <span className="glow-beauty-category-label" {...design.target(`category.${category.slug ?? category.label.toLowerCase()}.name`, `${category.label} label`)}>{profile ? category.label : design.value(`category.${category.label.toLowerCase()}.name`, category.label)}</span>
            </button>
          ))}
          {(!profile || offerPercent > 0) ? <button
            className={activeCategory === "Offers" ? "is-active" : ""}
            type="button"
            aria-pressed={activeCategory === "Offers"}
            onClick={() => setActiveCategory("Offers")}
          >
            <span className="glow-beauty-offers-icon"><PiTag aria-hidden="true" /></span>
            Offers
          </button> : null}
        </section> : null}

        <section className="glow-beauty-products" ref={productsRef} aria-labelledby="glow-beauty-best-sellers">
          <header>
            <h2 id="glow-beauty-best-sellers">{english ? "Best Sellers" : "الأكثر مبيعاً"}</h2>
            <button type="button" onClick={() => profile ? navigate("/products") : undefined}>{english ? "View All" : "عرض الكل"} <IoArrowForward aria-hidden="true" style={english ? undefined : { transform: "scaleX(-1)" }} /></button>
          </header>
          <div className="glow-beauty-product-grid glow-beauty-home-product-grid">
            {[0, 1].map((column) => <div className="glow-beauty-home-product-column" key={column}>
            {visibleProducts.filter((_, index) => index % 2 === column).map((product) => {
              const favorite = isFavorite(product);
              return <GlowBeautyProductCard
                key={product.id}
                id={product.id}
                name={product.name}
                detail={product.detail}
                image={product.image}
                price={product.price}
                priceAmount={product.priceAmount}
                currency={profile ? "lyd" : "usd"}
                layout="home"
                href={profile ? `/products/${encodeURIComponent(product.id)}` : undefined}
                badge={product.badge}
                locale={locale}
                favorite={favorite}
                rating={product.reviews ? 4.8 : 0}
                reviews={product.reviews}
                meta={product.category ? (english ? product.category : arabicProductCategories[product.category] ?? product.category) : undefined}
                primaryActionLabel={profile ? (english ? `Choose options for ${product.name}` : `اختيار خيارات ${product.name}`) : `Add ${product.name} to bag`}
                onToggleFavorite={() => toggleFavorite(product)}
                onPrimaryAction={() => profile ? navigate(`/products/${encodeURIComponent(product.id)}`) : setSearchMessage(`${product.name} added to the preview bag`)}
              />;
            })}
            </div>)}
            {profile && !catalogLoading && !visibleProducts.length ? <p className="glow-beauty-search-message">{english ? "No products are available yet." : "لا توجد منتجات متاحة حالياً."}</p> : null}
          </div>
        </section>

        {(!profile || offerPercent > 0) ? <section className="glow-beauty-offer" aria-label="Special offer">
          <img src={offerImage} alt={profile ? offerImageAlt : "Neutral makeup palette, brushes, and powder"} {...design.target("offer.image", "offer image")} />
          <div>
            <span>Special Offer</span>
            <h2>Up to {offerPercent}% Off</h2>
            <p>On selected beauty essentials</p>
            <button type="button" onClick={scrollToProducts}>Grab Now <IoArrowForward aria-hidden="true" /></button>
          </div>
          <strong><b>{offerPercent}%</b>OFF</strong>
        </section> : null}
      </Content>

    </div>
  );
}

export default GlowBeautyHomePage;
