import type { DashboardRoute } from "./types"

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
  security: "/dashboard/security",
  settings: "/dashboard/settings",
  commerce: "/dashboard/commerce",
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
  const preserveVisualPreview =
    import.meta.env.DEV && new URLSearchParams(window.location.search).get("demo") === "1"
  const target = `${pathForDashboardRoute(route)}${preserveVisualPreview ? "?demo=1" : ""}`
  if (`${window.location.pathname}${window.location.search}` === target) {
    return
  }

  window.history.pushState({}, "", target)
  window.dispatchEvent(new PopStateEvent("popstate"))
}
