import { RoleModel } from "../../modules/roles/role.model";
import { UserModel } from "../../modules/users/user.model";
import { hashPassword } from "../../shared/auth/passwords";

import {
  erpTeamUserSeeds,
  readErpTeamSeedPasswords
} from "./erp-team-users.seed";

export interface ErpTeamUsersSeedResult {
  created: number;
  existingPasswordsPreserved: number;
  updated: number;
  users: Array<{
    email: string;
    fullName: string;
    role: string;
    status: "created" | "updated";
  }>;
}

export async function seedErpTeamUsers(): Promise<ErpTeamUsersSeedResult> {
  const passwords = readErpTeamSeedPasswords(process.env);
  const roles = await RoleModel.find({
    name: { $in: ["it_manager", "supervisor", "employee"] }
  });
  const rolesByName = new Map(roles.map((role) => [role.name, role]));

  for (const requiredRole of ["it_manager", "supervisor", "employee"] as const) {
    if (!rolesByName.has(requiredRole)) {
      throw new Error(`Required role is missing before ERP team seed: ${requiredRole}`);
    }
  }

  const result: ErpTeamUsersSeedResult = {
    created: 0,
    existingPasswordsPreserved: 0,
    updated: 0,
    users: []
  };

  for (const userSeed of erpTeamUserSeeds) {
    const role = rolesByName.get(userSeed.role);
    if (!role) {
      throw new Error(`Role not found for ERP team user: ${userSeed.role}`);
    }

    const email = userSeed.email.toLowerCase();
    const existingUser = await UserModel.findOne({ email }).select("+passwordHash +sessionVersion");

    if (!existingUser) {
      await UserModel.create({
        department: userSeed.department,
        email,
        failedLoginCount: 0,
        fullName: userSeed.fullName,
        jobTitle: userSeed.jobTitle,
        mustChangePassword: true,
        notes: userSeed.notes,
        passwordHash: await hashPassword(passwords[userSeed.passwordKey]),
        roleId: role._id,
        sessionVersion: 0,
        status: "active"
      });

      result.created += 1;
      result.users.push({
        email,
        fullName: userSeed.fullName,
        role: userSeed.role,
        status: "created"
      });
      continue;
    }

    existingUser.set({
      department: userSeed.department,
      failedLoginCount: 0,
      fullName: userSeed.fullName,
      jobTitle: userSeed.jobTitle,
      notes: userSeed.notes,
      roleId: role._id,
      status: "active"
    });
    existingUser.set("lockedUntil", undefined);

    await existingUser.save();
    result.updated += 1;
    result.existingPasswordsPreserved += 1;
    result.users.push({
      email,
      fullName: userSeed.fullName,
      role: userSeed.role,
      status: "updated"
    });
  }

  return result;
}
