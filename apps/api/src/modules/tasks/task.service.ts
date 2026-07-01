import { Types } from "mongoose";

import { persistAuditLog } from "../../shared/audit/audit-log-recorder";
import type { AuditRequestContext } from "../../shared/audit/audit.types";
import {
  assertEnterpriseAdmin,
  assertCanMutateRequest,
  assertCanMutateTask,
  assertCanViewRequest,
  assertCanViewTask,
  buildRequestVisibilityFilter,
  buildTaskDirectVisibilityFilter,
  hasProgramReadVisibility,
  isEnterpriseAdmin
} from "../../shared/auth/access-policies";
import type { AuthenticatedUserContext } from "../../shared/auth/auth-context";
import type { TaskStatus } from "../../shared/constants/task.constants";
import {
  buildSort,
  escapeRegex,
  isDuplicateKeyError,
  runInTransaction
} from "../../shared/database";
import { AppError } from "../../shared/errors/app-error";
import {
  buildPaginationMeta,
  type PaginationMeta
} from "../../shared/pagination/pagination";
import { ItRequestModel, type ItRequestDocument } from "../it-requests/request.model";
import { TaskUpdateModel } from "../task-updates/task-update.model";
import {
  serializeTaskUpdate,
  type TaskUpdateDto
} from "../task-updates/task-update.dto";
import { UserModel } from "../users/user.model";

import { generateTaskCode } from "./task-code";
import { serializeTask, type TaskDto } from "./task.dto";
import { TaskModel, type TaskDocument } from "./task.model";
import type {
  ChangeTaskStatusBody,
  CreateTaskBody,
  ReassignTaskBody,
  TaskListQuery,
  TaskUpdateListQuery,
  UpdateTaskBody,
  UpdateTaskProgressBody
} from "./task.validation";

export interface TaskActionContext {
  actor?: AuthenticatedUserContext;
  auditContext?: AuditRequestContext;
}

export interface TaskListResult {
  data: TaskDto[];
  pagination: PaginationMeta;
}

export interface TaskUpdateListResult {
  data: TaskUpdateDto[];
  pagination: PaginationMeta;
}

export interface DeleteTaskResult {
  deletedTask: TaskDto;
  deletedTaskUpdateCount: number;
}

const allowedTaskSortFields = [
  "taskCode",
  "title",
  "status",
  "priority",
  "category",
  "mainModule",
  "subModule",
  "dueDate",
  "lastProgressUpdateAt",
  "createdAt",
  "updatedAt"
] as const;

const allowedTaskUpdateSortFields = ["createdAt"] as const;

const terminalTaskStatuses: readonly TaskStatus[] = ["completed", "cancelled"];

const taskStatusTransitions: Record<TaskStatus, readonly TaskStatus[]> = {
  assigned: ["in_progress", "blocked", "cancelled"],
  blocked: ["assigned", "in_progress", "waiting_review", "cancelled"],
  cancelled: ["open", "in_progress"],
  completed: ["in_progress", "cancelled"],
  in_progress: ["blocked", "waiting_review", "completed", "cancelled"],
  open: ["assigned", "in_progress", "blocked", "cancelled"],
  waiting_review: ["in_progress", "completed", "blocked", "cancelled"]
};

export async function listTasks(
  query: TaskListQuery,
  context: TaskActionContext
): Promise<TaskListResult> {
  const actor = getRequiredActor(context);
  const filter = combineFilters(
    buildTaskFilter(query),
    await buildTaskVisibilityFilter(actor)
  );
  const sort = buildSort(
    query.sortBy,
    query.sortOrder,
    allowedTaskSortFields,
    "createdAt"
  );
  const skip = (query.page - 1) * query.limit;
  const [tasks, totalItems] = await Promise.all([
    TaskModel.find(filter).sort(sort).skip(skip).limit(query.limit),
    TaskModel.countDocuments(filter)
  ]);

  return {
    data: tasks.map(serializeTask),
    pagination: buildPaginationMeta({
      limit: query.limit,
      page: query.page,
      totalItems
    })
  };
}

