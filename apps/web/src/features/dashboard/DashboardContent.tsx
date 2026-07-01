import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarDays,
  Check,
  ClipboardCheck,
  Code2,
  Database,
  FileText,
  LockKeyhole,
  Server,
  ShieldCheck,
  Trash2,
  UserRound,
  UsersRound,
  type LucideIcon
} from "lucide-react";
import {
  memo,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode
} from "react";
import { useNavigate } from "react-router-dom";

import {
  api,
  type DashboardFocusItem,
  type DashboardOverview,
  type ProjectProgressRecord,
  type DashboardRecentActivityItem,
  type DashboardUserReference,
  type DashboardWorkQueueItem,
  type DashboardWorkloadItem,
  type Session,
  type TaskReportRow
} from "../../api/client";
import { useI18n } from "../../i18n";
import type { AppLanguage } from "../../i18n/locale";
import {
  getSprintAreaByCategory,
  sprintAreaDefinitions,
  type SprintAreaKey
} from "./sprintAreas";

type BadgeVariant =
  | "high"
  | "medium"
  | "low"
  | "in-progress"
  | "open"
  | "pending"
  | "resolved";

type DashboardState =
  | {
      overview: DashboardOverview;
      projectProgress?: ProjectProgressRecord;
      sprintItems: TaskReportRow[];
      status: "ready";
    }
  | { message: string; status: "error" }
  | { status: "loading" };

type SprintAreaCard = {
  blockedItems: number;
  completedItems: number;
  endDate?: string;
  icon: LucideIcon;
  key: SprintAreaKey;
  labelKey: string;
  openItems: number;
  progress: number;
  status: "at_risk" | "completed" | "in_progress" | "on_track" | "planned";
  tone: "blue" | "green" | "orange" | "purple";
};

const loadingSprintAreaCards: SprintAreaCard[] = sprintAreaDefinitions.map(
  (area) => ({
    blockedItems: 0,
    completedItems: 0,
    endDate: undefined,
    icon: resolveSprintAreaCardIcon(area.key),
    key: area.key,
    labelKey: area.labelKey,
    openItems: 0,
    progress: 0,
    status: "planned",
    tone: area.tone
  })
);

