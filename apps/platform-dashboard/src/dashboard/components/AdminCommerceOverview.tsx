import {
  PiArrowUpRight,
  PiBell,
  PiCalendarBlank,
  PiCaretDown,
  PiChartBar,
  PiChartLineUp,
  PiCheckCircle,
  PiCube,
  PiCurrencyDollar,
  PiGear,
  PiHouseFill,
  PiListBullets,
  PiMagnifyingGlass,
  PiPlus,
  PiShieldCheck,
  PiSignOut,
  PiShoppingCartFill,
  PiSquaresFourFill,
  PiStorefront,
  PiStorefrontFill,
  PiUsers,
  PiUsersThree,
} from "react-icons/pi"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import type { PlatformAdmin } from "../../auth/platform-auth"
import { listPlatformPortfolio } from "../api"
import { navigateDashboard, navigateDashboardDetail } from "../routing"
import type {
  DashboardRoute,
  PlatformPortfolio,
  PlatformStore,
  ProvisionStoreResult,
} from "../types"
import { StoreOnboardingDialog } from "./StoreOnboardingDialog"

import "./admin-commerce-overview.css"
import "./admin-dashboard-motion.css"
import "./admin-typography-scale.css"

type AdminCommerceOverviewProps = {
  admin: PlatformAdmin
  isDemo: boolean
  onSignOut: () => Promise<void>
}

type OpenPanel = "search" | "notifications" | "account" | "date" | null
type GrowthPeriod = "monthly" | "annually"
type GmvMode = "sales" | "orders"

type RecentStore = {
  id: string
  name: string
  owner: string
  plan: string
  status: string
  gmv: string
  icon: "shop" | "home" | "cart"
  realStore?: PlatformStore
}

const headerNav: Array<{ label: string; route: DashboardRoute }> = [
  { label: "Dashboard", route: "overview" },
  { label: "Stores", route: "clients" },
  { label: "Vendors", route: "vendor-accounts" },
  { label: "Plans", route: "billing" },
  { label: "Activity", route: "operations" },
]

const railGroups = [
  [
    { label: "Dashboard", route: "overview" as DashboardRoute, icon: PiSquaresFourFill },
    { label: "Stores", route: "clients" as DashboardRoute, icon: PiStorefront },
    { label: "Vendors", route: "vendor-accounts" as DashboardRoute, icon: PiUsersThree },
    { label: "Requests", route: "requests" as DashboardRoute, icon: PiListBullets },
  ],
  [
    { label: "Storefronts", route: "storefronts" as DashboardRoute, icon: PiCube },
    { label: "Analytics", route: "analytics" as DashboardRoute, icon: PiChartLineUp },
    { label: "Plans & billing", route: "billing" as DashboardRoute, icon: PiCurrencyDollar },
  ],
  [
    { label: "Settings", route: "settings" as DashboardRoute, icon: PiGear },
    { label: "Sign out", route: null, icon: PiSignOut },
  ],
]

const demoRecentStores: RecentStore[] = [
  {
    id: "demo-al-sanousi",
    name: "Al–Sanousi & Sons",
    owner: "Ahmed",
    plan: "Growth",
    status: "Active",
    gmv: "$18,450",
    icon: "shop",
  },
  {
    id: "demo-homenest",
    name: "HomeNest Libya",
    owner: "Sara",
    plan: "Pro",
    status: "Active",
    gmv: "$12,980",
    icon: "home",
  },
  {
    id: "demo-al-fikr",
    name: "Al–Fikr Market",
    owner: "Khaled",
    plan: "Trial",
    status: "Trial",
    gmv: "$7,240",
    icon: "cart",
  },
]

const annualBars = [
  { month: "JAN", height: 43 },
  { month: "FEB", height: 86 },
  { month: "MAR", height: 63 },
  { month: "APR", height: 100, featured: true },
  { month: "MAY", height: 77 },
  { month: "JUN", height: 90 },
]

const monthlyBars = [
  { month: "W1", height: 58 },
  { month: "W2", height: 72 },
  { month: "W3", height: 66 },
  { month: "W4", height: 88, featured: true },
  { month: "W5", height: 78 },
  { month: "W6", height: 92 },
]

