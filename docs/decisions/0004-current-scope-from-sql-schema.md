# Decision 0004: Current Scope From SQL Schema

## Status

Accepted on 2026-06-24.

## Decision

The current system will contain only the entities present in `database/schema.sql`.

Active entities:

- Roles
- Permissions
- Users
- Requests
- Tasks
- Task updates
- Comments
- Audit logs

Cancelled for now:

- Purchases / MR
- Products
- Assets
- Suppliers
- Attachments
- Notifications
- System settings

## Reason

The project owner clarified that what exists in the supplied tables is what the system should have for now.

## Consequences

- Active documentation must describe only the eight current entities.
- MongoDB collection planning must map to those eight entities.
- API and UI maps must not include cancelled modules.
- Folder placeholders for cancelled modules should be removed from the active scaffold.
- Future scope additions require a new approved decision and data model update.
