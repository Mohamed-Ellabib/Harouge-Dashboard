import {
  PiArrowRight,
  PiCalendarBlank,
  PiChartLineUp,
  PiCheckCircleFill,
  PiCurrencyDollar,
  PiDownloadSimple,
  PiDotsThree,
  PiShoppingCart,
  PiStorefront,
  PiUsersThree,
} from "react-icons/pi"
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react"

import type { PlatformPortfolio, PlatformStore } from "../types"
import { navigateDashboard } from "../routing"

import "./admin-analytics.css"

type AdminAnalyticsPageProps = {
  isDemo: boolean
  portfolio: PlatformPortfolio | null
  loading: boolean
  error?: string | null
  onToast: (message: string) => void
}

type RevenuePoint = {
  label: string
  value: number
  display: string
}

type StoreGrowthPoint = {
  label: string
  value: number
}

type AnalyticsStoreRow = {
  id: string
  name: string
  plan: string
  gmv: string
  growth: string
  share: string
  shareValue: number
  productCount?: number
  negative?: boolean
  cart?: boolean
}

type PlanSlice = {
  label: string
  count: number
  color: string
}

const demoRevenue: RevenuePoint[] = [
  { label: "FEB", value: 118, display: "118K" },
  { label: "MAR", value: 132, display: "132K" },
  { label: "APR", value: 146, display: "146K" },
  { label: "MAY", value: 139, display: "139K" },
  { label: "JUN", value: 162, display: "162K" },
  { label: "JUL", value: 184.6, display: "184.6K" },
]

const demoStoreGrowth: StoreGrowthPoint[] = [
  { label: "FEB", value: 32 },
  { label: "MAR", value: 35 },
  { label: "APR", value: 39 },
  { label: "MAY", value: 42 },
  { label: "JUN", value: 45 },
  { label: "JUL", value: 48 },
]

const demoTopStores: AnalyticsStoreRow[] = [
  { id: "al-sanousi", name: "Al-Sanousi & Sons", plan: "Growth", gmv: "$18,450", growth: "+18.4%", share: "21.2%", shareValue: 21.2 },
  { id: "homenest", name: "HomeNest Libya", plan: "Pro", gmv: "$12,980", growth: "+12.9%", share: "14.9%", shareValue: 14.9 },
  { id: "noor", name: "Noor Boutique", plan: "Growth", gmv: "$9,860", growth: "+8.7%", share: "11.3%", shareValue: 11.3 },
  { id: "al-fikr", name: "Al-Fikr Market", plan: "Starter", gmv: "$7,240", growth: "+6.2%", share: "8.3%", shareValue: 8.3, cart: true },
  { id: "tripoli", name: "Tripoli Tech", plan: "Pro", gmv: "$6,310", growth: "−2.4%", share: "7.2%", shareValue: 7.2, negative: true },
]

const demoPlans: PlanSlice[] = [
  { label: "Starter", count: 14, color: "#b8bec7" },
  { label: "Growth", count: 21, color: "#0aa8d3" },
  { label: "Pro", count: 13, color: "#0a315f" },
]

function planLabel(store: PlatformStore): string {
  return store.plan_code === "professional_commerce" ? "Professional" : "Starter"
}

function csvCell(value: string | number): string {
  const text = String(value)
  const safe = /^[=+@-]/.test(text) ? `'${text}` : text
  return `"${safe.replace(/"/g, '""')}"`
}

