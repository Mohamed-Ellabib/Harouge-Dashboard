import { Types } from "mongoose";

import { buildRequestVisibilityFilter } from "../../shared/auth/access-policies";
import type { AuthenticatedUserContext } from "../../shared/auth/auth-context";
import {
  buildTaskVisibilityFilterForActor,
  combineMongoFilters
} from "../../shared/auth/data-visibility";
import type { TaskStatus } from "../../shared/constants/task.constants";
import { buildSort, escapeRegex } from "../../shared/database";
import { AppError } from "../../shared/errors/app-error";
import {
  buildPaginationMeta,
  type PaginationMeta
} from "../../shared/pagination/pagination";
import {
  ItRequestModel,
  type ItRequestDocument
} from "../it-requests/request.model";
import { TaskModel, type TaskDocument } from "../tasks/task.model";
import { UserModel, type UserDocument } from "../users/user.model";

import type {
  ReportRequestReferenceDto,
  ReportUserReferenceDto,
  RequestReportRowDto,
  TaskReportRowDto
} from "./report.dto";
import type {
  RequestReportQuery,
  TaskReportQuery
} from "./report.validation";

export interface ReportActionContext {
  actor?: AuthenticatedUserContext;
}

export interface RequestReportResult {
  data: RequestReportRowDto[];
  pagination: PaginationMeta;
}

export interface TaskReportResult {
  data: TaskReportRowDto[];
  pagination: PaginationMeta;
}

const requestReportSortFields = [
  "closedAt",
  "createdAt",
  "priority",
  "requestCode",
  "requiredDate",
  "status",
  "title",
  "type"
] as const;

const taskReportSortFields = [
  "category",
  "completedAt",
  "createdAt",
  "dueDate",
  "lastProgressUpdateAt",
  "mainModule",
  "priority",
  "progress",
  "startDate",
  "status",
  "subModule",
  "taskCode",
  "title"
] as const;

const activeTaskStatuses: readonly TaskStatus[] = [
  "open",
  "assigned",
  "in_progress",
  "blocked",
  "waiting_review"
];

export async function listRequestReportRows(
  query: RequestReportQuery,
  context: ReportActionContext
): Promise<RequestReportResult> {
  const actor = getRequiredActor(context);
  const filter = combineMongoFilters(
    buildRequestReportFilter(query),
    buildRequestVisibilityFilter(actor)
  );
  const sort = buildSort(
    query.sortBy,
    query.sortOrder,
    requestReportSortFields,
    "createdAt"
  );
  const skip = (query.page - 1) * query.limit;
  const [requests, totalItems] = await Promise.all([
    ItRequestModel.find(filter).sort(sort).skip(skip).limit(query.limit),
    ItRequestModel.countDocuments(filter)
  ]);
  const usersById = await loadUserReferences(
    requests.flatMap((request) => [request.requestedBy, request.assignedTo])
  );

  return {
    data: requests.map((request) => serializeRequestReportRow(request, usersById)),
    pagination: buildPaginationMeta({
      limit: query.limit,
      page: query.page,
      totalItems
    })
  };
}

export async function listTaskReportRows(
  query: TaskReportQuery,
  context: ReportActionContext
): Promise<TaskReportResult> {
  const actor = getRequiredActor(context);
  const visibilityFilter =
    actor.roleKey === "employee" && !query.assignedTo
      ? {}
      : await buildTaskVisibilityFilterForActor(actor);
  const filter = combineMongoFilters(
    buildTaskReportFilter(query),
    visibilityFilter
  );
  const sort = buildSort(
    query.sortBy,
    query.sortOrder,
    taskReportSortFields,
    "createdAt"
  );
  const skip = (query.page - 1) * query.limit;
  const [tasks, totalItems] = await Promise.all([
    TaskModel.find(filter).sort(sort).skip(skip).limit(query.limit),
    TaskModel.countDocuments(filter)
  ]);
  const [usersById, requestsById] = await Promise.all([
    loadUserReferences(
      tasks.flatMap((task) => [
        ...(task.assigneeIds ?? []),
        task.assignedTo,
        task.createdBy,
        task.reviewedBy
      ])
    ),
    loadRequestReferences(tasks.map((task) => task.requestId))
  ]);

  return {
    data: tasks.map((task) =>
      serializeTaskReportRow(task, usersById, requestsById)
    ),
    pagination: buildPaginationMeta({
      limit: query.limit,
      page: query.page,
      totalItems
    })
  };
}

