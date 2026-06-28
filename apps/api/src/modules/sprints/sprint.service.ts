import { Types } from "mongoose";

import { persistAuditLog } from "../../shared/audit/audit-log-recorder";
import type { AuditRequestContext } from "../../shared/audit/audit.types";
import { isEnterpriseAdmin } from "../../shared/auth/access-policies";
import type { AuthenticatedUserContext } from "../../shared/auth/auth-context";
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
import { UserModel, type UserDocument } from "../users/user.model";

import {
  serializeSprint,
  type SprintDto,
  type SprintOwnerDto
} from "./sprint.dto";
import { SprintModel, type SprintDocument } from "./sprint.model";
import type {
  CreateSprintBody,
  SprintListQuery,
  UpdateSprintBody
} from "./sprint.validation";

export interface SprintActionContext {
  actor?: AuthenticatedUserContext;
  auditContext?: AuditRequestContext;
}

export interface SprintListResult {
  data: SprintDto[];
  pagination: PaginationMeta;
}

const allowedSprintSortFields = [
  "code",
  "createdAt",
  "name",
  "progressTarget",
  "sprintArea",
  "startDate",
  "status",
  "targetDate",
  "updatedAt"
] as const;

export async function listSprints(
  query: SprintListQuery,
  context: SprintActionContext
): Promise<SprintListResult> {
  const actor = getRequiredActor(context);
  const filter = buildSprintFilter(query, actor);
  const sort = buildSort(
    query.sortBy,
    query.sortOrder,
    allowedSprintSortFields,
    "createdAt"
  );
  const skip = (query.page - 1) * query.limit;
  const [sprints, totalItems] = await Promise.all([
    SprintModel.find(filter).sort(sort).skip(skip).limit(query.limit),
    SprintModel.countDocuments(filter)
  ]);
  const ownersById = await loadOwnerReferences(
    sprints.map((sprint) => sprint.ownerId)
  );

  return {
    data: sprints.map((sprint) =>
      serializeSprint(sprint, ownersById.get(String(sprint.ownerId)))
    ),
    pagination: buildPaginationMeta({
      limit: query.limit,
      page: query.page,
      totalItems
    })
  };
}

export async function createSprint(
  body: CreateSprintBody,
  context: SprintActionContext
): Promise<SprintDto> {
  return runInTransaction(async () => {
    const actor = getRequiredActor(context);
    await ensureOwnerExists(body.ownerId);

    try {
      const createdStatus =
        body.active && body.status === "planned" ? "in_progress" : body.status;
      const [sprint] = await SprintModel.create([
        {
          active: body.active,
          code: body.code.trim().toUpperCase(),
          createdBy: new Types.ObjectId(actor.id),
          ...(body.description ? { description: body.description } : {}),
          name: body.name,
          notifyLater: body.notifyLater,
          ownerId: new Types.ObjectId(body.ownerId),
          progressTarget: body.progressTarget,
          sprintArea: body.sprintArea,
          startDate: new Date(body.startDate),
          status: createdStatus,
          targetDate: new Date(body.targetDate)
        }
      ]);

      if (!sprint) {
        throw new AppError(500, "sprint_create_failed", "Sprint could not be created");
      }

      const owner = await loadOwnerReference(sprint.ownerId);
      const serializedSprint = serializeSprint(sprint, owner);

      await persistAuditLog({
        action: "create",
        actorId: actor.id,
        context: context.auditContext,
        entityId: serializedSprint.id,
        entityType: "sprint",
        newValue: serializedSprint
      });

      return serializedSprint;
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new AppError(409, "sprint_code_exists", "Sprint code already exists");
      }

      throw error;
    }
  });
}

export async function getSprintByIdForActor(
  id: string,
  context: SprintActionContext
): Promise<SprintDto> {
  const actor = getRequiredActor(context);
  const sprint = await SprintModel.findById(id);

  if (!sprint) {
    throw new AppError(404, "sprint_not_found", "Sprint not found");
  }

  assertCanViewSprint(sprint, actor);
  const owner = await loadOwnerReference(sprint.ownerId);

  return serializeSprint(sprint, owner);
}

