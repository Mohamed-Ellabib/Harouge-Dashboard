import { readStoredLanguage } from "../i18n/locale";

export type AuthUser = {
  department?: string;
  email: string;
  fullName: string;
  id: string;
  mustChangePassword: boolean;
  permissions: string[];
  roleId: string;
  roleKey: string;
  status: "active";
};

export type Session = {
  csrfToken?: string;
  displayName: string;
  email: string;
  expiresAt: string | null;
  mustChangePassword: boolean;
  permissionCodes: string[];
  roleCode: string;
  userId: string;
};

type ApiSuccess<TData> = {
  data: TData;
  meta?: {
    pagination?: PaginationMeta;
  } & Record<string, unknown>;
  success: true;
};

type ApiFailure = {
  error?: {
    code?: string;
    details?: unknown;
    message?: string;
  };
  success: false;
};

type LoginResponse = ApiSuccess<{
  csrfToken: string;
  session: {
    expiresAt: string;
  };
  user: AuthUser;
}>;

type ChangePasswordResponse = LoginResponse;

type CsrfResponse = ApiSuccess<{
  csrfToken: string;
}>;

type MeResponse = ApiSuccess<{
  user?: AuthUser;
}>;

export type DashboardCountByValue = {
  count: number;
  value: string;
};

export type PaginationMeta = {
  hasNextPage?: boolean;
  hasPreviousPage: boolean;
  limit: number;
  page: number;
  totalItems?: number;
  totalPages?: number;
};

export type PaginatedResult<TItem> = {
  data: TItem[];
  pagination: PaginationMeta;
};

export type SortOrder = "asc" | "desc";

export type AuditLogAction =
  | "assign"
  | "change_status"
  | "comment"
  | "create"
  | "login_failed"
  | "login_succeeded"
  | "logout"
  | "password_changed"
  | "review"
  | "update";

export type AuditLogEntityType =
  | "audit_log"
  | "comment"
  | "permission"
  | "project_progress"
  | "request"
  | "role"
  | "sprint"
  | "sprint_item"
  | "task"
  | "task_update"
  | "user";

export type AuditLogRecord = {
  action: AuditLogAction;
  actorId?: string;
  createdAt?: string;
  entityDisplayName?: string;
  entityId?: string;
  entityReferenceCode?: string;
  entityType: AuditLogEntityType;
  id: string;
  ipAddress?: string;
  newValue?: unknown;
  oldValue?: unknown;
  userAgent?: string;
};

export type RoleRecord = {
  createdAt?: string;
  description?: string;
  displayName: string;
  id: string;
  isSystem: boolean;
  name: "employee" | "it_manager" | "super_admin" | "supervisor";
  updatedAt?: string;
};

export type UserRecord = {
  authUserId?: string;
  createdAt?: string;
  department?: string;
  email: string;
  employeeId?: string;
  failedLoginCount: number;
  fullName: string;
  id: string;
  jobTitle?: string;
  lastLoginAt?: string;
  location?: string;
  lockedUntil?: string;
  mustChangePassword: boolean;
  notes?: string;
  passwordChangedAt?: string;
  phone?: string;
  roleId: string;
  status: "active" | "inactive" | "suspended";
  updatedAt?: string;
};

export type CreateUserPayload = {
  department?: string;
  email: string;
  employeeId?: string;
  fullName: string;
  jobTitle?: string;
  location?: string;
  notes?: string;
  password: string;
  phone?: string;
  roleId: string;
  status: UserRecord["status"];
};

export type AssignUserRolePayload = {
  roleId: string;
};

export type UpdateUserStatusPayload = {
  status: UserRecord["status"];
};

export type UpdateUserPayload = {
  department?: string;
  employeeId?: string;
  fullName?: string;
  jobTitle?: string;
  location?: string;
  notes?: string;
  phone?: string;
};

export type ResetUserPasswordPayload = {
  mustChangePassword: boolean;
  password: string;
};

export type ChangePasswordPayload = {
  currentPassword: string;
  newPassword: string;
};

export type DashboardUserReference = {
  department?: string;
  email: string;
  fullName: string;
  id: string;
  jobTitle?: string;
};

