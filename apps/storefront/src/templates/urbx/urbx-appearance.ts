import type { CSSProperties } from "react";
import "./urbx-fonts.css";
import type { StorefrontAppearance } from "../../types";

const fonts = {
  cairo: '"Cairo Variable", "Cairo", sans-serif',
  manrope: '"Manrope Variable", "Manrope", sans-serif',
  condensed: '"URBX Roboto", Arial, sans-serif',
  anton: '"URBX Anton", Impact, sans-serif',
  marker: '"URBX Marker", cursive',
  system: 'system-ui, sans-serif',
  serif: 'Georgia, serif',
};
const colors = {
  text_color: "--urbx-text", heading_color: "--urbx-heading-color",
  muted_text_color: "--urbx-muted", button_text_color: "--urbx-button-text",
  surface_color: "--urbx-surface", navbar_background: "--urbx-nav-background",
  navbar_text_color: "--urbx-nav-text", navbar_active_color: "--urbx-nav-active",
} as const;

export function urbxAppearanceStyle(appearance?: StorefrontAppearance): CSSProperties {
  const style: Record<string, string> = {};
  for (const [key, variable] of Object.entries(colors)) {
    const value = appearance?.[key as keyof typeof colors];
    if (value && /^#[0-9a-f]{6}$/i.test(value)) style[variable] = value;
  }
  for (const [key, variable] of [["body_font", "--urbx-body-font"], ["heading_font", "--urbx-heading-font"]] as const) {
    const keyValue = appearance?.[key];
    if (keyValue && keyValue !== "original" && keyValue in fonts) style[variable] = fonts[keyValue];
  }
  return style as CSSProperties;
}
