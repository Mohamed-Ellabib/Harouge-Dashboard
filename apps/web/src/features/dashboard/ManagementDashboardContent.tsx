import {
  ArrowRight,
  Building2,
  ChevronDown,
  Code2,
  Database,
  FileText,
  Gauge,
  Grip,
  Landmark,
  Server,
  type LucideIcon
} from "lucide-react";
import {
  memo,
  useEffect,
  useMemo,
  useState,
  type CSSProperties
} from "react";
import { useNavigate } from "react-router-dom";

import {
  api,
  type ProjectProgressRecord,
  type Session,
  type SprintAreaKey,
  type TaskReportRow
} from "../../api/client";
import { useI18n } from "../../i18n";
import {
  getSprintAreaByCategory,
  sprintAreaDefinitions
} from "./sprintAreas";
import {
  getTaskModuleCatalog,
  subscribeToTaskModuleCatalogChanges,
  type TaskModuleDefinition
} from "./taskModules";

type ManagementDashboardState =
  | {
      isRefreshing: boolean;
      items: TaskReportRow[];
      message?: string;
      projectProgress?: ProjectProgressRecord;
      status: "ready";
    }
  | { message: string; status: "error" };

type SprintSummary = {
  areaKey: SprintAreaKey;
  completedCount: number;
  icon: LucideIcon;
  label: string;
  pendingCount: number;
  progress: number;
  tone: "blue" | "green" | "orange" | "purple";
};

type ModuleSummary = {
  hasChildren: boolean;
  icon: LucideIcon;
  id: string;
  indent: 0 | 1 | 2;
  label: string;
  meta?: string;
  moduleId?: string;
  parentId?: string;
  progress: number;
  rowType: "module" | "submodule" | "task";
  status?: TaskReportRow["status"];
  taskCode?: string;
};

