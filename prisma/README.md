# Shared database setup

This database stores only application-owned, shared data:

- the current AE-to-segment fallback mapping and its additive audit trail;
- immutable won-category override records and a pointer to each opportunity's
  effective override.

It does not store Salesforce credentials or raw Opportunity data.

## Local setup

1. Set `DATABASE_URL` to a PostgreSQL connection string in `.env`.
2. Run `npm run prisma:generate` after installing dependencies or changing the
   schema.
3. Run `npm run prisma:migrate` to apply the checked-in initial migration in a
   development database.

For production, apply checked-in migrations with
`npx prisma migrate deploy`. Managed databases that provide separate pooled and
direct URLs can set `DATABASE_URL` for the runtime pool and `DIRECT_URL` for
Prisma CLI migration commands.

The API deliberately returns `503 DATABASE_NOT_CONFIGURED` when `DATABASE_URL`
is absent, allowing fixture-only local development to run without pretending
that mappings or overrides were saved.
