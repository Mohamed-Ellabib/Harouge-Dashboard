import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260813100000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "store_profile" add column if not exists "configuration_revision" integer not null default 1;`,
    )
    this.addSql(
      `alter table if exists "store_profile" add column if not exists "configuration_updated_by" text null;`,
    )
    this.addSql(
      `alter table if exists "store_profile" add column if not exists "configuration_updated_at" timestamptz null;`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "store_profile" drop column if exists "configuration_updated_at";`,
    )
    this.addSql(
      `alter table if exists "store_profile" drop column if exists "configuration_updated_by";`,
    )
    this.addSql(
      `alter table if exists "store_profile" drop column if exists "configuration_revision";`,
    )
  }
}
