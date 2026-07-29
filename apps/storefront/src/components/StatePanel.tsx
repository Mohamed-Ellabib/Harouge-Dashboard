import { BrokenLinkIcon, PackageIcon, RetryIcon } from "./Icons";

type StatePanelProps = {
  kind: "empty" | "not-found" | "unavailable";
  title: string;
  message: string;
  onRetry?: () => void;
  headingLevel?: 1 | 2;
};

export const StatePanel = ({
  kind,
  title,
  message,
  onRetry,
  headingLevel = 1,
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
        type="button"
        onClick={onRetry}
      >
        <RetryIcon />
        حاول مرة أخرى
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
