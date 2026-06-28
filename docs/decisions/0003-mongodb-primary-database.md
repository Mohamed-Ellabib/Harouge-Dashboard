# Decision 0003: MongoDB Primary Database

## Status

Accepted on 2026-06-24.

## Decision

Use MongoDB Atlas as the primary database technology for implementation.

Use Mongoose with strict schemas, validation rules, and explicit indexes. The project should not use uncontrolled schemaless writes.

## Current Scope Constraint

MongoDB is the database technology, but the current system scope is defined by `database/schema.sql`.

Only these collections are active for now:

- `roles`
- `permissions`
- `users`
- `requests`
- `tasks`
- `task_updates`
- `comments`
- `audit_logs`

## Reason

The owner clarified that MongoDB will mainly be used. The SQL file is still important because it defines what the system contains for now.

## Consequences

- `MONGODB_URI` and `MONGODB_DB_NAME` are used in environment planning.
- Backend planning should use MongoDB Atlas and Mongoose.
- Current Mongoose schemas must map only the eight current entities.
- Purchases, products, assets, suppliers, attachments, notifications, and settings are not active modules.
- MongoDB Atlas company approval, backup policy, region, and network access remain open decisions.

## Risks

- MongoDB data quality depends heavily on strict Mongoose schemas and validation.
- Cross-document relationships need careful indexes and backend checks.
- Dashboard aggregation queries must be designed early to avoid slow reports later.
- Atlas hosting must be approved for internal data before production use.
