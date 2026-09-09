import { useEffect, useMemo, useState, type FormEvent } from "react";

import {
  fetchStorefrontCatalog,
  isStorefrontApiError,
} from "../api/storefront-api";
import { Hero } from "../components/Hero";
import { HomeAboutSection, HomeContactSection } from "../components/HomeContentSections";
import { LuxeCommerceSections } from "../components/LuxeCommerceSections";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  SearchIcon,
} from "../components/Icons";
import { ProductCard } from "../components/ProductCard";
import { CatalogSkeleton, StatePanel } from "../components/StatePanel";
import { StorefrontHomeComposition } from "../components/StorefrontTemplateRenderer";
import { storefrontUiText } from "../lib/localization";
import {
  navigate,
  StorefrontLink,
  type StorefrontLocation,
} from "../lib/navigation";
import type {
  ConfiguredStorefrontProfileDto,
  StorefrontCatalogPageDto,
} from "../types";

const PAGE_SIZE = 12;
const HOME_PAGE_SIZE = 8;
const MAX_PAGE = Math.floor(10_000 / PAGE_SIZE) + 1;

type CatalogOrder = "latest" | "title" | "-title";

type CatalogLocationState = {
  valid: boolean;
  page: number;
  query: string;
  order: CatalogOrder;
};

const parseCatalogLocation = (search: string): CatalogLocationState => {
  const params = new URLSearchParams(search);
  const rawPage = params.get("page") ?? "1";
  const rawQuery = params.get("q")?.trim() ?? "";
  const rawOrder = params.get("order") ?? "latest";
  const page = /^\d+$/.test(rawPage) ? Number(rawPage) : Number.NaN;
  const orderIsValid = ["latest", "title", "-title"].includes(rawOrder);

  return {
    valid:
      Number.isSafeInteger(page) &&
      page >= 1 &&
      page <= MAX_PAGE &&
      rawQuery.length <= 120 &&
      orderIsValid,
    page: Number.isSafeInteger(page) ? page : 1,
    query: rawQuery.slice(0, 120),
    order: orderIsValid ? (rawOrder as CatalogOrder) : "latest",
  };
};

const catalogUrl = (input: {
  page?: number;
  query?: string;
  order?: CatalogOrder;
}): string => {
  const params = new URLSearchParams();
  const query = input.query?.trim();
  if (query) params.set("q", query);
  if (input.order && input.order !== "latest") params.set("order", input.order);
  if (input.page && input.page > 1) params.set("page", String(input.page));
  return `/products${params.size ? `?${params.toString()}` : ""}`;
};

const paginationPages = (current: number, total: number): number[] => {
  if (total <= 5) return Array.from({ length: total }, (_, index) => index + 1);
  const start = Math.max(1, Math.min(current - 2, total - 4));
  return Array.from({ length: 5 }, (_, index) => start + index);
};

type CatalogPageProps = {
  profile: ConfiguredStorefrontProfileDto;
  location: StorefrontLocation;
  home?: boolean;
};

