# Stage 1 API Foundation

## Status

Started on 2026-06-24.

## Implemented

- TypeScript API project setup under `apps/api`.
- Express application factory in `src/app.ts`.
- Server bootstrap in `src/server.ts`.
- Environment validation through Zod.
- MongoDB Atlas connection management through Mongoose.
- Structured logger with Pino.
- HTTP request logging with request IDs.
- Helmet security headers.
- CORS configuration.
- Rate limiting.
- JSON and URL-encoded body parsing limits.
- Global not-found handler.
- Global error handler.
- Standard API response shape.
- Health route.

## Health Endpoint

```text
GET /api/health
```

Response includes:

- Application name
- Environment
- Uptime
- API health status
- MongoDB connection status

If MongoDB is not connected, the endpoint returns `status: degraded` and reports the database as disconnected.

## Scripts

From the project root:

```text
npm run api:dev
npm run api:build
npm run api:start
npm run api:typecheck
```

Direct workspace scripts:

```text
npm run dev --workspace @itdcc/api
npm run build --workspace @itdcc/api
npm run start --workspace @itdcc/api
npm run typecheck --workspace @itdcc/api
```

## Required Environment

The API requires:

- `MONGODB_URI`
- `MONGODB_DB_NAME`
- `SESSION_SECRET`
- `CORS_ORIGIN`

`SESSION_SECRET` must be at least 32 characters.

## Verification Completed

- Runtime dependencies installed.
- Development dependencies installed.
- `npm run build --workspace @itdcc/api` passed.
- `npm run typecheck --workspace @itdcc/api` passed.
- Built `/api/health` route returned HTTP `200`.
- Health response included MongoDB status.

## Not Yet Verified

Real MongoDB Atlas connection was not verified because no production/development Atlas URI has been provided yet.

## Next Stage

Stage 2 should add shared backend infrastructure for controllers, services, repositories, validation, pagination, filtering, audit helper, and authorization middleware.
