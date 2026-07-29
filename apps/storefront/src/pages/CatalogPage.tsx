import { useEffect, useMemo, useState, type FormEvent } from "react";

import {
  fetchStorefrontCatalog,
  isStorefrontApiError,
} from "../api/storefront-api";
import { Hero } from "../components/Hero";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  SearchIcon,
} from "../components/Icons";
import { ProductCard } from "../components/ProductCard";
import { CatalogSkeleton, StatePanel } from "../components/StatePanel";
import {
  navigate,
  StorefrontLink,
  type StorefrontLocation,
} from "../lib/navigation";
import type { StorefrontCatalogPageDto, StorefrontProfileDto } from "../types";

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
  profile: StorefrontProfileDto;
  location: StorefrontLocation;
  home?: boolean;
};

export const CatalogPage = ({
  profile,
  location,
  home = false,
}: CatalogPageProps) => {
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
      ? `${profile.name} | الرئيسية`
      : `المنتجات | ${profile.name}`;

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
        <div aria-live="polite" aria-label="جارٍ تحميل المنتجات">
          <CatalogSkeleton count={home ? 4 : 8} />
        </div>
      );
    }

    if (status === "not-found") {
      return (
        <StatePanel
          kind="not-found"
          title="لم نجد هذه الصفحة"
          message="تحقق من الرابط أو عد إلى قائمة المنتجات."
          headingLevel={2}
        />
      );
    }

    if (status === "unavailable") {
      return (
        <StatePanel
          kind="unavailable"
          title="تعذّر تحميل المنتجات الآن"
          message="يمكنك المحاولة مرة أخرى بعد قليل."
          onRetry={() => setRetryToken((value) => value + 1)}
          headingLevel={2}
        />
      );
    }

    if (!catalog || catalog.products.length === 0) {
      return (
        <StatePanel
          kind="empty"
          title={
            parsed.query ? "لا توجد نتائج مطابقة" : "لا توجد منتجات حالياً"
          }
          message={
            parsed.query
              ? "جرّب عبارة بحث أقصر أو تصفح جميع المنتجات."
              : "ستظهر المنتجات هنا فور إضافتها إلى المتجر."
          }
          headingLevel={2}
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
            />
          ))}
        </div>

        {!home && totalPages > 1 ? (
          <nav className="pagination" aria-label="صفحات المنتجات">
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
                ariaLabel="الصفحة السابقة"
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
                  ariaLabel={`الصفحة ${page}`}
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
                ariaLabel="الصفحة التالية"
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
    return (
      <>
        <Hero profile={profile} />
        <section
          className="catalog-section shell"
          aria-labelledby="featured-products-title"
        >
          <div className="section-heading">
            <div>
              <span className="eyebrow">مختاراتنا</span>
              <h2 id="featured-products-title">منتجات مميزة</h2>
              <p>تفاصيل صُممت لتناسب يومك ومساحتك.</p>
            </div>
            <StorefrontLink to="/products" className="text-link">
              عرض كل المنتجات
              <ChevronLeftIcon />
            </StorefrontLink>
          </div>
          {catalogContent}
        </section>
      </>
    );
  }

  return (
    <section className="catalog-page shell" aria-labelledby="catalog-title">
      <div className="catalog-page__heading">
        <div>
          <span className="eyebrow">تشكيلة {profile.name}</span>
          <h1 id="catalog-title">كل المنتجات</h1>
          <p>استكشف اختياراتنا واعثر على التفاصيل التي تناسبك.</p>
        </div>
        {catalog && status === "ready" ? (
          <span className="catalog-count" aria-live="polite">
            {catalog.count} {catalog.count === 1 ? "منتج" : "منتجات"}
          </span>
        ) : null}
      </div>

      <div className="catalog-toolbar">
        <form role="search" onSubmit={submitSearch} className="catalog-search">
          <label htmlFor="catalog-product-search">ابحث في المنتجات</label>
          <div>
            <SearchIcon />
            <input
              id="catalog-product-search"
              type="search"
              value={searchValue}
              maxLength={120}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="اكتب اسم المنتج"
              autoComplete="off"
            />
            <button type="submit">بحث</button>
          </div>
        </form>
        <label className="catalog-sort">
          <span>ترتيب حسب</span>
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
            <option value="latest">الأحدث</option>
            <option value="title">الاسم: أ—ي</option>
            <option value="-title">الاسم: ي—أ</option>
          </select>
        </label>
      </div>

      {catalogContent}
    </section>
  );
};
