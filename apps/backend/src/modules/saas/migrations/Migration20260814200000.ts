import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260814200000 extends Migration {
  override async up(): Promise<void> {
    // This private checkout journal is deliberately managed by this explicit
    // migration and the transactional Knex helper, not by a Medusa model.
    // Keeping it outside the model snapshot prevents generated schema changes
    // from weakening the cross-module Cart/Order constraints below.
    this.addSql(`
      create table if not exists "store_order_payment" (
        "id" text not null,
        "store_profile_id" text not null,
        "medusa_store_id" text not null,
        "cart_id" text not null,
        "order_id" text null,
        "payment_method" text not null,
        "status" text not null default 'pending',
        "bank_name" text null,
        "account_holder_name" text null,
        "account_reference" text null,
        "bank_instructions" jsonb null,
        "bank_configuration_revision" integer null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "store_order_payment_pkey" primary key ("id"),
        constraint "store_order_payment_method" check (
          payment_method in ('cod', 'bank_transfer')
        ),
        constraint "store_order_payment_status" check (
          status in ('pending', 'submitted')
        ),
        constraint "store_order_payment_submission_state" check (
          (status = 'pending' and order_id is null) or
          (status = 'submitted' and order_id is not null)
        ),
        constraint "store_order_payment_private_bank_snapshot" check (
          (
            payment_method = 'cod' and
            bank_name is null and account_holder_name is null and
            account_reference is null and bank_instructions is null and
            bank_configuration_revision is null
          ) or (
            payment_method = 'bank_transfer' and
            bank_name is not null and account_holder_name is not null and
            account_reference is not null and bank_instructions is not null and
            bank_configuration_revision is not null and
            bank_configuration_revision >= 1
          )
        )
      );
    `)
    this.addSql(`
      alter table if exists "store_order_payment"
      add constraint "store_order_payment_store_profile_id_foreign"
      foreign key ("store_profile_id") references "store_profile" ("id")
      on update cascade;
    `)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_store_order_payment_deleted_at" ON "store_order_payment" ("deleted_at") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_store_order_payment_cart_id_unique" ON "store_order_payment" ("cart_id") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_store_order_payment_order_id_unique" ON "store_order_payment" ("order_id") WHERE order_id IS NOT NULL AND deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_store_order_payment_store_profile_id" ON "store_order_payment" ("store_profile_id") WHERE deleted_at IS NULL;`)
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "store_order_payment" cascade;`)
  }
}
