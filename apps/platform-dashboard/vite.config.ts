import { defineConfig, loadEnv } from "vite"
import react from "@vitejs/plugin-react"

const proxyPaths = ["/auth", "/admin", "/app"] as const

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")
  const backendUrl = env.VITE_MEDUSA_PROXY_TARGET || "http://127.0.0.1:9000"
  const proxy = Object.fromEntries(
    proxyPaths.map((path) => [
      path,
      {
        target: backendUrl,
        changeOrigin: true,
        secure: false,
      },
    ]),
  )

  return {
    plugins: [react()],
    server: {
      host: "127.0.0.1",
      port: 5174,
      strictPort: true,
      allowedHosts: ["terminal.local"],
      proxy,
    },
    preview: {
      host: "127.0.0.1",
      port: 4174,
      strictPort: true,
    },
  }
})
