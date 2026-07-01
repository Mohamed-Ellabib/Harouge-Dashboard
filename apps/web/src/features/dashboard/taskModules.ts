export const manualSubModuleValue = "__manual__";

const customModuleStorageKey = "itdcc.erpDepartments.customTaskModules";
const deletedModuleStorageKey = "itdcc.erpDepartments.deletedTaskModules";
const hiddenSubModuleStorageKey = "itdcc.erpDepartments.hiddenTaskSubModules";
const moduleOrderStorageKey = "itdcc.erpDepartments.taskModuleOrder";
const moduleCatalogChangeEvent = "itdcc:task-module-catalog-changed";

export type TaskModuleDefinition = {
  name: string;
  subModules: string[];
};

export const companyMainModules = [
  "FINANCE",
  "HUMAN RESOURCES",
  "SUPPLY CHAIN",
  "MAINTENANCE",
  "OTHER DEPARTMENTS"
] as const;

export type CompanyMainModule = (typeof companyMainModules)[number];

const defaultSubModules = [
  "General"
] as const;

const subModulesByMainModule: Partial<Record<CompanyMainModule, readonly string[]>> = {
  FINANCE: ["Payrole"],
  "HUMAN RESOURCES": ["General"],
  "SUPPLY CHAIN": ["General"],
  MAINTENANCE: ["General"],
  "OTHER DEPARTMENTS": ["General"]
};

export function getSubModuleOptions(mainModule: string): string[] {
  const customModule = getCustomTaskModules().find((module) => module.name === mainModule);
  const seededValues = isCompanyMainModule(mainModule)
    ? subModulesByMainModule[mainModule]
    : undefined;
  const hiddenValues = new Set(getHiddenSubModules(mainModule));
  const values = [
    ...(seededValues ?? []),
    ...(customModule?.subModules ?? [])
  ].filter((value) => !hiddenValues.has(normalizeModuleValue(value)));

  return values.length > 0 ? uniqueSortedStrings(values) : [...defaultSubModules];
}

export function getCompanyMainModules(): string[] {
  const deletedModules = new Set(getDeletedTaskModules());
  const modules = uniqueStrings([
    ...companyMainModules,
    ...getCustomTaskModules().map((module) => module.name)
  ]).filter((module) => !deletedModules.has(module));
  const moduleSet = new Set(modules);
  const savedOrder = getTaskModuleOrder().filter((module) => moduleSet.has(module));
  const orderedSet = new Set(savedOrder);

  return [
    ...savedOrder,
    ...modules.filter((module) => !orderedSet.has(module))
  ];
}

export function getTaskModuleCatalog(): TaskModuleDefinition[] {
  return getCompanyMainModules().map((name) => ({
    name,
    subModules: getSubModuleOptions(name)
  }));
}

export function addCustomTaskModule(name: string, subModules: string[] = []): TaskModuleDefinition[] {
  const normalizedName = normalizeModuleValue(name);

  if (!normalizedName) {
    return getCustomTaskModules();
  }

  const customModules = getCustomTaskModules();
  const existing = customModules.find((module) => module.name === normalizedName);
  const normalizedSubModules = uniqueSortedStrings(subModules.map(normalizeModuleValue).filter(Boolean));
  unhideTaskModule(normalizedName);
  unhideSubModules(normalizedName, normalizedSubModules);

  if (existing) {
    existing.subModules = uniqueSortedStrings([
      ...existing.subModules,
      ...normalizedSubModules
    ]);
  } else {
    customModules.push({
      name: normalizedName,
      subModules: normalizedSubModules
    });
    addTaskModuleToOrder(normalizedName);
  }

  saveCustomTaskModules(customModules);
  notifyTaskModuleCatalogChanged();

  return getCustomTaskModules();
}

export function addSubModulesToTaskModule(
  name: string,
  subModules: string[] = []
): TaskModuleDefinition[] {
  return addCustomTaskModule(name, subModules);
}

export function deleteTaskModuleFromCatalog(name: string): TaskModuleDefinition[] {
  const normalizedName = normalizeModuleValue(name);

  if (!normalizedName) {
    return getCustomTaskModules();
  }

  saveCustomTaskModules(
    getCustomTaskModules().filter((module) => module.name !== normalizedName)
  );
  hideTaskModule(normalizedName);
  removeTaskModuleFromOrder(normalizedName);
  notifyTaskModuleCatalogChanged();

  return getCustomTaskModules();
}

