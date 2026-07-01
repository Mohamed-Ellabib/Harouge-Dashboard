import { Types } from "mongoose";

import {
  buildRequestVisibilityFilter,
  isEnterpriseAdmin
} from "../../shared/auth/access-policies";
import type { AuthenticatedUserContext } from "../../shared/auth/auth-context";
import {
  buildTaskVisibilityFilterForActor,
  combineMongoFilters
} from "../../shared/auth/data-visibility";
import type { RequestStatus } from "../../shared/constants/request.constants";
import type { TaskStatus } from "../../shared/constants/task.constants";
import { AppError } from "../../shared/errors/app-error";
import { CommentModel } from "../comments/comment.model";
import { serializeComment } from "../comments/comment.dto";
import {
  ItRequestModel,
  type ItRequestDocument
} from "../it-requests/request.model";
import { TaskUpdateModel } from "../task-updates/task-update.model";
import { serializeTaskUpdate } from "../task-updates/task-update.dto";
import { TaskModel, type TaskDocument } from "../tasks/task.model";
import { UserModel, type UserDocument } from "../users/user.model";

import type {
  CountByValueDto,
  DashboardActivityDto,
  DashboardFocusItemDto,
  DashboardOverviewDto,
  DashboardRecentActivityItemDto,
  DashboardRecentRequestItemDto,
  DashboardSummaryDto,
  DashboardUserReferenceDto,
  DashboardWorkloadItemDto,
  DashboardWorkQueueItemDto,
  DashboardWeekWindowDto
} from "./dashboard.dto";
import type { DashboardActivityQuery } from "./dashboard.validation";

export interface DashboardActionContext {
  actor?: AuthenticatedUserContext;
}

const reportingTimezone = "Africa/Tripoli";
const openRequestStatuses: readonly RequestStatus[] = [
  "draft",
  "submitted",
  "assigned"
];
const activeTaskStatuses: readonly TaskStatus[] = [
  "open",
  "assigned",
  "in_progress",
  "blocked",
  "waiting_review"
];
const actionableRequestStatuses: readonly RequestStatus[] = [
  "draft",
  "submitted",
  "assigned",
  "in_progress"
];
const priorityScore: Record<string, number> = {
  urgent: 40,
  high: 30,
  medium: 20,
  low: 10
};

export async function getDashboardSummary(
  context: DashboardActionContext
): Promise<DashboardSummaryDto> {
  const actor = getRequiredActor(context);
  const generatedAt = new Date();
  const week = getCurrentWeekWindow(generatedAt, reportingTimezone);
  const requestVisibilityFilter = buildRequestVisibilityFilter(actor);
  const taskVisibilityFilter = await buildTaskVisibilityFilterForActor(actor);

  const [
    openRequests,
    requestsInProgress,
    closedRequestsThisWeek,
    requestsByStatus,
    requestsByPriority,
    requestsByType,
    activeTasks,
    overdueTasks,
    blockedTasks,
    waitingReviewTasks,
    completedTasksThisWeek,
    tasksByStatus,
    tasksByPriority,
    tasksByCategory,
    tasksByMainModule,
    averageTaskProgress,
    usersByStatus
  ] = await Promise.all([
    ItRequestModel.countDocuments(
      combineMongoFilters(requestVisibilityFilter, {
        status: { $in: openRequestStatuses }
      })
    ),
    ItRequestModel.countDocuments(
      combineMongoFilters(requestVisibilityFilter, { status: "in_progress" })
    ),
    ItRequestModel.countDocuments(
      combineMongoFilters(requestVisibilityFilter, {
        closedAt: { $gte: week.startAt, $lt: week.endAt },
        status: "closed"
      })
    ),
    countByValue(ItRequestModel, requestVisibilityFilter, "status"),
    countByValue(ItRequestModel, requestVisibilityFilter, "priority"),
    countByValue(ItRequestModel, requestVisibilityFilter, "type"),
    TaskModel.countDocuments(
      combineMongoFilters(taskVisibilityFilter, {
        status: { $in: activeTaskStatuses }
      })
    ),
    TaskModel.countDocuments(
      combineMongoFilters(taskVisibilityFilter, {
        dueDate: { $lt: generatedAt },
        status: { $in: activeTaskStatuses }
      })
    ),
    TaskModel.countDocuments(
      combineMongoFilters(taskVisibilityFilter, { status: "blocked" })
    ),
    TaskModel.countDocuments(
      combineMongoFilters(taskVisibilityFilter, { status: "waiting_review" })
    ),
    TaskModel.countDocuments(
      combineMongoFilters(taskVisibilityFilter, {
        completedAt: { $gte: week.startAt, $lt: week.endAt },
        status: "completed"
      })
    ),
    countByValue(TaskModel, taskVisibilityFilter, "status"),
    countByValue(TaskModel, taskVisibilityFilter, "priority"),
    countByValue(TaskModel, taskVisibilityFilter, "category"),
    countByExistingValue(TaskModel, taskVisibilityFilter, "mainModule"),
    averageNumber(TaskModel, taskVisibilityFilter, "progress"),
    isEnterpriseAdmin(actor) ? countByValue(UserModel, {}, "status") : undefined
  ]);

  return {
    generatedAt,
    requests: {
      byPriority: requestsByPriority,
      byStatus: requestsByStatus,
      byType: requestsByType,
      closedThisWeek: closedRequestsThisWeek,
      inProgress: requestsInProgress,
      open: openRequests
    },
    tasks: {
      active: activeTasks,
      averageProgress: averageTaskProgress,
      blocked: blockedTasks,
      byCategory: tasksByCategory,
      byMainModule: tasksByMainModule,
      byPriority: tasksByPriority,
      byStatus: tasksByStatus,
      completedThisWeek: completedTasksThisWeek,
      overdue: overdueTasks,
      waitingReview: waitingReviewTasks
    },
    timezone: reportingTimezone,
    ...(usersByStatus ? { users: { byStatus: usersByStatus } } : {}),
    week
  };
}

