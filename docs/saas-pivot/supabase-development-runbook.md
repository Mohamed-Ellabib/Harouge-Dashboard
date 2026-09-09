# Supabase development database runbook

Status: owner-approved for interactive Phase 3C development only.

This repository uses one fresh, pinned Supabase PostgreSQL project for normal
interactive development. It does not use Supabase Auth or the browser SDK;
Medusa remains the authentication and application-data authority and connects
to PostgreSQL server-side.

Automated tests and acceptance runs do **not** use Supabase. They continue to
own an isolated loopback PostgreSQL instance and may reset only the exact
`medusa_phase05_disposable` database.

## Boundaries

- The Supabase project must be a development-only project with no production
  or customer data.
- The 20-character project reference is pinned in
  `apps/backend/config/supabase-development.json`.
- The database connection and generated runtime secrets are encrypted with
  Windows DPAPI under the current user's `%LOCALAPPDATA%`; they are never stored
  in the repository.
- The guarded child trusts the checked-in Supabase Root 2021 CA only after its
  SHA-256 fingerprint matches the pinned value. TLS verification is not
  globally disabled.
- Use only the Supavisor session-pooler host on port `5432`. The guarded setup
  constructs the database `postgres` connection with `sslmode=require`
  internally. Transaction pooling on port `6543` is intentionally rejected
  because Medusa expects session-compatible PostgreSQL behavior.
- Never paste the database connection, database password, admin password, or
  generated runtime secrets into chat, Git, documentation, or a command line.
- Do not run the generic seed, backfill, diagnostic, or rollback commands on
  Supabase development without a separate review of that exact operation.
- Production, public traffic, staging promotion, and any Neon access remain
  blocked.

## One-time setup

Requirements: Windows, Node.js 20 through 23 (the repository `.nvmrc` pins the
recommended Node.js 22 runtime), and a fresh Supabase development project.

1. In Supabase, create a development-only project and retain its non-secret
   20-character project reference.
2. From the Session pooler connection details, copy only the non-secret host on
   port `5432`. Do not copy or paste a connection URL.
3. From the repository root, run:

   ```powershell
   npm.cmd run backend:configure -- --project-ref YOUR_20_CHARACTER_REF --pooler-host YOUR_SESSION_POOLER_HOST
   ```

   The command prompts only for the raw database password and percent-encodes
   it internally. The password prompt is hidden. The command validates the
   pinned project, encrypts the connection and four independent runtime
   secrets with the current Windows account, and refuses automatic replacement.

4. Before creating any application tables, disable the Supabase Data API for
   this project or remove `public` from the API's exposed schemas. Do not
   continue while anonymous browser access to `public` remains enabled.

5. Apply the schema through the guarded runner:

   ```powershell
   npm.cmd run backend:migrate
   ```

   If connection troubleshooting is required, use the guarded, read-only,
   single-connection probe before retrying a Medusa command:

   ```powershell
   npm.cmd run backend:probe
   ```

6. Remove browser/Data API privileges from the Medusa application schema:

   ```powershell
   npm.cmd run backend:harden
   ```

   This revokes existing and default privileges for Supabase's `anon` and
   `authenticated` roles without enabling blanket RLS on Medusa's internal
   tables. The backend continues to connect server-side as the database owner.

7. Create or repair the platform Super Admin:

   ```powershell
   npm.cmd run backend:platform-admin
   ```

   Email is prompted normally and the temporary password is entered twice with
   hidden input. Existing account passwords are never reset by this command.

8. Optional: create the idempotent synthetic Store/vendor portfolio used for
   authenticated dashboard development:

   ```powershell
   npm.cmd run backend:demo-portfolio
   ```

   This command runs only through the pinned Supabase development guard and
   canonical Store provisioning workflow. It uses reserved `example.test`
   merchant emails and never prints or stores plaintext merchant passwords.
   It must not be used for staging or production data. The guarded runner is
   exclusive, so stop a running backend before invoking this command, then
   restart `backend:dev` afterward.

9. Start the complete development workspace:

   ```powershell
   npm.cmd run dev
   ```

The backend and all dashboards now use the same Supabase development data on
every restart. There is no second interactive local database to synchronize.
This isolated development workflow intentionally uses the project-owner
PostgreSQL connection for migrations and the running backend. That convenience
is not an acceptable staging or production privilege model; a separate
least-privilege runtime role is required before either environment is approved.

## Normal commands

```powershell
npm.cmd run backend:dev
npm.cmd run vendor:dev
npm.cmd run platform:dev
npm.cmd run storefront:dev
```

`backend:dev` and the backend portion of root `dev` fail closed unless the
pinned Supabase development configuration and live guarded-runner ownership
both validate.

The persistent loopback backend remains available only as an explicit offline
fallback:

```powershell
npm.cmd run local:dev --workspace @dtc/backend
```

Offline fallback data is separate and is not migrated or synchronized with
Supabase.

## Guarded runtime status and monitoring

Use the one-shot status command to distinguish a healthy guarded development
backend from a missing, stale, ambiguous, or unresponsive run:

```powershell
npm.cmd run backend:status
```

Use the monitor command for the same bounded check every five seconds until
`Ctrl+C`:

```powershell
npm.cmd run backend:monitor
```

Both commands validate the tracked lock shape and exact recorded parent/child
process ownership, then issue three bounded loopback `/health` probes. They
report healthy, degraded, partial, or unresponsive state and print a narrowly
scoped recovery sequence. They never stop a process, delete a lock, open a
database connection, or authorize broad Node-process cleanup. An invalid or
ambiguous lock fails closed for manual inspection.

The monitoring/configuration/disposable-test guard suite passed 19/19 on
2026-08-14:

```powershell
npm.cmd run test:database-guards --workspace @dtc/backend
```

That automated result includes an injected health series with no network
access. Separate interactive development evidence completed on 2026-08-14:
the guarded core-migration operation applied Store Order-payment migration
`20260814200000`, schema hardening passed, and the guarded single-connection
probe passed. After the guarded backend restarted in `develop` mode, five
bounded loopback `/health` requests returned 200 and `backend:status`
classified the recorded run healthy with 3/3 probes. Synthetic invalid-login
requests sent directly to the backend and through the platform-dashboard proxy
returned the expected 401 without timing out. A sustained `backend:monitor`
soak was not recorded.

This is interactive managed-development evidence only. It is not an automated
test, positive-credential authentication acceptance, staging, production,
public-traffic, or Phase 3C gate evidence.

## Tests and acceptance

Backend unit, integration, storefront acceptance, and commerce acceptance
commands start and own the embedded loopback PostgreSQL process themselves.
They refuse remote hosts, an already-open unowned port, missing ownership
tokens, and Supabase development variables. Their schema-reset behavior never
targets Supabase.

```powershell
npm.cmd test
npm.cmd run storefront:accept
npm.cmd run commerce:accept
```

## Changing projects or credentials

Automatic project replacement remains disabled. If the password for the same
pinned Supabase development project changes, stop the backend and use the
controlled hidden-input replacement command:

```powershell
npm.cmd run backend:rotate-password
```

The password is entered twice. The command opens exactly one read-only
connection to validate it before saving, preserves the independent application
secrets, and atomically replaces only the database connection inside the
DPAPI-protected file. A project change still requires a reviewed edit of the
pinned project reference.
