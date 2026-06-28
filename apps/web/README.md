# Web Application

Frontend application for the Task & Requests Control System.

Current stack:

- React
- TypeScript
- Vite
- React Router
- API client layer
- Cookie-session authentication

The sign-in page is implemented at:

```text
/login
```

It uses the Harouge Archive System login page as the visual source and connects
to this project API through:

```text
POST /api/auth/login
GET  /api/auth/me
POST /api/auth/logout
```

## Scripts

```text
npm run dev --workspace @itdcc/web
npm run build --workspace @itdcc/web
npm run preview --workspace @itdcc/web
npm run typecheck --workspace @itdcc/web
```

From the repository root:

```text
npm run web:dev
npm run web:build
npm run web:typecheck
```

## Active Source Layout

```text
src/
  app/
  api/
  components/
    common/
    layout/
  context/
  features/
    auth/
    dashboard/
    requests/
    tasks/
    users/
    roles/
    permissions/
    reports/
    audit-logs/
  hooks/
  routes/
  styles/
  utils/
```

## Current Dashboard Data

- Dashboard shell, top bar, Arabic/English direction switch, and sign-out menu
- Dashboard widgets connected to `/api/dashboard/overview`
- Summary, focus queue, work queue, team workload, recent requests, and recent
  activity are rendered from MongoDB-backed API data

## Next Frontend Work

- Request/task report screens

Do not add purchase, product, asset, supplier, attachment, notification, or settings pages unless the project owner approves a new scope change.
