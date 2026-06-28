import {
  Schema,
  model,
  models,
  type HydratedDocument,
  type Model,
  type Types
} from "mongoose";

import {
  USER_STATUSES,
  type UserStatus
} from "../../shared/constants/user.constants";
import {
  createSchemaOptions,
  normalizeSerializedDocument
} from "../../shared/database/schema-options";

export interface User {
  authUserId?: string;
  createdAt?: Date;
  department?: string;
  email: string;
  employeeId?: string;
  failedLoginCount: number;
  fullName: string;
  jobTitle?: string;
  lastLoginAt?: Date;
  location?: string;
  lockedUntil?: Date;
  mustChangePassword: boolean;
  notes?: string;
  passwordChangedAt?: Date;
  passwordHash: string;
  phone?: string;
  roleId: Types.ObjectId;
  sessionVersion: number;
  status: UserStatus;
  updatedAt?: Date;
}

export type UserDocument = HydratedDocument<User>;

const userSchema = new Schema<User>(
  {
    authUserId: {
      trim: true,
      type: String
    },
    department: {
      trim: true,
      type: String
    },
    email: {
      lowercase: true,
      required: true,
      trim: true,
      type: String
    },
    employeeId: {
      trim: true,
      type: String
    },
    failedLoginCount: {
      default: 0,
      min: 0,
      required: true,
      type: Number
    },
    fullName: {
      required: true,
      trim: true,
      type: String
    },
    jobTitle: {
      trim: true,
      type: String
    },
    lastLoginAt: {
      type: Date
    },
    location: {
      trim: true,
      type: String
    },
    lockedUntil: {
      type: Date
    },
    mustChangePassword: {
      default: true,
      required: true,
      type: Boolean
    },
    notes: {
      maxlength: 500,
      trim: true,
      type: String
    },
    passwordChangedAt: {
      type: Date
    },
    passwordHash: {
      required: true,
      select: false,
      type: String
    },
    phone: {
      trim: true,
      type: String
    },
    roleId: {
      ref: "Role",
      required: true,
      type: Schema.Types.ObjectId
    },
    sessionVersion: {
      default: 0,
      min: 0,
      required: true,
      select: false,
      type: Number
    },
    status: {
      default: "active",
      enum: USER_STATUSES,
      required: true,
      trim: true,
      type: String
    }
  },
  createSchemaOptions("users")
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ authUserId: 1 }, { sparse: true, unique: true });
userSchema.index({ roleId: 1 });
userSchema.index({ status: 1 });
userSchema.index({ department: 1 });
userSchema.index({ employeeId: 1 }, { sparse: true });
userSchema.index({ location: 1 });

userSchema.set("toJSON", {
  transform(document, serialized) {
    const normalized = normalizeSerializedDocument(document, serialized);
    delete normalized.passwordHash;
    return normalized;
  },
  virtuals: true
});

userSchema.set("toObject", {
  transform(document, serialized) {
    const normalized = normalizeSerializedDocument(document, serialized);
    delete normalized.passwordHash;
    return normalized;
  },
  virtuals: true
});

export const UserModel =
  (models.User as Model<User> | undefined) ?? model<User>("User", userSchema);
