# MongoDB Atlas Setup

Status: development Atlas connection and provisioning verified on 2026-06-25.
All eight collections and declared indexes exist; four roles and 81 permissions
are seeded. The initial Super Admin is seeded with first-login password change
enforced.

## Implemented Database Layer

The API now has:

- strict Mongoose schemas for all eight approved collections
- explicit connection pool and timeout settings
- runtime automatic index creation disabled by default
- a connectivity and ping command
- deterministic index provisioning
- repeat-safe role and permission seeds
- optional first Super Admin seed
- a single database setup command

## 1. Create Atlas Environments

Use separate development, staging, and production environments.

For the first development environment:

1. Create or select a MongoDB Atlas project.
2. Create a cluster in an approved region.
3. Create a database user for this application.
4. Restrict the user to the `itdcc` database.
5. Add only the required developer or application IP addresses to Atlas Network Access.
6. Obtain the Node.js SRV connection string.

Do not use a personal Atlas owner account as the application database user.

## 2. Create Local Environment

Create `.env` in the repository root using `.env.example`.

Required values:

```text
NODE_ENV=development
MONGODB_URI=mongodb+srv://...
MONGODB_DB_NAME=itdcc
SESSION_SECRET=<random value with at least 32 characters>
```

The username and password in `MONGODB_URI` must be URI encoded when they contain reserved URL characters.

Optional first administrator:

```text
INITIAL_ADMIN_EMAIL=admin@company.example
INITIAL_ADMIN_FULL_NAME=System Administrator
INITIAL_ADMIN_PASSWORD=<temporary password with at least 12 characters>
INITIAL_ADMIN_JOB_TITLE=Super Admin
INITIAL_ADMIN_DEPARTMENT=IT
```

The first administrator is created only when email, full name, and password are all supplied. Existing users are never overwritten by the seed.

## 3. Verify Connectivity

Run:

```text
npm run api:db:check
```

Expected result:

- connection succeeds
- MongoDB ping succeeds
- the selected database name is `itdcc`
- existing collection names are listed without exposing credentials

## 4. Provision Database

Run:

```text
npm run api:db:setup
```

This command:

1. connects and pings Atlas
2. creates declared schema indexes
3. seeds the four system roles
4. seeds approved role permissions
5. creates the optional first Super Admin

The setup is repeat-safe. It does not delete business data.

## 5. Verify Collections And Indexes

Run:

```text
npm run api:db:check
npm run api:db:indexes
```

The approved collections are:

```text
roles
permissions
users
requests
tasks
task_updates
comments
audit_logs
```

Some collections may not appear until their first document is written. The index command creates the collections needed for indexed models.

## 6. Start The API

Run:

```text
npm run api:dev
```

Then verify:

```text
GET http://127.0.0.1:5000/api/health
```

The database status must be `connected`.

## Production Gate

Before production, confirm:

- production Atlas project and region approval
- network access restrictions or private connectivity
- database user ownership and credential rotation process
- backup schedule and retention
- tested restore procedure
- monitoring and alerting
- staging deployment verification
- transaction strategy for business writes that must be atomic with audit writes

The application setup commands do not configure Atlas backups, private networking, or organization-level access. Those controls must be configured in Atlas by an authorized administrator.
