import type { SprintOwnerDto } from "../sprints/sprint.dto";
import type { ProjectProgressDocument } from "./project-progress.model";

export interface ProjectProgressDto {
  createdAt?: Date;
  history: ProjectProgressHistoryDto[];
  id: string;
  key: string;
  note?: string;
  percentage: number;
  updatedAt?: Date;
  updatedBy?: SprintOwnerDto;
}

export interface ProjectProgressHistoryDto {
  createdAt?: Date;
  id: string;
  note?: string;
  percentage: number;
  updatedBy?: SprintOwnerDto;
}

export function serializeProjectProgress(
  projectProgress: ProjectProgressDocument,
  updatedBy?: SprintOwnerDto,
  history: ProjectProgressHistoryDto[] = []
): ProjectProgressDto {
  return {
    ...(projectProgress.createdAt ? { createdAt: projectProgress.createdAt } : {}),
    history,
    id: String(projectProgress._id),
    key: projectProgress.key,
    ...(projectProgress.note ? { note: projectProgress.note } : {}),
    percentage: projectProgress.percentage,
    ...(projectProgress.updatedAt ? { updatedAt: projectProgress.updatedAt } : {}),
    ...(updatedBy ? { updatedBy } : {})
  };
}
