import { MouseEvent, useEffect, useState } from "react";
import { IoArrowForward } from "react-icons/io5";
import { useGlowBeautyDesignEditor } from "./GlowBeautyDesignEditor";

import "./glow-beauty-home.css";
import "./glow-beauty-welcome.css";

const previewHome = "/?preview=1&template=glow-beauty";

export function GlowBeautyWelcomePage() {
  const design = useGlowBeautyDesignEditor();
  const [activeSlide, setActiveSlide] = useState(0);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const previousTitle = document.title;
    const previousLang = document.documentElement.lang;
    const previousDirection = document.documentElement.dir;
    document.title = "Discover Your Natural Glow — Glow Beauty Preview";
    document.documentElement.lang = "en";
    document.documentElement.dir = "ltr";
    document.documentElement.classList.add("glow-beauty-preview-document");
    document.body.classList.add("glow-beauty-preview-document");
    return () => {
      document.title = previousTitle;
      document.documentElement.lang = previousLang;
      document.documentElement.dir = previousDirection;
      document.documentElement.classList.remove("glow-beauty-preview-document");
      document.body.classList.remove("glow-beauty-preview-document");
    };
  }, []);

  const exploreBeauty = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    setIsExiting(true);
    window.setTimeout(() => {
      window.location.href = previewHome;
    }, 320);
  };

  return (
    <main className={`glow-beauty-page glow-beauty-welcome-page slide-${activeSlide}${isExiting ? " is-exiting" : ""}`} dir="ltr" lang="en">
      <img
        className="glow-beauty-welcome-page__campaign"
        src="/assets/glow-beauty/welcome-campaign-v2.png"
        alt="Glow Beauty model with serum, day cream, rose perfume, and lipstick"
      />

      <section className="glow-beauty-welcome-page__content" aria-labelledby="glow-beauty-welcome-title">
        <img className="glow-beauty-welcome-page__mark" src="/assets/glow-beauty/glow-petal-mark-v1.png" alt="" aria-hidden="true" />
        <p className="glow-beauty-welcome-page__brand">{design.storeName ?? "GLOW BEAUTY"}</p>
        <h1 id="glow-beauty-welcome-title"><span>DISCOVER YOUR</span><strong>NATURAL GLOW</strong></h1>
        <p className="glow-beauty-welcome-page__intro">Premium beauty essentials curated for<br />your skin, style, and everyday confidence.</p>
        <a href={previewHome} onClick={exploreBeauty}>EXPLORE BEAUTY <IoArrowForward aria-hidden="true" /></a>
      </section>

      <nav className="glow-beauty-welcome-page__dots" aria-label="Welcome slides">
        {[0, 1, 2].map((slide) => (
          <button
            type="button"
            key={slide}
            className={activeSlide === slide ? "is-active" : ""}
            aria-label={`Show welcome slide ${slide + 1}`}
            aria-pressed={activeSlide === slide}
            onClick={() => setActiveSlide(slide)}
          />
        ))}
      </nav>
    </main>
  );
}

export default GlowBeautyWelcomePage;