function buildRequestReportFilter(
  query: RequestReportQuery
): Record<string, unknown> {
  const directFilter: Record<string, unknown> = {};
  const filters: Record<string, unknown>[] = [];

  if (query.assignedTo) {
    const assignedTo = new Types.ObjectId(query.assignedTo);

    filters.push({
      $or: [{ assignedTo }, { assigneeIds: assignedTo }]
    });
  }

  if (query.priority) {
    directFilter.priority = query.priority;
  }

  if (query.requestedBy) {
    directFilter.requestedBy = new Types.ObjectId(query.requestedBy);
  }

  if (query.status) {
    directFilter.status = query.status;
  }

  if (query.type) {
    directFilter.type = query.type;
  }

  addDateRangeFilter(filters, "createdAt", query.dateFrom, query.dateTo);
  addDateRangeFilter(
    filters,
    "requiredDate",
    query.requiredDateFrom,
    query.requiredDateTo
  );
  addDateRangeFilter(
    filters,
    "closedAt",
    query.closedDateFrom,
    query.closedDateTo
  );

  if (query.search) {
    const regex = new RegExp(escapeRegex(query.search), "i");
    filters.push({
      $or: [
        { requestCode: regex },
        { title: regex },
        { requestedForDepartment: regex }
      ]
    });
  }

  return combineMongoFilters(directFilter, ...filters);
}

function buildTaskReportFilter(query: TaskReportQuery): Record<string, unknown> {
  const directFilter: Record<string, unknown> = {};
  const filters: Record<string, unknown>[] = [];

  if (query.assignedTo) {
    const assignedTo = new Types.ObjectId(query.assignedTo);

    filters.push({
      $or: [{ assignedTo }, { assigneeIds: assignedTo }]
    });
  }

  if (query.category) {
    directFilter.category = query.category;
  }

  if (query.createdBy) {
    directFilter.createdBy = new Types.ObjectId(query.createdBy);
  }

  if (query.priority) {
    directFilter.priority = query.priority;
  }

  if (query.mainModule) {
    directFilter.mainModule = query.mainModule;
  }

  if (query.requestId) {
    directFilter.requestId = new Types.ObjectId(query.requestId);
  }

  if (query.reviewedBy) {
    directFilter.reviewedBy = new Types.ObjectId(query.reviewedBy);
  }

  if (query.status) {
    directFilter.status = query.status;
  }

  if (query.subModule) {
    directFilter.subModule = query.subModule;
  }

  addDateRangeFilter(filters, "createdAt", query.dateFrom, query.dateTo);
  addDateRangeFilter(filters, "dueDate", query.dueDateFrom, query.dueDateTo);
  addDateRangeFilter(
    filters,
    "completedAt",
    query.completedDateFrom,
    query.completedDateTo
  );

  if (query.overdue === true) {
    filters.push({
      dueDate: { $lt: new Date() },
      status: { $in: activeTaskStatuses }
    });
  }

  if (query.overdue === false) {
    filters.push({
      $or: [
        { dueDate: { $exists: false } },
        { dueDate: { $gte: new Date() } },
        { status: { $nin: activeTaskStatuses } }
      ]
    });
  }

  if (query.search) {
    const regex = new RegExp(escapeRegex(query.search), "i");
    filters.push({
      $or: [
        { taskCode: regex },
        { title: regex },
        { category: regex },
        { mainModule: regex },
        { subModule: regex }
      ]
    });
  }

  return combineMongoFilters(directFilter, ...filters);
}

function addDateRangeFilter(
  filters: Record<string, unknown>[],
  field: string,
  from?: string,
  to?: string
): void {
  if (!from && !to) {
    return;
  }

  filters.push({
    [field]: {
      ...(from ? { $gte: new Date(from) } : {}),
      ...(to ? { $lte: new Date(to) } : {})
    }
  });
}

async function loadUserReferences(
  ids: Array<Types.ObjectId | undefined>
): Promise<Map<string, ReportUserReferenceDto>> {
  const objectIds = uniqueObjectIds(ids);

  if (objectIds.length === 0) {
    return new Map();
  }

  const users = await UserModel.find({ _id: { $in: objectIds } });

  return new Map(
    users.map((user) => [String(user._id), serializeUserReference(user)])
  );
}

