import { TemplateProfileContext } from "./templates/TemplateProfileContext";
import { urbxAppearanceStyle } from "./templates/urbx/urbx-appearance";
import { StoreOrdersPage } from "./pages/StoreOrdersPage";
import "./templates/template-runtime.css";
import { useGlowBeautyPalette } from "./templates/glow-beauty/GlowBeautyDesignEditor";
import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import {
  fetchStorefrontCommerceCapabilities,
  isStorefrontApiError,
  resolveStorefrontProfile,
} from "./api/storefront-api";
import { CartProvider } from "./commerce/CartContext";
import { FavoritesProvider } from "./commerce/FavoritesContext";
import { StoreFooter } from "./components/StoreFooter";
import { StoreHeader } from "./components/StoreHeader";
import { StatePanel } from "./components/StatePanel";
import { StorefrontTemplateRenderer } from "./components/StorefrontTemplateRenderer";
import { subscribeToStorefrontEditorPreview } from "./editor-preview";
import { isStorefrontEditorPreviewEnabled, isVisualPreviewEnabled } from "./config";
import { template6PreviewProducts } from "./templates/template-6/template-6-preview-data";
import Template6Navigation from "./templates/template-6/Template6Navigation";
import { StandardMobileNavigation } from "./templates/standard/StandardMobileNavigation";
import { GlowBeautyBottomNav } from "./templates/glow-beauty/GlowBeautyChrome";
import { getStorefrontEditorPreviewCommerceCapabilities, getStorefrontEditorPreviewProducts } from "./editor-preview-state";
import { storefrontUiText } from "./lib/localization";
import { StorefrontLink, useStorefrontLocation } from "./lib/navigation";
import {
  deriveStorefrontTheme,
  storefrontThemeCssVariables,
  storefrontTypographyCssVariables,
} from "./lib/theme";
import { CatalogPage } from "./pages/CatalogPage";
import { CartPage } from "./pages/CartPage";
import { CheckoutPage } from "./pages/CheckoutPage";
import { OrderConfirmationPage } from "./pages/OrderConfirmationPage";
import { ProductDetailPage } from "./pages/ProductDetailPage";
import { FavoritesPage } from "./pages/FavoritesPage";
import { AccountPage } from "./pages/AccountPage";
import {
  StoreContentPage,
  storeContentRouteForPath,
} from "./pages/StoreContentPage";
import {
  LuxeFullCatalogPage,
  type LuxeFullListingKind,
} from "./templates/luxe-commerce-full/LuxeFullCatalogPage";
import { LuxeFullCartPage } from "./templates/luxe-commerce-full/LuxeFullCartPage";
import { LuxeFullProductDetailPage } from "./templates/luxe-commerce-full/LuxeFullProductDetailPage";
import { LuxeFullFavoritesPage } from "./templates/luxe-commerce-full/LuxeFullFavoritesPage";
import { LuxeFullCheckoutPage } from "./templates/luxe-commerce-full/LuxeFullCheckoutPage";
import { LuxeFullAccountPage } from "./templates/luxe-commerce-full/LuxeFullAccountPage";
import { LuxeFullOrderConfirmationPage } from "./templates/luxe-commerce-full/LuxeFullOrderConfirmationPage";
import { LuxeFullContentPage } from "./templates/luxe-commerce-full/LuxeFullContentPage";
import { LuxeFullStoreHeader } from "./templates/luxe-commerce-full/LuxeFullStoreHeader";
import "./templates/standard/standard-mobile-system.css";
import type {
  ConfiguredStorefrontProfileDto,
  StorefrontCommerceCapabilitiesDto,
  StorefrontProfileDto,
} from "./types";

const LuxeFullHomePage = lazy(
  () => import("./templates/luxe-commerce-full/LuxeFullHomePage"),
);

const StandardMobileHomePage = lazy(
  () => import("./templates/standard/StandardMobileHomePage"),
);

const StandardProductDetailsPage = lazy(
  () => import("./templates/standard/StandardProductDetailsPage"),
);

const StandardCartPage = lazy(
  () => import("./templates/standard/StandardCartPage"),
);

const StandardFavoritesPage = lazy(
  () => import("./templates/standard/StandardFavoritesPage"),
);

