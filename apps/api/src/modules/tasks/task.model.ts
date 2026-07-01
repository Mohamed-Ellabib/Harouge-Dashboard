import {
  Schema,
  model,
  models,
  Types,
  type HydratedDocument,
  type Model
} from "mongoose";

import {
  PRIORITIES,
  type Priority
} from "../../shared/constants/request.constants";
import {
  TASK_CATEGORIES,
  TASK_STATUSES,
  type TaskCategory,
  type TaskStatus
} from "../../shared/constants/task.constants";
import { createSchemaOptions } from "../../shared/database/schema-options";

export interface Task {
  assigneeIds?: Types.ObjectId[];
  assignedTo?: Types.ObjectId;
  blockedReason?: string;
  category: TaskCategory;
  completedAt?: Date;
  createdAt?: Date;
  createdBy?: Types.ObjectId;
  description?: string;
  dueDate?: Date;
  lastProgressUpdateAt?: Date;
  mainModule?: string;
  priority: Priority;
  progress: number;
  requestId?: Types.ObjectId;
  reviewedBy?: Types.ObjectId;
  startDate?: Date;
  status: TaskStatus;
  subModule?: string;
  taskCode: string;
  title: string;
  updatedAt?: Date;
}

export type TaskDocument = HydratedDocument<Task>;

const taskSchema = new Schema<Task>(
  {
    assigneeIds: [
      {
        ref: "User",
        type: Schema.Types.ObjectId
      }
    ],
    assignedTo: {
      ref: "User",
      type: Schema.Types.ObjectId
    },
    blockedReason: {
      trim: true,
      type: String
    },
    category: {
      default: "support",
      enum: TASK_CATEGORIES,
      required: true,
      trim: true,
      type: String
    },
    completedAt: {
      type: Date
    },
    createdBy: {
      ref: "User",
      type: Schema.Types.ObjectId
    },
    description: {
      trim: true,
      type: String
    },
    dueDate: {
      type: Date
    },
    lastProgressUpdateAt: {
      type: Date
    },
    mainModule: {
      maxlength: 120,
      trim: true,
      type: String
    },
    priority: {
      default: "medium",
      enum: PRIORITIES,
      required: true,
      trim: true,
      type: String
    },
    progress: {
      default: 0,
      max: 100,
      min: 0,
      required: true,
      type: Number
    },
    requestId: {
      ref: "ItRequest",
      type: Schema.Types.ObjectId
    },
    reviewedBy: {
      ref: "User",
      type: Schema.Types.ObjectId
    },
    startDate: {
      type: Date
    },
    status: {
      default: "open",
      enum: TASK_STATUSES,
      required: true,
      trim: true,
      type: String
    },
    subModule: {
      maxlength: 120,
      trim: true,
      type: String
    },
    taskCode: {
      required: true,
      trim: true,
      type: String
    },
    title: {
      required: true,
      trim: true,
      type: String
    }
  },
  createSchemaOptions("tasks")
);

taskSchema.index({ taskCode: 1 }, { unique: true });
taskSchema.index({ requestId: 1 });
taskSchema.index({ assigneeIds: 1 });
taskSchema.index({ assigneeIds: 1, status: 1 });
taskSchema.index({ assignedTo: 1 });
taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ status: 1 });
taskSchema.index({ status: 1, dueDate: 1 });
taskSchema.index({ category: 1 });
taskSchema.index({ mainModule: 1 });
taskSchema.index({ mainModule: 1, status: 1 });
taskSchema.index({ mainModule: 1, subModule: 1 });
taskSchema.index({ priority: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ lastProgressUpdateAt: 1 });
taskSchema.index({ status: 1, completedAt: -1 });
taskSchema.index({ assigneeIds: 1, status: 1, completedAt: -1 });
taskSchema.index({ assignedTo: 1, status: 1, completedAt: -1 });

taskSchema.pre("validate", function enforceTaskRules() {
  const assigneeIdValues = new Set(
    (this.assigneeIds ?? []).map((assigneeId) => String(assigneeId))
  );

  if (this.assignedTo) {
    assigneeIdValues.add(String(this.assignedTo));
  }

  const normalizedAssigneeIds = [...assigneeIdValues].map(
    (assigneeId) => new Types.ObjectId(assigneeId)
  );

  this.assigneeIds = normalizedAssigneeIds;

  if (!this.assignedTo && normalizedAssigneeIds.length > 0) {
    this.assignedTo = normalizedAssigneeIds[0];
  }

  if (normalizedAssigneeIds.length === 0) {
    this.set("assignedTo", undefined);
  }

  if (this.status === "assigned" && normalizedAssigneeIds.length === 0) {
    this.invalidate("assignedTo", "Assigned tasks require at least one assignee.");
  }

  if (this.status === "assigned" && this.progress !== 0) {
    this.invalidate("progress", "Assigned tasks must have progress 0.");
  }

  if (this.status === "completed" && this.progress !== 100) {
    this.invalidate("progress", "Completed tasks must have progress 100.");
  }

  if (this.status === "blocked" && !this.blockedReason?.trim()) {
    this.invalidate("blockedReason", "Blocked tasks require a blocked reason.");
  }
});

export const TaskModel =
  (models.Task as Model<Task> | undefined) ?? model<Task>("Task", taskSchema);
