import {
  Schema,
  model,
  models,
  type HydratedDocument,
  type Model
} from "mongoose";

import {
  ROLE_DISPLAY_NAMES,
  ROLE_KEYS,
  type RoleKey
} from "../../shared/constants/role.constants";
import { createSchemaOptions } from "../../shared/database/schema-options";

export interface Role {
  createdAt?: Date;
  description?: string;
  displayName: string;
  isSystem: boolean;
  name: RoleKey;
  updatedAt?: Date;
}

export type RoleDocument = HydratedDocument<Role>;

const roleSchema = new Schema<Role>(
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
    isSystem: {
      default: false,
      required: true,
      type: Boolean
    },
    name: {
      enum: ROLE_KEYS,
      required: true,
      trim: true,
      type: String
    }
  },
  createSchemaOptions("roles")
);

roleSchema.index({ name: 1 }, { unique: true });

roleSchema.pre("validate", function applyRoleDisplayNameDefault() {
  if (!this.displayName && this.name) {
    this.displayName = ROLE_DISPLAY_NAMES[this.name];
  }
});

export const RoleModel =
  (models.Role as Model<Role> | undefined) ?? model<Role>("Role", roleSchema);
