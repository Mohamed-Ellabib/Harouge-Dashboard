import { randomUUID } from "node:crypto";

import { Types } from "mongoose";

import { persistAuditLog } from "../../shared/audit/audit-log-recorder";
import type { AuditRequestContext } from "../../shared/audit/audit.types";
import { assertEnterpriseAdmin } from "../../shared/auth/access-policies";
import type { AuthenticatedUserContext } from "../../shared/auth/auth-context";
import { isDuplicateKeyError } from "../../shared/database";
import { AuditLogModel } from "../audit-logs/audit-log.model";
import { UserModel, type UserDocument } from "../users/user.model";
import {
  defaultProjectProgressTimelineStages,
  OVERALL_PROJECT_PROGRESS_KEY,
  ProjectProgressModel,
  type ProjectProgressDocument,
  type ProjectProgressTimelineStage
} from "./project-progress.model";
import {
  serializeProjectProgress,
  type ProjectProgressDto,
  type ProjectProgressHistoryDto
} from "./project-progress.dto";
import type { SprintOwnerDto } from "../sprints/sprint.dto";
import type { UpdateProjectProgressBody } from "./project-progress.validation";

export interface ProjectProgressActionContext {
  actor?: AuthenticatedUserContext;
  auditContext?: AuditRequestContext;
}

export async function getProjectProgress(
  _context: ProjectProgressActionContext
): Promise<ProjectProgressDto> {
  const projectProgress = await getOrCreateProjectProgress();
  const updatedBy = projectProgress.updatedBy
    ? await loadUserReference(projectProgress.updatedBy)
    : undefined;
  const history = await loadProjectProgressHistory(projectProgress, updatedBy);

  return serializeProjectProgress(projectProgress, updatedBy, history);
}

export async function updateProjectProgress(
  body: UpdateProjectProgressBody,
  context: ProjectProgressActionContext
): Promise<ProjectProgressDto> {
  assertEnterpriseAdmin(
    context.actor,
    "Only Super Admin and IT Manager can edit overall project progress"
  );

  const projectProgress = await getOrCreateProjectProgress();
  const oldUpdatedBy = projectProgress.updatedBy
    ? await loadUserReference(projectProgress.updatedBy)
    : undefined;
  const oldValue = serializeProjectProgress(projectProgress, oldUpdatedBy);

  if (body.percentage !== undefined) {
    projectProgress.percentage = body.percentage;
  }

  if (body.note !== undefined) {
    projectProgress.note = body.note;
  } else if (Object.prototype.hasOwnProperty.call(body, "note")) {
    projectProgress.set("note", undefined);
  }

  if (body.timelineStages !== undefined) {
    projectProgress.timelineStages = normalizeTimelineStages(body.timelineStages);
  }

  projectProgress.updatedBy = new Types.ObjectId(context.actor.id);
  await projectProgress.save();

  const updatedBy = await loadUserReference(projectProgress.updatedBy);
  const newValue = serializeProjectProgress(projectProgress, updatedBy);

  await persistAuditLog({
    action: "update",
    actorId: context.actor.id,
    context: context.auditContext,
    entityId: newValue.id,
    entityType: "project_progress",
    newValue,
    oldValue
  });

  const history = await loadProjectProgressHistory(projectProgress, updatedBy);

  return serializeProjectProgress(projectProgress, updatedBy, history);
}

async function loadProjectProgressHistory(
  projectProgress: ProjectProgressDocument,
  currentUpdatedBy?: SprintOwnerDto
): Promise<ProjectProgressHistoryDto[]> {
  const logs = await AuditLogModel.find({
    entityId: projectProgress._id,
    entityType: "project_progress"
  })
    .sort({ createdAt: -1 });

  const actorIds = logs
    .map((log) => log.actorId)
    .filter((id): id is Types.ObjectId => Boolean(id));
  const uniqueActorIds = [
    ...new Map(actorIds.map((id) => [String(id), id])).values()
  ];
  const actors = uniqueActorIds.length > 0
    ? await UserModel.find({ _id: { $in: uniqueActorIds } })
    : [];
  const actorsById = new Map(
    actors.map((actor) => [String(actor._id), serializeUserReference(actor)])
  );

  const history = logs.map((log) => {
    const newValue = readRecord(log.newValue);
    const oldValue = readRecord(log.oldValue);
    const updatedBy = readEmbeddedUserReference(newValue.updatedBy) ??
      (log.actorId ? actorsById.get(String(log.actorId)) : undefined) ??
      currentUpdatedBy;
    const note = readString(newValue.note);
    const percentage = readNumber(newValue.percentage) ??
      readNumber(oldValue.percentage) ??
      projectProgress.percentage;

    return {
      ...(log.createdAt ? { createdAt: log.createdAt } : {}),
      id: String(log._id),
      ...(note ? { note } : {}),
      percentage,
      ...(updatedBy ? { updatedBy } : {})
    };
  });

  if (history.length > 0) {
    return history;
  }

  if (!projectProgress.note && projectProgress.percentage === 0 && !currentUpdatedBy) {
    return [];
  }

  return [
    {
      ...(projectProgress.updatedAt ?? projectProgress.createdAt
        ? { createdAt: projectProgress.updatedAt ?? projectProgress.createdAt }
        : {}),
      id: String(projectProgress._id),
      ...(projectProgress.note ? { note: projectProgress.note } : {}),
      percentage: projectProgress.percentage,
      ...(currentUpdatedBy ? { updatedBy: currentUpdatedBy } : {})
    }
  ];
}

async function getOrCreateProjectProgress(): Promise<ProjectProgressDocument> {
  const existing = await ProjectProgressModel.findOne({
    key: OVERALL_PROJECT_PROGRESS_KEY
  });

  if (existing) {
    return existing;
  }

  try {
    return await ProjectProgressModel.create({
      key: OVERALL_PROJECT_PROGRESS_KEY,
      percentage: 0,
      timelineStages: defaultProjectProgressTimelineStages.map((stage) => ({ ...stage }))
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      const retry = await ProjectProgressModel.findOne({
        key: OVERALL_PROJECT_PROGRESS_KEY
      });

      if (retry) {
        return retry;
      }
    }

    throw error;
  }
}

function normalizeTimelineStages(
  timelineStages: UpdateProjectProgressBody["timelineStages"]
): ProjectProgressTimelineStage[] {
  return (timelineStages ?? []).map((stage) => ({
    date: stage.date,
    id: stage.id ?? randomUUID(),
    label: stage.label,
    status: stage.status
  }));
}

async function loadUserReference(
  id: Types.ObjectId
): Promise<SprintOwnerDto | undefined> {
  const user = await UserModel.findById(id);

  return user ? serializeUserReference(user) : undefined;
}

function serializeUserReference(user: UserDocument): SprintOwnerDto {
  return {
    ...(user.department ? { department: user.department } : {}),
    email: user.email,
    fullName: user.fullName,
    id: String(user._id),
    ...(user.jobTitle ? { jobTitle: user.jobTitle } : {})
  };
}

function readEmbeddedUserReference(value: unknown): SprintOwnerDto | undefined {
  const object = readRecord(value);
  const email = readString(object.email);
  const fullName = readString(object.fullName);
  const id = readString(object.id);

  if (!email || !fullName || !id) {
    return undefined;
  }

  return {
    ...(readString(object.department)
      ? { department: readString(object.department) }
      : {}),
    email,
    fullName,
    id,
    ...(readString(object.jobTitle) ? { jobTitle: readString(object.jobTitle) } : {})
  };
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}