function downloadAnalyticsReport(
  isDemo: boolean,
  stores: AnalyticsStoreRow[],
  totals: { totalStores: number; activeStores: number; accounts: number; memberships: number; products: number },
) {
  const summary = [
    ["Metric", "Value"],
    ["Total Stores", totals.totalStores],
    ["Active Stores", totals.activeStores],
    ["Vendor Accounts", totals.accounts],
    ["Store Memberships", totals.memberships],
    ["Products", totals.products],
    ...(isDemo
      ? [
          ["Monthly Revenue", "$12,480"],
          ["Monthly GMV", "$184,620"],
        ]
      : [
          ["Monthly Revenue", "Unavailable"],
          ["Monthly GMV", "Unavailable"],
        ]),
  ]
  const storeRows = stores.map((store) => [
    store.name,
    store.plan,
    isDemo ? store.gmv : store.productCount ?? 0,
    isDemo ? store.growth : "Unavailable",
  ])
  const content = [
    ...summary,
    [],
    ["Store", "Plan", isDemo ? "GMV" : "Products", isDemo ? "Growth" : "GMV"],
    ...storeRows,
  ]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n")
  const url = URL.createObjectURL(
    new Blob([content], { type: "text/csv;charset=utf-8" }),
  )
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = "labibtech-analytics.csv"
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

function RevenueGrowthChart({ points }: { points: RevenuePoint[] | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!points) return
    const canvas = canvasRef.current
    if (!canvas) return

    const render = () => {
      const bounds = canvas.getBoundingClientRect()
      if (!bounds.width || !bounds.height) return
      const ratio = Math.max(window.devicePixelRatio || 1, 1)
      canvas.width = Math.round(bounds.width * ratio)
      canvas.height = Math.round(bounds.height * ratio)
      const context = canvas.getContext("2d")
      if (!context) return
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      context.clearRect(0, 0, bounds.width, bounds.height)

      const padding = { top: 39, right: 27, bottom: 35, left: 47 }
      const chartWidth = bounds.width - padding.left - padding.right
      const chartHeight = bounds.height - padding.top - padding.bottom
      const yFor = (value: number) =>
        padding.top + chartHeight - (value / 200) * chartHeight
      const xFor = (index: number) =>
        padding.left + (chartWidth / (points.length - 1)) * index

      context.font = "11px Segoe UI, Arial, sans-serif"
      context.textAlign = "right"
      context.textBaseline = "middle"
      for (const value of [0, 50, 100, 150, 200]) {
        const y = yFor(value)
        context.beginPath()
        context.setLineDash([4, 5])
        context.strokeStyle = "#d9e0e5"
        context.lineWidth = 1
        context.moveTo(padding.left, y)
        context.lineTo(bounds.width - padding.right, y)
        context.stroke()
        context.fillStyle = "#667185"
        context.fillText(value === 0 ? "0" : `${value}K`, padding.left - 9, y)
      }
      context.setLineDash([])

      const area = context.createLinearGradient(0, padding.top, 0, padding.top + chartHeight)
      area.addColorStop(0, "rgba(7, 166, 215, 0.20)")
      area.addColorStop(1, "rgba(7, 166, 215, 0.018)")
      context.beginPath()
      context.moveTo(xFor(0), yFor(points[0].value))
      points.slice(1).forEach((point, index) => context.lineTo(xFor(index + 1), yFor(point.value)))
      context.lineTo(xFor(points.length - 1), padding.top + chartHeight)
      context.lineTo(xFor(0), padding.top + chartHeight)
      context.closePath()
      context.fillStyle = area
      context.fill()

      context.beginPath()
      points.forEach((point, index) => {
        const x = xFor(index)
        const y = yFor(point.value)
        if (index === 0) context.moveTo(x, y)
        else context.lineTo(x, y)
      })
      context.strokeStyle = "#08a5d2"
      context.lineWidth = 2.2
      context.lineJoin = "round"
      context.lineCap = "round"
      context.stroke()

      points.forEach((point, index) => {
        const x = xFor(index)
        const y = yFor(point.value)
        context.beginPath()
        context.arc(x, y, 5.2, 0, Math.PI * 2)
        context.fillStyle = "#08a5d2"
        context.fill()
        context.lineWidth = 2.5
        context.strokeStyle = "#fff"
        context.stroke()
        context.fillStyle = "#111923"
        context.textAlign = "center"
        context.textBaseline = "bottom"
        context.font = "600 11px Segoe UI, Arial, sans-serif"
        if (index < points.length - 1) context.fillText(point.display, x, y - 10)
        context.fillStyle = "#5f6878"
        context.textBaseline = "top"
        context.font = "11px Segoe UI, Arial, sans-serif"
        context.fillText(point.label, x, padding.top + chartHeight + 13)
      })

      const last = points[points.length - 1]
      const lastX = xFor(points.length - 1)
      const lastY = yFor(last.value)
      const tooltipWidth = 67
      const tooltipHeight = 33
      const tooltipX = Math.min(lastX - tooltipWidth / 2, bounds.width - padding.right - tooltipWidth)
      const tooltipY = Math.max(1, lastY - 48)
      context.setLineDash([2, 3])
      context.strokeStyle = "#9ca7b2"
      context.beginPath()
      context.moveTo(lastX, tooltipY + tooltipHeight)
      context.lineTo(lastX, lastY - 7)
      context.stroke()
      context.setLineDash([])
      context.beginPath()
      context.roundRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight, 8)
      context.fillStyle = "#fff"
      context.fill()
      context.strokeStyle = "#919ca8"
      context.lineWidth = 1
      context.stroke()
      context.fillStyle = "#536070"
      context.font = "600 12px Segoe UI, Arial, sans-serif"
      context.textAlign = "center"
      context.textBaseline = "middle"
      context.fillText(`$${last.display}`, tooltipX + tooltipWidth / 2, tooltipY + tooltipHeight / 2)
    }

    render()
    const observer = new ResizeObserver(render)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [points])

  if (!points) {
    return (
      <div className="admin-analytics__unavailable" role="status">
        <PiChartLineUp />
        <strong>Revenue and GMV time-series unavailable</strong>
        <span>Connect the platform reporting source to populate this chart.</span>
      </div>
    )
  }

  return (
    <div className="admin-analytics__line-chart">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Monthly GMV: February 118 thousand, March 132 thousand, April 146 thousand, May 139 thousand, June 162 thousand, July 184.6 thousand dollars."
      />
    </div>
  )
}

