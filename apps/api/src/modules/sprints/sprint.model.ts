import {
  Schema,
  model,
  models,
  type HydratedDocument,
  type Model,
  type Types
} from "mongoose";

import {
  SPRINT_AREAS,
  SPRINT_STATUSES,
  type SprintArea,
  type SprintStatus
} from "../../shared/constants/sprint.constants";
import { createSchemaOptions } from "../../shared/database/schema-options";

export interface Sprint {
  active: boolean;
  code: string;
  createdAt?: Date;
  createdBy?: Types.ObjectId;
  description?: string;
  name: string;
  notifyLater: boolean;
  ownerId: Types.ObjectId;
  progressTarget: number;
  sprintArea: SprintArea;
  startDate: Date;
  status: SprintStatus;
  targetDate: Date;
  updatedAt?: Date;
}

export type SprintDocument = HydratedDocument<Sprint>;

const sprintSchema = new Schema<Sprint>(
  {
    active: {
      default: false,
      required: true,
      type: Boolean
    },
    code: {
      uppercase: true,
      required: true,
      trim: true,
      type: String
    },
    createdBy: {
      ref: "User",
      type: Schema.Types.ObjectId
    },
    description: {
      maxlength: 500,
      trim: true,
      type: String
    },
    name: {
      maxlength: 120,
      required: true,
      trim: true,
      type: String
    },
    notifyLater: {
      default: false,
      required: true,
      type: Boolean
    },
    ownerId: {
      ref: "User",
      required: true,
      type: Schema.Types.ObjectId
    },
    progressTarget: {
      default: 0,
      max: 100,
      min: 0,
      required: true,
      type: Number
    },
    sprintArea: {
      enum: SPRINT_AREAS,
      required: true,
      trim: true,
      type: String
    },
    startDate: {
      required: true,
      type: Date
    },
    status: {
      default: "planned",
      enum: SPRINT_STATUSES,
      required: true,
      trim: true,
      type: String
    },
    targetDate: {
      required: true,
      type: Date
    }
  },
  createSchemaOptions("sprints")
);

sprintSchema.index({ code: 1 }, { unique: true });
sprintSchema.index({ sprintArea: 1, status: 1 });
sprintSchema.index({ ownerId: 1 });
sprintSchema.index({ status: 1 });
sprintSchema.index({ targetDate: 1 });
sprintSchema.index({ active: 1 });
sprintSchema.index({ createdAt: -1 });

sprintSchema.pre("validate", function enforceSprintRules() {
  if (this.targetDate && this.startDate && this.targetDate < this.startDate) {
    this.invalidate("targetDate", "Target date must be after the start date.");
  }
});

export const SprintModel =
  (models.Sprint as Model<Sprint> | undefined) ??
  model<Sprint>("Sprint", sprintSchema);
