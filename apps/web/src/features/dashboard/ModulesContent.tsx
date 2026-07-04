import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BadgeDollarSign,
  Building2,
  Calculator,
  ChartColumn,
  Check,
  ChevronDown,
  Database,
  FileText,
  Landmark,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  Users,
  X,
  type LucideIcon
} from "lucide-react";
import {
  memo,
  type CSSProperties,
  type FormEvent,
  useEffect,
  useMemo,
  useState
} from "react";
import { useNavigate } from "react-router-dom";

import {
  api,
  type Session,
  type TaskPriority,
  type TaskRecord,
  type TaskUpdateRecord,
  type TaskReportRow,
  type TaskStatus,
  type UpdateSprintItemPayload
} from "../../api/client";
import {
  getSprintAreaByCategory,
  sprintAreaDefinitions
} from "./sprintAreas";
import {
  addCustomTaskModule,
  addSubModulesToTaskModule,
  deleteTaskModuleFromCatalog,
  deleteTaskSubModuleFromCatalog,
  getTaskModuleCatalog,
  moveTaskModuleInCatalog,
  renameTaskSubModuleInCatalog,
  renameTaskModuleInCatalog,
  subscribeToTaskModuleCatalogChanges,
  type TaskModuleDefinition
} from "./taskModules";

type ModulesState =
  | { items: TaskReportRow[]; status: "ready" }
  | { message: string; status: "error" }
  | { status: "loading" };

type ModuleSummary = {
  blockedCount: number;
  completedCount: number;
  name: string;
  pendingCount: number;
  progress: number;
  subModules: SubModuleSummary[];
  taskCount: number;
  tasks: TaskReportRow[];
};

type SubModuleSummary = {
  name: string;
  progress: number;
  taskCount: number;
};

type SubModuleTaskGroup = SubModuleSummary & {
  tasks: TaskReportRow[];
  visual: ModuleVisual;
};

type ModuleSprintItemDetailState = {
  details?: TaskRecord;
  error?: string;
  item: TaskReportRow;
  status: "error" | "loading" | "ready";
  updates: TaskUpdateRecord[];
};

type ModuleSprintItemEditValues = {
  description: string;
  dueDate: string;
  mainModule: string;
  priority: TaskPriority;
  progress: string;
  status: TaskStatus;
  subModule: string;
  title: string;
};

type ModuleTone = "blue" | "cyan" | "green" | "orange" | "purple";

type ModuleVisual = {
  color: string;
  icon: LucideIcon;
  tone: ModuleTone;
};

const financeSubModuleOrder = [
  "Payrole"
];
const referenceModuleMetrics: Record<
  string,
  {
    blockedCount?: number;
    completedCount?: number;
    pendingCount?: number;
    progress: number;
  }
> = {};
const referenceSubModuleProgress: Record<string, Record<string, number>> = {};
const referenceConnectedTaskOrder = [
  "ERP-FIN-0001"
];
const moduleTaskPriorityOptions: TaskPriority[] = ["low", "medium", "high", "urgent"];
const moduleTaskStatusOptions: TaskStatus[] = [
  "open",
  "assigned",
  "in_progress",
  "blocked",
  "waiting_review",
  "completed",
  "cancelled"
];

