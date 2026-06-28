import {
  AlertCircle,
  Ban,
  Bookmark,
  CalendarDays,
  CheckCircle2,
  ChevronsUpDown,
  CircleDot,
  ClipboardCheck,
  ClipboardPlus,
  Download,
  Eye,
  Filter,
  Flag,
  Hash,
  Layers3,
  ListChecks,
  LoaderCircle,
  LockKeyhole,
  MoreVertical,
  Pencil,
  Plus,
  Save,
  Search,
  SlidersHorizontal,
  Trash2,
  UserRound,
  X,
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
import { useSearchParams } from "react-router-dom";

import {
  api,
  type CreateSprintItemPayload,
  type DashboardUserReference,
  type PaginationMeta,
  type Session,
  type TaskCategory,
  type TaskPriority,
  type TaskRecord,
  type TaskReportRow,
  type TaskStatus,
  type UpdateSprintItemPayload,
  type UserRecord
} from "../../api/client";
import { useI18n } from "../../i18n";
import type { AppLanguage } from "../../i18n/locale";
import {
  getSprintAreaByCategory,
  getSprintAreaDefinition,
  type SprintAreaKey,
  sprintAreaDefinitions
} from "./sprintAreas";

type SprintItemsState =
  | { items: TaskReportRow[]; metrics: SprintItemsMetrics; pagination: PaginationMeta; status: "ready" }
  | { message: string; status: "error" }
  | { status: "loading" };

type SprintItemsMetrics = {
  blocked: number;
  completed: number;
  inProgress: number;
  review: number;
  total: number;
};

type SprintItemsFilters = {
  assignee: string;
  focus: "all" | "milestones" | "urgent";
  priority: string;
  search: string;
  sprint: string;
  status: string;
};

type SprintItemCreateStatus = Exclude<TaskStatus, "cancelled">;

type CreateSprintItemFormState = {
  assigneeIds: string[];
  blockedReason: string;
  category: TaskCategory | "";
  description: string;
  dueDate: string;
  highVisibility: boolean;
  notifyLater: boolean;
  progress: string;
  priority: TaskPriority | "";
  requireReview: boolean;
  sprintArea: SprintAreaKey | "";
  sprintCode: string;
  startDate: string;
  status: SprintItemCreateStatus | "";
  title: string;
};

type SprintItemEditFormState = {
  assigneeIds: string[];
  blockedReason: string;
  category: TaskCategory | "";
  description: string;
  dueDate: string;
  note: string;
  priority: TaskPriority | "";
  progress: string;
  sprintArea: SprintAreaKey | "";
  startDate: string;
  status: TaskStatus;
  title: string;
};

type AssignSprintItemFormState = {
  assigneeIds: string[];
  itemId: string;
};

type SprintItemModalMode = "edit" | "view";

type SprintItemActionMenuState = {
  itemId: string;
  left: number;
  top: number;
};

type SprintItemsSortField =
  | "assignee"
  | "dueDate"
  | "id"
  | "priority"
  | "sprint"
  | "status"
  | "title"
  | "updated";

type SprintItemsSortState = {
  field: SprintItemsSortField;
  order: "asc" | "desc";
};

type AssignableUsersState =
  | { status: "error" }
  | { status: "loading" }
  | { status: "ready"; users: UserRecord[] };

type SprintItemsCopy = {
  actions: {
    export: string;
    filter: string;
    filters: string;
    more: string;
    newItem: string;
    view: string;
  };
  empty: string;
  filters: {
    allAssignees: string;
    allPriorities: string;
    allSprints: string;
    allStatuses: string;
    dueDateRange: string;
    search: string;
  };
  footer: string;
  loading: string;
  metrics: {
    blocked: string;
    completed: string;
    inProgress: string;
    review: string;
    total: string;
  };
  notes: {
    allItems: string;
    ofTotal: string;
  };
  pagination: string;
  table: {
    actions: string;
    assignee: string;
    dueDate: string;
    id: string;
    priority: string;
    sprint: string;
    status: string;
    title: string;
    updated: string;
  };
};

const pageSize = 8;

const initialFilters: SprintItemsFilters = {
  assignee: "all",
  focus: "all",
  priority: "all",
  search: "",
  sprint: "all",
  status: "all"
};

const sprintItemFilterValues = {
  focus: new Set(["all", "milestones", "urgent"]),
  priority: new Set(["all", "low", "medium", "high", "urgent"]),
  sprint: new Set(["all", ...sprintAreaDefinitions.map((area) => area.key)]),
  status: new Set([
    "all",
    "blocked",
    "cancelled",
    "completed",
    "in_progress",
    "open",
    "waiting_review"
  ])
};

const sprintItemsSortFieldValues = new Set([
  "assignee",
  "dueDate",
  "id",
  "priority",
  "sprint",
  "status",
  "title",
  "updated"
]);

const sprintItemsSortOrderValues = new Set(["asc", "desc"]);

const initialCreateSprintItemForm: CreateSprintItemFormState = {
  assigneeIds: [],
  blockedReason: "",
  category: "",
  description: "",
  dueDate: "",
  highVisibility: false,
  notifyLater: false,
  progress: "0",
  priority: "",
  requireReview: false,
  sprintArea: "",
  sprintCode: "",
  startDate: "",
  status: "",
  title: ""
};

const initialSprintItemEditForm: SprintItemEditFormState = {
  assigneeIds: [],
  blockedReason: "",
  category: "",
  description: "",
  dueDate: "",
  note: "",
  priority: "",
  progress: "0",
  sprintArea: "",
  startDate: "",
  status: "open",
  title: ""
};

const initialAssignSprintItemForm: AssignSprintItemFormState = {
  assigneeIds: [],
  itemId: ""
};

const createStatusOptions: SprintItemCreateStatus[] = [
  "open",
  "in_progress",
  "blocked",
  "waiting_review",
  "completed"
];

const editStatusOptions: TaskStatus[] = [
  "open",
  "in_progress",
  "blocked",
  "waiting_review",
  "completed",
  "cancelled"
];

const priorityOptions: TaskPriority[] = ["low", "medium", "high", "urgent"];

const copy: Record<AppLanguage, SprintItemsCopy> = {
  ar: {
    actions: {
      export: "تصدير",
      filter: "تصفية",
      filters: "الفلاتر",
      more: "إجراءات",
      newItem: "عنصر سبرنت جديد",
      view: "عرض"
    },
    empty: "لا توجد عناصر سبرنت مطابقة.",
    filters: {
      allAssignees: "كل المسؤولين",
      allPriorities: "كل الأولويات",
      allSprints: "كل السبرنتات",
      allStatuses: "كل الحالات",
      dueDateRange: "نطاق تاريخ الاستحقاق",
      search: "ابحث في عناصر السبرنت..."
    },
    footer: "Harouge Oil Operations | 2026 ©",
    loading: "جار تحميل عناصر السبرنت...",
    metrics: {
      blocked: "محجوب",
      completed: "مكتمل",
      inProgress: "قيد التنفيذ",
      review: "مراجعة",
      total: "إجمالي عناصر السبرنت"
    },
    notes: {
      allItems: "كل العناصر",
      ofTotal: "من الإجمالي"
    },
    pagination: "عرض {from} إلى {to} من {total} عنصر سبرنت",
    table: {
      actions: "الإجراءات",
      assignee: "المسؤول",
      dueDate: "تاريخ الاستحقاق",
      id: "المعرف",
      priority: "الأولوية",
      sprint: "السبرنت",
      status: "الحالة",
      title: "العنوان",
      updated: "آخر تحديث"
    }
  },
  en: {
    actions: {
      export: "Export",
      filter: "Filter",
      filters: "Filters",
      more: "More actions",
      newItem: "New Sprint Item",
      view: "View"
    },
    empty: "No matching sprint items.",
    filters: {
      allAssignees: "All Assignees",
      allPriorities: "All Priorities",
      allSprints: "All Sprints",
      allStatuses: "All Status",
      dueDateRange: "Due date range",
      search: "Search sprint items..."
    },
    footer: "Harouge Oil Operations | 2026 ©",
    loading: "Loading sprint items...",
    metrics: {
      blocked: "Blocked",
      completed: "Completed",
      inProgress: "In Progress",
      review: "Review",
      total: "Total Sprint Items"
    },
    notes: {
      allItems: "All items",
      ofTotal: "of total"
    },
    pagination: "Showing {from} to {to} of {total} sprint items",
    table: {
      actions: "Actions",
      assignee: "Assignee",
      dueDate: "Due Date",
      id: "ID",
      priority: "Priority",
      sprint: "Sprint",
      status: "Status",
      title: "Title",
      updated: "Updated"
    }
  }
};

function SprintItemsContentView({
  refreshSignal = 0,
  session
}: {
  refreshSignal?: number;
  session: Session;
}) {
  const { language, t } = useI18n();
  const pageCopy = copy[language];
  const [searchParams, setSearchParams] = useSearchParams();
  const [state, setState] = useState<SprintItemsState>({ status: "loading" });
  const [filters, setFilters] = useState<SprintItemsFilters>(() =>
    readSprintItemsFiltersFromSearchParams(searchParams)
  );
  const [sort, setSort] = useState<SprintItemsSortState>(() =>
    readSprintItemsSortFromSearchParams(searchParams)
  );
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedItem, setSelectedItem] = useState<TaskReportRow | null>(null);
  const [selectedItemMode, setSelectedItemMode] = useState<SprintItemModalMode>("edit");
  const [selectedItemDetails, setSelectedItemDetails] = useState<TaskRecord | null>(null);
  const [isLoadingSelectedItem, setIsLoadingSelectedItem] = useState(false);
  const [openActionMenu, setOpenActionMenu] = useState<SprintItemActionMenuState | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateSprintItemFormState>(
    initialCreateSprintItemForm
  );
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreatingItem, setIsCreatingItem] = useState(false);
  const [assignableUsers, setAssignableUsers] = useState<AssignableUsersState>({
    status: "loading"
  });
  const [updateForm, setUpdateForm] = useState<SprintItemEditFormState>(
    initialSprintItemEditForm
  );
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [isUpdatingItem, setIsUpdatingItem] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignForm, setAssignForm] = useState<AssignSprintItemFormState>(
    initialAssignSprintItemForm
  );
  const [assignError, setAssignError] = useState<string | null>(null);
  const [isAssigningItem, setIsAssigningItem] = useState(false);
  const isEmployee = session.roleCode === "employee";
  const canCreateSprintItem = !isEmployee && session.permissionCodes.includes("tasks:create");
  const canAssignSprintItems = !isEmployee && session.permissionCodes.includes("tasks:assign");
  const canManageSprintItems =
    session.permissionCodes.includes("tasks:update") ||
    canAssignSprintItems;

  useEffect(() => {
    if (!canCreateSprintItem && !canManageSprintItems) {
      setAssignableUsers({ status: "ready", users: [] });
      return;
    }

    let isMounted = true;

    setAssignableUsers((current) => (current.status === "ready" ? current : { status: "loading" }));

    api.getUsers({ limit: 100, sortBy: "fullName", sortOrder: "asc", status: "active" })
      .then((result) => {
        if (isMounted) {
          setAssignableUsers({ status: "ready", users: result.data });
        }
      })
      .catch(() => {
        if (isMounted) {
          setAssignableUsers({ status: "error" });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [canCreateSprintItem, canManageSprintItems, refreshSignal]);

  useEffect(() => {
    let isMounted = true;

    setState((current) => (current.status === "ready" ? current : { status: "loading" }));

    Promise.all([
      api.getTaskReport({ limit: 100, sortBy: "lastProgressUpdateAt", sortOrder: "desc" }),
      api.getTaskReport({ limit: 1, status: "completed" }),
      api.getTaskReport({ limit: 1, status: "in_progress" }),
      api.getTaskReport({ limit: 1, status: "waiting_review" }),
      api.getTaskReport({ limit: 1, status: "blocked" })
    ])
      .then(([allItems, completed, inProgress, review, blocked]) => {
        if (!isMounted) {
          return;
        }

        setState({
          items: allItems.data,
          metrics: {
            blocked: getTotalCount(blocked),
            completed: getTotalCount(completed),
            inProgress: getTotalCount(inProgress),
            review: getTotalCount(review),
            total: getTotalCount(allItems)
          },
          pagination: allItems.pagination,
          status: "ready"
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
              : "Sprint items could not be loaded.",
          status: "error"
        });
      });

    return () => {
      isMounted = false;
    };
  }, [refreshSignal, reloadKey]);

  const allItems = state.status === "ready" ? state.items : [];
  const metrics =
    state.status === "ready"
      ? state.metrics
      : { blocked: 0, completed: 0, inProgress: 0, review: 0, total: 0 };
  const assignees = useMemo(() => getAssigneeOptions(allItems), [allItems]);
  const filteredItems = useMemo(
    () => applyFilters(allItems, filters),
    [allItems, filters]
  );
  const sortedItems = useMemo(
    () => sortSprintItems(filteredItems, sort),
    [filteredItems, sort]
  );
  const totalPages = Math.max(1, Math.ceil(sortedItems.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleItems = sortedItems.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );
  const showingFrom = sortedItems.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const showingTo = Math.min(currentPage * pageSize, sortedItems.length);
  const openActionMenuItem = openActionMenu
    ? allItems.find((item) => item.id === openActionMenu.itemId)
    : undefined;

  useEffect(() => {
    const nextFilters = readSprintItemsFiltersFromSearchParams(searchParams);
    const nextSort = readSprintItemsSortFromSearchParams(searchParams);

    setFilters((current) =>
      areSprintItemsFiltersEqual(current, nextFilters) ? current : nextFilters
    );
    setSort((current) =>
      areSprintItemsSortEqual(current, nextSort) ? current : nextSort
    );
    setPage(1);
  }, [searchParams]);

  useEffect(() => {
    const action = searchParams.get("action");

    if (!action) {
      return;
    }

    if (action === "create" && canCreateSprintItem) {
      openCreateModal();
    }

    if (action === "assign" && canAssignSprintItems) {
      openAssignModal();
    }

    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.delete("action");
    setSearchParams(nextSearchParams, { replace: true });
  }, [canAssignSprintItems, canCreateSprintItem, searchParams, setSearchParams]);

  useEffect(() => {
    if (!openActionMenu) {
      return;
    }

    function closeMenu(event: PointerEvent) {
      const target = event.target as HTMLElement | null;

      if (
        target?.closest("[data-sprint-items-floating-menu]") ||
        target?.closest("[data-sprint-items-menu-trigger]")
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

  function updateFilter<TKey extends keyof SprintItemsFilters>(
    key: TKey,
    value: SprintItemsFilters[TKey]
  ) {
    setFilters((current) => ({ ...current, focus: "all", [key]: value }));
    setPage(1);
  }

  function updateSort(field: SprintItemsSortField) {
    setSort((current) =>
      current.field === field
        ? { field, order: current.order === "asc" ? "desc" : "asc" }
        : { field, order: getDefaultSortOrder(field) }
    );
    setPage(1);
  }

  function openUpdateModal(item: TaskReportRow, mode: SprintItemModalMode = "edit") {
    setOpenActionMenu(null);
    setSelectedItem(item);
    setSelectedItemMode(mode);
    setSelectedItemDetails(null);
    setUpdateForm(toSprintItemEditForm(item));
    setUpdateError(null);
    setIsLoadingSelectedItem(true);

    api.getSprintItem(item.id)
      .then((task) => {
        setSelectedItemDetails(task);
        setUpdateForm(toSprintItemEditForm(item, task));
      })
      .catch((error: unknown) => {
        setUpdateError(
          error instanceof Error
            ? error.message
            : language === "ar"
              ? "تعذر تحميل تفاصيل عنصر السبرنت."
              : "Sprint item details could not be loaded."
        );
      })
      .finally(() => {
        setIsLoadingSelectedItem(false);
      });
  }

  function closeUpdateModal() {
    setSelectedItem(null);
    setSelectedItemMode("edit");
    setSelectedItemDetails(null);
    setUpdateError(null);
    setIsUpdatingItem(false);
    setIsLoadingSelectedItem(false);
    setUpdateForm(initialSprintItemEditForm);
  }

  function openCreateModal() {
    setCreateForm(initialCreateSprintItemForm);
    setCreateError(null);
    setIsCreateModalOpen(true);
  }

  function closeCreateModal() {
    if (isCreatingItem) {
      return;
    }

    setIsCreateModalOpen(false);
    setCreateError(null);
    setCreateForm(initialCreateSprintItemForm);
  }

  function openAssignModal(item?: TaskReportRow) {
    setOpenActionMenu(null);
    setAssignForm({
      assigneeIds: item ? getAssignedUserIds(item) : [],
      itemId: item?.id ?? ""
    });
    setAssignError(null);
    setIsAssignModalOpen(true);
  }

  function closeAssignModal() {
    if (isAssigningItem) {
      return;
    }

    setIsAssignModalOpen(false);
    setAssignError(null);
    setAssignForm(initialAssignSprintItemForm);
  }

  function toggleActionMenu(
    itemId: string,
    event: MouseEvent<HTMLButtonElement>
  ) {
    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 164;
    const menuHeight = 142;
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
      setReloadKey((current) => current + 1);
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

  function updateAssignForm<TKey extends keyof AssignSprintItemFormState>(
    key: TKey,
    value: AssignSprintItemFormState[TKey]
  ) {
    setAssignForm((current) => {
      if (key !== "itemId") {
        return { ...current, [key]: value };
      }

      const itemId = value as string;
      const selectedItemForAssignment = allItems.find((item) => item.id === itemId);

      return {
        assigneeIds: selectedItemForAssignment
          ? getAssignedUserIds(selectedItemForAssignment)
          : [],
        itemId
      };
    });
    setAssignError(null);
  }

  function updateCreateForm<TKey extends keyof CreateSprintItemFormState>(
    key: TKey,
    value: CreateSprintItemFormState[TKey]
  ) {
    setCreateForm((current) => {
      if (key !== "sprintArea") {
        return { ...current, [key]: value };
      }

      const sprintArea = value as CreateSprintItemFormState["sprintArea"];
      const area = getSprintAreaDefinition(sprintArea);
      const categoryIsStillValid =
        current.category && area?.categories.includes(current.category);

      return {
        ...current,
        category: categoryIsStillValid ? current.category : "",
        sprintArea,
        status:
          current.status === "blocked" && !current.blockedReason
            ? current.status
            : current.status
      };
    });
    setCreateError(null);
  }

  async function handleCreateSprintItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = validateCreateSprintItemForm(createForm, language);

    if (validationError) {
      setCreateError(validationError);
      return;
    }

    setIsCreatingItem(true);
    setCreateError(null);

    try {
      const payload: CreateSprintItemPayload = {
        ...(createForm.assigneeIds.length > 0
          ? {
              assigneeIds: createForm.assigneeIds,
              assignedTo: createForm.assigneeIds[0]
            }
          : {}),
        category: createForm.category || getDefaultCategoryForArea(createForm.sprintArea),
        ...(createForm.description.trim()
          ? { description: createForm.description.trim() }
          : {}),
        dueDate: toDateTimeIso(createForm.dueDate, "17:00"),
        priority: createForm.priority || "medium",
        ...(createForm.startDate
          ? { startDate: toDateTimeIso(createForm.startDate, "09:00") }
          : {}),
        title: createForm.title.trim()
      };
      const createdTask = await api.createSprintItem(payload);
      const progress = clampProgress(createForm.progress);
      const creationNote = buildCreateSprintItemNote(createForm);

      if (progress > 0 || creationNote) {
        await api.updateTaskProgress(createdTask.id, {
          ...(creationNote ? { note: creationNote } : {}),
          progress
        });
      }

      if (createForm.status && createForm.status !== "open") {
        if (!(createForm.status === "in_progress" && progress > 0)) {
          await api.changeTaskStatus(createdTask.id, {
            ...(createForm.status === "blocked"
              ? { blockedReason: createForm.blockedReason.trim() }
              : {}),
            ...(creationNote ? { note: creationNote } : {}),
            status: createForm.status
          });
        }
      }

      setIsCreateModalOpen(false);
      setCreateForm(initialCreateSprintItemForm);
      setReloadKey((current) => current + 1);
    } catch (error) {
      setCreateError(
        error instanceof Error
          ? error.message
          : language === "ar"
            ? "تعذر إنشاء عنصر السبرنت."
            : "Sprint item could not be created."
      );
    } finally {
      setIsCreatingItem(false);
    }
  }

  async function handleAssignSprintItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const labels = getAssignSprintItemCopy(language);
    const selectedSprintItem = allItems.find((item) => item.id === assignForm.itemId);

    if (!selectedSprintItem || assignForm.assigneeIds.length === 0) {
      setAssignError(labels.validation);
      return;
    }

    if (areStringArraysEqual(getAssignedUserIds(selectedSprintItem), assignForm.assigneeIds)) {
      setAssignError(labels.noChange);
      return;
    }

    setIsAssigningItem(true);
    setAssignError(null);

    try {
      await api.reassignSprintItem(assignForm.itemId, {
        assigneeIds: assignForm.assigneeIds,
        assignedTo: assignForm.assigneeIds[0] ?? null
      });

      setIsAssignModalOpen(false);
      setAssignForm(initialAssignSprintItemForm);
      setReloadKey((current) => current + 1);
    } catch (error) {
      setAssignError(
        error instanceof Error
          ? error.message
          : labels.error
      );
    } finally {
      setIsAssigningItem(false);
    }
  }

  async function handleUpdateItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedItem) {
      return;
    }

    const canFullyEdit = canFullyEditSprintItem(selectedItem, session);
    const progress = Math.max(0, Math.min(100, Number(updateForm.progress)));
    const note = updateForm.note.trim();
    const validationError = validateSprintItemEditForm(
      updateForm,
      canFullyEdit,
      language
    );

    if (validationError) {
      setUpdateError(validationError);
      return;
    }

    if (
      (updateForm.status === "completed" || updateForm.status === "waiting_review") &&
      progress !== 100
    ) {
      setUpdateError(
        language === "ar"
          ? "يجب أن يكون التقدم 100% قبل إكمال عنصر السبرنت أو إرساله للمراجعة."
          : "Progress must be 100% before completing or reviewing the sprint item."
      );
      return;
    }

    setIsUpdatingItem(true);
    setUpdateError(null);

    try {
      if (canFullyEdit) {
        const metadataPayload: UpdateSprintItemPayload = {
          category: updateForm.category || getDefaultCategoryForArea(updateForm.sprintArea),
          description: updateForm.description.trim(),
          dueDate: updateForm.dueDate
            ? toDateTimeIso(updateForm.dueDate, "17:00")
            : null,
          priority: updateForm.priority || "medium",
          startDate: updateForm.startDate
            ? toDateTimeIso(updateForm.startDate, "09:00")
            : null,
          title: updateForm.title.trim()
        };
        await api.updateSprintItem(selectedItem.id, metadataPayload);

        const previousAssigneeIds =
          selectedItemDetails?.assigneeIds ?? getAssignedUserIds(selectedItem);
        const nextAssigneeIds = updateForm.assigneeIds;

        if (!areStringArraysEqual(nextAssigneeIds, previousAssigneeIds)) {
          await api.reassignSprintItem(selectedItem.id, {
            assigneeIds: nextAssigneeIds,
            assignedTo: nextAssigneeIds[0] ?? null
          });
        }
      }

      if (
        progress !== (selectedItemDetails?.progress ?? selectedItem.progress) ||
        note
      ) {
        await api.updateTaskProgress(selectedItem.id, {
          ...(note ? { note } : {}),
          progress
        });
      }

      if (updateForm.status !== (selectedItemDetails?.status ?? selectedItem.status)) {
        await api.changeTaskStatus(selectedItem.id, {
          ...(updateForm.status === "blocked"
            ? { blockedReason: updateForm.blockedReason.trim() }
            : {}),
          ...(note ? { note } : {}),
          status: updateForm.status
        });
      }

      closeUpdateModal();
      setReloadKey((current) => current + 1);
    } catch (error) {
      setUpdateError(
        error instanceof Error
          ? error.message
          : language === "ar"
            ? "تعذر تحديث عنصر السبرنت."
            : "Sprint item could not be updated."
      );
    } finally {
      setIsUpdatingItem(false);
    }
  }

  return (
    <section
      className={`sprint-items-canvas${
        isCreateModalOpen || isAssignModalOpen || selectedItem ? " has-modal-open" : ""
      }`}
      aria-label={t("dashboard.navigation.sprintItems")}
    >
      <div className="sprint-items-page-actions">
        {!isEmployee ? (
          <button className="sprint-items-utility-button" type="button">
            <Download size={16} strokeWidth={2.25} aria-hidden="true" />
            {pageCopy.actions.export}
          </button>
        ) : null}
        <button className="sprint-items-utility-button" type="button">
          <Filter size={16} strokeWidth={2.25} aria-hidden="true" />
          {pageCopy.actions.filters}
        </button>
        {canAssignSprintItems ? (
          <button
            className="sprint-items-utility-button"
            onClick={() => openAssignModal()}
            type="button"
          >
            <ClipboardCheck size={16} strokeWidth={2.25} aria-hidden="true" />
            {language === "ar" ? "إسناد عنصر سبرنت" : "Assign Sprint Item"}
          </button>
        ) : null}
        {canCreateSprintItem ? (
          <button
            className="sprint-items-primary-button"
            onClick={openCreateModal}
            type="button"
          >
            <Plus size={17} strokeWidth={2.35} aria-hidden="true" />
            {pageCopy.actions.newItem}
          </button>
        ) : null}
      </div>

      <div className="sprint-items-stat-grid">
        {buildMetricCards(metrics, pageCopy).map((card) => {
          const Icon = card.icon;

          return (
            <article className="sprint-items-stat-card" key={card.label}>
              <span className={`sprint-items-stat-icon sprint-items-tone-${card.tone}`}>
                <Icon size={25} strokeWidth={2.1} aria-hidden="true" />
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

      <section className="sprint-items-table-card">
        <header className="sprint-items-toolbar">
          <div className="sprint-items-filter-controls">
            <label>
              <span className="sr-only">{pageCopy.filters.allStatuses}</span>
              <select
                aria-label={pageCopy.filters.allStatuses}
                onChange={(event) => updateFilter("status", event.target.value)}
                value={filters.status}
              >
                <option value="all">{pageCopy.filters.allStatuses}</option>
                <option value="open">{formatStatus("open", language)}</option>
                <option value="in_progress">{formatStatus("in_progress", language)}</option>
                <option value="waiting_review">{formatStatus("waiting_review", language)}</option>
                <option value="blocked">{formatStatus("blocked", language)}</option>
                <option value="completed">{formatStatus("completed", language)}</option>
                <option value="cancelled">{formatStatus("cancelled", language)}</option>
              </select>
            </label>
            <label>
              <span className="sr-only">{pageCopy.filters.allPriorities}</span>
              <select
                aria-label={pageCopy.filters.allPriorities}
                onChange={(event) => updateFilter("priority", event.target.value)}
                value={filters.priority}
              >
                <option value="all">{pageCopy.filters.allPriorities}</option>
                <option value="low">{formatPriority("low", language)}</option>
                <option value="medium">{formatPriority("medium", language)}</option>
                <option value="high">{formatPriority("high", language)}</option>
                <option value="urgent">{formatPriority("urgent", language)}</option>
              </select>
            </label>
            <label>
              <span className="sr-only">{pageCopy.filters.allAssignees}</span>
              <select
                aria-label={pageCopy.filters.allAssignees}
                onChange={(event) => updateFilter("assignee", event.target.value)}
                value={filters.assignee}
              >
                <option value="all">{pageCopy.filters.allAssignees}</option>
                {assignees.map((assignee) => (
                  <option key={assignee.id} value={assignee.id}>
                    {assignee.name}
                  </option>
                ))}
              </select>
            </label>
            {isEmployee ? (
              <button
                className={`sprint-items-my-filter${filters.assignee === session.userId ? " is-active" : ""}`}
                onClick={() =>
                  updateFilter(
                    "assignee",
                    filters.assignee === session.userId ? "all" : session.userId
                  )
                }
                type="button"
              >
                {language === "ar" ? "مهامي فقط" : "My items only"}
              </button>
            ) : null}
            <label>
              <span className="sr-only">{pageCopy.filters.allSprints}</span>
              <select
                aria-label={pageCopy.filters.allSprints}
                onChange={(event) => updateFilter("sprint", event.target.value)}
                value={filters.sprint}
              >
                <option value="all">{pageCopy.filters.allSprints}</option>
                {sprintAreaDefinitions.map((area) => (
                  <option key={area.key} value={area.key}>
                    {t(area.labelKey)}
                  </option>
                ))}
              </select>
            </label>
            <button
              className={`sprint-items-date-filter${filters.focus === "milestones" ? " is-active" : ""}`}
              onClick={() =>
                updateFilter(
                  "focus",
                  filters.focus === "milestones" ? "all" : "milestones"
                )
              }
              type="button"
            >
              <CalendarDays size={16} strokeWidth={2.1} aria-hidden="true" />
              {filters.focus === "milestones"
                ? language === "ar"
                  ? "مراحل السبرنت"
                  : "Sprint milestones"
                : pageCopy.filters.dueDateRange}
            </button>
          </div>

          <div className="sprint-items-toolbar-search" role="search">
            <Search size={17} strokeWidth={2.1} />
            <input
              aria-label={pageCopy.filters.search}
              onChange={(event) => updateFilter("search", event.target.value)}
              placeholder={pageCopy.filters.search}
              value={filters.search}
            />
          </div>
          <button className="sprint-items-filter-button" onClick={() => setPage(1)} type="button">
            <Filter size={16} strokeWidth={2.2} aria-hidden="true" />
            {pageCopy.actions.filter}
          </button>
          <button
            aria-label={pageCopy.actions.more}
            className="sprint-items-more-button"
            type="button"
          >
            <MoreVertical size={18} strokeWidth={2.2} />
          </button>
        </header>

        <div className="sprint-items-table-scroll">
          <table className="sprint-items-table">
            <thead>
              <tr>
                <th aria-label="Select all">
                  <input type="checkbox" />
                </th>
                <SortableHeader
                  active={sort.field === "id"}
                  label={pageCopy.table.id}
                  onSort={() => updateSort("id")}
                  order={sort.order}
                />
                <SortableHeader
                  active={sort.field === "title"}
                  label={pageCopy.table.title}
                  onSort={() => updateSort("title")}
                  order={sort.order}
                />
                <SortableHeader
                  active={sort.field === "sprint"}
                  label={pageCopy.table.sprint}
                  onSort={() => updateSort("sprint")}
                  order={sort.order}
                />
                <SortableHeader
                  active={sort.field === "assignee"}
                  label={pageCopy.table.assignee}
                  onSort={() => updateSort("assignee")}
                  order={sort.order}
                />
                <SortableHeader
                  active={sort.field === "priority"}
                  label={pageCopy.table.priority}
                  onSort={() => updateSort("priority")}
                  order={sort.order}
                />
                <SortableHeader
                  active={sort.field === "status"}
                  label={pageCopy.table.status}
                  onSort={() => updateSort("status")}
                  order={sort.order}
                />
                <SortableHeader
                  active={sort.field === "dueDate"}
                  label={pageCopy.table.dueDate}
                  onSort={() => updateSort("dueDate")}
                  order={sort.order}
                />
                <SortableHeader
                  active={sort.field === "updated"}
                  label={pageCopy.table.updated}
                  onSort={() => updateSort("updated")}
                  order={sort.order}
                />
                <th>{pageCopy.table.actions}</th>
              </tr>
            </thead>
            <tbody>
              {state.status === "loading" ? (
                <tr>
                  <td colSpan={10}>{pageCopy.loading}</td>
                </tr>
              ) : null}
              {state.status === "error" ? (
                <tr>
                  <td colSpan={10}>{state.message}</td>
                </tr>
              ) : null}
              {state.status === "ready" && visibleItems.length === 0 ? (
                <tr>
                  <td colSpan={10}>{pageCopy.empty}</td>
                </tr>
              ) : null}
              {state.status === "ready"
                ? visibleItems.map((item) => (
                    <SprintItemRow
                      canAssign={canAssignSprintItems && isAssignableSprintItem(item)}
                      canCancel={canFullyEditSprintItem(item, session) && isCancellableSprintItem(item)}
                      canUpdate={canUpdateSprintItem(item, session)}
                      canView={canViewSprintItem(item, session)}
                      item={item}
                      key={item.id}
                      language={language}
                      onToggleMenu={toggleActionMenu}
                      onUpdate={(selectedItem) => openUpdateModal(selectedItem, "edit")}
                      onView={(selectedItem) => openUpdateModal(selectedItem, "view")}
                    />
                  ))
                : null}
            </tbody>
          </table>
        </div>

        {openActionMenu && openActionMenuItem ? (
          <SprintItemFloatingActionMenu
            canAssign={canAssignSprintItems && isAssignableSprintItem(openActionMenuItem)}
            canCancel={canFullyEditSprintItem(openActionMenuItem, session) && isCancellableSprintItem(openActionMenuItem)}
            canUpdate={canUpdateSprintItem(openActionMenuItem, session)}
            canView={canViewSprintItem(openActionMenuItem, session)}
            item={openActionMenuItem}
            labels={getSprintItemRowActionCopy(language)}
            left={openActionMenu.left}
            onAssign={openAssignModal}
            onCancel={cancelSprintItem}
            onEdit={(selectedItem) => openUpdateModal(selectedItem, "edit")}
            onView={(selectedItem) => openUpdateModal(selectedItem, "view")}
            top={openActionMenu.top}
          />
        ) : null}

        <footer className="sprint-items-table-footer">
          <span>
            {formatPaginationText(
              pageCopy,
              showingFrom,
              showingTo,
              state.status === "ready" ? filteredItems.length : 0
            )}
          </span>
          <div className="sprint-items-pagination">
            <button
              disabled={currentPage <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              type="button"
            >
              ‹
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, index) => index + 1).map(
              (pageNumber) => (
                <button
                  className={pageNumber === currentPage ? "is-active" : undefined}
                  key={pageNumber}
                  onClick={() => setPage(pageNumber)}
                  type="button"
                >
                  {pageNumber}
                </button>
              )
            )}
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              type="button"
            >
              ›
            </button>
          </div>
        </footer>
      </section>

      <footer className="sprint-items-page-footer">{pageCopy.footer}</footer>

      {isCreateModalOpen ? (
        <CreateSprintItemModal
          assignableUsers={assignableUsers}
          error={createError}
          form={createForm}
          isSubmitting={isCreatingItem}
          language={language}
          onClose={closeCreateModal}
          onSubmit={handleCreateSprintItem}
          onUpdate={updateCreateForm}
          t={t}
        />
      ) : null}

      {isAssignModalOpen ? (
        <AssignSprintItemModal
          assignableUsers={assignableUsers}
          error={assignError}
          form={assignForm}
          isSubmitting={isAssigningItem}
          items={allItems}
          itemsStatus={state.status}
          language={language}
          onClose={closeAssignModal}
          onSubmit={handleAssignSprintItem}
          onUpdate={updateAssignForm}
        />
      ) : null}

      {selectedItem ? (
        <SprintItemUpdateModal
          assignableUsers={assignableUsers}
          canFullyEdit={canFullyEditSprintItem(selectedItem, session)}
          error={updateError}
          form={updateForm}
          isLoading={isLoadingSelectedItem}
          isSubmitting={isUpdatingItem}
          item={selectedItem}
          language={language}
          mode={selectedItemMode}
          onClose={closeUpdateModal}
          onSubmit={handleUpdateItem}
          onUpdate={(key, value) => {
            setUpdateForm((current) => ({ ...current, [key]: value }));
            setUpdateError(null);
          }}
          t={t}
        />
      ) : null}
    </section>
  );
}

export function SprintItemsQuickActionModal({
  action,
  initialSprintArea,
  onClose,
  onCompleted,
  session
}: {
  action: "assign" | "create";
  initialSprintArea?: SprintAreaKey;
  onClose: () => void;
  onCompleted: () => void;
  session: Session;
}) {
  const { language, t } = useI18n();
  const [assignableUsers, setAssignableUsers] = useState<AssignableUsersState>({
    status: "loading"
  });
  const [items, setItems] = useState<TaskReportRow[]>([]);
  const [itemsStatus, setItemsStatus] = useState<SprintItemsState["status"]>(
    action === "assign" ? "loading" : "ready"
  );
  const [createForm, setCreateForm] = useState<CreateSprintItemFormState>(() =>
    buildInitialCreateSprintItemForm(initialSprintArea)
  );
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreatingItem, setIsCreatingItem] = useState(false);
  const [assignForm, setAssignForm] = useState<AssignSprintItemFormState>(
    initialAssignSprintItemForm
  );
  const [assignError, setAssignError] = useState<string | null>(null);
  const [isAssigningItem, setIsAssigningItem] = useState(false);

  useEffect(() => {
    let isMounted = true;

    setAssignableUsers({ status: "loading" });

    api.getUsers({ limit: 100, sortBy: "fullName", sortOrder: "asc", status: "active" })
      .then((result) => {
        if (isMounted) {
          setAssignableUsers({ status: "ready", users: result.data });
        }
      })
      .catch(() => {
        if (isMounted) {
          setAssignableUsers({ status: "error" });
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (action !== "assign") {
      return;
    }

    let isMounted = true;

    setItemsStatus("loading");

    api.getTaskReport({
      limit: 100,
      sortBy: "lastProgressUpdateAt",
      sortOrder: "desc"
    })
      .then((result) => {
        if (isMounted) {
          setItems(result.data);
          setItemsStatus("ready");
        }
      })
      .catch((error: unknown) => {
        if (isMounted) {
          setAssignError(
            error instanceof Error
              ? error.message
              : language === "ar"
                ? "تعذر تحميل عناصر السبرنت."
                : "Sprint items could not be loaded."
          );
          setItemsStatus("error");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [action, language]);

  function updateCreateForm<TKey extends keyof CreateSprintItemFormState>(
    key: TKey,
    value: CreateSprintItemFormState[TKey]
  ) {
    setCreateForm((current) => {
      if (key !== "sprintArea") {
        return { ...current, [key]: value };
      }

      const sprintArea = value as CreateSprintItemFormState["sprintArea"];
      const area = getSprintAreaDefinition(sprintArea);
      const categoryIsStillValid =
        current.category && area?.categories.includes(current.category);

      return {
        ...current,
        category: categoryIsStillValid ? current.category : "",
        sprintArea
      };
    });
    setCreateError(null);
  }

  function updateAssignForm<TKey extends keyof AssignSprintItemFormState>(
    key: TKey,
    value: AssignSprintItemFormState[TKey]
  ) {
    setAssignForm((current) => {
      if (key !== "itemId") {
        return { ...current, [key]: value };
      }

      const itemId = value as string;
      const selectedItemForAssignment = items.find((item) => item.id === itemId);

      return {
        assigneeIds: selectedItemForAssignment
          ? getAssignedUserIds(selectedItemForAssignment)
          : [],
        itemId
      };
    });
    setAssignError(null);
  }

  async function handleCreateSprintItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = validateCreateSprintItemForm(createForm, language);

    if (validationError) {
      setCreateError(validationError);
      return;
    }

    setIsCreatingItem(true);
    setCreateError(null);

    try {
      const payload: CreateSprintItemPayload = {
        ...(createForm.assigneeIds.length > 0
          ? {
              assigneeIds: createForm.assigneeIds,
              assignedTo: createForm.assigneeIds[0]
            }
          : {}),
        category: createForm.category || getDefaultCategoryForArea(createForm.sprintArea),
        ...(createForm.description.trim()
          ? { description: createForm.description.trim() }
          : {}),
        dueDate: toDateTimeIso(createForm.dueDate, "17:00"),
        priority: createForm.priority || "medium",
        ...(createForm.startDate
          ? { startDate: toDateTimeIso(createForm.startDate, "09:00") }
          : {}),
        title: createForm.title.trim()
      };
      const createdTask = await api.createSprintItem(payload);
      const progress = clampProgress(createForm.progress);
      const creationNote = buildCreateSprintItemNote(createForm);

      if (progress > 0 || creationNote) {
        await api.updateTaskProgress(createdTask.id, {
          ...(creationNote ? { note: creationNote } : {}),
          progress
        });
      }

      if (createForm.status && createForm.status !== "open") {
        if (!(createForm.status === "in_progress" && progress > 0)) {
          await api.changeTaskStatus(createdTask.id, {
            ...(createForm.status === "blocked"
              ? { blockedReason: createForm.blockedReason.trim() }
              : {}),
            ...(creationNote ? { note: creationNote } : {}),
            status: createForm.status
          });
        }
      }

      onCompleted();
      onClose();
    } catch (error) {
      setCreateError(
        error instanceof Error
          ? error.message
          : language === "ar"
            ? "تعذر إنشاء عنصر السبرنت."
            : "Sprint item could not be created."
      );
    } finally {
      setIsCreatingItem(false);
    }
  }

  async function handleAssignSprintItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const labels = getAssignSprintItemCopy(language);
    const selectedSprintItem = items.find((item) => item.id === assignForm.itemId);

    if (!selectedSprintItem || assignForm.assigneeIds.length === 0) {
      setAssignError(labels.validation);
      return;
    }

    if (areStringArraysEqual(getAssignedUserIds(selectedSprintItem), assignForm.assigneeIds)) {
      setAssignError(labels.noChange);
      return;
    }

    setIsAssigningItem(true);
    setAssignError(null);

    try {
      await api.reassignSprintItem(assignForm.itemId, {
        assigneeIds: assignForm.assigneeIds,
        assignedTo: assignForm.assigneeIds[0] ?? null
      });

      onCompleted();
      onClose();
    } catch (error) {
      setAssignError(error instanceof Error ? error.message : labels.error);
    } finally {
      setIsAssigningItem(false);
    }
  }

  if (action === "create") {
    return (
      <CreateSprintItemModal
        assignableUsers={assignableUsers}
        error={createError}
        form={createForm}
        isSubmitting={isCreatingItem}
        language={language}
        onClose={isCreatingItem ? () => undefined : onClose}
        onSubmit={handleCreateSprintItem}
        onUpdate={updateCreateForm}
        t={t}
      />
    );
  }

  return (
    <AssignSprintItemModal
      assignableUsers={assignableUsers}
      error={assignError}
      form={assignForm}
      isSubmitting={isAssigningItem}
      items={items}
      itemsStatus={itemsStatus}
      language={language}
      onClose={isAssigningItem ? () => undefined : onClose}
      onSubmit={handleAssignSprintItem}
      onUpdate={updateAssignForm}
    />
  );
}

function buildInitialCreateSprintItemForm(
  initialSprintArea?: SprintAreaKey
): CreateSprintItemFormState {
  return {
    ...initialCreateSprintItemForm,
    category: initialSprintArea ? getDefaultCategoryForArea(initialSprintArea) : "",
    sprintArea: initialSprintArea ?? ""
  };
}

function CreateSprintItemModal({
  assignableUsers,
  error,
  form,
  isSubmitting,
  language,
  onClose,
  onSubmit,
  onUpdate,
  t
}: {
  assignableUsers: AssignableUsersState;
  error: string | null;
  form: CreateSprintItemFormState;
  isSubmitting: boolean;
  language: AppLanguage;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onUpdate: <TKey extends keyof CreateSprintItemFormState>(
    key: TKey,
    value: CreateSprintItemFormState[TKey]
  ) => void;
  t: (key: string) => string;
}) {
  const text = getCreateSprintItemCopy(language);
  const users = assignableUsers.status === "ready" ? assignableUsers.users : [];
  const categoryOptions = getCategoryOptionsForArea(form.sprintArea);
  const progress = clampProgress(form.progress);
  const isBlocked = form.status === "blocked";

  return (
    <div className="sprint-items-modal-backdrop" role="presentation">
      <form
        aria-labelledby="create-sprint-item-title"
        className="sprint-items-create-modal"
        onSubmit={onSubmit}
      >
        <header className="sprint-items-create-header">
          <span className="sprint-items-create-title-icon">
            <ClipboardPlus size={30} strokeWidth={2.1} aria-hidden="true" />
          </span>
          <div>
            <h2 id="create-sprint-item-title">{text.title}</h2>
            <p>{text.subtitle}</p>
          </div>
          <button
            aria-label={text.close}
            className="sprint-items-create-close"
            disabled={isSubmitting}
            onClick={onClose}
            type="button"
          >
            <X size={21} strokeWidth={2.35} aria-hidden="true" />
          </button>
        </header>

        <div className="sprint-items-create-grid">
          <section className="sprint-items-create-section">
            <h3>
              <span>1</span>
              {text.sections.itemInfo}
            </h3>
            <div className="sprint-items-create-section-grid">
              <CreateSprintItemField
                icon={Bookmark}
                label={text.fields.title}
                required
              >
                <input
                  maxLength={120}
                  onChange={(event) => onUpdate("title", event.target.value)}
                  placeholder={text.placeholders.title}
                  value={form.title}
                />
              </CreateSprintItemField>

              <CreateSprintItemField
                icon={ListChecks}
                label={text.fields.sprintArea}
                required
              >
                <select
                  onChange={(event) =>
                    onUpdate("sprintArea", event.target.value as SprintAreaKey | "")
                  }
                  value={form.sprintArea}
                >
                  <option value="">{text.placeholders.sprintArea}</option>
                  {sprintAreaDefinitions.map((area) => (
                    <option key={area.key} value={area.key}>
                      {t(area.labelKey)}
                    </option>
                  ))}
                </select>
              </CreateSprintItemField>

              <CreateSprintItemField icon={Hash} label={text.fields.code}>
                <input
                  onChange={(event) => onUpdate("sprintCode", event.target.value)}
                  placeholder={text.placeholders.code}
                  readOnly
                  value={form.sprintCode}
                />
              </CreateSprintItemField>

              <CreateSprintItemField
                className="is-tall"
                icon={ListChecks}
                label={text.fields.description}
              >
                <textarea
                  maxLength={500}
                  onChange={(event) => onUpdate("description", event.target.value)}
                  placeholder={text.placeholders.description}
                  value={form.description}
                />
                <span className="sprint-items-create-counter">
                  {form.description.length} / 500
                </span>
              </CreateSprintItemField>
            </div>
          </section>

          <section className="sprint-items-create-section">
            <h3>
              <span>2</span>
              {text.sections.assignment}
            </h3>
            <div className="sprint-items-create-section-grid">
              <CreateSprintItemField
                className="is-wide"
                icon={ClipboardCheck}
                label={text.fields.assignee}
              >
                <MultiAssigneePicker
                  disabled={assignableUsers.status !== "ready"}
                  emptyText={
                    assignableUsers.status === "loading"
                      ? text.placeholders.loadingUsers
                      : assignableUsers.status === "error"
                        ? text.placeholders.usersUnavailable
                        : text.placeholders.assignee
                  }
                  onChange={(value) => onUpdate("assigneeIds", value)}
                  selectedIds={form.assigneeIds}
                  users={users}
                />
              </CreateSprintItemField>

              <CreateSprintItemField icon={Flag} label={text.fields.priority} required>
                <select
                  onChange={(event) =>
                    onUpdate("priority", event.target.value as TaskPriority | "")
                  }
                  value={form.priority}
                >
                  <option value="">{text.placeholders.priority}</option>
                  {priorityOptions.map((priority) => (
                    <option key={priority} value={priority}>
                      {formatPriority(priority, language)}
                    </option>
                  ))}
                </select>
              </CreateSprintItemField>

              <CreateSprintItemField icon={CalendarDays} label={text.fields.dueDate} required>
                <input
                  min={form.startDate || undefined}
                  onChange={(event) => onUpdate("dueDate", event.target.value)}
                  type="date"
                  value={form.dueDate}
                />
              </CreateSprintItemField>

              <CreateSprintItemField icon={CalendarDays} label={text.fields.startDate}>
                <input
                  max={form.dueDate || undefined}
                  onChange={(event) => onUpdate("startDate", event.target.value)}
                  type="date"
                  value={form.startDate}
                />
              </CreateSprintItemField>
            </div>
          </section>

          <section className="sprint-items-create-section">
            <h3>
              <span>3</span>
              {text.sections.status}
            </h3>
            <div className="sprint-items-create-section-grid">
              <CreateSprintItemField icon={CircleDot} label={text.fields.status} required>
                <select
                  onChange={(event) =>
                    onUpdate("status", event.target.value as SprintItemCreateStatus | "")
                  }
                  value={form.status}
                >
                  <option value="">{text.placeholders.status}</option>
                  {createStatusOptions.map((status) => (
                    <option key={status} value={status}>
                      {formatStatus(status, language)}
                    </option>
                  ))}
                </select>
              </CreateSprintItemField>

              <label className="sprint-items-create-progress">
                <span>
                  {text.fields.progress}
                  <b aria-hidden="true">*</b>
                </span>
                <div>
                  <strong>{progress}%</strong>
                  <input
                    max={100}
                    min={0}
                    onChange={(event) => onUpdate("progress", event.target.value)}
                    type="range"
                    value={progress}
                  />
                  <input
                    aria-label={text.fields.progress}
                    max={100}
                    min={0}
                    onChange={(event) => onUpdate("progress", event.target.value)}
                    type="number"
                    value={form.progress}
                  />
                </div>
              </label>

              <CreateSprintItemField icon={LockKeyhole} label={text.fields.blockedReason}>
                <input
                  disabled={!isBlocked}
                  onChange={(event) => onUpdate("blockedReason", event.target.value)}
                  placeholder={
                    isBlocked
                      ? text.placeholders.blockedReason
                      : text.placeholders.selectStatusFirst
                  }
                  value={form.blockedReason}
                />
              </CreateSprintItemField>

              <CreateSprintItemField icon={Layers3} label={text.fields.category}>
                <select
                  disabled={!form.sprintArea}
                  onChange={(event) =>
                    onUpdate("category", event.target.value as TaskCategory | "")
                  }
                  value={form.category}
                >
                  <option value="">{text.placeholders.category}</option>
                  {categoryOptions.map((category) => (
                    <option key={category} value={category}>
                      {formatCategory(category, language)}
                    </option>
                  ))}
                </select>
              </CreateSprintItemField>
            </div>
          </section>

          <section className="sprint-items-create-section">
            <h3>
              <span>4</span>
              {text.sections.options}
            </h3>
            <div className="sprint-items-create-callout">
              <AlertCircle size={18} strokeWidth={2.2} aria-hidden="true" />
              <p>{text.options.callout}</p>
            </div>
            <div className="sprint-items-create-options">
              <CreateSprintItemOption
                checked={form.notifyLater}
                label={text.options.notify}
                onChange={(value) => onUpdate("notifyLater", value)}
              />
              <CreateSprintItemOption
                checked={form.highVisibility}
                label={text.options.highVisibility}
                onChange={(value) => onUpdate("highVisibility", value)}
              />
              <CreateSprintItemOption
                checked={form.requireReview}
                label={text.options.requireReview}
                onChange={(value) => onUpdate("requireReview", value)}
              />
            </div>
          </section>
        </div>

        {error ? <p className="sprint-items-create-error">{error}</p> : null}

        <footer className="sprint-items-create-footer">
          <button disabled={isSubmitting} onClick={onClose} type="button">
            <X size={17} strokeWidth={2.3} aria-hidden="true" />
            {text.cancel}
          </button>
          <button disabled={isSubmitting} type="submit">
            <UserRound size={17} strokeWidth={2.25} aria-hidden="true" />
            {isSubmitting ? text.creating : text.create}
          </button>
        </footer>
      </form>
    </div>
  );
}

function AssignSprintItemModal({
  assignableUsers,
  error,
  form,
  isSubmitting,
  items,
  itemsStatus,
  language,
  onClose,
  onSubmit,
  onUpdate
}: {
  assignableUsers: AssignableUsersState;
  error: string | null;
  form: AssignSprintItemFormState;
  isSubmitting: boolean;
  items: TaskReportRow[];
  itemsStatus: SprintItemsState["status"];
  language: AppLanguage;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onUpdate: <TKey extends keyof AssignSprintItemFormState>(
    key: TKey,
    value: AssignSprintItemFormState[TKey]
  ) => void;
}) {
  const labels = getAssignSprintItemCopy(language);
  const users = assignableUsers.status === "ready" ? assignableUsers.users : [];
  const assignableItems = items.filter(
    (item) => item.status !== "completed" && item.status !== "cancelled"
  );
  const selectedItem = items.find((item) => item.id === form.itemId);
  const selectedAssignees = users.filter((user) => form.assigneeIds.includes(user.id));

  return (
    <div className="sprint-items-modal-backdrop" role="presentation">
      <form
        aria-labelledby="assign-sprint-item-title"
        className="sprint-items-update-modal sprint-items-assign-modal"
        onSubmit={onSubmit}
      >
        <header>
          <div>
            <h2 id="assign-sprint-item-title">{labels.title}</h2>
            <p>{labels.subtitle}</p>
          </div>
          <button
            aria-label={labels.cancel}
            disabled={isSubmitting}
            onClick={onClose}
            type="button"
          >
            <X size={20} strokeWidth={2.2} />
          </button>
        </header>

        <label className="sprint-items-update-field">
          <span>{labels.fields.item}</span>
          <select
            disabled={itemsStatus === "loading" || assignableItems.length === 0}
            onChange={(event) => onUpdate("itemId", event.target.value)}
            required
            value={form.itemId}
          >
            <option value="">
              {itemsStatus === "loading"
                ? labels.placeholders.loadingItems
                : assignableItems.length === 0
                  ? labels.placeholders.noItems
                  : labels.placeholders.item}
            </option>
            {assignableItems.map((item) => (
              <option key={item.id} value={item.id}>
                {formatSprintItemCode(item)} - {item.title}
              </option>
            ))}
          </select>
        </label>

        <label className="sprint-items-update-field">
          <span>{labels.fields.assignee}</span>
          <MultiAssigneePicker
            disabled={assignableUsers.status !== "ready"}
            emptyText={
              assignableUsers.status === "loading"
                ? labels.placeholders.loadingUsers
                : assignableUsers.status === "error"
                  ? labels.placeholders.usersUnavailable
                  : labels.placeholders.assignee
            }
            onChange={(value) => onUpdate("assigneeIds", value)}
            selectedIds={form.assigneeIds}
            users={users}
          />
        </label>

        {selectedItem ? (
          <section className="sprint-items-assign-summary">
            <div>
              <span>{labels.current}</span>
              <strong>{formatAssignedUsers(getAssignedUsers(selectedItem), labels.unassigned)}</strong>
            </div>
            <div>
              <span>{labels.next}</span>
              <strong>{formatAssignedUsers(selectedAssignees, labels.unassigned)}</strong>
            </div>
          </section>
        ) : null}

        {error ? <p className="sprint-items-update-error">{error}</p> : null}

        <footer>
          <button disabled={isSubmitting} onClick={onClose} type="button">
            {labels.cancel}
          </button>
          <button disabled={isSubmitting} type="submit">
            <ClipboardCheck size={17} strokeWidth={2.25} aria-hidden="true" />
            {isSubmitting ? labels.assigning : labels.assign}
          </button>
        </footer>
      </form>
    </div>
  );
}

function CreateSprintItemField({
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
    <label className={["sprint-items-create-field", className].filter(Boolean).join(" ")}>
      <span>
        {label}
        {required ? <b aria-hidden="true">*</b> : null}
      </span>
      <div className="sprint-items-create-input">
        <Icon size={17} strokeWidth={2.15} aria-hidden="true" />
        {children}
      </div>
    </label>
  );
}

function CreateSprintItemOption({
  checked,
  label,
  onChange
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="sprint-items-create-option">
      <input
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <span>{label}</span>
    </label>
  );
}

function MultiAssigneePicker({
  disabled,
  emptyText,
  onChange,
  selectedIds,
  users
}: {
  disabled: boolean;
  emptyText: string;
  onChange: (selectedIds: string[]) => void;
  selectedIds: string[];
  users: UserRecord[];
}) {
  function toggleUser(userId: string, checked: boolean) {
    if (checked) {
      onChange([...selectedIds, userId].filter(uniqueString));
      return;
    }

    onChange(selectedIds.filter((selectedId) => selectedId !== userId));
  }

  if (users.length === 0) {
    return (
      <div className="sprint-items-assignee-picker is-empty">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="sprint-items-assignee-picker" aria-label={emptyText}>
      {users.map((user) => (
        <label key={user.id}>
          <input
            checked={selectedIds.includes(user.id)}
            disabled={disabled}
            onChange={(event) => toggleUser(user.id, event.target.checked)}
            type="checkbox"
          />
          <span>{resolveInitials(user)}</span>
          <b>{user.fullName}</b>
        </label>
      ))}
    </div>
  );
}

function SprintItemRow({
  canAssign,
  canCancel,
  canUpdate,
  canView,
  item,
  language,
  onToggleMenu,
  onUpdate,
  onView
}: {
  canAssign: boolean;
  canCancel: boolean;
  canUpdate: boolean;
  canView: boolean;
  item: TaskReportRow;
  language: AppLanguage;
  onToggleMenu: (itemId: string, event: MouseEvent<HTMLButtonElement>) => void;
  onUpdate: (item: TaskReportRow) => void;
  onView: (item: TaskReportRow) => void;
}) {
  const { t } = useI18n();
  const area = getSprintAreaByCategory(item.category);
  const areaKey = area?.key ?? "development";
  const assignees = getAssignedUsers(item);
  const leadAssignee = assignees[0] ?? item.createdBy;
  const sprintItemCode = formatSprintItemCode(item);

  return (
    <tr>
      <td>
        <input aria-label={item.title} type="checkbox" />
      </td>
      <td>
        <strong>{sprintItemCode}</strong>
      </td>
      <td>
        <div className="sprint-items-title-cell">
          <strong title={item.title}>{item.title}</strong>
          <span title={item.request?.title ?? formatCategory(item.category, language)}>
            {item.request?.title ?? formatCategory(item.category, language)}
          </span>
        </div>
      </td>
      <td>
        <span className={`sprint-items-sprint-badge sprint-items-sprint-${areaKey}`}>
          {area ? t(area.labelKey) : formatCategory(item.category, language)}
        </span>
      </td>
      <td>
        <div className="sprint-items-assignee-cell">
          <span>{resolveInitials(leadAssignee)}</span>
          <div>
            <strong title={formatAssignedUsers(assignees, "-")}>
              {formatAssignedUsers(assignees, "-")}
            </strong>
            <small>
              {assignees.length > 1
                ? `${assignees.length} assigned`
                : leadAssignee?.jobTitle ?? leadAssignee?.department ?? leadAssignee?.email ?? "-"}
            </small>
          </div>
        </div>
      </td>
      <td>
        <span className={`sprint-items-priority-badge sprint-items-priority-${item.priority}`}>
          {formatPriority(item.priority, language)}
        </span>
      </td>
      <td>
        <span className={`sprint-items-status-badge sprint-items-status-${resolveStateKey(item)}`}>
          <i />
          {formatState(item, language)}
        </span>
      </td>
      <td>{formatDateTime(item.dueDate, language)}</td>
      <td>{formatDateTime(item.lastProgressUpdateAt ?? item.createdAt, language)}</td>
      <td>
        <div className="sprint-items-actions-cell">
          {canUpdate ? (
            <button
              aria-label={language === "ar" ? "تحديث عنصر السبرنت" : "Update sprint item"}
              onClick={() => onUpdate(item)}
              type="button"
            >
              <SlidersHorizontal size={16} strokeWidth={2.1} />
            </button>
          ) : null}
          {canView ? (
            <button
              aria-label={copy[language].actions.view}
              onClick={() => onView(item)}
              type="button"
            >
              <Eye size={16} strokeWidth={2.1} />
            </button>
          ) : null}
          {canView || canUpdate || canAssign || canCancel ? (
            <button
              aria-label={copy[language].actions.more}
              aria-haspopup="menu"
              data-sprint-items-menu-trigger="true"
              onClick={(event) => onToggleMenu(item.id, event)}
              type="button"
            >
              <MoreVertical size={16} strokeWidth={2.1} />
            </button>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

function SprintItemFloatingActionMenu({
  canAssign,
  canCancel,
  canUpdate,
  canView,
  item,
  labels,
  left,
  onAssign,
  onCancel,
  onEdit,
  onView,
  top
}: {
  canAssign: boolean;
  canCancel: boolean;
  canUpdate: boolean;
  canView: boolean;
  item: TaskReportRow;
  labels: ReturnType<typeof getSprintItemRowActionCopy>;
  left: number;
  onAssign: (item: TaskReportRow) => void;
  onCancel: (item: TaskReportRow) => void;
  onEdit: (item: TaskReportRow) => void;
  onView: (item: TaskReportRow) => void;
  top: number;
}) {
  return (
    <div
      className="sprint-items-action-dropdown"
      data-sprint-items-floating-menu="true"
      role="menu"
      style={{ left, top }}
    >
      {canView ? (
        <button onClick={() => onView(item)} role="menuitem" type="button">
          <Eye size={14} strokeWidth={2.2} />
          {labels.view}
        </button>
      ) : null}
      {canUpdate ? (
        <button onClick={() => onEdit(item)} role="menuitem" type="button">
          <Pencil size={14} strokeWidth={2.2} />
          {labels.edit}
        </button>
      ) : null}
      {canAssign ? (
        <button onClick={() => onAssign(item)} role="menuitem" type="button">
          <ClipboardCheck size={14} strokeWidth={2.2} />
          {labels.assign}
        </button>
      ) : null}
      {canCancel ? (
        <button
          className="is-danger"
          disabled={item.status === "cancelled" || item.status === "completed"}
          onClick={() => onCancel(item)}
          role="menuitem"
          type="button"
        >
          <Trash2 size={14} strokeWidth={2.2} />
          {labels.cancel}
        </button>
      ) : null}
    </div>
  );
}

function SprintItemUpdateModal({
  assignableUsers,
  canFullyEdit,
  error,
  form,
  isLoading,
  isSubmitting,
  item,
  language,
  mode,
  onClose,
  onSubmit,
  onUpdate,
  t
}: {
  assignableUsers: AssignableUsersState;
  canFullyEdit: boolean;
  error: string | null;
  form: SprintItemEditFormState;
  isLoading: boolean;
  isSubmitting: boolean;
  item: TaskReportRow;
  language: AppLanguage;
  mode: SprintItemModalMode;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onUpdate: <TKey extends keyof SprintItemEditFormState>(
    key: TKey,
    value: SprintItemEditFormState[TKey]
  ) => void;
  t: (key: string) => string;
}) {
  const labels = getSprintItemEditCopy(language);
  const users = assignableUsers.status === "ready" ? assignableUsers.users : [];
  const categoryOptions = getCategoryOptionsForArea(form.sprintArea);
  const limitedStatusOptions: TaskStatus[] = ["in_progress", "completed"];
  const isViewMode = mode === "view";
  const showFullFields = isViewMode || canFullyEdit;
  const statusOptions = showFullFields ? editStatusOptions : limitedStatusOptions;

  return (
    <div className="sprint-items-modal-backdrop" role="presentation">
      <form
        aria-labelledby="sprint-item-update-title"
        className={`sprint-items-update-modal${showFullFields ? " is-full-edit" : ""}`}
        onSubmit={onSubmit}
      >
        <header>
          <div>
            <h2 id="sprint-item-update-title">{labels.title}</h2>
            <p>
              {isViewMode
                ? language === "ar"
                  ? "عرض تفاصيل عنصر السبرنت والمسؤول والحالة والتقدم دون تعديل."
                  : "Review sprint item details, assignee, status, and progress without editing."
                : canFullyEdit
                  ? labels.fullSubtitle
                  : labels.subtitle}
            </p>
          </div>
          <button
            aria-label={labels.cancel}
            disabled={isSubmitting}
            onClick={onClose}
            type="button"
          >
            <X size={20} strokeWidth={2.2} />
          </button>
        </header>

        <section className="sprint-items-update-summary">
          <strong>{formatSprintItemCode(item)}</strong>
          <span>{item.title}</span>
        </section>

        {isLoading ? (
          <p className="sprint-items-update-loading">{labels.loading}</p>
        ) : null}

        {showFullFields ? (
          <div className="sprint-items-update-grid">
            <label className="sprint-items-update-field">
              <span>{labels.fields.title}</span>
              <input
                disabled={isViewMode || isSubmitting}
                maxLength={120}
                onChange={(event) => onUpdate("title", event.target.value)}
                required
                value={form.title}
              />
            </label>

            <label className="sprint-items-update-field">
              <span>{labels.fields.sprintArea}</span>
              <select
                disabled={isViewMode || isSubmitting}
                onChange={(event) => {
                  const sprintArea = event.target.value as SprintAreaKey | "";
                  onUpdate("sprintArea", sprintArea);
                  onUpdate("category", getDefaultCategoryForArea(sprintArea));
                }}
                required
                value={form.sprintArea}
              >
                <option value="">{labels.placeholders.sprintArea}</option>
                {sprintAreaDefinitions.map((area) => (
                  <option key={area.key} value={area.key}>
                    {t(area.labelKey)}
                  </option>
                ))}
              </select>
            </label>

            <label className="sprint-items-update-field is-wide">
              <span>{labels.fields.description}</span>
              <textarea
                disabled={isViewMode || isSubmitting}
                maxLength={500}
                onChange={(event) => onUpdate("description", event.target.value)}
                placeholder={labels.placeholders.description}
                value={form.description}
              />
            </label>

            <label className="sprint-items-update-field">
              <span>{labels.fields.assignee}</span>
              <MultiAssigneePicker
                disabled={isViewMode || isSubmitting || assignableUsers.status !== "ready"}
                emptyText={
                  assignableUsers.status === "loading"
                    ? labels.placeholders.loadingUsers
                    : assignableUsers.status === "error"
                      ? labels.placeholders.usersUnavailable
                      : labels.placeholders.unassigned
                }
                onChange={(value) => onUpdate("assigneeIds", value)}
                selectedIds={form.assigneeIds}
                users={users}
              />
            </label>

            <label className="sprint-items-update-field">
              <span>{labels.fields.priority}</span>
              <select
                disabled={isViewMode || isSubmitting}
                onChange={(event) =>
                  onUpdate("priority", event.target.value as TaskPriority | "")
                }
                required
                value={form.priority}
              >
                <option value="">{labels.placeholders.priority}</option>
                {priorityOptions.map((priority) => (
                  <option key={priority} value={priority}>
                    {formatPriority(priority, language)}
                  </option>
                ))}
              </select>
            </label>

            <label className="sprint-items-update-field">
              <span>{labels.fields.category}</span>
              <select
                disabled={isViewMode || isSubmitting}
                onChange={(event) =>
                  onUpdate("category", event.target.value as TaskCategory | "")
                }
                required
                value={form.category}
              >
                <option value="">{labels.placeholders.category}</option>
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {formatCategory(category, language)}
                  </option>
                ))}
              </select>
            </label>

            <label className="sprint-items-update-field">
              <span>{labels.fields.startDate}</span>
              <input
                disabled={isViewMode || isSubmitting}
                max={form.dueDate || undefined}
                onChange={(event) => onUpdate("startDate", event.target.value)}
                type="date"
                value={form.startDate}
              />
            </label>

            <label className="sprint-items-update-field">
              <span>{labels.fields.dueDate}</span>
              <input
                disabled={isViewMode || isSubmitting}
                min={form.startDate || undefined}
                onChange={(event) => onUpdate("dueDate", event.target.value)}
                type="date"
                value={form.dueDate}
              />
            </label>
          </div>
        ) : null}

        <label className="sprint-items-update-field">
          <span>{labels.progress}</span>
          <input
            disabled={isViewMode || isSubmitting}
            max={100}
            min={0}
            onChange={(event) => onUpdate("progress", event.target.value)}
            required
            type="number"
            value={form.progress}
          />
        </label>

        <label className="sprint-items-update-field">
          <span>{pageStatusLabel(language)}</span>
          <select
            disabled={isViewMode || isSubmitting}
            onChange={(event) =>
              onUpdate("status", event.target.value as TaskStatus)
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
          <label className="sprint-items-update-field">
            <span>{labels.fields.blockedReason}</span>
            <input
              disabled={isViewMode || isSubmitting}
              onChange={(event) => onUpdate("blockedReason", event.target.value)}
              placeholder={labels.placeholders.blockedReason}
              value={form.blockedReason}
            />
          </label>
        ) : null}

        <label className="sprint-items-update-field">
          <span>{labels.note}</span>
          <textarea
            disabled={isViewMode || isSubmitting}
            onChange={(event) => onUpdate("note", event.target.value)}
            placeholder={labels.notePlaceholder}
            value={form.note}
          />
        </label>

        {error ? <p className="sprint-items-update-error">{error}</p> : null}

        <footer>
          <button disabled={isSubmitting} onClick={onClose} type="button">
            {isViewMode ? (language === "ar" ? "إغلاق" : "Close") : labels.cancel}
          </button>
          {!isViewMode ? (
            <button disabled={isSubmitting} type="submit">
              <Save size={17} strokeWidth={2.25} aria-hidden="true" />
              {labels.save}
            </button>
          ) : null}
        </footer>
      </form>
    </div>
  );
}

function SortableHeader({
  active,
  label,
  onSort,
  order
}: {
  active: boolean;
  label: string;
  onSort: () => void;
  order: SprintItemsSortState["order"];
}) {
  return (
    <th aria-sort={active ? (order === "asc" ? "ascending" : "descending") : "none"}>
      <button
        aria-label={`${label} ${active ? order : ""}`.trim()}
        className={active ? "is-active" : ""}
        onClick={onSort}
        type="button"
      >
        {label}
        <ChevronsUpDown
          className={active ? `is-${order}` : undefined}
          size={13}
          strokeWidth={2.2}
          aria-hidden="true"
        />
      </button>
    </th>
  );
}

function buildMetricCards(metrics: SprintItemsMetrics, pageCopy: SprintItemsCopy) {
  const total = metrics.total || 0;

  return [
    {
      icon: ClipboardCheck,
      label: pageCopy.metrics.total,
      note: pageCopy.notes.allItems,
      tone: "blue",
      value: String(total)
    },
    {
      icon: CheckCircle2,
      label: pageCopy.metrics.completed,
      note: formatMetricPercent(metrics.completed, total, pageCopy),
      tone: "green",
      value: String(metrics.completed)
    },
    {
      icon: LoaderCircle,
      label: pageCopy.metrics.inProgress,
      note: formatMetricPercent(metrics.inProgress, total, pageCopy),
      tone: "blue",
      value: String(metrics.inProgress)
    },
    {
      icon: Eye,
      label: pageCopy.metrics.review,
      note: formatMetricPercent(metrics.review, total, pageCopy),
      tone: "orange",
      value: String(metrics.review)
    },
    {
      icon: Ban,
      label: pageCopy.metrics.blocked,
      note: formatMetricPercent(metrics.blocked, total, pageCopy),
      tone: "red",
      value: String(metrics.blocked)
    }
  ] satisfies Array<{
    icon: LucideIcon;
    label: string;
    note: string;
    tone: "blue" | "green" | "orange" | "red";
    value: string;
  }>;
}

function getCreateSprintItemCopy(language: AppLanguage) {
  if (language === "ar") {
    return {
      cancel: "إلغاء",
      close: "إغلاق",
      create: "إنشاء عنصر السبرنت",
      creating: "جار الإنشاء...",
      fields: {
        assignee: "إسناد إلى",
        blockedReason: "سبب الحظر",
        category: "الجهد المتوقع / التصنيف",
        code: "معرف / رمز عنصر السبرنت",
        description: "الوصف",
        dueDate: "تاريخ الاستحقاق",
        priority: "الأولوية",
        progress: "التقدم الأولي",
        sprintArea: "مجال السبرنت",
        startDate: "تاريخ البداية",
        status: "الحالة",
        title: "عنوان عنصر السبرنت"
      },
      options: {
        callout: "سيظهر عنصر السبرنت تحت مجال السبرنت المختار ويمكن تتبعه خلال دورة العمل حتى الاكتمال.",
        highVisibility: "تمييز كعنصر عالي الظهور",
        notify: "إشعار المستخدم المسند إليه لاحقا",
        requireReview: "يتطلب مراجعة قبل الاكتمال"
      },
      placeholders: {
        assignee: "اختر المسؤول",
        blockedReason: "اكتب سبب الحظر",
        category: "اختر التصنيف أو الوحدة",
        code: "يتم إنشاؤه تلقائيا",
        description: "اكتب وصفا مختصرا لهذا العنصر...",
        loadingUsers: "جار تحميل المستخدمين...",
        priority: "اختر الأولوية",
        selectStatusFirst: "اختر حالة محجوب أولا",
        sprintArea: "اختر مجال السبرنت",
        status: "اختر الحالة",
        title: "أدخل عنوان عنصر السبرنت",
        usersUnavailable: "تعذر تحميل المستخدمين"
      },
      sections: {
        assignment: "الإسناد والجدولة",
        itemInfo: "معلومات عنصر السبرنت",
        options: "خيارات إضافية",
        status: "الحالة والتقدم"
      },
      subtitle: "إضافة عنصر عمل جديد لتتبع تقدم سبرنت ERP",
      title: "إنشاء عنصر سبرنت جديد",
      validation: {
        assignee: "اختر المستخدم المسند إليه.",
        blockedReason: "اكتب سبب الحظر عند اختيار حالة محجوب.",
        dueDate: "اختر تاريخ الاستحقاق.",
        fullProgress: "يجب أن يكون التقدم 100% للحالة مكتمل أو مراجعة.",
        openProgress: "الحالة قيد الانتظار يجب أن تبدأ بتقدم 0%.",
        priority: "اختر الأولوية.",
        progress: "أدخل نسبة تقدم صحيحة بين 0 و 100.",
        requireReview: "لا يمكن إنشاء عنصر مكتمل إذا كان يتطلب مراجعة قبل الاكتمال. اختر مراجعة.",
        sprintArea: "اختر مجال السبرنت.",
        startAfterDue: "تاريخ البداية يجب أن يكون قبل تاريخ الاستحقاق.",
        status: "اختر الحالة.",
        title: "أدخل عنوان عنصر السبرنت."
      }
    };
  }

  return {
    cancel: "Cancel",
    close: "Close",
    create: "Create Sprint Item",
    creating: "Creating...",
    fields: {
      assignee: "Assignees",
      blockedReason: "Blocked Reason",
      category: "Estimated Effort / Category",
      code: "Sprint Item ID / Code",
      description: "Description",
      dueDate: "Due Date",
      priority: "Priority",
      progress: "Initial Progress",
      sprintArea: "Sprint Area",
      startDate: "Start Date",
      status: "Status",
      title: "Sprint Item Title"
    },
    options: {
      callout: "Sprint items will appear under the selected sprint area and can be tracked through their lifecycle until completion.",
      highVisibility: "Mark as high visibility",
      notify: "Notify assigned user later",
      requireReview: "Require review before completion"
    },
    placeholders: {
      assignee: "Select assignees",
      blockedReason: "Enter blocked reason",
      category: "Select category or module",
      code: "Auto-generated by system",
      description: "Enter a brief description of this sprint item...",
      loadingUsers: "Loading users...",
      priority: "Select priority",
      selectStatusFirst: "Select blocked status first",
      sprintArea: "Select sprint area",
      status: "Select status",
      title: "Enter sprint item title",
      usersUnavailable: "Users unavailable"
    },
    sections: {
      assignment: "Assignment & Schedule",
      itemInfo: "Sprint Item Information",
      options: "Additional Options",
      status: "Status & Progress"
    },
    subtitle: "Add a new work item to track ERP sprint progress",
    title: "Create New Sprint Item",
    validation: {
      assignee: "Select at least one assignee.",
      blockedReason: "Enter a blocked reason when status is Blocked.",
      dueDate: "Select the due date.",
      fullProgress: "Progress must be 100% for Review or Completed status.",
      openProgress: "To Do items must start at 0% progress.",
      priority: "Select the priority.",
      progress: "Enter a valid progress value between 0 and 100.",
      requireReview: "A completed item cannot require review before completion. Choose Review instead.",
      sprintArea: "Select the sprint area.",
      startAfterDue: "Start date must be before or equal to due date.",
      status: "Select the status.",
      title: "Enter the sprint item title."
    }
  };
}

function getAssignSprintItemCopy(language: AppLanguage) {
  if (language === "ar") {
    return {
      assign: "إسناد العنصر",
      assigning: "جار الإسناد...",
      cancel: "إلغاء",
      current: "المسند حالياً",
      error: "تعذر إسناد عنصر السبرنت.",
      fields: {
        assignee: "إسناد إلى",
        item: "عنصر السبرنت"
      },
      next: "الإسناد الجديد",
      noChange: "هذا العنصر مسند بالفعل إلى نفس المستخدم.",
      placeholders: {
        assignee: "اختر المستخدم",
        item: "اختر عنصر السبرنت",
        loadingItems: "جار تحميل عناصر السبرنت...",
        loadingUsers: "جار تحميل المستخدمين...",
        noItems: "لا توجد عناصر سبرنت نشطة",
        usersUnavailable: "تعذر تحميل المستخدمين"
      },
      subtitle: "اختر عنصر سبرنت ومستخدم الفريق المسؤول عنه.",
      title: "إسناد عنصر سبرنت",
      unassigned: "غير مسند",
      validation: "اختر عنصر السبرنت والمستخدم المسؤول قبل الحفظ."
    };
  }

  return {
    assign: "Assign Item",
    assigning: "Assigning...",
    cancel: "Cancel",
    current: "Current assignees",
    error: "Sprint item could not be assigned.",
    fields: {
      assignee: "Assignees",
      item: "Sprint Item"
    },
    next: "New assignees",
    noChange: "This sprint item is already assigned to the selected users.",
    placeholders: {
      assignee: "Select team members",
      item: "Select sprint item",
      loadingItems: "Loading sprint items...",
      loadingUsers: "Loading users...",
      noItems: "No active sprint items",
      usersUnavailable: "Users could not be loaded"
    },
    subtitle: "Choose a sprint item and the team members responsible for it.",
    title: "Assign Sprint Item",
    unassigned: "Unassigned",
    validation: "Select a sprint item and at least one team member before saving."
  };
}

function getSprintItemRowActionCopy(language: AppLanguage) {
  return language === "ar"
    ? {
        assign: "إسناد",
        cancel: "إلغاء",
        edit: "تعديل",
        view: "عرض"
      }
    : {
        assign: "Assign",
        cancel: "Cancel",
        edit: "Edit",
        view: "View"
      };
}

function getSprintItemEditCopy(language: AppLanguage) {
  if (language === "ar") {
    return {
      cancel: "إلغاء",
      fields: {
        assignee: "المسؤول",
        blockedReason: "سبب الحظر",
        category: "التصنيف",
        description: "الوصف",
        dueDate: "تاريخ الاستحقاق",
        priority: "الأولوية",
        sprintArea: "مجال السبرنت",
        startDate: "تاريخ البداية",
        title: "عنوان عنصر السبرنت"
      },
      fullSubtitle: "يمكنك تعديل كل تفاصيل عنصر السبرنت، المسؤول، الحالة، والتواريخ.",
      loading: "جاري تحميل تفاصيل عنصر السبرنت...",
      note: "ملاحظة التحديث",
      notePlaceholder: "اكتب ملاحظة قصيرة (اختياري)",
      placeholders: {
        blockedReason: "اكتب سبب الحظر",
        category: "اختر التصنيف",
        description: "اكتب وصفاً مختصراً لهذا العنصر...",
        loadingUsers: "جاري تحميل المستخدمين...",
        priority: "اختر الأولوية",
        sprintArea: "اختر مجال السبرنت",
        unassigned: "غير مسند",
        usersUnavailable: "تعذر تحميل المستخدمين"
      },
      progress: "نسبة التقدم",
      save: "حفظ التغييرات",
      subtitle: "يمكنك تحديث التقدم أو وضع العنصر كمكتمل إذا كان مسنداً لك.",
      title: "تعديل عنصر السبرنت",
      validation: {
        blockedReason: "اكتب سبب الحظر عند اختيار حالة محجوب.",
        category: "اختر التصنيف.",
        fullProgress: "يجب أن يكون التقدم 100% قبل إكمال عنصر السبرنت.",
        priority: "اختر الأولوية.",
        progress: "أدخل نسبة تقدم صحيحة بين 0 و 100.",
        sprintArea: "اختر مجال السبرنت.",
        startAfterDue: "تاريخ البداية يجب أن يكون قبل أو يساوي تاريخ الاستحقاق.",
        title: "أدخل عنوان عنصر السبرنت."
      }
    };
  }

  return {
    cancel: "Cancel",
    fields: {
      assignee: "Assignee",
      blockedReason: "Blocked Reason",
      category: "Category",
      description: "Description",
      dueDate: "Due Date",
      priority: "Priority",
      sprintArea: "Sprint Area",
      startDate: "Start Date",
      title: "Sprint Item Title"
    },
    fullSubtitle: "Edit all sprint item details, assignee, status, progress, and dates.",
    loading: "Loading sprint item details...",
    note: "Update note",
    notePlaceholder: "Add a short note (optional)",
    placeholders: {
      blockedReason: "Enter blocked reason",
      category: "Select category",
      description: "Enter a brief description for this item...",
      loadingUsers: "Loading users...",
      priority: "Select priority",
      sprintArea: "Select sprint area",
      unassigned: "Unassigned",
      usersUnavailable: "Users unavailable"
    },
    progress: "Progress percentage",
    save: "Save Changes",
    subtitle: "Update progress or mark this assigned item as completed.",
    title: "Edit Sprint Item",
    validation: {
      blockedReason: "Enter a blocked reason when status is Blocked.",
      category: "Select the category.",
      fullProgress: "Progress must be 100% before completing the sprint item.",
      priority: "Select the priority.",
      progress: "Enter a valid progress value between 0 and 100.",
      sprintArea: "Select the sprint area.",
      startAfterDue: "Start date must be before or equal to due date.",
      title: "Enter the sprint item title."
    }
  };
}

function canUpdateSprintItem(item: TaskReportRow, session: Session): boolean {
  if (canFullyEditSprintItem(item, session)) {
    return true;
  }

  if (!getAssignedUserIds(item).includes(session.userId)) {
    return false;
  }

  if (item.status === "completed" || item.status === "cancelled") {
    return false;
  }

  return (
    session.permissionCodes.includes("tasks:update") ||
    session.permissionCodes.includes("task_updates:create")
  );
}

function canViewSprintItem(item: TaskReportRow, session: Session): boolean {
  if (session.roleCode !== "employee") {
    return true;
  }

  return getAssignedUserIds(item).includes(session.userId);
}

function isAssignableSprintItem(item: TaskReportRow): boolean {
  return item.status !== "completed" && item.status !== "cancelled";
}

function isCancellableSprintItem(item: TaskReportRow): boolean {
  return item.status !== "completed" && item.status !== "cancelled";
}

function canFullyEditSprintItem(item: TaskReportRow, session: Session): boolean {
  if (
    session.roleCode === "super_admin" ||
    session.roleCode === "it_manager" ||
    session.roleCode === "supervisor"
  ) {
    return (
      session.permissionCodes.includes("tasks:update") ||
      session.permissionCodes.includes("tasks:assign")
    );
  }

  return (
    item.createdBy?.id === session.userId &&
    session.permissionCodes.includes("tasks:update")
  );
}

function toSprintItemEditForm(
  item: TaskReportRow,
  details?: TaskRecord
): SprintItemEditFormState {
  const category = details?.category ?? item.category;
  const area = getSprintAreaByCategory(category);

  return {
    assigneeIds: details?.assigneeIds ?? getAssignedUserIds(item),
    blockedReason: "",
    category,
    description: details?.description ?? "",
    dueDate: toDateInputValue(details?.dueDate ?? item.dueDate),
    note: "",
    priority: details?.priority ?? (item.priority as TaskPriority),
    progress: String(details?.progress ?? item.progress),
    sprintArea: area?.key ?? "",
    startDate: toDateInputValue(details?.startDate ?? item.startDate),
    status: details?.status ?? item.status,
    title: details?.title ?? item.title
  };
}

function validateSprintItemEditForm(
  form: SprintItemEditFormState,
  canFullyEdit: boolean,
  language: AppLanguage
): string | null {
  const labels = getSprintItemEditCopy(language);
  const progress = Number(form.progress);

  if (canFullyEdit) {
    if (!form.title.trim()) {
      return labels.validation.title;
    }

    if (!form.sprintArea) {
      return labels.validation.sprintArea;
    }

    if (!form.category) {
      return labels.validation.category;
    }

    if (!form.priority) {
      return labels.validation.priority;
    }
  }

  if (!Number.isFinite(progress) || progress < 0 || progress > 100) {
    return labels.validation.progress;
  }

  if ((form.status === "completed" || form.status === "waiting_review") && progress !== 100) {
    return labels.validation.fullProgress;
  }

  if (form.status === "blocked" && !form.blockedReason.trim()) {
    return labels.validation.blockedReason;
  }

  if (form.startDate && form.dueDate && form.startDate > form.dueDate) {
    return labels.validation.startAfterDue;
  }

  return null;
}

function pageStatusLabel(language: AppLanguage): string {
  return language === "ar" ? "الحالة" : "Status";
}

function validateCreateSprintItemForm(
  form: CreateSprintItemFormState,
  language: AppLanguage
): string | null {
  const text = getCreateSprintItemCopy(language).validation;
  const progress = Number(form.progress);

  if (!form.title.trim()) {
    return text.title;
  }

  if (!form.sprintArea) {
    return text.sprintArea;
  }

  if (!form.priority) {
    return text.priority;
  }

  if (!form.dueDate) {
    return text.dueDate;
  }

  if (!form.status) {
    return text.status;
  }

  if (!Number.isFinite(progress) || progress < 0 || progress > 100) {
    return text.progress;
  }

  if (form.status === "open" && progress > 0) {
    return text.openProgress;
  }

  if ((form.status === "completed" || form.status === "waiting_review") && progress !== 100) {
    return text.fullProgress;
  }

  if (form.status === "blocked" && !form.blockedReason.trim()) {
    return text.blockedReason;
  }

  if (form.requireReview && form.status === "completed") {
    return text.requireReview;
  }

  if (form.startDate && form.dueDate && form.startDate > form.dueDate) {
    return text.startAfterDue;
  }

  return null;
}

function clampProgress(value: string): number {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(numericValue)));
}

function getDefaultCategoryForArea(areaKey: SprintAreaKey | ""): TaskCategory {
  const area = getSprintAreaDefinition(areaKey);
  const firstCategory = area?.categories.at(0);

  return (firstCategory ?? "software") as TaskCategory;
}

function getCategoryOptionsForArea(areaKey: SprintAreaKey | ""): TaskCategory[] {
  const area = getSprintAreaDefinition(areaKey);

  if (!area) {
    return [];
  }

  return [...area.categories] as TaskCategory[];
}

function toDateTimeIso(dateValue: string, timeValue: string): string {
  return new Date(`${dateValue}T${timeValue}:00`).toISOString();
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

function buildCreateSprintItemNote(form: CreateSprintItemFormState): string | undefined {
  const notes: string[] = [];

  if (form.notifyLater) {
    notes.push("Notify assigned user later.");
  }

  if (form.highVisibility) {
    notes.push("Marked as high visibility.");
  }

  if (form.requireReview) {
    notes.push("Review is required before completion.");
  }

  return notes.length > 0 ? notes.join(" ") : undefined;
}

function getTotalCount(result: { data: TaskReportRow[]; pagination: PaginationMeta }): number {
  return result.pagination.totalItems ?? result.data.length;
}

function readSprintItemsFiltersFromSearchParams(
  searchParams: URLSearchParams
): SprintItemsFilters {
  return {
    assignee: searchParams.get("assignee") || initialFilters.assignee,
    focus: readSprintItemFilterValue(
      searchParams,
      "focus",
      sprintItemFilterValues.focus,
      initialFilters.focus
    ),
    priority: readSprintItemFilterValue(
      searchParams,
      "priority",
      sprintItemFilterValues.priority,
      initialFilters.priority
    ),
    search: searchParams.get("search") || initialFilters.search,
    sprint: readSprintItemFilterValue(
      searchParams,
      "sprint",
      sprintItemFilterValues.sprint,
      initialFilters.sprint
    ),
    status: readSprintItemFilterValue(
      searchParams,
      "status",
      sprintItemFilterValues.status,
      initialFilters.status
    )
  };
}

function readSprintItemsSortFromSearchParams(
  searchParams: URLSearchParams
): SprintItemsSortState {
  return {
    field: readSprintItemFilterValue<SprintItemsSortField>(
      searchParams,
      "sort",
      sprintItemsSortFieldValues,
      "updated"
    ),
    order: readSprintItemFilterValue<SprintItemsSortState["order"]>(
      searchParams,
      "order",
      sprintItemsSortOrderValues,
      "desc"
    )
  };
}

function readSprintItemFilterValue<TValue extends string>(
  searchParams: URLSearchParams,
  key: string,
  allowedValues: Set<string>,
  fallback: TValue
): TValue {
  const value = searchParams.get(key);

  return value && allowedValues.has(value) ? (value as TValue) : fallback;
}

function areSprintItemsFiltersEqual(
  left: SprintItemsFilters,
  right: SprintItemsFilters
): boolean {
  return (
    left.assignee === right.assignee &&
    left.focus === right.focus &&
    left.priority === right.priority &&
    left.search === right.search &&
    left.sprint === right.sprint &&
    left.status === right.status
  );
}

function areSprintItemsSortEqual(
  left: SprintItemsSortState,
  right: SprintItemsSortState
): boolean {
  return left.field === right.field && left.order === right.order;
}

function applyFilters(items: TaskReportRow[], filters: SprintItemsFilters): TaskReportRow[] {
  const search = filters.search.trim().toLowerCase();

  return items.filter((item) => {
    const area = getSprintAreaByCategory(item.category);
    const assignees = getAssignedUsers(item);
    const owner = assignees[0] ?? item.createdBy;

    if (filters.focus === "urgent" && !isUrgentSprintItem(item)) {
      return false;
    }

    if (filters.focus === "milestones" && !item.dueDate) {
      return false;
    }

    if (filters.status !== "all" && item.status !== filters.status) {
      return false;
    }

    if (filters.priority !== "all" && item.priority !== filters.priority) {
      return false;
    }

    if (
      filters.assignee !== "all" &&
      !assignees.some((assignee) => assignee.id === filters.assignee)
    ) {
      return false;
    }

    if (filters.sprint !== "all" && area?.key !== filters.sprint) {
      return false;
    }

    if (!search) {
      return true;
    }

    return [
      formatSprintItemCode(item),
      item.taskCode,
      item.title,
      item.request?.title,
      item.priority,
      item.status,
      ...assignees.map((assignee) => assignee.fullName),
      ...assignees.map((assignee) => assignee.jobTitle),
      ...assignees.map((assignee) => assignee.department),
      owner?.fullName,
      owner?.jobTitle,
      owner?.department,
      area?.key
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(search));
  });
}

function sortSprintItems(items: TaskReportRow[], sort: SprintItemsSortState): TaskReportRow[] {
  const direction = sort.order === "asc" ? 1 : -1;

  return [...items].sort((left, right) => {
    const result = compareSprintItemByField(left, right, sort.field, direction);

    if (result !== 0) {
      return result;
    }

    return compareStrings(left.title, right.title, 1);
  });
}

function compareSprintItemByField(
  left: TaskReportRow,
  right: TaskReportRow,
  field: SprintItemsSortField,
  direction: number
): number {
  switch (field) {
    case "assignee":
      return compareStrings(
        formatAssignedUsers(getAssignedUsers(left), ""),
        formatAssignedUsers(getAssignedUsers(right), ""),
        direction
      );
    case "dueDate":
      return compareOptionalTimes(left.dueDate, right.dueDate, direction);
    case "id":
      return compareStrings(formatSprintItemCode(left), formatSprintItemCode(right), direction);
    case "priority":
      return compareNumbers(getPriorityRank(left.priority), getPriorityRank(right.priority), direction);
    case "sprint":
      return compareStrings(getSprintSortValue(left), getSprintSortValue(right), direction);
    case "status":
      return compareNumbers(getStatusRank(left.status), getStatusRank(right.status), direction);
    case "title":
      return compareStrings(left.title, right.title, direction);
    case "updated":
      return compareOptionalTimes(
        left.lastProgressUpdateAt ?? left.createdAt,
        right.lastProgressUpdateAt ?? right.createdAt,
        direction
      );
    default:
      return 0;
  }
}

function compareStrings(left: string | undefined, right: string | undefined, direction: number): number {
  return String(left ?? "").localeCompare(String(right ?? ""), undefined, {
    numeric: true,
    sensitivity: "base"
  }) * direction;
}

function compareNumbers(left: number, right: number, direction: number): number {
  return (left - right) * direction;
}

function compareOptionalTimes(
  left: string | undefined,
  right: string | undefined,
  direction: number
): number {
  const leftTime = toSortTime(left);
  const rightTime = toSortTime(right);

  if (leftTime === undefined && rightTime === undefined) {
    return 0;
  }

  if (leftTime === undefined) {
    return 1;
  }

  if (rightTime === undefined) {
    return -1;
  }

  return (leftTime - rightTime) * direction;
}

function toSortTime(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const time = new Date(value).getTime();

  return Number.isNaN(time) ? undefined : time;
}

function getDefaultSortOrder(field: SprintItemsSortField): SprintItemsSortState["order"] {
  return field === "dueDate" || field === "updated" ? "desc" : "asc";
}

function getPriorityRank(priority: string): number {
  const ranks: Record<string, number> = {
    low: 1,
    medium: 2,
    high: 3,
    urgent: 4
  };

  return ranks[priority] ?? 0;
}

function getStatusRank(status: TaskStatus): number {
  const ranks: Record<TaskStatus, number> = {
    open: 1,
    in_progress: 2,
    waiting_review: 3,
    blocked: 4,
    completed: 5,
    cancelled: 6
  };

  return ranks[status];
}

function getSprintSortValue(item: TaskReportRow): string {
  return getSprintAreaByCategory(item.category)?.key ?? item.category;
}

function isUrgentSprintItem(item: TaskReportRow): boolean {
  return (
    item.priority === "urgent" ||
    item.priority === "high" ||
    item.status === "blocked" ||
    isDelayedSprintItem(item)
  );
}

function isDelayedSprintItem(item: TaskReportRow): boolean {
  if (!item.dueDate || item.status === "completed" || item.status === "cancelled") {
    return false;
  }

  const dueTime = new Date(item.dueDate).getTime();

  return !Number.isNaN(dueTime) && dueTime < Date.now();
}

function getAssignedUsers(item: TaskReportRow): DashboardUserReference[] {
  if (item.assignees.length > 0) {
    return item.assignees;
  }

  return item.assignedTo ? [item.assignedTo] : [];
}

function getAssignedUserIds(item: TaskReportRow): string[] {
  return getAssignedUsers(item)
    .map((assignee) => assignee.id)
    .filter(uniqueString);
}

function formatAssignedUsers(
  users: Array<DashboardUserReference | UserRecord>,
  fallback: string
): string {
  if (users.length === 0) {
    return fallback;
  }

  if (users.length <= 2) {
    return users.map((user) => user.fullName).join(", ");
  }

  return `${users[0]?.fullName}, ${users[1]?.fullName} +${users.length - 2}`;
}

function areStringArraysEqual(left: string[], right: string[]): boolean {
  const normalizedLeft = [...new Set(left)].sort();
  const normalizedRight = [...new Set(right)].sort();

  if (normalizedLeft.length !== normalizedRight.length) {
    return false;
  }

  return normalizedLeft.every((value, index) => value === normalizedRight[index]);
}

function uniqueString(value: string, index: number, array: string[]): boolean {
  return array.indexOf(value) === index;
}

function formatSprintItemCode(item: TaskReportRow): string {
  const area = getSprintAreaByCategory(item.category);
  const prefix =
    area?.key === "facility"
      ? "FAC"
      : area?.key === "infrastructure"
        ? "INF"
        : "DEV";
  const numericPart = item.taskCode.match(/\d+/g)?.at(-1);

  if (numericPart) {
    return `${prefix}-${numericPart.padStart(4, "0")}`;
  }

  return `${prefix}-${item.id.slice(-4).toUpperCase()}`;
}

function getAssigneeOptions(items: TaskReportRow[]): Array<{ id: string; name: string }> {
  const assignees = new Map<string, string>();

  for (const item of items) {
    for (const assignee of getAssignedUsers(item)) {
      assignees.set(assignee.id, assignee.fullName);
    }
  }

  return [...assignees.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

function resolveStateKey(item: TaskReportRow): string {
  if (item.status === "completed") {
    return "completed";
  }

  if (item.status === "cancelled") {
    return "cancelled";
  }

  if (item.status === "blocked") {
    return "blocked";
  }

  if (item.status === "waiting_review") {
    return "review";
  }

  if (item.status === "open") {
    return "todo";
  }

  return "in_progress";
}

function formatState(item: TaskReportRow, language: AppLanguage): string {
  const labels = {
    ar: {
      blocked: "محجوب",
      cancelled: "ملغي",
      completed: "مكتمل",
      in_progress: "قيد التنفيذ",
      review: "مراجعة",
      todo: "قيد الانتظار"
    },
    en: {
      blocked: "Blocked",
      cancelled: "Cancelled",
      completed: "Completed",
      in_progress: "In Progress",
      review: "Review",
      todo: "To Do"
    }
  } as const;
  const stateKey = resolveStateKey(item);

  return labels[language][stateKey as keyof (typeof labels)["en"]] ?? stateKey;
}

function formatStatus(status: string, language: AppLanguage): string {
  const labels = {
    ar: {
      blocked: "محجوب",
      cancelled: "ملغي",
      completed: "مكتمل",
      in_progress: "قيد التنفيذ",
      open: "قيد الانتظار",
      waiting_review: "مراجعة"
    },
    en: {
      blocked: "Blocked",
      cancelled: "Cancelled",
      completed: "Completed",
      in_progress: "In Progress",
      open: "To Do",
      waiting_review: "Review"
    }
  } as const;

  return labels[language][status as keyof (typeof labels)["en"]] ?? status;
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

function formatCategory(category: string, language: AppLanguage): string {
  if (language === "ar") {
    const labels: Record<string, string> = {
      access: "الصلاحيات",
      hardware: "الأجهزة",
      maintenance: "الصيانة",
      network: "الشبكات",
      server: "الخوادم",
      software: "البرمجيات",
      support: "الدعم"
    };

    return labels[category] ?? category;
  }

  return category.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatMetricPercent(value: number, total: number, pageCopy: SprintItemsCopy): string {
  const percent = total > 0 ? ((value / total) * 100).toFixed(1) : "0.0";

  return `${percent}% ${pageCopy.notes.ofTotal}`;
}

function formatPaginationText(
  pageCopy: SprintItemsCopy,
  from: number,
  to: number,
  total: number
): string {
  return pageCopy.pagination
    .replace("{from}", String(from))
    .replace("{to}", String(to))
    .replace("{total}", String(total));
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

function resolveInitials(
  user: DashboardUserReference | UserRecord | undefined
): string {
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

export const SprintItemsContent = memo(SprintItemsContentView);
