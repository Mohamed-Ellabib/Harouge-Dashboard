import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import {
  fetchStorefrontCatalog,
  isStorefrontApiError,
} from "../../api/storefront-api";
import { isStorefrontEditorPreviewEnabled } from "../../config";
import {
  CloseIcon,
  PackageIcon,
  SearchIcon,
  ShieldCheckIcon,
  StorefrontBenefitIcon,
} from "../../components/Icons";
import {
  localizedStorefrontText,
  storefrontDirection,
  storefrontUiText,
} from "../../lib/localization";
import { navigate, StorefrontLink } from "../../lib/navigation";
import type {
  ConfiguredStorefrontProfileDto,
  StorefrontHeroBenefitDto,
  StorefrontLocale,
  StorefrontPublishedConfigurationDto,
  StorefrontProductCardDto,
} from "../../types";
import { LuxeFullProductCard } from "./LuxeFullCatalogPage";
import { LuxeFullBottomNavigation } from "./LuxeFullBottomNavigation";
import { LuxeFullStoreHeader } from "./LuxeFullStoreHeader";

/*
 * These are the canonical styles shipped by the supplied Al-Sanousi
 * storefront. This component is loaded lazily, so the legacy global sheet is
 * present only for the separately keyed full-source template.
 */
import "./reference-source/src/index.css";
import "./reference-source/src/pages/storefront/WatchesPage.css";
import "./reference-source/src/pages/storefront/HomePageHero.css";
import "./reference-source/src/components/storefront/StorefrontPromoEntry.css";
import "./reference-source/src/components/storefront/StorefrontSearchPanel.css";
import "./LuxeFullHomeRuntime.css";

type HomeStatus = "loading" | "ready" | "error";
type ProductCollection = "all" | "sunglasses" | "watches" | "pens";

const HERO_SLIDE_INTERVAL_MS = 5_200;
const PROMO_EXIT_DURATION_MS = 760;

const brandLogoClass = (slug: string): string | undefined => ({
  hugo: "customer-home__brand-logo--hugo",
  "michael-kors": "customer-home__brand-logo--mk",
  "just-cavalli": "customer-home__brand-logo--just",
  cavalli: "customer-home__brand-logo--cavalli",
  fossil: "customer-home__brand-logo--fossil",
  "emporio-armani": "customer-home__brand-logo--armani",
  timberland: "customer-home__brand-logo--timberland",
  lacoste: "customer-home__brand-logo--lacoste",
})[slug];

const money = (amount: number | null | undefined): string =>
  typeof amount === "number" && Number.isFinite(amount)
    ? `LYD ${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(amount)}`
    : "";

const lowerProductText = (product: StorefrontProductCardDto): string =>
  `${product.handle} ${product.title} ${product.subtitle ?? ""} ${product.brand ?? ""}`.toLocaleLowerCase();

const productCollection = (product: StorefrontProductCardDto): Exclude<ProductCollection, "all"> => {
  const value = lowerProductText(product);
  if (/sunglass|eyewear|نظار/.test(value)) return "sunglasses";
  if (/\bpen\b|ballpoint|rollerball|fountain|قلم|أقلام/.test(value)) return "pens";
  return "watches";
};

const splitHeroHeading = (
  heading: string,
  english: boolean,
): [string, string] => {
  if (english) {
    const match = heading.match(/^(.*?)(\s+(?:your\s+)?first\s+order)$/i);
    if (match) return [match[1].trim(), match[2].trim()];
  } else {
    const marker = heading.search(/\s+ل[أا]ول\s+/);
    if (marker > 0) return [heading.slice(0, marker).trim(), heading.slice(marker).trim()];
  }

  const words = heading.trim().split(/\s+/);
  const splitAt = Math.max(1, Math.ceil(words.length * 0.62));
  return [words.slice(0, splitAt).join(" "), words.slice(splitAt).join(" ")];
};

const SparklesIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
    <path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3ZM18.5 14l.7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7.7-2.3Z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const MailIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m4 7 8 6 8-6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const PhoneIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <path d="M7 3H4.8A1.8 1.8 0 0 0 3 4.8C3 13.75 10.25 21 19.2 21A1.8 1.8 0 0 0 21 19.2V17l-4.2-1.4-1.1 2.1a14.4 14.4 0 0 1-9.4-9.4l2.1-1.1L7 3Z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const MapPinIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
);