const StandardCheckoutPage = lazy(
  () => import("./templates/standard/StandardCheckoutPage"),
);

const StandardOrderConfirmationPage = lazy(
  () => import("./templates/standard/StandardOrderConfirmationPage"),
);

const StandardOrderDetailsPage = lazy(
  () => import("./templates/standard/StandardOrderDetailsPage"),
);

const GlowBeautyHomePage = lazy(
  () => import("./templates/glow-beauty/GlowBeautyHomePage"),
);

const GlowBeautyCatalogPage = lazy(
  () => import("./templates/glow-beauty/GlowBeautyCatalogPage"),
);

const GlowBeautyProductDetailsPage = lazy(
  () => import("./templates/glow-beauty/GlowBeautyProductDetailsPage"),
);

const GlowBeautyCartPage = lazy(
  () => import("./templates/glow-beauty/GlowBeautyCartPage"),
);
const GlowBeautyCategoriesPage = lazy(() => import("./templates/glow-beauty/GlowBeautyCategoriesPage"));
const GlowBeautyOrdersPage = lazy(() => import("./templates/glow-beauty/GlowBeautyOrdersPage"));

const GlowBeautyWishlistPage = lazy(
  () => import("./templates/glow-beauty/GlowBeautyWishlistPage"),
);

const GlowBeautyCheckoutPage = lazy(
  () => import("./templates/glow-beauty/GlowBeautyCheckoutPage"),
);

const GlowBeautyOrderPlacedPage = lazy(
  () => import("./templates/glow-beauty/GlowBeautyOrderPlacedPage"),
);

const DropsHomePage = lazy(() => import("./templates/drops/DropsHomePage"));
const DropsCategoriesPage = lazy(() => import("./templates/drops/DropsCategoriesPage"));
const DropsProductDetailsPage = lazy(() => import("./templates/drops/DropsProductDetailsPage"));
const DropsCartPage = lazy(() => import("./templates/drops/DropsCartPage"));
const DropsOrderConfirmedPage = lazy(() => import("./templates/drops/DropsOrderConfirmedPage"));
const StandardCatalogPage = lazy(() => import("./templates/standard/StandardCatalogPage"));
const UrbxWelcomePage = lazy(() => import("./templates/urbx/UrbxWelcomePage"));
const Template6WelcomePage = lazy(() => import("./templates/template-6/Template6WelcomePage"));
const Template6HomePage = lazy(() => import("./templates/template-6/Template6HomePage"));
const UrbxHomePage = lazy(() => import("./templates/urbx/UrbxHomePage"));
const UrbxShopPage = lazy(() => import("./templates/urbx/UrbxShopPage"));
const UrbxCategoriesPage = lazy(() => import("./templates/urbx/UrbxCategoriesPage"));
const UrbxProductDetailsPage = lazy(() => import("./templates/urbx/UrbxProductDetailsPage"));
const Template6ProductDetailsPage = lazy(() => import("./templates/template-6/Template6ProductDetailsPage"));
const Template6CartPage = lazy(() => import("./templates/template-6/Template6CartPage"));
const Template6ExplorePage = lazy(() => import("./templates/template-6/Template6ExplorePage"));
const Template6CheckoutPage = lazy(() => import("./templates/template-6/Template6CheckoutPage"));
const Template6OrderConfirmationPage = lazy(() => import("./templates/template-6/Template6OrderConfirmationPage"));
const Template6ProfilePage = lazy(() => import("./templates/template-6/Template6ProfilePage"));
const Template6FavoritesPage = lazy(() => import("./templates/template-6/Template6FavoritesPage"));
const Template6OrderDetailsPage = lazy(() => import("./templates/template-6/Template6OrderDetailsPage"));
const UrbxCartPage = lazy(() => import("./templates/urbx/UrbxCartPage"));
const UrbxCheckoutPage = lazy(() => import("./templates/urbx/UrbxCheckoutPage"));
const UrbxOrderConfirmationPage = lazy(() => import("./templates/urbx/UrbxOrderConfirmationPage"));
const UrbxSupportPage = lazy(() => import("./templates/urbx/UrbxSupportPage"));
const UrbxOrderDetailsPage = lazy(() => import("./templates/urbx/UrbxOrderDetailsPage"));
const UrbxWishlistPage = lazy(() => import("./templates/urbx/UrbxWishlistPage"));

