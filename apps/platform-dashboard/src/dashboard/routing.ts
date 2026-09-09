import type { DashboardRoute, PlatformStorefrontTemplateKey } from "./types"
import { visualPreviewQuery } from "./visual-preview"

const routePaths: Record<DashboardRoute, string> = {
  overview: "/dashboard",
  requests: "/dashboard/requests",
  clients: "/dashboard/clients",
  storefronts: "/dashboard/storefronts",
  domains: "/dashboard/domains",
  deployments: "/dashboard/deployments",
  "vendor-accounts": "/dashboard/vendor-accounts",
  billing: "/dashboard/billing",
  operations: "/dashboard/operations",
  analytics: "/dashboard/analytics",
  security: "/dashboard/security",
  settings: "/dashboard/settings",
  commerce: "/dashboard/commerce",
}

export const DASHBOARD_BEFORE_NAVIGATION_EVENT = "labibtech:before-dashboard-navigation"

function dashboardNavigationAllowed(): boolean {
  return window.dispatchEvent(new CustomEvent(DASHBOARD_BEFORE_NAVIGATION_EVENT, { cancelable: true }))
}

export function pathForDashboardRoute(route: DashboardRoute): string {
  return routePaths[route]
}

export function dashboardRouteFromPath(pathname: string): DashboardRoute {
  const match = (Object.entries(routePaths) as [DashboardRoute, string][])
    .sort((a, b) => b[1].length - a[1].length)
    .find(([, path]) => pathname === path || pathname.startsWith(`${path}/`))

  return match?.[0] ?? "clients"
}

export function navigateDashboard(route: DashboardRoute): void {
  const target = `${pathForDashboardRoute(route)}${visualPreviewQuery()}`
  if (`${window.location.pathname}${window.location.search}` === target) {
    return
  }
  if (!dashboardNavigationAllowed()) return

  window.history.pushState({}, "", target)
  window.dispatchEvent(new PopStateEvent("popstate"))
}

export function navigateDashboardDetail(
  route: "clients" | "vendor-accounts" | "storefronts",
  id: string,
): void {
  const target = `${pathForDashboardRoute(route)}/${encodeURIComponent(id)}${visualPreviewQuery()}`
  if (`${window.location.pathname}${window.location.search}` === target) return
  if (!dashboardNavigationAllowed()) return
  window.history.pushState({}, "", target)
  window.dispatchEvent(new PopStateEvent("popstate"))
}

export function navigateStorefrontTemplatePreview(
  templateKey: PlatformStorefrontTemplateKey,
  locale: "en-LY" | "ar-LY" = "en-LY",
): void {
  const query = new URLSearchParams(visualPreviewQuery())
  query.set("locale", locale)
  const target = `/dashboard/template-preview/${encodeURIComponent(templateKey)}?${query}`
  if (`${window.location.pathname}${window.location.search}` === target) return
  if (!dashboardNavigationAllowed()) return
  window.history.pushState({}, "", target)
  window.dispatchEvent(new PopStateEvent("popstate"))
}
