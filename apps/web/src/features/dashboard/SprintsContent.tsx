import {
  Activity,
  AlertTriangle,
  Bell,
  Building2,
  CalendarCheck2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Code2,
  Database,
  Download,
  FileText,
  Filter,
  Flag,
  Hash,
  Pencil,
  PlayCircle,
  Plus,
  Save,
  Server,
  Tag,
  Target,
  TrendingUp,
  User,
  Users,
  X,
  type LucideIcon
} from "lucide-react";
import {
  memo,
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState
} from "react";
import { useNavigate } from "react-router-dom";

import {
  api,
  type DashboardUserReference,
  type CreateSprintPayload,
  type SprintRecord,
  type SprintStatus,
  type TaskReportRow,
  type UserRecord
} from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useI18n } from "../../i18n";
import type { AppLanguage } from "../../i18n/locale";
import {
  type SprintAreaDefinition,
  type SprintAreaKey,
  getSprintAreaByCategory,
  sprintAreaDefinitions
} from "./sprintAreas";

type SprintsState =
  | { items: TaskReportRow[]; sprints: SprintRecord[]; status: "ready"; users: UserRecord[] }
  | { message: string; status: "error" }
  | { status: "loading" };

type SprintDisplayArea = {
  categories: readonly string[];
  code?: string;
  custom?: boolean;
  description?: string;
  icon: LucideIcon;
  key: string;
  label: string;
  labelKey?: string;
  tone: "blue" | "green" | "orange" | "purple";
};

type SprintSummary = {
  area: SprintDisplayArea;
  blocked: number;
  completed: number;
  dueThisWeek: number;
  inProgress: number;
  items: TaskReportRow[];
  owner?: DashboardUserReference;
  progress: number;
  sprint?: SprintRecord;
  status: SprintStatus;
  targetDate?: string;
  total: number;
};

type SprintFormState = {
  active: boolean;
  code: string;
  description: string;
  name: string;
  notifyLater: boolean;
  ownerId: string;
  progressTarget: string;
  sprintType: SprintAreaKey | "";
  startDate: string;
  status: SprintStatus;
  targetDate: string;
};

type ActivityRow = {
  area: SprintAreaDefinition;
  actor?: DashboardUserReference;
  createdAt?: string;
  item: TaskReportRow;
  status: SprintStatus;
};

const initialSprintForm: SprintFormState = {
  active: true,
  code: "",
  description: "",
  name: "",
  notifyLater: false,
  ownerId: "",
  progressTarget: "",
  sprintType: "",
  startDate: "",
  status: "planned",
  targetDate: ""
};

const areaDescriptions: Record<AppLanguage, Record<SprintAreaKey, string>> = {
  ar: {
    development: "وحدات ERP، الواجهات، التكاملات، والاختبارات.",
    facility: "الغرف، جاهزية محطات العمل، مناطق التدريب، ودعم الإطلاق.",
    infrastructure: "الخوادم، الشبكات، الاستضافة، النسخ الاحتياطي، والصلاحيات.",
    master_data_collection: "جمع البيانات الرئيسية، التحقق، ونسبة اكتمال البيانات."
  },
  en: {
    development: "ERP modules, APIs, UI, integrations, testing.",
    facility: "Rooms, workstation readiness, training areas, rollout support.",
    infrastructure: "Servers, network, hosting, backup, access, security.",
    master_data_collection: "Master data collection, validation, completion, and readiness tracking."
  }
};

