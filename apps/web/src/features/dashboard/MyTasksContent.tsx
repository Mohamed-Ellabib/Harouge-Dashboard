import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  ClipboardCheck,
  Clock3,
  FileText,
  GripVertical,
  ListChecks,
  LockKeyhole,
  Minus,
  MonitorCheck,
  MoreVertical,
  Plus,
  Save,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Timer,
  UserRound,
  Video,
  X,
  type LucideIcon
} from "lucide-react";
import {
  memo,
  type FormEvent,
  useEffect,
  useMemo,
  useState
} from "react";

import {
  api,
  type DashboardUserReference,
  type Session,
  type TaskPriority,
  type TaskRecord,
  type TaskReportRow,
  type TaskStatus,
  type TaskUpdateRecord
} from "../../api/client";
import { useI18n } from "../../i18n";
import type { AppLanguage } from "../../i18n/locale";

type MyTasksState =
  | { items: TaskReportRow[]; status: "ready" }
  | { message: string; status: "error" }
  | { status: "loading" };

type MyTasksFilter = "active" | "all" | "blocked" | "completed" | "dueSoon";
type MyTasksSort = "dueDate" | "priority" | "progress" | "status";

type ProgressFormState = {
  blockedReason: string;
  progress: string;
  report: string;
  status: TaskStatus;
};

type SelectedTaskState = {
  details?: TaskRecord;
  error?: string;
  isLoading: boolean;
  item: TaskReportRow;
  updates: TaskUpdateRecord[];
};

const activeTaskStatuses: TaskStatus[] = ["open", "in_progress", "blocked", "waiting_review"];
const myTasksPageSize = 6;

const initialProgressForm: ProgressFormState = {
  blockedReason: "",
  progress: "0",
  report: "",
  status: "in_progress"
};

