import {
  Schema,
  model,
  models,
  type HydratedDocument,
  type Model,
  type Types
} from "mongoose";

import {
  TASK_STATUSES,
  type TaskStatus
} from "../../shared/constants/task.constants";
import { createCreatedAtOnlySchemaOptions } from "../../shared/database/schema-options";

export interface TaskUpdate {
  createdAt?: Date;
  newProgress?: number;
  newStatus?: TaskStatus;
  note?: string;
  previousProgress?: number;
  previousStatus?: TaskStatus;
  taskId: Types.ObjectId;
  updatedBy?: Types.ObjectId;
}

export type TaskUpdateDocument = HydratedDocument<TaskUpdate>;

const taskUpdateSchema = new Schema<TaskUpdate>(
  {
    newProgress: {
      max: 100,
      min: 0,
      type: Number
    },
    newStatus: {
      enum: TASK_STATUSES,
      trim: true,
      type: String
    },
    note: {
      trim: true,
      type: String
    },
    previousProgress: {
      max: 100,
      min: 0,
      type: Number
    },
    previousStatus: {
      enum: TASK_STATUSES,
      trim: true,
      type: String
    },
    taskId: {
      ref: "Task",
      required: true,
      type: Schema.Types.ObjectId
    },
    updatedBy: {
      ref: "User",
      type: Schema.Types.ObjectId
    }
  },
  createCreatedAtOnlySchemaOptions("task_updates")
);

taskUpdateSchema.index({ taskId: 1, createdAt: 1 });
taskUpdateSchema.index({ updatedBy: 1 });
taskUpdateSchema.index({ createdAt: -1 });

export const TaskUpdateModel =
  (models.TaskUpdate as Model<TaskUpdate> | undefined) ??
  model<TaskUpdate>("TaskUpdate", taskUpdateSchema);
