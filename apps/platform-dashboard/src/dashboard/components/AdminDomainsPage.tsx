import {
  PiBookOpenText,
  PiCaretLeft,
  PiCaretRight,
  PiCopy,
  PiDotsThree,
  PiGlobe,
  PiHourglassMedium,
  PiLink,
  PiLockKey,
  PiMagnifyingGlass,
  PiPlus,
  PiShieldCheck,
  PiSlidersHorizontal,
  PiStorefront,
  PiWarning,
} from "react-icons/pi"
import { useEffect, useMemo, useState, type CSSProperties } from "react"

import type { PlatformPortfolio } from "../types"

import "./admin-platform-operations.css"

type AdminDomainsPageProps = {
  isDemo: boolean
  portfolio: PlatformPortfolio | null
  loading: boolean
  error?: string | null
  onToast: (message: string) => void
}

type DomainHealth = "Connected" | "Pending" | "SSL Issue"
type DomainTab = "Domains" | "DNS Verification" | "SSL Certificates" | "Redirects"

type DomainRow = {
  id: string
  domain: string
  storeId: string
  store: string
  storeTone: "blue" | "cyan" | "orange" | "purple" | "red"
  type: "Custom" | "Subdomain"
  dns: "Connected" | "Pending" | "Failed"
  ssl: "Active" | "Waiting" | "Expiring" | "Issue"
  primary: boolean
  lastChecked: string
  health: DomainHealth
}

const PAGE_SIZE = 5
const domainTones: DomainRow["storeTone"][] = ["blue", "cyan", "orange", "purple", "red"]

const referenceDomains: DomainRow[] = [
  { id: "domain-alsanousi", domain: "alsanousi.ly", storeId: "store-alsanousi", store: "Al–Sanousi & Sons", storeTone: "blue", type: "Custom", dns: "Connected", ssl: "Active", primary: true, lastChecked: "2 min ago", health: "Connected" },
  { id: "domain-homenest", domain: "homenest.ly", storeId: "store-homenest", store: "HomeNest Libya", storeTone: "cyan", type: "Custom", dns: "Connected", ssl: "Active", primary: true, lastChecked: "5 min ago", health: "Connected" },
  { id: "domain-alfikr", domain: "alfikr.store", storeId: "store-alfikr", store: "Al-Fikr Market", storeTone: "orange", type: "Custom", dns: "Pending", ssl: "Waiting", primary: false, lastChecked: "12 min ago", health: "Pending" },
  { id: "domain-noor", domain: "noor.shop", storeId: "store-noor", store: "Noor Boutique", storeTone: "purple", type: "Custom", dns: "Connected", ssl: "Active", primary: true, lastChecked: "18 min ago", health: "Connected" },
  { id: "domain-tripoli", domain: "tripolitech.labibtech.ly", storeId: "store-tripoli", store: "Tripoli Tech", storeTone: "red", type: "Subdomain", dns: "Connected", ssl: "Expiring", primary: true, lastChecked: "24 min ago", health: "SSL Issue" },
]

const demoDomains: DomainRow[] = [
  ...referenceDomains,
  ...Array.from({ length: 49 }, (_, index): DomainRow => {
    const number = index + 6
    const storeNumber = 6 + (index % 43)
    const health: DomainHealth = index < 44 ? "Connected" : index < 48 ? "Pending" : "SSL Issue"
    return {
      id: `domain-demo-${number}`,
      domain: number % 4 === 0 ? `store-${number}.ly` : `store-${number}.labibtech.ly`,
      storeId: `store-demo-${storeNumber}`,
      store: `Demo Store ${storeNumber}`,
      storeTone: domainTones[index % domainTones.length],
      type: number % 4 === 0 ? "Custom" : "Subdomain",
      dns: health === "Pending" ? "Pending" : "Connected",
      ssl: health === "SSL Issue" ? "Issue" : health === "Pending" ? "Waiting" : "Active",
      primary: number % 5 !== 0,
      lastChecked: `${number + 20} min ago`,
      health,
    }
  }),
]

