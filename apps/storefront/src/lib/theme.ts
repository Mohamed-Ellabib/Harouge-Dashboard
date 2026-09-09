const FALLBACK_ACCENT = "#1455e6";
const REQUIRED_TEXT_CONTRAST = 4.5;
const CAIRO_FONT_FAMILY =
  '"Cairo Variable", "Cairo", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

export type StorefrontTheme = {
  configuredColor: string | null;
  decorationColor: string;
  secondaryDecorationColor: string;
  accentColor: string;
  accentHoverColor: string;
  accentSoftColor: string;
  onAccentColor: "#ffffff";
};

const hexPattern = /^#[0-9a-f]{6}$/i;

export const normalizeHexColor = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return hexPattern.test(normalized) ? normalized : null;
};

const channelsFromHex = (hex: string): [number, number, number] => [
  Number.parseInt(hex.slice(1, 3), 16),
  Number.parseInt(hex.slice(3, 5), 16),
  Number.parseInt(hex.slice(5, 7), 16),
];

const hexFromChannels = (channels: readonly number[]): string =>
  `#${channels
    .map((channel) =>
      Math.round(Math.min(255, Math.max(0, channel)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;

const mix = (
  foreground: string,
  background: string,
  weight: number,
): string => {
  const foregroundChannels = channelsFromHex(foreground);
  const backgroundChannels = channelsFromHex(background);
  const boundedWeight = Math.min(1, Math.max(0, weight));

  return hexFromChannels(
    foregroundChannels.map(
      (channel, index) =>
        channel * boundedWeight +
        backgroundChannels[index] * (1 - boundedWeight),
    ),
  );
};

const relativeLuminance = (hex: string): number => {
  const channels = channelsFromHex(hex).map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });

  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
};

export const contrastRatio = (first: string, second: string): number => {
  const firstColor = normalizeHexColor(first);
  const secondColor = normalizeHexColor(second);

  if (!firstColor || !secondColor) {
    return 1;
  }

  const lighter = Math.max(
    relativeLuminance(firstColor),
    relativeLuminance(secondColor),
  );
  const darker = Math.min(
    relativeLuminance(firstColor),
    relativeLuminance(secondColor),
  );

  return (lighter + 0.05) / (darker + 0.05);
};

const contrastSafeAccent = (color: string): string => {
  if (contrastRatio(color, "#ffffff") >= REQUIRED_TEXT_CONTRAST) {
    return color;
  }

  for (let darkness = 0.06; darkness <= 0.9; darkness += 0.04) {
    const candidate = mix("#000000", color, darkness);
    if (contrastRatio(candidate, "#ffffff") >= REQUIRED_TEXT_CONTRAST) {
      return candidate;
    }
  }

  return FALLBACK_ACCENT;
};

export const deriveStorefrontTheme = (
  primaryColor: unknown,
  secondaryColor?: unknown,
): StorefrontTheme => {
  const configuredColor = normalizeHexColor(primaryColor);
  const decorationColor = configuredColor ?? FALLBACK_ACCENT;
  const secondaryDecorationColor =
    normalizeHexColor(secondaryColor) ?? decorationColor;
  const accentColor = contrastSafeAccent(decorationColor);

  return {
    configuredColor,
    decorationColor,
    secondaryDecorationColor,
    accentColor,
    accentHoverColor: mix("#000000", accentColor, 0.14),
    accentSoftColor: mix(accentColor, "#ffffff", 0.1),
    onAccentColor: "#ffffff",
  };
};

export const storefrontThemeCssVariables = (
  theme: StorefrontTheme,
): Record<`--${string}`, string> => ({
  "--brand-decoration": theme.decorationColor,
  "--brand-secondary-decoration": theme.secondaryDecorationColor,
  "--brand-secondary-decoration-soft": mix(
    theme.secondaryDecorationColor,
    "#ffffff",
    0.12,
  ),
  "--brand-accent": theme.accentColor,
  "--brand-accent-hover": theme.accentHoverColor,
  "--brand-accent-soft": theme.accentSoftColor,
  "--brand-on-accent": theme.onAccentColor,
});

export const storefrontTypographyCssVariables = (
  typographyKey: unknown,
): Record<"--storefront-font-family", string> => ({
  "--storefront-font-family":
    typographyKey === "cairo" ? CAIRO_FONT_FAMILY : CAIRO_FONT_FAMILY,
});
