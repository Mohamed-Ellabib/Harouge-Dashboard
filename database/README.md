# Database

## Current Authority

`schema.sql` defines the current business scope supplied by the project owner on 2026-06-24.

The implementation database technology is MongoDB Atlas, but the current collections must map to the entities in `schema.sql`.

## Current Entities

The current system has only these entities:

- `roles`
- `permissions`
- `users`
- `requests`
- `tasks`
- `task_updates`
- `comments`
- `audit_logs`

Purchases, products, assets, suppliers, attachments, notifications, and settings are cancelled for now.

## SQL Limitation

The SQL file uses backtick identifier quoting together with PostgreSQL-style `jsonb`. I am certain this mixed syntax should not be treated as directly executable without review.

Because MongoDB is the planned database technology, use the SQL file for scope and field mapping rather than as an executable migration.

## MongoDB Planning

MongoDB planning notes live in:

- `docs/05-data-model.md`
- `docs/16-mongodb-collection-model.md`
- `docs/decisions/0003-mongodb-primary-database.md`
- `docs/decisions/0004-current-scope-from-sql-schema.md`

## Change Rule

Future database revisions should include:

- An update to the MongoDB collection model
- Required Mongoose schema and index changes when implementation starts
- Seed data rules for system roles and admin user
- An update to `docs/05-data-model.md`
- A decision record when the database provider, authentication provider, ODM, or active scope changes
