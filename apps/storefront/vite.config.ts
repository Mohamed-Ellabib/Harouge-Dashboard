import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

const MAX_PROXY_BODY_BYTES = 32 * 1024;
const MAX_PROXY_HEADER_BYTES = 16 * 1024;

const allowedProxyRoutes: Array<{
  methods: readonly string[];
  path: RegExp;
}> = [
  { methods: ["GET"], path: /^\/store\/vendors\/resolve$/ },
  { methods: ["GET"], path: /^\/store\/products(?:\/[^/]+)?$/ },
  { methods: ["GET"], path: /^\/store\/saas\/commerce-capabilities$/ },
  {
    methods: ["GET"],
    path: /^\/store\/saas\/products\/[^/]+\/purchase-options$/,
  },
  { methods: ["POST"], path: /^\/store\/carts$/ },
  { methods: ["GET", "POST"], path: /^\/store\/carts\/[^/]+$/ },
  { methods: ["POST"], path: /^\/store\/carts\/[^/]+\/line-items$/ },
  {
    methods: ["POST", "DELETE"],
    path: /^\/store\/carts\/[^/]+\/line-items\/[^/]+$/,
  },
  {
    methods: ["POST"],
    path: /^\/store\/carts\/[^/]+\/shipping-methods$/,
  },
  { methods: ["POST"], path: /^\/store\/carts\/[^/]+\/complete$/ },
  { methods: ["GET"], path: /^\/store\/shipping-options$/ },
  { methods: ["POST"], path: /^\/store\/payment-collections$/ },
  {
    methods: ["POST"],
    path: /^\/store\/payment-collections\/[^/]+\/payment-sessions$/,
  },
];

export const isAllowedStorefrontProxyRequest = (
  method: string,
  requestUrl: string,
): boolean => {
  const path = requestUrl.split("?")[0].replace(/\/+$/, "") || "/";
  const normalizedMethod = method.toUpperCase();
  return allowedProxyRoutes.some(
    (route) =>
      route.methods.includes(normalizedMethod) && route.path.test(path),
  );
};

const storefrontProxyGuard = () => ({
  name: "storefront-proxy-guard",
  configureServer(server: any) {
    server.middlewares.use((req: any, res: any, next: () => void) => {
      const url = String(req.url ?? "");
      if (!url.startsWith("/store")) return next();
      const contentLength = Number(req.headers?.["content-length"] ?? 0);
      const headerBytes = Object.entries(req.headers ?? {}).reduce(
        (total, [name, value]) =>
          total +
          Buffer.byteLength(name) +
          Buffer.byteLength(
            Array.isArray(value) ? value.join(",") : String(value ?? ""),
          ),
        0,
      );
      if (
        !isAllowedStorefrontProxyRequest(String(req.method ?? "GET"), url) ||
        !Number.isFinite(contentLength) ||
        contentLength < 0 ||
        contentLength > MAX_PROXY_BODY_BYTES ||
        headerBytes > MAX_PROXY_HEADER_BYTES
      ) {
        res.statusCode = 404;
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-store");
        res.end('{"message":"Storefront route was not found."}');
        return;
      }
      next();
    });
  },
});

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backendUrl = env.STOREFRONT_PROXY_TARGET || "http://127.0.0.1:9000";

  return {
    plugins: [storefrontProxyGuard(), react()],
    server: {
      host: "127.0.0.1",
      port: 5175,
      strictPort: true,
      allowedHosts: ["terminal.local"],
      proxy: {
        "/store": {
          target: backendUrl,
          changeOrigin: false,
          secure: false,
          proxyTimeout: 8_000,
          timeout: 8_000,
          configure(proxy) {
            proxy.on("proxyReq", (proxyRequest) => {
              proxyRequest.removeHeader("x-forwarded-for");
              proxyRequest.removeHeader("x-forwarded-host");
              proxyRequest.removeHeader("x-forwarded-proto");
              proxyRequest.removeHeader("forwarded");
            });
          },
        },
      },
    },
    preview: {
      host: "127.0.0.1",
      port: 4175,
      strictPort: true,
    },
  };
});
