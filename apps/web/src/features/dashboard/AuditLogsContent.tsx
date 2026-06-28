import {
  AlertTriangle,
  ArrowDown,
  Download,
  FileClock,
  Flag,
  Info,
  MoreVertical,
  Search,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  UsersRound,
  X,
  type LucideIcon
} from "lucide-react";
import {
  memo,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode
} from "react";

import {
  api,
  type AuditLogAction,
  type AuditLogEntityType,
  type AuditLogListParams,
  type AuditLogRecord,
  type PaginationMeta,
  type UserRecord
} from "../../api/client";
import { useI18n } from "../../i18n";
import type { AppLanguage } from "../../i18n/locale";

type AuditSeverity = "critical" | "info" | "warning";

type AuditFilters = {
  action: AuditLogAction | "all";
  actorId: string;
  dateRange: "30d" | "7d" | "all" | "today";
  entityType: AuditLogEntityType | "all";
  search: string;
  severity: AuditSeverity | "all";
};

type AuditLogsState =
  | {
      logs: AuditLogRecord[];
      pagination: PaginationMeta;
      status: "ready";
      users: UserRecord[];
    }
  | { message: string; status: "error" }
  | { status: "loading" };

const defaultFilters: AuditFilters = {
  action: "all",
  actorId: "all",
  dateRange: "7d",
  entityType: "all",
  search: "",
  severity: "all"
};

const auditActions: AuditLogAction[] = [
  "create",
  "update",
  "change_status",
  "assign",
  "review",
  "comment",
  "login_failed",
  "login_succeeded",
  "logout",
  "password_changed"
];

const auditEntityTypes: AuditLogEntityType[] = [
  "sprint",
  "task",
  "user",
  "role",
  "permission",
  "request",
  "task_update",
  "comment",
  "audit_log"
];

const rowsPerPage = 8;

