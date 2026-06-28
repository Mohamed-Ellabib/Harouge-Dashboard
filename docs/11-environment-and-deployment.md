# Environment And Deployment

## Local Environment

The project will use a workspace layout:

```text
apps/api
apps/web
```

The backend implementation lives in `apps/api`.

## Environment Files

Use `.env.example` as the template.

Never commit real `.env` files.

Main variables:

- `NODE_ENV`
- `API_HOST`
- `TRUST_PROXY_HOPS`
- `MONGODB_URI`
- `MONGODB_DB_NAME`
- `MONGODB_AUTO_INDEX`
- `MONGODB_MAX_POOL_SIZE`
- `MONGODB_MIN_POOL_SIZE`
- `MONGODB_SERVER_SELECTION_TIMEOUT_MS`
- `MONGODB_CONNECT_TIMEOUT_MS`
- `MONGODB_SOCKET_TIMEOUT_MS`
- `SESSION_SECRET`
- `COOKIE_NAME`
- `COOKIE_SECURE`
- `COOKIE_SAME_SITE`
- `CSRF_COOKIE_NAME`
- `CSRF_HEADER_NAME`
- `SESSION_TTL_HOURS`
- `AUTH_MAX_FAILED_LOGIN_ATTEMPTS`
- `AUTH_LOCK_MINUTES`
- `AUTH_RATE_LIMIT_MAX_REQUESTS`
- `FORCE_PASSWORD_CHANGE_ON_FIRST_LOGIN`
- `API_PORT`
- `WEB_PORT`
- `CORS_ORIGIN`
- `AUDIT_LOG_ENABLED`

## Backend Stack

- Node.js
- Express
- MongoDB Atlas
- Mongoose
- bcrypt password hashing
- HTTP-only cookie sessions
- CSRF token validation for unsafe cookie-authenticated requests
- Zod validation
- Helmet
- rate limiting
- Pino logging

## Frontend Planned Stack

- React
- React Router
- API client layer
- Role-aware routes
- Dashboard layout with sidebar and topbar
- Tables, filters, status badges, task timelines, and detail pages

## Deployment Notes

Deployment should be decided after MVP architecture approval.

Production decisions needed:

- MongoDB Atlas project, region, cluster tier, network rules, and backup policy
- Company approval for MongoDB Atlas
- Local admin-created user process
- Backup strategy
- Network access model
- Domain and SSL
- User account provisioning process

Runtime automatic index creation defaults to disabled. Provision declared
indexes explicitly with `npm run api:db:indexes` or as part of
`npm run api:db:setup`.
