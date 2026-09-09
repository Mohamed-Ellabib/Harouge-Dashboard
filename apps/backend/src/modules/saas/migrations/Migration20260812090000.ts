import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260812090000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "platform_setting" ("id" text not null, "scope" text not null default 'system', "values" jsonb not null, "revision" integer not null default 1, "updated_by" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "platform_setting_pkey" primary key ("id"));`,
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_platform_setting_deleted_at" ON "platform_setting" ("deleted_at") WHERE deleted_at IS NULL;`,
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_platform_setting_scope_unique" ON "platform_setting" ("scope") WHERE deleted_at IS NULL;`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "platform_setting" cascade;`)
  }
}