const dateRanges = [
  "1 Jul, 2026 - 31 Jul, 2026",
  "1 Jun, 2026 - 30 Jun, 2026",
  "1 Apr, 2026 - 30 Jun, 2026",
  "1 Jan, 2026 - 31 Dec, 2026",
]

function planLabel(store: PlatformStore): string {
  return store.plan_code === "professional_commerce" ? "Pro" : "Starter"
}

function ownerLabel(store: PlatformStore): string {
  const owner = store.memberships.find(
    (membership) => membership.role === "owner" && membership.status === "active",
  )
  return owner?.display_name?.trim() || owner?.email?.split("@")[0] || "—"
}

function storeStatus(store: PlatformStore): string {
  if (store.status === "active") return "Active"
  if (store.status === "draft") return "Draft"
  if (store.status === "suspended") return "Suspended"
  return "Archived"
}

function realRecentStores(portfolio: PlatformPortfolio | null): RecentStore[] {
  if (!portfolio) return []

  return portfolio.clients
    .flatMap((client) =>
      client.stores.map((store, index) => ({
        id: store.id,
        name: store.name,
        owner: ownerLabel(store),
        plan: planLabel(store),
        status: storeStatus(store),
        gmv: "—",
        icon: (["shop", "home", "cart"] as const)[index % 3],
        realStore: store,
        updatedAt: Date.parse(store.updated_at ?? store.created_at ?? "") || 0,
      })),
    )
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 3)
}