function MyTasksContentView({
  refreshSignal = 0,
  session
}: {
  refreshSignal?: number;
  session: Session;
}) {
  const { language } = useI18n();
  const text = getMyTasksUiCopy(language);
  const [state, setState] = useState<MyTasksState>({ status: "loading" });
  const [filter, setFilter] = useState<MyTasksFilter>("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<MyTasksSort>("dueDate");
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedTask, setSelectedTask] = useState<SelectedTaskState | null>(null);
  const [progressForm, setProgressForm] = useState<ProgressFormState>(initialProgressForm);
  const [isSavingProgress, setIsSavingProgress] = useState(false);
  const [progressError, setProgressError] = useState<string | null>(null);
  const [progressSuccess, setProgressSuccess] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    setState((current) => (current.status === "ready" ? current : { status: "loading" }));

    api.getTaskReport({
      assignedTo: session.userId,
      limit: 100,
      sortBy: "dueDate",
      sortOrder: "asc"
    })
      .then((result) => {
        if (isMounted) {
          setState({ items: result.data, status: "ready" });
        }
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
  }, [refreshSignal, reloadKey, session.userId, text.loadError]);

  const items = state.status === "ready" ? state.items : [];
  const metrics = useMemo(() => buildMyTasksMetrics(items), [items]);
  const visibleItems = useMemo(
    () => sortMyTasks(filterMyTasks(items, filter, search), sortBy),
    [filter, items, search, sortBy]
  );
  const pageCount = Math.max(1, Math.ceil(visibleItems.length / myTasksPageSize));
  const pagedItems = visibleItems.slice((page - 1) * myTasksPageSize, page * myTasksPageSize);
  const showingFrom = visibleItems.length === 0 ? 0 : (page - 1) * myTasksPageSize + 1;
  const showingTo = Math.min(page * myTasksPageSize, visibleItems.length);

  useEffect(() => {
    setPage(1);
  }, [filter, search, sortBy]);

  useEffect(() => {
    setPage((current) => Math.min(current, pageCount));
  }, [pageCount]);

  function openTask(item: TaskReportRow) {
    setSelectedTask({ isLoading: true, item, updates: [] });
    setProgressForm(toProgressForm(item));
    setProgressError(null);
    setProgressSuccess(null);

    Promise.all([
      api.getSprintItem(item.id),
      api.getSprintItemUpdates(item.id)
    ])
      .then(([details, updates]) => {
        setSelectedTask({
          details,
          isLoading: false,
          item: {
            ...item,
            lastProgressUpdateAt: details.lastProgressUpdateAt ?? item.lastProgressUpdateAt,
            progress: details.progress,
            status: details.status
          },
          updates: updates.data
        });
        setProgressForm(toProgressForm(item, details));
      })
      .catch((error: unknown) => {
        setSelectedTask((current) =>
          current
            ? {
                ...current,
                error: error instanceof Error ? error.message : text.detailError,
                isLoading: false
              }
            : current
        );
      });
  }

  function closeTask() {
    if (isSavingProgress) {
      return;
    }

    setSelectedTask(null);
    setProgressForm(initialProgressForm);
    setProgressError(null);
    setProgressSuccess(null);
  }

  async function handleProgressSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedTask) {
      return;
    }

    const progress = Number(progressForm.progress);
    const report = progressForm.report.trim();
    const currentProgress = selectedTask.details?.progress ?? selectedTask.item.progress;
    const currentStatus = selectedTask.details?.status ?? selectedTask.item.status;
    const nextStatus = progress === 100 ? "completed" : progressForm.status;

    if (!Number.isFinite(progress) || progress < 0 || progress > 100) {
      setProgressError(text.validation.progress);
      return;
    }

    if (progressForm.status === "completed" && progress !== 100) {
      setProgressError(text.validation.completed);
      return;
    }

    if (nextStatus === "blocked" && !progressForm.blockedReason.trim() && !report) {
      setProgressError(text.validation.blocked);
      return;
    }

    if (!report) {
      setProgressError(text.validation.report);
      return;
    }

    if (progress === currentProgress && nextStatus === currentStatus) {
      setProgressError(text.validation.noChange);
      return;
    }

    setIsSavingProgress(true);
    setProgressError(null);
    setProgressSuccess(null);

    try {
      let updatedTask: TaskRecord | undefined;

      if (progress !== currentProgress || report) {
        updatedTask = await api.updateTaskProgress(selectedTask.item.id, {
          progress,
          note: report
        });
      }

      if (nextStatus !== (updatedTask?.status ?? currentStatus)) {
        updatedTask = await api.changeTaskStatus(selectedTask.item.id, {
          ...(nextStatus === "blocked"
            ? { blockedReason: progressForm.blockedReason.trim() || report }
            : {}),
          note: report,
          status: nextStatus
        });
      }

      if (updatedTask) {
        const updates = await api.getSprintItemUpdates(selectedTask.item.id);

        setSelectedTask((current) =>
          current
            ? {
                details: updatedTask,
                isLoading: false,
                item: {
                  ...current.item,
                  completedAt: updatedTask?.completedAt ?? current.item.completedAt,
                  lastProgressUpdateAt:
                    updatedTask?.lastProgressUpdateAt ?? current.item.lastProgressUpdateAt,
                  progress: updatedTask.progress,
                  status: updatedTask.status
                },
                updates: updates.data
              }
            : current
        );
        setProgressForm((current) => ({
          ...current,
          blockedReason: "",
          progress: String(updatedTask.progress),
          report: "",
          status: updatedTask.status === "open" ? "in_progress" : updatedTask.status
        }));
      }

      setProgressSuccess(text.saved);
      setReloadKey((current) => current + 1);
    } catch (error) {
      setProgressError(error instanceof Error ? error.message : text.saveError);
    } finally {
      setIsSavingProgress(false);
    }
  }

  return (
    <section
      className={`my-tasks-page${selectedTask ? " has-modal-open" : ""}`}
      aria-label={text.title}
    >
      <section className="my-tasks-summary-grid" aria-label={text.summary}>
        <MyTaskMetric
          icon={ClipboardCheck}
          label={text.metrics.total}
          note={text.metrics.totalNote}
          tone="blue"
          value={metrics.total}
        />
        <MyTaskMetric
          icon={CircleDot}
          label={text.metrics.inProgress}
          note={text.metrics.inProgressNote}
          tone="blue"
          value={metrics.inProgress}
        />
        <MyTaskMetric
          icon={Clock3}
          label={text.metrics.dueSoon}
          note={text.metrics.dueSoonNote}
          tone="orange"
          value={metrics.dueSoon}
        />
        <MyTaskMetric
          icon={CheckCircle2}
          label={text.metrics.completed}
          note={text.metrics.completedNote}
          tone="green"
          value={metrics.completed}
        />
      </section>

      <section className="my-tasks-workspace">
        <div className="my-tasks-main-column">
          <section className="my-tasks-controls">
            <div className="my-tasks-filter-tabs" role="tablist" aria-label={text.filters.title}>
              {(["all", "active", "dueSoon", "blocked", "completed"] as MyTasksFilter[]).map((key) => (
                <button
                  aria-selected={filter === key}
                  className={filter === key ? "is-active" : ""}
                  key={key}
                  onClick={() => setFilter(key)}
                  role="tab"
                  type="button"
                >
                  {text.filters[key]}
                </button>
              ))}
            </div>
            <div className="my-tasks-local-tools">
              <label className="my-tasks-search">
                <Search size={17} strokeWidth={2.1} aria-hidden="true" />
                <input
                  aria-label={text.search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={text.search}
                  value={search}
                />
              </label>
              <label className="my-tasks-sort">
                <SlidersHorizontal size={16} strokeWidth={2.1} aria-hidden="true" />
                <span>{text.sort.label}</span>
                <select
                  aria-label={text.sort.label}
                  onChange={(event) => setSortBy(event.target.value as MyTasksSort)}
                  value={sortBy}
                >
                  <option value="dueDate">{text.sort.dueDate}</option>
                  <option value="priority">{text.sort.priority}</option>
                  <option value="progress">{text.sort.progress}</option>
                  <option value="status">{text.sort.status}</option>
                </select>
              </label>
            </div>
          </section>

          <section className="my-tasks-table-card" aria-label={text.table.title}>
            <div className="my-tasks-table-scroll">
              <table className="my-tasks-table">
                <thead>
                  <tr>
                    <th>{text.table.task}</th>
                    <th>{text.table.sprint}</th>
                    <th>{text.table.dueDate}</th>
                    <th>{text.table.progress}</th>
                    <th>{text.table.status}</th>
                    <th>{text.table.priority}</th>
                    <th>{text.table.action}</th>
                  </tr>
                </thead>
                <tbody>
                  {state.status === "loading" ? (
                    <tr>
                      <td colSpan={7}>
                        <p className="my-tasks-table-state">{text.loading}</p>
                      </td>
                    </tr>
                  ) : null}

                  {state.status === "error" ? (
                    <tr>
                      <td colSpan={7}>
                        <p className="my-tasks-table-state">{state.message}</p>
                      </td>
                    </tr>
                  ) : null}

                  {state.status === "ready" && visibleItems.length === 0 ? (
                    <tr>
                      <td colSpan={7}>
                        <section className="my-tasks-empty">
                          <ClipboardCheck size={32} strokeWidth={1.9} aria-hidden="true" />
                          <h3>{text.emptyTitle}</h3>
                          <p>{text.emptyBody}</p>
                        </section>
                      </td>
                    </tr>
                  ) : null}

                  {state.status === "ready"
                    ? pagedItems.map((item) => (
                        <MyTaskTableRow
                          item={item}
                          key={item.id}
                          language={language}
                          onOpen={openTask}
                          text={text}
                        />
                      ))
                    : null}
                </tbody>
              </table>
            </div>
            <footer className="my-tasks-table-footer">
              <span>
                {text.table.showing
                  .replace("{from}", String(showingFrom))
                  .replace("{to}", String(showingTo))
                  .replace("{total}", String(visibleItems.length))}
              </span>
              <div className="my-tasks-pagination" aria-label={text.table.pagination}>
                <button
                  aria-label={text.table.previous}
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  type="button"
                >
                  <ChevronLeft size={16} strokeWidth={2.2} />
                </button>
                {Array.from({ length: Math.min(3, pageCount) }, (_, index) => index + 1).map((pageNumber) => (
                  <button
                    aria-current={page === pageNumber ? "page" : undefined}
                    className={page === pageNumber ? "is-active" : ""}
                    key={pageNumber}
                    onClick={() => setPage(pageNumber)}
                    type="button"
                  >
                    {pageNumber}
                  </button>
                ))}
                <button
                  aria-label={text.table.next}
                  disabled={page >= pageCount}
                  onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
                  type="button"
                >
                  <ChevronRight size={16} strokeWidth={2.2} />
                </button>
              </div>
            </footer>
          </section>
        </div>

        <TodayPanel
          items={items}
          language={language}
          onOpen={openTask}
          text={text}
        />
      </section>

      {selectedTask ? (
        <MyTaskDetailModal
          error={progressError}
          form={progressForm}
          isSaving={isSavingProgress}
          language={language}
          onClose={closeTask}
          onSubmit={handleProgressSubmit}
          onUpdate={setProgressForm}
          selectedTask={selectedTask}
          success={progressSuccess}
          text={text}
        />
      ) : null}
    </section>
  );
}

