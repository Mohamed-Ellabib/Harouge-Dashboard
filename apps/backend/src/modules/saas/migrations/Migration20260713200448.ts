import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260713200448 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "tenant" drop constraint if exists "tenant_key_unique";`,
    );
    this.addSql(
      `alter table if exists "store_provisioning_lease" drop constraint if exists "store_provisioning_lease_idempotency_key_unique";`,
    );
    this.addSql(
      `alter table if exists "store_provisioning" drop constraint if exists "store_provisioning_requested_domain_unique";`,
    );
    this.addSql(
      `alter table if exists "store_provisioning" drop constraint if exists "store_provisioning_requested_handle_unique";`,
    );
    this.addSql(
      `alter table if exists "store_provisioning" drop constraint if exists "store_provisioning_idempotency_key_unique";`,
    );
    this.addSql(
      `create table if not exists "store_provisioning" ("id" text not null, "idempotency_key" text not null, "request_hash" text not null, "tenant_id" text null, "store_profile_id" text null, "medusa_store_id" text null, "sales_channel_id" text null, "publishable_api_key_id" text null, "region_id" text null, "stock_location_id" text null, "store_domain_id" text null, "store_brand_id" text null, "legacy_vendor_id" text null, "merchant_account_reference" text null, "merchant_membership_id" text null, "requested_handle" text not null, "requested_domain" text not null, "requested_owner_email" text not null, "requested_plan_code" text check ("requested_plan_code" in ('starter_whatsapp', 'professional_commerce')) not null, "status" text check ("status" in ('pending', 'running', 'completed', 'failed', 'requires_attention', 'cancelled')) not null default 'pending', "current_step" text not null default 'validate_input', "request_snapshot" jsonb not null, "result_snapshot" jsonb null, "resource_state" jsonb null, "failure_code" text null, "failure_message_safe" text null, "retry_count" integer not null default 0, "actor_id" text not null, "completed_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "store_provisioning_pkey" primary key ("id"));`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_store_provisioning_deleted_at" ON "store_provisioning" ("deleted_at") WHERE deleted_at IS NULL;`,
    );
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_store_provisioning_idempotency_key_unique" ON "store_provisioning" ("idempotency_key") WHERE deleted_at IS NULL;`,
    );
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_store_provisioning_requested_handle_unique" ON "store_provisioning" ("requested_handle") WHERE deleted_at IS NULL;`,
    );
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_store_provisioning_requested_domain_unique" ON "store_provisioning" ("requested_domain") WHERE deleted_at IS NULL;`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_store_provisioning_status_current_step" ON "store_provisioning" ("status", "current_step") WHERE deleted_at IS NULL;`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_store_provisioning_tenant_id" ON "store_provisioning" ("tenant_id") WHERE deleted_at IS NULL AND tenant_id IS NOT NULL;`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_store_provisioning_store_profile_id" ON "store_provisioning" ("store_profile_id") WHERE deleted_at IS NULL AND store_profile_id IS NOT NULL;`,
    );

    this.addSql(
      `create table if not exists "store_provisioning_event" ("id" text not null, "provisioning_id" text not null, "event_type" text check ("event_type" in ('started', 'step_completed', 'resource_reused', 'resource_retained', 'failed', 'requires_attention', 'completed', 'cancelled')) not null, "step" text not null, "actor_id" text not null, "safe_details" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "store_provisioning_event_pkey" primary key ("id"));`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_store_provisioning_event_provisioning_id" ON "store_provisioning_event" ("provisioning_id") WHERE deleted_at IS NULL;`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_store_provisioning_event_deleted_at" ON "store_provisioning_event" ("deleted_at") WHERE deleted_at IS NULL;`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_store_provisioning_event_provisioning_id_created_at" ON "store_provisioning_event" ("provisioning_id", "created_at") WHERE deleted_at IS NULL;`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_store_provisioning_event_event_type" ON "store_provisioning_event" ("event_type") WHERE deleted_at IS NULL;`,
    );

    this.addSql(
      `create table if not exists "store_provisioning_lease" ("id" text not null, "idempotency_key" text not null, "provisioning_id" text not null, "lease_token" text not null, "expires_at" timestamptz not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "store_provisioning_lease_pkey" primary key ("id"));`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_store_provisioning_lease_provisioning_id" ON "store_provisioning_lease" ("provisioning_id") WHERE deleted_at IS NULL;`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_store_provisioning_lease_deleted_at" ON "store_provisioning_lease" ("deleted_at") WHERE deleted_at IS NULL;`,
    );
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_store_provisioning_lease_idempotency_key_unique" ON "store_provisioning_lease" ("idempotency_key") WHERE deleted_at IS NULL;`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_store_provisioning_lease_expires_at" ON "store_provisioning_lease" ("expires_at") WHERE deleted_at IS NULL;`,
    );

    this.addSql(
      `alter table if exists "tenant" add column if not exists "key" text null;`,
    );
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_tenant_key_unique" ON "tenant" ("key") WHERE deleted_at IS NULL AND key IS NOT NULL;`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "store_provisioning" cascade;`);

    this.addSql(`drop table if exists "store_provisioning_event" cascade;`);

    this.addSql(`drop table if exists "store_provisioning_lease" cascade;`);

    this.addSql(`drop index if exists "IDX_tenant_key_unique";`);
    this.addSql(`alter table if exists "tenant" drop column if exists "key";`);
  }
}