function realDomainRows(portfolio: PlatformPortfolio | null): DomainRow[] {
  if (!portfolio) return []
  return portfolio.clients.flatMap((client) => client.stores.flatMap((store, storeIndex) =>
    store.domains.map((domain): DomainRow => {
      const dns = domain.verification_status === "verified" ? "Connected" : domain.verification_status === "failed" ? "Failed" : "Pending"
      const ssl = domain.ssl_status === "active" ? "Active" : domain.ssl_status === "failed" ? "Issue" : "Waiting"
      const health: DomainHealth = domain.ssl_status === "failed"
        ? "SSL Issue"
        : domain.verification_status !== "verified" || domain.ssl_status !== "active"
          ? "Pending"
          : "Connected"
      return {
        id: domain.id,
        domain: domain.hostname,
        storeId: store.id,
        store: store.name,
        storeTone: domainTones[storeIndex % domainTones.length],
        type: domain.type === "custom" ? "Custom" : "Subdomain",
        dns,
        ssl,
        primary: domain.is_primary,
        lastChecked: "Unavailable",
        health,
      }
    }),
  ))
}

function donutStyle(connected: number, pending: number, issues: number): CSSProperties {
  const total = connected + pending + issues
  if (!total) return { background: "#e5e8ec" }
  const first = (connected / total) * 100
  const second = first + (pending / total) * 100
  return { background: `conic-gradient(#13ac79 0 ${Math.max(first - 0.45, 0)}%, #fff ${Math.max(first - 0.45, 0)}% ${first + 0.45}%, #f4a51c ${first + 0.45}% ${Math.max(second - 0.45, first + 0.45)}%, #fff ${Math.max(second - 0.45, first + 0.45)}% ${second + 0.45}%, #ef373f ${second + 0.45}% 100%)` }
}

function paginationItems(page: number, pages: number): Array<number | "ellipsis"> {
  if (pages <= 4) return Array.from({ length: pages }, (_, index) => index + 1)
  if (page <= 2) return [1, 2, 3, "ellipsis", pages]
  if (page >= pages - 1) return [1, "ellipsis", pages - 2, pages - 1, pages]
  return [1, "ellipsis", page, "ellipsis", pages]
}