function DashboardContentView({
  refreshSignal = 0,
  session
}: {
  refreshSignal?: number;
  session: Session;
}) {
  const { language, t } = useI18n();
  const navigate = useNavigate();
  const [state, setState] = useState<DashboardState>({ status: "loading" });
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const canManageProjectProgress =
    session.roleCode === "super_admin" || session.roleCode === "it_manager";
  const canDeleteSprintItems = canPermanentlyDeleteSprintItems(session);

  useEffect(() => {
    let isMounted = true;

    setState((current) => (current.status === "ready" ? current : { status: "loading" }));

    Promise.all([
      api.getDashboardOverview(),
      api
        .getTaskReport({ limit: 100, sortBy: "lastProgressUpdateAt", sortOrder: "desc" })
        .catch(() => null),
      canManageProjectProgress
        ? api.getProjectProgress().catch(() => null)
        : Promise.resolve(null)
    ])
      .then(([overview, taskReport, projectProgress]) => {
        if (isMounted) {
          setState({
            overview,
            ...(projectProgress ? { projectProgress } : {}),
            sprintItems: taskReport?.data ?? [],
            status: "ready"
          });
        }
      })
      .catch((error: unknown) => {
        if (!isMounted) {
          return;
        }

        setState({
          message:
            error instanceof Error
              ? error.message
              : "Dashboard data could not be loaded.",
          status: "error"
        });
      });

    return () => {
      isMounted = false;
    };
  }, [canManageProjectProgress, refreshSignal]);

  const overview = state.status === "ready" ? state.overview : undefined;
  const projectProgress = state.status === "ready" ? state.projectProgress : undefined;
  const sprintItems = state.status === "ready" ? state.sprintItems : [];
  const sprintAreaCards = useMemo(
    () =>
      overview
        ? buildSprintAreaCards(sprintItems)
        : loadingSprintAreaCards,
    [overview, sprintItems]
  );
  const teamCard = useMemo(
    () => (overview ? buildDashboardTeamCard(overview) : buildDashboardTeamCard()),
    [overview]
  );

  async function deleteDashboardSprintItem(item: DashboardWorkQueueItem) {
    const confirmed = window.confirm(
      language === "ar"
        ? "Delete this sprint item permanently? This removes the task and its progress history from the system. This cannot be undone."
        : "Delete this sprint item permanently? This removes the task and its progress history from the system. This cannot be undone."
    );

    if (!confirmed) {
      return;
    }

    setDeletingTaskId(item.id);

    try {
      await api.deleteSprintItem(item.id);
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : language === "ar"
            ? "Sprint item could not be deleted."
            : "Sprint item could not be deleted."
      );
    } finally {
      setDeletingTaskId(null);
    }
  }

  return (
    <section className="dashboard-canvas" aria-label={t("dashboard.aria.workspace")}>
      <section
        className="dashboard-sprint-area-section"
        aria-label={t("dashboard.sprintAreas.title")}
      >
        <div
          className={`dashboard-sprint-strip${
            canManageProjectProgress ? " is-project-layout" : ""
          }`}
        >
          {canManageProjectProgress ? (
            <DashboardProjectProgressCard
              onViewProgress={() => navigate("/project-progress")}
              projectProgress={projectProgress}
            />
          ) : null}
          {sprintAreaCards.map((card) => (
            <SprintAreaCardView
              card={card}
              key={card.key}
              onViewMore={() => navigate(`/sprints/${card.key}`)}
            />
          ))}
          <DashboardTeamSummaryCard
            activeMembers={teamCard.activeMembers}
            onLeave={teamCard.onLeave}
            pendingInvites={teamCard.pendingInvites}
            onViewTeam={() => navigate("/users")}
          />
        </div>
      </section>

      {state.status === "error" ? (
        <DashboardPanel
          className="dashboard-panel-focus"
          title={t("dashboard.navigation.dashboard")}
        >
          <p className="dashboard-empty-state">{state.message}</p>
        </DashboardPanel>
      ) : (
        <>
          <div className="dashboard-work-grid">
            <DashboardPanel
              actionLabel={t("dashboard.panels.workQueue.action")}
              onAction={() => navigate("/sprint-items")}
              actionPosition="footer"
              className="dashboard-panel-queue"
              title={t("dashboard.panels.workQueue.title")}
            >
              <DashboardQueueTable
                canDelete={canDeleteSprintItems}
                deletingItemId={deletingTaskId}
                emptyText={getEmptyStateText("queue", language)}
                items={overview?.workQueue ?? []}
                onDelete={deleteDashboardSprintItem}
              />
            </DashboardPanel>

            <DashboardPanel
              actionLabel={t("dashboard.panels.focus.action")}
              onAction={() => navigate("/sprint-items?focus=urgent")}
              actionPosition="footer"
              className="dashboard-panel-focus"
              description={t("dashboard.panels.focus.description")}
              title={t("dashboard.panels.focus.title")}
              titleAdornment={<AlertTriangle size={17} strokeWidth={2.4} aria-hidden="true" />}
            >
              <div className="dashboard-focus-list">
                {overview?.focusItems.length ? (
                  overview.focusItems.map((item) => (
                    <DashboardFocusRow item={item} key={`${item.itemType}-${item.id}`} />
                  ))
                ) : (
                  <p className="dashboard-empty-state">
                    {getEmptyStateText("focus", language)}
                  </p>
                )}
              </div>
            </DashboardPanel>
          </div>

          <div className="dashboard-bottom-grid">
            <DashboardPanel
              actionLabel={t("dashboard.panels.team.action")}
              onAction={() => navigate("/users")}
              actionPosition="footer"
              className="dashboard-panel-team"
              description={t("dashboard.panels.team.description")}
              title={t("dashboard.panels.team.title")}
            >
              <div className="dashboard-workload-list">
                {overview?.workload.length ? (
                  overview.workload.map((item) => (
                    <DashboardWorkloadRow item={item} key={item.user.id} />
                  ))
                ) : (
                  <p className="dashboard-empty-state">
                    {getEmptyStateText("team", language)}
                  </p>
                )}
              </div>
            </DashboardPanel>

            <DashboardPanel
              actionLabel={t("dashboard.panels.recentActivity.action")}
              onAction={() => navigate("/audit-logs")}
              className="dashboard-panel-activity"
              title={t("dashboard.panels.recentActivity.title")}
            >
              <div className="dashboard-activity-list">
                {overview?.recentActivity.length ? (
                  overview.recentActivity.map((item) => (
                    <DashboardActivityRow item={item} key={`${item.type}-${item.id}`} />
                  ))
                ) : (
                  <p className="dashboard-empty-state">
                    {getEmptyStateText("activity", language)}
                  </p>
                )}
              </div>
            </DashboardPanel>
          </div>
        </>
      )}
    </section>
  );
}

export const DashboardContent = memo(DashboardContentView);