export function AdminCommerceOverview({
  admin,
  isDemo,
  onSignOut,
}: AdminCommerceOverviewProps) {
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [growthPeriod, setGrowthPeriod] = useState<GrowthPeriod>("annually")
  const [gmvMode, setGmvMode] = useState<GmvMode>("sales")
  const [dateRange, setDateRange] = useState(dateRanges[0])
  const [portfolio, setPortfolio] = useState<PlatformPortfolio | null>(null)
  const [portfolioState, setPortfolioState] = useState<"loading" | "ready" | "failed">(
    isDemo ? "ready" : "loading",
  )
  const [onboardingOpen, setOnboardingOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | null>(null)

  const showToast = useCallback((message: string) => {
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current)
    setToast(message)
    toastTimer.current = window.setTimeout(() => setToast(null), 2600)
  }, [])

  const loadPortfolio = useCallback(async () => {
    if (isDemo) return null
    setPortfolioState("loading")
    try {
      const next = await listPlatformPortfolio()
      setPortfolio(next)
      setPortfolioState("ready")
      return next
    } catch {
      setPortfolioState("failed")
      return null
    }
  }, [isDemo])

  useEffect(() => {
    let active = true
    if (isDemo) return () => { active = false }

    void listPlatformPortfolio()
      .then((next) => {
        if (!active) return
        setPortfolio(next)
        setPortfolioState("ready")
      })
      .catch(() => {
        if (active) setPortfolioState("failed")
      })

    return () => {
      active = false
    }
  }, [isDemo])

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenPanel(null)
    }
    window.addEventListener("keydown", handleEscape)
    return () => window.removeEventListener("keydown", handleEscape)
  }, [])

  useEffect(
    () => () => {
      if (toastTimer.current !== null) window.clearTimeout(toastTimer.current)
    },
    [],
  )

  const goToRoute = (route: DashboardRoute) => {
    setOpenPanel(null)
    navigateDashboard(route)
  }

  const handleSignOut = async () => {
    setOpenPanel(null)
    setSigningOut(true)
    try {
      await onSignOut()
    } finally {
      setSigningOut(false)
    }
  }

  const handleProvisioned = async (_result: ProvisionStoreResult) => {
    await loadPortfolio()
    showToast("The new store was added to the platform.")
  }

  const openStore = (store: RecentStore) => {
    if (!store.realStore) {
      goToRoute("clients")
      return
    }
    navigateDashboardDetail("clients", store.realStore.id)
  }

  const adminName =
    [admin.first_name, admin.last_name].filter(Boolean).join(" ").trim() || "Platform Admin"
  const adminInitials =
    [admin.first_name, admin.last_name]
      .filter(Boolean)
      .map((part) => part?.trim().charAt(0).toUpperCase())
      .join("") || admin.email.charAt(0).toUpperCase()
  const welcomeName = isDemo ? "Mohamed" : admin.first_name?.trim() || "Admin"

  const metrics = useMemo(() => {
    if (isDemo) {
      return {
        activeStores: "48",
        vendors: "126",
        uptime: "99.9%",
        newStores: "+6",
        growth: "+12.8%",
        gmv: gmvMode === "sales" ? "$184,620" : "1,842",
        revenue: "$12,480",
        revenueGrowth: "+ 9.8%",
      }
    }

    const stores = portfolio?.clients.flatMap((client) => client.stores) ?? []
    const vendorEmails = new Set(
      stores
        .flatMap((store) => store.memberships)
        .filter((membership) => membership.status === "active" && membership.email)
        .map((membership) => membership.email?.toLowerCase()),
    )
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
    const newlyCreated = stores.filter((store) => {
      const created = Date.parse(store.created_at ?? "")
      return Number.isFinite(created) && created >= thirtyDaysAgo
    }).length

    return {
      activeStores:
        portfolioState === "loading" ? "…" : portfolioState === "failed" ? "—" : String(portfolio?.summary.active_stores ?? 0),
      vendors: portfolioState === "loading" ? "…" : portfolioState === "failed" ? "—" : String(vendorEmails.size),
      uptime: "—",
      newStores: portfolioState === "failed" ? "—" : newlyCreated ? `+${newlyCreated}` : "0",
      growth: "—",
      gmv: "—",
      revenue: "—",
      revenueGrowth: "—",
    }
  }, [gmvMode, isDemo, portfolio, portfolioState])

  const recentStores = useMemo(
    () => (isDemo ? demoRecentStores : realRecentStores(portfolio)),
    [isDemo, portfolio],
  )
  const growthBars = growthPeriod === "annually" ? annualBars : monthlyBars
  const normalizedQuery = searchQuery.trim().toLowerCase()
  const searchResults = headerNav.filter((item) =>
    item.label.toLowerCase().includes(normalizedQuery),
  )

  const togglePanel = (panel: Exclude<OpenPanel, null>) => {
    setOpenPanel((current) => (current === panel ? null : panel))
  }

  return (
    <div className="admin-commerce-overview admin-dashboard-enter" dir="ltr" data-demo={isDemo ? "true" : "false"}>
      <div className="admin-commerce-overview__shell">
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
            {headerNav.map((item) => (
              <button
                type="button"
                key={item.label}
                className={item.route === "overview" ? "is-active" : undefined}
                aria-current={item.route === "overview" ? "page" : undefined}
                onClick={() => goToRoute(item.route)}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="admin-commerce-overview__header-actions">
            <button
              type="button"
              className="admin-commerce-overview__round-action"
              aria-label="Search dashboard"
              aria-expanded={openPanel === "search"}
              aria-controls="admin-overview-search"
              onClick={() => togglePanel("search")}
            >
              <PiMagnifyingGlass />
            </button>
            <button
              type="button"
              className="admin-commerce-overview__round-action"
              aria-label="Notifications"
              disabled={!isDemo}
              title={!isDemo ? "Notification feed is not connected" : undefined}
              aria-expanded={openPanel === "notifications"}
              aria-controls="admin-overview-notifications"
              onClick={() => togglePanel("notifications")}
            >
              <PiBell />
            </button>
            <button
              type="button"
              className="admin-commerce-overview__avatar-button"
              aria-label={`Open account menu for ${adminName}`}
              aria-expanded={openPanel === "account"}
              aria-controls="admin-overview-account"
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

        <section className="admin-commerce-overview__welcome" aria-label="Dashboard welcome">
          <h1>
            Welcome Back, <span>{welcomeName}</span>
          </h1>
          <div className="admin-commerce-overview__welcome-actions">
            <button
              type="button"
              className="admin-commerce-overview__date-button"
              disabled={!isDemo}
              title={!isDemo ? "Historical dashboard ranges are not connected" : undefined}
              aria-expanded={openPanel === "date"}
              aria-controls="admin-overview-date-menu"
              onClick={() => togglePanel("date")}
            >
              <PiCalendarBlank />
              <span>{dateRange}</span>
              <PiCaretDown />
            </button>
            <button
              type="button"
              className="admin-commerce-overview__add-store"
              onClick={() => setOnboardingOpen(true)}
            >
              <PiPlus />
              <span>Add New Store</span>
            </button>
          </div>
        </section>

        <aside className="admin-commerce-overview__rail" aria-label="Dashboard shortcuts">
          {railGroups.map((group, groupIndex) => (
            <div className="admin-commerce-overview__rail-group" key={groupIndex}>
              {group.map((item) => {
                const Icon = item.icon
                const active = item.route === "overview"
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

        <main className="admin-commerce-overview__content">
          <section className="admin-commerce-overview__card admin-commerce-overview__platform-card">
            <div className="admin-commerce-overview__card-heading">
              <div>
                <h2>Platform Overview</h2>
                <p>Live store network</p>
              </div>
              <button type="button" aria-label="Open stores" onClick={() => goToRoute("clients")}>
                <PiArrowUpRight />
              </button>
            </div>
            <div className="admin-commerce-overview__network-panel">
              <div className="admin-commerce-overview__network-title">
                <span>ACTIVE STORES</span>
                <strong>{metrics.activeStores}</strong>
              </div>
              <PiStorefront className="admin-commerce-overview__network-store-icon" />
              <div className="admin-commerce-overview__network-detail">
                <span><PiUsers /> <strong>{metrics.vendors}</strong> Vendors</span>
                <span><PiShieldCheck /> <strong>{metrics.uptime}</strong> Uptime</span>
              </div>
              <span className="admin-commerce-overview__dot-matrix" aria-hidden="true" />
            </div>
          </section>

          <section className="admin-commerce-overview__card admin-commerce-overview__new-stores-card">
            <div>
              <h2>New Stores</h2>
              <p><strong>{metrics.newStores}</strong> this month</p>
            </div>
            <span>{metrics.growth}</span>
          </section>

          <section className="admin-commerce-overview__card admin-commerce-overview__growth-card">
            <div className="admin-commerce-overview__growth-heading">
              <span className="admin-commerce-overview__heading-icon"><PiChartBar /></span>
              <h2>Store Growth</h2>
              <div className="admin-commerce-overview__segment" aria-label="Store growth period">
                <button
                  type="button"
                  className={growthPeriod === "monthly" ? "is-active" : undefined}
                  disabled={!isDemo}
                  onClick={() => setGrowthPeriod("monthly")}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  className={growthPeriod === "annually" ? "is-active" : undefined}
                  disabled={!isDemo}
                  onClick={() => setGrowthPeriod("annually")}
                >
                  Annually
                </button>
              </div>
              <button
                type="button"
                className="admin-commerce-overview__detail-button"
                aria-label="Open store analytics"
                onClick={() => goToRoute("analytics")}
              >
                <PiArrowUpRight />
              </button>
            </div>

            <div className={`admin-commerce-overview__bar-chart${isDemo ? "" : " is-unavailable"}`}>
              <div className="admin-commerce-overview__y-axis" aria-hidden="true">
                {['5k', '4k', '3k', '2k', '1k', '0'].map((value) => <span key={value}>{value}</span>)}
              </div>
              <div className="admin-commerce-overview__chart-grid" aria-hidden="true">
                {Array.from({ length: 6 }, (_, index) => <i key={index} />)}
              </div>
              <div className="admin-commerce-overview__bars">
                {growthBars.map((bar) => (
                  <div className="admin-commerce-overview__bar-column" key={bar.month}>
                    <div
                      className={`admin-commerce-overview__bar${bar.featured ? " is-featured" : ""}`}
                      style={{ height: isDemo ? `${bar.height}%` : "12%" }}
                    >
                      {bar.featured && isDemo ? (
                        <>
                          <span className="admin-commerce-overview__bar-badge">+17.8%</span>
                          <i className="admin-commerce-overview__bar-marker" />
                        </>
                      ) : null}
                    </div>
                    <span>{bar.month}</span>
                  </div>
                ))}
              </div>
              {!isDemo ? <p className="admin-commerce-overview__chart-message">Historical growth is not connected.</p> : null}
            </div>
          </section>

          <section className="admin-commerce-overview__card admin-commerce-overview__gmv-card">
            <div className="admin-commerce-overview__card-heading">
              <div>
                <h2>Monthly GMV</h2>
                <p>All stores</p>
              </div>
              <button type="button" aria-label="Open GMV report" onClick={() => goToRoute("analytics")}>
                <PiArrowUpRight />
              </button>
            </div>
            <strong className="admin-commerce-overview__gmv-value">{metrics.gmv}</strong>
            <div className={`admin-commerce-overview__gmv-chart${isDemo ? "" : " is-unavailable"}`}>
              <svg viewBox="0 0 321 126" preserveAspectRatio="none" role="img" aria-label="Monthly gross merchandise value trend">
                <defs>
                  <linearGradient id="gmvArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#08a8d4" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#08a8d4" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {[20, 46, 72, 98, 124].map((y) => (
                  <line key={y} x1="0" x2="321" y1={y} y2={y} className="admin-commerce-overview__gmv-guide" />
                ))}
                {isDemo ? (
                  <>
                    <path className="admin-commerce-overview__gmv-area" d="M0 58 C18 71 27 76 39 57 C51 37 59 83 69 30 C79 -8 93 32 105 45 C119 61 130 82 143 45 C155 7 170 11 183 50 C193 71 202 41 211 63 C222 82 232 101 243 86 C257 68 270 48 283 54 C295 57 303 18 321 24 L321 126 L0 126 Z" />
                    <path className="admin-commerce-overview__gmv-line" d="M0 58 C18 71 27 76 39 57 C51 37 59 83 69 30 C79 -8 93 32 105 45 C119 61 130 82 143 45 C155 7 170 11 183 50 C193 71 202 41 211 63 C222 82 232 101 243 86 C257 68 270 48 283 54 C295 57 303 18 321 24" />
                  </>
                ) : null}
              </svg>
              {!isDemo ? <span>GMV analytics are not connected.</span> : null}
            </div>
            <div className="admin-commerce-overview__gmv-segment" aria-label="GMV metric">
              <button type="button" className={gmvMode === "sales" ? "is-active" : undefined} disabled={!isDemo} onClick={() => setGmvMode("sales")}>Sales <span>↑</span></button>
              <button type="button" className={gmvMode === "orders" ? "is-active" : undefined} disabled={!isDemo} onClick={() => setGmvMode("orders")}>Orders <span>↓</span></button>
            </div>
          </section>

          <section className="admin-commerce-overview__card admin-commerce-overview__recent-card">
            <div className="admin-commerce-overview__card-heading">
              <div>
                <h2>Recent Stores</h2>
                <p>Latest platform activity</p>
              </div>
              <button type="button" aria-label="Open all stores" onClick={() => goToRoute("clients")}>
                <PiArrowUpRight />
              </button>
            </div>
            <div className="admin-commerce-overview__store-table" role="table" aria-label="Recent stores">
              <div className="admin-commerce-overview__store-row admin-commerce-overview__store-row--head" role="row">
                <span role="columnheader">Store</span>
                <span role="columnheader">Owner</span>
                <span role="columnheader">Plan</span>
                <span role="columnheader">Status</span>
                <span role="columnheader">GMV</span>
              </div>
              {recentStores.map((store, index) => (
                <button
                  type="button"
                  className={`admin-commerce-overview__store-row${index === 1 ? " is-highlighted" : ""}`}
                  role="row"
                  key={store.id}
                  onClick={() => openStore(store)}
                >
                  <span className="admin-commerce-overview__store-name" role="cell">
                    <i className={`is-${store.icon}`} aria-hidden="true">
                      {store.icon === "cart" ? <PiShoppingCartFill /> : store.icon === "home" ? <PiHouseFill /> : <PiStorefrontFill />}
                    </i>
                    <b>{store.name}</b>
                  </span>
                  <span role="cell">{store.owner}</span>
                  <span role="cell">{store.plan}</span>
                  <span className={`admin-commerce-overview__store-status is-${store.status.toLowerCase()}`} role="cell"><i />{store.status}</span>
                  <span role="cell">{store.gmv}</span>
                </button>
              ))}
              {!recentStores.length ? (
                <div className="admin-commerce-overview__table-empty">
                  {portfolioState === "failed" ? "The store portfolio is unavailable." : "No stores have been added yet."}
                </div>
              ) : null}
            </div>
          </section>

          <section className="admin-commerce-overview__card admin-commerce-overview__revenue-card">
            <div>
              <h2>Monthly Revenue</h2>
              <p>Recurring platform revenue</p>
            </div>
            <div className="admin-commerce-overview__revenue-value">
              <strong>{metrics.revenue}</strong>
              <span>{metrics.revenueGrowth}</span>
            </div>
            <div className="admin-commerce-overview__plans-panel">
              <div className="admin-commerce-overview__plans-heading">
                <div>
                  <h3>Subscription Plans</h3>
                  <p>Active store plans</p>
                </div>
                <button type="button" aria-label="Open subscription plans" onClick={() => goToRoute("billing")}><PiArrowUpRight /></button>
              </div>
              <div className="admin-commerce-overview__plan-members">
                {isDemo ? <img src="/assets/subscription-members.png" alt="Four active plan members" /> : null}
                <span>{isDemo ? "+12" : "Assignments only"}</span>
              </div>
            </div>
          </section>
        </main>
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
          onClick={() => setOpenPanel(null)}
        />
      ) : null}

      {openPanel === "search" ? (
        <section id="admin-overview-search" className="admin-commerce-overview__popover admin-commerce-overview__popover--search" role="dialog" aria-label="Search platform dashboard">
          <label htmlFor="admin-overview-search-input">Search dashboard</label>
          <div>
            <PiMagnifyingGlass />
            <input
              id="admin-overview-search-input"
              type="search"
              autoFocus
              placeholder="Search pages"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && searchResults[0]) goToRoute(searchResults[0].route)
              }}
            />
          </div>
          {searchResults.map((item) => (
            <button type="button" key={item.label} onClick={() => goToRoute(item.route)}>{item.label}<PiArrowUpRight /></button>
          ))}
          {!searchResults.length ? <p>No matching pages.</p> : null}
        </section>
      ) : null}

      {openPanel === "notifications" && isDemo ? (
        <section id="admin-overview-notifications" className="admin-commerce-overview__popover admin-commerce-overview__popover--notifications" role="menu" aria-label="Notifications">
          <strong>Notifications</strong>
          <button type="button" onClick={() => goToRoute("requests")}>3 stores need attention</button>
          <button type="button" onClick={() => goToRoute("billing")}>8 plan renewals are due this week</button>
        </section>
      ) : null}

      {openPanel === "account" ? (
        <section id="admin-overview-account" className="admin-commerce-overview__popover admin-commerce-overview__popover--account" role="menu" aria-label="Account">
          <strong>{adminName}</strong>
          <small>{admin.email}</small>
          <button type="button" onClick={() => goToRoute("settings")}><PiGear /> Platform settings</button>
          <button type="button" onClick={() => void handleSignOut()} disabled={signingOut}><PiSignOut /> {signingOut ? "Signing out…" : "Sign out"}</button>
        </section>
      ) : null}

      {openPanel === "date" ? (
        <section id="admin-overview-date-menu" className="admin-commerce-overview__popover admin-commerce-overview__popover--date" role="menu" aria-label="Dashboard date range">
          <strong>Date range</strong>
          {dateRanges.map((range) => (
            <button
              type="button"
              className={range === dateRange ? "is-active" : undefined}
              key={range}
              onClick={() => {
                setDateRange(range)
                setOpenPanel(null)
                showToast(`Dashboard range changed to ${range}.`)
              }}
            >
              <PiCalendarBlank /> {range}
            </button>
          ))}
        </section>
      ) : null}

      {toast ? <div className="admin-commerce-overview__toast" role="status"><PiCheckCircle />{toast}</div> : null}

      <StoreOnboardingDialog
        open={onboardingOpen}
        existingClient={null}
        isDemo={isDemo}
        onClose={() => setOnboardingOpen(false)}
        onProvisioned={handleProvisioned}
      />
    </div>
  )
}