function AuditLogsContentView({ refreshSignal = 0 }: { refreshSignal?: number }) {
  const { language } = useI18n();
  const [draftFilters, setDraftFilters] = useState<AuditFilters>(defaultFilters);
  const [filters, setFilters] = useState<AuditFilters>(defaultFilters);
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<AuditLogRecord | null>(null);
  const [selectedLogStatus, setSelectedLogStatus] = useState<"idle" | "loading">("idle");
  const [state, setState] = useState<AuditLogsState>({ status: "loading" });

  useEffect(() => {
    let isMounted = true;
    const query = buildAuditLogQuery(filters);

    setState((current) => (current.status === "ready" ? current : { status: "loading" }));

    Promise.all([
      api.getAuditLogs({
        ...query,
        limit: 100,
        page: 1,
        sortBy: "createdAt",
        sortOrder: "desc"
      }),
      api.getUsers({ limit: 100, sortBy: "fullName", sortOrder: "asc" })
    ])
      .then(([auditLogs, users]) => {
        if (!isMounted) {
          return;
        }

        setState({
          logs: auditLogs.data,
          pagination: auditLogs.pagination,
          status: "ready",
          users: users.data
        });
      })
      .catch((error: unknown) => {
        if (!isMounted) {
          return;
        }

        setState({
          message:
            error instanceof Error
              ? error.message
              : "Audit logs could not be loaded.",
          status: "error"
        });
      });

    return () => {
      isMounted = false;
    };
  }, [filters, refreshSignal]);

  const logs = state.status === "ready" ? state.logs : [];
  const users = state.status === "ready" ? state.users : [];
  const usersById = useMemo(() => new Map(users.map((user) => [user.id, user])), [users]);
  const severityFilteredLogs = useMemo(
    () =>
      filters.severity === "all"
        ? logs
        : logs.filter((log) => resolveAuditSeverity(log) === filters.severity),
    [filters.severity, logs]
  );
  const totalRows =
    filters.severity === "all"
      ? state.status === "ready"
        ? state.pagination.totalItems ?? severityFilteredLogs.length
        : 0
      : severityFilteredLogs.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const visibleRows = severityFilteredLogs.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );
  const metrics = useMemo(
    () => buildAuditMetrics(logs, totalRows),
    [logs, totalRows]
  );
  const securityEvents = useMemo(
    () => getRecentSecurityEvents(logs),
    [logs]
  );
  const topSources = useMemo(
    () => getTopActivitySources(logs, usersById),
    [logs, usersById]
  );

  function handleApplyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setFilters(draftFilters);
  }

  function handleExport() {
    exportAuditLogs(severityFilteredLogs, usersById);
  }

  async function handleViewDetails(log: AuditLogRecord) {
    setSelectedLog(log);
    setSelectedLogStatus("loading");

    try {
      setSelectedLog(await api.getAuditLog(log.id));
    } catch {
      setSelectedLog(log);
    } finally {
      setSelectedLogStatus("idle");
    }
  }

  return (
    <section
      className={`audit-page${selectedLog ? " has-modal-open" : ""}`}
      aria-label="Audit logs workspace"
    >
      <section className="audit-metric-grid" aria-label="Audit log summary">
        <AuditMetricCard
          color="blue"
          icon={FileClock}
          label="All system activity"
          title="Total Logs"
          value={formatNumber(metrics.totalLogs, language)}
        />
        <AuditMetricCard
          color="green"
          icon={TrendingUp}
          label="Since midnight"
          title="Today's Activity"
          value={formatNumber(metrics.todayActivity, language)}
        />
        <AuditMetricCard
          color="orange"
          icon={ShieldAlert}
          label="Require attention"
          title="Security Events"
          value={formatNumber(metrics.securityEvents, language)}
        />
        <AuditMetricCard
          color="violet"
          icon={UsersRound}
          label="User initiated"
          title="User Actions"
          value={formatNumber(metrics.userActions, language)}
        />
        <AuditMetricCard
          color="red"
          icon={Flag}
          label="Needs review"
          title="High Priority Flags"
          value={formatNumber(metrics.highPriorityFlags, language)}
        />
      </section>

      <div className="audit-layout">
        <main className="audit-main-column">
          <form className="audit-filter-bar" onSubmit={handleApplyFilters}>
            <label className="audit-search-control">
              <Search size={18} strokeWidth={2.1} aria-hidden="true" />
              <input
                aria-label="Search audit logs"
                onChange={(event) =>
                  setDraftFilters((current) => ({
                    ...current,
                    search: event.target.value
                  }))
                }
                placeholder="Search logs..."
                value={draftFilters.search}
              />
            </label>

            <AuditSelect
              label="Date Range"
              onChange={(value) =>
                setDraftFilters((current) => ({
                  ...current,
                  dateRange: value as AuditFilters["dateRange"]
                }))
              }
              value={draftFilters.dateRange}
            >
              <option value="7d">{formatDateRangeLabel("7d", language)}</option>
              <option value="today">{formatDateRangeLabel("today", language)}</option>
              <option value="30d">{formatDateRangeLabel("30d", language)}</option>
              <option value="all">All time</option>
            </AuditSelect>

            <AuditSelect
              label="Action Type"
              onChange={(value) =>
                setDraftFilters((current) => ({
                  ...current,
                  action: value as AuditFilters["action"]
                }))
              }
              value={draftFilters.action}
            >
              <option value="all">All Actions</option>
              {auditActions.map((action) => (
                <option key={action} value={action}>
                  {formatAuditAction(action)}
                </option>
              ))}
            </AuditSelect>

            <AuditSelect
              label="Entity Type"
              onChange={(value) =>
                setDraftFilters((current) => ({
                  ...current,
                  entityType: value as AuditFilters["entityType"]
                }))
              }
              value={draftFilters.entityType}
            >
              <option value="all">All Entities</option>
              {auditEntityTypes.map((entityType) => (
                <option key={entityType} value={entityType}>
                  {formatEntityType(entityType)}
                </option>
              ))}
            </AuditSelect>

            <AuditSelect
              label="Actor / User"
              onChange={(value) =>
                setDraftFilters((current) => ({
                  ...current,
                  actorId: value
                }))
              }
              value={draftFilters.actorId}
            >
              <option value="all">All Users</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.fullName}
                </option>
              ))}
            </AuditSelect>

            <AuditSelect
              label="Severity"
              onChange={(value) =>
                setDraftFilters((current) => ({
                  ...current,
                  severity: value as AuditFilters["severity"]
                }))
              }
              value={draftFilters.severity}
            >
              <option value="all">All Severities</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
            </AuditSelect>

            <div className="audit-filter-actions">
              <button className="audit-export-button" onClick={handleExport} type="button">
                <Download size={16} strokeWidth={2.25} aria-hidden="true" />
                Export
              </button>
              <button className="audit-filter-button" type="submit">
                <Search size={16} strokeWidth={2.25} aria-hidden="true" />
                Search
              </button>
            </div>
          </form>

          <section className="audit-table-panel">
            <div className="audit-table-scroll">
              <table className="audit-table">
                <thead>
                  <tr>
                    <th>
                      Time <ArrowDown size={13} strokeWidth={2.2} aria-hidden="true" />
                    </th>
                    <th>Actor</th>
                    <th>Action</th>
                    <th>Entity Type</th>
                    <th>Record</th>
                    <th>Severity</th>
                    <th>IP Address</th>
                    <th>Result</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {state.status === "loading" ? (
                    <tr>
                      <td colSpan={9}>Loading audit logs...</td>
                    </tr>
                  ) : null}

                  {state.status === "error" ? (
                    <tr>
                      <td colSpan={9}>{state.message}</td>
                    </tr>
                  ) : null}

                  {state.status === "ready" && visibleRows.length === 0 ? (
                    <tr>
                      <td colSpan={9}>No audit logs match the current filters.</td>
                    </tr>
                  ) : null}

                  {state.status === "ready"
                    ? visibleRows.map((log) => (
                        <AuditLogRow
                          key={log.id}
                          log={log}
                          onViewDetails={() => void handleViewDetails(log)}
                          user={log.actorId ? usersById.get(log.actorId) : undefined}
                          usersById={usersById}
                          language={language}
                        />
                      ))
                    : null}
                </tbody>
              </table>
            </div>

            <footer className="audit-table-footer">
              <span>
                Showing {visibleRows.length > 0 ? (page - 1) * rowsPerPage + 1 : 0} to{" "}
                {Math.min(page * rowsPerPage, totalRows)} of {formatNumber(totalRows, language)} audit logs
              </span>
              <div className="audit-pagination">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  type="button"
                >
                  ‹
                </button>
                {buildPaginationItems(page, totalPages).map((item, index) =>
                  item === "ellipsis" ? (
                    <span key={`ellipsis-${index}`}>...</span>
                  ) : (
                    <button
                      className={item === page ? "is-active" : ""}
                      key={item}
                      onClick={() => setPage(item)}
                      type="button"
                    >
                      {item}
                    </button>
                  )
                )}
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  type="button"
                >
                  ›
                </button>
              </div>
            </footer>
          </section>
        </main>

        <aside className="audit-side-column">
          <AuditSidePanel
            actionLabel="View all"
            className="audit-security-panel"
            title="Recent Security Events"
          >
            <div className="audit-security-list">
              {securityEvents.length > 0 ? (
                securityEvents.map((event) => (
                  <article key={event.id}>
                    <span className={`audit-security-icon audit-security-${event.severity}`}>
                      {event.severity === "critical" ? (
                        <ShieldAlert size={15} strokeWidth={2.25} aria-hidden="true" />
                      ) : event.severity === "warning" ? (
                        <AlertTriangle size={15} strokeWidth={2.25} aria-hidden="true" />
                      ) : (
                        <Info size={15} strokeWidth={2.25} aria-hidden="true" />
                      )}
                    </span>
                    <div>
                      <strong>{event.title}</strong>
                      <small>{event.description}</small>
                    </div>
                    <time>{formatShortTime(event.createdAt, language)}</time>
                    <i className={`audit-event-dot audit-event-${event.severity}`} />
                  </article>
                ))
              ) : (
                <p className="audit-empty-text">No security events found.</p>
              )}
            </div>
          </AuditSidePanel>

          <AuditSidePanel
            actionLabel="Today"
            className="audit-summary-panel"
            title="Audit Summary"
          >
            <AuditSummaryRows metrics={metrics} />
          </AuditSidePanel>

          <AuditSidePanel
            actionLabel="View all"
            className="audit-sources-panel"
            title="Top Activity Sources"
          >
            <div className="audit-source-list">
              {topSources.length > 0 ? (
                topSources.map((source) => (
                  <article key={source.label}>
                    <i style={{ backgroundColor: source.color }} />
                    <strong>{source.label}</strong>
                    <span>
                      {source.count} ({source.percent}%)
                    </span>
                  </article>
                ))
              ) : (
                <p className="audit-empty-text">No activity sources found.</p>
              )}
            </div>
          </AuditSidePanel>
        </aside>
      </div>

      {selectedLog ? (
        <AuditDetailsModal
          log={selectedLog}
          loading={selectedLogStatus === "loading"}
          onClose={() => setSelectedLog(null)}
          user={selectedLog.actorId ? usersById.get(selectedLog.actorId) : undefined}
          usersById={usersById}
          language={language}
        />
      ) : null}
    </section>
  );
}

