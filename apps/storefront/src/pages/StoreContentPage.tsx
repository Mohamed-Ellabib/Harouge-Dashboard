import { useEffect } from "react";

import { StoreContactLinks } from "../components/StoreContactLinks";
import { localizedStorefrontText, storefrontUiText } from "../lib/localization";
import { StorefrontLink } from "../lib/navigation";
import type { ConfiguredStorefrontProfileDto } from "../types";

export type StoreContentRoute =
  | "about"
  | "contact"
  | "delivery-returns"
  | "privacy"
  | "terms";

export const STORE_CONTENT_PATHS: Readonly<
  Record<string, StoreContentRoute>
> = {
  "/about": "about",
  "/contact": "contact",
  "/delivery-returns": "delivery-returns",
  "/privacy": "privacy",
  "/terms": "terms",
};

export const storeContentRouteForPath = (
  pathname: string,
): StoreContentRoute | null => STORE_CONTENT_PATHS[pathname] ?? null;

const routeLabel = (
  profile: ConfiguredStorefrontProfileDto,
  route: StoreContentRoute,
): string => {
  const labels: Record<StoreContentRoute, { ar: string; en: string }> = {
    about: { ar: "من نحن", en: "About" },
    contact: { ar: "تواصل معنا", en: "Contact" },
    "delivery-returns": {
      ar: "التوصيل والإرجاع",
      en: "Delivery & returns",
    },
    privacy: { ar: "سياسة الخصوصية", en: "Privacy policy" },
    terms: { ar: "الشروط والأحكام", en: "Terms & conditions" },
  };
  return storefrontUiText(profile.locale, labels[route]);
};

export const StoreContentPage = ({
  profile,
  route,
}: {
  profile: ConfiguredStorefrontProfileDto;
  route: StoreContentRoute;
}) => {
  const { content } = profile.storefront;
  const locale = profile.locale;
  const label = routeLabel(profile, route);

  useEffect(() => {
    document.title = `${label} | ${profile.name}`;
  }, [label, profile.name]);

  if (route === "about" || route === "contact") {
    const sectionTitle =
      route === "about" ? content.about.title : content.contact.heading;
    const sectionBody =
      route === "about" ? content.about.body : content.contact.body;
    return (
      <article className="store-content-page shell" aria-labelledby="store-content-title">
        <nav className="breadcrumbs" aria-label={storefrontUiText(locale, { ar: "مسار الصفحة", en: "Breadcrumb" })}>
          <StorefrontLink to="/">
            {storefrontUiText(locale, { ar: "الرئيسية", en: "Home" })}
          </StorefrontLink>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{label}</span>
        </nav>
        <div className="store-content-page__layout">
          <div className="store-content-page__copy">
            <h1 id="store-content-title">
              {localizedStorefrontText(sectionTitle, locale)}
            </h1>
            <p>{localizedStorefrontText(sectionBody, locale)}</p>
          </div>
          {route === "contact" ? (
            <aside
              className="store-content-page__contact"
              aria-label={storefrontUiText(locale, {
                ar: "طرق التواصل",
                en: "Contact methods",
              })}
            >
              <StoreContactLinks
                profile={profile}
                className="content-contact-links"
              />
            </aside>
          ) : null}
        </div>
      </article>
    );
  }

  const sections =
    route === "delivery-returns"
      ? [content.policies.delivery, content.policies.returns]
      : route === "privacy"
        ? [content.policies.privacy]
        : [content.policies.terms];

  return (
    <article className="store-content-page shell" aria-labelledby="policy-title-0">
      <nav className="breadcrumbs" aria-label={storefrontUiText(locale, { ar: "مسار الصفحة", en: "Breadcrumb" })}>
        <StorefrontLink to="/">
          {storefrontUiText(locale, { ar: "الرئيسية", en: "Home" })}
        </StorefrontLink>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{label}</span>
      </nav>
      <div className="store-policy-page">
        {sections.map((section, index) => {
          const title = localizedStorefrontText(section.title, locale);
          return (
            <section key={`${route}-${index}`} aria-labelledby={`policy-title-${index}`}>
              {index === 0 ? (
                <h1 id="policy-title-0">{title}</h1>
              ) : (
                <h2 id={`policy-title-${index}`}>{title}</h2>
              )}
              <p>{localizedStorefrontText(section.body, locale)}</p>
            </section>
          );
        })}
      </div>
    </article>
  );
};
