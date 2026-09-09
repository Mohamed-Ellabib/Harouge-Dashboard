import { useEffect, useMemo, useState } from "react";

import { localizedStorefrontText } from "../lib/localization";
import {
  isLuxeCommerceTemplate,
  type ConfiguredStorefrontProfileDto,
} from "../types";
import { StorefrontLink } from "../lib/navigation";
import { ArrowLeftIcon } from "./Icons";

type HeroProps = {
  profile: ConfiguredStorefrontProfileDto;
};

export const Hero = ({ profile }: HeroProps) => {
  const hero = profile.storefront.content.hero;
  const locale = profile.locale;
  const imageUrl = hero.image_url;
  const luxe = isLuxeCommerceTemplate(profile.storefront.template_key);
  const fullSource =
    profile.storefront.template_key === "luxe-commerce-full";
  const slides = useMemo(
    () => luxe
      ? fullSource
        ? [
            imageUrl ||
              "/assets/luxe-full/customer-assets/home-hero-light-lifestyle.webp",
            "/assets/luxe-full/customer-assets/home-hero-light-watch.webp",
            "/assets/luxe-full/customer-assets/home-hero-light-accessories.webp",
          ]
        : [
            imageUrl || "/assets/luxe/home-hero-watch.webp",
            "/assets/luxe/home-hero-sunglasses.webp",
            "/assets/luxe/home-hero-pen.webp",
          ]
      : imageUrl ? [imageUrl] : [],
    [fullSource, imageUrl, luxe],
  );
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    setActiveSlide(0);
    if (slides.length < 2) return;
    const timer = window.setInterval(
      () => setActiveSlide((current) => (current + 1) % slides.length),
      5_200,
    );
    return () => window.clearInterval(timer);
  }, [slides]);

  return (
    <section className={`hero${luxe ? " luxe-home-hero" : ""}`} aria-labelledby="home-title">
      <div className="shell hero__inner">
        <div className="hero__content">
          <span className="eyebrow">
            {localizedStorefrontText(hero.eyebrow, locale)}
          </span>
          <h1 id="home-title">
            {localizedStorefrontText(hero.heading, locale)}
          </h1>
          <p>{localizedStorefrontText(hero.subheading, locale)}</p>
          <StorefrontLink
            to={hero.cta_target === "contact" ? "/contact" : "/products"}
            className="button button--primary hero__action"
          >
            {localizedStorefrontText(hero.cta_label, locale)}
            <ArrowLeftIcon />
          </StorefrontLink>
        </div>
        <div
          className={`hero__visual${imageUrl ? "" : " hero__visual--empty"}`}
          aria-hidden="true"
        >
          {slides.map((slide, index) => (
            <img
              key={slide}
              className={index === activeSlide ? "is-active" : ""}
              src={slide}
              alt=""
              aria-hidden={index !== activeSlide}
            />
          ))}
          <span className="hero__shape hero__shape--one" />
          <span className="hero__shape hero__shape--two" />
        </div>
        {luxe && slides.length > 1 ? (
          <div className="luxe-hero-dots" aria-label={profile.locale === "en-LY" ? "Hero images" : "صور الواجهة"}>
            {slides.map((slide, index) => (
              <button
                key={slide}
                type="button"
                className={index === activeSlide ? "is-active" : ""}
                aria-label={`${profile.locale === "en-LY" ? "Show image" : "عرض الصورة"} ${index + 1}`}
                onClick={() => setActiveSlide(index)}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
};
