import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const webRoot = path.dirname(fileURLToPath(import.meta.url));
  const projectRoot = path.resolve(webRoot, "../..");
  const env = loadEnv(mode, projectRoot, "");

  return {
    plugins: [react()],
    server: {
      host: env.WEB_HOST ?? "127.0.0.1",
      port: Number(env.WEB_PORT ?? 3000),
      proxy: {
        "/api": {
          target: env.VITE_API_PROXY_TARGET ?? "http://127.0.0.1:5000",
          changeOrigin: true,
          secure: false
        }
      }
    }
  };
});
