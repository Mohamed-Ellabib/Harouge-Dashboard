import { Loader, ShieldCheck } from "@medusajs/icons"
import { useEffect, useRef, useState } from "react"

import {
  getCurrentPlatformAdmin,
  isPlatformSessionRejected,
  signOutPlatformAdmin,
  type PlatformAdmin,
} from "../auth/platform-auth"
import { AdminCommerceOverview } from "./components/AdminCommerceOverview"
import { AdminNavigationLayout } from "./components/AdminNavigationLayout"
import { AdminControlPlaneRouter } from "./components/AdminControlPlaneRouter"
import { DashboardShell } from "./components/DashboardShell"
import { PlatformModulePage } from "./components/PlatformModulePage"
import { StorefrontPreviewPage } from "./components/StorefrontPreviewPage"
import {
  DASHBOARD_BEFORE_NAVIGATION_EVENT,
  dashboardRouteFromPath,
} from "./routing"
import { isAdminVisualPreviewEnabled } from "./visual-preview"
import type { PlatformStorefrontTemplateKey } from "./types"
import { templateDefinitions } from "./store-template-catalog"
import "./components/admin-full-page.css"

function useDashboardPathname(): string {
  const [pathname, setPathname] = useState(() => window.location.pathname)
  const currentEntry = useRef({
    state: window.history.state,
    url: `${window.location.pathname}${window.location.search}${window.location.hash}`,
  })

  useEffect(() => {
    const updatePathname = (event: PopStateEvent) => {
      if (
        event.isTrusted &&
        !window.dispatchEvent(
          new CustomEvent(DASHBOARD_BEFORE_NAVIGATION_EVENT, { cancelable: true }),
        )
      ) {
        event.stopImmediatePropagation()
        window.history.pushState(
          currentEntry.current.state,
          "",
          currentEntry.current.url,
        )
        return
      }

      currentEntry.current = {
        state: window.history.state,
        url: `${window.location.pathname}${window.location.search}${window.location.hash}`,
      }
      setPathname(window.location.pathname)
    }
    window.addEventListener("popstate", updatePathname)
    return () => window.removeEventListener("popstate", updatePathname)
  }, [])

  return pathname
}

function storefrontPreviewStoreId(pathname: string): string | null {
  const match = pathname.match(/^\/dashboard\/storefront-preview\/([^/]+)$/)
  if (!match) return null

  try {
    const storeProfileId = decodeURIComponent(match[1])
    return /^[a-zA-Z0-9_:-]{8,120}$/.test(storeProfileId)
      ? storeProfileId
      : null
  } catch {
    return null
  }
}

function storefrontTemplatePreviewKey(pathname: string): PlatformStorefrontTemplateKey | null {
  const match = pathname.match(/^\/dashboard\/template-preview\/([^/]+)$/)
  if (!match) return null

  try {
    const templateKey = decodeURIComponent(match[1])
    return Object.prototype.hasOwnProperty.call(templateDefinitions, templateKey)
      ? templateKey as PlatformStorefrontTemplateKey
      : null
  } catch {
    return null
  }
}

export function OwnerDashboard() {
  const pathname = useDashboardPathname()
  const route = dashboardRouteFromPath(pathname)
  const previewStoreId = storefrontPreviewStoreId(pathname)
  const previewTemplateKey = storefrontTemplatePreviewKey(pathname)
  const visualPreview = isAdminVisualPreviewEnabled()
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
  const [authRetry, setAuthRetry] = useState(0)

  useEffect(() => {
    if (visualPreview) {
      return
    }

    let active = true
    setAuthState("checking")

    getCurrentPlatformAdmin()
      .then((currentAdmin) => {
        if (!active) return
        setAdmin(currentAdmin)
        setAuthState("authenticated")
      })
      .catch((error) => {
        if (!active) return
        setAuthState("failed")
        if (isPlatformSessionRejected(error)) window.location.replace("/")
      })

    return () => {
      active = false
    }
  }, [visualPreview, authRetry])

  const handleSignOut = async () => {
    try {
      await signOutPlatformAdmin()
      window.location.replace("/")
    } catch {
      window.alert("تعذّر تسجيل الخروج. تحقق من الاتصال وحاول مرة أخرى.")
    }
  }

  if (authState !== "authenticated" || !admin) {
    return (
      <main className="owner-auth-check" dir="rtl">
        <div>
          <ShieldCheck />
          {authState === "checking" && <Loader className="owner-auth-check__spinner" />}
        </div>
        <strong>{authState === "failed" ? "تعذّر الاتصال بالمنصة مؤقتاً" : "جارٍ التحقق من صلاحية الإدارة الرئيسية"}</strong>
        <span>{authState === "failed" ? "لم نسجّل خروجك. حاول مجدداً عند عودة الاتصال." : "لحظات من فضلك"}</span>
        {authState === "failed" && <button type="button" onClick={() => setAuthRetry(value => value + 1)}>إعادة المحاولة</button>}
      </main>
    )
  }

  if (previewStoreId) {
    return <StorefrontPreviewPage storeProfileId={previewStoreId} />
  }

  if (previewTemplateKey) {
    return <StorefrontPreviewPage templateKey={previewTemplateKey} />
  }

  if (route === "overview") {
    return (
      <AdminNavigationLayout admin={admin} activeRoute={route} onSignOut={handleSignOut}>
      <AdminCommerceOverview
        admin={admin}
        isDemo={visualPreview}
        onSignOut={handleSignOut}
      />
      </AdminNavigationLayout>
    )
  }

  if (
    route === "clients" ||
    route === "vendor-accounts" ||
    route === "storefronts" ||
    route === "domains" ||
    route === "requests" ||
    route === "billing" ||
    route === "operations" ||
    route === "analytics" ||
    route === "settings" ||
    route === "security"
  ) {
    return (
      <AdminNavigationLayout admin={admin} activeRoute={route} onSignOut={handleSignOut} focused={pathname.startsWith("/dashboard/storefronts/")}>
      <AdminControlPlaneRouter
        admin={admin}
        isDemo={visualPreview}
        onSignOut={handleSignOut}
        pathname={pathname}
        route={route}
      />
      </AdminNavigationLayout>
    )
  }

  return (
    <AdminNavigationLayout admin={admin} activeRoute={route} onSignOut={handleSignOut}>
    <DashboardShell admin={admin} activeRoute={route} onSignOut={handleSignOut}>
      <PlatformModulePage route={route} />
    </DashboardShell>
    </AdminNavigationLayout>
  )
}
