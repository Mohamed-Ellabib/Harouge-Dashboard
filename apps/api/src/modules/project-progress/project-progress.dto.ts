import type { SprintOwnerDto } from "../sprints/sprint.dto";
import {
  defaultProjectProgressTimelineStages,
  type ProjectProgressDocument,
  type ProjectProgressTimelineStage
} from "./project-progress.model";

export interface ProjectProgressDto {
  createdAt?: Date;
  history: ProjectProgressHistoryDto[];
  id: string;
  key: string;
  note?: string;
  percentage: number;
  timelineStages: ProjectProgressTimelineStageDto[];
  updatedAt?: Date;
  updatedBy?: SprintOwnerDto;
}

export interface ProjectProgressTimelineStageDto {
  date: string;
  id: string;
  label: string;
  status: ProjectProgressTimelineStage["status"];
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
    timelineStages: serializeTimelineStages(projectProgress.timelineStages),
    ...(projectProgress.updatedAt ? { updatedAt: projectProgress.updatedAt } : {}),
    ...(updatedBy ? { updatedBy } : {})
  };
}

function serializeTimelineStages(
  timelineStages: ProjectProgressTimelineStage[] | undefined
): ProjectProgressTimelineStageDto[] {
  const stages =
    timelineStages && timelineStages.length > 0
      ? timelineStages
      : defaultProjectProgressTimelineStages;

  return stages.map((stage) => ({
    date: stage.date,
    id: stage.id,
    label: stage.label,
    status: stage.status
  }));
}
