type PlatformLoginRedirectOptions = {
  adminPath: `/${string}`
  signInUrl: string
}

const escapeInlineScriptValue = (value: string) =>
  JSON.stringify(value).replace(/</g, "\\u003c")

export const createPlatformLoginRedirectScript = ({
  adminPath,
  signInUrl,
}: PlatformLoginRedirectOptions) => {
  const normalizedAdminPath = adminPath.replace(/\/+$/, "")
  const medusaLoginPath = `${normalizedAdminPath}/login`
  return `
    (() => {
      const signInUrl = ${escapeInlineScriptValue(signInUrl)};
      const medusaLoginPaths = new Set([
        ${escapeInlineScriptValue(medusaLoginPath)},
        ${escapeInlineScriptValue(`${medusaLoginPath}/`)},
      ]);

      const isMedusaLoginUrl = (value) => {
        try {
          const url = new URL(value, window.location.href);
          return url.origin === window.location.origin && medusaLoginPaths.has(url.pathname);
        } catch {
          return false;
        }
      };

      const returnToPlatformSignIn = () => {
        window.location.replace(new URL(signInUrl, window.location.origin).href);
      };

      if (isMedusaLoginUrl(window.location.href)) {
        returnToPlatformSignIn();
        return;
      }

      for (const method of ["pushState", "replaceState"]) {
        const original = window.history[method].bind(window.history);

        window.history[method] = (state, unused, url) => {
          if (url && isMedusaLoginUrl(url)) {
            returnToPlatformSignIn();
            return;
          }

          return original(state, unused, url);
        };
      }

      window.addEventListener("popstate", () => {
        if (isMedusaLoginUrl(window.location.href)) {
          returnToPlatformSignIn();
        }
      });
    })();
  `
}

export const createPlatformLoginRedirectPlugin = (
  options: PlatformLoginRedirectOptions
) => {
  const redirectScript = createPlatformLoginRedirectScript(options)

  return {
    name: "labibtech-platform-login-redirect",
    enforce: "pre" as const,
    transformIndexHtml: {
      order: "pre" as const,
      handler: () => [
        {
          tag: "script",
          attrs: {
            "data-labibtech-platform-login-redirect": "",
          },
          children: redirectScript,
          injectTo: "head-prepend" as const,
        },
      ],
    },
  }
}