const safeTelHref = (phone: string): string =>
  `tel:${phone.replace(/[^+\d]/g, "")}`;

export const LuxeFullHeroBenefits = ({
  benefits,
  locale,
}: {
  benefits: StorefrontHeroBenefitDto[];
  locale: StorefrontLocale;
}) => {
  if (!benefits.length) return null;
  return (
    <section className="customer-hero-trust" aria-label={storefrontUiText(locale, { ar: "مميزات المتجر", en: "Store benefits" })}>
      <div className="customer-home__lane customer-hero-trust__grid" style={{ "--hero-trust-count": Math.min(benefits.length, 4) } as CSSProperties}>
        {benefits.map((item) => <div className="customer-hero-trust__item" key={item.id}><StorefrontBenefitIcon icon={item.icon} /><b>{localizedStorefrontText(item.title, locale)}</b><small>{localizedStorefrontText(item.subtitle, locale)}</small></div>)}
      </div>
    </section>
  );
};

export const LuxeFullBrands = ({
  brands,
  locale,
}: {
  brands: StorefrontPublishedConfigurationDto["content"]["brands"];
  locale: StorefrontLocale;
}) => {
  if (!brands.items.length) return null;
  const ui = (ar: string, en: string) => storefrontUiText(locale, { ar, en });
  return (
    <section className="customer-brands" id="brands" aria-labelledby="customer-brands-title">
      <div className="customer-home__lane customer-brands__inner">
        <h2 id="customer-brands-title">{localizedStorefrontText(brands.heading, locale)}</h2>
        <p>{localizedStorefrontText(brands.subheading, locale)}</p>
      </div>
      <div className="customer-brands__mob-header customer-home__lane"><h2>{localizedStorefrontText(brands.heading, locale)}</h2></div>
      <div className="customer-brands__marquee">
        <div className="customer-brands__track" style={{ "--customer-brand-count": brands.items.length } as CSSProperties}>
          {[...brands.items, ...brands.items, ...brands.items].map((brand, index) => {
            const name = localizedStorefrontText(brand.name, locale);
            return <StorefrontLink className="customer-brands__card" to={`/brands/${brand.slug}`} ariaLabel={ui(`عرض منتجات ${name}`, `View ${name} products`)} key={`${brand.id}-${index}`}>
              {brand.image_url ? <img data-glow-edit={`category.${brand.slug}.image`} src={brand.image_url} alt="" loading="lazy" /> : <strong data-glow-edit={`category.${brand.slug}.name`} className={brandLogoClass(brand.slug)}>{name}</strong>}
            </StorefrontLink>;
          })}
        </div>
      </div>
    </section>
  );
};

