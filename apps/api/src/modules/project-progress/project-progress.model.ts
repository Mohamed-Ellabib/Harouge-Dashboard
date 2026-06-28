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

export interface ProjectProgress {
  createdAt?: Date;
  key: typeof OVERALL_PROJECT_PROGRESS_KEY;
  note?: string;
  percentage: number;
  updatedAt?: Date;
  updatedBy?: Types.ObjectId;
}

export type ProjectProgressDocument = HydratedDocument<ProjectProgress>;

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