const copy = {
  ar: {
    actions: {
      editSprint: "تعديل السبرنت",
      export: "تصدير",
      filters: "الفلاتر",
      newSprint: "إنشاء سبرنت",
      viewActivity: "عرض كل النشاطات",
      viewMilestones: "عرض كل المراحل"
    },
    activity: {
      changedStatus: "{actor} حدّث حالة {sprint}.",
      completed: "{actor} أتم {item}.",
      progress: "{actor} حدّث تقدم {sprint} إلى {progress}%.",
      title: "آخر نشاط السبرنت"
    },
    loading: "جاري تحميل السبرنتات...",
    modal: {
      activeHelp: "اجعل هذا السبرنت نشطاً مباشرة.",
      activeLabel: "تعيين كسبرنت نشط",
      cancel: "إلغاء",
      create: "إنشاء سبرنت",
      description: "الوصف",
      descriptionPlaceholder: "اكتب وصفاً مختصراً لهذا السبرنت والأهداف والمخرجات الرئيسية...",
      editSubtitle: "حدّث تفاصيل السبرنت والمسؤول والتواريخ والحالة.",
      editTitle: "تعديل السبرنت",
      missingSprint: "لا يوجد سجل محفوظ لهذا السبرنت ليتم تعديله.",
      name: "اسم السبرنت",
      namePlaceholder: "أدخل اسم السبرنت",
      notifyHelp: "إرسال الإشعارات لأعضاء الفريق لاحقاً.",
      notifyLabel: "إشعار الفريق لاحقاً",
      owner: "مسؤول السبرنت",
      ownerPlaceholder: "اختر مسؤول السبرنت",
      progressTarget: "التقدم الحالي (%)",
      progressTargetPlaceholder: "أدخل التقدم الحالي (0-100)",
      sprintCode: "رمز السبرنت",
      sprintCodePlaceholder: "أدخل رمز السبرنت (مثال: DEV-2101)",
      sprintType: "نوع / تصنيف السبرنت",
      sprintTypePlaceholder: "اختر النوع / التصنيف",
      startDate: "تاريخ البداية",
      status: "الحالة",
      subtitle: "أضف منطقة سبرنت جديدة لتتبع التقدم والملكية وتواريخ التسليم.",
      targetDate: "التاريخ المستهدف",
      title: "إنشاء سبرنت",
      update: "حفظ التغييرات",
      validation: "أكمل الحقول المطلوبة قبل إنشاء السبرنت."
    },
    metrics: {
      active: "نشط",
      activeNote: "قيد التنفيذ حالياً",
      atRisk: "معرّض للخطر",
      atRiskNote: "يحتاج إلى متابعة",
      completed: "مكتمل",
      completedNote: "انتهى بنجاح",
      total: "إجمالي السبرنتات",
      totalNote: "كل مجالات السبرنت"
    },
    milestone: {
      dueDate: "تاريخ الاستحقاق",
      milestone: "المرحلة",
      sprint: "السبرنت",
      status: "الحالة",
      title: "مراحل السبرنت"
    },
    notes: {
      blocked: "محجوب",
      completed: "مكتمل",
      dueThisWeek: "مستحق هذا الأسبوع",
      inProgress: "قيد التنفيذ",
      owner: "المسؤول",
      progress: "التقدم",
      targetDate: "التاريخ المستهدف",
      totalItems: "إجمالي العناصر"
    },
    statuses: {
      atRisk: "معرّض للخطر",
      cancelled: "ملغي",
      completed: "مكتمل",
      inProgress: "قيد التنفيذ",
      onTrack: "على المسار",
      planned: "مخطط"
    }
  },
  en: {
    actions: {
      editSprint: "Edit Sprint",
      export: "Export",
      filters: "Filters",
      newSprint: "Create Sprint",
      viewActivity: "View all activity",
      viewMilestones: "View all milestones"
    },
    activity: {
      changedStatus: "{actor} changed {sprint} status.",
      completed: "{actor} marked {item} as completed.",
      progress: "{actor} updated progress for {sprint} to {progress}%.",
      title: "Recent Sprint Activity"
    },
    loading: "Loading sprints...",
    modal: {
      activeHelp: "Make this sprint the active sprint immediately.",
      activeLabel: "Mark as Active Sprint",
      cancel: "Cancel",
      create: "Create Sprint",
      description: "Description",
      descriptionPlaceholder: "Enter a brief description of this sprint, goals, and key deliverables...",
      editSubtitle: "Update the sprint details, owner, dates, current progress, and status.",
      editTitle: "Edit Sprint",
      missingSprint: "This sprint area does not have a saved sprint record to edit yet.",
      name: "Sprint Name",
      namePlaceholder: "Enter sprint name",
      notifyHelp: "Send notifications to team members later.",
      notifyLabel: "Notify Team Later",
      owner: "Sprint Owner",
      ownerPlaceholder: "Select sprint owner",
      progressTarget: "Current Progress (%)",
      progressTargetPlaceholder: "Enter current progress (0-100)",
      sprintCode: "Sprint Code",
      sprintCodePlaceholder: "Enter sprint code (e.g., DEV-2101)",
      sprintType: "Sprint Type / Label",
      sprintTypePlaceholder: "Select type / label",
      startDate: "Start Date",
      status: "Status",
      subtitle: "Add a new sprint area to track progress, ownership, and delivery dates.",
      targetDate: "Target Date",
      title: "Create Sprint",
      update: "Save Changes",
      validation: "Complete the required fields before creating the sprint."
    },
    metrics: {
      active: "Active",
      activeNote: "Currently in progress",
      atRisk: "At Risk",
      atRiskNote: "Needs attention",
      completed: "Completed",
      completedNote: "Successfully finished",
      total: "Total Sprints",
      totalNote: "All sprint areas"
    },
    milestone: {
      dueDate: "Due Date",
      milestone: "Milestone",
      sprint: "Sprint",
      status: "Status",
      title: "Sprint Milestones"
    },
    notes: {
      blocked: "Blocked",
      completed: "Completed",
      dueThisWeek: "Due This Week",
      inProgress: "In Progress",
      owner: "Owner",
      progress: "Progress",
      targetDate: "Target Date",
      totalItems: "Total Items"
    },
    statuses: {
      atRisk: "At Risk",
      cancelled: "Cancelled",
      completed: "Completed",
      inProgress: "In Progress",
      onTrack: "On Track",
      planned: "Planned"
    }
  }
} as const;

type SprintsCopy = (typeof copy)[AppLanguage];

