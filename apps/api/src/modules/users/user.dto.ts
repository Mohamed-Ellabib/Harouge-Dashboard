import type { User, UserDocument } from "./user.model";

export interface UserDto {
  authUserId?: string;
  createdAt?: Date;
  department?: string;
  email: string;
  employeeId?: string;
  failedLoginCount: number;
  fullName: string;
  id: string;
  jobTitle?: string;
  lastLoginAt?: Date;
  location?: string;
  lockedUntil?: Date;
  mustChangePassword: boolean;
  notes?: string;
  passwordChangedAt?: Date;
  phone?: string;
  roleId: string;
  status: User["status"];
  updatedAt?: Date;
}

export function serializeUser(user: UserDocument): UserDto {
  return {
    ...(user.authUserId ? { authUserId: user.authUserId } : {}),
    ...(user.createdAt ? { createdAt: user.createdAt } : {}),
    ...(user.department ? { department: user.department } : {}),
    email: user.email,
    ...(user.employeeId ? { employeeId: user.employeeId } : {}),
    failedLoginCount: user.failedLoginCount,
    fullName: user.fullName,
    id: String(user._id),
    ...(user.jobTitle ? { jobTitle: user.jobTitle } : {}),
    ...(user.lastLoginAt ? { lastLoginAt: user.lastLoginAt } : {}),
    ...(user.location ? { location: user.location } : {}),
    ...(user.lockedUntil ? { lockedUntil: user.lockedUntil } : {}),
    mustChangePassword: user.mustChangePassword,
    ...(user.notes ? { notes: user.notes } : {}),
    ...(user.passwordChangedAt
      ? { passwordChangedAt: user.passwordChangedAt }
      : {}),
    ...(user.phone ? { phone: user.phone } : {}),
    roleId: String(user.roleId),
    status: user.status,
    ...(user.updatedAt ? { updatedAt: user.updatedAt } : {})
  };
}