function DashboardProjectProgressCard({
  onViewProgress,
  projectProgress
}: {
  onViewProgress: () => void;
  projectProgress?: ProjectProgressRecord;
}) {
  const { language } = useI18n();
  const labels = getProjectProgressCardLabels(language);
  const progress = projectProgress?.percentage ?? 0;
  const progressStyle = {
    "--progress": `${progress}%`,
    "--tone": "#08265d"
  } as CSSProperties;
  const updatedAt = formatProjectProgressUpdatedAt(projectProgress, language).replace(/^Updated\s+/, "");
  const projectStatus = labels.projectStatus ?? "Project Status";
  const earlyProgress = labels.earlyProgress ?? "Early Progress";
  const statusDescription =
    labels.statusDescription ?? "Project is in early stages. Keep the momentum going.";

  return (
    <article className="dashboard-project-progress-card">
      <header className="dashboard-project-progress-header">
        <h4>{labels.title}</h4>
      </header>
      <div className="dashboard-project-progress-body">
        <div
          aria-label={`${progress}% ${labels.progress}`}
          className="dashboard-sprint-progress-ring"
          role="img"
          style={progressStyle}
        >
          <strong>{progress}%</strong>
        </div>
        <div className="dashboard-project-progress-status">
          <span>{projectStatus}</span>
          <strong>{earlyProgress}</strong>
          <p>{statusDescription}</p>
        </div>
        <span className="dashboard-project-progress-divider" aria-hidden="true" />
        <div className="dashboard-project-progress-metrics">
          <div>
            <span className="dashboard-project-progress-meta-icon">
              <UserRound size={16} strokeWidth={2.35} aria-hidden="true" />
            </span>
            <span className="dashboard-project-progress-meta-copy">
              <span className="dashboard-project-progress-meta-label">{labels.updatedBy}</span>
              <strong>{projectProgress?.updatedBy?.fullName ?? labels.notSet}</strong>
            </span>
          </div>
          <div>
            <span className="dashboard-project-progress-meta-icon">
              <CalendarDays size={16} strokeWidth={2.35} aria-hidden="true" />
            </span>
            <span className="dashboard-project-progress-meta-copy">
              <span className="dashboard-project-progress-meta-label">
                {labels.lastUpdated ?? "Last Updated"}
              </span>
              <strong>{updatedAt}</strong>
            </span>
          </div>
        </div>
      </div>
      <footer className="dashboard-sprint-card-footer">
        <button onClick={onViewProgress} type="button">
          {labels.viewProgress}
          <ArrowRight size={12} strokeWidth={2.35} aria-hidden="true" />
        </button>
      </footer>
    </article>
  );
}

function SprintAreaCardView({
  card,
  onViewMore
}: {
  card: SprintAreaCard;
  onViewMore: () => void;
}) {
  const { language, t } = useI18n();
  const Icon = card.icon;
  const labels = getSprintAreaCardLabels(language);
  const progressStyle = {
    "--progress": `${card.progress}%`,
    "--tone": getSprintToneColor(card.tone)
  } as CSSProperties;

  return (
    <article className={`dashboard-sprint-card dashboard-sprint-card-${card.tone}`}>
      <header className="dashboard-sprint-card-header">
        <span className="dashboard-sprint-card-icon">
          <Icon size={17} strokeWidth={2.25} aria-hidden="true" />
        </span>
        <h4>{t(card.labelKey)}</h4>
        <Badge
          label={formatSprintAreaStatus(card.status, language)}
          variant={toBadgeVariant(card.status)}
        />
      </header>
      <div className="dashboard-sprint-card-body">
        <div
          aria-label={`${card.progress}% ${labels.progress}`}
          className="dashboard-sprint-progress-ring"
          role="img"
          style={progressStyle}
        >
          <span>{card.progress}%</span>
        </div>
        <dl className="dashboard-sprint-card-metrics">
          <div>
            <dt>{labels.openItems}</dt>
            <dd>{card.openItems}</dd>
          </div>
          <div>
            <dt>{labels.completed}</dt>
            <dd className="is-success">{card.completedItems}</dd>
          </div>
          <div>
            <dt>{labels.blocked}</dt>
            <dd className="is-danger">{card.blockedItems}</dd>
          </div>
        </dl>
      </div>
      <footer className="dashboard-sprint-card-footer">
        <span>
          <CalendarDays size={12} strokeWidth={2.2} aria-hidden="true" />
          {formatSprintAreaEndDate(card.endDate, language)}
        </span>
        <button onClick={onViewMore} type="button">
          {labels.viewSprint}
          <ArrowRight size={12} strokeWidth={2.35} aria-hidden="true" />
        </button>
      </footer>
    </article>
  );
}

function DashboardTeamSummaryCard({
  activeMembers,
  onLeave,
  onViewTeam,
  pendingInvites
}: {
  activeMembers: number;
  onLeave: number;
  onViewTeam: () => void;
  pendingInvites: number;
}) {
  const { language } = useI18n();
  const labels = getTeamCardLabels(language);

  return (
    <article className="dashboard-team-summary-card">
      <header className="dashboard-team-summary-header">
        <span className="dashboard-team-summary-icon">
          <UsersRound size={17} strokeWidth={2.25} aria-hidden="true" />
        </span>
        <h4>{labels.title}</h4>
      </header>
      <strong>{activeMembers}</strong>
      <span>{labels.activeMembers}</span>
      <dl>
        <div>
          <dt>{labels.onLeave}</dt>
          <dd>{onLeave}</dd>
        </div>
        <div>
          <dt>{labels.pendingInvites}</dt>
          <dd>{pendingInvites}</dd>
        </div>
      </dl>
      <button onClick={onViewTeam} type="button">
        {labels.viewTeam}
        <ArrowRight size={12} strokeWidth={2.35} aria-hidden="true" />
      </button>
    </article>
  );
}

