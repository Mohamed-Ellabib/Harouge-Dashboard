import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/** Owner-approved promotion of the existing Drops design to a reusable template. */
export class Migration20260905140000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table storefront_document_revision drop constraint if exists storefront_document_revision_template_key_check;
      alter table storefront_document_revision add constraint storefront_document_revision_template_key_check
      check (template_key in ('luxe-commerce','luxe-commerce-full','modern-market','home-living','standard','glow-beauty','drops'));`)
  }
  override async down(): Promise<void> {
    this.addSql(`do $$ begin
      if exists (select 1 from storefront_document_revision where template_key = 'drops') then
        raise exception 'Cannot remove Drops while immutable revisions use it.';
      end if;
      alter table storefront_document_revision drop constraint if exists storefront_document_revision_template_key_check;
      alter table storefront_document_revision add constraint storefront_document_revision_template_key_check
      check (template_key in ('luxe-commerce','luxe-commerce-full','modern-market','home-living','standard','glow-beauty'));
      end $$;`)
  }
}