function donutStyle(slices: PlanSlice[]): CSSProperties {
  const total = Math.max(slices.reduce((sum, slice) => sum + slice.count, 0), 1)
  let cursor = 0
  const stops: string[] = []
  slices.forEach((slice) => {
    const start = cursor
    const end = cursor + (slice.count / total) * 100
    stops.push(`${slice.color} ${start}% ${Math.max(end - 0.55, start)}%`)
    stops.push(`#fff ${Math.max(end - 0.55, start)}% ${Math.min(end + 0.55, 100)}%`)
    cursor = end
  })
  return { background: `conic-gradient(${stops.join(", ")})` }
}

export function AdminAnalyticsPage({
  isDemo,
  portfolio,
  loading,
  error = null,
  onToast,
}: AdminAnalyticsPageProps) {
  const [dateRange, setDateRange] = useState("1 Feb, 2026 – 31 Jul, 2026")
  const stores = useMemo(
    () => portfolio?.clients.flatMap((client) => client.stores) ?? [],
    [portfolio],
  )
  const memberships = useMemo(
    () => stores.flatMap((store) => store.memberships),
    [stores],
  )
  const accountEmails = useMemo(
    () =>
      new Set(
        memberships
          .map((membership) => membership.email?.trim().toLowerCase())
          .filter((email): email is string => Boolean(email)),
      ),
    [memberships],
  )
  const activeAccountEmails = useMemo(
    () =>
      new Set(
        memberships
          .filter((membership) => membership.status === "active")
          .map((membership) => membership.email?.trim().toLowerCase())
          .filter((email): email is string => Boolean(email)),
      ),
    [memberships],
  )
  const totalProducts = stores.reduce(
    (sum, store) => sum + Math.max(Number(store.product_count) || 0, 0),
    0,
  )
  const totals = {
    totalStores: isDemo ? 48 : portfolio?.summary.total_stores ?? stores.length,
    activeStores: isDemo ? 36 : portfolio?.summary.active_stores ?? stores.filter((store) => store.status === "active").length,
    accounts: isDemo ? 126 : accountEmails.size,
    activeAccounts: isDemo ? 112 : activeAccountEmails.size,
    memberships: isDemo ? 126 : memberships.length,
    products: isDemo ? 0 : totalProducts,
  }
  const topStores = useMemo<AnalyticsStoreRow[]>(() => {
    if (isDemo) return demoTopStores
    const denominator = Math.max(totalProducts, 1)
    return [...stores]
      .sort((left, right) => (right.product_count ?? 0) - (left.product_count ?? 0))
      .slice(0, 5)
      .map((store) => {
        const products = Math.max(Number(store.product_count) || 0, 0)
        const share = totalProducts ? (products / denominator) * 100 : 0
        return {
          id: store.id,
          name: store.name,
          plan: planLabel(store),
          gmv: "Unavailable",
          growth: "Unavailable",
          share: `${share.toFixed(1)}%`,
          shareValue: share,
          productCount: products,
        }
      })
  }, [isDemo, stores, totalProducts])
  const planSlices = useMemo<PlanSlice[]>(() => {
    if (isDemo) return demoPlans
    return [
      {
        label: "Starter",
        count: stores.filter((store) => store.plan_code === "starter_whatsapp").length,
        color: "#b8bec7",
      },
      {
        label: "Professional",
        count: stores.filter((store) => store.plan_code === "professional_commerce").length,
        color: "#0aa8d3",
      },
    ]
  }, [isDemo, stores])
  const storeGrowth = isDemo ? demoStoreGrowth : null

  const handleExport = () => {
    downloadAnalyticsReport(isDemo, topStores, totals)
    onToast(
      isDemo
        ? "Analytics report exported."
        : "Connected portfolio metrics exported. Revenue and GMV were omitted because they are unavailable.",
    )
  }

  return (
    <section
      className="admin-analytics-page"
      aria-labelledby="admin-analytics-title"
      data-live={isDemo ? "false" : "true"}
    >
      <header className="admin-page-heading admin-analytics__heading">
        <div className="admin-page-heading__copy">
          <h1 id="admin-analytics-title">Analytics</h1>
          <p>Track platform growth, revenue and store performance</p>
        </div>
        <div className="admin-page-actions admin-analytics__actions">
          <label className="admin-analytics__date-control">
            <PiCalendarBlank />
            <select
              aria-label="Analytics date range"
              value={isDemo ? dateRange : "Current portfolio snapshot"}
              onChange={(event) => {
                setDateRange(event.target.value)
                onToast(`Analytics range set to ${event.target.value}.`)
              }}
            >
              {isDemo ? (
                <>
                  <option>1 Feb, 2026 – 31 Jul, 2026</option>
                  <option>1 Jan, 2026 – 30 Jun, 2026</option>
                  <option>1 Jul, 2025 – 31 Jul, 2026</option>
                </>
              ) : (
                <option>Current portfolio snapshot</option>
              )}
            </select>
          </label>
          <button type="button" className="admin-page-button admin-analytics__export" onClick={handleExport}>
            <PiDownloadSimple />
            Export Report
          </button>
        </div>
      </header>

      {error && !isDemo ? (
        <div className="admin-analytics__error" role="alert">
          Live analytics could not be refreshed: {error}
        </div>
      ) : null}

      <div className="admin-page-kpis admin-analytics__kpis" aria-label="Analytics summary">
        <article className="admin-page-card admin-page-kpi admin-analytics__kpi">
          <div className="admin-page-kpi__icon admin-page-kpi__icon--green"><PiCurrencyDollar /></div>
          <div className="admin-page-kpi__body">
            <div className="admin-page-kpi__label">Monthly Revenue</div>
            <div className="admin-analytics__metric-line">
              <strong className={!isDemo ? "is-unavailable" : undefined}>{isDemo ? "$12,480" : "Unavailable"}</strong>
              {isDemo ? <span className="admin-page-percent">+9.8%</span> : null}
            </div>
            <p>{isDemo ? "Recurring SaaS revenue" : `${totals.products} catalog products connected`}</p>
          </div>
        </article>
        <article className="admin-page-card admin-page-kpi admin-analytics__kpi">
          <div className="admin-page-kpi__icon"><PiChartLineUp /></div>
          <div className="admin-page-kpi__body">
            <div className="admin-page-kpi__label">Monthly GMV</div>
            <div className="admin-analytics__metric-line">
              <strong className={!isDemo ? "is-unavailable" : undefined}>{isDemo ? "$184,620" : "Unavailable"}</strong>
              {isDemo ? <span className="admin-analytics__blue-badge">+14.2%</span> : null}
            </div>
            <p>{isDemo ? "Across all stores" : "Commerce totals are not connected"}</p>
          </div>
        </article>
        <article className="admin-page-card admin-page-kpi admin-analytics__kpi">
          <div className="admin-page-kpi__icon admin-page-kpi__icon--blue"><PiStorefront /></div>
          <div className="admin-page-kpi__body">
            <div className="admin-page-kpi__label">Active Stores</div>
            <div className="admin-analytics__metric-line">
              <strong>{loading && !isDemo ? "—" : totals.activeStores}</strong>
              <i className="admin-page-status-dot" />
              {isDemo ? <span className="admin-page-percent">+6</span> : null}
            </div>
            <p>of {loading && !isDemo ? "—" : totals.totalStores} total</p>
          </div>
        </article>
        <article className="admin-page-card admin-page-kpi admin-analytics__kpi">
          <div className="admin-page-kpi__icon admin-page-kpi__icon--blue"><PiUsersThree /></div>
          <div className="admin-page-kpi__body">
            <div className="admin-page-kpi__label">Vendor Accounts</div>
            <div className="admin-analytics__metric-line">
              <strong>{loading && !isDemo ? "—" : totals.accounts}</strong>
              {isDemo ? <span className="admin-analytics__blue-badge">+12.5%</span> : null}
            </div>
            <p>{isDemo ? `${totals.activeAccounts} active` : `${totals.activeAccounts} active · ${totals.memberships} memberships`}</p>
          </div>
        </article>
      </div>

      <div className="admin-analytics__dashboard">
        <div className="admin-analytics__row admin-analytics__row--charts">
          <article className="admin-page-card admin-analytics__revenue-card">
            <div className="admin-analytics__card-heading">
              <div><h2>Revenue Growth</h2><p>Platform GMV across all stores</p></div>
              <div className="admin-analytics__chart-actions">
                <div className="admin-analytics__segment" aria-label="Revenue chart metric">
                  <button type="button" className="is-active">GMV</button>
                  <button type="button" disabled={!isDemo} title={!isDemo ? "MRR time-series is not connected" : undefined} onClick={() => onToast("Demo MRR view selected.")}>MRR</button>
                </div>
                <button type="button" className="admin-analytics__more" aria-label="Revenue chart options" disabled={!isDemo} title={!isDemo ? "Revenue chart options require a connected revenue feed" : undefined} onClick={() => onToast("Demo revenue options opened.")}><PiDotsThree /></button>
              </div>
            </div>
            <div className="admin-analytics__revenue-summary">
              <strong>{isDemo ? "$184,620" : "Unavailable"}</strong>
              {isDemo ? <span className="admin-analytics__blue-badge">+14.2%</span> : null}
              <p>{isDemo ? "vs $161,680 previous month" : "Revenue and GMV source not connected"}</p>
            </div>
            <RevenueGrowthChart points={isDemo ? demoRevenue : null} />
          </article>

          <article className="admin-page-card admin-analytics__growth-card">
            <div className="admin-analytics__card-heading">
              <div><h2>Store Growth</h2><p>Total provisioned stores</p></div>
              <select aria-label="Store growth period" defaultValue="6 Months" disabled={!isDemo} title={!isDemo ? "Historical Store growth is not connected" : undefined} onChange={(event) => onToast(`Store growth period set to ${event.target.value}.`)}>
                <option>6 Months</option><option>12 Months</option>
              </select>
            </div>
            <div className="admin-analytics__growth-summary">
              <strong>{loading && !isDemo ? "—" : totals.totalStores}</strong>
              {isDemo ? <span className="admin-page-percent">+6 stores</span> : null}
            </div>
            {storeGrowth ? (
              <div className="admin-analytics__bar-chart" role="img" aria-label="Store growth from 32 stores in February to 48 stores in July.">
                <div className="admin-analytics__bar-axis" aria-hidden="true"><span>60</span><span>45</span><span>30</span><span>15</span><span>0</span></div>
                <div className="admin-analytics__bars">
                  {storeGrowth.map((point, index) => (
                    <div className="admin-analytics__bar-column" key={point.label}>
                      <strong>{point.value}</strong>
                      <span className={index === storeGrowth.length - 1 ? "is-current" : undefined} style={{ height: `${(point.value / 60) * 100}%` }} />
                      <small>{point.label}</small>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="admin-analytics__unavailable admin-analytics__unavailable--growth" role="status">
                <PiChartLineUp /><strong>Store growth time-series unavailable</strong><span>{totals.totalStores} stores are connected in the current snapshot.</span>
              </div>
            )}
            <div className="admin-analytics__growth-legend">
              <span><i className="admin-page-status-dot" />{loading && !isDemo ? "—" : totals.activeStores} Active</span>
              <span><i className="admin-page-status-dot admin-page-status-dot--blue" />{isDemo ? 8 : "—"} Trial</span>
              <span><i className="admin-page-status-dot admin-page-status-dot--orange" />{isDemo ? 4 : portfolio?.summary.needs_attention ?? 0} Attention</span>
            </div>
          </article>
        </div>

        <div className="admin-analytics__row admin-analytics__row--bottom">
          <article className="admin-page-card admin-analytics__stores-card">
            <div className="admin-analytics__card-heading">
              <div><h2>Top Performing Stores</h2><p>{isDemo ? "Ranked by monthly gross merchandise value" : "Ranked by connected product count · GMV unavailable"}</p></div>
              <div className="admin-analytics__table-actions">
                <select aria-label="Store ranking period" defaultValue="This Month" disabled={!isDemo} title={!isDemo ? "Historical ranking periods are not connected" : undefined} onChange={(event) => onToast(`Store ranking period set to ${event.target.value}.`)}><option>This Month</option><option>Last Month</option></select>
                <button type="button" onClick={() => navigateDashboard("clients")}>View all stores <PiArrowRight /></button>
              </div>
            </div>
            <div className="admin-analytics__store-table" role="table" aria-label="Top performing stores">
              <div className="admin-analytics__store-row admin-analytics__store-row--head" role="row">
                <span>Store</span><span>Plan</span><span>{isDemo ? "GMV" : "Products"}</span><span>{isDemo ? "Growth" : "GMV"}</span><span>{isDemo ? "Share" : "Product Share"}</span>
              </div>
              {topStores.length ? topStores.map((store) => {
                const Icon = store.cart ? PiShoppingCart : PiStorefront
                return (
                  <div className="admin-analytics__store-row" role="row" key={store.id}>
                    <div className="admin-analytics__store-name"><span><Icon /></span><strong title={store.name}>{store.name}</strong></div>
                    <span className={`admin-analytics__plan admin-analytics__plan--${store.plan.toLowerCase()}`}>{store.plan}</span>
                    <strong>{isDemo ? store.gmv : store.productCount}</strong>
                    <span className={store.negative ? "is-negative" : isDemo ? "is-positive" : "is-muted"}>{isDemo ? store.growth : "Unavailable"}</span>
                    <div className="admin-analytics__share"><span>{store.share}</span><i><b style={{ width: `${Math.min(store.shareValue * 3, 100)}%` }} /></i></div>
                  </div>
                )
              }) : <div className="admin-analytics__empty">{loading ? "Loading connected stores…" : "No stores are available yet."}</div>}
            </div>
          </article>

          <article className="admin-page-card admin-analytics__subscription-card">
            <h2>Subscription Health</h2>
            <div className="admin-analytics__subscription-top">
              <div className="admin-analytics__donut" style={donutStyle(planSlices)} role="img" aria-label={`Plan distribution across ${totals.totalStores} stores.`}><div><strong>{loading && !isDemo ? "—" : totals.totalStores}</strong><span>Stores</span></div></div>
              <div className="admin-analytics__plan-legend">
                {planSlices.map((slice) => <div key={slice.label}><i style={{ background: slice.color }} /><span>{slice.label}</span><strong>{loading && !isDemo ? "—" : slice.count}</strong></div>)}
              </div>
            </div>
            <div className="admin-analytics__health-list">
              <div><span>Trial-to-paid conversion</span><strong>{isDemo ? "68.4%" : "Unavailable"}</strong></div>
              <div><span>Store retention</span><strong>{isDemo ? "94.6%" : "Unavailable"}</strong></div>
              <div><span>Monthly churn</span><strong>{isDemo ? "2.1%" : "Unavailable"}</strong></div>
            </div>
            <div className="admin-analytics__health-footer">
              {isDemo ? <><PiCheckCircleFill /><span>Subscriptions trending healthy</span></> : <><PiChartLineUp /><span>Subscription rate metrics unavailable</span></>}
              <button type="button" onClick={() => navigateDashboard("billing")}>{isDemo ? "Open subscription analytics" : "View plan assignments"} <PiArrowRight /></button>
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}