export function renameTaskModuleInCatalog(
  oldName: string,
  newName: string,
  subModules: string[] = []
): TaskModuleDefinition[] {
  const normalizedOldName = normalizeModuleValue(oldName);
  const normalizedNewName = normalizeModuleValue(newName);

  if (!normalizedOldName || !normalizedNewName) {
    return getCustomTaskModules();
  }

  const customModules = getCustomTaskModules();
  const existingOldModule = customModules.find((module) => module.name === normalizedOldName);
  const preservedSubModules =
    normalizedOldName === normalizedNewName
      ? existingOldModule?.subModules ?? getSubModuleOptions(normalizedOldName)
      : getSubModuleOptions(normalizedOldName);
  const nextSubModules = uniqueSortedStrings([
    ...preservedSubModules,
    ...subModules.map(normalizeModuleValue)
  ]);
  const nextCustomModules = customModules.filter((module) => module.name !== normalizedOldName);
  const existingNewModule = nextCustomModules.find((module) => module.name === normalizedNewName);

  if (existingNewModule) {
    existingNewModule.subModules = uniqueSortedStrings([
      ...existingNewModule.subModules,
      ...nextSubModules
    ]);
  } else {
    nextCustomModules.push({
      name: normalizedNewName,
      subModules: nextSubModules
    });
  }

  if (normalizedOldName !== normalizedNewName) {
    hideTaskModule(normalizedOldName);
    unhideTaskModule(normalizedNewName);
    renameTaskModuleInOrder(normalizedOldName, normalizedNewName);
  }

  saveCustomTaskModules(nextCustomModules);
  notifyTaskModuleCatalogChanged();

  return getCustomTaskModules();
}

export function moveTaskModuleInCatalog(
  name: string,
  direction: "down" | "up"
): string[] {
  const modules = getCompanyMainModules();
  const normalizedName = normalizeModuleValue(name);
  const currentIndex = modules.indexOf(normalizedName);

  if (currentIndex === -1) {
    return modules;
  }

  const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

  if (nextIndex < 0 || nextIndex >= modules.length) {
    return modules;
  }

  const nextModules = [...modules];
  const [movedModule] = nextModules.splice(currentIndex, 1);

  nextModules.splice(nextIndex, 0, movedModule);
  saveTaskModuleOrder(nextModules);
  notifyTaskModuleCatalogChanged();

  return nextModules;
}

export function deleteTaskSubModuleFromCatalog(
  mainModule: string,
  subModule: string
): TaskModuleDefinition[] {
  const normalizedMainModule = normalizeModuleValue(mainModule);
  const normalizedSubModule = normalizeModuleValue(subModule);

  if (!normalizedMainModule || !normalizedSubModule) {
    return getCustomTaskModules();
  }

  removeCustomSubModules(normalizedMainModule, [normalizedSubModule]);
  hideSubModules(normalizedMainModule, [normalizedSubModule]);
  notifyTaskModuleCatalogChanged();

  return getCustomTaskModules();
}

export function renameTaskSubModuleInCatalog(
  mainModule: string,
  oldSubModule: string,
  newSubModule: string
): TaskModuleDefinition[] {
  const normalizedMainModule = normalizeModuleValue(mainModule);
  const normalizedOldSubModule = normalizeModuleValue(oldSubModule);
  const normalizedNewSubModule = normalizeModuleValue(newSubModule);

  if (!normalizedMainModule || !normalizedOldSubModule || !normalizedNewSubModule) {
    return getCustomTaskModules();
  }

  removeCustomSubModules(normalizedMainModule, [normalizedOldSubModule]);
  addCustomTaskModule(normalizedMainModule, [normalizedNewSubModule]);

  if (normalizedOldSubModule !== normalizedNewSubModule) {
    hideSubModules(normalizedMainModule, [normalizedOldSubModule]);
    unhideSubModules(normalizedMainModule, [normalizedNewSubModule]);
  }

  notifyTaskModuleCatalogChanged();

  return getCustomTaskModules();
}

export function subscribeToTaskModuleCatalogChanges(listener: () => void): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  window.addEventListener(moduleCatalogChangeEvent, listener);
  window.addEventListener("storage", listener);

  return () => {
    window.removeEventListener(moduleCatalogChangeEvent, listener);
    window.removeEventListener("storage", listener);
  };
}

function isCompanyMainModule(value: string): value is CompanyMainModule {
  return companyMainModules.includes(value as CompanyMainModule);
}

function getCustomTaskModules(): TaskModuleDefinition[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(customModuleStorageKey) ?? "[]") as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((entry) => {
        if (!entry || typeof entry !== "object") {
          return undefined;
        }

        const module = entry as Partial<TaskModuleDefinition>;
        const name = normalizeModuleValue(module.name ?? "");
        const subModules = Array.isArray(module.subModules)
          ? uniqueSortedStrings(module.subModules.map(normalizeModuleValue).filter(Boolean))
          : [];

        return name ? { name, subModules } : undefined;
      })
      .filter((entry): entry is TaskModuleDefinition => Boolean(entry));
  } catch {
    return [];
  }
}

function getDeletedTaskModules(): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(deletedModuleStorageKey) ?? "[]") as unknown;

    return Array.isArray(parsed)
      ? uniqueSortedStrings(parsed.map((value) => String(value)))
      : [];
  } catch {
    return [];
  }
}

function getTaskModuleOrder(): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(moduleOrderStorageKey) ?? "[]") as unknown;

    return Array.isArray(parsed)
      ? uniqueStrings(parsed.map((value) => String(value)))
      : [];
  } catch {
    return [];
  }
}

