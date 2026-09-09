import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { allowedStorefrontEditorOrigins, parseStorefrontEditorPreviewProfile } from "../../editor-preview";
import type { StorefrontProfileDto } from "../../types";
import { deriveStorefrontTheme } from "../../lib/theme";
import "./glow-beauty-design-editor.css";

type DesignState = { profile: StorefrontProfileDto | null; editing: boolean };
const Context = createContext<DesignState>({ profile: null, editing: false });

// Only the owner's selected name/colors and content; never change layout, locale or commerce.
export function useGlowBeautyPalette(profile: StorefrontProfileDto | null) {
  const templateKey = profile?.storefront?.template_key;
  const primary = profile?.branding.primary_color;
  const secondary = profile?.branding.secondary_color;
  useEffect(() => {
    if (templateKey !== "standard" && templateKey !== "drops") return;
    const root = document.documentElement;
    const defaultAccent = templateKey === "drops" ? "#009b4d" : "#3f2100";
    const defaultBackground = templateKey === "drops" ? "#ffffff" : "#fcf8f3";
    if (primary && primary !== defaultAccent) root.style.setProperty("--template-accent", primary);
    if (secondary && secondary !== defaultBackground) root.style.setProperty("--template-canvas", secondary);
    return () => { root.style.removeProperty("--template-accent"); root.style.removeProperty("--template-canvas"); };
  }, [templateKey, primary, secondary]);
  const storeName = profile?.storefront?.template_key === "glow-beauty" ? profile.name : null;
  useEffect(() => {
    if (!storeName) return;
    const root = document.documentElement;
    const theme = deriveStorefrontTheme(primary ?? "#f35b05", secondary ?? "#fffaf5");
    root.classList.add("glow-design-personalized");
    root.classList.toggle("glow-design-background", Boolean(secondary && secondary.toLowerCase() !== "#fffaf5"));
    root.style.setProperty("--glow-canvas-accent", primary && primary !== "#f35b05" ? theme.accentColor : "#f35b05");
    root.style.setProperty("--glow-canvas-accent-deep", primary && primary !== "#f35b05" ? theme.accentHoverColor : "#d94800");
    root.style.setProperty("--glow-canvas-background", theme.secondaryDecorationColor);
    return () => {
      root.classList.remove("glow-design-personalized");
      root.classList.remove("glow-design-background");
      ["--glow-canvas-accent", "--glow-canvas-accent-deep", "--glow-canvas-background"].forEach(key => root.style.removeProperty(key));
    };
  }, [primary, secondary, storeName]);
}

export function GlowBeautyDesignEditor({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DesignState>({ profile: null, editing: false });
  // Embedded canonical previews use App's profile; standalone design fixtures use this one.
  useGlowBeautyPalette(new URLSearchParams(window.location.search).get("editor-preview") === "1" ? null : state.profile);
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const channel = query.get("channel") ?? "";
    const setup = query.get("editor-preview") === "1";
    if ((!import.meta.env.DEV && !setup) || window.parent === window || query.get("design-editor") !== "1" ||
      (!setup && query.get("preview") !== "1") || !["glow-beauty", "standard", "drops", "luxe-commerce-full", "urbx", "template-6"].includes(query.get("template") ?? "") || !/^[a-zA-Z0-9-]{16,100}$/.test(channel)) return;
    const origins = allowedStorefrontEditorOrigins(import.meta.env.VITE_PLATFORM_ADMIN_ORIGIN, import.meta.env.DEV);
    let parentOrigin: string | null = null;
    let editing = false;
    const receive = (event: MessageEvent<unknown>) => {
      if (event.source !== window.parent || !origins.includes(event.origin) || !event.data || typeof event.data !== "object") return;
      const message = event.data as Record<string, unknown>;
      if (message.type !== "labibtech:glow-design-content" || message.version !== 1 || message.channel !== channel || typeof message.editing !== "boolean") return;
      const profile = parseStorefrontEditorPreviewProfile(message.profile);
      if (!profile || profile.storefront?.template_key !== query.get("template")) return;
      parentOrigin = event.origin;
      editing = message.editing;
      setState({ profile, editing });
      document.documentElement.classList.toggle("glow-design-editing", editing);
    };
    const select = (event: MouseEvent | KeyboardEvent) => {
      if (!parentOrigin || !(event.target instanceof Element)) return;
      if (event instanceof KeyboardEvent && event.key !== "Enter" && event.key !== " ") return;
      if (event instanceof MouseEvent && (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)) return;
      const item = event.target.closest<HTMLElement>("[data-glow-edit]");
      if (editing && item) {
        event.preventDefault(); event.stopImmediatePropagation();
        window.parent.postMessage({ type: "labibtech:glow-design-select", version: 1, channel, key: item.dataset.glowEdit }, parentOrigin);
        return;
      }
      // Direct preview pages are entry points, not the live app router. Carry the
      // authenticated canvas channel across them without leaking it externally.
      if (setup) return; // The canonical client router preserves the setup channel.
      const anchor = event.target.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || event instanceof KeyboardEvent) return;
      const target = new URL(anchor.href, window.location.origin);
      if (target.origin !== window.location.origin) return;
      event.preventDefault(); event.stopImmediatePropagation();
      target.searchParams.set("preview", "1");
      target.searchParams.set("template", query.get("template")!);
      target.searchParams.set("design-editor", "1");
      target.searchParams.set("channel", channel);
      window.location.assign(target.toString());
    };
    window.addEventListener("message", receive);
    document.addEventListener("click", select, true);
    document.addEventListener("keydown", select, true);
    origins.forEach(origin => window.parent.postMessage({ type: "labibtech:glow-design-ready", version: 1, channel }, origin));
    return () => {
      window.removeEventListener("message", receive);
      document.removeEventListener("click", select, true);
      document.removeEventListener("keydown", select, true);
      document.documentElement.classList.remove("glow-design-editing");
    };
  }, []);
  return <Context.Provider value={state}>{children}</Context.Provider>;
}

