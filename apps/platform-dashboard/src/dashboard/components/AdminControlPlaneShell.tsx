import {
  PiBell,
  PiCaretDown,
  PiChartLineUp,
  PiCurrencyDollar,
  PiCube,
  PiGear,
  PiGlobe,
  PiListChecks,
  PiMagnifyingGlass,
  PiShieldCheck,
  PiSignOut,
  PiSquaresFourFill,
  PiStorefront,
  PiUsersThree,
} from "react-icons/pi"
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"

import type { PlatformAdmin } from "../../auth/platform-auth"
import { navigateDashboard } from "../routing"
import type { DashboardRoute } from "../types"

import "./admin-commerce-overview.css"
import "./admin-control-plane-shell.css"
import "./admin-control-plane-pages.css"
import "./admin-dashboard-motion.css"
import "./admin-typography-scale.css"

type AdminControlPlaneShellProps = {
  activeRoute: DashboardRoute
  admin: PlatformAdmin
  children: ReactNode
  isDemo: boolean
  onSignOut: () => Promise<void>
}

type OpenPanel = "search" | "notifications" | "account" | null

const headerNav: Array<{ label: string; route: DashboardRoute }> = [
  { label: "Dashboard", route: "overview" },
  { label: "Stores", route: "clients" },
  { label: "Vendors", route: "vendor-accounts" },
  { label: "Plans", route: "billing" },
  { label: "Activity", route: "operations" },
]

const searchablePages: Array<{ label: string; description: string; route: DashboardRoute }> = [
  { label: "Dashboard", description: "Platform overview", route: "overview" },
  { label: "Stores", description: "Storefronts, owners and domains", route: "clients" },
  { label: "Vendors", description: "Owners, teams and access", route: "vendor-accounts" },
  { label: "Templates Studio", description: "Storefront designs", route: "storefronts" },
  { label: "Plans", description: "Plans and billing", route: "billing" },
  { label: "Activity", description: "Platform operations", route: "operations" },
  { label: "Analytics", description: "Platform growth and performance", route: "analytics" },
  { label: "Domains", description: "Custom domains, DNS and SSL", route: "domains" },
  { label: "Requests", description: "Store and platform service requests", route: "requests" },
  { label: "Security & Audit", description: "Sessions, access and events", route: "security" },
  { label: "Settings", description: "Platform configuration", route: "settings" },
]

