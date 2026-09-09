import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260908230000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`create table if not exists platform_device_session (
      token_hash text primary key, user_id text not null, auth_identity_id text not null,
      credential_fingerprint text not null, expires_at timestamptz not null,
      created_at timestamptz not null default now());
      create index if not exists IDX_platform_device_session_expiry on platform_device_session(expires_at);`)
  }
  override async down(): Promise<void> {
    this.addSql(`drop table if exists platform_device_session;`)
  }
}