export async function createTask(
  body: CreateTaskBody,
  context: TaskActionContext
): Promise<TaskDto> {
  const actor = getRequiredActor(context);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await runInTransaction(async () => {
        const linkedRequest = body.requestId
          ? await getRequestForTaskCreation(body.requestId, actor)
          : undefined;

        const assigneeIds = normalizeAssigneeIds(body);

        await assertActiveUsersExist(assigneeIds, "assigned_user_not_found");

        const task = await TaskModel.create({
          ...(assigneeIds.length > 0
            ? {
                assigneeIds: assigneeIds.map((assigneeId) => new Types.ObjectId(assigneeId)),
                assignedTo: new Types.ObjectId(assigneeIds[0])
              }
            : {}),
          category: body.category,
          createdBy: new Types.ObjectId(actor.id),
          ...(body.description ? { description: body.description } : {}),
          ...(body.dueDate ? { dueDate: new Date(body.dueDate) } : {}),
          ...(body.mainModule ? { mainModule: body.mainModule } : {}),
          priority: body.priority,
          progress: 0,
          ...(linkedRequest ? { requestId: linkedRequest._id } : {}),
          ...(body.startDate ? { startDate: new Date(body.startDate) } : {}),
          status: "open",
          ...(body.subModule ? { subModule: body.subModule } : {}),
          taskCode: await generateTaskCode(),
          title: body.title
        });
        const taskUpdate = await createTaskUpdate(task, actor.id, {
          note: "Task created"
        });
        const serializedTask = serializeTask(task);

        await persistAuditLog({
          action: "create",
          actorId: actor.id,
          context: context.auditContext,
          entityId: serializedTask.id,
          entityType: "task",
          newValue: serializedTask
        });

        await persistAuditLog({
          action: "create",
          actorId: actor.id,
          context: context.auditContext,
          entityId: String(taskUpdate.id),
          entityType: "task_update",
          newValue: taskUpdate
        });

        return serializedTask;
      });
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        continue;
      }

      throw error;
    }
  }

  throw new AppError(
    503,
    "task_code_generation_failed",
    "Unable to generate a unique task code"
  );
}

export async function getTaskByIdForActor(
  id: string,
  context: TaskActionContext
): Promise<TaskDto> {
  const task = await findTaskOrThrow(id);
  const linkedRequest = await findLinkedRequest(task);
  assertCanViewTask(task, context.actor, linkedRequest);

  return serializeTask(task);
}

export async function deleteTask(
  id: string,
  context: TaskActionContext
): Promise<DeleteTaskResult> {
  return runInTransaction(async () => {
    const actor = getRequiredActor(context);
    assertEnterpriseAdmin(actor, "Task deletion requires administrator access");

    const task = await findTaskOrThrow(id);
    const deletedTask = serializeTask(task);
    const deletedTaskUpdates = await TaskUpdateModel.deleteMany({
      taskId: task._id
    });

    await task.deleteOne();

    await persistAuditLog({
      action: "delete",
      actorId: actor.id,
      context: context.auditContext,
      entityId: deletedTask.id,
      entityType: "task",
      newValue: {
        deleted: true,
        deletedTaskUpdateCount: deletedTaskUpdates.deletedCount ?? 0
      },
      oldValue: deletedTask
    });

    return {
      deletedTask,
      deletedTaskUpdateCount: deletedTaskUpdates.deletedCount ?? 0
    };
  });
}

export async function updateTask(
  id: string,
  body: UpdateTaskBody,
  context: TaskActionContext
): Promise<TaskDto> {
  return runInTransaction(async () => {
    const task = await findTaskOrThrow(id);
    const linkedRequest = await findLinkedRequest(task);
    assertCanMutateTask(task, context.actor, "update", linkedRequest);
    assertManagerOrSupervisor(context.actor, "Task metadata update denied");

    const oldValue = serializeTask(task);

    if (body.category !== undefined) {
      task.category = body.category;
    }

    if (body.description !== undefined) {
      task.description = body.description;
    } else if (Object.prototype.hasOwnProperty.call(body, "description")) {
      task.set("description", undefined);
    }

    if (body.dueDate !== undefined) {
      if (body.dueDate) {
        task.dueDate = new Date(body.dueDate);
      } else {
        task.set("dueDate", undefined);
      }
    }

    applyOptionalStringUpdate(task, "mainModule", body, "mainModule");

    if (body.priority !== undefined) {
      task.priority = body.priority;
    }

    if (body.startDate !== undefined) {
      if (body.startDate) {
        task.startDate = new Date(body.startDate);
      } else {
        task.set("startDate", undefined);
      }
    }

    if (body.title !== undefined) {
      task.title = body.title;
    }

    applyOptionalStringUpdate(task, "subModule", body, "subModule");

    await task.save();
    const newValue = serializeTask(task);

    await persistAuditLog({
      action: "update",
      actorId: context.actor?.id,
      context: context.auditContext,
      entityId: newValue.id,
      entityType: "task",
      newValue,
      oldValue
    });

    return newValue;
  });
}

