import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Calculator,
  Check,
  CalendarClock,
  CalendarDays,
  Gauge,
  History,
  Info,
  PencilLine,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  UserRound
} from "lucide-react";
import {
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent
} from "react";
import { useNavigate } from "react-router-dom";

import {
  api,
  type ProjectProgressRecord,
  type ProjectProgressTimelineStage,
  type ProjectProgressTimelineStageStatus,
  type ModuleProgressRecord,
  type TaskReportRow,
  type Session
} from "../../api/client";
import { ModuleProgressEditor } from "./ModuleProgressEditor";
import { loadProgressTasks, mergeProgressCatalog, moduleProgressKey } from "./moduleProgress";
import { getTaskModuleCatalog, subscribeToTaskModuleCatalogChanges } from "./taskModules";
import { sprintAreaDefinitions } from "./sprintAreas";
import { useI18n } from "../../i18n";
import type { AppLanguage } from "../../i18n/locale";

type ProjectProgressState =
  | {
      history: ProjectProgressHistoryItem[];
      projectProgress: ProjectProgressRecord;
      status: "ready";
    }
  | { message: string; status: "error" }
  | { status: "loading" };

type ProjectProgressHistoryItem = {
  dateTime: string;
  id: string;
  note: string;
  percentage: number;
  updatedBy: string;
};

const defaultTimelineStages: ProjectProgressTimelineStage[] = [
  { date: "2026-01-10", id: "initiation", label: "Initiation", status: "done" },
  { date: "2026-02-20", id: "planning", label: "Planning", status: "done" },
  { date: "2026-05-15", id: "execution", label: "Execution", status: "active" },
  { date: "2026-08-10", id: "testing", label: "Testing", status: "future" },
  { date: "2026-10-30", id: "go-live", label: "Go-Live", status: "future" }
];