export function AdminDomainsPage({ isDemo, portfolio, loading, error = null, onToast }: AdminDomainsPageProps) {
  const [tab, setTab] = useState<DomainTab>("Domains")
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("All Status")
  const [store, setStore] = useState("All Stores")
  const [page, setPage] = useState(1)
  const [openRow, setOpenRow] = useState<string | null>(null)

  const rows = useMemo(() => isDemo ? demoDomains : realDomainRows(portfolio), [isDemo, portfolio])
  const stores = useMemo(() => Array.from(new Set(rows.map((row) => row.store))).sort(), [rows])
  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return rows.filter((row) => {
      const tabMatch = tab === "Domains" || (tab === "DNS Verification" && row.dns !== "Connected") || (tab === "SSL Certificates" && row.ssl !== "Active") || false
      const queryMatch = !normalized || `${row.domain} ${row.store}`.toLowerCase().includes(normalized)
      const statusMatch = status === "All Status" || row.health === status
      const storeMatch = store === "All Stores" || row.store === store
      return tabMatch && queryMatch && statusMatch && storeMatch
    })
  }, [query, rows, status, store, tab])

  useEffect(() => setPage(1), [query, status, store, tab])

  const pages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE))
  const safePage = Math.min(page, pages)
  const pageRows = filteredRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const metrics = {
    total: rows.length,
    stores: isDemo ? 48 : new Set(rows.map((row) => row.storeId)).size,
    connected: rows.filter((row) => row.health === "Connected").length,
    pending: rows.filter((row) => row.dns === "Pending").length,
    issues: rows.filter((row) => row.health === "SSL Issue").length,
  }
  const connectedPercent = metrics.total ? Math.round((metrics.connected / metrics.total) * 100) : 0
  const unavailable = !isDemo && Boolean(error)
  const summaryUnavailable = !isDemo && (loading || unavailable)

  const copyText = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value)
      onToast(`${label} copied to the clipboard.`)
    } catch {
      onToast(`${label}: ${value}`)
    }
  }

  const operationalNotice = (demoMessage: string) => onToast(isDemo ? `Demo session only: ${demoMessage}` : "This operational action is not connected yet.")

  return (
    <section className="admin-platform-ops admin-domains-page" aria-labelledby="admin-domains-title">
      <header className="admin-page-heading">
        <div className="admin-page-heading__copy"><h1 id="admin-domains-title">Domains</h1><p>Manage custom domains, DNS and SSL across all stores</p></div>
        <div className="admin-page-actions">
          <button type="button" className="admin-page-button" disabled={!isDemo} title={!isDemo ? "DNS guidance is not connected yet" : undefined} onClick={() => operationalNotice("DNS guide opened.")}><PiBookOpenText />DNS Guide</button>
          <button type="button" className="admin-page-button admin-page-button--primary" disabled={!isDemo} title={!isDemo ? "Domain creation is not connected yet" : undefined} onClick={() => operationalNotice("new domain setup opened.")}><PiPlus />Add Domain</button>
        </div>
      </header>

      <div className="admin-page-kpis" aria-label="Domain summary">
        <article className="admin-page-card admin-page-kpi"><div className="admin-page-kpi__icon"><PiGlobe /></div><div className="admin-page-kpi__body"><div className="admin-page-kpi__label">Total Domains</div><strong>{(loading && !isDemo) || unavailable ? "—" : metrics.total}</strong><p>Across {(loading && !isDemo) || unavailable ? "—" : metrics.stores} stores</p></div></article>
        <article className="admin-page-card admin-page-kpi"><div className="admin-page-kpi__icon admin-page-kpi__icon--green"><PiLink /></div><div className="admin-page-kpi__body"><div className="admin-page-kpi__label">Connected</div><strong>{(loading && !isDemo) || unavailable ? "—" : metrics.connected} {!unavailable ? <i className="admin-page-status-dot" /> : null}</strong><p>{unavailable ? "Metric unavailable" : <span className="admin-page-percent">{connectedPercent}%</span>}</p></div></article>
        <article className="admin-page-card admin-page-kpi"><div className="admin-page-kpi__icon admin-page-kpi__icon--orange"><PiHourglassMedium /></div><div className="admin-page-kpi__body"><div className="admin-page-kpi__label">Pending DNS</div><strong>{(loading && !isDemo) || unavailable ? "—" : metrics.pending} {!unavailable ? <i className="admin-page-status-dot admin-page-status-dot--orange" /> : null}</strong><p>{unavailable ? "Metric unavailable" : "Awaiting verification"}</p></div></article>
        <article className="admin-page-card admin-page-kpi"><div className="admin-page-kpi__icon admin-page-kpi__icon--red"><PiWarning /></div><div className="admin-page-kpi__body"><div className="admin-page-kpi__label">SSL Issues</div><strong>{(loading && !isDemo) || unavailable ? "—" : metrics.issues} {!unavailable ? <i className="admin-page-status-dot admin-page-status-dot--red" /> : null}</strong><p>{unavailable ? "Metric unavailable" : "Requires attention"}</p></div></article>
      </div>

      <div className="admin-ops-tabs admin-domain-tabs" role="tablist" aria-label="Domain views">
        {(["Domains", "DNS Verification", "SSL Certificates", "Redirects"] as DomainTab[]).map((item) => <button key={item} type="button" role="tab" aria-selected={tab === item} className={tab === item ? "is-active" : undefined} disabled={!isDemo && item === "Redirects"} title={!isDemo && item === "Redirects" ? "Redirect persistence is not connected yet" : undefined} onClick={() => setTab(item)}>{item}</button>)}
      </div>

      <div className="admin-ops-workspace admin-domains-workspace">
        <article className="admin-page-card admin-ops-table-card">
          <div className="admin-directory-toolbar">
            <div><h2>{tab === "Domains" ? "All Domains" : tab}</h2><p>{error && !isDemo ? error : loading && !isDemo ? "Loading domains…" : `${filteredRows.length} ${filteredRows.length === 1 ? "domain" : "domains"} connected to the platform`}</p></div>
            <div className="admin-directory-filters">
              <label className="admin-page-search"><PiMagnifyingGlass /><input maxLength={120} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search domains…" aria-label="Search domains" /></label>
              <select className="admin-page-select" value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter domains by status"><option>All Status</option><option>Connected</option><option>Pending</option><option>SSL Issue</option></select>
              <select className="admin-page-select" value={store} onChange={(event) => setStore(event.target.value)} aria-label="Filter domains by store"><option>All Stores</option>{stores.map((name) => <option key={name}>{name}</option>)}</select>
              <button type="button" className="admin-page-filter-button" aria-label="Clear domain filters" onClick={() => { setQuery(""); setStatus("All Status"); setStore("All Stores"); onToast("Domain filters cleared.") }}><PiSlidersHorizontal /></button>
            </div>
          </div>

          <div className="admin-ops-scroll" role="region" aria-label="Scrollable domain directory" tabIndex={0}>
            <div className="admin-ops-table admin-domain-table" role="table" aria-label="Domains">
              <div className="admin-ops-row admin-ops-row--head admin-domain-row" role="row"><span>Domain</span><span>Store</span><span>Type</span><span>DNS</span><span>SSL</span><span>Primary</span><span>Last Checked</span><span /></div>
              {pageRows.length ? pageRows.map((row) => (
                <div className="admin-ops-row admin-domain-row" role="row" key={row.id}>
                  <div className="admin-ops-primary"><span className="admin-ops-icon"><PiGlobe /></span><strong>{row.domain}</strong></div>
                  <div className="admin-ops-store"><span className={`admin-directory-icon admin-directory-icon--${row.storeTone}`}><PiStorefront /></span><span title={row.store}>{row.store}</span></div>
                  <span className="admin-page-pill">{row.type}</span>
                  <span className="admin-directory-status"><i className={`admin-page-status-dot admin-page-status-dot--${row.dns === "Connected" ? "green" : row.dns === "Pending" ? "orange" : "red"}`} />{row.dns}</span>
                  <span className={`admin-ops-ssl admin-ops-ssl--${row.ssl.toLowerCase()}`}><PiLockKey />{row.ssl}</span>
                  <span className={`admin-page-pill${row.primary ? " admin-page-pill--green" : ""}`}>{row.primary ? "Yes" : "No"}</span>
                  <span>{row.lastChecked}</span>
                  <div className="admin-directory-more-wrap"><button type="button" className="admin-directory-more" aria-label={`Actions for ${row.domain}`} aria-expanded={openRow === row.id} onClick={() => setOpenRow((current) => current === row.id ? null : row.id)}><PiDotsThree /></button>{openRow === row.id ? <div className="admin-directory-row-menu"><button type="button" onClick={() => { void copyText(row.domain, "Domain"); setOpenRow(null) }}><PiCopy />Copy domain</button><button type="button" disabled={!isDemo} title={!isDemo ? "Domain details management is not connected" : undefined} onClick={() => { operationalNotice(`details opened for ${row.domain}.`); setOpenRow(null) }}><PiShieldCheck />Domain details</button></div> : null}</div>
                </div>
              )) : <div className="admin-ops-empty">{tab === "Redirects" ? "Redirect data is not available in this view." : loading && !isDemo ? "Loading domains…" : "No domains match these filters."}</div>}
            </div>
            <footer className="admin-directory-footer"><span>{filteredRows.length ? `Showing ${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, filteredRows.length)} of ${filteredRows.length} domains` : "Showing 0 domains"}</span><div className="admin-pagination" aria-label="Domain pages"><button type="button" aria-label="Previous page" disabled={safePage <= 1} onClick={() => setPage(Math.max(1, safePage - 1))}><PiCaretLeft /></button>{paginationItems(safePage, pages).map((item, index) => item === "ellipsis" ? <span key={`ellipsis-${index}`}>…</span> : <button type="button" key={item} className={safePage === item ? "is-active" : undefined} aria-current={safePage === item ? "page" : undefined} onClick={() => setPage(item)}>{item}</button>)}<button type="button" aria-label="Next page" disabled={safePage >= pages} onClick={() => setPage(Math.min(pages, safePage + 1))}><PiCaretRight /></button></div></footer>
          </div>
        </article>

        <aside className="admin-ops-side admin-domains-side">
          <article className="admin-page-card admin-ops-side-card"><h2>Domain Health</h2><div className="admin-donut-layout"><div className="admin-donut admin-domain-donut" style={donutStyle(summaryUnavailable ? 0 : metrics.connected, summaryUnavailable ? 0 : metrics.pending, summaryUnavailable ? 0 : metrics.issues)}><div className="admin-donut__label"><strong>{summaryUnavailable ? "—" : metrics.total}</strong><span>Domains</span></div></div><div className="admin-donut-legend"><div><i className="admin-page-status-dot" /><span><strong>{summaryUnavailable ? "—" : metrics.connected}</strong>Connected</span></div><div><i className="admin-page-status-dot admin-page-status-dot--orange" /><span><strong>{summaryUnavailable ? "—" : metrics.pending}</strong>Pending</span></div><div><i className="admin-page-status-dot admin-page-status-dot--red" /><span><strong>{summaryUnavailable ? "—" : metrics.issues}</strong>SSL Issues</span></div></div></div><div className="admin-ops-health-line"><i className={`admin-page-status-dot${isDemo ? "" : " admin-page-status-dot--muted"}`} />DNS monitoring {isDemo ? "active" : "unavailable"}</div><button type="button" className="admin-side-link" disabled={!isDemo} title={!isDemo ? "Automated DNS health checks are not connected" : undefined} onClick={() => operationalNotice("domain health check completed.")}>Run health check <PiCaretRight /></button></article>
          <article className="admin-page-card admin-ops-side-card admin-platform-dns"><h2>Platform DNS</h2><p>Point custom domains to these values</p><div className="admin-dns-value"><span><small>CNAME</small><strong>www</strong></span><b>{isDemo ? "edge.labibtech.ly" : "Unavailable"}</b><button type="button" disabled={!isDemo} aria-label="Copy CNAME value" onClick={() => void copyText("edge.labibtech.ly", "CNAME value")}><PiCopy /></button></div><div className="admin-dns-value"><span><small>A RECORD</small><strong>@</strong></span><b>{isDemo ? "185.204.12.18" : "Unavailable"}</b><button type="button" disabled={!isDemo} aria-label="Copy A record value" onClick={() => void copyText("185.204.12.18", "A record value")}><PiCopy /></button></div><div className="admin-dns-automatic"><PiShieldCheck /><span><strong>Automatic SSL</strong><small>Certificates are issued after DNS verification</small></span></div><button type="button" className="admin-ops-outline-button" disabled={!isDemo} onClick={() => void copyText("CNAME www edge.labibtech.ly\nA @ 185.204.12.18", "DNS values")}><PiCopy />{isDemo ? "Copy DNS values" : "DNS values unavailable"}</button></article>
        </aside>
      </div>
    </section>
  )
}