async function loadRequestReferences(
  ids: Array<Types.ObjectId | undefined>
): Promise<Map<string, ReportRequestReferenceDto>> {
  const objectIds = uniqueObjectIds(ids);

  if (objectIds.length === 0) {
    return new Map();
  }

  const requests = await ItRequestModel.find({ _id: { $in: objectIds } });

  return new Map(
    requests.map((request) => [
      String(request._id),
      {
        id: String(request._id),
        requestCode: request.requestCode,
        title: request.title
      }
    ])
  );
}

function uniqueObjectIds(
  ids: Array<Types.ObjectId | undefined>
): Types.ObjectId[] {
  const uniqueIds = new Set(
    ids.filter((id): id is Types.ObjectId => Boolean(id)).map((id) => String(id))
  );

  return [...uniqueIds].map((id) => new Types.ObjectId(id));
}

function serializeUserReference(user: UserDocument): ReportUserReferenceDto {
  return {
    ...(user.department ? { department: user.department } : {}),
    email: user.email,
    fullName: user.fullName,
    id: String(user._id),
    ...(user.jobTitle ? { jobTitle: user.jobTitle } : {})
  };
}

function serializeRequestReportRow(
  request: ItRequestDocument,
  usersById: Map<string, ReportUserReferenceDto>
): RequestReportRowDto {
  return {
    ...(request.assignedTo
      ? { assignedTo: usersById.get(String(request.assignedTo)) }
      : {}),
    ...(request.closedAt ? { closedAt: request.closedAt } : {}),
    ...(request.createdAt ? { createdAt: request.createdAt } : {}),
    id: String(request._id),
    priority: request.priority,
    requestCode: request.requestCode,
    ...(request.requestedBy
      ? { requestedBy: usersById.get(String(request.requestedBy)) }
      : {}),
    ...(request.requestedForDepartment
      ? { requestedForDepartment: request.requestedForDepartment }
      : {}),
    ...(request.requiredDate ? { requiredDate: request.requiredDate } : {}),
    status: request.status,
    title: request.title,
    type: request.type
  };
}

function serializeTaskReportRow(
  task: TaskDocument,
  usersById: Map<string, ReportUserReferenceDto>,
  requestsById: Map<string, ReportRequestReferenceDto>
): TaskReportRowDto {
  const assigneeIds = getTaskAssigneeIds(task);
  const assignees = assigneeIds
    .map((assigneeId) => usersById.get(assigneeId))
    .filter((user): user is ReportUserReferenceDto => Boolean(user));

  return {
    assignees,
    ...(task.assignedTo
      ? { assignedTo: usersById.get(String(task.assignedTo)) }
      : {}),
    category: task.category,
    ...(task.completedAt ? { completedAt: task.completedAt } : {}),
    ...(task.createdAt ? { createdAt: task.createdAt } : {}),
    ...(task.createdBy
      ? { createdBy: usersById.get(String(task.createdBy)) }
      : {}),
    ...(task.dueDate ? { dueDate: task.dueDate } : {}),
    id: String(task._id),
    ...(task.lastProgressUpdateAt
      ? { lastProgressUpdateAt: task.lastProgressUpdateAt }
      : {}),
    ...(task.mainModule ? { mainModule: task.mainModule } : {}),
    priority: task.priority,
    progress: task.progress,
    ...(task.requestId
      ? { request: requestsById.get(String(task.requestId)) }
      : {}),
    ...(task.reviewedBy
      ? { reviewedBy: usersById.get(String(task.reviewedBy)) }
      : {}),
    ...(task.startDate ? { startDate: task.startDate } : {}),
    status: task.status,
    ...(task.subModule ? { subModule: task.subModule } : {}),
    taskCode: task.taskCode,
    title: task.title
  };
}

function getTaskAssigneeIds(task: TaskDocument): string[] {
  const assigneeIds = new Set(
    (task.assigneeIds ?? []).map((assigneeId) => String(assigneeId))
  );

  if (task.assignedTo) {
    assigneeIds.add(String(task.assignedTo));
  }

  return [...assigneeIds];
}

function getRequiredActor(context: ReportActionContext): AuthenticatedUserContext {
  if (!context.actor) {
    throw new AppError(401, "authentication_required", "Authentication is required");
  }

  return context.actor;
}
