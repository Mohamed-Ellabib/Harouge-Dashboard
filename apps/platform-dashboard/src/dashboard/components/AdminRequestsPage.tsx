import {
  PiArrowRight,
  PiCaretLeft,
  PiCaretRight,
  PiCircleNotch,
  PiClock,
  PiDotsThree,
  PiFileMagnifyingGlass,
  PiGlobe,
  PiMagnifyingGlass,
  PiPaperclip,
  PiPlus,
  PiSlidersHorizontal,
  PiSquaresFour,
  PiStorefront,
  PiTrendUp,
  PiTray,
  PiUploadSimple,
  PiUserCircle,
  PiWarning,
} from "react-icons/pi"
import { useEffect, useMemo, useState, type ComponentType } from "react"

import { adminDemoVendors } from "../admin-control-plane-demo"

import "./admin-platform-operations.css"

type AdminRequestsPageProps = {
  isDemo: boolean
  loading?: boolean
  error?: string | null
  onToast: (message: string) => void
}

type RequestTab = "All Requests" | "Pending" | "In Progress" | "Resolved"
type RequestType = "Domain" | "Plan" | "Template" | "Store Setup" | "Access"
type RequestPriority = "Normal" | "High" | "Urgent"
type RequestStatus = "Pending Review" | "Pending" | "In Progress" | "Waiting" | "Resolved"
type RequestOutcome = "Approved" | "Rejected"

type RequestRow = {
  id: string
  title: string
  store: string
  owner: string
  email: string
  type: RequestType
  priority: RequestPriority
  status: RequestStatus
  submitted: string
  description: string
  domain?: string
  currentPlan?: string
  dnsStatus?: string
  attachment?: string
}

const PAGE_SIZE = 5

const referenceRequests: RequestRow[] = [
  { id: "REQ-1048", title: "Custom domain connection", store: "Al-Fikr Market", owner: "Khaled Ali", email: "khaled@alfikr.store", type: "Domain", priority: "High", status: "Pending Review", submitted: "12 min ago", description: "Please connect alfikr.store and make it the primary domain for our storefront.", domain: "alfikr.store", currentPlan: "Starter", dnsStatus: "Pending", attachment: "DNS-records.png" },
  { id: "REQ-1047", title: "Upgrade to Pro plan", store: "HomeNest Libya", owner: "Sara Omar", email: "sara@homenest.ly", type: "Plan", priority: "Normal", status: "Pending", submitted: "38 min ago", description: "Please upgrade our Store to the Pro plan for the next billing cycle.", currentPlan: "Growth" },
  { id: "REQ-1046", title: "Publish Luxe Commerce", store: "Noor Boutique", owner: "Mariam Salem", email: "mariam@noor.shop", type: "Template", priority: "Normal", status: "In Progress", submitted: "1 hour ago", description: "Please review and publish the Luxe Commerce storefront template." },
  { id: "REQ-1045", title: "Create additional store", store: "Tripoli Tech", owner: "Omar Faraj", email: "omar@tripolitech.ly", type: "Store Setup", priority: "High", status: "In Progress", submitted: "2 hours ago", description: "We need an additional Store workspace for our business division." },
  { id: "REQ-1044", title: "Vendor access recovery", store: "Al–Sanousi & Sons", owner: "Ahmed Sanousi", email: "ahmed@alsanousi.ly", type: "Access", priority: "Urgent", status: "Waiting", submitted: "3 hours ago", description: "Please help recover access to the vendor dashboard." },
]

function makeDemoRequest(index: number, status: RequestStatus, priority: RequestPriority = "Normal"): RequestRow {
  const number = 1043 - index
  const types: RequestType[] = ["Domain", "Plan", "Template", "Store Setup", "Access"]
  const owners = adminDemoVendors[index % adminDemoVendors.length]
  const type = types[index % types.length]
  return {
    id: `REQ-${number}`,
    title: status === "Resolved" ? `${type} request completed` : `${type} service request`,
    store: owners.store,
    owner: owners.name,
    email: owners.email,
    type,
    priority,
    status,
    submitted: status === "Resolved" ? `${index + 1} days ago` : `${index + 4} hours ago`,
    description: `Platform ${type.toLowerCase()} assistance requested for ${owners.store}.`,
  }
}