export async function reassignTask(
  id: string,
  body: ReassignTaskBody,
  context: TaskActionContext
): Promise<TaskDto> {
  return runInTransaction(async () => {
    const task = await findTaskOrThrow(id);
    const linkedRequest = await findLinkedRequest(task);
    assertCanMutateTask(task, context.actor, "assign", linkedRequest);
    assertManagerOrSupervisor(context.actor, "Task assignment denied");

    const assigneeIds = normalizeAssigneeIds(body);

    await assertActiveUsersExist(assigneeIds, "assigned_user_not_found");

    const oldValue = serializeTask(task);

    if (assigneeIds.length > 0) {
      task.assigneeIds = assigneeIds.map((assigneeId) => new Types.ObjectId(assigneeId));
      task.assignedTo = new Types.ObjectId(assigneeIds[0]);
    } else {
      task.assigneeIds = [];
      task.set("assignedTo", undefined);
    }

    await task.save();
    const newValue = serializeTask(task);

    await persistAuditLog({
      action: "assign",
      actorId: context.actor?.id,
      context: context.auditContext,
      entityId: newValue.id,
      entityType: "task",
      newValue,
      oldValue
    });

    return newValue;
  });
}

export async function changeTaskStatus(
  id: string,
  body: ChangeTaskStatusBody,
  context: TaskActionContext
): Promise<TaskDto> {
  return runInTransaction(async () => {
    const task = await findTaskOrThrow(id);
    const linkedRequest = await findLinkedRequest(task);

    assertCanMutateTask(task, context.actor, "change_status", linkedRequest);

    assertValidTaskStatusTransition(task, body, context.actor);

    const previousProgress = task.progress;
    const previousStatus = task.status;
    const oldValue = serializeTask(task);

    task.status = body.status;

    if (body.status === "blocked") {
      task.blockedReason = body.blockedReason ?? task.blockedReason;
    } else {
      task.set("blockedReason", undefined);
    }

    if (body.status === "in_progress" && !task.startDate) {
      task.startDate = new Date();
    }

    if (body.status === "completed") {
      task.completedAt = new Date();
      task.reviewedBy = new Types.ObjectId(getRequiredActor(context).id);
    } else if (previousStatus === "completed") {
      task.set("completedAt", undefined);
      task.set("reviewedBy", undefined);
    }

    await task.save();

    const taskUpdate = await createTaskUpdate(task, context.actor?.id, {
      note: body.note,
      previousProgress,
      previousStatus
    });
    const newValue = serializeTask(task);

    await persistAuditLog({
      action: "change_status",
      actorId: context.actor?.id,
      context: context.auditContext,
      entityId: newValue.id,
      entityType: "task",
      newValue,
      oldValue
    });

    await persistAuditLog({
      action: "create",
      actorId: context.actor?.id,
      context: context.auditContext,
      entityId: taskUpdate.id,
      entityType: "task_update",
      newValue: taskUpdate
    });

    return newValue;
  });
}

export async function updateTaskProgress(
  id: string,
  body: UpdateTaskProgressBody,
  context: TaskActionContext
): Promise<TaskDto> {
  return runInTransaction(async () => {
    const actor = getRequiredActor(context);
    const task = await findTaskOrThrow(id);
    const linkedRequest = await findLinkedRequest(task);
    assertCanMutateTask(task, actor, "progress", linkedRequest);
    assertValidProgressUpdate(task, body.progress, actor);

    const previousProgress = task.progress;
    const previousStatus = task.status;
    const oldValue = serializeTask(task);

    task.progress = body.progress;
    task.lastProgressUpdateAt = new Date();

    applyProgressDrivenStatus(task, body.progress, actor);

    if (
      previousProgress === task.progress &&
      previousStatus === task.status &&
      !body.note
    ) {
      throw new AppError(
        400,
        "task_progress_update_no_change",
        "Progress update must change progress or include a note"
      );
    }

    await task.save();

    const taskUpdate = await createTaskUpdate(task, context.actor?.id, {
      note: body.note,
      previousProgress,
      previousStatus
    });
    const newValue = serializeTask(task);

    await persistAuditLog({
      action: "update",
      actorId: actor.id,
      context: context.auditContext,
      entityId: newValue.id,
      entityType: "task",
      newValue,
      oldValue
    });

    await persistAuditLog({
      action: "create",
      actorId: actor.id,
      context: context.auditContext,
      entityId: taskUpdate.id,
      entityType: "task_update",
      newValue: taskUpdate
    });

    return newValue;
  });
}

