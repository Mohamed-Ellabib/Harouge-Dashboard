import { useEffect, useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";

export type StorefrontLocation = {
  pathname: string;
  search: string;
};

const currentLocation = (): StorefrontLocation => ({
  pathname: window.location.pathname,
  search: window.location.search,
});

export const navigate = (to: string, options?: { replace?: boolean }) => {
  const target = new URL(to, window.location.origin);

  if (target.origin !== window.location.origin) {
    window.location.assign(target);
    return;
  }

  const current = new URL(window.location.href);
  const editorPreview = current.searchParams.get("editor-preview") === "1";
  const developmentPreview = import.meta.env.DEV && (
    import.meta.env.VITE_STOREFRONT_VISUAL_PREVIEW === "true" ||
    current.searchParams.get("preview") === "1"
  );
  if (editorPreview || developmentPreview) {
    for (const key of ["editor-preview", "setup-preview", "design-editor", "channel", "preview", "template", "locale"]) {
      const value = current.searchParams.get(key);
      if (value && !target.searchParams.has(key)) target.searchParams.set(key, value);
    }
  }

  const method = options?.replace ? "replaceState" : "pushState";
  window.history[method](
    {},
    "",
    `${target.pathname}${target.search}${target.hash}`,
  );
  window.dispatchEvent(new Event("storefront:navigate"));
};

export const useStorefrontLocation = (): StorefrontLocation => {
  const [location, setLocation] = useState(currentLocation);

  useEffect(() => {
    const update = () => setLocation(currentLocation());
    window.addEventListener("popstate", update);
    window.addEventListener("storefront:navigate", update);

    return () => {
      window.removeEventListener("popstate", update);
      window.removeEventListener("storefront:navigate", update);
    };
  }, []);

  return location;
};

type StorefrontLinkProps = {
  to: string;
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
  onNavigate?: () => void;
  style?: CSSProperties;
};

export const StorefrontLink = ({
  to,
  children,
  className,
  ariaLabel,
  onNavigate,
  style,
}: StorefrontLinkProps) => {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    event.preventDefault();
    onNavigate?.();
    navigate(to);
  };

  return (
    <a
      href={to}
      className={className}
      aria-label={ariaLabel}
      style={style}
      onClick={handleClick}
    >
      {children}
    </a>
  );
};
