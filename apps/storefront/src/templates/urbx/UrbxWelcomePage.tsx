import { useEffect, useRef, useState, type CSSProperties } from "react";
import { PiArrowRight, PiCrownSimpleThin, PiGlobeThin, PiLightningThin, PiX } from "react-icons/pi";
import { navigate } from "../../lib/navigation";
import type { ConfiguredStorefrontProfileDto } from "../../types";
import { useGlowBeautyDesignEditor } from "../glow-beauty/GlowBeautyDesignEditor";
import "./urbx-welcome.css";

const asset = (name: string) => `/assets/urbx/${name}`;
const benefitIcons = [PiCrownSimpleThin, PiGlobeThin, PiLightningThin];

export default function UrbxWelcomePage({ profile }: { profile: ConfiguredStorefrontProfileDto }) {
  const editor = useGlowBeautyDesignEditor();
  const content = profile.storefront.content;
  const hero = content.hero;
  const heading = editor.value("hero.heading", hero.heading.en);
  const intro = editor.value("hero.subheading", hero.subheading.en);
  const [notice, setNotice] = useState<"language" | "signin" | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const activeTrigger = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (notice) { activeTrigger.current = document.activeElement as HTMLElement; dialog.current?.showModal(); }
    else { dialog.current?.close(); activeTrigger.current?.focus(); }
  }, [notice]);
  const colors = { "--urbx-accent": profile.branding.primary_color || "#d5ff00",
    "--urbx-canvas": profile.branding.secondary_color || "#070707" } as CSSProperties;
  return <div className="urbx-welcome" dir="ltr" lang="en" style={colors}>
    <section className="urbx-welcome__scene" aria-label={`${profile.name} streetwear`}>
      <img className="urbx-welcome__art" src={editor.value("hero.image", hero.slides.find(slide => slide.enabled)?.image_url || hero.image_url || asset("welcome-alley-v1.png"))}
        alt="Streetwear model in a black graffiti hoodie, standing in a nighttime city alley" {...{ fetchpriority: "high" }} width="864" height="1821"
        {...editor.target("hero.image", "welcome photograph")} />
      <button className="urbx-welcome__language" type="button" aria-label="Language: English" onClick={() => setNotice("language")}><PiGlobeThin aria-hidden="true" /><span>EN</span></button>
      <div className="urbx-welcome__identity">
        {profile.branding.logo_url || profile.name === "URBX"
          ? <img className="urbx-welcome__wordmark" src={profile.branding.logo_url || asset("urbx-wordmark-v1.png")} alt={profile.name} />
          : <p className="urbx-welcome__custom-name">{profile.name}</p>}
      </div>
      <p className="urbx-welcome__tagline" {...editor.target("about.title", "brand tagline")}>{editor.value("about.title", content.about.title.en)}</p>
      <h1 className="urbx-welcome__headline" {...editor.target("hero.heading", "welcome headline")}>
        {heading === "BUILT DIFFERENT. MADE TO" ? <><span>BUILT</span><span>DIFFERENT.</span><span>MADE TO</span></> : heading}
      </h1>
      <div className="urbx-welcome__statement">
        <p {...editor.target("hero.eyebrow", "statement")}>{editor.value("hero.eyebrow", hero.eyebrow.en)}</p>
        <img src={asset("brush-underline-v1.png")} alt="" aria-hidden="true" />
      </div>
      <p className="urbx-welcome__intro" {...editor.target("hero.subheading", "welcome description")}>
        {intro === "URBX is more than clothing. It’s a mindset. A movement. A way of life."
          ? <>URBX is more than clothing.<br />It’s a mindset. A movement.<br />A way of life.</> : intro}
      </p>
      <div className="urbx-welcome__benefits">
        {hero.benefits.slice(0, 3).map((benefit, index) => {
          const Icon = benefitIcons[index];
          return <div className="urbx-welcome__benefit" key={benefit.id}>
            <Icon aria-hidden="true" />
            <span {...editor.target(`benefit.${benefit.id}.title`, "benefit title")}>{editor.value(`benefit.${benefit.id}.title`, benefit.title.en)}</span>
            <span {...editor.target(`benefit.${benefit.id}.subtitle`, "benefit description")}>{editor.value(`benefit.${benefit.id}.subtitle`, benefit.subtitle.en)}</span>
          </div>;
        })}
      </div>
      <button className="urbx-welcome__shop" type="button" onClick={() => navigate("/")} {...editor.target("hero.cta_label", "shopping button")}>
        <span>{editor.value("hero.cta_label", hero.cta_label.en)}</span><PiArrowRight aria-hidden="true" />
      </button>
      <p className="urbx-welcome__signin">Already part of the crew? <button type="button" onClick={() => setNotice("signin")}>Sign in</button></p>
    </section>
    <dialog className="urbx-notice" ref={dialog} aria-labelledby="urbx-notice-title" onCancel={event => { event.preventDefault(); setNotice(null); }}>
      <button type="button" className="urbx-notice__close" aria-label="Close" onClick={() => setNotice(null)}><PiX /></button>
      <h2 id="urbx-notice-title">{notice === "language" ? "English storefront" : "Shop without an account"}</h2>
      <p>{notice === "language" ? "This template’s reference design is currently available in English." : "Customer sign-in is not available yet. You can browse and check out as a guest, then track your order with its order link."}</p>
      <button className="urbx-notice__action" onClick={() => { setNotice(null); if (notice === "signin") navigate("/products"); }}>{notice === "language" ? "Continue in English" : "Start shopping"}<PiArrowRight /></button>
    </dialog>
  </div>;
}