function MyTaskMetric({
  icon: Icon,
  label,
  note,
  tone,
  value
}: {
  icon: LucideIcon;
  label: string;
  note: string;
  tone: "blue" | "green" | "orange";
  value: number;
}) {
  return (
    <article className={`my-tasks-metric my-tasks-metric-${tone}`}>
      <span>
        <Icon size={20} strokeWidth={2.1} aria-hidden="true" />
      </span>
      <div>
        <strong>{value}</strong>
        <small>{label}</small>
        <em>{note}</em>
      </div>
    </article>
  );
}

function MyTaskCard({
  item,
  language,
  onOpen
}: {
  item: TaskReportRow;
  language: AppLanguage;
  onOpen: (item: TaskReportRow) => void;
}) {
  const assignees = getAssignedUsers(item);
  const areaLabel = formatSprintArea(item.category, language);
  const dueState = formatTimeLeft(item.dueDate, item.status, language);

  return (
    <article className="my-task-card">
      <button onClick={() => onOpen(item)} type="button">
        <header>
          <div>
            <strong>{formatTaskCode(item)}</strong>
            <h3>{item.title}</h3>
            <p>{areaLabel}</p>
          </div>
          <span className={`my-task-status my-task-status-${item.status}`}>
            {formatStatus(item.status, language)}
          </span>
        </header>

        <div className="my-task-card-meta">
          <span>
            <FlagIcon />
            {formatPriority(item.priority as TaskPriority, language)}
          </span>
          <span>
            <CalendarClock size={15} strokeWidth={2.1} />
            {formatDate(item.dueDate, language)}
          </span>
          <span className={dueState.tone === "late" ? "is-late" : ""}>
            <Timer size={15} strokeWidth={2.1} />
            {dueState.label}
          </span>
          <span>
            <UserRound size={15} strokeWidth={2.1} />
            {formatUserList(assignees)}
          </span>
        </div>

        <div className="my-task-progress-row">
          <span>{language === "ar" ? "التقدم" : "Progress"}</span>
          <strong>{item.progress}%</strong>
          <div>
            <i style={{ width: `${item.progress}%` }} />
          </div>
        </div>
      </button>
    </article>
  );
}

