# Northstar — UKI Solutions Engineering Insights

A read-only, Salesforce-backed dashboard for pre-sales managers, directors, and VPs. Northstar keeps scope, denominators, exclusions, freshness, inference, and data-quality caveats visible beside the numbers they qualify.

## What is included

- Executive overview with SE attach rate, Technical Win ARR, configurable Tech Win Rate, cohort-based Technical Win → Closed Won conversion, fiscal trends, YoY context, won-category mix, and segment coverage.
- Opportunity drill-down with source-value reconciliation, inferred/audited category labels, segment provenance, and stalled-deal signals.
- A dedicated open-pipeline “Needs re-qualification” queue with a configurable inactivity threshold.
- A data-quality view for Lead SE, direct segment fields, post-fallback Unmapped records, Business Drivers, and amount divergence.
- Browser-direct Salesforce REST queries using each user’s own short-lived session ID.
- PostgreSQL-backed shared AE → segment mappings and immutable category-override audit history.
- Realistic fixture mode for local development without Salesforce or a database.

## Stack

Next.js App Router, TypeScript, Tailwind CSS, shadcn-style Radix components, Recharts, TanStack Query, Zustand, PostgreSQL, Prisma, Vitest, and React Testing Library.

## Local setup

Requirements: Node.js 20.9+ and npm.

```bash
npm install
cp .env.example .env
npm run dev
```

Fixture mode is the default and does not require Salesforce or PostgreSQL. Open [http://localhost:3000](http://localhost:3000).

Useful checks:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Shared PostgreSQL data

Set `DATABASE_URL` to a managed PostgreSQL database, then apply the checked-in migration:

```bash
npm run prisma:generate
npx prisma migrate deploy
```

The database stores only app-owned shared state:

- AE → segment mappings and their audit history.
- Immutable category override events and the pointer to each opportunity’s current override.

It never stores Salesforce session IDs or Salesforce opportunity payloads. Without `DATABASE_URL`, the APIs deliberately return `503 DATABASE_NOT_CONFIGURED`; fixture insights still work and the UI visibly marks shared data as unavailable.

## Connecting live Salesforce

1. Ask a Salesforce admin to add the dashboard origin under **Setup → CORS**. Use the exact origin, including HTTPS in production.
2. Sign in to Salesforce in Chrome and open DevTools (`F12`).
3. Open **Network**, refresh Salesforce, and select a Salesforce API request.
4. In Request Headers, copy the value after `Bearer` in the `Authorization` header.
5. In Northstar, choose **Live Salesforce**, enter the Salesforce instance URL, a self-reported display name, and paste the session ID.

Security boundary:

- The session ID is stored in `sessionStorage` only.
- Live Salesforce requests are made directly by the browser with `credentials: "omit"` and never pass through `/app/api`.
- A `401` immediately clears the session, removes cached live opportunities, hides the previous snapshot, and opens the re-authentication instructions.
- Explicit logout and tab close clear the session.
- Salesforce access remains constrained by the permissions of the user who supplied the session.

The default custom-field API names in `src/salesforce/query.ts` are conventional assumptions. Verify them against this Salesforce org’s Object Manager before live use, particularly the Technical Win date and last-stage-change fields needed for cohort and stalled-deal metrics. Override verified names at deployment with the validated `NEXT_PUBLIC_SALESFORCE_FIELD_MAP_JSON` map shown in `.env.example`; invalid keys or SOQL identifiers are rejected before any request. Product Line and Region default to explicit Phase 1 source tags (Okta / UKI), rather than guessed Salesforce fields. If either is mapped to a real org field, blank or unknown values fail visibly instead of being silently relabeled.

## Deployment

The app is Node-compatible and can run on Vercel or another Next.js host. Configure:

- `DATABASE_URL` — shared managed PostgreSQL connection string.
- `NEXT_PUBLIC_SALESFORCE_INSTANCE_URL` — optional default shown in the browser connection form.
- `NEXT_PUBLIC_SALESFORCE_API_VERSION` — optional REST API version, default `v65.0`.
- `NEXT_PUBLIC_SALESFORCE_FIELD_MAP_JSON` — optional validated JSON override for verified Opportunity field API names.

Also add the deployed origin to the Salesforce CORS allowlist. Do not configure a Salesforce session ID as an environment variable.

See [`IMPLEMENTATION_NOTES.md`](./IMPLEMENTATION_NOTES.md) for review guidance, assumptions, and unresolved questions.
