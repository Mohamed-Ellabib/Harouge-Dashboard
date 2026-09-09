import { Migration } from "@medusajs/framework/mikro-orm/migrations"

const currentTemplateConstraint = `
  check ("template_key" in (
    'luxe-commerce',
    'luxe-commerce-full',
    'modern-market',
    'home-living',
    'standard'
  ))
`

const previousTemplateConstraint = `
  check ("template_key" in (
    'luxe-commerce',
    'luxe-commerce-full',
    'modern-market',
    'home-living'
  ))
`

/** Adds the owner-approved Standard template without changing commerce authority. */
export class Migration20260829100000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      do $$
      declare existing_constraint text;
      begin
        select c.conname into existing_constraint
          from pg_constraint c
         where c.conrelid = 'storefront_document_revision'::regclass
           and c.contype = 'c'
           and pg_get_constraintdef(c.oid) ilike '%template_key%'
         limit 1;
        if existing_constraint is not null then
          execute format('alter table "storefront_document_revision" drop constraint %I', existing_constraint);
        end if;
        alter table "storefront_document_revision"
          add constraint "storefront_document_revision_template_key_check"
          ${currentTemplateConstraint};
      end $$;
    `)
  }

  override async down(): Promise<void> {
    this.addSql(`
      do $$
      declare existing_constraint text;
      begin
        if exists (select 1 from "storefront_document_revision" where "template_key" = 'standard') then
          raise exception 'Cannot remove standard while immutable revisions use it.';
        end if;
        select c.conname into existing_constraint
          from pg_constraint c
         where c.conrelid = 'storefront_document_revision'::regclass
           and c.contype = 'c'
           and pg_get_constraintdef(c.oid) ilike '%template_key%'
         limit 1;
        if existing_constraint is not null then
          execute format('alter table "storefront_document_revision" drop constraint %I', existing_constraint);
        end if;
        alter table "storefront_document_revision"
          add constraint "storefront_document_revision_template_key_check"
          ${previousTemplateConstraint};
      end $$;
    `)
  }
}
