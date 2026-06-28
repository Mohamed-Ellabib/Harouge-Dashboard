# Decision 0001: Stack And Architecture

## Status

Historical. Superseded by `0002-official-relational-schema.md`, then the MongoDB direction was restored by `0003-mongodb-primary-database.md`.

## Decision

Use:

- React for the frontend
- Node.js with Express for the backend
- MongoDB Atlas for the database
- Mongoose with strict schemas for data modeling
- TypeScript recommended for both frontend and backend

## Reason

The project is workflow-heavy and document-like. MongoDB can handle flexible records such as requests, purchases, timelines, attachments, comments, and audit metadata. Mongoose strict schemas are required to keep the data controlled.

React and Node.js are suitable for a custom internal dashboard with role-based pages, tables, filters, detail views, and dashboards.

## Risks

- MongoDB data can become messy if schemas and validation are weak.
- MongoDB Atlas is cloud-hosted and may require company approval.
- Dashboard calculations must be centralized in the backend to avoid inconsistent frontend numbers.

## Follow-Up

Before implementation, confirm:

- Whether MR means Material Request or another internal term.
- Whether MongoDB Atlas is approved for internal company data.
- Whether secure cookie sessions or JWT should be used.

## Supersession Note

The project owner supplied an SQL schema after this proposal, so `0002` temporarily changed the data direction. The owner later clarified that the project will mainly use MongoDB, so `0003` is now the active database decision.
