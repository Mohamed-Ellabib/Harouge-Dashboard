import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";

import {
  fetchStorefrontCatalog,
  fetchStorefrontPurchaseOptions,
  isStorefrontApiError,
} from "../../api/storefront-api";
import { useCart } from "../../commerce/CartContext";
import { useFavorites } from "../../commerce/FavoritesContext";
import {
  CartIcon,
  CheckIcon,
  HeartIcon,
  SearchIcon,
  SlidersIcon,
} from "../../components/Icons";
import { StorefrontLink } from "../../lib/navigation";
import type {
  ConfiguredStorefrontProfileDto,
  StorefrontProductCardDto,
} from "../../types";
import { LuxeFullBottomNavigation } from "./LuxeFullBottomNavigation";

import "./reference-source/src/pages/storefront/WatchesPage.css";
import "./reference-source/src/pages/storefront/SunglassesPage.css";
import "./reference-source/src/pages/storefront/PensPage.css";
import "./reference-source/src/pages/storefront/CuratedProductsPage.css";
import "./reference-source/src/pages/storefront/StorefrontSurface.css";

export type LuxeFullListingKind =
  | "watches"
  | "sunglasses"
  | "pens"
  | "offers"
  | "best-sellers"
  | "brand";

type LuxeFullCatalogPageProps = {
  brandSlug?: string;
  kind: LuxeFullListingKind;
  profile: ConfiguredStorefrontProfileDto;
};

type SortMode = "featured" | "title" | "price-asc" | "price-desc";
type PriceBand = "all" | "under-1000" | "1000-2500" | "over-2500";

const listingCopy: Record<
  Exclude<LuxeFullListingKind, "brand">,
  {
    className: string;
    empty: string;
    heroImage: string | null;
    heroLead: string;
    heroMark?: string;
    heroPrimary: string;
    heroSecondary: string;
    heroTitle?: string;
    pageTitle: string;
  }
> = {
  watches: {
    className: "",
    empty: "سيتم عرض الساعات هنا عند إضافتها من لوحة التحكم.",
    heroImage: null,
    heroLead: "استكشف تشكيلتنا",
    heroPrimary: "WATCHES",
    heroSecondary: "CURATED COLLECTION",
    pageTitle: "الساعات",
  },
  sunglasses: {
    className: "sunglasses-page",
    empty: "سيتم عرض النظارات هنا عند إضافتها من لوحة التحكم.",
    heroImage: null,
    heroLead: "استكشف تشكيلتنا",
    heroPrimary: "EYEWEAR",
    heroSecondary: "CURATED COLLECTION",
    pageTitle: "النظارات",
  },
  pens: {
    className: "pens-page",
    empty: "سيتم عرض الأقلام هنا عند إضافتها من لوحة التحكم.",
    heroImage: null,
    heroLead: "استكشف مجموعة",
    heroMark: "Premium",
    heroPrimary: "LUXURY",
    heroSecondary: "WRITING",
    heroTitle: "أقلام",
    pageTitle: "الأقلام",
  },
  offers: {
    className: "watches-page--curated watches-page--offers",
    empty: "لا توجد عروض مخفضة متاحة حالياً.",
    heroImage:
      "/assets/luxe-full/customer-assets/home-hero-light-accessories.webp",
    heroLead: "اكتشف عروضنا",
    heroMark: "أسعار",
    heroPrimary: "OFFERS",
    heroSecondary: "SELECTED DEALS",
    heroTitle: "مميزة",
    pageTitle: "العروض المخفضة",
  },
  "best-sellers": {
    className: "watches-page--curated watches-page--best-sellers",
    empty: "لا توجد منتجات مصنفة ضمن الأكثر طلباً حالياً.",
    heroImage: "/assets/luxe-full/customer-assets/home-hero-light-watch.webp",
    heroLead: "اختيارات عملائنا",
    heroMark: "الأكثر",
    heroPrimary: "BEST",
    heroSecondary: "CUSTOMER FAVORITES",
    heroTitle: "طلباً",
    pageTitle: "الأكثر طلباً",
  },
};

