import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260713155427 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "checkout_ownership_repair" ("id" text not null, "kind" text check ("kind" in ('cart', 'order')) not null, "cart_id" text null, "order_id" text null, "store_id" text null, "status" text check ("status" in ('pending', 'resolved')) not null default 'pending', "reason" text not null, "details" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "checkout_ownership_repair_pkey" primary key ("id"));`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_checkout_ownership_repair_deleted_at" ON "checkout_ownership_repair" ("deleted_at") WHERE deleted_at IS NULL;`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_checkout_ownership_repair_kind_status" ON "checkout_ownership_repair" ("kind", "status") WHERE deleted_at IS NULL;`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_checkout_ownership_repair_cart_id" ON "checkout_ownership_repair" ("cart_id") WHERE deleted_at IS NULL AND cart_id IS NOT NULL;`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_checkout_ownership_repair_order_id" ON "checkout_ownership_repair" ("order_id") WHERE deleted_at IS NULL AND order_id IS NOT NULL;`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_checkout_ownership_repair_store_id" ON "checkout_ownership_repair" ("store_id") WHERE deleted_at IS NULL AND store_id IS NOT NULL;`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "checkout_ownership_repair" cascade;`);
  }
}
