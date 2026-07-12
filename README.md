# Medusa Commerce Backend

Backend-only Medusa v2 project generated with the official open-source Medusa starter.

## Requirements

- Node.js 20 or newer
- npm
- PostgreSQL 15 or newer

This machine currently has Node.js and npm available. PostgreSQL is not installed or not on `PATH`, so database setup still needs a local PostgreSQL server before Medusa can run.

## Local Setup

Install dependencies from the repository root:

```powershell
npm.cmd install
```

Create a PostgreSQL database named `medusa-backend`, or change `apps/backend/.env` to match your database credentials:

```env
DATABASE_URL=postgres://postgres:CHANGE_ME@localhost:5432/medusa-backend
```

Then run Medusa database setup:

```powershell
cd apps\backend
npx.cmd medusa db:setup
```

Create an admin user:

```powershell
npx.cmd medusa user -e admin@test.com -p supersecret
```

Optionally seed sample catalog data:

```powershell
cd ..\..
npm.cmd run backend:seed
```

Start the backend:

```powershell
npm.cmd run backend:dev
```

Open the Medusa admin at:

```text
http://localhost:9000/app
```

## Useful Links

- Medusa docs: https://docs.medusajs.com
- Installation guide: https://docs.medusajs.com/learn/installation
- Medusa GitHub: https://github.com/medusajs/medusa