const demoRequests: RequestRow[] = [
  ...referenceRequests,
  ...Array.from({ length: 9 }, (_, index) => makeDemoRequest(index, index % 2 ? "Pending" : "Pending Review", index === 0 ? "Urgent" : index % 3 === 0 ? "High" : "Normal")),
  ...Array.from({ length: 6 }, (_, index) => makeDemoRequest(index + 9, "In Progress", index % 3 === 0 ? "High" : "Normal")),
  ...Array.from({ length: 86 }, (_, index) => makeDemoRequest(index + 15, "Resolved")),
  ...Array.from({ length: 4 }, (_, index) => makeDemoRequest(index + 101, "Waiting", index === 0 ? "Urgent" : "Normal")),
]

const requestTypeIcons: Record<RequestType, ComponentType> = {
  Domain: PiGlobe,
  Plan: PiTrendUp,
  Template: PiSquaresFour,
  "Store Setup": PiStorefront,
  Access: PiUserCircle,
}

function csvCell(value: string): string {
  const safe = /^[=+@-]/.test(value) ? `'${value}` : value
  return `"${safe.replace(/"/g, '""')}"`
}

function downloadRequests(rows: RequestRow[]): void {
  const header = ["Request", "Title", "Store", "Owner", "Type", "Priority", "Status", "Submitted"]
  const content = [header, ...rows.map((row) => [row.id, row.title, row.store, row.owner, row.type, row.priority, row.status, row.submitted])]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n")
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }))
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = "labibtech-requests.csv"
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

function avatarFor(owner: string): string | null {
  return adminDemoVendors.find((vendor) => vendor.name === owner)?.avatar ?? null
}

function paginationItems(page: number, pages: number): Array<number | "ellipsis"> {
  if (pages <= 4) return Array.from({ length: pages }, (_, index) => index + 1)
  if (page <= 2) return [1, 2, 3, "ellipsis", pages]
  if (page >= pages - 1) return [1, "ellipsis", pages - 2, pages - 1, pages]
  return [1, "ellipsis", page, "ellipsis", pages]
}