export type DashboardSummary = {
  generatedAt: string;
  requests: {
    byPriority: DashboardCountByValue[];
    byStatus: DashboardCountByValue[];
    byType: DashboardCountByValue[];
    closedThisWeek: number;
    inProgress: number;
    open: number;
  };
  tasks: {
    active: number;
    averageProgress: number;
    blocked: number;
    byCategory: DashboardCountByValue[];
    byPriority: DashboardCountByValue[];
    byStatus: DashboardCountByValue[];
    completedThisWeek: number;
    overdue: number;
    waitingReview: number;
  };
  timezone: string;
  users?: {
    byStatus: DashboardCountByValue[];
  };
  week: {
    endAt: string;
    startAt: string;
  };
};

export type DashboardFocusItem = {
  createdAt?: string;
  department?: string;
  dueAt?: string;
  id: string;
  itemCode: string;
  itemType: "request" | "task";
  priority: string;
  status: string;
  title: string;
};

export type DashboardWorkQueueItem = {
  assignees: DashboardUserReference[];
  assignedTo?: DashboardUserReference;
  dueDate?: string;
  id: string;
  priority: string;
  progress: number;
  status: string;
  taskCode: string;
  title: string;
};

export type DashboardWorkloadItem = {
  activeTaskCount: number;
  overdueTaskCount: number;
  status: "critical" | "healthy" | "warning";
  urgentTaskCount: number;
  user: DashboardUserReference;
  workloadPercent: number;
};

export type DashboardRecentRequestItem = {
  createdAt?: string;
  id: string;
  priority: string;
  requestedBy?: DashboardUserReference;
  requestedForDepartment?: string;
  requestCode: string;
  status: string;
  title: string;
};

export type TaskCategory =
  | "access"
  | "hardware"
  | "maintenance"
  | "network"
  | "other"
  | "server"
  | "software"
  | "support";

export type TaskPriority = "high" | "low" | "medium" | "urgent";

export type TaskStatus =
  | "blocked"
  | "cancelled"
  | "completed"
  | "in_progress"
  | "open"
  | "waiting_review";

export type TaskReportRow = {
  assignees: DashboardUserReference[];
  assignedTo?: DashboardUserReference;
  category: TaskCategory;
  completedAt?: string;
  createdAt?: string;
  createdBy?: DashboardUserReference;
  dueDate?: string;
  id: string;
  lastProgressUpdateAt?: string;
  priority: string;
  progress: number;
  request?: {
    id: string;
    requestCode: string;
    title: string;
  };
  reviewedBy?: DashboardUserReference;
  startDate?: string;
  status: TaskStatus;
  taskCode: string;
  title: string;
};

export type TaskRecord = {
  assigneeIds: string[];
  assignedTo?: string;
  category: TaskCategory;
  completedAt?: string;
  createdAt?: string;
  createdBy?: string;
  description?: string;
  dueDate?: string;
  id: string;
  lastProgressUpdateAt?: string;
  priority: TaskPriority;
  progress: number;
  requestId?: string;
  reviewedBy?: string;
  startDate?: string;
  status: TaskStatus;
  taskCode: string;
  title: string;
  updatedAt?: string;
};

export type TaskUpdateRecord = {
  createdAt?: string;
  id: string;
  newProgress?: number;
  newStatus?: TaskStatus;
  note?: string;
  previousProgress?: number;
  previousStatus?: TaskStatus;
  taskId: string;
  updatedBy?: string;
};

export type SprintStatus =
  | "at_risk"
  | "cancelled"
  | "completed"
  | "in_progress"
  | "planned";

export type SprintAreaKey = "development" | "facility" | "infrastructure";

export type SprintRecord = {
  active: boolean;
  code: string;
  createdAt?: string;
  createdBy?: string;
  description?: string;
  id: string;
  name: string;
  notifyLater: boolean;
  owner?: DashboardUserReference;
  ownerId: string;
  progressTarget: number;
  sprintArea: SprintAreaKey;
  startDate: string;
  status: SprintStatus;
  targetDate: string;
  updatedAt?: string;
};

export type CreateSprintPayload = {
  active: boolean;
  code: string;
  description?: string;
  name: string;
  notifyLater: boolean;
  ownerId: string;
  progressTarget: number;
  sprintArea: SprintAreaKey;
  startDate: string;
  status: SprintStatus;
  targetDate: string;
};

export type UpdateSprintPayload = Partial<CreateSprintPayload>;

export type ProjectProgressRecord = {
  createdAt?: string;
  history: ProjectProgressHistoryRecord[];
  id: string;
  key: "overall";
  note?: string;
  percentage: number;
  updatedAt?: string;
  updatedBy?: DashboardUserReference;
};