export async function getDashboardOverview(
  context: DashboardActionContext
): Promise<DashboardOverviewDto> {
  const actor = getRequiredActor(context);
  const generatedAt = new Date();
  const [summary, taskVisibilityFilter] = await Promise.all([
    getDashboardSummary({ actor }),
    buildTaskVisibilityFilterForActor(actor)
  ]);
  const requestVisibilityFilter = buildRequestVisibilityFilter(actor);

  const [focusItems, workQueue, workload, recentRequests, recentActivity] =
    await Promise.all([
      listDashboardFocusItems(
        requestVisibilityFilter,
        taskVisibilityFilter,
        generatedAt
      ),
      listDashboardWorkQueue(taskVisibilityFilter),
      listDashboardWorkload(taskVisibilityFilter, generatedAt),
      listDashboardRecentRequests(requestVisibilityFilter),
      listDashboardRecentActivity(actor)
    ]);

  return {
    focusItems,
    recentActivity,
    recentRequests,
    summary,
    workQueue,
    workload
  };
}

export async function getDashboardActivity(
  query: DashboardActivityQuery,
  context: DashboardActionContext
): Promise<DashboardActivityDto> {
  const actor = getRequiredActor(context);
  const [taskUpdateFilter, commentFilter] = await Promise.all([
    buildTaskUpdateActivityFilter(actor),
    buildCommentActivityFilter(actor)
  ]);

  const [taskUpdates, comments] = await Promise.all([
    TaskUpdateModel.find(taskUpdateFilter)
      .sort({ createdAt: -1 })
      .limit(query.limit),
    CommentModel.find(commentFilter).sort({ createdAt: -1 }).limit(query.limit)
  ]);

  return {
    comments: comments.map(serializeComment),
    taskUpdates: taskUpdates.map(serializeTaskUpdate)
  };
}

async function listDashboardFocusItems(
  requestVisibilityFilter: Record<string, unknown>,
  taskVisibilityFilter: Record<string, unknown>,
  now: Date
): Promise<DashboardFocusItemDto[]> {
  const [requests, tasks] = await Promise.all([
    ItRequestModel.find(
      combineMongoFilters(requestVisibilityFilter, {
        priority: { $in: ["urgent", "high"] },
        status: { $in: actionableRequestStatuses }
      })
    )
      .sort({ requiredDate: 1, createdAt: -1 })
      .limit(5),
    TaskModel.find(
      combineMongoFilters(taskVisibilityFilter, {
        $or: [
          { dueDate: { $lt: now } },
          { priority: { $in: ["urgent", "high"] } },
          { status: "blocked" }
        ],
        status: { $in: activeTaskStatuses }
      })
    )
      .sort({ dueDate: 1, createdAt: -1 })
      .limit(5)
  ]);

  return [
    ...requests.map(serializeFocusRequest),
    ...tasks.map(serializeFocusTask)
  ]
    .sort((left, right) => compareFocusItems(left, right, now))
    .slice(0, 5);
}

