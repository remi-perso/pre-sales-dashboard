# Implementation notes — Phase 1

Prepared for review on 20 August 2026. Read this before auditing the implementation against `AGENTS.md`.

## Delivery status

Phase 1 is implemented as a fixture-ready, read-only UKI / Okta insights dashboard. The production build succeeds and the fixture experience works without Salesforce or PostgreSQL. Live Salesforce and shared writes require the deployment-specific setup described below; neither could be exercised against real infrastructure in this workspace.

The application is called **Northstar** in the UI. It uses the requested Next.js App Router, TypeScript, Tailwind CSS, Radix-backed shadcn-style UI primitives, Recharts, TanStack Query, Zustand, PostgreSQL/Prisma, Vitest, and React Testing Library stack.

## What was built

### Dashboard and views

- Executive overview with SE Attach Rate, Technical Win ARR, configurable Tech Win Rate, Technical Win → Closed Won cohort conversion, fiscal YoY/trend context, won-category mix, segment coverage, and visible trust signals.
- Opportunity Explorer with source amount reconciliation, segment provenance, inferred/overridden category status, and a per-opportunity category override action.
- Needs Re-qualification view restricted to open opportunities at Technical Win or later whose latest available activity/stage-change/Technical-Win date is at least the configured threshold old.
- Data Quality view with Lead SE null rate, both direct segment fields missing, post-fallback Unmapped rate, Business Drivers null rate, and amount-field reconciliation exceptions.
- Settings for the Salesforce session, self-reported display name, fiscal fallback month, stalled threshold, independent Tech Win Rate cohorts, phase-ready dimensions, shared AE mappings, and override history.
- Print/save-PDF affordance on the executive view.

### Metric definitions and traceability

All calculation and classification logic lives in pure functions under `src/data`; React components only select options and render results.

- **SE Attach Rate:** count and selected-ARR-basis rate, with configurable Won / Lost+Disqualified / All Closed / Open / All scope. The card shows scope and both numerator/denominator pairs.
- **Technical Win ARR:** selected ARR basis for Technical Win or later, with count and stage scope shown.
- **Tech Win Rate:** numerator and denominator are independent predicates supplied to the pure function and user-configurable in Settings. The card shows the active cohort names plus count and amount numerator/denominator values.
- **Technical Win → Closed Won:** denominator is selected by `technicalWinDate` in the current fiscal quarter and the numerator checks eventual Won outcome without constraining `closeDate`. Dashboard close/created date ranges are deliberately removed before cohort, YoY, and trend calculation; other active dimensions and the explicit zero-split choice remain.
- **YoY:** current fiscal quarter against the same prior-year fiscal quarter. The UI states both period labels, amount totals, counts, ARR basis, and percentage change.
- **ARR handling:** Deal Size and Net BU ARR are always selected explicitly. A missing selected value contributes zero dollars but remains in count denominators. There is no cross-field amount fallback.
- **Fiscal calendar:** live mode tries the Salesforce Organization fiscal start month; otherwise the visible configurable fallback is used. Fiscal-year labels use the year in which the fiscal year ends.

### Data-quality and trust rules

- The zero Split Amount exclusion defaults **off**. Its count and selected-basis amount remain visible beside the toggle whether enabled or disabled.
- Deal Size / Net BU ARR divergence is flagged at the larger of one currency unit or 1%. Both source amounts are displayed on affected rows.
- Segment resolution order is Owner Geo-Seg → Split Owner segment → shared AE mapping → explicit Unmapped. Records are never deleted because a segment is unresolved.
- Won categories are keyword inference over Business Drivers, Why Do Anything?, and Opportunity Name. Every UI rendering identifies the value as inferred or overridden. Latest audited override wins without changing any Salesforce value.
- Last-synced time and manual refresh are present on every data-bearing view through the persistent filter bar. Refresh covers Opportunities, mappings, and overrides.
- The Product Line and Region dimensions are first-class in types and Zustand from the start. Okta and UKI are the only enabled Phase 1 options; Auth0 and Rest of EMEA remain visible and disabled.
- Fixture time is pinned to `FIXTURE_SYNCED_AT`, so fiscal, freshness, and stalled examples do not drift with wall-clock time.

## Salesforce and credential boundary

- The Salesforce client module is browser-only and performs GET requests directly to the user-supplied HTTPS Salesforce origin.
- The session ID and display name use `sessionStorage` only. There is no production `localStorage`, cookie, token environment variable, token logger, or server-side Salesforce proxy.
- Requests use `Authorization: Bearer`, `credentials: "omit"`, `cache: "no-store"`, no referrer, and reject redirects. Salesforce error bodies/causes are not propagated because they can contain request context.
- A 401 clears credentials before notifying subscribers, removes all cached Opportunity queries, clears any captured category-dialog record, hides live data, and opens the expired-session instructions.
- Explicit logout follows the same cache/captured-record cleanup and returns to fixture mode. Dismissing the connection dialog clears any unsaved session ID from component state.
- The connection dialog and Settings give numbered DevTools and one-time CORS instructions. A screenshot/GIF was not added; the flow is text/illustration based.
- No module under `app/api` imports Salesforce or session state. The only route handlers are the two app-owned PostgreSQL resources.

## Live Opportunity field configuration

Salesforce custom API names are org-specific and could not be verified here. Conventional Phase 1 defaults remain centralized in `src/salesforce/query.ts`; a deployment can replace any verified API name through `NEXT_PUBLIC_SALESFORCE_FIELD_MAP_JSON`. Unknown keys, invalid JSON, null required fields, and non-identifier/SOQL-like values fail before a request with a scrubbed configuration error.

