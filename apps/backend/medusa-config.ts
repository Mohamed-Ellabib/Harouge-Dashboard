import { loadEnv, defineConfig } from "@medusajs/framework/utils";
import { createPlatformLoginRedirectPlugin } from "./src/admin/platform-login-redirect";

if (process.env.PHASE3A_STOREFRONT_SMOKE !== "guarded-local-phase3a") {
  loadEnv(process.env.NODE_ENV || "development", process.cwd());
}

const adminPath = "/app" as const;
const platformAdminLoginUrl =
  process.env.PLATFORM_ADMIN_LOGIN_URL?.trim() ||
  (process.env.NODE_ENV === "development" ? "http://127.0.0.1:5174/" : "/");

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET,
      cookieSecret: process.env.COOKIE_SECRET,
    },
  },
  modules: [
    {
      resolve: "./src/modules/marketplace",
    },
    {
      resolve: "./src/modules/saas",
    },
  ],
  admin: {
    path: adminPath,
    vite: () => ({
      plugins: [
        createPlatformLoginRedirectPlugin({
          adminPath,
          signInUrl: platformAdminLoginUrl,
        }),
      ],
    }),
  },
});
