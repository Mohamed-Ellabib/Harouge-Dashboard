import { storefrontUiText } from "../lib/localization";
import { StorefrontLink } from "../lib/navigation";
import type {
  ConfiguredStorefrontProfileDto,
  StorefrontProductCardDto,
} from "../types";
import { isLuxeCommerceTemplate } from "../types";
import { StorefrontBenefitIcon } from "./Icons";

type LuxeCommerceSectionsProps = {
  profile: ConfiguredStorefrontProfileDto;
  products?: StorefrontProductCardDto[];
};

export const LuxeCommerceSections = ({
  profile,
  products = [],
}: LuxeCommerceSectionsProps) => {
  if (!isLuxeCommerceTemplate(profile.storefront.template_key)) return null;

  const text = (ar: string, en: string) =>
    storefrontUiText(profile.locale, { ar, en });
  const assetRoot =
    profile.storefront.template_key === "luxe-commerce-full"
      ? "/assets/luxe-full/customer-assets"
      : "/assets/luxe";
  const fullSource =
    profile.storefront.template_key === "luxe-commerce-full";
  const benefits = profile.storefront.content.hero.benefits ?? [];
  const brands = profile.storefront.content.brands;

  return (
    <>
      {benefits.length ? (
        <section className="luxe-service-strip" aria-label={text("مميزات المتجر", "Store benefits")}>
          <div className="shell luxe-service-strip__grid" style={{ gridTemplateColumns: `repeat(${Math.min(benefits.length, 4)}, minmax(0, 1fr))` }}>
            {benefits.map((benefit) => <article key={benefit.id}>
              <StorefrontBenefitIcon icon={benefit.icon} />
              <span>
                <strong>{storefrontUiText(profile.locale, benefit.title)}</strong>
                <small>{storefrontUiText(profile.locale, benefit.subtitle)}</small>
              </span>
            </article>)}
          </div>
        </section>
      ) : null}

      {brands?.items.length ? <section className="luxe-brand-rail" aria-labelledby="luxe-brands-title">
        <div className="shell luxe-brand-rail__heading">
          <div>
            <h2 id="luxe-brands-title">{storefrontUiText(profile.locale, brands.heading)}</h2>
            <p>{storefrontUiText(profile.locale, brands.subheading)}</p>
          </div>
        </div>
        <div className="luxe-brand-rail__viewport">
          <div className="luxe-brand-rail__track" aria-hidden="true">
            {[...brands.items, ...brands.items].map((brand, index) => <span key={`${brand.id}-${index}`}>
              {brand.image_url ? <img src={brand.image_url} alt="" loading="lazy" /> : <strong>{storefrontUiText(profile.locale, brand.name)}</strong>}
            </span>)}
          </div>
        </div>
      </section> : null}

      <section
        className="luxe-collections shell"
        aria-labelledby="luxe-collections-title"
      >
        <header>
          <h2 id="luxe-collections-title">{text("تسوق حسب الفئة", "Shop by category")}</h2>
        </header>
        <div className="luxe-collections__grid">
          <StorefrontLink className="luxe-collection-card" to={fullSource ? "/sunglasses" : "/products?q=sunglasses"}>
            <span className="luxe-collection-card__media"><img src={`${assetRoot}/category-sunglasses.webp`} alt="" /></span>
            <span className="luxe-collection-card__shade" />
            <span className="luxe-collection-card__copy"><strong>{text("نظارات", "Sunglasses")}</strong><span>{text("تصاميم عصرية تناسب أسلوبك", "Contemporary styles for your look")}</span><em>{text("تسوق الآن", "Shop now")} ←</em></span>
          </StorefrontLink>
          <StorefrontLink className="luxe-collection-card" to={fullSource ? "/watches" : "/products?q=watch"}>
            <span className="luxe-collection-card__media"><img src={`${assetRoot}/category-watch.webp`} alt="" /></span>
            <span className="luxe-collection-card__shade" />
            <span className="luxe-collection-card__copy"><strong>{text("ساعات", "Watches")}</strong><span>{text("دقة في الوقت وتميز في الأسلوب", "Precision in time, distinction in style")}</span><em>{text("تسوق الآن", "Shop now")} ←</em></span>
          </StorefrontLink>
        </div>
      </section>

      {products.length ? (
        <section className="luxe-editorial-products shell" aria-label={text("مختارات المتجر", "Store selections")}>
          {products.map((product) => (
            <StorefrontLink key={product.handle} to={`/products/${encodeURIComponent(product.handle)}`}>
              {product.thumbnail_url ? <img src={product.thumbnail_url} alt={product.title} /> : null}
              <strong>{product.title}</strong>
              {product.subtitle ? <span>{product.subtitle}</span> : null}
            </StorefrontLink>
          ))}
        </section>
      ) : null}
    </>
  );
};
