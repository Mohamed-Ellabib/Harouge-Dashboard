import {
  Schema,
  model,
  models,
  type HydratedDocument,
  type Model,
  type Types
} from "mongoose";

import { createSchemaOptions } from "../../shared/database/schema-options";

export const OVERALL_PROJECT_PROGRESS_KEY = "overall" as const;
export const projectProgressTimelineStageStatuses = [
  "done",
  "active",
  "future"
] as const;

export type ProjectProgressTimelineStageStatus =
  (typeof projectProgressTimelineStageStatuses)[number];

export interface ProjectProgressTimelineStage {
  date: string;
  id: string;
  label: string;
  status: ProjectProgressTimelineStageStatus;
}

export const defaultProjectProgressTimelineStages: ProjectProgressTimelineStage[] = [
  { date: "2026-01-10", id: "initiation", label: "Initiation", status: "done" },
  { date: "2026-02-20", id: "planning", label: "Planning", status: "done" },
  { date: "2026-05-15", id: "execution", label: "Execution", status: "active" },
  { date: "2026-08-10", id: "testing", label: "Testing", status: "future" },
  { date: "2026-10-30", id: "go-live", label: "Go-Live", status: "future" }
];

export interface ProjectProgress {
  createdAt?: Date;
  key: typeof OVERALL_PROJECT_PROGRESS_KEY;
  note?: string;
  percentage: number;
  timelineStages: ProjectProgressTimelineStage[];
  updatedAt?: Date;
  updatedBy?: Types.ObjectId;
}

export type ProjectProgressDocument = HydratedDocument<ProjectProgress>;

const projectProgressTimelineStageSchema =
  new Schema<ProjectProgressTimelineStage>(
    {
      date: {
        maxlength: 10,
        required: true,
        trim: true,
        type: String
      },
      id: {
        maxlength: 80,
        required: true,
        trim: true,
        type: String
      },
      label: {
        maxlength: 80,
        required: true,
        trim: true,
        type: String
      },
      status: {
        enum: projectProgressTimelineStageStatuses,
        required: true,
        type: String
      }
    },
    { _id: false }
  );

const projectProgressSchema = new Schema<ProjectProgress>(
  {
    key: {
      default: OVERALL_PROJECT_PROGRESS_KEY,
      enum: [OVERALL_PROJECT_PROGRESS_KEY],
      required: true,
      trim: true,
      type: String
    },
    note: {
      maxlength: 500,
      trim: true,
      type: String
    },
    percentage: {
      default: 0,
      max: 100,
      min: 0,
      required: true,
      type: Number
    },
    timelineStages: {
      default: () => defaultProjectProgressTimelineStages.map((stage) => ({ ...stage })),
      type: [projectProgressTimelineStageSchema],
      validate: {
        message: "Project progress timeline must contain between 1 and 10 stages.",
        validator(value: ProjectProgressTimelineStage[]) {
          return value.length >= 1 && value.length <= 10;
        }
      }
    },
    updatedBy: {
      ref: "User",
      type: Schema.Types.ObjectId
    }
  },
  createSchemaOptions("project_progress")
);

projectProgressSchema.index({ key: 1 }, { unique: true });
projectProgressSchema.index({ updatedAt: -1 });

export const ProjectProgressModel =
  (models.ProjectProgress as Model<ProjectProgress> | undefined) ??
  model<ProjectProgress>("ProjectProgress", projectProgressSchema);
