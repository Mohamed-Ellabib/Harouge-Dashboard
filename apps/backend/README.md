# Commerce backend

Internal commerce service for LabibTech Commerce SaaS. It uses Medusa 2.17 as
the commerce framework and owns the platform, merchant, and storefront API
boundaries.

The permanent isolation boundary is the Store: Products, variants, Carts, and
Orders must resolve to exactly one Store. The legacy Vendor models remain a
temporary compatibility layer and are not ownership authority.

## Development

Follow the one-time
[`Supabase development runbook`](../../docs/saas-pivot/supabase-development-runbook.md),
then start the guarded backend:

```powershell
npm.cmd run backend:dev
```

Normal development uses only the pinned Supabase development project. Tests and
acceptance always start and own their exact loopback disposable PostgreSQL
database; they never use Supabase. The historical Neon target remains
prohibited, and production remains blocked.

See [`../../docs/README.md`](../../docs/README.md) for the current architecture,
phase contract, safety rules, and archived historical records.