async function listDashboardWorkQueue(
  taskVisibilityFilter: Record<string, unknown>
): Promise<DashboardWorkQueueItemDto[]> {
  const tasks = await TaskModel.find(
    combineMongoFilters(taskVisibilityFilter, {
      status: { $in: activeTaskStatuses }
    })
  )
    .sort({ dueDate: 1, priority: -1, createdAt: -1 })
    .limit(5);
  const usersById = await loadDashboardUserReferences(
    tasks.flatMap((task) => [
      ...(task.assigneeIds ?? []),
      task.assignedTo
    ])
  );

  return tasks.map((task) => {
    const assignees = getTaskAssigneeIds(task)
      .map((assigneeId) => usersById.get(assigneeId))
      .filter((user): user is DashboardUserReferenceDto => Boolean(user));

    return {
      assignees,
      ...(task.assignedTo
        ? { assignedTo: usersById.get(String(task.assignedTo)) }
        : {}),
      category: task.category,
      ...(task.dueDate ? { dueDate: task.dueDate } : {}),
      id: String(task._id),
      ...(task.mainModule ? { mainModule: task.mainModule } : {}),
      priority: task.priority,
      progress: task.progress,
      status: task.status,
      ...(task.subModule ? { subModule: task.subModule } : {}),
      taskCode: task.taskCode,
      title: task.title
    };
  });
}

async function listDashboardWorkload(
  taskVisibilityFilter: Record<string, unknown>,
  now: Date
): Promise<DashboardWorkloadItemDto[]> {
  const workloadRows = await TaskModel.aggregate<{
    _id: Types.ObjectId;
    activeTaskCount: number;
    overdueTaskCount: number;
    urgentTaskCount: number;
  }>([
    {
      $match: combineMongoFilters(taskVisibilityFilter, {
        status: { $in: activeTaskStatuses }
      })
    },
    {
      $set: {
        workloadAssigneeIds: {
          $cond: [
            { $gt: [{ $size: { $ifNull: ["$assigneeIds", []] } }, 0] },
            "$assigneeIds",
            {
              $cond: [
                { $ifNull: ["$assignedTo", false] },
                ["$assignedTo"],
                []
              ]
            }
          ]
        }
      }
    },
    { $unwind: "$workloadAssigneeIds" },
    {
      $group: {
        _id: "$workloadAssigneeIds",
        activeTaskCount: { $sum: 1 },
        overdueTaskCount: {
          $sum: {
            $cond: [{ $lt: ["$dueDate", now] }, 1, 0]
          }
        },
        urgentTaskCount: {
          $sum: {
            $cond: [{ $in: ["$priority", ["urgent", "high"]] }, 1, 0]
          }
        }
      }
    },
    {
      $sort: {
        activeTaskCount: -1,
        overdueTaskCount: -1,
        urgentTaskCount: -1
      }
    },
    { $limit: 5 }
  ]);
  const usersById = await loadDashboardUserReferences(
    workloadRows.map((row) => row._id)
  );

  return workloadRows.flatMap((row) => {
    const user = usersById.get(String(row._id));

    if (!user) {
      return [];
    }

    const workloadPercent = calculateWorkloadPercent(row);

    return [
      {
        activeTaskCount: row.activeTaskCount,
        overdueTaskCount: row.overdueTaskCount,
        status: getWorkloadStatus(workloadPercent, row.overdueTaskCount),
        urgentTaskCount: row.urgentTaskCount,
        user,
        workloadPercent
      }
    ];
  });
}

async function listDashboardRecentRequests(
  requestVisibilityFilter: Record<string, unknown>
): Promise<DashboardRecentRequestItemDto[]> {
  const requests = await ItRequestModel.find(requestVisibilityFilter)
    .sort({ createdAt: -1 })
    .limit(5);
  const usersById = await loadDashboardUserReferences(
    requests.map((request) => request.requestedBy)
  );

  return requests.map((request) => ({
    ...(request.createdAt ? { createdAt: request.createdAt } : {}),
    id: String(request._id),
    priority: request.priority,
    ...(request.requestedBy
      ? { requestedBy: usersById.get(String(request.requestedBy)) }
      : {}),
    ...(request.requestedForDepartment
      ? { requestedForDepartment: request.requestedForDepartment }
      : {}),
    requestCode: request.requestCode,
    status: request.status,
    title: request.title
  }));
}