export async function listTaskUpdates(
  taskId: string,
  query: TaskUpdateListQuery,
  context: TaskActionContext
): Promise<TaskUpdateListResult> {
  const task = await findTaskOrThrow(taskId);
  const linkedRequest = await findLinkedRequest(task);
  assertCanViewTask(task, context.actor, linkedRequest);

  const filter: Record<string, unknown> = {
    taskId: new Types.ObjectId(taskId)
  };

  if (query.search) {
    filter.note = new RegExp(escapeRegex(query.search), "i");
  }

  if (query.dateFrom || query.dateTo) {
    filter.createdAt = {
      ...(query.dateFrom ? { $gte: new Date(query.dateFrom) } : {}),
      ...(query.dateTo ? { $lte: new Date(query.dateTo) } : {})
    };
  }

  const sort = buildSort(
    query.sortBy,
    query.sortOrder,
    allowedTaskUpdateSortFields,
    "createdAt"
  );
  const skip = (query.page - 1) * query.limit;
  const [taskUpdates, totalItems] = await Promise.all([
    TaskUpdateModel.find(filter).sort(sort).skip(skip).limit(query.limit),
    TaskUpdateModel.countDocuments(filter)
  ]);

  return {
    data: taskUpdates.map(serializeTaskUpdate),
    pagination: buildPaginationMeta({
      limit: query.limit,
      page: query.page,
      totalItems
    })
  };
}

function buildTaskFilter(query: TaskListQuery): Record<string, unknown> {
  const filter: Record<string, unknown> = {};

  if (query.assignedTo) {
    const assignedTo = new Types.ObjectId(query.assignedTo);

    addAndCondition(filter, {
      $or: [{ assignedTo }, { assigneeIds: assignedTo }]
    });
  }

  if (query.category) {
    filter.category = query.category;
  }

  if (query.createdBy) {
    filter.createdBy = new Types.ObjectId(query.createdBy);
  }

  if (query.priority) {
    filter.priority = query.priority;
  }

  if (query.mainModule) {
    filter.mainModule = query.mainModule;
  }

  if (query.requestId) {
    filter.requestId = new Types.ObjectId(query.requestId);
  }

  if (query.status) {
    filter.status = query.status;
  }

  if (query.subModule) {
    filter.subModule = query.subModule;
  }

  if (query.dateFrom || query.dateTo) {
    filter.createdAt = {
      ...(query.dateFrom ? { $gte: new Date(query.dateFrom) } : {}),
      ...(query.dateTo ? { $lte: new Date(query.dateTo) } : {})
    };
  }

  if (query.dueDateFrom || query.dueDateTo) {
    filter.dueDate = {
      ...(query.dueDateFrom ? { $gte: new Date(query.dueDateFrom) } : {}),
      ...(query.dueDateTo ? { $lte: new Date(query.dueDateTo) } : {})
    };
  }

  if (query.overdue === true) {
    addAndCondition(filter, { status: { $nin: terminalTaskStatuses } });
    addAndCondition(filter, {
      dueDate: { ...(filter.dueDate as object), $lt: new Date() }
    });
    delete filter.dueDate;
  }

  if (query.overdue === false) {
    addAndCondition(filter, {
      $or: [
        { dueDate: { $exists: false } },
        { dueDate: { $gte: new Date() } },
        { status: { $in: terminalTaskStatuses } }
      ]
    });
  }

  if (query.search) {
    const regex = new RegExp(escapeRegex(query.search), "i");
    addAndCondition(filter, {
      $or: [
        { taskCode: regex },
        { title: regex },
        { description: regex },
        { blockedReason: regex },
        { mainModule: regex },
        { subModule: regex }
      ]
    });
  }

  return filter;
}