function DashboardFocusRow({ item }: { item: DashboardFocusItem }) {
  const { language } = useI18n();
  const Icon = resolveFocusIcon(item);

  return (
    <article className="dashboard-focus-row">
      <span className={`dashboard-row-icon dashboard-tone-${resolveFocusTone(item)}`}>
        <Icon size={16} strokeWidth={2.25} aria-hidden="true" />
      </span>
      <div>
        <strong>{item.title}</strong>
        <span>
          {item.itemCode}
          <b aria-hidden="true">|</b>
          {formatFocusMeta(item, language)}
        </span>
      </div>
      <Badge label={formatPriority(item.priority, language)} variant={toBadgeVariant(item.priority)} />
      <time>{formatRelativeTime(item.dueAt ?? item.createdAt, language)}</time>
    </article>
  );
}

function DashboardQueueTable({
  canDelete,
  deletingItemId,
  emptyText,
  items,
  onDelete
}: {
  canDelete: boolean;
  deletingItemId: string | null;
  emptyText: string;
  items: DashboardWorkQueueItem[];
  onDelete: (item: DashboardWorkQueueItem) => void;
}) {
  const { language } = useI18n();
  const labels = getCurrentWorkTableLabels(language);

  return (
    <div className="dashboard-queue-table-wrap">
      <table className="dashboard-queue-table">
        <thead>
          <tr>
            <th>{labels.id}</th>
            <th>{labels.sprintItem}</th>
            <th>{labels.owner}</th>
            <th>{labels.sprintArea}</th>
            <th>{labels.module}</th>
            <th>{labels.priority}</th>
            <th>{labels.status}</th>
            {canDelete ? <th>{labels.actions}</th> : null}
          </tr>
        </thead>
        <tbody>
          {items.length ? (
            items.slice(0, 5).map((item) => (
              <DashboardQueueRow
                canDelete={canDelete}
                isDeleting={deletingItemId === item.id}
                item={item}
                key={item.id}
                onDelete={onDelete}
              />
            ))
          ) : (
            <tr>
              <td className="dashboard-queue-empty" colSpan={canDelete ? 8 : 7}>
                {emptyText}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function DashboardQueueRow({
  canDelete,
  isDeleting,
  item,
  onDelete
}: {
  canDelete: boolean;
  isDeleting: boolean;
  item: DashboardWorkQueueItem;
  onDelete: (item: DashboardWorkQueueItem) => void;
}) {
  const { language, t } = useI18n();
  const owner = item.assignedTo;

  return (
    <tr className="dashboard-queue-row">
      <td>
        <strong>{item.taskCode}</strong>
      </td>
      <td>
        <div className="dashboard-queue-title">
          <strong>{item.title}</strong>
        </div>
      </td>
      <td>{owner?.fullName ?? "-"}</td>
      <td>{formatSprintAreaByCategory(item.category, t)}</td>
      <td>
        <span className="dashboard-queue-module" title={formatTaskModule(item) ?? "-"}>
          {formatTaskModule(item) ?? "-"}
        </span>
      </td>
      <td>
        <Badge label={formatPriority(item.priority, language)} variant={toBadgeVariant(item.priority)} />
      </td>
      <td>
        <Badge label={formatStatus(item.status, language)} variant={toBadgeVariant(item.status)} />
      </td>
      {canDelete ? (
        <td>
          <button
            aria-label={language === "ar" ? "Delete sprint item" : "Delete sprint item"}
            className="dashboard-queue-action-button"
            disabled={isDeleting}
            onClick={() => onDelete(item)}
            type="button"
          >
            <Trash2 size={14} strokeWidth={2.25} aria-hidden="true" />
          </button>
        </td>
      ) : null}
    </tr>
  );
}

function DashboardWorkloadRow({ item }: { item: DashboardWorkloadItem }) {
  return (
    <article className="dashboard-workload-row">
      <Avatar initials={resolveInitials(item.user)} variant="light" />
      <div className="dashboard-workload-person">
        <strong>{item.user.fullName}</strong>
        <span>{item.user.jobTitle ?? item.user.department ?? item.user.email}</span>
      </div>
      <div className="dashboard-workload-meter">
        <span style={{ width: `${item.workloadPercent}%` }} />
      </div>
      <strong className="dashboard-workload-value">{item.workloadPercent}%</strong>
      <i className={`dashboard-status-dot dashboard-status-${item.status}`} />
    </article>
  );
}

function DashboardActivityRow({ item }: { item: DashboardRecentActivityItem }) {
  const Icon = resolveActivityIcon(item);
  const { language } = useI18n();

  return (
    <article className="dashboard-activity-row">
      <span className={`dashboard-row-icon dashboard-tone-${item.tone}`}>
        <Icon size={16} strokeWidth={2.2} aria-hidden="true" />
      </span>
      <strong>{formatActivityMessage(item.message, language)}</strong>
      <time>{formatDateTime(item.createdAt, language)}</time>
    </article>
  );
}

type DashboardPanelProps = {
  actionLabel?: string;
  actionPosition?: "header" | "footer";
  children: ReactNode;
  className?: string;
  description?: string;
  onAction?: () => void;
  title: string;
  titleAdornment?: ReactNode;
};

function DashboardPanel({
  actionLabel,
  actionPosition = "header",
  children,
  className,
  description,
  onAction,
  title,
  titleAdornment
}: DashboardPanelProps) {
  return (
    <section className={`dashboard-panel${className ? ` ${className}` : ""}`}>
      <header className="dashboard-panel-header">
        <div>
          <h3>
            {title}
            {titleAdornment ? <span>{titleAdornment}</span> : null}
          </h3>
          {description ? <p>{description}</p> : null}
        </div>
        {actionLabel && actionPosition === "header" ? (
          <button className="dashboard-panel-link" onClick={onAction} type="button">
            {actionLabel}
            <ArrowRight size={15} strokeWidth={2.4} aria-hidden="true" />
          </button>
        ) : null}
      </header>
      <div className="dashboard-panel-body">{children}</div>
      {actionLabel && actionPosition === "footer" ? (
        <footer className="dashboard-panel-footer">
          <button className="dashboard-panel-link" onClick={onAction} type="button">
            {actionLabel}
            <ArrowRight size={15} strokeWidth={2.4} aria-hidden="true" />
          </button>
        </footer>
      ) : null}
    </section>
  );
}

type BadgeProps = {
  label: string;
  variant: BadgeVariant;
};

function Badge({ label, variant }: BadgeProps) {
  return (
    <span className={`dashboard-badge dashboard-badge-${variant}`}>
      {label}
    </span>
  );
}

type AvatarProps = {
  initials: string;
  variant?: "dark" | "light";
};

function Avatar({ initials, variant = "dark" }: AvatarProps) {
  return <span className={`dashboard-mini-avatar dashboard-mini-avatar-${variant}`}>{initials}</span>;
}

function buildSprintAreaCards(items: TaskReportRow[]): SprintAreaCard[] {
  return sprintAreaDefinitions.map((area) => {
    const areaItems = items.filter((item) => area.categories.includes(item.category));
    const completedItems = areaItems.filter((item) => item.status === "completed").length;
    const blockedItems = areaItems.filter((item) => item.status === "blocked").length;
    const openItems = areaItems.filter((item) => isOpenSprintItem(item)).length;
    const progress = calculateAverageProgress(areaItems);

    return {
      blockedItems,
      completedItems,
      endDate: getLatestSprintDueDate(areaItems),
      icon: resolveSprintAreaCardIcon(area.key),
      key: area.key,
      labelKey: area.labelKey,
      openItems,
      progress,
      status: resolveSprintAreaStatus({ blockedItems, completedItems, openItems, progress, totalItems: areaItems.length }),
      tone: area.tone
    };
  });
}

function buildDashboardTeamCard(overview?: DashboardOverview): {
  activeMembers: number;
  onLeave: number;
  pendingInvites: number;
} {
  const byStatus = overview?.summary.users?.byStatus ?? [];
  const activeMembers =
    getCountByValue(byStatus, "active") ??
    overview?.workload.length ??
    0;

  return {
    activeMembers,
    onLeave: 0,
    pendingInvites: 0
  };
}

function canPermanentlyDeleteSprintItems(session: Session): boolean {
  return (
    (session.roleCode === "super_admin" || session.roleCode === "it_manager") &&
    session.permissionCodes.includes("tasks:update")
  );
}

function getCountByValue(
  values: DashboardOverview["summary"]["requests"]["byStatus"],
  key: string
): number | undefined {
  const match = values.find((item) => item.value === key);

  return match?.count;
}

function isOpenSprintItem(item: TaskReportRow): boolean {
  return item.status !== "blocked" && item.status !== "completed" && item.status !== "cancelled";
}

function calculateAverageProgress(items: TaskReportRow[]): number {
  if (items.length === 0) {
    return 0;
  }

  const total = items.reduce((sum, item) => sum + item.progress, 0);

  return Math.round(total / items.length);
}

function getLatestSprintDueDate(items: TaskReportRow[]): string | undefined {
  return items
    .map((item) => item.dueDate)
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => getTimeValue(right) - getTimeValue(left))[0];
}

function resolveSprintAreaStatus({
  blockedItems,
  completedItems,
  openItems,
  progress,
  totalItems
}: {
  blockedItems: number;
  completedItems: number;
  openItems: number;
  progress: number;
  totalItems: number;
}): SprintAreaCard["status"] {
  if (totalItems === 0) {
    return "planned";
  }

  if (blockedItems > 0 && progress < 30) {
    return "at_risk";
  }

  if (completedItems === totalItems) {
    return "completed";
  }

  if (progress >= 70 && blockedItems <= 2) {
    return "on_track";
  }

  return openItems > 0 ? "in_progress" : "planned";
}

function resolveSprintAreaCardIcon(key: SprintAreaKey): LucideIcon {
  switch (key) {
    case "development":
      return Code2;
    case "facility":
      return Building2;
    case "infrastructure":
      return Server;
    case "master_data_collection":
      return Database;
  }
}

function getTimeValue(value: string | undefined): number {
  if (!value) {
    return 0;
  }

  const time = new Date(value).getTime();

  return Number.isNaN(time) ? 0 : time;
}

function resolveFocusIcon(item: DashboardFocusItem): LucideIcon {
  if (item.itemType === "request") {
    return item.priority === "urgent" || item.priority === "high"
      ? AlertTriangle
      : FileText;
  }

  if (item.status === "blocked") {
    return AlertTriangle;
  }

  return item.department === "server" ? Server : ClipboardCheck;
}

function resolveFocusTone(item: DashboardFocusItem): "blue" | "orange" | "red" {
  if (item.status === "blocked" || item.priority === "urgent") {
    return "red";
  }

  return item.priority === "high" ? "orange" : "blue";
}

function resolveActivityIcon(item: DashboardRecentActivityItem): LucideIcon {
  if (item.type === "comment") {
    return item.tone === "orange" ? LockKeyhole : FileText;
  }

  if (item.tone === "green") {
    return Check;
  }

  if (item.tone === "red") {
    return AlertTriangle;
  }

  return ShieldCheck;
}

function toBadgeVariant(value: string): BadgeVariant {
  switch (value) {
    case "at_risk":
    case "urgent":
    case "high":
    case "blocked":
    case "delayed":
    case "rejected":
    case "cancelled":
      return "high";
    case "medium":
      return "medium";
    case "low":
      return "low";
    case "in_progress":
      return "in-progress";
    case "waiting_review":
    case "planned":
      return "pending";
    case "on_track":
    case "completed":
    case "done":
    case "closed":
      return "resolved";
    default:
      return "open";
  }
}

function formatPriority(priority: string, language: AppLanguage): string {
  const labels = {
    ar: {
      high: "عالية",
      low: "منخفضة",
      medium: "متوسطة",
      urgent: "عاجلة"
    },
    en: {
      high: "High",
      low: "Low",
      medium: "Medium",
      urgent: "Urgent"
    }
  } as const;

  return labels[language][priority as keyof (typeof labels)["en"]] ?? titleize(priority);
}

function formatStatus(status: string, language: AppLanguage): string {
  const labels = {
    ar: {
      assigned: "مسند",
      blocked: "محجوبة",
      cancelled: "ملغاة",
      closed: "مغلقة",
      completed: "مكتملة",
      draft: "مسودة",
      in_progress: "قيد التنفيذ",
      open: "مفتوحة",
      rejected: "مرفوضة",
      submitted: "مقدمة",
      waiting_review: "بانتظار المراجعة"
    },
    en: {
      assigned: "Assigned",
      blocked: "Blocked",
      cancelled: "Cancelled",
      closed: "Closed",
      completed: "Completed",
      draft: "Draft",
      in_progress: "In Progress",
      open: "Open",
      rejected: "Rejected",
      submitted: "Submitted",
      waiting_review: "Waiting Review"
    }
  } as const;

  return labels[language][status as keyof (typeof labels)["en"]] ?? titleize(status);
}

function formatPriorityCount(count: number, language: AppLanguage): string {
  if (language === "ar") {
    return `${count} أولوية عالية`;
  }

  return `${count} high priority`;
}

function formatFocusMeta(item: DashboardFocusItem, language: AppLanguage): string {
  if (item.itemType === "task") {
    return formatStatus(item.status, language);
  }

  return item.department ?? formatStatus(item.status, language);
}

function formatSprintAreaByCategory(
  category: string,
  t: (key: string) => string
): string {
  const area = getSprintAreaByCategory(category);

  return area ? t(area.labelKey) : titleize(category);
}

function formatTaskModule(
  item: Pick<DashboardWorkQueueItem, "mainModule" | "subModule">
): string | undefined {
  if (!item.mainModule && !item.subModule) {
    return undefined;
  }

  if (!item.mainModule) {
    return item.subModule;
  }

  return item.subModule ? `${item.mainModule} / ${item.subModule}` : item.mainModule;
}

function getCurrentWorkTableLabels(language: AppLanguage): {
  actions: string;
  id: string;
  module: string;
  owner: string;
  priority: string;
  sprintArea: string;
  sprintItem: string;
  status: string;
} {
  if (language === "ar") {
    return {
      actions: "Actions",
      id: "\u0627\u0644\u0631\u0645\u0632",
      module: "Module",
      owner: "\u0627\u0644\u0645\u0633\u0624\u0648\u0644",
      priority: "\u0627\u0644\u0623\u0648\u0644\u0648\u064a\u0629",
      sprintArea: "\u0645\u0646\u0637\u0642\u0629 \u0627\u0644\u0633\u0628\u0631\u0646\u062a",
      sprintItem: "\u0639\u0646\u0635\u0631 \u0627\u0644\u0633\u0628\u0631\u0646\u062a",
      status: "\u0627\u0644\u062d\u0627\u0644\u0629"
    };
  }

  return {
    actions: "Actions",
    id: "ID",
    module: "Module",
    owner: "Owner",
    priority: "Priority",
    sprintArea: "Sprint Area",
    sprintItem: "Sprint Item",
    status: "Status"
  };
}

function formatSprintAreaStatus(
  status: SprintAreaCard["status"],
  language: AppLanguage
): string {
  const labels = {
    ar: {
      at_risk: "متأخر",
      completed: "مكتمل",
      in_progress: "قيد التنفيذ",
      on_track: "على المسار",
      planned: "مخطط"
    },
    en: {
      at_risk: "At Risk",
      completed: "Completed",
      in_progress: "In Progress",
      on_track: "On Track",
      planned: "Planned"
    }
  } as const;

  return labels[language][status];
}

function formatSprintAreaEndDate(
  value: string | undefined,
  language: AppLanguage
): string {
  if (!value) {
    return language === "ar" ? "لا يوجد تاريخ نهاية" : "No end date";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return language === "ar" ? "لا يوجد تاريخ نهاية" : "No end date";
  }

  const formatted = new Intl.DateTimeFormat(language === "ar" ? "ar-LY" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(date);

  return language === "ar" ? `ينتهي ${formatted}` : `Ends ${formatted}`;
}

function getSprintAreaCardLabels(language: AppLanguage): {
  blocked: string;
  completed: string;
  openItems: string;
  progress: string;
  viewSprint: string;
} {
  if (language === "ar") {
    return {
      blocked: "محجوب",
      completed: "مكتمل",
      openItems: "عناصر مفتوحة",
      progress: "التقدم",
      viewSprint: "عرض السبرنت"
    };
  }

  return {
    blocked: "Blocked",
    completed: "Completed",
    openItems: "Open Items",
    progress: "Progress",
    viewSprint: "View Sprint"
  };
}

function getTeamCardLabels(language: AppLanguage): {
  activeMembers: string;
  onLeave: string;
  pendingInvites: string;
  title: string;
  viewTeam: string;
} {
  if (language === "ar") {
    return {
      activeMembers: "أعضاء نشطون",
      onLeave: "في إجازة",
      pendingInvites: "دعوات معلقة",
      title: "أعضاء الفريق",
      viewTeam: "عرض الفريق"
    };
  }

  return {
    activeMembers: "Active Members",
    onLeave: "On Leave",
    pendingInvites: "Pending Invites",
    title: "Team Members",
    viewTeam: "View Team"
  };
}

function getProjectProgressCardLabels(language: AppLanguage): {
  erp: string;
  manual: string;
  notSet: string;
  progress: string;
  projectStatus?: string;
  scope: string;
  source: string;
  earlyProgress?: string;
  lastUpdated?: string;
  statusDescription?: string;
  title: string;
  updatedBy: string;
  viewProgress: string;
} {
  if (language === "ar") {
    return {
      erp: "ERP",
      manual: "يدوي",
      notSet: "غير محدد",
      progress: "التقدم",
      scope: "النطاق",
      source: "الحساب",
      title: "تقدم المشروع العام",
      updatedBy: "آخر تعديل",
      viewProgress: "تعديل التقدم"
    };
  }

  return {
    erp: "ERP",
    manual: "Manual",
    notSet: "Not set",
    progress: "progress",
    projectStatus: "Project Status",
    scope: "Scope",
    source: "Calculation",
    earlyProgress: "Early Progress",
    lastUpdated: "Last Updated",
    statusDescription: "Project is in early stages. Keep the momentum going.",
    title: "Overall Project Progress",
    updatedBy: "Updated By",
    viewProgress: "Edit Progress"
  };
}

function formatProjectProgressUpdatedAt(
  projectProgress: ProjectProgressRecord | undefined,
  language: AppLanguage
): string {
  const value = projectProgress?.updatedAt ?? projectProgress?.createdAt;

  if (!value) {
    return language === "ar" ? "غير محدد" : "Not set";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return language === "ar" ? "غير محدد" : "Not set";
  }

  const formatted = new Intl.DateTimeFormat(language === "ar" ? "ar-LY" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(date);

  return language === "ar" ? `آخر تحديث ${formatted}` : `Updated ${formatted}`;
}

function getSprintToneColor(tone: SprintAreaCard["tone"]): string {
  switch (tone) {
    case "green":
      return "#17a65b";
    case "orange":
      return "#ff7a00";
    case "purple":
      return "#6a32ca";
    case "blue":
      return "#1268df";
  }
}

function resolveSprintItemStateKey(item: TaskReportRow): string {
  if (item.status === "completed") {
    return "done";
  }

  if (item.status === "cancelled") {
    return "cancelled";
  }

  if (isDelayedSprintItem(item)) {
    return "delayed";
  }

  if (item.status === "blocked") {
    return "blocked";
  }

  return "in_progress";
}

function formatSprintItemState(item: TaskReportRow, language: AppLanguage): string {
  const labels = {
    ar: {
      blocked: "محجوب",
      cancelled: "ملغي",
      delayed: "متأخر",
      done: "مكتمل",
      in_progress: "قيد التنفيذ"
    },
    en: {
      blocked: "Blocked",
      cancelled: "Cancelled",
      delayed: "Delayed",
      done: "Done",
      in_progress: "In Progress"
    }
  } as const;
  const stateKey = resolveSprintItemStateKey(item);

  return labels[language][stateKey as keyof (typeof labels)["en"]] ?? titleize(stateKey);
}

function isDelayedSprintItem(item: TaskReportRow): boolean {
  if (!item.dueDate || item.status === "completed" || item.status === "cancelled") {
    return false;
  }

  const dueTime = new Date(item.dueDate).getTime();

  return !Number.isNaN(dueTime) && dueTime < Date.now();
}

function formatActivityMessage(message: string, language: AppLanguage): string {
  if (language === "ar") {
    return message
      .replace(/المهام/g, "عناصر السبرنت")
      .replace(/المهمة/g, "عنصر السبرنت")
      .replace(/الطلبات/g, "عناصر السبرنت")
      .replace(/الطلب/g, "عنصر السبرنت");
  }

  return message
    .replace(/\brequests\b(?!-)/gi, "sprint items")
    .replace(/\brequest\b(?!-)/gi, "sprint item")
    .replace(/\btasks\b(?!-)/gi, "sprint items")
    .replace(/\btask\b(?!-)/gi, "sprint item");
}

function formatDateTime(value: string | undefined, language: AppLanguage): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat(language === "ar" ? "ar-LY" : "en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short"
  }).format(date);
}

function formatRelativeTime(value: string | undefined, language: AppLanguage): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  const diffMs = Date.now() - date.getTime();
  const absMinutes = Math.max(1, Math.round(Math.abs(diffMs) / 60_000));
  const isFuture = diffMs < 0;

  if (absMinutes < 60) {
    return formatRelativeUnit(absMinutes, language, isFuture, "m", "د");
  }

  const absHours = Math.round(absMinutes / 60);

  if (absHours < 24) {
    return formatRelativeUnit(absHours, language, isFuture, "h", "س");
  }

  const absDays = Math.round(absHours / 24);

  return formatRelativeUnit(absDays, language, isFuture, "d", "ي");
}

function formatRelativeUnit(
  value: number,
  language: AppLanguage,
  isFuture: boolean,
  englishUnit: string,
  arabicUnit: string
): string {
  if (language === "ar") {
    return isFuture ? `خلال ${value}${arabicUnit}` : `قبل ${value}${arabicUnit}`;
  }

  return isFuture ? `in ${value}${englishUnit}` : `${value}${englishUnit} ago`;
}

function resolveInitials(user: DashboardUserReference | undefined): string {
  const source = user?.fullName ?? user?.email ?? "-";
  const parts = source
    .replace(/@.*/, "")
    .split(/[\s._-]+/)
    .filter(Boolean);
  const initials = parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return initials.length > 0 ? initials : "-";
}

function titleize(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getEmptyStateText(
  area: "activity" | "focus" | "queue" | "sprintItems" | "team",
  language: AppLanguage
): string {
  if (language === "ar") {
    switch (area) {
      case "activity":
        return "لا توجد أنشطة حديثة.";
      case "focus":
        return "لا توجد عناصر سبرنت عاجلة الآن.";
      case "queue":
        return "لا توجد عناصر سبرنت نشطة الآن.";
      case "sprintItems":
        return "لا توجد عناصر سبرنت حديثة.";
      case "team":
        return "لا توجد أعباء عمل نشطة.";
    }
  }

  switch (area) {
    case "activity":
      return "No recent activity.";
    case "focus":
      return "No urgent items right now.";
    case "queue":
      return "No active sprint items right now.";
    case "sprintItems":
      return "No recent sprint items.";
    case "team":
      return "No active workload.";
  }
}
