import { Migration } from "@medusajs/framework/mikro-orm/migrations"

const correctiveActor = "system:phase-3c-corrective-unpublish"
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

/**
 * Corrects the short-lived compatibility backfill from Migration20260814100000.
 * The bad revision remains immutable history, but it is never left published.
 * Untouched records receive a new empty draft; later administrator drafts are
 * preserved exactly and are only unpublished when the old system revision is
 * still the live pointer.
 */
export class Migration20260814110000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `insert into "storefront_document_revision" (
        id, storefront_document_id, store_profile_id, revision,
        schema_version, template_key, document, created_by,
        created_at, updated_at, deleted_at
      )
      select
        'stdrev_' || md5('storefront-corrective-revision:' || sd.store_profile_id || ':2'),
        sd.id, sd.store_profile_id, 2, 1, 'modern-market',
        ${emptyDocument}, '${correctiveActor}', now(), now(), null
      from "storefront_document" sd
      where sd.deleted_at is null
        and sd.published_revision = 1
        and sd.published_by = 'system:phase-3c-compatibility-backfill'
        and sd.latest_revision = 1
        and sd.draft_revision = 1
        and not exists (
          select 1 from "storefront_document_revision" sr
          where sr.storefront_document_id = sd.id
            and sr.revision = 2
            and sr.deleted_at is null
        );`,
    )
    this.addSql(
      `update "store_manual_bank_transfer_configuration" sb
      set revision = 2,
          updated_by = '${correctiveActor}',
          updated_at = now()
      from "storefront_document" sd
      where sb.storefront_document_id = sd.id
        and sb.store_profile_id = sd.store_profile_id
        and sb.deleted_at is null
        and sd.deleted_at is null
        and sd.published_revision = 1
        and sd.published_by = 'system:phase-3c-compatibility-backfill'
        and sd.latest_revision = 1
        and sd.draft_revision = 1
        and exists (
          select 1 from "storefront_document_revision" sr
          where sr.storefront_document_id = sd.id
            and sr.store_profile_id = sd.store_profile_id
            and sr.revision = 2
            and sr.created_by = '${correctiveActor}'
            and sr.deleted_at is null
        );`,
    )
    this.addSql(
      `update "storefront_document" sd
      set latest_revision = case
            when sd.latest_revision = 1 and sd.draft_revision = 1 and exists (
              select 1 from "storefront_document_revision" sr
              where sr.storefront_document_id = sd.id
                and sr.store_profile_id = sd.store_profile_id
                and sr.revision = 2
                and sr.created_by = '${correctiveActor}'
                and sr.deleted_at is null
            ) then 2 else sd.latest_revision end,
          draft_revision = case
            when sd.latest_revision = 1 and sd.draft_revision = 1 and exists (
              select 1 from "storefront_document_revision" sr
              where sr.storefront_document_id = sd.id
                and sr.store_profile_id = sd.store_profile_id
                and sr.revision = 2
                and sr.created_by = '${correctiveActor}'
                and sr.deleted_at is null
            ) then 2 else sd.draft_revision end,
          draft_updated_by = case
            when sd.latest_revision = 1 and sd.draft_revision = 1 and exists (
              select 1 from "storefront_document_revision" sr
              where sr.storefront_document_id = sd.id
                and sr.store_profile_id = sd.store_profile_id
                and sr.revision = 2
                and sr.created_by = '${correctiveActor}'
                and sr.deleted_at is null
            ) then '${correctiveActor}'
            else sd.draft_updated_by end,
          draft_updated_at = case
            when sd.latest_revision = 1 and sd.draft_revision = 1 and exists (
              select 1 from "storefront_document_revision" sr
              where sr.storefront_document_id = sd.id
                and sr.store_profile_id = sd.store_profile_id
                and sr.revision = 2
                and sr.created_by = '${correctiveActor}'
                and sr.deleted_at is null
            ) then now()
            else sd.draft_updated_at end,
          published_revision = null,
          published_by = null,
          published_at = null,
          updated_at = now()
      where sd.deleted_at is null
        and sd.published_revision = 1
        and sd.published_by = 'system:phase-3c-compatibility-backfill';`,
    )
  }

  override async down(): Promise<void> {
    // Deliberately irreversible: rollback must never republish invented content.
    this.addSql(`select 1;`)
  }
}