const LuxeFullPromoEntry = ({
  profile,
}: {
  profile: ConfiguredStorefrontProfileDto;
}) => {
  const key = `labibtech:luxe-full-promo:v1:${profile.handle}`;
  const [visible, setVisible] = useState(() => {
    if (isStorefrontEditorPreviewEnabled()) return false;
    try {
      return window.sessionStorage.getItem(key) !== "1";
    } catch {
      return true;
    }
  });
  const [leaving, setLeaving] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!visible) return;
    const root = document.documentElement;
    const body = document.body;
    const scrollY = window.scrollY;
    const previous = {
      bodyOverflow: body.style.overflow,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyWidth: body.style.width,
      rootOverflow: root.style.overflow,
    };
    root.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";

    return () => {
      root.style.overflow = previous.rootOverflow;
      body.style.overflow = previous.bodyOverflow;
      body.style.position = previous.bodyPosition;
      body.style.top = previous.bodyTop;
      body.style.width = previous.bodyWidth;
      window.scrollTo(0, scrollY);
    };
  }, [visible]);

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
  }, []);

  if (!visible || isStorefrontEditorPreviewEnabled()) return null;

  const leave = (destination: string) => {
    if (leaving) return;
    setLeaving(true);
    try {
      window.sessionStorage.setItem(key, "1");
    } catch {
      // The entry still closes if browser storage is unavailable.
    }
    timerRef.current = window.setTimeout(() => {
      setVisible(false);
      if (destination !== "/store") navigate(destination);
    }, PROMO_EXIT_DURATION_MS);
  };

  return (
    <section
      className={`storefront-promo${leaving ? " storefront-promo--leaving" : ""}`}
      aria-label={storefrontUiText(profile.locale, {
        ar: `مرحباً بكم في ${profile.name}`,
        en: `Welcome to ${profile.name}`,
      })}
      dir={storefrontDirection(profile.locale)}
    >
      <div className="storefront-promo__ambient" aria-hidden="true" />
      <div className="storefront-promo__canvas">
        <picture className="storefront-promo__picture" aria-hidden="true">
          <source srcSet="/customer-assets/storefront-promo-bg.webp" type="image/webp" />
          <img src="/customer-assets/storefront-promo-bg.png" alt="" />
        </picture>
        <div className="storefront-promo__shade" aria-hidden="true" />
        <div className="storefront-promo__content">
          <header className="storefront-promo__brand">
            <img
              className="storefront-promo__logo"
              src={profile.branding.logo_url ?? "/customer-assets/store-header-logo.png"}
              alt={profile.name}
            />
          </header>
          <div className="storefront-promo__message">
            <p>{localizedStorefrontText(profile.storefront.content.hero.subheading, profile.locale)}</p>
          </div>
          <div className="storefront-promo__actions">
            <button className="storefront-promo__primary" type="button" onClick={() => leave("/store")}>
              <SparklesIcon />
              <span>{storefrontUiText(profile.locale, { ar: "استكشف المنتجات", en: "Explore products" })}</span>
            </button>
            <button className="storefront-promo__signin" type="button" onClick={() => leave("/account")}>
              {storefrontUiText(profile.locale, { ar: "تسجيل الدخول", en: "Sign in" })}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

const LuxeFullHomeSearch = ({
  onClose,
  products,
  profile,
}: {
  onClose: () => void;
  products: StorefrontProductCardDto[];
  profile: ConfiguredStorefrontProfileDto;
}) => {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const tags = profile.locale === "en-LY"
    ? ["All", "Watches", "Sunglasses", "Pens", "HUGO", "Leather", "Gold", "Black"]
    : ["الكل", "ساعات", "نظارات", "أقلام", "HUGO", "جلد", "ذهبي", "أسود"];

  useEffect(() => {
    inputRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const results = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return (normalized
      ? products.filter((product) => lowerProductText(product).includes(normalized))
      : products
    ).slice(0, normalized ? 12 : 8);
  }, [products, query]);

  const suggestedLabel = query.trim()
    ? storefrontUiText(profile.locale, { ar: `${results.length} نتيجة`, en: `${results.length} results` })
    : storefrontUiText(profile.locale, { ar: "منتجات مقترحة", en: "Suggested products" });

  return (
    <section className="storefront-search" aria-label={storefrontUiText(profile.locale, { ar: "بحث المنتجات", en: "Product search" })} role="dialog" aria-modal="true">
      <button className="storefront-search__backdrop" type="button" aria-label={storefrontUiText(profile.locale, { ar: "إغلاق البحث", en: "Close search" })} onClick={onClose} />
      <div className="storefront-search__shell">
        <header className="storefront-search__top">
          <div className="storefront-search__title"><strong>{storefrontUiText(profile.locale, { ar: "البحث في المتجر", en: "Search the store" })}</strong></div>
          <button className="storefront-search__close" type="button" aria-label={storefrontUiText(profile.locale, { ar: "إغلاق", en: "Close" })} onClick={onClose}><CloseIcon /></button>
        </header>
        <div className="storefront-search__command">
          <SearchIcon />
          <input
            ref={inputRef}
            type="search"
            value={query}
            placeholder={storefrontUiText(profile.locale, { ar: "ابحث عن منتج", en: "Search for a product" })}
            aria-label={storefrontUiText(profile.locale, { ar: "بحث باسم المنتج", en: "Search by product name" })}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query ? (
            <button className="storefront-search__clear" type="button" aria-label={storefrontUiText(profile.locale, { ar: "مسح البحث", en: "Clear search" })} onClick={() => setQuery("")}><CloseIcon /></button>
          ) : <span className="storefront-search__command-status">{suggestedLabel}</span>}
        </div>
        <div className="storefront-search__tags" aria-label={storefrontUiText(profile.locale, { ar: "اقتراحات بحث سريعة", en: "Quick search suggestions" })}>
          {tags.map((tag, index) => {
            const value = index === 0 ? "" : tag;
            return <button className={query === value ? "is-active" : undefined} type="button" key={tag} aria-pressed={query === value} onClick={() => setQuery(value)}>{tag}</button>;
          })}
        </div>
        <div className="storefront-search__main">
          <div className="storefront-search__status" aria-live="polite">
            <span>{suggestedLabel}</span>
            <small>{storefrontUiText(profile.locale, { ar: "منتجات من المتجر", en: "Products from this store" })}</small>
          </div>
          {results.length ? (
            <div className="storefront-search__grid">
              {results.map((product, index) => (
                <StorefrontLink
                  className="storefront-search__product"
                  to={`/products/${encodeURIComponent(product.handle)}`}
                  key={product.handle}
                  onNavigate={onClose}
                >
                  <span className="storefront-search__media">
                    {product.thumbnail_url ? <img src={product.thumbnail_url} alt="" /> : <PackageIcon />}
                  </span>
                  <span className="storefront-search__product-body">
                    <small>{product.brand || profile.name}</small>
                    <strong>{product.title}</strong>
                    <span className="storefront-search__product-footer">
                      <b dir="ltr">{money(product.price_lyd) || storefrontUiText(profile.locale, { ar: "عرض التفاصيل", en: "View details" })}</b>
                    </span>
                  </span>
                </StorefrontLink>
              ))}
            </div>
          ) : (
            <div className="storefront-search__empty">
              <PackageIcon />
              <strong>{storefrontUiText(profile.locale, { ar: "لا توجد نتائج", en: "No results" })}</strong>
              <span>{storefrontUiText(profile.locale, { ar: "جرّب كتابة اسم منتج مختلف.", en: "Try another product name." })}</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

const FooterSection = ({ children, className, label }: { children: ReactNode; className: string; label: string }) => (
  <section className={className} aria-label={label}>{children}</section>
);

export const LuxeFullHomePage = ({
  profile,
}: {
  profile: ConfiguredStorefrontProfileDto;
}) => {
  const [products, setProducts] = useState<StorefrontProductCardDto[]>([]);
  const [status, setStatus] = useState<HomeStatus>("loading");
  const [activeCollection, setActiveCollection] = useState<ProductCollection>("all");
  const [activeSlide, setActiveSlide] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const english = profile.locale === "en-LY";
  const ui = (ar: string, en: string) => storefrontUiText(profile.locale, { ar, en });
  const hero = profile.storefront.content.hero;
  const heroHeading = localizedStorefrontText(hero.heading, profile.locale);
  const [heroPrimary, heroSecondary] = splitHeroHeading(heroHeading, english);

  const heroSlides = useMemo(() => {
    const configured = hero.slides.filter((slide) => slide.enabled);
    if (configured.length) return configured;
    return Array.from(new Set([
      hero.image_url ?? "/assets/luxe-full/customer-assets/home-hero-light-lifestyle.webp",
      "/assets/luxe-full/customer-assets/home-hero-light-watch.webp",
      "/assets/luxe-full/customer-assets/home-hero-light-accessories.webp",
    ])).map((imageUrl, index) => ({
      id: `legacy-hero-slide-${index + 1}`,
      image_url: imageUrl,
      alt: { ar: `صورة الواجهة ${index + 1}`, en: `Hero image ${index + 1}` },
      enabled: true,
    }));
  }, [hero.image_url, hero.slides]);

  const heroButtons = useMemo(() => {
    const configured = hero.buttons.filter((button) => button.enabled);
    if (configured.length) return configured;
    return [{
      id: "legacy-hero-button",
      label: hero.cta_label,
      href: hero.cta_target === "contact" ? "#contact" : "/best-sellers",
      background_color: "#b77f3f",
      text_color: "#ffffff",
      style: "solid" as const,
      enabled: true,
    }];
  }, [hero.buttons, hero.cta_label, hero.cta_target]);

  useEffect(() => {
    document.title = `${profile.name} | ${ui("الرئيسية", "Home")}`;
  }, [profile.name, profile.locale]);

  useEffect(() => {
    const controller = new AbortController();
    setStatus("loading");
    void fetchStorefrontCatalog({ limit: 24, offset: 0, order: "created_at", signal: controller.signal })
      .then((catalog) => {
        setProducts(catalog.products);
        setStatus("ready");
      })
      .catch((error: unknown) => {
        if (isStorefrontApiError(error) && error.code === "aborted") return;
        setStatus("error");
      });
    return () => controller.abort();
  }, [profile]);

  useEffect(() => {
    if (heroSlides.length < 2) return;
    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % heroSlides.length);
    }, HERO_SLIDE_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [heroSlides.length]);

  const discountedProducts = useMemo(
    () => products
      .filter((product) => typeof product.compare_at_price_lyd === "number")
      .sort((left, right) => {
        const order = { watches: 0, sunglasses: 1, pens: 2 } as const;
        return order[productCollection(left)] - order[productCollection(right)];
      })
      .slice(0, 6),
    [products],
  );
  const featuredProducts = useMemo(() => {
    const preferred = [...products].sort((left, right) => {
      const leftBest = /الأكثر|best/i.test(left.badge ?? "") ? 1 : 0;
      const rightBest = /الأكثر|best/i.test(right.badge ?? "") ? 1 : 0;
      return rightBest - leftBest;
    });
    return (activeCollection === "all"
      ? preferred
      : preferred.filter((product) => productCollection(product) === activeCollection)
    ).slice(0, 6);
  }, [activeCollection, products]);

  const tabs: Array<{ value: ProductCollection; label: string }> = [
    { value: "all", label: ui("عرض الكل", "View all") },
    { value: "sunglasses", label: ui("نظارات", "Eyewear") },
    { value: "watches", label: ui("ساعات", "Watches") },
    { value: "pens", label: ui("أقلام", "Pens") },
  ];

  const trustItems = profile.storefront.content.hero.benefits ?? [];
  const brands = profile.storefront.content.brands;

  const phone = profile.contact.public_phone;
  const email = profile.contact.public_email;
  const whatsapp = profile.contact.whatsapp_number;
  const about = profile.storefront.content.about;
  const aboutTitle = localizedStorefrontText(about.title, profile.locale);
  const aboutBody = localizedStorefrontText(about.body, profile.locale);
  const logo = profile.branding.logo_url ?? "/customer-assets/store-header-logo.png";

  return (
    <>
      <LuxeFullPromoEntry profile={profile} />

      <LuxeFullStoreHeader profile={profile} pathname="/store" onSearch={() => setSearchOpen(true)} />

      <section className="customer-hero" aria-label={ui("واجهة المتجر", "Store hero")}>
        <div className="customer-hero__slides" aria-hidden="true">
          {heroSlides.map((slide, index) => (
            <div
              data-glow-edit="hero.image"
              className={`customer-hero__slide${index === activeSlide ? " is-active" : ""}`}
              key={slide.id}
              role="img"
              aria-label={localizedStorefrontText(slide.alt, profile.locale)}
              style={{ backgroundImage: `url("${slide.image_url}")` }}
            />
          ))}
        </div>
        <div className="customer-home__lane customer-hero__inner">
          <div className="customer-hero__copy">
            <h1 id="customer-hero-title" data-glow-edit="hero.heading">
              <span data-glow-edit="hero.eyebrow">{localizedStorefrontText(hero.eyebrow, profile.locale)}</span>
              <strong>{heroPrimary}</strong>
              {heroSecondary ? <strong>{heroSecondary}</strong> : null}
            </h1>
            <p data-glow-edit="hero.subheading">{localizedStorefrontText(hero.subheading, profile.locale)}</p>
            <div className="customer-hero__actions" style={{ "--hero-action-count": Math.min(heroButtons.length, 3) } as CSSProperties}>
              {heroButtons.map((button) => {
                const className = `customer-button customer-button--hero customer-button--hero-${button.style}`;
                const style = {
                  "--hero-button-background": button.background_color,
                  "--hero-button-text": button.text_color,
                } as CSSProperties;
                const label = localizedStorefrontText(button.label, profile.locale);
                return button.href.startsWith("#") || button.href.startsWith("https://")
                  ? <a className={className} href={button.href} key={button.id} style={style}><span data-glow-edit="hero.cta_label">{label}</span></a>
                  : <StorefrontLink className={className} key={button.id} style={style} to={button.href}><span data-glow-edit="hero.cta_label">{label}</span></StorefrontLink>;
              })}
            </div>
          </div>
          {heroSlides.length > 1 ? (
            <div className="customer-hero__dots" aria-label={ui("صور الواجهة", "Hero images")}>
              {heroSlides.map((slide, index) => <button aria-label={ui(`عرض الصورة ${index + 1}`, `Show image ${index + 1}`)} className={index === activeSlide ? "is-active" : undefined} key={slide.id} onClick={() => setActiveSlide(index)} type="button" />)}
            </div>
          ) : null}
        </div>
      </section>

      <LuxeFullHeroBenefits benefits={trustItems} locale={profile.locale} />

      {brands ? <LuxeFullBrands brands={brands} locale={profile.locale} /> : null}

      <section className="customer-shop" aria-label={ui("منتجات المتجر", "Store products")}>
        <div className="customer-home__lane">
          <section className="customer-categories" aria-labelledby="customer-categories-title">
            <h2 id="customer-categories-title">{ui("تسوق حسب الفئة", "Shop by category")}</h2>
            <div className="customer-categories__grid">
              <StorefrontLink className="customer-category customer-category--sunglasses" to="/sunglasses">
                <img src="/assets/luxe-full/customer-assets/category-sunglasses.webp" alt="" />
                <span><strong>{ui("نظارات", "Eyewear")}</strong><small>{ui("تصاميم عصرية", "Modern designs")}</small><small>{ui("تناسب أسلوبك", "Made for your style")}</small><em>{ui("تسوق الآن", "Shop now")}</em></span>
              </StorefrontLink>
              <StorefrontLink className="customer-category customer-category--watches" to="/watches">
                <img src="/assets/luxe-full/customer-assets/category-watch.webp" alt="" />
                <span><strong>{ui("ساعات", "Watches")}</strong><small>{ui("دقة في الوقت", "Precision in time")}</small><small>{ui("وتميز في الأسلوب", "Distinctive in style")}</small><em>{ui("تسوق الآن", "Shop now")}</em></span>
              </StorefrontLink>
            </div>
          </section>

          {discountedProducts.length ? (
            <section className="customer-products customer-products--offers" id="discount-offers" aria-labelledby="customer-discount-products-title">
              <div className="customer-products__section-heading">
                <StorefrontLink className="customer-products__view-all" to="/offers">{ui("عرض الكل", "View all")}</StorefrontLink>
                <h2 id="customer-discount-products-title">{ui("العروض المخفضة", "Sale offers")}</h2>
              </div>
              <div className="customer-products__grid">
                {discountedProducts.map((product, index) => <LuxeFullProductCard index={index} key={`offer-${product.handle}`} product={product} />)}
              </div>
            </section>
          ) : null}

          <section className="customer-products" id="products" aria-labelledby="customer-products-title">
            <div className="customer-products__tabs" aria-label={ui("تصنيفات المنتجات", "Product categories")}>
              {tabs.map((tab) => <button className={activeCollection === tab.value ? "is-active" : undefined} type="button" onClick={() => setActiveCollection(tab.value)} key={tab.value}>{tab.label}</button>)}
            </div>
            <div className="customer-products__mob-header">
              <StorefrontLink className="customer-products__view-all" to="/best-sellers">{ui("عرض الكل", "View all")}</StorefrontLink>
              <h2 id="customer-products-title">{ui("الأكثر طلباً", "Best sellers")}</h2>
            </div>
            <div className="customer-products__grid" aria-busy={status === "loading"}>
              {status === "loading" ? <article className="customer-products__loading" role="status"><span>{ui("جاري تحميل المنتجات", "Loading products")}</span></article> : null}
              {status !== "loading" && featuredProducts.length === 0 ? (
                <article className="customer-products__empty"><strong>{status === "error" ? ui("تعذر تحميل المنتجات", "Products could not be loaded") : ui("لا توجد منتجات متاحة", "No products available")}</strong><span>{status === "error" ? ui("تحقق من اتصال الخادم ثم أعد المحاولة.", "Check the server and try again.") : ui("ستظهر المنتجات هنا عند إضافتها من لوحة التحكم.", "Products will appear here after they are added.")}</span></article>
              ) : featuredProducts.map((product, index) => <LuxeFullProductCard index={index} key={product.handle} product={product} />)}
            </div>
          </section>

          <section className="customer-auth" id="about" aria-labelledby="customer-auth-title">
            <img src="/assets/luxe-full/customer-assets/auth-watch-back.webp" alt="" />
            <div><h2 id="customer-auth-title">{aboutTitle}</h2><h3>{ui("تسوق بثقة وطمأنينة", "Shop with confidence")}</h3><p>{aboutBody}</p></div>
          </section>
        </div>
      </section>

      <footer className="customer-footer" id="contact">
        <div className="customer-home__lane customer-footer__grid">
          <FooterSection className="customer-footer__brand" label={ui(`عن ${profile.name}`, `About ${profile.name}`)}>
            <StorefrontLink className="customer-footer__brand-home" to="/store" ariaLabel={ui(`${profile.name} - الرئيسية`, `${profile.name} - Home`)}><img className="customer-footer__brand-logo" src={logo} alt={profile.name} loading="lazy" /></StorefrontLink>
            <StorefrontLink className="customer-footer__about-link" to="/about">{ui("تعرف على قصتنا", "Discover our story")}<span aria-hidden="true">←</span></StorefrontLink>
            <p>{aboutBody}</p>
            {whatsapp || email || phone ? (
              <div>
                {whatsapp ? <a href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" aria-label="WhatsApp">w</a> : null}
                {email ? <a href={`mailto:${email}`} aria-label={ui("البريد الإلكتروني", "Email")}>@</a> : null}
                {phone ? <a href={safeTelHref(phone)} aria-label={ui("الهاتف", "Phone")}><PhoneIcon /></a> : null}
              </div>
            ) : null}
          </FooterSection>
          <FooterSection className="customer-footer__nav" label={ui("روابط سريعة", "Quick links")}>
            <h2>{ui("روابط سريعة", "Quick links")}</h2>
            <StorefrontLink to="/store">{ui("الرئيسية", "Home")}</StorefrontLink>
            <StorefrontLink to="/watches">{ui("الساعات", "Watches")}</StorefrontLink>
            <StorefrontLink to="/sunglasses">{ui("النظارات", "Eyewear")}</StorefrontLink>
            <StorefrontLink to="/pens">{ui("الأقلام", "Pens")}</StorefrontLink>
            <a href="#contact">{ui("تواصل معنا", "Contact")}</a>
          </FooterSection>
          <FooterSection className="customer-footer__nav" label={ui("معلومات", "Information")}>
            <h2>{ui("معلومات", "Information")}</h2>
            <StorefrontLink to="/about">{ui("من نحن", "About")}</StorefrontLink>
            <StorefrontLink to="/privacy">{ui("سياسة الخصوصية", "Privacy policy")}</StorefrontLink>
            <StorefrontLink to="/terms">{ui("الشروط والأحكام", "Terms and conditions")}</StorefrontLink>
            <StorefrontLink to="/returns">{ui("سياسة الاسترجاع", "Returns policy")}</StorefrontLink>
            <StorefrontLink to="/account-deletion">{ui("حذف الحساب", "Account deletion")}</StorefrontLink>
          </FooterSection>
          <FooterSection className="customer-footer__contact" label={ui("تواصل معنا", "Contact us")}>
            <h2>{ui("تواصل معنا", "Contact us")}</h2>
            {phone ? <a href={safeTelHref(phone)} dir="ltr"><PhoneIcon />{phone}</a> : null}
            {email ? <a href={`mailto:${email}`} dir="ltr"><MailIcon />{email}</a> : null}
            <span><MapPinIcon />{ui("طرابلس - ليبيا", "Tripoli, Libya")}</span>
          </FooterSection>
        </div>
        <div className="customer-home__lane customer-footer__bottom">
          <p>{ui(`جميع الحقوق محفوظة © ${new Date().getFullYear()} ${profile.name}`, `© ${new Date().getFullYear()} ${profile.name}. All rights reserved.`)}</p>
          <nav className="customer-footer__legal" aria-label={ui("الروابط القانونية", "Legal links")}>
            <StorefrontLink to="/privacy">{ui("الخصوصية", "Privacy")}</StorefrontLink>
            <StorefrontLink to="/terms">{ui("الشروط", "Terms")}</StorefrontLink>
            <StorefrontLink to="/returns">{ui("الاسترجاع", "Returns")}</StorefrontLink>
            <StorefrontLink to="/account-deletion">{ui("حذف الحساب", "Account deletion")}</StorefrontLink>
          </nav>
        </div>
      </footer>

      <LuxeFullBottomNavigation profile={profile} />
      {searchOpen ? <LuxeFullHomeSearch onClose={() => setSearchOpen(false)} products={products} profile={profile} /> : null}
    </>
  );
};

export default LuxeFullHomePage;
