import {
  PiArrowRight,
  PiCalendarBlank,
  PiCaretLeft,
  PiCaretRight,
  PiCheckCircleFill,
  PiDesktop,
  PiDevices,
  PiDotsThree,
  PiGear,
  PiKey,
  PiLockKey,
  PiMagnifyingGlass,
  PiShieldCheck,
  PiShieldWarning,
  PiUploadSimple,
  PiUser,
  PiUserSwitch,
  PiWarning,
} from "react-icons/pi"
import { useMemo, useState, type ComponentType } from "react"

import type { PlatformAdmin } from "../../auth/platform-auth"
import { adminDemoAuditEvents, type AdminAuditEvent } from "../admin-control-plane-demo"

import "./admin-settings-security.css"

type AdminSecurityAuditPageProps = {
  isDemo: boolean
  admin: PlatformAdmin
  onToast: (message: string) => void
}

type SecurityTab = "Audit Log" | "Active Sessions" | "Access Policies" | "API Keys"
type EventIcon = ComponentType

const eventIcons: Record<AdminAuditEvent["icon"], EventIcon> = {
  access: PiUserSwitch,
  lock: PiLockKey,
  session: PiDesktop,
  key: PiKey,
  failed: PiUser,
}

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`
}

function downloadAuditCsv(events: AdminAuditEvent[]) {
  const header = ["Event", "Actor", "IP / Device", "Time", "Result"]
  const rows = events.map((event) => [
    event.event,
    event.actor,
    event.device,
    event.time,
    event.result,
  ])
  const contents = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n")
  const url = URL.createObjectURL(new Blob([contents], { type: "text/csv;charset=utf-8" }))
  const link = document.createElement("a")
  link.href = url
  link.download = "labibtech-audit-log.csv"
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function AdminSecurityAuditPage({
  isDemo,
  admin,
  onToast,
}: AdminSecurityAuditPageProps) {
  const [activeTab, setActiveTab] = useState<SecurityTab>("Audit Log")
  const [query, setQuery] = useState("")
  const [resultFilter, setResultFilter] = useState("all")
  const [actorFilter, setActorFilter] = useState("all")
  const [todayOnly, setTodayOnly] = useState(false)
  const [page, setPage] = useState(1)

  const adminName =
    [admin.first_name, admin.last_name].filter(Boolean).join(" ").trim() || admin.email

  const events = useMemo<AdminAuditEvent[]>(
    () =>
      isDemo
        ? adminDemoAuditEvents
        : [
            {
              id: "current-session",
              event: "Current admin session",
              actor: adminName,
              actorType: "admin",
              device: "This browser",
              time: "Current session",
              result: "Verified",
              icon: "session",
            },
          ],
    [adminName, isDemo],
  )

  const visibleEvents = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return events.filter((event) => {
      const matchesQuery = `${event.event} ${event.actor} ${event.device} ${event.result}`
        .toLowerCase()
        .includes(normalized)
      const matchesResult = resultFilter === "all" || event.result.toLowerCase() === resultFilter
      const matchesActor = actorFilter === "all" || event.actorType === actorFilter
      const matchesDate = !todayOnly || event.time.startsWith("Today") || event.time === "Current session"
      return matchesQuery && matchesResult && matchesActor && matchesDate
    })
  }, [actorFilter, events, query, resultFilter, todayOnly])

  const changePage = (next: number) => {
    setPage(next)
    onToast(
      isDemo
        ? `Audit log page ${next} selected.`
        : "Historical audit pagination is unavailable until the audit service is connected.",
    )
  }

  const openSettings = (path: string) => window.location.assign(path)

  return (
    <section className="admin-security-page" aria-labelledby="admin-security-title">
      <header className="admin-page-heading admin-security-heading">
        <div className="admin-page-heading__copy">
          <h1 id="admin-security-title">Security &amp; Audit</h1>
          <p>Monitor platform access, sessions and administrative activity</p>
        </div>
        <div className="admin-page-actions">
          <button
            type="button"
            className="admin-page-button admin-security-export"
            disabled={!isDemo}
            title={!isDemo ? "A persisted audit feed is not connected" : undefined}
            onClick={() => {
              downloadAuditCsv(visibleEvents)
              onToast(`Exported ${visibleEvents.length} visible audit event${visibleEvents.length === 1 ? "" : "s"}.`)
            }}
          >
            <PiUploadSimple />
            Export Audit Log
          </button>
          <button
            type="button"
            className="admin-page-button admin-page-button--primary admin-security-settings-button"
            onClick={() => openSettings("/app/settings/users")}
          >
            <PiShieldCheck />
            Security Settings
          </button>
        </div>
      </header>

      <div className="admin-page-kpis admin-security-kpis">
        <section className="admin-page-card admin-security-score-card">
          <div className={`admin-security-score-ring${isDemo ? "" : " is-unavailable"}`}>
            <PiShieldCheck />
          </div>
          <div>
            <span>Security Score</span>
            <strong>{isDemo ? "92%" : "—"}</strong>
            <small>{isDemo ? "Strong protection" : "Not connected"}</small>
          </div>
        </section>
        <section className="admin-page-card admin-security-metric-card">
          <div className="admin-security-metric-icon is-blue"><PiDevices /></div>
          <div>
            <span>Active Sessions</span>
            <strong>{isDemo ? "18" : "1"}</strong>
            <small>{isDemo ? "3 administrator sessions" : "Current browser session"}</small>
          </div>
        </section>
        <section className="admin-page-card admin-security-metric-card">
          <div className="admin-security-metric-icon is-orange"><PiLockKey /></div>
          <div>
            <span>Failed Logins</span>
            <strong>{isDemo ? "7" : "—"}{isDemo ? <i className="is-orange" /> : null}</strong>
            <small>{isDemo ? "Last 24 hours" : "Audit feed unavailable"}</small>
          </div>
        </section>
        <section className="admin-page-card admin-security-metric-card">
          <div className="admin-security-metric-icon is-red"><PiWarning /></div>
          <div>
            <span>Open Alerts</span>
            <strong>{isDemo ? "2" : "—"}{isDemo ? <i className="is-red" /> : null}</strong>
            <small>{isDemo ? "Requires attention" : "Alert feed unavailable"}</small>
          </div>
        </section>
      </div>

      <nav className="admin-security-tabs" aria-label="Security sections">
        {(["Audit Log", "Active Sessions", "Access Policies", "API Keys"] as SecurityTab[]).map(
          (tab) => (
            <button
              type="button"
              className={activeTab === tab ? "is-active" : undefined}
              aria-current={activeTab === tab ? "page" : undefined}
              key={tab}
              onClick={() => {
                setActiveTab(tab)
                setPage(1)
              }}
            >
              {tab}
            </button>
          ),
        )}
      </nav>

      {activeTab === "Audit Log" ? (
        <div className="admin-security-layout">
          <section className="admin-page-card admin-security-audit-card">
            <div className="admin-security-audit-toolbar">
              <div>
                <h2>Audit Log</h2>
                <p>Recent security and administrative events</p>
              </div>
              <div className="admin-security-filters">
                <label className="admin-page-search">
                  <PiMagnifyingGlass />
                  <input
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value)
                      setPage(1)
                    }}
                    placeholder="Search events..."
                    aria-label="Search audit events"
                  />
                </label>
                <select
                  className="admin-page-select"
                  value={resultFilter}
                  aria-label="Filter by result"
                  onChange={(event) => {
                    setResultFilter(event.target.value)
                    setPage(1)
                  }}
                >
                  <option value="all">All Events</option>
                  <option value="success">Success</option>
                  <option value="verified">Verified</option>
                  <option value="blocked">Blocked</option>
                </select>
                <select
                  className="admin-page-select"
                  value={actorFilter}
                  aria-label="Filter by user type"
                  onChange={(event) => {
                    setActorFilter(event.target.value)
                    setPage(1)
                  }}
                >
                  <option value="all">All Users</option>
                  <option value="admin">Administrators</option>
                  <option value="vendor">Vendors</option>
                  <option value="system">System</option>
                  <option value="unknown">Unknown</option>
                </select>
                <button
                  type="button"
                  className={`admin-page-filter-button${todayOnly ? " is-active" : ""}`}
                  aria-label={todayOnly ? "Show events from all dates" : "Show today's events"}
                  aria-pressed={todayOnly}
                  onClick={() => {
                    setTodayOnly((current) => !current)
                    setPage(1)
                  }}
                >
                  <PiCalendarBlank />
                </button>
              </div>
            </div>

            <div className="admin-security-table" role="table" aria-label="Audit events">
              <div className="admin-security-row admin-security-row--head" role="row">
                <span role="columnheader">Event</span>
                <span role="columnheader">Actor</span>
                <span role="columnheader">IP / Device</span>
                <span role="columnheader">Time</span>
                <span role="columnheader">Result</span>
                <span aria-hidden="true" />
              </div>
              {visibleEvents.map((event) => {
                const Icon = eventIcons[event.icon]
                return (
                  <div className="admin-security-row" role="row" key={event.id}>
                    <span className={`admin-security-event is-${event.icon}`} role="cell">
                      <i><Icon /></i>
                      <b>{event.event}</b>
                    </span>
                    <span className="admin-security-actor" role="cell">
                      {event.actorType === "admin" ? (
                        <img src="/assets/admin-overview-avatar-tight.png" alt="" />
                      ) : event.actorType === "vendor" ? (
                        <img src="/assets/admin/vendors/sara-omar.png" alt="" />
                      ) : (
                        <i className={`is-${event.actorType}`}>
                          {event.actorType === "system" ? <PiGear /> : <PiUser />}
                        </i>
                      )}
                      <b>{event.actor}</b>
                    </span>
                    <span role="cell">{event.device}</span>
                    <span role="cell">{event.time}</span>
                    <span className="admin-security-result" role="cell">
                      <i className={event.result === "Blocked" ? "is-blocked" : undefined} />
                      {event.result}
                    </span>
                    <button
                      type="button"
                      aria-label={`Open details for ${event.event}`}
                      onClick={() => onToast(`${event.event}: ${event.result}.`)}
                    >
                      <PiDotsThree />
                    </button>
                  </div>
                )
              })}
              {!visibleEvents.length ? (
                <p className="admin-security-empty">No audit events match these filters.</p>
              ) : null}
            </div>

            <footer className="admin-security-table-footer">
              <span>
                {isDemo
                  ? `Showing ${visibleEvents.length ? "1–" + visibleEvents.length : "0"} of 2,488 events`
                  : `Showing ${visibleEvents.length} current-session event${visibleEvents.length === 1 ? "" : "s"}`}
              </span>
              <div className="admin-pagination" aria-label="Audit log pagination">
                <button type="button" aria-label="Previous page" onClick={() => changePage(Math.max(1, page - 1))}>
                  <PiCaretLeft />
                </button>
                {[1, 2, 3].map((item) => (
                  <button
                    type="button"
                    className={page === item ? "is-active" : undefined}
                    aria-current={page === item ? "page" : undefined}
                    key={item}
                    onClick={() => changePage(item)}
                  >
                    {item}
                  </button>
                ))}
                <span>...</span>
                <button
                  type="button"
                  className={page === 498 ? "is-active" : undefined}
                  onClick={() => changePage(498)}
                >
                  498
                </button>
                <button type="button" aria-label="Next page" onClick={() => changePage(Math.min(498, page + 1))}>
                  <PiCaretRight />
                </button>
              </div>
            </footer>
          </section>

          <aside className="admin-security-side">
            <section className="admin-page-card admin-security-card admin-security-health">
              <h2>Security Health</h2>
              <div className="admin-security-health-content">
                <div className={`admin-security-health-ring${isDemo ? "" : " is-unavailable"}`}>
                  <strong>{isDemo ? "92" : "—"}</strong>
                  <span>{isDemo ? "Strong" : "Unavailable"}</span>
                </div>
                <div className="admin-security-health-list">
                  {[
                    ["MFA for administrators", isDemo ? "Enabled" : "Unknown"],
                    ["Password policy", isDemo ? "Strong" : "Unknown"],
                    ["Session timeout", isDemo ? "30 min" : "Unknown"],
                    ["Suspicious login alerts", isDemo ? "Enabled" : "Unknown"],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <PiCheckCircleFill />
                      <span>{label}</span>
                      <strong>{value}</strong>
                    </div>
                  ))}
                </div>
              </div>
              <button
                type="button"
                className="admin-side-link"
                onClick={() => openSettings("/app/settings/users")}
              >
                Review controls <PiArrowRight />
              </button>
            </section>

            <section className="admin-page-card admin-security-card admin-security-alerts">
              <div className="admin-security-alerts-heading">
                <h2>Live Alerts</h2>
                <span>{isDemo ? "2 Open" : "Unavailable"}</span>
              </div>
              {isDemo ? (
                <div className="admin-security-alert-list">
                  <div>
                    <i className="is-orange"><PiShieldWarning /></i>
                    <span>
                      <strong>Unusual login attempts</strong>
                      <small>7 failed attempts from one IP</small>
                    </span>
                    <span>
                      <small>12 min ago</small>
                      <button type="button" onClick={() => onToast("Login alert opened for review.")}>Review</button>
                    </span>
                  </div>
                  <div>
                    <i className="is-blue"><PiKey /></i>
                    <span>
                      <strong>API key expires soon</strong>
                      <small>Production key expires in 6 days</small>
                    </span>
                    <span>
                      <small>1 hour ago</small>
                      <button type="button" onClick={() => openSettings("/app/settings/publishable-api-keys")}>Rotate</button>
                    </span>
                  </div>
                </div>
              ) : (
                <p className="admin-security-alerts-unavailable">Live alert data is not connected.</p>
              )}
              <button
                type="button"
                className="admin-side-link"
                disabled={!isDemo}
                title={!isDemo ? "Live alerts are not connected" : undefined}
                onClick={() => onToast("All demo alerts are visible.")}
              >
                View all alerts <PiArrowRight />
              </button>
            </section>
          </aside>
        </div>
      ) : (
        <section className="admin-page-card admin-security-tab-panel">
          {activeTab === "Active Sessions" ? <PiDevices /> : activeTab === "Access Policies" ? <PiShieldCheck /> : <PiKey />}
          <h2>{activeTab}</h2>
          <p>
            {activeTab === "API Keys"
              ? "API key management is available in the commerce administration workspace."
              : `${activeTab} data is not connected to this control-plane view yet.`}
          </p>
          <button
            type="button"
            className="admin-page-button admin-page-button--primary"
            onClick={() =>
              openSettings(
                activeTab === "API Keys" ? "/app/settings/publishable-api-keys" : "/app/settings/users",
              )
            }
          >
            Open Commerce Settings
          </button>
        </section>
      )}
    </section>
  )
}