const normalizedBrandName = (slug: string): string =>
  slug
    .split("-")
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");

const sourceQueryFor = (
  kind: LuxeFullListingKind,
  brandSlug: string,
): string | undefined => {
  if (kind === "watches") return "watch";
  if (kind === "sunglasses") return "sunglasses";
  if (kind === "pens") return "pen";
  if (kind === "brand") return brandSlug.replace(/-/g, " ");
  return undefined;
};

const money = (amount: number | null | undefined): string | null =>
  typeof amount === "number" && Number.isFinite(amount)
    ? `LYD ${new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 0,
      }).format(amount)}`
    : null;

const priceInBand = (product: StorefrontProductCardDto, band: PriceBand) => {
  if (band === "all" || typeof product.price_lyd !== "number") return true;
  if (band === "under-1000") return product.price_lyd < 1_000;
  if (band === "1000-2500") {
    return product.price_lyd >= 1_000 && product.price_lyd <= 2_500;
  }
  return product.price_lyd > 2_500;
};

const listingProductFilter = (
  product: StorefrontProductCardDto,
  kind: LuxeFullListingKind,
  brandSlug: string,
) => {
  if (kind === "offers") return typeof product.compare_at_price_lyd === "number";
  if (kind === "best-sellers") {
    return product.badge?.includes("الأكثر") || product.badge?.toLowerCase().includes("best");
  }
  if (kind === "brand") {
    const expected = brandSlug.replace(/-/g, " ").toLowerCase();
    return `${product.brand ?? ""} ${product.category ?? ""}`.toLowerCase().includes(expected);
  }
  const category = product.category?.toLowerCase();
  if (category) return category === kind;
  const searchable = `${product.title} ${product.subtitle ?? ""}`.toLowerCase();
  if (kind === "sunglasses") return /sunglass|glasses|نظار/.test(searchable);
  if (kind === "pens") return /pen|قلم/.test(searchable);
  if (kind === "watches") return !/sunglass|glasses|pen|نظار|قلم/.test(searchable);
  return true;
};

const DownChevron = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const BagPlusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <path d="M5 8h14l-1 12H6L5 8Z" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9 9V6a3 3 0 0 1 6 0v3M12 12v5m-2.5-2.5h5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const LuxeFullProductCard = ({
  index,
  product,
}: {
  index: number;
  product: StorefrontProductCardDto;
}) => {
  const [adding, setAdding] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const { addItem, capability } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorite = isFavorite(product.handle);
  const currentPrice = money(product.price_lyd);
  const originalPrice = money(product.compare_at_price_lyd);

  useEffect(() => setImageFailed(false), [product.thumbnail_url]);

  const addFromCard = async () => {
    if (adding || capability.online_checkout.status !== "available") return;
    setAdding(true);
    try {
      const purchase = await fetchStorefrontPurchaseOptions(
        product.handle,
        capability.online_checkout.currency_code!,
      );
      const variant = purchase.variants.find((entry) => entry.available_for_sale);
      if (variant) await addItem(variant.id);
    } catch {
      // The product detail route remains the safe fallback.
    } finally {
      setAdding(false);
    }
  };

  return (
    <article
      className="watches-page__product watches-page__product--loaded"
      data-glow-edit={`product.${product.handle}`}
      style={{ "--watch-card-delay": `${Math.min(index, 6) * 20}ms` } as CSSProperties}
    >
      <button
        className={`watches-page__favorite${favorite ? " is-active" : ""}`}
        type="button"
        aria-label={favorite ? `إزالة ${product.title} من المفضلة` : `حفظ ${product.title} في المفضلة`}
        aria-pressed={favorite}
        onClick={() => toggleFavorite(product)}
      >
        <HeartIcon filled={favorite} />
      </button>
      <button
        className="watches-page__card-cart"
        type="button"
        disabled={adding || capability.online_checkout.status !== "available"}
        aria-label={`أضف ${product.title} إلى السلة`}
        onClick={() => void addFromCard()}
      >
        <BagPlusIcon />
      </button>
      {product.badge ? <span className="watches-page__badge">{product.badge}</span> : null}
      <StorefrontLink
        className="watches-page__product-link"
        to={`/products/${encodeURIComponent(product.handle)}`}
        ariaLabel={`عرض ${product.title}`}
      >
        <div className="watches-page__product-image">
          {product.thumbnail_url && !imageFailed ? (
            <img
              src={product.thumbnail_url}
              alt={product.title}
              loading="lazy"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <span className="luxe-full-product-placeholder" aria-hidden="true">
              {product.title.charAt(0)}
            </span>
          )}
        </div>
        <div className="watches-page__product-copy">
          <strong>{product.brand || "Al Senussi"}</strong>
          <span dir="ltr">{product.title}</span>
          <span
            className={originalPrice ? "watches-page__price watches-page__price--sale" : "watches-page__price"}
            dir="ltr"
          >
            {originalPrice ? <small>{originalPrice}</small> : null}
            <b>{currentPrice || "عرض التفاصيل"}</b>
          </span>
        </div>
      </StorefrontLink>
    </article>
  );
};

