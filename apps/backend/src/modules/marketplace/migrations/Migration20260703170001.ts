import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260703170001 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "vendor_domain" drop constraint if exists "vendor_domain_domain_unique";`);
    this.addSql(`alter table if exists "vendor" drop constraint if exists "vendor_handle_unique";`);
    this.addSql(`create table if not exists "vendor" ("id" text not null, "name" text not null, "handle" text not null, "status" text check ("status" in ('draft', 'active', 'suspended')) not null default 'draft', "contact_email" text null, "logo_url" text null, "primary_color" text null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "vendor_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_vendor_handle_unique" ON "vendor" ("handle") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_vendor_deleted_at" ON "vendor" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "vendor_domain" ("id" text not null, "domain" text not null, "is_primary" boolean not null default false, "vendor_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "vendor_domain_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_vendor_domain_domain_unique" ON "vendor_domain" ("domain") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_vendor_domain_vendor_id" ON "vendor_domain" ("vendor_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_vendor_domain_deleted_at" ON "vendor_domain" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "vendor" cascade;`);

    this.addSql(`drop table if exists "vendor_domain" cascade;`);
  }

}
