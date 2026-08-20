# AGENTS.md — UKI Solutions Engineering Insights App

> Note on filename: this is written as `AGENTS.md` (plural), the convention OpenAI Codex, Cursor, and other coding agents auto-detect and load without being told. A file named `AGENT.MD` would likely be ignored by Codex's automatic context loading — if you want to keep that exact filename, copy this content over but also keep a copy at `AGENTS.md` so Codex actually picks it up.

## 0. What this document is

Instructions for an AI coding agent (OpenAI Codex, high/ultra reasoning effort) building a Salesforce-backed insights dashboard for Solutions Engineering leadership, and for a second AI (Claude) reviewing the resulting code. Read this whole file before writing code. Where this document is specific (stack, file layout, rules), follow it exactly — deviating from an explicit instruction without flagging it in `IMPLEMENTATION_NOTES.md` (see Section 9) is a review failure, not a judgment call.

**This app is being built to eventually be hosted and used by multiple pre-sales leaders.** That shapes the data-persistence decisions below (shared tables, not per-browser state). **Auth, however, is constrained by what's actually available right now: there is no Salesforce Connected App / OAuth access. Every user, including future ones, authenticates by pasting their own Salesforce session ID (from Chrome DevTools) as a Bearer token. Build for this reality, not around it.**

## 1. Project Summary

A read-only web dashboard that pulls Opportunity data from Salesforce and presents it to Solutions Engineering managers, directors, and VPs. The organizing principle: **every number must be traceable, every exclusion or assumption must be visible in the UI, never silent.** This replaces a manual CSV/spreadsheet process where data-quality caveats had to be re-explained every quarter — the goal is to make those caveats structural.

Users: SE Manager (team workload, drill-down), SE Director (quarterly trend, category/segment breakdown), VP Pre-Sales (executive summary, slide-ready output) — potentially several people in each role, each supplying their own Salesforce session ID.

## 2. Tech Stack (decided — do not re-litigate)

Chosen for maturity and stability over novelty:

- **Next.js (App Router, latest stable) + TypeScript.** Even though there's no OAuth layer, Next.js still earns its place here as the app framework: it gives a stable frontend plus lightweight API routes for the DB-backed features in Section 7 (AE→segment mapping, override audit log) that need to be shared across users regardless of how auth works.
- **Tailwind CSS + shadcn/ui** for the "beautiful, easy to use" requirement.
- **Recharts** for the trend/YoY charts.
- **TanStack Query** for server-state fetching/caching (Salesforce data, DB-backed data); **Zustand** for local-only UI state (filters, current view). Don't mix these responsibilities.
- **PostgreSQL (managed — e.g., Neon or Supabase) + Prisma ORM** — for state that must be shared across users: the AE→segment mapping table and the category-override audit log. This is unrelated to Salesforce auth and doesn't need it — it's the app's own data.
- **Vitest + React Testing Library** for tests. **ESLint + Prettier**, standard configs.
- **Deployment:** Vercel is the natural fit for Next.js; keep the app Node-compatible so it isn't locked to one host. Database hosted separately.

## 3. Auth & Salesforce Connection (Bearer session ID — this is the real mechanism, not a placeholder)

