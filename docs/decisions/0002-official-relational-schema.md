# Decision 0002: Official Relational Schema

## Status

Superseded by `0003-mongodb-primary-database.md` on 2026-06-24.

## Decision At The Time

- Replace the proposed MongoDB/Mongoose data model with the supplied relational schema.
- Preserve the supplied source in `database/schema.sql` without silently changing it.
- Treat only its eight tables and declared relationships as official database structure.
- Do not invent tables for remaining modules.
- Select the database client/ORM only after the target engine/provider is confirmed.

## Reason At The Time

The project owner identified the supplied schema as official. It therefore had priority over the earlier proposed architecture.

## Compatibility Warning

The source combines backtick identifier quoting with the `jsonb` type. It must be normalized for a selected SQL engine before it can become an executable migration.

## Supersession

The project owner later clarified that the system will mainly use MongoDB.

The SQL schema remains preserved in `database/schema.sql` as a reference for entity names, relationships, and historical planning, but it is no longer the implementation baseline.
