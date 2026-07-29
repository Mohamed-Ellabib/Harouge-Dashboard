/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MEDUSA_BACKEND_URL?: string
  readonly VITE_MEDUSA_PROXY_TARGET?: string
  readonly VITE_PLATFORM_ADMIN_AFTER_LOGIN_URL?: string
  readonly VITE_PLATFORM_SUPPORT_EMAIL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