export function useGlowBeautyDesignEditor() {
  const { profile, editing } = useContext(Context);
  const content = profile?.storefront?.content;
  const value = (key: string, fallback: string): string => {
    if (!content) return fallback;
    if (key === "contact.heading") return content.contact.heading.en || fallback;
    if (key === "contact.body") return content.contact.body.en || fallback;
    if (key === "brands.promotion_image_url") return content.brands.promotion_image_url ?? "";
    if (key.startsWith("brands.") && ["heading", "subheading", "search_placeholder", "explore_label", "view_all_label", "promotion_heading", "promotion_subheading"].includes(key.slice(7))) {
      return content.brands[key.slice(7) as "heading" | "subheading" | "search_placeholder" | "explore_label" | "view_all_label" | "promotion_heading" | "promotion_subheading"]?.en ?? fallback;
    }
    if (key.startsWith("shop.") && content.shop && Object.hasOwn(content.shop, key.slice(5))) {
      return content.shop[key.slice(5) as keyof typeof content.shop].en || fallback;
    }
    if (key.startsWith("home.") && content.home) {
      const name = key.slice(5);
      if (Object.hasOwn(content.home, name)) {
        const field = content.home[name as keyof typeof content.home];
        return typeof field === "string" ? field : field.en || fallback;
      }
    }
    if (key === "about.title") return content.about.title.en || fallback;
    const benefitMatch = /^benefit\.([a-z0-9-]+)\.(title|subtitle)$/.exec(key);
    if (benefitMatch) return content.hero.benefits.find(item => item.id === benefitMatch[1])?.[benefitMatch[2] as "title" | "subtitle"].en || fallback;
    const heroFields = ["eyebrow", "heading", "subheading", "cta_label"] as const;
    const heroKey = heroFields.find(item => key === `hero.${item}`);
    if (heroKey) return content.hero[heroKey].en || fallback;
    if (key === "hero.image") return content.hero.slides.find(item => item.enabled)?.image_url ?? content.hero.image_url ?? fallback;
    if (key === "offer.image") return content.hero.slides.filter(item => item.enabled)[1]?.image_url ?? fallback;
    const [, slug, property] = key.split(".");
    if (key.startsWith("category.")) {
      const brand = content.brands.items.find(item => item.slug === slug);
      return (property === "image" ? brand?.image_url : property === "banner" ? brand?.banner_image_url : brand?.name.en) || fallback;
    }
    if (key.startsWith("navigation.")) return content.navigation.items.find(item => item.key === slug)?.label.en || fallback;
    return fallback;
  };
  const target = (key: string, label: string) => editing ? {
    "data-glow-edit": key,
    tabIndex: 0,
    role: "button" as const,
    "aria-label": `Edit ${label}`,
    title: `Edit ${label}`,
  } : {};
  return { value, target, storeName: profile?.name };
}
