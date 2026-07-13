import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260713123947 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "merchant_membership" drop constraint if exists "merchant_membership_store_profile_id_merchant_account_reference_unique";`);
    this.addSql(`alter table if exists "store_brand" drop constraint if exists "store_brand_store_profile_id_unique";`);
    this.addSql(`alter table if exists "store_domain" drop constraint if exists "store_domain_normalized_hostname_unique";`);
    this.addSql(`alter table if exists "store_profile" drop constraint if exists "store_profile_legacy_vendor_id_unique";`);
    this.addSql(`alter table if exists "store_profile" drop constraint if exists "store_profile_handle_unique";`);
    this.addSql(`create table if not exists "tenant" ("id" text not null, "name" text not null, "status" text check ("status" in ('active', 'suspended', 'archived')) not null default 'active', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "tenant_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_tenant_deleted_at" ON "tenant" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_tenant_status" ON "tenant" ("status") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "store_profile" ("id" text not null, "tenant_id" text not null, "legacy_vendor_id" text null, "handle" text not null, "status" text check ("status" in ('draft', 'active', 'suspended', 'archived')) not null default 'draft', "locale" text not null default 'ar-LY', "timezone" text not null default 'Africa/Tripoli', "plan_code" text check ("plan_code" in ('starter_whatsapp', 'professional_commerce')) not null default 'starter_whatsapp', "public_contact_email" text null, "public_phone" text null, "whatsapp_number" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "store_profile_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_store_profile_tenant_id" ON "store_profile" ("tenant_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_store_profile_deleted_at" ON "store_profile" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_store_profile_handle_unique" ON "store_profile" ("handle") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_store_profile_legacy_vendor_id_unique" ON "store_profile" ("legacy_vendor_id") WHERE deleted_at IS NULL AND legacy_vendor_id IS NOT NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_store_profile_status" ON "store_profile" ("status") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "store_domain" ("id" text not null, "store_profile_id" text not null, "normalized_hostname" text not null, "original_hostname" text null, "type" text check ("type" in ('temporary', 'custom')) not null default 'temporary', "verification_status" text check ("verification_status" in ('pending', 'verified', 'failed')) not null default 'pending', "ssl_status" text check ("ssl_status" in ('pending', 'active', 'failed')) not null default 'pending', "is_primary" boolean not null default false, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "store_domain_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_store_domain_store_profile_id" ON "store_domain" ("store_profile_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_store_domain_deleted_at" ON "store_domain" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_store_domain_normalized_hostname_unique" ON "store_domain" ("normalized_hostname") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_store_domain_one_primary" ON "store_domain" ("store_profile_id") WHERE deleted_at IS NULL AND is_primary = true;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_store_domain_verification_status" ON "store_domain" ("verification_status") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "store_brand" ("id" text not null, "store_profile_id" text not null, "logo_url" text null, "favicon_url" text null, "primary_color" text null, "secondary_color" text null, "typography_key" text null, "configuration" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "store_brand_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_store_brand_store_profile_id_unique" ON "store_brand" ("store_profile_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_store_brand_deleted_at" ON "store_brand" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "merchant_membership" ("id" text not null, "store_profile_id" text not null, "merchant_account_reference" text not null, "role" text check ("role" in ('owner', 'manager')) not null default 'owner', "status" text check ("status" in ('active', 'disabled')) not null default 'active', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "merchant_membership_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_merchant_membership_store_profile_id" ON "merchant_membership" ("store_profile_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_merchant_membership_deleted_at" ON "merchant_membership" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_merchant_membership_store_profile_id_merchant_account_reference_unique" ON "merchant_membership" ("store_profile_id", "merchant_account_reference") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_merchant_membership_merchant_account_reference" ON "merchant_membership" ("merchant_account_reference") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_merchant_membership_status" ON "merchant_membership" ("status") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "store_profile" add constraint "store_profile_tenant_id_foreign" foreign key ("tenant_id") references "tenant" ("id") on update cascade;`);

    this.addSql(`alter table if exists "store_domain" add constraint "store_domain_store_profile_id_foreign" foreign key ("store_profile_id") references "store_profile" ("id") on update cascade;`);

    this.addSql(`alter table if exists "store_brand" add constraint "store_brand_store_profile_id_foreign" foreign key ("store_profile_id") references "store_profile" ("id") on update cascade;`);

    this.addSql(`alter table if exists "merchant_membership" add constraint "merchant_membership_store_profile_id_foreign" foreign key ("store_profile_id") references "store_profile" ("id") on update cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "store_profile" drop constraint if exists "store_profile_tenant_id_foreign";`);

    this.addSql(`alter table if exists "store_domain" drop constraint if exists "store_domain_store_profile_id_foreign";`);

    this.addSql(`alter table if exists "store_brand" drop constraint if exists "store_brand_store_profile_id_foreign";`);

    this.addSql(`alter table if exists "merchant_membership" drop constraint if exists "merchant_membership_store_profile_id_foreign";`);

    this.addSql(`drop table if exists "tenant" cascade;`);

    this.addSql(`drop table if exists "store_profile" cascade;`);

    this.addSql(`drop table if exists "store_domain" cascade;`);

    this.addSql(`drop table if exists "store_brand" cascade;`);

    this.addSql(`drop table if exists "merchant_membership" cascade;`);
  }

}
