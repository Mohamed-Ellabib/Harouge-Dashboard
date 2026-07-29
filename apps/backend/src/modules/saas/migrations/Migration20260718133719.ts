import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260718133719 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "store_commerce_readiness" drop constraint if exists "store_commerce_readiness_store_profile_id_unique";`);
    this.addSql(`alter table if exists "store_commerce_setup_lease" drop constraint if exists "store_commerce_setup_lease_lease_key_unique";`);
    this.addSql(`alter table if exists "store_commerce_setup" drop constraint if exists "store_commerce_setup_store_profile_id_unique";`);
    this.addSql(`alter table if exists "store_commerce_setup" drop constraint if exists "store_commerce_setup_idempotency_key_unique";`);
    this.addSql(`create table if not exists "store_commerce_setup" ("id" text not null, "idempotency_key" text not null, "request_hash" text not null, "store_profile_id" text not null, "status" text check ("status" in ('pending', 'running', 'completed', 'failed', 'requires_attention', 'cancelled')) not null default 'pending', "current_step" text not null default 'validate_store', "request_snapshot" jsonb not null, "result_snapshot" jsonb null, "resource_state" jsonb null, "failure_code" text null, "failure_message_safe" text null, "retry_count" integer not null default 0, "actor_id" text not null, "completed_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "store_commerce_setup_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_store_commerce_setup_deleted_at" ON "store_commerce_setup" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_store_commerce_setup_idempotency_key_unique" ON "store_commerce_setup" ("idempotency_key") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_store_commerce_setup_store_profile_id_status" ON "store_commerce_setup" ("store_profile_id", "status") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_store_commerce_setup_store_profile_id_unique" ON "store_commerce_setup" ("store_profile_id") WHERE deleted_at IS NULL AND status IN ('pending', 'running', 'failed', 'requires_attention');`);

    this.addSql(`create table if not exists "store_commerce_setup_event" ("id" text not null, "setup_id" text not null, "event_type" text check ("event_type" in ('started', 'step_completed', 'resource_reused', 'resource_retained', 'failed', 'requires_attention', 'completed', 'cancelled')) not null, "step" text not null, "actor_id" text not null, "safe_details" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "store_commerce_setup_event_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_store_commerce_setup_event_setup_id" ON "store_commerce_setup_event" ("setup_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_store_commerce_setup_event_deleted_at" ON "store_commerce_setup_event" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_store_commerce_setup_event_setup_id_created_at" ON "store_commerce_setup_event" ("setup_id", "created_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_store_commerce_setup_event_event_type" ON "store_commerce_setup_event" ("event_type") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "store_commerce_setup_lease" ("id" text not null, "lease_key" text not null, "setup_id" text not null, "lease_token" text not null, "expires_at" timestamptz not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "store_commerce_setup_lease_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_store_commerce_setup_lease_setup_id" ON "store_commerce_setup_lease" ("setup_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_store_commerce_setup_lease_deleted_at" ON "store_commerce_setup_lease" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_store_commerce_setup_lease_lease_key_unique" ON "store_commerce_setup_lease" ("lease_key") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_store_commerce_setup_lease_expires_at" ON "store_commerce_setup_lease" ("expires_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "store_commerce_readiness" ("id" text not null, "store_profile_id" text not null, "capability" text check ("capability" in ('online_checkout')) not null default 'online_checkout', "plan_code" text check ("plan_code" in ('starter_whatsapp', 'professional_commerce')) not null, "status" text check ("status" in ('not_required', 'pending', 'configuring', 'ready', 'failed', 'requires_attention', 'disabled')) not null default 'pending', "medusa_store_id" text null, "region_id" text null, "stock_location_id" text null, "fulfillment_provider_id" text null, "shipping_profile_id" text null, "fulfillment_set_id" text null, "service_zone_id" text null, "shipping_option_ids" jsonb null, "last_setup_id" text null, "failure_code" text null, "failure_message_safe" text null, "validated_at" timestamptz null, "revision" integer not null default 1, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "store_commerce_readiness_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_store_commerce_readiness_store_profile_id_unique" ON "store_commerce_readiness" ("store_profile_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_store_commerce_readiness_deleted_at" ON "store_commerce_readiness" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_store_commerce_readiness_status" ON "store_commerce_readiness" ("status") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_store_commerce_readiness_medusa_store_id" ON "store_commerce_readiness" ("medusa_store_id") WHERE deleted_at IS NULL AND medusa_store_id IS NOT NULL;`);

    this.addSql(`alter table if exists "store_commerce_readiness" add constraint "store_commerce_readiness_store_profile_id_foreign" foreign key ("store_profile_id") references "store_profile" ("id") on update cascade;`);
    this.addSql(`insert into "store_commerce_readiness" ("id", "store_profile_id", "capability", "plan_code", "status", "revision", "created_at", "updated_at") select 'stready_' || substring(md5('commerce-readiness:' || "id") from 1 for 26), "id", 'online_checkout', "plan_code", case when "plan_code" = 'professional_commerce' then 'pending' else 'not_required' end, 1, now(), now() from "store_profile" where "deleted_at" is null on conflict do nothing;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "store_commerce_setup" cascade;`);

    this.addSql(`drop table if exists "store_commerce_setup_event" cascade;`);

    this.addSql(`drop table if exists "store_commerce_setup_lease" cascade;`);

    this.addSql(`drop table if exists "store_commerce_readiness" cascade;`);
  }

}
