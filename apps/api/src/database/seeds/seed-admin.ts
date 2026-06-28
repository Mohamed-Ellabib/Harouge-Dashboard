import bcrypt from "bcryptjs";
import type { Types } from "mongoose";
import { z } from "zod";

import { env } from "../../config/env";
import { AuditLogModel } from "../../modules/audit-logs/audit-log.model";
import type { RoleDocument } from "../../modules/roles/role.model";
import { UserModel } from "../../modules/users/user.model";

export interface SeedAdminResult {
  created: boolean;
  email?: string;
  skipped: boolean;
  skipReason?: string;
}

const optionalSeedAdminSchema = z
  .object({
    INITIAL_ADMIN_DEPARTMENT: z.string().trim().optional(),
    INITIAL_ADMIN_EMAIL: z.email().optional(),
    INITIAL_ADMIN_FULL_NAME: z.string().trim().min(1).optional(),
    INITIAL_ADMIN_JOB_TITLE: z.string().trim().optional(),
    INITIAL_ADMIN_PASSWORD: z.string().min(12).optional(),
    INITIAL_ADMIN_PHONE: z.string().trim().optional()
  })
  .superRefine((value, context) => {
    const suppliedValues = [
      value.INITIAL_ADMIN_EMAIL,
      value.INITIAL_ADMIN_FULL_NAME,
      value.INITIAL_ADMIN_PASSWORD
    ].filter(Boolean);

    if (suppliedValues.length > 0 && suppliedValues.length < 3) {
      context.addIssue({
        code: "custom",
        message:
          "INITIAL_ADMIN_EMAIL, INITIAL_ADMIN_FULL_NAME, and INITIAL_ADMIN_PASSWORD must be supplied together."
      });
    }
  });

type OptionalSeedAdminConfig = z.infer<typeof optionalSeedAdminSchema>;

export async function seedInitialAdmin(
  superAdminRole: RoleDocument | undefined
): Promise<SeedAdminResult> {
  const adminConfig = parseOptionalSeedAdminConfig();

  if (
    !adminConfig.INITIAL_ADMIN_EMAIL ||
    !adminConfig.INITIAL_ADMIN_FULL_NAME ||
    !adminConfig.INITIAL_ADMIN_PASSWORD
  ) {
    return {
      created: false,
      skipped: true,
      skipReason:
        "Initial admin env values were not provided. Roles and permissions were seeded only."
    };
  }

  if (!superAdminRole) {
    throw new Error("Cannot seed initial admin because super_admin role is missing.");
  }

  const email = adminConfig.INITIAL_ADMIN_EMAIL.toLowerCase();
  const existingUser = await UserModel.findOne({ email }).select("+passwordHash");

  if (existingUser) {
    return {
      created: false,
      email,
      skipped: true,
      skipReason:
        "Initial admin user already exists. Existing password and status were not changed."
    };
  }

  const passwordHash = await bcrypt.hash(
    adminConfig.INITIAL_ADMIN_PASSWORD,
    env.BCRYPT_SALT_ROUNDS
  );

  const user = await UserModel.create({
    ...(adminConfig.INITIAL_ADMIN_DEPARTMENT
      ? { department: adminConfig.INITIAL_ADMIN_DEPARTMENT }
      : {}),
    email,
    failedLoginCount: 0,
    fullName: adminConfig.INITIAL_ADMIN_FULL_NAME,
    ...(adminConfig.INITIAL_ADMIN_JOB_TITLE
      ? { jobTitle: adminConfig.INITIAL_ADMIN_JOB_TITLE }
      : {}),
    mustChangePassword: env.FORCE_PASSWORD_CHANGE_ON_FIRST_LOGIN,
    passwordHash,
    ...(adminConfig.INITIAL_ADMIN_PHONE
      ? { phone: adminConfig.INITIAL_ADMIN_PHONE }
      : {}),
    roleId: superAdminRole._id as Types.ObjectId,
    status: "active"
  });

  await AuditLogModel.create({
    action: "create",
    entityId: user._id,
    entityType: "user",
    newValue: {
      email,
      seeded: true
    }
  });

  return {
    created: true,
    email,
    skipped: false
  };
}

function parseOptionalSeedAdminConfig(): OptionalSeedAdminConfig {
  const parsedConfig = optionalSeedAdminSchema.safeParse(process.env);

  if (!parsedConfig.success) {
    throw new Error(
      `Invalid initial admin seed configuration: ${parsedConfig.error.issues
        .map((issue) => issue.message)
        .join("; ")}`
    );
  }

  return parsedConfig.data;
}
