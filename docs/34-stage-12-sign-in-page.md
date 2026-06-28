# Stage 12 Sign-In Page

Status: implemented and locally verified.

## Purpose

This stage starts the React frontend with the sign-in page before building the
dashboard. The visual source is based on the existing Harouge Archive System
login page at `C:\Users\MSI\Desktop\Archive_System\frontend\src\pages\LoginPage.tsx`.

## Implemented

- Vite React application shell in `apps/web`.
- `/login` route.
- Cookie-session auth context.
- API client for:
  - `GET /api/auth/me`
  - `POST /api/auth/login`
  - `POST /api/auth/logout`
- Bilingual EN/AR language toggle.
- Harouge logo and background assets copied from the Archive System frontend.
- Login styling copied from the Archive System `auth-*` CSS block and adapted to
  this project.
- Minimal protected post-login holding screen until the real dashboard UI is
  built.

## Auth Differences From Archive System

The Archive System login used `username` and `/api/v1/auth/login`.

This project uses:

```text
POST /api/auth/login
```

with:

```json
{
  "email": "user@example.com",
  "password": "password"
}
```

The page keeps the same visual form structure, but the first field is now email.

## Local Development

Run the API:

```text
npm run api:dev
```

Run the frontend:

```text
npm run web:dev
```

Open:

```text
http://127.0.0.1:3000/login
```

The web dev server proxies `/api` to `VITE_API_PROXY_TARGET`, defaulting to
`http://127.0.0.1:5000`.

## Verification

Completed:

```text
npm run web:typecheck
npm run web:build
npm audit --omit=dev
```

The production dependency audit reported zero vulnerabilities.