async function listDashboardRecentActivity(
  actor: AuthenticatedUserContext
): Promise<DashboardRecentActivityItemDto[]> {
  const [taskUpdateFilter, commentFilter] = await Promise.all([
    buildTaskUpdateActivityFilter(actor),
    buildCommentActivityFilter(actor)
  ]);
  const [taskUpdates, comments] = await Promise.all([
    TaskUpdateModel.find(taskUpdateFilter).sort({ createdAt: -1 }).limit(5),
    CommentModel.find(commentFilter).sort({ createdAt: -1 }).limit(5)
  ]);
  const [tasksById, requestsById, usersById] = await Promise.all([
    loadDashboardTaskReferences(taskUpdates.map((update) => update.taskId)),
    loadDashboardRequestReferences(comments.map((comment) => comment.requestId)),
    loadDashboardUserReferences([
      ...taskUpdates.map((update) => update.updatedBy),
      ...comments.map((comment) => comment.createdBy)
    ])
  ]);

  const updateItems: DashboardRecentActivityItemDto[] = taskUpdates.map(
    (update) => {
      const task = tasksById.get(String(update.taskId));
      const actorReference = update.updatedBy
        ? usersById.get(String(update.updatedBy))
        : undefined;

      return {
        ...(actorReference ? { actor: actorReference } : {}),
        ...(update.createdAt ? { createdAt: update.createdAt } : {}),
        id: String(update._id),
        message: buildTaskUpdateMessage(update, task, actorReference),
        ...(task ? { targetCode: task.taskCode } : {}),
        tone: getTaskUpdateTone(update.newStatus),
        type: "task_update"
      };
    }
  );
  const commentItems: DashboardRecentActivityItemDto[] = comments.map(
    (comment) => {
      const request = requestsById.get(String(comment.requestId));
      const actorReference = comment.createdBy
        ? usersById.get(String(comment.createdBy))
        : undefined;

      return {
        ...(actorReference ? { actor: actorReference } : {}),
        ...(comment.createdAt ? { createdAt: comment.createdAt } : {}),
        id: String(comment._id),
        message: buildCommentMessage(comment.isInternal, request, actorReference),
        ...(request ? { targetCode: request.requestCode } : {}),
        tone: comment.isInternal ? "orange" : "blue",
        type: "comment"
      };
    }
  );

  return [...updateItems, ...commentItems]
    .sort((left, right) => getTime(right.createdAt) - getTime(left.createdAt))
    .slice(0, 5);
}

async function countByValue(
  model: typeof ItRequestModel | typeof TaskModel | typeof UserModel,
  filter: Record<string, unknown>,
  field: string
): Promise<CountByValueDto[]> {
  const results = await model.aggregate<{ _id: string; count: number }>([
    { $match: filter },
    { $group: { _id: `$${field}`, count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]);

  return results.map((result) => ({
    count: result.count,
    value: result._id
  }));
}

async function countByExistingValue(
  model: typeof TaskModel,
  filter: Record<string, unknown>,
  field: string
): Promise<CountByValueDto[]> {
  return countByValue(
    model,
    combineMongoFilters(filter, {
      [field]: {
        $exists: true,
        $ne: ""
      }
    }),
    field
  );
}

async function averageNumber(
  model: typeof TaskModel,
  filter: Record<string, unknown>,
  field: string
): Promise<number> {
  const [result] = await model.aggregate<{ averageValue?: number }>([
    { $match: filter },
    { $group: { _id: null, averageValue: { $avg: `$${field}` } } }
  ]);

  return roundToTwoDecimals(result?.averageValue ?? 0);
}

async function buildTaskUpdateActivityFilter(
  actor: AuthenticatedUserContext
): Promise<Record<string, unknown>> {
  if (isEnterpriseAdmin(actor)) {
    return {};
  }

  const visibleTaskIds = await TaskModel.find(
    await buildTaskVisibilityFilterForActor(actor)
  )
    .select("_id")
    .lean();

  return {
    taskId: {
      $in: visibleTaskIds.map((task) => task._id)
    }
  };
}

async function buildCommentActivityFilter(
  actor: AuthenticatedUserContext
): Promise<Record<string, unknown>> {
  if (isEnterpriseAdmin(actor)) {
    return {};
  }

  const visibleRequests = await ItRequestModel.find(
    buildRequestVisibilityFilter(actor)
  )
    .select("_id")
    .lean();

  return {
    isInternal: false,
    requestId: {
      $in: visibleRequests.map((request) => request._id)
    }
  };
}

function getRequiredActor(
  context: DashboardActionContext
): AuthenticatedUserContext {
  if (!context.actor) {
    throw new AppError(401, "authentication_required", "Authentication is required");
  }

  return context.actor;
}

function getCurrentWeekWindow(
  date: Date,
  timeZone: string
): DashboardWeekWindowDto {
  const parts = getZonedDateParts(date, timeZone);
  const localDateAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day);
  const localDay = new Date(localDateAsUtc).getUTCDay();
  const daysSinceMonday = (localDay + 6) % 7;
  const mondayDate = new Date(localDateAsUtc - daysSinceMonday * 86_400_000);
  const nextMondayDate = new Date(localDateAsUtc + (7 - daysSinceMonday) * 86_400_000);

  return {
    endAt: zonedDateTimeToUtc(
      {
        day: nextMondayDate.getUTCDate(),
        hour: 0,
        minute: 0,
        month: nextMondayDate.getUTCMonth() + 1,
        second: 0,
        year: nextMondayDate.getUTCFullYear()
      },
      timeZone
    ),
    startAt: zonedDateTimeToUtc(
      {
        day: mondayDate.getUTCDate(),
        hour: 0,
        minute: 0,
        month: mondayDate.getUTCMonth() + 1,
        second: 0,
        year: mondayDate.getUTCFullYear()
      },
      timeZone
    )
  };
}

function getZonedDateParts(
  date: Date,
  timeZone: string
): {
  day: number;
  hour: number;
  minute: number;
  month: number;
  second: number;
  year: number;
} {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    month: "2-digit",
    second: "2-digit",
    timeZone,
    year: "numeric"
  });
  const parts = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)])
  ) as Record<string, number | undefined>;

  return {
    day: readDatePart(parts, "day"),
    hour: readDatePart(parts, "hour"),
    minute: readDatePart(parts, "minute"),
    month: readDatePart(parts, "month"),
    second: readDatePart(parts, "second"),
    year: readDatePart(parts, "year")
  };
}

