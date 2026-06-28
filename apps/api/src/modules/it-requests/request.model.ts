import {
  Schema,
  model,
  models,
  type HydratedDocument,
  type Model,
  type Types
} from "mongoose";

import {
  PRIORITIES,
  REQUEST_STATUSES,
  REQUEST_TYPES,
  type Priority,
  type RequestStatus,
  type RequestType
} from "../../shared/constants/request.constants";
import { createSchemaOptions } from "../../shared/database/schema-options";

export interface ItRequest {
  assignedTo?: Types.ObjectId;
  closedAt?: Date;
  createdAt?: Date;
  description?: string;
  priority: Priority;
  requestCode: string;
  requestedBy?: Types.ObjectId;
  requestedForDepartment?: string;
  requiredDate?: Date;
  status: RequestStatus;
  title: string;
  type: RequestType;
  updatedAt?: Date;
}

export type ItRequestDocument = HydratedDocument<ItRequest>;

const requestSchema = new Schema<ItRequest>(
  {
    assignedTo: {
      ref: "User",
      type: Schema.Types.ObjectId
    },
    closedAt: {
      type: Date
    },
    description: {
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
    requestCode: {
      required: true,
      trim: true,
      type: String
    },
    requestedBy: {
      ref: "User",
      type: Schema.Types.ObjectId
    },
    requestedForDepartment: {
      trim: true,
      type: String
    },
    requiredDate: {
      type: Date
    },
    status: {
      default: "draft",
      enum: REQUEST_STATUSES,
      required: true,
      trim: true,
      type: String
    },
    title: {
      required: true,
      trim: true,
      type: String
    },
    type: {
      default: "support",
      enum: REQUEST_TYPES,
      required: true,
      trim: true,
      type: String
    }
  },
  createSchemaOptions("requests")
);

requestSchema.index({ requestCode: 1 }, { unique: true });
requestSchema.index({ status: 1 });
requestSchema.index({ status: 1, createdAt: -1 });
requestSchema.index({ priority: 1 });
requestSchema.index({ type: 1 });
requestSchema.index({ requestedBy: 1 });
requestSchema.index({ assignedTo: 1 });
requestSchema.index({ requiredDate: 1 });
requestSchema.index({ status: 1, closedAt: -1 });

export const ItRequestModel =
  (models.ItRequest as Model<ItRequest> | undefined) ??
  model<ItRequest>("ItRequest", requestSchema);