export type ProjectProgressHistoryRecord = {
  createdAt?: string;
  id: string;
  note?: string;
  percentage: number;
  updatedBy?: DashboardUserReference;
};

export type UpdateProjectProgressPayload = {
  note?: string;
  percentage?: number;
};

export type DashboardRecentActivityItem = {
  actor?: DashboardUserReference;
  createdAt?: string;
  id: string;
  message: string;
  targetCode?: string;
  tone: "blue" | "green" | "orange" | "red";
  type: "comment" | "task_update";
};

export type DashboardOverview = {
  focusItems: DashboardFocusItem[];
  recentActivity: DashboardRecentActivityItem[];
  recentRequests: DashboardRecentRequestItem[];
  summary: DashboardSummary;
  workQueue: DashboardWorkQueueItem[];
  workload: DashboardWorkloadItem[];
};

type DashboardOverviewResponse = ApiSuccess<{
  overview: DashboardOverview;
}>;

type AuditLogListResponse = ApiSuccess<AuditLogRecord[]>;

type AuditLogResponse = ApiSuccess<{
  auditLog: AuditLogRecord;
}>;

type RoleListResponse = ApiSuccess<RoleRecord[]>;

type SprintCreateResponse = ApiSuccess<{
  sprint: SprintRecord;
}>;

type SprintListResponse = ApiSuccess<SprintRecord[]>;

type ProjectProgressResponse = ApiSuccess<{
  projectProgress: ProjectProgressRecord;
}>;

type TaskReportListResponse = ApiSuccess<TaskReportRow[]>;

type TaskUpdateListResponse = ApiSuccess<TaskUpdateRecord[]>;

type UserListResponse = ApiSuccess<UserRecord[]>;

type UserMutationResponse = ApiSuccess<{
  user: UserRecord;
}>;

type ListParams = {
  limit?: number;
  page?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: SortOrder;
};

export type UserListParams = ListParams & {
  roleId?: string;
  status?: UserRecord["status"];
};

export type TaskReportParams = ListParams & {
  assignedTo?: string;
  category?: TaskCategory;
  status?: TaskStatus;
};

export type AuditLogListParams = ListParams & {
  action?: AuditLogAction;
  actorId?: string;
  dateFrom?: string;
  dateTo?: string;
  entityId?: string;
  entityType?: AuditLogEntityType;
};

export type CreateSprintItemPayload = {
  assigneeIds?: string[];
  assignedTo?: string;
  category?: TaskCategory;
  description?: string;
  dueDate?: string;
  priority?: TaskPriority;
  startDate?: string;
  title: string;
};

export type UpdateSprintItemPayload = {
  category?: TaskCategory;
  description?: string;
  dueDate?: string | null;
  priority?: TaskPriority;
  startDate?: string | null;
  title?: string;
};

export type ReassignSprintItemPayload = {
  assigneeIds?: string[];
  assignedTo?: string | null;
};

export type UpdateTaskProgressPayload = {
  note?: string;
  progress: number;
};

export type ChangeTaskStatusPayload = {
  blockedReason?: string;
  note?: string;
  status: TaskStatus;
};

type TaskMutationResponse = ApiSuccess<{
  task: TaskRecord;
}>;

export type SprintListParams = ListParams & {
  ownerId?: string;
  sprintArea?: SprintAreaKey;
  status?: SprintStatus;
};

export class ApiError extends Error {
  public readonly code: string;
  public readonly detail: string;
  public readonly status: number;

  public constructor(status: number, code: string, detail: string) {
    super(detail);
    this.name = "ApiError";
    this.code = code;
    this.detail = detail;
    this.status = status;
  }
}

let csrfToken: string | undefined;

const appDataCacheTtlMs = 120_000;
const appDataBackgroundRefreshMs = 45_000;
const appDataChangedEventName = "itdcc:app-data-changed";

type CacheEntry<TResponse> = {
  data?: TResponse;
  promise?: Promise<TResponse>;
  updatedAt: number;
};

type AppDataChangedEvent = {
  reason: "background-refresh" | "cache-cleared" | "mutation";
  version: number;
};