export async function updateSprint(
  id: string,
  body: UpdateSprintBody,
  context: SprintActionContext
): Promise<SprintDto> {
  return runInTransaction(async () => {
    const actor = getRequiredActor(context);
    const sprint = await SprintModel.findById(id);

    if (!sprint) {
      throw new AppError(404, "sprint_not_found", "Sprint not found");
    }

    assertCanMutateSprint(sprint, actor);

    if (body.ownerId !== undefined) {
      await ensureOwnerExists(body.ownerId);
    }

    const oldValue = serializeSprint(sprint, await loadOwnerReference(sprint.ownerId));

    if (body.active !== undefined) {
      sprint.active = body.active;
    }

    if (body.code !== undefined) {
      sprint.code = body.code.trim().toUpperCase();
    }

    if (body.description !== undefined) {
      sprint.description = body.description;
    } else if (Object.prototype.hasOwnProperty.call(body, "description")) {
      sprint.set("description", undefined);
    }

    if (body.name !== undefined) {
      sprint.name = body.name;
    }

    if (body.notifyLater !== undefined) {
      sprint.notifyLater = body.notifyLater;
    }

    if (body.ownerId !== undefined) {
      sprint.ownerId = new Types.ObjectId(body.ownerId);
    }

    if (body.progressTarget !== undefined) {
      sprint.progressTarget = body.progressTarget;
    }

    if (body.sprintArea !== undefined) {
      sprint.sprintArea = body.sprintArea;
    }

    if (body.startDate !== undefined) {
      sprint.startDate = new Date(body.startDate);
    }

    if (body.status !== undefined) {
      sprint.status = body.status;
    }

    if (body.targetDate !== undefined) {
      sprint.targetDate = new Date(body.targetDate);
    }

    try {
      await sprint.save();
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new AppError(409, "sprint_code_exists", "Sprint code already exists");
      }

      throw error;
    }

    const owner = await loadOwnerReference(sprint.ownerId);
    const newValue = serializeSprint(sprint, owner);

    await persistAuditLog({
      action: "update",
      actorId: actor.id,
      context: context.auditContext,
      entityId: newValue.id,
      entityType: "sprint",
      newValue,
      oldValue
    });

    return newValue;
  });
}

function buildSprintFilter(
  query: SprintListQuery,
  actor: AuthenticatedUserContext
): Record<string, unknown> {
  const filter: Record<string, unknown> = {};
  const clauses: Record<string, unknown>[] = [];

  if (query.ownerId) {
    filter.ownerId = new Types.ObjectId(query.ownerId);
  }

  if (query.sprintArea) {
    filter.sprintArea = query.sprintArea;
  }

  if (query.status) {
    filter.status = query.status;
  }

  if (query.dateFrom || query.dateTo) {
    filter.createdAt = {
      ...(query.dateFrom ? { $gte: new Date(query.dateFrom) } : {}),
      ...(query.dateTo ? { $lte: new Date(query.dateTo) } : {})
    };
  }

  if (query.search) {
    const regex = new RegExp(escapeRegex(query.search), "i");
    clauses.push({
      $or: [{ code: regex }, { name: regex }, { description: regex }]
    });
  }

  if (clauses.length === 1) {
    return { ...filter, ...clauses[0] };
  }

  if (clauses.length > 1) {
    return { ...filter, $and: clauses };
  }

  return filter;
}

function assertCanViewSprint(
  sprint: SprintDocument,
  actor: AuthenticatedUserContext
): void {
  void sprint;
  void actor;
}

function assertCanMutateSprint(
  sprint: SprintDocument,
  actor: AuthenticatedUserContext
): void {
  if (isEnterpriseAdmin(actor)) {
    return;
  }

  if (
    String(sprint.ownerId) === actor.id ||
    String(sprint.createdBy) === actor.id
  ) {
    return;
  }

  throw new AppError(403, "sprint_mutation_denied", "Sprint update denied");
}

async function ensureOwnerExists(ownerId: string): Promise<void> {
  const exists = await UserModel.exists({ _id: new Types.ObjectId(ownerId) });

  if (!exists) {
    throw new AppError(404, "sprint_owner_not_found", "Sprint owner not found");
  }
}

async function loadOwnerReferences(
  ids: Types.ObjectId[]
): Promise<Map<string, SprintOwnerDto>> {
  const uniqueIds = [...new Set(ids.map((id) => String(id)))].map(
    (id) => new Types.ObjectId(id)
  );

  if (uniqueIds.length === 0) {
    return new Map();
  }

  const users = await UserModel.find({ _id: { $in: uniqueIds } });

  return new Map(
    users.map((user) => [String(user._id), serializeOwnerReference(user)])
  );
}

async function loadOwnerReference(
  id: Types.ObjectId
): Promise<SprintOwnerDto | undefined> {
  const user = await UserModel.findById(id);

  return user ? serializeOwnerReference(user) : undefined;
}

function serializeOwnerReference(user: UserDocument): SprintOwnerDto {
  return {
    ...(user.department ? { department: user.department } : {}),
    email: user.email,
    fullName: user.fullName,
    id: String(user._id),
    ...(user.jobTitle ? { jobTitle: user.jobTitle } : {})
  };
}

function getRequiredActor(context: SprintActionContext): AuthenticatedUserContext {
  if (!context.actor) {
    throw new AppError(401, "authentication_required", "Authentication is required");
  }

  return context.actor;
}
