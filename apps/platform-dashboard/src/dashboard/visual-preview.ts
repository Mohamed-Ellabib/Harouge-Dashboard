const VISUAL_PREVIEW_QUERY = "demo"

export function isAdminVisualPreviewEnabled(search = window.location.search): boolean {
  return (
    import.meta.env.DEV &&
    import.meta.env.VITE_ENABLE_ADMIN_VISUAL_PREVIEW === "true" &&
    new URLSearchParams(search).get(VISUAL_PREVIEW_QUERY) === "1"
  )
}

export function visualPreviewQuery(search = window.location.search): string {
  return isAdminVisualPreviewEnabled(search) ? "?demo=1" : ""
}