async function buildTaskVisibilityFilter(
  actor: AuthenticatedUserContext
): Promise<Record<string, unknown>> {
  if (hasProgramReadVisibility(actor)) {
    return {};
  }

  const directFilter = buildTaskDirectVisibilityFilter(actor);
  const clauses = extractOrClauses(directFilter);
  const visibleRequests = await ItRequestModel.find(
    buildRequestVisibilityFilter(actor)
  )
    .select("_id")
    .lean();

  if (visibleRequests.length > 0) {
    clauses.push({
      requestId: {
        $in: visibleRequests.map((request) => request._id)
      }
    });
  }

  return {
    $or: clauses
  };
}

function combineFilters(
  firstFilter: Record<string, unknown>,
  secondFilter: Record<string, unknown>
): Record<string, unknown> {
  if (Object.keys(firstFilter).length === 0) {
    return secondFilter;
  }

  if (Object.keys(secondFilter).length === 0) {
    return firstFilter;
  }

  return {
    $and: [firstFilter, secondFilter]
  };
}

function extractOrClauses(filter: Record<string, unknown>): Record<string, unknown>[] {
  const clauses = filter.$or;

  if (Array.isArray(clauses)) {
    return clauses as Record<string, unknown>[];
  }

  return [filter];
}

function addAndCondition(
  filter: Record<string, unknown>,
  condition: Record<string, unknown>
): void {
  const existingConditions = filter.$and;

  if (Array.isArray(existingConditions)) {
    existingConditions.push(condition);
    return;
  }

  filter.$and = [condition];
}

function applyOptionalStringUpdate<TField extends "mainModule" | "subModule">(
  task: TaskDocument,
  taskField: TField,
  body: UpdateTaskBody,
  bodyField: TField
): void {
  if (body[bodyField] !== undefined) {
    task[taskField] = body[bodyField];
    return;
  }

  if (Object.prototype.hasOwnProperty.call(body, bodyField)) {
    task.set(taskField, undefined);
  }
}

async function findTaskOrThrow(id: string): Promise<TaskDocument> {
  const task = await TaskModel.findById(id);

  if (!task) {
    throw new AppError(404, "task_not_found", "Task not found");
  }

  return task;
}

async function findLinkedRequest(
  task: TaskDocument
): Promise<ItRequestDocument | null> {
  if (!task.requestId) {
    return null;
  }

  return ItRequestModel.findById(task.requestId);
}

async function getRequestForTaskCreation(
  requestId: string,
  actor: AuthenticatedUserContext
): Promise<ItRequestDocument> {
  const request = await ItRequestModel.findById(requestId);

  if (!request) {
    throw new AppError(404, "request_not_found", "Request not found");
  }

  assertCanViewRequest(request, actor);

  if (request.status !== "closed") {
    assertCanMutateRequest(request, actor, "update");
  } else if (!isEnterpriseAdmin(actor)) {
    throw new AppError(
      403,
      "closed_request_locked",
      "Closed requests can only be changed by Super Admin or IT Manager"
    );
  }

  return request;
}

async function assertActiveUsersExist(
  userIds: string[],
  errorCode: string
): Promise<void> {
  if (userIds.length === 0) {
    return;
  }

  const activeUserCount = await UserModel.countDocuments({
    _id: { $in: userIds.map((userId) => new Types.ObjectId(userId)) },
    status: "active"
  });

  if (activeUserCount !== userIds.length) {
    throw new AppError(
      404,
      errorCode,
      "One or more assigned users were not found or are not active"
    );
  }
}

function normalizeAssigneeIds(
  body: Pick<CreateTaskBody | ReassignTaskBody, "assigneeIds" | "assignedTo">
): string[] {
  const assigneeIds = body.assigneeIds ?? (body.assignedTo ? [body.assignedTo] : []);
  const normalizedAssigneeIds = new Set<string>();

  if (body.assignedTo) {
    normalizedAssigneeIds.add(body.assignedTo);
  }

  for (const assigneeId of assigneeIds) {
    normalizedAssigneeIds.add(assigneeId);
  }

  return [...normalizedAssigneeIds];
}

