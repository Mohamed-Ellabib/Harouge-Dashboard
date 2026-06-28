import type { SprintDocument } from "./sprint.model";

export interface SprintOwnerDto {
  department?: string;
  email: string;
  fullName: string;
  id: string;
  jobTitle?: string;
}

export interface SprintDto {
  active: boolean;
  code: string;
  createdAt?: Date;
  createdBy?: string;
  description?: string;
  id: string;
  name: string;
  notifyLater: boolean;
  owner?: SprintOwnerDto;
  ownerId: string;
  progressTarget: number;
  sprintArea: string;
  startDate: Date;
  status: string;
  targetDate: Date;
  updatedAt?: Date;
}

export function serializeSprint(
  sprint: SprintDocument,
  owner?: SprintOwnerDto
): SprintDto {
  return {
    active: sprint.active,
    code: sprint.code,
    ...(sprint.createdAt ? { createdAt: sprint.createdAt } : {}),
    ...(sprint.createdBy ? { createdBy: String(sprint.createdBy) } : {}),
    ...(sprint.description ? { description: sprint.description } : {}),
    id: String(sprint._id),
    name: sprint.name,
    notifyLater: sprint.notifyLater,
    ...(owner ? { owner } : {}),
    ownerId: String(sprint.ownerId),
    progressTarget: sprint.progressTarget,
    sprintArea: sprint.sprintArea,
    startDate: sprint.startDate,
    status: sprint.status,
    targetDate: sprint.targetDate,
    ...(sprint.updatedAt ? { updatedAt: sprint.updatedAt } : {})
  };
}