function MyTaskTableRow({
  item,
  language,
  onOpen,
  text
}: {
  item: TaskReportRow;
  language: AppLanguage;
  onOpen: (item: TaskReportRow) => void;
  text: ReturnType<typeof getMyTasksUiCopy>;
}) {
  const areaLabel = formatSprintArea(item.category, language);
  const dueState = formatTimeLeft(item.dueDate, item.status, language);
  const priority = item.priority as TaskPriority;
  const actionLabel = activeTaskStatuses.includes(item.status) ? text.table.updateProgress : text.table.open;

  return (
    <tr className="my-task-table-row">
      <td>
        <div className="my-task-title-cell">
          <GripVertical size={16} strokeWidth={2.1} aria-hidden="true" />
          <MyTaskCategoryIcon category={item.category} />
          <div>
            <strong>{item.title}</strong>
            <span>{item.request?.title || formatTaskCode(item)}</span>
          </div>
        </div>
      </td>
      <td>
        <div className="my-task-sprint-cell">
          <strong>{areaLabel}</strong>
          <span>{formatSprintAreaSubLabel(item.category, language)}</span>
        </div>
      </td>
      <td>
        <div className={`my-task-date-cell ${dueState.tone === "late" ? "is-late" : ""}`}>
          <strong>{formatShortDate(item.dueDate, language)}</strong>
          <span>{dueState.label}</span>
        </div>
      </td>
      <td>
        <div className="my-task-progress-cell">
          <div>
            <i style={{ width: `${item.progress}%` }} />
          </div>
          <strong>{item.progress}%</strong>
        </div>
      </td>
      <td>
        <span className={`my-task-status my-task-status-${item.status}`}>
          {formatStatus(item.status, language)}
        </span>
      </td>
      <td>
        <span className={`my-task-priority my-task-priority-${priority}`}>
          {priority === "low" ? <ArrowDownIcon /> : <ArrowUpIcon />}
          {formatPriority(priority, language)}
        </span>
      </td>
      <td>
        <div className="my-task-actions-cell">
          <button
            aria-label={`${text.table.moreActions}: ${actionLabel}`}
            className="my-task-row-more"
            onClick={() => onOpen(item)}
            type="button"
          >
            <MoreVertical size={16} strokeWidth={2.25} />
          </button>
        </div>
      </td>
    </tr>
  );
}

function MyTaskCategoryIcon({ category }: { category: string }) {
  const Icon =
    category === "access"
      ? LockKeyhole
      : category === "software"
        ? ShieldCheck
        : category === "hardware"
          ? MonitorCheck
          : FileText;

  return (
    <span className={`my-task-row-icon my-task-row-icon-${category}`}>
      <Icon size={17} strokeWidth={2.05} aria-hidden="true" />
    </span>
  );
}

function TodayPanel({
  items,
  language,
  onOpen,
  text
}: {
  items: TaskReportRow[];
  language: AppLanguage;
  onOpen: (item: TaskReportRow) => void;
  text: ReturnType<typeof getMyTasksUiCopy>;
}) {
  const todayItems = items
    .filter((item) => activeTaskStatuses.includes(item.status))
    .sort((first, second) => getDueTime(first.dueDate) - getDueTime(second.dueDate))
    .slice(0, 2);
  const today = new Intl.DateTimeFormat(language === "ar" ? "ar-LY" : "en-US", {
    day: "2-digit",
    month: "long",
    weekday: "long",
    year: "numeric"
  }).format(new Date());

  return (
    <aside className="my-tasks-today-panel" aria-label={text.today.title}>
      <header>
        <span>
          <CalendarClock size={17} strokeWidth={2.1} aria-hidden="true" />
        </span>
        <div>
          <h3>{text.today.title}</h3>
          <p>{today}</p>
        </div>
      </header>

      <div className="my-tasks-today-list">
        {todayItems.length === 0 ? (
          <p className="my-tasks-today-empty">{text.today.empty}</p>
        ) : null}
        {todayItems.map((item) => {
          const dueState = formatTimeLeft(item.dueDate, item.status, language);
          const priority = item.priority as TaskPriority;

          return (
            <button className="my-tasks-today-card" key={item.id} onClick={() => onOpen(item)} type="button">
              <span className={`my-tasks-today-dot my-tasks-today-${priority}`} />
              <strong>{item.title}</strong>
              <small className={dueState.tone === "late" ? "is-late" : ""}>{dueState.label}</small>
              <em className={`my-task-priority my-task-priority-${priority}`}>
                {priority === "low" ? <ArrowDownIcon /> : <ArrowUpIcon />}
                {formatPriority(priority, language)}
              </em>
            </button>
          );
        })}
        <article className="my-tasks-meeting-card">
          <span className="my-tasks-meeting-ring" />
          <strong>{text.today.meetingTitle}</strong>
          <small>{text.today.meetingTime}</small>
          <em>
            <Video size={14} strokeWidth={2.1} aria-hidden="true" />
            {text.today.meetingType}
          </em>
        </article>
      </div>

      <button className="my-tasks-calendar-link" type="button">
        {text.today.calendar}
        <ChevronRight size={16} strokeWidth={2.2} aria-hidden="true" />
      </button>
    </aside>
  );
}