export const CatalogPage = ({
  profile,
  location,
  home = false,
}: CatalogPageProps) => {
  const text = (ar: string, en: string) =>
    storefrontUiText(profile.locale, { ar, en });
  const fullSource = profile.storefront.template_key === "luxe-commerce-full";
  const parsed = useMemo(
    () =>
      home
        ? { valid: true, page: 1, query: "", order: "latest" as const }
        : parseCatalogLocation(location.search),
    [home, location.search],
  );
  const [searchValue, setSearchValue] = useState(parsed.query);
  const [catalog, setCatalog] = useState<StorefrontCatalogPageDto | null>(null);
  const [status, setStatus] = useState<
    "loading" | "ready" | "not-found" | "unavailable"
  >("loading");
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => setSearchValue(parsed.query), [parsed.query]);

  useEffect(() => {
    document.title = home
      ? `${profile.name} | ${text("الرئيسية", "Home")}`
      : `${text("المنتجات", "Products")} | ${profile.name}`;

    if (!parsed.valid) {
      setCatalog(null);
      setStatus("not-found");
      return;
    }

    const controller = new AbortController();
    setCatalog(null);
    setStatus("loading");

    void fetchStorefrontCatalog({
      limit: home ? HOME_PAGE_SIZE : PAGE_SIZE,
      offset: home ? 0 : (parsed.page - 1) * PAGE_SIZE,
      q: parsed.query || undefined,
      order: parsed.order === "latest" ? "-created_at" : parsed.order,
      signal: controller.signal,
    })
      .then((result) => {
        if (!home && result.count > 0 && result.products.length === 0) {
          setStatus("not-found");
          return;
        }
        setCatalog(result);
        setStatus("ready");
      })
      .catch((error: unknown) => {
        if (isStorefrontApiError(error) && error.code === "aborted") return;
        setStatus(
          isStorefrontApiError(error) && error.code === "not_found"
            ? "not-found"
            : "unavailable",
        );
      });

    return () => controller.abort();
  }, [
    fullSource,
    home,
    parsed.order,
    parsed.page,
    parsed.query,
    parsed.valid,
    profile.name,
    retryToken,
  ]);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigate(
      catalogUrl({ query: searchValue.slice(0, 120), order: parsed.order }),
    );
  };

  const totalPages = catalog
    ? Math.max(1, Math.ceil(catalog.count / catalog.limit))
    : 1;

  const catalogContent = (() => {
    if (status === "loading") {
      return (
        <div aria-live="polite" aria-label={text("جارٍ تحميل المنتجات", "Loading products")}>
          <CatalogSkeleton count={home ? 4 : 8} />
        </div>
      );
    }

    if (status === "not-found") {
      return (
        <StatePanel
          kind="not-found"
          title={text("لم نجد هذه الصفحة", "We could not find this page")}
          message={text(
            "تحقق من الرابط أو عد إلى قائمة المنتجات.",
            "Check the link or return to the product catalog.",
          )}
          headingLevel={2}
          locale={profile.locale}
        />
      );
    }

    if (status === "unavailable") {
      return (
        <StatePanel
          kind="unavailable"
          title={text("تعذّر تحميل المنتجات الآن", "Products are unavailable right now")}
          message={text(
            "يمكنك المحاولة مرة أخرى بعد قليل.",
            "Please try again in a moment.",
          )}
          onRetry={() => setRetryToken((value) => value + 1)}
          headingLevel={2}
          locale={profile.locale}
        />
      );
    }

    if (!catalog || catalog.products.length === 0) {
      return (
        <StatePanel
          kind="empty"
          title={
            parsed.query
              ? text("لا توجد نتائج مطابقة", "No matching results")
              : text("لا توجد منتجات حالياً", "No products yet")
          }
          message={
            parsed.query
              ? text(
                  "جرّب عبارة بحث أقصر أو تصفح جميع المنتجات.",
                  "Try a shorter search or browse all products.",
                )
              : text(
                  "ستظهر المنتجات هنا فور إضافتها إلى المتجر.",
                  "Products will appear here as soon as they are published.",
                )
          }
          headingLevel={2}
          locale={profile.locale}
        />
      );
    }

    return (
      <>
        <div className="product-grid">
          {catalog.products.map((product) => (
            <ProductCard
              key={product.handle}
              product={product}
              headingLevel={home ? 3 : 2}
              locale={profile.locale}
            />
          ))}
        </div>

        {!home && totalPages > 1 ? (
          <nav className="pagination" aria-label={text("صفحات المنتجات", "Product pages")}>
            {parsed.page === 1 ? (
              <span
                className="pagination__arrow is-disabled"
                aria-hidden="true"
              >
                <ChevronRightIcon />
              </span>
            ) : (
              <StorefrontLink
                to={catalogUrl({
                  page: parsed.page - 1,
                  query: parsed.query,
                  order: parsed.order,
                })}
                className="pagination__arrow"
                ariaLabel={text("الصفحة السابقة", "Previous page")}
              >
                <ChevronRightIcon />
              </StorefrontLink>
            )}
            <div className="pagination__pages">
              {paginationPages(parsed.page, totalPages).map((page) => (
                <StorefrontLink
                  key={page}
                  to={catalogUrl({
                    page,
                    query: parsed.query,
                    order: parsed.order,
                  })}
                  className={page === parsed.page ? "is-current" : undefined}
                  ariaLabel={text(`الصفحة ${page}`, `Page ${page}`)}
                >
                  {page}
                </StorefrontLink>
              ))}
            </div>
            {parsed.page >= totalPages ? (
              <span
                className="pagination__arrow is-disabled"
                aria-hidden="true"
              >
                <ChevronLeftIcon />
              </span>
            ) : (
              <StorefrontLink
                to={catalogUrl({
                  page: parsed.page + 1,
                  query: parsed.query,
                  order: parsed.order,
                })}
                className="pagination__arrow"
                ariaLabel={text("الصفحة التالية", "Next page")}
              >
                <ChevronLeftIcon />
              </StorefrontLink>
            )}
          </nav>
        ) : null}
      </>
    );
  })();

  if (home) {
    const catalogSection = (
      <>
        <LuxeCommerceSections
          profile={profile}
        />
        <section
          className="catalog-section shell"
          aria-labelledby="featured-products-title"
        >
          {fullSource ? (
            <nav
              className="luxe-full-product-tabs"
              aria-label={text("تصنيفات المنتجات", "Product categories")}
            >
              <StorefrontLink to="/best-sellers">{text("عرض الكل", "View all")}</StorefrontLink>
              <StorefrontLink to="/sunglasses">{text("نظارات", "Sunglasses")}</StorefrontLink>
              <StorefrontLink to="/watches">{text("ساعات", "Watches")}</StorefrontLink>
              <StorefrontLink to="/pens">{text("أقلام", "Pens")}</StorefrontLink>
            </nav>
          ) : null}
          <div className="section-heading">
            <div>
              <h2 id="featured-products-title">
                {fullSource
                  ? text("الأكثر طلباً", "Best sellers")
                  : text("منتجات مميزة", "Featured products")}
              </h2>
              <p>{text(
                "اختيارات حديثة من متجرنا.",
                "Explore a recent selection from our store.",
              )}</p>
            </div>
            <StorefrontLink to="/products" className="text-link">
              {text("عرض كل المنتجات", "View all products")}
              <ChevronLeftIcon />
            </StorefrontLink>
          </div>
          {catalogContent}
        </section>
      </>
    );

    return (
      <StorefrontHomeComposition
        templateKey={profile.storefront.template_key}
        hero={<Hero profile={profile} />}
        catalog={catalogSection}
        about={<HomeAboutSection profile={profile} />}
        contact={<HomeContactSection profile={profile} />}
      />
    );
  }

  return (
    <section className="catalog-page shell" aria-labelledby="catalog-title">
      <div className="catalog-page__heading">
        <div>
          <span className="eyebrow">
            {text(`تشكيلة ${profile.name}`, `${profile.name} collection`)}
          </span>
          <h1 id="catalog-title">{text("كل المنتجات", "All products")}</h1>
          <p>{text(
            "استكشف اختياراتنا واعثر على التفاصيل التي تناسبك.",
            "Explore our selection and find what suits you.",
          )}</p>
        </div>
        {catalog && status === "ready" ? (
          <span className="catalog-count" aria-live="polite">
            {catalog.count} {catalog.count === 1
              ? text("منتج", "product")
              : text("منتجات", "products")}
          </span>
        ) : null}
      </div>

      <div className="catalog-toolbar">
        <form role="search" onSubmit={submitSearch} className="catalog-search">
          <label htmlFor="catalog-product-search">
            {text("ابحث في المنتجات", "Search products")}
          </label>
          <div>
            <SearchIcon />
            <input
              id="catalog-product-search"
              type="search"
              value={searchValue}
              maxLength={120}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder={text("اكتب اسم المنتج", "Enter a product name")}
              autoComplete="off"
            />
            <button type="submit">{text("بحث", "Search")}</button>
          </div>
        </form>
        <label className="catalog-sort">
          <span>{text("ترتيب حسب", "Sort by")}</span>
          <select
            value={parsed.order}
            onChange={(event) =>
              navigate(
                catalogUrl({
                  query: parsed.query,
                  order: event.target.value as CatalogOrder,
                }),
              )
            }
          >
            <option value="latest">{text("الأحدث", "Newest")}</option>
            <option value="title">{text("الاسم: أ—ي", "Name: A–Z")}</option>
            <option value="-title">{text("الاسم: ي—أ", "Name: Z–A")}</option>
          </select>
        </label>
      </div>

      {catalogContent}
    </section>
  );
};
