import { Loader, ShieldCheck } from "@medusajs/icons"
import { useEffect, useState } from "react"

import {
  getCurrentPlatformAdmin,
  signOutPlatformAdmin,
  type PlatformAdmin,
} from "../auth/platform-auth"
import { DashboardShell } from "./components/DashboardShell"
import { PlatformModulePage } from "./components/PlatformModulePage"
import { PortfolioPage } from "./components/PortfolioPage"
import { dashboardRouteFromPath } from "./routing"
import type { DashboardRoute } from "./types"

function useDashboardRoute(): DashboardRoute {
  const [route, setRoute] = useState(() => dashboardRouteFromPath(window.location.pathname))

  useEffect(() => {
    const updateRoute = () => setRoute(dashboardRouteFromPath(window.location.pathname))
    window.addEventListener("popstate", updateRoute)
    return () => window.removeEventListener("popstate", updateRoute)
  }, [])

  return route
}

export function OwnerDashboard() {
  const route = useDashboardRoute()
  const visualPreview =
    import.meta.env.DEV && new URLSearchParams(window.location.search).get("demo") === "1"
  const [admin, setAdmin] = useState<PlatformAdmin | null>(
    visualPreview
      ? {
          id: "local-visual-preview",
          email: "owner@labibtech.local",
          first_name: "محمد",
          last_name: "اللبيب",
        }
      : null,
  )
  const [authState, setAuthState] = useState<"checking" | "authenticated" | "failed">(
    visualPreview ? "authenticated" : "checking",
  )

  useEffect(() => {
    if (visualPreview) {
      return
    }

    let active = true

    getCurrentPlatformAdmin()
      .then((currentAdmin) => {
        if (!active) return
        setAdmin(currentAdmin)
        setAuthState("authenticated")
      })
      .catch(() => {
        if (!active) return
        setAuthState("failed")
        window.location.replace("/")
      })

    return () => {
      active = false
    }
  }, [visualPreview])

  const handleSignOut = async () => {
    try {
      await signOutPlatformAdmin()
    } finally {
      window.location.replace("/")
    }
  }

  if (authState !== "authenticated" || !admin) {
    return (
      <main className="owner-auth-check" dir="rtl">
        <div>
          <ShieldCheck />
          <Loader className="owner-auth-check__spinner" />
        </div>
        <strong>جارٍ التحقق من صلاحية الإدارة الرئيسية</strong>
        <span>{authState === "failed" ? "جارٍ إعادتك إلى تسجيل الدخول..." : "لحظات من فضلك"}</span>
      </main>
    )
  }

  return (
    <DashboardShell admin={admin} activeRoute={route} onSignOut={handleSignOut}>
      {route === "clients" || route === "overview" ? (
        <PortfolioPage />
      ) : (
        <PlatformModulePage route={route} />
      )}
    </DashboardShell>
  )
}