export function LuxeFullCatalogPage({
  brandSlug = "",
  kind,
  profile,
}: LuxeFullCatalogPageProps) {
  const fallbackBrand = normalizedBrandName(brandSlug) || "العلامة التجارية";
  const baseCopy = kind === "brand"
    ? {
        className: "watches-page--curated watches-page--brand",
        empty: `لا توجد منتجات متاحة من ${fallbackBrand} حالياً.`,
        heroImage: "/assets/luxe-full/customer-assets/home-hero-light-accessories.webp",
        heroLead: "اكتشف منتجات",
        heroMark: "مجموعة",
        heroPrimary: fallbackBrand,
        heroSecondary: "BRAND COLLECTION",
        heroTitle: fallbackBrand,
        pageTitle: fallbackBrand,
      }
    : listingCopy[kind];
  const [products, setProducts] = useState<StorefrontProductCardDto[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [activePanel, setActivePanel] = useState<"filter" | "sort" | null>(null);
  const [brand, setBrand] = useState("all");
  const [priceBand, setPriceBand] = useState<PriceBand>("all");
  const [sortMode, setSortMode] = useState<SortMode>("featured");
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { cart, restoring } = useCart();
  const cartCount = cart?.items.reduce((total, item) => total + item.quantity, 0) ?? 0;

  useEffect(() => {
    document.title = `${baseCopy.pageTitle} | ${profile.name}`;
  }, [baseCopy.pageTitle, profile.name]);

  useEffect(() => {
    const controller = new AbortController();
    setStatus("loading");
    setProducts([]);
    void fetchStorefrontCatalog({
      limit: 24,
      offset: 0,
      order: "-created_at",
      signal: controller.signal,
    })
      .then((result) => {
        const scoped = result.products.filter((product) =>
          listingProductFilter(product, kind, brandSlug),
        );
        setProducts(scoped);
        setStatus("ready");
      })
      .catch((error: unknown) => {
        if (isStorefrontApiError(error) && error.code === "aborted") return;
        setStatus("error");
      });
    return () => controller.abort();
  }, [brandSlug, kind, profile]);

  const brandOptions = useMemo(
    () => [
      "all",
      ...Array.from(
        new Set(products.map((product) => product.brand).filter((value): value is string => Boolean(value))),
      ),
    ],
    [products],
  );

  const visibleProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("ar");
    const next = products.filter((product) => {
      if (brand !== "all" && product.brand !== brand) return false;
      if (!priceInBand(product, priceBand)) return false;
      if (!normalizedSearch) return true;
      return `${product.title} ${product.subtitle ?? ""} ${product.brand ?? ""}`
        .toLocaleLowerCase("ar")
        .includes(normalizedSearch);
    });

    return next.sort((left, right) => {
      if (sortMode === "title") return left.title.localeCompare(right.title, "ar");
      if (sortMode === "price-asc") {
        return (left.price_lyd ?? Number.MAX_SAFE_INTEGER) - (right.price_lyd ?? Number.MAX_SAFE_INTEGER);
      }
      if (sortMode === "price-desc") return (right.price_lyd ?? -1) - (left.price_lyd ?? -1);
      return 0;
    });
  }, [brand, priceBand, products, search, sortMode]);

  const pageClassName = ["watches-page", baseCopy.className].filter(Boolean).join(" ");
  const hasFilters = brand !== "all" || priceBand !== "all";

  return (
    <section className={pageClassName}>
      <div className="watches-page__phone-shell">
        <header className="watches-page__top" aria-label="شريط الصفحة">
          <div className="watches-page__header">
            <StorefrontLink
              className="watches-page__icon-button watches-page__back"
              to="/favorites"
              ariaLabel="المفضلة"
            >
              <HeartIcon />
            </StorefrontLink>
            <h1>{baseCopy.pageTitle}</h1>
            <div className="watches-page__header-actions">
              <button
                className="watches-page__icon-button"
                type="button"
                aria-label="بحث"
                aria-expanded={searchOpen}
                onClick={() => setSearchOpen((current) => !current)}
              >
                <SearchIcon />
              </button>
              <StorefrontLink
                className="watches-page__icon-button watches-page__cart-button"
                to="/cart"
                ariaLabel="السلة"
              >
                <CartIcon />
                <span>{restoring ? "…" : cartCount}</span>
              </StorefrontLink>
            </div>
          </div>
        </header>

        {searchOpen ? (
          <form
            className="luxe-full-listing-search"
            role="search"
            onSubmit={(event) => event.preventDefault()}
          >
            <SearchIcon />
            <input
              autoFocus
              type="search"
              value={search}
              placeholder="ابحث في المنتجات"
              aria-label="ابحث في المنتجات"
              onChange={(event) => setSearch(event.target.value)}
            />
            <button type="button" onClick={() => { setSearch(""); setSearchOpen(false); }}>
              إغلاق
            </button>
          </form>
        ) : null}

        <section className="watches-page__hero" aria-label={`تشكيلة ${baseCopy.pageTitle}`}>
          {baseCopy.heroImage ? (
            <img className="watches-page__hero-image" src={baseCopy.heroImage} alt="" aria-hidden="true" />
          ) : kind === "watches" ? (
            <video className="watches-page__hero-video" autoPlay muted loop playsInline preload="metadata" aria-hidden="true">
              <source src="/assets/luxe-full/product-assets/vid.mp4" type="video/mp4" />
            </video>
          ) : null}
          <div className="watches-page__hero-copy">
            <strong>{baseCopy.heroPrimary}</strong>
            <span>{baseCopy.heroSecondary}</span>
            <p>{baseCopy.heroLead}</p>
            {baseCopy.heroTitle ? (
              <h2>
                {baseCopy.heroMark ? <mark>{baseCopy.heroMark}</mark> : null}
                <span>{baseCopy.heroTitle}</span>
              </h2>
            ) : null}
          </div>
        </section>

        <section
          className={activePanel ? "watches-page__controls watches-page__controls--open" : "watches-page__controls"}
          aria-label="أدوات المنتجات"
        >
          <button
            className={activePanel === "filter" || hasFilters ? "is-active" : undefined}
            type="button"
            aria-expanded={activePanel === "filter"}
            onClick={() => setActivePanel((current) => current === "filter" ? null : "filter")}
          >
            <span>تصفية</span>
            <SlidersIcon />
            <DownChevron />
          </button>
          <i aria-hidden="true" />
          <button
            className={activePanel === "sort" || sortMode !== "featured" ? "is-active" : undefined}
            type="button"
            aria-expanded={activePanel === "sort"}
            onClick={() => setActivePanel((current) => current === "sort" ? null : "sort")}
          >
            <span>ترتيب</span>
            <SlidersIcon />
            <DownChevron />
          </button>

          {activePanel ? (
            <div
              className={`watches-page__tools-dropdown watches-page__tools-dropdown--${activePanel}`}
              role="menu"
            >
              <div className="watches-page__tools-title">
                <strong>{activePanel === "filter" ? "تصفية المنتجات" : "ترتيب المنتجات"}</strong>
                <button
                  type="button"
                  onClick={() => {
                    setBrand("all");
                    setPriceBand("all");
                    setSortMode("featured");
                  }}
                >
                  إعادة ضبط
                </button>
              </div>
              {activePanel === "filter" ? (
                <>
                  <div className="watches-page__filter-row">
                    <strong>العلامة</strong>
                    <div className="watches-page__filter-options">
                      {brandOptions.map((option) => (
                        <button
                          className={`watches-page__filter-option${brand === option ? " is-selected" : ""}`}
                          key={option}
                          type="button"
                          role="menuitemradio"
                          aria-checked={brand === option}
                          onClick={() => setBrand(option)}
                        >
                          <span>{option === "all" ? "الكل" : option}</span>
                          {brand === option ? <CheckIcon /> : null}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="watches-page__filter-row">
                    <strong>السعر</strong>
                    <div className="watches-page__filter-options">
                      {([
                        ["all", "كل الأسعار"],
                        ["under-1000", "أقل من 1,000"],
                        ["1000-2500", "1,000 - 2,500"],
                        ["over-2500", "أكثر من 2,500"],
                      ] as const).map(([value, label]) => (
                        <button
                          className={`watches-page__filter-option${priceBand === value ? " is-selected" : ""}`}
                          key={value}
                          type="button"
                          role="menuitemradio"
                          aria-checked={priceBand === value}
                          onClick={() => setPriceBand(value)}
                        >
                          <span>{label}</span>
                          {priceBand === value ? <CheckIcon /> : null}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="watches-page__filter-row watches-page__filter-row--sort">
                  <div className="watches-page__filter-options">
                    {([
                      ["featured", "المميز"],
                      ["title", "الاسم"],
                      ["price-asc", "السعر: الأقل أولاً"],
                      ["price-desc", "السعر: الأعلى أولاً"],
                    ] as const).map(([value, label]) => (
                      <button
                        className={`watches-page__filter-option${sortMode === value ? " is-selected" : ""}`}
                        key={value}
                        type="button"
                        role="menuitemradio"
                        aria-checked={sortMode === value}
                        onClick={() => { setSortMode(value); setActivePanel(null); }}
                      >
                        <span>{label}</span>
                        {sortMode === value ? <CheckIcon /> : null}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="watches-page__tools-footer">
                <span>{visibleProducts.length.toLocaleString("en-US")} منتج</span>
                <button type="button" onClick={() => setActivePanel(null)}>تم</button>
              </div>
            </div>
          ) : null}
        </section>

        <section className="watches-page__grid watches-page__grid--ready" aria-label={`منتجات ${baseCopy.pageTitle}`} aria-busy={status === "loading"}>
          {status === "loading" ? (
            Array.from({ length: 4 }, (_, index) => (
              <article className="watches-page__product watches-page__product--skeleton" key={index} aria-hidden="true">
                <span className="watches-page__favorite watches-page__favorite--skeleton" />
                <div className="watches-page__product-image watches-page__product-image--skeleton" />
                <div className="watches-page__product-copy watches-page__product-copy--skeleton">
                  <span className="watches-page__copy-skeleton watches-page__copy-skeleton--brand" />
                  <span className="watches-page__copy-skeleton watches-page__copy-skeleton--name" />
                  <span className="watches-page__copy-skeleton watches-page__copy-skeleton--price" />
                </div>
              </article>
            ))
          ) : status === "error" || visibleProducts.length === 0 ? (
            <article className="watches-page__empty">
              <strong>{status === "error" ? "تعذر تحميل المنتجات" : "لا توجد منتجات متاحة"}</strong>
              <span>{status === "error" ? "تحقق من اتصال الخادم ثم أعد المحاولة." : baseCopy.empty}</span>
            </article>
          ) : (
            visibleProducts.map((product, index) => (
              <LuxeFullProductCard index={index} key={product.handle} product={product} />
            ))
          )}
        </section>
      </div>
      <LuxeFullBottomNavigation profile={profile} />
    </section>
  );
}
