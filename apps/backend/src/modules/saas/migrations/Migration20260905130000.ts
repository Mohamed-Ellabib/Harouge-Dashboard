import { Migration } from "@medusajs/framework/mikro-orm/migrations"
export class Migration20260905130000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`create table if not exists store_order_progress (
      id text primary key, order_id text not null references "order"(id), store_id text not null references store(id),
      status text not null default 'confirmed' check(status in ('confirmed','processing','shipped','delivered')),
      revision integer not null default 1, events jsonb not null default '[]',
      created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz null);
      create unique index if not exists IDX_store_order_progress_order on store_order_progress(order_id) where deleted_at is null;
      create index if not exists IDX_store_order_progress_store on store_order_progress(store_id);
      create table if not exists store_order_tracking_grant (
      id text primary key, token_hash text not null, order_id text not null references "order"(id), store_id text not null references store(id),
      snapshot jsonb not null, expires_at timestamptz not null,
      created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz null);
      create unique index if not exists IDX_tracking_hash on store_order_tracking_grant(token_hash) where deleted_at is null;
      create index if not exists IDX_tracking_order on store_order_tracking_grant(order_id);
      create index if not exists IDX_tracking_store on store_order_tracking_grant(store_id);
      alter table store_creation_draft enable row level security;
      alter table store_creation_trial enable row level security;
      alter table store_order_progress enable row level security;
      alter table store_order_tracking_grant enable row level security;`)
  }
  override async down(): Promise<void> { this.addSql("drop table if exists store_order_tracking_grant; drop table if exists store_order_progress;") }
}
