import { BrokenLinkIcon, PackageIcon, RetryIcon } from "./Icons";
import { storefrontUiText } from "../lib/localization";
import type { StorefrontLocale } from "../types";

type StatePanelProps = {
  kind: "empty" | "not-found" | "unavailable";
  title: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  retryDisabled?: boolean;
  headingLevel?: 1 | 2;
  locale?: StorefrontLocale;
};

export const StatePanel = ({
  kind,
  title,
  message,
  onRetry,
  retryLabel,
  retryDisabled = false,
  headingLevel = 1,
  locale = "ar-LY",
}: StatePanelProps) => (
  <section className={`state-panel state-panel--${kind}`} aria-live="polite">
    <span className="state-panel__icon" aria-hidden="true">
      {kind === "empty" ? <PackageIcon /> : <BrokenLinkIcon />}
    </span>
    {headingLevel === 1 ? <h1>{title}</h1> : <h2>{title}</h2>}
    <p>{message}</p>
    {onRetry ? (
      <button
        className="button button--primary"
        aria-busy={retryDisabled}
        disabled={retryDisabled}
        type="button"
        onClick={onRetry}
      >
        <RetryIcon />
        {retryLabel ??
          storefrontUiText(locale, {
            ar: "حاول مرة أخرى",
            en: "Try again",
          })}
      </button>
    ) : null}
  </section>
);

export const CatalogSkeleton = ({ count = 8 }: { count?: number }) => (
  <div className="product-grid" aria-hidden="true">
    {Array.from({ length: count }, (_, index) => (
      <div className="product-skeleton" key={index}>
        <span className="skeleton product-skeleton__image" />
        <span className="skeleton product-skeleton__title" />
        <span className="skeleton product-skeleton__line" />
      </div>
    ))}
  </div>
);
