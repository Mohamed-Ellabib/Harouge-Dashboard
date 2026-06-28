import { logger } from "../shared/logger/logger";

import { seedInitialAdmin } from "./seeds/seed-admin";
import { seedPermissions } from "./seeds/seed-permissions";
import { seedRoles } from "./seeds/seed-roles";

export async function seedDatabase(): Promise<void> {
  const roleResult = await seedRoles();
  const permissionResult = await seedPermissions(roleResult.rolesByName);
  const adminResult = await seedInitialAdmin(
    roleResult.rolesByName.get("super_admin")
  );

  logger.info(
    {
      admin: adminResult,
      permissions: permissionResult,
      roles: {
        created: roleResult.created,
        matched: roleResult.matched,
        modified: roleResult.modified
      }
    },
    "Seed completed"
  );
}
