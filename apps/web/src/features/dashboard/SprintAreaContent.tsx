import {
  Activity,
  AlertTriangle,
  Bell,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Code2,
  Download,
  Edit3,
  Eye,
  FileText,
  Flag,
  Hash,
  MoreVertical,
  Plus,
  Save,
  Server,
  Target,
  Trash2,
  User,
  Users,
  XCircle,
  type LucideIcon
} from "lucide-react";
import {
  memo,
  type FormEvent,
  type MouseEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState
} from "react";
import { useParams } from "react-router-dom";

import {
  api,
  type CreateSprintPayload,
  type DashboardUserReference,
  type Session,
  type SprintRecord,
  type SprintStatus,
  type TaskRecord,
  type TaskReportRow,
  type TaskStatus,
  type TaskUpdateRecord,
  type UserRecord
} from "../../api/client";
import { useI18n } from "../../i18n";
import type { AppLanguage } from "../../i18n/locale";
import {
  type SprintAreaDefinition,
  type SprintAreaKey,
  getSprintAreaDefinition,
  sprintAreaDefinitions
} from "./sprintAreas";
import { SprintItemsQuickActionModal } from "./SprintItemsContent";

type SprintAreaState =
  | { items: TaskReportRow[]; sprint?: SprintRecord; status: "ready" }
  | { message: string; status: "error" }
  | { status: "loading" };

type SprintAreaStatus = "at_risk" | "completed" | "in_progress" | "planned";

type SprintAreaMetrics = {
  blocked: number;
  completed: number;
  dueThisWeek: number;
  inProgress: number;
  progress: number;
  total: number;
};

type SprintOverview = SprintAreaMetrics & {
  owner?: DashboardUserReference;
  startDate?: string;
  status: SprintAreaStatus;
  targetDate?: string;
};

type TeamAllocation = {
  allocation: number;
  taskCount: number;
  user: DashboardUserReference;
  workload: number;
};

type BlockerRow = {
  item: TaskReportRow;
  reason?: string;
  since?: string;
};

type SprintItemDetailMode = "edit" | "view";

type SprintItemStatusForm = {
  blockedReason: string;
  note: string;
  progress: string;
  status: TaskStatus;
};

type SprintItemDetailState = {
  details?: TaskRecord;
  error?: string;
  item: TaskReportRow;
  mode: SprintItemDetailMode;
  status: "error" | "loading" | "ready";
  updates: TaskUpdateRecord[];
};

type SprintItemActionMenuState = {
  itemId: string;
  left: number;
  top: number;
};

type SprintEditFormState = {
  active: boolean;
  code: string;
  description: string;
  name: string;
  notifyLater: boolean;
  ownerId: string;
  progressTarget: string;
  sprintArea: SprintAreaKey;
  startDate: string;
  status: SprintStatus;
  targetDate: string;
};

type SprintOwnerOptionsState =
  | { status: "error" }
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; users: UserRecord[] };

type SprintQuickAction = "createItem";

const initialSprintEditForm: SprintEditFormState = {
  active: true,
  code: "",
  description: "",
  name: "",
  notifyLater: false,
  ownerId: "",
  progressTarget: "0",
  sprintArea: "development",
  startDate: "",
  status: "planned",
  targetDate: ""
};

type Copy = {
  actions: {
    addItem: string;
    edit: string;
    export: string;
    more: string;
    view: string;
  };
  blocker: {
    blockedBy: string;
    itemId: string;
    since: string;
    title: string;
    viewAll: string;
  };
  description: Record<SprintAreaKey, string>;
  footer: string;
  loading: string;
  metrics: {
    blocked: string;
    completed: string;
    dueThisWeek: string;
    inProgress: string;
    overall: string;
    total: string;
  };
  notes: {
    allItems: string;
    complete: string;
    ofTotal: string;
  };
  overview: {
    owner: string;
    startDate: string;
    targetDate: string;
  };
  panels: {
    activity: string;
    blockers: string;
    items: string;
    milestones: string;
    team: string;
    viewActivity: string;
    viewBlockers: string;
  };
  status: {
    atRisk: string;
    blocked: string;
    completed: string;
    inProgress: string;
    pending: string;
    planned: string;
    review: string;
  };
  table: {
    actions: string;
    allocation: string;
    assignee: string;
    dueDate: string;
    itemId: string;
    priority: string;
    progress: string;
    role: string;
    status: string;
    teamMember: string;
    title: string;
    workload: string;
  };
};

const copy: Record<AppLanguage, Copy> = {
  ar: {
    actions: {
      addItem: "إضافة عنصر سبرنت",
      edit: "تعديل السبرنت",
      export: "تصدير",
      more: "إجراءات",
      view: "عرض"
    },
    blocker: {
      blockedBy: "محجوب بواسطة",
      itemId: "المعرف",
      since: "منذ",
      title: "العنوان",
      viewAll: "عرض كل العوائق"
    },
    description: {
      development: "يركز هذا السبرنت على تطوير وحدات ERP الأساسية والواجهات والتكاملات والاختبارات.",
      facility: "يركز هذا السبرنت على جاهزية الغرف ومحطات العمل ومناطق التدريب ودعم الإطلاق.",
      infrastructure: "يركز هذا السبرنت على الخوادم والشبكات والاستضافة والنسخ الاحتياطي والصلاحيات."
    },
    footer: "Harouge Oil Operations | 2026 ©",
    loading: "جاري تحميل تفاصيل السبرنت...",
    metrics: {
      blocked: "محجوب",
      completed: "مكتمل",
      dueThisWeek: "مستحق هذا الأسبوع",
      inProgress: "قيد التنفيذ",
      overall: "التقدم العام",
      total: "إجمالي عناصر السبرنت"
    },
    notes: {
      allItems: "كل العناصر في السبرنت",
      complete: "مكتمل",
      ofTotal: "من الإجمالي"
    },
    overview: {
      owner: "مسؤول السبرنت",
      startDate: "تاريخ البداية",
      targetDate: "التاريخ المستهدف"
    },
    panels: {
      activity: "آخر نشاط السبرنت",
      blockers: "العوائق الحالية",
      items: "عناصر السبرنت",
      milestones: "مراحل السبرنت",
      team: "توزيع الفريق",
      viewActivity: "عرض كل النشاطات",
      viewBlockers: "عرض كل العوائق"
    },
    status: {
      atRisk: "معرض للخطر",
      blocked: "محجوب",
      completed: "مكتمل",
      inProgress: "قيد التنفيذ",
      pending: "معلق",
      planned: "مخطط",
      review: "قيد المراجعة"
    },
    table: {
      actions: "الإجراءات",
      allocation: "التوزيع",
      assignee: "المسؤول",
      dueDate: "تاريخ الاستحقاق",
      itemId: "معرف العنصر",
      priority: "الأولوية",
      progress: "التقدم",
      role: "الدور",
      status: "الحالة",
      teamMember: "عضو الفريق",
      title: "العنوان",
      workload: "عبء العمل"
    }
  },
  en: {
    actions: {
      addItem: "Add Sprint Item",
      edit: "Edit Sprint",
      export: "Export",
      more: "More actions",
      view: "View"
    },
    blocker: {
      blockedBy: "Blocked By",
      itemId: "Item ID",
      since: "Since",
      title: "Title",
      viewAll: "View all blockers"
    },
    description: {
      development: "This sprint focuses on developing core software modules, APIs, user interfaces, and integrations.",
      facility: "This sprint focuses on room readiness, workstation preparation, training areas, and rollout support.",
      infrastructure: "This sprint focuses on servers, network, hosting, backup, access, and security readiness."
    },
    footer: "Harouge Oil Operations | 2026 ©",
    loading: "Loading sprint detail...",
    metrics: {
      blocked: "Blocked",
      completed: "Completed",
      dueThisWeek: "Due This Week",
      inProgress: "In Progress",
      overall: "Overall Progress",
      total: "Total Sprint Items"
    },
    notes: {
      allItems: "All items in sprint",
      complete: "complete",
      ofTotal: "of total"
    },
    overview: {
      owner: "Sprint Owner",
      startDate: "Start Date",
      targetDate: "Target Date"
    },
    panels: {
      activity: "Recent Sprint Activity",
      blockers: "Current Blockers",
      items: "Sprint Items",
      milestones: "Sprint Milestones",
      team: "Team Allocation",
      viewActivity: "View all activity",
      viewBlockers: "View all blockers"
    },
    status: {
      atRisk: "At Risk",
      blocked: "Blocked",
      completed: "Completed",
      inProgress: "In Progress",
      pending: "Pending",
      planned: "Planned",
      review: "Under Review"
    },
    table: {
      actions: "Actions",
      allocation: "Allocation",
      assignee: "Assignee",
      dueDate: "Due Date",
      itemId: "Item ID",
      priority: "Priority",
      progress: "Progress",
      role: "Role",
      status: "Status",
      teamMember: "Team Member",
      title: "Title",
      workload: "Workload"
    }
  }
};

