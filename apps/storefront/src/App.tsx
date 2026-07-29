import {
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
import { StoreFooter } from "./components/StoreFooter";
import { StoreHeader } from "./components/StoreHeader";
import { StatePanel } from "./components/StatePanel";
import { StorefrontLink, useStorefrontLocation } from "./lib/navigation";
import {
  deriveStorefrontTheme,
  storefrontThemeCssVariables,
} from "./lib/theme";
import { CatalogPage } from "./pages/CatalogPage";
import { CartPage } from "./pages/CartPage";
import { CheckoutPage } from "./pages/CheckoutPage";
import { OrderConfirmationPage } from "./pages/OrderConfirmationPage";
import { ProductDetailPage } from "./pages/ProductDetailPage";
import type {
  StorefrontCommerceCapabilitiesDto,
  StorefrontProfileDto,
} from "./types";

const unavailableCommerce: StorefrontCommerceCapabilitiesDto = {
  online_checkout: {
    status: "unavailable",
    currency_code: null,
    country_codes: [],
  },
};

const decodedProductHandle = (pathname: string): string | null => {
  const match = pathname.match(/^\/products\/([^/]+)$/);
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
    "loading" | "not-found" | "unavailable" | "ready"
  >("loading");
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
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
        setCapability(capabilityResult);
        setProfileStatus("ready");
      })
      .catch((error: unknown) => {
        if (isStorefrontApiError(error) && error.code === "aborted") return;
        setProfileStatus(
          isStorefrontApiError(error) && error.code === "not_found"
            ? "not-found"
            : "unavailable",
        );
      });

    return () => controller.abort();
  }, [retryToken]);

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

  const themeStyle = useMemo(() => {
    const theme = deriveStorefrontTheme(profile?.branding.primary_color);
    return storefrontThemeCssVariables(theme) as CSSProperties;
  }, [profile?.branding.primary_color]);

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

  if (profileStatus !== "ready" || !profile) {
    return (
      <div className="app" style={themeStyle}>
        <a className="skip-link" href="#main-content">
          تجاوز إلى المحتوى
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
                profileStatus === "not-found"
                  ? "هذا المتجر غير متاح"
                  : "تعذّر فتح المتجر الآن"
              }
              message="تحقق من الرابط أو حاول مرة أخرى بعد قليل."
              onRetry={
                profileStatus === "unavailable"
                  ? () => setRetryToken((value) => value + 1)
                  : undefined
              }
            />
          </div>
        </main>
      </div>
    );
  }

  const productHandle = decodedProductHandle(location.pathname);
  const knownRoute =
    location.pathname === "/" ||
    location.pathname === "/products" ||
    location.pathname === "/cart" ||
    location.pathname === "/checkout" ||
    location.pathname === "/order-confirmation" ||
    productHandle !== null;

  return (
    <CartProvider capability={capability}>
      <div className="app" style={themeStyle}>
        <a className="skip-link" href="#main-content">
          تجاوز إلى المحتوى
        </a>
        <StoreHeader profile={profile} location={location} />
        <main id="main-content" ref={mainRef} tabIndex={-1}>
          {location.pathname === "/" ? (
            <CatalogPage profile={profile} location={location} home />
          ) : location.pathname === "/products" ? (
            <CatalogPage profile={profile} location={location} />
          ) : location.pathname === "/cart" ? (
            <CartPage profile={profile} />
          ) : location.pathname === "/checkout" ? (
            <CheckoutPage profile={profile} />
          ) : location.pathname === "/order-confirmation" ? (
            <OrderConfirmationPage profile={profile} />
          ) : productHandle !== null ? (
            <ProductDetailPage profile={profile} handle={productHandle} />
          ) : !knownRoute ? (
            <div className="shell page-state-wrap">
              <StatePanel
                kind="not-found"
                title="هذه الصفحة غير موجودة"
                message="يمكنك العودة إلى الرئيسية أو تصفح جميع المنتجات."
              />
              <StorefrontLink
                to="/"
                className="button button--secondary state-back-link"
              >
                العودة إلى الرئيسية
              </StorefrontLink>
            </div>
          ) : null}
        </main>
        <StoreFooter profile={profile} />
      </div>
    </CartProvider>
  );
};
