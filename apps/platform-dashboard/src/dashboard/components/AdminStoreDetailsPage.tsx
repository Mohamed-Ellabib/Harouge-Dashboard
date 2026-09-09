import {
  PiArrowLeft,
  PiArrowRight,
  PiArrowSquareOut,
  PiArrowsClockwise,
  PiCalendarBlank,
  PiChartLineUp,
  PiCheckCircle,
  PiCurrencyDollar,
  PiDotsThree,
  PiGlobe,
  PiIdentificationCard,
  PiMapPin,
  PiPencilSimple,
  PiShieldCheck,
  PiStorefront,
  PiTranslate,
  PiUsersThree,
  PiUser,
} from "react-icons/pi"
import { useEffect, useState, type ReactNode } from "react"

import { getPlatformStorefront } from "../api"
import { navigateDashboard, navigateDashboardDetail } from "../routing"
import type { PlatformStore, PlatformStorefrontRecord, PlatformStorefrontTemplateKey } from "../types"
import { AdminStoreConfigurationDialog } from "./AdminStoreConfigurationDialog"

import "./admin-detail-pages.css"

type AdminStoreDetailsPageProps = {
  error: string | null
  isDemo: boolean
  loading: boolean
  onRetry: () => void
  onStoreUpdated: () => Promise<void> | void
  onToast: (message: string) => void
  store: PlatformStore | null
}

const storefrontTemplateLabels: Record<PlatformStorefrontTemplateKey, string> = {
  urbx: "Template 5 · URBX",
  "template-6": "Template 6",
  drops: "Drops",
  "luxe-commerce": "Luxe Commerce",
  "luxe-commerce-full": "Luxe Commerce — Full Source",
  "modern-market": "Modern Market",
  "home-living": "Home & Living",
  standard: "Standard",
  "glow-beauty": "Glow Beauty",
}

function formatDate(value?: string | null): string {
  if (!value) return "Unavailable"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Unavailable"
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date)
}

function demoStore(): PlatformStore {
  return {
    id: "demo-store-sanousi",
    name: "Al-Sanousi & Sons",
    handle: "al-sanousi",
    status: "active",
    plan_code: "professional_commerce",
    locale: "ar-LY",
    timezone: "Africa/Tripoli",
    contact: {
      public_email: "store@alsanousi.ly",
      public_phone: "+218 91 234 5678",
      whatsapp_number: "+218 91 234 5678",
    },
    brand: {
      logo_url: "/assets/admin/stores/al-sanousi-logo.png",
      favicon_url: null,
      primary_color: "#0c0c0c",
      secondary_color: "#c99842",
      typography_key: "editorial",
    },
    domains: [
      {
        id: "demo-domain-primary",
        hostname: "alsanousi.ly",
        type: "custom",
        verification_status: "verified",
        ssl_status: "active",
        is_primary: true,
      },
      {
        id: "demo-domain-platform",
        hostname: "al-sanousi.labibtech.ly",
        type: "temporary",
        verification_status: "verified",
        ssl_status: "active",
        is_primary: false,
      },
    ],
    memberships: [
      {
        id: "demo-vendor-ahmed",
        email: "ahmed@alsanousi.ly",
        display_name: "Ahmed Sanousi",
        role: "owner",
        status: "active",
      },
    ],
    product_count: 624,
    compatibility_vendor: { id: "VEN-1024", status: "active" },
    provisioning: null,
    commerce_readiness: {
      id: "demo-readiness",
      store_profile_id: "demo-store-sanousi",
      plan_code: "professional_commerce",
      status: "ready",
      updated_at: "2026-08-11T12:00:00.000Z",
    },
    commerce_setup: null,
    created_at: "2026-01-12T09:00:00.000Z",
    updated_at: "2026-08-11T12:00:00.000Z",
  }
}

function valueOrUnavailable(value?: string | null): string {
  return value?.trim() || "Unavailable"
}