function ManagementDashboardContentView({
  refreshSignal = 0,
  session
}: {
  refreshSignal?: number;
  session: Session;
}) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [state, setState] = useState<ManagementDashboardState>({
    isRefreshing: true,
    items: [],
    status: "ready"
  });
  const [catalogVersion, setCatalogVersion] = useState(0);
  const [expandedModuleIds, setExpandedModuleIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    let isMounted = true;

    setState((current) =>
      current.status === "ready"
        ? { ...current, isRefreshing: true, message: undefined }
        : { isRefreshing: true, items: [], status: "ready" }
    );

    api
      .getTaskReport({ limit: 100, sortBy: "lastProgressUpdateAt", sortOrder: "desc" })
      .then((taskResult) => {
        if (!isMounted) {
          return;
        }

        setState((current) => ({
          ...(current.status === "ready" ? current : {}),
          isRefreshing: false,
          items: taskResult.data,
          status: "ready"
        }));
      })
      .catch((error: unknown) => {
        if (!isMounted) {
          return;
        }

        setState((current) => ({
          ...(current.status === "ready"
            ? current
            : { items: [] as TaskReportRow[] }),
          isRefreshing: false,
          message:
            error instanceof Error
              ? error.message
              : "Management dashboard data could not be loaded.",
          status: "ready"
        }));
      });

    api
      .getProjectProgress()
      .then((projectProgress) => {
        if (!isMounted) {
          return;
        }

        setState((current) => ({
          ...(current.status === "ready"
            ? current
            : { isRefreshing: false, items: [] as TaskReportRow[], status: "ready" as const }),
          projectProgress
        }));
      })
      .catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, [refreshSignal]);

  useEffect(
    () => subscribeToTaskModuleCatalogChanges(() =>
      setCatalogVersion((current) => current + 1)
    ),
    []
  );

  const items = state.status === "ready" ? state.items : [];
  const projectProgress = state.status === "ready" ? state.projectProgress : undefined;
  const overallProgress = projectProgress?.percentage ?? calculateAverageProgress(items);
  const sprintSummaries = useMemo(
    () => buildSprintSummaries(items, t),
    [items, t]
  );
  const moduleCatalog = useMemo(() => getTaskModuleCatalog(), [catalogVersion]);
  const moduleRows = useMemo(() => buildModuleRows(items, moduleCatalog), [items, moduleCatalog]);
  const visibleModuleRows = useMemo(
    () =>
      moduleRows.filter((row) => {
        if (row.indent === 0) {
          return true;
        }

        if (row.rowType === "submodule") {
          return row.parentId ? expandedModuleIds.has(row.parentId) : false;
        }

        return Boolean(
          row.parentId &&
            row.moduleId &&
            expandedModuleIds.has(row.moduleId) &&
            expandedModuleIds.has(row.parentId)
        );
      }),
    [expandedModuleIds, moduleRows]
  );
  const progressStyle = {
    "--md-progress": `${overallProgress}%`
  } as CSSProperties;
  const sessionOwnerLabel = session.displayName || session.email;

  function toggleModuleRow(row: ModuleSummary) {
    if (!row.hasChildren) {
      return;
    }

    setExpandedModuleIds((current) => {
      const next = new Set(current);

      if (next.has(row.id)) {
        next.delete(row.id);

        if (row.rowType === "module") {
          for (const childRow of moduleRows) {
            if (childRow.moduleId === row.id) {
              next.delete(childRow.id);
            }
          }
        }
      } else {
        next.add(row.id);
      }

      return next;
    });
  }

  if (state.status === "error") {
    return (
      <section className="management-v2-page">
        <p className="dashboard-empty-state">{state.message}</p>
      </section>
    );
  }

  return (
    <section
      aria-label={`ERP management dashboard for ${sessionOwnerLabel}`}
      className="management-v2-page"
    >
      <section className="management-v2-sprints-grid" aria-label="Project and sprints">
        <article className="management-v2-sprint-card is-project-progress">
          <header>
            <span className="management-v2-sprint-icon">
              <Gauge size={27} strokeWidth={2.2} aria-hidden="true" />
            </span>
            <h3>Overall Project Progress</h3>
          </header>

          <div className="management-v2-sprint-ring" role="img" style={progressStyle}>
            <strong>{overallProgress}%</strong>
          </div>

          <p className="management-v2-project-caption">ERP project progress</p>
        </article>

        {sprintSummaries.map((sprint) => {
          const Icon = sprint.icon;
          const sprintStyle = {
            "--md-progress": `${sprint.progress}%`
          } as CSSProperties;

          return (
            <article className={`management-v2-sprint-card is-${sprint.tone}`} key={sprint.areaKey}>
              <header>
                <span className="management-v2-sprint-icon">
                  <Icon size={27} strokeWidth={2.2} aria-hidden="true" />
                </span>
                <h3>{sprint.label}</h3>
              </header>

              <div className="management-v2-sprint-ring" style={sprintStyle}>
                <strong>{sprint.progress}%</strong>
              </div>

              <dl>
                <div>
                  <dt>Completed</dt>
                  <dd className={sprint.completedCount === 0 ? "is-zero" : undefined}>
                    {sprint.completedCount}
                  </dd>
                </div>
                <div>
                  <dt>Pending</dt>
                  <dd>{sprint.pendingCount}</dd>
                </div>
              </dl>

              <button
                className="management-v2-sprint-open-button"
                onClick={() => navigate(`/sprints/${sprint.areaKey}`)}
                type="button"
              >
                Open
                <ArrowRight size={15} strokeWidth={2.45} aria-hidden="true" />
              </button>
            </article>
          );
        })}
      </section>

      <section className="management-v2-module-card" aria-label="Module progress">
        <header className="management-v2-module-header">
          <div>
            <span className="management-v2-module-heading-icon">
              <Grip size={18} strokeWidth={2.45} aria-hidden="true" />
            </span>
            <h2>Module Progress</h2>
          </div>
          {state.message ? (
            <p className="management-v2-inline-error">{state.message}</p>
          ) : null}
        </header>

        <div
          className="management-v2-module-tree is-module-catalog"
        >
          {visibleModuleRows.map((row) => {
            const Icon = row.icon;
            const rowStyle = {
              "--md-progress": `${row.progress}%`
            } as CSSProperties;
            const canToggle = row.hasChildren;
            const isExpanded = expandedModuleIds.has(row.id);

            return (
              <article
                className={`management-v2-module-row is-${row.rowType} is-indent-${row.indent}${
                  canToggle && !isExpanded ? " is-collapsed" : ""
                }${row.status ? ` is-status-${row.status}` : ""}`}
                key={row.id}
                style={rowStyle}
              >
                {canToggle ? (
                  <button
                    aria-expanded={isExpanded}
                    aria-label={`${isExpanded ? "Collapse" : "Expand"} ${row.label}`}
                    className="management-v2-module-toggle"
                    onClick={() => toggleModuleRow(row)}
                    type="button"
                  >
                    <ChevronDown size={18} strokeWidth={2.7} />
                  </button>
                ) : (
                  <span className="management-v2-module-toggle" aria-hidden="true" />
                )}
                <span className="management-v2-module-icon">
                  <Icon size={22} strokeWidth={2.15} aria-hidden="true" />
                </span>
                {row.rowType === "task" ? (
                  <>
                    <span className="management-v2-module-task-copy">
                      <span className="management-v2-module-task-code">{row.taskCode}</span>
                      <strong>{row.label}</strong>
                      <small>{row.meta}</small>
                    </span>
                    <span className="management-v2-module-task-progress">
                      <b>{row.progress}%</b>
                      <i aria-hidden="true">
                        <span />
                      </i>
                    </span>
                  </>
                ) : (
                  <>
                    <strong>{row.label}</strong>
                    <span className="management-v2-module-mini-ring">
                      <b>{row.progress}%</b>
                    </span>
                  </>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </section>
  );
}

export const ManagementDashboardContent = memo(ManagementDashboardContentView);

function buildSprintSummaries(
  items: TaskReportRow[],
  t: (key: string) => string
): SprintSummary[] {
  return sprintAreaDefinitions.map((area) => {
    const areaItems = filterItemsBySprintArea(items, area.key);
    const completedCount = areaItems.filter((item) => item.status === "completed").length;
    const pendingCount = areaItems.filter((item) => !["completed", "cancelled"].includes(item.status)).length;
    const progress = calculateAverageProgress(areaItems);

    return {
      areaKey: area.key,
      completedCount,
      icon: getSprintIcon(area.key),
      label: t(area.labelKey),
      pendingCount,
      progress,
      tone: area.tone
    };
  });
}

function buildModuleRows(
  items: TaskReportRow[],
  catalog: TaskModuleDefinition[]
): ModuleSummary[] {
  const catalogByName = new Map(catalog.map((module) => [module.name, module]));

  for (const item of items) {
    const mainModule = item.mainModule?.trim();

    if (mainModule && !catalogByName.has(mainModule)) {
      catalogByName.set(mainModule, {
        name: mainModule,
        subModules: []
      });
    }
  }

  return [...catalogByName.values()]
    .sort((left, right) => left.name.localeCompare(right.name))
    .flatMap((module) => {
      const moduleItems = items.filter((item) => item.mainModule?.trim() === module.name);
      const taskSubModules = moduleItems
        .map((item) => item.subModule?.trim())
        .filter((value): value is string => Boolean(value));
      const subModules = uniqueStrings([...module.subModules, ...taskSubModules])
        .sort((left, right) => left.localeCompare(right));
      const moduleId = `module:${module.name}`;

      return [
        {
          hasChildren: subModules.length > 0,
          icon: Landmark,
          id: moduleId,
          indent: 0 as const,
          label: module.name,
          progress: calculateAverageProgress(moduleItems),
          rowType: "module" as const
        },
        ...subModules.flatMap((subModule) => {
          const subModuleItems = moduleItems.filter((item) => item.subModule?.trim() === subModule);
          const subModuleId = `${moduleId}:sub:${subModule}`;

          return [
            {
              hasChildren: subModuleItems.length > 0,
              icon: FileText,
              id: subModuleId,
              indent: 1 as const,
              label: subModule,
              moduleId,
              parentId: moduleId,
              progress: calculateAverageProgress(subModuleItems),
              rowType: "submodule" as const
            },
            ...subModuleItems
              .sort((left, right) => left.taskCode.localeCompare(right.taskCode))
              .map((item) => ({
                hasChildren: false,
                icon: FileText,
                id: `${subModuleId}:task:${item.id}`,
                indent: 2 as const,
                label: item.title,
                meta: `${resolveSprintLabel(item)} | ${formatStatusLabel(item.status)}`,
                moduleId,
                parentId: subModuleId,
                progress: item.progress,
                rowType: "task" as const,
                status: item.status,
                taskCode: item.taskCode
              }))
          ];
        })
      ];
    });
}

function getSprintIcon(areaKey: SprintAreaKey): LucideIcon {
  const icons: Record<SprintAreaKey, LucideIcon> = {
    development: Code2,
    facility: Building2,
    infrastructure: Server,
    master_data_collection: Database
  };

  return icons[areaKey];
}

function filterItemsBySprintArea(items: TaskReportRow[], areaKey: SprintAreaKey): TaskReportRow[] {
  return items.filter((item) => getSprintAreaByCategory(item.category)?.key === areaKey);
}

function calculateAverageProgress(items: TaskReportRow[]): number {
  if (items.length === 0) {
    return 0;
  }

  return Math.round(items.reduce((sum, item) => sum + item.progress, 0) / items.length);
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function resolveSprintLabel(item: TaskReportRow): string {
  const area = getSprintAreaByCategory(item.category);
  const definition = area
    ? sprintAreaDefinitions.find((sprintArea) => sprintArea.key === area.key)
    : undefined;

  if (!definition) {
    return "Unassigned";
  }

  switch (definition.key) {
    case "facility":
      return "Facilities";
    case "infrastructure":
      return "Infrastructure";
    case "master_data_collection":
      return "Master Data Collection";
    default:
      return "Development";
  }
}

function formatStatusLabel(status: string): string {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