- Each user pastes their own Salesforce session ID (copied from the Network tab in Chrome DevTools while logged into Salesforce) into a settings screen in the app.
- Every Salesforce REST API call sends `Authorization: Bearer <session_id>`.
- **The browser calls Salesforce directly — never route this token through your own backend/API routes.** This keeps the token out of any infrastructure you control, which is the safest option available given there's no OAuth layer to rely on instead. This requires the app's origin to be whitelisted in Salesforce Setup → CORS; document this as a one-time setup step (in the app's settings screen or README) since it's a manual action the user (or their Salesforce admin) needs to take.
- **Token handling rules (non-negotiable):**
  - Store the token in `sessionStorage` only — never `localStorage`, never a cookie, never sent to any server you control, never logged (including in error/stack traces — scrub it).
  - Clear it on tab close / explicit logout.
  - On a `401`, stop immediately, clear the token, and show a clear "your session has expired — paste a new session ID" prompt. Never render stale data as if it's current after an auth failure.
- **Known, accepted limitation:** Salesforce session IDs are short-lived (typically hours, depending on the org's session-timeout setting) and are tied to one user's own login. That means every user of the hosted app — not just during local dev — will periodically need to re-open DevTools and grab a fresh session ID. This is a real UX cost for less technical users (e.g., a VP), not a dev-only inconvenience — the app should make the "your session expired, here's exactly what to copy and from where" flow as clear and low-friction as possible (a short in-app instruction with a screenshot/GIF of the DevTools steps is worth building). If Salesforce admin/Connected-App access becomes available later, this is the one piece worth revisiting — but don't build around that assumption now.
- Because each user supplies their *own* session, the app naturally only ever shows that person the data their own Salesforce permissions allow — no separate access model to build or secure.

## 4. Repository Structure

```
/app                    — Next.js App Router: pages + API routes
  /api                  — Route handlers for DB-backed endpoints ONLY (AE mapping table, override log) — never proxies Salesforce calls or touches the session token
/src
  /salesforce           — Client-side Salesforce query builders, field-name constants, Bearer-header fetch wrapper (browser-only, never imported into /app/api)
  /data                 — Pure functions: metric calculations, classification/inference logic, transformations
  /components           — UI components (dumb, presentational where possible)
  /views                — Page-level view components rendered by /app routes
  /state                — Zustand stores (filters, current view state — the session token lives in its own small module here, session-storage-backed, not a generic store)
  /types                — Shared TypeScript types (Opportunity shape, metric result shapes)
  /fixtures             — Mock Salesforce data for local dev (see Section 9)
/prisma                 — schema.prisma, migrations
/tests                  — mirrors /src structure, especially /data
AGENTS.md
IMPLEMENTATION_NOTES.md — written by the agent, see Section 10
```

**Hard rule:** all Salesforce field-name strings live in `/src/salesforce` as named constants, referenced everywhere else by name — never inline a raw field-name string in `/data` or `/components`.

**Hard rule:** all metric/classification/percentage logic lives in `/src/data` as pure, unit-tested functions with no React/UI/network dependencies.

**Hard rule:** `/app/api` route handlers must never receive or forward the Salesforce session token — they only ever talk to Postgres for the shared mapping/override tables. If a route handler needs the token, that's a sign the architecture has drifted from Section 3; stop and reconsider rather than pushing it through.

## 5. Data Model (Salesforce fields)

Opportunity fields in use: `Stage`, `Presales Stage`, `Lead Sales Engineer`, `Deal Size`, `Net BU ARR`, `Split Amount`, `Owner`, `Type`, `Close Date`, `Created Date`, `Business Drivers`, `Why Do Anything?`, `NPI Use Case`, `Opportunity Name`, `Split Owner - User Sales Segment`, `Owner Geo-Seg` (format like `EMEA - Enterprise-1`).

Product Line (Okta / Auth0) and Region (UKI / rest of EMEA) must be modeled as first-class filter dimensions in `/types` and `/state` from the start, even though only Okta + UKI has real data in this build. Filter UI shows all options; unavailable ones are visibly present but disabled, not hidden — this is what makes Phase 2/3/4 (Section 11) additive rather than a rewrite.

## 6. Metrics — Exact Definitions

Every metric component must render its scope/denominator as a visible caption, not a tooltip.

- **SE Attach Rate** — % of opportunities (count and $) with non-null Lead Sales Engineer. Must accept a scope parameter: Won only / Lost+Disqualified only / All Closed / Open Pipeline / All. Render the active scope next to the number always.
- **Technical Win $ARR** — sum of $ where Presales Stage = "Technical Win" or later, for the active filter set.
- **Tech Win Rate ($)** — numerator and denominator must both be independently configurable function parameters (do not hardcode a denominator — the correct one hasn't been confirmed against leadership's own reporting; see `IMPLEMENTATION_NOTES.md` requirement to flag this as unverified).
- **Tech Win → Closed-Won Rate** — cohort-based: of opportunities that reached Technical Win within a period, % (by $ and count) that eventually closed won, regardless of when the close happened. Do not implement this as a same-quarter snapshot — that's a different (wrong) number.
- **YoY comparison** — same fiscal quarter, prior fiscal year. Confirm/derive fiscal year boundaries from Salesforce org settings if queryable; otherwise make the fiscal-year start month a configurable setting, not a hardcoded calendar-year assumption.
- **Won category breakdown** (organic growth/true-up, compliance, expansion, new business, straight renewal) — derived via keyword matching over Business Drivers / Why Do Anything? / Opportunity Name. This is inference, not a system field: label it "Inferred" in the UI on every render, and provide a per-opportunity manual override control. Overrides are stored in the shared Postgres DB (Section 2) — who/when/why/from-value/to-value — and always take precedence over inference when present; never overwrite the raw Salesforce value.
- **Stalled-deal flag** — Presales Stage is Technical Win or later, and no activity/stage-change within N days (default 60, user-configurable). Feeds a dedicated "Needs Re-qualification" list view.

## 7. Data Quality & Trust Rules (build these in, don't bolt them on)

1. **No silent filtering.** Any exclusion rule (e.g., `Split Amount = 0` records) is a visible, toggle-able filter, default state your choice, but the excluded count and $ must always render next to the toggle.
2. **No silent field substitution.** `Deal Size` and `Net BU ARR` usually reconcile; when they diverge beyond a small tolerance, flag the record rather than silently picking one field. Surface both values on the flagged record's detail view.
3. **Overrides are additive and audited.** Since there's no real login (Section 3), attribution can't be a verified identity — instead, prompt for a display name once per session (stored alongside the token in `sessionStorage`, not the DB) and attach it to every override/mapping-table change as a self-reported "changed by." Label it as self-reported in the UI, not a verified identity.
4. **Unmapped is a bucket, not a deletion.** Any opportunity where segment can't be resolved (no `Owner Geo-Seg`, no `Split Owner - User Sales Segment`, and not in the AE mapping table) appears in an explicit "Unmapped" bucket with its own count/$, in every segment-scoped view. Never exclude it from a total without showing where it went.
5. **AE→segment mapping is a fallback, editable in-app, and shared.** Only consulted when both direct segment fields are null. Lives in the Postgres DB as a real shared table any user can edit via a settings view, with a visible "last updated" date and self-reported by-whom — not hardcoded in source, and not siloed per-browser.
6. **Show data freshness.** Every data-bearing view shows a "last synced" timestamp; provide a manual refresh action.
7. **Data Quality panel.** A dedicated view showing null-rates for Lead SE, Segment/Geo-Seg, and Business Drivers fields across the current filter set, so a null-heavy view is visibly less trustworthy, not silently presented as equally solid.

## 8. Local Development Without Live Salesforce Access

Create realistic fixture data in `/src/fixtures` matching the exact field names in Section 5, including edge cases that exercise every rule in Section 7:
- Some records with `Split Amount = 0`.
- At least one record where `Deal Size` and `Net BU ARR` diverge.
- Records with null `Owner Geo-Seg` and null segment (to exercise the Unmapped bucket).
- A mix of Won, Lost, Qualified Out, and Open opportunities across all four presales stages including Technical Win, some stalled and some not.

Build against fixtures behind the same `/src/salesforce` interface real Salesforce calls will use, so swapping to live data later is a data-source change, not a rewrite. Add a dev-mode toggle (fixtures vs. live) rather than deleting fixture support once live works.

## 9. Definition of Done (per phase) — and handoff for review

Before considering Phase 1 complete, verify:
- [ ] All metrics render their scope/denominator visibly (Section 6).
- [ ] Every Section 7 rule has a working, visible UI counterpart — not just correct math under the hood.
- [ ] Token handling matches Section 3 exactly: sessionStorage only, never touches `/app/api`, never logged, 401 clears it and prompts for a fresh one.
- [ ] The "session expired, here's how to get a new one" flow is clear enough for a non-technical user to follow unaided.
- [ ] AE→segment mapping table and category-override log are DB-backed, multi-user safe, and changes carry a self-reported display name.
- [ ] `/src/data` functions have unit tests covering the fixture edge cases from Section 8.
- [ ] Product Line / Region filters are present and correctly disable unavailable options (Section 5).
- [ ] No console errors on any view; basic keyboard navigation works on filters and tables.

**Before finishing, write `IMPLEMENTATION_NOTES.md`** summarizing what was built, any deviation from this spec and why, any Section 6/7 rule only partially implementable and why, and open questions from Section 11 that remain unresolved. Write it for a reviewer who hasn't seen you build this.

## 10. Phased Scope

| Phase | Scope | Status for this build |
|---|---|---|
| 1 | Okta, UK & Ireland, Bearer-session auth, shared DB for mapping/overrides | **Build now, fully.** |
| 2 | Add Auth0 | Scaffold filters only (Section 5) — no Auth0 data/queries yet. |
| 3 | Combined UKI (Okta + Auth0) view | Not built; architecture must not preclude it. |
| 4 | Rest of EMEA | Not built; Region filter must not preclude it. |

## 11. Non-Goals (this build)

- No write-back to Salesforce — strictly read-only, never call update/create/delete endpoints.
- No OAuth/SSO login — not available for now (no Connected App access); the manual session-ID step in Section 3 is the actual mechanism, not a stand-in for something better that's coming soon.
- No support for multiple different Salesforce orgs/tenants — single Okta Salesforce org, multiple users each with their own session token.
- No Auth0 or EMEA-wide data — scaffolding only, per Section 10.

## 12. Open Questions to Flag, Not Silently Resolve

- Whether Auth0 pipeline lives in the same Salesforce org/Opportunity object or a separate system (affects Phase 2 architecture) — do not assume; note as unresolved in `IMPLEMENTATION_NOTES.md`.
- The exact fields/logic behind leadership's reported "Tech Win Rate ($)" denominator — not confirmed; the metric must remain configurable (Section 6), not hardcoded to a guess.
- Whether Salesforce CORS allowlisting (Section 3) is actually achievable for this org without admin access beyond what the user already has — note whatever was found.

---

## For the Claude review pass

Read `IMPLEMENTATION_NOTES.md` first, then audit against Sections 3, 6, 7, and 9 specifically. Check the token handling in Section 3 literally, line by line: confirm it never reaches `/app/api` or any server-side code, never lands in `localStorage` or a cookie, and isn't logged anywhere. Check that no rule in Section 7 was implemented as "correct math, missing UI." Flag any place a metric's denominator (Section 6) was hardcoded instead of left configurable. Flag any place the AE-mapping or override tables ended up as per-browser/local state instead of the shared DB — that would silently break the moment a second user opens the app.
