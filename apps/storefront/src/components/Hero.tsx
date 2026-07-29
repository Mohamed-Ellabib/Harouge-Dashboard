import type { StorefrontProfileDto } from "../types";
import { StorefrontLink } from "../lib/navigation";
import { ArrowLeftIcon } from "./Icons";

type HeroProps = {
  profile: StorefrontProfileDto;
};

export const Hero = ({ profile }: HeroProps) => (
  <section className="hero" aria-labelledby="home-title">
    <div className="shell hero__inner">
      <div className="hero__content">
        <span className="eyebrow">مرحباً بك في {profile.name}</span>
        <h1 id="home-title">اكتشف تشكيلتنا</h1>
        <p>منتجات مختارة بعناية، بتجربة بسيطة وواضحة.</p>
        <StorefrontLink
          to="/products"
          className="button button--primary hero__action"
        >
          تصفح المنتجات
          <ArrowLeftIcon />
        </StorefrontLink>
        <div className="hero__assurances" aria-label="مميزات التصفح">
          <span>اختيارات واضحة</span>
          <span>تفاصيل بسيطة</span>
          <span>تجربة عربية</span>
        </div>
      </div>
      <div className="hero__visual" aria-hidden="true">
        <img src="/assets/default-storefront-hero.png" alt="" />
        <span className="hero__shape hero__shape--one" />
        <span className="hero__shape hero__shape--two" />
      </div>
    </div>
  </section>
);
