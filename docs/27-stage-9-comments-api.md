# Stage 9: Comments API

Status: completed.

This stage completed direct request-comment access for the MVP.

## Implemented Comment API

```text
GET   /api/comments/:id
PATCH /api/comments/:id
```

Request-scoped comment endpoints remain:

```text
GET  /api/requests/:id/comments
POST /api/requests/:id/comments
```

## Comment Scope

Comments remain request-only for MVP.

No task comment endpoints were created.

No delete endpoint was created. Old comments should not be physically deleted in normal workflows.

## Direct Comment View Policy

Direct comment view requires the user to have request visibility for the comment's parent request.

Internal comments are visible only to:

- Super Admin
- IT Manager

Non-internal comments are visible to users who can view the parent request.

## Direct Comment Update Policy

Direct comment update is protected by `comments:update`.

The current seed grants this capability through the manager/admin permission set only.

Service-level policy also enforces:

- parent request visibility is required
- closed-request mutation rules apply
- internal comments can only be edited by Super Admin and IT Manager
- changing a comment to internal requires Super Admin or IT Manager
- future non-admin `comments:update` grants would only allow a user to update their own non-internal comment on a visible non-closed request

## Audit Logging

Implemented audit event:

- comment update

Request comment creation was already audited in Stage 7.

## Source Files

```text
apps/api/src/modules/comments/comment.routes.ts
apps/api/src/modules/comments/comment.controller.ts
apps/api/src/modules/comments/comment.service.ts
apps/api/src/modules/comments/comment.validation.ts
apps/api/src/routes/api.routes.ts
```

## Verification

Completed checks:

```text
npm run api:build
npm run api:typecheck
```

Smoke check:

- called `GET /api/comments/:id` without a session cookie
- called `PATCH /api/comments/:id` without a session cookie
- confirmed both return `401 authentication_required`

The full direct view/update flow still needs verification against a real MongoDB database with seeded roles, permissions, requests, and comments.

## Next Stage

The next recommended stage is the audit logs module:

- list audit logs
- filter audit logs
- view audit details
- protect audit history from normal users