export function AdminRequestsPage({ isDemo, loading = false, error = null, onToast }: AdminRequestsPageProps) {
  const [tab, setTab] = useState<RequestTab>("All Requests")
  const [query, setQuery] = useState("")
  const [type, setType] = useState("All Types")
  const [priority, setPriority] = useState("All Priority")
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState("REQ-1048")
  const [assigneeOverrides, setAssigneeOverrides] = useState<Record<string, string>>({})
  const [statusOverrides, setStatusOverrides] = useState<Record<string, RequestStatus>>({})
  const [resolutionOutcomes, setResolutionOutcomes] = useState<Record<string, RequestOutcome>>({})

  const rows = useMemo(() => isDemo ? demoRequests.map((row) => ({ ...row, status: statusOverrides[row.id] ?? row.status })) : [], [isDemo, statusOverrides])
  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return rows.filter((row) => {
      const tabMatch = tab === "All Requests" || (tab === "Pending" && (row.status === "Pending" || row.status === "Pending Review")) || row.status === tab
      const queryMatch = !normalized || `${row.id} ${row.title} ${row.store} ${row.owner}`.toLowerCase().includes(normalized)
      return tabMatch && queryMatch && (type === "All Types" || row.type === type) && (priority === "All Priority" || row.priority === priority)
    })
  }, [priority, query, rows, tab, type])

  useEffect(() => setPage(1), [priority, query, tab, type])

  const pages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE))
  const safePage = Math.min(page, pages)
  const pageRows = filteredRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const selected = filteredRows.find((row) => row.id === selectedId) ?? pageRows[0] ?? null
  const openCount = rows.filter((row) => row.status !== "Resolved").length
  const pendingCount = rows.filter((row) => row.status === "Pending" || row.status === "Pending Review").length
  const progressCount = rows.filter((row) => row.status === "In Progress").length
  const urgentCount = rows.filter((row) => row.priority === "Urgent" && row.status !== "Resolved").length
  const progressPercent = openCount ? Math.round((progressCount / openCount) * 100) : 0
  const selectedAssignee = selected ? assigneeOverrides[selected.id] ?? "Mohamed Ellabib" : "Mohamed Ellabib"
  const selectedOutcome = selected ? resolutionOutcomes[selected.id] : undefined
  const tabCounts: Record<RequestTab, number> = { "All Requests": openCount, Pending: pendingCount, "In Progress": progressCount, Resolved: rows.filter((row) => row.status === "Resolved").length }

  const demoAction = (message: string) => onToast(isDemo ? `Demo session only: ${message}` : "Request operations are unavailable because no request service is connected.")
  const changeSelectedStatus = (nextStatus: RequestStatus, message: string, outcome?: RequestOutcome) => {
    if (!selected || !isDemo) return demoAction(message)
    setStatusOverrides((current) => ({ ...current, [selected.id]: nextStatus }))
    if (outcome) setResolutionOutcomes((current) => ({ ...current, [selected.id]: outcome }))
    demoAction(message)
  }

  return (
    <section className="admin-platform-ops admin-requests-page" aria-labelledby="admin-requests-title">
      <header className="admin-page-heading">
        <div className="admin-page-heading__copy"><h1 id="admin-requests-title">Requests</h1><p>Review store, vendor and platform service requests</p></div>
        <div className="admin-page-actions"><button type="button" className="admin-page-button" disabled={!isDemo || !filteredRows.length} onClick={() => { downloadRequests(filteredRows); onToast(`${filteredRows.length} requests exported.`) }}><PiUploadSimple />Export</button><button type="button" className="admin-page-button admin-page-button--primary" disabled={!isDemo} title={!isDemo ? "No request service is connected" : undefined} onClick={() => demoAction("new request draft opened.")}><PiPlus />New Request</button></div>
      </header>

      <div className="admin-page-kpis" aria-label="Request summary">
        <article className="admin-page-card admin-page-kpi"><div className="admin-page-kpi__icon"><PiTray /></div><div className="admin-page-kpi__body"><div className="admin-page-kpi__label">Open Requests</div><strong>{loading && !isDemo ? "—" : isDemo ? openCount : "—"}</strong><p>{isDemo ? "Across the platform" : "Request data unavailable"}</p></div></article>
        <article className="admin-page-card admin-page-kpi"><div className="admin-page-kpi__icon admin-page-kpi__icon--orange"><PiFileMagnifyingGlass /></div><div className="admin-page-kpi__body"><div className="admin-page-kpi__label">Pending Review</div><strong>{loading && !isDemo ? "—" : isDemo ? pendingCount : "—"} {isDemo ? <i className="admin-page-status-dot admin-page-status-dot--orange" /> : null}</strong><p>{isDemo ? "Awaiting a decision" : "Metric not connected"}</p></div></article>
        <article className="admin-page-card admin-page-kpi"><div className="admin-page-kpi__icon admin-page-kpi__icon--blue"><PiCircleNotch /></div><div className="admin-page-kpi__body"><div className="admin-page-kpi__label">In Progress</div><strong>{loading && !isDemo ? "—" : isDemo ? progressCount : "—"} {isDemo ? <span className="admin-page-percent admin-request-percent">{progressPercent}%</span> : null}</strong><p>{isDemo ? "Currently assigned" : "Metric not connected"}</p></div></article>
        <article className="admin-page-card admin-page-kpi"><div className="admin-page-kpi__icon admin-page-kpi__icon--red"><PiWarning /></div><div className="admin-page-kpi__body"><div className="admin-page-kpi__label">Urgent</div><strong>{loading && !isDemo ? "—" : isDemo ? urgentCount : "—"} {isDemo ? <i className="admin-page-status-dot admin-page-status-dot--red" /> : null}</strong><p>{isDemo ? "SLA at risk" : "Metric not connected"}</p></div></article>
      </div>

      <div className="admin-ops-tabs admin-request-tabs" role="tablist" aria-label="Request views">{(["All Requests", "Pending", "In Progress", "Resolved"] as RequestTab[]).map((item) => <button key={item} type="button" role="tab" aria-selected={tab === item} className={tab === item ? "is-active" : undefined} onClick={() => setTab(item)}>{item}<span>{isDemo ? tabCounts[item] : "—"}</span></button>)}</div>

      <div className="admin-ops-workspace admin-requests-workspace">
        <article className="admin-page-card admin-ops-table-card admin-request-queue">
          <div className="admin-directory-toolbar"><div><h2>Request Queue</h2><p>{error && !isDemo ? error : isDemo ? "Prioritized platform requests" : "Request service is not connected"}</p></div><div className="admin-directory-filters"><label className="admin-page-search"><PiMagnifyingGlass /><input maxLength={120} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search requests…" aria-label="Search requests" /></label><select className="admin-page-select" value={type} onChange={(event) => setType(event.target.value)} aria-label="Filter requests by type"><option>All Types</option><option>Domain</option><option>Plan</option><option>Template</option><option>Store Setup</option><option>Access</option></select><select className="admin-page-select" value={priority} onChange={(event) => setPriority(event.target.value)} aria-label="Filter requests by priority"><option>All Priority</option><option>Normal</option><option>High</option><option>Urgent</option></select><button type="button" className="admin-page-filter-button" aria-label="Clear request filters" onClick={() => { setQuery(""); setType("All Types"); setPriority("All Priority"); onToast("Request filters cleared.") }}><PiSlidersHorizontal /></button></div></div>

          <div className="admin-ops-scroll" role="region" aria-label="Scrollable request queue" tabIndex={0}><div className="admin-ops-table admin-request-table" role="table" aria-label="Requests"><div className="admin-ops-row admin-ops-row--head admin-request-row" role="row"><span>Request</span><span>Store / Vendor</span><span>Type</span><span>Priority</span><span>Status</span><span>Submitted</span><span /></div>{pageRows.length ? pageRows.map((row) => { const Icon = requestTypeIcons[row.type]; return <button type="button" className={`admin-ops-row admin-request-row admin-request-row-button${selected?.id === row.id ? " is-selected" : ""}`} role="row" key={row.id} onClick={() => setSelectedId(row.id)}><span className={`admin-request-main admin-request-tone--${row.type.toLowerCase().replace(/\s+/g, "-")}`}><i><Icon /></i><span><small>{row.id}</small><strong>{row.title}</strong></span></span><span className="admin-request-store"><i><PiStorefront /></i><span><strong>{row.store}</strong><small>{row.owner}</small></span></span><span className={`admin-page-pill admin-request-type admin-request-type--${row.type.toLowerCase().replace(/\s+/g, "-")}`}>{row.type}</span><span className="admin-request-priority"><i className={`admin-page-status-dot admin-page-status-dot--${row.priority === "Urgent" ? "red" : row.priority === "High" ? "orange" : "muted"}`} />{row.priority}</span><span className={`admin-page-pill admin-request-status admin-request-status--${row.status.toLowerCase().replace(/\s+/g, "-")}`}>{row.status}</span><span>{row.submitted}</span><PiDotsThree className="admin-request-more" /></button> }) : <div className="admin-ops-empty">{loading && !isDemo ? "Loading requests…" : "Operational request data is unavailable."}</div>}</div><footer className="admin-directory-footer"><span>{filteredRows.length ? `Showing ${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, filteredRows.length)} of ${filteredRows.length} requests` : "Showing 0 requests"}</span><div className="admin-pagination" aria-label="Request pages"><button type="button" aria-label="Previous page" disabled={safePage <= 1} onClick={() => setPage(Math.max(1, safePage - 1))}><PiCaretLeft /></button>{paginationItems(safePage, pages).map((item, index) => item === "ellipsis" ? <span key={`ellipsis-${index}`}>…</span> : <button type="button" key={item} className={safePage === item ? "is-active" : undefined} aria-current={safePage === item ? "page" : undefined} onClick={() => setPage(item)}>{item}</button>)}<button type="button" aria-label="Next page" disabled={safePage >= pages} onClick={() => setPage(Math.min(pages, safePage + 1))}><PiCaretRight /></button></div></footer></div>
        </article>

        <aside className="admin-page-card admin-request-details" aria-label="Request details">
          <header><h2>Request Details</h2><button type="button" aria-label="More request actions" onClick={() => demoAction("request actions opened.")}><PiDotsThree /></button></header>
          {selected ? <><small className="admin-request-detail-id">{selected.id}</small><h3>{selected.title}</h3><div className="admin-request-detail-pills"><span className={`admin-page-pill admin-request-status admin-request-status--${selected.status.toLowerCase().replace(/\s+/g, "-")}`}>{selected.status}</span><span className="admin-page-pill admin-request-priority-pill">{selected.priority}</span>{selectedOutcome ? <span className={`admin-page-pill admin-request-outcome admin-request-outcome--${selectedOutcome.toLowerCase()}`}>{selectedOutcome}</span> : null}</div><div className="admin-request-person">{avatarFor(selected.owner) ? <img src={avatarFor(selected.owner) ?? undefined} alt="" /> : <span className="admin-request-avatar"><PiUserCircle /></span>}<div><strong>{selected.owner}</strong><span>{selected.email}</span></div><div><span><PiStorefront />{selected.store}</span><span><PiClock />{selected.submitted.replace("min", "minutes")}</span></div></div><div className="admin-request-copy"><strong>Request</strong><p>{selected.description}</p></div><dl className="admin-request-facts">{selected.domain ? <><dt>Domain</dt><dd>{selected.domain}</dd></> : null}{selected.currentPlan ? <><dt>Current plan</dt><dd>{selected.currentPlan}</dd></> : null}{selected.dnsStatus ? <><dt>DNS status</dt><dd><i className="admin-page-status-dot admin-page-status-dot--orange" />{selected.dnsStatus}</dd></> : null}{selected.attachment ? <><dt>Attachment</dt><dd><button type="button" onClick={() => onToast(`Attachment: ${selected.attachment}`)}><PiPaperclip />{selected.attachment}</button><small>1 file</small></dd></> : null}</dl><div className="admin-request-actions"><span>{isDemo ? "Demo session only" : "Operations unavailable"}</span><button type="button" className="admin-request-approve" disabled={!isDemo} onClick={() => changeSelectedStatus("Resolved", "request approved.", "Approved")}>Approve Request</button><div><button type="button" onClick={() => demoAction("request information opened.")}>Request Info</button><button type="button" disabled={!isDemo} onClick={() => changeSelectedStatus("Resolved", "request rejected.", "Rejected")}>Reject</button></div></div><footer><label><span>Assigned to</span><select value={selectedAssignee} onChange={(event) => { if (selected) setAssigneeOverrides((current) => ({ ...current, [selected.id]: event.target.value })); demoAction(`assigned to ${event.target.value}.`) }} disabled={!isDemo} aria-label="Assign request"><option>Mohamed Ellabib</option><option>Sara Omar</option><option>Unassigned</option></select></label><button type="button" onClick={() => demoAction("full request history opened.")}>View full history <PiArrowRight /></button></footer></> : <div className="admin-ops-empty admin-request-detail-empty">No request details are available.</div>}
        </aside>
      </div>
    </section>
  )
}
