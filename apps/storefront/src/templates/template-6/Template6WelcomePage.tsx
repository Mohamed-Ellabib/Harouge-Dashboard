import { useEffect, type CSSProperties } from "react";
import { navigate } from "../../lib/navigation";
import type { ConfiguredStorefrontProfileDto } from "../../types";
import { useGlowBeautyDesignEditor } from "../glow-beauty/GlowBeautyDesignEditor";
import { template6Welcome } from "./template-6-preview-data";
import "./template-6-welcome.css";

export default function Template6WelcomePage({ profile }: { profile: ConfiguredStorefrontProfileDto }) {
  const editor = useGlowBeautyDesignEditor();
  const hero = profile.storefront.content.hero;
  const heading = editor.value("hero.heading", hero.heading.en);
  const description = editor.value("hero.subheading", hero.subheading.en);
  useEffect(() => { document.title = `Welcome | ${profile.name}`; }, [profile.name]);
  const colors = { "--template-six-accent": profile.branding.primary_color || "#eeff66",
    "--template-six-canvas": profile.branding.secondary_color || "#2c9db6" } as CSSProperties;

  return <div className="template-six-welcome" dir="ltr" lang="en" style={colors}>
    <section className="template-six-welcome__scene" aria-label={`${profile.name} welcome`}>
      <img className="template-six-welcome__art" src={editor.value("hero.image", hero.slides.find(slide => slide.enabled)?.image_url || hero.image_url || template6Welcome.image)}
        alt="Summer fashion: colorful sunglasses, a daisy and a red tee against a turquoise sky"
        width="864" height="1821" {...{ fetchpriority: "high" }} {...editor.target("hero.image", "welcome photograph")} />
      <div className="template-six-welcome__copy">
        <h1 {...editor.target("hero.heading", "welcome headline")}>
          {heading === template6Welcome.heading ? <><span>DISCOVER BEST</span><span>DEALS ITEMS</span><span>NEARBY</span></> : heading}
        </h1>
        <p {...editor.target("hero.subheading", "welcome description")}>
          {description === template6Welcome.subheading ? <>A smarter marketplace for the UAE &amp; GCC —<br />fast, trusted, and made for your lifestyle.</> : description}
        </p>
        {/* Reference indicators: only the first supplied welcome screen exists so far. */}
        <div className="template-six-welcome__pagination" aria-hidden="true"><i /><i /><i /></div>
      </div>
      <button type="button" className="template-six-welcome__start" onClick={() => navigate("/")}
        {...editor.target("hero.cta_label", "get started button")}>
        {editor.value("hero.cta_label", hero.cta_label.en)}
      </button>
    </section>
  </div>;
}
