import type { RoleKey } from "../../shared/constants/role.constants";
import { RoleModel, type RoleDocument } from "../../modules/roles/role.model";

import { defaultRoleSeeds } from "./default-roles.seed";
import {
  addSeedResult,
  createEmptySeedResult,
  type SeedOperationResult
} from "./seed.types";

export interface SeedRolesResult extends SeedOperationResult {
  rolesByName: Map<RoleKey, RoleDocument>;
}

export async function seedRoles(): Promise<SeedRolesResult> {
  const result = createEmptySeedResult();

  for (const roleSeed of defaultRoleSeeds) {
    const writeResult = await RoleModel.updateOne(
      { name: roleSeed.name },
      {
        $set: {
          description: roleSeed.description,
          displayName: roleSeed.displayName,
          isSystem: roleSeed.isSystem
        },
        $setOnInsert: {
          name: roleSeed.name
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

  const roleDocuments = await RoleModel.find({
    name: { $in: defaultRoleSeeds.map((roleSeed) => roleSeed.name) }
  });

  const rolesByName = new Map<RoleKey, RoleDocument>();

  for (const roleDocument of roleDocuments) {
    rolesByName.set(roleDocument.name, roleDocument);
  }

  return {
    ...result,
    rolesByName
  };
}
