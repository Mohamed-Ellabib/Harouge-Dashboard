# Pre-Dashboard Backend Review

Status: completed before Stage 11.

This review was done after Stage 10 and before starting dashboard/report APIs.

## Completed Backend Surface

Implemented backend modules:

- health
- local authentication
- roles
- permissions
- users
- requests
- request comments
- direct comments
- tasks
- task updates
- audit logs

Current API foundation includes:

- strict Mongoose models for the eight approved collections
- local email/password authentication
- HTTP-only signed cookie sessions
- CSRF protection for unsafe authenticated requests
- role/permission middleware
- service-level authorization checks for sensitive flows
- audit logging for important mutations
- request/task/comment row-level access policies
- read-only audit log API

## Enhancements Made In This Review

### Task Detail Visibility Fix

Problem:

- task list visibility allowed non-admin users to see tasks linked to requests they can view
- task detail visibility only applied linked-request access to supervisors
- this could make a task visible in list but denied on detail

Fix:

- `assertCanViewTask` now allows task detail access when the linked request is visible to the actor

### Access Control Hardening

Problem:

- role and permission routes were permission-protected
- role and permission mutation services did not independently enforce Super Admin
- an accidental permission grant could allow non-Super Admin role/permission mutation

Fix:

- added `assertSuperAdmin`
- role create/update now require Super Admin in the service layer
- permission create/update now require Super Admin in the service layer

### Dashboard/Report Index Readiness

Problem:

- task dashboard/report queries would rely heavily on `status`, `dueDate`, `category`, and `priority`
- request reports need `type`
- some of these fields were not indexed

Fix:

- added `requests.status + requests.createdAt`
- added `requests.type`
- added `tasks.status`
- added `tasks.status + tasks.dueDate`
- added `tasks.category`
- added `tasks.priority`
- updated the MongoDB/data-model docs

### Admin Password Reset

Problem:

- local authentication had user creation and self-service password change
- there was no admin reset path for forgotten passwords or locked-out users

Fix:

- added `PATCH /api/users/:id/password`
- reset hashes the new password
- reset revokes old sessions through `sessionVersion`
- reset clears lock counters
- reset can force password change
- reset is audited with `password_changed`
- users cannot reset their own password through the admin reset endpoint

### Scope Documentation Correction

Problem:

- one scope document still said comments could be linked to requests or tasks

Fix:

- corrected MVP scope to request-only comments

## Remaining Before Dashboard After Stage 10.5

These remained required or strongly recommended before Stage 11 dashboard/report
work at the end of Stage 10.5:

- report filter definitions
- Atlas setup rerun from an allowlisted IP to reconcile live indexes and
  permissions
- real MongoDB seeded flow verification after the Atlas setup rerun

Resolved in Stage 10.5, Stage 11, or earlier:

- sample operational data exists for dashboard development
- role-specific dashboard visibility rules are defined
- exact dashboard metric definitions are defined
- local integration tests verify critical backend hardening behavior
- report filter definitions are now documented in `docs/08-dashboard-and-reports.md`
- Atlas setup and connectivity check were rerun successfully from an
  allowlisted machine

## Missing Before Pilot

These should not be ignored before an internal pilot:

- broader automated API tests for request/task access policies, comments, and audit-log reads
- production validation of MongoDB transaction behavior against Atlas after network access is restored
- seed cleanup or migration process for stale permissions in already-seeded databases
- production MongoDB Atlas network, backup, restore, and retention policy
- audit log retention policy
- admin process for onboarding, password reset, suspension, and offboarding
- frontend application shell and protected routes
- dashboard/report APIs and UI
- deployment guide and environment hardening checklist

## Serious Residual Risk Resolved In Stage 10.5

The main unresolved backend risk at the time of this review was atomicity:

- many sensitive mutations write the business record first and audit log second
- if the audit write fails after the business write succeeds, the API can return an error while the business change has already happened

Stage 10.5 changed sensitive mutations to use MongoDB transactions and added an
integration test that verifies rollback when an audit write fails.

## Verification

Completed after the review changes:

```text
npm run api:build
npm run api:typecheck
```

Stage 10.5 later added and passed the API integration test suite. The project
still needs Atlas setup rerun from an allowlisted IP to reconcile live indexes
and permissions.