function assertValidTaskStatusTransition(
  task: TaskDocument,
  body: ChangeTaskStatusBody,
  actor: AuthenticatedUserContext | undefined
): void {
  if (task.status === body.status) {
    if (body.status === "blocked" && !body.blockedReason && !task.blockedReason) {
      throw new AppError(
        400,
        "blocked_reason_required",
        "Blocked tasks require a blocked reason"
      );
    }

    return;
  }

  const canOverrideTransition =
    actor?.roleKey === "supervisor" || isEnterpriseAdmin(actor);

  if (
    !canOverrideTransition &&
    !taskStatusTransitions[task.status].includes(body.status)
  ) {
    throw new AppError(
      400,
      "invalid_task_status_transition",
      `Cannot change task status from ${task.status} to ${body.status}`
    );
  }

  if (body.status === "completed" && task.progress !== 100) {
    throw new AppError(
      400,
      "task_completion_requires_full_progress",
      "Task progress must be 100 before completion"
    );
  }

  if (body.status === "assigned" && task.progress !== 0) {
    throw new AppError(
      400,
      "task_assignment_requires_zero_progress",
      "Assigned tasks must have progress 0"
    );
  }

  if (body.status === "waiting_review" && task.progress !== 100) {
    throw new AppError(
      400,
      "task_review_requires_full_progress",
      "Task progress must be 100 before waiting review"
    );
  }

  if (body.status === "blocked" && !body.blockedReason && !task.blockedReason) {
    throw new AppError(
      400,
      "blocked_reason_required",
      "Blocked tasks require a blocked reason"
    );
  }

  if (
    body.status === "cancelled" &&
    actor?.roleKey !== "supervisor" &&
    !isEnterpriseAdmin(actor)
  ) {
    throw new AppError(403, "task_cancel_denied", "Task cancellation denied");
  }
}

function applyProgressDrivenStatus(
  task: TaskDocument,
  progress: number,
  actor: AuthenticatedUserContext
): void {
  if (task.status === "cancelled") {
    return;
  }

  if (progress === 100) {
    task.status = "completed";
    task.completedAt = new Date();
    task.reviewedBy = new Types.ObjectId(actor.id);
    task.set("blockedReason", undefined);
    return;
  }

  if (task.status === "completed" || task.status === "waiting_review") {
    task.status = progress > 0 ? "in_progress" : "open";
    clearTaskCompletion(task);
  } else if ((task.status === "open" || task.status === "assigned") && progress > 0) {
    task.status = "in_progress";
  } else if (task.status === "in_progress" && progress === 0) {
    task.status = "open";
  }

  clearTaskCompletion(task);

  if (task.status === "in_progress" && !task.startDate) {
    task.startDate = new Date();
  }
}

function clearTaskCompletion(task: TaskDocument): void {
  task.set("completedAt", undefined);
  task.set("reviewedBy", undefined);
}

function assertValidProgressUpdate(
  task: TaskDocument,
  progress: number,
  actor: AuthenticatedUserContext
): void {
  if (isEnterpriseAdmin(actor)) {
    return;
  }

  if (task.status === "completed" && progress !== 100) {
    throw new AppError(
      400,
      "completed_task_progress_locked",
      "Completed task progress must remain 100"
    );
  }

  if (task.status === "waiting_review" && progress !== 100) {
    throw new AppError(
      400,
      "waiting_review_progress_locked",
      "Task progress must remain 100 while waiting review"
    );
  }
}

function assertManagerOrSupervisor(
  actor: AuthenticatedUserContext | undefined,
  message: string
): asserts actor is AuthenticatedUserContext {
  if (!actor) {
    throw new AppError(401, "authentication_required", "Authentication is required");
  }

  if (isEnterpriseAdmin(actor) || actor.roleKey === "supervisor") {
    return;
  }

  throw new AppError(403, "task_manager_access_required", message);
}

async function createTaskUpdate(
  task: TaskDocument,
  actorId: string | undefined,
  options: {
    note?: string;
    previousProgress?: number;
    previousStatus?: TaskStatus;
  }
): Promise<TaskUpdateDto> {
  const taskUpdate = await TaskUpdateModel.create({
    ...(task.progress !== undefined ? { newProgress: task.progress } : {}),
    newStatus: task.status,
    ...(options.note ? { note: options.note } : {}),
    ...(options.previousProgress !== undefined
      ? { previousProgress: options.previousProgress }
      : {}),
    ...(options.previousStatus ? { previousStatus: options.previousStatus } : {}),
    taskId: task._id,
    ...(actorId ? { updatedBy: new Types.ObjectId(actorId) } : {})
  });

  return serializeTaskUpdate(taskUpdate);
}

function getRequiredActor(context: TaskActionContext): AuthenticatedUserContext {
  if (!context.actor) {
    throw new AppError(401, "authentication_required", "Authentication is required");
  }

  return context.actor;
}
