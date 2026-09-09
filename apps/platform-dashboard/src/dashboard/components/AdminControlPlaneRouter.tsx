import { PiArrowClockwise, PiCheckCircle } from "react-icons/pi"
import { useCallback, useEffect, useRef, useState } from "react"

import type { PlatformAdmin } from "../../auth/platform-auth"
import { getPlatformMerchantMembership, listPlatformPortfolio } from "../api"
import type {
  DashboardRoute,
  PlatformMerchantMembership,
  PlatformPortfolio,
  PlatformStorefrontTemplateKey,
  ProvisionStoreResult,
} from "../types"
import { AdminControlPlaneShell } from "./AdminControlPlaneShell"
import { AdminAnalyticsPage } from "./AdminAnalyticsPage"
import { AdminDomainsPage } from "./AdminDomainsPage"
import { AdminPlansPage } from "./AdminPlansPage"
import { AdminRequestsPage } from "./AdminRequestsPage"
import { AdminSecurityAuditPage } from "./AdminSecurityAuditPage"
import { AdminSettingsPage } from "./AdminSettingsPage"
import { AdminStoreDetailsPage } from "./AdminStoreDetailsPage"
import { AdminStorefrontEditorPage } from "./AdminStorefrontEditorPage"
import { AdminStoresPage } from "./AdminStoresPage"
import { AdminTemplatesStudioPage } from "./AdminTemplatesStudioPage"
import { AdminVendorDetailsPage } from "./AdminVendorDetailsPage"
import { AdminVendorsPage } from "./AdminVendorsPage"
import { StoreOnboardingDialog } from "./StoreOnboardingDialog"
import { CreationDraftList, StoreCreationDraftPage } from "./StoreCreationDraftPage"
import { createCreationDraft } from "../creation-drafts"
import {
  navigateDashboard,
  navigateDashboardDetail,
  navigateStorefrontTemplatePreview,
} from "../routing"

type ModernAdminRoute = Extract<
  DashboardRoute,
  | "clients"
  | "vendor-accounts"
  | "storefronts"
  | "domains"
  | "requests"
  | "billing"
  | "operations"
  | "analytics"
  | "settings"
  | "security"
>

type AdminControlPlaneRouterProps = {
  admin: PlatformAdmin
  isDemo: boolean
  onSignOut: () => Promise<void>
  pathname: string
  route: ModernAdminRoute
}

function nestedId(pathname: string, routePath: string): string | null {
  const match = pathname.match(new RegExp(`^${routePath}/([^/]+)$`))
  if (!match) return null
  try {
    return decodeURIComponent(match[1])
  } catch {
    return null
  }
}