const unavailableCommerce: StorefrontCommerceCapabilitiesDto = {
  online_checkout: {
    status: "unavailable",
    currency_code: null,
    country_codes: [],
    payment_methods: [],
  },
};

const decodedProductHandle = (pathname: string): string | null => {
  const match = pathname.match(/^\/products?\/([^/]+)$/);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
};

export const App = () => {
  const location = useStorefrontLocation();
  const mainRef = useRef<HTMLElement>(null);
  const previousRoute = useRef(`${location.pathname}${location.search}`);
  const [profile, setProfile] = useState<StorefrontProfileDto | null>(null);
  const [capability, setCapability] =
    useState<StorefrontCommerceCapabilitiesDto>(unavailableCommerce);
  const [profileStatus, setProfileStatus] = useState<
    | "loading"
    | "not-found"
    | "setup-unavailable"
    | "unavailable"
    | "ready"
  >("loading");
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    if (isStorefrontEditorPreviewEnabled()) return;
    setProfile(null);
    setCapability(unavailableCommerce);
    setProfileStatus("loading");
    document.title = "المتجر";

    void Promise.all([
      resolveStorefrontProfile({ signal: controller.signal }),
      fetchStorefrontCommerceCapabilities({ signal: controller.signal }).catch(
        (error: unknown) => {
          if (isStorefrontApiError(error) && error.code === "aborted") {
            throw error;
          }
          return unavailableCommerce;
        },
      ),
    ])
      .then(([profileResult, capabilityResult]) => {
        setProfile(profileResult);
        if (!profileResult.storefront) {
          setCapability(unavailableCommerce);
          setProfileStatus("setup-unavailable");
          return;
        }
        setCapability(capabilityResult);
        setProfileStatus("ready");
      })
      .catch((error: unknown) => {
        if (isStorefrontApiError(error) && error.code === "aborted") return;
        if (isStorefrontApiError(error) && error.code === "not_found") {
          setProfileStatus("not-found");
        } else if (
          isStorefrontApiError(error) &&
          error.code === "storefront_setup"
        ) {
          setProfileStatus("setup-unavailable");
        } else {
          setProfileStatus("unavailable");
        }
      });

    return () => controller.abort();
  }, [retryToken]);

  useEffect(
    () =>
      subscribeToStorefrontEditorPreview((nextProfile) => {
        setProfile(nextProfile);
        setCapability(getStorefrontEditorPreviewCommerceCapabilities() ?? unavailableCommerce);
        setProfileStatus(nextProfile.storefront ? "ready" : "setup-unavailable");
      }),
    [],
  );

  useEffect(() => {
    const route = `${location.pathname}${location.search}`;

    if (previousRoute.current === route) {
      return;
    }
    previousRoute.current = route;

    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      mainRef.current?.focus({ preventScroll: true });
    });
  }, [location.pathname, location.search]);

  useGlowBeautyPalette(profile);
  const themeStyle = useMemo(() => {
    const theme = deriveStorefrontTheme(
      profile?.branding.primary_color,
      profile?.branding.secondary_color,
    );
    return {
      ...storefrontThemeCssVariables(theme),
      ...storefrontTypographyCssVariables(profile?.branding.typography_key),
      ...(profile?.storefront?.template_key === "urbx" ? urbxAppearanceStyle(profile.storefront.content.appearance) : {}),
    } as CSSProperties;
  }, [
    profile?.branding.primary_color,
    profile?.branding.secondary_color,
    profile?.branding.typography_key,
    profile?.storefront,
  ]);

  useEffect(() => {
    const profileLocale = profile?.locale;
    if (profile) document.documentElement.dataset.storeHandle = profile.handle;
    document.documentElement.lang = profileLocale ?? "ar-LY";
    document.documentElement.dir = profileLocale === "en-LY" ? "ltr" : "rtl";

    return () => {
      document.documentElement.lang = "ar-LY";
      document.documentElement.dir = "rtl";
    };
  }, [profile?.locale, profile?.handle]);

  if (profileStatus === "loading") {
    return (
      <div className="app" style={themeStyle}>
        <a className="skip-link" href="#main-content">
          تجاوز إلى المحتوى
        </a>
        <header
          className="store-header store-header--loading"
          aria-hidden="true"
        >
          <div className="shell store-header__inner">
            <span className="skeleton boot-logo" />
            <span className="skeleton boot-nav" />
            <span className="skeleton boot-search" />
          </div>
        </header>
        <main id="main-content" ref={mainRef} tabIndex={-1}>
          <div className="shell bootstrap-state" aria-live="polite">
            <span className="loading-spinner" aria-hidden="true" />
            <h1>جارٍ تجهيز المتجر</h1>
            <p>لحظات قليلة ونأخذك إلى المنتجات.</p>
          </div>
        </main>
      </div>
    );
  }

  if (profileStatus !== "ready" || !profile || !profile.storefront) {
    const locale = profile?.locale ?? "ar-LY";
    const setupUnavailable = profileStatus === "setup-unavailable";
    return (
      <div className="app" style={themeStyle}>
        <a className="skip-link" href="#main-content">
          {storefrontUiText(locale, {
            ar: "تجاوز إلى المحتوى",
            en: "Skip to content",
          })}
        </a>
        <main
          id="main-content"
          ref={mainRef}
          tabIndex={-1}
          className="bootstrap-error"
        >
          <div className="shell">
            <StatePanel
              kind={profileStatus === "not-found" ? "not-found" : "unavailable"}
              title={
                setupUnavailable
                  ? storefrontUiText(locale, {
                      ar: "واجهة المتجر قيد الإعداد",
                      en: "This storefront is being prepared",
                    })
                  : profileStatus === "not-found"
                    ? storefrontUiText(locale, {
                        ar: "هذا المتجر غير متاح",
                        en: "This store is unavailable",
                      })
                    : storefrontUiText(locale, {
                        ar: "تعذّر فتح المتجر الآن",
                        en: "The store cannot be opened right now",
                      })
              }
              message={
                setupUnavailable
                  ? storefrontUiText(locale, {
                      ar: "لم تُنشر واجهة هذا المتجر بعد. يرجى المحاولة لاحقاً.",
                      en: "This store has not published its storefront yet. Please check again later.",
                    })
                  : storefrontUiText(locale, {
                      ar: "تحقق من الرابط أو حاول مرة أخرى بعد قليل.",
                      en: "Check the link or try again in a moment.",
                    })
              }
              onRetry={
                profileStatus === "unavailable"
                  ? () => setRetryToken((value) => value + 1)
                  : undefined
              }
              locale={locale}
            />
          </div>
        </main>
      </div>
    );
  }

  const productHandle = decodedProductHandle(location.pathname);
  const configuredProfile: ConfiguredStorefrontProfileDto = {
    ...profile,
    storefront: profile.storefront,
  };
  const fullSource = profile.storefront.template_key === "luxe-commerce-full";
  const standard = profile.storefront.template_key === "standard";
  const glowBeauty = profile.storefront.template_key === "glow-beauty";
  const drops = profile.storefront.template_key === "drops";
  const dropsOwnSurface = drops;
  const urbxWelcome = profile.storefront.template_key === "urbx" && location.pathname === "/welcome";
  const template6Welcome = profile.storefront.template_key === "template-6" && location.pathname === "/welcome";
  const template6Home = profile.storefront.template_key === "template-6" && ["/", "/store"].includes(location.pathname);
  const template6Product = profile.storefront.template_key === "template-6" && productHandle !== null;
  const template6Cart = profile.storefront.template_key === "template-6" && location.pathname === "/cart";
  const template6Checkout = profile.storefront.template_key === "template-6" && location.pathname === "/checkout";
  const template6Confirmation = profile.storefront.template_key === "template-6" && location.pathname === "/order-confirmation";
  const template6Profile = profile.storefront.template_key === "template-6" && location.pathname === "/account";
  const template6Favorites = profile.storefront.template_key === "template-6" && location.pathname === "/favorites";
  const template6OrderDetails = profile.storefront.template_key === "template-6" && (location.pathname === "/order-details" || /^\/order-details\/[^/]+$/.test(location.pathname));
  const template6Explore = profile.storefront.template_key === "template-6" && location.pathname === "/categories";
  const urbxHome = profile.storefront.template_key === "urbx" && (location.pathname === "/" || location.pathname === "/store");
  const urbxShop = profile.storefront.template_key === "urbx" && location.pathname === "/products";
  const urbxCategories = profile.storefront.template_key === "urbx" && location.pathname === "/categories";
  const urbxProduct = profile.storefront.template_key === "urbx" && productHandle !== null;
  const urbxCart = profile.storefront.template_key === "urbx" && location.pathname === "/cart";
  const urbxCheckout = profile.storefront.template_key === "urbx" && location.pathname === "/checkout";
  const urbxConfirmation = profile.storefront.template_key === "urbx" && location.pathname === "/order-confirmation";
  const urbxSupport = profile.storefront.template_key === "urbx" && location.pathname === "/contact";
  const urbxOrderDetails = profile.storefront.template_key === "urbx" && (location.pathname === "/order-details" || /^\/order-details\/[^/]+$/.test(location.pathname));
  const urbxWishlist = profile.storefront.template_key === "urbx" && location.pathname === "/favorites";
  const urbxOwnSurface = urbxWelcome || urbxHome || urbxShop || urbxCategories || urbxProduct || urbxCart || urbxCheckout || urbxConfirmation || urbxSupport || urbxOrderDetails || urbxWishlist;
  const ordersRoute = location.pathname === "/orders" || /^\/order-details\/[^/]+$/.test(location.pathname);
  const catalogRoute = location.pathname === "/products" || location.pathname === "/categories";
  const glowBeautyHome = glowBeauty && location.pathname === "/";
  const glowBeautyOwnSurface = glowBeauty;
  const standardHome = standard && (location.pathname === "/" || location.pathname === "/store");
  const standardVisualPreview = standard && import.meta.env.DEV &&
    new URLSearchParams(location.search).get("preview") === "1";
  const standardOrderDetails = standardVisualPreview && /^\/order-details\/[^/]+$/.test(location.pathname);
  const standardOwnSurface = standard;
  const fullSourceHome =
    fullSource &&
    (location.pathname === "/" || location.pathname === "/store");
  const sourceContentRoute = fullSource
    ? location.pathname === "/returns"
      ? "delivery-returns"
      : location.pathname === "/account-deletion"
        ? "privacy"
        : null
    : null;
  const contentRoute =
    storeContentRouteForPath(location.pathname) ?? sourceContentRoute;
  const sourceCatalogKind: LuxeFullListingKind | null = fullSource
    ? location.pathname === "/watches"
      ? "watches"
      : location.pathname === "/sunglasses"
        ? "sunglasses"
        : location.pathname === "/pens"
          ? "pens"
          : location.pathname === "/offers"
            ? "offers"
            : location.pathname === "/best-sellers"
              ? "best-sellers"
              : /^\/brands\/[^/]+$/.test(location.pathname)
                ? "brand"
                : null
    : null;
  const sourceBrandSlug = sourceCatalogKind === "brand"
    ? location.pathname.slice("/brands/".length)
    : "";
  const sourceOrdersRoute =
    fullSource &&
    (location.pathname === "/orders" ||
      /^\/order-details\/[^/]+$/.test(location.pathname) ||
      /^\/orders\/[^/]+$/.test(location.pathname));
  const sourceAccountRoute =
    fullSource && location.pathname === "/account/settings";
  const sourceConfirmationRoute =
    fullSource && /^\/order-confirmation\/[^/]+$/.test(location.pathname);
  const knownRoute =
    template6OrderDetails ||
    template6Explore ||
    template6Welcome ||
    urbxOwnSurface ||
    ordersRoute || ((glowBeauty || drops || standard) && location.pathname === "/categories") ||
    location.pathname === "/" ||
    ((fullSource || standard) && location.pathname === "/store") ||
    location.pathname === "/products" ||
    location.pathname === "/cart" ||
    location.pathname === "/checkout" ||
    location.pathname === "/order-confirmation" ||
    location.pathname === "/favorites" ||
    location.pathname === "/account" ||
    sourceCatalogKind !== null ||
    sourceOrdersRoute ||
    sourceAccountRoute ||
    sourceConfirmationRoute ||
    standardOrderDetails ||
    contentRoute !== null ||
    productHandle !== null;

  return (
    <CartProvider
      capability={capability}
      locale={profile.locale}
      storeHandle={profile.handle}
    >
      <FavoritesProvider storeHandle={profile.handle} previewProducts={
        ["urbx", "template-6"].includes(profile.storefront.template_key) && isStorefrontEditorPreviewEnabled() ? getStorefrontEditorPreviewProducts() ?? []
          : import.meta.env.DEV && profile.storefront.template_key === "template-6" && isVisualPreviewEnabled() && !new URLSearchParams(location.search).has("setup-preview") ? template6PreviewProducts : undefined}>
      <TemplateProfileContext.Provider value={configuredProfile}>
      <StorefrontTemplateRenderer
        locale={profile.locale}
        templateKey={profile.storefront.template_key}
        style={themeStyle}
      >
        <a className="skip-link" href="#main-content">
          {storefrontUiText(profile.locale, {
            ar: "تجاوز إلى المحتوى",
            en: "Skip to content",
          })}
        </a>
        {!template6OrderDetails && !template6Favorites && !template6Profile && !template6Confirmation && !template6Checkout && !template6Explore && !template6Cart && !template6Product && !template6Home && !template6Welcome && !urbxOwnSurface && !fullSourceHome && !standardOwnSurface && !glowBeautyOwnSurface && !dropsOwnSurface ? (
          fullSource ? (
            <LuxeFullStoreHeader profile={configuredProfile} pathname={location.pathname} />
          ) : (
            <StoreHeader profile={configuredProfile} location={location} />
          )
        ) : null}
        <main
          id="main-content"
          ref={mainRef}
          tabIndex={-1}
          className={fullSourceHome ? "customer-home" : undefined}
        >
          {template6Welcome ? (
            <Suspense fallback={null}><Template6WelcomePage profile={configuredProfile} /></Suspense>
          ) : template6Home ? (
            <Suspense fallback={null}><Template6HomePage key={profile.handle} profile={configuredProfile} /></Suspense>
          ) : template6Product ? (
            <Suspense fallback={null}><Template6ProductDetailsPage key={`${profile.handle}:${productHandle}`} profile={configuredProfile} handle={productHandle!} /></Suspense>
          ) : template6Cart ? (
            <Suspense fallback={null}><Template6CartPage profile={configuredProfile} /></Suspense>
          ) : template6Checkout ? (
            <Suspense fallback={null}><Template6CheckoutPage key={profile.handle} profile={configuredProfile} /></Suspense>
          ) : template6Confirmation ? (
            <Suspense fallback={null}><Template6OrderConfirmationPage key={profile.handle} profile={configuredProfile} /></Suspense>
          ) : template6Profile ? (
            <Suspense fallback={null}><Template6ProfilePage key={profile.handle} profile={configuredProfile} /></Suspense>
          ) : template6Favorites ? (
            <Suspense fallback={null}><Template6FavoritesPage key={profile.handle} profile={configuredProfile} /></Suspense>
          ) : template6OrderDetails ? (
            <Suspense fallback={null}><Template6OrderDetailsPage key={`${profile.handle}:${location.pathname}`} profile={configuredProfile} /></Suspense>
          ) : template6Explore ? (
            <Suspense fallback={null}><Template6ExplorePage key={profile.handle} profile={configuredProfile} /></Suspense>
          ) : urbxWishlist ? (
            <Suspense fallback={null}><UrbxWishlistPage key={profile.handle} profile={configuredProfile} /></Suspense>
          ) : urbxOrderDetails ? (
            <Suspense fallback={null}><UrbxOrderDetailsPage profile={configuredProfile} /></Suspense>
          ) : urbxSupport ? (
            <Suspense fallback={null}><UrbxSupportPage key={profile.handle} profile={configuredProfile} /></Suspense>
          ) : urbxConfirmation ? (
            <Suspense fallback={null}><UrbxOrderConfirmationPage profile={profile} /></Suspense>
          ) : urbxCheckout ? (
            <Suspense fallback={null}><UrbxCheckoutPage profile={configuredProfile} /></Suspense>
          ) : urbxCart ? (
            <Suspense fallback={null}><UrbxCartPage profile={configuredProfile} /></Suspense>
          ) : urbxProduct ? (
            <Suspense fallback={null}><UrbxProductDetailsPage key={productHandle} profile={configuredProfile} handle={productHandle!} /></Suspense>
          ) : urbxCategories ? (
            <Suspense fallback={null}><UrbxCategoriesPage profile={configuredProfile} /></Suspense>
          ) : urbxShop ? (
            <Suspense fallback={null}><UrbxShopPage profile={configuredProfile} /></Suspense>
          ) : urbxHome ? (
            <Suspense fallback={null}><UrbxHomePage profile={configuredProfile} /></Suspense>
          ) : urbxWelcome ? (
            <Suspense fallback={null}><UrbxWelcomePage profile={configuredProfile} /></Suspense>
          ) : drops && (location.pathname === "/" || location.pathname === "/store" || location.pathname === "/products" || location.pathname === "/favorites") ? (
            <Suspense fallback={null}><DropsHomePage key={location.pathname + location.search} profile={configuredProfile} catalogOnly={location.pathname === "/products"} savedOnly={location.pathname === "/favorites"} /></Suspense>
          ) : drops && location.pathname === "/categories" ? (
            <Suspense fallback={null}><DropsCategoriesPage profile={configuredProfile} /></Suspense>
          ) : ordersRoute && !glowBeauty ? (
            <StoreOrdersPage profile={configuredProfile} />
          ) : standard && catalogRoute ? (
            <Suspense fallback={null}><StandardCatalogPage profile={configuredProfile} /></Suspense>
          ) : glowBeautyHome ? (
            <Suspense fallback={<div className="glow-beauty-search-message" role="status">Preparing the store</div>}>
              <GlowBeautyHomePage profile={configuredProfile} />
            </Suspense>
          ) : standardHome ? (
            <Suspense fallback={<div className="standard-preview-loading" role="status">Preparing the store</div>}>
              <StandardMobileHomePage profile={configuredProfile} />
            </Suspense>
          ) : fullSourceHome ? (
            <Suspense
              fallback={
                <div className="customer-products__loading" role="status">
                  <span>
                    {storefrontUiText(profile.locale, {
                      ar: "جاري تجهيز المتجر",
                      en: "Preparing the store",
                    })}
                  </span>
                </div>
              }
            >
              <LuxeFullHomePage profile={configuredProfile} />
            </Suspense>
          ) : location.pathname === "/" ? (
            <CatalogPage profile={configuredProfile} location={location} home />
          ) : location.pathname === "/products" ? (
            glowBeauty ? (
              <Suspense fallback={null}><GlowBeautyCatalogPage profile={configuredProfile} /></Suspense>
            ) : (
              <CatalogPage profile={configuredProfile} location={location} />
            )
          ) : sourceCatalogKind !== null ? (
            <LuxeFullCatalogPage
              brandSlug={sourceBrandSlug}
              kind={sourceCatalogKind}
              profile={configuredProfile}
            />
          ) : glowBeauty && location.pathname === "/categories" ? (
            <Suspense fallback={null}><GlowBeautyCategoriesPage profile={configuredProfile} /></Suspense>
          ) : glowBeauty && location.pathname === "/orders" ? (
            <Suspense fallback={null}><GlowBeautyOrdersPage profile={profile} /></Suspense>
          ) : location.pathname === "/cart" ? (
            drops ? (<Suspense fallback={null}><DropsCartPage profile={profile} /></Suspense>) : glowBeauty ? (
              <Suspense fallback={null}><GlowBeautyCartPage profile={profile} /></Suspense>
            ) : standard ? (
              <Suspense fallback={null}><StandardCartPage profile={profile} /></Suspense>
            ) : fullSource ? (
              <LuxeFullCartPage profile={profile} />
            ) : (
              <CartPage profile={profile} />
            )
          ) : location.pathname === "/checkout" ? (
            glowBeauty ? (
              <Suspense fallback={null}><GlowBeautyCheckoutPage profile={profile} /></Suspense>
            ) : standard ? (
              <Suspense fallback={null}><StandardCheckoutPage profile={profile} /></Suspense>
            ) : fullSource ? (
              <LuxeFullCheckoutPage profile={profile} />
            ) : (
              <CheckoutPage profile={profile} />
            )
          ) : location.pathname === "/order-confirmation" ||
          sourceConfirmationRoute ? (
            drops ? (<Suspense fallback={null}><DropsOrderConfirmedPage profile={profile} /></Suspense>) : glowBeauty ? (
              <Suspense fallback={null}><GlowBeautyOrderPlacedPage profile={profile} /></Suspense>
            ) : standard ? (
              <Suspense fallback={null}><StandardOrderConfirmationPage profile={profile} /></Suspense>
            ) : fullSource ? (
              <LuxeFullOrderConfirmationPage profile={profile} />
            ) : (
              <OrderConfirmationPage profile={profile} />
            )
          ) : location.pathname === "/favorites" ? (
            glowBeauty ? (
              <Suspense fallback={null}><GlowBeautyWishlistPage profile={profile} /></Suspense>
            ) : standard ? (
              <Suspense fallback={null}><StandardFavoritesPage profile={profile} /></Suspense>
            ) : fullSource ? (
              <LuxeFullFavoritesPage profile={profile} />
            ) : (
              <FavoritesPage profile={profile} />
            )
          ) : location.pathname === "/account" || sourceAccountRoute ? (
            fullSource ? (
              <LuxeFullAccountPage profile={profile} />
            ) : (
              <AccountPage profile={profile} />
            )
          ) : sourceOrdersRoute ? (
            <LuxeFullAccountPage profile={profile} initialView="orders" />
          ) : standardOrderDetails ? (
            <Suspense fallback={null}><StandardOrderDetailsPage /></Suspense>
          ) : productHandle !== null ? (
            drops ? (<Suspense fallback={null}><DropsProductDetailsPage key={productHandle} profile={profile} handle={productHandle} /></Suspense>) : glowBeauty ? (
              <Suspense fallback={null}><GlowBeautyProductDetailsPage profile={profile} handle={productHandle} /></Suspense>
            ) : standard ? (
              <Suspense fallback={null}><StandardProductDetailsPage profile={profile} handle={productHandle} /></Suspense>
            ) : fullSource ? (
              <LuxeFullProductDetailPage profile={profile} handle={productHandle} />
            ) : (
              <ProductDetailPage profile={profile} handle={productHandle} />
            )
          ) : contentRoute !== null ? (
            fullSource ? (
              <LuxeFullContentPage profile={configuredProfile} route={contentRoute} />
            ) : (
              <StoreContentPage profile={configuredProfile} route={contentRoute} />
            )
          ) : !knownRoute ? (
            <div className="shell page-state-wrap">
              <StatePanel
                kind="not-found"
                title={storefrontUiText(profile.locale, {
                  ar: "هذه الصفحة غير موجودة",
                  en: "This page does not exist",
                })}
                message={storefrontUiText(profile.locale, {
                  ar: "يمكنك العودة إلى الرئيسية أو تصفح جميع المنتجات.",
                  en: "Return home or browse all products.",
                })}
                locale={profile.locale}
              />
              <StorefrontLink
                to="/"
                className="button button--secondary state-back-link"
              >
                {storefrontUiText(profile.locale, {
                  ar: "العودة إلى الرئيسية",
                  en: "Back to home",
                })}
              </StorefrontLink>
            </div>
          ) : null}
        </main>
        {standard && <StandardMobileNavigation pathname={location.pathname} />}
        {glowBeauty && <GlowBeautyBottomNav profile={configuredProfile} pathname={location.pathname} />}
        {profile.storefront.template_key === "template-6" && <Template6Navigation profile={configuredProfile} />}
        {!template6OrderDetails && !template6Favorites && !template6Profile && !template6Confirmation && !template6Checkout && !template6Explore && !template6Cart && !template6Product && !template6Home && !template6Welcome && !urbxOwnSurface && !fullSourceHome && !standardOwnSurface && !glowBeautyOwnSurface && !dropsOwnSurface ? <StoreFooter profile={profile} /> : null}
      </StorefrontTemplateRenderer>
      </TemplateProfileContext.Provider>
      </FavoritesProvider>
    </CartProvider>
  );
};
