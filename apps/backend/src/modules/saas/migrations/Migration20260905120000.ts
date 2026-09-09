import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260905120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`create table if not exists store_creation_draft (
      id text primary key, request_key text not null, revision integer not null default 1 check (revision > 0),
      status text not null default 'draft' check (status in ('draft','confirming','confirmed')),
      "values" jsonb not null, checkpoints jsonb not null default '{}',
      store_profile_id text null references store_profile(id), created_by text not null,
      created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz null);
      create unique index if not exists IDX_store_creation_request on store_creation_draft(request_key) where deleted_at is null;
      create index if not exists IDX_store_creation_updated on store_creation_draft(updated_at) where deleted_at is null;
      create index if not exists IDX_store_creation_profile on store_creation_draft(store_profile_id) where deleted_at is null;
      create table if not exists store_creation_trial (
      id text primary key, draft_id text not null references store_creation_draft(id),
      status text not null default 'cart' check (status in ('cart','ordered')), "values" jsonb not null,
      created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz null);
      create index if not exists IDX_store_creation_trial_draft on store_creation_trial(draft_id) where deleted_at is null;`)
  }
  override async down(): Promise<void> {
    this.addSql(`drop table if exists store_creation_trial; drop table if exists store_creation_draft;`)
  }
}