export const AuditLogsContent = memo(AuditLogsContentView);

function AuditMetricCard({
  color,
  icon: Icon,
  label,
  title,
  value
}: {
  color: "blue" | "green" | "orange" | "red" | "violet";
  icon: LucideIcon;
  label: string;
  title: string;
  value: string;
}) {
  return (
    <article className={`audit-metric-card audit-metric-${color}`}>
      <span>
        <Icon size={28} strokeWidth={2} aria-hidden="true" />
      </span>
      <div>
        <small>{title}</small>
        <strong>{value}</strong>
        <em>{label}</em>
      </div>
    </article>
  );
}

function AuditSelect({
  children,
  label,
  onChange,
  value
}: {
  children: ReactNode;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="audit-select-control">
      <span>{label}</span>
      <select onChange={(event) => onChange(event.target.value)} value={value}>
        {children}
      </select>
    </label>
  );
}

function AuditLogRow({
  language,
  log,
  onViewDetails,
  user,
  usersById
}: {
  language: AppLanguage;
  log: AuditLogRecord;
  onViewDetails: () => void;
  user?: UserRecord;
  usersById: Map<string, UserRecord>;
}) {
  const severity = resolveAuditSeverity(log);
  const result = resolveAuditResult(log);
  const recordLabel = formatRecordLabel(log);

  return (
    <tr>
      <td>
        <time>{formatAuditTime(log.createdAt, language)}</time>
      </td>
      <td>
        <div className="audit-actor-cell">
          <span>{resolveUserInitials(user, log.actorId)}</span>
          <div>
            <strong>{user?.fullName ?? resolveFallbackActor(log.actorId)}</strong>
            <small>{user?.jobTitle ?? user?.department ?? "System event"}</small>
          </div>
        </div>
      </td>
      <td>
        <span className="audit-action-text">
          {formatActionMessage(log, user, usersById)}
        </span>
      </td>
      <td>{formatEntityType(log.entityType)}</td>
      <td>
        <strong className="audit-entity-code">{recordLabel}</strong>
      </td>
      <td>
        <span className={`audit-pill audit-pill-${severity}`}>
          {capitalize(severity)}
        </span>
      </td>
      <td>{log.ipAddress ?? "System"}</td>
      <td>
        <span className={`audit-result audit-result-${result}`}>
          {capitalize(result)}
        </span>
      </td>
      <td>
        <div className="audit-row-actions">
          <button aria-label="More actions" onClick={onViewDetails} type="button">
            <MoreVertical size={16} strokeWidth={2.15} aria-hidden="true" />
          </button>
        </div>
      </td>
    </tr>
  );
}