const appDataCache = new Map<string, CacheEntry<unknown>>();
const appDataEvents = new EventTarget();
let appDataVersion = 0;
let appDataRefreshTimer: ReturnType<typeof window.setInterval> | undefined;
let appDataRefreshSessionKey: string | undefined;
let appDataRefreshPromise: Promise<void> | undefined;
let sessionRequestPromise: Promise<Session | null> | undefined;

const emptyPagination: PaginationMeta = {
  hasPreviousPage: false,
  limit: 0,
  page: 1,
  totalItems: 0,
  totalPages: 0
};

async function request<TResponse>(
  path: string,
  init?: RequestInit
): Promise<TResponse> {
  const isJsonBody = typeof init?.body === "string";
  const needsCsrfToken = isUnsafeMethod(init?.method) && path !== "/api/auth/login";
  const requestCsrfToken =
    needsCsrfToken && !csrfToken ? await refreshCsrfToken() : csrfToken;
  const response = await fetch(path, {
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Accept-Language": readStoredLanguage(),
      ...(isJsonBody ? { "Content-Type": "application/json" } : {}),
      ...(requestCsrfToken && needsCsrfToken ? { "x-csrf-token": requestCsrfToken } : {}),
      ...init?.headers
    },
    ...init
  });

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? ((await response.json()) as TResponse | ApiFailure)
    : undefined;

  if (!response.ok) {
    const failure = payload as ApiFailure | undefined;
    throw new ApiError(
      response.status,
      failure?.error?.code ?? "request_failed",
      failure?.error?.message ?? "The request could not be completed."
    );
  }

  if (isUnsafeMethod(init?.method) && !path.startsWith("/api/auth/")) {
    clearAppDataCache("mutation");
  }

  return payload as TResponse;
}

async function cachedRequest<TResponse>(
  path: string,
  options: { force?: boolean; ttlMs?: number } = {}
): Promise<TResponse> {
  const cacheKey = buildCacheKey(path);
  const ttlMs = options.ttlMs ?? appDataCacheTtlMs;
  const cached = appDataCache.get(cacheKey) as CacheEntry<TResponse> | undefined;
  const now = Date.now();

  if (!options.force && cached?.data !== undefined) {
    if (now - cached.updatedAt > ttlMs && !cached.promise) {
      void cachedRequest<TResponse>(path, { force: true, ttlMs }).catch(() => undefined);
    }

    return cached.data;
  }

  if (!options.force && cached?.promise) {
    return cached.promise;
  }

  const promise = request<TResponse>(path)
    .then((data) => {
      appDataCache.set(cacheKey, {
        data,
        updatedAt: Date.now()
      });

      return data;
    })
    .catch((error) => {
      if (cached?.data !== undefined) {
        appDataCache.set(cacheKey, {
          data: cached.data,
          updatedAt: cached.updatedAt
        });
      } else {
        appDataCache.delete(cacheKey);
      }

      throw error;
    });

  appDataCache.set(cacheKey, {
    data: cached?.data,
    promise,
    updatedAt: cached?.updatedAt ?? 0
  });

  return promise;
}

function buildCacheKey(path: string): string {
  return `${readStoredLanguage()} ${path}`;
}

function clearAppDataCache(reason: AppDataChangedEvent["reason"] = "cache-cleared") {
  appDataCache.clear();
  notifyAppDataChanged(reason);
}

function notifyAppDataChanged(reason: AppDataChangedEvent["reason"]) {
  appDataVersion += 1;
  appDataEvents.dispatchEvent(
    new CustomEvent<AppDataChangedEvent>(appDataChangedEventName, {
      detail: {
        reason,
        version: appDataVersion
      }
    })
  );
}

async function refreshCsrfToken(): Promise<string> {
  const response = await fetch("/api/auth/csrf", {
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Accept-Language": readStoredLanguage()
    }
  });

  const payload = (await response.json()) as CsrfResponse | ApiFailure;

  if (!response.ok || !payload.success) {
    throw new ApiError(
      response.status,
      "csrf_token_unavailable",
      "The request could not be secured."
    );
  }

  csrfToken = payload.data.csrfToken;

  return payload.data.csrfToken;
}

function isUnsafeMethod(method: string | undefined): boolean {
  const normalized = method?.toUpperCase() ?? "GET";
  return !["GET", "HEAD", "OPTIONS"].includes(normalized);
}

function buildQueryString(params: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") {
      continue;
    }

    query.set(key, String(value));
  }

  const serialized = query.toString();

  return serialized ? `?${serialized}` : "";
}

