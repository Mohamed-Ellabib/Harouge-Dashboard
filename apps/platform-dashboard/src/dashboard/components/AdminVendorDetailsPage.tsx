import {
  PiArrowLeft,
  PiArrowRight,
  PiArrowSquareOut,
  PiCalendarBlank,
  PiClock,
  PiDotsThree,
  PiEnvelopeSimple,
  PiGlobe,
  PiIdentificationCard,
  PiKey,
  PiMapPin,
  PiPhone,
  PiPencilSimple,
  PiShieldCheck,
  PiStorefront,
  PiTranslate,
  PiTrendUp,
  PiUser,
  PiWarning,
} from "react-icons/pi"

import { navigateDashboard } from "../routing"
import type { PlatformMerchantMembership, PlatformStore } from "../types"
import { visualPreviewQuery } from "../visual-preview"

import "./admin-detail-pages.css"

type AdminVendorDetailsPageProps = {
  error: string | null
  isDemo: boolean
  loading: boolean
  membership: PlatformMerchantMembership | null
  onRetry: () => void
  onToast: (message: string) => void
  store: PlatformStore | null
}

function demoMembership(): PlatformMerchantMembership {
  return {
    id: "demo-vendor-ahmed",
    email: "ahmed@alsanousi.ly",
    display_name: "Ahmed Sanousi",
    role: "owner",
    status: "active",
    account_status: "active",
    effective_access: "active",
    joined_at: "2026-01-12T09:00:00.000Z",
    store: {
      id: "demo-store-sanousi",
      name: "Al-Sanousi & Sons",
      handle: "al-sanousi",
      status: "active",
      plan_code: "professional_commerce",
    },
    account_store_count: 1,
  }
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

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function AdminVendorDetailsPage({
  error,
  isDemo,
  loading,
  membership,
  onRetry,
  onToast,
  store,
}: AdminVendorDetailsPageProps) {
  const current = isDemo ? demoMembership() : membership

  if (loading && !current) {
    return <div className="admin-detail-loading" role="status">Loading Vendor details…</div>
  }

  if (error && !current) {
    return (
      <section className="admin-detail-empty admin-page-card" role="alert">
        <PiWarning />
        <h1>Vendor details could not be loaded</h1>
        <p>{error}</p>
        <div className="admin-detail-empty__actions">
          <button type="button" className="admin-page-button admin-page-button--primary" onClick={onRetry}>Try again</button>
          <button type="button" className="admin-page-button" onClick={() => navigateDashboard("vendor-accounts")}>Back to Vendors</button>
        </div>
      </section>
    )
  }

  if (!current) {
    return (
      <section className="admin-detail-empty admin-page-card">
        <PiUser />
        <h1>Vendor access not found</h1>
        <p>This vendor membership is unavailable or you no longer have access to it.</p>
        <button type="button" className="admin-page-button" onClick={() => navigateDashboard("vendor-accounts")}>Back to Vendors</button>
      </section>
    )
  }

  const name = current.display_name?.trim() || current.email || "Unavailable vendor"
  const storeName = current.store.name || store?.name || "Unavailable Store"
  const active = current.effective_access === "active"
  const plan = isDemo
    ? "Growth"
    : current.store.plan_code === "professional_commerce"
      ? "Professional"
      : current.store.plan_code === "starter_whatsapp"
        ? "Starter"
        : "Unavailable"
  const primaryDomain = store?.domains.find((domain) => domain.is_primary)?.hostname || store?.domains[0]?.hostname
  const avatar = isDemo ? "/assets/admin/vendors/ahmed-sanousi.png" : null

  const storeDetail = () => {
    if (!current.store.id) return
    window.history.pushState({}, "", `/dashboard/clients/${encodeURIComponent(current.store.id)}${visualPreviewQuery()}`)
    window.dispatchEvent(new PopStateEvent("popstate"))
  }

  return (
    <section className="admin-detail-page admin-vendor-details-page">
      <header className="admin-detail-heading">
        <div>
          <button type="button" className="admin-detail-back" onClick={() => navigateDashboard("vendor-accounts")}><PiArrowLeft /> Vendors</button>
          <h1>Vendor Details</h1>
          <p>Manage account, store access, subscription and security</p>
        </div>
        <div className="admin-page-actions">
          <button type="button" className="admin-page-button" disabled title="Vendor impersonation is not enabled"><PiArrowSquareOut /> Open Vendor Dashboard</button>
          <button type="button" className="admin-page-button admin-page-button--primary" onClick={() => navigateDashboard("vendor-accounts")}>Manage Vendor</button>
          <button type="button" className="admin-detail-more" aria-label="More Vendor actions" onClick={() => navigateDashboard("vendor-accounts")}><PiDotsThree /></button>
        </div>
      </header>

      <div className="admin-vendor-overview-layout">
        <div className="admin-vendor-overview-primary">
          <article className="admin-vendor-identity admin-page-card">
            <div className="admin-vendor-identity__person">
              {avatar ? <img src={avatar} alt="" /> : <span>{name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("")}</span>}
              <div>
                <h2>{name}</h2>
                <p>{current.email || "Email unavailable"}</p>
                <div><em>{titleCase(current.role)}</em><i className={`admin-page-status-dot${active ? "" : " admin-page-status-dot--red"}`} /><strong>{active ? "Active" : "Disabled"}</strong><b><PiShieldCheck /> {isDemo ? "Verified" : `Account ${titleCase(current.account_status)}`}</b></div>
                <p><PiStorefront /> {storeName}</p>
                <p><PiPhone /> {isDemo ? "+218 91 234 5678" : "Phone unavailable"}</p>
                <p><PiMapPin /> {isDemo ? "Tripoli, Libya" : "Location unavailable"}</p>
              </div>
            </div>
            <div className="admin-vendor-identity__facts">
              <div><PiIdentificationCard /><span>{isDemo ? "Vendor ID" : "Membership ID"}</span><strong>{isDemo ? "VEN-1024" : current.id}</strong></div>
              <div><PiCalendarBlank /><span>Member Since</span><strong>{formatDate(current.joined_at)}</strong></div>
              <div><PiUser /><span>Last Active</span><strong>{isDemo ? "9 min ago" : "Not connected"}</strong></div>
            </div>
          </article>

          <nav className="admin-detail-tabs" aria-label="Vendor detail sections">
            <button type="button" className="is-active">Overview</button>
            <button type="button" onClick={storeDetail}>Stores &amp; Access</button>
            <button type="button" onClick={() => navigateDashboard("billing")}>Subscription</button>
            <button type="button" onClick={() => navigateDashboard("operations")}>Activity</button>
            <button type="button" onClick={() => navigateDashboard("security")}>Security</button>
          </nav>

          <div className="admin-detail-main">
            <article className="admin-detail-info admin-page-card">
            <header><div><h2>Account Information</h2><p>Identity and contact details</p></div><button type="button" disabled title="Vendor contact editing is not connected yet"><PiPencilSimple /> Edit</button></header>
            <div className="admin-detail-info__columns">
              <dl>
                <div><dt><PiUser /> Full Name</dt><dd>{name}</dd></div>
                <div><dt><PiEnvelopeSimple /> Email Address</dt><dd>{current.email || "Unavailable"}</dd></div>
                <div><dt><PiPhone /> Phone Number</dt><dd>{isDemo ? "+218 91 234 5678" : "Unavailable"}</dd></div>
                <div><dt><PiGlobe /> Country</dt><dd>{isDemo ? "Libya" : "Unavailable"}</dd></div>
              </dl>
              <dl>
                <div><dt><PiTranslate /> {isDemo ? "Preferred Language" : "Store default language"}</dt><dd>{isDemo ? "Arabic" : store?.locale || "Unavailable"}</dd></div>
                <div><dt><PiClock /> {isDemo ? "Time Zone" : "Store time zone"}</dt><dd>{isDemo ? "Africa / Tripoli" : store?.timezone || "Unavailable"}</dd></div>
                <div><dt><PiCalendarBlank /> Joined</dt><dd>{formatDate(current.joined_at)}</dd></div>
                <div><dt><PiShieldCheck /> {isDemo ? "Verification" : "Account status"}</dt><dd className={current.account_status === "active" ? "is-positive" : undefined}>{isDemo && current.account_status === "active" ? "✓ Verified" : titleCase(current.account_status)}</dd></div>
              </dl>
            </div>
            </article>

            <article className="admin-linked-store admin-page-card">
            <header><div><h2>{current.account_store_count > 1 ? "Linked Stores" : "Linked Store"}</h2><p>{current.account_store_count > 1 ? `Showing this membership; ${current.account_store_count} Store memberships exist for this account` : "Storefront access assigned to this vendor"}</p></div><button type="button" onClick={storeDetail}>View store <PiArrowRight /></button></header>
            <div className="admin-linked-store__head"><span>Store</span><span>Status</span><span>Plan</span><span>Role</span><span>MTD GMV</span><span>Products</span><span>Last activity</span><span /></div>
            <div className="admin-linked-store__row">
              <div><span><PiStorefront /></span><p><strong>{storeName}</strong><small>{primaryDomain || "Unavailable"}</small></p></div>
              <span><i className="admin-page-status-dot" /> {active ? "Active" : "Disabled"}</span>
              <em>{plan}</em>
              <span>{titleCase(current.role)}</span>
              <strong>{isDemo ? "$18,450" : "—"}</strong>
              <span>{isDemo ? "624" : store?.product_count ?? "—"}</span>
              <span>{isDemo ? "9 min ago" : "Not connected"}</span>
              <div><button type="button" onClick={storeDetail}>Open Store</button><button type="button" aria-label="Open linked Store details" onClick={storeDetail}><PiDotsThree /></button></div>
            </div>
            </article>
          </div>
        </div>

        <aside className="admin-detail-side">
          <article className="admin-detail-side-card admin-page-card">
            <h2>Subscription</h2>
            <div className="admin-subscription-title"><span><PiTrendUp /></span><div><strong>{plan}</strong><small>{isDemo ? "$79 / month" : "Billing not connected"}</small></div><em>{isDemo ? (active ? "Active" : "Disabled") : "Plan"}</em></div>
            <dl><div><dt>Billing cycle</dt><dd>{isDemo ? "Monthly" : "Unavailable"}</dd></div><div><dt>{isDemo ? "Started" : "Membership joined"}</dt><dd>{formatDate(current.joined_at)}</dd></div><div><dt>Next renewal</dt><dd>{isDemo ? "12 Sep 2026" : "Unavailable"}</dd></div><div><dt>Payment status</dt><dd>{isDemo ? "Paid" : "Unavailable"}</dd></div></dl>
            <footer><button type="button" onClick={() => navigateDashboard("billing")}>Manage Plan</button><button type="button" onClick={() => navigateDashboard("billing")}>Billing history <PiArrowRight /></button></footer>
          </article>
          <article className="admin-detail-side-card admin-page-card">
            <h2>Access &amp; Security</h2>
            <dl><div><dt>Store role</dt><dd>{titleCase(current.role)}</dd></div><div><dt>Effective access</dt><dd>{active ? "Active" : "Disabled"}</dd></div><div><dt>MFA</dt><dd>{isDemo ? "✓ Enabled" : "Not connected"}</dd></div><div><dt>Active sessions</dt><dd>{isDemo ? "2" : "Not connected"}</dd></div><div><dt>Last sign-in</dt><dd>{isDemo ? "Tripoli · Chrome" : "Not connected"}</dd></div></dl>
            <footer className="admin-security-actions"><button type="button" onClick={() => onToast(isDemo ? "Demo vendor security is read-only." : "Reset the password from Manage access in the Vendors directory.")}><PiKey /> Reset Password</button><button type="button" className="is-warning" onClick={() => onToast(isDemo ? "Demo vendor security is read-only." : "Revoke sessions from Manage access in the Vendors directory.")}><PiWarning /> Revoke Sessions</button></footer>
          </article>
          <article className="admin-detail-side-card admin-page-card">
            <h2>Recent Activity</h2>
            {isDemo ? <ul className="admin-vendor-activity"><li><PiGlobe /><span>Updated custom domain</span><time>2 hours ago</time></li><li><PiStorefront /><span>Published 4 products</span><time>Yesterday, 16:20</time></li><li><PiIdentificationCard /><span>Subscription renewed</span><time>12 Aug 2026</time></li></ul> : <p className="admin-not-connected">Vendor activity history is not connected yet.</p>}
            <button type="button" className="admin-side-link" onClick={() => navigateDashboard("operations")}>View full activity <PiArrowRight /></button>
          </article>
        </aside>
      </div>
    </section>
  )
}