export function AdminControlPlaneRouter({
  admin,
  isDemo,
  onSignOut,
  pathname,
  route,
}: AdminControlPlaneRouterProps) {
  const [portfolio, setPortfolio] = useState<PlatformPortfolio | null>(null)
  const [portfolioState, setPortfolioState] = useState<"loading" | "ready" | "failed">(
    isDemo ? "ready" : "loading",
  )
  const [onboardingOpen, setOnboardingOpen] = useState(false)
  const [onboardingTemplate, setOnboardingTemplate] = useState<PlatformStorefrontTemplateKey | null>(null)
  const [membershipDetail, setMembershipDetail] = useState<PlatformMerchantMembership | null>(null)
  const [membershipDetailState, setMembershipDetailState] = useState<"idle" | "loading" | "ready" | "failed">("idle")
  const [membershipRefreshKey, setMembershipRefreshKey] = useState(0)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | null>(null)
  const creationBusy = useRef(false)
  const creationKey = useRef<{ key: string; template: string } | null>(null)

  const showToast = useCallback((message: string) => {
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current)
    setToast(message)
    toastTimer.current = window.setTimeout(() => setToast(null), 2800)
  }, [])

  const loadPortfolio = useCallback(async () => {
    if (isDemo) return
    setPortfolioState("loading")
    try {
      const nextPortfolio = await listPlatformPortfolio()
      setPortfolio(nextPortfolio)
      setPortfolioState("ready")
    } catch {
      setPortfolioState("failed")
    }
  }, [isDemo])

  useEffect(() => {
    void loadPortfolio()
  }, [loadPortfolio])

  useEffect(
    () => () => {
      if (toastTimer.current !== null) window.clearTimeout(toastTimer.current)
    },
    [],
  )

  const storeDetailId = route === "clients" ? nestedId(pathname, "/dashboard/clients") : null
  const vendorDetailId = route === "vendor-accounts" ? nestedId(pathname, "/dashboard/vendor-accounts") : null
  const storefrontEditorId = route === "storefronts" ? nestedId(pathname, "/dashboard/storefronts") : null

  useEffect(() => {
    if (!vendorDetailId || isDemo) {
      setMembershipDetail(null)
      setMembershipDetailState(vendorDetailId && isDemo ? "ready" : "idle")
      return
    }
    const controller = new AbortController()
    setMembershipDetail(null)
    setMembershipDetailState("loading")
    getPlatformMerchantMembership(vendorDetailId, controller.signal)
      .then((membership) => {
        setMembershipDetail(membership)
        setMembershipDetailState("ready")
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return
        setMembershipDetailState("failed")
      })
    return () => controller.abort()
  }, [isDemo, membershipRefreshKey, vendorDetailId])

  const handleProvisioned = async (_result: ProvisionStoreResult) => {
    await loadPortfolio()
    showToast("The new store and vendor account were added to the platform.")
  }

  const page = (() => {
    if (route === "clients") {
      if (storeDetailId) {
        const store = portfolio?.clients.flatMap((client) => client.stores).find((candidate) => candidate.id === storeDetailId) ?? null
        return (
          <AdminStoreDetailsPage
            key={storeDetailId}
            error={!isDemo && portfolioState === "failed" ? "Live Store data is temporarily unavailable." : null}
            isDemo={isDemo}
            loading={!isDemo && portfolioState === "loading"}
            onRetry={() => void loadPortfolio()}
            onStoreUpdated={loadPortfolio}
            onToast={showToast}
            store={store}
          />
        )
      }
      return (
        <AdminStoresPage
          isDemo={isDemo}
          loading={portfolioState === "loading"}
          onAdd={() => { setOnboardingTemplate(null); setOnboardingOpen(true) }}
          onToast={showToast}
          portfolio={portfolio}
        />
      )
    }

    if (route === "vendor-accounts") {
      if (vendorDetailId) {
        const store = portfolio?.clients
          .flatMap((client) => client.stores)
          .find((candidate) => candidate.id === membershipDetail?.store.id) ?? null
        return (
          <AdminVendorDetailsPage
            error={!isDemo && membershipDetailState === "failed" ? "Live vendor access data is temporarily unavailable." : null}
            isDemo={isDemo}
            loading={!isDemo && membershipDetailState === "loading"}
            membership={membershipDetail}
            onRetry={() => setMembershipRefreshKey((value) => value + 1)}
            onToast={showToast}
            store={store}
          />
        )
      }
      return (
        <AdminVendorsPage
          isDemo={isDemo}
          loading={portfolioState === "loading"}
          onRefresh={loadPortfolio}
          onToast={showToast}
          portfolio={portfolio}
        />
      )
    }

    if (route === "storefronts") {
      if (storefrontEditorId?.startsWith("stdraft_")) {
        return <StoreCreationDraftPage key={storefrontEditorId} id={storefrontEditorId} onConfirmed={loadPortfolio} />
      }
      if (storefrontEditorId) {
        const store = portfolio?.clients
          .flatMap((client) => client.stores)
          .find((candidate) => candidate.id === storefrontEditorId) ?? null
        return (
          <AdminStorefrontEditorPage
            key={storefrontEditorId}
            error={!isDemo && portfolioState === "failed" ? "Live Store data is temporarily unavailable." : null}
            isDemo={isDemo}
            loading={!isDemo && portfolioState === "loading"}
            onBack={() => navigateDashboard("storefronts")}
            onStorefrontUpdated={loadPortfolio}
            onToast={showToast}
            store={store}
          />
        )
      }
      return (
        <>
        <AdminTemplatesStudioPage
          renderDrafts={!isDemo ? (query) => <CreationDraftList query={query} /> : undefined}
          error={!isDemo && portfolioState === "failed" ? "Live Store data is temporarily unavailable." : null}
          isDemo={isDemo}
          loading={!isDemo && portfolioState === "loading"}
          onOpenStore={(storeId) => navigateDashboardDetail("storefronts", storeId)}
          onCreateStore={(templateKey, locale) => {
            if (!["glow-beauty", "standard", "drops", "luxe-commerce-full", "urbx", "template-6"].includes(templateKey) || isDemo) { setOnboardingTemplate(templateKey); setOnboardingOpen(true); return }
            if (creationBusy.current) return
            creationBusy.current = true
            const selection = `${templateKey}:${locale}`
            if (creationKey.current?.template !== selection) creationKey.current = { key: crypto.randomUUID(), template: selection }
            showToast("Saving your new store draft…")
            void createCreationDraft(creationKey.current.key, templateKey, { locale }).then(({ draft }) => {
              creationKey.current = null
              navigateDashboardDetail("storefronts", draft.id)
            }).catch(() => showToast("Could not create the draft. Check the backend and retry; the same request will be resumed."))
              .finally(() => { creationBusy.current = false })
          }}
          onPreviewTemplate={navigateStorefrontTemplatePreview}
          onRetry={() => void loadPortfolio()}
          onToast={showToast}
          portfolio={portfolio}
        />
        </>
      )
    }

    if (route === "domains") {
      return <AdminDomainsPage isDemo={isDemo} portfolio={portfolio} loading={portfolioState === "loading"} error={portfolioState === "failed" ? "Live domain data is temporarily unavailable." : null} onToast={showToast} />
    }

    if (route === "requests") {
      return isDemo ? (
        <AdminRequestsPage isDemo loading={false} error={null} onToast={showToast} />
      ) : (
        <UnavailableModule
          description="There is no request or ticket service in the platform database. No sample requests are shown in authenticated mode."
          title="Requests are not connected"
        />
      )
    }

    if (route === "billing") {
      return <AdminPlansPage isDemo={isDemo} portfolio={portfolio} loading={portfolioState === "loading"} error={portfolioState === "failed" ? "Live plan data is temporarily unavailable." : null} onToast={showToast} />
    }

    if (route === "operations") {
      return (
        <UnavailableModule
          description="There is no persisted platform activity feed yet. Store, vendor and provisioning facts remain available on their dedicated pages."
          title="Platform activity is not connected"
        />
      )
    }

    if (route === "analytics") {
      return <AdminAnalyticsPage isDemo={isDemo} portfolio={portfolio} loading={portfolioState === "loading"} error={portfolioState === "failed" ? "Live analytics inputs are temporarily unavailable." : null} onToast={showToast} />
    }

    if (route === "settings") {
      return <AdminSettingsPage admin={admin} isDemo={isDemo} onToast={showToast} />
    }

    return (
      <AdminSecurityAuditPage
        admin={admin}
        isDemo={isDemo}
        onToast={showToast}
      />
    )
  })()

  return (
    <>
      <AdminControlPlaneShell
        activeRoute={route}
        admin={admin}
        isDemo={isDemo}
        onSignOut={onSignOut}
      >
        {portfolioState === "failed" && !isDemo && (route === "clients" || route === "vendor-accounts" || route === "storefronts" || route === "domains" || route === "billing" || route === "analytics") ? (
          <div className="admin-control-plane__data-notice" role="status">
            <span>Live portfolio data is temporarily unavailable.</span>
            <button type="button" onClick={() => void loadPortfolio()}>
              <PiArrowClockwise />
              Retry
            </button>
          </div>
        ) : null}
        {page}
      </AdminControlPlaneShell>
      {toast ? (
        <div className="admin-control-plane__toast" role="status">
          <PiCheckCircle />
          <span>{toast}</span>
        </div>
      ) : null}
      <StoreOnboardingDialog
        initialTemplate={onboardingTemplate ?? undefined}
        openEditorOnSuccess={Boolean(onboardingTemplate)}
        existingClient={null}
        isDemo={isDemo}
        onClose={() => setOnboardingOpen(false)}
        onProvisioned={handleProvisioned}
        open={onboardingOpen}
      />
    </>
  )
}

function UnavailableModule({
  description,
  title,
}: {
  description: string
  title: string
}) {
  return (
    <section className="admin-control-plane__unavailable" role="status">
      <PiArrowClockwise aria-hidden="true" />
      <h1>{title}</h1>
      <p>{description}</p>
    </section>
  )
}
