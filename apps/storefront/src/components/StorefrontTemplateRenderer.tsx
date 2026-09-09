import type { CSSProperties, ReactNode } from "react";

import { storefrontDirection, storefrontLanguage } from "../lib/localization";
import type { StorefrontLocale, StorefrontTemplateKey } from "../types";

export const STOREFRONT_TEMPLATE_KEYS = [
  "luxe-commerce",
  "luxe-commerce-full",
  "modern-market",
  "home-living",
  "standard",
  "glow-beauty",
  "drops",
  "urbx",
  "template-6",
] as const satisfies readonly StorefrontTemplateKey[];

export type StorefrontTemplateDefinition = {
  key: StorefrontTemplateKey;
  rootClassName: string;
};

const TEMPLATE_DEFINITIONS: Record<
  StorefrontTemplateKey,
  StorefrontTemplateDefinition
> = {
  "luxe-commerce": {
    key: "luxe-commerce",
    rootClassName: "storefront-template--luxe-commerce",
  },
  "luxe-commerce-full": {
    key: "luxe-commerce-full",
    rootClassName:
      "storefront-template--luxe-commerce storefront-template--luxe-commerce-full",
  },
  "modern-market": {
    key: "modern-market",
    rootClassName: "storefront-template--modern-market",
  },
  "home-living": {
    key: "home-living",
    rootClassName: "storefront-template--home-living",
  },
  drops: { key: "drops", rootClassName: "storefront-template--drops" },
  urbx: { key: "urbx", rootClassName: "storefront-template--urbx" },
  "template-6": { key: "template-6", rootClassName: "storefront-template--template-6" },
  standard: {
    key: "standard",
    rootClassName: "storefront-template--standard",
  },
  "glow-beauty": {
    key: "glow-beauty",
    rootClassName: "storefront-template--glow-beauty",
  },
};

export const storefrontTemplateDefinition = (
  key: StorefrontTemplateKey,
): StorefrontTemplateDefinition => TEMPLATE_DEFINITIONS[key];

export const StorefrontTemplateRenderer = ({
  children,
  locale,
  style,
  templateKey,
}: {
  children: ReactNode;
  locale: StorefrontLocale;
  style?: CSSProperties;
  templateKey: StorefrontTemplateKey;
}) => {
  const template = storefrontTemplateDefinition(templateKey);

  return (
    <div
      data-urbx-heading-font={templateKey === "urbx" && Boolean((style as Record<string, unknown> | undefined)?.["--urbx-heading-font"]) || undefined}
      className={`app storefront-template ${template.rootClassName}`}
      data-storefront-template={template.key}
      dir={storefrontDirection(locale)}
      lang={storefrontLanguage(locale)}
      style={style}
    >
      {children}
    </div>
  );
};

export const StorefrontHomeComposition = ({
  about,
  catalog,
  contact,
  hero,
  templateKey,
}: {
  about: ReactNode;
  catalog: ReactNode;
  contact: ReactNode;
  hero: ReactNode;
  templateKey: StorefrontTemplateKey;
}) => {
  if (
    templateKey === "luxe-commerce" ||
    templateKey === "luxe-commerce-full"
  ) {
    return <>{hero}{catalog}{about}{contact}</>;
  }

  if (templateKey === "modern-market") {
    return <>{hero}{catalog}{contact}{about}</>;
  }

  return <>{hero}{about}{catalog}{contact}</>;
};