export function AdminControlPlaneShell({
  activeRoute,
  admin,
  children,
  isDemo,
  onSignOut,
}: AdminControlPlaneShellProps) {
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [signingOut, setSigningOut] = useState(false)
  const searchTriggerRef = useRef<HTMLButtonElement>(null)
  const notificationTriggerRef = useRef<HTMLButtonElement>(null)
  const accountTriggerRef = useRef<HTMLButtonElement>(null)

  const adminName =
    [admin.first_name, admin.last_name].filter(Boolean).join(" ").trim() || admin.email
  const adminInitials =
    [admin.first_name, admin.last_name]
      .filter(Boolean)
      .map((part) => part?.trim().charAt(0).toUpperCase())
      .join("") || admin.email.charAt(0).toUpperCase()
  const normalizedSearch = searchQuery.trim().toLowerCase()
  const results = useMemo(
    () =>
      searchablePages.filter((page) =>
        `${page.label} ${page.description}`.toLowerCase().includes(normalizedSearch),
      ),
    [normalizedSearch],
  )

  const goToRoute = (route: DashboardRoute) => {
    setOpenPanel(null)
    setSearchQuery("")
    navigateDashboard(route)
  }

  const closePanel = (restoreFocus = false) => {
    const current = openPanel
    setOpenPanel(null)
    if (!restoreFocus) return
    window.requestAnimationFrame(() => {
      if (current === "search") searchTriggerRef.current?.focus()
      if (current === "notifications") notificationTriggerRef.current?.focus()
      if (current === "account") accountTriggerRef.current?.focus()
    })
  }

  useEffect(() => {
    if (!openPanel) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closePanel(true)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [openPanel])

  const togglePanel = (panel: Exclude<OpenPanel, null>) => {
    setOpenPanel((current) => (current === panel ? null : panel))
  }

  const handleSignOut = async () => {
    if (signingOut) return
    setSigningOut(true)
    try {
      await onSignOut()
    } finally {
      setSigningOut(false)
    }
  }

  const middleRail = [
    { label: "Storefronts", route: "storefronts" as DashboardRoute, icon: PiCube },
    { label: "Analytics", route: "analytics" as DashboardRoute, icon: PiChartLineUp },
    { label: "Domains", route: "domains" as DashboardRoute, icon: PiGlobe },
    ...(activeRoute === "security"
      ? [{ label: "Security & Audit", route: "security" as DashboardRoute, icon: PiShieldCheck }]
      : []),
    { label: "Plans & billing", route: "billing" as DashboardRoute, icon: PiCurrencyDollar },
  ]

  const railGroups = [
    [
      { label: "Dashboard", route: "overview" as DashboardRoute, icon: PiSquaresFourFill },
      { label: "Stores", route: "clients" as DashboardRoute, icon: PiStorefront },
      { label: "Vendors", route: "vendor-accounts" as DashboardRoute, icon: PiUsersThree },
      { label: "Requests", route: "requests" as DashboardRoute, icon: PiListChecks },
    ],
    middleRail,
    [
      { label: "Settings", route: "settings" as DashboardRoute, icon: PiGear },
      { label: "Sign out", route: null, icon: PiSignOut },
    ],
  ]

  return (
    <div
      className="admin-commerce-overview admin-control-plane admin-dashboard-enter"
      dir="ltr"
      data-demo={isDemo ? "true" : "false"}
    >
      <div className="admin-commerce-overview__shell admin-control-plane__shell">
        <header className="admin-commerce-overview__header">
          <button
            type="button"
            className="admin-commerce-overview__logo"
            aria-label="LabibTech dashboard"
            onClick={() => goToRoute("overview")}
          >
            <img
              className="admin-commerce-overview__logo-lockup"
              src="/assets/labibtech-horizontal-lockup.png"
              alt=""
            />
          </button>

          <nav className="admin-commerce-overview__top-nav" aria-label="Platform navigation">
            {headerNav.map((item) => {
              const active = activeRoute === item.route
              return (
                <button
                  type="button"
                  key={item.label}
                  className={active ? "is-active" : undefined}
                  aria-current={active ? "page" : undefined}
                  onClick={() => goToRoute(item.route)}
                >
                  {item.label}
                </button>
              )
            })}
          </nav>

          <div className="admin-commerce-overview__header-actions">
            <button
              ref={searchTriggerRef}
              type="button"
              className="admin-commerce-overview__round-action"
              aria-label="Search dashboard"
              aria-expanded={openPanel === "search"}
              aria-controls="admin-control-search"
              onClick={() => togglePanel("search")}
            >
              <PiMagnifyingGlass />
            </button>
            <button
              ref={notificationTriggerRef}
              type="button"
              className="admin-commerce-overview__round-action"
              aria-label="Notifications"
              disabled={!isDemo}
              title={!isDemo ? "Notification feed is not connected" : undefined}
              aria-expanded={openPanel === "notifications"}
              aria-controls="admin-control-notifications"
              onClick={() => togglePanel("notifications")}
            >
              <PiBell />
            </button>
            <button
              ref={accountTriggerRef}
              type="button"
              className="admin-commerce-overview__avatar-button"
              aria-label={`Open account menu for ${adminName}`}
              aria-expanded={openPanel === "account"}
              aria-controls="admin-control-account"
              onClick={() => togglePanel("account")}
            >
              {admin.avatar_url ? (
                <img src={admin.avatar_url} alt="" />
              ) : isDemo ? (
                <img src="/assets/admin-overview-avatar-tight.png" alt="" />
              ) : (
                <span className="admin-control-plane__avatar-fallback" aria-hidden="true">{adminInitials}</span>
              )}
              <PiCaretDown />
            </button>
          </div>
        </header>

        <aside className="admin-commerce-overview__rail admin-control-plane__rail" aria-label="Dashboard shortcuts">
          {railGroups.map((group, groupIndex) => (
            <div className="admin-commerce-overview__rail-group" key={groupIndex}>
              {group.map((item) => {
                const Icon = item.icon
                const active = item.route === activeRoute
                return (
                  <button
                    type="button"
                    key={item.label}
                    className={active ? "is-active" : undefined}
                    aria-label={item.label}
                    aria-current={active ? "page" : undefined}
                    data-tooltip={item.label}
                    onClick={() =>
                      item.route ? goToRoute(item.route) : void handleSignOut()
                    }
                    disabled={!item.route && signingOut}
                  >
                    <Icon />
                  </button>
                )
              })}
            </div>
          ))}
        </aside>

        <main className="admin-control-plane__page">{children}</main>
        {isDemo ? (
          <div className="admin-control-plane__preview-badge" role="status">
            Visual preview · sample data · no changes are persisted
          </div>
        ) : null}
      </div>

      {openPanel ? (
        <button
          type="button"
          className="admin-commerce-overview__scrim"
          aria-label="Close menu"
          onClick={() => closePanel(true)}
        />
      ) : null}

      {openPanel === "search" ? (
        <section
          id="admin-control-search"
          className="admin-commerce-overview__popover admin-commerce-overview__popover--search"
          aria-label="Search dashboard pages"
        >
          <div>
            <PiMagnifyingGlass />
            <input
              autoFocus
              value={searchQuery}
              placeholder="Search pages"
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>
          {results.length ? (
            results.map((result) => (
              <button type="button" key={result.route} onClick={() => goToRoute(result.route)}>
                <strong>{result.label}</strong>
                <span>{result.description}</span>
              </button>
            ))
          ) : (
            <p>No matching pages.</p>
          )}
        </section>
      ) : null}

      {openPanel === "notifications" && isDemo ? (
        <section
          id="admin-control-notifications"
          className="admin-commerce-overview__popover admin-commerce-overview__popover--notifications"
          aria-label="Notifications"
        >
          <h2>Notifications</h2>
          <button type="button" onClick={() => goToRoute("requests")}>
            <strong>4 stores need attention</strong>
            <span>Review payment or setup issues</span>
          </button>
          <button type="button" onClick={() => goToRoute("security")}>
            <strong>2 security alerts</strong>
            <span>Review recent access activity</span>
          </button>
        </section>
      ) : null}

      {openPanel === "account" ? (
        <section
          id="admin-control-account"
          className="admin-commerce-overview__popover admin-commerce-overview__popover--account"
          aria-label="Account menu"
        >
          <div className="admin-control-plane__account-summary">
            <strong>{adminName}</strong>
            <span>{admin.email}</span>
          </div>
          <button type="button" onClick={() => goToRoute("settings")}>
            <PiGear />
            <span>Platform settings</span>
          </button>
          <button type="button" onClick={() => goToRoute("security")}>
            <PiShieldCheck />
            <span>Security &amp; audit</span>
          </button>
          <button type="button" onClick={() => void handleSignOut()} disabled={signingOut}>
            <PiSignOut />
            <span>{signingOut ? "Signing out…" : "Sign out"}</span>
          </button>
        </section>
      ) : null}
    </div>
  )
}
