import {
  ArrowLeft,
  ArrowRight,
  Calculator,
  CalendarDays,
  Gauge,
  History,
  Info,
  PencilLine,
  Save,
  ShieldCheck,
  UserRound
} from "lucide-react";
import {
  memo,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type FormEvent
} from "react";
import { useNavigate } from "react-router-dom";

import { api, type ProjectProgressRecord, type Session } from "../../api/client";
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

function ProjectProgressContentView({
  refreshSignal = 0,
  session
}: {
  refreshSignal?: number;
  session: Session;
}) {
  const { language } = useI18n();
  const navigate = useNavigate();
  const text = copy[language];
  const [state, setState] = useState<ProjectProgressState>({ status: "loading" });
  const [percentage, setPercentage] = useState(0);
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");
  const canEdit = session.roleCode === "super_admin" || session.roleCode === "it_manager";

  useEffect(() => {
    let isMounted = true;

    setState((current) => (current.status === "ready" ? current : { status: "loading" }));

    api
      .getProjectProgress()
      .then((projectProgress) => {
        if (!isMounted) {
          return;
        }

        const history = buildProjectProgressHistory(projectProgress, text.notRecorded);

        setState({ history, projectProgress, status: "ready" });
        setPercentage(projectProgress.percentage);
        setNote(projectProgress.note ?? "");
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
      const projectProgress = await api.updateProjectProgress({
        note,
        percentage
      });
      const history = buildProjectProgressHistory(projectProgress, text.notRecorded);

      setState({ history, projectProgress, status: "ready" });
      setPercentage(projectProgress.percentage);
      setNote(projectProgress.note ?? "");
      setSaveSuccess(text.saved);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : text.saveError);
    } finally {
      setIsSaving(false);
    }
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
        <form className="project-progress-form" onSubmit={handleSubmit}>
          <section className="project-progress-overview-card">
            <div className="project-progress-overview-ring" style={progressStyle}>
              <strong>{percentage}%</strong>
              <span>{text.overallProgress}</span>
            </div>
            <ProjectProgressSummaryItem
              icon={Calculator}
              label={text.source}
              value={text.sourceValue}
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
                      disabled={!canEdit || state.status === "loading"}
                      max={100}
                      min={0}
                      onChange={(event) => {
                        setPercentage(Number(event.target.value));
                        setSaveSuccess("");
                      }}
                      step={1}
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
                      disabled={!canEdit || state.status === "loading"}
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
                  disabled={!canEdit || state.status === "loading"}
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
    policyAdmin: "يمكن للمديرين تحديث هذه القيمة يدوياً لأنها تمثل تقدم المشروع على مستوى الإدارة.",
    policyReadonly: "هذه النسبة للعرض فقط. التعديل متاح للمديرين فقط.",
    save: "حفظ التقدم",
    saveError: "تعذر حفظ تقدم المشروع العام.",
    saved: "تم حفظ تقدم المشروع العام.",
    saving: "جار الحفظ...",
    source: "طريقة الحساب",
    sourceValue: "يدوي",
    subtitle: "هذه النسبة تعدل يدوياً وهي مستقلة عن تقدم السبرنتات.",
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
    policyAdmin: "Admins can update this value manually because it represents management-level overall project progress.",
    policyReadonly: "This percentage is read-only for your account. Editing is restricted to admins.",
    save: "Save Progress",
    saveError: "Overall project progress could not be saved.",
    saved: "Overall project progress was saved.",
    saving: "Saving...",
    source: "Calculation",
    sourceValue: "Manual",
    subtitle: "This percentage is edited manually and is independent from sprint progress.",
    title: "Overall Project Progress",
    updatedBy: "Updated By",
    viewHistory: "View all history"
  }
} as const;