function ProjectProgressContentView({
  refreshSignal = 0,
  session
}: {
  refreshSignal?: number;
  session: Session;
}) {
  const { language, t } = useI18n();
  const navigate = useNavigate();
  const text = copy[language];
  const timelineText = timelineCopy[language];
  const [state, setState] = useState<ProjectProgressState>({ status: "loading" });
  const [percentage, setPercentage] = useState(0);
  const [sprintPercentages, setSprintPercentages] = useState<ProjectProgressRecord["sprintPercentages"]>({ development: 0, facility: 0, infrastructure: 0, master_data_collection: 0 });
  const [modulePercentages, setModulePercentages] = useState<ModuleProgressRecord[]>([]);
  const [moduleItems, setModuleItems] = useState<TaskReportRow[]>([]);
  const [moduleCatalog, setModuleCatalog] = useState(getTaskModuleCatalog);
  useEffect(() => subscribeToTaskModuleCatalogChanges(() => setModuleCatalog(getTaskModuleCatalog())), []);
  const modules = useMemo(() => mergeProgressCatalog(moduleCatalog, moduleItems, modulePercentages), [moduleCatalog, moduleItems, modulePercentages]);
  const [note, setNote] = useState("");
  const [timelineStages, setTimelineStages] = useState<ProjectProgressTimelineStage[]>(
    defaultTimelineStages
  );
  const hasUnsavedChanges = useRef(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");
  const canEdit = session.roleCode === "super_admin" || session.roleCode === "it_manager";

  useEffect(() => {
    let isMounted = true;

    setState((current) => (current.status === "ready" ? current : { status: "loading" }));

    Promise.all([api.getProjectProgress(), loadProgressTasks()])
      .then(([projectProgress, items]) => {
        if (!isMounted) {
          return;
        }

        setModuleItems(items);
        const history = buildProjectProgressHistory(projectProgress, text.notRecorded);

        setState({ history, projectProgress, status: "ready" });
        if (hasUnsavedChanges.current) return;
        setPercentage(projectProgress.percentage);
        setSprintPercentages(projectProgress.sprintPercentages);
      setModulePercentages(projectProgress.modulePercentages ?? []);
        setNote(projectProgress.note ?? "");
        setTimelineStages(resolveTimelineStages(projectProgress));
      })
      .catch((error: unknown) => {
        if (!isMounted) {
          return;
        }

        setState({
          message: error instanceof Error ? error.message : text.loadError,
          status: "error"
        });
      });

    return () => {
      isMounted = false;
    };
  }, [refreshSignal, text.loadError, text.notRecorded]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canEdit || isSaving) {
      return;
    }

    setIsSaving(true);
    setSaveError("");
    setSaveSuccess("");

    try {
      const nextTimelineStages = normalizeTimelineStages(timelineStages);

      if (nextTimelineStages.length === 0) {
        setSaveError(timelineText.timelineRequired);
        return;
      }

      const projectProgress = await api.updateProjectProgress({
        note,
        percentage,
        sprintPercentages,
        modulePercentages: modules.flatMap((module) => [undefined, ...module.subModules].map((subModule) => ({
          module: module.name,
          ...(subModule ? { subModule } : {}),
          percentage: modulePercentages.find((entry) => moduleProgressKey(entry.module, entry.subModule) === moduleProgressKey(module.name, subModule))?.percentage ?? 0
        }))),
        timelineStages: nextTimelineStages
      });
      const history = buildProjectProgressHistory(projectProgress, text.notRecorded);

      hasUnsavedChanges.current = false;
      setState({ history, projectProgress, status: "ready" });
      setPercentage(projectProgress.percentage);
      setSprintPercentages(projectProgress.sprintPercentages);
      setModulePercentages(projectProgress.modulePercentages ?? []);
      setNote(projectProgress.note ?? "");
      setTimelineStages(resolveTimelineStages(projectProgress));
      setSaveSuccess(text.saved);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : text.saveError);
    } finally {
      setIsSaving(false);
    }
  }

  function updateTimelineStage(
    id: string,
    field: keyof Omit<ProjectProgressTimelineStage, "id">,
    value: string
  ) {
    setTimelineStages((currentStages) =>
      currentStages.map((stage) =>
        stage.id === id
          ? {
              ...stage,
              [field]:
                field === "status" ? (value as ProjectProgressTimelineStageStatus) : value
            }
          : stage
      )
    );
    setSaveSuccess("");
  }

  function addTimelineStage() {
    hasUnsavedChanges.current = true;
    setTimelineStages((currentStages) => [...currentStages, createTimelineStage()]);
    setSaveSuccess("");
  }

  function removeTimelineStage(id: string) {
    hasUnsavedChanges.current = true;
    setTimelineStages((currentStages) =>
      currentStages.length <= 1 ? currentStages : currentStages.filter((stage) => stage.id !== id)
    );
    setSaveSuccess("");
  }

  function moveTimelineStage(id: string, direction: -1 | 1) {
    hasUnsavedChanges.current = true;
    setTimelineStages((currentStages) => {
      const currentIndex = currentStages.findIndex((stage) => stage.id === id);
      const nextIndex = currentIndex + direction;

      if (currentIndex < 0 || nextIndex < 0 || nextIndex >= currentStages.length) {
        return currentStages;
      }

      const nextStages = [...currentStages];
      const [stage] = nextStages.splice(currentIndex, 1);

      if (!stage) {
        return currentStages;
      }

      nextStages.splice(nextIndex, 0, stage);

      return nextStages;
    });
    setSaveSuccess("");
  }

  const currentProgress = state.status === "ready" ? state.projectProgress : undefined;
  const history = state.status === "ready" ? state.history : [];
  const progressStyle = useMemo(
    () =>
      ({
        "--progress": `${percentage}%`
      }) as CSSProperties,
    [percentage]
  );

  return (
    <section className="project-progress-page">
      <section className="project-progress-title-card">
        <div>
          <span className="project-progress-title-icon">
            <Gauge size={22} strokeWidth={2.25} aria-hidden="true" />
          </span>
          <div>
            <h2>{text.title}</h2>
            <p>{text.subtitle}</p>
          </div>
        </div>
        <button className="project-progress-back-button" onClick={() => navigate("/dashboard")} type="button">
          <ArrowLeft size={17} strokeWidth={2.35} aria-hidden="true" />
          {text.back}
        </button>
      </section>

      {state.status === "error" ? (
        <section className="project-progress-card">
          <p className="dashboard-empty-state">{state.message}</p>
        </section>
      ) : (
        <form className="project-progress-form" onSubmit={handleSubmit} onChange={() => { hasUnsavedChanges.current = true; }}>
          <section className="project-progress-overview-card">
            <div className="project-progress-overview-ring" style={progressStyle}>
              <strong>{percentage}%</strong>
              <span>{text.overallProgress}</span>
            </div>
            <ProjectProgressSummaryItem
              icon={Calculator}
              label={text.sprintAreas}
              value={String(sprintAreaDefinitions.length)}
            />
            <ProjectProgressSummaryItem
              icon={CalendarDays}
              label={text.lastUpdated}
              value={formatProjectProgressUpdate(currentProgress, language)}
            />
            <ProjectProgressSummaryItem
              icon={UserRound}
              label={text.updatedBy}
              value={currentProgress?.updatedBy?.fullName ?? text.notSet}
            />
          </section>

          <section className="project-progress-edit-row">
            <section className="project-progress-edit-panel">
              <header>
                <PencilLine size={18} strokeWidth={2.25} aria-hidden="true" />
                <h3>{text.editTitle}</h3>
              </header>
              <label className="project-progress-slider-field">
                <span>{text.percentageLabel}</span>
                <div className="project-progress-slider-row">
                  <div className="project-progress-range-wrap">
                    <input
                      disabled={!canEdit || isSaving || state.status === "loading"}
                      max={100}
                      min={0}
                      onChange={(event) => {
                        setPercentage(Number(event.target.value));
                        setSaveSuccess("");
                      }}
                      step={1}
                      aria-label={text.overallProgress}
                      type="range"
                      value={percentage}
                    />
                    <div className="project-progress-range-labels">
                      <span>0%</span>
                      <span style={{ insetInlineStart: `${percentage}%` }}>{percentage}%</span>
                      <span>100%</span>
                    </div>
                  </div>
                  <div className="project-progress-number-shell">
                    <input
                      disabled={!canEdit || isSaving || state.status === "loading"}
                      max={100}
                      min={0}
                      onChange={(event) => {
                        const nextValue = Number(event.target.value);
                        setPercentage(
                          Number.isNaN(nextValue)
                            ? 0
                            : Math.min(100, Math.max(0, nextValue))
                        );
                        setSaveSuccess("");
                      }}
                      aria-label={text.percentageLabel}
                      step={1}
                      required
                      type="number"
                      value={percentage}
                    />
                    <span>%</span>
                  </div>
                </div>
              </label>
              <label className="project-progress-note-field">
                <span>{text.noteLabel}</span>
                <textarea
                  disabled={!canEdit || isSaving || state.status === "loading"}
                  maxLength={500}
                  onChange={(event) => {
                    setNote(event.target.value);
                    setSaveSuccess("");
                  }}
                  placeholder={text.notePlaceholder}
                  value={note}
                />
                <small>{note.length} / 500</small>
              </label>
              {saveError ? <p className="project-progress-error">{saveError}</p> : null}
              {saveSuccess ? <p className="project-progress-success">{saveSuccess}</p> : null}
            </section>

            <aside className="project-progress-about-card">
              <div className="project-progress-about-main">
                <span>
                  <Info size={18} strokeWidth={2.3} aria-hidden="true" />
                </span>
                <div>
                  <h3>{text.aboutTitle}</h3>
                  <p>{canEdit ? text.policyAdmin : text.policyReadonly}</p>
                </div>
              </div>
              <div className="project-progress-about-audit">
                <span>
                  <ShieldCheck size={18} strokeWidth={2.25} aria-hidden="true" />
                </span>
                <p>{text.audit}</p>
              </div>
            </aside>
          </section>

          <section className="project-progress-sprints-panel">
            <header>
              <div>
                <h3>{language === "ar" ? "تقدم السبرنتات" : "Sprint Progress"}</h3>
                <p>{language === "ar" ? "تظهر القيم المحفوظة في لوحة لجنة الإدارة." : "Set each sprint percentage. Saved values also appear in the Management Committee overview."}</p>
              </div>
            </header>
            <div className="project-progress-sprints-grid">
              {sprintAreaDefinitions.map((area) => {
                const Icon = area.icon;
                const value = sprintPercentages[area.key];
                const label = t(area.labelKey);
                return (
                  <article className={`project-progress-sprint-editor is-${area.tone}`} key={area.key}>
                    <header><span><Icon size={19} aria-hidden="true" /></span><h4>{label}</h4><strong>{value}%</strong></header>
                    <div className="project-progress-sprint-track" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}>
                      <span style={{ width: `${value}%` }} />
                    </div>
                    <div className="project-progress-sprint-controls">
                      <input aria-label={`${label} ${language === "ar" ? "شريط النسبة" : "slider"}`} type="range" min={0} max={100} step={1} value={value}
                        disabled={!canEdit || isSaving || state.status === "loading"}
                        onChange={(event) => { setSprintPercentages((current) => ({ ...current, [area.key]: Number(event.target.value) })); setSaveSuccess(""); }} />
                      <div className="project-progress-number-shell">
                        <input aria-label={`${label} ${language === "ar" ? "النسبة المئوية" : "percentage"}`} type="number" min={0} max={100} step={1} required value={value}
                          disabled={!canEdit || isSaving || state.status === "loading"}
                          onChange={(event) => { setSprintPercentages((current) => ({ ...current, [area.key]: Math.min(100, Math.max(0, Number(event.target.value))) })); setSaveSuccess(""); }} />
                        <span>%</span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <ModuleProgressEditor
            modules={modules}
            percentages={modulePercentages}
            disabled={!canEdit || isSaving || state.status === "loading"}
            language={language}
            onChange={(module, subModule, value) => {
              hasUnsavedChanges.current = true;
              setSaveSuccess("");
              setModulePercentages((current) => [
                ...current.filter((entry) => moduleProgressKey(entry.module, entry.subModule) !== moduleProgressKey(module, subModule)),
                { module, ...(subModule ? { subModule } : {}), percentage: value }
              ]);
            }}
          />

          <ProjectProgressTimelineEditor
            canEdit={canEdit}
            disabled={!canEdit || isSaving || state.status === "loading"}
            onAdd={addTimelineStage}
            onMove={moveTimelineStage}
            onRemove={removeTimelineStage}
            onUpdate={updateTimelineStage}
            stages={timelineStages}
            text={timelineText}
          />

          <section className="project-progress-history-card">
            <header>
              <History size={18} strokeWidth={2.25} aria-hidden="true" />
              <h3>{text.historyTitle}</h3>
            </header>
            <div className="project-progress-history-table-wrap">
              <table className="project-progress-history-table">
                <thead>
                  <tr>
                    <th>{text.historyDate}</th>
                    <th>{text.historyProgress}</th>
                    <th>{text.historyUpdatedBy}</th>
                    <th>{text.historyNote}</th>
                  </tr>
                </thead>
                <tbody>
                  {history.length > 0 ? (
                    history.map((item) => (
                      <tr key={item.id}>
                        <td>{formatHistoryDate(item.dateTime, language)}</td>
                        <td>{item.percentage}%</td>
                        <td>{item.updatedBy}</td>
                        <td>{item.note}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4}>{text.noHistory}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <button type="button" onClick={() => navigate("/audit-logs?entityType=project_progress")}>
              {text.viewHistory}
              <ArrowRight size={15} strokeWidth={2.35} aria-hidden="true" />
            </button>
          </section>

          <footer className="project-progress-footer">
            <button type="button" onClick={() => navigate("/dashboard")}>
              {text.cancel}
            </button>
            <button disabled={!canEdit || isSaving || state.status === "loading"} type="submit">
              <Save size={17} strokeWidth={2.25} aria-hidden="true" />
              {isSaving ? text.saving : text.save}
            </button>
          </footer>
        </form>
      )}
    </section>
  );
}

export const ProjectProgressContent = memo(ProjectProgressContentView);

function ProjectProgressSummaryItem({
  icon: Icon,
  label,
  value
}: {
  icon: typeof Calculator;
  label: string;
  value: string;
}) {
  return (
    <article className="project-progress-summary-item">
      <span>
        <Icon size={20} strokeWidth={2.25} aria-hidden="true" />
      </span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

function ProjectProgressTimelineEditor({
  canEdit,
  disabled,
  onAdd,
  onMove,
  onRemove,
  onUpdate,
  stages,
  text
}: {
  canEdit: boolean;
  disabled: boolean;
  onAdd: () => void;
  onMove: (id: string, direction: -1 | 1) => void;
  onRemove: (id: string) => void;
  onUpdate: (
    id: string,
    field: keyof Omit<ProjectProgressTimelineStage, "id">,
    value: string
  ) => void;
  stages: ProjectProgressTimelineStage[];
  text: (typeof timelineCopy)["en"];
}) {
  return (
    <section className="project-progress-timeline-panel">
      <header>
        <span>
          <CalendarClock size={18} strokeWidth={2.25} aria-hidden="true" />
        </span>
        <div>
          <h3>{text.timelineTitle}</h3>
          <p>{text.timelineSubtitle}</p>
        </div>
        <button disabled={!canEdit || stages.length >= 10} onClick={onAdd} type="button">
          <Plus size={16} strokeWidth={2.35} aria-hidden="true" />
          {text.timelineAdd}
        </button>
      </header>

      <div className="project-progress-timeline-stage-list">
        {stages.map((stage, index) => (
          <article className="project-progress-timeline-stage-row" key={stage.id}>
            <span className={`project-progress-timeline-dot is-${stage.status}`}>
              {stage.status === "done" ? (
                <Check size={15} strokeWidth={3} aria-hidden="true" />
              ) : (
                index + 1
              )}
            </span>

            <label>
              <span>{text.timelineStageLabel}</span>
              <input
                disabled={disabled}
                maxLength={80}
                onChange={(event) => onUpdate(stage.id, "label", event.target.value)}
                value={stage.label}
              />
            </label>

            <label>
              <span>{text.timelineDateLabel}</span>
              <input
                disabled={disabled}
                onChange={(event) => onUpdate(stage.id, "date", event.target.value)}
                type="date"
                value={stage.date}
              />
            </label>

            <label>
              <span>{text.timelineStatusLabel}</span>
              <select
                disabled={disabled}
                onChange={(event) => onUpdate(stage.id, "status", event.target.value)}
                value={stage.status}
              >
                <option value="done">{text.timelineDone}</option>
                <option value="active">{text.timelineActive}</option>
                <option value="future">{text.timelineFuture}</option>
              </select>
            </label>

            <div className="project-progress-timeline-actions">
              <button
                aria-label={text.timelineMoveUp}
                disabled={disabled || index === 0}
                onClick={() => onMove(stage.id, -1)}
                type="button"
              >
                <ArrowUp size={15} strokeWidth={2.3} aria-hidden="true" />
              </button>
              <button
                aria-label={text.timelineMoveDown}
                disabled={disabled || index === stages.length - 1}
                onClick={() => onMove(stage.id, 1)}
                type="button"
              >
                <ArrowDown size={15} strokeWidth={2.3} aria-hidden="true" />
              </button>
              <button
                aria-label={text.timelineRemove}
                disabled={disabled || stages.length <= 1}
                onClick={() => onRemove(stage.id)}
                type="button"
              >
                <Trash2 size={15} strokeWidth={2.3} aria-hidden="true" />
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function buildProjectProgressHistory(
  projectProgress: ProjectProgressRecord,
  notRecorded: string
): ProjectProgressHistoryItem[] {
  const history = projectProgress.history.map((item) => ({
    dateTime: item.createdAt ?? "",
    id: item.id,
    note: item.note ?? notRecorded,
    percentage: item.percentage,
    updatedBy: item.updatedBy?.fullName ?? notRecorded
  }));

  if (history.length > 0) {
    return history;
  }

  return [buildHistoryItemFromProgress(projectProgress, notRecorded)];
}

function buildHistoryItemFromProgress(
  projectProgress: ProjectProgressRecord,
  notRecorded: string
): ProjectProgressHistoryItem {
  return {
    dateTime: projectProgress.updatedAt ?? projectProgress.createdAt ?? "",
    id: projectProgress.id,
    note: projectProgress.note ?? notRecorded,
    percentage: projectProgress.percentage,
    updatedBy: projectProgress.updatedBy?.fullName ?? notRecorded
  };
}

function resolveTimelineStages(projectProgress: ProjectProgressRecord): ProjectProgressTimelineStage[] {
  return projectProgress.timelineStages.length > 0
    ? projectProgress.timelineStages
    : defaultTimelineStages;
}

function normalizeTimelineStages(
  stages: ProjectProgressTimelineStage[]
): ProjectProgressTimelineStage[] {
  return stages
    .map((stage) => ({
      date: stage.date.trim(),
      id: stage.id,
      label: stage.label.trim(),
      status: stage.status
    }))
    .filter((stage) => stage.label.length > 0 && stage.date.length > 0);
}

function createTimelineStage(): ProjectProgressTimelineStage {
  const date = new Date().toISOString().slice(0, 10);
  const id = `stage-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return {
    date,
    id,
    label: "New Stage",
    status: "future"
  };
}

function formatProjectProgressUpdate(
  projectProgress: ProjectProgressRecord | undefined,
  language: AppLanguage
): string {
  return formatDateTime(
    projectProgress?.updatedAt ?? projectProgress?.createdAt,
    language,
    language === "ar" ? "غير محدد" : "Not set"
  );
}

function formatHistoryDate(value: string, language: AppLanguage): string {
  return formatDateTime(value, language, "-");
}

function formatDateTime(
  value: string | undefined,
  language: AppLanguage,
  fallback: string
): string {
  if (!value) {
    return fallback;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return new Intl.DateTimeFormat(language === "ar" ? "ar-LY" : "en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "long",
    year: "numeric"
  }).format(date);
}

const timelineCopy = {
  ar: {
    timelineActive: "Active",
    timelineAdd: "Add stage",
    timelineDateLabel: "Date",
    timelineDone: "Done",
    timelineFuture: "Future",
    timelineMoveDown: "Move stage down",
    timelineMoveUp: "Move stage up",
    timelineRemove: "Remove stage",
    timelineRequired: "At least one stage with a name and date is required.",
    timelineStageLabel: "Stage",
    timelineStatusLabel: "State",
    timelineSubtitle: "Customize the stages and dates shown on the management dashboard progress line.",
    timelineTitle: "Project Timeline"
  },
  en: {
    timelineActive: "Active",
    timelineAdd: "Add stage",
    timelineDateLabel: "Date",
    timelineDone: "Done",
    timelineFuture: "Future",
    timelineMoveDown: "Move stage down",
    timelineMoveUp: "Move stage up",
    timelineRemove: "Remove stage",
    timelineRequired: "At least one stage with a name and date is required.",
    timelineStageLabel: "Stage",
    timelineStatusLabel: "State",
    timelineSubtitle: "Customize the stages and dates shown on the management dashboard progress line.",
    timelineTitle: "Project Timeline"
  }
} as const;

const copy = {
  ar: {
    aboutTitle: "حول التقدم العام",
    audit: "كل تغيير يتم تسجيله في سجل التدقيق.",
    back: "العودة إلى لوحة التحكم",
    cancel: "إلغاء",
    editTitle: "تعديل التقدم العام",
    historyDate: "التاريخ والوقت",
    historyNote: "الملاحظة أو التقرير",
    historyProgress: "التقدم",
    historyTitle: "ملاحظات وتقارير التقدم",
    historyUpdatedBy: "تم التحديث بواسطة",
    lastUpdated: "آخر تحديث",
    loadError: "تعذر تحميل تقدم المشروع العام.",
    noHistory: "لا توجد ملاحظات تقدم مسجلة بعد.",
    notRecorded: "غير مسجل",
    notSet: "غير محدد",
    noteLabel: "ملاحظة أو تقرير التقدم",
    notePlaceholder: "اكتب ملاحظة أو تقريراً قصيراً عن تقدم المشروع العام...",
    overallProgress: "التقدم العام",
    percentageLabel: "نسبة التقدم الحالية",
    policyAdmin: "راجع تقدم المشروع والسبرنتات. تظهر التحديثات المحفوظة في لوحات المتابعة.",
    policyReadonly: "هذه النسبة للعرض فقط. التعديل متاح للمديرين فقط.",
    save: "حفظ التقدم",
    saveError: "تعذر حفظ تقدم المشروع العام.",
    saved: "تم حفظ تقدم المشروع والسبرنتات.",
    saving: "جار الحفظ...",
    sprintAreas: "مجالات السبرنت",
    subtitle: "تابع تقدم المشروع وجميع السبرنتات في مكان واحد.",
    title: "تقدم المشروع العام",
    updatedBy: "تم التحديث بواسطة",
    viewHistory: "عرض كل السجل"
  },
  en: {
    aboutTitle: "About Overall Progress",
    audit: "Every change is recorded in the audit logs.",
    back: "Back to Dashboard",
    cancel: "Cancel",
    editTitle: "Edit Overall Progress",
    historyDate: "Date & Time",
    historyNote: "Note or Report",
    historyProgress: "Progress",
    historyTitle: "Progress Notes & Reports",
    historyUpdatedBy: "Updated By",
    lastUpdated: "Last Updated",
    loadError: "Overall project progress could not be loaded.",
    noHistory: "No progress notes or reports recorded yet.",
    notRecorded: "Not recorded",
    notSet: "Not set",
    noteLabel: "Progress Note or Report",
    notePlaceholder: "Write a short note or report about the overall project progress...",
    overallProgress: "Overall Progress",
    percentageLabel: "Current Progress Percentage",
    policyAdmin: "Review project and sprint progress together. Saved updates appear across the dashboards.",
    policyReadonly: "This percentage is read-only for your account. Editing is restricted to admins.",
    save: "Save Progress",
    saveError: "Overall project progress could not be saved.",
    saved: "Overall and sprint progress saved. Dashboard values are up to date.",
    saving: "Saving...",
    sprintAreas: "Sprint Areas",
    subtitle: "Track overall project progress and all sprint areas in one place.",
    title: "Overall Project Progress",
    updatedBy: "Updated By",
    viewHistory: "View all history"
  }
} as const;
