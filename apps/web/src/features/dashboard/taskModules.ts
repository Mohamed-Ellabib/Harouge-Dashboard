export const manualSubModuleValue = "__manual__";

const customModuleStorageKey = "itdcc.customTaskModules";
const deletedModuleStorageKey = "itdcc.deletedTaskModules";
const hiddenSubModuleStorageKey = "itdcc.hiddenTaskSubModules";
const moduleCatalogChangeEvent = "itdcc:task-module-catalog-changed";

export type TaskModuleDefinition = {
  name: string;
  subModules: string[];
};

export const companyMainModules = [
  "Finance Department",
  "Personnel Affairs Department",
  "Training and Development Department",
  "Medical Affairs Department",
  "Benghazi Office Department",
  "Insurance Control",
  "Operations Department",
  "Maintenance Department",
  "Services Department",
  "Transport Department",
  "Aviation, Dispatch and Travel Operations Coordinator",
  "Site Services Control",
  "Petroleum Engineering Department",
  "Management Committee Office",
  "Legal and Review Department",
  "Internal Audit Department",
  "Planning and Follow-up Department",
  "Health, Safety and Environment Department",
  "General Engineering Department",
  "Drilling Department",
  "Joint Development Projects Team",
  "Information Technology Department",
  "Documents and Information Department",
  "Communications Department",
  "Materials and Warehouses Department",
  "Contracts Affairs Office"
] as const;

export type CompanyMainModule = (typeof companyMainModules)[number];

const defaultSubModules = [
  "Administration",
  "Coordination",
  "Reporting",
  "Compliance",
  "Follow-up"
] as const;

const subModulesByMainModule: Partial<Record<CompanyMainModule, readonly string[]>> = {
  "Communications Department": [
    "Radio",
    "Telecom",
    "Internet",
    "Mobile Services",
    "VSAT"
  ],
  "Contracts Affairs Office": [
    "Contract Review",
    "Tendering",
    "Vendor Coordination",
    "Renewals"
  ],
  "Documents and Information Department": [
    "Archive",
    "Correspondence",
    "Records",
    "Document Control"
  ],
  "Finance Department": [
    "Accounts Payable",
    "Accounts Receivable",
    "Budgeting",
    "Payroll",
    "Financial Reporting",
    "Cost Control"
  ],
  "Health, Safety and Environment Department": [
    "Incident Reporting",
    "Safety Audits",
    "Environmental Compliance",
    "PPE",
    "Permits"
  ],
  "Information Technology Department": [
    "ERP",
    "Applications",
    "Infrastructure",
    "Network",
    "Cybersecurity",
    "Service Desk",
    "Access Management",
    "Hardware"
  ],
  "Maintenance Department": [
    "Preventive Maintenance",
    "Corrective Maintenance",
    "Shutdown Planning",
    "Workshop",
    "CMMS"
  ],
  "Materials and Warehouses Department": [
    "Warehouses",
    "Inventory",
    "Procurement Support",
    "Stock Control"
  ],
  "Medical Affairs Department": [
    "Clinics",
    "Medical Records",
    "Claims",
    "Occupational Health"
  ],
  "Operations Department": [
    "Production Operations",
    "Field Operations",
    "Dispatch",
    "Daily Reports"
  ],
  "Personnel Affairs Department": [
    "Employee Records",
    "Recruitment",
    "Attendance",
    "Benefits",
    "HR Services"
  ],
  "Services Department": [
    "Camp Services",
    "Catering",
    "Facility Requests",
    "Janitorial"
  ],
  "Training and Development Department": [
    "Training Plan",
    "Courses",
    "Competency",
    "Onboarding"
  ],
  "Transport Department": [
    "Fleet",
    "Vehicle Requests",
    "Drivers",
    "Fuel",
    "Maintenance Coordination"
  ]
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

  return uniqueSortedStrings([
    ...companyMainModules,
    ...getCustomTaskModules().map((module) => module.name)
  ]).filter((module) => !deletedModules.has(module));
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
  }

  saveCustomTaskModules(nextCustomModules);
  notifyTaskModuleCatalogChanged();

  return getCustomTaskModules();
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

function uniqueSortedStrings(values: string[]): string[] {
  return [...new Set(values.map(normalizeModuleValue).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right));
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
