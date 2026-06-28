import {
  Schema,
  model,
  models,
  type HydratedDocument,
  type Model,
  type Types
} from "mongoose";

import {
  PERMISSION_KEYS,
  PERMISSION_MODULES,
  type PermissionKey,
  type PermissionModule
} from "../../shared/constants/permission.constants";
import { createSchemaOptions } from "../../shared/database/schema-options";

export interface Permission {
  createdAt?: Date;
  description?: string;
  displayName: string;
  module: PermissionModule;
  name: PermissionKey;
  roleId: Types.ObjectId;
  updatedAt?: Date;
}

export type PermissionDocument = HydratedDocument<Permission>;

const permissionSchema = new Schema<Permission>(
  {
    description: {
      trim: true,
      type: String
    },
    displayName: {
      required: true,
      trim: true,
      type: String
    },
    module: {
      enum: PERMISSION_MODULES,
      required: true,
      trim: true,
      type: String
    },
    name: {
      enum: PERMISSION_KEYS,
      required: true,
      trim: true,
      type: String
    },
    roleId: {
      ref: "Role",
      required: true,
      type: Schema.Types.ObjectId
    }
  },
  createSchemaOptions("permissions")
);

permissionSchema.index({ roleId: 1, name: 1 }, { unique: true });
permissionSchema.index({ module: 1 });

export const PermissionModel =
  (models.Permission as Model<Permission> | undefined) ??
  model<Permission>("Permission", permissionSchema);