function toPaginatedResult<TItem>(response: ApiSuccess<TItem[]>): PaginatedResult<TItem> {
  return {
    data: response.data,
    pagination: response.meta?.pagination ?? emptyPagination
  };
}

function toSession(user: AuthUser, options: { csrfToken?: string; expiresAt?: string }): Session {
  return {
    ...(options.csrfToken ? { csrfToken: options.csrfToken } : {}),
    displayName: user.fullName,
    email: user.email,
    expiresAt: options.expiresAt ?? null,
    mustChangePassword: user.mustChangePassword,
    permissionCodes: [...user.permissions],
    roleCode: user.roleKey,
    userId: user.id
  };
}

async function preloadAppData(
  session: Session,
  options: { force?: boolean; notify?: boolean } = {}
): Promise<void> {
  const paths = buildPreloadPaths(session);

  for (const path of paths) {
    try {
      await cachedRequest<unknown>(path, {
        force: options.force,
        ttlMs: appDataCacheTtlMs
      });
    } catch {
      // Preloading must never block normal page use.
    }
  }

  if (options.notify) {
    notifyAppDataChanged("background-refresh");
  }
}

function buildPreloadPaths(session: Session): string[] {
  const isEmployee = session.roleCode === "employee";
  const paths = new Set<string>();

  paths.add(
    `/api/roles${buildQueryString({
      limit: 100,
      sortBy: "displayName",
      sortOrder: "asc"
    })}`
  );
  paths.add(
    `/api/users${buildQueryString({
      limit: 100,
      sortBy: "fullName",
      sortOrder: "asc",
      status: "active"
    })}`
  );
  paths.add(
    `/api/reports/tasks${buildQueryString({
      limit: 100,
      sortBy: "lastProgressUpdateAt",
      sortOrder: "desc"
    })}`
  );
  paths.add(
    `/api/sprints${buildQueryString({
      limit: 100,
      sortBy: "createdAt",
      sortOrder: "desc"
    })}`
  );

  if (!isEmployee) {
    paths.add("/api/dashboard/overview");
    paths.add("/api/project-progress");
  } else {
    paths.add(
      `/api/reports/tasks${buildQueryString({
        assignedTo: session.userId,
        limit: 100,
        sortBy: "dueDate",
        sortOrder: "asc"
      })}`
    );
  }

  return [...paths];
}

function startAppDataBackgroundRefresh(session: Session) {
  if (session.mustChangePassword) {
    stopAppDataBackgroundRefresh();
    return;
  }

  const sessionKey = `${session.userId}:${session.roleCode}`;

  if (appDataRefreshTimer && appDataRefreshSessionKey === sessionKey) {
    return;
  }

  stopAppDataBackgroundRefresh();
  appDataRefreshSessionKey = sessionKey;

  void preloadAppData(session).catch(() => undefined);

  appDataRefreshTimer = window.setInterval(() => {
    if (appDataRefreshPromise) {
      return;
    }

    appDataRefreshPromise = preloadAppData(session, {
      force: true,
      notify: true
    }).finally(() => {
      appDataRefreshPromise = undefined;
    });
  }, appDataBackgroundRefreshMs);
}

function stopAppDataBackgroundRefresh() {
  if (appDataRefreshTimer) {
    window.clearInterval(appDataRefreshTimer);
    appDataRefreshTimer = undefined;
  }

  appDataRefreshSessionKey = undefined;
}

function subscribeToAppDataChanges(
  listener: (event: AppDataChangedEvent) => void
): () => void {
  const eventListener = (event: Event) => {
    listener((event as CustomEvent<AppDataChangedEvent>).detail);
  };

  appDataEvents.addEventListener(appDataChangedEventName, eventListener);

  return () => {
    appDataEvents.removeEventListener(appDataChangedEventName, eventListener);
  };
}