function MyTaskDetailModal({
  error,
  form,
  isSaving,
  language,
  onClose,
  onSubmit,
  onUpdate,
  selectedTask,
  success,
  text
}: {
  error: string | null;
  form: ProgressFormState;
  isSaving: boolean;
  language: AppLanguage;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onUpdate: (updater: (current: ProgressFormState) => ProgressFormState) => void;
  selectedTask: SelectedTaskState;
  success: string | null;
  text: ReturnType<typeof getMyTasksCopy>;
}) {
  const item = selectedTask.item;
  const details = selectedTask.details;
  const currentProgress = details?.progress ?? item.progress;
  const currentStatus = details?.status ?? item.status;
  const statusOptions = getEmployeeStatusOptions(currentStatus);
  const dueState = formatTimeLeft(details?.dueDate ?? item.dueDate, currentStatus, language);
  const canSubmit = currentStatus !== "completed" && currentStatus !== "cancelled";

  function adjustProgress(delta: number) {
    const nextProgress = Math.max(0, Math.min(100, Number(form.progress) + delta));

    updateProgressValue(String(nextProgress));
  }

  function updateProgressValue(value: string) {
    const nextProgress = Number(value);

    onUpdate((current) => ({
      ...current,
      progress: value,
      status:
        nextProgress === 100
          ? "completed"
          : current.status === "completed"
            ? "in_progress"
            : current.status
    }));
  }

  return (
    <div className="my-task-modal-backdrop" role="presentation">
      <form className="my-task-modal" onSubmit={onSubmit}>
        <header>
          <div>
            <span>{formatTaskCode(item)}</span>
            <h2>{item.title}</h2>
            <p>{details?.description || item.request?.title || text.noDescription}</p>
          </div>
          <button aria-label={text.close} disabled={isSaving} onClick={onClose} type="button">
            <X size={20} strokeWidth={2.2} />
          </button>
        </header>

        {selectedTask.isLoading ? (
          <p className="my-task-inline-state">{text.loadingDetails}</p>
        ) : null}

        {selectedTask.error ? (
          <p className="my-task-error">{selectedTask.error}</p>
        ) : null}

        <section className="my-task-detail-grid">
          <MyTaskDetail label={text.detail.assignedBy} value={item.createdBy?.fullName ?? "-"} />
          <MyTaskDetail label={text.detail.assignees} value={formatUserList(getAssignedUsers(item))} />
          <MyTaskDetail label={text.detail.status} value={formatStatus(currentStatus, language)} />
          <MyTaskDetail label={text.detail.priority} value={formatPriority(item.priority as TaskPriority, language)} />
          <MyTaskDetail label={text.detail.startDate} value={formatDate(details?.startDate ?? item.startDate, language)} />
          <MyTaskDetail label={text.detail.dueDate} value={formatDate(details?.dueDate ?? item.dueDate, language)} />
          <MyTaskDetail label={text.detail.timeLeft} tone={dueState.tone} value={dueState.label} />
          <MyTaskDetail label={text.detail.updated} value={formatDate(details?.lastProgressUpdateAt ?? item.lastProgressUpdateAt, language)} />
        </section>

        <section className="my-task-modal-progress">
          <div>
            <span>{text.progress.current}</span>
            <strong>{currentProgress}%</strong>
          </div>
          <div className="my-task-modal-progressbar">
            <i style={{ width: `${currentProgress}%` }} />
          </div>
        </section>

        {canSubmit ? (
          <section className="my-task-progress-form">
            <div className="my-task-progress-stepper">
              <button onClick={() => adjustProgress(-5)} type="button">
                <Minus size={15} strokeWidth={2.3} />
              </button>
              <label>
                <span>{text.progress.newProgress}</span>
                <input
                  max={100}
                  min={0}
                  onChange={(event) => updateProgressValue(event.target.value)}
                  type="number"
                  value={form.progress}
                />
              </label>
              <button onClick={() => adjustProgress(5)} type="button">
                <Plus size={15} strokeWidth={2.3} />
              </button>
            </div>

            <label className="my-task-form-field">
              <span>{text.progress.status}</span>
              <select
                onChange={(event) =>
                  onUpdate((current) => ({
                    ...current,
                    status: event.target.value as TaskStatus
                  }))
                }
                value={form.status}
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {formatStatus(status, language)}
                  </option>
                ))}
              </select>
            </label>

            {form.status === "blocked" ? (
              <label className="my-task-form-field">
                <span>{text.progress.blockedReason}</span>
                <input
                  onChange={(event) =>
                    onUpdate((current) => ({
                      ...current,
                      blockedReason: event.target.value
                    }))
                  }
                  placeholder={text.progress.blockedPlaceholder}
                  value={form.blockedReason}
                />
              </label>
            ) : null}

            <label className="my-task-form-field is-wide">
              <span>{text.progress.report}</span>
              <textarea
                onChange={(event) =>
                  onUpdate((current) => ({ ...current, report: event.target.value }))
                }
                placeholder={text.progress.reportPlaceholder}
                value={form.report}
              />
            </label>
          </section>
        ) : (
          <p className="my-task-inline-state">{text.progress.locked}</p>
        )}

        {error ? <p className="my-task-error">{error}</p> : null}
        {success ? <p className="my-task-success">{success}</p> : null}

        <section className="my-task-history">
          <h3>{text.history.title}</h3>
          {selectedTask.updates.length === 0 ? (
            <p>{text.history.empty}</p>
          ) : (
            <ol>
              {selectedTask.updates.map((update) => (
                <li key={update.id}>
                  <span>
                    <FileText size={15} strokeWidth={2.1} />
                  </span>
                  <div>
                    <strong>{formatUpdateChange(update, language)}</strong>
                    <p>{update.note || text.history.noNote}</p>
                    <time>{formatDate(update.createdAt, language)}</time>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        <footer>
          <button disabled={isSaving} onClick={onClose} type="button">
            {text.close}
          </button>
          {canSubmit ? (
            <button disabled={isSaving} type="submit">
              <Save size={17} strokeWidth={2.25} />
              {isSaving ? text.saving : text.save}
            </button>
          ) : null}
        </footer>
      </form>
    </div>
  );
}

function MyTaskDetail({
  label,
  tone,
  value
}: {
  label: string;
  tone?: "late" | "normal";
  value: string;
}) {
  return (
    <div className={tone === "late" ? "is-late" : ""}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function FlagIcon() {
  return <AlertTriangle size={15} strokeWidth={2.1} />;
}

function ArrowUpIcon() {
  return <ArrowUp size={12} strokeWidth={2.3} aria-hidden="true" />;
}

function ArrowDownIcon() {
  return <ArrowDown size={12} strokeWidth={2.3} aria-hidden="true" />;
}

function buildMyTasksMetrics(items: TaskReportRow[]) {
  const blocked = items.filter((item) => item.status === "blocked").length;
  const completed = items.filter((item) => item.status === "completed").length;
  const dueSoon = items.filter((item) => isDueSoon(item.dueDate, item.status)).length;
  const inProgress = items.filter((item) => item.status === "in_progress").length;

  return {
    blocked,
    completed,
    dueSoon,
    inProgress,
    total: items.length
  };
}

function sortMyTasks(items: TaskReportRow[], sortBy: MyTasksSort): TaskReportRow[] {
  return [...items].sort((first, second) => {
    switch (sortBy) {
      case "priority":
        return priorityWeight(second.priority) - priorityWeight(first.priority);
      case "progress":
        return second.progress - first.progress;
      case "status":
        return first.status.localeCompare(second.status);
      default:
        return getDueTime(first.dueDate) - getDueTime(second.dueDate);
    }
  });
}

function priorityWeight(priority: string): number {
  const weights: Record<string, number> = {
    low: 1,
    medium: 2,
    high: 3,
    urgent: 4
  };

  return weights[priority] ?? 0;
}

function getDueTime(value: string | undefined): number {
  if (!value) {
    return Number.MAX_SAFE_INTEGER;
  }

  const time = new Date(value).getTime();
  return Number.isNaN(time) ? Number.MAX_SAFE_INTEGER : time;
}

function filterMyTasks(
  items: TaskReportRow[],
  filter: MyTasksFilter,
  search: string
): TaskReportRow[] {
  const normalizedSearch = search.trim().toLowerCase();

  return items.filter((item) => {
    if (filter === "active" && !activeTaskStatuses.includes(item.status)) {
      return false;
    }

    if (filter === "blocked" && item.status !== "blocked") {
      return false;
    }

    if (filter === "completed" && item.status !== "completed") {
      return false;
    }

    if (filter === "dueSoon" && !isDueSoon(item.dueDate, item.status)) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    return [
      item.title,
      item.taskCode,
      item.request?.title,
      item.priority,
      item.status,
      formatSprintArea(item.category, "en"),
      ...getAssignedUsers(item).map((user) => user.fullName)
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(normalizedSearch));
  });
}

function toProgressForm(item: TaskReportRow, details?: TaskRecord): ProgressFormState {
  const status = details?.status ?? item.status;

  return {
    blockedReason: "",
    progress: String(details?.progress ?? item.progress),
    report: "",
    status: status === "open" ? "in_progress" : status
  };
}

function getEmployeeStatusOptions(status: TaskStatus): TaskStatus[] {
  switch (status) {
    case "blocked":
      return ["blocked", "in_progress", "completed"];
    case "cancelled":
    case "completed":
      return [status];
    case "waiting_review":
      return ["waiting_review", "in_progress", "completed", "blocked"];
    case "open":
      return ["in_progress", "blocked", "completed"];
    default:
      return ["in_progress", "blocked", "completed"];
  }
}

function getAssignedUsers(item: TaskReportRow): DashboardUserReference[] {
  if (item.assignees.length > 0) {
    return item.assignees;
  }

  return item.assignedTo ? [item.assignedTo] : [];
}

function formatTaskCode(item: TaskReportRow): string {
  return item.taskCode.replace(/^TASK-DEMO-/i, "SI-").replace(/^TASK-/i, "SI-");
}

function formatUserList(users: DashboardUserReference[]): string {
  if (users.length === 0) {
    return "-";
  }

  if (users.length <= 2) {
    return users.map((user) => user.fullName).join(", ");
  }

  return `${users[0]?.fullName}, ${users[1]?.fullName} +${users.length - 2}`;
}

function formatSprintArea(category: string, language: AppLanguage): string {
  const labels = {
    ar: {
      development: "سبرنت التطوير",
      facility: "سبرنت المرافق",
      infrastructure: "سبرنت البنية التحتية"
    },
    en: {
      development: "Development Sprint",
      facility: "Facility Sprint",
      infrastructure: "Infrastructure Sprint"
    }
  };
  const area =
    category === "software" || category === "access"
      ? "development"
      : category === "hardware" || category === "maintenance" || category === "support"
        ? "facility"
        : "infrastructure";

  return labels[language][area];
}

function formatSprintAreaSubLabel(category: string, language: AppLanguage): string {
  const labels = {
    ar: {
      access: "الوصول",
      hardware: "المعدات",
      maintenance: "الصيانة",
      network: "الشبكات",
      other: "عام",
      server: "الخوادم",
      software: "البرمجة",
      support: "الدعم"
    },
    en: {
      access: "Authentication",
      hardware: "Workstations",
      maintenance: "Facilities",
      network: "Network",
      other: "General",
      server: "Infrastructure",
      software: "ERP module",
      support: "Support"
    }
  };

  return labels[language][category as keyof typeof labels.en] ?? category;
}

function formatStatus(status: TaskStatus, language: AppLanguage): string {
  const labels: Record<AppLanguage, Record<TaskStatus, string>> = {
    ar: {
      blocked: "محجوب",
      cancelled: "ملغي",
      completed: "مكتمل",
      in_progress: "قيد التنفيذ",
      open: "مفتوح",
      waiting_review: "بانتظار المراجعة"
    },
    en: {
      blocked: "Blocked",
      cancelled: "Cancelled",
      completed: "Completed",
      in_progress: "In Progress",
      open: "To Do",
      waiting_review: "Waiting Review"
    }
  };

  return labels[language][status];
}

function formatPriority(priority: TaskPriority, language: AppLanguage): string {
  const labels: Record<AppLanguage, Record<TaskPriority, string>> = {
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
  };

  return labels[language][priority] ?? priority;
}

function formatShortDate(value: string | undefined, language: AppLanguage): string {
  if (!value) {
    return language === "ar" ? "غير محدد" : "Not set";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return language === "ar" ? "غير محدد" : "Not set";
  }

  return new Intl.DateTimeFormat(language === "ar" ? "ar-LY" : "en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

function formatDate(value: string | undefined, language: AppLanguage): string {
  if (!value) {
    return language === "ar" ? "غير محدد" : "Not set";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return language === "ar" ? "غير محدد" : "Not set";
  }

  return new Intl.DateTimeFormat(language === "ar" ? "ar-LY" : "en-US", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

function formatTimeLeft(
  dueDate: string | undefined,
  status: TaskStatus,
  language: AppLanguage
): { label: string; tone: "late" | "normal" } {
  if (!dueDate) {
    return {
      label: language === "ar" ? "لا يوجد موعد" : "No due date",
      tone: "normal"
    };
  }

  if (status === "completed") {
    return {
      label: language === "ar" ? "مكتمل" : "Completed",
      tone: "normal"
    };
  }

  const dueTime = new Date(dueDate).getTime();
  const diffMs = dueTime - Date.now();
  const absoluteDays = Math.max(1, Math.ceil(Math.abs(diffMs) / 86_400_000));

  if (diffMs < 0) {
    return {
      label:
        language === "ar"
          ? "متأخر " + absoluteDays + " يوم"
          : absoluteDays + " day" + (absoluteDays === 1 ? "" : "s") + " overdue",
      tone: "late"
    };
  }

  if (absoluteDays === 1) {
    return {
      label: language === "ar" ? "يوم واحد متبقي" : "1 day left",
      tone: "normal"
    };
  }

  return {
    label:
      language === "ar"
        ? absoluteDays + " أيام متبقية"
        : absoluteDays + " days left",
    tone: "normal"
  };
}

function isDueSoon(dueDate: string | undefined, status: TaskStatus): boolean {
  if (!dueDate || !activeTaskStatuses.includes(status)) {
    return false;
  }

  const diffMs = new Date(dueDate).getTime() - Date.now();

  return diffMs <= 3 * 86_400_000;
}

function formatUpdateChange(update: TaskUpdateRecord, language: AppLanguage): string {
  const parts: string[] = [];

  if (typeof update.previousProgress === "number" || typeof update.newProgress === "number") {
    parts.push(
      (update.previousProgress ?? 0) + "% -> " + (update.newProgress ?? update.previousProgress ?? 0) + "%"
    );
  }

  if (update.newStatus) {
    parts.push(formatStatus(update.newStatus, language));
  }

  return parts.length > 0
    ? parts.join(" | ")
    : language === "ar"
      ? "تحديث تقدم"
      : "Progress update";
}

function getArabicMyTasksCopy() {
  return {
    close: "إغلاق",
    detail: {
      assignedBy: "أسندها",
      assignees: "المسند إليهم",
      dueDate: "تاريخ الاستحقاق",
      priority: "الأولوية",
      startDate: "تاريخ البداية",
      status: "الحالة",
      timeLeft: "الوقت المتبقي",
      updated: "آخر تحديث"
    },
    detailError: "تعذر تحميل تفاصيل المهمة.",
    emptyBody: "عندما يتم إسناد عنصر سبرنت إليك سيظهر هنا.",
    emptyTitle: "لا توجد مهام مطابقة",
    eyebrow: "مساحة الموظف",
    filters: {
      active: "النشطة",
      all: "الكل",
      blocked: "المحجوبة",
      completed: "المكتملة",
      dueSoon: "قريبة الاستحقاق",
      title: "فلاتر مهامي"
    },
    history: {
      empty: "لا توجد تحديثات بعد.",
      noNote: "لا توجد ملاحظة.",
      title: "سجل التقدم"
    },
    loadError: "تعذر تحميل مهامي.",
    loading: "جار تحميل مهامي...",
    loadingDetails: "جار تحميل تفاصيل المهمة...",
    metrics: {
      active: "نشطة",
      completed: "مكتملة",
      dueSoon: "قريبة الاستحقاق",
      total: "إجمالي مهامي"
    },
    noDescription: "لا يوجد وصف مسجل.",
    progress: {
      blockedPlaceholder: "اكتب سبب الحظر",
      blockedReason: "سبب الحظر",
      current: "التقدم الحالي",
      locked: "هذه المهمة مغلقة ولا يمكن تحديثها.",
      newProgress: "التقدم الجديد",
      report: "تقرير التقدم",
      reportPlaceholder: "اكتب ما أنجزته أو سبب تغيير التقدم...",
      status: "الحالة"
    },
    save: "حفظ التقدم",
    saved: "تم حفظ تقدم المهمة.",
    saveError: "تعذر حفظ التقدم.",
    saving: "جار الحفظ...",
    search: "ابحث في مهامي...",
    subtitle: "تابع عناصر السبرنت المسندة إليك وحدث التقدم بتقرير واضح.",
    summary: "ملخص مهامي",
    title: "مهامي",
    validation: {
      blocked: "اكتب سبب الحظر.",
      completed: "يجب أن يكون التقدم 100% قبل الاكتمال.",
      noChange: "غير التقدم أو الحالة قبل الحفظ.",
      progress: "أدخل نسبة تقدم بين 0 و 100.",
      report: "اكتب تقريرا قصيرا عما تم إنجازه."
    }
  };
}

function getArabicMyTasksUiCopy() {
  const base = getArabicMyTasksCopy();

  return {
    ...base,
    metrics: {
      ...base.metrics,
      completedNote: "مهام مكتملة",
      dueSoonNote: "خلال 3 أيام",
      inProgress: "قيد التنفيذ",
      inProgressNote: "مهام قيد التنفيذ",
      totalNote: "مهام مسندة إليك"
    },
    sort: {
      dueDate: "تاريخ الاستحقاق",
      label: "ترتيب",
      priority: "الأولوية",
      progress: "التقدم",
      status: "الحالة"
    },
    table: {
      action: "الإجراء",
      dueDate: "تاريخ الاستحقاق",
      moreActions: "مزيد من الإجراءات",
      next: "التالي",
      open: "فتح",
      pagination: "صفحات المهام",
      previous: "السابق",
      priority: "الأولوية",
      progress: "التقدم",
      showing: "عرض {from} إلى {to} من {total} مهمة",
      sprint: "السبرنت",
      status: "الحالة",
      task: "المهمة",
      title: "جدول مهامي",
      updateProgress: "تحديث التقدم"
    },
    today: {
      calendar: "عرض التقويم",
      empty: "لا توجد مهام قريبة.",
      meetingTime: "09:30 صباحا",
      meetingTitle: "الاجتماع اليومي",
      meetingType: "اجتماع افتراضي",
      title: "اليوم"
    }
  };
}

function getMyTasksCopy(language: AppLanguage) {
  if (language === "ar") {
    return getArabicMyTasksCopy();
  }

  return {
    close: "Close",
    detail: {
      assignedBy: "Assigned By",
      assignees: "Assigned To",
      dueDate: "Due Date",
      priority: "Priority",
      startDate: "Start Date",
      status: "Status",
      timeLeft: "Time Left",
      updated: "Last Update"
    },
    detailError: "Task details could not be loaded.",
    emptyBody: "When a sprint item is assigned to you, it will appear here.",
    emptyTitle: "No matching tasks",
    eyebrow: "Employee workspace",
    filters: {
      active: "Active",
      all: "All",
      blocked: "Blocked",
      completed: "Completed",
      dueSoon: "Due Soon",
      title: "My task filters"
    },
    history: {
      empty: "No progress updates yet.",
      noNote: "No note recorded.",
      title: "Progress History"
    },
    loadError: "My tasks could not be loaded.",
    loading: "Loading my tasks...",
    loadingDetails: "Loading task details...",
    metrics: {
      active: "Active",
      completed: "Completed",
      dueSoon: "Due Soon",
      total: "Total Assigned"
    },
    noDescription: "No description has been recorded.",
    progress: {
      blockedPlaceholder: "Write the blocker reason",
      blockedReason: "Blocked Reason",
      current: "Current Progress",
      locked: "This task is closed and cannot be updated.",
      newProgress: "New Progress",
      report: "Progress Report",
      reportPlaceholder: "Write what you completed or why the progress changed...",
      status: "Status"
    },
    save: "Save Progress",
    saved: "Task progress was saved.",
    saveError: "Progress could not be saved.",
    saving: "Saving...",
    search: "Search my tasks...",
    subtitle: "Track your assigned sprint items, update progress, and leave a clear report for each change.",
    summary: "My task summary",
    title: "My Tasks",
    validation: {
      blocked: "Write the blocked reason.",
      completed: "Progress must be 100% before completing the task.",
      noChange: "Change the progress or status before saving.",
      progress: "Enter a progress value between 0 and 100.",
      report: "Write a short report about what was done."
    }
  };
}

function getMyTasksUiCopy(language: AppLanguage) {
  const base = getMyTasksCopy(language);

  if (language === "ar") {
    return getArabicMyTasksUiCopy();
  }

  return {
    ...base,
    metrics: {
      ...base.metrics,
      completedNote: "Completed tasks",
      dueSoonNote: "Due within 3 days",
      inProgress: "In Progress",
      inProgressNote: "Tasks in progress",
      totalNote: "Tasks assigned to you"
    },
    sort: {
      dueDate: "Due Date",
      label: "Sort",
      priority: "Priority",
      progress: "Progress",
      status: "Status"
    },
    table: {
      action: "Action",
      dueDate: "Due Date",
      moreActions: "More actions",
      next: "Next page",
      open: "Open",
      pagination: "Task pages",
      previous: "Previous page",
      priority: "Priority",
      progress: "Progress",
      showing: "Showing {from} to {to} of {total} tasks",
      sprint: "Sprint",
      status: "Status",
      task: "Task",
      title: "My tasks table",
      updateProgress: "Update Progress"
    },
    today: {
      calendar: "View calendar",
      empty: "No urgent schedule items.",
      meetingTime: "09:30 AM",
      meetingTitle: "Daily stand-up",
      meetingType: "Virtual Meeting",
      title: "Today"
    }
  };
}

export const MyTasksContent = memo(MyTasksContentView);
