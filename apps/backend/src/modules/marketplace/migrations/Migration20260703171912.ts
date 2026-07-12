import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260703171912 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "vendor_member" ("id" text not null, "vendor_id" text not null, "user_id" text null, "email" text not null, "role" text check ("role" in ('owner', 'manager')) not null default 'owner', "status" text check ("status" in ('active', 'disabled')) not null default 'active', "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "vendor_member_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_vendor_member_vendor_id" ON "vendor_member" ("vendor_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_vendor_member_user_id" ON "vendor_member" ("user_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_vendor_member_deleted_at" ON "vendor_member" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "vendor_member" cascade;`);
  }

}
