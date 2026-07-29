/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MEDUSA_PUBLISHABLE_KEY?: string;
  readonly VITE_STOREFRONT_DEV_HANDLE?: string;
  readonly VITE_STOREFRONT_VISUAL_PREVIEW?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