export function AdminStoreDetailsPage({
  error,
  isDemo,
  loading,
  onRetry,
  onStoreUpdated,
  onToast,
  store,
}: AdminStoreDetailsPageProps) {
  const [configurationOpen, setConfigurationOpen] = useState(false)
  const [storefront, setStorefront] = useState<PlatformStorefrontRecord | null>(null)
  const [storefrontState, setStorefrontState] = useState<"idle" | "loading" | "ready" | "failed">("idle")
  const current = isDemo ? demoStore() : store

  useEffect(() => {
    if (isDemo || !current) {
      setStorefront(null)
      setStorefrontState(isDemo ? "ready" : "idle")
      return
    }
    const controller = new AbortController()
    setStorefront(null)
    setStorefrontState("loading")
    getPlatformStorefront(current.id, controller.signal)
      .then((next) => {
        if (controller.signal.aborted) return
        setStorefront(next)
        setStorefrontState("ready")
      })
      .catch((storefrontError: unknown) => {
        if (storefrontError instanceof DOMException && storefrontError.name === "AbortError") return
        setStorefrontState("failed")
      })
    return () => controller.abort()
  }, [current?.id, isDemo])

  if (loading && !current) {
    return <div className="admin-detail-loading" role="status">Loading Store details…</div>
  }

  if (error && !current) {
    return (
      <section className="admin-detail-empty admin-page-card" role="alert">
        <PiShieldCheck />
        <h1>Store details could not be loaded</h1>
        <p>{error}</p>
        <div className="admin-detail-empty__actions">
          <button type="button" className="admin-page-button admin-page-button--primary" onClick={onRetry}>Try again</button>
          <button type="button" className="admin-page-button" onClick={() => navigateDashboard("clients")}>Back to Stores</button>
        </div>
      </section>
    )
  }

  if (!current) {
    return (
      <section className="admin-detail-empty admin-page-card">
        <PiStorefront />
        <h1>Store not found</h1>
        <p>This Store is unavailable or you no longer have access to it.</p>
        <button type="button" className="admin-page-button" onClick={() => navigateDashboard("clients")}>Back to Stores</button>
      </section>
    )
  }

  const owner = current.memberships.find((member) => member.role === "owner")
  const primaryDomain = current.domains.find((domain) => domain.is_primary) ?? current.domains[0]
  const temporaryDomain = current.domains.find((domain) => domain.type === "temporary")
  const active = current.status === "active"
  const published = isDemo
    ? active && current.commerce_readiness?.status === "ready"
    : storefront?.storefront.published_revision !== null
  const storefrontTemplate = isDemo
    ? "Luxe Commerce"
    : storefront
      ? storefrontTemplateLabels[storefront.storefront.document.template_key]
      : storefrontState === "loading" ? "Loading…" : "Unavailable"
  const storefrontStatus = isDemo
    ? "Published"
    : storefront?.storefront.status === "draft_changes"
      ? "Draft changes"
      : storefront?.storefront.status === "published"
        ? "Published"
        : storefront?.storefront.status === "unpublished"
          ? "Unpublished"
          : "Unavailable"
  const storefrontRevision = storefront
    ? `Draft r${storefront.storefront.revision} · Live ${storefront.storefront.published_revision === null ? "none" : `r${storefront.storefront.published_revision}`}`
    : storefrontState === "loading" ? "Loading saved Storefront…" : "Open Studio to retry"
  const ownerName = owner?.display_name?.trim() || owner?.email || "Owner not assigned"
  const planName = isDemo
    ? "Growth"
    : current.plan_code === "professional_commerce"
      ? "Professional"
      : "Starter"
  const storeId = isDemo ? "STR-1001" : current.id
  const liveDomain = current.domains.find(
    (domain) =>
      domain.is_primary &&
      domain.verification_status === "verified" &&
      domain.ssl_status === "active",
  ) ?? current.domains.find(
    (domain) =>
      domain.verification_status === "verified" &&
      domain.ssl_status === "active",
  )

  const openStorefront = () => {
    if (isDemo) {
      onToast("The demo Storefront preview is visual-only; no public Store is connected.")
      return
    }
    if (storefrontState === "loading") {
      onToast("Checking the published Storefront. Please try again in a moment.")
      return
    }
    if (!published) {
      onToast("This Storefront is not published. Review and publish it in Templates Studio first.")
      navigateDashboardDetail("storefronts", current.id)
      return
    }
    if (!liveDomain) {
      onToast("This Storefront has no verified domain with active SSL.")
      navigateDashboard("domains")
      return
    }
    window.open(`https://${liveDomain.hostname}`, "_blank", "noopener,noreferrer")
  }

  return (
    <section className="admin-detail-page admin-store-details-page">
      <header className="admin-detail-heading">
        <div>
          <button type="button" className="admin-detail-back" onClick={() => navigateDashboard("clients")}><PiArrowLeft /> Stores</button>
          <h1>Store Details</h1>
          <p>Manage storefront configuration, ownership and platform services</p>
        </div>
        <div className="admin-page-actions">
          <button type="button" className="admin-page-button" onClick={openStorefront}><PiArrowSquareOut /> {published ? "Open Live Storefront" : "Open Storefront Studio"}</button>
          <button type="button" className="admin-page-button admin-page-button--primary" onClick={() => setConfigurationOpen(true)}>Manage Store</button>
          <button type="button" className="admin-detail-more" aria-label="More Store actions" disabled={!isDemo} title={!isDemo ? "Additional Store actions are not connected yet" : undefined} onClick={() => onToast("Demo Store actions are read-only.")}><PiDotsThree /></button>
        </div>
      </header>

      <article className="admin-store-identity admin-page-card">
        <div className="admin-store-identity__brand">
          {current.brand?.logo_url || isDemo ? <img src={current.brand?.logo_url || "/assets/admin/stores/al-sanousi-logo.png"} alt="" /> : <span className="admin-store-logo-fallback"><PiStorefront /></span>}
          <div>
            <h2>{current.name}</h2>
            <button type="button" onClick={openStorefront}>{primaryDomain?.hostname || `${current.handle}.local.test`} <PiArrowSquareOut /></button>
            <p>@{current.handle} <span className={`admin-page-status-dot${active ? "" : " admin-page-status-dot--red"}`} /> <strong>{active ? "Active" : current.status}</strong> <em>{isDemo ? (published ? "Published" : "Setup") : (current.commerce_readiness?.status || "Readiness unavailable")}</em> <em><PiShieldCheck /> {primaryDomain?.verification_status === "verified" ? "Verified" : "Pending"}</em></p>
            <p>{isDemo ? <img className="admin-store-owner-avatar" src="/assets/admin/vendors/ahmed-sanousi.png" alt="" /> : <span className="admin-store-owner-avatar"><PiUser /></span>}<b>{ownerName}</b> · Owner</p>
          </div>
        </div>
        <div className="admin-store-identity__facts">
          <div><PiIdentificationCard /><span>Store ID</span><strong>{storeId}</strong></div>
          <div><PiCalendarBlank /><span>Created</span><strong>{formatDate(current.created_at)}</strong></div>
          <div><PiStorefront /><span>Template</span><strong>{storefrontTemplate}</strong></div>
          <div><PiArrowsClockwise /><span>{isDemo ? "Last Sync" : "Last updated"}</span><strong>{isDemo ? "2 min ago" : formatDate(current.updated_at)}</strong></div>
        </div>
      </article>

      <nav className="admin-detail-tabs" aria-label="Store detail sections">
        <button type="button" className="is-active">Overview</button>
        <button type="button" onClick={() => setConfigurationOpen(true)}>Configuration</button>
        <button type="button" onClick={() => navigateDashboard("domains")}>Domains</button>
        <button type="button" onClick={() => navigateDashboard("vendor-accounts")}>Team &amp; Access</button>
        <button type="button" onClick={() => navigateDashboard("billing")}>Billing</button>
        <button type="button" onClick={() => navigateDashboard("operations")}>Activity</button>
      </nav>

      <div className="admin-detail-grid">
        <div className="admin-detail-main">
          <article className="admin-detail-info admin-page-card">
            <header><div><h2>Store Information</h2><p>Identity, region and commerce configuration</p></div><button type="button" onClick={() => setConfigurationOpen(true)}><PiPencilSimple /> Edit</button></header>
            <div className="admin-detail-info__columns">
              <dl>
                <div><dt><PiCalendarBlank /> Store Name</dt><dd>{current.name}</dd></div>
                <div><dt><PiStorefront /> Store Handle</dt><dd>{current.handle}</dd></div>
                <div><dt><PiChartLineUp /> Business Type</dt><dd>{isDemo ? "Luxury Retail" : "Unavailable"}</dd></div>
                <div><dt><PiGlobe /> Country</dt><dd>Libya</dd></div>
              </dl>
              <dl>
                <div><dt><PiCurrencyDollar /> Default Currency</dt><dd>LYD — Libyan Dinar</dd></div>
                <div><dt><PiTranslate /> Default Language</dt><dd>{current.locale.toLowerCase().startsWith("ar") ? "Arabic" : current.locale}</dd></div>
                <div><dt><PiArrowsClockwise /> Sales Channel</dt><dd>{isDemo ? <><i className="admin-page-status-dot" /> Al-Sanousi Channel</> : "Unavailable"}</dd></div>
                <div><dt><PiMapPin /> Inventory Location</dt><dd>{isDemo ? "Tripoli Main" : "Unavailable"}</dd></div>
              </dl>
            </div>
          </article>

          <article className="admin-store-resources admin-page-card">
            <header><div><h2>Platform Resources</h2><p>Services provisioned for this store</p></div><button type="button" disabled={!isDemo} title={!isDemo ? "Provisioning history is not connected yet" : undefined} onClick={() => onToast("Demo provisioning history is read-only.")}>Provisioning history <PiArrowRight /></button></header>
            <div className="admin-store-resource-grid">
              <ResourceCard onAction={openStorefront} icon={<PiStorefront />} tone="blue" label="Storefront" status={isDemo ? (active ? "Live" : "Unavailable") : storefrontStatus} detail={published ? (liveDomain?.hostname || "Published without a live domain") : storefrontRevision} />
              <ResourceCard onAction={() => navigateDashboard("vendor-accounts")} icon={<PiUsersThree />} tone="green" label="Vendor Dashboard" status={owner?.status === "active" ? "Active" : "Disabled"} detail={owner ? "Owner access enabled" : "No owner"} />
              <ResourceCard onAction={() => navigateDashboard("domains")} icon={<PiGlobe />} tone="blue" label="Primary Domain" status={primaryDomain?.verification_status === "verified" ? "Connected" : "Pending"} detail={primaryDomain?.ssl_status === "active" ? "SSL active" : "SSL pending"} />
              <ResourceCard onAction={() => navigateDashboardDetail("storefronts", current.id)} icon={<PiChartLineUp />} tone="orange" label="Template" status={storefrontStatus} detail={isDemo ? "Luxe Commerce" : storefrontRevision} />
            </div>
            <div className="admin-store-operational"><PiShieldCheck /><span>{isDemo ? (published ? "All store services operational" : "Store setup requires attention") : `Commerce readiness: ${current.commerce_readiness?.status || "unavailable"}`}</span><em>{isDemo ? "Last checked 2 min ago" : `Updated ${formatDate(current.updated_at)}`}</em></div>
          </article>
        </div>

        <aside className="admin-detail-side">
          <article className="admin-detail-side-card admin-page-card">
            <h2>Owner &amp; Access</h2>
            <div className="admin-owner-summary">{isDemo ? <img className="admin-owner-photo" src="/assets/admin/vendors/ahmed-sanousi.png" alt="" /> : <span className="admin-owner-photo"><PiUser /></span>}<div><strong>{ownerName}</strong><span>{valueOrUnavailable(owner?.email)}</span></div><em>Owner</em><i className={`admin-page-status-dot${owner?.status === "active" ? "" : " admin-page-status-dot--red"}`} /> <small>{owner?.status === "active" ? "Active" : "Disabled"}</small></div>
            <dl><div><dt>Team members</dt><dd>{isDemo ? "4" : current.memberships.length}</dd></div><div><dt>Owner MFA</dt><dd>{isDemo ? "✓ Enabled" : "Not connected"}</dd></div><div><dt>Last sign-in</dt><dd>{isDemo ? "9 min ago" : "Not connected"}</dd></div></dl>
            <footer><button type="button" onClick={() => navigateDashboard("vendor-accounts")}>View Vendor</button><button type="button" onClick={() => navigateDashboard("vendor-accounts")}>Manage access <PiArrowRight /></button></footer>
          </article>
          <article className="admin-detail-side-card admin-page-card">
            <h2>Subscription</h2>
            <div className="admin-subscription-title"><span><PiChartLineUp /></span><div><strong>{planName}</strong><small>{isDemo ? "$79 / month" : "Billing not connected"}</small></div><em>{active ? "Active" : current.status}</em></div>
            <dl><div><dt>Billing cycle</dt><dd>{isDemo ? "Monthly" : "Unavailable"}</dd></div><div><dt>Next renewal</dt><dd>{isDemo ? "12 Sep 2026" : "Unavailable"}</dd></div><div><dt>Payment status</dt><dd>{isDemo ? "● Paid" : "Unavailable"}</dd></div></dl>
            <footer><button type="button" onClick={() => navigateDashboard("billing")}>Manage Plan</button><button type="button" onClick={() => navigateDashboard("billing")}>Billing history <PiArrowRight /></button></footer>
          </article>
          <article className="admin-detail-side-card admin-page-card">
            <h2>Domain &amp; Hosting</h2>
            <div className="admin-domain-summary"><PiGlobe /><strong>{primaryDomain?.hostname || "No primary domain"}</strong><em>Primary</em><span className="admin-page-status-dot" /><small>{primaryDomain?.verification_status === "verified" ? "Connected" : "Pending"}</small></div>
            <dl><div><dt>Platform subdomain</dt><dd>{temporaryDomain?.hostname || "Unavailable"}</dd></div><div><dt>SSL certificate</dt><dd>{primaryDomain?.ssl_status === "active" ? "Active" : "Pending"}</dd></div><div><dt>DNS monitoring</dt><dd>{isDemo ? "Enabled" : "Not connected"}</dd></div><div><dt>Last checked</dt><dd>{isDemo ? "2 min ago" : "Not connected"}</dd></div></dl>
            <footer><button type="button" onClick={() => navigateDashboard("domains")}>Manage Domains</button><button type="button" disabled={!isDemo} title={!isDemo ? "Domain health checks are not connected yet" : undefined} onClick={() => onToast("Demo domain health is read-only.")}>Run health check <PiArrowRight /></button></footer>
          </article>
        </aside>
      </div>
      {configurationOpen ? (
        <AdminStoreConfigurationDialog
          isDemo={isDemo}
          onClose={() => setConfigurationOpen(false)}
          onSaved={async () => {
            await onStoreUpdated()
            setConfigurationOpen(false)
          }}
          onToast={onToast}
          store={current}
        />
      ) : null}
    </section>
  )
}

function ResourceCard({ icon, tone, label, status, detail, onAction }: { icon: ReactNode; tone: string; label: string; status: string; detail: string; onAction: () => void }) {
  return (
    <div className="admin-store-resource">
      <span className={`admin-store-resource__icon admin-store-resource__icon--${tone}`}>{icon}</span>
      <button type="button" aria-label={`More ${label} actions`} onClick={onAction}><PiDotsThree /></button>
      <strong>{label}</strong>
      <small><i className="admin-page-status-dot" /> {status}</small>
      <p>{detail}</p>
    </div>
  )
}
