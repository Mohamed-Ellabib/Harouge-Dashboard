import { Types } from "mongoose";

import type { ItRequestDocument } from "../../modules/it-requests/request.model";
import type { TaskDocument } from "../../modules/tasks/task.model";
import type { UserDocument } from "../../modules/users/user.model";
import { AppError } from "../errors/app-error";
import type { AuthenticatedUserContext } from "./auth-context";

export type RequestMutationAction =
  | "assign"
  | "change_status"
  | "comment"
  | "update";

export type TaskMutationAction =
  | "assign"
  | "change_status"
  | "progress"
  | "review"
  | "update";

export function isEnterpriseAdmin(
  user: AuthenticatedUserContext | undefined
): boolean {
  return user?.roleKey === "super_admin" || user?.roleKey === "it_manager";
}

export function assertEnterpriseAdmin(
  user: AuthenticatedUserContext | undefined,
  message = "Administrative access is required"
): asserts user is AuthenticatedUserContext {
  if (!user || !isEnterpriseAdmin(user)) {
    throw new AppError(403, "admin_access_required", message);
  }
}

export function assertSuperAdmin(
  user: AuthenticatedUserContext | undefined,
  message = "Super Admin access is required"
): asserts user is AuthenticatedUserContext {
  if (!user || user.roleKey !== "super_admin") {
    throw new AppError(403, "super_admin_access_required", message);
  }
}

export function buildRequestVisibilityFilter(
  user: AuthenticatedUserContext
): Record<string, unknown> {
  if (isEnterpriseAdmin(user)) {
    return {};
  }

  const userObjectId = new Types.ObjectId(user.id);
  const clauses: Record<string, unknown>[] = [
    { requestedBy: userObjectId },
    { assignedTo: userObjectId }
  ];

  if (user.roleKey === "supervisor" && user.department) {
    clauses.push({ requestedForDepartment: user.department });
  }

  return {
    $or: clauses
  };
}

export function assertCanViewRequest(
  request: ItRequestDocument,
  user: AuthenticatedUserContext | undefined
): asserts user is AuthenticatedUserContext {
  if (!user) {
    throw new AppError(401, "authentication_required", "Authentication is required");
  }

  if (isEnterpriseAdmin(user)) {
    return;
  }

  const userId = user.id;
  const requestedBy = request.requestedBy ? String(request.requestedBy) : undefined;
  const assignedTo = request.assignedTo ? String(request.assignedTo) : undefined;

  if (requestedBy === userId || assignedTo === userId) {
    return;
  }

  if (
    user.roleKey === "supervisor" &&
    user.department &&
    request.requestedForDepartment === user.department
  ) {
    return;
  }

  throw new AppError(403, "request_access_denied", "Request access denied");
}

export function assertCanMutateRequest(
  request: ItRequestDocument,
  user: AuthenticatedUserContext | undefined,
  action: RequestMutationAction
): asserts user is AuthenticatedUserContext {
  assertCanViewRequest(request, user);

  if (isEnterpriseAdmin(user)) {
    return;
  }

  if (request.status === "closed") {
    throw new AppError(
      403,
      "closed_request_locked",
      "Closed requests can only be changed by Super Admin or IT Manager"
    );
  }

  if (action === "comment") {
    return;
  }

  if (user.roleKey === "supervisor") {
    return;
  }

  throw new AppError(403, "request_mutation_denied", "Request update denied");
}

export function assertCanUseInternalComments(
  user: AuthenticatedUserContext | undefined
): asserts user is AuthenticatedUserContext {
  assertEnterpriseAdmin(user, "Internal comments require manager access");
}

export function buildTaskDirectVisibilityFilter(
  user: AuthenticatedUserContext
): Record<string, unknown> {
  if (isEnterpriseAdmin(user)) {
    return {};
  }

  const userObjectId = new Types.ObjectId(user.id);

  return {
    $or: [
      { assignedTo: userObjectId },
      { assigneeIds: userObjectId },
      { createdBy: userObjectId }
    ]
  };
}

export function assertCanViewTask(
  task: TaskDocument,
  user: AuthenticatedUserContext | undefined,
  request?: ItRequestDocument | null
): asserts user is AuthenticatedUserContext {
  if (!user) {
    throw new AppError(401, "authentication_required", "Authentication is required");
  }

  if (isEnterpriseAdmin(user)) {
    return;
  }

  if (isTaskDirectlyRelatedToUser(task, user)) {
    return;
  }

  if (request) {
    assertCanViewRequest(request, user);
    return;
  }

  throw new AppError(403, "task_access_denied", "Task access denied");
}

export function assertCanMutateTask(
  task: TaskDocument,
  user: AuthenticatedUserContext | undefined,
  action: TaskMutationAction,
  request?: ItRequestDocument | null
): asserts user is AuthenticatedUserContext {
  assertCanViewTask(task, user, request);

  if (isEnterpriseAdmin(user)) {
    return;
  }

  if (task.status === "completed" || task.status === "cancelled") {
    throw new AppError(
      403,
      "closed_task_locked",
      "Completed or cancelled tasks can only be changed by Super Admin or IT Manager"
    );
  }

  if (user.roleKey === "supervisor") {
    return;
  }

  if (
    (action === "progress" || action === "change_status") &&
    isTaskAssignedToUser(task, user)
  ) {
    return;
  }

  throw new AppError(403, "task_mutation_denied", "Task update denied");
}

export function assertCanReviewTask(
  task: TaskDocument,
  user: AuthenticatedUserContext | undefined,
  request?: ItRequestDocument | null
): asserts user is AuthenticatedUserContext {
  assertCanMutateTask(task, user, "review", request);

  if (isEnterpriseAdmin(user) || user.roleKey === "supervisor") {
    return;
  }

  throw new AppError(403, "task_review_denied", "Task review denied");
}

export function assertCanAccessUserRecord(
  targetUser: UserDocument,
  user: AuthenticatedUserContext | undefined
): asserts user is AuthenticatedUserContext {
  if (!user) {
    throw new AppError(401, "authentication_required", "Authentication is required");
  }

  if (isEnterpriseAdmin(user) || String(targetUser._id) === user.id) {
    return;
  }

  throw new AppError(403, "user_access_denied", "User access denied");
}

export function assertCanAdministerTargetUser(
  targetUser: UserDocument,
  user: AuthenticatedUserContext | undefined
): asserts user is AuthenticatedUserContext {
  assertEnterpriseAdmin(user);

  if (user.roleKey === "super_admin") {
    return;
  }

  if (String(targetUser._id) === user.id) {
    throw new AppError(
      400,
      "cannot_administer_own_account",
      "You cannot administer your own account"
    );
  }

  if (String(targetUser.roleId) === user.roleId && user.roleKey === "it_manager") {
    throw new AppError(
      403,
      "peer_admin_denied",
      "IT Manager cannot administer peer administrator accounts"
    );
  }
}

function isTaskDirectlyRelatedToUser(
  task: TaskDocument,
  user: AuthenticatedUserContext
): boolean {
  const createdBy = task.createdBy ? String(task.createdBy) : undefined;

  return isTaskAssignedToUser(task, user) || createdBy === user.id;
}

function isTaskAssignedToUser(
  task: TaskDocument,
  user: AuthenticatedUserContext
): boolean {
  if (task.assignedTo && String(task.assignedTo) === user.id) {
    return true;
  }

  return (task.assigneeIds ?? []).some(
    (assigneeId) => String(assigneeId) === user.id
  );
}