function ModulesContentView({
  refreshSignal = 0,
  session
}: {
  refreshSignal?: number;
  session: Session;
}) {
  const navigate = useNavigate();
  const [state, setState] = useState<ModulesState>({ status: "loading" });
  const [catalogVersion, setCatalogVersion] = useState(0);
  const [selectedModuleName, setSelectedModuleName] = useState("");
  const [search, setSearch] = useState("");
  const [moduleName, setModuleName] = useState("");
  const [subModuleNames, setSubModuleNames] = useState("");
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [detailMode, setDetailMode] = useState<
    "add-submodule" | "edit" | "edit-submodule" | "none"
  >("none");
  const [detailMessage, setDetailMessage] = useState<string | null>(null);
  const [editModuleName, setEditModuleName] = useState("");
  const [editingSubModuleName, setEditingSubModuleName] = useState("");
  const [editSubModuleName, setEditSubModuleName] = useState("");
  const [newSubModuleNames, setNewSubModuleNames] = useState("");
  const [isSavingModule, setIsSavingModule] = useState(false);
  const [sprintItemDetail, setSprintItemDetail] = useState<ModuleSprintItemDetailState | null>(null);
  const [expandedSubModuleIds, setExpandedSubModuleIds] = useState<Set<string>>(() => new Set());

  useEffect(
    () => subscribeToTaskModuleCatalogChanges(() =>
      setCatalogVersion((current) => current + 1)
    ),
    []
  );

  useEffect(() => {
    let isMounted = true;

    setState((current) => (current.status === "ready" ? current : { status: "loading" }));

    api.getTaskReport({
      limit: 100
    })
      .then((result) => {
        if (isMounted) {
          setState({ items: result.data, status: "ready" });
        }
      })
      .catch((error: unknown) => {
        if (isMounted) {
          setState({
            message:
              error instanceof Error
                ? error.message
                : "Modules could not be loaded.",
            status: "error"
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [refreshSignal]);

  const catalog = useMemo(() => getTaskModuleCatalog(), [catalogVersion]);
  const items = state.status === "ready" ? state.items : [];
  const modules = useMemo(() => buildModuleSummaries(catalog, items), [catalog, items]);
  const filteredModules = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return modules;
    }

    return modules.filter((module) =>
      [
        module.name,
        ...module.subModules.map((subModule) => subModule.name),
        ...module.tasks.map((task) => task.title)
      ].some((value) => value.toLowerCase().includes(query))
    );
  }, [modules, search]);
  const selectedModule =
    modules.find((module) => module.name === selectedModuleName) ??
    filteredModules[0] ??
    modules[0];
  const visibleModules = filteredModules;
  const isSearchingModules = search.trim().length > 0;
  const pageStart = filteredModules.length > 0 ? 1 : 0;
  const pageEnd = filteredModules.length;
  const canManageModules =
    session.roleCode === "super_admin" ||
    session.roleCode === "it_manager" ||
    session.permissionCodes.includes("tasks:update");
  const canReorderModules = canManageModules && !isSearchingModules;
  const visibleSubModules = selectedModule
    ? getVisibleSubModuleGroups(selectedModule)
    : [];
  const selectedConnectedTaskCount = visibleSubModules.reduce(
    (sum, subModule) => sum + subModule.tasks.length,
    0
  );

  useEffect(() => {
    if (!selectedModuleName && modules.length > 0) {
      setSelectedModuleName(modules[0].name);
    }
  }, [modules, selectedModuleName]);

  useEffect(() => {
    setDetailMode("none");
    setDetailMessage(null);
    setEditModuleName(selectedModule?.name ?? "");
    setEditingSubModuleName("");
    setEditSubModuleName("");
    setNewSubModuleNames("");
    setExpandedSubModuleIds(new Set());
  }, [selectedModule?.name]);

  function toggleSubModuleItems(subModuleName: string) {
    if (!selectedModule) {
      return;
    }

    const subModuleId = getSubModuleCollapseId(selectedModule.name, subModuleName);

    setExpandedSubModuleIds((current) => {
      const next = new Set(current);

      if (next.has(subModuleId)) {
        next.delete(subModuleId);
      } else {
        next.add(subModuleId);
      }

      return next;
    });
  }

  function handleAddModule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = moduleName.trim();
    const existingModule = catalog.find(
      (module) => module.name.toLowerCase() === name.toLowerCase()
    );
    const targetName = existingModule?.name ?? name;
    const parsedSubModules = parseDelimitedModuleValues(subModuleNames);

    if (!name) {
      setFormMessage("Module name is required.");
      return;
    }

    addCustomTaskModule(targetName, parsedSubModules);
    setSelectedModuleName(targetName);
    setModuleName("");
    setSubModuleNames("");
    setFormMessage(
      existingModule
        ? "Module already exists. Sub modules were updated."
        : "Module added."
    );
  }

  function handleMoveModule(name: string, direction: "down" | "up") {
    moveTaskModuleInCatalog(name, direction);
    setSelectedModuleName(name);
    setFormMessage("Module dashboard order updated.");
  }

  function openEditModule() {
    if (!selectedModule) {
      return;
    }

    setDetailMode("edit");
    setDetailMessage(null);
    setEditModuleName(selectedModule.name);
  }

  function openAddSubModule() {
    setDetailMode("add-submodule");
    setDetailMessage(null);
    setNewSubModuleNames("");
  }

  function openEditSubModule(subModuleName: string) {
    setDetailMode("edit-submodule");
    setDetailMessage(null);
    setEditingSubModuleName(subModuleName);
    setEditSubModuleName(subModuleName);
  }

  async function handleEditModule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedModule) {
      return;
    }

    const nextName = editModuleName.trim().replace(/\s+/g, " ");

    if (!nextName) {
      setDetailMessage("Module name is required.");
      return;
    }

    const duplicateModule = modules.find(
      (module) =>
        module.name.toLowerCase() === nextName.toLowerCase() &&
        module.name !== selectedModule.name
    );

    if (duplicateModule) {
      setDetailMessage("A module with this name already exists.");
      return;
    }

    const isRename = nextName !== selectedModule.name;

    if (!isRename) {
      setDetailMessage("No module changes to save.");
      return;
    }

    setIsSavingModule(true);
    setDetailMessage(null);

    try {
      if (isRename && selectedModule.tasks.length > 0) {
        await Promise.all(
          selectedModule.tasks.map((task) =>
            api.updateSprintItem(task.id, { mainModule: nextName })
          )
        );

        setState((current) =>
          current.status === "ready"
            ? {
                items: current.items.map((item) =>
                  item.mainModule === selectedModule.name
                    ? { ...item, mainModule: nextName }
                    : item
                ),
                status: "ready"
              }
            : current
        );
      }

      renameTaskModuleInCatalog(selectedModule.name, nextName);
      setSelectedModuleName(nextName);
      setDetailMode("none");
      setDetailMessage(
        isRename
          ? "Module updated and connected sprint items were moved."
          : "Module sub modules were updated."
      );
    } catch (error) {
      setDetailMessage(
        error instanceof Error
          ? error.message
          : "Module could not be updated."
      );
    } finally {
      setIsSavingModule(false);
    }
  }

  async function handleDeleteModule() {
    if (!selectedModule) {
      return;
    }

    const shouldDelete =
      typeof window === "undefined" ||
      window.confirm(`Delete ${selectedModule.name} and disconnect its sprint items?`);

    if (!shouldDelete) {
      return;
    }

    setIsSavingModule(true);
    setDetailMessage(null);

    try {
      if (selectedModule.tasks.length > 0) {
        await Promise.all(
          selectedModule.tasks.map((task) =>
            api.updateSprintItem(task.id, { mainModule: "", subModule: "" })
          )
        );
      }

      deleteTaskModuleFromCatalog(selectedModule.name);
      setState((current) =>
        current.status === "ready"
          ? {
              items: current.items.map((item) =>
                item.mainModule === selectedModule.name
                  ? { ...item, mainModule: undefined, subModule: undefined }
                  : item
              ),
              status: "ready"
            }
          : current
      );
      setSelectedModuleName("");
      setDetailMode("none");
      setDetailMessage("Module deleted and connected sprint items were disconnected.");
    } catch (error) {
      setDetailMessage(
        error instanceof Error
          ? error.message
          : "Module could not be deleted."
      );
    } finally {
      setIsSavingModule(false);
    }
  }

  async function handleEditSubModule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedModule || !editingSubModuleName) {
      return;
    }

    const nextName = editSubModuleName.trim().replace(/\s+/g, " ");

    if (!nextName) {
      setDetailMessage("Sub module name is required.");
      return;
    }

    const duplicateSubModule = selectedModule.subModules.some(
      (subModule) =>
        subModule.name.toLowerCase() === nextName.toLowerCase() &&
        subModule.name !== editingSubModuleName
    );

    if (duplicateSubModule) {
      setDetailMessage("A sub module with this name already exists.");
      return;
    }

    if (nextName === editingSubModuleName) {
      setDetailMessage("No sub module changes to save.");
      return;
    }

    const affectedTasks = selectedModule.tasks.filter(
      (task) => task.subModule?.trim() === editingSubModuleName
    );

    setIsSavingModule(true);
    setDetailMessage(null);

    try {
      if (affectedTasks.length > 0) {
        await Promise.all(
          affectedTasks.map((task) =>
            api.updateSprintItem(task.id, { subModule: nextName })
          )
        );
      }

      renameTaskSubModuleInCatalog(selectedModule.name, editingSubModuleName, nextName);
      setState((current) =>
        current.status === "ready"
          ? {
              items: current.items.map((item) =>
                item.mainModule === selectedModule.name &&
                item.subModule?.trim() === editingSubModuleName
                  ? { ...item, subModule: nextName }
                  : item
              ),
              status: "ready"
            }
          : current
      );
      setDetailMode("none");
      setDetailMessage("Sub module updated.");
    } catch (error) {
      setDetailMessage(
        error instanceof Error
          ? error.message
          : "Sub module could not be updated."
      );
    } finally {
      setIsSavingModule(false);
    }
  }

  async function handleDeleteSubModule(subModuleName: string) {
    if (!selectedModule) {
      return;
    }

    const affectedTasks = selectedModule.tasks.filter(
      (task) => task.subModule?.trim() === subModuleName
    );
    const shouldDelete =
      typeof window === "undefined" ||
      window.confirm(`Delete ${subModuleName} and disconnect its sprint items?`);

    if (!shouldDelete) {
      return;
    }

    setIsSavingModule(true);
    setDetailMessage(null);

    try {
      if (affectedTasks.length > 0) {
        await Promise.all(
          affectedTasks.map((task) => api.updateSprintItem(task.id, { subModule: "" }))
        );
      }

      deleteTaskSubModuleFromCatalog(selectedModule.name, subModuleName);
      setState((current) =>
        current.status === "ready"
          ? {
              items: current.items.map((item) =>
                item.mainModule === selectedModule.name &&
                item.subModule?.trim() === subModuleName
                  ? { ...item, subModule: undefined }
                  : item
              ),
              status: "ready"
            }
          : current
      );
      setDetailMode("none");
      setDetailMessage("Sub module deleted and connected sprint items were disconnected.");
    } catch (error) {
      setDetailMessage(
        error instanceof Error
          ? error.message
          : "Sub module could not be deleted."
      );
    } finally {
      setIsSavingModule(false);
    }
  }

  function handleAddSubModule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedModule) {
      return;
    }

    const parsedSubModules = parseDelimitedModuleValues(newSubModuleNames);

    if (parsedSubModules.length === 0) {
      setDetailMessage("Enter at least one sub module.");
      return;
    }

    addSubModulesToTaskModule(selectedModule.name, parsedSubModules);
    setNewSubModuleNames("");
    setDetailMode("none");
    setDetailMessage("Sub module added.");
  }

  function openSprintItemDetail(item: TaskReportRow) {
    setSprintItemDetail({
      item,
      status: "loading",
      updates: []
    });

    Promise.all([
      api.getSprintItem(item.id),
      api.getSprintItemUpdates(item.id)
    ])
      .then(([details, updates]) => {
        setSprintItemDetail({
          details,
          item,
          status: "ready",
          updates: updates.data
        });
      })
      .catch((error: unknown) => {
        setSprintItemDetail({
          error:
            error instanceof Error
              ? error.message
              : "Sprint item details could not be loaded.",
          item,
          status: "error",
          updates: []
        });
      });
  }

  async function saveSprintItemFromModule(values: ModuleSprintItemEditValues) {
    if (!sprintItemDetail) {
      return;
    }

    const item = sprintItemDetail.item;
    const details = sprintItemDetail.details;
    const progress = clampProgress(Number(values.progress));
    const currentProgress = details?.progress ?? item.progress;
    const currentStatus = details?.status ?? item.status;
    const metadataPayload: UpdateSprintItemPayload = {
      description: values.description.trim(),
      dueDate: values.dueDate || null,
      mainModule: values.mainModule.trim(),
      priority: values.priority,
      subModule: values.subModule.trim(),
      title: values.title.trim()
    };

    await api.updateSprintItem(item.id, metadataPayload);

    if (progress !== currentProgress) {
      await api.updateTaskProgress(item.id, {
        note: "Updated from Modules page.",
        progress
      });
    }

    if (values.status !== currentStatus) {
      await api.changeTaskStatus(item.id, {
        note: "Updated from Modules page.",
        status: values.status
      });
    }

    const [updatedDetails, updates] = await Promise.all([
      api.getSprintItem(item.id),
      api.getSprintItemUpdates(item.id)
    ]);
    const updatedItem = mergeTaskRecordIntoReportRow(item, updatedDetails);

    setState((current) =>
      current.status === "ready"
        ? {
            items: current.items.map((currentItem) =>
              currentItem.id === item.id ? updatedItem : currentItem
            ),
            status: "ready"
          }
        : current
    );
    setSprintItemDetail({
      details: updatedDetails,
      item: updatedItem,
      status: "ready",
      updates: updates.data
    });
  }

  return (
    <section
      className={`modules-page${sprintItemDetail ? " has-modal-open" : ""}`}
      aria-label="Modules"
    >
      <section className="modules-toolbar">
        <div className="modules-search" role="search">
          <Search size={27} strokeWidth={2.15} aria-hidden="true" />
          <input
            aria-label="Search modules"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search modules..."
            value={search}
          />
          <SlidersHorizontal size={26} strokeWidth={2.1} aria-hidden="true" />
        </div>

        {canManageModules ? (
          <form className="modules-add-form" onSubmit={handleAddModule}>
            <strong>Add Module</strong>
            <label>
              <Landmark size={19} strokeWidth={2.1} aria-hidden="true" />
              <input
                maxLength={120}
                onChange={(event) => {
                  setModuleName(event.target.value);
                  setFormMessage(null);
                }}
                placeholder="Module name"
                value={moduleName}
              />
            </label>
            <label>
              <Users size={19} strokeWidth={2.1} aria-hidden="true" />
              <input
                maxLength={240}
                onChange={(event) => setSubModuleNames(event.target.value)}
                placeholder="Sub modules, comma separated"
                value={subModuleNames}
              />
            </label>
            <button type="submit">
              Add Module
            </button>
          </form>
        ) : null}
      </section>

      {formMessage ? <p className="modules-form-message">{formMessage}</p> : null}

      {state.status === "loading" ? (
        <p className="dashboard-empty-state">Loading modules...</p>
      ) : null}

      {state.status === "error" ? (
        <p className="dashboard-empty-state">{state.message}</p>
      ) : null}

      {state.status === "ready" ? (
        <div className="modules-layout">
          <section className="modules-list" aria-label="All modules">
            <header>
              <h2>All Modules ({filteredModules.length})</h2>
            </header>

            <div className="modules-list-items">
              {visibleModules.map((module) => {
                const visual = getModuleVisual(module.name);
                const Icon = visual.icon;
                const metrics = getModuleDisplayMetrics(module);
                const moduleIndex = modules.findIndex((entry) => entry.name === module.name);

                return (
                  <div className="modules-list-entry" key={module.name}>
                    <button
                      className={`modules-list-item is-${visual.tone}${
                        selectedModule?.name === module.name ? " is-active" : ""
                      }`}
                      onClick={() => setSelectedModuleName(module.name)}
                      type="button"
                    >
                      <span className="modules-list-icon">
                        <Icon size={30} strokeWidth={2.15} aria-hidden="true" />
                      </span>
                      <span className="modules-list-copy">
                        <strong>{module.name}</strong>
                        <small>{module.taskCount} Sprint Items</small>
                      </span>
                      <b>{metrics.progress}%</b>
                      <ProgressRing
                        className="modules-list-ring"
                        progress={metrics.progress}
                        tone={visual.tone}
                      />
                    </button>
                    {canManageModules ? (
                      <span className="modules-order-controls">
                        <button
                          aria-label={`Move ${module.name} up`}
                          disabled={!canReorderModules || moduleIndex <= 0}
                          onClick={() => handleMoveModule(module.name, "up")}
                          title={
                            isSearchingModules
                              ? "Clear search to reorder modules"
                              : `Move ${module.name} up`
                          }
                          type="button"
                        >
                          <ArrowUp size={16} strokeWidth={2.4} aria-hidden="true" />
                        </button>
                        <button
                          aria-label={`Move ${module.name} down`}
                          disabled={!canReorderModules || moduleIndex === modules.length - 1}
                          onClick={() => handleMoveModule(module.name, "down")}
                          title={
                            isSearchingModules
                              ? "Clear search to reorder modules"
                              : `Move ${module.name} down`
                          }
                          type="button"
                        >
                          <ArrowDown size={16} strokeWidth={2.4} aria-hidden="true" />
                        </button>
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <footer>
              <span>
                Showing {pageStart} to {pageEnd} of {filteredModules.length} modules
              </span>
            </footer>
          </section>

          {selectedModule ? (
            <section className="modules-detail" aria-label={`${selectedModule.name} details`}>
              {(() => {
                const selectedMetrics = getModuleDisplayMetrics(selectedModule);

                return (
                  <>
              <header>
                <div>
                  <span className="modules-detail-icon">
                    {(() => {
                      const Icon = getModuleVisual(selectedModule.name).icon;

                      return <Icon size={40} strokeWidth={2.15} aria-hidden="true" />;
                    })()}
                  </span>
                  <div>
                    <h2>{selectedModule.name}</h2>
                    <p>{selectedModule.taskCount} Sprint Items</p>
                  </div>
                </div>
                <div className="modules-detail-actions">
                  {canManageModules ? (
                    <>
                      <button onClick={openEditModule} type="button">
                        <Pencil size={18} strokeWidth={2.35} aria-hidden="true" />
                        Edit Module
                      </button>
                      <button onClick={openAddSubModule} type="button">
                        <Plus size={18} strokeWidth={2.35} aria-hidden="true" />
                        Add Sub Module
                      </button>
                      <button
                        disabled={isSavingModule}
                        onClick={handleDeleteModule}
                        type="button"
                      >
                        <Trash2 size={18} strokeWidth={2.35} aria-hidden="true" />
                        Delete Module
                      </button>
                    </>
                  ) : null}
                  <button aria-label="More module actions" type="button">
                    <MoreVertical size={24} strokeWidth={2.4} aria-hidden="true" />
                  </button>
                </div>
              </header>

              {detailMessage ? (
                <p className="modules-detail-message">{detailMessage}</p>
              ) : null}

              {detailMode === "edit" ? (
                <form className="modules-detail-editor" onSubmit={handleEditModule}>
                  <label>
                    <span>Module name</span>
                    <input
                      maxLength={120}
                      onChange={(event) => setEditModuleName(event.target.value)}
                      value={editModuleName}
                    />
                  </label>
                  <div>
                    <button disabled={isSavingModule} type="submit">
                      <Check size={17} strokeWidth={2.35} aria-hidden="true" />
                      {isSavingModule ? "Saving..." : "Save"}
                    </button>
                    <button
                      disabled={isSavingModule}
                      onClick={() => setDetailMode("none")}
                      type="button"
                    >
                      <X size={17} strokeWidth={2.35} aria-hidden="true" />
                      Cancel
                    </button>
                  </div>
                </form>
              ) : null}

              {detailMode === "edit-submodule" ? (
                <form className="modules-detail-editor" onSubmit={handleEditSubModule}>
                  <label>
                    <span>Sub module name</span>
                    <input
                      autoFocus
                      maxLength={120}
                      onChange={(event) => setEditSubModuleName(event.target.value)}
                      value={editSubModuleName}
                    />
                  </label>
                  <div>
                    <button disabled={isSavingModule} type="submit">
                      <Check size={17} strokeWidth={2.35} aria-hidden="true" />
                      {isSavingModule ? "Saving..." : "Save"}
                    </button>
                    <button
                      disabled={isSavingModule}
                      onClick={() => setDetailMode("none")}
                      type="button"
                    >
                      <X size={17} strokeWidth={2.35} aria-hidden="true" />
                      Cancel
                    </button>
                  </div>
                </form>
              ) : null}

              {detailMode === "add-submodule" ? (
                <form className="modules-detail-editor" onSubmit={handleAddSubModule}>
                  <label>
                    <span>Sub module name</span>
                    <input
                      autoFocus
                      maxLength={240}
                      onChange={(event) => setNewSubModuleNames(event.target.value)}
                      placeholder="One or more, comma separated"
                      value={newSubModuleNames}
                    />
                  </label>
                  <div>
                    <button type="submit">
                      <Plus size={17} strokeWidth={2.35} aria-hidden="true" />
                      Add Sub Module
                    </button>
                    <button onClick={() => setDetailMode("none")} type="button">
                      <X size={17} strokeWidth={2.35} aria-hidden="true" />
                      Cancel
                    </button>
                  </div>
                </form>
              ) : null}

              <div className="modules-stats">
                <ProgressStat progress={selectedMetrics.progress} />
                <ModuleStat label="Completed" tone="success" value={selectedMetrics.completedCount} />
                <ModuleStat label="Pending" tone="primary" value={selectedMetrics.pendingCount} />
                <ModuleStat label="Blocked" tone="danger" value={selectedMetrics.blockedCount} />
              </div>

              <section className="modules-submodules" aria-label="Sub modules">
                <header>
                  <h3>Sub Modules ({visibleSubModules.length})</h3>
                  <span>{selectedConnectedTaskCount} connected sprint items</span>
                </header>
                <div className="modules-module-tree">
                  {visibleSubModules.length === 0 ? (
                    <p className="modules-empty-tree">
                      No sub modules connected to this module yet.
                    </p>
                  ) : null}

                  {visibleSubModules.map((subModule) => {
                    const Icon = subModule.visual.icon;
                    const subModuleId = getSubModuleCollapseId(selectedModule.name, subModule.name);
                    const isExpanded = expandedSubModuleIds.has(subModuleId);

                    return (
                      <article
                        className={`modules-submodule-group is-${subModule.visual.tone}${
                          isExpanded ? " is-expanded" : " is-collapsed"
                        }`}
                        key={subModule.name}
                      >
                        <div className="modules-submodule-head">
                          <button
                            aria-expanded={isExpanded}
                            aria-label={`${isExpanded ? "Collapse" : "Open"} ${subModule.name} sprint items`}
                            className="modules-submodule-toggle"
                            onClick={() => toggleSubModuleItems(subModule.name)}
                            type="button"
                          >
                            <ChevronDown size={19} strokeWidth={2.6} aria-hidden="true" />
                          </button>
                          <span className="modules-submodule-icon">
                            <Icon size={27} strokeWidth={2.15} aria-hidden="true" />
                          </span>
                          <div className="modules-submodule-copy">
                            <strong>{subModule.name}</strong>
                            <small>{subModule.tasks.length} Connected Sprint Items</small>
                          </div>
                          <div className="modules-submodule-progress">
                            <b>{subModule.progress}%</b>
                            <i>
                              <span
                                style={progressStyle(
                                  subModule.progress,
                                  subModule.visual.color
                                )}
                              />
                            </i>
                          </div>
                          {canManageModules ? (
                            <div className="modules-submodule-actions">
                              <button
                                aria-label={`Edit ${subModule.name}`}
                                onClick={() => openEditSubModule(subModule.name)}
                                type="button"
                              >
                                <Pencil size={16} strokeWidth={2.3} aria-hidden="true" />
                              </button>
                              <button
                                aria-label={`Delete ${subModule.name}`}
                                disabled={isSavingModule}
                                onClick={() => handleDeleteSubModule(subModule.name)}
                                type="button"
                              >
                                <Trash2 size={16} strokeWidth={2.3} aria-hidden="true" />
                              </button>
                            </div>
                          ) : null}
                        </div>

                        {isExpanded ? (
                          <div className="modules-submodule-children">
                            {subModule.tasks.length === 0 ? (
                              <p>No sprint items connected to this sub module yet.</p>
                            ) : null}

                            {subModule.tasks.map((task) => (
                              <button
                                aria-label={`Open sprint item details for ${task.title}`}
                                className="modules-task-row"
                                key={task.id}
                                onClick={() => openSprintItemDetail(task)}
                                type="button"
                              >
                                <span className="modules-task-branch" aria-hidden="true" />
                                <span className="modules-task-code">{task.taskCode}</span>
                                <span className="modules-task-copy">
                                  <strong>{task.title}</strong>
                                  <small>{resolveSprintLabel(task)}</small>
                                </span>
                                <span className={`modules-status modules-status-${task.status}`}>
                                  {formatStatusLabel(task.status)}
                                </span>
                                <span className="modules-task-progress">
                                  <b>{task.progress}%</b>
                                  <span
                                    aria-label={`${task.progress}% complete`}
                                    className="modules-table-progress"
                                  >
                                    <i style={progressStyle(task.progress)} />
                                  </span>
                                </span>
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
                <button
                  className="modules-view-all-button"
                  onClick={() =>
                    navigate(`/sprint-items?mainModule=${encodeURIComponent(selectedModule.name)}`)
                  }
                  type="button"
                >
                  View all sprint items
                  <ArrowRight size={18} strokeWidth={2.4} aria-hidden="true" />
                </button>
              </section>
                  </>
                );
              })()}
            </section>
          ) : null}
        </div>
      ) : null}

      {sprintItemDetail ? (
        <ModuleSprintItemDetailModal
          canEdit={canManageModules}
          catalog={catalog}
          detailState={sprintItemDetail}
          onClose={() => setSprintItemDetail(null)}
          onSave={saveSprintItemFromModule}
        />
      ) : null}
    </section>
  );
}

export const ModulesContent = memo(ModulesContentView);

function ProgressStat({ progress }: { progress: number }) {
  return (
    <article className="modules-stat-progress">
      <span>Progress</span>
      <strong>{progress}%</strong>
      <ProgressRing className="modules-stat-ring" progress={progress} tone="blue" />
      <i>
        <span style={progressStyle(progress)} />
      </i>
    </article>
  );
}

function ModuleStat({
  label,
  tone,
  value
}: {
  label: string;
  tone: "danger" | "primary" | "success";
  value: number | string;
}) {
  return (
    <article className={`modules-stat-count is-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>Sprint Items</small>
    </article>
  );
}

function ModuleSprintItemDetailModal({
  canEdit,
  catalog,
  detailState,
  onClose,
  onSave
}: {
  canEdit: boolean;
  catalog: TaskModuleDefinition[];
  detailState: ModuleSprintItemDetailState;
  onClose: () => void;
  onSave: (values: ModuleSprintItemEditValues) => Promise<void>;
}) {
  const item = detailState.item;
  const details = detailState.details;
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [form, setForm] = useState<ModuleSprintItemEditValues>(() =>
    toModuleSprintItemEditValues(item, details)
  );
  const progress = details?.progress ?? item.progress;
  const status = details?.status ?? item.status;
  const selectedCatalogModule = catalog.find((module) => module.name === form.mainModule);
  const moduleOptions = uniqueStrings([
    ...catalog.map((module) => module.name),
    form.mainModule
  ]);
  const subModuleOptions = uniqueStrings([
    ...(selectedCatalogModule?.subModules ?? []),
    form.subModule
  ]);
  const subModuleListId = `modules-sprint-item-submodules-${item.id}`;

  useEffect(() => {
    if (!isEditing) {
      setForm(toModuleSprintItemEditValues(item, details));
    }
  }, [details, isEditing, item]);

  function updateForm<TKey extends keyof ModuleSprintItemEditValues>(
    key: TKey,
    value: ModuleSprintItemEditValues[TKey]
  ) {
    setForm((current) => ({
      ...current,
      [key]: value
    }));
  }

  async function handleSave() {
    const normalizedTitle = form.title.trim();
    const normalizedProgress = Number(form.progress);

    if (!normalizedTitle) {
      setSaveError("Sprint item title is required.");
      return;
    }

    if (!Number.isFinite(normalizedProgress) || normalizedProgress < 0 || normalizedProgress > 100) {
      setSaveError("Progress must be between 0 and 100.");
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      await onSave({
        ...form,
        progress: String(clampProgress(normalizedProgress)),
        title: normalizedTitle
      });
      setIsEditing(false);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Sprint item could not be updated.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="sprint-detail-modal-backdrop" role="presentation">
      <section
        aria-labelledby="modules-sprint-item-detail-title"
        aria-modal="true"
        className="sprint-detail-item-modal modules-sprint-item-modal"
        role="dialog"
      >
        <header className="sprint-detail-item-modal-header">
          <span>
            <FileText size={27} strokeWidth={2.1} aria-hidden="true" />
          </span>
          <div>
            <small>{item.taskCode}</small>
            <h2 id="modules-sprint-item-detail-title">{isEditing ? form.title || item.title : item.title}</h2>
            <p>{isEditing ? "Edit connected sprint item" : "Connected sprint item details"}</p>
          </div>
          <button aria-label="Close sprint item details" disabled={isSaving} onClick={onClose} type="button">
            <X size={21} strokeWidth={2.3} aria-hidden="true" />
          </button>
        </header>

        {detailState.status === "loading" ? (
          <p className="sprint-detail-modal-state">Loading sprint item details...</p>
        ) : null}

        {detailState.status === "error" ? (
          <p className="sprint-detail-modal-error">{detailState.error}</p>
        ) : null}

        <div className="sprint-detail-item-modal-grid">
          <section className="sprint-detail-item-card">
            <h3>Sprint Item Information</h3>
            <dl className="sprint-detail-item-facts">
              <div>
                <dt>Sprint</dt>
                <dd>{resolveSprintLabel(item)}</dd>
              </div>
              <div>
                <dt>Module</dt>
                <dd>
                  {isEditing ? (
                    <select
                      className="modules-detail-input"
                      disabled={isSaving}
                      onChange={(event) => {
                        updateForm("mainModule", event.target.value);
                        updateForm("subModule", "");
                      }}
                      value={form.mainModule}
                    >
                      <option value="">No module</option>
                      {moduleOptions.map((moduleName) => (
                        <option key={moduleName} value={moduleName}>
                          {moduleName}
                        </option>
                      ))}
                    </select>
                  ) : (
                    details?.mainModule ?? item.mainModule ?? "-"
                  )}
                </dd>
              </div>
              <div>
                <dt>Sub Module</dt>
                <dd>
                  {isEditing ? (
                    <>
                      <input
                        className="modules-detail-input"
                        disabled={isSaving || !form.mainModule}
                        list={subModuleListId}
                        onChange={(event) => updateForm("subModule", event.target.value)}
                        placeholder="Sub module"
                        value={form.subModule}
                      />
                      <datalist id={subModuleListId}>
                        {subModuleOptions.map((subModuleName) => (
                          <option key={subModuleName} value={subModuleName} />
                        ))}
                      </datalist>
                    </>
                  ) : (
                    details?.subModule ?? item.subModule ?? "-"
                  )}
                </dd>
              </div>
              <div>
                <dt>Assignee</dt>
                <dd>{item.assignedTo?.fullName ?? "-"}</dd>
              </div>
              <div>
                <dt>Priority</dt>
                <dd>
                  {isEditing ? (
                    <select
                      className="modules-detail-input"
                      disabled={isSaving}
                      onChange={(event) => updateForm("priority", event.target.value as TaskPriority)}
                      value={form.priority}
                    >
                      {moduleTaskPriorityOptions.map((priority) => (
                        <option key={priority} value={priority}>
                          {formatStatusLabel(priority)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    formatStatusLabel(details?.priority ?? item.priority)
                  )}
                </dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>
                  {isEditing ? (
                    <select
                      className="modules-detail-input"
                      disabled={isSaving}
                      onChange={(event) => updateForm("status", event.target.value as TaskStatus)}
                      value={form.status}
                    >
                      {moduleTaskStatusOptions.map((taskStatus) => (
                        <option key={taskStatus} value={taskStatus}>
                          {formatStatusLabel(taskStatus)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    formatStatusLabel(status)
                  )}
                </dd>
              </div>
              <div>
                <dt>Progress</dt>
                <dd>
                  {isEditing ? (
                    <input
                      className="modules-detail-input"
                      disabled={isSaving}
                      max={100}
                      min={0}
                      onChange={(event) => updateForm("progress", event.target.value)}
                      type="number"
                      value={form.progress}
                    />
                  ) : (
                    `${progress}%`
                  )}
                </dd>
              </div>
              <div>
                <dt>Due Date</dt>
                <dd>
                  {isEditing ? (
                    <input
                      className="modules-detail-input"
                      disabled={isSaving}
                      onChange={(event) => updateForm("dueDate", event.target.value)}
                      type="date"
                      value={form.dueDate}
                    />
                  ) : (
                    formatModuleDate(details?.dueDate ?? item.dueDate)
                  )}
                </dd>
              </div>
            </dl>
          </section>

          <section className="sprint-detail-item-card">
            <h3>Details</h3>
            {isEditing ? (
              <>
                <label className="sprint-detail-item-field">
                  <span>Title</span>
                  <input
                    disabled={isSaving}
                    maxLength={180}
                    onChange={(event) => updateForm("title", event.target.value)}
                    value={form.title}
                  />
                </label>
                <label className="sprint-detail-item-field">
                  <span>Description</span>
                  <textarea
                    disabled={isSaving}
                    onChange={(event) => updateForm("description", event.target.value)}
                    value={form.description}
                  />
                </label>
              </>
            ) : (
              <>
                <div className="sprint-detail-item-description">
                  <strong>Description</strong>
                  <p>{details?.description || item.request?.title || "No description recorded."}</p>
                </div>
                <div className="sprint-detail-item-description">
                  <strong>Last Updated</strong>
                  <p>{formatModuleDateTime(details?.lastProgressUpdateAt ?? details?.updatedAt ?? item.lastProgressUpdateAt ?? item.createdAt)}</p>
                </div>
              </>
            )}
          </section>
        </div>

        <section className="sprint-detail-item-card sprint-detail-history-card">
          <h3>Progress History</h3>
          {detailState.updates.length > 0 ? (
            <div className="sprint-detail-history-list">
              {detailState.updates.map((update) => (
                <article key={update.id}>
                  <strong>{formatTaskUpdateTitle(update)}</strong>
                  <p>{update.note || "No note recorded."}</p>
                  <time>{formatModuleDateTime(update.createdAt)}</time>
                </article>
              ))}
            </div>
          ) : (
            <p className="sprint-detail-modal-state">No progress updates yet.</p>
          )}
        </section>

        {saveError ? <p className="sprint-detail-modal-error">{saveError}</p> : null}

        <footer className="sprint-detail-item-modal-footer">
          <button disabled={isSaving} onClick={onClose} type="button">
            Close
          </button>
          {canEdit && !isEditing ? (
            <button
              disabled={detailState.status === "loading"}
              onClick={() => setIsEditing(true)}
              type="button"
            >
              <Pencil size={17} strokeWidth={2.25} aria-hidden="true" />
              Edit Sprint Item
            </button>
          ) : null}
          {canEdit && isEditing ? (
            <>
              <button
                disabled={isSaving}
                onClick={() => {
                  setIsEditing(false);
                  setForm(toModuleSprintItemEditValues(item, details));
                  setSaveError(null);
                }}
                type="button"
              >
                Cancel Edit
              </button>
              <button disabled={isSaving} onClick={handleSave} type="button">
                <Check size={17} strokeWidth={2.25} aria-hidden="true" />
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </>
          ) : null}
        </footer>
      </section>
    </div>
  );
}

function toModuleSprintItemEditValues(
  item: TaskReportRow,
  details?: TaskRecord
): ModuleSprintItemEditValues {
  return {
    description: details?.description ?? "",
    dueDate: toDateInputValue(details?.dueDate ?? item.dueDate),
    mainModule: details?.mainModule ?? item.mainModule ?? "",
    priority: (details?.priority ?? item.priority) as TaskPriority,
    progress: String(details?.progress ?? item.progress),
    status: details?.status ?? item.status,
    subModule: details?.subModule ?? item.subModule ?? "",
    title: details?.title ?? item.title
  };
}

function mergeTaskRecordIntoReportRow(
  item: TaskReportRow,
  details: TaskRecord
): TaskReportRow {
  return {
    ...item,
    category: details.category,
    completedAt: details.completedAt,
    createdAt: details.createdAt ?? item.createdAt,
    dueDate: details.dueDate,
    lastProgressUpdateAt: details.lastProgressUpdateAt ?? details.updatedAt ?? item.lastProgressUpdateAt,
    mainModule: details.mainModule,
    priority: details.priority,
    progress: details.progress,
    startDate: details.startDate,
    status: details.status,
    subModule: details.subModule,
    taskCode: details.taskCode,
    title: details.title
  };
}

function clampProgress(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round(value)));
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

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function getSubModuleCollapseId(moduleName: string, subModuleName: string): string {
  return `${moduleName}::${subModuleName}`;
}

function ProgressRing({
  className,
  progress,
  tone
}: {
  className: string;
  progress: number;
  tone: ModuleTone;
}) {
  const visual = getToneVisual(tone);

  return (
    <span
      aria-label={`${progress}% progress`}
      className={className}
      style={progressStyle(progress, visual.color)}
    />
  );
}

function getModuleDisplayMetrics(module: ModuleSummary): ModuleSummary {
  const metric = referenceModuleMetrics[module.name];

  if (!metric) {
    return module;
  }

  return {
    ...module,
    blockedCount: metric.blockedCount ?? module.blockedCount,
    completedCount: metric.completedCount ?? module.completedCount,
    pendingCount: metric.pendingCount ?? module.pendingCount,
    progress: metric.progress
  };
}

function getVisibleSubModules(module: ModuleSummary): SubModuleSummary[] {
  return [...module.subModules];
}

function getVisibleSubModuleGroups(module: ModuleSummary): SubModuleTaskGroup[] {
  return getVisibleSubModules(module).map((subModule, index) => {
    const visual = getSubModuleVisual(subModule.name, index);
    const progress = getSubModuleDisplayProgress(module.name, subModule);

    return {
      ...subModule,
      progress,
      tasks: sortTasksForModuleDisplay(
        module.name,
        module.tasks.filter((task) => task.subModule?.trim() === subModule.name)
      ),
      visual
    };
  });
}

function sortTasksForModuleDisplay(moduleName: string, tasks: TaskReportRow[]): TaskReportRow[] {
  void moduleName;
  return tasks;
}

function getSubModuleDisplayProgress(moduleName: string, subModule: SubModuleSummary): number {
  return referenceSubModuleProgress[moduleName]?.[subModule.name] ?? subModule.progress;
}

function getModuleVisual(name: string): ModuleVisual {
  const lowerName = name.toLowerCase();

  if (lowerName.includes("finance")) {
    return { color: "#116dff", icon: Landmark, tone: "blue" };
  }

  if (
    lowerName.includes("human") ||
    lowerName.includes("personnel") ||
    lowerName.includes("training") ||
    lowerName.includes("medical")
  ) {
    return { color: "#5d2ee0", icon: Users, tone: "purple" };
  }

  if (
    lowerName.includes("information") ||
    lowerName.includes("technology") ||
    lowerName.includes("documents") ||
    lowerName.includes("communications")
  ) {
    return { color: "#16a34a", icon: Database, tone: "green" };
  }

  if (
    lowerName.includes("supply") ||
    lowerName.includes("materials") ||
    lowerName.includes("warehouse")
  ) {
    return { color: "#ff6a13", icon: Building2, tone: "orange" };
  }

  if (
    lowerName.includes("operations") ||
    lowerName.includes("maintenance") ||
    lowerName.includes("transport") ||
    lowerName.includes("services")
  ) {
    return { color: "#20a7bc", icon: Building2, tone: "cyan" };
  }

  return { color: "#116dff", icon: Building2, tone: "blue" };
}

function getSubModuleVisual(name: string, index: number): ModuleVisual {
  const lowerName = name.toLowerCase();

  if (lowerName.includes("payrole") || lowerName.includes("payroll")) {
    return { color: "#116dff", icon: FileText, tone: "blue" };
  }

  if (lowerName.includes("report")) {
    return { color: "#116dff", icon: ChartColumn, tone: "blue" };
  }

  if (lowerName.includes("payable") || lowerName.includes("receivable")) {
    return { color: "#116dff", icon: BadgeDollarSign, tone: "blue" };
  }

  if (lowerName.includes("budget")) {
    return { color: "#116dff", icon: Calculator, tone: "blue" };
  }

  const icons: LucideIcon[] = [FileText, ChartColumn, BadgeDollarSign, Calculator];

  return { color: "#116dff", icon: icons[index % icons.length], tone: "blue" };
}

function getToneVisual(tone: ModuleTone): { color: string } {
  switch (tone) {
    case "cyan":
      return { color: "#20a7bc" };
    case "green":
      return { color: "#16a34a" };
    case "orange":
      return { color: "#ff6a13" };
    case "purple":
      return { color: "#5d2ee0" };
    default:
      return { color: "#116dff" };
  }
}

function progressStyle(progress: number, color = "#116dff"): CSSProperties {
  const safeProgress = Math.max(0, Math.min(100, Math.round(progress)));

  return {
    "--modules-progress": `${safeProgress}%`,
    "--modules-ring-color": color
  } as CSSProperties;
}

function parseDelimitedModuleValues(value: string): string[] {
  return [...new Set(
    value
      .split(",")
      .map((entry) => entry.trim().replace(/\s+/g, " "))
      .filter(Boolean)
  )];
}

function buildModuleSummaries(
  catalog: TaskModuleDefinition[],
  items: TaskReportRow[]
): ModuleSummary[] {
  const catalogMap = new Map(catalog.map((module) => [module.name, module]));
  const catalogOrder = new Map(catalog.map((module, index) => [module.name, index]));

  for (const item of items) {
    const mainModule = item.mainModule?.trim();

    if (!mainModule || catalogMap.has(mainModule)) {
      continue;
    }

    catalogMap.set(mainModule, { name: mainModule, subModules: [] });
  }

  return [...catalogMap.values()]
    .map((module) => {
      const moduleTasks = items.filter((item) => item.mainModule?.trim() === module.name);
      const taskSubModules = moduleTasks
        .map((item) => item.subModule?.trim())
        .filter((value): value is string => Boolean(value));
      const subModuleNames = [
        ...new Set(taskSubModules),
        ...module.subModules.filter((name) => !taskSubModules.includes(name))
      ];
      const subModules = subModuleNames.map((name) => {
        const subModuleTasks = moduleTasks.filter((item) => item.subModule?.trim() === name);

        return {
          name,
          progress: calculateAverageProgress(subModuleTasks),
          taskCount: subModuleTasks.length
        };
      });

      return {
        blockedCount: moduleTasks.filter((item) => item.status === "blocked").length,
        completedCount: moduleTasks.filter((item) => item.status === "completed").length,
        name: module.name,
        pendingCount: moduleTasks.filter((item) => !["cancelled", "completed"].includes(item.status)).length,
        progress: calculateAverageProgress(moduleTasks),
        subModules,
        taskCount: moduleTasks.length,
        tasks: moduleTasks
      };
    });
}

function calculateAverageProgress(items: TaskReportRow[]): number {
  if (items.length === 0) {
    return 0;
  }

  return Math.round(items.reduce((sum, item) => sum + item.progress, 0) / items.length);
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

function formatModuleDate(value: string | undefined): string {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

function formatModuleDateTime(value: string | undefined): string {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

function formatTaskUpdateTitle(update: TaskUpdateRecord): string {
  if (update.previousStatus && update.newStatus && update.previousStatus !== update.newStatus) {
    return `Status changed from ${formatStatusLabel(update.previousStatus)} to ${formatStatusLabel(update.newStatus)}`;
  }

  if (
    typeof update.previousProgress === "number" &&
    typeof update.newProgress === "number" &&
    update.previousProgress !== update.newProgress
  ) {
    return `Progress changed from ${update.previousProgress}% to ${update.newProgress}%`;
  }

  return "Sprint item note";
}