function readDatePart(parts: Record<string, number | undefined>, key: string): number {
  const value = parts[key];

  if (value === undefined || Number.isNaN(value)) {
    throw new Error(`Missing timezone date part: ${key}`);
  }

  return value;
}

function zonedDateTimeToUtc(
  parts: {
    day: number;
    hour: number;
    minute: number;
    month: number;
    second: number;
    year: number;
  },
  timeZone: string
): Date {
  const utcGuess = new Date(
    Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second
    )
  );
  const firstOffset = getTimeZoneOffsetMs(utcGuess, timeZone);
  const firstUtc = new Date(utcGuess.getTime() - firstOffset);
  const secondOffset = getTimeZoneOffsetMs(firstUtc, timeZone);

  return new Date(utcGuess.getTime() - secondOffset);
}

function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = getZonedDateParts(date, timeZone);
  const localAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );

  return localAsUtc - date.getTime();
}

function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

function serializeFocusRequest(request: ItRequestDocument): DashboardFocusItemDto {
  return {
    ...(request.createdAt ? { createdAt: request.createdAt } : {}),
    ...(request.requestedForDepartment
      ? { department: request.requestedForDepartment }
      : {}),
    ...(request.requiredDate ? { dueAt: request.requiredDate } : {}),
    id: String(request._id),
    itemCode: request.requestCode,
    itemType: "request",
    priority: request.priority,
    status: request.status,
    title: request.title
  };
}

function serializeFocusTask(task: TaskDocument): DashboardFocusItemDto {
  return {
    ...(task.createdAt ? { createdAt: task.createdAt } : {}),
    ...(task.dueDate ? { dueAt: task.dueDate } : {}),
    department: task.category,
    id: String(task._id),
    itemCode: task.taskCode,
    itemType: "task",
    priority: task.priority,
    status: task.status,
    title: task.title
  };
}

function compareFocusItems(
  left: DashboardFocusItemDto,
  right: DashboardFocusItemDto,
  now: Date
): number {
  const scoreDifference = getFocusScore(right, now) - getFocusScore(left, now);

  if (scoreDifference !== 0) {
    return scoreDifference;
  }

  return getTime(left.dueAt ?? left.createdAt) - getTime(right.dueAt ?? right.createdAt);
}

function getFocusScore(item: DashboardFocusItemDto, now: Date): number {
  const dueAt = item.dueAt;
  const overdueBoost = dueAt && dueAt < now ? 18 : 0;
  const statusBoost =
    item.status === "blocked" ? 16 : item.status === "waiting_review" ? 8 : 0;

  return (priorityScore[item.priority] ?? 0) + overdueBoost + statusBoost;
}

