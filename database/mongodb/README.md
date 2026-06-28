# MongoDB Atlas Operations

MongoDB Atlas is the primary database for this project.

The application creates only these collections:

- `roles`
- `permissions`
- `users`
- `requests`
- `tasks`
- `task_updates`
- `comments`
- `audit_logs`

## Database Commands

Run from the repository root:

```text
npm run api:db:check
npm run api:db:indexes
npm run api:db:setup
npm run api:seed
```

Command behavior:

- `api:db:check` connects, sends a MongoDB ping, and lists collection names.
- `api:db:indexes` creates all indexes declared by the Mongoose schemas.
- `api:db:setup` checks connectivity, creates indexes, and runs repeat-safe seeds.
- `api:seed` runs only the repeat-safe roles, permissions, and optional Super Admin seeds.

`api:db:indexes` creates missing declared indexes but does not remove unknown indexes.
Index removal must be handled as a reviewed database migration.

## Required Environment

Create a local `.env` from the root `.env.example` and set:

```text
MONGODB_URI=
MONGODB_DB_NAME=itdcc
SESSION_SECRET=
```

To create the first Super Admin during setup, also set:

```text
INITIAL_ADMIN_EMAIL=
INITIAL_ADMIN_FULL_NAME=
INITIAL_ADMIN_PASSWORD=
```

Never commit `.env` or place database credentials in source files.

## Atlas Rules

- Use separate Atlas databases or projects for development, staging, and production.
- Give the application database user only the access required for the selected database.
- Restrict Atlas network access to known developer, server, or private network addresses.
- Do not allow `0.0.0.0/0` for production.
- Enable backups and test restore procedures before production.
- Rotate database credentials and application secrets through an approved operational process.
- Run `api:db:indexes` as an explicit deployment step because runtime auto-indexing is disabled by default.

See `docs/30-mongodb-atlas-setup.md` for the complete setup sequence.
