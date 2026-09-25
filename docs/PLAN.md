# Plan and design notes

## Approach
Extreme-Programming style:

- **Schema first.** It was agreed before any code was written.
- **Test-first for business logic:** aggregation, currency normalization, validation and filtering.
- **Small commits** that follow the build order: schema → seed → core logic → API → UI → docs.
- **The simplest design that stays clean and testable.**

## Build order

| # | Step | Output | Tests |
|---|---|---|---|
| 0 | Requirements + schema sketch, confirmed before migrations | `REQUIREMENTS.md`, `docs/SCHEMA.md` | — |
| 1 | Backend tooling + migration runner | `db.ts`, `config.ts`, `clock.ts` | — |
| 2 | Schema: tables, append-only triggers, `current_salaries` view, FX rates | `migrations/001–003` | `schema.test.ts` |
| 3 | Deterministic seed (10k employees) | `src/seed/*` | `seed.test.ts` |
| 4 | Filtering, search, pagination | `src/employees/*`, `pagination.ts` | `filters.test.ts`, `pagination.test.ts` |
| 5 | USD aggregation: avg, median, headcount, payroll | `src/reports/salaryStats.ts` | `salaryStats.test.ts` |
| 6 | Salary change validation + append | `src/salaries/*` | `validateSalaryInput.test.ts` |
| 7 | REST API | `app.ts`, `meta.ts`, `server.ts` | `api.test.ts` |
| 8–12 | UI: API client, list, detail + form, dashboard | `frontend/src/*` | 4 component/unit test files |
| 13 | Performance pass (index for list order) + docs | `migrations/004`, `docs/*` | — |

## Questions asked before coding, and the answers

| Question | Answer | Where it shows up |
|---|---|---|
| Is currency stored on the salary row or on the employee? | On the salary row | `salary_history.currency_code`. The employee's currency comes from their current record. |
| Can a salary record be dated in the future? | No, reject it | `validateSalaryInput` → "cannot be in the future", with an injected clock |
| One fixed FX rate per currency, or rates by date? | One rate per currency | `fx_rates`, refreshed by migration 003 to the ECB rates of 2026-09-24 |
| Later: switch to live FX? | Not for this submission | Design recorded in [DECISIONS.md](DECISIONS.md) #8 |

## Requirements traceability

| Requirement (REQUIREMENTS.md) | Implementation | Verified by |
|---|---|---|
| View, search, filter employees by name, department, country, level | `GET /api/employees`, `buildEmployeeWhere`, `EmployeeList` | `filters.test.ts`, `api.test.ts`, `EmployeeList.test.tsx` |
| Pagination (don't return 10k rows) | `parsePageRequest` (cap 100), `TablePagination` | `pagination.test.ts`, `api.test.ts` |
| Current salary + salary history (audit trail) | `current_salaries` view, `GET /api/employees/:id`, `EmployeeDetailDialog` | `schema.test.ts`, `api.test.ts` |
| Add a raise or correction without editing history | `POST /api/employees/:id/salaries`, append-only triggers, `SalaryChangeForm` | `schema.test.ts`, `validateSalaryInput.test.ts`, `api.test.ts`, `SalaryChangeForm.test.tsx` |
| Fields: name, country, currency, department, level, salary, hire date | `EmployeeSummary` type, list and detail UI | `filters.test.ts`, `api.test.ts` |
| Average / median by department, country, job level | `getSalaryStats` (SQL window functions) | `salaryStats.test.ts` |
| Headcount + total payroll per department and country | same query; dashboard summary cards | `salaryStats.test.ts`, `Dashboard.test.tsx` |
| All aggregates in USD using fixed seeded FX, clearly labelled as an assumption | `fx_rates`, `amount_usd` in the view, dashboard caption | `salaryStats.test.ts` (normalization + rounding), `Dashboard.test.tsx` |
| Drill-down (e.g. Engineering in India) | Filters on the stats endpoint + dashboard selects | `salaryStats.test.ts`, `api.test.ts` |
| Seed: 10k realistic employees, at least one history row each, deterministic | `generateEmployees` (mulberry32, fixed seed) | `seed.test.ts` |
| Aggregation in SQL with indexes | `salaryStats.ts`, migrations 001 + 004 | [PERFORMANCE.md](PERFORMANCE.md) |

## Test inventory

| Suite | Tests | Focus |
|---|---|---|
| backend `schema.test.ts` | 4 | Current-salary rule, append-only triggers, constraints |
| backend `seed.test.ts` | 9 | Determinism, realistic spread, well-formed history |
| backend `filters.test.ts` | 8 | WHERE builder, LIKE escaping, pagination totals, USD in list |
| backend `pagination.test.ts` | 7 | Defaults, parsing, page-size cap |
| backend `validateSalaryInput.test.ts` | 14 | Every validation rule, all errors reported at once |
| backend `salaryStats.test.ts` | 10 | USD normalization, rounding, odd/even median, grouping, drill-down |
| backend `api.test.ts` | 12 | Every route, status codes, error shapes |
| frontend `format.test.ts` | 3 | Currency formatting |
| frontend `SalaryChangeForm.test.tsx` | 4 | Payload, client validation, server field errors |
| frontend `EmployeeList.test.tsx` | 3 | Rendering, search, selection |
| frontend `Dashboard.test.tsx` | 2 | Stats table, totals, FX caption, regrouping |

No test sleeps, reads the real clock, or uses unseeded randomness.

## Known limitations
- History rows are converted to USD at today's rate, not the rate when they took effect (accepted: one rate per currency).
- A correction dated before the current record is kept in history but doesn't change the current salary. The UI explains this next to the form.
- There's no audit of *who* made a change, because the app has a single implicit user (no auth, by design).
- Employees can't be created, edited or deleted through the UI. The requirements only ask for salary changes, and the seed provides the employees.
- There are no end-to-end browser tests. Coverage is unit + API integration + component tests.

## What I'd do next
1. CSV import/export (the fast-follow named in the requirements).
2. Live FX via stored rate snapshots (DECISIONS #8), if the business wants current rates over reproducible ones.
3. An "as of date" on reports, for month-end reproducibility.
4. Scheduled (future-dated) raises, using `effective_date <= :asOf`.
5. One Playwright happy-path test: search → open employee → record raise → see the dashboard change.
