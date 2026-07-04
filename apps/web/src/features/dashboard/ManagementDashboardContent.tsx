import {
  Activity,
  ArrowRight,
  Building2,
  ChartColumn,
  ChevronDown,
  ClipboardCheck,
  Code2,
  Database,
  Flag,
  Grip,
  ShieldCheck,
  Target,
  TrendingUp,
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
  weight: number;
};

type SprintAreaWeights = {
  development: number;
  facility: number;
  infrastructure: number;
  master_data_collection: number;
};

const defaultSprintAreaWeights: SprintAreaWeights = {
  development: 40,
  facility: 10,
  infrastructure: 20,
  master_data_collection: 30
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
          .getTaskReport({ limit: 100 })
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
  const sprintAreaWeights = projectProgress?.areaWeights ?? defaultSprintAreaWeights;
  const sprintSummaries = useMemo(
    () => buildSprintSummaries(items, t, sprintAreaWeights),
    [items, t, sprintAreaWeights]
  );
  const overallProgress = useMemo(
    () => calculateWeightedOverallProgress(sprintSummaries),
    [sprintSummaries]
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
      className="management-v2-page management-v2-restyled"
    >
      <section className="management-v2-sprints-grid" aria-label="Project and sprints">
        <article className="management-v2-sprint-card is-project-progress">
          <header>
            <span className="management-v2-sprint-icon">
              <Target size={27} strokeWidth={2.2} aria-hidden="true" />
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
                <div>
                  <dt>Target</dt>
                  <dd>{sprint.weight}%</dd>
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
            const miniBars = buildMiniChartHeights(row.progress);

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
                    <span
                      aria-label={`${row.label} progress ${row.progress}%`}
                      className="management-v2-module-chart"
                      role="img"
                    >
                      <span className="management-v2-module-chart-bars" aria-hidden="true">
                        {miniBars.map((height, index) => (
                          <span
                            key={`${row.id}-bar-${index}`}
                            style={{ "--bar-height": `${height}%` } as CSSProperties}
                          />
                        ))}
                      </span>
                      <span className="management-v2-module-chart-line" aria-hidden="true">
                        <span />
                      </span>
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
  t: (key: string) => string,
  weights: SprintAreaWeights
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
      tone: area.tone,
      weight: weights[area.key]
    };
  });
}

function calculateWeightedOverallProgress(summaries: SprintSummary[]): number {
  if (summaries.length === 0) {
    return 0;
  }

  const weighted = summaries.reduce(
    (sum, summary) => sum + (summary.progress * summary.weight) / 100,
    0
  );

  return Math.round(weighted);
}

function buildModuleRows(
  items: TaskReportRow[],
  catalog: TaskModuleDefinition[]
): ModuleSummary[] {
  const catalogByName = new Map(catalog.map((module) => [module.name, module]));
  const moduleOrderFromItems: string[] = [];
  const seenModuleNames = new Set<string>();

  for (const item of items) {
    const mainModule = item.mainModule?.trim();

    if (!mainModule) {
      continue;
    }

    if (!seenModuleNames.has(mainModule)) {
      seenModuleNames.add(mainModule);
      moduleOrderFromItems.push(mainModule);
    }

    if (!catalogByName.has(mainModule)) {
      catalogByName.set(mainModule, {
        name: mainModule,
        subModules: []
      });
    }
  }

  const catalogOnlyModuleNames = catalog
    .map((module) => module.name)
    .filter((name) => !seenModuleNames.has(name));
  const orderedModuleNames = [...moduleOrderFromItems, ...catalogOnlyModuleNames];

  return orderedModuleNames.flatMap((moduleName) => {
    const module = catalogByName.get(moduleName);

    if (!module) {
      return [];
    }

    const moduleItems = items.filter((item) => item.mainModule?.trim() === module.name);
    const taskSubModules = moduleItems
      .map((item) => item.subModule?.trim())
      .filter((value): value is string => Boolean(value));
    const subModules = [
      ...uniqueStrings(taskSubModules),
      ...module.subModules.filter((name) => !taskSubModules.includes(name))
    ];
    const moduleId = `module:${module.name}`;

    return [
      {
        hasChildren: subModules.length > 0,
        icon: ChartColumn,
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
            icon: Activity,
            id: subModuleId,
            indent: 1 as const,
            label: subModule,
            moduleId,
            parentId: moduleId,
            progress: calculateAverageProgress(subModuleItems),
            rowType: "submodule" as const
          },
          ...subModuleItems.map((item) => ({
            hasChildren: false,
            icon: ClipboardCheck,
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
    facility: Flag,
    infrastructure: ShieldCheck,
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

function buildMiniChartHeights(progress: number): number[] {
  const clamped = Math.min(100, Math.max(0, progress));
  const multipliers = [0.44, 0.58, 0.72, 0.86, 1];

  return multipliers.map((factor) => Math.max(12, Math.round(clamped * factor)));
}