function saveTaskModuleOrder(modules: string[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(moduleOrderStorageKey, JSON.stringify(uniqueStrings(modules)));
}

function addTaskModuleToOrder(name: string) {
  const normalizedName = normalizeModuleValue(name);

  if (!normalizedName) {
    return;
  }

  saveTaskModuleOrder([...getTaskModuleOrder(), normalizedName]);
}

function removeTaskModuleFromOrder(name: string) {
  const normalizedName = normalizeModuleValue(name);

  saveTaskModuleOrder(getTaskModuleOrder().filter((module) => module !== normalizedName));
}

function renameTaskModuleInOrder(oldName: string, newName: string) {
  const normalizedOldName = normalizeModuleValue(oldName);
  const normalizedNewName = normalizeModuleValue(newName);
  const currentOrder = getTaskModuleOrder();

  if (!normalizedOldName || !normalizedNewName) {
    return;
  }

  if (!currentOrder.includes(normalizedOldName)) {
    saveTaskModuleOrder([...currentOrder, normalizedNewName]);
    return;
  }

  saveTaskModuleOrder(
    currentOrder.map((module) =>
      module === normalizedOldName ? normalizedNewName : module
    )
  );
}

function saveDeletedTaskModules(modules: string[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(deletedModuleStorageKey, JSON.stringify(uniqueSortedStrings(modules)));
}

function getHiddenSubModuleMap(): Record<string, string[]> {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(hiddenSubModuleStorageKey) ?? "{}") as unknown;

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>)
        .map(([moduleName, values]) => [
          normalizeModuleValue(moduleName),
          Array.isArray(values)
            ? uniqueSortedStrings(values.map((value) => String(value)))
            : []
        ])
        .filter(([moduleName]) => Boolean(moduleName))
    );
  } catch {
    return {};
  }
}

function saveHiddenSubModuleMap(map: Record<string, string[]>) {
  if (typeof window === "undefined") {
    return;
  }

  const normalizedEntries = Object.entries(map)
    .map(([moduleName, values]) => [
      normalizeModuleValue(moduleName),
      uniqueSortedStrings(values)
    ] as const)
    .filter(([moduleName, values]) => Boolean(moduleName) && values.length > 0);

  window.localStorage.setItem(
    hiddenSubModuleStorageKey,
    JSON.stringify(Object.fromEntries(normalizedEntries))
  );
}

function getHiddenSubModules(mainModule: string): string[] {
  return getHiddenSubModuleMap()[normalizeModuleValue(mainModule)] ?? [];
}

function hideTaskModule(name: string) {
  saveDeletedTaskModules([...getDeletedTaskModules(), normalizeModuleValue(name)]);
}

function unhideTaskModule(name: string) {
  const normalizedName = normalizeModuleValue(name);

  saveDeletedTaskModules(
    getDeletedTaskModules().filter((module) => module !== normalizedName)
  );
}

function hideSubModules(mainModule: string, subModules: string[]) {
  const normalizedMainModule = normalizeModuleValue(mainModule);
  const map = getHiddenSubModuleMap();

  map[normalizedMainModule] = uniqueSortedStrings([
    ...(map[normalizedMainModule] ?? []),
    ...subModules.map(normalizeModuleValue)
  ]);
  saveHiddenSubModuleMap(map);
}

function unhideSubModules(mainModule: string, subModules: string[]) {
  const normalizedMainModule = normalizeModuleValue(mainModule);
  const valuesToRemove = new Set(subModules.map(normalizeModuleValue));
  const map = getHiddenSubModuleMap();

  map[normalizedMainModule] = (map[normalizedMainModule] ?? []).filter(
    (value) => !valuesToRemove.has(value)
  );
  saveHiddenSubModuleMap(map);
}

function removeCustomSubModules(mainModule: string, subModules: string[]) {
  const normalizedMainModule = normalizeModuleValue(mainModule);
  const valuesToRemove = new Set(subModules.map(normalizeModuleValue));

  saveCustomTaskModules(
    getCustomTaskModules().map((module) =>
      module.name === normalizedMainModule
        ? {
            ...module,
            subModules: module.subModules.filter((value) => !valuesToRemove.has(value))
          }
        : module
    )
  );
}

function saveCustomTaskModules(modules: TaskModuleDefinition[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    customModuleStorageKey,
    JSON.stringify(
      uniqueByName(modules)
        .sort((left, right) => left.name.localeCompare(right.name))
    )
  );
}

function notifyTaskModuleCatalogChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(moduleCatalogChangeEvent));
  }
}

function normalizeModuleValue(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map(normalizeModuleValue).filter(Boolean))];
}

function uniqueSortedStrings(values: string[]): string[] {
  return uniqueStrings(values).sort((left, right) => left.localeCompare(right));
}

function uniqueByName(modules: TaskModuleDefinition[]): TaskModuleDefinition[] {
  const map = new Map<string, TaskModuleDefinition>();

  for (const module of modules) {
    const name = normalizeModuleValue(module.name);

    if (!name) {
      continue;
    }

    const existing = map.get(name);
    map.set(name, {
      name,
      subModules: uniqueSortedStrings([
        ...(existing?.subModules ?? []),
        ...module.subModules
      ])
    });
  }

  return [...map.values()];
}