function SprintsContentView({ refreshSignal = 0 }: { refreshSignal?: number }) {
  const { hasPermission, session } = useAuth();
  const navigate = useNavigate();
  const { direction, language, t } = useI18n();
  const [state, setState] = useState<SprintsState>({ status: "loading" });
  const [form, setForm] = useState<SprintFormState>(initialSprintForm);
  const [formError, setFormError] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingSprint, setEditingSprint] = useState<SprintRecord | null>(null);
  const [isSavingSprint, setIsSavingSprint] = useState(false);
  const pageCopy = copy[language];

  useEffect(() => {
    let isMounted = true;

    setState((current) => (current.status === "ready" ? current : { status: "loading" }));

    Promise.all([
      api.getSprints({ limit: 100, sortBy: "createdAt", sortOrder: "desc" }),
      api.getTaskReport({ limit: 100, sortBy: "lastProgressUpdateAt", sortOrder: "desc" }),
      api.getUsers({ limit: 100, sortBy: "fullName", sortOrder: "asc" }).catch(() => ({ data: [] as UserRecord[] }))
    ])
      .then(([sprintResult, taskResult, userResult]) => {
        if (isMounted) {
          setState({
            items: taskResult.data,
            sprints: sprintResult.data,
            status: "ready",
            users: userResult.data
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
              : "Sprints could not be loaded.",
          status: "error"
        });
      });

    return () => {
      isMounted = false;
    };
  }, [refreshSignal]);

  const items = state.status === "ready" ? state.items : [];
  const sprints = state.status === "ready" ? state.sprints : [];
  const users = state.status === "ready" ? state.users : [];
  const owners = useMemo(() => buildOwnerOptions(users, items), [items, users]);
  const ownersById = useMemo(() => buildOwnerDirectory(users, sprints), [sprints, users]);
  const summaries = useMemo(
    () => buildSprintSummaries(items, sprints, ownersById),
    [items, ownersById, sprints]
  );
  const metrics = useMemo(() => buildSprintMetrics(summaries), [summaries]);
  const activities = useMemo(() => buildActivity(items), [items]);
  const DrillIcon = direction === "rtl" ? ChevronRight : ChevronRight;
  const isEmployee = session?.roleCode === "employee";
  const canCreateSprint = !isEmployee && hasPermission("sprints:create");
  const canEditAnySprint = !isEmployee && hasPermission("sprints:update");

  function updateForm<TKey extends keyof SprintFormState>(
    key: TKey,
    value: SprintFormState[TKey]
  ) {
    setForm((current) => ({ ...current, [key]: value }));
    setFormError("");
  }

  function openCreateModal() {
    setForm(initialSprintForm);
    setEditingSprint(null);
    setFormError("");
    setIsCreateModalOpen(true);
  }

  function openEditModal(summary: SprintSummary) {
    if (!summary.sprint) {
      setFormError(pageCopy.modal.missingSprint);
      return;
    }

    setForm(toSprintFormState(summary.sprint));
    setEditingSprint(summary.sprint);
    setFormError("");
    setIsCreateModalOpen(true);
  }

  function closeSprintModal() {
    setIsCreateModalOpen(false);
    setEditingSprint(null);
    setForm(initialSprintForm);
    setFormError("");
  }

  async function handleSaveSprint(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isSprintFormValid(form)) {
      setFormError(pageCopy.modal.validation);
      return;
    }

    const progressTarget = Math.max(0, Math.min(100, Number(form.progressTarget)));
    const payload: CreateSprintPayload = {
      active: form.active,
      code: form.code.trim().toUpperCase(),
      ...(form.description.trim() ? { description: form.description.trim() } : {}),
      name: form.name.trim(),
      notifyLater: form.notifyLater,
      ownerId: form.ownerId,
      progressTarget,
      sprintArea: form.sprintType as SprintAreaKey,
      startDate: toApiDateTime(form.startDate),
      status: form.status,
      targetDate: toApiDateTime(form.targetDate)
    };

    setIsSavingSprint(true);

    try {
      const sprint = editingSprint
        ? await api.updateSprint(editingSprint.id, payload)
        : await api.createSprint(payload);

      setState((current) => {
        if (current.status !== "ready") {
          return current;
        }

        const nextSprints = editingSprint
          ? current.sprints.map((currentSprint) =>
              currentSprint.id === sprint.id ? sprint : currentSprint
            )
          : [sprint, ...current.sprints];

        return {
          ...current,
          sprints: nextSprints
        };
      });
      closeSprintModal();
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : pageCopy.modal.validation
      );
    } finally {
      setIsSavingSprint(false);
    }
  }

  return (
    <section
      className={`sprints-canvas${isCreateModalOpen ? " has-modal-open" : ""}`}
      aria-label={t("dashboard.navigation.sprints")}
    >
      <div className="sprints-page-actions">
        {!isEmployee ? (
          <button className="sprints-utility-button" type="button">
            <Download size={16} strokeWidth={2.25} aria-hidden="true" />
            {pageCopy.actions.export}
          </button>
        ) : null}
        <button className="sprints-utility-button" type="button">
          <Filter size={16} strokeWidth={2.25} aria-hidden="true" />
          {pageCopy.actions.filters}
        </button>
        {canCreateSprint ? (
          <button
            className="sprints-primary-button"
            onClick={openCreateModal}
            type="button"
          >
            <Plus size={17} strokeWidth={2.35} aria-hidden="true" />
            {pageCopy.actions.newSprint}
          </button>
        ) : null}
      </div>

      <div className="sprints-stat-grid">
        {buildMetricCards(metrics, pageCopy).map((card) => {
          const Icon = card.icon;

          return (
            <article className="sprints-stat-card" key={card.label}>
              <span className={`sprints-stat-icon sprints-tone-${card.tone}`}>
                <Icon size={26} strokeWidth={2.05} aria-hidden="true" />
              </span>
              <div>
                <span>{card.label}</span>
                <strong>{card.value}</strong>
                <small>{card.note}</small>
              </div>
            </article>
          );
        })}
      </div>

      <section className="sprints-area-list">
        {state.status === "error" ? (
          <p className="dashboard-empty-state">{state.message}</p>
        ) : null}

        {state.status === "loading" ? (
          <p className="dashboard-empty-state">{pageCopy.loading}</p>
        ) : null}

        {state.status === "ready"
          ? summaries.map((summary) => {
              const AreaIcon = resolveAreaIcon(summary.area);
              const owner = summary.owner;
              const canEditSprint =
                Boolean(summary.sprint) &&
                !isEmployee &&
                Boolean(
                  canEditAnySprint ||
                    summary.sprint?.ownerId === session?.userId ||
                    summary.sprint?.createdBy === session?.userId
                );

              return (
                <article className="sprints-area-row" key={summary.area.key}>
                  <span className={`sprints-area-icon ${getAreaIconClass(summary.area)}`}>
                    <AreaIcon size={32} strokeWidth={2.2} aria-hidden="true" />
                  </span>

                  <div className="sprints-area-main">
                    <h2>{getAreaLabel(summary.area, t)}</h2>
                    {summary.area.code ? <small>{summary.area.code}</small> : null}
                    <p>{getAreaDescription(summary.area, language)}</p>
                    <span className={`sprints-state-pill sprints-state-${summary.status}`}>
                      <i />
                      {formatSprintStatus(summary.status, language)}
                    </span>
                  </div>

                  <div className="sprints-progress-block">
                    <span>{pageCopy.notes.progress}</span>
                    <strong>{summary.progress}%</strong>
                    <div>
                      <i style={{ width: `${summary.progress}%` }} />
                    </div>
                    <small>{summary.progress}% complete</small>
                  </div>

                  <div className="sprints-area-stats" aria-label={getAreaLabel(summary.area, t)}>
                    <SprintStat label={pageCopy.notes.totalItems} value={summary.total} />
                    <SprintStat
                      label={pageCopy.notes.completed}
                      tone="green"
                      value={summary.completed}
                    />
                    <SprintStat
                      label={pageCopy.notes.inProgress}
                      tone="blue"
                      value={summary.inProgress}
                    />
                    <SprintStat
                      label={pageCopy.notes.blocked}
                      tone="red"
                      value={summary.blocked}
                    />
                    <SprintStat
                      label={pageCopy.notes.dueThisWeek}
                      tone="purple"
                      value={summary.dueThisWeek}
                    />
                  </div>

                  <div className="sprints-owner-block">
                    <span>{pageCopy.notes.owner}</span>
                    <div className="sprints-owner-person">
                      <strong>{resolveInitials(owner)}</strong>
                      <div>
                        <b>{owner?.fullName ?? "-"}</b>
                        <small>{owner?.jobTitle ?? owner?.department ?? owner?.email ?? "-"}</small>
                      </div>
                    </div>
                    <span>{pageCopy.notes.targetDate}</span>
                    <time>
                      <CalendarDays size={15} strokeWidth={2.2} aria-hidden="true" />
                      {formatDate(summary.targetDate, language)}
                    </time>
                  </div>

                  <div className="sprints-area-actions">
                    {canEditSprint ? (
                      <button
                        aria-label={`${pageCopy.actions.editSprint}: ${getAreaLabel(summary.area, t)}`}
                        className="sprints-edit-button"
                        onClick={() => openEditModal(summary)}
                        type="button"
                      >
                        <Pencil size={17} strokeWidth={2.25} />
                      </button>
                    ) : null}
                    <button
                      aria-label={getAreaLabel(summary.area, t)}
                      className="sprints-drill-button"
                      disabled={summary.area.custom}
                      onClick={() => {
                        if (!summary.area.custom) {
                          navigate(`/sprints/${summary.area.key}`);
                        }
                      }}
                      type="button"
                    >
                      <DrillIcon size={18} strokeWidth={2.35} />
                    </button>
                  </div>
                </article>
              );
            })
          : null}
      </section>

      <div className="sprints-lower-grid">
        <section className="sprints-panel sprints-activity-panel">
          <header className="sprints-panel-header">
            <h2>
              <Activity size={20} strokeWidth={2.1} aria-hidden="true" />
              {pageCopy.activity.title}
            </h2>
          </header>
          <div className="sprints-activity-list">
            {activities.map((activity) => (
              <article className="sprints-activity-row" key={activity.item.id}>
                <strong>{resolveInitials(activity.actor)}</strong>
                <span className={`sprints-activity-icon sprints-activity-${activity.status}`}>
                  {resolveActivityIcon(activity.status)}
                </span>
                <p>{formatActivityMessage(activity, language, t)}</p>
                <time>{formatDateTime(activity.createdAt, language)}</time>
              </article>
            ))}
          </div>
          <footer className="sprints-panel-footer">
            <button type="button">
              {pageCopy.actions.viewActivity}
              <ChevronRight size={15} strokeWidth={2.2} aria-hidden="true" />
            </button>
          </footer>
        </section>
      </div>

      {isCreateModalOpen ? (
        <CreateSprintModal
          copy={pageCopy}
          editing={Boolean(editingSprint)}
          error={formError}
          form={form}
          isSubmitting={isSavingSprint}
          language={language}
          onClose={closeSprintModal}
          onSubmit={handleSaveSprint}
          onUpdate={updateForm}
          owners={owners}
          t={t}
        />
      ) : null}
    </section>
  );
}