Product Line and Region are handled differently from ordinary fields: their default API entries are `null`, and the live data source explicitly declares its Phase 1 scope as Okta / UKI. This is source tagging, not a substitution for a blank Salesforce value. If a deployment maps either dimension to a real org field, a blank or unsupported returned value causes a visible load failure instead of being silently labeled.

The availability and correct labels/API names of Technical Win Date and Last Stage Change Date still require org verification. They are necessary for exact cohort and stalled calculations. A wrong/inaccessible required field makes Salesforce reject the read; the app does not fabricate the metric input.

## Shared PostgreSQL state

- Prisma models and a checked-in migration implement the effective AE mapping plus immutable mapping audit entries, immutable category override events, and a current-override pointer.
- Mapping names are normalized to a case-insensitive key. Mapping updates and their audit entries use serializable transactions.
- Category override creation and pointer replacement use a serializable transaction; prior events remain immutable.
- Inputs are length/type/enum validated with Zod, API responses use `no-store`, and deleting audited mappings is rejected.
- `changedBy` is the session-scoped, self-reported display name and is labeled as such in the UI. It is not a verified identity.
- Missing `DATABASE_URL` returns a deliberate 503. Fixture insights remain usable while the UI visibly states that shared mappings/overrides are unavailable.
- Prisma Client generation runs after install and before the production build. Apply `prisma/migrations/20260820000000_init_shared_data/migration.sql` before shared use.

## Verification performed

- `npm run format:check` — passed.
- `npm run lint` with zero allowed warnings — passed.
- `npm run typecheck` — passed.
- `npm test` — **62/62 tests passed across 13 files**.
- `npm run build` — passed with Next.js 16.3.1; static dashboard plus dynamic mapping/override API routes were generated.
- Production headless-Chrome smoke at 1440×1200 — fixture dashboard, trust notice, metric cards, fiscal chart, and category chart rendered; Chrome emitted no application/React console error.
- Credential/security review checked the token path line by line and found no remaining Section 3 boundary blocker after lifecycle fixes.
- Compliance review covered metric definitions, visible trust counterparts, filters, fixtures, state separation, and accessibility labels.

Tests cover pure metric/classification/filter/fiscal/quality functions, fixture edge cases, SOQL validation/escaping, strict mapping, Salesforce pagination and fiscal fallback, credential lifecycle and 401 behavior, Zustand normalization, API validation/DB-unavailable behavior, and connection-dialog secret clearing. They do not replace real-org or real-PostgreSQL integration testing.

## Deviations, partial verification, and known limitations

1. **Live org not exercised.** No valid Salesforce instance/session was available. CORS feasibility, field-level permissions, custom API names, and the two activity/cohort date fields must be verified with the target org before live use.
2. **PostgreSQL not exercised end to end.** No `DATABASE_URL` was supplied. Schema generation, validation, route behavior without a DB, and transaction code are tested/reviewed, but concurrent writes against managed PostgreSQL still need a staging smoke test after migration.
3. **Tech Win Rate leadership denominator remains unresolved.** The shipped default denominator is “all filtered opportunities,” visibly labeled provisional. Numerator and denominator remain independently configurable; no claim is made that the default reproduces leadership reporting.
4. **Fiscal setting access may be denied.** Live mode queries Organization settings and visibly reports whether the org or configured calendar won. The February fallback is a preference, not a hidden assumption.
5. **No screenshot/GIF in the session-ID guide.** The in-app flow is a short numbered guide with familiar Chrome/Network/headers cues and explicit security language. A branded org-specific screenshot would need a safe reference capture.
6. **Browser interaction coverage is limited.** React tests verify connection-dialog secret clearing; a desktop production smoke rendered successfully; and static review verified labels, `aria-current`, native/Radix keyboard primitives, and error handling. Keyboard traversal, mobile breakpoints, and the final deployment origin still need a human acceptance pass.
7. **Next production build uses webpack.** `next build --webpack` avoids a Turbopack worker/port restriction encountered in this sandbox. This does not change the runtime architecture.
8. **Dependency advisory remains upstream/tooling-only.** `npm audit --omit=dev` reports the Prisma CLI chain’s `deepmerge-ts` advisory and recommends a forced Prisma 6 downgrade. The build stays on Prisma 7.9.1 rather than applying that breaking downgrade; revisit when Prisma publishes a compatible resolution.
9. **App-owned APIs have no verified user authentication.** This follows the stated no-login constraint and records self-reported attribution. Restrict the deployed app/network as appropriate until a real identity layer is authorized.

## Open questions carried forward

- Does Auth0 pipeline data live in the same Salesforce org and Opportunity object, or another system? Phase 2 remains scaffold-only until answered.
- What exact numerator and denominator reproduce leadership’s official Tech Win Rate ($)?
- Can the target Salesforce admin allowlist the final dashboard origin and confirm all required field-level access?
- Are Technical Win Date and Last Stage Change Date real readable fields, or must field history/activity data be modeled differently?
- Which managed PostgreSQL provider, backup policy, and deployment-region requirements should production use?

## Reviewer starting points

- Credential boundary: `src/state/salesforce-session.ts`, `src/salesforce/client.ts`, `src/views/insights-app.tsx`.
- Salesforce fields/query/mapping: `src/salesforce/fields.ts`, `src/salesforce/query.ts`, `src/salesforce/mapper.ts`, `src/salesforce/data-source.ts`.
- Metrics/trust logic: `src/data` and mirrored `tests/data`.
- Shared persistence: `prisma/schema.prisma`, `src/db`, and `app/api`.
- UI counterparts: `src/views`, `src/components/dashboard-filters.tsx`, and `src/components/opportunity-table.tsx`.