function SprintAreaContentView({
  refreshSignal = 0,
  session
}: {
  refreshSignal?: number;
  session: Session;
}) {
  const { areaKey } = useParams();
  const { language, t } = useI18n();
  const area = getSprintAreaDefinition(areaKey) ?? sprintAreaDefinitions[0];
  const pageCopy = copy[language];
  const [state, setState] = useState<SprintAreaState>({ status: "loading" });
  const [openActionMenu, setOpenActionMenu] = useState<SprintItemActionMenuState | null>(null);
  const [detailState, setDetailState] = useState<SprintItemDetailState | null>(null);
  const [statusForm, setStatusForm] = useState<SprintItemStatusForm | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [quickAction, setQuickAction] = useState<SprintQuickAction | null>(null);
  const [isSprintEditOpen, setIsSprintEditOpen] = useState(false);
  const [sprintEditForm, setSprintEditForm] = useState<SprintEditFormState>(
    initialSprintEditForm
  );
  const [sprintEditError, setSprintEditError] = useState<string | null>(null);
  const [isSavingSprint, setIsSavingSprint] = useState(false);
  const [ownerOptions, setOwnerOptions] = useState<SprintOwnerOptionsState>({
    status: "idle"
  });

  useEffect(() => {
    let isMounted = true;

    setState((current) => (current.status === "ready" ? current : { status: "loading" }));

    Promise.all([
      api.getTaskReport({ limit: 100, sortBy: "lastProgressUpdateAt", sortOrder: "desc" }),
      api.getSprints({ limit: 1, sprintArea: area.key })
    ])
      .then(([result, sprintResult]) => {
        if (isMounted) {
          setState({
            items: result.data,
            sprint: sprintResult.data[0],
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
              : "Sprint area data could not be loaded.",
          status: "error"
        });
      });

    return () => {
      isMounted = false;
    };
  }, [area.key, refreshSignal]);

  const items = useMemo(
    () =>
      state.status === "ready"
        ? state.items.filter((item) => area.categories.includes(item.category))
        : [],
    [area.categories, state]
  );
  const sprint = state.status === "ready" ? state.sprint : undefined;
  const overview = useMemo(() => buildSprintOverview(items, sprint), [items, sprint]);
  const team = useMemo(() => buildTeamAllocation(items), [items]);
  const milestones = useMemo(() => buildMilestones(items), [items]);
  const activities = useMemo(() => buildActivities(items), [items]);
  const blockers = useMemo(() => buildBlockers(items), [items]);
  const AreaIcon = resolveAreaIcon(area.key);
  const isEmployee = session.roleCode === "employee";
  const canManageItems =
    session.permissionCodes.includes("tasks:update") ||
    session.permissionCodes.includes("tasks:change_status");
  const canCreateSprintItem =
    !isEmployee &&
    (session.permissionCodes.includes("tasks:create") ||
      ["it_manager", "super_admin"].includes(session.roleCode));
  const canEditSprint =
    Boolean(sprint) &&
    !isEmployee &&
    (session.permissionCodes.includes("sprints:update") ||
      ["it_manager", "super_admin"].includes(session.roleCode) ||
      sprint?.ownerId === session.userId ||
      sprint?.createdBy === session.userId);
  const openActionMenuItem = openActionMenu
    ? items.find((item) => item.id === openActionMenu.itemId)
    : undefined;
  const sprintOwnerOptions = useMemo(
    () => buildSprintOwnerOptions(ownerOptions, sprint),
    [ownerOptions, sprint]
  );

  useEffect(() => {
    if (!openActionMenu) {
      return;
    }

    function closeMenu(event: PointerEvent) {
      const target = event.target as HTMLElement | null;

      if (
        target?.closest("[data-sprint-detail-floating-menu]") ||
        target?.closest("[data-sprint-detail-menu-trigger]")
      ) {
        return;
      }

      setOpenActionMenu(null);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenActionMenu(null);
      }
    }

    function closeOnScroll() {
      setOpenActionMenu(null);
    }

    document.addEventListener("pointerdown", closeMenu);
    document.addEventListener("keydown", closeOnEscape);
    window.addEventListener("scroll", closeOnScroll, true);

    return () => {
      document.removeEventListener("pointerdown", closeMenu);
      document.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("scroll", closeOnScroll, true);
    };
  }, [openActionMenu]);

  useEffect(() => {
    if (!isSprintEditOpen) {
      return;
    }

    let isMounted = true;

    setOwnerOptions((current) => (current.status === "ready" ? current : { status: "loading" }));

    api.getUsers({ limit: 100, sortBy: "fullName", sortOrder: "asc", status: "active" })
      .then((result) => {
        if (isMounted) {
          setOwnerOptions({ status: "ready", users: result.data });
        }
      })
      .catch(() => {
        if (isMounted) {
          setOwnerOptions({ status: "error" });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isSprintEditOpen, refreshSignal]);

  function refreshAreaData() {
    setState((current) => (current.status === "ready" ? current : { status: "loading" }));

    Promise.all([
      api.getTaskReport({ limit: 100, sortBy: "lastProgressUpdateAt", sortOrder: "desc" }),
      api.getSprints({ limit: 1, sprintArea: area.key })
    ])
      .then(([result, sprintResult]) => {
        setState({
          items: result.data,
          sprint: sprintResult.data[0],
          status: "ready"
        });
      })
      .catch((error: unknown) => {
        setState({
          message:
            error instanceof Error
              ? error.message
              : "Sprint area data could not be loaded.",
          status: "error"
        });
      });
  }

  function openSprintItemDetail(item: TaskReportRow, mode: SprintItemDetailMode) {
    setOpenActionMenu(null);
    setStatusError(null);
    setDetailState({ item, mode, status: "loading", updates: [] });
    setStatusForm(toStatusForm(item));

    Promise.all([
      api.getSprintItem(item.id),
      api.getSprintItemUpdates(item.id)
    ])
      .then(([details, updates]) => {
        setDetailState({
          details,
          item,
          mode,
          status: "ready",
          updates: updates.data
        });
        setStatusForm(toStatusForm(item, details));
      })
      .catch((error: unknown) => {
        setDetailState({
          error:
            error instanceof Error
              ? error.message
              : "Sprint item details could not be loaded.",
          item,
          mode,
          status: "error",
          updates: []
        });
      });
  }

  async function cancelSprintItem(item: TaskReportRow) {
    setOpenActionMenu(null);

    const confirmed = window.confirm(
      language === "ar"
        ? "هل تريد إلغاء عنصر السبرنت هذا؟ سيتم حفظ العملية في سجل النشاط."
        : "Cancel this sprint item? The action will be kept in the activity history."
    );

    if (!confirmed) {
      return;
    }

    try {
      await api.changeTaskStatus(item.id, {
        note:
          language === "ar"
            ? "تم إلغاء عنصر السبرنت من قائمة الإجراءات."
            : "Sprint item cancelled from row actions.",
        status: "cancelled"
      });
      refreshAreaData();
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : language === "ar"
            ? "تعذر إلغاء عنصر السبرنت."
            : "Sprint item could not be cancelled."
      );
    }
  }

  function toggleActionMenu(
    itemId: string,
    event: MouseEvent<HTMLButtonElement>
  ) {
    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 152;
    const menuHeight = 112;
    const gap = 8;
    const left =
      language === "ar"
        ? Math.min(Math.max(gap, rect.left), window.innerWidth - menuWidth - gap)
        : Math.min(
            Math.max(gap, rect.right - menuWidth),
            window.innerWidth - menuWidth - gap
          );
    const top =
      rect.bottom + gap + menuHeight > window.innerHeight
        ? Math.max(gap, rect.top - menuHeight - gap)
        : rect.bottom + gap;

    setOpenActionMenu((current) =>
      current?.itemId === itemId ? null : { itemId, left, top }
    );
  }

  function openSprintEditModal() {
    if (!sprint) {
      window.alert(
        language === "ar"
          ? "لا يوجد سجل محفوظ لهذا السبرنت لتعديله."
          : "This sprint area does not have a saved sprint record to edit yet."
      );
      return;
    }

    if (!canEditSprint) {
      window.alert(
        language === "ar"
          ? "ليست لديك صلاحية تعديل هذا السبرنت."
          : "You do not have permission to edit this sprint."
      );
      return;
    }

    setSprintEditForm(toSprintEditForm(sprint));
    setSprintEditError(null);
    setIsSprintEditOpen(true);
  }

  function closeSprintEditModal() {
    if (isSavingSprint) {
      return;
    }

    setIsSprintEditOpen(false);
    setSprintEditForm(initialSprintEditForm);
    setSprintEditError(null);
  }

  function updateSprintEditForm<TKey extends keyof SprintEditFormState>(
    key: TKey,
    value: SprintEditFormState[TKey]
  ) {
    setSprintEditForm((current) => ({ ...current, [key]: value }));
    setSprintEditError(null);
  }

  async function handleSaveSprintEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!sprint) {
      setSprintEditError(
        language === "ar"
          ? "لا يوجد سجل محفوظ لهذا السبرنت."
          : "This sprint record is not available."
      );
      return;
    }

    if (!isSprintEditFormValid(sprintEditForm)) {
      setSprintEditError(
        language === "ar"
          ? "أكمل الحقول المطلوبة قبل حفظ السبرنت."
          : "Complete the required fields before saving the sprint."
      );
      return;
    }

    const progressTarget = Math.max(
      0,
      Math.min(100, Number(sprintEditForm.progressTarget))
    );
    const payload: CreateSprintPayload = {
      active: sprintEditForm.active,
      code: sprintEditForm.code.trim().toUpperCase(),
      ...(sprintEditForm.description.trim()
        ? { description: sprintEditForm.description.trim() }
        : {}),
      name: sprintEditForm.name.trim(),
      notifyLater: sprintEditForm.notifyLater,
      ownerId: sprintEditForm.ownerId,
      progressTarget,
      sprintArea: sprintEditForm.sprintArea,
      startDate: toApiDateTime(sprintEditForm.startDate, "09:00"),
      status: sprintEditForm.status,
      targetDate: toApiDateTime(sprintEditForm.targetDate, "17:00")
    };

    setIsSavingSprint(true);
    setSprintEditError(null);

    try {
      const updatedSprint = await api.updateSprint(sprint.id, payload);

      setState((current) =>
        current.status === "ready"
          ? { ...current, sprint: updatedSprint }
          : current
      );
      setIsSprintEditOpen(false);
      setSprintEditForm(initialSprintEditForm);
      setSprintEditError(null);
    } catch (error) {
      setSprintEditError(
        error instanceof Error
          ? error.message
          : language === "ar"
            ? "تعذر حفظ تعديل السبرنت."
            : "Sprint changes could not be saved."
      );
    } finally {
      setIsSavingSprint(false);
    }
  }

  async function handleSaveStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!detailState || !statusForm) {
      return;
    }

    const currentProgress = detailState.details?.progress ?? detailState.item.progress;
    const currentStatus = detailState.details?.status ?? detailState.item.status;
    const nextProgress = Number(statusForm.progress);
    const note = statusForm.note.trim();

    if (!Number.isFinite(nextProgress) || nextProgress < 0 || nextProgress > 100) {
      setStatusError(language === "ar" ? "أدخل نسبة تقدم صحيحة بين 0 و 100." : "Enter a valid progress value between 0 and 100.");
      return;
    }

    if (statusForm.status === "completed" && nextProgress !== 100) {
      setStatusError(language === "ar" ? "يجب أن يكون التقدم 100% قبل الإكمال." : "Progress must be 100% before completion.");
      return;
    }

    if (statusForm.status === "blocked" && !statusForm.blockedReason.trim()) {
      setStatusError(language === "ar" ? "اكتب سبب الحظر." : "Enter the blocked reason.");
      return;
    }

    if ((nextProgress !== currentProgress || statusForm.status !== currentStatus) && !note) {
      setStatusError(
        language === "ar"
          ? "اكتب تعليقاً يوضح ما الذي تغير في هذا التحديث."
          : "Write a comment explaining what changed in this update."
      );
      return;
    }

    setIsSavingStatus(true);
    setStatusError(null);

    try {
      if (nextProgress !== currentProgress || note) {
        await api.updateTaskProgress(detailState.item.id, {
          note,
          progress: nextProgress
        });
      }

      if (statusForm.status !== currentStatus) {
        await api.changeTaskStatus(detailState.item.id, {
          ...(statusForm.status === "blocked"
            ? { blockedReason: statusForm.blockedReason.trim() }
            : {}),
          note,
          status: statusForm.status
        });
      }

      setDetailState(null);
      setStatusForm(null);
      refreshAreaData();
    } catch (error) {
      setStatusError(
        error instanceof Error
          ? error.message
          : language === "ar"
            ? "تعذر حفظ تحديث عنصر السبرنت."
            : "Sprint item update could not be saved."
      );
    } finally {
      setIsSavingStatus(false);
    }
  }

  const hasOpenModal = Boolean((detailState && statusForm) || isSprintEditOpen || quickAction);

  return (
    <section
      className={`sprint-detail-canvas${hasOpenModal ? " has-modal-open" : ""}`}
      aria-label={t(area.labelKey)}
    >
      {!isEmployee ? (
        <div className="sprint-detail-actions">
          {canEditSprint ? (
            <button
              className="sprint-detail-utility-button"
              onClick={openSprintEditModal}
              type="button"
            >
              <Edit3 size={16} strokeWidth={2.2} aria-hidden="true" />
              {pageCopy.actions.edit}
            </button>
          ) : null}
          {canCreateSprintItem ? (
            <button
              className="sprint-detail-primary-button"
              onClick={() => setQuickAction("createItem")}
              type="button"
            >
              <Plus size={17} strokeWidth={2.35} aria-hidden="true" />
              {pageCopy.actions.addItem}
            </button>
          ) : null}
          <button className="sprint-detail-utility-button" type="button">
            <Download size={16} strokeWidth={2.25} aria-hidden="true" />
            {pageCopy.actions.export}
          </button>
        </div>
      ) : null}

      {state.status === "error" ? (
        <p className="dashboard-empty-state">{state.message}</p>
      ) : null}

      {state.status === "loading" ? (
        <p className="dashboard-empty-state">{pageCopy.loading}</p>
      ) : null}

      {state.status === "ready" ? (
        <>
          <section className="sprint-detail-metric-grid">
            {buildMetricCards(overview, pageCopy).map((card) => {
              const Icon = card.icon;

              return (
                <article className="sprint-detail-metric-card" key={card.label}>
                  <span className={`sprint-detail-metric-icon sprint-detail-tone-${card.tone}`}>
                    <Icon size={24} strokeWidth={2.05} aria-hidden="true" />
                  </span>
                  <div>
                    <span>{card.label}</span>
                    <strong>{card.value}</strong>
                    {card.progress ? (
                      <div className="sprint-detail-mini-progress">
                        <i style={{ width: `${card.progress}%` }} />
                      </div>
                    ) : null}
                    <small>{card.note}</small>
                  </div>
                </article>
              );
            })}
          </section>

          <section className="sprint-detail-summary-band">
            <span className={`sprint-detail-area-icon sprint-detail-area-${area.key}`}>
              <AreaIcon size={35} strokeWidth={2.2} aria-hidden="true" />
            </span>
            <div className="sprint-detail-summary-copy">
              <h2>
                {t(area.labelKey)}
                <span className={`sprint-detail-status-pill sprint-detail-status-${overview.status}`}>
                  <i />
                  {formatSprintAreaStatus(overview.status, language)}
                </span>
              </h2>
              <p>{pageCopy.description[area.key]}</p>
              <p>{resolveAreaSecondaryDescription(area.key, language)}</p>
            </div>
            <InfoBlock
              avatar={resolveInitials(overview.owner)}
              label={pageCopy.overview.owner}
              primary={overview.owner?.fullName ?? "-"}
              secondary={overview.owner?.jobTitle ?? overview.owner?.department ?? overview.owner?.email ?? "-"}
            />
            <InfoBlock
              icon={CalendarDays}
              label={pageCopy.overview.startDate}
              primary={formatDate(overview.startDate, language)}
              secondary={formatWeekdayTime(overview.startDate, language)}
            />
            <InfoBlock
              icon={CalendarDays}
              label={pageCopy.overview.targetDate}
              primary={formatDate(overview.targetDate, language)}
              secondary={formatWeekdayTime(overview.targetDate, language)}
            />
          </section>

          <div className="sprint-detail-upper-grid">
            <section className="sprint-detail-panel">
              <PanelHeader icon={Flag} title={pageCopy.panels.milestones} />
              <div className="sprint-detail-table-scroll">
                <table className="sprint-detail-table sprint-detail-milestone-table">
                  <thead>
                    <tr>
                      <th>{pageCopy.table.title}</th>
                      <th>{pageCopy.table.dueDate}</th>
                      <th>{pageCopy.table.status}</th>
                      <th>{pageCopy.table.progress}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {milestones.map((item) => (
                      <tr key={item.id}>
                        <td>{item.title}</td>
                        <td>
                          <CalendarDays size={14} strokeWidth={2.15} aria-hidden="true" />
                          {formatDate(item.dueDate, language)}
                        </td>
                        <td>
                          <StatusBadge item={item} language={language} />
                        </td>
                        <td>
                          <ProgressCell progress={item.progress} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <footer className="sprint-detail-panel-footer">
                Showing 1 to {milestones.length} of {milestones.length} milestones
              </footer>
            </section>

            <section className="sprint-detail-panel">
              <PanelHeader icon={Users} title={pageCopy.panels.team} />
              <div className="sprint-detail-table-scroll">
                <table className="sprint-detail-table sprint-detail-team-table">
                  <thead>
                    <tr>
                      <th>{pageCopy.table.teamMember}</th>
                      <th>{pageCopy.table.role}</th>
                      <th>{pageCopy.table.workload}</th>
                      <th>{pageCopy.table.allocation}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {team.map((member) => (
                      <tr key={member.user.id}>
                        <td>
                          <span className="sprint-detail-person">
                            <b>{resolveInitials(member.user)}</b>
                            {member.user.fullName}
                          </span>
                        </td>
                        <td>{member.user.jobTitle ?? member.user.department ?? "-"}</td>
                        <td>{member.workload}%</td>
                        <td>
                          <ProgressCell progress={member.allocation} showValue={false} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <footer className="sprint-detail-panel-footer">
                Showing 1 to {team.length} of {team.length} team members
              </footer>
            </section>
          </div>

          <div className="sprint-detail-lower-grid">
            <section className="sprint-detail-panel sprint-detail-items-panel">
              <PanelHeader icon={FileText} title={pageCopy.panels.items} />
              <div className="sprint-detail-table-scroll">
                <table className="sprint-detail-table sprint-detail-items-table">
                  <thead>
                    <tr>
                      <th aria-label="Select" />
                      <th>{pageCopy.table.itemId}</th>
                      <th>{pageCopy.table.title}</th>
                      <th>{pageCopy.table.assignee}</th>
                      <th>{pageCopy.table.priority}</th>
                      <th>{pageCopy.table.status}</th>
                      <th>{pageCopy.table.dueDate}</th>
                      <th>{pageCopy.table.progress}</th>
                      <th>{pageCopy.table.actions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.slice(0, 8).map((item) => (
                      <SprintItemRow
                        area={area}
                        item={item}
                        key={item.id}
                        language={language}
                        onToggleMenu={toggleActionMenu}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
              {openActionMenu && openActionMenuItem ? (
                <SprintItemFloatingActionMenu
                  canManage={canManageItems}
                  item={openActionMenuItem}
                  labels={getSprintDetailActionCopy(language)}
                  left={openActionMenu.left}
                  onCancel={cancelSprintItem}
                  onEdit={(selectedItem) => openSprintItemDetail(selectedItem, "edit")}
                  onView={(selectedItem) => openSprintItemDetail(selectedItem, "view")}
                  top={openActionMenu.top}
                />
              ) : null}
              <footer className="sprint-detail-items-footer">
                <span>
                  Showing 1 to {Math.min(items.length, 8)} of {items.length} items
                </span>
                <div className="sprint-detail-pagination">
                  <button disabled type="button">
                    <ChevronLeft size={15} strokeWidth={2.2} aria-hidden="true" />
                  </button>
                  <button className="is-active" type="button">1</button>
                  <button type="button">2</button>
                  <button type="button">3</button>
                  <button type="button">4</button>
                  <button type="button">5</button>
                  <button type="button">
                    <ChevronRight size={15} strokeWidth={2.2} aria-hidden="true" />
                  </button>
                </div>
              </footer>
            </section>

            <aside className="sprint-detail-side-stack">
              <section className="sprint-detail-panel">
                <PanelHeader icon={Activity} title={pageCopy.panels.activity} />
                <div className="sprint-detail-activity-list">
                  {activities.map((item) => (
                    <article className="sprint-detail-activity-row" key={item.id}>
                      <b>{resolveInitials(item.assignedTo ?? item.createdBy)}</b>
                      <p>{formatActivityMessage(item, area, language, t)}</p>
                      <time>{formatDateTime(item.lastProgressUpdateAt ?? item.createdAt, language)}</time>
                    </article>
                  ))}
                </div>
                <footer className="sprint-detail-panel-footer">
                  <button type="button">{pageCopy.panels.viewActivity} →</button>
                </footer>
              </section>

              <section className="sprint-detail-panel">
                <PanelHeader
                  icon={AlertTriangle}
                  title={pageCopy.panels.blockers}
                  tone="red"
                />
                <div className="sprint-detail-table-scroll">
                  <table className="sprint-detail-table sprint-detail-blockers-table">
                    <thead>
                      <tr>
                        <th>{pageCopy.blocker.itemId}</th>
                        <th>{pageCopy.blocker.title}</th>
                        <th>{pageCopy.blocker.blockedBy}</th>
                        <th>{pageCopy.blocker.since}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {blockers.length > 0 ? (
                        blockers.map((blocker) => (
                          <tr key={blocker.item.id}>
                            <td>{formatSprintItemCode(blocker.item, area)}</td>
                            <td>{blocker.item.title}</td>
                            <td>{blocker.reason ?? "-"}</td>
                            <td>{formatDate(blocker.since, language)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4}>No current blockers.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <footer className="sprint-detail-panel-footer">
                  <button type="button">{pageCopy.panels.viewBlockers} →</button>
                </footer>
              </section>
            </aside>
          </div>

          <footer className="sprint-detail-page-footer">{pageCopy.footer}</footer>
        </>
      ) : null}

      {detailState && statusForm ? (
        <SprintItemDetailModal
          area={area}
          canManage={canManageItems}
          detailState={detailState}
          error={statusError}
          form={statusForm}
          isSaving={isSavingStatus}
          language={language}
          onClose={() => {
            if (isSavingStatus) {
              return;
            }

            setDetailState(null);
            setStatusForm(null);
            setStatusError(null);
          }}
          onSubmit={handleSaveStatus}
          onUpdate={(key, value) => {
            setStatusForm((current) => (current ? { ...current, [key]: value } : current));
            setStatusError(null);
          }}
        />
      ) : null}

      {isSprintEditOpen ? (
        <SprintEditModal
          error={sprintEditError}
          form={sprintEditForm}
          isSubmitting={isSavingSprint}
          language={language}
          onClose={closeSprintEditModal}
          onSubmit={handleSaveSprintEdit}
          onUpdate={updateSprintEditForm}
          owners={sprintOwnerOptions}
        />
      ) : null}

      {quickAction === "createItem" ? (
        <SprintItemsQuickActionModal
          action="create"
          initialSprintArea={area.key}
          onClose={() => setQuickAction(null)}
          onCompleted={refreshAreaData}
          session={session}
        />
      ) : null}
    </section>
  );
}

function SprintEditModal({
  error,
  form,
  isSubmitting,
  language,
  onClose,
  onSubmit,
  onUpdate,
  owners
}: {
  error: string | null;
  form: SprintEditFormState;
  isSubmitting: boolean;
  language: AppLanguage;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onUpdate: <TKey extends keyof SprintEditFormState>(
    key: TKey,
    value: SprintEditFormState[TKey]
  ) => void;
  owners: DashboardUserReference[];
}) {
  const labels = getSprintEditCopy(language);
  const descriptionLength = form.description.length;

  return (
    <div className="sprints-modal-backdrop" role="presentation">
      <form
        aria-labelledby="edit-sprint-title"
        className="sprints-create-modal sprint-detail-edit-sprint-modal"
        onSubmit={onSubmit}
      >
        <header className="sprints-modal-header">
          <div>
            <h2 id="edit-sprint-title">{labels.title}</h2>
            <p>{labels.subtitle}</p>
          </div>
          <button
            aria-label={labels.close}
            className="sprints-modal-close"
            disabled={isSubmitting}
            onClick={onClose}
            type="button"
          >
            <XCircle size={20} strokeWidth={2.25} aria-hidden="true" />
          </button>
        </header>

        <div className="sprints-modal-grid">
          <SprintEditField icon={Flag} label={labels.name} required>
            <input
              disabled={isSubmitting}
              maxLength={80}
              onChange={(event) => onUpdate("name", event.target.value)}
              placeholder={labels.namePlaceholder}
              value={form.name}
            />
          </SprintEditField>

          <SprintEditField icon={Hash} label={labels.code} required>
            <input
              disabled={isSubmitting}
              maxLength={24}
              onChange={(event) => onUpdate("code", event.target.value)}
              placeholder={labels.codePlaceholder}
              value={form.code}
            />
          </SprintEditField>

          <SprintEditField icon={User} label={labels.owner} required>
            <select
              disabled={isSubmitting}
              onChange={(event) => onUpdate("ownerId", event.target.value)}
              value={form.ownerId}
            >
              <option value="">{labels.ownerPlaceholder}</option>
              {owners.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {owner.fullName}
                </option>
              ))}
            </select>
          </SprintEditField>

          <SprintEditField icon={Flag} label={labels.status} required>
            <select
              disabled={isSubmitting}
              onChange={(event) =>
                onUpdate("status", event.target.value as SprintStatus)
              }
              value={form.status}
            >
              {(["planned", "in_progress", "at_risk", "completed", "cancelled"] as const).map(
                (status) => (
                  <option key={status} value={status}>
                    {formatSprintRecordStatus(status, language)}
                  </option>
                )
              )}
            </select>
          </SprintEditField>

          <SprintEditField icon={CalendarDays} label={labels.startDate} required>
            <input
              disabled={isSubmitting}
              onChange={(event) => onUpdate("startDate", event.target.value)}
              type="date"
              value={form.startDate}
            />
          </SprintEditField>

          <SprintEditField icon={CalendarDays} label={labels.targetDate} required>
            <input
              disabled={isSubmitting}
              min={form.startDate || undefined}
              onChange={(event) => onUpdate("targetDate", event.target.value)}
              type="date"
              value={form.targetDate}
            />
          </SprintEditField>

          <SprintEditField icon={Target} label={labels.progressTarget} required>
            <input
              disabled={isSubmitting}
              inputMode="numeric"
              max={100}
              min={0}
              onChange={(event) => onUpdate("progressTarget", event.target.value)}
              placeholder={labels.progressTargetPlaceholder}
              type="number"
              value={form.progressTarget}
            />
          </SprintEditField>

          <SprintEditField icon={Hash} label={labels.area} required>
            <select
              disabled={isSubmitting}
              onChange={(event) =>
                onUpdate("sprintArea", event.target.value as SprintAreaKey)
              }
              value={form.sprintArea}
            >
              {sprintAreaDefinitions.map((definition) => (
                <option key={definition.key} value={definition.key}>
                  {getSprintAreaLabel(definition.key, language)}
                </option>
              ))}
            </select>
          </SprintEditField>

          <SprintEditField
            className="is-wide"
            icon={FileText}
            label={labels.description}
          >
            <textarea
              disabled={isSubmitting}
              maxLength={500}
              onChange={(event) => onUpdate("description", event.target.value)}
              placeholder={labels.descriptionPlaceholder}
              value={form.description}
            />
            <span className="sprints-modal-counter">{descriptionLength} / 500</span>
          </SprintEditField>
        </div>

        <div className="sprints-modal-switch-row">
          <SprintEditSwitch
            checked={form.active}
            description={labels.activeHelp}
            icon={Target}
            label={labels.activeLabel}
            onChange={(value) => onUpdate("active", value)}
          />
          <SprintEditSwitch
            checked={form.notifyLater}
            description={labels.notifyHelp}
            icon={Bell}
            label={labels.notifyLabel}
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
            {labels.cancel}
          </button>
          <button
            className="sprints-modal-submit"
            disabled={isSubmitting}
            type="submit"
          >
            <Save size={17} strokeWidth={2.35} aria-hidden="true" />
            {isSubmitting ? labels.saving : labels.save}
          </button>
        </footer>
      </form>
    </div>
  );
}

function SprintEditField({
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

function SprintEditSwitch({
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

function SprintItemDetailModal({
  area,
  canManage,
  detailState,
  error,
  form,
  isSaving,
  language,
  onClose,
  onSubmit,
  onUpdate
}: {
  area: SprintAreaDefinition;
  canManage: boolean;
  detailState: SprintItemDetailState;
  error: string | null;
  form: SprintItemStatusForm;
  isSaving: boolean;
  language: AppLanguage;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onUpdate: <TKey extends keyof SprintItemStatusForm>(
    key: TKey,
    value: SprintItemStatusForm[TKey]
  ) => void;
}) {
  const labels = getSprintItemDetailCopy(language);
  const item = detailState.item;
  const owner = item.assignedTo ?? item.createdBy;
  const details = detailState.details;
  const canEditStatus = canManage || detailState.mode === "edit";

  return (
    <div className="sprint-detail-modal-backdrop" role="presentation">
      <form
        aria-labelledby="sprint-item-detail-title"
        className="sprint-detail-item-modal"
        onSubmit={onSubmit}
      >
        <header className="sprint-detail-item-modal-header">
          <span>
            <FileText size={27} strokeWidth={2.1} aria-hidden="true" />
          </span>
          <div>
            <small>{formatSprintItemCode(item, area)}</small>
            <h2 id="sprint-item-detail-title">{item.title}</h2>
            <p>{labels.subtitle}</p>
          </div>
          <button
            aria-label={labels.close}
            disabled={isSaving}
            onClick={onClose}
            type="button"
          >
            <XCircle size={22} strokeWidth={2.2} />
          </button>
        </header>

        {detailState.status === "loading" ? (
          <p className="sprint-detail-modal-state">{labels.loading}</p>
        ) : null}

        {detailState.status === "error" ? (
          <p className="sprint-detail-modal-error">{detailState.error}</p>
        ) : null}

        <div className="sprint-detail-item-modal-grid">
          <section className="sprint-detail-item-card">
            <h3>{labels.sections.info}</h3>
            <dl className="sprint-detail-item-facts">
              <div>
                <dt>{labels.fields.sprint}</dt>
                <dd>{area ? copy[language].description[area.key].split(".")[0] : "-"}</dd>
              </div>
              <div>
                <dt>{labels.fields.assignee}</dt>
                <dd>{owner?.fullName ?? labels.unassigned}</dd>
              </div>
              <div>
                <dt>{labels.fields.priority}</dt>
                <dd>{formatPriority(item.priority, language)}</dd>
              </div>
              <div>
                <dt>{labels.fields.dueDate}</dt>
                <dd>{formatDate(item.dueDate, language)}</dd>
              </div>
              <div>
                <dt>{labels.fields.status}</dt>
                <dd>{formatRawStatus(details?.status ?? item.status, language)}</dd>
              </div>
              <div>
                <dt>{labels.fields.progress}</dt>
                <dd>{details?.progress ?? item.progress}%</dd>
              </div>
            </dl>
            <div className="sprint-detail-item-description">
              <strong>{labels.fields.description}</strong>
              <p>{details?.description || item.request?.title || labels.noDescription}</p>
            </div>
          </section>

          <section className="sprint-detail-item-card">
            <h3>{labels.sections.update}</h3>
            <label className="sprint-detail-item-field">
              <span>{labels.fields.status}</span>
              <select
                disabled={!canEditStatus || isSaving}
                onChange={(event) => onUpdate("status", event.target.value as TaskStatus)}
                value={form.status}
              >
                {(["open", "in_progress", "blocked", "waiting_review", "completed", "cancelled"] as TaskStatus[]).map((status) => (
                  <option key={status} value={status}>
                    {formatRawStatus(status, language)}
                  </option>
                ))}
              </select>
            </label>
            <label className="sprint-detail-item-field">
              <span>{labels.fields.progress}</span>
              <input
                disabled={!canEditStatus || isSaving}
                max={100}
                min={0}
                onChange={(event) => onUpdate("progress", event.target.value)}
                type="number"
                value={form.progress}
              />
            </label>
            {form.status === "blocked" ? (
              <label className="sprint-detail-item-field is-wide">
                <span>{labels.fields.blockedReason}</span>
                <input
                  disabled={!canEditStatus || isSaving}
                  onChange={(event) => onUpdate("blockedReason", event.target.value)}
                  placeholder={labels.placeholders.blockedReason}
                  value={form.blockedReason}
                />
              </label>
            ) : null}
            <label className="sprint-detail-item-field is-wide">
              <span>{labels.fields.comment}</span>
              <textarea
                disabled={!canEditStatus || isSaving}
                onChange={(event) => onUpdate("note", event.target.value)}
                placeholder={labels.placeholders.comment}
                value={form.note}
              />
            </label>
            <p className="sprint-detail-modal-hint">{labels.commentRequired}</p>
          </section>
        </div>

        <section className="sprint-detail-item-card sprint-detail-history-card">
          <h3>{labels.sections.history}</h3>
          {detailState.updates.length > 0 ? (
            <div className="sprint-detail-history-list">
              {detailState.updates.map((update) => (
                <article key={update.id}>
                  <strong>{formatTaskUpdateTitle(update, language)}</strong>
                  <p>{update.note || labels.noComment}</p>
                  <time>{formatDateTime(update.createdAt, language)}</time>
                </article>
              ))}
            </div>
          ) : (
            <p className="sprint-detail-modal-state">{labels.noHistory}</p>
          )}
        </section>

        {error ? <p className="sprint-detail-modal-error">{error}</p> : null}

        <footer className="sprint-detail-item-modal-footer">
          <button disabled={isSaving} onClick={onClose} type="button">
            {labels.cancel}
          </button>
          {canEditStatus ? (
            <button disabled={isSaving} type="submit">
              <Save size={17} strokeWidth={2.25} aria-hidden="true" />
              {isSaving ? labels.saving : labels.save}
            </button>
          ) : null}
        </footer>
      </form>
    </div>
  );
}

function InfoBlock({
  avatar,
  icon: Icon,
  label,
  primary,
  secondary
}: {
  avatar?: string;
  icon?: LucideIcon;
  label: string;
  primary: string;
  secondary: string;
}) {
  return (
    <div className="sprint-detail-info-block">
      {avatar ? <b>{avatar}</b> : null}
      {Icon ? <Icon size={24} strokeWidth={2.2} aria-hidden="true" /> : null}
      <div>
        <span>{label}</span>
        <strong>{primary}</strong>
        <small>{secondary}</small>
      </div>
    </div>
  );
}

function PanelHeader({
  icon: Icon,
  title,
  tone
}: {
  icon: LucideIcon;
  title: string;
  tone?: "red";
}) {
  return (
    <header className={`sprint-detail-panel-header${tone === "red" ? " is-red" : ""}`}>
      <h2>
        <Icon size={19} strokeWidth={2.1} aria-hidden="true" />
        {title}
      </h2>
    </header>
  );
}

function SprintItemRow({
  area,
  item,
  language,
  onToggleMenu
}: {
  area: SprintAreaDefinition;
  item: TaskReportRow;
  language: AppLanguage;
  onToggleMenu: (itemId: string, event: MouseEvent<HTMLButtonElement>) => void;
}) {
  const owner = item.assignedTo ?? item.createdBy;

  return (
    <tr>
      <td>
        <input aria-label={item.title} type="checkbox" />
      </td>
      <td>
        <strong>{formatSprintItemCode(item, area)}</strong>
      </td>
      <td>
        <span className="sprint-detail-title-cell">
          <strong title={item.title}>{item.title}</strong>
          <small title={item.request?.title ?? item.category}>{item.request?.title ?? item.category}</small>
        </span>
      </td>
      <td>
        <span className="sprint-detail-person" title={owner?.fullName ?? "-"}>
          <b>{resolveInitials(owner)}</b>
          {owner?.fullName ?? "-"}
        </span>
      </td>
      <td>
        <span className={`sprint-detail-priority sprint-detail-priority-${item.priority}`}>
          {formatPriority(item.priority, language)}
        </span>
      </td>
      <td>
        <StatusBadge item={item} language={language} />
      </td>
      <td>
        <CalendarDays size={14} strokeWidth={2.15} aria-hidden="true" />
        {formatDate(item.dueDate, language)}
      </td>
      <td>
        <ProgressCell progress={item.progress} />
      </td>
      <td>
        <div className="sprint-detail-row-actions">
          <button
            aria-label={copy[language].actions.more}
            aria-haspopup="menu"
            data-sprint-detail-menu-trigger="true"
            onClick={(event) => onToggleMenu(item.id, event)}
            type="button"
          >
            <MoreVertical size={15} strokeWidth={2.1} />
          </button>
        </div>
      </td>
    </tr>
  );
}

function SprintItemFloatingActionMenu({
  canManage,
  item,
  labels,
  left,
  onCancel,
  onEdit,
  onView,
  top
}: {
  canManage: boolean;
  item: TaskReportRow;
  labels: ReturnType<typeof getSprintDetailActionCopy> & { view?: string };
  left: number;
  onCancel: (item: TaskReportRow) => void;
  onEdit: (item: TaskReportRow) => void;
  onView: (item: TaskReportRow) => void;
  top: number;
}) {
  return (
    <div
      className="sprint-detail-action-dropdown sprint-detail-floating-action-dropdown"
      data-sprint-detail-floating-menu="true"
      role="menu"
      style={{ left, top }}
    >
      <button onClick={() => onView(item)} role="menuitem" type="button">
        <Eye size={14} strokeWidth={2.2} />
        {labels.view ?? "View"}
      </button>
      {canManage ? (
        <button onClick={() => onEdit(item)} role="menuitem" type="button">
          <Edit3 size={14} strokeWidth={2.2} />
          {labels.edit}
        </button>
      ) : null}
      {canManage ? (
        <button
          className="is-danger"
          disabled={item.status === "cancelled"}
          onClick={() => onCancel(item)}
          role="menuitem"
          type="button"
        >
          <Trash2 size={14} strokeWidth={2.2} />
          {labels.delete}
        </button>
      ) : null}
    </div>
  );
}

function StatusBadge({
  item,
  language
}: {
  item: TaskReportRow;
  language: AppLanguage;
}) {
  const state = resolveSprintItemStatus(item);

  return (
    <span className={`sprint-detail-status-badge sprint-detail-item-status-${state}`}>
      <i />
      {formatSprintItemStatus(state, language)}
    </span>
  );
}

function getSprintDetailActionCopy(language: AppLanguage) {
  return language === "ar"
    ? { delete: "إلغاء", edit: "تعديل" }
    : { delete: "Cancel", edit: "Edit" };
}

function getSprintItemDetailCopy(language: AppLanguage) {
  if (language === "ar") {
    return {
      cancel: "إلغاء",
      close: "إغلاق",
      commentRequired: "يجب كتابة تعليق عند تغيير الحالة أو نسبة التقدم.",
      fields: {
        assignee: "المسؤول",
        blockedReason: "سبب الحظر",
        comment: "تعليق التحديث",
        description: "الوصف",
        dueDate: "تاريخ الاستحقاق",
        priority: "الأولوية",
        progress: "التقدم",
        sprint: "السبرنت",
        status: "الحالة"
      },
      loading: "جار تحميل تفاصيل عنصر السبرنت...",
      noComment: "لا يوجد تعليق.",
      noDescription: "لا يوجد وصف.",
      noHistory: "لا يوجد سجل تحديثات لهذا العنصر.",
      placeholders: {
        blockedReason: "اكتب سبب الحظر",
        comment: "اكتب ما تم تغييره أو ما تم إنجازه"
      },
      save: "حفظ التحديث",
      saving: "جار الحفظ...",
      sections: {
        history: "سجل التحديثات والتعليقات",
        info: "معلومات عنصر السبرنت",
        update: "تحديث الحالة والتقدم"
      },
      subtitle: "عرض تفاصيل عنصر السبرنت وسجل التقدم والتعليقات.",
      unassigned: "غير مسند"
    };
  }

  return {
    cancel: "Cancel",
    close: "Close",
    commentRequired: "A comment is required when changing status or progress.",
    fields: {
      assignee: "Assignee",
      blockedReason: "Blocked reason",
      comment: "Update comment",
      description: "Description",
      dueDate: "Due date",
      priority: "Priority",
      progress: "Progress",
      sprint: "Sprint",
      status: "Status"
    },
    loading: "Loading sprint item details...",
    noComment: "No comment was recorded.",
    noDescription: "No description was provided.",
    noHistory: "No updates have been recorded for this item.",
    placeholders: {
      blockedReason: "Explain why this item is blocked",
      comment: "Write what changed or what was completed"
    },
    save: "Save Update",
    saving: "Saving...",
    sections: {
      history: "Progress History & Comments",
      info: "Sprint Item Information",
      update: "Status & Progress Update"
    },
    subtitle: "Review full sprint item details, progress history, and status notes.",
    unassigned: "Unassigned"
  };
}

function getSprintEditCopy(language: AppLanguage) {
  if (language === "ar") {
    return {
      activeHelp: "اجعل هذا السبرنت نشطاً ومتاحاً للمتابعة.",
      activeLabel: "سبرنت نشط",
      area: "منطقة السبرنت",
      cancel: "إلغاء",
      close: "إغلاق",
      code: "رمز السبرنت",
      codePlaceholder: "أدخل رمز السبرنت",
      description: "الوصف",
      descriptionPlaceholder: "اكتب وصفاً مختصراً للأهداف والمخرجات الرئيسية...",
      name: "اسم السبرنت",
      namePlaceholder: "أدخل اسم السبرنت",
      notifyHelp: "احتفظ بإشعار الفريق لوقت لاحق.",
      notifyLabel: "إشعار الفريق لاحقاً",
      owner: "مسؤول السبرنت",
      ownerPlaceholder: "اختر مسؤول السبرنت",
      progressTarget: "التقدم الحالي (%)",
      progressTargetPlaceholder: "أدخل التقدم الحالي بين 0 و 100",
      save: "حفظ التغييرات",
      saving: "جاري الحفظ...",
      startDate: "تاريخ البداية",
      status: "الحالة",
      subtitle: "حدّث تفاصيل السبرنت والمسؤول والتواريخ والحالة.",
      targetDate: "التاريخ المستهدف",
      title: "تعديل السبرنت"
    };
  }

  return {
    activeHelp: "Keep this sprint active and visible for tracking.",
    activeLabel: "Active Sprint",
    area: "Sprint Area",
    cancel: "Cancel",
    close: "Close",
    code: "Sprint Code",
    codePlaceholder: "Enter sprint code",
    description: "Description",
    descriptionPlaceholder: "Enter goals, delivery scope, and key outcomes...",
    name: "Sprint Name",
    namePlaceholder: "Enter sprint name",
    notifyHelp: "Keep team notifications for later.",
    notifyLabel: "Notify Team Later",
    owner: "Sprint Owner",
    ownerPlaceholder: "Select sprint owner",
    progressTarget: "Current Progress (%)",
    progressTargetPlaceholder: "Enter current progress from 0 to 100",
    save: "Save Changes",
    saving: "Saving...",
    startDate: "Start Date",
    status: "Status",
    subtitle: "Update sprint details, owner, dates, current progress, and status.",
    targetDate: "Target Date",
    title: "Edit Sprint"
  };
}

function buildSprintOwnerOptions(
  ownerOptions: SprintOwnerOptionsState,
  sprint: SprintRecord | undefined
): DashboardUserReference[] {
  const owners = new Map<string, DashboardUserReference>();

  if (sprint?.owner) {
    owners.set(sprint.owner.id, sprint.owner);
  }

  if (ownerOptions.status === "ready") {
    for (const user of ownerOptions.users) {
      owners.set(user.id, {
        department: user.department,
        email: user.email,
        fullName: user.fullName,
        id: user.id,
        jobTitle: user.jobTitle
      });
    }
  }

  return [...owners.values()].sort((left, right) =>
    left.fullName.localeCompare(right.fullName)
  );
}

function toSprintEditForm(sprint: SprintRecord): SprintEditFormState {
  return {
    active: sprint.active,
    code: sprint.code,
    description: sprint.description ?? "",
    name: sprint.name,
    notifyLater: sprint.notifyLater,
    ownerId: sprint.ownerId,
    progressTarget: String(sprint.progressTarget),
    sprintArea: sprint.sprintArea,
    startDate: toDateInputValue(sprint.startDate),
    status: sprint.status,
    targetDate: toDateInputValue(sprint.targetDate)
  };
}

function isSprintEditFormValid(form: SprintEditFormState): boolean {
  const progressTarget = Number(form.progressTarget);

  return Boolean(
    form.name.trim() &&
      form.code.trim() &&
      form.ownerId &&
      form.sprintArea &&
      form.startDate &&
      form.targetDate &&
      Number.isFinite(progressTarget) &&
      progressTarget >= 0 &&
      progressTarget <= 100
  );
}

function formatSprintRecordStatus(
  status: SprintStatus,
  language: AppLanguage
): string {
  const labels = {
    ar: {
      at_risk: "معرض للخطر",
      cancelled: "ملغي",
      completed: "مكتمل",
      in_progress: "قيد التنفيذ",
      planned: "مخطط"
    },
    en: {
      at_risk: "At Risk",
      cancelled: "Cancelled",
      completed: "Completed",
      in_progress: "In Progress",
      planned: "Planned"
    }
  } as const;

  return labels[language][status];
}

function getSprintAreaLabel(areaKey: SprintAreaKey, language: AppLanguage): string {
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
  } as const;

  return labels[language][areaKey];
}

function toStatusForm(
  item: TaskReportRow,
  details?: TaskRecord
): SprintItemStatusForm {
  return {
    blockedReason: "",
    note: "",
    progress: String(details?.progress ?? item.progress),
    status: details?.status ?? item.status
  };
}

function formatRawStatus(status: TaskStatus, language: AppLanguage): string {
  const labels = {
    ar: {
      blocked: "محجوب",
      cancelled: "ملغى",
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
      open: "Open",
      waiting_review: "Waiting Review"
    }
  } as const;

  return labels[language][status];
}

function formatTaskUpdateTitle(update: TaskUpdateRecord, language: AppLanguage): string {
  const previousProgress = update.previousProgress ?? 0;
  const newProgress = update.newProgress ?? previousProgress;
  const previousStatus = update.previousStatus;
  const newStatus = update.newStatus;

  if (previousStatus && newStatus && previousStatus !== newStatus) {
    return language === "ar"
      ? `تغيير الحالة من ${formatRawStatus(previousStatus, language)} إلى ${formatRawStatus(newStatus, language)}`
      : `Status changed from ${formatRawStatus(previousStatus, language)} to ${formatRawStatus(newStatus, language)}`;
  }

  if (previousProgress !== newProgress) {
    return language === "ar"
      ? `تحديث التقدم من ${previousProgress}% إلى ${newProgress}%`
      : `Progress updated from ${previousProgress}% to ${newProgress}%`;
  }

  return language === "ar" ? "تعليق على عنصر السبرنت" : "Sprint item note";
}

function ProgressCell({
  progress,
  showValue = true
}: {
  progress: number;
  showValue?: boolean;
}) {
  return (
    <div className="sprint-detail-progress-cell">
      {showValue ? <strong>{progress}%</strong> : null}
      <span>
        <i style={{ width: `${progress}%` }} />
      </span>
    </div>
  );
}

function buildSprintOverview(
  items: TaskReportRow[],
  sprint?: SprintRecord
): SprintOverview {
  const total = items.length;
  const completed = items.filter((item) => item.status === "completed").length;
  const blocked = items.filter((item) => item.status === "blocked").length;
  const inProgress = items.filter((item) =>
    ["in_progress", "open", "waiting_review"].includes(item.status)
  ).length;
  const dueThisWeek = items.filter(isDueThisWeek).length;
  const progress =
    total > 0
      ? Math.round(items.reduce((sum, item) => sum + item.progress, 0) / total)
      : 0;
  const delayed = items.filter(isDelayedSprintItem).length;

  return {
    blocked,
    completed,
    dueThisWeek,
    inProgress,
    owner: sprint ? sprint.owner : resolveOwner(items),
    progress,
    startDate: sprint?.startDate ?? resolveStartDate(items),
    status: sprint?.status === "completed" ? "completed" : resolveSprintStatus(items, blocked, delayed, completed),
    targetDate: sprint?.targetDate ?? resolveTargetDate(items),
    total
  };
}

function buildMetricCards(metrics: SprintOverview, pageCopy: Copy) {
  const total = metrics.total || 0;

  return [
    {
      icon: Activity,
      label: pageCopy.metrics.overall,
      note: `${metrics.progress}% ${pageCopy.notes.complete}`,
      progress: metrics.progress,
      tone: "blue",
      value: `${metrics.progress}%`
    },
    {
      icon: ClipboardCheck,
      label: pageCopy.metrics.total,
      note: pageCopy.notes.allItems,
      tone: "blue",
      value: String(metrics.total)
    },
    {
      icon: CheckCircle2,
      label: pageCopy.metrics.completed,
      note: `${formatPercent(metrics.completed, total)} ${pageCopy.notes.ofTotal}`,
      tone: "green",
      value: String(metrics.completed)
    },
    {
      icon: Activity,
      label: pageCopy.metrics.inProgress,
      note: `${formatPercent(metrics.inProgress, total)} ${pageCopy.notes.ofTotal}`,
      tone: "blue",
      value: String(metrics.inProgress)
    },
    {
      icon: XCircle,
      label: pageCopy.metrics.blocked,
      note: `${formatPercent(metrics.blocked, total)} ${pageCopy.notes.ofTotal}`,
      tone: "red",
      value: String(metrics.blocked)
    },
    {
      icon: CalendarDays,
      label: pageCopy.metrics.dueThisWeek,
      note: `${formatPercent(metrics.dueThisWeek, total)} ${pageCopy.notes.ofTotal}`,
      tone: "purple",
      value: String(metrics.dueThisWeek)
    }
  ] satisfies Array<{
    icon: LucideIcon;
    label: string;
    note: string;
    progress?: number;
    tone: "blue" | "green" | "purple" | "red";
    value: string;
  }>;
}

function buildTeamAllocation(items: TaskReportRow[]): TeamAllocation[] {
  const members = new Map<string, { progress: number; taskCount: number; user: DashboardUserReference }>();

  for (const item of items) {
    const user = item.assignedTo;

    if (!user) {
      continue;
    }

    const current = members.get(user.id);
    members.set(user.id, {
      progress: (current?.progress ?? 0) + item.progress,
      taskCount: (current?.taskCount ?? 0) + 1,
      user
    });
  }

  return [...members.values()]
    .map((member) => {
      const averageProgress = Math.round(member.progress / member.taskCount);
      const workload = Math.min(100, Math.round((member.taskCount / Math.max(items.length, 1)) * 100));

      return {
        allocation: workload,
        taskCount: member.taskCount,
        user: member.user,
        workload
      };
    })
    .sort((left, right) => right.workload - left.workload)
    .slice(0, 4);
}

function buildMilestones(items: TaskReportRow[]): TaskReportRow[] {
  return items
    .slice()
    .sort((left, right) => dateValue(left.dueDate) - dateValue(right.dueDate))
    .slice(0, 5);
}

function buildActivities(items: TaskReportRow[]): TaskReportRow[] {
  return items
    .slice()
    .sort(
      (left, right) =>
        dateValue(right.lastProgressUpdateAt ?? right.createdAt) -
        dateValue(left.lastProgressUpdateAt ?? left.createdAt)
    )
    .slice(0, 5);
}

function buildBlockers(items: TaskReportRow[]): BlockerRow[] {
  return items
    .filter((item) => item.status === "blocked" || isDelayedSprintItem(item))
    .slice(0, 3)
    .map((item) => ({
      item,
      reason: item.status === "blocked" ? "Status is blocked. Open item details for the latest blocker comment." : "Due date has passed.",
      since: item.lastProgressUpdateAt ?? item.createdAt
    }));
}

function resolveSprintStatus(
  items: TaskReportRow[],
  blocked: number,
  delayed: number,
  completed: number
): SprintAreaStatus {
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

function resolveSprintItemStatus(item: TaskReportRow): "blocked" | "completed" | "in_progress" | "pending" | "review" {
  if (item.status === "completed") {
    return "completed";
  }

  if (item.status === "blocked" || isDelayedSprintItem(item)) {
    return "blocked";
  }

  if (item.status === "waiting_review") {
    return "review";
  }

  if (item.status === "open") {
    return "pending";
  }

  return "in_progress";
}

function formatSprintAreaStatus(status: SprintAreaStatus, language: AppLanguage): string {
  const labels = copy[language].status;

  switch (status) {
    case "at_risk":
      return labels.atRisk;
    case "completed":
      return labels.completed;
    case "planned":
      return labels.planned;
    default:
      return labels.inProgress;
  }
}

function formatSprintItemStatus(
  status: ReturnType<typeof resolveSprintItemStatus>,
  language: AppLanguage
): string {
  const labels = copy[language].status;

  switch (status) {
    case "blocked":
      return labels.blocked;
    case "completed":
      return labels.completed;
    case "pending":
      return labels.pending;
    case "review":
      return labels.review;
    default:
      return labels.inProgress;
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

  return labels[language][priority as keyof (typeof labels)["en"]] ?? priority;
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

function resolveStartDate(items: TaskReportRow[]): string | undefined {
  const values = items
    .map((item) => dateValue(item.startDate ?? item.createdAt))
    .filter((value) => value > 0);

  return values.length > 0 ? new Date(Math.min(...values)).toISOString() : undefined;
}

function resolveTargetDate(items: TaskReportRow[]): string | undefined {
  const values = items
    .map((item) => dateValue(item.dueDate))
    .filter((value) => value > 0);

  return values.length > 0 ? new Date(Math.max(...values)).toISOString() : undefined;
}

function isDueThisWeek(item: TaskReportRow): boolean {
  if (!item.dueDate || item.status === "completed" || item.status === "cancelled") {
    return false;
  }

  const dueTime = dateValue(item.dueDate);
  const now = Date.now();
  const weekFromNow = now + 7 * 24 * 60 * 60 * 1000;

  return dueTime >= now && dueTime <= weekFromNow;
}

function isDelayedSprintItem(item: TaskReportRow): boolean {
  if (!item.dueDate || item.status === "completed" || item.status === "cancelled") {
    return false;
  }

  const dueTime = dateValue(item.dueDate);

  return dueTime > 0 && dueTime < Date.now();
}

function resolveAreaIcon(key: SprintAreaKey): LucideIcon {
  switch (key) {
    case "facility":
      return Building2;
    case "infrastructure":
      return Server;
    default:
      return Code2;
  }
}

function resolveAreaSecondaryDescription(areaKey: SprintAreaKey, language: AppLanguage): string {
  if (language === "ar") {
    switch (areaKey) {
      case "facility":
        return "يشمل تجهيز المساحات ومتابعة جاهزية المستخدمين والتدريب.";
      case "infrastructure":
        return "يشمل الاستضافة والتأمين والنسخ الاحتياطي والتحقق من الاعتمادية.";
      default:
        return "يشمل الاختبار الوحدوي واختبار التكامل وتحضير التسليم.";
    }
  }

  switch (areaKey) {
    case "facility":
      return "Includes readiness checks, workspace preparation, training support, and rollout coordination.";
    case "infrastructure":
      return "Includes hosting readiness, security hardening, backup validation, and access preparation.";
    default:
      return "Includes unit testing, integration testing, and delivery preparation.";
  }
}

function formatActivityMessage(
  item: TaskReportRow,
  area: SprintAreaDefinition,
  language: AppLanguage,
  t: (key: string) => string
): string {
  const actor = item.assignedTo?.fullName ?? item.createdBy?.fullName ?? "-";
  const itemCode = formatSprintItemCode(item, area);

  if (item.status === "completed") {
    return language === "ar"
      ? `${actor} أكمل ${itemCode}.`
      : `${actor} completed ${itemCode}.`;
  }

  if (item.status === "blocked") {
    return language === "ar"
      ? `${actor} وضع ${itemCode} كعنصر محجوب.`
      : `${actor} marked ${itemCode} as blocked.`;
  }

  if (item.status === "waiting_review") {
    return language === "ar"
      ? `${actor} غيّر حالة ${itemCode} إلى قيد المراجعة.`
      : `${actor} changed status for ${itemCode} to under review.`;
  }

  return language === "ar"
    ? `${actor} حدّث تقدم ${t(area.labelKey)}.`
    : `${actor} updated progress for ${itemCode}.`;
}

function formatSprintItemCode(item: TaskReportRow, area: SprintAreaDefinition): string {
  const prefix =
    area.key === "facility" ? "FAC" : area.key === "infrastructure" ? "INF" : "DEV";
  const numericPart = item.taskCode.match(/\d+/g)?.at(-1);

  if (numericPart) {
    return `${prefix}-${numericPart.padStart(4, "0")}`;
  }

  return `${prefix}-${item.id.slice(-4).toUpperCase()}`;
}

function formatPercent(value: number, total: number): string {
  return total > 0 ? `${Math.round((value / total) * 100)}%` : "0%";
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

function formatWeekdayTime(value: string | undefined, language: AppLanguage): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat(language === "ar" ? "ar-LY" : "en-US", {
    hour: "numeric",
    minute: "2-digit",
    weekday: "short"
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

function dateValue(value: string | undefined): number {
  if (!value) {
    return 0;
  }

  const time = new Date(value).getTime();

  return Number.isNaN(time) ? 0 : time;
}

function toApiDateTime(value: string, time: string): string {
  return new Date(`${value}T${time}:00`).toISOString();
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

export const SprintAreaContent = memo(SprintAreaContentView);
