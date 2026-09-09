import { Migration } from "@medusajs/framework/mikro-orm/migrations"

const emptyLocalized = `jsonb_build_object('ar', '', 'en', '')`
const emptyDocument = `jsonb_build_object(
  'schema_version', 1,
  'template_key', 'modern-market',
  'hero', jsonb_build_object(
    'eyebrow', ${emptyLocalized},
    'heading', ${emptyLocalized},
    'subheading', ${emptyLocalized},
    'cta_label', ${emptyLocalized},
    'cta_target', 'catalog',
    'image_url', null
  ),
  'about', jsonb_build_object('title', ${emptyLocalized}, 'body', ${emptyLocalized}),
  'contact', jsonb_build_object('heading', ${emptyLocalized}, 'body', ${emptyLocalized}),
  'policies', jsonb_build_object(
    'delivery', jsonb_build_object('title', ${emptyLocalized}, 'body', ${emptyLocalized}),
    'returns', jsonb_build_object('title', ${emptyLocalized}, 'body', ${emptyLocalized}),
    'privacy', jsonb_build_object('title', ${emptyLocalized}, 'body', ${emptyLocalized}),
    'terms', jsonb_build_object('title', ${emptyLocalized}, 'body', ${emptyLocalized})
  )
)`

export class Migration20260814100000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "storefront_document" (
        "id" text not null,
        "store_profile_id" text not null,
        "latest_revision" integer not null default 1,
        "draft_revision" integer not null default 1,
        "published_revision" integer null,
        "draft_updated_by" text null,
        "draft_updated_at" timestamptz null,
        "published_by" text null,
        "published_at" timestamptz null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "storefront_document_pkey" primary key ("id"),
        constraint "storefront_document_id_profile_unique" unique ("id", "store_profile_id"),
        constraint "storefront_document_revision_bounds" check (
          latest_revision >= 1 and draft_revision >= 1 and
          draft_revision <= latest_revision and
          (published_revision is null or (published_revision >= 1 and published_revision <= latest_revision))
        )
      );`,
    )
    this.addSql(
      `create table if not exists "storefront_document_revision" (
        "id" text not null,
        "storefront_document_id" text not null,
        "store_profile_id" text not null,
        "revision" integer not null,
        "schema_version" integer not null default 1,
        "template_key" text check ("template_key" in ('luxe-commerce', 'modern-market', 'home-living')) not null,
        "document" jsonb not null,
        "created_by" text null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "storefront_document_revision_pkey" primary key ("id"),
        constraint "storefront_document_revision_number" check (revision >= 1),
        constraint "storefront_document_revision_schema" check (schema_version = 1)
      );`,
    )
    this.addSql(
      `create table if not exists "store_manual_bank_transfer_configuration" (
        "id" text not null,
        "storefront_document_id" text not null,
        "store_profile_id" text not null,
        "bank_name" text null,
        "account_holder_name" text null,
        "account_reference" text null,
        "instructions" jsonb not null,
        "revision" integer not null default 1,
        "updated_by" text null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "store_manual_bank_transfer_configuration_pkey" primary key ("id"),
        constraint "store_manual_bank_transfer_configuration_revision" check (revision >= 1)
      );`,
    )

    this.addSql(`alter table if exists "storefront_document" add constraint "storefront_document_store_profile_id_foreign" foreign key ("store_profile_id") references "store_profile" ("id") on update cascade;`)
    this.addSql(`alter table if exists "storefront_document_revision" add constraint "storefront_document_revision_document_id_foreign" foreign key ("storefront_document_id") references "storefront_document" ("id") on update cascade;`)
    this.addSql(`alter table if exists "storefront_document_revision" add constraint "storefront_document_revision_document_profile_foreign" foreign key ("storefront_document_id", "store_profile_id") references "storefront_document" ("id", "store_profile_id") on update cascade;`)
    this.addSql(`alter table if exists "storefront_document_revision" add constraint "storefront_document_revision_store_profile_id_foreign" foreign key ("store_profile_id") references "store_profile" ("id") on update cascade;`)
    this.addSql(`alter table if exists "store_manual_bank_transfer_configuration" add constraint "store_manual_bank_transfer_configuration_storefront_document_id_foreign" foreign key ("storefront_document_id") references "storefront_document" ("id") on update cascade;`)
    this.addSql(`alter table if exists "store_manual_bank_transfer_configuration" add constraint "store_manual_bank_transfer_document_profile_foreign" foreign key ("storefront_document_id", "store_profile_id") references "storefront_document" ("id", "store_profile_id") on update cascade;`)
    this.addSql(`alter table if exists "store_manual_bank_transfer_configuration" add constraint "store_manual_bank_transfer_store_profile_id_foreign" foreign key ("store_profile_id") references "store_profile" ("id") on update cascade;`)

    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_storefront_document_deleted_at" ON "storefront_document" ("deleted_at") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_storefront_document_store_profile_id_unique" ON "storefront_document" ("store_profile_id") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_storefront_document_published_revision" ON "storefront_document" ("published_revision") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_storefront_document_revision_deleted_at" ON "storefront_document_revision" ("deleted_at") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_storefront_document_revision_storefront_document_id_revision_unique" ON "storefront_document_revision" ("storefront_document_id", "revision") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_storefront_document_revision_store_profile_id" ON "storefront_document_revision" ("store_profile_id") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_storefront_document_revision_store_profile_id_revision" ON "storefront_document_revision" ("store_profile_id", "revision") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_storefront_document_revision_template_key" ON "storefront_document_revision" ("template_key") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_storefront_document_revision_storefront_document_id_fk" ON "storefront_document_revision" ("storefront_document_id");`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_storefront_document_revision_store_profile_id_fk" ON "storefront_document_revision" ("store_profile_id");`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_store_manual_bank_transfer_configuration_deleted_at" ON "store_manual_bank_transfer_configuration" ("deleted_at") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_store_manual_bank_transfer_configuration_storefront_document_id_unique" ON "store_manual_bank_transfer_configuration" ("storefront_document_id") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_store_manual_bank_transfer_configuration_store_profile_id_unique" ON "store_manual_bank_transfer_configuration" ("store_profile_id") WHERE deleted_at IS NULL;`)

    this.addSql(
      `insert into "storefront_document" (
        id, store_profile_id, latest_revision, draft_revision,
        published_revision, draft_updated_by, draft_updated_at,
        published_by, published_at, created_at, updated_at, deleted_at
      )
      select
        'stdoc_' || md5('storefront-document:' || sp.id), sp.id, 1, 1,
        null,
        null, coalesce(sp.updated_at, now()),
        null, null,
        coalesce(sp.created_at, now()), coalesce(sp.updated_at, now()), null
      from "store_profile" sp
      where sp.deleted_at is null
        and not exists (
          select 1 from "storefront_document" sd
          where sd.store_profile_id = sp.id and sd.deleted_at is null
        );`,
    )
    this.addSql(
      `insert into "storefront_document_revision" (
        id, storefront_document_id, store_profile_id, revision,
        schema_version, template_key, document, created_by,
        created_at, updated_at, deleted_at
      )
      select
        'stdrev_' || md5('storefront-revision:' || sd.store_profile_id || ':1'),
        sd.id, sd.store_profile_id, 1, 1, 'modern-market',
        ${emptyDocument}, null,
        sd.created_at, sd.updated_at, null
      from "storefront_document" sd
      where sd.deleted_at is null
        and not exists (
          select 1 from "storefront_document_revision" sr
          where sr.storefront_document_id = sd.id and sr.revision = 1 and sr.deleted_at is null
        );`,
    )
    this.addSql(
      `insert into "store_manual_bank_transfer_configuration" (
        id, storefront_document_id, store_profile_id, bank_name,
        account_holder_name, account_reference, instructions, revision,
        updated_by, created_at, updated_at, deleted_at
      )
      select
        'stbank_' || md5('storefront-bank:' || sd.store_profile_id),
        sd.id, sd.store_profile_id, null, null, null,
        ${emptyLocalized}, 1, null, sd.created_at, sd.updated_at, null
      from "storefront_document" sd
      where sd.deleted_at is null
        and not exists (
          select 1 from "store_manual_bank_transfer_configuration" sb
          where sb.storefront_document_id = sd.id and sb.deleted_at is null
        );`,
    )
    this.addSql(`
      create or replace function reject_storefront_document_revision_mutation()
      returns trigger language plpgsql as $$
      begin
        raise exception 'storefront document revisions are immutable'
          using errcode = '55000';
      end;
      $$;
    `)
    this.addSql(`
      drop trigger if exists storefront_document_revision_immutable
        on "storefront_document_revision";
      create trigger storefront_document_revision_immutable
        before update or delete on "storefront_document_revision"
        for each row execute function reject_storefront_document_revision_mutation();
    `)
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "store_manual_bank_transfer_configuration" cascade;`)
    this.addSql(`drop table if exists "storefront_document_revision" cascade;`)
    this.addSql(`drop table if exists "storefront_document" cascade;`)
    this.addSql(`drop function if exists reject_storefront_document_revision_mutation();`)
  }
}