function AuditSidePanel({
  actionLabel,
  children,
  className,
  title
}: {
  actionLabel: string;
  children: ReactNode;
  className: string;
  title: string;
}) {
  return (
    <section className={`audit-side-panel ${className}`}>
      <header>
        <h3>{title}</h3>
        <button type="button">{actionLabel}</button>
      </header>
      {children}
    </section>
  );
}

function AuditSummaryRows({ metrics }: { metrics: AuditMetrics }) {
  const rows = [
    { label: "Total Actions", tone: "neutral", value: metrics.todayActivity },
    { label: "Successful", tone: "success", value: metrics.successfulToday },
    { label: "Failed", tone: "danger", value: metrics.failedToday },
    { label: "Warnings", tone: "warning", value: metrics.warningsToday }
  ];

  return (
    <div className="audit-summary-list">
      {rows.map((row) => (
        <article key={row.label}>
          <span>{row.label}</span>
          <strong className={`audit-summary-${row.tone}`}>
            {row.value}
            {metrics.todayActivity > 0 && row.label !== "Total Actions"
              ? ` (${Math.round((row.value / metrics.todayActivity) * 1000) / 10}%)`
              : ""}
          </strong>
        </article>
      ))}
    </div>
  );
}

function AuditDetailsModal({
  language,
  loading,
  log,
  onClose,
  user,
  usersById
}: {
  language: AppLanguage;
  loading: boolean;
  log: AuditLogRecord;
  onClose: () => void;
  user?: UserRecord;
  usersById: Map<string, UserRecord>;
}) {
  const changeRows = buildAuditChangeRows(log, usersById, language);
  const recordLabel = formatRecordLabel(log);

  return (
    <div className="audit-modal-backdrop" role="presentation">
      <section
        aria-label="Audit log details"
        aria-modal="true"
        className="audit-details-modal"
        role="dialog"
      >
        <header>
          <div>
            <span>
              <ShieldCheck size={22} strokeWidth={2.1} aria-hidden="true" />
            </span>
            <div>
              <h2>Audit Log Report</h2>
              <p>{recordLabel} - {formatAuditAction(log.action)}</p>
            </div>
          </div>
          <button aria-label="Close audit details" onClick={onClose} type="button">
            <X size={20} strokeWidth={2.2} aria-hidden="true" />
          </button>
        </header>

        {loading ? <p className="audit-empty-text">Loading full log details...</p> : null}

        <dl className="audit-detail-grid">
          <div>
            <dt>Actor</dt>
            <dd>{user?.fullName ?? resolveFallbackActor(log.actorId)}</dd>
          </div>
          <div>
            <dt>Time</dt>
            <dd>{formatFullDateTime(log.createdAt, language)}</dd>
          </div>
          <div>
            <dt>Action</dt>
            <dd>{formatAuditAction(log.action)}</dd>
          </div>
          <div>
            <dt>Entity</dt>
            <dd>{formatEntityType(log.entityType)}</dd>
          </div>
          <div>
            <dt>Record</dt>
            <dd>{recordLabel}</dd>
          </div>
          <div>
            <dt>Severity</dt>
            <dd>{capitalize(resolveAuditSeverity(log))}</dd>
          </div>
          <div>
            <dt>Result</dt>
            <dd>{capitalize(resolveAuditResult(log))}</dd>
          </div>
          <div>
            <dt>IP Address</dt>
            <dd>{log.ipAddress ?? "System"}</dd>
          </div>
          <div>
            <dt>User Agent</dt>
            <dd>{log.userAgent ?? "Not recorded"}</dd>
          </div>
        </dl>

        <section className="audit-readable-report">
          <header>
            <div>
              <h3>Readable Change Report</h3>
              <p>{formatActionMessage(log, user, usersById)}</p>
            </div>
          </header>

          {changeRows.length > 0 ? (
            <div className="audit-change-table" role="table" aria-label="Readable audit changes">
              <div className="audit-change-row audit-change-head" role="row">
                <span role="columnheader">Field</span>
                <span role="columnheader">Previous</span>
                <span role="columnheader">New</span>
              </div>
              {changeRows.map((row) => (
                <div className="audit-change-row" key={row.field} role="row">
                  <strong role="cell">{row.label}</strong>
                  <span role="cell">{row.previous}</span>
                  <span role="cell">{row.next}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="audit-empty-text">
              This event did not include field-level changes.
            </p>
          )}
        </section>
      </section>
    </div>
  );
}

type AuditMetrics = {
  failedToday: number;
  highPriorityFlags: number;
  securityEvents: number;
  successfulToday: number;
  todayActivity: number;
  totalLogs: number;
  userActions: number;
  warningsToday: number;
};

function buildAuditMetrics(logs: AuditLogRecord[], totalRows: number): AuditMetrics {
  const todayLogs = logs.filter((log) => isToday(log.createdAt));

  return {
    failedToday: todayLogs.filter((log) => resolveAuditResult(log) === "failed").length,
    highPriorityFlags: logs.filter((log) => resolveAuditSeverity(log) !== "info").length,
    securityEvents: logs.filter(isSecurityEvent).length,
    successfulToday: todayLogs.filter((log) => resolveAuditResult(log) === "success").length,
    todayActivity: todayLogs.length,
    totalLogs: totalRows,
    userActions: logs.filter((log) => Boolean(log.actorId)).length,
    warningsToday: todayLogs.filter((log) => resolveAuditSeverity(log) === "warning").length
  };
}

function buildAuditLogQuery(filters: AuditFilters): AuditLogListParams {
  const dateRange = resolveDateRange(filters.dateRange);

  return {
    ...(filters.action !== "all" ? { action: filters.action } : {}),
    ...(filters.actorId !== "all" ? { actorId: filters.actorId } : {}),
    ...(dateRange.dateFrom ? { dateFrom: dateRange.dateFrom } : {}),
    ...(dateRange.dateTo ? { dateTo: dateRange.dateTo } : {}),
    ...(filters.entityType !== "all" ? { entityType: filters.entityType } : {}),
    ...(filters.search.trim() ? { search: filters.search.trim() } : {})
  };
}

function resolveDateRange(dateRange: AuditFilters["dateRange"]): {
  dateFrom?: string;
  dateTo?: string;
} {
  if (dateRange === "all") {
    return {};
  }

  const now = new Date();
  const from = new Date(now);

  if (dateRange === "today") {
    from.setHours(0, 0, 0, 0);
  } else {
    from.setDate(from.getDate() - (dateRange === "30d" ? 30 : 7));
  }

  return {
    dateFrom: from.toISOString(),
    dateTo: now.toISOString()
  };
}

function formatDateRangeLabel(
  dateRange: AuditFilters["dateRange"],
  language: AppLanguage
): string {
  const now = new Date();
  const start = new Date(now);

  if (dateRange === "today") {
    return "Today";
  }

  if (dateRange === "all") {
    return "All time";
  }

  start.setDate(start.getDate() - (dateRange === "30d" ? 30 : 7));

  return `${formatShortDate(start, language)} - ${formatShortDate(now, language)}`;
}

function getRecentSecurityEvents(logs: AuditLogRecord[]): Array<{
  createdAt?: string;
  description: string;
  id: string;
  severity: AuditSeverity;
  title: string;
}> {
  return logs
    .filter(isSecurityEvent)
    .slice(0, 5)
    .map((log) => ({
      createdAt: log.createdAt,
      description: formatEntityType(log.entityType),
      id: log.id,
      severity: resolveAuditSeverity(log),
      title: formatAuditAction(log.action)
    }));
}

function getTopActivitySources(
  logs: AuditLogRecord[],
  usersById: Map<string, UserRecord>
): Array<{
  color: string;
  count: number;
  label: string;
  percent: number;
}> {
  const colors = ["#6ea8ff", "#59c994", "#9c7cf4", "#ff9a24", "#9aa6b6"];
  const counts = new Map<string, number>();

  for (const log of logs) {
    const user = log.actorId ? usersById.get(log.actorId) : undefined;
    const label = user?.jobTitle ?? user?.fullName ?? "System";
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  const total = Math.max(1, logs.length);

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)
    .map(([label, count], index) => ({
      color: colors[index] ?? "#9aa6b6",
      count,
      label,
      percent: Math.round((count / total) * 1000) / 10
    }));
}

function isSecurityEvent(log: AuditLogRecord): boolean {
  return (
    log.action === "login_failed" ||
    log.action === "password_changed" ||
    log.entityType === "permission" ||
    log.entityType === "role" ||
    resolveAuditSeverity(log) !== "info"
  );
}

function resolveAuditSeverity(log: AuditLogRecord): AuditSeverity {
  if (log.action === "login_failed") {
    return "critical";
  }

  if (
    log.action === "change_status" ||
    log.action === "password_changed" ||
    log.entityType === "permission" ||
    log.entityType === "role"
  ) {
    return "warning";
  }

  return "info";
}

function resolveAuditResult(log: AuditLogRecord): "failed" | "success" {
  return log.action === "login_failed" ? "failed" : "success";
}

function formatActionMessage(
  log: AuditLogRecord,
  user: UserRecord | undefined,
  usersById: Map<string, UserRecord>
): string {
  const targetName = formatRecordLabel(log);
  const assigneeName = resolveReferenceName(
    getAuditField(log.newValue, "assigneeIds") ??
      getAuditField(log.newValue, "assignedTo") ??
      getAuditField(log.newValue, "ownerId"),
    usersById
  );

  switch (log.action) {
    case "assign":
      return assigneeName
        ? `Assigned ${formatEntityType(log.entityType)} "${targetName}" to ${assigneeName}`
        : `Assigned ${formatEntityType(log.entityType)} "${targetName}"`;
    case "change_status":
      return `Changed status for ${formatEntityType(log.entityType)} "${targetName}"`;
    case "comment":
      return `Added comment to ${formatEntityType(log.entityType)} "${targetName}"`;
    case "create":
      return `Created ${formatEntityType(log.entityType)} "${targetName}"`;
    case "login_failed":
      return "Failed login attempt detected";
    case "login_succeeded":
      return `${user?.fullName ?? "User"} signed in`;
    case "logout":
      return `${user?.fullName ?? "User"} signed out`;
    case "password_changed":
      return "Password was changed";
    case "review":
      return `Reviewed ${formatEntityType(log.entityType)} "${targetName}"`;
    case "update":
      return `Updated ${formatEntityType(log.entityType)} "${targetName}"`;
  }
}

function formatAuditAction(action: AuditLogAction): string {
  return action
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatEntityType(entityType: AuditLogEntityType): string {
  const labels: Record<AuditLogEntityType, string> = {
    audit_log: "Audit Log",
    comment: "Comment",
    permission: "Permission",
    project_progress: "Overall Project Progress",
    request: "Sprint Request",
    role: "Role",
    sprint: "Sprint",
    sprint_item: "Sprint Item",
    task: "Sprint Item",
    task_update: "Sprint Update",
    user: "User"
  };

  return labels[entityType];
}

type AuditChangeRow = {
  field: string;
  label: string;
  next: string;
  previous: string;
};

function formatRecordLabel(log: AuditLogRecord): string {
  const value = readAuditObject(log.newValue);
  const oldValue = readAuditObject(log.oldValue);
  const readableName =
    (log.entityType === "project_progress" ? "Overall Project Progress" : undefined) ??
    log.entityDisplayName ??
    readFirstString(value, [
      "title",
      "name",
      "fullName",
      "displayName",
      "email",
      "body",
      "description"
    ]) ??
    readFirstString(oldValue, [
      "title",
      "name",
      "fullName",
      "displayName",
      "email",
      "body",
      "description"
    ]);

  if (readableName) {
    return trimReadableValue(readableName);
  }

  if (log.entityType === "task" || log.entityType === "sprint_item") {
    return "Sprint item record";
  }

  if (log.entityType === "task_update") {
    return "Sprint update record";
  }

  if (log.entityType === "audit_log") {
    return "Audit event";
  }

  return `${formatEntityType(log.entityType)} record`;
}

function buildAuditChangeRows(
  log: AuditLogRecord,
  usersById: Map<string, UserRecord>,
  language: AppLanguage
): AuditChangeRow[] {
  const oldValue = readAuditObject(log.oldValue);
  const newValue = readAuditObject(log.newValue);
  const keys = getReadableAuditKeys(log.entityType, oldValue, newValue);

  return keys
    .map((field) => {
      const previous = formatReadableAuditValue(
        field,
        oldValue[field],
        usersById,
        language
      );
      const next = formatReadableAuditValue(field, newValue[field], usersById, language);

      return {
        field,
        label: formatAuditFieldLabel(field),
        next,
        previous
      };
    })
    .filter((row) => row.previous !== row.next || row.next !== "Not recorded");
}

function getReadableAuditKeys(
  entityType: AuditLogEntityType,
  oldValue: Record<string, unknown>,
  newValue: Record<string, unknown>
): string[] {
  const preferredKeys: Partial<Record<AuditLogEntityType, string[]>> = {
    permission: ["displayName", "name", "module", "description", "roleId"],
    project_progress: ["percentage", "note", "updatedBy", "updatedAt"],
    request: [
      "title",
      "description",
      "type",
      "priority",
      "status",
      "requestedForDepartment",
      "assignedTo",
      "requiredDate",
      "closedAt"
    ],
    role: ["displayName", "name", "description", "isSystem"],
    sprint: [
      "name",
      "code",
      "status",
      "ownerId",
      "startDate",
      "targetDate",
      "progressTarget",
      "sprintArea",
      "description"
    ],
    sprint_item: [
      "title",
      "description",
      "category",
      "priority",
      "status",
      "progress",
      "assignedTo",
      "reviewedBy",
      "startDate",
      "dueDate",
      "blockedReason",
      "completedAt",
      "lastProgressUpdateAt"
    ],
    task: [
      "title",
      "description",
      "category",
      "priority",
      "status",
      "progress",
      "assignedTo",
      "reviewedBy",
      "startDate",
      "dueDate",
      "blockedReason",
      "completedAt",
      "lastProgressUpdateAt"
    ],
    task_update: [
      "previousStatus",
      "newStatus",
      "previousProgress",
      "newProgress",
      "note",
      "updatedBy",
      "createdAt"
    ],
    user: [
      "fullName",
      "email",
      "department",
      "jobTitle",
      "phone",
      "roleId",
      "status",
      "mustChangePassword",
      "location",
      "notes",
      "lastLoginAt"
    ]
  };
  const ignoredKeys = new Set([
    "_id",
    "authUserId",
    "createdAt",
    "employeeId",
    "failedLoginCount",
    "id",
    "passwordChangedAt",
    "passwordHash",
    "seedKey",
    "sessionVersion",
    "updatedAt"
  ]);
  const allKeys = new Set([...Object.keys(oldValue), ...Object.keys(newValue)]);
  const ordered = preferredKeys[entityType] ?? [];
  const orderedKeys = ordered.filter((key) => allKeys.has(key));
  const remainingKeys = [...allKeys]
    .filter((key) => !ignoredKeys.has(key) && !orderedKeys.includes(key))
    .sort();

  return [...orderedKeys, ...remainingKeys];
}

function formatReadableAuditValue(
  field: string,
  value: unknown,
  usersById: Map<string, UserRecord>,
  language: AppLanguage
): string {
  if (value === undefined || value === null || value === "") {
    return "Not recorded";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "number") {
    if (isPercentField(field)) {
      return `${value}%`;
    }

    return formatNumber(value, language);
  }

  if (typeof value === "string") {
    const referencedUser = usersById.get(value);

    if (referencedUser) {
      return referencedUser.fullName;
    }

    if (isDateField(field)) {
      return formatFullDateTime(value, language);
    }

    if (isInternalId(value)) {
      return formatInternalReference(field);
    }

    return formatKnownAuditValue(field, value);
  }

  if (Array.isArray(value)) {
    if (field === "assigneeIds") {
      const names = value
        .map((item) => resolveReferenceName(item, usersById))
        .filter((item): item is string => Boolean(item));

      if (names.length > 0) {
        return names.join(", ");
      }
    }

    return value.length === 1 ? "1 item" : `${value.length} items`;
  }

  if (typeof value === "object") {
    const objectValue = readAuditObject(value);
    const objectLabel = readFirstString(objectValue, [
      "fullName",
      "title",
      "name",
      "displayName",
      "email",
      "body",
      "description"
    ]);

    if (objectLabel) {
      return trimReadableValue(objectLabel);
    }

    return "Details recorded";
  }

  return String(value);
}

function resolveReferenceName(
  value: unknown,
  usersById: Map<string, UserRecord>
): string | undefined {
  if (Array.isArray(value)) {
    const names = value
      .map((item) => resolveReferenceName(item, usersById))
      .filter((item): item is string => Boolean(item));

    return names.length > 0 ? names.join(", ") : undefined;
  }

  if (typeof value === "string") {
    return usersById.get(value)?.fullName;
  }

  if (!value || typeof value !== "object") {
    return undefined;
  }

  return readFirstString(value as Record<string, unknown>, [
    "fullName",
    "name",
    "email"
  ]);
}

function getAuditField(value: unknown, field: string): unknown {
  return readAuditObject(value)[field];
}

function formatAuditFieldLabel(field: string): string {
  const labels: Record<string, string> = {
    assigneeIds: "Assignees",
    assignedTo: "Assignee",
    blockedReason: "Blocked Reason",
    body: "Comment",
    category: "Sprint Area",
    closedAt: "Closed At",
    code: "Sprint Code",
    completedAt: "Completed At",
    createdBy: "Created By",
    description: "Description",
    displayName: "Display Name",
    dueDate: "Due Date",
    email: "Email",
    fullName: "Full Name",
    isSystem: "System Role",
    jobTitle: "Job Title",
    lastLoginAt: "Last Login",
    lastProgressUpdateAt: "Last Progress Update",
    location: "Location",
    module: "Module",
    mustChangePassword: "Must Change Password",
    name: "Name",
    newProgress: "New Progress",
    newStatus: "New Status",
    notes: "Notes",
    oldProgress: "Previous Progress",
    oldStatus: "Previous Status",
    ownerId: "Sprint Owner",
    phone: "Phone",
    percentage: "Overall Progress",
    previousProgress: "Previous Progress",
    previousStatus: "Previous Status",
    priority: "Priority",
    progress: "Progress",
    progressTarget: "Current Progress",
    requestCode: "Request Code",
    requestedForDepartment: "Department",
    requiredDate: "Required Date",
    reviewedBy: "Reviewer / Lead",
    roleId: "Role",
    sprintArea: "Sprint Area",
    startDate: "Start Date",
    status: "Status",
    taskCode: "Sprint Item Code",
    title: "Title",
    type: "Type",
    updatedBy: "Updated By"
  };

  return labels[field] ?? titleize(field);
}

function formatKnownAuditValue(field: string, value: string): string {
  const statusLabels: Record<string, string> = {
    active: "Active",
    assigned: "Assigned",
    blocked: "Blocked",
    cancelled: "Cancelled",
    closed: "Closed",
    completed: "Completed",
    draft: "Draft",
    inactive: "Inactive",
    in_progress: "In Progress",
    open: "Open",
    planned: "Planned",
    rejected: "Rejected",
    submitted: "Submitted",
    suspended: "Suspended",
    waiting_review: "Waiting Review"
  };
  const priorityLabels: Record<string, string> = {
    high: "High",
    low: "Low",
    medium: "Medium",
    urgent: "Urgent"
  };
  const sprintAreaLabels: Record<string, string> = {
    access: "Development Sprint",
    development: "Development Sprint",
    facility: "Facility Sprint",
    hardware: "Facility Sprint",
    infrastructure: "Infrastructure Sprint",
    maintenance: "Facility Sprint",
    network: "Infrastructure Sprint",
    other: "Infrastructure Sprint",
    server: "Infrastructure Sprint",
    software: "Development Sprint",
    support: "Facility Sprint"
  };

  if (field.toLowerCase().includes("status")) {
    return statusLabels[value] ?? titleize(value);
  }

  if (field === "priority") {
    return priorityLabels[value] ?? titleize(value);
  }

  if (field === "category" || field === "sprintArea" || field === "type") {
    return sprintAreaLabels[value] ?? titleize(value);
  }

  return value.includes("_") || value.includes("-") ? titleize(value) : value;
}

function formatInternalReference(field: string): string {
  if (
    [
      "assigneeIds",
      "assignedTo",
      "createdBy",
      "ownerId",
      "requestedBy",
      "reviewedBy",
      "updatedBy"
    ].includes(field)
  ) {
    return "Team member";
  }

  if (field === "roleId") {
    return "Selected role";
  }

  if (field === "requestId") {
    return "Linked sprint area";
  }

  return "Internal record";
}

function isInternalId(value: string): boolean {
  return /^[a-f\d]{24}$/i.test(value);
}

function isDateField(field: string): boolean {
  return /(?:At|Date)$/.test(field);
}

function isPercentField(field: string): boolean {
  return field.toLowerCase().includes("progress") || field === "progressTarget";
}

function readFirstString(
  value: Record<string, unknown>,
  keys: string[]
): string | undefined {
  for (const key of keys) {
    const field = value[key];

    if (typeof field === "string" && field.trim()) {
      return field.trim();
    }
  }

  return undefined;
}

function trimReadableValue(value: string): string {
  return value.length > 90 ? `${value.slice(0, 87)}...` : value;
}

function titleize(value: string): string {
  return value
    .replace(/([a-z\d])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function resolveUserInitials(user: UserRecord | undefined, actorId: string | undefined): string {
  const source = user?.fullName ?? actorId ?? "System";
  const initials = source
    .replace(/@.*/, "")
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return initials.length > 0 ? initials : "SY";
}

function resolveFallbackActor(actorId: string | undefined): string {
  return actorId ? `User ${shortId(actorId)}` : "System";
}

function shortId(value: string): string {
  return value.slice(-8).toUpperCase();
}

function readAuditObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function buildPaginationItems(currentPage: number, totalPages: number): Array<"ellipsis" | number> {
  const visible = Array.from({ length: Math.min(5, totalPages) }, (_, index) => index + 1);

  if (totalPages <= 6) {
    return visible;
  }

  if (currentPage > 5 && currentPage < totalPages) {
    return [1, "ellipsis", currentPage, "ellipsis", totalPages];
  }

  return [...visible, "ellipsis", totalPages];
}

function exportAuditLogs(logs: AuditLogRecord[], usersById: Map<string, UserRecord>): void {
  const headers = [
    "Time",
    "Actor",
    "Action",
    "Entity Type",
    "Record",
    "Severity",
    "IP Address",
    "Result"
  ];
  const rows = logs.map((log) => {
    const user = log.actorId ? usersById.get(log.actorId) : undefined;

    return [
      log.createdAt ?? "",
      user?.fullName ?? resolveFallbackActor(log.actorId),
      formatActionMessage(log, user, usersById),
      formatEntityType(log.entityType),
      formatRecordLabel(log),
      capitalize(resolveAuditSeverity(log)),
      log.ipAddress ?? "System",
      capitalize(resolveAuditResult(log))
    ];
  });
  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function isToday(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  const date = new Date(value);
  const today = new Date();

  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

function formatAuditTime(value: string | undefined, language: AppLanguage): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat(language === "ar" ? "ar-LY" : "en-US", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

function formatFullDateTime(value: string | undefined, language: AppLanguage): string {
  if (!value) {
    return "Not recorded";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not recorded";
  }

  return new Intl.DateTimeFormat(language === "ar" ? "ar-LY" : "en-US", {
    dateStyle: "medium",
    timeStyle: "medium"
  }).format(date);
}

function formatShortDate(value: Date, language: AppLanguage): string {
  return new Intl.DateTimeFormat(language === "ar" ? "ar-LY" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(value);
}

function formatShortTime(value: string | undefined, language: AppLanguage): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat(language === "ar" ? "ar-LY" : "en-US", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function formatNumber(value: number, language: AppLanguage): string {
  return new Intl.NumberFormat(language === "ar" ? "ar-LY" : "en-US").format(value);
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