function SprintStat({
  label,
  tone = "default",
  value
}: {
  label: string;
  tone?: "blue" | "default" | "green" | "purple" | "red";
  value: number;
}) {
  return (
    <div className={`sprints-area-stat sprints-area-stat-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function CreateSprintModal({
  copy: pageCopy,
  editing,
  error,
  form,
  isSubmitting,
  language,
  onClose,
  onSubmit,
  onUpdate,
  owners,
  t
}: {
  copy: SprintsCopy;
  editing: boolean;
  error: string;
  form: SprintFormState;
  isSubmitting: boolean;
  language: AppLanguage;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onUpdate: <TKey extends keyof SprintFormState>(
    key: TKey,
    value: SprintFormState[TKey]
  ) => void;
  owners: DashboardUserReference[];
  t: (key: string) => string;
}) {
  const descriptionLength = form.description.length;
  const title = editing ? pageCopy.modal.editTitle : pageCopy.modal.title;
  const subtitle = editing ? pageCopy.modal.editSubtitle : pageCopy.modal.subtitle;
  const submitLabel = editing ? pageCopy.modal.update : pageCopy.modal.create;
  const SubmitIcon = editing ? Save : Plus;

  return (
    <div className="sprints-modal-backdrop" role="presentation">
      <form
        aria-labelledby="create-sprint-title"
        className="sprints-create-modal"
        onSubmit={onSubmit}
      >
        <header className="sprints-modal-header">
          <div>
            <h2 id="create-sprint-title">{title}</h2>
            <p>{subtitle}</p>
          </div>
          <button
            aria-label="Close"
            className="sprints-modal-close"
            disabled={isSubmitting}
            onClick={onClose}
            type="button"
          >
            <X size={20} strokeWidth={2.35} aria-hidden="true" />
          </button>
        </header>

        <div className="sprints-modal-grid">
          <SprintModalField
            icon={Flag}
            label={pageCopy.modal.name}
            required
          >
            <input
              maxLength={80}
              onChange={(event) => onUpdate("name", event.target.value)}
              placeholder={pageCopy.modal.namePlaceholder}
              value={form.name}
            />
          </SprintModalField>

          <SprintModalField
            icon={Hash}
            label={pageCopy.modal.sprintCode}
            required
          >
            <input
              maxLength={24}
              onChange={(event) => onUpdate("code", event.target.value)}
              placeholder={pageCopy.modal.sprintCodePlaceholder}
              value={form.code}
            />
          </SprintModalField>

          <SprintModalField
            icon={User}
            label={pageCopy.modal.owner}
            required
          >
            <select
              onChange={(event) => onUpdate("ownerId", event.target.value)}
              value={form.ownerId}
            >
              <option value="">{pageCopy.modal.ownerPlaceholder}</option>
              {owners.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {owner.fullName}
                </option>
              ))}
            </select>
          </SprintModalField>

          <SprintModalField
            icon={Flag}
            label={pageCopy.modal.status}
            required
          >
            <select
              onChange={(event) =>
                onUpdate("status", event.target.value as SprintStatus)
              }
              value={form.status}
            >
              {(["planned", "in_progress", "at_risk", "completed", "cancelled"] as const).map(
                (status) => (
                  <option key={status} value={status}>
                    {formatSprintStatus(status, language)}
                  </option>
                )
              )}
            </select>
          </SprintModalField>

          <SprintModalField
            icon={CalendarDays}
            label={pageCopy.modal.startDate}
            required
          >
            <input
              onChange={(event) => onUpdate("startDate", event.target.value)}
              type="date"
              value={form.startDate}
            />
          </SprintModalField>

          <SprintModalField
            icon={CalendarDays}
            label={pageCopy.modal.targetDate}
            required
          >
            <input
              min={form.startDate || undefined}
              onChange={(event) => onUpdate("targetDate", event.target.value)}
              type="date"
              value={form.targetDate}
            />
          </SprintModalField>

          <SprintModalField
            icon={Target}
            label={pageCopy.modal.progressTarget}
            required
          >
            <input
              inputMode="numeric"
              max={100}
              min={0}
              onChange={(event) => onUpdate("progressTarget", event.target.value)}
              placeholder={pageCopy.modal.progressTargetPlaceholder}
              type="number"
              value={form.progressTarget}
            />
          </SprintModalField>

          <SprintModalField
            icon={Tag}
            label={pageCopy.modal.sprintType}
            required
          >
            <select
              onChange={(event) =>
                onUpdate("sprintType", event.target.value as SprintFormState["sprintType"])
              }
              value={form.sprintType}
            >
              <option value="">{pageCopy.modal.sprintTypePlaceholder}</option>
              {sprintAreaDefinitions.map((area) => (
                <option key={area.key} value={area.key}>
                  {t(area.labelKey)}
                </option>
              ))}
            </select>
          </SprintModalField>

          <SprintModalField
            className="is-wide"
            icon={FileText}
            label={pageCopy.modal.description}
          >
            <textarea
              maxLength={500}
              onChange={(event) => onUpdate("description", event.target.value)}
              placeholder={pageCopy.modal.descriptionPlaceholder}
              value={form.description}
            />
            <span className="sprints-modal-counter">{descriptionLength} / 500</span>
          </SprintModalField>
        </div>

        <div className="sprints-modal-switch-row">
          <SprintModalSwitch
            checked={form.active}
            description={pageCopy.modal.activeHelp}
            icon={CircleDot}
            label={pageCopy.modal.activeLabel}
            onChange={(value) => onUpdate("active", value)}
          />
          <SprintModalSwitch
            checked={form.notifyLater}
            description={pageCopy.modal.notifyHelp}
            icon={Bell}
            label={pageCopy.modal.notifyLabel}
            onChange={(value) => onUpdate("notifyLater", value)}
          />
        </div>

        {error ? <p className="sprints-modal-error">{error}</p> : null}

        <footer className="sprints-modal-footer">
          <button
            className="sprints-modal-cancel"
            disabled={isSubmitting}
            onClick={onClose}
            type="button"
          >
            {pageCopy.modal.cancel}
          </button>
          <button
            className="sprints-modal-submit"
            disabled={isSubmitting}
            type="submit"
          >
            <SubmitIcon size={17} strokeWidth={2.35} aria-hidden="true" />
            {submitLabel}
          </button>
        </footer>
      </form>
    </div>
  );
}

function SprintModalField({
  children,
  className = "",
  icon: Icon,
  label,
  required = false
}: {
  children: ReactNode;
  className?: string;
  icon: LucideIcon;
  label: string;
  required?: boolean;
}) {
  return (
    <label className={`sprints-modal-field ${className}`}>
      <Icon size={18} strokeWidth={2.15} aria-hidden="true" />
      <span>
        {label}
        {required ? <b aria-hidden="true">*</b> : null}
      </span>
      {children}
    </label>
  );
}

function SprintModalSwitch({
  checked,
  description,
  icon: Icon,
  label,
  onChange
}: {
  checked: boolean;
  description: string;
  icon: LucideIcon;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="sprints-modal-switch-item">
      <button
        aria-pressed={checked}
        className={`sprints-modal-switch${checked ? " is-on" : ""}`}
        onClick={() => onChange(!checked)}
        type="button"
      >
        <span />
      </button>
      <Icon size={18} strokeWidth={2.2} aria-hidden="true" />
      <div>
        <strong>{label}</strong>
        <small>{description}</small>
      </div>
    </div>
  );
}

function buildSprintSummaries(
  items: TaskReportRow[],
  sprintRecords: SprintRecord[],
  ownersById: Map<string, DashboardUserReference>
): SprintSummary[] {
  return sprintAreaDefinitions.map((area) => {
    const areaItems = items.filter((item) => area.categories.includes(item.category));
    const savedSprint = findSprintRecordForArea(sprintRecords, area.key);
    const completed = areaItems.filter((item) => item.status === "completed").length;
    const blocked = areaItems.filter((item) => item.status === "blocked").length;
    const delayed = areaItems.filter(isDelayedSprintItem).length;
    const inProgress = areaItems.filter((item) =>
      ["assigned", "in_progress", "open", "waiting_review"].includes(item.status)
    ).length;
    const dueThisWeek = areaItems.filter(isDueThisWeek).length;
    const progress =
      areaItems.length > 0
        ? Math.round(
            areaItems.reduce((sum, item) => sum + item.progress, 0) / areaItems.length
          )
        : 0;
    const status = resolveSprintStatus(areaItems, blocked, delayed, completed);

    return {
      area: toDisplayArea(area),
      blocked,
      completed,
      dueThisWeek,
      inProgress,
      items: areaItems,
      owner: resolveSprintOwner(savedSprint, ownersById, areaItems),
      progress,
      sprint: savedSprint,
      status: savedSprint?.status ?? status,
      targetDate: savedSprint?.targetDate ?? resolveTargetDate(areaItems),
      total: areaItems.length
    };
  });
}

function buildStoredSprintSummaries(
  records: SprintRecord[],
  ownersById = new Map<string, DashboardUserReference>()
): SprintSummary[] {
  return records.map((record) => ({
    area: {
      categories: [],
      code: record.code,
      custom: true,
      description: record.description,
      icon: resolveAreaIcon(record.sprintArea),
      key: `sprint-${record.id}`,
      label: record.name,
      tone: resolveAreaTone(record.sprintArea)
    },
    blocked: record.status === "at_risk" ? 1 : 0,
    completed: record.status === "completed" ? 1 : 0,
    dueThisWeek: isStoredSprintDueThisWeek(record) ? 1 : 0,
    inProgress: record.status === "in_progress" ? 1 : 0,
    items: [],
    owner: resolveSprintOwner(record, ownersById, []),
    progress: record.progressTarget,
    status: record.status,
    targetDate: record.targetDate,
    total: 0
  }));
}

function findSprintRecordForArea(
  records: SprintRecord[],
  areaKey: SprintAreaKey
): SprintRecord | undefined {
  return records
    .filter((record) => record.sprintArea === areaKey)
    .sort(
      (left, right) =>
        new Date(right.updatedAt ?? right.createdAt ?? 0).getTime() -
        new Date(left.updatedAt ?? left.createdAt ?? 0).getTime()
    )[0];
}

function toSprintFormState(sprint: SprintRecord): SprintFormState {
  return {
    active: sprint.active,
    code: sprint.code,
    description: sprint.description ?? "",
    name: sprint.name,
    notifyLater: sprint.notifyLater,
    ownerId: sprint.ownerId,
    progressTarget: String(sprint.progressTarget),
    sprintType: sprint.sprintArea,
    startDate: toDateInputValue(sprint.startDate),
    status: sprint.status,
    targetDate: toDateInputValue(sprint.targetDate)
  };
}

function toDisplayArea(area: SprintAreaDefinition): SprintDisplayArea {
  return {
    categories: area.categories,
    icon: area.icon,
    key: area.key,
    label: "",
    labelKey: area.labelKey,
    tone: resolveAreaTone(area.key)
  };
}

function buildSprintMetrics(summaries: SprintSummary[]) {
  return {
    active: summaries.filter((summary) => summary.status === "in_progress").length,
    atRisk: summaries.filter((summary) => summary.status === "at_risk").length,
    completed: summaries.filter((summary) => summary.status === "completed").length,
    total: summaries.length
  };
}

function buildOwnerOptions(
  users: UserRecord[],
  items: TaskReportRow[]
): DashboardUserReference[] {
  const owners = new Map<string, DashboardUserReference>();

  for (const user of users) {
    owners.set(user.id, {
      department: user.department,
      email: user.email,
      fullName: user.fullName,
      id: user.id,
      jobTitle: user.jobTitle
    });
  }

  for (const item of items) {
    for (const user of [item.assignedTo, item.createdBy, item.reviewedBy]) {
      if (user) {
        owners.set(user.id, user);
      }
    }
  }

  return [...owners.values()].sort((left, right) =>
    left.fullName.localeCompare(right.fullName)
  );
}

function buildOwnerDirectory(
  users: UserRecord[],
  sprints: SprintRecord[]
): Map<string, DashboardUserReference> {
  const owners = new Map<string, DashboardUserReference>();

  for (const user of users) {
    owners.set(user.id, {
      department: user.department,
      email: user.email,
      fullName: user.fullName,
      id: user.id,
      jobTitle: user.jobTitle
    });
  }

  for (const sprint of sprints) {
    if (sprint.owner) {
      owners.set(sprint.owner.id, sprint.owner);
    }
  }

  return owners;
}

function resolveSprintOwner(
  sprint: SprintRecord | undefined,
  ownersById: Map<string, DashboardUserReference>,
  fallbackItems: TaskReportRow[]
): DashboardUserReference | undefined {
  if (!sprint) {
    return resolveOwner(fallbackItems);
  }

  return sprint.owner ?? ownersById.get(sprint.ownerId);
}

function isSprintFormValid(form: SprintFormState): boolean {
  const progressTarget = Number(form.progressTarget);

  return Boolean(
    form.name.trim() &&
      form.code.trim() &&
      form.ownerId &&
      form.startDate &&
      form.targetDate &&
      form.sprintType &&
      Number.isFinite(progressTarget) &&
      progressTarget >= 0 &&
      progressTarget <= 100
  );
}

function buildMetricCards(
  metrics: ReturnType<typeof buildSprintMetrics>,
  pageCopy: (typeof copy)["en" | "ar"]
) {
  return [
    {
      icon: CalendarCheck2,
      label: pageCopy.metrics.total,
      note: pageCopy.metrics.totalNote,
      tone: "blue",
      value: String(metrics.total)
    },
    {
      icon: PlayCircle,
      label: pageCopy.metrics.active,
      note: pageCopy.metrics.activeNote,
      tone: "green",
      value: String(metrics.active)
    },
    {
      icon: AlertTriangle,
      label: pageCopy.metrics.atRisk,
      note: pageCopy.metrics.atRiskNote,
      tone: "orange",
      value: String(metrics.atRisk)
    },
    {
      icon: CheckCircle2,
      label: pageCopy.metrics.completed,
      note: pageCopy.metrics.completedNote,
      tone: "red",
      value: String(metrics.completed)
    }
  ] satisfies Array<{
    icon: LucideIcon;
    label: string;
    note: string;
    tone: "blue" | "green" | "orange" | "red";
    value: string;
  }>;
}

function formatMilestoneFooter(count: number, language: AppLanguage): string {
  if (count === 0) {
    return formatNoMilestonesMessage(language);
  }

  return language === "ar"
    ? `عرض 1 إلى ${count} من ${count} مراحل`
    : `Showing 1 to ${count} of ${count} milestones`;
}

function formatNoMilestonesMessage(language: AppLanguage): string {
  return language === "ar"
    ? "لا توجد مراحل سبرنت بتاريخ استحقاق حتى الآن."
    : "No sprint milestones with due dates yet.";
}

function buildActivity(items: TaskReportRow[]): ActivityRow[] {
  return items
    .slice()
    .sort(
      (left, right) =>
        new Date(right.lastProgressUpdateAt ?? right.createdAt ?? 0).getTime() -
        new Date(left.lastProgressUpdateAt ?? left.createdAt ?? 0).getTime()
    )
    .slice(0, 5)
    .map((item) => ({
      actor: item.assignedTo ?? item.createdBy,
      area: getSprintAreaByCategory(item.category) ?? sprintAreaDefinitions[0],
      createdAt: item.lastProgressUpdateAt ?? item.createdAt,
      item,
      status: resolveSprintStatus([item], item.status === "blocked" ? 1 : 0, isDelayedSprintItem(item) ? 1 : 0, item.status === "completed" ? 1 : 0)
    }));
}

function resolveSprintStatus(
  items: TaskReportRow[],
  blocked: number,
  delayed: number,
  completed: number
): SprintStatus {
  if (blocked > 0 || delayed > 0) {
    return "at_risk";
  }

  if (items.length > 0 && completed === items.length) {
    return "completed";
  }

  if (items.length > 0) {
    return "in_progress";
  }

  return "planned";
}

function resolveOwner(items: TaskReportRow[]): DashboardUserReference | undefined {
  const owners = new Map<string, { count: number; user: DashboardUserReference }>();

  for (const item of items) {
    const user = item.assignedTo ?? item.createdBy;

    if (!user) {
      continue;
    }

    const current = owners.get(user.id);
    owners.set(user.id, {
      count: (current?.count ?? 0) + 1,
      user
    });
  }

  return [...owners.values()].sort((left, right) => right.count - left.count)[0]?.user;
}

function resolveTargetDate(items: TaskReportRow[]): string | undefined {
  const timestamps = items
    .map((item) => (item.dueDate ? new Date(item.dueDate).getTime() : Number.NaN))
    .filter((value) => !Number.isNaN(value));

  if (timestamps.length === 0) {
    return undefined;
  }

  return new Date(Math.max(...timestamps)).toISOString();
}

function isDueThisWeek(item: TaskReportRow): boolean {
  if (!item.dueDate || item.status === "completed" || item.status === "cancelled") {
    return false;
  }

  const dueTime = new Date(item.dueDate).getTime();
  const now = Date.now();
  const weekFromNow = now + 7 * 24 * 60 * 60 * 1000;

  return !Number.isNaN(dueTime) && dueTime >= now && dueTime <= weekFromNow;
}

function isDelayedSprintItem(item: TaskReportRow): boolean {
  if (!item.dueDate || item.status === "completed" || item.status === "cancelled") {
    return false;
  }

  const dueTime = new Date(item.dueDate).getTime();

  return !Number.isNaN(dueTime) && dueTime < Date.now();
}

function isStoredSprintDueThisWeek(record: SprintRecord): boolean {
  if (!record.targetDate || record.status === "completed" || record.status === "cancelled") {
    return false;
  }

  const dueTime = new Date(record.targetDate).getTime();
  const now = Date.now();
  const weekFromNow = now + 7 * 24 * 60 * 60 * 1000;

  return !Number.isNaN(dueTime) && dueTime >= now && dueTime <= weekFromNow;
}

function resolveAreaIcon(area: SprintAreaKey | SprintDisplayArea): LucideIcon {
  if (typeof area !== "string") {
    return area.icon;
  }

  const key = area;

  switch (key) {
    case "facility":
      return Building2;
    case "infrastructure":
      return Server;
    case "master_data_collection":
      return Database;
    default:
      return Code2;
  }
}

function resolveAreaTone(key: SprintAreaKey): SprintDisplayArea["tone"] {
  switch (key) {
    case "facility":
      return "green";
    case "infrastructure":
      return "purple";
    case "master_data_collection":
      return "orange";
    default:
      return "blue";
  }
}

function getAreaIconClass(area: SprintDisplayArea): string {
  if (!area.custom && area.key === "development") {
    return "sprints-area-development";
  }

  if (!area.custom && area.key === "facility") {
    return "sprints-area-facility";
  }

  if (!area.custom && area.key === "infrastructure") {
    return "sprints-area-infrastructure";
  }

  if (!area.custom && area.key === "master_data_collection") {
    return "sprints-area-master-data";
  }

  return `sprints-area-tone-${area.tone}`;
}

function getAreaLabel(area: SprintDisplayArea, t: (key: string) => string): string {
  return area.labelKey ? t(area.labelKey) : area.label;
}

function getAreaDescription(area: SprintDisplayArea, language: AppLanguage): string {
  if (area.custom) {
    return area.description || areaDescriptions[language].development;
  }

  return areaDescriptions[language][area.key as SprintAreaKey];
}

function resolveActivityIcon(status: SprintStatus) {
  switch (status) {
    case "at_risk":
      return <AlertTriangle size={17} strokeWidth={2.2} aria-hidden="true" />;
    case "completed":
      return <CheckCircle2 size={17} strokeWidth={2.2} aria-hidden="true" />;
    default:
      return <TrendingUp size={17} strokeWidth={2.2} aria-hidden="true" />;
  }
}

function formatSprintStatus(status: SprintStatus, language: AppLanguage): string {
  const pageCopy = copy[language];

  switch (status) {
    case "at_risk":
      return pageCopy.statuses.atRisk;
    case "completed":
      return pageCopy.statuses.completed;
    case "cancelled":
      return pageCopy.statuses.cancelled;
    case "planned":
      return pageCopy.statuses.planned;
    default:
      return pageCopy.statuses.inProgress;
  }
}

function formatActivityMessage(
  activity: ActivityRow,
  language: AppLanguage,
  t: (key: string) => string
): string {
  const pageCopy = copy[language];
  const actor = activity.actor?.fullName ?? "-";
  const sprint = t(activity.area.labelKey);
  const itemCode = formatSprintItemCode(activity.item);

  if (activity.status === "completed") {
    return pageCopy.activity.completed
      .replace("{actor}", actor)
      .replace("{item}", itemCode);
  }

  if (activity.status === "at_risk") {
    return pageCopy.activity.changedStatus
      .replace("{actor}", actor)
      .replace("{sprint}", sprint);
  }

  return pageCopy.activity.progress
    .replace("{actor}", actor)
    .replace("{sprint}", sprint)
    .replace("{progress}", String(activity.item.progress));
}

function formatSprintItemCode(item: TaskReportRow): string {
  const area = getSprintAreaByCategory(item.category);
  const prefix =
    area?.key === "facility"
      ? "FAC"
      : area?.key === "infrastructure"
        ? "INF"
        : area?.key === "master_data_collection"
          ? "MDC"
        : "DEV";
  const numericPart = item.taskCode.match(/\d+/g)?.at(-1);

  if (numericPart) {
    return `${prefix}-${numericPart.padStart(4, "0")}`;
  }

  return `${prefix}-${item.id.slice(-4).toUpperCase()}`;
}

function formatDate(value: string | undefined, language: AppLanguage): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat(language === "ar" ? "ar-LY" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(date);
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
    month: "short",
    year: "numeric"
  }).format(date);
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

  return initials || "-";
}

function toApiDateTime(value: string): string {
  return new Date(`${value}T09:00:00`).toISOString();
}

function toDateInputValue(value: string | undefined): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

export const SprintsContent = memo(SprintsContentView);
