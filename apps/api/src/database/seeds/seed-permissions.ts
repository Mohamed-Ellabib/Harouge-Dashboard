import type { Types } from "mongoose";

import { PermissionModel } from "../../modules/permissions/permission.model";
import type { RoleDocument } from "../../modules/roles/role.model";
import type { RoleKey } from "../../shared/constants/role.constants";

import {
  createDefaultPermissionSeed,
  defaultPermissionRequirementsByRole
} from "./default-permissions.seed";
import {
  addSeedResult,
  createEmptySeedResult,
  type SeedOperationResult
} from "./seed.types";

export async function seedPermissions(
  rolesByName: ReadonlyMap<RoleKey, RoleDocument>
): Promise<SeedOperationResult> {
  const result = createEmptySeedResult();

  for (const [roleName, requirements] of Object.entries(
    defaultPermissionRequirementsByRole
  ) as Array<[RoleKey, typeof defaultPermissionRequirementsByRole[RoleKey]]>) {
    const roleDocument = rolesByName.get(roleName);

    if (!roleDocument) {
      throw new Error(`Cannot seed permissions because role is missing: ${roleName}`);
    }

    const expectedPermissionNames = requirements.map((requirement) =>
      createDefaultPermissionSeed(requirement).name
    );
    for (const requirement of requirements) {
      const permissionSeed = createDefaultPermissionSeed(requirement);
      const roleId = roleDocument._id as Types.ObjectId;

      const writeResult = await PermissionModel.updateOne(
        {
          name: permissionSeed.name,
          roleId
        },
        {
          $set: {
            description: permissionSeed.description,
            displayName: permissionSeed.displayName,
            module: permissionSeed.module
          },
          $setOnInsert: {
            name: permissionSeed.name,
            roleId
          }
        },
        { upsert: true }
      );

      addSeedResult(result, {
        created: writeResult.upsertedCount,
        matched: writeResult.matchedCount,
        modified: writeResult.modifiedCount
      });
    }

    const deleteResult = await PermissionModel.deleteMany({
      name: { $nin: expectedPermissionNames },
      roleId: roleDocument._id
    });

    addSeedResult(result, {
      modified: deleteResult.deletedCount
    });
  }

  return result;
}