function calculateWorkloadPercent(row: {
  activeTaskCount: number;
  overdueTaskCount: number;
  urgentTaskCount: number;
}): number {
  return Math.min(
    100,
    row.activeTaskCount * 22 + row.overdueTaskCount * 12 + row.urgentTaskCount * 8
  );
}

function getWorkloadStatus(
  workloadPercent: number,
  overdueTaskCount: number
): DashboardWorkloadItemDto["status"] {
  if (workloadPercent >= 85 || overdueTaskCount >= 2) {
    return "critical";
  }

  if (workloadPercent >= 65 || overdueTaskCount === 1) {
    return "warning";
  }

  return "healthy";
}

async function loadDashboardUserReferences(
  ids: Array<Types.ObjectId | undefined>
): Promise<Map<string, DashboardUserReferenceDto>> {
  const objectIds = uniqueObjectIds(ids);

  if (objectIds.length === 0) {
    return new Map();
  }

  const users = await UserModel.find({ _id: { $in: objectIds } });

  return new Map(
    users.map((user) => [String(user._id), serializeDashboardUser(user)])
  );
}

async function loadDashboardRequestReferences(
  ids: Array<Types.ObjectId | undefined>
): Promise<Map<string, { requestCode: string; title: string }>> {
  const objectIds = uniqueObjectIds(ids);

  if (objectIds.length === 0) {
    return new Map();
  }

  const requests = await ItRequestModel.find({ _id: { $in: objectIds } });

  return new Map(
    requests.map((request) => [
      String(request._id),
      {
        requestCode: request.requestCode,
        title: request.title
      }
    ])
  );
}

async function loadDashboardTaskReferences(
  ids: Array<Types.ObjectId | undefined>
): Promise<Map<string, { taskCode: string; title: string }>> {
  const objectIds = uniqueObjectIds(ids);

  if (objectIds.length === 0) {
    return new Map();
  }

  const tasks = await TaskModel.find({ _id: { $in: objectIds } });

  return new Map(
    tasks.map((task) => [
      String(task._id),
      {
        taskCode: task.taskCode,
        title: task.title
      }
    ])
  );
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

function uniqueObjectIds(ids: Array<Types.ObjectId | undefined>): Types.ObjectId[] {
  const uniqueIds = new Set(
    ids.filter((id): id is Types.ObjectId => Boolean(id)).map((id) => String(id))
  );

  return [...uniqueIds].map((id) => new Types.ObjectId(id));
}

function serializeDashboardUser(user: UserDocument): DashboardUserReferenceDto {
  return {
    ...(user.department ? { department: user.department } : {}),
    email: user.email,
    fullName: user.fullName,
    id: String(user._id),
    ...(user.jobTitle ? { jobTitle: user.jobTitle } : {})
  };
}

function buildTaskUpdateMessage(
  update: {
    newProgress?: number;
    newStatus?: TaskStatus;
  },
  task: { taskCode: string; title: string } | undefined,
  actor: DashboardUserReferenceDto | undefined
): string {
  const actorName = actor?.fullName ?? "A team member";
  const taskCode = task?.taskCode ?? "a task";

  if (update.newStatus === "completed") {
    return `${actorName} completed ${taskCode}`;
  }

  if (update.newStatus === "blocked") {
    return `${actorName} blocked ${taskCode}`;
  }

  if (update.newStatus === "waiting_review") {
    return `${actorName} moved ${taskCode} to review`;
  }

  if (update.newProgress !== undefined) {
    return `${actorName} updated ${taskCode} progress to ${update.newProgress}%`;
  }

  return `${actorName} updated ${taskCode}`;
}

function buildCommentMessage(
  isInternal: boolean,
  request: { requestCode: string; title: string } | undefined,
  actor: DashboardUserReferenceDto | undefined
): string {
  const actorName = actor?.fullName ?? "A team member";
  const requestCode = request?.requestCode ?? "a request";
  const visibility = isInternal ? "internal note" : "comment";

  return `${actorName} added an ${visibility} on ${requestCode}`;
}

function getTaskUpdateTone(
  status: TaskStatus | undefined
): DashboardRecentActivityItemDto["tone"] {
  if (status === "completed") {
    return "green";
  }

  if (status === "blocked") {
    return "red";
  }

  if (status === "waiting_review") {
    return "orange";
  }

  return "blue";
}

function getTime(date: Date | undefined): number {
  return date?.getTime() ?? 0;
}
