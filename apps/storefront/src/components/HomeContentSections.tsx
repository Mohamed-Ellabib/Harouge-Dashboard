import { localizedStorefrontText, storefrontUiText } from "../lib/localization";
import { StorefrontLink } from "../lib/navigation";
import type { ConfiguredStorefrontProfileDto } from "../types";
import { StoreContactLinks } from "./StoreContactLinks";

export const HomeAboutSection = ({
  profile,
}: {
  profile: ConfiguredStorefrontProfileDto;
}) => {
  const about = profile.storefront.content.about;

  if (profile.storefront.template_key === "luxe-commerce-full") {
    return (
      <section
        className="luxe-full-authenticity"
        aria-labelledby="home-about-title"
      >
        <div className="shell luxe-full-authenticity__inner">
          <div>
            <h2 id="home-about-title">
              {localizedStorefrontText(about.title, profile.locale)}
            </h2>
            <h3>
              {storefrontUiText(profile.locale, {
                ar: "تسوق بثقة وطمأنينة",
                en: "Shop with complete confidence",
              })}
            </h3>
            <p>{localizedStorefrontText(about.body, profile.locale)}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="home-content-section home-about" aria-labelledby="home-about-title">
      <div className="shell home-content-section__inner">
        <div>
          <h2 id="home-about-title">
            {localizedStorefrontText(about.title, profile.locale)}
          </h2>
          <p>{localizedStorefrontText(about.body, profile.locale)}</p>
        </div>
        <StorefrontLink to="/about" className="button button--secondary">
          {storefrontUiText(profile.locale, {
            ar: "اعرف المزيد",
            en: "Learn more",
          })}
        </StorefrontLink>
      </div>
    </section>
  );
};

export const HomeContactSection = ({
  profile,
}: {
  profile: ConfiguredStorefrontProfileDto;
}) => {
  const contact = profile.storefront.content.contact;

  if (profile.storefront.template_key === "luxe-commerce-full") {
    return null;
  }

  return (
    <section className="home-content-section home-contact" aria-labelledby="home-contact-title">
      <div className="shell home-content-section__inner home-content-section__inner--contact">
        <div>
          <h2 id="home-contact-title">
            {localizedStorefrontText(contact.heading, profile.locale)}
          </h2>
          <p>{localizedStorefrontText(contact.body, profile.locale)}</p>
        </div>
        <StoreContactLinks
          profile={profile}
          className="home-contact__links"
        />
        <StorefrontLink to="/contact" className="button button--secondary">
          {storefrontUiText(profile.locale, {
            ar: "صفحة التواصل",
            en: "Contact page",
          })}
        </StorefrontLink>
      </div>
    </section>
  );
};
