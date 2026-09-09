/* eslint-disable @medusajs/use-medusa-error-not-generic-error */
import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

const expectedGuard = "validated-v1"

export default async function hardenSupabaseDevelopment({
  container,
}: ExecArgs) {
  if (
    process.env.NODE_ENV !== "development" ||
    process.env.LABIBTECH_SUPABASE_DEVELOPMENT_GUARD !== expectedGuard ||
    !process.env.LABIBTECH_SUPABASE_DEVELOPMENT_RUN_TOKEN
  ) {
    throw new Error(
      "The guarded Supabase development runner is required for hardening.",
    )
  }

  const database = container.resolve(
    ContainerRegistrationKeys.PG_CONNECTION,
  ) as any

  await database.transaction(async (transaction: any) => {
    await transaction.raw(`
      REVOKE ALL ON SCHEMA public FROM PUBLIC;
      REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
      REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC;
      REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;

      ALTER DEFAULT PRIVILEGES REVOKE ALL ON TABLES FROM PUBLIC;
      ALTER DEFAULT PRIVILEGES REVOKE ALL ON SEQUENCES FROM PUBLIC;
      ALTER DEFAULT PRIVILEGES REVOKE ALL ON FUNCTIONS FROM PUBLIC;
      ALTER DEFAULT PRIVILEGES IN SCHEMA public
        REVOKE ALL ON TABLES FROM PUBLIC;
      ALTER DEFAULT PRIVILEGES IN SCHEMA public
        REVOKE ALL ON SEQUENCES FROM PUBLIC;
      ALTER DEFAULT PRIVILEGES IN SCHEMA public
        REVOKE ALL ON FUNCTIONS FROM PUBLIC;

      DO $hardening$
      DECLARE
        role_name text;
      BEGIN
        FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated']
        LOOP
          IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
            EXECUTE format('REVOKE ALL ON SCHEMA public FROM %I', role_name);
            EXECUTE format(
              'REVOKE ALL ON ALL TABLES IN SCHEMA public FROM %I',
              role_name
            );
            EXECUTE format(
              'REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM %I',
              role_name
            );
            EXECUTE format(
              'REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM %I',
              role_name
            );
            EXECUTE format(
              'ALTER DEFAULT PRIVILEGES REVOKE ALL ON TABLES FROM %I',
              role_name
            );
            EXECUTE format(
              'ALTER DEFAULT PRIVILEGES REVOKE ALL ON SEQUENCES FROM %I',
              role_name
            );
            EXECUTE format(
              'ALTER DEFAULT PRIVILEGES REVOKE ALL ON FUNCTIONS FROM %I',
              role_name
            );
            EXECUTE format(
              'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM %I',
              role_name
            );
            EXECUTE format(
              'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM %I',
              role_name
            );
            EXECUTE format(
              'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM %I',
              role_name
            );
          END IF;
        END LOOP;
      END
      $hardening$;
    `)

    const remainingTableGrants = await transaction.raw(`
      SELECT grantee, table_name, privilege_type
      FROM information_schema.role_table_grants
      WHERE table_schema = 'public'
        AND grantee IN ('PUBLIC', 'anon', 'authenticated')
      LIMIT 1
    `)
    const remainingSequenceGrants = await transaction.raw(`
      SELECT grantee, object_name, privilege_type
      FROM information_schema.role_usage_grants
      WHERE object_schema = 'public'
        AND object_type = 'SEQUENCE'
        AND grantee IN ('PUBLIC', 'anon', 'authenticated')
      LIMIT 1
    `)
    const remainingRoutineGrants = await transaction.raw(`
      SELECT grantee, routine_name, privilege_type
      FROM information_schema.routine_privileges
      WHERE routine_schema = 'public'
        AND grantee IN ('PUBLIC', 'anon', 'authenticated')
      LIMIT 1
    `)
    const remainingSchemaAccess = await transaction.raw(`
      SELECT role_name
      FROM unnest(ARRAY['anon', 'authenticated']) AS role_name
      WHERE EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name)
        AND has_schema_privilege(role_name, 'public', 'USAGE')
      LIMIT 1
    `)
    const remainingDefaultGrants = await transaction.raw(`
      SELECT 1
      FROM pg_default_acl AS defaults
      CROSS JOIN LATERAL aclexplode(defaults.defaclacl) AS privilege
      LEFT JOIN pg_roles AS grantee ON grantee.oid = privilege.grantee
      WHERE defaults.defaclrole = current_user::regrole
        AND (
          defaults.defaclnamespace = 0 OR
          defaults.defaclnamespace = to_regnamespace('public')
        )
        AND (
          privilege.grantee = 0 OR
          grantee.rolname IN ('anon', 'authenticated')
        )
      LIMIT 1
    `)

    if (
      remainingTableGrants.rows?.length ||
      remainingSequenceGrants.rows?.length ||
      remainingRoutineGrants.rows?.length ||
      remainingSchemaAccess.rows?.length ||
      remainingDefaultGrants.rows?.length
    ) {
      throw new Error(
        "Supabase development Data API privileges remain on the application schema.",
      )
    }
  })

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  logger.info("Supabase development application schema access is hardened.")
}
