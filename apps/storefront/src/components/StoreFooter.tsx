import {
  isLuxeCommerceTemplate,
  type StorefrontProfileDto,
} from "../types";
import { storefrontUiText } from "../lib/localization";
import { BrandMark } from "./BrandMark";
import { StoreContactLinks } from "./StoreContactLinks";
import { StorefrontLink } from "../lib/navigation";

type StoreFooterProps = {
  profile: StorefrontProfileDto;
};

export const StoreFooter = ({ profile }: StoreFooterProps) => (
  <footer className="store-footer">
    <div className="shell store-footer__inner">
      <div className="store-footer__brand">
        {isLuxeCommerceTemplate(profile.storefront?.template_key) ? (
          <img
            className="store-footer__luxe-logo"
            src={
              profile.storefront?.template_key === "luxe-commerce-full"
                ? "/assets/luxe-full/customer-assets/store-header-logo.png"
                : "/assets/luxe/store-header-logo.png"
            }
            alt=""
          />
        ) : <BrandMark />}
        <div>
          <strong>{profile.name}</strong>
          {profile.domain ? <span dir="ltr">{profile.domain}</span> : null}
        </div>
        {isLuxeCommerceTemplate(profile.storefront?.template_key) ? (
          <p>{storefrontUiText(profile.locale, {
            ar: "وجهة موثوقة للمنتجات المختارة بعناية، بخدمة محلية وتجربة تسوق متكاملة.",
            en: "A trusted destination for carefully selected products, local service and a complete shopping experience.",
          })}</p>
        ) : null}
      </div>

      <nav
        className="store-footer__links"
        aria-label={storefrontUiText(profile.locale, {
          ar: "روابط المتجر",
          en: "Store links",
        })}
      >
        <StorefrontLink to="/">
          {storefrontUiText(profile.locale, { ar: "الرئيسية", en: "Home" })}
        </StorefrontLink>
        <StorefrontLink to="/products">
          {storefrontUiText(profile.locale, { ar: "المنتجات", en: "Products" })}
        </StorefrontLink>
        <StorefrontLink to="/about">
          {storefrontUiText(profile.locale, { ar: "من نحن", en: "About" })}
        </StorefrontLink>
        <StorefrontLink to="/contact">
          {storefrontUiText(profile.locale, { ar: "تواصل معنا", en: "Contact" })}
        </StorefrontLink>
        <StorefrontLink to="/delivery-returns">
          {storefrontUiText(profile.locale, {
            ar: "التوصيل والإرجاع",
            en: "Delivery & returns",
          })}
        </StorefrontLink>
        <StorefrontLink to="/privacy">
          {storefrontUiText(profile.locale, { ar: "الخصوصية", en: "Privacy" })}
        </StorefrontLink>
        <StorefrontLink to="/terms">
          {storefrontUiText(profile.locale, { ar: "الشروط", en: "Terms" })}
        </StorefrontLink>
      </nav>

      <StoreContactLinks profile={profile} className="store-footer__contact" />

      <p className="store-footer__copyright">
        © {new Date().getFullYear()} {storefrontUiText(profile.locale, {
          ar: "جميع الحقوق محفوظة",
          en: "All rights reserved",
        })}
      </p>
    </div>
  </footer>
);
