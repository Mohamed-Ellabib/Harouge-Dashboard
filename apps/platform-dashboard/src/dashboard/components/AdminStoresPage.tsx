import {
  PiArrowRight,
  PiCaretLeft,
  PiCaretRight,
  PiCopy,
  PiDotsThree,
  PiEye,
  PiHourglassMedium,
  PiMagnifyingGlass,
  PiPlus,
  PiPencilSimple,
  PiShieldCheck,
  PiSlidersHorizontal,
  PiStorefront,
  PiUploadSimple,
  PiUsersThree,
  PiWarning,
} from "react-icons/pi"
import { useEffect, useMemo, useState, type CSSProperties } from "react"

import { adminDemoStores, type AdminDemoStore } from "../admin-control-plane-demo"
import { getPlatformStorefront } from "../api"
import { templateDefinitions, templatesStudioVisibleKeys } from "../store-template-catalog"
import { navigateDashboard, navigateDashboardDetail } from "../routing"
import type { PlatformPortfolio, PlatformStore } from "../types"

import "./admin-stores-vendors.css"

type AdminStoresPageProps = {
  isDemo: boolean
  portfolio: PlatformPortfolio | null
  loading: boolean
  onAdd: () => void
  onToast: (message: string) => void
}

type StoreRow = {
  id: string
  name: string
  owner: string
  domain: string
  plan: "Starter" | "Growth" | "Pro"
  status: string
  gmv: string
  tone: AdminDemoStore["tone"]
}

const storeTones: AdminDemoStore["tone"][] = ["blue", "cyan", "orange", "purple", "red"]

function cleanReferenceText(value: string): string {
  return value.replace(/â€“/g, "–").replace(/Â·/g, "·")
}

function planLabel(store: PlatformStore): StoreRow["plan"] {
  return store.plan_code === "professional_commerce" ? "Pro" : "Starter"
}

function storeStatusLabel(status: PlatformStore["status"]): string {
  if (status === "active") return "Active"
  if (status === "suspended") return "Suspended"
  if (status === "archived") return "Archived"
  return "Draft"
}

function realStoreRows(portfolio: PlatformPortfolio | null): StoreRow[] {
  if (!portfolio) return []

  return portfolio.clients.flatMap((client) =>
    client.stores.map((store, index) => {
      const owner = store.memberships.find((member) => member.role === "owner")
      const primaryDomain =
        store.domains.find((domain) => domain.is_primary)?.hostname ??
        store.domains[0]?.hostname ??
        "—"

      return {
        id: store.id,
        name: store.name,
        owner: owner?.display_name?.trim() || owner?.email || "Unassigned",
        domain: primaryDomain,
        plan: planLabel(store),
        status: storeStatusLabel(store.status),
        gmv: "—",
        tone: storeTones[index % storeTones.length],
      }
    }),
  )
}

function statusTone(status: string): "green" | "blue" | "red" | "orange" {
  if (status === "Active") return "green"
  if (status === "Trial" || status === "Draft" || status === "Pending") return "blue"
  if (status === "Past Due") return "red"
  if (status === "Suspended" || status === "Archived") return "red"
  return "orange"
}

function csvCell(value: string): string {
  const safe = /^[=+@-]/.test(value) ? `'${value}` : value
  return `"${safe.replace(/"/g, '""')}"`
}

function downloadStoreCsv(rows: StoreRow[]): void {
  const header = ["Store", "Owner", "Domain", "Plan", "Status", "GMV"]
  const content = [
    header.map(csvCell).join(","),
    ...rows.map((row) =>
      [row.name, row.owner, row.domain, row.plan, row.status, row.gmv]
        .map(csvCell)
        .join(","),
    ),
  ].join("\r\n")
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }))
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = "labibtech-stores.csv"
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

function donutStyle(first: number, second: number, third: number): CSSProperties {
  const total = Math.max(first + second + third, 1)
  const a = (first / total) * 100
  const b = a + (second / total) * 100
  return {
    background: `conic-gradient(#13ac79 0 ${Math.max(a - 0.45, 0)}%, #fff ${Math.max(a - 0.45, 0)}% ${a + 0.45}%, #168fe4 ${a + 0.45}% ${Math.max(b - 0.45, a + 0.45)}%, #fff ${Math.max(b - 0.45, a + 0.45)}% ${b + 0.45}%, #f4a51c ${b + 0.45}% 100%)`,
  }
}