export const api = {
  async getSession(): Promise<Session | null> {
    if (sessionRequestPromise) {
      return sessionRequestPromise;
    }

    sessionRequestPromise = request<MeResponse>("/api/auth/me")
      .then((response) => {
        if (!response.data.user) {
          return null;
        }

        return toSession(response.data.user, {});
      })
      .finally(() => {
        sessionRequestPromise = undefined;
      });

    return sessionRequestPromise;
  },

  async login(email: string, password: string): Promise<Session> {
    clearAppDataCache("cache-cleared");

    const response = await request<LoginResponse>("/api/auth/login", {
      body: JSON.stringify({ email, password }),
      method: "POST"
    });

    csrfToken = response.data.csrfToken;

    return toSession(response.data.user, {
      csrfToken: response.data.csrfToken,
      expiresAt: response.data.session.expiresAt
    });
  },

  async changePassword(payload: ChangePasswordPayload): Promise<Session> {
    const response = await request<ChangePasswordResponse>("/api/auth/change-password", {
      body: JSON.stringify(payload),
      method: "POST"
    });

    csrfToken = response.data.csrfToken;

    return toSession(response.data.user, {
      csrfToken: response.data.csrfToken,
      expiresAt: response.data.session.expiresAt
    });
  },

  async logout(): Promise<void> {
    await request<ApiSuccess<{ loggedOut: boolean }>>("/api/auth/logout", {
      method: "POST"
    });
    csrfToken = undefined;
    stopAppDataBackgroundRefresh();
    clearAppDataCache("cache-cleared");
  },

  clearCachedData(): void {
    clearAppDataCache("cache-cleared");
  },

  getDataVersion(): number {
    return appDataVersion;
  },

  preloadAppData(session: Session): Promise<void> {
    return preloadAppData(session);
  },

  startBackgroundSync(session: Session): void {
    startAppDataBackgroundRefresh(session);
  },

  stopBackgroundSync(): void {
    stopAppDataBackgroundRefresh();
  },

  subscribeToDataChanges(listener: (event: AppDataChangedEvent) => void): () => void {
    return subscribeToAppDataChanges(listener);
  },

  async getDashboardOverview(): Promise<DashboardOverview> {
    const response = await cachedRequest<DashboardOverviewResponse>(
      "/api/dashboard/overview"
    );

    return response.data.overview;
  },

  async getProjectProgress(): Promise<ProjectProgressRecord> {
    const response = await cachedRequest<ProjectProgressResponse>(
      "/api/project-progress"
    );

    return response.data.projectProgress;
  },

  async updateProjectProgress(
    payload: UpdateProjectProgressPayload
  ): Promise<ProjectProgressRecord> {
    const response = await request<ProjectProgressResponse>("/api/project-progress", {
      body: JSON.stringify(payload),
      method: "PATCH"
    });

    return response.data.projectProgress;
  },

  async getAuditLogs(params: AuditLogListParams = {}): Promise<PaginatedResult<AuditLogRecord>> {
    const response = await cachedRequest<AuditLogListResponse>(
      `/api/audit-logs${buildQueryString({
        action: params.action,
        actorId: params.actorId,
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
        entityId: params.entityId,
        entityType: params.entityType,
        limit: params.limit,
        page: params.page,
        search: params.search,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder
      })}`
    );

    return toPaginatedResult(response);
  },

  async getAuditLog(auditLogId: string): Promise<AuditLogRecord> {
    const response = await cachedRequest<AuditLogResponse>(`/api/audit-logs/${auditLogId}`);

    return response.data.auditLog;
  },

  async getTaskReport(params: TaskReportParams = {}): Promise<PaginatedResult<TaskReportRow>> {
    const response = await cachedRequest<TaskReportListResponse>(
      `/api/reports/tasks${buildQueryString({
        assignedTo: params.assignedTo,
        category: params.category,
        limit: params.limit,
        page: params.page,
        search: params.search,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
        status: params.status
      })}`
    );

    return toPaginatedResult(response);
  },

  async updateTaskProgress(
    taskId: string,
    payload: UpdateTaskProgressPayload
  ): Promise<TaskRecord> {
    const response = await request<TaskMutationResponse>(`/api/tasks/${taskId}/progress`, {
      body: JSON.stringify(payload),
      method: "POST"
    });

    return response.data.task;
  },

  async createSprintItem(payload: CreateSprintItemPayload): Promise<TaskRecord> {
    const response = await request<TaskMutationResponse>("/api/tasks", {
      body: JSON.stringify(payload),
      method: "POST"
    });

    return response.data.task;
  },

  async getSprintItem(taskId: string): Promise<TaskRecord> {
    const response = await cachedRequest<TaskMutationResponse>(`/api/tasks/${taskId}`);

    return response.data.task;
  },

  async getSprintItemUpdates(taskId: string): Promise<PaginatedResult<TaskUpdateRecord>> {
    const response = await cachedRequest<TaskUpdateListResponse>(
      `/api/tasks/${taskId}/updates${buildQueryString({
        limit: 20,
        sortBy: "createdAt",
        sortOrder: "desc"
      })}`
    );

    return toPaginatedResult(response);
  },

  async updateSprintItem(
    taskId: string,
    payload: UpdateSprintItemPayload
  ): Promise<TaskRecord> {
    const response = await request<TaskMutationResponse>(`/api/tasks/${taskId}`, {
      body: JSON.stringify(payload),
      method: "PATCH"
    });

    return response.data.task;
  },

  async reassignSprintItem(
    taskId: string,
    payload: ReassignSprintItemPayload
  ): Promise<TaskRecord> {
    const response = await request<TaskMutationResponse>(`/api/tasks/${taskId}/reassign`, {
      body: JSON.stringify(payload),
      method: "POST"
    });

    return response.data.task;
  },

  async changeTaskStatus(
    taskId: string,
    payload: ChangeTaskStatusPayload
  ): Promise<TaskRecord> {
    const response = await request<TaskMutationResponse>(`/api/tasks/${taskId}/status`, {
      body: JSON.stringify(payload),
      method: "PATCH"
    });

    return response.data.task;
  },

  async getSprints(params: SprintListParams = {}): Promise<PaginatedResult<SprintRecord>> {
    const response = await cachedRequest<SprintListResponse>(
      `/api/sprints${buildQueryString({
        limit: params.limit,
        ownerId: params.ownerId,
        page: params.page,
        search: params.search,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
        sprintArea: params.sprintArea,
        status: params.status
      })}`
    );

    return toPaginatedResult(response);
  },

  async createSprint(payload: CreateSprintPayload): Promise<SprintRecord> {
    const response = await request<SprintCreateResponse>("/api/sprints", {
      body: JSON.stringify(payload),
      method: "POST"
    });

    return response.data.sprint;
  },

  async updateSprint(
    sprintId: string,
    payload: UpdateSprintPayload
  ): Promise<SprintRecord> {
    const response = await request<SprintCreateResponse>(`/api/sprints/${sprintId}`, {
      body: JSON.stringify(payload),
      method: "PATCH"
    });

    return response.data.sprint;
  },

  async getRoles(params: ListParams = {}): Promise<PaginatedResult<RoleRecord>> {
    const response = await cachedRequest<RoleListResponse>(
      `/api/roles${buildQueryString({
        limit: params.limit,
        page: params.page,
        search: params.search,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder
      })}`
    );

    return toPaginatedResult(response);
  },

  async getUsers(params: UserListParams = {}): Promise<PaginatedResult<UserRecord>> {
    const response = await cachedRequest<UserListResponse>(
      `/api/users${buildQueryString({
        limit: params.limit,
        page: params.page,
        roleId: params.roleId,
        search: params.search,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
        status: params.status
      })}`
    );

    return toPaginatedResult(response);
  },

  async createUser(payload: CreateUserPayload): Promise<UserRecord> {
    const response = await request<UserMutationResponse>("/api/users", {
      body: JSON.stringify(payload),
      method: "POST"
    });

    return response.data.user;
  },

  async updateUser(userId: string, payload: UpdateUserPayload): Promise<UserRecord> {
    const response = await request<UserMutationResponse>(`/api/users/${userId}`, {
      body: JSON.stringify(payload),
      method: "PATCH"
    });

    return response.data.user;
  },

  async assignUserRole(
    userId: string,
    payload: AssignUserRolePayload
  ): Promise<UserRecord> {
    const response = await request<UserMutationResponse>(`/api/users/${userId}/role`, {
      body: JSON.stringify(payload),
      method: "PATCH"
    });

    return response.data.user;
  },

  async updateUserStatus(
    userId: string,
    payload: UpdateUserStatusPayload
  ): Promise<UserRecord> {
    const response = await request<UserMutationResponse>(`/api/users/${userId}/status`, {
      body: JSON.stringify(payload),
      method: "PATCH"
    });

    return response.data.user;
  },

  async resetUserPassword(
    userId: string,
    payload: ResetUserPasswordPayload
  ): Promise<UserRecord> {
    const response = await request<UserMutationResponse>(`/api/users/${userId}/password`, {
      body: JSON.stringify(payload),
      method: "PATCH"
    });

    return response.data.user;
  }
};
