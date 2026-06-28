import { Types } from "mongoose";

import { env } from "../../config/env";
import { UserModel, type UserDocument } from "../users/user.model";
import { persistAuditLog } from "../../shared/audit/audit-log-recorder";
import type { AuditRequestContext } from "../../shared/audit/audit.types";
import { createSessionToken } from "../../shared/auth/session-token";
import type { AuthenticatedUserContext } from "../../shared/auth/auth-context";
import { loadAuthenticatedUserContext } from "../../shared/auth/auth-context-loader";
import { hashPassword, verifyPassword } from "../../shared/auth/passwords";
import { AppError } from "../../shared/errors/app-error";
import { runInTransaction } from "../../shared/database";

export interface AuthSessionResult {
  expiresAt: number;
  token: string;
  user: AuthenticatedUserContext;
}

export interface LoginInput {
  context?: AuditRequestContext;
  email: string;
  password: string;
}

export interface ChangePasswordInput {
  context?: AuditRequestContext;
  currentPassword: string;
  newPassword: string;
  userId: string;
}

export async function login(input: LoginInput): Promise<AuthSessionResult> {
  return runInTransaction(async () => {
    const email = input.email.toLowerCase();
    const user = await UserModel.findOne({ email }).select(
      "+passwordHash +sessionVersion"
    );

  if (!user) {
    await recordAuthAudit({
      context: input.context,
      email,
      reason: "user_not_found",
      type: "login_failed"
    });
    throwInvalidCredentials();
  }

  await clearExpiredLoginLock(user);

  if (user.status !== "active") {
    await recordAuthAudit({
      context: input.context,
      email,
      reason: `status_${user.status}`,
      type: "login_failed",
      userId: user._id as Types.ObjectId
    });
    throwInvalidCredentials();
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    await recordAuthAudit({
      context: input.context,
      email,
      reason: "account_locked",
      type: "login_failed",
      userId: user._id as Types.ObjectId
    });
    throwInvalidCredentials();
  }

  const passwordMatches = await verifyPassword(input.password, user.passwordHash);

  if (!passwordMatches) {
    await applyFailedLoginAttempt(user);
    await recordAuthAudit({
      context: input.context,
      email,
      reason: user.lockedUntil ? "account_locked" : "invalid_password",
      type: "login_failed",
      userId: user._id as Types.ObjectId
    });

    throwInvalidCredentials();
  }

  user.failedLoginCount = 0;
  user.set("lockedUntil", undefined);
  user.lastLoginAt = new Date();
  await user.save();

  await recordAuthAudit({
    context: input.context,
    email,
    type: "login_succeeded",
    userId: user._id as Types.ObjectId
  });

    return createAuthSession(String(user._id), user.sessionVersion ?? 0);
  });
}

export async function changePassword(
  input: ChangePasswordInput
): Promise<AuthSessionResult> {
  return runInTransaction(async () => {
    const user = await UserModel.findById(input.userId).select(
      "+passwordHash +sessionVersion"
    );

  if (!user || user.status !== "active") {
    throw new AppError(401, "authentication_required", "Authentication is required");
  }

  const currentPasswordMatches = await verifyPassword(
    input.currentPassword,
    user.passwordHash
  );

  if (!currentPasswordMatches) {
    throw new AppError(
      400,
      "invalid_current_password",
      "Current password is invalid"
    );
  }

  const newPasswordMatchesCurrent = await verifyPassword(
    input.newPassword,
    user.passwordHash
  );

  if (newPasswordMatchesCurrent) {
    throw new AppError(
      400,
      "password_reuse_not_allowed",
      "New password must be different from the current password"
    );
  }

  user.passwordHash = await hashPassword(input.newPassword);
  user.passwordChangedAt = new Date();
  user.mustChangePassword = false;
  user.failedLoginCount = 0;
  user.sessionVersion = (user.sessionVersion ?? 0) + 1;
  user.set("lockedUntil", undefined);
  await user.save();

  await recordAuthAudit({
    context: input.context,
    email: user.email,
    type: "password_changed",
    userId: user._id as Types.ObjectId
  });

    return createAuthSession(String(user._id), user.sessionVersion);
  });
}

export async function logout(
  userId: string | undefined,
  context?: AuditRequestContext
): Promise<void> {
  return runInTransaction(async () => {
    if (!userId || !Types.ObjectId.isValid(userId)) {
      return;
    }

  const user = await UserModel.findById(userId).select("+sessionVersion");

  if (user) {
    user.sessionVersion = (user.sessionVersion ?? 0) + 1;
    await user.save();
  }

    await recordAuthAudit({
      context,
      ...(user ? { email: user.email } : {}),
      type: "logout",
      userId: new Types.ObjectId(userId)
    });
  });
}

async function createAuthSession(
  userId: string,
  sessionVersion: number
): Promise<AuthSessionResult> {
  const session = createSessionToken(userId, sessionVersion);
  const authUser = await loadAuthenticatedUserContext(
    userId,
    session.issuedAt,
    session.sessionVersion
  );

  if (!authUser) {
    throw new AppError(401, "authentication_required", "Authentication is required");
  }

  return {
    expiresAt: session.expiresAt,
    token: session.token,
    user: authUser
  };
}

async function clearExpiredLoginLock(user: UserDocument): Promise<void> {
  if (!user.lockedUntil || user.lockedUntil > new Date()) {
    return;
  }

  user.failedLoginCount = 0;
  user.set("lockedUntil", undefined);
  await user.save();
}

async function applyFailedLoginAttempt(user: UserDocument): Promise<void> {
  const updatedUser = await UserModel.findByIdAndUpdate(
    user._id,
    { $inc: { failedLoginCount: 1 } },
    { new: true }
  ).select("+sessionVersion");

  if (!updatedUser) {
    return;
  }

  if (updatedUser.failedLoginCount >= env.AUTH_MAX_FAILED_LOGIN_ATTEMPTS) {
    updatedUser.lockedUntil = new Date(
      Date.now() + env.AUTH_LOCK_MINUTES * 60 * 1000
    );
    await updatedUser.save();
  }

  user.failedLoginCount = updatedUser.failedLoginCount;
  user.lockedUntil = updatedUser.lockedUntil;
}

function throwInvalidCredentials(): never {
  throw new AppError(401, "invalid_credentials", "Invalid email or password");
}

type AuthAuditType =
  | "login_failed"
  | "login_succeeded"
  | "logout"
  | "password_changed";

interface AuthAuditInput {
  context?: AuditRequestContext;
  email?: string;
  reason?: string;
  type: AuthAuditType;
  userId?: Types.ObjectId;
}

async function recordAuthAudit(input: AuthAuditInput): Promise<void> {
  await persistAuditLog({
    action: input.type,
    ...(input.userId ? { actorId: String(input.userId), entityId: String(input.userId) } : {}),
    context: input.context,
    entityType: "user",
    newValue: {
      ...(input.email ? { email: input.email } : {}),
      ...(input.reason ? { reason: input.reason } : {}),
      ...(input.context?.requestId ? { requestId: input.context.requestId } : {})
    }
  });
}