export function AdminStoresPage({
  isDemo,
  portfolio,
  loading,
  onAdd,
  onToast,
}: AdminStoresPageProps) {
  const [query, setQuery] = useState("")
  const [plan, setPlan] = useState("All Plans")
  const [status, setStatus] = useState("All Status")
  const [page, setPage] = useState(1)
  const [openRow, setOpenRow] = useState<string | null>(null)
  const [storeTemplates, setStoreTemplates] = useState<Record<string, string>>({})

  const rows = useMemo<StoreRow[]>(
    () =>
      isDemo
        ? adminDemoStores.map((store) => ({
            ...store,
            name: cleanReferenceText(store.name),
          }))
        : realStoreRows(portfolio),
    [isDemo, portfolio],
  )

  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return rows.filter((row) => {
      const matchesQuery =
        !normalized ||
        [row.name, row.owner, row.domain].some((value) =>
          value.toLowerCase().includes(normalized),
        )
      const matchesPlan = plan === "All Plans" || row.plan === plan
      const matchesStatus = status === "All Status" || row.status === status
      return matchesQuery && matchesPlan && matchesStatus
    })
  }, [plan, query, rows, status])

  useEffect(() => {
    setPage(1)
  }, [query, plan, status])

  useEffect(() => {
    const closeMenu = () => setOpenRow(null)
    window.addEventListener("resize", closeMenu)
    return () => window.removeEventListener("resize", closeMenu)
  }, [])

  const totals = isDemo
    ? { total: 48, active: 36, trial: 8, attention: 4 }
    : {
        total: portfolio?.summary.total_stores ?? 0,
        active: portfolio?.summary.active_stores ?? 0,
        trial: null,
        attention: portfolio?.summary.needs_attention ?? 0,
      }
  const totalForPages =
    query || plan !== "All Plans" || status !== "All Status"
      ? filteredRows.length
      : isDemo
        ? totals.total
        : filteredRows.length
  const totalPages = Math.max(1, Math.ceil(totalForPages / 5))
  const safePage = Math.min(page, totalPages)
  const pageRows = isDemo ? filteredRows : filteredRows.slice((safePage - 1) * 5, safePage * 5)
  const pageStoreIds = JSON.stringify(pageRows.map((row) => row.id))

  useEffect(() => {
    if (isDemo) return
    const controller = new AbortController()
    const ids = JSON.parse(pageStoreIds) as string[]
    setStoreTemplates({})
    // Fetch only the visible page; failed reads must not imply a template assignment.
    void Promise.all(ids.map(async (id) => {
      try {
        const record = await getPlatformStorefront(id, controller.signal)
        const key = record.storefront.document.template_key
        const index = templatesStudioVisibleKeys.findIndex((candidate) => candidate === key)
        return [id, index >= 0 ? `Template ${index + 1}` : templateDefinitions[key]?.label ?? "Unknown template"] as const
      } catch {
        return [id, "Unavailable"] as const
      }
    })).then((entries) => {
      if (!controller.signal.aborted) setStoreTemplates(Object.fromEntries(entries))
    })
    return () => controller.abort()
  }, [isDemo, pageStoreIds, portfolio])
  const activePercent = totals.total ? Math.round((totals.active / totals.total) * 100) : 0
  const plans = isDemo
    ? [
        { label: "Starter", count: 14, width: 48 },
        { label: "Growth", count: 21, width: 70 },
        { label: "Pro", count: 13, width: 48 },
      ]
    : (["Starter", "Growth", "Pro"] as const).map((label) => {
        const count = rows.filter((row) => row.plan === label).length
        return {
          label,
          count,
          width: totals.total ? Math.max((count / totals.total) * 100, count ? 8 : 0) : 0,
        }
      })

  const resetFilters = () => {
    setQuery("")
    setPlan("All Plans")
    setStatus("All Status")
    onToast("Store filters cleared.")
  }

  const copyDomain = async (row: StoreRow) => {
    if (row.domain === "—") {
      onToast("This store does not have a connected domain yet.")
      return
    }
    try {
      await navigator.clipboard.writeText(row.domain)
      onToast(`${row.domain} copied to the clipboard.`)
    } catch {
      onToast(`Domain: ${row.domain}`)
    }
    setOpenRow(null)
  }

  return (
    <section className="admin-store-vendor-page admin-store-page" aria-labelledby="admin-stores-title">
      <header className="admin-page-heading">
        <div className="admin-page-heading__copy">
          <h1 id="admin-stores-title">Stores</h1>
          <p>Manage storefronts, owners, plans and domains</p>
        </div>
        <div className="admin-page-actions">
          <button
            type="button"
            className="admin-page-button"
            onClick={() => {
              downloadStoreCsv(filteredRows)
              onToast(`${filteredRows.length} store${filteredRows.length === 1 ? "" : "s"} exported.`)
            }}
          >
            <PiUploadSimple />
            Export
          </button>
          <button type="button" className="admin-page-button admin-page-button--primary" onClick={onAdd}>
            <PiPlus />
            Add New Store
          </button>
        </div>
      </header>

      <div className="admin-page-kpis" aria-label="Store summary">
        <article className="admin-page-card admin-page-kpi">
          <div className="admin-page-kpi__icon"><PiStorefront /></div>
          <div className="admin-page-kpi__body">
            <div className="admin-page-kpi__label">Total Stores</div>
            <strong>{loading && !isDemo ? "—" : totals.total}</strong>
            <p>All storefronts</p>
          </div>
        </article>
        <article className="admin-page-card admin-page-kpi">
          <div className="admin-page-kpi__icon admin-page-kpi__icon--green"><PiUsersThree /></div>
          <div className="admin-page-kpi__body">
            <div className="admin-page-kpi__label">Active</div>
            <strong>{loading && !isDemo ? "—" : totals.active}</strong>
            <p><span className="admin-page-status-dot" /><span className="admin-page-percent">{activePercent}%</span></p>
          </div>
        </article>
        <article className="admin-page-card admin-page-kpi">
          <div className="admin-page-kpi__icon admin-page-kpi__icon--blue"><PiHourglassMedium /></div>
          <div className="admin-page-kpi__body">
            <div className="admin-page-kpi__label">On Trial</div>
            <strong>{totals.trial ?? "—"}</strong>
            <p>{isDemo ? "Ending this month: 3" : "Metric not connected"}</p>
          </div>
        </article>
        <article className="admin-page-card admin-page-kpi">
          <div className="admin-page-kpi__icon admin-page-kpi__icon--orange"><PiWarning /></div>
          <div className="admin-page-kpi__body">
            <div className="admin-page-kpi__label">Needs Attention <span className="admin-page-status-dot admin-page-status-dot--orange" /></div>
            <strong>{loading && !isDemo ? "—" : totals.attention}</strong>
            <p>Payment or setup</p>
          </div>
        </article>
      </div>

      <div className="admin-directory-layout">
        <article className="admin-page-card admin-directory-table-card">
          <div className="admin-directory-toolbar">
            <div>
              <h2>All Stores</h2>
              <p>{loading && !isDemo ? "Loading stores…" : `${totals.total} stores across the platform`}</p>
            </div>
            <div className="admin-directory-filters">
              <label className="admin-page-search">
                <PiMagnifyingGlass />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search stores…" aria-label="Search stores" />
              </label>
              <select className="admin-page-select" value={plan} onChange={(event) => setPlan(event.target.value)} aria-label="Filter stores by plan">
                <option>All Plans</option><option>Starter</option><option>Growth</option><option>Pro</option>
              </select>
              <select className="admin-page-select" value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter stores by status">
                <option>All Status</option><option>Active</option>{isDemo ? <option>Trial</option> : <option>Draft</option>}<option>Past Due</option><option>Suspended</option><option>Archived</option>
              </select>
              <button type="button" className="admin-page-filter-button" aria-label="Clear store filters" onClick={resetFilters}><PiSlidersHorizontal /></button>
            </div>
          </div>

          <div className={`admin-directory-table${openRow ? " has-open-menu" : ""}`} role="table" aria-label="Stores" tabIndex={0}>
            <div className="admin-directory-row admin-directory-row--head admin-store-row" role="row">
              <span>Store</span><span>Owner</span><span>Domain</span><span>Template</span><span>Plan</span><span>Status</span><span>GMV</span><span />
            </div>
            {pageRows.length ? pageRows.map((row) => {
              const tone = statusTone(row.status)
              return (
                <div className="admin-directory-row admin-store-row" role="row" key={row.id}>
                  <div className="admin-directory-primary">
                    <span className={`admin-directory-icon admin-directory-icon--${row.tone}`}><PiStorefront /></span>
                    <div><button className="admin-store-edit-link" type="button" onClick={() => navigateDashboardDetail("clients", row.id)} aria-label={`Open ${row.name} settings`}><strong>{row.name}</strong></button></div>
                  </div>
                  <span className="admin-directory-cell">{row.owner}</span>
                  <span className="admin-directory-cell">{row.domain}</span>
                  <button className="admin-directory-cell admin-store-template admin-store-edit-link" type="button" onClick={() => navigateDashboardDetail("storefronts", row.id)} aria-label={`Edit ${row.name} storefront`} title={`Edit the saved design for ${row.name}`}>
                    {isDemo ? `Template ${adminDemoStores.findIndex((store) => store.id === row.id) % templatesStudioVisibleKeys.length + 1}` : storeTemplates[row.id] ?? "Loading…"}
                    <PiPencilSimple aria-hidden="true" />
                  </button>
                  <span className={`admin-page-pill${row.plan === "Pro" ? " admin-page-pill--blue" : ""}`}>{row.plan}</span>
                  <span className="admin-directory-status"><i className={`admin-page-status-dot admin-page-status-dot--${tone}`} />{row.status}</span>
                  <span>{row.gmv}</span>
                  <div className="admin-directory-more-wrap">
                    <button type="button" className="admin-directory-more" aria-label={`Actions for ${row.name}`} aria-expanded={openRow === row.id} onClick={(event) => { event.stopPropagation(); setOpenRow((current) => current === row.id ? null : row.id) }}><PiDotsThree /></button>
                    {openRow === row.id ? (
                      <div className="admin-directory-row-menu">
                        <button type="button" onClick={() => { navigateDashboardDetail("storefronts", row.id); setOpenRow(null) }}><PiPencilSimple />Edit storefront</button>
                        <button type="button" onClick={() => { navigateDashboardDetail("clients", row.id); setOpenRow(null) }}><PiEye />View details</button>
                        <button type="button" onClick={() => void copyDomain(row)}><PiCopy />Copy domain</button>
                        <button type="button" onClick={() => navigateDashboard("billing")}><PiShieldCheck />Manage plan</button>
                      </div>
                    ) : null}
                  </div>
                </div>
              )
            }) : (
              <div className="admin-directory-empty">{loading && !isDemo ? "Loading store portfolio…" : "No stores match these filters."}</div>
            )}
          </div>

          <footer className="admin-directory-footer">
            <span>{totalForPages ? `Showing ${(safePage - 1) * 5 + 1}–${Math.min(safePage * 5, totalForPages)} of ${totalForPages} stores` : "Showing 0 stores"}</span>
            <div className="admin-pagination" aria-label="Store pages">
              <button type="button" aria-label="Previous page" disabled={safePage <= 1} onClick={() => setPage(Math.max(1, safePage - 1))}><PiCaretLeft /></button>
              {[1, 2, 3].filter((value) => value <= totalPages).map((value) => <button type="button" key={value} className={safePage === value ? "is-active" : undefined} aria-current={safePage === value ? "page" : undefined} onClick={() => setPage(value)}>{value}</button>)}
              {totalPages > 4 ? <span>…</span> : null}
              {totalPages > 3 ? <button type="button" className={safePage === totalPages ? "is-active" : undefined} onClick={() => setPage(totalPages)}>{totalPages}</button> : null}
              <button type="button" aria-label="Next page" disabled={safePage >= totalPages} onClick={() => setPage(Math.min(totalPages, safePage + 1))}><PiCaretRight /></button>
            </div>
          </footer>
        </article>

        <aside className="admin-directory-side">
          <article className="admin-page-card admin-side-card">
            <h2>Store Status</h2>
            <div className="admin-donut-layout">
              <div className="admin-donut" style={donutStyle(totals.active, totals.trial ?? 0, totals.attention)}>
                <div className="admin-donut__label"><strong>{totals.total}</strong><span>Total</span></div>
              </div>
              <div className="admin-donut-legend">
                <div><i className="admin-page-status-dot" /><span><strong>{totals.active}</strong>Active</span></div>
                <div><i className="admin-page-status-dot admin-page-status-dot--blue" /><span><strong>{totals.trial ?? "—"}</strong>Trial</span></div>
                <div><i className="admin-page-status-dot admin-page-status-dot--orange" /><span><strong>{totals.attention}</strong>Attention</span></div>
              </div>
            </div>
          </article>
          <article className="admin-page-card admin-side-card">
            <h2>Plan Distribution</h2>
            <div className="admin-progress-list">
              {plans.map((item) => <div className="admin-progress-item" key={item.label}><div className="admin-progress-item__label"><span>{item.label}</span><strong>{item.count}</strong></div><div className="admin-progress-track"><span style={{ width: `${item.width}%` }} /></div></div>)}
              <button type="button" className="admin-side-link" onClick={() => navigateDashboard("billing")}>Manage plans <PiArrowRight /></button>
            </div>
          </article>
        </aside>
      </div>
    </section>
  )
}
